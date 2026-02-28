import { z } from "zod";
import { pgTable, varchar, text, real, boolean, timestamp, jsonb, serial, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

export const eventTypes = [
  "missile_launch",
  "missile_intercept",
  "missile_hit",
  "drone_launch",
  "drone_intercept",
  "air_raid_alert",
  "ceasefire",
  "military_operation",
  "explosion",
  "sirens",
  "naval_movement",
  "aircraft_tracking",
] as const;

export const threatLevels = ["critical", "high", "medium", "low"] as const;

export const warEvents = pgTable("war_events", {
  id: varchar("id").primaryKey(),
  type: varchar("type", { length: 50 }).notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  location: text("location").notNull(),
  lat: real("lat").notNull(),
  lng: real("lng").notNull(),
  country: varchar("country", { length: 100 }).notNull(),
  source: varchar("source", { length: 200 }).notNull(),
  timestamp: text("timestamp").notNull(),
  threatLevel: varchar("threat_level", { length: 20 }).notNull(),
  verified: boolean("verified").notNull().default(false),
  aiClassified: boolean("ai_classified").notNull().default(false),
});

export const newsItems = pgTable("news_items", {
  id: varchar("id").primaryKey(),
  title: text("title").notNull(),
  source: varchar("source", { length: 200 }).notNull(),
  timestamp: text("timestamp").notNull(),
  url: text("url"),
  category: varchar("category", { length: 100 }).notNull(),
  breaking: boolean("breaking").notNull().default(false),
  sentiment: real("sentiment"),
});

export const alerts = pgTable("alerts", {
  id: varchar("id").primaryKey(),
  area: text("area").notNull(),
  threat: text("threat").notNull(),
  timestamp: text("timestamp").notNull(),
  active: boolean("active").notNull().default(true),
  lat: real("lat").notNull(),
  lng: real("lng").notNull(),
});

export const aiSummaries = pgTable("ai_summaries", {
  id: serial("id").primaryKey(),
  summary: text("summary").notNull(),
  threatAssessment: varchar("threat_assessment", { length: 20 }).notNull(),
  keyPoints: jsonb("key_points").notNull().$type<string[]>(),
  lastUpdated: text("last_updated").notNull(),
  recommendation: text("recommendation").notNull(),
});

export const dataSourceStatus = pgTable("data_source_status", {
  id: varchar("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  lastFetchedAt: text("last_fetched_at"),
  lastSuccessAt: text("last_success_at"),
  lastError: text("last_error"),
  enabled: boolean("enabled").notNull().default(true),
  fetchIntervalSeconds: serial("fetch_interval_seconds").notNull(),
});

export const satelliteImages = pgTable("satellite_images", {
  id: varchar("id").primaryKey(),
  eventId: varchar("event_id"),
  imageUrl: text("image_url").notNull(),
  bboxWest: real("bbox_west").notNull(),
  bboxSouth: real("bbox_south").notNull(),
  bboxEast: real("bbox_east").notNull(),
  bboxNorth: real("bbox_north").notNull(),
  capturedAt: text("captured_at").notNull(),
  createdAt: text("created_at").notNull(),
});

export const insertWarEventSchema = createInsertSchema(warEvents);
export const insertNewsItemSchema = createInsertSchema(newsItems).omit({ });
export const insertAlertSchema = createInsertSchema(alerts);
export const insertAiSummarySchema = createInsertSchema(aiSummaries).omit({ id: true });
export const insertDataSourceStatusSchema = createInsertSchema(dataSourceStatus);
export const insertSatelliteImageSchema = createInsertSchema(satelliteImages);

export const eventSchema = z.object({
  id: z.string(),
  type: z.enum(eventTypes),
  title: z.string(),
  description: z.string(),
  location: z.string(),
  lat: z.number(),
  lng: z.number(),
  country: z.string(),
  source: z.string(),
  timestamp: z.string(),
  threatLevel: z.enum(threatLevels),
  verified: z.boolean(),
  aiClassified: z.boolean().optional(),
});

export type WarEvent = z.infer<typeof eventSchema>;

export const newsItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  source: z.string(),
  timestamp: z.string(),
  url: z.string().optional(),
  category: z.string(),
  breaking: z.boolean(),
  sentiment: z.number().min(-1).max(1).optional(),
});

export type NewsItem = z.infer<typeof newsItemSchema>;

export const statisticsSchema = z.object({
  totalMissilesLaunched: z.number(),
  totalIntercepted: z.number(),
  totalHits: z.number(),
  totalDronesLaunched: z.number(),
  totalDronesIntercepted: z.number(),
  interceptionRate: z.number(),
  byCountry: z.record(z.string(), z.object({
    launched: z.number(),
    intercepted: z.number(),
    hits: z.number(),
  })),
  bySystem: z.record(z.string(), z.number()),
  activeAlerts: z.number(),
  last24hEvents: z.number(),
});

export type Statistics = z.infer<typeof statisticsSchema>;

export const alertSchema = z.object({
  id: z.string(),
  area: z.string(),
  threat: z.string(),
  timestamp: z.string(),
  active: z.boolean(),
  lat: z.number(),
  lng: z.number(),
});

