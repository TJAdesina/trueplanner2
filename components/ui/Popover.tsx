"use client";

import { useEffect, useRef, useState } from "react";

interface PopoverProps {
  trigger: (state: { open: boolean; toggle: () => void }) => React.ReactNode;
  children: React.ReactNode | ((close: () => void) => React.ReactNode);
  align?: "left" | "right";
  side?: "bottom" | "top";
  panelClassName?: string;
  className?: string;
}

/** A small floating panel that closes on outside click or Escape. */
export function Popover({
  trigger,
  children,
  align = "left",
  side = "bottom",
  panelClassName = "",
  className = "",
}: PopoverProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent | TouchEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div ref={ref} className={`relative inline-flex ${className}`}>
      {trigger({ open, toggle: () => setOpen((o) => !o) })}
      {open && (
        <div
          className={`absolute z-40 max-w-[calc(100vw-2rem)] rounded-xl border border-charcoal/10 bg-surface shadow-soft animate-pop ${
            side === "top" ? "bottom-full mb-2" : "top-full mt-2"
          } ${align === "right" ? "right-0" : "left-0"} ${panelClassName}`}
        >
          {typeof children === "function" ? children(close) : children}
        </div>
      )}
    </div>
  );
}
