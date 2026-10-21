"use client";

import { AlignLeft, Bell, CalendarClock, Check, Clock, ListChecks, Minimize2, MoreHorizontal, Pencil, Repeat, Trash2 } from "lucide-react";
import { Popover } from "@/components/ui/Popover";
import { TagChip } from "./TagPicker";
import {
  PRIORITY_RING,
  checklistProgress,
  isDone,
  isHappeningNow,
  isPastDue,
  isTimed,
  minutesLeft,
} from "@/lib/tasks";
import { formatDayLabel, formatDuration, formatTimeRange } from "@/lib/time";
import type { Tag, Task } from "@/lib/types";

export interface TaskActions {
  onToggle: (task: Task) => void;
  onEdit: (task: Task) => void;
  onMove: (task: Task) => void;
  onShrink: (task: Task) => void;
  onDelete: (task: Task) => void;
}

interface TaskRowProps extends TaskActions {
  task: Task;
  tagsById: Map<string, Tag>;
  now: Date;
  today: string;
  showDate?: boolean;
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  danger = false,
}: {
  icon: typeof Pencil;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={`flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm hover:bg-charcoal/5 ${
          danger ? "text-[#B3492B]" : "text-charcoal"
        }`}
      >
        <Icon className="h-4 w-4 opacity-70" strokeWidth={1.75} />
        {label}
      </button>
    </li>
  );
}

export function TaskRow({ task, tagsById, now, today, showDate, onToggle, onEdit, onMove, onShrink, onDelete }: TaskRowProps) {
  const done = isDone(task);
  const timed = isTimed(task);
  const active = isHappeningNow(task, now);
  const pastDue = isPastDue(task, now);
  const tags = task.tag_ids.map((id) => tagsById.get(id)).filter((t): t is Tag => Boolean(t));
  const progress = checklistProgress(task);

  return (
    <li className={`group relative flex items-start gap-1 px-1.5 first:rounded-t-[13px] last:rounded-b-[13px] sm:px-3 ${active ? "bg-green/[0.08]" : ""}`}>
      {active && <span aria-hidden="true" className="absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-green" />}

      <button
        type="button"
        onClick={() => onToggle(task)}
        aria-pressed={done}
        aria-label={done ? `Mark "${task.title}" as not done` : `Mark "${task.title}" as done`}
        className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center"
      >
        <span
          className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors ${
            done
              ? "animate-checkPop border-green bg-green"
              : `${PRIORITY_RING[task.priority]} group-hover:bg-forest/5`
          }`}
        >
          {done && <Check className="h-3 w-3 text-white" strokeWidth={3.5} />}
        </span>
      </button>

      <button type="button" onClick={() => onEdit(task)} className="min-w-0 flex-1 py-3 text-left">
        <span
          className={`block break-words text-[15px] leading-snug ${
            done ? "text-charcoal/40 line-through decoration-charcoal/25" : "text-charcoal"
          }`}
        >
          {task.title}
        </span>

        <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-charcoal/50 empty:hidden">
          {showDate && <span className="font-medium text-charcoal/65">{formatDayLabel(task.task_date, today)}</span>}

          {timed && (
            <span
              className={`inline-flex items-center gap-1 ${
                pastDue && !done ? "text-[#B3702F]" : active ? "font-medium text-forest" : ""
              }`}
            >
              <Clock className="h-3 w-3" strokeWidth={1.75} />
              {formatTimeRange(task.start_time!, task.end_time!)}
            </span>
          )}

          {active && (
            <span className="inline-flex items-center gap-1.5 font-medium text-forest">
              <span aria-hidden="true" className="h-1.5 w-1.5 animate-nowPulse rounded-full bg-green" />
              Now &middot; {formatDuration(minutesLeft(task, now))} left
            </span>
          )}

          {pastDue && !done && <span className="text-[#B3702F]">Ran over</span>}

          {tags.map((tag) => (
            <TagChip key={tag.id} tag={tag} />
          ))}

          {task.description && <AlignLeft className="h-3 w-3" strokeWidth={1.75} aria-label="Has details" />}
          {progress && (
            <span className="inline-flex items-center gap-1">
              <ListChecks className="h-3 w-3" strokeWidth={1.75} />
              {progress.done}/{progress.total}
            </span>
          )}
          {task.recurrence && <Repeat className="h-3 w-3" strokeWidth={1.75} aria-label="Repeats" />}
          {task.remind_at_start && !done && <Bell className="h-3 w-3" strokeWidth={1.75} aria-label="Reminder set" />}
        </span>
      </button>

      <Popover
        align="right"
        panelClassName="w-44 py-1.5"
        className="mt-1.5"
        trigger={({ toggle, open }) => (
          <button
            type="button"
            onClick={toggle}
            aria-label={`Options for ${task.title}`}
            aria-expanded={open}
            className={`flex h-9 w-9 items-center justify-center rounded-full text-charcoal/45 transition-opacity hover:bg-charcoal/5 hover:text-charcoal focus-visible:opacity-100 ${
              open ? "opacity-100" : "opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100"
            }`}
          >
            <MoreHorizontal className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </button>
        )}
      >
        {(close) => (
          <ul>
            <MenuItem icon={Pencil} label="Edit" onClick={() => { close(); onEdit(task); }} />
            {!done && <MenuItem icon={CalendarClock} label="Move" onClick={() => { close(); onMove(task); }} />}
            {!done && <MenuItem icon={Minimize2} label="Shrink" onClick={() => { close(); onShrink(task); }} />}
            <MenuItem icon={Trash2} label="Delete" danger onClick={() => { close(); onDelete(task); }} />
          </ul>
        )}
      </Popover>
    </li>
  );
}
