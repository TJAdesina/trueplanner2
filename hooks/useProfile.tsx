"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";

interface ProfileContextValue {
  profile: Profile | null;
  loading: boolean;
  refresh: () => Promise<void>;
  updateProfile: (patch: Partial<Profile>) => Promise<{ error: unknown } | undefined>;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

/**
 * The profile and its updater. The dashboard shares one instance through
 * <ProfileProvider>; pages outside it (the landing page) can call this directly.
 * Pass applyTheme: false if the caller manages the theme class itself.
 */
export function useProfileState({ applyTheme = true }: { applyTheme?: boolean } = {}): ProfileContextValue {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const { data: row } = await supabase.from("profiles").select("*").eq("id", user.id).single();

    // Keep the stored time zone in step with this device, since the scheduled
    // job uses it to decide what "today" and "quiet hours" mean for you.
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    let current = row;
    if (row && row.timezone !== zone) {
      const { data: updated } = await supabase
        .from("profiles")
        .update({ timezone: zone })
        .eq("id", user.id)
        .select()
        .single();
      if (updated) current = updated;
    }

    setProfile(current ? ({ ...current, timezone: current.timezone ?? zone } as Profile) : null);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!profile || !applyTheme) return;
    const root = document.documentElement;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () =>
      root.classList.toggle("dark", profile.theme === "dark" || (profile.theme === "system" && media.matches));
    apply();
    if (profile.theme === "system") media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [profile?.theme, applyTheme]); // eslint-disable-line react-hooks/exhaustive-deps

  // Leave the page the way we found it when the dashboard unmounts.
  useEffect(() => {
    if (!applyTheme) return;
    return () => document.documentElement.classList.remove("dark");
  }, [applyTheme]);

  const updateProfile = useCallback(async (patch: Partial<Profile>) => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return undefined;

    const { data, error } = await supabase.from("profiles").update(patch).eq("id", user.id).select().single();
    if (!error && data) setProfile(data as Profile);
    return { error };
  }, []);

  return useMemo(() => ({ profile, loading, refresh, updateProfile }), [profile, loading, refresh, updateProfile]);
}

/** One shared profile for the whole dashboard, so theme and settings never flicker between pages. */
export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const value = useProfileState();
  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used inside <ProfileProvider>.");
  return ctx;
}
