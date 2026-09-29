import { ImageResponse } from "next/og";
import { LOGO_GLYPHS } from "@/lib/brand/logo-glyphs";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

/** Favicon : le M du logotype (tracé Cinzel) en or sur fond noir. */
export default function Icon() {
  const m = LOGO_GLYPHS[0];
  const [minX, minY, maxX, maxY] = m.bbox;
  const width = 40;
  const height = Math.round((width * (maxY - minY)) / (maxX - minX));
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0b0a09",
          borderRadius: 14,
          border: "3px solid #b99650",
        }}
      >
        <svg width={width} height={height} viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`}>
          <path d={m.d} fill="#e9cd8c" />
        </svg>
      </div>
    ),
    size,
  );
}
