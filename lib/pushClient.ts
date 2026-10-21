/**
 * Browser-side push helpers. Only call these from client components.
 */

export type PermissionState = NotificationPermission | "unsupported";

export function permissionState(): PermissionState {
  if (
    typeof window === "undefined" ||
    !("Notification" in window) ||
    !("serviceWorker" in navigator) ||
    !("PushManager" in window)
  ) {
    return "unsupported";
  }
  return Notification.permission;
}

export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const iPadOS = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return /iPhone|iPad|iPod/.test(ua) || iPadOS;
}

export function isAndroid(): boolean {
  return typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent);
}

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function keyToBytes(key: string): Uint8Array {
  const padded = key + "=".repeat((4 - (key.length % 4)) % 4);
  const raw = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

function bytesToKey(buffer: ArrayBuffer | null): string | null {
  if (!buffer) return null;
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function getPublicKey(): Promise<string> {
  const res = await fetch("/api/push-subscription");
  if (!res.ok) throw new Error("Could not load the notification settings.");
  const { publicKey } = await res.json();
  if (!publicKey) throw new Error("Notifications aren't set up on the server yet (missing VAPID key).");
  return publicKey as string;
}

export type SubscribeStatus = "subscribed" | "unsupported" | "no-permission" | "error";

/**
 * Makes sure THIS device has a live push subscription saved on the server.
 * Safe to call on every page load: it does nothing if everything is already in place.
 */
export async function ensureSubscription(): Promise<SubscribeStatus> {
  const permission = permissionState();
  if (permission === "unsupported") return "unsupported";
  if (permission !== "granted") return "no-permission";

  try {
    await navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" });
    const registration = await navigator.serviceWorker.ready;
    const publicKey = await getPublicKey();

    let subscription = await registration.pushManager.getSubscription();
    // If the server's key changed, the old subscription can never receive a push.
    if (subscription && bytesToKey(subscription.options.applicationServerKey) !== publicKey) {
      await subscription.unsubscribe();
      subscription = null;
    }
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: keyToBytes(publicKey) as BufferSource,
      });
    }

    const res = await fetch("/api/push-subscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(subscription.toJSON()),
    });
    return res.ok ? "subscribed" : "error";
  } catch (error) {
    console.error("Could not set up push notifications on this device.", error);
    return "error";
  }
}

/** Asks the browser for permission (must be called from a click), then subscribes. */
export async function enableNotifications(): Promise<{ permission: PermissionState; error?: string }> {
  const current = permissionState();
  if (current === "unsupported") return { permission: current };
  try {
    const permission = current === "granted" ? "granted" : await Notification.requestPermission();
    if (permission !== "granted") return { permission };
    const status = await ensureSubscription();
    if (status !== "subscribed") {
      return { permission, error: "Permission was granted, but this device couldn't be registered. Try again." };
    }
    return { permission };
  } catch (error) {
    return { permission: permissionState(), error: error instanceof Error ? error.message : "Something went wrong." };
  }
}

export async function hasLocalSubscription(): Promise<boolean> {
  if (permissionState() === "unsupported") return false;
  try {
    const registration = await navigator.serviceWorker.getRegistration("/sw.js");
    return Boolean(await registration?.pushManager.getSubscription());
  } catch {
    return false;
  }
}

/** Removes this device from the account (used on sign-out). */
export async function disableThisDevice(): Promise<void> {
  try {
    const registration = await navigator.serviceWorker?.getRegistration("/sw.js");
    const subscription = await registration?.pushManager.getSubscription();
    if (!subscription) return;
    await fetch("/api/push-subscription", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    });
    await subscription.unsubscribe();
  } catch {
    // Signing out should never fail because of this.
  }
}

export async function sendTestNotification(): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch("/api/push-test", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    return res.ok ? { ok: true } : { ok: false, error: data.error ?? "The test notification failed." };
  } catch {
    return { ok: false, error: "Couldn't reach the server." };
  }
}
