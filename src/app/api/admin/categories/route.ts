import { NextResponse } from "next/server";
import { guardAdmin } from "@/lib/server/guard";
import { createCategory } from "@/lib/server/menu";
import { jsonError, readJson } from "@/lib/server/request";
import { categoryInputSchema, firstError } from "@/lib/validation";

export async function POST(request: Request) {
  const guard = await guardAdmin(request);
  if (guard.error) return guard.error;
  const parsed = categoryInputSchema.safeParse(await readJson(request, 10_000));
  if (!parsed.success) return jsonError(firstError(parsed.error));
  const id = await createCategory(parsed.data);
  return NextResponse.json({ id }, { status: 201 });
}
