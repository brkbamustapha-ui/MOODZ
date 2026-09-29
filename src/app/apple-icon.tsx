import { ImageResponse } from "next/og";
import { LOGO_BOUNDS, LOGO_GLYPHS } from "@/lib/brand/logo-glyphs";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Icône d'écran d'accueil (iPhone) : logotype MOODZ doré. */
export default function AppleIcon() {
  const [minX, minY, maxX, maxY] = LOGO_BOUNDS;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0b0a09" }}>
        <svg width="150" height="30" viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`}>
          {LOGO_GLYPHS.map((g) => (
            <path key={g.char + g.x} d={g.d} fill="#e2c07a" />
          ))}
        </svg>
      </div>
    ),
    size,
  );
}
