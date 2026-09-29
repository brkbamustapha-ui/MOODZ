/**
 * Génère les tracés vectoriels du logo MOODZ à partir de la police Cinzel (SIL OFL 1.1).
 * Les tracés servent à la fois au logo SVG animé et au logo 3D extrudé (Three.js).
 *
 * Usage : node scripts/generate-logo.mjs [chemin/vers/Cinzel.ttf]
 * Sans argument, la police est téléchargée depuis Google Fonts.
 */
import fs from "node:fs";
import path from "node:path";
import opentypeModule from "opentype.js";

const opentype = opentypeModule.parse ? opentypeModule : opentypeModule.default;

const WORD = "MOODZ";
const UNITS = 100; // taille de rendu (unités SVG)
const TRACKING = 0.14; // espacement entre lettres (em)

async function loadFontBuffer() {
  const local = process.argv[2];
  if (local) return fs.readFileSync(local);
  const css = await fetch("https://fonts.googleapis.com/css2?family=Cinzel:wght@600", {
    headers: { "User-Agent": "Wget/1.0" },
  }).then((r) => r.text());
  const url = css.match(/https:\/\/[^)]+\.ttf/)?.[0];
  if (!url) throw new Error("URL de police introuvable");
  return Buffer.from(await fetch(url).then((r) => r.arrayBuffer()));
}

const buf = await loadFontBuffer();
const font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));

/** Sérialisation maison : toPathData() d'opentype.js produit parfois "NaN" (ex. 465.00000000000006). */
function toPathData(commands) {
  const f = (n) => {
    const r = Math.round(n * 100) / 100;
    return Object.is(r, -0) ? "0" : String(r);
  };
  let open = false;
  const out = commands
    .map((c) => {
      switch (c.type) {
        case "M": {
          // Ferme explicitement le contour précédent (utile pour l'animation du tracé)
          const prefix = open ? "Z" : "";
          open = true;
          return `${prefix}M${f(c.x)} ${f(c.y)}`;
        }
        case "L":
          return `L${f(c.x)} ${f(c.y)}`;
        case "Q":
          return `Q${f(c.x1)} ${f(c.y1)} ${f(c.x)} ${f(c.y)}`;
        case "C":
          return `C${f(c.x1)} ${f(c.y1)} ${f(c.x2)} ${f(c.y2)} ${f(c.x)} ${f(c.y)}`;
        case "Z":
          open = false;
          return "Z";
        default:
          throw new Error(`Commande inconnue : ${c.type}`);
      }
    })
    .join("");
  return open ? `${out}Z` : out;
}

const glyphs = [];
let x = 0;
for (const ch of WORD) {
  const glyph = font.charToGlyph(ch);
  const p = glyph.getPath(x, 0, UNITS);
  const bb = p.getBoundingBox();
  glyphs.push({
    char: ch,
    d: toPathData(p.commands),
    x,
    advance: (glyph.advanceWidth / font.unitsPerEm) * UNITS,
    bbox: [bb.x1, bb.y1, bb.x2, bb.y2].map((n) => Math.round(n * 100) / 100),
  });
  x += (glyph.advanceWidth / font.unitsPerEm) * UNITS + TRACKING * UNITS;
}

const minX = Math.min(...glyphs.map((g) => g.bbox[0]));
const minY = Math.min(...glyphs.map((g) => g.bbox[1]));
const maxX = Math.max(...glyphs.map((g) => g.bbox[2]));
const maxY = Math.max(...glyphs.map((g) => g.bbox[3]));

const out = `// Fichier généré par scripts/generate-logo.mjs. Ne pas modifier à la main.
// Tracés dérivés de la police Cinzel (SIL Open Font License 1.1).

export type LogoGlyph = {
  char: string;
  /** Tracé SVG (axe Y vers le bas, ligne de base à y = 0). */
  d: string;
  x: number;
  advance: number;
  bbox: [number, number, number, number];
};

export const LOGO_GLYPHS: LogoGlyph[] = ${JSON.stringify(glyphs, null, 2)};

/** Boîte englobante du mot complet : [minX, minY, maxX, maxY]. */
export const LOGO_BOUNDS = [${[minX, minY, maxX, maxY].map((n) => Math.round(n * 100) / 100).join(", ")}] as const;
`;

const target = path.join(process.cwd(), "src/lib/brand/logo-glyphs.ts");
fs.writeFileSync(target, out);
console.log(`Logo généré : ${target} (${glyphs.length} glyphes, largeur ${Math.round(maxX - minX)})`);
