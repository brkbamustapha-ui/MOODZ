import "server-only";
import { getDb } from "../db";
import { DEFAULT_SETTINGS, type PublicSettings, type SiteSettings } from "../site-config";

type PlainObject = Record<string, unknown>;

function isPlainObject(value: unknown): value is PlainObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Fusion profonde : les valeurs enregistrées l'emportent, les nouvelles clés reprennent la valeur par défaut. */
export function mergeDeep<T>(base: T, override: unknown): T {
  if (!isPlainObject(base) || !isPlainObject(override)) {
    return (override === undefined ? base : override) as T;
  }
  const result: PlainObject = { ...base };
  for (const [key, value] of Object.entries(override)) {
    if (value === undefined) continue;
    const current = (base as PlainObject)[key];
    result[key] = isPlainObject(current) && isPlainObject(value) ? mergeDeep(current, value) : value;
  }
  return result as T;
}

export async function getSettings(): Promise<SiteSettings> {
  const db = await getDb();
  const [row] = await db.query<{ data: unknown }>(`select data from settings where id = 1`);
  const stored = typeof row?.data === "string" ? JSON.parse(row.data) : row?.data;
  return mergeDeep(DEFAULT_SETTINGS, stored ?? {});
}

export async function saveSettings(next: SiteSettings): Promise<SiteSettings> {
  const db = await getDb();
  await db.query(
    `insert into settings (id, data, updated_at) values (1, $1::text::jsonb, now())
     on conflict (id) do update set data = excluded.data, updated_at = now()`,
    [JSON.stringify(next)],
  );
  return next;
}

export async function patchSettings(patch: Partial<SiteSettings>): Promise<SiteSettings> {
  const current = await getSettings();
  return saveSettings(mergeDeep(current, patch));
}

/** Retire les réglages internes avant de les envoyer au navigateur public. */
export function toPublicSettings(settings: SiteSettings): PublicSettings {
  const { finance: _finance, menuIsSample: _sample, ...rest } = settings;
  return rest;
}
