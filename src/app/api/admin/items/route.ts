import { NextResponse } from "next/server";
import { guardAdmin } from "@/lib/server/guard";
import { createItem } from "@/lib/server/menu";
import { jsonError, readJson } from "@/lib/server/request";
import { firstError, itemInputSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const guard = await guardAdmin(request);
  if (guard.error) return guard.error;
  const parsed = itemInputSchema.safeParse(await readJson(request, 20_000));
  if (!parsed.success) return jsonError(firstError(parsed.error));
  try {
    const item = await createItem(parsed.data);
    return NextResponse.json({ item }, { status: 201 });
  } catch {
    return jsonError("Catégorie introuvable", 404);
  }
}
