import {
  Eye,
  MessageSquareText,
  SlidersHorizontal,
  CheckCircle2,
  BellOff,
  UserCheck,
} from "lucide-react";

const FEATURES = [
  {
    icon: Eye,
    title: "Daily clarity",
    body: "Today\u2019s list, front and centre. Add a task in one line. Times, tags and details are there only if you want them.",
  },
  {
    icon: MessageSquareText,
    title: "Smart suggestions",
    body: "When a task with a time runs over, you get one suggestion that fits how much of the day is left.",
  },
  {
    icon: SlidersHorizontal,
    title: "Flexible recovery",
    body: "Shrink, move, or remove a task in one tap, without rebuilding your day. Every change can be undone.",
  },
  {
    icon: CheckCircle2,
    title: "An honest look back",
    body: "At the end of your day, choose whether to see what you finished, shrank, and moved.",
  },
  {
    icon: BellOff,
    title: "Quiet by default",
    body: "One suggestion per slipped task, never a stream of reminders. You choose the gap between them.",
  },
  {
    icon: UserCheck,
    title: "Simple control",
    body: "The app suggests a next step. You decide what happens.",
  },
];

export function Features() {
  return (
    <section id="features" className="py-20 sm:py-28">
      <div className="content-wrap">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="font-serif text-3xl font-medium text-forest sm:text-4xl">
            Built around what actually helps.
          </h2>
        </div>

        <div className="mt-14 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="flex gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-forest/8 text-forest">
                <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
              </div>
              <div>
                <h3 className="font-medium text-charcoal">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-charcoal/65">
                  {body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
