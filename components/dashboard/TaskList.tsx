"use client";

import { useState } from "react";
import { ChevronRight, ListTodo } from "lucide-react";
import { TaskRow, type TaskActions } from "./TaskRow";
import { groupTasks } from "@/lib/tasks";
import type { Tag, Task } from "@/lib/types";

interface TaskListProps extends TaskActions {
  tasks: Task[];
  tagsById: Map<string, Tag>;
  now: Date;
  today: string;
  isToday: boolean;
}

export function TaskList({ tasks, tagsById, now, today, isToday, ...actions }: TaskListProps) {
  const [showDone, setShowDone] = useState(false);
  const { timed, anytime, done } = groupTasks(tasks);
  const open = timed.length + anytime.length;

  if (open + done.length === 0) {
    return (
      <div className="flex flex-col items-center px-6 py-14 text-center">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-forest/[0.07] text-forest/70">
          <ListTodo className="h-5 w-5" strokeWidth={1.5} />
        </span>
        <p className="mt-4 font-serif text-lg text-forest">{isToday ? "Nothing planned yet." : "Nothing on this day."}</p>
        <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-charcoal/55">
          Add a task above. Give it a time if you&rsquo;d like a suggestion when it slips.
        </p>
      </div>
    );
  }

  const rowProps = { tagsById, now, today, ...actions };

  return (
    <div className="space-y-5">
      {open > 0 ? (
        <ul className="card divide-y divide-charcoal/[0.07]">
          {timed.map((task) => (
            <TaskRow key={task.id} task={task} {...rowProps} />
          ))}
          {timed.length > 0 && anytime.length > 0 && (
            <li className="bg-charcoal/[0.025] px-4 py-1.5 text-[11px] font-medium text-charcoal/45" aria-hidden="true">
              Anytime
            </li>
          )}
          {anytime.map((task) => (
            <TaskRow key={task.id} task={task} {...rowProps} />
          ))}
        </ul>
      ) : (
        <p className="px-1 text-sm text-charcoal/55">Everything here is done.</p>
      )}

      {done.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setShowDone((v) => !v)}
            aria-expanded={showDone}
            className="flex items-center gap-1.5 rounded-lg px-1 py-1 text-sm font-medium text-charcoal/55 hover:text-charcoal"
          >
            <ChevronRight className={`h-4 w-4 transition-transform ${showDone ? "rotate-90" : ""}`} strokeWidth={1.75} />
            Completed
            <span className="text-charcoal/40">{done.length}</span>
          </button>
          {showDone && (
            <ul className="card mt-2 divide-y divide-charcoal/[0.07] shadow-none">
              {done.map((task) => (
                <TaskRow key={task.id} task={task} {...rowProps} />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
