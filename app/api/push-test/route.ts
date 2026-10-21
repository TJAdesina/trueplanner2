import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendTestPush } from "@/lib/push";

export const dynamic = "force-dynamic";

export async function POST() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const result = await sendTestPush(supabase, user.id);
  if (!result.configured) {
    return NextResponse.json({ error: "Push isn't set up on the server yet (missing VAPID keys)." }, { status: 500 });
  }
  if (result.subscriptions === 0) {
    return NextResponse.json({ error: "No device is registered yet. Turn notifications on first." }, { status: 400 });
  }
  if (result.sent === 0) {
    return NextResponse.json({ error: "The notification couldn't be delivered. Try turning notifications off and on." }, { status: 502 });
  }
  return NextResponse.json({ ok: true, sent: result.sent });
}
