export const CURRENCY = "JPY";
let locale = "en-JP";

export function setFormatLocale(language: "en" | "ja") {
  locale = language === "ja" ? "ja-JP" : "en-JP";
}

export function getFormatLocale() {
  return locale;
}

export function formatMoney(value: number) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: CURRENCY,
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}