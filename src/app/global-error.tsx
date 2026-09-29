"use client";

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
          background: "#0b0a09",
          color: "#ece4d6",
          textAlign: "center",
          fontFamily: "Georgia, 'Times New Roman', serif",
        }}
      >
        <title>MOODZ</title>
        <main>
          <p style={{ margin: 0, fontSize: 30, letterSpacing: "0.32em", color: "#d8b46a" }}>MOODZ</p>
          <h1 style={{ margin: "36px 0 12px", fontSize: 32, fontWeight: 400 }}>Nous revenons dans un instant</h1>
          <p style={{ margin: 0, fontFamily: "system-ui, sans-serif", fontSize: 15, color: "#a39a8a" }}>
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
              background: "linear-gradient(180deg, #f1dca5, #c79f57)",
              color: "#1a140b",
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
