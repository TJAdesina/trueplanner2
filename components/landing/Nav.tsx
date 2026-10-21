"use client";

import Link from "next/link";
import { Monitor, Moon, Sun } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { useProfileState } from "@/hooks/useProfile";
import type { Profile } from "@/lib/types";
import { useEffect, useState } from "react";

type Theme = Profile["theme"];

const LINKS = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#about", label: "About" },
];

export function Nav() {
  const { profile, updateProfile } = useProfileState({ applyTheme: false });
  const [guestTheme, setGuestTheme] = useState<Theme>("light");
  const theme = profile?.theme ?? guestTheme;

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("trueplanner-theme");
    if (savedTheme === "light" || savedTheme === "dark" || savedTheme === "system") {
      setGuestTheme(savedTheme);
    }
  }, []);

  useEffect(() => {
    if (!profile) return;
    setGuestTheme(profile.theme);
    window.localStorage.setItem("trueplanner-theme", profile.theme);
  }, [profile?.theme]);

  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const applyTheme = () => {
      root.classList.toggle(
        "dark",
        theme === "dark" || (theme === "system" && media.matches)
      );
    };

    applyTheme();
    if (theme !== "system") return;
    media.addEventListener("change", applyTheme);
    return () => media.removeEventListener("change", applyTheme);
  }, [theme]);

  async function cycleTheme() {
    const nextTheme: Theme =
      theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
    setGuestTheme(nextTheme);
    window.localStorage.setItem("trueplanner-theme", nextTheme);
    if (profile) await updateProfile({ theme: nextTheme });
  }

  const ThemeIcon = theme === "dark" ? Moon : theme === "system" ? Monitor : Sun;

  return (
    <header className="sticky top-0 z-40 border-b border-charcoal/10 bg-cream/90 backdrop-blur">
      <nav className="content-wrap flex h-16 items-center justify-between">
        <Link href="/" aria-label="TruePlanner home">
          <Logo />
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-charcoal/75 transition-colors hover:text-charcoal"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={cycleTheme}
            title={`Theme: ${theme}. Click to change.`}
            aria-label={`Theme is ${theme}. Click to change theme.`}
            className="flex h-10 w-10 items-center justify-center rounded-full text-charcoal/75 transition-colors hover:bg-charcoal/10 hover:text-charcoal"
          >
            <ThemeIcon className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </button>
          <Link
            href="/login"
            className="hidden text-sm font-medium text-charcoal/75 hover:text-charcoal sm:inline-block"
          >
            Sign in
          </Link>
          <Link href="/signup" className="btn-primary">
            Start planning
          </Link>
        </div>
      </nav>
    </header>
  );
}
