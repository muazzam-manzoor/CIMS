"use client";

import { useLang, translateUI } from "@/components/language-provider";
import { FormEvent, useEffect, useState } from "react";
import { KeyRound, Mail, ShieldCheck, User } from "lucide-react";

type Admin = {
  _id: string;
  name: string;
  email: string;
  role: "SUPERADMIN" | "OWNER" | "MANAGER" | "STAFF";
  isActive: boolean;
};

export default function ProfilePage() {
  useLang();
  const [admin, setAdmin] =
    useState<Admin | null>(null);

  const [loading, setLoading] =
    useState(true);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordNotice, setPasswordNotice] = useState("");

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await fetch(
          "/api/auth/me",
        );

        if (!response.ok) return;

        const result = await response.json();

        if (result.success) {
          setAdmin(result.data);
        }
      } catch (error) {
        console.error(
          "Load profile error:",
          error,
        );
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const handlePasswordChange = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setPasswordError("");
    setPasswordNotice("");

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    try {
      setPasswordLoading(true);
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to change password");
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordNotice(result.message);
    } catch (error) {
      console.error("Change password error:", error);
      setPasswordError(
        error instanceof Error ? error.message : "Failed to change password",
      );
    } finally {
      setPasswordLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-60 items-center justify-center">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-slate-200 border-t-sky-600" />
      </div>
    );
  }

  if (!admin) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
        {translateUI("Unable to load profile.")} </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          {translateUI("Profile")} </h1>

        <p className="mt-1 text-sm text-slate-500">
          {translateUI("Manage your account information.")} </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 text-xl font-bold text-white">
            {admin.name
              .charAt(0)
              .toUpperCase()}
          </div>

          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {admin.name}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {admin.email}
            </p>
          </div>
        </div>

        <div className="grid gap-4 pt-6 sm:grid-cols-3">
          <ProfileItem
            icon={
              <User className="h-4 w-4" />
            }
            label={translateUI("Name")}
            value={admin.name}
          />

          <ProfileItem
            icon={
              <Mail className="h-4 w-4" />
            }
            label={translateUI("Email")}
            value={admin.email}
          />

          <ProfileItem
            icon={
              <ShieldCheck className="h-4 w-4" />
            }
            label={translateUI("Role")}
            value={admin.role}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-900">
              {translateUI("Change password")}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {translateUI("Use your current password to set a new one.")}
            </p>
          </div>
        </div>

        <form
          onSubmit={handlePasswordChange}
          className="grid gap-4 sm:grid-cols-2"
        >
          <div className="sm:col-span-2">
            <PasswordField
              id="current-password"
              label={translateUI("Current password")}
              value={currentPassword}
              onChange={setCurrentPassword}
              autoComplete="current-password"
            />
          </div>
          <PasswordField
            id="new-password"
            label={translateUI("New password")}
            value={newPassword}
            onChange={setNewPassword}
            autoComplete="new-password"
          />
          <PasswordField
            id="confirm-new-password"
            label={translateUI("Confirm new password")}
            value={confirmPassword}
            onChange={setConfirmPassword}
            autoComplete="new-password"
          />

          {passwordError && (
            <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 sm:col-span-2">
              {translateUI(passwordError)}
            </p>
          )}
          {passwordNotice && (
            <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 sm:col-span-2">
              {translateUI(passwordNotice)}
            </p>
          )}

          <div className="flex justify-end border-t border-slate-100 pt-4 sm:col-span-2">
            <button
              type="submit"
              disabled={passwordLoading}
              className="h-10 w-full rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {passwordLoading
                ? translateUI("Changing password...")
                : translateUI("Change password")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        id={id}
        type="password"
        required
        minLength={8}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
      />
    </div>
  );
}

function ProfileItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  useLang();
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <div className="flex items-center gap-2 text-slate-400">
        {icon}

        <span className="text-xs font-medium">
          {label}
        </span>
      </div>

      <p className="mt-2 truncate text-sm font-semibold text-slate-900">
        {value}
      </p>
    </div>
  );
}