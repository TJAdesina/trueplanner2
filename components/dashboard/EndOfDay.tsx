"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Moon, X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import * as ops from "@/lib/taskOps";
import { isDone, isOpen, isTimed, isVisible } from "@/lib/tasks";
import { addDaysToKey, hhmmToMinutes, keyToLocalDate, minutesOfDay, todayKey, toTimeInput } from "@/lib/time";
import type { Profile, Task } from "@/lib/types";

interface Review {
  tasks: Task[];
  shrunk: number;
  moved: number;
}

function reviewMessage(done: number, total: number, open: number, adjusted: number): string {
  if (open === 0) return "You finished everything on today's list.";
  if (done === 0) return "Nothing was finished today. Decide what still matters and carry it into tomorrow.";
  const base = `You finished ${done} of ${total}.`;
  return adjusted > 0 ? `${base} You also adjusted ${adjusted} along the way, which counts.` : `${base} ${open} still open.`;
}

/**
 * Appears once, after your day-end time, and only if you had tasks today.
 * It offers a short look back; it never forces one.
 */
export function EndOfDay({
  profile,
  updateProfile,
  blocked,
  onChanged,
}: {
  profile: Profile;
  updateProfile: (patch: Partial<Profile>) => Promise<unknown>;
  /** True while another pop-up is on screen. */
  blocked: boolean;
  onChanged: () => void;
}) {
  const toast = useToast();
  const [stage, setStage] = useState<"idle" | "prompt" | "review">("idle");
  const [review, setReview] = useState<Review | null>(null);
  const [moving, setMoving] = useState(false);
  const checking = useRef(false);

  const markPrompted = useCallback(
    (key: string) => updateProfile({ eod_prompted_on: key }),
    [updateProfile]
  );

  const check = useCallback(async () => {
    if (checking.current || stage !== "idle" || blocked) return;
    const today = todayKey();
    if (profile.eod_prompted_on === today) return;
    if (minutesOfDay(new Date()) < hhmmToMinutes(profile.working_hours_end)) return;

    checking.current = true;
    try {
      const supabase = createClient();
      const startOfToday = keyToLocalDate(today).toISOString();
      const [{ data: taskRows }, { data: events }] = await Promise.all([
        supabase.from("tasks").select(ops.TASK_SELECT).eq("task_date", today),
        supabase
          .from("task_events")
          .select("task_id, event_type")
          .in("event_type", ["shrunk", "moved"])
          .gte("created_at", startOfToday),
      ]);
      const tasks = ((taskRows ?? []) as unknown as Parameters<typeof ops.rowToTask>[0][])
        .map(ops.rowToTask)
        .filter(isVisible);

      if (tasks.length === 0) {
        // Nothing planned today: don't ask again.
        await markPrompted(today);
        return;
      }

      const distinct = (type: string) =>
        new Set((events ?? []).filter((e) => e.event_type === type).map((e) => e.task_id)).size;
      setReview({ tasks, shrunk: distinct("shrunk"), moved: distinct("moved") });
      setStage("prompt");
    } finally {
      checking.current = false;
    }
  }, [blocked, markPrompted, profile.eod_prompted_on, profile.working_hours_end, stage]);

  useEffect(() => {
    check();
    const id = setInterval(check, 60_000);
    return () => clearInterval(id);
  }, [check]);

  if (stage === "idle" || !review) return null;

  const total = review.tasks.length;
  const done = review.tasks.filter(isDone).length;
  const unfinished = review.tasks.filter(isOpen);
  const message = reviewMessage(done, total, unfinished.length, review.shrunk + review.moved);

  async function moveToTomorrow() {
    setMoving(true);
    const tomorrow = addDaysToKey(todayKey(), 1);
    const supabase = createClient();
    const snapshots: Task[] = [];
    try {
      for (const task of unfinished) {
        const length = isTimed(task) ? new Date(task.end_time).getTime() - new Date(task.start_time).getTime() : 0;
        const start = isTimed(task) ? keyToLocalDate(tomorrow, toTimeInput(new Date(task.start_time))) : null;
        await ops.moveTask(supabase, task, {
          start: start ? start.toISOString() : null,
          end: start ? new Date(start.getTime() + length).toISOString() : null,
          taskDate: tomorrow,
        });
        snapshots.push(task);
      }
      onChanged();
      setStage("idle");
      toast(snapshots.length === 1 ? "Moved 1 task to tomorrow." : `Moved ${snapshots.length} tasks to tomorrow.`, {
        actionLabel: "Undo",
        onAction: async () => {
          for (const snap of snapshots) await ops.revertTask(supabase, snap, "moved");
          onChanged();
        },
      });
    } catch {
      toast("Couldn't move those tasks. Try again.", { tone: "error" });
    } finally {
      setMoving(false);
    }
  }

  if (stage === "prompt") {
    return (
      <div
        role="dialog"
        aria-label="End of day"
        className="fixed inset-x-3 bottom-3 z-50 animate-cardIn rounded-card border border-charcoal/10 bg-surface p-4 shadow-soft sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[360px] sm:p-5"
      >
        <button
          type="button"
          aria-label="Not now"
          onClick={() => {
            markPrompted(todayKey());
            setStage("idle");
          }}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-charcoal/40 hover:bg-charcoal/5 hover:text-charcoal"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2.5 pr-8">
          <Moon className="h-4 w-4 text-forest/60" strokeWidth={1.75} aria-hidden="true" />
          <p className="font-serif text-lg text-forest">That&rsquo;s the day.</p>
        </div>
        <p className="mt-1.5 text-sm text-charcoal/65">Want a quick look at how it went?</p>
        <div className="mt-4 flex gap-2">
          <Button
            onClick={() => {
              markPrompted(todayKey());
              setStage("review");
            }}
          >
            Show me
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              markPrompted(todayKey());
              setStage("idle");
            }}
          >
            Not now
          </Button>
        </div>
      </div>
    );
  }

  const stat = "rounded-card bg-cream/70 px-4 py-3";

  return (
    <Modal title="How today went" onClose={() => setStage("idle")}>
      <div className="grid grid-cols-3 gap-2.5">
        <div className={stat}>
          <p className="font-serif text-2xl text-forest">{done}</p>
          <p className="text-xs text-charcoal/55">completed</p>
        </div>
        <div className={stat}>
          <p className="font-serif text-2xl text-forest">{review.shrunk}</p>
          <p className="text-xs text-charcoal/55">shrunk</p>
        </div>
        <div className={stat}>
          <p className="font-serif text-2xl text-forest">{review.moved}</p>
          <p className="text-xs text-charcoal/55">moved</p>
        </div>
      </div>

      <p className="mt-5 text-sm leading-relaxed text-charcoal/75">{message}</p>

      {unfinished.length > 0 && (
        <>
          <ul className="mt-4 space-y-1.5 rounded-xl border border-charcoal/10 px-4 py-3">
            {unfinished.slice(0, 5).map((task) => (
              <li key={task.id} className="truncate text-sm text-charcoal/80">
                {task.title}
              </li>
            ))}
            {unfinished.length > 5 && <li className="text-xs text-charcoal/50">and {unfinished.length - 5} more</li>}
          </ul>
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <Button variant="ghost" onClick={() => setStage("idle")}>
              Leave them
            </Button>
            <Button onClick={moveToTomorrow} disabled={moving}>
              {moving ? "Moving…" : `Move ${unfinished.length === 1 ? "it" : `${unfinished.length}`} to tomorrow`}
            </Button>
          </div>
        </>
      )}
      {unfinished.length === 0 && (
        <div className="mt-5 flex justify-end">
          <Button onClick={() => setStage("idle")}>Done</Button>
        </div>
      )}
    </Modal>
  );
}
