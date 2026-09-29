import { NextResponse } from "next/server";
import { getOpenStatus } from "@/lib/hours";
import { getPublicMenu } from "@/lib/server/menu";
import { getSettings, toPublicSettings } from "@/lib/server/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const [menu, settings] = await Promise.all([getPublicMenu(), getSettings()]);
  return NextResponse.json(
    { menu, settings: toPublicSettings(settings), status: getOpenStatus(settings.hours) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
