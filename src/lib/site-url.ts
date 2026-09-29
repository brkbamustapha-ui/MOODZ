/**
 * Adresse publique du site : NEXT_PUBLIC_SITE_URL si défini, sinon le domaine de production
 * fourni par Vercel. Undefined en local : Next.js retombe alors sur http://localhost.
 */
export function getSiteUrl(): string | undefined {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const raw = explicit || process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (!raw) return undefined;
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    return url.origin;
  } catch {
    return undefined;
  }
}
