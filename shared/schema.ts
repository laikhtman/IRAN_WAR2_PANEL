import { z } from "zod";
import { pgTable, varchar, text, real, boolean, timestamp, jsonb, serial } from "drizzle-orm/pg-core";
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
export type InsertNewsItem = typeof newsItems.$inferInsert;
export type InsertAlert = typeof alerts.$inferInsert;
export type InsertAiSummary = z.infer<typeof insertAiSummarySchema>;
export type DataSourceStatus = typeof dataSourceStatus.$inferSelect;
