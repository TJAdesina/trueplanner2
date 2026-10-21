import type { SupabaseClient } from "@supabase/supabase-js";
import type { Task, TaskDraft } from "./types";
import { daysBetweenKeys } from "./time";
import { nextOccurrenceKey } from "./tasks";

/**
 * Every change to a task goes through here, whether it comes from a tap in
 * the browser or from a notification button handled on the server. One
 * implementation means the two paths can never disagree.
 */

export const TASK_SELECT = "*, task_tags(tag_id)";

type Row = Record<string, unknown> & { task_tags?: { tag_id: string }[] | null };

export function rowToTask(row: Row): Task {
  const { task_tags, ...rest } = row;
  return {
    ...rest,
    checklist: Array.isArray(rest.checklist) ? rest.checklist : [],
    tag_ids: (task_tags ?? []).map((t) => t.tag_id),
  } as unknown as Task;
}

type Db = SupabaseClient;

async function logEvent(db: Db, userId: string, taskId: string, eventType: string, detail?: string) {
  await db
    .from("task_events")
    .insert({ user_id: userId, task_id: taskId, event_type: eventType, detail: detail ?? null });
}

async function fetchTask(db: Db, taskId: string): Promise<Task | null> {
  const { data } = await db.from("tasks").select(TASK_SELECT).eq("id", taskId).maybeSingle();
  return data ? rowToTask(data as Row) : null;
}

async function replaceTags(db: Db, userId: string, taskId: string, tagIds: string[]) {
  await db.from("task_tags").delete().eq("task_id", taskId);
  if (tagIds.length) {
    await db
      .from("task_tags")
      .insert(tagIds.map((tag_id) => ({ task_id: taskId, tag_id, user_id: userId })));
  }
}

export async function createTask(db: Db, userId: string, draft: TaskDraft): Promise<Task> {
  const { tag_ids = [], ...fields } = draft;
  const { data, error } = await db
    .from("tasks")
    .insert({ ...fields, user_id: userId, checklist: fields.checklist ?? [] })
    .select()
    .single();
  if (error || !data) throw new Error(error?.message ?? "Could not create the task.");
  if (tag_ids.length) await replaceTags(db, userId, data.id, tag_ids);
  await logEvent(db, userId, data.id, "created");
  return rowToTask({ ...(data as Row), task_tags: tag_ids.map((tag_id) => ({ tag_id })) });
}

export type TaskPatch = Partial<
  Pick<
    Task,
    | "title"
    | "description"
    | "start_time"
    | "end_time"
    | "task_date"
    | "priority"
    | "status"
    | "move_count"
    | "original_scope"
    | "last_checkin_at"
    | "snoozed_until"
    | "completed_at"
    | "recurrence"
    | "remind_at_start"
    | "reminded_at"
    | "checklist"
  >
>;

export async function patchTask(
  db: Db,
  userId: string,
  taskId: string,
  patch: TaskPatch,
  tagIds?: string[],
  event?: { type: string; detail?: string }
): Promise<Task> {
  const { error } = await db.from("tasks").update(patch).eq("id", taskId);
  if (error) throw new Error(error.message);
  if (tagIds) await replaceTags(db, userId, taskId, tagIds);
  if (event) await logEvent(db, userId, taskId, event.type, event.detail);
  const task = await fetchTask(db, taskId);
  if (!task) throw new Error("That task no longer exists.");
  return task;
}

// ---------------------------------------------------------------------------
// The things people do to a task
// ---------------------------------------------------------------------------

export async function completeTask(
  db: Db,
  task: Task
): Promise<{ task: Task; spawned: Task | null }> {
  const updated = await patchTask(
    db,
    task.user_id,
    task.id,
    { status: "completed", completed_at: new Date().toISOString() },
    undefined,
    { type: "completed" }
  );
  const spawned = task.recurrence ? await spawnNextOccurrence(db, task) : null;
  return { task: updated, spawned };
}

export async function reopenTask(db: Db, task: Task): Promise<Task> {
  return patchTask(
    db,
    task.user_id,
    task.id,
    { status: "not_started", completed_at: null },
    undefined,
    { type: "reopened" }
  );
}

