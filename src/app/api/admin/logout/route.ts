import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/server/auth";
import { isSameOrigin, jsonError } from "@/lib/server/request";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError("Origine refusée", 403);
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
