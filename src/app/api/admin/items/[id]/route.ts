import { NextResponse } from "next/server";
import { guardAdmin, parseId } from "@/lib/server/guard";
import { deleteItem, updateItem } from "@/lib/server/menu";
import { jsonError, readJson } from "@/lib/server/request";
import { firstError, itemPatchSchema } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Ctx) {
  const guard = await guardAdmin(request);
  if (guard.error) return guard.error;
  const id = parseId((await params).id);
  if (!id) return jsonError("Article introuvable", 404);
  const parsed = itemPatchSchema.safeParse(await readJson(request, 20_000));
  if (!parsed.success) return jsonError(firstError(parsed.error));
  try {
    const item = await updateItem(id, parsed.data);
    return item ? NextResponse.json({ item }) : jsonError("Article introuvable", 404);
  } catch {
    return jsonError("Catégorie introuvable", 404);
  }
}

export async function DELETE(request: Request, { params }: Ctx) {
  const guard = await guardAdmin(request);
  if (guard.error) return guard.error;
  const id = parseId((await params).id);
  if (!id) return jsonError("Article introuvable", 404);
  const ok = await deleteItem(id);
  return ok ? NextResponse.json({ ok }) : jsonError("Article introuvable", 404);
}