export async function shrinkTask(
  db: Db,
  task: Task,
  next: { title: string; start: string | null; end: string | null; taskDate: string }
): Promise<Task> {
  return patchTask(
    db,
    task.user_id,
    task.id,
    {
      title: next.title,
      original_scope: task.original_scope ?? task.title,
      start_time: next.start,
      end_time: next.end,
      task_date: next.taskDate,
      last_checkin_at: null,
      snoozed_until: null,
      reminded_at: null,
      status: "not_started",
    },
    undefined,
    { type: "shrunk", detail: `Reduced from: ${task.title}` }
  );
}

/** Moves a task to a new day, optionally with a new time window. */
export async function moveTask(
  db: Db,
  task: Task,
  next: { start: string | null; end: string | null; taskDate: string }
): Promise<Task> {
  return patchTask(
    db,
    task.user_id,
    task.id,
    {
      start_time: next.start,
      end_time: next.end,
      task_date: next.taskDate,
      move_count: task.move_count + 1,
      last_checkin_at: null,
      snoozed_until: null,
      reminded_at: null,
      status: "not_started",
    },
    undefined,
    { type: "moved", detail: next.taskDate }
  );
}

export async function snoozeTask(db: Db, task: Task, until: Date): Promise<Task> {
  return patchTask(db, task.user_id, task.id, {
    last_checkin_at: null,
    snoozed_until: until.toISOString(),
  });
}

export async function deleteTask(db: Db, taskId: string): Promise<void> {
  const { error } = await db.from("tasks").delete().eq("id", taskId);
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// Undo
// ---------------------------------------------------------------------------

const REVERTABLE = [
  "title",
  "description",
  "start_time",
  "end_time",
  "task_date",
  "priority",
  "status",
  "move_count",
  "original_scope",
  "last_checkin_at",
  "snoozed_until",
  "completed_at",
  "reminded_at",
] as const;

/** Puts a task back exactly as it was, and forgets the event that undone step logged. */
export async function revertTask(
  db: Db,
  snapshot: Task,
  undoEvent?: "completed" | "shrunk" | "moved"
): Promise<Task> {
  const patch: Record<string, unknown> = {};
  for (const key of REVERTABLE) patch[key] = snapshot[key];
  const task = await patchTask(db, snapshot.user_id, snapshot.id, patch as TaskPatch);
  if (undoEvent) {
    const since = new Date(Date.now() - 30 * 60_000).toISOString();
    const { data } = await db
      .from("task_events")
      .select("id")
      .eq("task_id", snapshot.id)
      .eq("event_type", undoEvent)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(1);
    if (data?.[0]) await db.from("task_events").delete().eq("id", data[0].id);
  }
  return task;
}

/** Brings back a deleted task, with its tags. */
export async function restoreTask(db: Db, snapshot: Task): Promise<Task> {
  const { tag_ids, ...row } = snapshot;
  const { error } = await db.from("tasks").insert(row);
  if (error) throw new Error(error.message);
  if (tag_ids.length) await replaceTags(db, snapshot.user_id, snapshot.id, tag_ids);
  const task = await fetchTask(db, snapshot.id);
  if (!task) throw new Error("Could not restore that task.");
  return task;
}

// ---------------------------------------------------------------------------
// Recurrence
// ---------------------------------------------------------------------------

async function spawnNextOccurrence(db: Db, task: Task): Promise<Task | null> {
  if (!task.recurrence) return null;
  const nextKey = nextOccurrenceKey(task.task_date, task.recurrence);

  // Don't create a duplicate if the next one is already there.
  const { data: existing } = await db
    .from("tasks")
    .select("id")
    .eq("user_id", task.user_id)
    .eq("title", task.title)
    .eq("task_date", nextKey)
    .eq("recurrence", task.recurrence)
    .limit(1);
  if (existing?.length) return null;

  const shiftMs = daysBetweenKeys(task.task_date, nextKey) * 86_400_000;
  const shift = (iso: string | null) => (iso ? new Date(new Date(iso).getTime() + shiftMs).toISOString() : null);

  return createTask(db, task.user_id, {
    title: task.title,
    description: task.description,
    task_date: nextKey,
    start_time: shift(task.start_time),
    end_time: shift(task.end_time),
    priority: task.priority,
    recurrence: task.recurrence,
    remind_at_start: task.remind_at_start,
    checklist: task.checklist.map((item) => ({ ...item, done: false })),
    tag_ids: task.tag_ids,
  });
}
