import { NextResponse } from "next/server";
import { guardAdmin } from "@/lib/server/guard";
import { listOrders } from "@/lib/server/orders";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/site-config";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const guard = await guardAdmin(request);
  if (guard.error) return guard.error;

  const url = new URL(request.url);
  const status = (url.searchParams.get("status") ?? "")
    .split(",")
    .filter((s): s is OrderStatus => (ORDER_STATUSES as readonly string[]).includes(s));
  const from = url.searchParams.get("from") ?? undefined;
  const to = url.searchParams.get("to") ?? undefined;
  const isIso = (v?: string) => !v || !Number.isNaN(Date.parse(v));
  if (!isIso(from) || !isIso(to)) return NextResponse.json({ error: "Dates invalides" }, { status: 400 });

  const orders = await listOrders({
    status,
    from,
    to,
    search: url.searchParams.get("q")?.slice(0, 60) || undefined,
    limit: Number(url.searchParams.get("limit") ?? 200) || 200,
  });
  return NextResponse.json({ orders }, { headers: { "Cache-Control": "no-store" } });
}
