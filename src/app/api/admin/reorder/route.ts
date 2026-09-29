import { NextResponse } from "next/server";
import { guardAdmin } from "@/lib/server/guard";
import { reorderCategories, reorderItems } from "@/lib/server/menu";
import { jsonError, readJson } from "@/lib/server/request";
import { firstError, reorderSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const guard = await guardAdmin(request);
  if (guard.error) return guard.error;
  const parsed = reorderSchema.safeParse(await readJson(request, 20_000));
  if (!parsed.success) return jsonError(firstError(parsed.error));
  const { ids, categoryId } = parsed.data;
  if (categoryId) await reorderItems(categoryId, ids);
  else await reorderCategories(ids);
  return NextResponse.json({ ok: true });
}
