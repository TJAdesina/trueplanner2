import type { SupabaseClient } from "@supabase/supabase-js";
import type { Checkin, Profile, Task } from "./types";
import { dateKeyOf, minutesBetween, startOfDayInZone } from "./time";
import { isOpen, isTimed, OPEN_STATUSES } from "./tasks";
import { rowToTask, TASK_SELECT } from "./taskOps";
import { DAILY_CHECKIN_CAP, findSlipped, gapMinutes, isQuietHours } from "./triggers";
import { buildSuggestion } from "./suggestions";
import { writeCheckin } from "./checkinWriter";
import { sendCheckinPush, sendReminderPush } from "./push";

/**
 * Decides whether this user should hear about a slipped task right now and,
 * if so, creates the check-in and pushes it. Used by both the scheduled job
 * (for everyone, with the service role) and the open dashboard (for one user).
 * Both paths share the same atomic create step, so they can never double up.
 */

type Db = SupabaseClient;

export interface EvaluateResult {
  checkin: Checkin | null;
  created: boolean;
  reason?: string;
}

const none = (reason: string): EvaluateResult => ({ checkin: null, created: false, reason });

function stillRelevant(task: Task | null, now: Date): boolean {
  if (!task || !isOpen(task) || !isTimed(task)) return false;
  if (new Date(task.end_time).getTime() > now.getTime()) return false;
  if (task.snoozed_until && new Date(task.snoozed_until).getTime() > now.getTime()) return false;
  return true;
}

async function closeCheckin(db: Db, id: string, status: "dismissed" | "actioned") {
  await db
    .from("checkins")
    .update({ status, resolved_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "pending");
}

export async function evaluateCheckin(db: Db, profile: Profile, now: Date = new Date()): Promise<EvaluateResult> {
  if (!profile.notifications_enabled) return none("disabled");

  const tz = profile.timezone || "UTC";
  const gap = gapMinutes(profile);

  // 1. An open suggestion already exists: keep showing it while it still makes
  //    sense. Ignoring it for a full gap counts as dismissing it.
  const { data: pendingRows } = await db
    .from("checkins")
    .select("*")
    .eq("user_id", profile.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1);
  const pending = pendingRows?.[0] as Checkin | undefined;
  if (pending) {
    const age = minutesBetween(new Date(pending.created_at), now);
    let task: Task | null = null;
    if (pending.task_id) {
      const { data } = await db.from("tasks").select(TASK_SELECT).eq("id", pending.task_id).maybeSingle();
      task = data ? rowToTask(data) : null;
    }
    if (age < gap && stillRelevant(task, now)) return { checkin: pending, created: false, reason: "pending" };
    await closeCheckin(db, pending.id, "dismissed");
  }

  if (isQuietHours(now, profile, tz)) return none("quiet-hours");

  // 2. Has anything slipped?
  const today = dateKeyOf(now, tz);
  const { data: rows, error } = await db
    .from("tasks")
    .select(TASK_SELECT)
    .eq("user_id", profile.id)
    .eq("task_date", today)
    .not("start_time", "is", null)
    .in("status", OPEN_STATUSES as unknown as string[]);
  if (error) return none("tasks-unavailable");

  const slipped = findSlipped((rows ?? []).map(rowToTask), now);
  if (!slipped.length) return none("nothing-slipped");

  // 3. Cheap pre-checks (the create step below enforces them atomically).
  const { data: recent } = await db
    .from("checkins")
    .select("id")
    .eq("user_id", profile.id)
    .gte("created_at", new Date(now.getTime() - gap * 60_000).toISOString())
    .limit(1);
  if (recent?.length) return none("within-gap");

  const dayStart = startOfDayInZone(today, tz);
  const { count } = await db
    .from("checkins")
    .select("id", { count: "exact", head: true })
    .eq("user_id", profile.id)
    .gte("created_at", dayStart.toISOString());
  if ((count ?? 0) >= DAILY_CHECKIN_CAP) return none("daily-cap");

  // 4. Write it.
  const primary = slipped[0];
  const related = slipped.length - 1;
  const minutesOver = Math.max(0, minutesBetween(new Date(primary.end_time!), now));
  const baseSuggestion = buildSuggestion(primary, profile, now);
  const content = await writeCheckin(
    { task: primary, minutesOver, suggestion: baseSuggestion, relatedCount: related },
    profile.ai_processing_enabled !== false
  );
  const suggestion = content.shrinkTitle
    ? buildSuggestion(primary, profile, now, content.shrinkTitle)
    : baseSuggestion;

  const candidateId = crypto.randomUUID();
  const { data: created, error: createError } = await db.rpc("create_checkin_v2", {
    p_checkin_id: candidateId,
    p_user_id: profile.id,
    p_task_id: primary.id,
    p_headline: content.headline,
    p_message: content.message,
    p_source: content.source,
    p_suggestion: suggestion,
    p_gap_minutes: gap,
    p_daily_cap: DAILY_CHECKIN_CAP,
    p_day_start: dayStart.toISOString(),
  });
  if (createError) {
    console.error("Could not create a check-in.", createError);
    return none("create-failed");
  }

  const checkin = (created?.[0] ?? null) as Checkin | null;
  if (!checkin) return none("not-allowed");
  if (checkin.id !== candidateId) return { checkin, created: false, reason: "pending" };

  // One notification covers everything that slipped: mark them all as flagged
  // so the others never arrive as a separate chain of nudges.
  await db
    .from("tasks")
    .update({ last_checkin_at: now.toISOString() })
    .in("id", slipped.map((t) => t.id));

  await sendCheckinPush(db, checkin);
  return { checkin, created: true };
}

/** Optional "remind me when it starts" notifications. Each task fires once. */
export async function sendStartReminders(db: Db, profile: Profile, now: Date = new Date()): Promise<number> {
  if (!profile.notifications_enabled) return 0;
  const tz = profile.timezone || "UTC";
  if (isQuietHours(now, profile, tz)) return 0;

  const { data: rows } = await db
    .from("tasks")
    .select("*")
    .eq("user_id", profile.id)
    .eq("remind_at_start", true)
    .is("reminded_at", null)
    .in("status", OPEN_STATUSES as unknown as string[])
    .gte("start_time", new Date(now.getTime() - 15 * 60_000).toISOString())
    .lte("start_time", now.toISOString());

  let sent = 0;
  for (const row of rows ?? []) {
    // Claim it first so two callers at once can't both send.
    const { data: claimed } = await db
      .from("tasks")
      .update({ reminded_at: now.toISOString() })
      .eq("id", row.id)
      .is("reminded_at", null)
      .select("id");
    if (!claimed?.length) continue;
    await sendReminderPush(db, rowToTask(row), tz);
    sent += 1;
  }
  return sent;
}
