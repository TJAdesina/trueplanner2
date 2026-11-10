export const FEEDBACK_KINDS = ["problem", "idea", "confusing", "praise"] as const;
export type FeedbackKind = (typeof FEEDBACK_KINDS)[number];

export const FEEDBACK_LIMITS = {
  messageMin: 3,
  messageMax: 4000,
  screenshotBytes: 5 * 1024 * 1024,
  perHour: 5,
} as const;

export const SCREENSHOT_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;

export const KIND_COPY: Record<
  FeedbackKind,
  { label: string; prompt: string; placeholder: string }
> = {
  problem: {
    label: "Something’s not working",
    prompt: "What happened?",
    placeholder: "What did you do, what happened, and what did you expect?",
  },
  idea: {
    label: "I have an idea",
    prompt: "What would help?",
    placeholder: "Describe the idea and how you’d use it.",
  },
  confusing: {
    label: "Something’s confusing",
    prompt: "What was confusing?",
    placeholder: "Where were you, and what did you expect to happen?",
  },
  praise: {
    label: "I like something",
    prompt: "What do you like?",
    placeholder: "What’s working well for you?",
  },
} as const;

export function collectFeedbackContext(): {
  appVersion: string;
  route: string;
  userAgent: string;
  language: string;
  timezone: string;
  viewport: string;
  pixelRatio: number;
  theme: "dark" | "light";
  displayMode: "standalone" | "browser";
  notificationPermission: string;
  online: boolean;
} {
  if (typeof window === "undefined") {
    return {
      appVersion: process.env.NEXT_PUBLIC_APP_VERSION ?? "dev",
      route: "/",
      userAgent: "",
      language: "",
      timezone: "UTC",
      viewport: "0x0",
      pixelRatio: 1,
      theme: "light",
      displayMode: "browser",
      notificationPermission: "unsupported",
      online: true,
    };
  }

  const theme = document.documentElement.classList.contains("dark") ? "dark" : "light";
  const displayMode = window.matchMedia("(display-mode: standalone)").matches ? "standalone" : "browser";

  return {
    appVersion: process.env.NEXT_PUBLIC_APP_VERSION ?? "dev",
    route: window.location.pathname,
    userAgent: navigator.userAgent,
    language: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    pixelRatio: window.devicePixelRatio || 1,
    theme,
    displayMode,
    notificationPermission: typeof Notification !== "undefined" ? Notification.permission : "unsupported",
    online: navigator.onLine,
  };
}

const ALLOWED_CONTEXT_KEYS = [
  "appVersion",
  "route",
  "userAgent",
  "language",
  "timezone",
  "viewport",
  "pixelRatio",
  "theme",
  "displayMode",
  "notificationPermission",
  "online",
] as const;

export function sanitizeContext(raw: unknown): Partial<Record<(typeof ALLOWED_CONTEXT_KEYS)[number], string | number | boolean>> {
  if (!raw || typeof raw !== "object") return {};

  const out: Partial<Record<(typeof ALLOWED_CONTEXT_KEYS)[number], string | number | boolean>> = {};
  for (const key of ALLOWED_CONTEXT_KEYS) {
    const value = (raw as Record<string, unknown>)[key];
    if (typeof value === "string") {
      out[key] = value.trim().slice(0, 300);
      continue;
    }
    if (typeof value === "number" || typeof value === "boolean") {
      out[key] = value;
    }
  }
  return out;
}

export function validateFeedback(input: unknown): { ok: true; value: Record<string, unknown> } | { ok: false; error: string } {
  if (!input || typeof input !== "object") {
    return { ok: false, error: "Your feedback is missing." };
  }

  const data = input as Record<string, unknown>;
  const kind = data.kind;
  if (typeof kind !== "string" || !FEEDBACK_KINDS.includes(kind as FeedbackKind)) {
    return { ok: false, error: "Pick a kind of feedback." };
  }

  const message = typeof data.message === "string" ? data.message.trim() : "";
  if (message.length < FEEDBACK_LIMITS.messageMin || message.length > FEEDBACK_LIMITS.messageMax) {
    return {
      ok: false,
      error: `Write between ${FEEDBACK_LIMITS.messageMin} and ${FEEDBACK_LIMITS.messageMax} characters.`,
    };
  }

  if (data.rating !== undefined && data.rating !== null) {
    if (!Number.isInteger(data.rating) || Number(data.rating) < 1 || Number(data.rating) > 5) {
      return { ok: false, error: "Rating must be 1 to 5, or left blank." };
    }
  }

  const contactOk = typeof data.contactOk === "boolean" ? data.contactOk : false;
  const screenshotPath = typeof data.screenshotPath === "string" ? data.screenshotPath : null;

  if (screenshotPath !== null && typeof screenshotPath !== "string") {
    return { ok: false, error: "That screenshot isn’t valid." };
  }

  return {
    ok: true,
    value: {
      kind,
      message,
      rating: data.rating === undefined || data.rating === null ? null : Number(data.rating),
      contactOk,
      screenshotPath,
    },
  };
}
