import { NextResponse } from "next/server";
import { guardAdmin, parseId } from "@/lib/server/guard";
import { OrderError, updateOrderStatus } from "@/lib/server/orders";
import { jsonError, readJson } from "@/lib/server/request";
import { firstError, statusUpdateSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await guardAdmin(request);
  if (guard.error) return guard.error;
  const id = parseId((await params).id);
  if (!id) return jsonError("Commande introuvable", 404);

  const parsed = statusUpdateSchema.safeParse(await readJson(request, 5_000));
  if (!parsed.success) return jsonError(firstError(parsed.error));

  try {
    const order = await updateOrderStatus(id, parsed.data.status, {
      etaMinutes: parsed.data.etaMinutes,
      rejectReason: parsed.data.rejectReason,
    });
    return NextResponse.json({ order });
  } catch (error) {
    if (error instanceof OrderError) return jsonError(error.message, error.status);
    throw error;
  }
}
