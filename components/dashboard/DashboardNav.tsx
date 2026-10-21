"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Settings } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { createClient } from "@/lib/supabase/client";
import { disableThisDevice } from "@/lib/pushClient";

export function DashboardNav() {
  const router = useRouter();

  async function signOut() {
    // Stop this device receiving this account's nudges once you've left.
    await disableThisDevice();
    await createClient().auth.signOut();
    router.push("/");
    router.refresh();
  }

  const button =
    "flex h-9 w-9 items-center justify-center rounded-full text-charcoal/55 transition-colors hover:bg-charcoal/5 hover:text-charcoal";

  return (
    <header className="border-b border-charcoal/10 bg-surface" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <div className="mx-auto flex h-14 w-full max-w-2xl items-center justify-between px-4 sm:px-6">
        <Link href="/dashboard" aria-label="TruePlanner home">
          <Logo />
        </Link>
        <div className="flex items-center gap-0.5">
          <Link href="/dashboard/settings" className={button} aria-label="Settings">
            <Settings className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </Link>
          <button onClick={signOut} className={button} aria-label="Sign out">
            <LogOut className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </header>
  );
}
