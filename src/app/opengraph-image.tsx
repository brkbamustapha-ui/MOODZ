import { ImageResponse } from "next/og";
import { Badge, LOGO_COLORS } from "@/components/brand/Badge";

export const alt = "MOODZ, Feed your mood : restaurant à Gambetta, Oran";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Aperçu de partage (WhatsApp, Instagram, Facebook...) : le badge sur fond olive profond. */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 72,
          background: "radial-gradient(circle at 34% 50%, #2c3a12 0%, #0c1007 64%)",
          color: "#c9cdb2",
        }}
      >
        <Badge size={380} title="" {...LOGO_COLORS} />
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 520 }}>
          <div style={{ fontSize: 26, letterSpacing: 10, color: "#b9c77f" }}>FEED YOUR MOOD</div>
          <div style={{ marginTop: 22, fontSize: 64, lineHeight: 1.05, color: "#f3f2e4" }}>Restaurant à Gambetta, Oran</div>
          <div style={{ marginTop: 26, fontSize: 28, color: "#979c80" }}>Pizzas, burgers, tacos, sandwichs. Commandez en ligne.</div>
        </div>
      </div>
    ),
    size,
  );
}
