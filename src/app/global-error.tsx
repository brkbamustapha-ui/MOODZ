"use client";

import { Badge } from "@/components/brand/Badge";

/** Erreur dans la mise en page racine : document autonome, sans les styles ni les polices du site. */
export default function GlobalError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="fr">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 24px",
          background: "#0c1007",
          color: "#f3f2e4",
          // Couleurs du badge (la feuille de styles du site n'est pas chargée ici)
          ["--logo-olive" as string]: "#738c1f",
          ["--logo-cream" as string]: "#f5f3e3",
          textAlign: "center",
          fontFamily: "Georgia, 'Times New Roman', serif",
        }}
      >
        <title>MOODZ</title>
        <main>
          <div style={{ width: 160, margin: "0 auto" }}>
            <Badge />
          </div>
          <h1 style={{ margin: "36px 0 12px", fontSize: 32, fontWeight: 400 }}>Nous revenons dans un instant</h1>
          <p style={{ margin: 0, fontFamily: "system-ui, sans-serif", fontSize: 15, color: "#979c80" }}>
            Le site est momentanément indisponible.
          </p>
          <button
            type="button"
            onClick={() => retry()}
            style={{
              marginTop: 32,
              height: 50,
              padding: "0 30px",
              border: 0,
              borderRadius: 999,
              background: "linear-gradient(180deg, #7f9a24, #5c7118)",
              color: "#f6f5e8",
              fontFamily: "system-ui, sans-serif",
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Réessayer
          </button>
        </main>
      </body>
    </html>
  );
}
