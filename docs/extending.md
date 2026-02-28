# Extending the App

## Adding a New Real Data Source

The data fetcher in `server/data-fetcher.ts` uses a pluggable architecture. To add a new source:

### Step 1: Write the Fetch Function

```typescript
async function fetchOrefAlerts(): Promise<void> {
  const res = await fetchViaProxy("https://www.oref.org.il/WarningMessages/alert/alerts.json");
  if (!res.ok) throw new Error(`Oref API returned ${res.status}`);

  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) return;

  const alerts: Alert[] = data.map((item: any) => ({
    id: randomUUID(),
    area: item.data,
    threat: item.title,
    timestamp: new Date().toISOString(),
    active: true,
    lat: /* map area code to lat */ 32.0,
    lng: /* map area code to lng */ 34.8,
  }));

  await storage.addAlerts(alerts);
}
```

### Step 2: Register the Source

Add to the `dataSources` array:

```typescript
const dataSources: DataSourceConfig[] = [
  // existing sources...
  {
    name: "oref-alerts",
    enabled: true,
    fetchIntervalMs: 5000,
    proxyRequired: true,
    fetchFn: fetchOrefAlerts,
  },
];
```

### Step 3: Broadcast to WebSocket (Optional)

If the source creates war events, trigger the WebSocket callback:

```typescript
await storage.addEvent(newEvent);
onNewEvent?.(newEvent);  // Broadcasts to all connected clients
```

For non-event data (news, alerts), the frontend will pick it up via its next polling cycle.

## Adding a New Dashboard Component

### Step 1: Create the Component

Create `client/src/components/my-panel.tsx`:

```typescript
import { useTranslation } from "react-i18next";

interface MyPanelProps {
  data: MyDataType[];
}

export function MyPanel({ data }: MyPanelProps) {
  const { t } = useTranslation();

  return (
    <div data-testid="my-panel">
      <h3>{t("myPanel.title")}</h3>
      {/* ... */}
    </div>
  );
}
```

### Step 2: Add to Dashboard Layout

In `client/src/pages/dashboard.tsx`:
1. Import the component
2. Add a React Query hook if it needs its own data
3. Place it in the layout grid

### Step 3: Add Translations

Add keys to ALL locale files (`en.json`, `he.json`, `ar.json`, `fa.json`).

### Step 4: Add Test IDs

Every interactive element needs `data-testid`:
- Buttons: `data-testid="button-action-name"`
- Inputs: `data-testid="input-field-name"`
- Display elements: `data-testid="text-data-name"`

## Adding a New API Endpoint

### Step 1: Update Storage Interface

In `server/storage.ts`, add the method to `IStorage`:

```typescript
export interface IStorage {
  // existing methods...
  getMyData(): Promise<MyData[]>;
  addMyData(items: MyData[]): Promise<void>;
}
```

### Step 2: Implement in DatabaseStorage

```typescript
async getMyData(): Promise<MyData[]> {
  return await db.select().from(myDataTable).orderBy(desc(myDataTable.timestamp)).limit(100);
}
```

### Step 3: Add the Route

In `server/routes.ts`:

```typescript
app.get("/api/my-data", async (_req, res) => {
  const data = await storage.getMyData();
  res.json(data);
});
```

### Step 4: Query from Frontend

In the dashboard or component:

```typescript
const { data } = useQuery<MyData[]>({
  queryKey: ["/api/my-data"],
  refetchInterval: 10000,
});
```

## Adding a New Database Table

### Step 1: Define in Schema

In `shared/schema.ts`:

```typescript
export const myTable = pgTable("my_table", {
  id: varchar("id").primaryKey(),
  name: text("name").notNull(),
  value: real("value").notNull(),
  timestamp: text("timestamp").notNull(),
});

export const insertMyTableSchema = createInsertSchema(myTable);
export type InsertMyTable = z.infer<typeof insertMyTableSchema>;
export type MyTable = typeof myTable.$inferSelect;
```

### Step 2: Push to Database

```bash
npm run db:push
```

### Step 3: Update Storage

Add CRUD methods to `IStorage` and `DatabaseStorage` as described above.

## Adding a New Language

See the [i18n documentation](./i18n.md#adding-a-new-language).

## Replacing Mock Data with Real Data

For each data type, see the [Data Sources documentation](./data-sources.md) for specific instructions on what to replace and where.

General pattern:
1. Keep the existing `DataSourceConfig` structure
2. Write a new `fetchFn` that calls real APIs
3. Transform external data to match the app's schema types
4. Use `fetchViaProxy()` for Israeli-restricted sources
5. Disable or remove the `simulated-events` source once real sources are connected

## Files You Should NOT Edit

- `server/vite.ts` - Vite dev server integration
- `vite.config.ts` - Vite build configuration
- `drizzle.config.ts` - Drizzle migration configuration
- `package.json` - Use package management tools instead of manual edits

## Performance Considerations

- The database auto-prunes war events beyond 500 entries
- Statistics are computed on every API call (not cached). For very high traffic, consider caching with a TTL
- WebSocket broadcasts go to all connected clients. The `ws` library handles this efficiently but monitor memory usage with many connections
- React Query polling intervals are tuned for a balance between freshness and server load. Adjust in `dashboard.tsx` if needed
