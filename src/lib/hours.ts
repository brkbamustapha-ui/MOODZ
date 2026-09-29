import { DAY_KEYS, DAY_LABELS, type DayKey, type OpeningHours } from "./site-config";
import { TIMEZONE } from "./format";

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** Jour de la semaine et minutes écoulées depuis minuit, à Oran. */
export function algiersClock(now = new Date()): { day: DayKey; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIMEZONE,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const weekday = parts.find((p) => p.type === "weekday")?.value.toLowerCase().slice(0, 3) ?? "mon";
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  const day = (DAY_KEYS.find((d) => d === weekday) ?? "mon") as DayKey;
  return { day, minutes: hour * 60 + minute };
}

function previousDay(day: DayKey): DayKey {
  const i = DAY_KEYS.indexOf(day);
  return DAY_KEYS[(i + 6) % 7];
}

function nextDay(day: DayKey): DayKey {
  const i = DAY_KEYS.indexOf(day);
  return DAY_KEYS[(i + 1) % 7];
}

export type OpenStatus = {
  isOpen: boolean;
  label: string;
};

export function getOpenStatus(hours: OpeningHours, now = new Date()): OpenStatus {
  const { day, minutes } = algiersClock(now);
  const today = hours[day];
  const yesterday = hours[previousDay(day)];

  // Service de la veille qui déborde après minuit
  if (!yesterday.closed) {
    const open = toMinutes(yesterday.open);
    const close = toMinutes(yesterday.close);
    if (close <= open && minutes < close) {
      return { isOpen: true, label: `Ouvert, ferme à ${yesterday.close}` };
    }
  }

  if (!today.closed) {
    const open = toMinutes(today.open);
    const close = toMinutes(today.close);
    const overnight = close <= open;
    if (minutes >= open && (overnight || minutes < close)) {
      return { isOpen: true, label: `Ouvert, ferme à ${today.close === "23:59" ? "minuit" : today.close}` };
    }
    if (minutes < open) {
      return { isOpen: false, label: `Fermé, ouvre à ${today.open}` };
    }
  }

  // Prochaine ouverture
  let cursor = nextDay(day);
  for (let i = 0; i < 7; i++) {
    const h = hours[cursor];
    if (!h.closed) {
      const when = i === 0 ? "demain" : DAY_LABELS[cursor].toLowerCase();
      return { isOpen: false, label: `Fermé, ouvre ${when} à ${h.open}` };
    }
    cursor = nextDay(cursor);
  }
  return { isOpen: false, label: "Fermé" };
}
