"use client";

import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";
import { useInstall } from "@/hooks/useInstall";

const KEY = "tp-install-banner-dismissed-until";
const DISMISS_MS = 14 * 24 * 60 * 60 * 1000;

/**
 * A slim, dismissible suggestion to install the app.
 *  - Android and desktop Chrome: a one-tap install button.
 *  - iPhone / iPad: installing is required for notifications, so it explains how.
 */
export function InstallBanner() {
  const { canPrompt, needsManualIos, install, installed } = useInstall();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      setDismissed(Date.now() < Number(localStorage.getItem(KEY) ?? 0));
    } catch {
      setDismissed(false);
    }
  }, []);

  if (installed || dismissed || (!canPrompt && !needsManualIos)) return null;

  return (
    <div className="border-b border-forest/10 bg-forest/[0.06]">
      <div className="content-wrap flex items-center gap-3 py-2.5 text-sm text-charcoal/80">
        {canPrompt ? (
          <Download className="h-4 w-4 shrink-0 text-forest" strokeWidth={1.75} aria-hidden="true" />
        ) : (
          <Share className="h-4 w-4 shrink-0 text-forest" strokeWidth={1.75} aria-hidden="true" />
        )}
        <p className="min-w-0 flex-1 leading-snug">
          {canPrompt
            ? "Install TruePlanner for more reliable reminders and one-tap access."
            : "To get notifications on iPhone, tap Share, then Add to Home Screen."}
        </p>
        {canPrompt && (
          <button
            type="button"
            onClick={install}
            className="shrink-0 rounded-full bg-forest px-3.5 py-1.5 text-xs font-medium text-cream hover:bg-forest-light"
          >
            Install
          </button>
        )}
        <button
          type="button"
          aria-label="Dismiss"
          onClick={() => {
            try {
              localStorage.setItem(KEY, String(Date.now() + DISMISS_MS));
            } catch {
              // Fine.
            }
            setDismissed(true);
          }}
          className="shrink-0 rounded-full p-1.5 text-charcoal/45 hover:bg-charcoal/5 hover:text-charcoal"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
