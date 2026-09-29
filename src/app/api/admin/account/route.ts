import { NextResponse } from "next/server";
import { updateAccount } from "@/lib/server/auth";
import { guardAdmin } from "@/lib/server/guard";
import { rateLimit } from "@/lib/server/rate-limit";
import { jsonError, readJson } from "@/lib/server/request";
import { accountSchema, firstError } from "@/lib/validation";

export async function PUT(request: Request) {
  const guard = await guardAdmin(request);
  if (guard.error) return guard.error;
  const limit = await rateLimit(`account:${guard.session.id}`, 8, 15 * 60);
  if (!limit.allowed) return jsonError("Trop de tentatives, réessayez plus tard.", 429);

  const parsed = accountSchema.safeParse(await readJson(request, 5_000));
  if (!parsed.success) return jsonError(firstError(parsed.error));
  const result = await updateAccount(guard.session.id, parsed.data);
  if (!result.ok) return jsonError(result.error, 400);
  return NextResponse.json({ ok: true });
}
