"use client";

import { useId } from "react";
import { LOGO_BOUNDS, LOGO_GLYPHS } from "@/lib/brand/logo-glyphs";

const PAD = 4;
export const LOGO_VIEWBOX = `${LOGO_BOUNDS[0] - PAD} ${LOGO_BOUNDS[1] - PAD} ${LOGO_BOUNDS[2] - LOGO_BOUNDS[0] + PAD * 2} ${LOGO_BOUNDS[3] - LOGO_BOUNDS[1] + PAD * 2}`;

type Props = {
  className?: string;
  /** "metal" : dégradé or ; "solid" : couleur courante */
  tone?: "metal" | "solid";
  title?: string;
};

/** Logotype MOODZ statique (vectoriel, net à toutes les tailles). */
export function LogoMark({ className, tone = "metal", title = "MOODZ" }: Props) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox={LOGO_VIEWBOX} className={className} role="img" aria-label={title}>
      <title>{title}</title>
      <defs>
        <linearGradient id={`m-${id}`} x1="0" y1={LOGO_BOUNDS[1]} x2="0" y2={LOGO_BOUNDS[3]} gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="var(--gold-100)" />
          <stop offset="0.45" stopColor="var(--gold-300)" />
          <stop offset="0.7" stopColor="var(--gold-500)" />
          <stop offset="1" stopColor="var(--gold-200)" />
        </linearGradient>
      </defs>
      <g fill={tone === "metal" ? `url(#m-${id})` : "currentColor"}>
        {LOGO_GLYPHS.map((g) => (
          <path key={g.char + g.x} d={g.d} />
        ))}
      </g>
    </svg>
  );
}
