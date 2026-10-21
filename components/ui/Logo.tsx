export function LogoMark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* A path that moves steadily, bends when it has to, and keeps going. */}
      <path
        d="M4 22C8 22 8 10 13 10C17 10 15 18 19 18C23 18 23 8 28 8"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="28" cy="8" r="2.4" fill="currentColor" />
    </svg>
  );
}

export function Logo({ className = "", dark = false }: { className?: string; dark?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark className={`h-6 w-6 ${dark ? "text-cream" : "text-forest"}`} />
      <span
        className={`font-serif text-lg leading-none ${dark ? "text-cream" : "text-forest"}`}
      >
        TruePlanner
      </span>
    </span>
  );
}
