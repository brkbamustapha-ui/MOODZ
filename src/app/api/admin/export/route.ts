import { guardAdmin } from "@/lib/server/guard";
import { getOrdersForExport, normalizeRange } from "@/lib/server/stats";
import { ORDER_STATUS_LABELS, ORDER_TYPE_LABELS, type OrderStatus, type OrderType } from "@/lib/site-config";

export const dynamic = "force-dynamic";

function csvCell(value: string | number): string {
  let text = String(value);
  // Neutralise les formules (injection CSV dans Excel)
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[";\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export async function GET(request: Request) {
  const guard = await guardAdmin(request);
  if (guard.error) return guard.error;
  const url = new URL(request.url);
  const range = normalizeRange(url.searchParams.get("from"), url.searchParams.get("to"));
  const rows = await getOrdersForExport(range);

  const header = ["Code", "Date", "Statut", "Type", "Client", "Téléphone", "Sous-total (DA)", "Livraison (DA)", "Total (DA)", "Articles"];
  const lines = rows.map((r) =>
    [
      r.code,
      r.created,
      ORDER_STATUS_LABELS[r.status as OrderStatus] ?? r.status,
      ORDER_TYPE_LABELS[r.order_type as OrderType] ?? r.order_type,
      r.customer_name,
      r.customer_phone,
      r.subtotal,
      r.delivery_fee,
      r.total,
      r.items,
    ]
      .map(csvCell)
      .join(";"),
  );
  // BOM UTF-8 + séparateur ";" : ouverture directe dans Excel en français
  const csv = "﻿" + [header.join(";"), ...lines].join("\r\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="moodz-commandes-${range.from}_${range.to}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
