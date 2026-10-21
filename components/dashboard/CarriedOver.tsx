"use client";

import { useEffect, useState } from "react";
import { ArrowRightToLine } from "lucide-react";
import { todayKey } from "@/lib/time";
import type { Task } from "@/lib/types";

const STORAGE_KEY = "tp-carried-dismissed";

/** A quiet prompt for unfinished tasks left over from earlier days. */
export function CarriedOver({
  tasks,
  onMoveAll,
}: {
  tasks: Task[];
  onMoveAll: (tasks: Task[]) => Promise<void>;
}) {
  const [hidden, setHidden] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      setHidden(localStorage.getItem(STORAGE_KEY) === todayKey());
    } catch {
      setHidden(false);
    }
  }, []);

  if (hidden || tasks.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-card border border-peach/40 bg-peach/10 px-4 py-3">
      <ArrowRightToLine className="h-4 w-4 shrink-0 text-[#B3702F]" strokeWidth={1.75} aria-hidden="true" />
      <p className="min-w-0 flex-1 text-sm text-charcoal/80">
        {tasks.length === 1 ? "1 unfinished task" : `${tasks.length} unfinished tasks`} from earlier days.
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await onMoveAll(tasks);
            } finally {
              setBusy(false);
            }
          }}
          className="rounded-full bg-forest px-3.5 py-1.5 text-xs font-medium text-cream hover:bg-forest-light disabled:opacity-50"
        >
          Move to today
        </button>
        <button
          type="button"
          onClick={() => {
            try {
              localStorage.setItem(STORAGE_KEY, todayKey());
            } catch {
              // Private mode: just hide it for this visit.
            }
            setHidden(true);
          }}
          className="rounded-full px-3 py-1.5 text-xs font-medium text-charcoal/60 hover:bg-charcoal/5"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
