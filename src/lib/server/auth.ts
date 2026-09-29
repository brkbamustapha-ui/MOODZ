import "server-only";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { getDb } from "../db";

export const SESSION_COOKIE = "moodz_admin";
const SESSION_DAYS = 7;

export type AdminSession = { id: number; username: string };

declare global {
  var __moodzSecret: Promise<Uint8Array> | undefined;
}

/** Clé de signature : AUTH_SECRET si défini, sinon une clé aléatoire générée et gardée en base. */
function getSecret(): Promise<Uint8Array> {
  if (!globalThis.__moodzSecret) {
    globalThis.__moodzSecret = (async () => {
      const fromEnv = process.env.AUTH_SECRET?.trim();
      if (fromEnv && fromEnv.length >= 32) return new TextEncoder().encode(fromEnv);
      const db = await getDb();
      await db.query(
        `insert into app_secrets (name, value) values ('session', $1) on conflict (name) do nothing`,
        [randomBytes(48).toString("base64url")],
      );
      const [row] = await db.query<{ value: string }>(`select value from app_secrets where name = 'session'`);
      return new TextEncoder().encode(row.value);
    })().catch((error) => {
      globalThis.__moodzSecret = undefined;
      throw error;
    });
  }
  return globalThis.__moodzSecret;
}

type AdminRow = { id: number; username: string; password_hash: string; session_version: number };

let dummyHash: string | undefined;
function getDummyHash() {
  dummyHash ??= bcrypt.hashSync(randomBytes(16).toString("hex"), 11);
  return dummyHash;
}

export async function countAdmins(): Promise<number> {
  const db = await getDb();
  const [row] = await db.query<{ count: number }>(`select count(*)::int as count from admins`);
  return row.count;
}

export async function verifyCredentials(username: string, password: string): Promise<AdminRow | null> {
  const db = await getDb();
  const [admin] = await db.query<AdminRow>(
    `select id, username, password_hash, session_version from admins where username = $1`,
    [username.trim().toLowerCase()],
  );
  // Comparaison toujours effectuée pour ne pas révéler l'existence du compte par le temps de réponse.
  const hash = admin?.password_hash ?? getDummyHash();
  const ok = await bcrypt.compare(password, hash);
  return ok && admin ? admin : null;
}

export async function createSessionCookie(admin: Pick<AdminRow, "id" | "username" | "session_version">) {
  const token = await new SignJWT({ usr: admin.username, ver: admin.session_version })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(admin.id))
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(await getSecret());
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 3600,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

/** Vérifie la session (signature, expiration, version) : null si non connecté. */
export async function getAdminSession(): Promise<AdminSession | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, await getSecret(), { algorithms: ["HS256"] });
    const id = Number(payload.sub);
    if (!Number.isInteger(id)) return null;
    const db = await getDb();
    const [admin] = await db.query<{ id: number; username: string; session_version: number }>(
      `select id, username, session_version from admins where id = $1`,
      [id],
    );
    if (!admin || admin.session_version !== payload.ver) return null;
    return { id: admin.id, username: admin.username };
  } catch {
    return null;
  }
}

export async function updateAccount(
  adminId: number,
  { currentPassword, username, newPassword }: { currentPassword: string; username?: string; newPassword?: string },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const db = await getDb();
  const [admin] = await db.query<AdminRow>(
    `select id, username, password_hash, session_version from admins where id = $1`,
    [adminId],
  );
  if (!admin || !(await bcrypt.compare(currentPassword, admin.password_hash))) {
    return { ok: false, error: "Mot de passe actuel incorrect." };
  }
  const nextUsername = username?.trim().toLowerCase() || admin.username;
  if (nextUsername !== admin.username) {
    const taken = await db.query(`select 1 from admins where username = $1 and id <> $2`, [nextUsername, adminId]);
    if (taken.length) return { ok: false, error: "Ce nom d'utilisateur est déjà pris." };
  }
  const hash = newPassword ? await bcrypt.hash(newPassword, 11) : admin.password_hash;
  const [updated] = await db.query<AdminRow>(
    `update admins set username = $2, password_hash = $3,
       session_version = session_version + case when $4::boolean then 1 else 0 end,
       updated_at = now()
     where id = $1 returning id, username, password_hash, session_version`,
    [adminId, nextUsername, hash, Boolean(newPassword)],
  );
  // Les autres appareils sont déconnectés après un changement de mot de passe ; on reconnecte celui-ci.
  await createSessionCookie(updated);
  return { ok: true };
}
