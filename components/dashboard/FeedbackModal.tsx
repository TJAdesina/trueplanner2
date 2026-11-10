"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ClipboardEvent, type KeyboardEvent } from "react";
import { Bug, CircleHelp, Heart, ImageUp, Lightbulb, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { createClient } from "@/lib/supabase/client";
import { FEEDBACK_KINDS, FEEDBACK_LIMITS, KIND_COPY, SCREENSHOT_TYPES, collectFeedbackContext, type FeedbackKind } from "@/lib/feedback";

const DRAFT_KEY = "tp-feedback-draft";
const ICONS = {
  problem: Bug,
  idea: Lightbulb,
  confusing: CircleHelp,
  praise: Heart,
} as const;

function readDraft(): Partial<{ kind: FeedbackKind; message: string; rating: number | null; contactOk: boolean }> {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Partial<{ kind: string; message: string; rating: number | null; contactOk: boolean }>;
    if (parsed.kind && FEEDBACK_KINDS.includes(parsed.kind as FeedbackKind)) {
      return {
        kind: parsed.kind as FeedbackKind,
        message: typeof parsed.message === "string" ? parsed.message : "",
        rating: typeof parsed.rating === "number" ? parsed.rating : null,
        contactOk: Boolean(parsed.contactOk),
      };
    }
    return {
      message: typeof parsed.message === "string" ? parsed.message : "",
      rating: typeof parsed.rating === "number" ? parsed.rating : null,
      contactOk: Boolean(parsed.contactOk),
    };
  } catch {
    return {};
  }
}

function saveDraft(value: Partial<{ kind: FeedbackKind | null; message: string; rating: number | null; contactOk: boolean }>) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(value));
  } catch {
    // Storage may be blocked: skip autosave rather than break the flow.
  }
}

