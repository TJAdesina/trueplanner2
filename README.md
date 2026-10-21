# TruePlanner

**Keep the day moving.**

A simple to-do list with one extra trick: when a task slips past its time,
TruePlanner notices and suggests a useful next step. Shrink it, move it, or
remove it, in one tap, without adding pressure.

---

## 1. What it is

**The list.** Add a task in one line. Everything else is optional.

- Quick-add box with a clock icon (day, start time, length, reminder) and a
  chevron (priority, tags, repeat, details). Press **Shift + Enter** to add details.
- It understands what you type: `Call Ada at 3pm for 30m #work tomorrow`
  fills in the time, length, tag and day.
- Times are optional. A task with no time is just a task.
- Colour-coded **tags**, priorities, repeating tasks, a checklist inside a
  task, search across every day, day-by-day navigation, and undo for
  completing, moving, shrinking and deleting.
- A task happening right now gets a soft green accent and a "Now · 25 min left" label.
- Unfinished tasks from earlier days are offered back to you ("Move to today").

**The suggestion.** When a task *with a time* runs past it, you get **one**
calm suggestion: a pop-up in the app and, if you've allowed them, a
notification. It leads with a single recommendation (shrink, move, or remove)
and tucks the alternatives under **Other options**.

**The review.** After your day-end time, the app offers (once, and only if you
had tasks) a short look at what you finished, shrank and moved, with a
one-tap "Move unfinished to tomorrow". You can always say "Not now".

## 2. Tech stack

- **Next.js 14** (App Router), **TypeScript**, **Tailwind CSS**
- **Supabase**: Postgres + email/password auth
- **Web Push** (VAPID) with a service worker, installable as a PWA
- **Gemini** (optional) for the wording of suggestions, with a built-in writer as fallback

---

## 3. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor → New query** and run **one** of these:
   - **New project:** paste all of [`supabase/schema.sql`](./supabase/schema.sql).
   - **Already running an older TruePlanner:** paste all of
     [`supabase/migration_v2.sql`](./supabase/migration_v2.sql). It keeps your
     data: times become optional, old categories become tags, and the old
     Start/Pause states become plain to-do.
3. In your project's dashboard, select **Connect** (at the top of the page). Copy the **Project URL** and **Publishable key** (starts with `sb_publishable_...`). See Supabase's [API keys guide](https://supabase.com/docs/guides/getting-started/api-keys) if the dialog looks different.
4. For the server-only key, open **Project Settings** (gear icon in the sidebar) → **API Keys**. In **Secret keys**, create or copy a secret key (starts with `sb_secret_...`). Put it in `SUPABASE_SERVICE_ROLE_KEY`; this app uses it only on the server for the scheduled sweep. The older `service_role` key also works if that is what your project shows.
5. Keep the secret key private: never put it in a `NEXT_PUBLIC_` variable or expose it in browser code.
6. While testing locally you can turn off **Authentication → Providers → Email → Confirm email**. Keep it on in production.

## 4. Environment variables

```bash
cp .env.example .env.local
```

| Variable | Needed for |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Everything |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or the older `..._ANON_KEY`) | Everything |
| `SUPABASE_SERVICE_ROLE_KEY` | The scheduled sweep (server only) |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Notifications |
| `CRON_SECRET` | Protects the scheduled endpoint |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | Optional AI wording |

Generate the VAPID pair with `npx web-push generate-vapid-keys`. Never prefix
the private key, service role key or cron secret with `NEXT_PUBLIC_`.

## 5. Scheduling (this is what makes notifications work with the app closed)

The server must check for slipped tasks every 5 minutes by calling
`GET /api/checkin/cron` with `Authorization: Bearer <CRON_SECRET>`.

**Vercel's free (Hobby) plan only allows cron jobs that run once a day**, so
`vercel.json` is intentionally empty. Pick one of these instead:

1. **Supabase `pg_cron` (free, recommended).** Edit and run
   [`supabase/cron_setup.sql`](./supabase/cron_setup.sql). It includes queries to confirm it's working.
2. **A free external scheduler** such as cron-job.org: request
   `https://YOUR-DOMAIN/api/checkin/cron` every 5 minutes with the header
   `Authorization: Bearer <CRON_SECRET>`.
3. **Vercel Pro**: add a `crons` entry (`*/5 * * * *`) to `vercel.json`.

While someone has the app open it also checks every 30 seconds, so the in-app
pop-up is quicker than the 5-minute sweep. A notification arrives up to about
5 minutes after a task's time window ends.

