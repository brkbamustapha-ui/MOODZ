/** Outils de couleur partagés (thème, icônes). */

function channels(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Luminance relative (WCAG), de 0 (noir) à 1 (blanc). */
export function luminance(hex: string): number {
  const rgb = channels(hex);
  if (!rgb) return 0;
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Accent clair (or, sable...) : texte foncé sur les boutons ; accent soutenu (olive du logo...) :
 * texte crème. Au-delà de 0,35, le crème ne se lit plus assez sur l'accent.
 */
export function accentTone(hex: string): "light" | "deep" {
  return luminance(hex) > 0.35 ? "light" : "deep";
}

/** Teinte (0 à 360°) d'une couleur hexadécimale, pour teinter les effets. */
export function hue(hex: string): number {
  const rgb = channels(hex);
  if (!rgb) return 0;
  const [r, g, b] = rgb.map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (d === 0) return 0;
  let h: number;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return Math.round(((h * 60) + 360) % 360);
}
