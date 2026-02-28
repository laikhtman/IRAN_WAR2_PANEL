import cron from "node-cron";
import type { ScheduledTask as CronTask } from "node-cron";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { agents } from "@shared/schema";
import { runAgent } from "./agent-runner";

interface ScheduledTask {
  agentId: string;
  task: CronTask;
}

const scheduledTasks = new Map<string, ScheduledTask>();

/**
 * Start the agent scheduler. Loads all enabled agents with cron schedules
 * and sets up recurring execution.
 */
export async function startAgentScheduler(): Promise<void> {
  console.log("[agent-scheduler] Starting agent scheduler...");

  try {
    const allAgents = await db.select().from(agents).where(eq(agents.enabled, true));

    for (const agent of allAgents) {
      if (agent.scheduleCron && cron.validate(agent.scheduleCron)) {
        scheduleAgent(agent.id, agent.name, agent.scheduleCron);
      }
    }

    console.log(`[agent-scheduler] ${scheduledTasks.size} agents scheduled`);
  } catch (err: any) {
    console.error("[agent-scheduler] Failed to start:", err.message);
  }
}

/**
 * Stop all scheduled agents.
 */
export function stopAgentScheduler(): void {
  for (const [id, entry] of Array.from(scheduledTasks.entries())) {
    entry.task.stop();
    console.log(`[agent-scheduler] Stopped agent "${id}"`);
  }
  scheduledTasks.clear();
  console.log("[agent-scheduler] All agents stopped");
}

/**
 * Schedule or reschedule a single agent.
 */
export function scheduleAgent(agentId: string, name: string, cronExpr: string): void {
  // Remove existing schedule if present
  unscheduleAgent(agentId);

  if (!cron.validate(cronExpr)) {
    console.warn(`[agent-scheduler] Invalid cron "${cronExpr}" for agent "${name}"`);
    return;
  }

  const task = cron.schedule(cronExpr, async () => {
    console.log(`[agent-scheduler] Running agent "${name}" (${agentId})`);
    try {
      await runAgent(agentId);
      console.log(`[agent-scheduler] Agent "${name}" completed successfully`);
    } catch (err: any) {
      console.error(`[agent-scheduler] Agent "${name}" failed:`, err.message);
    }
  });

  scheduledTasks.set(agentId, { agentId, task });
  console.log(`[agent-scheduler] Scheduled agent "${name}" with cron "${cronExpr}"`);
}

/**
 * Remove a scheduled agent.
 */
export function unscheduleAgent(agentId: string): void {
  const entry = scheduledTasks.get(agentId);
  if (entry) {
    entry.task.stop();
    scheduledTasks.delete(agentId);
  }
}

/**
 * Trigger an agent to run immediately (outside of schedule).
 */
export async function triggerAgentNow(agentId: string): Promise<number> {
  return runAgent(agentId);
}

/**
 * Get the list of currently scheduled agent IDs.
 */
export function getScheduledAgentIds(): string[] {
  return Array.from(scheduledTasks.keys());
}
