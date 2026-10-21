"use client";

import { useRef } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Filter, Search, X } from "lucide-react";
import { Popover } from "@/components/ui/Popover";
import { TagDot } from "./TagPicker";
import { addDaysToKey, formatDayLabel, formatLongDate } from "@/lib/time";
import type { Tag } from "@/lib/types";

interface DayHeaderProps {
  dateKey: string;
  today: string;
  onChange: (key: string) => void;
  searching: boolean;
  query: string;
  onQuery: (q: string) => void;
  onToggleSearch: (open: boolean) => void;
  tags: Tag[];
  tagFilter: string[];
  onTagFilter: (ids: string[]) => void;
}

const iconButton =
  "relative flex h-9 w-9 items-center justify-center rounded-full text-charcoal/55 transition-colors hover:bg-charcoal/5 hover:text-charcoal";

export function DayHeader({
  dateKey,
  today,
  onChange,
  searching,
  query,
  onQuery,
  onToggleSearch,
  tags,
  tagFilter,
  onTagFilter,
}: DayHeaderProps) {
  const dateInput = useRef<HTMLInputElement>(null);
  const isToday = dateKey === today;

  if (searching) {
    return (
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal/40" strokeWidth={1.75} />
          <input
            autoFocus
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && onToggleSearch(false)}
            placeholder="Search all tasks"
            aria-label="Search tasks"
            className="w-full rounded-full border border-charcoal/15 bg-surface py-2.5 pl-10 pr-4 text-base text-charcoal placeholder:text-charcoal/40 focus:border-forest/40 focus:outline-none focus:ring-2 focus:ring-forest/15"
          />
        </div>
        <button type="button" onClick={() => onToggleSearch(false)} className={iconButton} aria-label="Close search">
          <X className="h-[18px] w-[18px]" strokeWidth={1.75} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-end justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => onChange(addDaysToKey(dateKey, -1))} className={`${iconButton} -ml-2`} aria-label="Previous day">
            <ChevronLeft className="h-5 w-5" strokeWidth={1.75} />
          </button>
          <h1 className="truncate font-serif text-[1.7rem] leading-none text-forest sm:text-3xl">
            {formatDayLabel(dateKey, today)}
          </h1>
          <button type="button" onClick={() => onChange(addDaysToKey(dateKey, 1))} className={iconButton} aria-label="Next day">
            <ChevronRight className="h-5 w-5" strokeWidth={1.75} />
          </button>
        </div>
        <p className="mt-1.5 text-sm text-charcoal/50">{formatLongDate(dateKey)}</p>
      </div>

      <div className="flex shrink-0 items-center gap-0.5">
        {!isToday && (
          <button
            type="button"
            onClick={() => onChange(today)}
            className="mr-1 rounded-full border border-charcoal/15 px-3 py-1.5 text-xs font-medium text-charcoal/70 hover:bg-charcoal/5"
          >
            Today
          </button>
        )}

        <span className="relative inline-flex">
          <button
            type="button"
            className={iconButton}
            aria-label="Pick a day"
            onClick={() => {
              try {
                dateInput.current?.showPicker();
              } catch {
                dateInput.current?.focus();
                dateInput.current?.click();
              }
            }}
          >
            <CalendarDays className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </button>
          <input
            ref={dateInput}
            type="date"
            value={dateKey}
            tabIndex={-1}
            aria-hidden="true"
            onChange={(e) => e.target.value && onChange(e.target.value)}
            className="pointer-events-none absolute right-0 top-full h-0 w-0 opacity-0"
          />
        </span>

        <button type="button" onClick={() => onToggleSearch(true)} className={iconButton} aria-label="Search">
          <Search className="h-[18px] w-[18px]" strokeWidth={1.75} />
        </button>

        {tags.length > 0 && (
          <Popover
            align="right"
            panelClassName="w-56 py-1.5"
            trigger={({ toggle, open }) => (
              <button
                type="button"
                onClick={toggle}
                aria-label="Filter by tag"
                aria-expanded={open}
                className={`${iconButton} ${tagFilter.length ? "bg-forest/10 text-forest" : ""}`}
              >
                <Filter className="h-[18px] w-[18px]" strokeWidth={1.75} />
                {tagFilter.length > 0 && <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-green" />}
              </button>
            )}
          >
            <ul>
              {tags.map((tag) => {
                const on = tagFilter.includes(tag.id);
                return (
                  <li key={tag.id}>
                    <button
                      type="button"
                      onClick={() => onTagFilter(on ? tagFilter.filter((id) => id !== tag.id) : [...tagFilter, tag.id])}
                      className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-charcoal hover:bg-charcoal/5"
                    >
                      <TagDot color={tag.color} className="h-2.5 w-2.5" />
                      <span className="flex-1 truncate">{tag.name}</span>
                      {on && <span className="text-xs font-medium text-forest">On</span>}
                    </button>
                  </li>
                );
              })}
              {tagFilter.length > 0 && (
                <li className="mt-1 border-t border-charcoal/10 pt-1">
                  <button
                    type="button"
                    onClick={() => onTagFilter([])}
                    className="w-full px-3.5 py-2 text-left text-sm text-charcoal/60 hover:bg-charcoal/5"
                  >
                    Clear filter
                  </button>
                </li>
              )}
            </ul>
          </Popover>
        )}
      </div>
    </div>
  );
}
