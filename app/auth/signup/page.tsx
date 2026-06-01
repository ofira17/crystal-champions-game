"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import ErrorMessage from "@/components/ui/ErrorMessage";
import type { UserRole } from "@/types";

const ROLE_DASHBOARDS: Record<UserRole, string> = {
  child: "/child",
  parent: "/parent",
  teacher: "/teacher",
  admin: "/admin",
};

const ROLE_OPTIONS = [
  { value: "child", label: "ילד/ה" },
  { value: "parent", label: "הורה" },
  { value: "teacher", label: "מורה/מדריך" },
];

export default function SignupPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<UserRole | "">("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!role) {
      setError("יש לבחור סוג משתמש.");
      return;
    }
    if (password.length < 8) {
      setError("הסיסמה חייבת להכיל לפחות 8 תווים.");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      (typeof window !== "undefined" ? window.location.origin : "https://crystal-champions-game.vercel.app");

    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${siteUrl}/auth/callback`,
        data: {
          role,
          display_name: displayName,
        },
      },
    });

    if (authError) {
      setError(authError.message === "User already registered"
        ? "כתובת האימייל כבר רשומה. נסה להתחבר."
        : "שגיאה בהרשמה. נסה שוב.");
      setLoading(false);
      return;
    }

    // If email confirmation is disabled, user is logged in immediately
    if (data.session) {
      router.push(ROLE_DASHBOARDS[role as UserRole]);
      router.refresh();
      return;
    }

    // Email confirmation required
    setSuccess(true);
    setLoading(false);
  }

  if (success) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-4">
        <Card className="w-full max-w-sm text-center">
          <div className="text-5xl mb-4">📧</div>
          <h2 className="text-xl font-bold text-white mb-2">בדוק את האימייל שלך</h2>
          <p className="text-slate-400 text-sm">
            שלחנו לך קישור אימות לכתובת <strong className="text-white">{email}</strong>.
            לחץ על הקישור כדי להשלים את ההרשמה.
          </p>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm flex flex-col gap-6">
        <div className="text-center">
          <div className="text-5xl mb-3">✨</div>
          <h1 className="text-2xl font-bold text-white">הרשמה</h1>
          <p className="text-slate-400 text-sm mt-1">הצטרף להרפתקה!</p>
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="שם תצוגה"
              type="text"
              placeholder="השם שלך"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              autoComplete="name"
            />
            <Input
              label="אימייל"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            <Input
              label="סיסמה"
              type="password"
              placeholder="לפחות 8 תווים"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
            <Select
              label="אני..."
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              options={ROLE_OPTIONS}
              placeholder="בחר סוג משתמש"
              required
            />

            {error && <ErrorMessage message={error} />}

            <Button type="submit" loading={loading} className="w-full mt-1">
              הרשמה
            </Button>
          </form>
        </Card>

        <p className="text-center text-sm text-slate-400">
          כבר יש לך חשבון?{" "}
          <Link href="/auth/login" className="text-violet-400 hover:text-violet-300 font-medium">
            התחברות
          </Link>
        </p>
      </div>
    </main>
  );
}
