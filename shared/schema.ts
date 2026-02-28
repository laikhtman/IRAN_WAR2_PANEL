import { z } from "zod";

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
] as const;

export const threatLevels = ["critical", "high", "medium", "low"] as const;

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

export const insertUserSchema = z.object({
  username: z.string(),
  password: z.string(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = { id: string; username: string; password: string };
