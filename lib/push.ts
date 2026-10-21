import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Checkin, Task } from "@/lib/types";
import { formatDuration, formatInZone } from "@/lib/time";
import { durationMinutes } from "@/lib/tasks";

export interface PushPayload {
  type: "checkin" | "reminder" | "test";
  title: string;
  body: string;
  tag: string;
  url: string;
  checkinId?: string;
  actions?: { action: string; title: string }[];
}

export interface DeliveryResult {
  configured: boolean;
  subscriptions: number;
  sent: number;
}

const ACTION_LABEL = { shrink: "Shrink", move: "Move", remove: "Remove" } as const;

let vapidReady = false;
function setupVapid(): boolean {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) {
    console.error("Push notifications are not configured: the VAPID environment variables are missing.");
    return false;
  }
  if (!vapidReady) {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    vapidReady = true;
  }
  return true;
}

async function deliver(supabase: SupabaseClient, userId: string, payload: PushPayload): Promise<DeliveryResult> {
  if (!setupVapid()) return { configured: false, subscriptions: 0, sent: 0 };

  const { data: subscriptions, error } = await supabase
    .from("push_subscriptions")
    .select("endpoint, subscription")
    .eq("user_id", userId);
  if (error) {
    console.error("Could not load push subscriptions.", error);
    return { configured: true, subscriptions: 0, sent: 0 };
  }
  if (!subscriptions?.length) return { configured: true, subscriptions: 0, sent: 0 };

  const body = JSON.stringify(payload);
  let sent = 0;
  await Promise.all(
    subscriptions.map(async ({ endpoint, subscription }) => {
      try {
        // A check-in that can't be delivered within 30 minutes is no longer useful.
        await webpush.sendNotification(subscription, body, {
          TTL: payload.type === "test" ? 60 : 30 * 60,
          urgency: "high",
        });
        sent += 1;
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
        } else {
          console.error("Could not deliver a push notification.", err);
        }
      }
    })
  );
  return { configured: true, subscriptions: subscriptions.length, sent };
}

export function sendCheckinPush(supabase: SupabaseClient, checkin: Checkin) {
  const recommended = checkin.suggestion?.recommended ?? "move";
  return deliver(supabase, checkin.user_id, {
    type: "checkin",
    title: checkin.headline,
    body: checkin.message,
    tag: checkin.id,
    url: "/dashboard",
    checkinId: checkin.id,
    actions: [
      { action: "apply", title: ACTION_LABEL[recommended] },
      { action: "done", title: "Mark done" },
    ],
  });
}

export function sendReminderPush(supabase: SupabaseClient, task: Task, timeZone: string) {
  const length = durationMinutes(task);
  const when = task.start_time ? formatInZone(new Date(task.start_time), timeZone) : "";
  return deliver(supabase, task.user_id, {
    type: "reminder",
    title: `Starting now: ${task.title}`.slice(0, 90),
    body: [when, length ? formatDuration(length) : ""].filter(Boolean).join(" \u00b7 "),
    tag: `reminder-${task.id}`,
    url: "/dashboard",
  });
}

export function sendTestPush(supabase: SupabaseClient, userId: string) {
  return deliver(supabase, userId, {
    type: "test",
    title: "Notifications are working",
    body: "You'll get one calm nudge here when a task slips past its time.",
    tag: "tp-test",
    url: "/dashboard",
  });
}
