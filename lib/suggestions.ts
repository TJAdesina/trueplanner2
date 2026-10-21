import type { Profile, Suggestion, SuggestedAction, Task } from "./types";
import {
  addDaysToKey,
  dateKeyOf,
  formatInZone,
  hhmmToMinutes,
  minutesOfDay,
  roundUpToMinutes,
  zonedTimeToUtc,
} from "./time";
import { durationMinutes } from "./tasks";

/**
 * Decides which recovery move fits a slipped task, and works out the concrete
 * new times for each move. Deterministic: the AI only words things.
 */

const MIN_SHRUNK_MINUTES = 15;
const MAX_SHRUNK_MINUTES = 60;

export function defaultShrinkTitle(title: string): string {
  const clean = title.trim();
  const out = `First part of ${clean.charAt(0).toLowerCase()}${clean.slice(1)}`;
  return out.length > 80 ? `${out.slice(0, 77)}...` : out;
}

function roundTo5(minutes: number): number {
  return Math.max(5, Math.round(minutes / 5) * 5);
}

export function buildSuggestion(
  task: Task,
  profile: Pick<Profile, "timezone" | "working_hours_start" | "working_hours_end">,
  now: Date = new Date(),
  shrinkTitle?: string
): Suggestion {
  const tz = profile.timezone || "UTC";
  const duration = durationMinutes(task) ?? 30;

  // --- Move: later today if it still fits before the day ends, else tomorrow.
  const todayKey = dateKeyOf(now, tz);
  const dayEnd = hhmmToMinutes(profile.working_hours_end);
  const laterStart = roundUpToMinutes(new Date(now.getTime() + 10 * 60_000), 5);
  const laterEndMinutes = minutesOfDay(laterStart, tz) + duration;
  const sameDay = dateKeyOf(laterStart, tz) === todayKey;
  const fitsToday = sameDay && laterEndMinutes <= dayEnd;

  let moveStart: Date;
  let moveLabel: string;
  if (fitsToday) {
    moveStart = laterStart;
    moveLabel = `Today at ${formatInZone(moveStart, tz)}`;
  } else {
    moveStart = zonedTimeToUtc(addDaysToKey(todayKey, 1), profile.working_hours_start, tz);
    moveLabel = `Tomorrow at ${formatInZone(moveStart, tz)}`;
  }
  const moveEnd = new Date(moveStart.getTime() + duration * 60_000);

  // --- Shrink: a smaller window starting shortly from now.
  const shrunkMinutes = Math.min(
    duration,
    Math.min(MAX_SHRUNK_MINUTES, Math.max(MIN_SHRUNK_MINUTES, roundTo5(duration / 2)))
  );
  const shrinkStart = roundUpToMinutes(new Date(now.getTime() + 5 * 60_000), 5);
  const shrinkEnd = new Date(shrinkStart.getTime() + shrunkMinutes * 60_000);

  // --- Which one to recommend.
  let recommended: SuggestedAction;
  if (task.move_count >= 2) {
    recommended = task.priority === "low" ? "remove" : "shrink";
  } else if (task.priority === "low" && task.move_count >= 1) {
    recommended = "remove";
  } else if (fitsToday) {
    recommended = "move";
  } else if (duration >= 30) {
    recommended = "shrink";
  } else {
    recommended = "move";
  }

  return {
    recommended,
    shrink: {
      title: (shrinkTitle?.trim() || defaultShrinkTitle(task.title)).slice(0, 120),
      start: shrinkStart.toISOString(),
      end: shrinkEnd.toISOString(),
    },
    move: { start: moveStart.toISOString(), end: moveEnd.toISOString(), label: moveLabel },
  };
}
