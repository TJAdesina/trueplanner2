import type { CheckinContent, SuggestedAction, Suggestion, Task } from "./types";
import { formatDuration } from "./time";

/**
 * The language half of the check-in system. By the time anything here runs,
 * a separate deterministic system has already decided that a check-in is
 * warranted and which recovery move to recommend. This only words it.
 * Gemini does the wording when configured; otherwise (or on any failure)
 * the built-in writer below produces the same kind of message.
 */

export interface CheckinFacts {
  task: Task;
  minutesOver: number;
  suggestion: Suggestion;
  relatedCount: number;
}

// ---------------------------------------------------------------------------
// Built-in writer
// ---------------------------------------------------------------------------

function pick<T>(items: T[], seed: number): T {
  return items[Math.abs(seed) % items.length];
}

function seedFrom(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i += 1) h = (h * 31 + text.charCodeAt(i)) | 0;
  return h;
}

function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

function overText(minutes: number): string {
  return minutes < 3 ? "just past its time" : `${formatDuration(minutes)} past its time`;
}

function relatedText(count: number): string {
  if (count <= 0) return "";
  return ` ${count} other task${count === 1 ? "" : "s"} also ran over.`;
}

const HEADLINES: Record<SuggestedAction, string[]> = {
  move: ["This ran past its time.", "Time's up on this one."],
  shrink: ["Try a smaller version.", "Your plan is getting tight."],
  remove: ["Still worth doing?", "This one keeps slipping."],
};

export function writeTemplateCheckin(facts: CheckinFacts): CheckinContent {
  const { task, suggestion, minutesOver, relatedCount } = facts;
  const action = suggestion.recommended;
  const title = task.title;
  const seed = seedFrom(`${task.id}|${action}`);
  const headline = pick(HEADLINES[action], seed);

  let message: string;
  if (action === "move") {
    const when = lowerFirst(suggestion.move.label);
    message = suggestion.move.label.startsWith("Tomorrow")
      ? `"${title}" is ${overText(minutesOver)}, and today is nearly full. ${suggestion.move.label} is a better fit.`
      : `"${title}" is ${overText(minutesOver)}. There's room for it ${when}.`;
  } else if (action === "shrink") {
    message =
      task.move_count >= 2
        ? `"${title}" has moved ${task.move_count} times. A smaller version might finally fit: "${suggestion.shrink.title}".`
        : `"${title}" is ${overText(minutesOver)}. A smaller version may fit the time you have: "${suggestion.shrink.title}".`;
  } else {
    message = `"${title}" has slipped before and is still open. Is it worth keeping on your list?`;
  }

  return {
    headline,
    message: `${message}${relatedText(relatedCount)}`.slice(0, 320),
    shrinkTitle: undefined,
    source: "template",
  };
}

// ---------------------------------------------------------------------------
// Gemini writer
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You write the short check-in messages inside TruePlanner, a calm to-do app.
Voice: calm, capable, direct, respectful, practical, quietly encouraging. Never frantic, never guilt-driven, never enthusiastic, never therapy-like.
A separate system has already decided to interrupt the user and has chosen the recommended next step. You only phrase it.

Rules:
- "headline": at most 6 words. No exclamation marks, no emoji.
- "message": 1 or 2 short sentences, under 220 characters. Include the task title exactly as given. State plainly what happened and say, in ordinary words, what the recommended next step is, using the facts supplied (for example a new time, or the smaller version). Do not name buttons or actions like "Shrink" or "Move".
- "shrinkTitle": a concrete, meaningful smaller outcome of the same task. At most 60 characters. Start with a verb. It must be a real first piece of the work, not "first part of" the title.
- Never say "failed", "behind", or "don't give up". Never pretend to know how the user feels.
- Output ONLY strict JSON: {"headline": string, "message": string, "shrinkTitle": string}. No markdown.`;

const TIMEOUT_MS = 15_000;

function factsToPrompt(facts: CheckinFacts): string {
  const { task, suggestion, minutesOver, relatedCount } = facts;
  return JSON.stringify({
    taskTitle: task.title,
    minutesPastEndTime: minutesOver,
    priority: task.priority,
    timesAlreadyMoved: task.move_count,
    recommendedNextStep:
      suggestion.recommended === "move"
        ? { type: "move to a new time", when: suggestion.move.label }
        : suggestion.recommended === "shrink"
          ? { type: "shrink to a smaller task" }
          : { type: "take it off the list" },
    otherTasksAlsoOverdue: relatedCount,
  });
}

export async function writeGeminiCheckin(facts: CheckinFacts): Promise<CheckinContent | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: factsToPrompt(facts) }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.6, maxOutputTokens: 300 },
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      console.error(`Gemini check-in failed (${res.status}).`, await res.text());
      return null;
    }

    const data = await res.json();
    const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return null;

    const parsed = JSON.parse(text);
    const headline = typeof parsed.headline === "string" ? parsed.headline.trim() : "";
    const message = typeof parsed.message === "string" ? parsed.message.trim() : "";
    const shrinkTitle = typeof parsed.shrinkTitle === "string" ? parsed.shrinkTitle.trim() : "";
    if (!headline || !message) return null;

    // The message must actually be about this task.
    if (!`${headline} ${message}`.toLowerCase().includes(facts.task.title.trim().toLowerCase())) {
      console.warn("Gemini check-in did not name the task; using the built-in writer.");
      return null;
    }

    return {
      headline: headline.slice(0, 80),
      message: message.slice(0, 320),
      shrinkTitle: shrinkTitle && shrinkTitle.length <= 80 ? shrinkTitle : undefined,
      source: "gemini",
    };
  } catch (error) {
    console.error("Gemini check-in failed; using the built-in writer.", String(error).replaceAll(apiKey, "[redacted]"));
    return null;
  }
}

export async function writeCheckin(facts: CheckinFacts, aiEnabled: boolean): Promise<CheckinContent> {
  if (aiEnabled) {
    const ai = await writeGeminiCheckin(facts);
    if (ai) return ai;
  }
  return writeTemplateCheckin(facts);
}
