import { ImageResponse } from "next/og";
import { Badge, LOGO_COLORS } from "@/components/brand/Badge";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Icône d'écran d'accueil (iPhone) : le badge MOODZ sur fond olive profond. */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0c1007" }}>
        <Badge size={160} title="" compact {...LOGO_COLORS} />
      </div>
    ),
    size,
  );
}
