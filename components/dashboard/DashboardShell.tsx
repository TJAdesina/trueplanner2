"use client";

import { ProfileProvider } from "@/hooks/useProfile";
import { InstallProvider } from "@/hooks/useInstall";
import { ToastProvider } from "@/components/ui/Toast";
import { NotificationGate } from "./NotificationGate";
import { InstallBanner } from "./InstallBanner";
import { DashboardNav } from "./DashboardNav";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <ProfileProvider>
      <InstallProvider>
        <ToastProvider>
          <div className="min-h-screen bg-cream">
            <DashboardNav />
            <InstallBanner />
            <main className="mx-auto w-full max-w-2xl px-4 pb-28 pt-6 sm:px-6 sm:pt-10">{children}</main>
            <NotificationGate />
          </div>
        </ToastProvider>
      </InstallProvider>
    </ProfileProvider>
  );
}
