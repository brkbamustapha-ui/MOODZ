import { NextResponse } from "next/server";
import { guardAdmin } from "@/lib/server/guard";
import { getOrderPulse } from "@/lib/server/orders";

export const dynamic = "force-dynamic";

/** Interrogé toutes les quelques secondes par le tableau de bord pour signaler les nouvelles commandes. */
export async function GET(request: Request) {
  const guard = await guardAdmin(request);
  if (guard.error) return guard.error;
  return NextResponse.json(await getOrderPulse(), { headers: { "Cache-Control": "no-store" } });
}
