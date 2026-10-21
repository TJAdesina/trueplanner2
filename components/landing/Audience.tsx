const CONTEXTS = [
  "Managing client work",
  "Studying for an exam",
  "Building a personal project",
  "Running a small business",
  "Handling a busy household",
  "Working through a large creative task",
];

export function Audience() {
  return (
    <section className="bg-surface py-20 sm:py-28">
      <div className="content-wrap">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-serif text-3xl font-medium text-forest sm:text-4xl">
            For workdays, study days, and everything in between.
          </h2>
        </div>

        <div className="mx-auto mt-12 flex max-w-3xl flex-wrap justify-center gap-3">
          {CONTEXTS.map((c) => (
            <span
              key={c}
              className="rounded-full border border-charcoal/12 bg-cream px-4 py-2 text-sm text-charcoal/75"
            >
              {c}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
