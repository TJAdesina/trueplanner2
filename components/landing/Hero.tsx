import Link from "next/link";
import { HeroMockup } from "./HeroMockup";

export function Hero() {
  return (
    <section className="relative overflow-hidden pb-16 pt-14 sm:pt-20">
      <div className="content-wrap grid items-center gap-12 lg:grid-cols-[1.05fr_1fr]">
        <div className="animate-fadeIn">
          <p className="eyebrow">Productivity, for real life</p>
          <h1 className="mt-4 font-serif text-[2.6rem] font-medium leading-[1.08] text-forest sm:text-6xl">
            Keep the day moving.
          </h1>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-charcoal/75">
            A simple to-do list that notices when a task slips and suggests a
            useful next step. Shrink it, move it, or let it go.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link href="/signup" className="btn-primary px-6 py-3 text-base">
              Start planning
            </Link>
            <a href="#how-it-works" className="btn-secondary px-6 py-3 text-base">
              See how it works
            </a>
          </div>

          <p className="mt-6 text-sm text-charcoal/50">
            Built for real schedules, changing priorities, and imperfect days.
          </p>
        </div>

        <div className="flex justify-center lg:justify-end">
          <HeroMockup />
        </div>
      </div>
    </section>
  );
}
