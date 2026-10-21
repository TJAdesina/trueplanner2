export function Demo() {
  return (
    <section className="bg-surface py-20 sm:py-28">
      <div className="content-wrap">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-serif text-3xl font-medium text-forest sm:text-4xl">
            A calmer response to an unfinished task.
          </h2>
        </div>

        <div className="mx-auto mt-14 max-w-3xl">
          <div className="card grid divide-y divide-charcoal/10 overflow-hidden sm:grid-cols-2 sm:divide-x sm:divide-y-0">
            <div className="p-7">
              <p className="eyebrow">Original plan</p>
              <p className="mt-3 font-serif text-lg text-forest">
                Prepare client presentation
              </p>
              <p className="mt-1 text-sm text-charcoal/55">1:00 PM &ndash; 3:00 PM</p>

              <div className="mt-6 rounded-card border border-peach/40 bg-peach/10 p-4">
                <p className="text-sm font-medium text-charcoal">
                  3:07 PM &middot; still incomplete
                </p>
              </div>
            </div>

            <div className="bg-forest p-7 text-cream">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cream/60">
                Suggestion
              </p>
              <p className="mt-3 font-serif text-lg">Try a smaller version.</p>
              <p className="mt-2 text-sm leading-relaxed text-cream/75">
                &ldquo;Prepare client presentation&rdquo; is over an hour past
                its time, and the day is getting full. A smaller piece may fit.
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-green px-4 py-1.5 text-xs font-medium text-forest">
                  Shrink it
                </span>
                <span className="rounded-full border border-cream/25 px-3 py-1.5 text-xs">
                  Other options
                </span>
              </div>

              <div className="mt-6 rounded-card bg-cream/10 p-4">
                <p className="text-xs uppercase tracking-wide text-cream/50">
                  Updated plan
                </p>
                <p className="mt-2 text-sm font-medium">
                  Prepare the first five slides
                </p>
                <p className="text-xs text-cream/60">3:20 PM &ndash; 3:50 PM</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
