# AI/ML Pipeline Documentation

> Auto-generated documentation for the three OpenAI-powered features in the War Panel project.  
> Source: `server/data-fetcher.ts`

---

## Table of Contents

1. [AI Situation Summary](#1-ai-situation-summary)
2. [Sentiment Analysis](#2-sentiment-analysis)
3. [AI Event Classification](#3-ai-event-classification)
4. [Cost Estimation](#4-cost-estimation)
5. [Configuration](#5-configuration)
6. [Prompt Engineering Notes](#6-prompt-engineering-notes)

---

## 1. AI Situation Summary

**Function:** `refreshAISummary()`  
**Data Source Name:** `ai-summary-refresh`  
**Interval:** every 120 seconds (2 minutes)

### Model Parameters

| Parameter         | Value                          |
| ----------------- | ------------------------------ |
| Model             | `gpt-4o-mini`                  |
| Temperature       | `0.3`                          |
| max_tokens        | `1500`                         |
| response_format   | `{ type: "json_object" }`      |

### Input

- **Last 15 war events** — retrieved via `storage.getEvents()` then `.slice(0, 15)`
- **Last 10 news items** — retrieved via `storage.getNews()` then `.slice(0, 10)`

Events are projected to: `{ type, title, location, country, time, threat }`  
News items are projected to: `{ title, source, time, breaking }`

### System Prompt

```text
You are a military intelligence analyst monitoring the Iran-Israel conflict. Given the following war events and news items, produce a JSON object with exactly these fields:
- "summary": string (2-3 paragraph situation assessment)
- "threatAssessment": one of "critical", "high", "medium", "low"
- "keyPoints": array of 4-6 short strings summarizing key developments
- "recommendation": string (actionable recommendation for civilians)

Respond ONLY with valid JSON. No markdown, no code fences.
```

### User Prompt Structure

```text
Recent War Events (last 15):
<JSON array of projected event objects, pretty-printed>

Recent News Items (last 10):
<JSON array of projected news objects, pretty-printed>
```

### Output Schema

```json
{
  "summary": "string — 2-3 paragraph situation assessment",
  "threatAssessment": "critical | high | medium | low",
  "keyPoints": ["string", "string", "..."],
  "recommendation": "string — actionable civilian recommendation"
}
```

### Validation

1. **Required fields** — checks that `summary`, `threatAssessment`, `keyPoints`, and `recommendation` are all present. If any is missing, the response is discarded and the error is logged.
2. **Threat level validation** — `threatAssessment` is validated against `["critical", "high", "medium", "low"]`. If the value is not in the list, it **defaults to `"medium"`**.
3. **keyPoints coercion** — if `keyPoints` is not an array, it is replaced with an empty array `[]`.

### Storage

The validated summary is stored via `storage.setAISummary(summary)` as an `AISummary` object with an added `lastUpdated` ISO timestamp.

### Error Handling

- On any error (network, parse, validation), the error is logged to console.
- The stale summary remains in the database — no data is deleted on failure.

---

## 2. Sentiment Analysis

**Function:** `analyzeNewsSentiment()`  
**Data Source Name:** `sentiment-analysis`  
**Interval:** every 120 seconds (2 minutes)

### Model Parameters

| Parameter         | Value                          |
| ----------------- | ------------------------------ |
| Model             | `gpt-4o-mini`                  |
| Temperature       | `0.1`                          |
| max_tokens        | `500`                          |
| response_format   | `{ type: "json_object" }`      |

### Input

1. Fetch up to **20 recent news items** via `storage.getNews()` then `.slice(0, 20)`.
2. Filter to only **unscored items** where `sentiment === undefined || sentiment === null`.
3. Extract an array of title strings from the filtered items.
4. If there are zero unscored items, the function returns early (no API call).

### System Prompt

```text
Rate each headline on a scale from -1.0 (extremely negative / alarming) to +1.0 (positive / peaceful). Return a JSON object with a single key "scores" containing an array of numbers in the same order as the input headlines. Respond ONLY with valid JSON.
```

### User Prompt

```text
<JSON.stringify(titles)>
```

A JSON array of headline strings, e.g. `["Explosion reported in...", "Ceasefire talks resume..."]`.

### Output Schema

```json
{
  "scores": [-0.8, 0.3, -0.5, "..."]
}
```

An array of floating-point numbers matching the order of input headlines.

### Score Processing

- **Parsing:** reads `parsed.scores` or falls back to the parsed object itself.
- **Mismatch check:** if the scores array length does not equal the unscored items count, the entire batch is skipped with a warning: `"[sentiment] Score count mismatch, skipping"`.
- **Clamping:** each score is clamped to the range [-1, +1] via:
  ```typescript
  Math.max(-1, Math.min(1, scores[i]))
  ```
- **Storage:** each item is updated individually via `storage.updateNewsSentiment(id, score)`.

### Error Handling

- On any error, the error is logged and no scores are saved.

---

## 3. AI Event Classification

**Function:** `classifyEvent(rawTitle, rawDescription)`  
**Called from:** `fetchRSSAppFeeds()` during RSS feed processing  
**Trigger:** inline — called for each item in a batch of ≤5 new RSS items

### Model Parameters

| Parameter         | Value                          |
| ----------------- | ------------------------------ |
| Model             | `gpt-4o-mini`                  |
| Temperature       | `0.1`                          |
| max_tokens        | `100`                          |
| response_format   | `{ type: "json_object" }`      |
| Timeout           | `5000ms` (via `AbortController`) |

### System Prompt

```text
You are a military intelligence classifier. Given a raw event report, return JSON with:
- "type": one of: missile_launch, missile_intercept, missile_hit, drone_launch, drone_intercept, air_raid_alert, ceasefire, military_operation, explosion, sirens, naval_movement, aircraft_tracking
- "threatLevel": one of: critical, high, medium, low
Respond ONLY with valid JSON.
```

### User Prompt

```text
Title: <rawTitle>
Description: <rawDescription>
```

### Output Schema

```json
{
  "type": "missile_launch | missile_intercept | missile_hit | drone_launch | drone_intercept | air_raid_alert | ceasefire | military_operation | explosion | sirens | naval_movement | aircraft_tracking",
  "threatLevel": "critical | high | medium | low"
}
```

### Valid Values

**Event Types (12):**

| Type                | Description          |
| ------------------- | -------------------- |
| `missile_launch`    | Missile launch       |
| `missile_intercept` | Missile intercept    |
| `missile_hit`       | Missile hit / impact |
| `drone_launch`      | Drone launch         |
| `drone_intercept`   | Drone intercept      |
| `air_raid_alert`    | Air raid alert       |
| `ceasefire`         | Ceasefire            |
| `military_operation`| Military operation   |
| `explosion`         | Explosion            |
| `sirens`            | Sirens               |
| `naval_movement`    | Naval movement       |
| `aircraft_tracking` | Aircraft tracking    |

**Threat Levels (4):** `critical`, `high`, `medium`, `low`

### Validation

- If `type` is not in the 12 valid types **or** `threatLevel` is not in the 4 valid levels, the function returns `null` (classification discarded).

### Integration with RSS Pipeline

1. RSS items are fetched from RSS.app feeds.
2. If **1–5 new items** are in a batch, each item is classified via `classifyEvent(title, title)` (title is used as both title and description).
3. If classification succeeds, a `WarEvent` is created with:
   - `aiClassified: true`
   - `verified: false`
   - `location: "Unknown"`
   - Random coordinates near Israel (lat: 31.5 ± 1, lng: 34.75 ± 1)
4. The war event is stored via `storage.addEvent()` and broadcast via `onNewEvent()`.
5. If batch size >5, classification is **skipped** to avoid excessive API calls.

### Timeout & Fallback

- A **5-second timeout** is enforced via `AbortController`. If the API call exceeds 5 seconds, it is aborted.
- On timeout: logs `"[ai-classify] Timeout — falling back to heuristic"` and returns `null`.
- On any other error: logs the error message and returns `null`.
- When `null` is returned, the RSS item is still saved as a `NewsItem` — it simply is not promoted to a `WarEvent`.

---

## 4. Cost Estimation

All three features use **GPT-4o-mini**.

**Pricing (as of 2025):**

| Metric              | Cost                |
| ------------------- | ------------------- |
| Input tokens        | $0.15 / 1M tokens   |
| Output tokens       | $0.60 / 1M tokens   |

### Per-Feature Estimates

#### AI Summary (`refreshAISummary`)

| Metric            | Estimate                                     |
| ----------------- | -------------------------------------------- |
| Calls per day     | ~720 (every 120s × 86,400s/day)              |
| Input tokens/call | ~800 (system prompt + 15 events + 10 news)   |
| Output tokens/call| ~500 (2-3 paragraphs + key points)           |
| Daily input cost  | 720 × 800 / 1M × $0.15 = **$0.086**         |
| Daily output cost | 720 × 500 / 1M × $0.60 = **$0.216**         |
| **Daily total**   | **~$0.30**                                   |

#### Sentiment Analysis (`analyzeNewsSentiment`)

| Metric            | Estimate                                     |
| ----------------- | -------------------------------------------- |
| Calls per day     | ~720 (every 120s; many will short-circuit)    |
| Input tokens/call | ~200 (system prompt + array of headlines)     |
| Output tokens/call| ~100 (array of numbers)                      |
| Daily input cost  | 720 × 200 / 1M × $0.15 = **$0.022**         |
| Daily output cost | 720 × 100 / 1M × $0.60 = **$0.043**         |
| **Daily total**   | **~$0.065**                                  |

> Note: Many calls will return early because all items are already scored. Actual costs will be lower.

#### Event Classification (`classifyEvent`)

| Metric            | Estimate                                     |
| ----------------- | -------------------------------------------- |
| Calls per day     | ~200 (depends on RSS feed volume)            |
| Input tokens/call | ~100 (system prompt + title + description)   |
| Output tokens/call| ~30 (small JSON object)                      |
| Daily input cost  | 200 × 100 / 1M × $0.15 = **$0.003**         |
| Daily output cost | 200 × 30 / 1M × $0.60 = **$0.004**          |
| **Daily total**   | **~$0.007**                                  |

### Totals

| Period    | Estimated Cost |
| --------- | -------------- |
| **Daily** | ~$0.37         |
| **Monthly** (30d) | ~$11.10  |

> These are upper-bound estimates assuming continuous operation. Real costs will be lower due to sentiment short-circuiting and variable RSS volume.

---

## 5. Configuration

### Required Environment Variable

```
OPENAI_API_KEY=sk-...
```

The OpenAI client is initialized globally at module scope:

```typescript
const openai = new OpenAI(); // Reads OPENAI_API_KEY from env
```

### Data Source Registration

Both `refreshAISummary` and `analyzeNewsSentiment` are registered in the `dataSources` array:

| Data Source Name      | Interval   | Required Env Var  |
| --------------------- | ---------- | ----------------- |
| `ai-summary-refresh`  | 120,000 ms | `OPENAI_API_KEY`  |
| `sentiment-analysis`  | 120,000 ms | `OPENAI_API_KEY`  |

### Disabling AI Features

To disable the AI summary or sentiment analysis, set `enabled: false` for the corresponding entry in the `dataSources` array in `server/data-fetcher.ts`:

```typescript
{
  name: "ai-summary-refresh",
  enabled: false, // ← disable AI summary
  fetchIntervalMs: 120000,
  ...
},
{
  name: "sentiment-analysis",
  enabled: false, // ← disable sentiment analysis
  ...
},
```

**Event classification** (`classifyEvent`) is called **inline** during RSS feed processing inside `fetchRSSAppFeeds()`. It cannot be disabled independently via the data source config. To disable it:
- Remove or comment out the classification block inside `fetchRSSAppFeeds()`
- Or remove the `OPENAI_API_KEY` env var (which will cause the OpenAI client to throw on initialization)

### Health Monitoring

Each data source's health is tracked via `sourceHealthMap` and exposed through `getDataSourceHealthStatus()`. The health endpoint reports:
- `status`: `ok`, `error`, `not_configured`, or `no_data`
- `missingEnvVars`: list of required but missing env vars
- `health.lastRunAt`, `health.lastSuccessAt`, `health.lastError`, `health.runCount`, `health.errorCount`

---

## 6. Prompt Engineering Notes

### JSON Output Enforcement

All three features use `response_format: { type: "json_object" }` which instructs the OpenAI API to guarantee valid JSON output. Additionally, every system prompt ends with **"Respond ONLY with valid JSON"** as a belt-and-suspenders approach.

### Temperature Selection

| Feature          | Temperature | Rationale                                      |
| ---------------- | ----------- | ---------------------------------------------- |
| Summary          | 0.3         | Slightly creative for natural-language summary  |
| Sentiment        | 0.1         | Near-deterministic numerical scores             |
| Classification   | 0.1         | Near-deterministic categorical labels           |

Low temperatures (0.1–0.3) are used across the board for consistency and reproducibility. The summary uses a slightly higher temperature (0.3) to allow more natural prose generation.

### Prompt Structure Pattern

All prompts follow a consistent pattern:

1. **System prompt** — defines the AI's role, specifies the exact output schema, and lists valid enum values.
2. **User prompt** — provides structured data (JSON arrays or formatted text) for the model to analyze.
3. **Output constraint** — "Respond ONLY with valid JSON" repeated in system prompts.

### Defensive Parsing

All AI responses are wrapped in try/catch blocks with:
- JSON parse validation
- Schema field validation (required fields, enum checks)
- Score clamping for numerical outputs
- Graceful fallback (return `null` or skip) on any validation failure

### Token Budget

| Feature          | max_tokens | Rationale                                  |
| ---------------- | ---------- | ------------------------------------------ |
| Summary          | 1500       | Multi-paragraph text + array of key points |
| Sentiment        | 500        | Array of up to 20 numbers                  |
| Classification   | 100        | Two-field JSON object                      |

Token limits are set conservatively — high enough to avoid truncation but low enough to control costs.
