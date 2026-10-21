"use client";

import { useMemo, useState } from "react";
import type { Task } from "@/lib/types";
import { Modal } from "@/components/ui/Modal";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { durationMinutes, isTimed } from "@/lib/tasks";
import { formatTimeRange, roundUpToMinutes } from "@/lib/time";

export function ShrinkModal({
  task,
  onClose,
  onConfirm,
}: {
  task: Task;
  onClose: () => void;
  onConfirm: (title: string, start: string | null, end: string | null) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);

  // A timed task gets a shorter window starting shortly from now.
  const window = useMemo(() => {
    if (!isTimed(task)) return null;
    const original = durationMinutes(task) ?? 30;
    const length = Math.min(original, Math.min(60, Math.max(15, Math.round(original / 2 / 5) * 5)));
    const start = roundUpToMinutes(new Date(Date.now() + 5 * 60_000), 5);
    return { start: start.toISOString(), end: new Date(start.getTime() + length * 60_000).toISOString() };
  }, [task]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      await onConfirm(title.trim(), window?.start ?? null, window?.end ?? null);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Shrink this task" onClose={onClose}>
      <p className="text-sm leading-relaxed text-charcoal/65">
        &ldquo;{task.title}&rdquo; is too big for the time you have. What&rsquo;s a smaller piece you can actually finish?
      </p>
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <Field
          id="shrink-title"
          label="Smaller version"
          required
          autoFocus
          maxLength={120}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="For example: Write the introduction"
        />
        {window && (
          <p className="text-xs text-charcoal/50">
            New time: {formatTimeRange(window.start, window.end)}. The original task is kept in its history.
          </p>
        )}
        <div className="flex justify-end">
          <Button type="submit" disabled={saving || !title.trim()}>
            {saving ? "Saving\u2026" : "Shrink task"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
