"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Trash2 } from "lucide-react";
import { Toggle } from "@/components/ui/Toggle";
import { Button } from "@/components/ui/Button";
import { Popover } from "@/components/ui/Popover";
import { useToast } from "@/components/ui/Toast";
import { TagDot } from "@/components/dashboard/TagPicker";
import { useProfile } from "@/hooks/useProfile";
import { useTags } from "@/hooks/useTags";
import { useInstall } from "@/hooks/useInstall";
import { createClient } from "@/lib/supabase/client";
import {
  enableNotifications,
  hasLocalSubscription,
  isIOS,
  isStandalone,
  permissionState,
  sendTestNotification,
  type PermissionState,
} from "@/lib/pushClient";
import { TAG_COLORS } from "@/lib/tags";
import type { Profile } from "@/lib/types";

const GAP_OPTIONS = [15, 30, 45, 60, 90, 120, 180];

const field =
  "rounded-lg border border-charcoal/15 bg-surface px-3 py-2 text-sm text-charcoal focus:border-forest/40 focus:outline-none focus:ring-2 focus:ring-forest/15";

function gapLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} minutes`;
  const hours = minutes / 60;
  return Number.isInteger(hours) ? `${hours} hour${hours === 1 ? "" : "s"}` : `${minutes} minutes`;
}

export default function SettingsPage() {
  const { profile, loading, updateProfile } = useProfile();
  const { tags, updateTag, deleteTag } = useTags();
  const install = useInstall();
  const toast = useToast();
  const router = useRouter();

  const [permission, setPermission] = useState<PermissionState>("default");
  const [registered, setRegistered] = useState(false);
  const [serverReady, setServerReady] = useState<boolean | null>(null);
  const [working, setWorking] = useState(false);

  const checkDevice = useCallback(async () => {
    setPermission(permissionState());
    setRegistered(await hasLocalSubscription());
  }, []);

  useEffect(() => {
    checkDevice();
    fetch("/api/push-subscription")
      .then((r) => r.json())
      .then((s) => setServerReady(Boolean(s.configured)))
      .catch(() => setServerReady(false));
  }, [checkDevice]);

  if (loading || !profile) return <p className="text-sm text-charcoal/50">Loading settings&hellip;</p>;

  async function save(patch: Partial<Profile>) {
    const result = await updateProfile(patch);
    if (result?.error) toast("Couldn't save that. Try again.", { tone: "error" });
  }

  async function enableHere() {
    setWorking(true);
    const result = await enableNotifications();
    setWorking(false);
    await checkDevice();
    if (result.permission === "granted" && !result.error) {
      await save({ notifications_enabled: true });
      toast("Notifications are on for this device.");
    } else if (result.permission === "denied") {
      toast("Notifications are blocked for this site. Allow them in your browser settings.", { tone: "error" });
    } else if (result.error) {
      toast(result.error, { tone: "error" });
    }
  }

  async function toggleNotifications(on: boolean) {
    if (!on) {
      await save({ notifications_enabled: false });
      return;
    }
    if (permission === "granted" && registered) {
      await save({ notifications_enabled: true });
      return;
    }
    await enableHere();
    if (permissionState() !== "granted") await save({ notifications_enabled: true });
  }

  async function sendTest() {
    setWorking(true);
    const result = await sendTestNotification();
    setWorking(false);
    toast(result.ok ? "Test sent. It should arrive in a moment." : (result.error ?? "The test failed."), {
      tone: result.ok ? "default" : "error",
    });
  }

  async function exportData() {
    const supabase = createClient();
    const [{ data: tasks }, { data: tagRows }] = await Promise.all([
      supabase.from("tasks").select("*"),
      supabase.from("tags").select("*"),
    ]);
    const blob = new Blob([JSON.stringify({ profile, tags: tagRows, tasks }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "trueplanner-export.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function deleteAllTasks() {
    if (!confirm("This permanently removes every task you've created. Continue?")) return;
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) await supabase.from("tasks").delete().eq("user_id", user.id);
    toast("All tasks deleted.");
    router.refresh();
  }

  const gapOptions = GAP_OPTIONS.includes(profile.checkin_gap_minutes)
    ? GAP_OPTIONS
    : [...GAP_OPTIONS, profile.checkin_gap_minutes].sort((a, b) => a - b);

  const iosNeedsInstall = isIOS() && !isStandalone();
  let deviceStatus: string;
  if (serverReady === false) deviceStatus = "Notifications aren't set up on the server yet (the VAPID keys are missing).";
  else if (permission === "unsupported")
    deviceStatus = iosNeedsInstall
      ? "On iPhone and iPad, notifications need TruePlanner added to your Home Screen. Tap Share, then Add to Home Screen, and open it from there."
      : "This browser doesn't support notifications.";
  else if (permission === "denied") deviceStatus = "Blocked for this site. Allow notifications in your browser's site settings, then come back.";
  else if (permission === "granted" && registered) deviceStatus = "This device is ready to receive suggestions.";
  else if (permission === "granted") deviceStatus = "Permission is on, but this device isn't registered yet.";
  else deviceStatus = "Not turned on for this device yet.";

  const ready = permission === "granted" && registered && serverReady !== false;

  return (
    <div className="space-y-6 pb-8">
      <h1 className="font-serif text-3xl text-forest">Settings</h1>

      <section className="card p-5 sm:p-6">
        <p className="eyebrow">Suggestions</p>
        <div className="mt-2 divide-y divide-charcoal/[0.08]">
          <Toggle
            label="Suggest a next step when a task slips"
            description="One calm suggestion when a task runs past its time, in the app and as a notification."
            checked={profile.notifications_enabled}
            onChange={toggleNotifications}
          />

          <div className="py-3">
            <p className="text-sm font-medium text-charcoal">This device</p>
            <p className="mt-1 text-xs leading-relaxed text-charcoal/55" role="status">
              {deviceStatus}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {permission !== "granted" || !registered ? (
                permission !== "unsupported" && permission !== "denied" && serverReady !== false && (
                  <Button variant="secondary" onClick={enableHere} disabled={working}>
                    {permission === "granted" ? "Register this device" : "Enable on this device"}
                  </Button>
                )
              ) : null}
              {ready && (
                <Button variant="secondary" onClick={sendTest} disabled={working}>
                  Send a test notification
                </Button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 py-3">
            <label htmlFor="gap" className="block">
              <span className="block text-sm font-medium text-charcoal">Time between suggestions</span>
              <span className="mt-0.5 block text-xs text-charcoal/50">
                The shortest wait between two suggestions. Each task is only flagged once.
              </span>
            </label>
            <select
              id="gap"
              value={profile.checkin_gap_minutes}
              onChange={(e) => save({ checkin_gap_minutes: Number(e.target.value) })}
              className={field}
            >
              {gapOptions.map((m) => (
                <option key={m} value={m}>
                  {gapLabel(m)}
                </option>
              ))}
            </select>
          </div>

          <div className="py-3">
            <p className="text-sm font-medium text-charcoal">Quiet hours</p>
            <p className="mt-0.5 text-xs text-charcoal/50">No suggestions or reminders during this window.</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <input
                type="time"
                aria-label="Quiet hours start"
                value={profile.quiet_hours_start ?? ""}
                onChange={(e) => save({ quiet_hours_start: e.target.value || null })}
                className={field}
              />
              <span className="text-sm text-charcoal/40">to</span>
              <input
                type="time"
                aria-label="Quiet hours end"
                value={profile.quiet_hours_end ?? ""}
                onChange={(e) => save({ quiet_hours_end: e.target.value || null })}
                className={field}
              />
              {(profile.quiet_hours_start || profile.quiet_hours_end) && (
                <button
                  type="button"
                  onClick={() => save({ quiet_hours_start: null, quiet_hours_end: null })}
                  className="rounded-lg px-2 py-2 text-xs font-medium text-charcoal/55 hover:bg-charcoal/5"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <Toggle
            label="Personalised wording with AI"
            description="When off, suggestions are written by the built-in writer instead of Gemini."
            checked={profile.ai_processing_enabled}
            onChange={(v) => save({ ai_processing_enabled: v })}
          />
        </div>
      </section>

      <section className="card p-5 sm:p-6">
        <p className="eyebrow">Your day</p>
        <p className="mt-2 text-xs text-charcoal/50">
          Used to find room later today and to offer your end-of-day review. Time zone: {profile.timezone}.
        </p>
        <div className="mt-3 flex flex-wrap gap-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-charcoal/60">Day starts</span>
            <input type="time" value={profile.working_hours_start} onChange={(e) => e.target.value && save({ working_hours_start: e.target.value })} className={field} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-charcoal/60">Day ends</span>
            <input type="time" value={profile.working_hours_end} onChange={(e) => e.target.value && save({ working_hours_end: e.target.value })} className={field} />
          </label>
        </div>
      </section>

      <section className="card p-5 sm:p-6">
        <p className="eyebrow">Tags</p>
        {tags.length === 0 ? (
          <p className="mt-2 text-sm text-charcoal/55">Tags you create while adding tasks will show up here.</p>
        ) : (
          <ul className="mt-2 divide-y divide-charcoal/[0.08]">
            {tags.map((tag) => (
              <li key={tag.id} className="flex items-center gap-2 py-2">
                <Popover
                  panelClassName="p-3"
                  trigger={({ toggle }) => (
                    <button type="button" onClick={toggle} aria-label={`Change colour of ${tag.name}`} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-charcoal/5">
                      <TagDot color={tag.color} className="h-3.5 w-3.5" />
                    </button>
                  )}
                >
                  {(close) => (
                    <div className="flex w-44 flex-wrap gap-2">
                      {TAG_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          aria-label={`Colour ${c}`}
                          onClick={() => {
                            updateTag(tag.id, { color: c });
                            close();
                          }}
                          className={`h-6 w-6 rounded-full ring-offset-2 ring-offset-surface ${tag.color === c ? "ring-2 ring-forest" : ""}`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  )}
                </Popover>
                <input
                  defaultValue={tag.name}
                  maxLength={24}
                  aria-label={`Rename ${tag.name}`}
                  onBlur={(e) => {
                    const next = e.target.value.trim();
                    if (!next) e.target.value = tag.name;
                    else if (next !== tag.name) updateTag(tag.id, { name: next });
                  }}
                  className="min-w-0 flex-1 rounded-md bg-transparent px-2 py-1.5 text-sm text-charcoal focus:bg-charcoal/[0.04] focus:outline-none"
                />
                <button
                  type="button"
                  aria-label={`Delete tag ${tag.name}`}
                  onClick={() => {
                    if (confirm(`Delete the tag "${tag.name}"? Tasks keep everything else.`)) deleteTag(tag.id);
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-charcoal/40 hover:bg-charcoal/5 hover:text-[#B3492B]"
                >
                  <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card p-5 sm:p-6">
        <p className="eyebrow">Appearance</p>
        <div className="mt-3 flex gap-2">
          {(["light", "dark", "system"] as const).map((t) => (
            <button
              key={t}
              onClick={() => save({ theme: t })}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium capitalize transition-colors ${
                profile.theme === t ? "border-forest bg-forest text-cream" : "border-charcoal/15 text-charcoal/70 hover:bg-charcoal/5"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </section>

      <section className="card p-5 sm:p-6">
        <p className="eyebrow">App</p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-sm text-sm text-charcoal/70">
            {install.installed
              ? "TruePlanner is installed on this device."
              : install.needsManualIos
                ? "On iPhone, tap Share, then Add to Home Screen. It's required for notifications."
                : "Install TruePlanner for more reliable reminders and one-tap access."}
          </p>
          {install.canPrompt && (
            <Button variant="secondary" onClick={install.install}>
              <Download className="h-4 w-4" strokeWidth={1.75} />
              Install app
            </Button>
          )}
        </div>
      </section>

      <section className="card p-5 sm:p-6">
        <p className="eyebrow">Your data</p>
        <div className="mt-2 divide-y divide-charcoal/[0.08]">
          <div className="flex items-center justify-between py-3">
            <span className="text-sm font-medium text-charcoal">Export your data</span>
            <Button variant="secondary" onClick={exportData}>
              Export
            </Button>
          </div>
          <div className="flex items-center justify-between py-3">
            <span className="text-sm font-medium text-charcoal">Delete all tasks</span>
            <Button variant="ghost" onClick={deleteAllTasks} className="text-[#B3492B]">
              Delete
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