## 6. Notifications, in detail

- **Permission.** On any device where notifications aren't decided yet, the
  dashboard shows a friendly prompt; tapping **Turn on** triggers the real
  browser prompt (browsers, Safari especially, only allow that after a click).
  If permission is already granted but the device isn't registered, it
  registers silently. If it's blocked, Settings explains how to unblock it.
- **Per device.** Each browser or phone registers itself. Signing out removes
  that device from the account.
- **Buttons on the notification.** Where the browser supports them (Chrome,
  Edge, Android), the notification offers the recommended action and
  **Mark done** without opening the app. Browsers limit this to two buttons.
  Safari and iPhone show a plain notification that opens the app.
- **If you're looking at the app**, you see the pop-up instead of a system
  notification.
- **iPhone / iPad:** web push only works once the app is added to the Home
  Screen (Share, then Add to Home Screen). The app shows a banner explaining this.
- **Android:** works in Chrome directly; installing the app is recommended for reliability.
- **Test it:** Settings → Suggestions → *Send a test notification*.

Delivery also depends on the phone or browser (battery savers, focus modes,
notifications blocked at the OS level), which no web app can override.

### Rules that keep it quiet

- One suggestion per slipped task, ever (unless you snooze it).
- One suggestion at a time; if several tasks slip together, one notification covers them all.
- A minimum gap between suggestions that **you** set in Settings (default 30 minutes).
- At most 4 a day, never during your quiet hours.
- Ignoring a suggestion counts as dismissing it.
- Tasks created after their time has already passed are never flagged.

## 7. Run it locally

Requires Node.js 18.18 or newer.

```bash
npm install
npm run dev
```

Visit `http://localhost:3000`. To exercise the sweep locally:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/checkin/cron
```

## 8. Deploy

Push to GitHub, import the repo on [Vercel](https://vercel.com/new) (or Netlify),
and add the environment variables from section 4. Then:

1. In Supabase → **Authentication → URL Configuration**, add your live domain to **Site URL** and **Redirect URLs**.
2. Set up the schedule from section 5.
3. Open the deployed app, turn notifications on, and use the **test notification** button.

---

## 9. How the suggestion system works

The split is deliberate: **the system decides when; the writer decides how.**

- `lib/triggers.ts`: deterministic. One trigger only: a timed task is past its end time (plus a 2-minute grace) and still open. No language, no AI.
- `lib/suggestions.ts`: deterministic. Picks the recommended move and works out the concrete new times. A task already moved twice leans toward *shrink* (or *remove* if low priority). If there's room later today it recommends *move*; otherwise a long task leans toward *shrink*.
- `lib/checkinWriter.ts`: words it. Uses Gemini if configured, otherwise the built-in writer. Gemini output is rejected if it doesn't name the task.
- `lib/checkinService.ts`: ties it together and enforces the quiet rules above. Used by the open dashboard and the scheduled sweep, with an atomic database function (`create_checkin_v2`) so they can never double up.
- `lib/taskOps.ts`: every change to a task (complete, shrink, move, delete, undo) lives here, so a tap in the app and a button on a notification behave identically.

## 10. Project structure

```
app/
  page.tsx                    Landing page
  login/, signup/             Auth
  dashboard/page.tsx          The list
  dashboard/settings/         Settings
  api/checkin/                Evaluate / act on / sweep check-ins
  api/push-subscription/      Register and remove devices
  api/push-test/              Send a test notification
  manifest.ts                 PWA manifest
components/
  dashboard/                  QuickAdd, TaskRow, TaskList, TaskEditor, SuggestionCard, EndOfDay, ...
  landing/, auth/, ui/
hooks/                        useTasks, useTags, useCheckins, useProfile, useInstall, useNow
lib/                          triggers, suggestions, checkinWriter, checkinService, taskOps, time, ...
public/sw.js                  Service worker (push + notification buttons)
supabase/
  schema.sql                  Full schema (new projects)
  migration_v2.sql            Upgrade for existing projects
  cron_setup.sql              Free 5-minute schedule via pg_cron
```

## 11. Known limits of this MVP

- No offline mode; the app needs a connection.
- Repeating tasks keep the same clock time across daylight-saving changes only approximately.
- Moving an overdue task from an earlier day to today makes it an "anytime" task rather than a timed one, so it doesn't instantly count as slipped.
- Multi-device sync happens on refresh or when you return to the tab, not live.
