import { NextResponse } from "next/server";
import { guardAdmin } from "@/lib/server/guard";
import { getStats, normalizeRange } from "@/lib/server/stats";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const guard = await guardAdmin(request);
  if (guard.error) return guard.error;
  const url = new URL(request.url);
  const range = normalizeRange(url.searchParams.get("from"), url.searchParams.get("to"));
  return NextResponse.json(await getStats(range), { headers: { "Cache-Control": "no-store" } });
}
