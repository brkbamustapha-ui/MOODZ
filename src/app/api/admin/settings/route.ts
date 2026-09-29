import { NextResponse } from "next/server";
import { guardAdmin } from "@/lib/server/guard";
import { jsonError, readJson } from "@/lib/server/request";
import { getSettings, patchSettings, saveSettings } from "@/lib/server/settings";
import { firstError, settingsSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const guard = await guardAdmin(request);
  if (guard.error) return guard.error;
  return NextResponse.json({ settings: await getSettings() }, { headers: { "Cache-Control": "no-store" } });
}

export async function PUT(request: Request) {
  const guard = await guardAdmin(request);
  if (guard.error) return guard.error;
  const parsed = settingsSchema.safeParse(await readJson(request, 900_000));
  if (!parsed.success) return jsonError(firstError(parsed.error));
  const settings = await saveSettings(parsed.data);
  return NextResponse.json({ settings });
}

/** Mise à jour partielle (clés de premier niveau), ex. { menuIsSample: false }. */
export async function PATCH(request: Request) {
  const guard = await guardAdmin(request);
  if (guard.error) return guard.error;
  const parsed = settingsSchema.partial().safeParse(await readJson(request, 900_000));
  if (!parsed.success) return jsonError(firstError(parsed.error));
  const settings = await patchSettings(parsed.data);
  return NextResponse.json({ settings });
}
