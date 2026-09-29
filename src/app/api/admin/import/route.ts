import { NextResponse } from "next/server";
import { parseMenuText } from "@/lib/menu-import";
import { guardAdmin } from "@/lib/server/guard";
import { importMenu } from "@/lib/server/menu";
import { jsonError, readJson } from "@/lib/server/request";
import { firstError, importSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const guard = await guardAdmin(request);
  if (guard.error) return guard.error;
  const parsed = importSchema.safeParse(await readJson(request, 80_000));
  if (!parsed.success) return jsonError(firstError(parsed.error));

  const result = parseMenuText(parsed.data.text);
  if (result.categories.length === 0) {
    return jsonError("Aucun article reconnu. Vérifiez le format (un article par ligne avec son prix).");
  }
  if (result.categories.length > 60 || result.categories.reduce((n, c) => n + c.items.length, 0) > 800) {
    return jsonError("Carte trop longue pour un import unique.");
  }
  if (parsed.data.dryRun) return NextResponse.json({ preview: result });

  const summary = await importMenu(result.categories, parsed.data.mode);
  return NextResponse.json({ ok: true, ...summary, warnings: result.warnings });
}
