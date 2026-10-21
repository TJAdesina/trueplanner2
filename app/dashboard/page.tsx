"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { DayHeader } from "@/components/dashboard/DayHeader";
import { QuickAdd, type QuickAddHandle } from "@/components/dashboard/QuickAdd";
import { TaskList } from "@/components/dashboard/TaskList";
import { TaskRow, type TaskActions } from "@/components/dashboard/TaskRow";
import { TaskEditor } from "@/components/dashboard/TaskEditor";
import { MoveModal, type MoveTarget } from "@/components/dashboard/MoveModal";
import { ShrinkModal } from "@/components/dashboard/ShrinkModal";
import { SuggestionCard } from "@/components/dashboard/SuggestionCard";
import { CarriedOver } from "@/components/dashboard/CarriedOver";
import { EndOfDay } from "@/components/dashboard/EndOfDay";
import { TagDot } from "@/components/dashboard/TagPicker";
import { useToast } from "@/components/ui/Toast";
import { useProfile } from "@/hooks/useProfile";
import { useTasks, useTaskSearch } from "@/hooks/useTasks";
import { useTags } from "@/hooks/useTags";
import { useCheckins, type CheckinAnswer } from "@/hooks/useCheckins";
import { useNow } from "@/hooks/useNow";
import { dateKeyOf, formatDayLabel } from "@/lib/time";
import type { TaskPatch } from "@/lib/taskOps";
import type { Task, TaskDraft } from "@/lib/types";

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong. Try again.";
}

