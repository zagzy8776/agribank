export const fmtMoney = (
  cents: number,
  currency: string = "EUR",
  locale = "en-IE",
) =>
  new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format((cents ?? 0) / 100);

export const fmtNumber = (n: number, digits = 2) =>
  new Intl.NumberFormat("en-IE", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(n);

export const fmtCrypto = (n: number) =>
  new Intl.NumberFormat("en-IE", { maximumFractionDigits: 6 }).format(n);

export const fmtDate = (d: string | Date) =>
  new Intl.DateTimeFormat("en-IE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(typeof d === "string" ? new Date(d) : d);

export const fmtIban = (iban?: string | null) => {
  if (!iban) return "—";
  return iban.replace(/(.{4})/g, "$1 ").trim();
};
