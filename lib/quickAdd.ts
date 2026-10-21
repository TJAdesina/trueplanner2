import { parseClockText } from "./time";

export interface ParsedQuickAdd {
  title: string;
  tagNames: string[];
  /** "HH:mm" when a time was typed, such as "at 3pm". */
  start: string | null;
  durationMinutes: number | null;
  day: "today" | "tomorrow" | null;
}

/**
 * Lightly understands what someone types into the quick-add box:
 *   "Call Ada at 3pm for 30m #work tomorrow"
 * The recognised bits are lifted out of the title; everything else is left
 * alone so ordinary titles are never mangled.
 */
export function parseQuickAdd(input: string): ParsedQuickAdd {
  let text = ` ${input} `;
  const result: ParsedQuickAdd = {
    title: "",
    tagNames: [],
    start: null,
    durationMinutes: null,
    day: null,
  };

  // #tags
  text = text.replace(/\s#([\p{L}\p{N}_-]{1,24})(?=\s)/gu, (_m, name: string) => {
    result.tagNames.push(name);
    return " ";
  });

  // "for 45m", "for 1h", "for 1h30", "for 90 minutes"
  text = text.replace(
    /\sfor\s+(\d+(?:\.\d+)?)\s*(h|hr|hrs|hours?|m|min|mins|minutes?)(?:\s*(\d+)\s*(?:m|min|mins)?)?(?=\s)/i,
    (_m, amount: string, unit: string, extra?: string) => {
      const isHour = unit.toLowerCase().startsWith("h");
      const minutes = Math.round(Number(amount) * (isHour ? 60 : 1)) + (isHour && extra ? Number(extra) : 0);
      if (minutes > 0 && minutes <= 24 * 60) result.durationMinutes = minutes;
      return " ";
    }
  );

  // "at 3pm", "at 15:30", or a bare "3pm" / "3:30 pm"
  text = text.replace(
    /\s(?:at\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)|(\d{1,2}(?::\d{2})?\s*(?:am|pm)))(?=\s)/i,
    (match, withAt?: string, bare?: string) => {
      const parsed = parseClockText((withAt ?? bare ?? "").replace(/\s+/g, ""));
      if (!parsed) return match;
      result.start = parsed;
      return " ";
    }
  );

  // A trailing "today" or "tomorrow" only. "Plan for tomorrow's meeting" stays intact.
  text = text.replace(/\s(today|tomorrow)\s*$/i, (_m, word: string) => {
    result.day = word.toLowerCase() as "today" | "tomorrow";
    return " ";
  });

  result.title = text.replace(/\s+/g, " ").trim();
  return result;
}
