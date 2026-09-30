import { ImageResponse } from "next/og";
import { BADGE_BRANCH, BADGE_DISC_R, BADGE_SIZE } from "@/lib/brand/badge";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

/** Favicon : le cœur du badge (disque olive et branche d'olivier), lisible en tout petit. */
export default function Icon() {
  const c = BADGE_SIZE / 2;
  // Recadré sur le disque, un peu élargi pour laisser respirer la branche
  const r = BADGE_DISC_R + 6;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex" }}>
        <svg width="64" height="64" viewBox={`${c - r} ${c - r} ${r * 2} ${r * 2}`}>
          <circle cx={c} cy={c} r={r} fill="#738c1f" />
          {BADGE_BRANCH.map((b, i) => (
            <path key={i} d={b.d} fill="#f5f3e3" />
          ))}
        </svg>
      </div>
    ),
    size,
  );
}
