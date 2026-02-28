import { db } from "./db";
import { eq } from "drizzle-orm";
import { agents, agentLogs } from "@shared/schema";
import { storage } from "./storage";
import OpenAI from "openai";

const openai = new OpenAI();

interface AgentConfig {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  userPromptTemplate?: string;
  dataQuery?: {
    type: "news" | "events" | "alerts" | "all";
    limit: number;
    timeWindowMinutes?: number;
  };
  actions?: string[];
}

const DEFAULT_SYSTEM_PROMPTS: Record<string, string> = {
  content_moderator: "You are a content moderator for a war intelligence dashboard. Review the provided data and identify any items that are duplicates, spam, or inaccurate. Return your analysis as JSON.",
  news_curator: "You are a news curator for a war intelligence dashboard. Analyze the provided news items and identify the most significant stories. Return your analysis as JSON.",
  alert_manager: "You are an alert manager for a war intelligence dashboard. Review active alerts and determine which should remain active and which should be deactivated. Return your analysis as JSON.",
  seo_optimizer: "You are an SEO specialist. Analyze the current content and suggest improvements for search engine visibility. Return your suggestions as JSON.",
  custom: "You are an AI assistant helping manage a war intelligence dashboard. Follow the user's instructions carefully. Return your response as JSON.",
};

/**
 * Run an agent by ID. Creates a log entry, executes the AI call, and records results.
 * Returns the log entry ID.
 */
export async function runAgent(agentId: string): Promise<number> {
  // 1. Load agent from DB
  const rows = await db.select().from(agents).where(eq(agents.id, agentId)).limit(1);
  if (rows.length === 0) throw new Error(`Agent ${agentId} not found`);
  const agent = rows[0];

  const config: AgentConfig = (agent.config as AgentConfig) || {};
  const model = config.model || "gpt-4o-mini";
  const temperature = config.temperature ?? 0.3;
  const maxTokens = config.maxTokens || 2000;

  // 2. Create log entry
  const now = new Date().toISOString();
  const logRows = await db.insert(agentLogs).values({
    agentId: agent.id,
    startedAt: now,
    status: "running",
    createdAt: now,
  }).returning({ id: agentLogs.id });
  const logId = logRows[0].id;

  // 3. Update agent lastRunAt
  await db.update(agents).set({ lastRunAt: now, updatedAt: now }).where(eq(agents.id, agentId));

  try {
    // 4. Fetch relevant data
    const data = await fetchAgentData(config.dataQuery);

    // 5. Build prompt
    const systemPrompt = config.systemPrompt || DEFAULT_SYSTEM_PROMPTS[agent.type] || DEFAULT_SYSTEM_PROMPTS.custom;
    const userPrompt = buildUserPrompt(config.userPromptTemplate, agent.type, data);

    // 6. Call OpenAI
    const response = await openai.chat.completions.create({
      model,
      temperature,
      max_tokens: maxTokens,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const output = response.choices[0]?.message?.content || "{}";
    const tokensUsed = response.usage?.total_tokens || 0;
    const finishedAt = new Date().toISOString();

    // 7. Parse and execute actions (if any)
    let parsedOutput: any = {};
    try { parsedOutput = JSON.parse(output); } catch { parsedOutput = { raw: output }; }

    // 8. Update log
    await db.update(agentLogs).set({
      status: "success",
      finishedAt,
      output: parsedOutput,
      tokensUsed,
      input: { systemPrompt: systemPrompt.substring(0, 200), dataItems: data.itemCount },
    }).where(eq(agentLogs.id, logId));

    // 9. Update agent lastResult
    await db.update(agents).set({
      lastResult: { success: true, output: typeof output === 'string' ? output.substring(0, 500) : JSON.stringify(output).substring(0, 500) },
      updatedAt: finishedAt,
    }).where(eq(agents.id, agentId));

    return logId;
  } catch (err: any) {
    const finishedAt = new Date().toISOString();
    await db.update(agentLogs).set({
      status: "error",
      finishedAt,
      error: err.message,
    }).where(eq(agentLogs.id, logId));

    await db.update(agents).set({
      lastResult: { success: false, output: "", error: err.message },
      updatedAt: finishedAt,
    }).where(eq(agents.id, agentId));

    throw err;
  }
}

async function fetchAgentData(query?: AgentConfig["dataQuery"]): Promise<{ items: any[]; itemCount: number; summary: string }> {
  if (!query) {
    return { items: [], itemCount: 0, summary: "No data requested" };
  }

  const limit = query.limit || 50;
  let items: any[] = [];
  const parts: string[] = [];

  if (query.type === "news" || query.type === "all") {
    const news = await storage.getNews();
    const sliced = filterByTime(news, query.timeWindowMinutes).slice(0, limit);
    items.push(...sliced.map(n => ({ _type: "news", ...n })));
    parts.push(`${sliced.length} news items`);
  }

  if (query.type === "events" || query.type === "all") {
    const events = await storage.getEvents();
    const sliced = filterByTime(events, query.timeWindowMinutes).slice(0, limit);
    items.push(...sliced.map(e => ({ _type: "event", ...e })));
    parts.push(`${sliced.length} events`);
  }

  if (query.type === "alerts" || query.type === "all") {
    const alertsList = await storage.getAlerts();
    const sliced = alertsList.slice(0, limit);
    items.push(...sliced.map(a => ({ _type: "alert", ...a })));
    parts.push(`${sliced.length} alerts`);
  }

  return { items, itemCount: items.length, summary: parts.join(", ") || "No data" };
}

function filterByTime(items: any[], windowMinutes?: number): any[] {
  if (!windowMinutes) return items;
  const cutoff = new Date(Date.now() - windowMinutes * 60000).toISOString();
  return items.filter(i => (i.timestamp || "") >= cutoff);
}

function buildUserPrompt(template: string | undefined, agentType: string, data: { items: any[]; itemCount: number; summary: string }): string {
  if (template) {
    return template
      .replace(/\{\{itemCount\}\}/g, String(data.itemCount))
      .replace(/\{\{summary\}\}/g, data.summary)
      .replace(/\{\{data\}\}/g, JSON.stringify(data.items.slice(0, 20), null, 2));
  }

  // Default prompts by type
  const dataStr = JSON.stringify(data.items.slice(0, 20), null, 2);

  switch (agentType) {
    case "content_moderator":
      return `Review these ${data.itemCount} items (${data.summary}) for duplicates, spam, or inaccuracies:\n\n${dataStr}\n\nReturn JSON with: { "flagged": [{ "id": string, "reason": string }], "summary": string }`;
    case "news_curator":
      return `Analyze these ${data.itemCount} items (${data.summary}) and identify the top stories:\n\n${dataStr}\n\nReturn JSON with: { "topStories": [{ "id": string, "significance": string }], "summary": string }`;
    case "alert_manager":
      return `Review these ${data.itemCount} alerts (${data.summary}):\n\n${dataStr}\n\nReturn JSON with: { "deactivate": [string], "escalate": [string], "summary": string }`;
    case "seo_optimizer":
      return `Analyze the dashboard content (${data.summary}) for SEO improvements:\n\n${dataStr}\n\nReturn JSON with: { "suggestions": [{ "area": string, "suggestion": string }], "summary": string }`;
    default:
      return `Process these ${data.itemCount} items (${data.summary}):\n\n${dataStr}\n\nReturn JSON with your analysis.`;
  }
}
