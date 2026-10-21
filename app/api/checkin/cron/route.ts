import { NextResponse } from "next/server";
import { evaluateCheckin, sendStartReminders } from "@/lib/checkinService";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Profile } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * The scheduled sweep that makes notifications work with the app closed.
 * Call it every 5 minutes with "Authorization: Bearer <CRON_SECRET>".
 * See README ("Scheduling") for the free Supabase pg_cron setup.
 */
async function run(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 500 });
  if (request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let db;
  try {
    db = createAdminClient();
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Setup failed" }, { status: 500 });
  }

  const { data: profiles, error } = await db.from("profiles").select("*").eq("notifications_enabled", true);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const now = new Date();
  let created = 0;
  let reminders = 0;
  let failed = 0;
  for (const row of profiles ?? []) {
    const profile = row as Profile;
    try {
      reminders += await sendStartReminders(db, profile, now);
      const result = await evaluateCheckin(db, profile, now);
      if (result.created) created += 1;
    } catch (err) {
      failed += 1;
      console.error(`Scheduled check for ${profile.id} failed.`, err);
    }
  }

  return NextResponse.json({ scanned: profiles?.length ?? 0, created, reminders, failed });
}

export const GET = run;
export const POST = run;
