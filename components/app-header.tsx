"use client";

import { translateUI, useLang } from "@/components/language-provider";
import { useEffect, useRef, useState } from "react";
import {
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  Search,
  UserCircle,
  X,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

import { getPageMeta } from "@/lib/nav";
import { VehicleSearch } from "@/components/vehicle-search";

type AppHeaderProps = {
  onMenuClick: () => void;
};

type Admin = {
  name: string;
  email: string;
  role: "SUPERADMIN" | "OWNER" | "MANAGER" | "STAFF";
};

export function AppHeader({ onMenuClick }: AppHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { lang, setLang } = useLang();

  const { title, description } = getPageMeta(pathname);

  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileSearch, setMobileSearch] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadAdmin = async () => {
      try {
        const response = await fetch("/api/auth/me");
        if (!response.ok) return;

        const result = await response.json();
        if (result.success) setAdmin(result.data);
      } catch (error) {
        console.error("Load admin error:", error);
      }
    };

    loadAdmin();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await fetch("/api/auth/logout", { method: "GET" });
      router.replace("/login");
      router.refresh();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setLoggingOut(false);
    }
  };

  const handleProfile = () => {
    setDropdownOpen(false);
    router.push("/profile");
  };

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl">
      <div className="flex h-[72px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Left */}
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onMenuClick}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm lg:hidden"
            aria-label={translateUI("Open menu")}
          >
            <Menu className="h-4 w-4" />
          </button>

          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold tracking-tight text-slate-900">
              {translateUI(title)}
            </h1>
            <p className="hidden truncate text-xs text-slate-500 sm:block">
              {translateUI(description)}
            </p>
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2 sm:gap-3">
          <label className="sr-only" htmlFor="language-select">
            {translateUI("Language")}
          </label>
          <select
            id="language-select"
            value={lang}
            onChange={(event) => setLang(event.target.value as "en" | "ja")}
            className="h-10 rounded-xl border border-slate-200 bg-white px-2 text-sm text-slate-700 shadow-sm outline-none transition hover:border-slate-300 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
          >
            <option value="en">English</option>
            <option value="ja">日本語</option>
          </select>

          {/* Car search (desktop) */}
          <div className="hidden md:block">
            <VehicleSearch />
          </div>

          {/* Car search (mobile toggle) */}
          <button
            type="button"
            onClick={() => setMobileSearch((open) => !open)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-slate-300 hover:text-slate-800 md:hidden"
            aria-label={
              mobileSearch
                ? translateUI("Close search")
                : translateUI("Search cars")
            }
            aria-expanded={mobileSearch}
          >
            {mobileSearch ? (
              <X className="h-4 w-4" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </button>

          {/* Notifications */}
          {/* <button
            type="button"
            className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-slate-300 hover:text-slate-800"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-sky-500 ring-2 ring-white" />
          </button> */}

          {/* Admin dropdown */}
          <div ref={dropdownRef} className="relative">
            <button
              type="button"
              onClick={() => setDropdownOpen((current) => !current)}
              className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white py-1.5 pr-2.5 pl-1.5 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
              aria-expanded={dropdownOpen}
              aria-haspopup="menu"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 text-xs font-semibold text-white">
                {admin?.name?.charAt(0).toUpperCase() || "A"}
              </div>

              <div className="hidden text-left leading-tight sm:block">
                <p className="max-w-[120px] truncate text-xs font-semibold text-slate-900">
                  {admin?.name || translateUI("Admin")}
                </p>
                <p className="text-[11px] text-slate-500">
                  {translateUI(admin?.role || "OWNER")}
                </p>
              </div>

              <ChevronDown
                className={`h-4 w-4 text-slate-400 transition ${
                  dropdownOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {dropdownOpen && (
              <div className="absolute top-full right-0 mt-2 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl">
                <div className="border-b border-slate-100 px-3 py-2.5">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {admin?.name || translateUI("Admin")}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {admin?.email || "—"}
                  </p>
                  <p className="mt-1 text-[11px] font-medium text-slate-400">
                    {translateUI(admin?.role || "OWNER")}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleProfile}
                  className="mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  <UserCircle className="h-4 w-4 text-slate-400" />
                  {translateUI("Profile")} </button>

                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <LogOut className="h-4 w-4" />
                  {loggingOut
                    ? translateUI("Logging out...")
                    : translateUI("Logout")}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile search row */}
      {mobileSearch && (
        <div className="border-t border-slate-200/80 px-4 pt-2 pb-3 md:hidden">
          <VehicleSearch autoFocus onSelect={() => setMobileSearch(false)} />
        </div>
      )}
    </header>
  );
}