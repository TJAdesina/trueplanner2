export function HeroMockup() {
  return (
    <div className="card relative w-full max-w-[420px] p-0 shadow-soft">
      <div className="flex items-center justify-between border-b border-charcoal/10 bg-cream/60 px-4 py-3 rounded-t-card">
        <span className="font-serif text-[15px] text-forest">Today</span>
        <span className="text-xs text-charcoal/50">Tuesday, October 20</span>
      </div>

      <div className="space-y-3 p-4">
        <ul className="divide-y divide-charcoal/[0.07] rounded-lg border border-charcoal/10 bg-surface">
          <Row title="Write chapter one" time="9:00–10:00 AM" state="done" />
          <Row title="Respond to client emails" time="11:30 AM–12:00 PM" state="done" />
          <Row title="Prepare client presentation" time="1:00–2:00 PM" state="over" />
        </ul>

        <div className="rounded-card border border-charcoal/10 bg-surface p-3.5 shadow-soft">
          <p className="font-serif text-[15px] leading-snug text-forest">Try a smaller version.</p>
          <p className="mt-1 text-[13px] leading-relaxed text-charcoal/70">
            &ldquo;Prepare client presentation&rdquo; is past its time. A smaller piece may fit.
          </p>
          <p className="mt-2.5 rounded-md bg-charcoal/[0.04] px-2.5 py-1.5 text-[12px] text-charcoal/60">
            <span className="font-medium text-charcoal">&ldquo;Prepare the first five slides&rdquo;</span> 2:20&ndash;2:50 PM
          </p>
          <div className="mt-3 flex items-center gap-2">
            <span className="rounded-full bg-forest px-3.5 py-1.5 text-[12px] font-medium text-cream">Shrink it</span>
            <span className="rounded-full bg-charcoal/[0.05] px-3 py-1.5 text-[12px] font-medium text-charcoal/70">
              Other options
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ title, time, state }: { title: string; time: string; state: "done" | "over" }) {
  const done = state === "done";
  return (
    <li className="flex items-start gap-3 px-3 py-2.5">
      <span
        className={`mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 ${
          done ? "border-green bg-green" : "border-charcoal/25"
        }`}
        aria-hidden="true"
      >
        {done && (
          <svg viewBox="0 0 12 12" className="h-2.5 w-2.5 text-white" fill="none" stroke="currentColor" strokeWidth="2.4">
            <path d="M2.5 6.2l2.2 2.2 4.8-4.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block text-[13px] ${done ? "text-charcoal/40 line-through" : "font-medium text-charcoal"}`}>
          {title}
        </span>
        <span className={`mt-0.5 block text-[11px] ${done ? "text-charcoal/35" : "text-[#B3702F]"}`}>
          {time}
          {!done && " \u00b7 ran over"}
        </span>
      </span>
    </li>
  );
}
