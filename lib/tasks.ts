import type { Recurrence, Task, TaskPriority } from "./types";
import { addDaysToKey, weekdayOfKey } from "./time";

export const DEFAULT_DURATION_MINUTES = 30;

export const PRIORITY_LABEL: Record<TaskPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

/** Checkbox ring color per priority: quiet for low, clear for high. */
export const PRIORITY_RING: Record<TaskPriority, string> = {
  low: "border-charcoal/25",
  medium: "border-peach",
  high: "border-forest",
};

export const PRIORITY_FLAG: Record<TaskPriority, string> = {
  low: "text-charcoal/35",
  medium: "text-peach",
  high: "text-forest",
};

export const RECURRENCE_LABEL: Record<Recurrence, string> = {
  daily: "Every day",
  weekdays: "Weekdays",
  weekly: "Every week",
};

export const OPEN_STATUSES = [
  "not_started",
  "in_progress",
  "paused",
  "shrunk",
  "moved",
  "overdue",
] as const;

export type TimedTask = Task & { start_time: string; end_time: string };

export function isDone(task: Task): boolean {
  return task.status === "completed";
}

/** Cut / archived rows are legacy leftovers and never shown. */
export function isVisible(task: Task): boolean {
  return task.status !== "cut" && task.status !== "archived";
}

export function isOpen(task: Task): boolean {
  return isVisible(task) && !isDone(task);
}

export function isTimed(task: Task): task is TimedTask {
  return Boolean(task.start_time && task.end_time);
}

export function isHappeningNow(task: Task, now: Date = new Date()): boolean {
  if (!isOpen(task) || !isTimed(task)) return false;
  const t = now.getTime();
  return new Date(task.start_time).getTime() <= t && t < new Date(task.end_time).getTime();
}

/** True when a timed, unfinished task's window has already closed. */
export function isPastDue(task: Task, now: Date = new Date()): boolean {
  if (!isOpen(task) || !isTimed(task)) return false;
  return new Date(task.end_time).getTime() <= now.getTime();
}

export function minutesLeft(task: Task, now: Date = new Date()): number {
  if (!isTimed(task)) return 0;
  return Math.max(0, Math.ceil((new Date(task.end_time).getTime() - now.getTime()) / 60000));
}

export function durationMinutes(task: Task): number | null {
  if (!isTimed(task)) return null;
  return Math.round((new Date(task.end_time).getTime() - new Date(task.start_time).getTime()) / 60000);
}

export interface GroupedTasks {
  timed: Task[];
  anytime: Task[];
  done: Task[];
}

export function groupTasks(tasks: Task[]): GroupedTasks {
  const visible = tasks.filter(isVisible);
  const timed = visible
    .filter((t) => isOpen(t) && isTimed(t))
    .sort((a, b) => new Date(a.start_time!).getTime() - new Date(b.start_time!).getTime());
  const anytime = visible
    .filter((t) => isOpen(t) && !isTimed(t))
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  const done = visible
    .filter(isDone)
    .sort(
      (a, b) =>
        new Date(b.completed_at ?? b.updated_at).getTime() -
        new Date(a.completed_at ?? a.updated_at).getTime()
    );
  return { timed, anytime, done };
}

/** The day a recurring task should next appear on. */
export function nextOccurrenceKey(key: string, recurrence: Recurrence): string {
  if (recurrence === "weekly") return addDaysToKey(key, 7);
  if (recurrence === "daily") return addDaysToKey(key, 1);
  let next = addDaysToKey(key, 1);
  while (weekdayOfKey(next) === 0 || weekdayOfKey(next) === 6) next = addDaysToKey(next, 1);
  return next;
}

export function checklistProgress(task: Task): { done: number; total: number } | null {
  if (!task.checklist?.length) return null;
  return { done: task.checklist.filter((i) => i.done).length, total: task.checklist.length };
}
