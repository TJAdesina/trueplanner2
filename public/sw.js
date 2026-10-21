/* TruePlanner service worker: push notifications and installability. */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

// Some browsers only treat a site as installable when a fetch handler exists.
// This one deliberately does nothing, so every request goes straight to the network.
self.addEventListener("fetch", () => {});

const ICON = "/icons/icon-192.png";
const BADGE = "/icons/badge-96.png";

function parsePayload(event) {
  try {
    return event.data ? event.data.json() : {};
  } catch {
    return { body: event.data ? event.data.text() : "" };
  }
}

async function openApp(url) {
  const target = new URL(url || "/dashboard", self.location.origin).href;
  const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  const existing = windows.find((client) => client.url.startsWith(self.location.origin));
  if (existing) {
    try {
      await existing.navigate(target);
    } catch {
      // Navigation can fail for uncontrolled clients; focusing is still useful.
    }
    return existing.focus();
  }
  return self.clients.openWindow(target);
}

self.addEventListener("push", (event) => {
  const payload = parsePayload(event);

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });

      // If you're looking at the app right now, the in-app card is enough.
      if (payload.type === "checkin" && windows.some((c) => c.focused)) {
        windows.forEach((c) => c.postMessage({ type: "checkin-refresh" }));
        return;
      }

      const options = {
        body: payload.body || "You have a new suggestion.",
        tag: payload.tag || "trueplanner",
        icon: ICON,
        badge: BADGE,
        data: { url: payload.url || "/dashboard", type: payload.type, checkinId: payload.checkinId },
      };
      if (payload.type === "checkin" && Array.isArray(payload.actions)) {
        options.actions = payload.actions.slice(0, 2);
      }
      await self.registration.showNotification(payload.title || "TruePlanner", options);
      windows.forEach((c) => c.postMessage({ type: "checkin-refresh" }));
    })()
  );
});

async function answerFromNotification(data, action) {
  const answer = action === "done" ? "done" : "recommended";
  try {
    const res = await fetch("/api/checkin/act", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checkinId: data.checkinId, action: answer }),
    });
    if (!res.ok) throw new Error(`Request failed (${res.status})`);
    const result = await res.json();

    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    windows.forEach((c) => c.postMessage({ type: "tasks-refresh" }));

    // A short confirmation that tidies itself up.
    await self.registration.showNotification("Done", {
      body: result.message || "Your plan is updated.",
      tag: "tp-result",
      icon: ICON,
      badge: BADGE,
      silent: true,
    });
    await new Promise((resolve) => setTimeout(resolve, 4000));
    const shown = await self.registration.getNotifications({ tag: "tp-result" });
    shown.forEach((n) => n.close());
  } catch {
    // Couldn't apply it from here (signed out, offline): open the app so it can be done there.
    await openApp(data.url);
  }
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = event.notification.data || {};

  if (data.type === "checkin" && data.checkinId && (event.action === "apply" || event.action === "done")) {
    event.waitUntil(answerFromNotification(data, event.action));
    return;
  }
  event.waitUntil(openApp(data.url));
});
