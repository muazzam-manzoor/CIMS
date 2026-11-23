"use client";

import { useLang, translateUI } from "@/components/language-provider";
import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CarFront, LockKeyhole, Mail } from "lucide-react";

type LoginMode = "login" | "forgot" | "reset";

export default function LoginForm() {
  useLang();
  const router = useRouter();
  const searchParams = useSearchParams();

  const nextPath =
    searchParams.get("next") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] =
    useState("");
  const [mode, setMode] = useState<LoginMode>("login");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setError("");
    setNotice("");

    try {
      setLoading(true);

      if (!email.trim()) {
        throw new Error("Please enter your email.");
      }

      if (mode === "forgot") {
        const response = await fetch("/api/auth/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim() }),
        });
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Unable to send a reset code");
        }

        setMode("reset");
        setNotice(result.message);
        return;
      }

      if (mode === "reset") {
        if (newPassword !== confirmPassword) {
          throw new Error("New passwords do not match.");
        }

        const response = await fetch("/api/auth/reset-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: email.trim(),
            code: resetCode,
            newPassword,
          }),
        });
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Unable to reset password");
        }

        setMode("login");
        setPassword("");
        setResetCode("");
        setNewPassword("");
        setConfirmPassword("");
        setNotice(result.message);
        return;
      }

      if (!password) {
        throw new Error("Please enter your password.");
      }

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            "Failed to login",
        );
      }

      router.replace(nextPath);
      router.refresh();
    } catch (error) {
      console.error("Login error:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Failed to login",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md">
        <div className="rounded-3xl border border-white/10 bg-white p-8 shadow-2xl">
          {/* Brand */}
          <div className="mb-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-white">
              <CarFront className="h-7 w-7" />
            </div>

            <h1 className="mt-5 text-2xl font-bold tracking-tight text-slate-900">
              {translateUI("CIMS")} </h1>

            <p className="mt-1 text-sm text-slate-500">
              {translateUI("Car Inventory Management System")} </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-5"
          >
            {mode !== "reset" && <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                {translateUI("Email")} </label>

              <div className="relative">
                <Mail className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  type="email"
                  value={email}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                  placeholder={translateUI("admin@example.com")}
                  autoComplete="email"
                  required
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white pr-3 pl-10 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                />
              </div>
            </div>}

            {mode === "login" && <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                {translateUI("Password")} </label>

              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  type="password"
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  placeholder={translateUI("Enter your password")}
                  autoComplete="current-password"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white pr-3 pl-10 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                />
              </div>
            </div>}

            {mode === "reset" && (
              <>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    {translateUI("Email")}
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="email"
                    required
                    className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    {translateUI("Email reset code")}
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    value={resetCode}
                    onChange={(event) => setResetCode(event.target.value)}
                    autoComplete="one-time-code"
                    required
                    className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                  />
                </div>
                <PasswordInput
                  label={translateUI("New password")}
                  value={newPassword}
                  onChange={setNewPassword}
                />
                <PasswordInput
                  label={translateUI("Confirm new password")}
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                />
              </>
            )}

            {mode === "forgot" && (
              <p className="text-sm text-slate-500">
                {translateUI("Enter your account email and we’ll send you a reset code.")}
              </p>
            )}

            {error && (
              <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
            {notice && (
              <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {notice}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="h-11 w-full rounded-xl bg-slate-900 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? translateUI("Please wait...")
                : mode === "forgot"
                  ? translateUI("Send reset code")
                  : mode === "reset"
                    ? translateUI("Reset password")
                    : translateUI("Sign in")}
            </button>

            {mode === "login" ? (
              <button
                type="button"
                onClick={() => {
                  setMode("forgot");
                  setError("");
                  setNotice("");
                }}
                className="w-full text-center text-sm font-medium text-sky-700 hover:text-sky-800"
              >
                {translateUI("Forgot password?")}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setMode(mode === "reset" ? "forgot" : "login");
                  setError("");
                  setNotice("");
                }}
                className="w-full text-center text-sm font-medium text-sky-700 hover:text-sky-800"
              >
                {translateUI(mode === "reset" ? "Request another code" : "Back to sign in")}
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

function PasswordInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <div className="relative">
        <LockKeyhole className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="password"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete="new-password"
          minLength={8}
          required
          className="h-11 w-full rounded-xl border border-slate-200 bg-white pr-3 pl-10 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
        />
      </div>
    </div>
  );
}