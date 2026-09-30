import {
  BADGE_BRANCH,
  BADGE_DISC_R,
  BADGE_MOTTO,
  BADGE_RING,
  BADGE_SIZE,
  BADGE_STARS,
  BADGE_TITLE,
  WORDMARK,
} from "@/lib/brand/badge";

const C = BADGE_SIZE / 2;
/** Rayon de la pastille crème qui porte le badge (version « sticker »). */
export const BADGE_BACK_R = 492;

type BadgeProps = {
  className?: string;
  /** "sticker" : couleurs du logo sur pastille crème ; "light" : traits crème, pour fond sombre. */
  tone?: "sticker" | "light";
  /** Anneau plus épais pour les petites tailles (navigation, icônes). */
  compact?: boolean;
  title?: string;
  /** Taille fixe en pixels (images générées) ; sinon la taille vient de className. */
  size?: number;
  /** Couleurs explicites (images générées, sans la feuille de styles du site). */
  olive?: string;
  cream?: string;
};

/** Logo MOODZ « Feed your mood » (vectoriel, net à toutes les tailles). Couleurs fixes du logo. */
export function Badge({
  className,
  tone = "sticker",
  compact = false,
  title = "MOODZ, Feed your mood",
  size,
  olive = "var(--logo-olive)",
  cream = "var(--logo-cream)",
}: BadgeProps) {
  const ink = tone === "sticker" ? olive : cream;
  return (
    <svg viewBox={`0 0 ${BADGE_SIZE} ${BADGE_SIZE}`} width={size} height={size} className={className} role="img" aria-label={title}>
      {title && <title>{title}</title>}
      {tone === "sticker" && <circle cx={C} cy={C} r={BADGE_BACK_R} fill={cream} />}
      <circle cx={C} cy={C} r={BADGE_RING.r} fill="none" stroke={ink} strokeWidth={BADGE_RING.width * (compact ? 2.4 : 1)} />
      <circle cx={C} cy={C} r={BADGE_DISC_R} fill={olive} />
      {[...BADGE_TITLE, ...BADGE_MOTTO].map((g, i) => (
        <path key={i} d={g.d} fill={ink} />
      ))}
      {BADGE_STARS.map((d, i) => (
        <path key={`e${i}`} d={d} fill={ink} />
      ))}
      {BADGE_BRANCH.map((b, i) => (
        <path key={`b${i}`} d={b.d} fill={cream} />
      ))}
    </svg>
  );
}

/** Couleurs du logo, pour les images générées (icônes, aperçu de partage). */
export const LOGO_COLORS = { olive: "#738c1f", cream: "#f5f3e3" } as const;

const [WX0, WY0, WX1, WY1] = WORDMARK.bounds;
const PAD = 4;
export const WORDMARK_VIEWBOX = `${WX0 - PAD} ${WY0 - PAD} ${WX1 - WX0 + PAD * 2} ${WY1 - WY0 + PAD * 2}`;

/** Mot « MOODZ » droit, dans la police du badge (couleur courante). */
export function Wordmark({ className, title = "MOODZ" }: { className?: string; title?: string }) {
  return (
    <svg viewBox={WORDMARK_VIEWBOX} className={className} role="img" aria-label={title}>
      <title>{title}</title>
      <g fill="currentColor">
        {WORDMARK.glyphs.map((g, i) => (
          <path key={i} d={g.d} />
        ))}
      </g>
    </svg>
  );
}
