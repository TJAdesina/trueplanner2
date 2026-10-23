"use client";

import { ArrowRight, ChevronDown, Check, CalendarClock, Minimize2, Timer, Trash2, X } from "lucide-react";
import { Popover } from "@/components/ui/Popover";
import { formatTimeRange } from "@/lib/time";
import { SNOOZE_MINUTES } from "@/lib/triggers";
import type { CheckinAnswer } from "@/hooks/useCheckins";
import type { Checkin, SuggestedAction } from "@/lib/types";

const PRIMARY_LABEL: Record<SuggestedAction, string> = {
  shrink: "Shrink it",
  move: "Move it",
  remove: "Remove it",
};

/**
 * The calm pop-up that appears when a task slips. It floats above the page
 * (it never pushes the list around) and always leads with one recommendation.
 */
export function SuggestionCard({
  checkin,
  busy,
  onAnswer,
}: {
  checkin: Checkin;
  busy: boolean;
  onAnswer: (answer: CheckinAnswer) => void;
}) {
  const suggestion = checkin.suggestion;
  const recommended: SuggestedAction = suggestion?.recommended ?? "move";
  const others = (["shrink", "move", "remove"] as SuggestedAction[]).filter((a) => a !== recommended);

  function preview(action: SuggestedAction): React.ReactNode {
    if (!suggestion) return null;
    if (action === "shrink") {
      return (
        <>
          <span className="font-medium text-charcoal">&ldquo;{suggestion.shrink.title}&rdquo;</span>
          <span className="text-charcoal/50"> {formatTimeRange(suggestion.shrink.start, suggestion.shrink.end)}</span>
        </>
      );
    }
    if (action === "move") {
      return (
        <>
          <span className="font-medium text-charcoal">{suggestion.move.label.split(" at ")[0]}</span>
          <span className="text-charcoal/50"> {formatTimeRange(suggestion.move.start, suggestion.move.end)}</span>
        </>
      );
    }
    return <span className="text-charcoal/60">Takes it off your list. You can undo.</span>;
  }

  const menuItem =
    "flex w-full items-start gap-2.5 px-3.5 py-2.5 text-left text-sm text-charcoal hover:bg-charcoal/5 disabled:opacity-50";

  const icons = { shrink: Minimize2, move: CalendarClock, remove: Trash2 } as const;

  return (
    <div
      role="alertdialog"
      aria-live="polite"
      aria-label={checkin.headline}
      className="fixed inset-x-3 bottom-3 z-50 animate-cardIn rounded-card border border-charcoal/10 bg-surface p-4 shadow-soft sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[390px] sm:p-5"
      style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
    >
      <button
        type="button"
        onClick={() => onAnswer("dismiss")}
        disabled={busy}
        aria-label="Dismiss"
        className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-charcoal/40 hover:bg-charcoal/5 hover:text-charcoal"
      >
        <X className="h-4 w-4" />
      </button>

      <p className="pr-8 font-serif text-lg leading-snug text-forest">{checkin.headline}</p>
      <p className="mt-1.5 text-sm leading-relaxed text-charcoal/70">{checkin.message}</p>

      {suggestion && (
        <p className="mt-3 flex items-start gap-2 rounded-lg bg-charcoal/[0.04] px-3 py-2 text-[13px] leading-snug">
          <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-forest/60" strokeWidth={2} />
          <span>{preview(recommended)}</span>
        </p>
      )}

      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={() => onAnswer("recommended")}
          disabled={busy}
          className="btn-primary flex-1 sm:flex-none"
        >
          {busy ? "Working…" : PRIMARY_LABEL[recommended]}
        </button>

        <Popover
          side="top"
          align="right"
          panelClassName="w-72 py-1.5"
          trigger={({ toggle, open }) => (
            <button
              type="button"
              onClick={toggle}
              disabled={busy}
              aria-expanded={open}
              className="btn-ghost gap-1.5 px-3.5"
            >
              Other options
              <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} strokeWidth={1.75} />
            </button>
          )}
        >
          {(close) => (
            <ul>
              {others.map((action) => {
                const Icon = icons[action];
                return (
                  <li key={action}>
                    <button
                      type="button"
                      className={menuItem}
                      onClick={() => {
                        close();
                        onAnswer(action);
                      }}
                    >
                      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-charcoal/50" strokeWidth={1.75} />
                      <span>
                        <span className="block font-medium">{PRIMARY_LABEL[action].replace(" it", "")}</span>
                        <span className="block text-xs leading-snug">{preview(action)}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
              <li className="my-1 border-t border-charcoal/10" />
              <li>
                <button type="button" className={menuItem} onClick={() => { close(); onAnswer("done"); }}>
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-charcoal/50" strokeWidth={1.75} />
                  <span className="font-medium">I already finished it</span>
                </button>
              </li>
              <li>
                <button type="button" className={menuItem} onClick={() => { close(); onAnswer("snooze"); }}>
                  <Timer className="mt-0.5 h-4 w-4 shrink-0 text-charcoal/50" strokeWidth={1.75} />
                  <span className="font-medium">Remind me in {SNOOZE_MINUTES} min</span>
                </button>
              </li>
            </ul>
          )}
        </Popover>
      </div>
    </div>
  );
}
