import { NextResponse } from "next/server";
import { getPublicOrder } from "@/lib/server/orders";
import { rateLimit } from "@/lib/server/rate-limit";
import { fingerprint, getClientIp, jsonError } from "@/lib/server/request";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!/^MZ-[2-9A-HJ-NP-Z]{6}$/.test(code)) return jsonError("Commande introuvable", 404);

  const limit = await rateLimit(`track:${fingerprint(getClientIp(request))}`, 120, 10 * 60);
  if (!limit.allowed) return jsonError("Trop de requêtes", 429);

  const order = await getPublicOrder(code);
  if (!order) return jsonError("Commande introuvable", 404);
  return NextResponse.json(order, { headers: { "Cache-Control": "no-store" } });
}
