import { NextResponse } from "next/server";
import { OrderError, placeOrder } from "@/lib/server/orders";
import { rateLimit } from "@/lib/server/rate-limit";
import { fingerprint, getClientIp, isSameOrigin, jsonError, readJson } from "@/lib/server/request";
import { getSettings } from "@/lib/server/settings";
import { firstError, orderInputSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError("Origine refusée", 403);

  const client = fingerprint(getClientIp(request));
  const limit = await rateLimit(`order:${client}`, 6, 15 * 60);
  if (!limit.allowed) {
    return jsonError("Trop de commandes envoyées. Réessayez dans quelques minutes ou appelez-nous.", 429, {
      retryAfter: limit.retryAfter,
    });
  }

  const body = await readJson(request, 50_000);
  if (!body) return jsonError("Requête invalide");
  const parsed = orderInputSchema.safeParse(body);
  if (!parsed.success) return jsonError(firstError(parsed.error));
  if (parsed.data.website) return jsonError("Requête invalide");

  try {
    const settings = await getSettings();
    const order = await placeOrder(parsed.data, settings, client);
    return NextResponse.json({ code: order.code, total: order.total }, { status: 201 });
  } catch (error) {
    if (error instanceof OrderError) return jsonError(error.message, error.status);
    console.error("[MOODZ] Erreur commande", error);
    return jsonError("Impossible d'enregistrer la commande pour le moment.", 500);
  }
}
