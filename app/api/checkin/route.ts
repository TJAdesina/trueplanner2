import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { evaluateCheckin, sendStartReminders } from "@/lib/checkinService";
import type { Profile } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Called by the open dashboard every 30 seconds. Returns the check-in the
 * person should currently see (new or still open), or null.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: profile, error } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (error || !profile) {
    return NextResponse.json({ error: "Could not load your settings" }, { status: 500 });
  }

  const now = new Date();
  await sendStartReminders(supabase, profile as Profile, now);
  const result = await evaluateCheckin(supabase, profile as Profile, now);
  return NextResponse.json({ checkin: result.checkin });
}
