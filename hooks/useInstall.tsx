"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { isAndroid, isIOS, isStandalone } from "@/lib/pushClient";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface InstallContextValue {
  /** The browser can show its own install dialog right now (Chrome on Android and desktop). */
  canPrompt: boolean;
  /** iPhone / iPad Safari, where installing is a manual "Add to Home Screen". */
  needsManualIos: boolean;
  android: boolean;
  installed: boolean;
  install: () => Promise<void>;
}

const InstallContext = createContext<InstallContextValue>({
  canPrompt: false,
  needsManualIos: false,
  android: false,
  installed: false,
  install: async () => {},
});

export function InstallProvider({ children }: { children: React.ReactNode }) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);
  const [android, setAndroid] = useState(false);

  useEffect(() => {
    setInstalled(isStandalone());
    setIos(isIOS());
    setAndroid(isAndroid());

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === "accepted") setInstalled(true);
    setDeferred(null);
  }, [deferred]);

  const value = useMemo<InstallContextValue>(
    () => ({
      canPrompt: Boolean(deferred) && !installed,
      needsManualIos: ios && !installed,
      android,
      installed,
      install,
    }),
    [deferred, installed, ios, android, install]
  );

  return <InstallContext.Provider value={value}>{children}</InstallContext.Provider>;
}

export function useInstall(): InstallContextValue {
  return useContext(InstallContext);
}
