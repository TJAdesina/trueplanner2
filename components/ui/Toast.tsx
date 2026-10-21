"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";

interface ToastOptions {
  actionLabel?: string;
  onAction?: () => void | Promise<void>;
  tone?: "default" | "error";
  duration?: number;
}

interface ToastItem extends ToastOptions {
  id: number;
  message: string;
}

type ToastFn = (message: string, options?: ToastOptions) => void;

const ToastContext = createContext<ToastFn>(() => {});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setItems((prev) => prev.filter((t) => t.id !== id)), []);

  const toast = useCallback<ToastFn>(
    (message, options = {}) => {
      const id = nextId.current++;
      setItems((prev) => [...prev.slice(-2), { id, message, ...options }]);
      const duration = options.duration ?? (options.actionLabel ? 7000 : 4000);
      setTimeout(() => dismiss(id), duration);
    },
    [dismiss]
  );

  const value = useMemo(() => toast, [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed left-1/2 top-3 z-[70] flex w-[calc(100vw-1.5rem)] max-w-sm -translate-x-1/2 flex-col gap-2 sm:bottom-6 sm:left-6 sm:top-auto sm:translate-x-0"
        aria-live="polite"
      >
        {items.map((item) => (
          <div
            key={item.id}
            role="status"
            className={`pointer-events-auto flex items-center gap-3 rounded-xl px-4 py-3 text-sm shadow-soft animate-pop ${
              item.tone === "error" ? "bg-[#B3492B] text-white" : "bg-forest text-cream"
            }`}
          >
            <span className="flex-1 leading-snug">{item.message}</span>
            {item.actionLabel && (
              <button
                onClick={async () => {
                  dismiss(item.id);
                  await item.onAction?.();
                }}
                className="shrink-0 rounded-md px-2 py-1 text-sm font-semibold underline-offset-2 hover:underline"
              >
                {item.actionLabel}
              </button>
            )}
            <button
              onClick={() => dismiss(item.id)}
              aria-label="Dismiss"
              className="shrink-0 rounded-full p-1 opacity-60 hover:opacity-100"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastFn {
  return useContext(ToastContext);
}
