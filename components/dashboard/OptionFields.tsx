"use client";

import { Flag } from "lucide-react";
import type { Recurrence, TaskPriority } from "@/lib/types";
import { PRIORITY_FLAG, PRIORITY_LABEL, RECURRENCE_LABEL } from "@/lib/tasks";

const seg = (active: boolean) =>
  `flex-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
    active ? "border-forest bg-forest text-cream" : "border-charcoal/15 text-charcoal/70 hover:bg-charcoal/5"
  }`;

export function PriorityPicker({
  value,
  onChange,
}: {
  value: TaskPriority;
  onChange: (value: TaskPriority) => void;
}) {
  return (
    <div className="flex gap-1.5" role="radiogroup" aria-label="Priority">
      {(["low", "medium", "high"] as TaskPriority[]).map((p) => (
        <button
          key={p}
          type="button"
          role="radio"
          aria-checked={value === p}
          onClick={() => onChange(p)}
          className={`${seg(value === p)} inline-flex items-center justify-center gap-1.5`}
        >
          <Flag
            className={`h-3.5 w-3.5 ${value === p ? "text-cream" : PRIORITY_FLAG[p]}`}
            strokeWidth={2}
            fill="currentColor"
          />
          {PRIORITY_LABEL[p]}
        </button>
      ))}
    </div>
  );
}

export function RecurrencePicker({
  value,
  onChange,
}: {
  value: Recurrence | null;
  onChange: (value: Recurrence | null) => void;
}) {
  const options: { id: Recurrence | null; label: string }[] = [
    { id: null, label: "Never" },
    { id: "daily", label: RECURRENCE_LABEL.daily },
    { id: "weekdays", label: RECURRENCE_LABEL.weekdays },
    { id: "weekly", label: RECURRENCE_LABEL.weekly },
  ];
  return (
    <div className="grid grid-cols-2 gap-1.5" role="radiogroup" aria-label="Repeat">
      {options.map((o) => (
        <button
          key={o.label}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          onClick={() => onChange(o.id)}
          className={seg(value === o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
