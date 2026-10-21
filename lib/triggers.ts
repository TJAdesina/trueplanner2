import type { Profile, Task } from "./types";
import { hhmmToMinutes, minutesOfDay } from "./time";
import { isOpen, isTimed } from "./tasks";

/**
 * The deterministic half of the check-in system: it decides WHEN a task has
 * slipped. It contains no language at all. A separate writer (checkinWriter)
 * only decides how to phrase the situation.
 *
 * There is exactly one trigger: a timed task ran past its end time and is
 * still unfinished.
 */

/** Wait a couple of minutes after the end time before speaking up. */
export const GRACE_MINUTES = 2;
/** A task that ended more than this long ago is no longer worth a nudge. */
export const SLIP_WINDOW_MINUTES = 4 * 60;
/** Never send more than this many check-ins in a day. */
export const DAILY_CHECKIN_CAP = 4;
export const SNOOZE_MINUTES = 30;

const PRIORITY_RANK = { high: 0, medium: 1, low: 2 } as const;

/**
 * Tasks that have slipped and have not been flagged yet, most relevant first
 * (higher priority, then the one that ended earliest).
 */
export function findSlipped(tasks: Task[], now: Date = new Date()): Task[] {
  const t = now.getTime();
  return tasks
    .filter((task) => {
      if (!isOpen(task) || !isTimed(task)) return false;
      if (task.last_checkin_at) return false;
      if (task.snoozed_until && new Date(task.snoozed_until).getTime() > t) return false;
      const end = new Date(task.end_time!).getTime();
      const age = (t - end) / 60000;
      return age >= GRACE_MINUTES && age <= SLIP_WINDOW_MINUTES;
    })
    .sort(
      (a, b) =>
        PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
        new Date(a.end_time!).getTime() - new Date(b.end_time!).getTime()
    );
}

export function gapMinutes(profile: Pick<Profile, "checkin_gap_minutes">): number {
  const gap = Number(profile.checkin_gap_minutes);
  if (!Number.isFinite(gap)) return 30;
  return Math.min(240, Math.max(10, Math.round(gap)));
}

export function isQuietHours(
  now: Date,
  profile: Pick<Profile, "quiet_hours_start" | "quiet_hours_end" | "timezone">,
  timeZone: string = profile.timezone
): boolean {
  if (!profile.quiet_hours_start || !profile.quiet_hours_end) return false;
  const start = hhmmToMinutes(profile.quiet_hours_start);
  const end = hhmmToMinutes(profile.quiet_hours_end);
  if (start === end) return false;
  const cur = minutesOfDay(now, timeZone);
  if (start < end) return cur >= start && cur < end;
  return cur >= start || cur < end; // wraps past midnight, e.g. 22:00 to 07:00
}
