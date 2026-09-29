import { ImageResponse } from "next/og";
import { LOGO_BOUNDS, LOGO_GLYPHS } from "@/lib/brand/logo-glyphs";

export const alt = "MOODZ, café et restaurant à Gambetta, Oran";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Aperçu de partage (WhatsApp, Instagram, Facebook...). */
export default function OpengraphImage() {
  const [minX, minY, maxX, maxY] = LOGO_BOUNDS;
  const width = 760;
  const height = (width * (maxY - minY)) / (maxX - minX);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "radial-gradient(circle at 50% 42%, #2a2114 0%, #0b0a09 62%)",
          color: "#cbc1b0",
        }}
      >
        <svg width={width} height={height} viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`}>
          <defs>
            <linearGradient id="g" x1="0" y1={minY} x2="0" y2={maxY} gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#f6e3b4" />
              <stop offset="0.5" stopColor="#d8b46a" />
              <stop offset="1" stopColor="#9c7433" />
            </linearGradient>
          </defs>
          {LOGO_GLYPHS.map((g) => (
            <path key={g.char + g.x} d={g.d} fill="url(#g)" />
          ))}
        </svg>
        <div style={{ display: "flex", alignItems: "center", gap: 24, marginTop: 44, fontSize: 30, letterSpacing: 12, color: "#e2c07a" }}>
          <div style={{ width: 90, height: 1, background: "#b99650" }} />
          CAFÉ · RESTAURANT
          <div style={{ width: 90, height: 1, background: "#b99650" }} />
        </div>
        <div style={{ marginTop: 26, fontSize: 28, color: "#9a907f" }}>Gambetta, Oran. Commandez en ligne.</div>
      </div>
    ),
    size,
  );
}
