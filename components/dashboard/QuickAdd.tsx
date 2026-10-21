"use client";

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { AlignLeft, ArrowUp, Bell, ChevronDown, Clock, Plus, Repeat, X } from "lucide-react";
import { Popover } from "@/components/ui/Popover";
import { TimeFields } from "./TimeFields";
import { PriorityPicker, RecurrencePicker } from "./OptionFields";
import { TagChip, TagPicker } from "./TagPicker";
import { parseQuickAdd } from "@/lib/quickAdd";
import { DEFAULT_DURATION_MINUTES, RECURRENCE_LABEL } from "@/lib/tasks";
import { addDaysToKey, formatDayLabel, formatShortDuration, formatTime, keyToLocalDate, todayKey } from "@/lib/time";
import { nextTagColor } from "@/lib/tags";
import type { Recurrence, Tag, TaskDraft, TaskPriority } from "@/lib/types";

export interface QuickAddHandle {
  focus: () => void;
}

interface QuickAddProps {
  dateKey: string;
  tags: Tag[];
  onCreateTag: (name: string, color?: string) => Promise<Tag | null>;
  onAdd: (draft: TaskDraft) => Promise<void>;
}

const chipBase =
  "inline-flex items-center gap-1.5 rounded-full bg-charcoal/[0.045] px-2.5 py-1 text-xs font-medium text-charcoal/70";

