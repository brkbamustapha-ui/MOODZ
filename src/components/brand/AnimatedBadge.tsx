"use client";

import { motion, useReducedMotion } from "motion/react";
import { useId } from "react";
import {
  BADGE_BRANCH,
  BADGE_DISC_R,
  BADGE_MOTTO,
  BADGE_RING,
  BADGE_SIZE,
  BADGE_STARS,
  BADGE_TITLE,
} from "@/lib/brand/badge";
import { BADGE_BACK_R } from "./Badge";

type Props = {
  className?: string;
  /** Délai avant le début de l'animation (s). */
  delay?: number;
  tagline?: string;
  onDone?: () => void;
};

const EASE = [0.16, 1, 0.3, 1] as const;
const C = BADGE_SIZE / 2;
/** Chaque élément grandit depuis son propre centre. */
const FROM_CENTER = { transformBox: "fill-box", transformOrigin: "center" } as const;
const LETTERS = [...BADGE_TITLE, ...BADGE_MOTTO];

/**
 * Logo animé : la pastille apparaît, l'anneau se trace, le disque olive s'ouvre, la branche
 * éclot feuille après feuille, les lettres s'inscrivent, les étoiles tournent, puis un reflet passe.
 */
export function AnimatedBadge({ className, delay = 0, tagline, onDone }: Props) {
  const reduce = useReducedMotion();
  const id = useId().replace(/:/g, "");
  const at = (s: number) => delay + s;
  const hidden = <T,>(value: T) => (reduce ? false : value);

  return (
    <div className={className}>
      <svg viewBox={`0 0 ${BADGE_SIZE} ${BADGE_SIZE}`} className="block w-full overflow-visible" role="img" aria-label="MOODZ, Feed your mood">
        <defs>
          <linearGradient id={`shine-${id}`} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#fff" stopOpacity="0" />
            <stop offset="0.5" stopColor="#fff" stopOpacity="0.5" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <clipPath id={`clip-${id}`}>
            <circle cx={C} cy={C} r={BADGE_BACK_R} />
          </clipPath>
        </defs>

        <motion.circle
          cx={C}
          cy={C}
          r={BADGE_BACK_R}
          fill="var(--logo-cream)"
          style={FROM_CENTER}
          initial={hidden({ scale: 0.86, opacity: 0 })}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.1, delay: at(0), ease: EASE }}
        />
        <motion.circle
          cx={C}
          cy={C}
          r={BADGE_RING.r}
          fill="none"
          stroke="var(--logo-olive)"
          strokeWidth={BADGE_RING.width}
          transform={`rotate(-90 ${C} ${C})`}
          initial={hidden({ pathLength: 0 })}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.3, delay: at(0.25), ease: [0.65, 0, 0.35, 1] }}
        />
        <motion.circle
          cx={C}
          cy={C}
          r={BADGE_DISC_R}
          fill="var(--logo-olive)"
          style={FROM_CENTER}
          initial={hidden({ scale: 0.2, opacity: 0 })}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 120, damping: 16, delay: at(0.45) }}
        />

        <g fill="var(--logo-cream)">
          {BADGE_BRANCH.map((b, i) => (
            <motion.path
              key={i}
              d={b.d}
              style={FROM_CENTER}
              initial={hidden({ scale: 0, opacity: 0 })}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 170, damping: 15, delay: at(0.95 + i * 0.07) }}
            />
          ))}
        </g>

        <g fill="var(--logo-olive)">
          {LETTERS.map((g, i) => (
            <motion.path
              key={i}
              d={g.d}
              style={FROM_CENTER}
              initial={hidden({ opacity: 0, scale: 0.4 })}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.55, delay: at(1.15 + i * 0.045), ease: EASE }}
            />
          ))}
          {BADGE_STARS.map((d, i) => (
            <motion.path
              key={`e${i}`}
              d={d}
              style={FROM_CENTER}
              initial={hidden({ scale: 0, rotate: -120 })}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 190, damping: 12, delay: at(1.95 + i * 0.1) }}
            />
          ))}
        </g>

        {!reduce && (
          <g clipPath={`url(#clip-${id})`}>
            <g transform={`rotate(20 ${C} ${C})`}>
              <motion.rect
                x={0}
                y={-200}
                width={240}
                height={1400}
                fill={`url(#shine-${id})`}
                initial={{ x: -420 }}
                animate={{ x: 1180 }}
                transition={{ duration: 1.2, delay: at(2.25), ease: [0.45, 0, 0.2, 1] }}
                onAnimationComplete={onDone}
              />
            </g>
          </g>
        )}
      </svg>

      {tagline && (
        <motion.div
          className="mt-[1.4em] flex items-center justify-center gap-4 text-[0.72em] uppercase tracking-[0.42em] text-gold-100"
          initial={hidden({ opacity: 0, y: 8 })}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: at(2.05), ease: EASE }}
        >
          <motion.span
            className="hairline-gold block w-14 origin-right"
            initial={hidden({ scaleX: 0 })}
            animate={{ scaleX: 1 }}
            transition={{ duration: 1, delay: at(2.15), ease: EASE }}
          />
          <span className="whitespace-nowrap pl-[0.42em]">{tagline}</span>
          <motion.span
            className="hairline-gold block w-14 origin-left"
            initial={hidden({ scaleX: 0 })}
            animate={{ scaleX: 1 }}
            transition={{ duration: 1, delay: at(2.15), ease: EASE }}
          />
        </motion.div>
      )}
    </div>
  );
}
