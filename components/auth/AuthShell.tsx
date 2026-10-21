import Link from "next/link";
import { Logo } from "@/components/ui/Logo";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-cream px-5 py-12">
      <Link href="/" className="mb-8">
        <Logo />
      </Link>

      <div className="w-full max-w-sm">
        <div className="card p-7 sm:p-8">
          <h1 className="font-serif text-2xl text-forest">{title}</h1>
          <p className="mt-1.5 text-sm text-charcoal/60">{subtitle}</p>

          <div className="mt-6">{children}</div>
        </div>

        <p className="mt-6 text-center text-sm text-charcoal/60">{footer}</p>
      </div>
    </main>
  );
}
