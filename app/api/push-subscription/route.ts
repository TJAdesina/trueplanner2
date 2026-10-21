import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type PushSubscriptionPayload = {
  endpoint?: string;
  keys?: { p256dh?: string; auth?: string };
};

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({
      publicKey: process.env.VAPID_PUBLIC_KEY ?? null,
      configured: Boolean(process.env.VAPID_PUBLIC_KEY),
      subscribed: false,
      storageReady: true,
    });
  }

  const { count, error } = await supabase
    .from("push_subscriptions")
    .select("endpoint", { count: "exact", head: true })
    .eq("user_id", user.id);

  return NextResponse.json({
    publicKey: process.env.VAPID_PUBLIC_KEY ?? null,
    configured: Boolean(process.env.VAPID_PUBLIC_KEY),
    subscribed: !error && (count ?? 0) > 0,
    storageReady: !error,
  });
}

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const subscription: PushSubscriptionPayload = await request.json();
  if (
    !subscription.endpoint ||
    !subscription.keys?.p256dh ||
    !subscription.keys.auth ||
    !subscription.endpoint.startsWith("https://")
  ) {
    return NextResponse.json({ error: "Invalid push subscription" }, { status: 400 });
  }

  const row = { user_id: user.id, endpoint: subscription.endpoint, subscription };
  let { error } = await supabase.from("push_subscriptions").upsert(row, { onConflict: "endpoint" });

  // The same browser may previously have been signed in as someone else. Row-level
  // security blocks taking that row over, so hand it to this user with the server key.
  if (error) {
    try {
      const admin = createAdminClient();
      ({ error } = await admin.from("push_subscriptions").upsert(row, { onConflict: "endpoint" }));
    } catch {
      // No service key configured: report the original error below.
    }
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { endpoint } = await request.json();
  if (typeof endpoint !== "string") {
    return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });
  }

  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", user.id)
    .eq("endpoint", endpoint);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}