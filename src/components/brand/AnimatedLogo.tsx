"use client";

import { motion, useReducedMotion } from "motion/react";
import { useId } from "react";
import { LOGO_BOUNDS, LOGO_GLYPHS } from "@/lib/brand/logo-glyphs";
import { LOGO_VIEWBOX } from "./LogoMark";

type Props = {
  className?: string;
  /** Délai avant le début de l'animation (s). */
  delay?: number;
  tagline?: string;
  onDone?: () => void;
};

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Logo animé : les lettres se dessinent au trait, se remplissent d'or,
 * puis un reflet lumineux traverse le mot.
 */
export function AnimatedLogo({ className, delay = 0, tagline, onDone }: Props) {
  const reduce = useReducedMotion();
  const id = useId().replace(/:/g, "");
  const width = LOGO_BOUNDS[2] - LOGO_BOUNDS[0];
  const drawEnd = delay + 0.35 + LOGO_GLYPHS.length * 0.12 + 1.1;

  return (
    <div className={className}>
      <svg viewBox={LOGO_VIEWBOX} className="block w-full overflow-visible" role="img" aria-label="MOODZ">
        <defs>
          <linearGradient id={`fill-${id}`} x1="0" y1={LOGO_BOUNDS[1]} x2="0" y2={LOGO_BOUNDS[3]} gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="var(--gold-100)" />
            <stop offset="0.45" stopColor="var(--gold-300)" />
            <stop offset="0.72" stopColor="var(--gold-500)" />
            <stop offset="1" stopColor="var(--gold-200)" />
          </linearGradient>
          <linearGradient id={`shine-${id}`} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#fff" stopOpacity="0" />
            <stop offset="0.5" stopColor="#fffaf0" stopOpacity="0.85" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <clipPath id={`clip-${id}`}>
            {LOGO_GLYPHS.map((g) => (
              <path key={g.char + g.x} d={g.d} />
            ))}
          </clipPath>
        </defs>

        {/* Tracé */}
        <g fill="none" stroke="var(--gold-300)" strokeWidth={0.7} strokeLinejoin="round">
          {LOGO_GLYPHS.map((g, i) => (
            <motion.path
              key={g.char + g.x}
              d={g.d}
              initial={reduce ? false : { pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: [0, 1, 1, 0.35] }}
              transition={{ duration: 1.5, delay: delay + 0.2 + i * 0.12, ease: EASE }}
            />
          ))}
        </g>

        {/* Remplissage or */}
        <motion.g
          fill={`url(#fill-${id})`}
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.9, delay: drawEnd - 0.6, ease: EASE }}
        >
          {LOGO_GLYPHS.map((g) => (
            <path key={g.char + g.x} d={g.d} />
          ))}
        </motion.g>

        {/* Reflet */}
        {!reduce && (
          <g clipPath={`url(#clip-${id})`}>
            <g transform="skewX(-18)">
              <motion.rect
                x={LOGO_BOUNDS[0]}
                y={LOGO_BOUNDS[1] - 10}
                height={LOGO_BOUNDS[3] - LOGO_BOUNDS[1] + 20}
                width={90}
                fill={`url(#shine-${id})`}
                initial={{ x: -140 }}
                animate={{ x: width + 60 }}
                transition={{ duration: 1.3, delay: drawEnd + 0.1, ease: [0.45, 0, 0.2, 1] }}
                onAnimationComplete={onDone}
              />
            </g>
          </g>
        )}
      </svg>

      {tagline && (
        <motion.div
          className="mt-[0.9em] flex items-center justify-center gap-4 text-[0.72em] uppercase tracking-[0.42em] text-gold-200"
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: drawEnd - 0.2, ease: EASE }}
        >
          <motion.span
            className="hairline-gold block w-14 origin-right"
            initial={reduce ? false : { scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 1, delay: drawEnd - 0.1, ease: EASE }}
          />
          <span className="whitespace-nowrap pl-[0.42em]">{tagline}</span>
          <motion.span
            className="hairline-gold block w-14 origin-left"
            initial={reduce ? false : { scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 1, delay: drawEnd - 0.1, ease: EASE }}
          />
        </motion.div>
      )}
    </div>
  );
}
