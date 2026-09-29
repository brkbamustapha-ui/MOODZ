import { NextResponse } from "next/server";
import { guardAdmin, parseId } from "@/lib/server/guard";
import { deleteCategory, updateCategory } from "@/lib/server/menu";
import { jsonError, readJson } from "@/lib/server/request";
import { categoryPatchSchema, firstError } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Ctx) {
  const guard = await guardAdmin(request);
  if (guard.error) return guard.error;
  const id = parseId((await params).id);
  if (!id) return jsonError("Catégorie introuvable", 404);
  const parsed = categoryPatchSchema.safeParse(await readJson(request, 10_000));
  if (!parsed.success) return jsonError(firstError(parsed.error));
  const ok = await updateCategory(id, parsed.data);
  return ok ? NextResponse.json({ ok }) : jsonError("Catégorie introuvable", 404);
}

export async function DELETE(request: Request, { params }: Ctx) {
  const guard = await guardAdmin(request);
  if (guard.error) return guard.error;
  const id = parseId((await params).id);
  if (!id) return jsonError("Catégorie introuvable", 404);
  const ok = await deleteCategory(id);
  return ok ? NextResponse.json({ ok }) : jsonError("Catégorie introuvable", 404);
}
