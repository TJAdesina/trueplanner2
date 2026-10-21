function RemoveVisual() {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 rounded-lg border border-charcoal/10 bg-cream px-3 py-2 text-[13px] text-charcoal/70">
        <span className="h-1.5 w-1.5 rounded-full bg-charcoal/25" /> Update
        design doc
      </div>
      <div className="flex items-center gap-2 rounded-lg border border-dashed border-charcoal/15 bg-transparent px-3 py-2 text-[13px] text-charcoal/30 line-through">
        <span className="h-1.5 w-1.5 rounded-full bg-charcoal/15" /> Reorganize
        old files
      </div>
      <div className="flex items-center gap-2 rounded-lg border border-charcoal/10 bg-cream px-3 py-2 text-[13px] text-charcoal/70">
        <span className="h-1.5 w-1.5 rounded-full bg-charcoal/25" /> Send
        invoice
      </div>
    </div>
  );
}

function ShrinkVisual() {
  return (
    <div className="space-y-2">
      <div className="rounded-lg border border-charcoal/10 bg-cream px-3 py-2 text-[13px] text-charcoal/40 line-through">
        Write ten pages
      </div>
      <div className="flex items-center gap-2 rounded-lg border border-green/30 bg-green/10 px-3 py-2 text-[13px] font-medium text-forest">
        <span className="h-1.5 w-1.5 rounded-full bg-green" /> Write the
        introduction
      </div>
    </div>
  );
}

function MoveVisual() {
  return (
    <div className="flex items-center gap-3 text-[13px]">
      <div className="flex-1 rounded-lg border border-charcoal/10 bg-cream px-3 py-2 text-charcoal/60">
        Today, 3:00 PM
      </div>
      <span className="text-charcoal/30">&rarr;</span>
      <div className="flex-1 rounded-lg border border-forest/25 bg-forest/5 px-3 py-2 font-medium text-forest">
        Tomorrow, 9:00 AM
      </div>
    </div>
  );
}

const ACTIONS = [
  {
    title: "Shrink it",
    body: "Turn an overwhelming task into a meaningful smaller outcome.",
    Visual: ShrinkVisual,
  },
  {
    title: "Move it",
    body: "Reschedule intentionally instead of carrying silent guilt.",
    Visual: MoveVisual,
  },
  {
    title: "Remove it",
    body: "Take off what no longer belongs on your list. Undo is always one tap away.",
    Visual: RemoveVisual,
  },
];

export function CoreActions() {
  return (
    <section className="py-20 sm:py-28">
      <div className="content-wrap">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="font-serif text-3xl font-medium text-forest sm:text-4xl">
            Three ways to keep moving.
          </h2>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {ACTIONS.map(({ title, body, Visual }) => (
            <div key={title} className="card flex flex-col gap-5 p-7">
              <div>
                <h3 className="font-serif text-2xl text-forest">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-charcoal/65">
                  {body}
                </p>
              </div>
              <div className="mt-auto rounded-card bg-cream/70 p-4">
                <Visual />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
