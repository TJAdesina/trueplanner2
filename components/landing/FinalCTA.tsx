import Link from "next/link";

export function FinalCTA() {
  return (
    <section className="bg-forest py-20 text-cream sm:py-28">
      <div className="content-wrap text-center">
        <h2 className="mx-auto max-w-xl font-serif text-3xl font-medium leading-tight sm:text-4xl">
          Make progress, even when the plan changes.
        </h2>
        <p className="mx-auto mt-5 max-w-md text-lg leading-relaxed text-cream/75">
          Start with today&rsquo;s tasks. When reality gets in the way,
          you&rsquo;ll have a clearer way forward.
        </p>

        <div className="mt-9">
          <Link
            href="/signup"
            className="btn bg-cream px-7 py-3 text-base font-medium text-forest hover:bg-surface"
          >
            Start planning
          </Link>
        </div>

        <p className="mt-4 text-sm text-cream/50">No perfect schedule required.</p>
      </div>
    </section>
  );
}
