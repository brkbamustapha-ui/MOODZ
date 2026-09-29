export const TIMEZONE = "Africa/Algiers";

const moneyFormatter = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

/** 1250 -> "1 250 DA" */
export function formatDA(amount: number): string {
  return `${moneyFormatter.format(Math.round(amount))} DA`;
}

export function formatNumber(value: number, digits = 0): string {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: digits }).format(value);
}

export function formatPercent(value: number, digits = 0): string {
  return `${formatNumber(value, digits)} %`;
}

export function formatDateTime(iso: string | Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: TIMEZONE,
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function formatTime(iso: string | Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function formatDay(iso: string | Date, opts: Intl.DateTimeFormatOptions = {}): string {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: TIMEZONE,
    day: "numeric",
    month: "short",
    ...opts,
  }).format(new Date(iso));
}

/** Date du jour (AAAA-MM-JJ) dans le fuseau d'Oran. */
export function todayInAlgiers(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return parts;
}

/** Temps écoulé lisible : "à l'instant", "il y a 5 min", "il y a 2 h". */
export function timeAgo(iso: string | Date, now = Date.now()): string {
  const diff = Math.max(0, now - new Date(iso).getTime());
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  return `il y a ${days} j`;
}

/** Masque un numéro : 0555123456 -> 05•• •• •4 56 */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "••";
  return `${digits.slice(0, 2)}•• •• ••${digits.slice(-2)}`;
}

export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
