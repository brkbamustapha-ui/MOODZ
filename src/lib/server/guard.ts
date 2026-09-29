import "server-only";
import { NextResponse } from "next/server";
import { getAdminSession, type AdminSession } from "./auth";
import { isSameOrigin } from "./request";

type GuardResult = { session: AdminSession; error?: never } | { session?: never; error: NextResponse };

/** Vérifie la session administrateur (et l'origine pour les écritures) dans une route API. */
export async function guardAdmin(request: Request): Promise<GuardResult> {
  if (request.method !== "GET" && request.method !== "HEAD" && !isSameOrigin(request)) {
    return { error: NextResponse.json({ error: "Origine refusée" }, { status: 403 }) };
  }
  const session = await getAdminSession();
  if (!session) {
    return { error: NextResponse.json({ error: "Session expirée, reconnectez-vous." }, { status: 401 }) };
  }
  return { session };
}

export function parseId(value: string): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}
