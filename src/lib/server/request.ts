import "server-only";
import { createHash } from "node:crypto";
import { NextResponse } from "next/server";

/**
 * Adresse IP du client. Vercel (et la plupart des reverse proxies) fixent x-real-ip eux-mêmes ;
 * x-forwarded-for sert de repli. Sans proxy, ces en-têtes sont déclaratifs : les limites
 * par nom d'utilisateur et par commande restent alors la vraie protection.
 */
export function getClientIp(request: Request): string {
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return "local";
}

/** Empreinte anonymisée d'un identifiant (on ne stocke jamais l'IP en clair). */
export function fingerprint(value: string): string {
  const salt = process.env.AUTH_SECRET ?? "moodz";
  return createHash("sha256").update(`${salt}:${value}`).digest("hex").slice(0, 32);
}

/**
 * Protection CSRF en complément des cookies SameSite=Lax :
 * les requêtes qui modifient des données doivent venir du même site.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) {
    // Les navigateurs envoient toujours Origin sur les POST/PATCH/DELETE en fetch.
    // Son absence correspond à un client non navigateur (curl, tests) : on vérifie le Referer.
    const referer = request.headers.get("referer");
    if (!referer) return process.env.NODE_ENV !== "production";
    return sameHost(referer, request);
  }
  return sameHost(origin, request);
}

function sameHost(url: string, request: Request): boolean {
  try {
    const source = new URL(url);
    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    return !!host && source.host === host;
  } catch {
    return false;
  }
}

export function jsonError(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

export async function readJson<T = unknown>(request: Request, maxBytes = 200_000): Promise<T | null> {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > maxBytes) return null;
  try {
    const text = await request.text();
    if (text.length > maxBytes) return null;
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}
