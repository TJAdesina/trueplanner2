import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { completeTask, deleteTask, moveTask, rowToTask, shrinkTask, snoozeTask, TASK_SELECT } from "@/lib/taskOps";
import { buildSuggestion } from "@/lib/suggestions";
import { SNOOZE_MINUTES } from "@/lib/triggers";
import { dateKeyOf } from "@/lib/time";
import type { Checkin, CheckinAction, Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

type ActAction = "recommended" | "shrink" | "move" | "remove" | "done" | "dismiss" | "snooze";
const VALID: ActAction[] = ["recommended", "shrink", "move", "remove", "done", "dismiss", "snooze"];

/**
 * Applies a person's answer to a check-in. Used by the in-app card and by the
 * buttons on the system notification, so both do exactly the same thing.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const checkinId = typeof body.checkinId === "string" ? body.checkinId : "";
  const action = body.action as ActAction;
  if (!checkinId || !VALID.includes(action)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { data: checkinRow } = await supabase
    .from("checkins")
    .select("*")
    .eq("id", checkinId)
    .eq("user_id", user.id)
    .maybeSingle();
  const checkin = checkinRow as Checkin | null;
  if (!checkin) return NextResponse.json({ error: "That suggestion no longer exists" }, { status: 404 });
  if (checkin.status !== "pending") return NextResponse.json({ ok: true, alreadyHandled: true });

  const close = async (status: "actioned" | "dismissed", resolved: CheckinAction | null) => {
    await supabase
      .from("checkins")
      .update({ status, resolved_action: resolved, resolved_at: new Date().toISOString() })
      .eq("id", checkin.id);
  };

  if (action === "dismiss") {
    await close("dismissed", null);
    return NextResponse.json({ ok: true });
  }

  const { data: profileRow } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  const profile = profileRow as Profile | null;
  const { data: taskRow } = checkin.task_id
    ? await supabase.from("tasks").select(TASK_SELECT).eq("id", checkin.task_id).maybeSingle()
    : { data: null };
  if (!profile || !taskRow) {
    await close("dismissed", null);
    return NextResponse.json({ error: "That task no longer exists" }, { status: 404 });
  }
  const task = rowToTask(taskRow);
  const now = new Date();
  const tz = profile.timezone || "UTC";

  try {
    if (action === "snooze") {
      await snoozeTask(supabase, task, new Date(now.getTime() + SNOOZE_MINUTES * 60_000));
      await close("dismissed", null);
      return NextResponse.json({ ok: true, message: `I'll check back in ${SNOOZE_MINUTES} minutes.` });
    }

    if (action === "done") {
      const { spawned } = await completeTask(supabase, task);
      await close("actioned", null);
      return NextResponse.json({
        ok: true,
        message: `Marked "${task.title}" as done.`,
        previous: task,
        undo: "completed",
        spawnedId: spawned?.id ?? null,
      });
    }

    // Times are recomputed now, because the stored ones may be minutes old.
    const stored = checkin.suggestion;
    const fresh = buildSuggestion(task, profile, now, stored?.shrink.title);
    const chosen = action === "recommended" ? (stored?.recommended ?? fresh.recommended) : action;

    if (chosen === "shrink") {
      await shrinkTask(supabase, task, {
        title: fresh.shrink.title,
        start: fresh.shrink.start,
        end: fresh.shrink.end,
        taskDate: dateKeyOf(new Date(fresh.shrink.start), tz),
      });
      await close("actioned", "shrink");
      return NextResponse.json({
        ok: true,
        message: `Shrunk to "${fresh.shrink.title}".`,
        previous: task,
        undo: "shrunk",
      });
    }

    if (chosen === "move") {
      await moveTask(supabase, task, {
        start: fresh.move.start,
        end: fresh.move.end,
        taskDate: dateKeyOf(new Date(fresh.move.start), tz),
      });
      await close("actioned", "move");
      return NextResponse.json({
        ok: true,
        message: `Moved to ${fresh.move.label.charAt(0).toLowerCase()}${fresh.move.label.slice(1)}.`,
        previous: task,
        undo: "moved",
      });
    }

    await deleteTask(supabase, task.id);
    await close("actioned", "cut");
    return NextResponse.json({
      ok: true,
      message: `Removed "${task.title}".`,
      previous: task,
      undo: "removed",
    });
  } catch (error) {
    console.error("Could not apply a check-in action.", error);
    return NextResponse.json({ error: "Could not apply that change" }, { status: 500 });
  }
}
