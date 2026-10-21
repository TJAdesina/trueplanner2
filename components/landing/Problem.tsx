const STAGES = [
  { label: "8:00 AM", note: "A clear, realistic plan" },
  { label: "11:30 AM", note: "A meeting runs long" },
  { label: "1:30 PM", note: "Tasks start to pile up" },
  { label: "4:00 PM", note: "The plan no longer fits" },
];

export function Problem() {
  return (
    <section className="py-20 sm:py-28">
      <div className="content-wrap">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-serif text-3xl font-medium text-forest sm:text-4xl">
            The plan looked realistic this morning.
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-charcoal/70">
            Then a meeting ran long. A task took more time than expected.
            Something urgent appeared. By afternoon, the original schedule no
            longer made sense.
          </p>
        </div>

        <div className="mx-auto mt-14 max-w-3xl">
          <div className="relative grid grid-cols-4 gap-3">
            <div
              className="absolute left-0 right-0 top-[9px] h-px bg-charcoal/15"
              aria-hidden="true"
            />
            {STAGES.map((stage, i) => (
              <div key={stage.label} className="relative flex flex-col items-center text-center">
                <span
                  className={`relative z-10 h-[9px] w-[9px] rounded-full ${
                    i === STAGES.length - 1 ? "bg-peach" : "bg-forest/70"
                  }`}
                />
                <span className="mt-4 text-xs font-medium text-charcoal/45">
                  {stage.label}
                </span>
                <span className="mt-1 text-sm font-medium text-charcoal">
                  {stage.note}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