export function FeedbackModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [kind, setKind] = useState<FeedbackKind | null>(null);
  const [message, setMessage] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [contactOk, setContactOk] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [screenshot, setScreenshot] = useState<{ file: File | null; url: string | null; error: string | null }>({
    file: null,
    url: null,
    error: null,
  });
  const [uploadFailed, setUploadFailed] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const radioRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const reset = useCallback(() => {
    setError(null);
    setSending(false);
    setSuccess(false);
    setScreenshot({ file: null, url: null, error: null });
    setUploadFailed(false);
    setRating(null);
    setContactOk(false);
    setKind(null);
    setMessage("");
  }, []);

  useEffect(() => {
    if (!open) return;
    const draft = readDraft();
    reset();
    setKind(draft.kind ?? null);
    setMessage(draft.message ?? "");
    setRating(draft.rating ?? null);
    setContactOk(Boolean(draft.contactOk));
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => setEmail(user?.email ?? "")).catch(() => setEmail(""));
    requestAnimationFrame(() => textareaRef.current?.focus());
  }, [open, reset]);

  useEffect(() => {
    if (!open || success || sending) return;
    const timeout = window.setTimeout(() => {
      saveDraft({ kind, message, rating, contactOk });
    }, 400);
    return () => window.clearTimeout(timeout);
  }, [open, success, sending, kind, message, rating, contactOk]);

  useEffect(() => {
    if (!success) return;
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      // Ignore storage failures.
    }
  }, [success]);

  useEffect(() => {
    if (!screenshot.url) return undefined;
    const url = screenshot.url;
    return () => URL.revokeObjectURL(url);
  }, [screenshot.url]);

  const trimmedMessage = message.trim();
  const isValid = Boolean(kind) && trimmedMessage.length >= FEEDBACK_LIMITS.messageMin;

  const note = useMemo(() => {
    if (!kind) return null;
    return KIND_COPY[kind];
  }, [kind]);

  const handleImageSelection = useCallback((file: File | null) => {
    if (!file) return;
    if (!SCREENSHOT_TYPES.includes(file.type as (typeof SCREENSHOT_TYPES)[number])) {
      setScreenshot((prev) => ({ ...prev, error: "Use a PNG, JPG or WebP image." }));
      return;
    }
    if (file.size > FEEDBACK_LIMITS.screenshotBytes) {
      setScreenshot((prev) => ({ ...prev, error: "That image is over 5 MB. Try a smaller one." }));
      return;
    }
    setScreenshot({ file, url: URL.createObjectURL(file), error: null });
  }, []);

  const handlePaste = useCallback(
    (event: ClipboardEvent<HTMLTextAreaElement>) => {
      if (kind !== "problem") return;
      const file = Array.from(event.clipboardData.files).find((item) => item.type && SCREENSHOT_TYPES.includes(item.type as (typeof SCREENSHOT_TYPES)[number]));
      if (!file) return;
      event.preventDefault();
      handleImageSelection(file);
    },
    [handleImageSelection, kind]
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>) => {
      const currentIndex = radioRefs.current.indexOf(event.currentTarget);
      if (currentIndex === -1) return;
      const total = radioRefs.current.length;
      let nextIndex = currentIndex;
      if (event.key === "ArrowRight" || event.key === "ArrowDown") nextIndex = (currentIndex + 1) % total;
      if (event.key === "ArrowLeft" || event.key === "ArrowUp") nextIndex = (currentIndex - 1 + total) % total;
      if (nextIndex !== currentIndex) {
        event.preventDefault();
        radioRefs.current[nextIndex]?.focus();
        const selected = FEEDBACK_KINDS[nextIndex];
        setKind(selected);
      }
    },
    []
  );

  const handleSubmit = useCallback(async () => {
    if (!kind || !isValid || sending) return;
    setSending(true);
    setError(null);
    let screenshotPath: string | null = null;
    let uploadFailedLocal = false;

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (screenshot.file && user) {
        const ext = screenshot.file.name.includes(".") ? screenshot.file.name.split(".").pop() : "png";
        const path = `${user.id}/${crypto.randomUUID()}.${(ext || "png").toLowerCase()}`;
        const { error: uploadError } = await supabase.storage.from("feedback-screenshots").upload(path, screenshot.file, {
          contentType: screenshot.file.type,
          upsert: false,
        });
        if (uploadError) {
          uploadFailedLocal = true;
        } else {
          screenshotPath = path;
        }
      }

      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          message: trimmedMessage,
          rating,
          contactOk,
          screenshotPath,
          context: collectFeedbackContext(),
        }),
      });

      if (response.status === 429) {
        setError("You’ve sent a few messages recently. Please try again in a little while.");
        return;
      }

      if (!response.ok) {
        setError("Couldn’t send that. Check your connection and try again.");
        return;
      }

      setUploadFailed(uploadFailedLocal);
      setSuccess(true);
      setMessage("");
      setRating(null);
      setContactOk(false);
      setKind(null);
      setScreenshot({ file: null, url: null, error: null });
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {
        // Ignore storage failures.
      }
    } catch {
      setError("Couldn’t send that. Check your connection and try again.");
    } finally {
      setSending(false);
    }
  }, [contactOk, isValid, kind, message, rating, screenshot.file, sending, trimmedMessage]);

  if (!open) return null;

  return (
    <Modal title="Send feedback" onClose={onClose}>
      {success ? (
        <div className="space-y-4">
          <h3 className="font-serif text-3xl text-forest">Thank you.</h3>
          <p className="text-sm text-charcoal/75">We read every message.</p>
          {contactOk && email && <p className="text-sm text-charcoal/75">If we need more detail, we’ll email {email}.</p>}
          {uploadFailed && <p className="text-sm text-charcoal/75">Sent without the screenshot, which couldn’t be uploaded.</p>}
          <div className="flex justify-end">
            <Button onClick={onClose}>Close</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <p className="text-sm text-charcoal/70">Tell us what’s working and what isn’t. It takes about a minute.</p>

          <div role="radiogroup" aria-label="Choose the type of feedback" className="grid grid-cols-2 gap-3 sm:grid-cols-2">
            {FEEDBACK_KINDS.map((item, index) => {
              const Icon = ICONS[item];
              const selected = kind === item;
              return (
                <button
                  key={item}
                  ref={(node) => {
                    radioRefs.current[index] = node;
                  }}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  tabIndex={selected ? 0 : -1}
                  onKeyDown={handleKeyDown}
                  onClick={() => setKind(item)}
                  className={`flex min-h-24 flex-col items-start justify-between rounded-2xl border p-3 text-left transition-colors ${
                    selected ? "border-forest bg-forest/5 text-charcoal" : "border-charcoal/10 bg-surface text-charcoal/70 hover:bg-charcoal/[0.03]"
                  }`}
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-charcoal/[0.05]">
                    <Icon className="h-4 w-4" strokeWidth={1.75} />
                  </span>
                  <span className="text-sm font-medium">{KIND_COPY[item].label}</span>
                </button>
              );
            })}
          </div>

          {note && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-charcoal" htmlFor="feedback-message">
                {note.prompt}
              </label>
              <textarea
                id="feedback-message"
                ref={textareaRef}
                value={message}
                onChange={(event) => setMessage(event.target.value.slice(0, FEEDBACK_LIMITS.messageMax))}
                onPaste={handlePaste}
                placeholder={note.placeholder}
                minLength={FEEDBACK_LIMITS.messageMin}
                maxLength={FEEDBACK_LIMITS.messageMax}
                rows={4}
                className="w-full rounded-xl border border-charcoal/15 bg-surface px-3 py-2 text-sm text-charcoal placeholder:text-charcoal/35 focus:border-forest/40 focus:outline-none focus:ring-2 focus:ring-forest/15"
                onKeyDown={(event) => {
                  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                    event.preventDefault();
                    handleSubmit();
                  }
                }}
              />
              {message.length > FEEDBACK_LIMITS.messageMax - 50 && (
                <div className="text-right text-[11px] text-charcoal/45">{message.length}/4000</div>
              )}
            </div>
          )}

          {kind && (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-charcoal">How is TruePlanner working for you?</p>
                <span className="text-xs text-charcoal/45">optional</span>
              </div>
              <div role="radiogroup" aria-label="Rate your experience" className="space-y-2">
                <div className="flex items-center justify-between text-[11px] text-charcoal/45">
                  <span>Not well</span>
                  <span>Very well</span>
                </div>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={rating === value}
                      tabIndex={0}
                      onClick={() => setRating((current) => (current === value ? null : value))}
                      className={`flex-1 rounded-lg border px-2 py-2 text-sm font-medium transition-colors ${
                        rating === value ? "border-forest bg-forest text-cream" : "border-charcoal/15 bg-surface text-charcoal/70 hover:bg-charcoal/[0.03]"
                      }`}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {kind === "problem" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()}>
                  <ImageUp className="h-4 w-4" strokeWidth={1.75} />
                  Add a screenshot
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(event) => {
                    const next = event.target.files?.[0] ?? null;
                    handleImageSelection(next);
                    event.currentTarget.value = "";
                  }}
                />
              </div>
              <p className="text-[11px] text-charcoal/50">PNG, JPG or WebP, up to 5 MB. You can also paste an image into the message box.</p>
              {screenshot.error && <p className="text-sm text-[#B3492B]">{screenshot.error}</p>}
              {screenshot.url && (
                <div className="relative inline-block overflow-hidden rounded-xl border border-charcoal/10 bg-surface">
                  <img src={screenshot.url} alt="Attached feedback screenshot" className="h-28 w-28 object-cover" />
                  <button
                    type="button"
                    onClick={() => setScreenshot({ file: null, url: null, error: null })}
                    className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-charcoal/70 text-white"
                    aria-label="Remove screenshot"
                  >
                    <X className="h-3.5 w-3.5" strokeWidth={1.75} />
                  </button>
                </div>
              )}
            </div>
          )}

          <label className="flex items-start gap-3 rounded-lg border border-charcoal/10 bg-surface px-3 py-2 text-sm text-charcoal">
            <input
              type="checkbox"
              checked={contactOk}
              onChange={(event) => setContactOk(event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-charcoal/20 text-forest focus:ring-forest/15"
            />
            <span>
              You can email me about this
              {email && <span className="mt-1 block text-xs text-charcoal/45">{email}</span>}
            </span>
          </label>

          <p className="text-[11px] leading-relaxed text-charcoal/45">
            We include your app version, device and screen size to help us reproduce problems. We never include your tasks.
          </p>

          {error && (
            <p role="alert" className="text-sm text-[#B3492B]">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose} type="button">
              Cancel
            </Button>
            <Button type="button" disabled={!isValid || sending} onClick={handleSubmit}>
              {sending ? "Sending…" : "Send feedback"}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
