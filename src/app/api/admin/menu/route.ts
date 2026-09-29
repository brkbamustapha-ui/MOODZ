import { NextResponse } from "next/server";
import { guardAdmin } from "@/lib/server/guard";
import { getAdminMenu } from "@/lib/server/menu";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const guard = await guardAdmin(request);
  if (guard.error) return guard.error;
  return NextResponse.json({ menu: await getAdminMenu() }, { headers: { "Cache-Control": "no-store" } });
}
