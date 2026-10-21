"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { AuthShell } from "@/components/auth/AuthShell";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmSent, setConfirmSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo:
          typeof window !== "undefined"
            ? `${window.location.origin}/auth/callback`
            : undefined,
      },
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    // If email confirmation is required, there is no session yet.
    if (data.session) {
      router.push("/dashboard");
      router.refresh();
    } else {
      setConfirmSent(true);
    }
  }

  if (confirmSent) {
    return (
      <AuthShell
        title="Check your email"
        subtitle="Almost there."
        footer={
          <Link href="/login" className="font-medium text-forest hover:underline">
            Back to sign in
          </Link>
        }
      >
        <p className="text-sm leading-relaxed text-charcoal/70">
          We sent a confirmation link to <strong>{email}</strong>. Follow it
          to activate your account and start planning.
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Start with today\u2019s tasks. No perfect schedule required."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-forest hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field
          id="fullName"
          label="Name"
          type="text"
          autoComplete="name"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
        <Field
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Field
          id="password"
          label="Password"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && <p className="text-sm text-[#B3492B]">{error}</p>}

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Creating account\u2026" : "Create account"}
        </Button>
      </form>
    </AuthShell>
  );
}
