import { useCallback, useEffect, useRef, useState } from "react";
import type { Checkin, Task } from "@/lib/types";

const POLL_MS = 30_000;

export interface ActResult {
  ok: boolean;
  error?: string;
  alreadyHandled?: boolean;
  message?: string;
  previous?: Task;
  undo?: "completed" | "shrunk" | "moved" | "removed";
  spawnedId?: string | null;
}

export type CheckinAnswer = "recommended" | "shrink" | "move" | "remove" | "done" | "dismiss" | "snooze";

/**
 * Keeps the dashboard in step with the server's check-in. The server decides
 * when something has slipped; this just asks every 30 seconds (and whenever the
 * tab comes back into view) and shows whatever it's told.
 */
export function useCheckins(enabled: boolean) {
  const [checkin, setCheckin] = useState<Checkin | null>(null);
  const [busy, setBusy] = useState(false);
  const inflight = useRef(false);
  const acting = useRef(false);

  const evaluate = useCallback(async () => {
    if (!enabled || inflight.current || acting.current) return;
    inflight.current = true;
    try {
      const res = await fetch("/api/checkin", { method: "POST" });
      if (res.ok && !acting.current) {
        const data = await res.json();
        setCheckin((data.checkin as Checkin | null) ?? null);
      }
    } catch {
      // Offline or a brief server hiccup: try again on the next tick.
    } finally {
      inflight.current = false;
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setCheckin(null);
      return;
    }
    evaluate();
    const id = setInterval(evaluate, POLL_MS);
    const onVisible = () => document.visibilityState === "visible" && evaluate();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", evaluate);

    // The service worker tells us when a push arrived while the app was open.
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === "checkin-refresh") evaluate();
    };
    navigator.serviceWorker?.addEventListener("message", onMessage);

    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", evaluate);
      navigator.serviceWorker?.removeEventListener("message", onMessage);
    };
  }, [enabled, evaluate]);

  const answer = useCallback(
    async (action: CheckinAnswer): Promise<ActResult> => {
      if (!checkin) return { ok: false, error: "Nothing to answer." };
      acting.current = true;
      setBusy(true);
      try {
        const res = await fetch("/api/checkin/act", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ checkinId: checkin.id, action }),
        });
        const data = (await res.json().catch(() => ({}))) as ActResult & { error?: string };
        if (res.ok) {
          setCheckin(null);
          return { ...data, ok: true };
        }
        // The task vanished or was already handled elsewhere: just clear the card.
        if (res.status === 404) setCheckin(null);
        return { ok: false, error: data.error ?? "Something went wrong. Try again." };
      } catch {
        return { ok: false, error: "Couldn't reach the server. Check your connection." };
      } finally {
        acting.current = false;
        setBusy(false);
      }
    },
    [checkin]
  );

  return { checkin, busy, answer, evaluate };
}
