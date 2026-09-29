import { NextResponse } from "next/server";
import { countAdmins, createSessionCookie, verifyCredentials } from "@/lib/server/auth";
import { rateLimit, resetRateLimit } from "@/lib/server/rate-limit";
import { fingerprint, getClientIp, isSameOrigin, jsonError, readJson } from "@/lib/server/request";
import { loginSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError("Origine refusée", 403);

  const body = await readJson(request, 5_000);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) return jsonError("Identifiants requis");

  const ip = fingerprint(getClientIp(request));
  const user = fingerprint(parsed.data.username.toLowerCase());
  const [byIp, byUser] = await Promise.all([
    rateLimit(`login:ip:${ip}`, 10, 15 * 60),
    rateLimit(`login:user:${user}`, 8, 15 * 60),
  ]);
  if (!byIp.allowed || !byUser.allowed) {
    const wait = Math.ceil(Math.max(byIp.retryAfter, byUser.retryAfter) / 60);
    return jsonError(`Trop de tentatives. Réessayez dans ${wait} min.`, 429);
  }

  if ((await countAdmins()) === 0) {
    return jsonError(
      "Aucun compte administrateur n'est configuré. Définissez ADMIN_USERNAME et ADMIN_PASSWORD sur le serveur.",
      503,
    );
  }

  const admin = await verifyCredentials(parsed.data.username, parsed.data.password);
  if (!admin) return jsonError("Nom d'utilisateur ou mot de passe incorrect.", 401);

  await Promise.all([resetRateLimit(`login:user:${user}`), resetRateLimit(`login:ip:${ip}`)]);
  await createSessionCookie(admin);
  return NextResponse.json({ ok: true, username: admin.username });
}
