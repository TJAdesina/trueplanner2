import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { FEEDBACK_LIMITS, sanitizeContext, validateFeedback } from "@/lib/feedback";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
  }

  const validation = validateFeedback(payload);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const value = validation.value;
  const { count, error: rateError } = await supabase
    .from("feedback")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", new Date(Date.now() - 60 * 60_000).toISOString());

  if (rateError) {
    console.error("Could not count feedback submissions.", rateError);
    return NextResponse.json({ error: "Could not count recent feedback." }, { status: 500 });
  }
  if ((count ?? 0) >= FEEDBACK_LIMITS.perHour) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const screenshotPathValue = typeof value.screenshotPath === "string" ? value.screenshotPath.trim() : "";
  const validScreenshot =
    screenshotPathValue &&
    screenshotPathValue.startsWith(`${user.id}/`) &&
    !screenshotPathValue.includes("..") &&
    screenshotPathValue.length <= 200;

  const sanitizedContext = sanitizeContext((payload as { context?: unknown })?.context ?? {});

  const row = {
    user_id: user.id,
    kind: value.kind,
    message: String(value.message),
    rating: value.rating === null || value.rating === undefined ? null : Number(value.rating),
    contact_ok: Boolean(value.contactOk),
    email: Boolean(value.contactOk) ? user.email ?? null : null,
    screenshot_path: validScreenshot ? screenshotPathValue : null,
    context: sanitizedContext,
    status: "new",
  };

  const { error: insertError } = await supabase.from("feedback").insert(row);
  if (insertError) {
    console.error("Could not insert feedback.", insertError);
    return NextResponse.json({ error: "Could not save feedback." }, { status: 500 });
  }

  if (process.env.FEEDBACK_WEBHOOK_URL) {
    const appVersion = process.env.NEXT_PUBLIC_APP_VERSION ?? "dev";
    const messageText = String(value.message).replace(/\s+/g, " ").trim();
    const snippet = messageText.length > 300 ? `${messageText.slice(0, 300).trim()}…` : messageText;
    const payloadText = `New feedback (${value.kind}, ${value.rating ? `${value.rating}/5` : "no rating"}): “${snippet}” · /dashboard · ${appVersion}`;
    const webhookBody = JSON.stringify({ text: payloadText, content: payloadText });

    try {
      await fetch(process.env.FEEDBACK_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: webhookBody,
        signal: AbortSignal.timeout(3000),
      });
    } catch {
      // Never let a webhook issue change the user-facing response.
    }
  }

  return NextResponse.json({ ok: true });
}