export const QuickAdd = forwardRef<QuickAddHandle, QuickAddProps>(function QuickAdd(
  { dateKey, tags, onCreateTag, onAdd },
  handle
) {
  const inputRef = useRef<HTMLInputElement>(null);
  const detailsRef = useRef<HTMLTextAreaElement>(null);
  useImperativeHandle(handle, () => ({ focus: () => inputRef.current?.focus() }));

  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [dayOverride, setDayOverride] = useState<string | null>(null);
  const [start, setStart] = useState<string | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [remind, setRemind] = useState(false);
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [recurrence, setRecurrence] = useState<Recurrence | null>(null);
  const [focused, setFocused] = useState(false);
  const [busy, setBusy] = useState(false);
  const [coarse, setCoarse] = useState(false);

  useEffect(() => {
    setCoarse(window.matchMedia("(pointer: coarse)").matches);
  }, []);

  const today = todayKey();
  const parsed = useMemo(() => parseQuickAdd(title), [title]);

  // Explicit choices win; anything typed into the title fills the gaps.
  const effStart = start ?? parsed.start;
  const effDuration = duration ?? parsed.durationMinutes ?? DEFAULT_DURATION_MINUTES;
  const effDay =
    dayOverride ??
    (parsed.day === "today" ? today : parsed.day === "tomorrow" ? addDaysToKey(today, 1) : dateKey);

  const parsedTags = useMemo(
    () =>
      parsed.tagNames.map((name) => ({
        name,
        existing: tags.find((t) => t.name.toLowerCase() === name.toLowerCase()) ?? null,
      })),
    [parsed.tagNames, tags]
  );

  const canSubmit = parsed.title.length > 0 && !busy;

  function reset() {
    setTitle("");
    setDetails("");
    setShowDetails(false);
    setDayOverride(null);
    setStart(null);
    setDuration(null);
    setRemind(false);
    setPriority("medium");
    setTagIds([]);
    setRecurrence(null);
  }

  async function submit() {
    if (!canSubmit) return;
    setBusy(true);
    try {
      const ids = [...tagIds];
      for (const [i, entry] of parsedTags.entries()) {
        const tag = entry.existing ?? (await onCreateTag(entry.name, nextTagColor(tags.length + i)));
        if (tag && !ids.includes(tag.id)) ids.push(tag.id);
      }

      let startIso: string | null = null;
      let endIso: string | null = null;
      if (effStart) {
        const s = keyToLocalDate(effDay, effStart);
        startIso = s.toISOString();
        endIso = new Date(s.getTime() + effDuration * 60_000).toISOString();
      }

      await onAdd({
        title: parsed.title,
        description: details.trim() || null,
        task_date: effDay,
        start_time: startIso,
        end_time: endIso,
        priority,
        recurrence,
        remind_at_start: Boolean(effStart) && remind,
        tag_ids: ids,
      });
      reset();
      inputRef.current?.focus();
    } finally {
      setBusy(false);
    }
  }

  function openDetails() {
    setShowDetails(true);
    setTimeout(() => detailsRef.current?.focus(), 0);
  }

  const timeSet = Boolean(effStart) || effDay !== dateKey;
  const optionsSet = priority !== "medium" || tagIds.length > 0 || recurrence !== null || details.trim().length > 0;
  const selectedTags = tags.filter((t) => tagIds.includes(t.id));
  const hasChips =
    Boolean(effStart) ||
    effDay !== dateKey ||
    priority !== "medium" ||
    selectedTags.length > 0 ||
    parsedTags.length > 0 ||
    recurrence !== null;

  const iconButton = (active: boolean) =>
    `relative flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
      active ? "bg-forest/10 text-forest" : "text-charcoal/50 hover:bg-charcoal/5 hover:text-charcoal"
    }`;

  return (
    <div className="card px-3 py-2.5">
      <div className="flex items-center gap-1.5">
        <Plus className="ml-1 h-5 w-5 shrink-0 text-forest/60" strokeWidth={1.75} aria-hidden="true" />
        <input
          ref={inputRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (e.shiftKey) openDetails();
              else submit();
            }
          }}
          placeholder="Add a task"
          aria-label="Add a task"
          enterKeyHint="done"
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent py-2 text-base text-charcoal placeholder:text-charcoal/40 focus:outline-none"
        />

        {title.trim() && (
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit}
            aria-label="Add task"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-forest text-cream transition-opacity hover:bg-forest-light disabled:opacity-40"
          >
            <ArrowUp className="h-4 w-4" strokeWidth={2.25} />
          </button>
        )}

        <Popover
          align="right"
          trigger={({ toggle, open }) => (
            <button
              type="button"
              onClick={toggle}
              aria-label="Set a time"
              aria-expanded={open}
              className={iconButton(timeSet || open)}
            >
              <Clock className="h-[18px] w-[18px]" strokeWidth={1.75} />
            </button>
          )}
        >
          <TimeFields
            today={today}
            value={{ day: effDay, start: effStart, duration: effDuration, remind }}
            onChange={(patch) => {
              if (patch.day !== undefined) setDayOverride(patch.day);
              if (patch.start !== undefined) {
                setStart(patch.start);
                if (patch.start && duration === null && parsed.durationMinutes === null) setDuration(DEFAULT_DURATION_MINUTES);
              }
              if (patch.duration !== undefined) setDuration(patch.duration);
              if (patch.remind !== undefined) setRemind(patch.remind);
            }}
          />
        </Popover>

        <Popover
          align="right"
          panelClassName="w-72"
          trigger={({ toggle, open }) => (
            <button
              type="button"
              onClick={toggle}
              aria-label="More options"
              aria-expanded={open}
              className={iconButton(optionsSet || open)}
            >
              <ChevronDown className="h-[18px] w-[18px]" strokeWidth={1.75} />
              {optionsSet && <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-green" />}
            </button>
          )}
        >
          {(close) => (
            <div className="space-y-4 p-3.5">
              <div>
                <p className="mb-2 text-xs font-medium text-charcoal/55">Priority</p>
                <PriorityPicker value={priority} onChange={setPriority} />
              </div>
              <div>
                <p className="mb-1 text-xs font-medium text-charcoal/55">Tags</p>
                <div className="-mx-2">
                  <TagPicker
                    className="w-full p-2"
                    tags={tags}
                    selectedIds={tagIds}
                    onToggle={(id) =>
                      setTagIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
                    }
                    onCreate={(name, color) => onCreateTag(name, color)}
                  />
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-medium text-charcoal/55">Repeat</p>
                <RecurrencePicker value={recurrence} onChange={setRecurrence} />
              </div>
              <button
                type="button"
                onClick={() => {
                  close();
                  openDetails();
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-charcoal/75 hover:bg-charcoal/5"
              >
                <AlignLeft className="h-4 w-4 text-charcoal/50" strokeWidth={1.75} />
                {showDetails ? "Edit details" : "Add details"}
              </button>
            </div>
          )}
        </Popover>
      </div>

      {hasChips && (
        <div className="mt-1 flex flex-wrap items-center gap-1.5 pl-8 pt-1">
          {(effStart || effDay !== dateKey) && (
            <span className={chipBase}>
              <Clock className="h-3 w-3" strokeWidth={2} />
              {effDay !== dateKey && formatDayLabel(effDay, today)}
              {effStart && (
                <>
                  {effDay !== dateKey && <span className="text-charcoal/30">&middot;</span>}
                  {formatTime(keyToLocalDate(effDay, effStart))}
                  <span className="text-charcoal/40">{formatShortDuration(effDuration)}</span>
                </>
              )}
              {(start || dayOverride) && (
                <button
                  type="button"
                  aria-label="Clear time"
                  onClick={() => {
                    setStart(null);
                    setDuration(null);
                    setDayOverride(null);
                    setRemind(false);
                  }}
                  className="-mr-1 rounded-full p-0.5 text-charcoal/40 hover:text-charcoal"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </span>
          )}
          {remind && effStart && (
            <span className={chipBase}>
              <Bell className="h-3 w-3" strokeWidth={2} />
              Reminder
            </span>
          )}
          {recurrence && (
            <span className={chipBase}>
              <Repeat className="h-3 w-3" strokeWidth={2} />
              {RECURRENCE_LABEL[recurrence]}
              <button type="button" aria-label="Clear repeat" onClick={() => setRecurrence(null)} className="-mr-1 rounded-full p-0.5 text-charcoal/40 hover:text-charcoal">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {priority !== "medium" && (
            <span className={chipBase}>
              {priority === "high" ? "High priority" : "Low priority"}
              <button type="button" aria-label="Clear priority" onClick={() => setPriority("medium")} className="-mr-1 rounded-full p-0.5 text-charcoal/40 hover:text-charcoal">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {selectedTags.map((tag) => (
            <span key={tag.id} className={chipBase}>
              <TagChip tag={tag} onRemove={() => setTagIds((prev) => prev.filter((x) => x !== tag.id))} />
            </span>
          ))}
          {parsedTags.map((entry) => (
            <span key={entry.name} className={chipBase}>
              <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.existing?.color ?? "#9A9A90" }} />
              {entry.existing ? entry.existing.name : `${entry.name} (new)`}
            </span>
          ))}
        </div>
      )}

      {showDetails && (
        <div className="relative mt-2 pl-8">
          <textarea
            ref={detailsRef}
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                submit();
              }
              if (e.key === "Escape") inputRef.current?.focus();
            }}
            rows={3}
            placeholder="Details, links, or notes"
            aria-label="Task details"
            className="w-full resize-none rounded-lg border border-charcoal/10 bg-cream/60 px-3 py-2 text-sm text-charcoal placeholder:text-charcoal/35 focus:border-forest/40 focus:outline-none focus:ring-2 focus:ring-forest/15"
          />
        </div>
      )}

      {!coarse && focused && title.trim() && !showDetails && (
        <p className="pl-8 pt-1 text-[11px] text-charcoal/40" aria-hidden="true">
          Shift + Enter to add details
        </p>
      )}
    </div>
  );
});