export default function DashboardPage() {
  const { profile, loading: profileLoading, updateProfile } = useProfile();
  const toast = useToast();
  const now = useNow(30_000);
  const today = dateKeyOf(now);

  const [dateKey, setDateKey] = useState(() => dateKeyOf(new Date()));
  const tasksApi = useTasks(dateKey);
  const { tasks, carried, loading, refresh } = tasksApi;
  const { tags, tagsById, createTag } = useTags();
  const { checkin, busy, answer } = useCheckins(Boolean(profile?.notifications_enabled));

  const quickAdd = useRef<QuickAddHandle>(null);
  const [editing, setEditing] = useState<Task | null>(null);
  const [moving, setMoving] = useState<Task | null>(null);
  const [shrinking, setShrinking] = useState<Task | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const search = useTaskSearch(searchOpen ? query : "");

  const afterChange = useCallback(() => {
    if (searchOpen) search.reload();
  }, [searchOpen, search]);

  // Keep this view fresh when you come back to it, and when a notification button did the work.
  useEffect(() => {
    const onVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVisible);
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === "tasks-refresh") {
        refresh();
        afterChange();
      }
    };
    navigator.serviceWorker?.addEventListener("message", onMessage);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      navigator.serviceWorker?.removeEventListener("message", onMessage);
    };
  }, [refresh, afterChange]);

  // "/" jumps to the add box from anywhere.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
      const el = event.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable)) return;
      event.preventDefault();
      setSearchOpen(false);
      quickAdd.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ---- task actions --------------------------------------------------------

  const handleAdd = useCallback(
    async (draft: TaskDraft) => {
      try {
        await tasksApi.add(draft);
      } catch (error) {
        toast(errorText(error), { tone: "error" });
        throw error;
      }
    },
    [tasksApi, toast]
  );

  const handleToggle = useCallback(
    async (task: Task) => {
      try {
        if (task.status === "completed") {
          await tasksApi.reopen(task);
        } else {
          const { spawned } = await tasksApi.complete(task);
          toast(spawned ? "Done. Next one is scheduled." : "Marked as done.", {
            actionLabel: "Undo",
            onAction: async () => {
              try {
                await tasksApi.revert(task, "completed");
                if (spawned) await tasksApi.removeById(spawned.id);
                afterChange();
              } catch (error) {
                toast(errorText(error), { tone: "error" });
              }
            },
          });
        }
        afterChange();
      } catch (error) {
        toast(errorText(error), { tone: "error" });
      }
    },
    [tasksApi, toast, afterChange]
  );

  const handleDelete = useCallback(
    async (task: Task) => {
      try {
        await tasksApi.remove(task);
        afterChange();
        toast(`Deleted "${task.title.length > 40 ? `${task.title.slice(0, 40)}...` : task.title}".`, {
          actionLabel: "Undo",
          onAction: async () => {
            try {
              await tasksApi.restore(task);
              afterChange();
            } catch (error) {
              toast(errorText(error), { tone: "error" });
            }
          },
        });
      } catch (error) {
        toast(errorText(error), { tone: "error" });
      }
    },
    [tasksApi, toast, afterChange]
  );

  const handleSave = useCallback(
    async (task: Task, patch: TaskPatch, tagIds: string[]) => {
      try {
        await tasksApi.update(task, patch, tagIds);
        afterChange();
      } catch (error) {
        toast(errorText(error), { tone: "error" });
        throw error;
      }
    },
    [tasksApi, toast, afterChange]
  );

  const handleMove = useCallback(
    async (task: Task, target: MoveTarget) => {
      try {
        await tasksApi.move(task, target.start, target.end, target.taskDate);
        afterChange();
        toast(`Moved to ${formatDayLabel(target.taskDate, today).toLowerCase()}.`, {
          actionLabel: "Undo",
          onAction: async () => {
            try {
              await tasksApi.revert(task, "moved");
              await refresh();
              afterChange();
            } catch (error) {
              toast(errorText(error), { tone: "error" });
            }
          },
        });
      } catch (error) {
        toast(errorText(error), { tone: "error" });
        throw error;
      }
    },
    [tasksApi, toast, today, refresh, afterChange]
  );

  const handleShrink = useCallback(
    async (task: Task, title: string, start: string | null, end: string | null) => {
      try {
        await tasksApi.shrink(task, title, start, end);
        afterChange();
        toast("Shrunk to a smaller task.", {
          actionLabel: "Undo",
          onAction: async () => {
            try {
              await tasksApi.revert(task, "shrunk");
              afterChange();
            } catch (error) {
              toast(errorText(error), { tone: "error" });
            }
          },
        });
      } catch (error) {
        toast(errorText(error), { tone: "error" });
        throw error;
      }
    },
    [tasksApi, toast, afterChange]
  );

  const handleCarryOver = useCallback(
    async (list: Task[]) => {
      try {
        for (const task of list) await tasksApi.move(task, null, null, today);
        toast(list.length === 1 ? "Moved 1 task to today." : `Moved ${list.length} tasks to today.`, {
          actionLabel: "Undo",
          onAction: async () => {
            try {
              for (const task of list) await tasksApi.revert(task, "moved");
              await refresh();
            } catch (error) {
              toast(errorText(error), { tone: "error" });
            }
          },
        });
      } catch (error) {
        toast(errorText(error), { tone: "error" });
      }
    },
    [tasksApi, toast, today, refresh]
  );

  // ---- answering a check-in -----------------------------------------------

  const handleAnswer = useCallback(
    async (choice: CheckinAnswer) => {
      const result = await answer(choice);
      if (!result.ok) {
        toast(result.error ?? "Something went wrong. Try again.", { tone: "error" });
        return;
      }
      if (choice === "dismiss") return;
      await refresh();
      afterChange();
      if (!result.message) return;

      const { previous, undo, spawnedId } = result;
      toast(
        result.message,
        previous && undo
          ? {
              actionLabel: "Undo",
              onAction: async () => {
                try {
                  if (undo === "removed") await tasksApi.restore(previous);
                  else await tasksApi.revert(previous, undo === "completed" ? "completed" : undo === "shrunk" ? "shrunk" : "moved");
                  if (undo === "completed" && spawnedId) await tasksApi.removeById(spawnedId);
                  await refresh();
                  afterChange();
                } catch (error) {
                  toast(errorText(error), { tone: "error" });
                }
              },
            }
          : undefined
      );
    },
    [answer, toast, refresh, afterChange, tasksApi]
  );

  const actions: TaskActions = {
    onToggle: handleToggle,
    onEdit: setEditing,
    onMove: setMoving,
    onShrink: setShrinking,
    onDelete: handleDelete,
  };

  if (profileLoading || !profile) {
    return <p className="py-10 text-center text-sm text-charcoal/50">Loading your day&hellip;</p>;
  }

  const filtered = tagFilter.length ? tasks.filter((t) => t.tag_ids.some((id) => tagFilter.includes(id))) : tasks;
  const activeFilters = tags.filter((t) => tagFilter.includes(t.id));
  const modalOpen = Boolean(editing || moving || shrinking);

  return (
    <div className="space-y-5">
      <DayHeader
        dateKey={dateKey}
        today={today}
        onChange={setDateKey}
        searching={searchOpen}
        query={query}
        onQuery={setQuery}
        onToggleSearch={(open) => {
          setSearchOpen(open);
          if (!open) setQuery("");
        }}
        tags={tags}
        tagFilter={tagFilter}
        onTagFilter={setTagFilter}
      />

      {!searchOpen && <QuickAdd ref={quickAdd} dateKey={dateKey} tags={tags} onCreateTag={createTag} onAdd={handleAdd} />}

      {!searchOpen && dateKey === today && <CarriedOver tasks={carried} onMoveAll={handleCarryOver} />}

      {!searchOpen && activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-charcoal/55">
          Showing
          {activeFilters.map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => setTagFilter((prev) => prev.filter((id) => id !== tag.id))}
              className="inline-flex items-center gap-1.5 rounded-full bg-charcoal/[0.05] px-2.5 py-1 font-medium text-charcoal/70 hover:bg-charcoal/10"
              aria-label={`Stop filtering by ${tag.name}`}
            >
              <TagDot color={tag.color} />
              {tag.name}
              <X className="h-3 w-3" />
            </button>
          ))}
        </div>
      )}

      {searchOpen ? (
        query.trim() === "" ? (
          <p className="px-1 py-6 text-center text-sm text-charcoal/50">Type to search every day.</p>
        ) : search.results.length === 0 && !search.searching ? (
          <p className="px-1 py-6 text-center text-sm text-charcoal/50">No tasks match &ldquo;{query.trim()}&rdquo;.</p>
        ) : (
          <ul className="card divide-y divide-charcoal/[0.07]">
            {search.results.map((task) => (
              <TaskRow key={task.id} task={task} tagsById={tagsById} now={now} today={today} showDate {...actions} />
            ))}
          </ul>
        )
      ) : loading ? (
        <div className="card divide-y divide-charcoal/[0.07]" aria-busy="true" aria-label="Loading tasks">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-4">
              <div className="h-5 w-5 animate-pulse rounded-full bg-charcoal/10" />
              <div className="h-3.5 flex-1 animate-pulse rounded bg-charcoal/10" style={{ maxWidth: `${70 - i * 15}%` }} />
            </div>
          ))}
        </div>
      ) : (
        <TaskList tasks={filtered} tagsById={tagsById} now={now} today={today} isToday={dateKey === today} {...actions} />
      )}

      {editing && (
        <TaskEditor
          task={editing}
          tags={tags}
          onClose={() => setEditing(null)}
          onCreateTag={createTag}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}
      {moving && <MoveModal task={moving} onClose={() => setMoving(null)} onConfirm={(target) => handleMove(moving, target)} />}
      {shrinking && (
        <ShrinkModal
          task={shrinking}
          onClose={() => setShrinking(null)}
          onConfirm={(title, start, end) => handleShrink(shrinking, title, start, end)}
        />
      )}

      {checkin && <SuggestionCard checkin={checkin} busy={busy} onAnswer={handleAnswer} />}

      <EndOfDay profile={profile} updateProfile={updateProfile} blocked={Boolean(checkin) || modalOpen} onChanged={refresh} />
    </div>
  );
}
