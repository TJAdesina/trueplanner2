/**
 * Date and time helpers. Everything here is pure (no DOM, no network) so it
 * runs identically in the browser, in API routes and in the scheduled job.
 *
 * "Day keys" are YYYY-MM-DD strings. When a time zone is passed they describe
 * the calendar day in that zone; without one they use the machine's local zone.
 */

const pad = (n: number) => String(n).padStart(2, "0");

export function formatTime(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export function formatTimeRange(startIso: string, endIso: string): string {
  const a = formatTime(startIso);
  const b = formatTime(endIso);
  const samePeriod = a.slice(-2) === b.slice(-2);
  return samePeriod ? `${a.slice(0, -3)}–${b}` : `${a}–${b}`;
}

export function minutesBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 60000);
}

export function formatDuration(minutes: number): string {
  const abs = Math.abs(Math.round(minutes));
  if (abs < 60) return `${abs} min`;
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}

/** 45m, 1h, 1h 30m. */
export function formatShortDuration(minutes: number): string {
  const abs = Math.abs(Math.round(minutes));
  if (abs < 60) return `${abs}m`;
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

// ---------------------------------------------------------------------------
// Day keys
// ---------------------------------------------------------------------------

export function dateKeyOf(date: Date, timeZone?: string): string {
  if (!timeZone) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);
  } catch {
    return dateKeyOf(date, "UTC");
  }
  const v = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${v.year}-${v.month}-${v.day}`;
}

export function todayKey(timeZone?: string): string {
  return dateKeyOf(new Date(), timeZone);
}

function keyParts(key: string): [number, number, number] {
  const [y, m, d] = key.split("-").map(Number);
  return [y, m, d];
}

export function addDaysToKey(key: string, days: number): string {
  const [y, m, d] = keyParts(key);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

export function daysBetweenKeys(from: string, to: string): number {
  const [fy, fm, fd] = keyParts(from);
  const [ty, tm, td] = keyParts(to);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000);
}

/** 0 = Sunday ... 6 = Saturday. */
export function weekdayOfKey(key: string): number {
  const [y, m, d] = keyParts(key);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** A local Date for a day key and a time of day. */
export function keyToLocalDate(key: string, hhmm = "00:00"): Date {
  const [y, m, d] = keyParts(key);
  const [h, mi] = hhmm.split(":").map(Number);
  return new Date(y, m - 1, d, h || 0, mi || 0, 0, 0);
}

export function formatDayLabel(key: string, today: string = todayKey()): string {
  if (key === today) return "Today";
  if (key === addDaysToKey(today, 1)) return "Tomorrow";
  if (key === addDaysToKey(today, -1)) return "Yesterday";
  return keyToLocalDate(key).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function formatLongDate(key: string): string {
  return keyToLocalDate(key).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Time of day
// ---------------------------------------------------------------------------

/** "09:30" -> 570. */
export function hhmmToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function minutesToHhmm(total: number): string {
  const t = ((Math.round(total) % 1440) + 1440) % 1440;
  return `${pad(Math.floor(t / 60))}:${pad(t % 60)}`;
}

/** Local "HH:mm" for a Date, as used by <input type="time">. */
export function toTimeInput(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Minutes since midnight in the given zone (or the local zone). */
export function minutesOfDay(date: Date, timeZone?: string): number {
  if (!timeZone) return date.getHours() * 60 + date.getMinutes();
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(date);
    const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
    const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
    return h * 60 + m;
  } catch {
    return minutesOfDay(date, "UTC");
  }
}

function tzOffsetMs(utcMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(utcMs));
  const v = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const asUtc = Date.UTC(v("year"), v("month") - 1, v("day"), v("hour"), v("minute"), v("second"));
  return asUtc - Math.floor(utcMs / 1000) * 1000;
}

/** The instant at which a wall-clock time occurs in a given zone. */
export function zonedTimeToUtc(key: string, hhmm: string, timeZone: string): Date {
  const [y, m, d] = keyParts(key);
  const [h, mi] = hhmm.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, h || 0, mi || 0);
  try {
    let ms = guess - tzOffsetMs(guess, timeZone);
    ms = guess - tzOffsetMs(ms, timeZone); // second pass settles DST edges
    return new Date(ms);
  } catch {
    return new Date(guess);
  }
}

export function startOfDayInZone(key: string, timeZone: string): Date {
  return zonedTimeToUtc(key, "00:00", timeZone);
}

export function roundUpToMinutes(date: Date, step: number): Date {
  const ms = step * 60_000;
  return new Date(Math.ceil(date.getTime() / ms) * ms);
}

export function formatInZone(date: Date, timeZone: string): string {
  try {
    return date.toLocaleTimeString("en-US", { timeZone, hour: "numeric", minute: "2-digit" });
  } catch {
    return formatTime(date);
  }
}

// ---------------------------------------------------------------------------
// Duration / time text parsing
// ---------------------------------------------------------------------------

/**
 * Accepts "90", "45m", "1h", "1.5h", "1h30", "1h 30m", "2 hours".
 * Returns minutes, or null when the text isn't a duration.
 */
export function parseDurationText(text: string): number | null {
  const t = text.trim().toLowerCase();
  if (!t) return null;

  let match = t.match(/^(\d+)\s*h(?:ours?|rs?)?\s*(\d+)\s*(?:m|min|mins|minutes)?$/);
  if (match) return Number(match[1]) * 60 + Number(match[2]);

  match = t.match(/^(\d+(?:\.\d+)?)\s*(h|hr|hrs|hour|hours)$/);
  if (match) return Math.round(Number(match[1]) * 60);

  match = t.match(/^(\d+)\s*(m|min|mins|minute|minutes)?$/);
  if (match) return Number(match[1]);

  return null;
}

/** Accepts "4pm", "4:30 pm", "16:30". Returns "HH:mm" or null. */
export function parseClockText(text: string): string | null {
  const t = text.trim().toLowerCase();
  const match = t.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
  if (!match) return null;
  let h = Number(match[1]);
  const m = match[2] ? Number(match[2]) : 0;
  const period = match[3];
  if (m > 59) return null;
  if (period) {
    if (h < 1 || h > 12) return null;
    if (period === "pm" && h !== 12) h += 12;
    if (period === "am" && h === 12) h = 0;
  } else if (h > 23) {
    return null;
  }
  return `${pad(h)}:${pad(m)}`;
}
