const SUMMARY = [
  { count: 4, label: "completed" },
  { count: 1, label: "shrunk" },
  { count: 2, label: "moved" },
];

export function EndOfDaySection() {
  return (
    <section className="bg-surface py-20 sm:py-28">
      <div className="content-wrap grid items-center gap-12 lg:grid-cols-2">
        <div>
          <h2 className="font-serif text-3xl font-medium text-forest sm:text-4xl">
            An honest look back, when you want it.
          </h2>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-charcoal/70">
            At the end of your day, TruePlanner asks if you&rsquo;d like a quick
            review. See what you finished, shrank, and moved, and carry what&rsquo;s
            left into tomorrow. Say &ldquo;not now&rdquo; and it stays out of
            your way.
          </p>
        </div>

        <div className="card p-7">
          <p className="eyebrow">How today went</p>
          <div className="mt-5 grid grid-cols-3 gap-3">
            {SUMMARY.map((s) => (
              <div key={s.label} className="rounded-card bg-cream/70 p-4">
                <p className="font-serif text-3xl text-forest">{s.count}</p>
                <p className="mt-1 text-sm text-charcoal/60">{s.label}</p>
              </div>
            ))}
          </div>
          <p className="mt-5 text-sm leading-relaxed text-charcoal/60">
            You finished 4 tasks, shrank 1, and moved 2 to another day. One tap
            carries anything unfinished into tomorrow.
          </p>
        </div>
      </div>
    </section>
  );
}
