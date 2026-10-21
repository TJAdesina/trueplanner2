"use client";

import { useMemo, useState } from "react";
import { CalendarClock, Sunrise, Timer } from "lucide-react";
import type { Task } from "@/lib/types";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { durationMinutes, isTimed } from "@/lib/tasks";
import {
  addDaysToKey,
  dateKeyOf,
  formatDayLabel,
  formatTime,
  keyToLocalDate,
  roundUpToMinutes,
  todayKey,
  toTimeInput,
} from "@/lib/time";

export type MoveTarget = { start: string | null; end: string | null; taskDate: string };

/** Same time of day on another date, same length. Untimed tasks just change day. */
function onDay(task: Task, key: string, time?: string): MoveTarget {
  if (!isTimed(task)) return { start: null, end: null, taskDate: key };
  const length = durationMinutes(task) ?? 30;
  const start = keyToLocalDate(key, time ?? toTimeInput(new Date(task.start_time)));
  return { start: start.toISOString(), end: new Date(start.getTime() + length * 60_000).toISOString(), taskDate: key };
}

export function MoveModal({
  task,
  onClose,
  onConfirm,
}: {
  task: Task;
  onClose: () => void;
  onConfirm: (target: MoveTarget) => Promise<void>;
}) {
  const today = todayKey();
  const tomorrow = addDaysToKey(today, 1);
  const timed = isTimed(task);
  const length = durationMinutes(task) ?? 30;

  const later = useMemo<MoveTarget | null>(() => {
    if (!timed) return null;
    const start = roundUpToMinutes(new Date(Date.now() + 15 * 60_000), 5);
    if (dateKeyOf(start) !== today) return null;
    return { start: start.toISOString(), end: new Date(start.getTime() + length * 60_000).toISOString(), taskDate: today };
  }, [timed, length, today]);

  const [pickDay, setPickDay] = useState(tomorrow);
  const [pickTime, setPickTime] = useState(timed ? toTimeInput(new Date(task.start_time)) : "");
  const [saving, setSaving] = useState(false);

  async function go(target: MoveTarget) {
    setSaving(true);
    try {
      await onConfirm(target);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const option =
    "flex w-full items-center gap-3 rounded-xl border border-charcoal/10 px-4 py-3 text-left text-sm transition-colors hover:bg-charcoal/[0.04] disabled:opacity-50";

  return (
    <Modal title="Move this task" onClose={onClose}>
      <p className="text-sm leading-relaxed text-charcoal/65">
        &ldquo;{task.title}&rdquo; still matters, just not right now. When should it come back?
      </p>

      <div className="mt-4 space-y-2">
        {later && (
          <button type="button" className={option} disabled={saving} onClick={() => go(later)}>
            <Timer className="h-4 w-4 text-forest/70" strokeWidth={1.75} />
            <span className="flex-1">
              <span className="block font-medium text-charcoal">Later today</span>
              <span className="text-xs text-charcoal/50">{formatTime(later.start!)}</span>
            </span>
          </button>
        )}
        <button type="button" className={option} disabled={saving} onClick={() => go(onDay(task, tomorrow))}>
          <Sunrise className="h-4 w-4 text-forest/70" strokeWidth={1.75} />
          <span className="flex-1">
            <span className="block font-medium text-charcoal">Tomorrow</span>
            <span className="text-xs text-charcoal/50">
              {timed ? `Same time, ${formatTime(new Date(task.start_time))}` : "Anytime"}
            </span>
          </span>
        </button>
      </div>

      <div className="mt-4 rounded-xl border border-charcoal/10 p-4">
        <p className="flex items-center gap-2 text-sm font-medium text-charcoal">
          <CalendarClock className="h-4 w-4 text-forest/70" strokeWidth={1.75} />
          Pick a day{timed ? " and time" : ""}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={pickDay}
            min={today}
            onChange={(e) => e.target.value && setPickDay(e.target.value)}
            aria-label="New day"
            className="rounded-lg border border-charcoal/15 bg-surface px-3 py-1.5 text-sm text-charcoal focus:border-forest/40 focus:outline-none focus:ring-2 focus:ring-forest/15"
          />
          {timed && (
            <input
              type="time"
              value={pickTime}
              onChange={(e) => setPickTime(e.target.value)}
              aria-label="New time"
              className="rounded-lg border border-charcoal/15 bg-surface px-3 py-1.5 text-sm text-charcoal focus:border-forest/40 focus:outline-none focus:ring-2 focus:ring-forest/15"
            />
          )}
          <Button
            type="button"
            disabled={saving || !pickDay || (timed && !pickTime)}
            onClick={() => go(onDay(task, pickDay, timed ? pickTime : undefined))}
            className="ml-auto px-4 py-1.5"
          >
            Move to {formatDayLabel(pickDay, today)}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
