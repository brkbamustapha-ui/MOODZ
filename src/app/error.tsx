"use client";

import { Badge } from "@/components/brand/Badge";
import { DEFAULT_SETTINGS } from "@/lib/site-config";

/** Erreur imprévue (base de données indisponible...) : page de marque plutôt qu'un écran vide. */
export default function ErrorPage({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <Badge className="w-[min(52vw,220px)]" />
      <h1 className="mt-12 font-display text-4xl text-text">Nous revenons dans un instant</h1>
      <p className="mt-3 max-w-[42ch] text-[15px] text-text-3">
        Le site est momentanément indisponible. Réessayez dans quelques instants, ou retrouvez-nous sur
        Instagram.
      </p>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => retry()}
          className="btn-gold inline-flex h-13 items-center rounded-full px-8 text-[15px] font-semibold"
        >
          Réessayer
        </button>
        <a
          href={DEFAULT_SETTINGS.instagram}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-ghost inline-flex h-13 items-center rounded-full px-8 text-[15px]"
        >
          Instagram
        </a>
      </div>
      {error.digest && <p className="mt-10 font-mono text-[11px] text-text-3">Réf. {error.digest}</p>}
    </main>
  );
}
