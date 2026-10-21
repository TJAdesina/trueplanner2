"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useProfile } from "@/hooks/useProfile";
import { enableNotifications, ensureSubscription, isIOS, isStandalone, permissionState } from "@/lib/pushClient";

const SNOOZE_KEY = "tp-notify-prompt-snoozed-until";
const SNOOZE_MS = 24 * 60 * 60 * 1000;

/**
 * Makes sure every device you use can actually receive nudges.
 *  - Permission not yet decided on this device: asks, with a friendly in-app prompt first
 *    (browsers only allow the real prompt after a click, and Safari insists on it).
 *  - Permission already granted: quietly makes sure this device is registered.
 */
export function NotificationGate() {
  const { profile } = useProfile();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [working, setWorking] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const enabled = profile?.notifications_enabled ?? false;

  useEffect(() => {
    if (!profile || !enabled) return;
    const state = permissionState();

    if (state === "granted") {
      ensureSubscription();
      return;
    }
    if (state === "default") {
      let until = 0;
      try {
        until = Number(localStorage.getItem(SNOOZE_KEY) ?? 0);
      } catch {
        // No storage: just ask.
      }
      if (Date.now() >= until) setOpen(true);
    }
    // "unsupported" on iPhone Safari is handled by the install banner; "denied" by Settings.
  }, [profile, enabled]);

  if (!open) return null;

  function snooze() {
    try {
      localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_MS));
    } catch {
      // Fine: it will simply ask again next visit.
    }
    setOpen(false);
  }

  async function turnOn() {
    setWorking(true);
    setError(null);
    const result = await enableNotifications();
    setWorking(false);
    if (result.permission === "granted" && !result.error) {
      setOpen(false);
      toast("Notifications are on for this device.");
      return;
    }
    if (result.permission === "denied") {
      setBlocked(true);
      return;
    }
    setError(result.error ?? "Notifications aren't available in this browser.");
  }

  return (
    <Modal title="Get a nudge when plans slip" onClose={snooze}>
      <div className="flex items-start gap-4">
        <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-forest/10 text-forest">
          <Bell className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <div>
          <p className="text-sm leading-relaxed text-charcoal/75">
            When a task runs past its time, TruePlanner can send one calm suggestion, even if this tab is closed.
            Nothing else. No streaks, no daily reminders.
          </p>
          {blocked && (
            <p className="mt-3 rounded-lg bg-peach/15 px-3 py-2 text-sm text-charcoal/80">
              Notifications are blocked for this site. Allow them in your browser&rsquo;s site settings
              {isIOS() && !isStandalone() ? ", after adding TruePlanner to your Home Screen" : ""}, then come back to Settings.
            </p>
          )}
          {error && <p className="mt-3 text-sm text-[#B3492B]">{error}</p>}
        </div>
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="ghost" onClick={snooze}>
          Not now
        </Button>
        {!blocked && (
          <Button onClick={turnOn} disabled={working}>
            {working ? "Waiting\u2026" : "Turn on"}
          </Button>
        )}
      </div>
    </Modal>
  );
}
