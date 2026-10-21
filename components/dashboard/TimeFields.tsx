"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, CalendarDays } from "lucide-react";
import {
  addDaysToKey,
  formatDayLabel,
  formatShortDuration,
  formatTime,
  keyToLocalDate,
  parseClockText,
  parseDurationText,
  hhmmToMinutes,
} from "@/lib/time";

export interface TimeValue {
  day: string;
  start: string | null; // HH:mm
  duration: number; // minutes (only meaningful when start is set)
  remind: boolean;
}

const PRESETS = [15, 30, 45, 60, 120];

const pill = (active: boolean) =>
  `inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
    active
      ? "border-forest bg-forest text-cream"
      : "border-charcoal/15 text-charcoal/70 hover:bg-charcoal/5"
  }`;

function DatePill({
  value,
  active,
  label,
  onChange,
}: {
  value: string;
  active: boolean;
  label: string;
  onChange: (key: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <span className="relative inline-flex">
      <button
        type="button"
        className={pill(active)}
        onClick={() => {
          try {
            ref.current?.showPicker();
          } catch {
            ref.current?.focus();
            ref.current?.click();
          }
        }}
      >
        <CalendarDays className="h-3.5 w-3.5" strokeWidth={1.75} />
        {label}
      </button>
      <input
        ref={ref}
        type="date"
        value={value}
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => e.target.value && onChange(e.target.value)}
        className="pointer-events-none absolute left-0 top-full h-0 w-0 opacity-0"
      />
    </span>
  );
}

export function TimeFields({
  value,
  today,
  onChange,
  className = "w-[19rem] max-w-full space-y-4 p-3.5",
}: {
  value: TimeValue;
  today: string;
  onChange: (patch: Partial<TimeValue>) => void;
  className?: string;
}) {
  const tomorrow = addDaysToKey(today, 1);
  const isPreset = PRESETS.includes(value.duration);
  const [custom, setCustom] = useState("");
  const [customError, setCustomError] = useState(false);

  useEffect(() => {
    if (isPreset) setCustom("");
  }, [isPreset]);

  function commitCustom() {
    const text = custom.trim();
    if (!text) {
      setCustomError(false);
      return;
    }
    const asDuration = parseDurationText(text);
    if (asDuration && asDuration > 0 && asDuration <= 24 * 60) {
      onChange({ duration: asDuration });
      setCustomError(false);
      return;
    }
    // Otherwise treat it as an end time such as "4pm".
    const end = parseClockText(text);
    if (end && value.start) {
      let minutes = hhmmToMinutes(end) - hhmmToMinutes(value.start);
      if (minutes <= 0) minutes += 24 * 60;
      onChange({ duration: minutes });
      setCustomError(false);
      return;
    }
    setCustomError(true);
  }

  const endLabel = (() => {
    if (!value.start) return null;
    const start = keyToLocalDate(value.day, value.start);
    return formatTime(new Date(start.getTime() + value.duration * 60_000));
  })();

  return (
    <div className={className}>
      <div>
        <p className="mb-2 text-xs font-medium text-charcoal/55">Day</p>
        <div className="flex flex-wrap gap-1.5">
          <button type="button" className={pill(value.day === today)} onClick={() => onChange({ day: today })}>
            Today
          </button>
          <button type="button" className={pill(value.day === tomorrow)} onClick={() => onChange({ day: tomorrow })}>
            Tomorrow
          </button>
          <DatePill
            value={value.day}
            active={value.day !== today && value.day !== tomorrow}
            label={value.day !== today && value.day !== tomorrow ? formatDayLabel(value.day, today) : "Pick date"}
            onChange={(day) => onChange({ day })}
          />
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium text-charcoal/55">Starts at</p>
        <div className="flex items-center gap-2">
          <input
            type="time"
            value={value.start ?? ""}
            onChange={(e) => onChange({ start: e.target.value || null })}
            aria-label="Start time"
            className="rounded-lg border border-charcoal/15 bg-surface px-3 py-1.5 text-sm text-charcoal focus:border-forest/40 focus:outline-none focus:ring-2 focus:ring-forest/15"
          />
          {value.start && (
            <button
              type="button"
              onClick={() => onChange({ start: null, remind: false })}
              className="rounded-lg px-2 py-1.5 text-xs font-medium text-charcoal/55 hover:bg-charcoal/5 hover:text-charcoal"
            >
              No time
            </button>
          )}
        </div>
        {!value.start && (
          <p className="mt-2 text-xs leading-relaxed text-charcoal/45">
            Add a time and you&rsquo;ll get a suggestion if the task slips past it.
          </p>
        )}
      </div>

      {value.start && (
        <div>
          <p className="mb-2 text-xs font-medium text-charcoal/55">
            Length{endLabel ? <span className="font-normal text-charcoal/40"> &middot; ends {endLabel}</span> : null}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((minutes) => (
              <button
                key={minutes}
                type="button"
                className={pill(value.duration === minutes)}
                onClick={() => onChange({ duration: minutes })}
              >
                {formatShortDuration(minutes)}
              </button>
            ))}
            {!isPreset && <span className={pill(true)}>{formatShortDuration(value.duration)}</span>}
          </div>
          <input
            value={custom}
            onChange={(e) => {
              setCustom(e.target.value);
              setCustomError(false);
            }}
            onBlur={commitCustom}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitCustom();
              }
            }}
            placeholder="Custom: 90, 1h30, or end time like 4pm"
            aria-label="Custom length"
            className={`mt-2 w-full rounded-lg border bg-transparent px-3 py-1.5 text-xs text-charcoal placeholder:text-charcoal/35 focus:outline-none focus:ring-2 ${
              customError
                ? "border-[#B3492B]/50 focus:ring-[#B3492B]/15"
                : "border-charcoal/15 focus:border-forest/40 focus:ring-forest/15"
            }`}
          />
          {customError && <p className="mt-1 text-xs text-[#B3492B]">Try 90, 1h30, or an end time like 4pm.</p>}
        </div>
      )}

      {value.start && (
        <label className="flex cursor-pointer items-center gap-2.5 text-sm text-charcoal/80">
          <input
            type="checkbox"
            checked={value.remind}
            onChange={(e) => onChange({ remind: e.target.checked })}
            className="h-4 w-4 rounded border-charcoal/30 accent-[rgb(var(--color-forest))]"
          />
          <Bell className="h-3.5 w-3.5 text-charcoal/50" strokeWidth={1.75} />
          Remind me when it starts
        </label>
      )}
    </div>
  );
}
