import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import * as ops from "@/lib/taskOps";
import { OPEN_STATUSES, isOpen } from "@/lib/tasks";
import { addDaysToKey, dateKeyOf, todayKey } from "@/lib/time";
import type { Task, TaskDraft } from "@/lib/types";

/** How far back "carried over" looks for unfinished work. */
const CARRY_DAYS = 14;

export function useTasks(dateKey: string) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [carried, setCarried] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const userId = useRef<string | null>(null);
  const dateRef = useRef(dateKey);
  dateRef.current = dateKey;

  const db = useCallback(() => createClient(), []);

  const getUserId = useCallback(async (): Promise<string> => {
    if (userId.current) return userId.current;
    const {
      data: { user },
    } = await db().auth.getUser();
    if (!user) throw new Error("You're signed out. Sign in again to continue.");
    userId.current = user.id;
    return user.id;
  }, [db]);

  const refresh = useCallback(async () => {
    const supabase = db();
    const key = dateRef.current;
    const { data } = await supabase.from("tasks").select(ops.TASK_SELECT).eq("task_date", key);
    setTasks(((data ?? []) as unknown as Parameters<typeof ops.rowToTask>[0][]).map(ops.rowToTask));

    const today = todayKey();
    if (key === today) {
      const { data: older } = await supabase
        .from("tasks")
        .select(ops.TASK_SELECT)
        .lt("task_date", today)
        .gte("task_date", addDaysToKey(today, -CARRY_DAYS))
        .in("status", OPEN_STATUSES as unknown as string[])
        .order("task_date", { ascending: true });
      setCarried(((older ?? []) as unknown as Parameters<typeof ops.rowToTask>[0][]).map(ops.rowToTask));
    } else {
      setCarried([]);
    }
    setLoading(false);
  }, [db]);

  useEffect(() => {
    setLoading(true);
    refresh();
  }, [dateKey, refresh]);

  /** Keeps local state in step with a task that just changed. */
  const upsert = useCallback((task: Task) => {
    setCarried((prev) => {
      const stillCarried = isOpen(task) && task.task_date < todayKey();
      if (!stillCarried) return prev.filter((t) => t.id !== task.id);
      return prev.map((t) => (t.id === task.id ? task : t));
    });
    setTasks((prev) => {
      const without = prev.filter((t) => t.id !== task.id);
      return task.task_date === dateRef.current ? [...without, task] : without;
    });
  }, []);

  const drop = useCallback((taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    setCarried((prev) => prev.filter((t) => t.id !== taskId));
  }, []);

  // --- actions ------------------------------------------------------------

  const add = useCallback(
    async (draft: TaskDraft): Promise<Task> => {
      const id = await getUserId();
      // A task created already past its time shouldn't instantly count as slipped.
      const alreadyPast = draft.end_time && new Date(draft.end_time).getTime() <= Date.now();
      const task = await ops.createTask(db(), id, {
        ...draft,
        last_checkin_at: alreadyPast ? new Date().toISOString() : (draft.last_checkin_at ?? null),
      });
      upsert(task);
      return task;
    },
    [db, getUserId, upsert]
  );

  const complete = useCallback(
    async (task: Task) => {
      upsert({ ...task, status: "completed", completed_at: new Date().toISOString() });
      try {
        const result = await ops.completeTask(db(), task);
        upsert(result.task);
        if (result.spawned) upsert(result.spawned);
        return result;
      } catch (error) {
        upsert(task);
        throw error;
      }
    },
    [db, upsert]
  );

  const reopen = useCallback(
    async (task: Task) => {
      upsert({ ...task, status: "not_started", completed_at: null });
      try {
        const updated = await ops.reopenTask(db(), task);
        upsert(updated);
        return updated;
      } catch (error) {
        upsert(task);
        throw error;
      }
    },
    [db, upsert]
  );

  /** Edit from the full editor. Re-arms the check-in when the time window changes. */
  const update = useCallback(
    async (task: Task, patch: ops.TaskPatch, tagIds?: string[]) => {
      const timesChanged =
        (patch.start_time !== undefined && patch.start_time !== task.start_time) ||
        (patch.end_time !== undefined && patch.end_time !== task.end_time);
      const nextEnd = patch.end_time !== undefined ? patch.end_time : task.end_time;
      const full: ops.TaskPatch = { ...patch };
      if (timesChanged) {
        const past = nextEnd && new Date(nextEnd).getTime() <= Date.now();
        full.last_checkin_at = past ? new Date().toISOString() : null;
        full.snoozed_until = null;
        full.reminded_at = null;
      }
      const updated = await ops.patchTask(db(), task.user_id, task.id, full, tagIds, { type: "edited" });
      upsert(updated);
      return updated;
    },
    [db, upsert]
  );

  const shrink = useCallback(
    async (task: Task, title: string, start: string | null, end: string | null) => {
      const updated = await ops.shrinkTask(db(), task, {
        title,
        start,
        end,
        taskDate: start ? dateKeyOf(new Date(start)) : task.task_date,
      });
      upsert(updated);
      return updated;
    },
    [db, upsert]
  );

  const move = useCallback(
    async (task: Task, start: string | null, end: string | null, taskDate: string) => {
      const updated = await ops.moveTask(db(), task, { start, end, taskDate });
      upsert(updated);
      return updated;
    },
    [db, upsert]
  );

  const remove = useCallback(
    async (task: Task) => {
      drop(task.id);
      try {
        await ops.deleteTask(db(), task.id);
      } catch (error) {
        upsert(task);
        throw error;
      }
    },
    [db, drop, upsert]
  );

  const revert = useCallback(
    async (snapshot: Task, undoEvent?: "completed" | "shrunk" | "moved") => {
      const restored = await ops.revertTask(db(), snapshot, undoEvent);
      upsert(restored);
      return restored;
    },
    [db, upsert]
  );

  const restore = useCallback(
    async (snapshot: Task) => {
      const restored = await ops.restoreTask(db(), snapshot);
      upsert(restored);
      return restored;
    },
    [db, upsert]
  );

  const removeById = useCallback(
    async (taskId: string) => {
      await ops.deleteTask(db(), taskId);
      drop(taskId);
    },
    [db, drop]
  );

  return {
    tasks,
    carried,
    loading,
    refresh,
    add,
    complete,
    reopen,
    update,
    shrink,
    move,
    remove,
    revert,
    restore,
    removeById,
  };
}

/** Searches across every day, newest first. */
export function useTaskSearch(query: string) {
  const [results, setResults] = useState<Task[]>([]);
  const [searching, setSearching] = useState(false);
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const handle = setTimeout(async () => {
      const escaped = q.replace(/[%_,()]/g, " ");
      const { data } = await createClient()
        .from("tasks")
        .select(ops.TASK_SELECT)
        .or(`title.ilike.%${escaped}%,description.ilike.%${escaped}%`)
        .order("task_date", { ascending: false })
        .limit(50);
      setResults(
        ((data ?? []) as unknown as Parameters<typeof ops.rowToTask>[0][])
          .map(ops.rowToTask)
          .filter((t) => t.status !== "cut" && t.status !== "archived")
      );
      setSearching(false);
    }, 250);
    return () => clearTimeout(handle);
  }, [query, version]);

  return { results, searching, reload };
}
