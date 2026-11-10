"use client";

import { useEffect, useState } from "react";
import { MessageSquareText } from "lucide-react";
import { FeedbackModal } from "@/components/dashboard/FeedbackModal";

export function FeedbackButton() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener("tp:open-feedback", onOpen);
    return () => window.removeEventListener("tp:open-feedback", onOpen);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full bg-forest px-4 py-2.5 text-sm font-medium text-cream shadow-soft transition-transform hover:translate-y-[-1px] sm:bottom-6 sm:right-6"
        aria-label="Send feedback"
      >
        <MessageSquareText className="h-4 w-4" strokeWidth={1.75} />
        <span>Feedback</span>
      </button>
      <FeedbackModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
