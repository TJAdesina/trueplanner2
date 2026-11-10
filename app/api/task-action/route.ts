import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { completeTask, patchTask, rowToTask, TASK_SELECT } from "@/lib/taskOps";
import { isTimed } from "@/lib/tasks";
import { EXTEND_MINUTES } from "@/lib/triggers";
import { formatInZone } from "@/lib/time";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
  }

  const value = payload as { taskId?: string; action?: "done" | "extend" };
  if (!value.taskId || (value.action !== "done" && value.action !== "extend")) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const { data: taskRow } = await supabase.from("tasks").select(TASK_SELECT).eq("id", value.taskId).eq("user_id", user.id).maybeSingle();
  if (!taskRow) return NextResponse.json({ error: "Task not found" }, { status: 404 });

  const task = rowToTask(taskRow);

  if (value.action === "done") {
    await completeTask(supabase, task);
    return NextResponse.json({ ok: true, message: "Marked as done." });
  }

  if (!isTimed(task)) {
    return NextResponse.json({ error: "This task is not timed." }, { status: 400 });
  }

  const profileRow = await supabase.from("profiles").select("timezone").eq("id", user.id).maybeSingle();
  const timezone = profileRow?.data?.timezone || "UTC";
  const nextEnd = new Date(new Date(task.end_time).getTime() + EXTEND_MINUTES * 60_000);
  const updated = await patchTask(
    supabase,
    user.id,
    task.id,
    { end_time: nextEnd.toISOString() },
    undefined,
    { type: "extended" }
  );

  return NextResponse.json({
    ok: true,
    message: `Added 15 minutes. Now ends at ${formatInZone(new Date(updated.end_time ?? nextEnd), timezone)}.`,
  });
}
