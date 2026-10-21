const STEPS = [
  {
    n: "01",
    title: "Add",
    body: "Write down what you need to do. Give a task a time if you want a nudge when it slips.",
  },
  {
    n: "02",
    title: "Notice",
    body: "If a task runs past its time, TruePlanner notices. Only then does it speak up.",
  },
  {
    n: "03",
    title: "Adjust",
    body: "Get one suggestion: shrink it, move it, or remove it. One tap applies it.",
  },
  {
    n: "04",
    title: "Continue",
    body: "Keep going with a plan that fits the time you have left.",
  },
];

export function Solution() {
  return (
    <section id="how-it-works" className="bg-surface py-20 sm:py-28">
      <div className="content-wrap">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-serif text-3xl font-medium text-forest sm:text-4xl">
            When the plan breaks, make a better next move.
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-charcoal/70">
            TruePlanner works like a simple to-do list. The difference is what
            happens when a task slips.
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step) => (
            <div key={step.n} className="rounded-card border border-charcoal/10 p-6">
              <span className="font-serif text-2xl text-charcoal/25">{step.n}</span>
              <h3 className="mt-3 font-serif text-xl text-forest">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-charcoal/65">{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
