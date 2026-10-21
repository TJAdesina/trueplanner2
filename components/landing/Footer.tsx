import Link from "next/link";
import { Logo } from "@/components/ui/Logo";

export function Footer() {
  return (
    <footer className="border-t border-charcoal/10 bg-cream">
      <div className="content-wrap flex flex-col gap-8 py-12 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-sm text-charcoal/55">
            Plan with clarity. Keep the day moving.
          </p>
        </div>

        <div className="flex flex-wrap gap-x-10 gap-y-4 text-sm">
          <div className="flex flex-col gap-2 text-charcoal/65">
            <span className="text-xs font-semibold uppercase tracking-wide text-charcoal/35">
              Product
            </span>
            <a href="#how-it-works" className="hover:text-charcoal">How it works</a>
            <a href="#features" className="hover:text-charcoal">Features</a>
            <Link href="/login" className="hover:text-charcoal">Sign in</Link>
          </div>
          <div className="flex flex-col gap-2 text-charcoal/65">
            <span className="text-xs font-semibold uppercase tracking-wide text-charcoal/35">
              Company
            </span>
            <a href="#about" className="hover:text-charcoal">About</a>
            <span className="cursor-default text-charcoal/45">Privacy</span>
            <span className="cursor-default text-charcoal/45">Terms</span>
            <span className="cursor-default text-charcoal/45">Contact</span>
          </div>
        </div>
      </div>

      <div className="border-t border-charcoal/10">
        <div className="content-wrap flex flex-col gap-2 py-5 text-xs text-charcoal/45 sm:flex-row sm:justify-between">
          <span>&copy; {new Date().getFullYear()} TruePlanner. All rights reserved.</span>
          <span>Keep the day moving.</span>
        </div>
      </div>
    </footer>
  );
}