export type Alert = z.infer<typeof alertSchema>;

export const aiSummarySchema = z.object({
  summary: z.string(),
  threatAssessment: z.enum(threatLevels),
  keyPoints: z.array(z.string()),
  lastUpdated: z.string(),
  recommendation: z.string(),
});

export type AISummary = z.infer<typeof aiSummarySchema>;

export type InsertWarEvent = typeof warEvents.$inferInsert;

export const satelliteImageSchema = z.object({
  id: z.string(),
  eventId: z.string().optional(),
  imageUrl: z.string(),
  bboxWest: z.number(),
  bboxSouth: z.number(),
  bboxEast: z.number(),
  bboxNorth: z.number(),
  capturedAt: z.string(),
  createdAt: z.string(),
});

export type SatelliteImage = z.infer<typeof satelliteImageSchema>;

export const sentimentResponseSchema = z.object({
  average: z.number(),
  trend: z.enum(["escalating", "stable", "de-escalating"]),
  sampleSize: z.number(),
});

export type SentimentResponse = z.infer<typeof sentimentResponseSchema>;

// ─── Admin Settings ─────────────────────────────────────────────────────────

export const adminSettings = pgTable("admin_settings", {
  key: varchar("key", { length: 100 }).primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// ─── Admin Sessions ─────────────────────────────────────────────────────────

export const adminSessions = pgTable("admin_sessions", {
  id: varchar("id", { length: 64 }).primaryKey(),
  createdAt: text("created_at").notNull(),
  expiresAt: text("expires_at").notNull(),
});

// ─── Blocked Countries ──────────────────────────────────────────────────────

export const blockedCountries = pgTable("blocked_countries", {
  countryCode: varchar("country_code", { length: 2 }).primaryKey(),
  countryName: varchar("country_name", { length: 100 }).notNull(),
  blockedAt: text("blocked_at").notNull(),
});

// ─── Agents ─────────────────────────────────────────────────────────────────

export const agents = pgTable("agents", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  description: text("description"),
  enabled: boolean("enabled").notNull().default(true),
  scheduleCron: varchar("schedule_cron", { length: 100 }),
  config: jsonb("config").notNull().$type<Record<string, any>>(),
  lastRunAt: text("last_run_at"),
  lastResult: jsonb("last_result").$type<{ success: boolean; output: string; error?: string }>(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// ─── Agent Logs ─────────────────────────────────────────────────────────────

export const agentLogs = pgTable("agent_logs", {
  id: serial("id").primaryKey(),
  agentId: varchar("agent_id", { length: 36 }).notNull(),
  startedAt: text("started_at").notNull(),
  finishedAt: text("finished_at"),
  status: varchar("status", { length: 20 }).notNull().default("running"),
  input: jsonb("input"),
  output: jsonb("output"),
  tokensUsed: integer("tokens_used").default(0),
  error: text("error"),
  createdAt: text("created_at").notNull(),
});

// ─── Admin Insert Schemas ───────────────────────────────────────────────────

export const insertAdminSettingSchema = createInsertSchema(adminSettings);
export const insertAdminSessionSchema = createInsertSchema(adminSessions);
export const insertBlockedCountrySchema = createInsertSchema(blockedCountries);
export const insertAgentSchema = createInsertSchema(agents).omit({ });
export const insertAgentLogSchema = createInsertSchema(agentLogs).omit({ id: true });

// ─── Agent Zod Schemas ──────────────────────────────────────────────────────

export const agentTypes = ["content_moderator", "news_curator", "alert_manager", "seo_optimizer", "custom"] as const;

export const agentSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(agentTypes),
  description: z.string().nullable(),
  enabled: z.boolean(),
  scheduleCron: z.string().nullable(),
  config: z.record(z.any()),
  lastRunAt: z.string().nullable(),
  lastResult: z.object({
    success: z.boolean(),
    output: z.string(),
    error: z.string().optional(),
  }).nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const agentLogSchema = z.object({
  id: z.number(),
  agentId: z.string(),
  startedAt: z.string(),
  finishedAt: z.string().nullable(),
  status: z.enum(["running", "success", "error", "cancelled"]),
  input: z.any().nullable(),
  output: z.any().nullable(),
  tokensUsed: z.number().nullable(),
  error: z.string().nullable(),
  createdAt: z.string(),
});

// ─── Type Exports ───────────────────────────────────────────────────────────

export type InsertNewsItem = typeof newsItems.$inferInsert;
export type InsertAlert = typeof alerts.$inferInsert;
export type InsertAiSummary = z.infer<typeof insertAiSummarySchema>;
export type DataSourceStatus = typeof dataSourceStatus.$inferSelect;
export type AdminSetting = typeof adminSettings.$inferSelect;
export type AdminSession = typeof adminSessions.$inferSelect;
export type BlockedCountry = typeof blockedCountries.$inferSelect;
export type Agent = z.infer<typeof agentSchema>;
export type AgentLog = z.infer<typeof agentLogSchema>;
export type InsertAgent = typeof agents.$inferInsert;
export type InsertAgentLog = typeof agentLogs.$inferInsert;
