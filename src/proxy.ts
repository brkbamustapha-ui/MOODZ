import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "moodz_admin";

/**
 * Contrôle optimiste : sans cookie de session, on renvoie vers la page de connexion.
 * La vérification complète (signature, expiration, version) est faite côté serveur
 * dans le layout du tableau de bord et dans chaque route /api/admin.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  if (pathname.startsWith("/api/admin")) {
    if (pathname === "/api/admin/login" || hasSession) return NextResponse.next();
    return NextResponse.json({ error: "Session expirée, reconnectez-vous." }, { status: 401 });
  }

  if (pathname === "/admin/login") return NextResponse.next();
  if (!hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = pathname === "/admin" ? "" : `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
