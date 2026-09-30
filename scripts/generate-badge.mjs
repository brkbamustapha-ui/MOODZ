/**
 * Génère le badge MOODZ « Feed your mood » en tracés vectoriels, d'après le logo de la carte :
 * anneau fin, « MOODZ » en arc en haut, « FEED YOUR MOOD » en arc en bas, deux étoiles,
 * disque olive portant une branche d'olivier (tige, feuilles, deux olives).
 * Textes : police Roboto Slab Black (SIL OFL 1.1), convertie en tracés.
 * Les tracés servent au logo SVG, à l'intro animée, aux icônes et au badge 3D (Three.js).
 *
 * Usage : node scripts/generate-badge.mjs [chemin/vers/RobotoSlab-Black.ttf]
 * Sans argument, la police est téléchargée depuis Google Fonts.
 */
import fs from "node:fs";
import path from "node:path";
import * as opentypeModule from "opentype.js";

const opentype = opentypeModule.parse ? opentypeModule : opentypeModule.default;

// Géométrie du badge (unités SVG, carré de 1000, centre 500, 500), mesurée sur le logo de la carte
const SIZE = 1000;
const C = SIZE / 2;
const RING_R = 452; // anneau extérieur (milieu du trait)
const RING_W = 7;
const DISC_R = 292; // disque olive
const TITLE = { text: "MOODZ", baseline: 316, capHeight: 98, tracking: 0 };
const MOTTO = { text: "FEED YOUR MOOD", baseline: 404, capHeight: 74, tracking: 0 };
const STAR = { r: 366, outer: 31, inner: 13.5 };

async function loadFontBuffer() {
  const local = process.argv[2];
  if (local) return fs.readFileSync(local);
  const css = await fetch("https://fonts.googleapis.com/css2?family=Roboto+Slab:wght@900", {
    headers: { "User-Agent": "Wget/1.0" },
  }).then((r) => r.text());
  const url = css.match(/https:\/\/[^)]+\.ttf/)?.[0];
  if (!url) throw new Error("URL de police introuvable");
  return Buffer.from(await fetch(url).then((r) => r.arrayBuffer()));
}

const buf = await loadFontBuffer();
const font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));

const f = (n) => {
  const r = Math.round(n * 10) / 10;
  return Object.is(r, -0) ? "0" : String(r);
};

/** Applique une transformation affine aux commandes d'un tracé opentype et les sérialise. */
function transformPath(commands, map) {
  let out = "";
  for (const c of commands) {
    if (c.type === "Z") {
      out += "Z";
      continue;
    }
    const [x, y] = map(c.x, c.y);
    if (c.type === "M" || c.type === "L") out += `${c.type}${f(x)} ${f(y)}`;
    else if (c.type === "Q") {
      const [x1, y1] = map(c.x1, c.y1);
      out += `Q${f(x1)} ${f(y1)} ${f(x)} ${f(y)}`;
    } else if (c.type === "C") {
      const [x1, y1] = map(c.x1, c.y1);
      const [x2, y2] = map(c.x2, c.y2);
      out += `C${f(x1)} ${f(y1)} ${f(x2)} ${f(y2)} ${f(x)} ${f(y)}`;
    } else throw new Error(`Commande inconnue : ${c.type}`);
  }
  return out;
}

/**
 * Texte disposé en arc. `top` : lettres dressées vers l'extérieur, lecture de gauche à droite
 * par le haut ; sinon lettres dressées vers le centre, lecture de gauche à droite par le bas.
 * Glyphe par glyphe (sans mise en forme OpenType), crénage compris.
 */
function arcText({ text, baseline, capHeight, tracking }, top) {
  const capUnits = font.tables.os2?.sCapHeight || font.charToGlyph("H").getBoundingBox().y2;
  const size = (capHeight / capUnits) * font.unitsPerEm;
  const scale = size / font.unitsPerEm;
  const glyphs = [...text].map((ch) => font.charToGlyph(ch));
  // Position du centre de chaque glyphe le long du texte
  const centers = [];
  let x = 0;
  glyphs.forEach((g, i) => {
    if (i > 0) x += font.getKerningValue(glyphs[i - 1], g) * scale + tracking * size;
    // Espaces un peu plus larges, comme sur le logo
    const w = g.advanceWidth * scale * (text[i] === " " ? 1.35 : 1);
    centers.push(x + w / 2);
    x += w;
  });
  const total = x;
  return glyphs
    .map((g, i) => {
      const ch = text[i];
      if (ch === " ") return null;
      const w = g.advanceWidth * scale;
      const angle = (centers[i] - total / 2) / baseline;
      const path = g.getPath(-w / 2, 0, size);
      const map = top
        ? (px, py) => {
            // Haut : angle compté depuis midi, sens horaire
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            return [C + baseline * sin + px * cos - py * sin, C - baseline * cos + px * sin + py * cos];
          }
        : (px, py) => {
            // Bas : angle compté depuis six heures, vers la droite
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            return [C + baseline * sin + px * cos + py * sin, C + baseline * cos - px * sin + py * cos];
          };
      return { char: ch, d: transformPath(path.commands, map) };
    })
    .filter(Boolean);
}

function star(cx, cy, outer, inner) {
  let d = "";
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    d += `${i === 0 ? "M" : "L"}${f(cx + r * Math.cos(a))} ${f(cy + r * Math.sin(a))}`;
  }
  return d + "Z";
}

/* --------------------------- Branche d'olivier --------------------------- */

const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const mul = (a, k) => [a[0] * k, a[1] * k];
const len = (a) => Math.hypot(a[0], a[1]);
const pt = (p) => `${f(p[0])} ${f(p[1])}`;

/**
 * Feuille en amande, pointue aux deux bouts : `bend` courbe la nervure (positif : vers la gauche
 * du sens base -> pointe), `belly` décale le point le plus large vers la base (0,5 = centré).
 */
function leaf(base, tip, width, bend = 0, belly = 0.42) {
  const axis = sub(tip, base);
  const L = len(axis);
  const u = mul(axis, 1 / L);
  const n = [u[1], -u[0]]; // normale à gauche (repère SVG, y vers le bas)
  const w = width / 2;
  const at = (t, off) => add(add(base, mul(u, L * t)), mul(n, off + bend * 4 * t * (1 - t)));
  const l1 = at(belly * 0.55, w * 1.18);
  const l2 = at(belly + 0.36, w * 0.92);
  const r2 = at(belly + 0.36, -w * 0.92);
  const r1 = at(belly * 0.55, -w * 1.18);
  return `M${pt(base)}C${pt(l1)} ${pt(l2)} ${pt(tip)}C${pt(r2)} ${pt(r1)} ${pt(base)}Z`;
}

/** Ellipse inclinée (quatre arcs de Bézier). */
function ellipse(cx, cy, rx, ry, rotation) {
  const k = 0.5523;
  const c = Math.cos(rotation);
  const s = Math.sin(rotation);
  const p = (x, y) => [cx + x * c - y * s, cy + x * s + y * c];
  const pts = [
    [p(rx, 0), p(rx, ry * k), p(rx * k, ry), p(0, ry)],
    [p(0, ry), p(-rx * k, ry), p(-rx, ry * k), p(-rx, 0)],
    [p(-rx, 0), p(-rx, -ry * k), p(-rx * k, -ry), p(0, -ry)],
    [p(0, -ry), p(rx * k, -ry), p(rx, -ry * k), p(rx, 0)],
  ];
  return `M${pt(pts[0][0])}` + pts.map(([, c1, c2, e]) => `C${pt(c1)} ${pt(c2)} ${pt(e)}`).join("") + "Z";
}

/** Tige effilée le long d'une courbe de Bézier cubique (contour échantillonné). */
function stem(p0, p1, p2, p3, w0, w1, steps = 28) {
  const bez = (t) => {
    const mt = 1 - t;
    return add(add(mul(p0, mt * mt * mt), mul(p1, 3 * mt * mt * t)), add(mul(p2, 3 * mt * t * t), mul(p3, t * t * t)));
  };
  const left = [];
  const right = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = bez(Math.max(0, t - 0.01));
    const b = bez(Math.min(1, t + 0.01));
    const d = sub(b, a);
    const n = mul([d[1], -d[0]], 1 / len(d));
    const w = (w0 + (w1 - w0) * t) / 2;
    const c = bez(t);
    left.push(add(c, mul(n, w)));
    right.push(add(c, mul(n, -w)));
  }
  const all = [...left, ...right.reverse()];
  return `M${pt(all[0])}` + all.slice(1).map((p) => `L${pt(p)}`).join("") + "Z";
}

// Disposition relevée sur le logo (repère du badge : centre 500, 500 ; disque de rayon 292)
const branch = [
  // Tige : du bas à gauche vers le haut, jusqu'à la grande feuille du sommet
  { kind: "stem", d: stem([372, 704], [428, 648], [486, 596], [521, 540], 11, 7) },
  // Grande feuille du sommet, courbée vers la gauche
  { kind: "leaf", d: leaf([524, 556], [436, 314], 82, -54, 0.44) },
  // Grande feuille haute, vers la droite
  { kind: "leaf", d: leaf([542, 528], [714, 358], 88, -16, 0.46) },
  // Grande feuille basse, large, vers la droite
  { kind: "leaf", d: leaf([462, 692], [738, 544], 120, 30, 0.5) },
  // Bourgeons
  { kind: "leaf", d: leaf([531, 394], [524, 328], 20, 3, 0.5) },
  { kind: "leaf", d: leaf([568, 412], [592, 358], 24, -3, 0.5) },
  // Petites feuilles à gauche
  { kind: "leaf", d: leaf([330, 344], [404, 376], 34, -6, 0.5) },
  { kind: "leaf", d: leaf([258, 412], [301, 470], 30, 5, 0.5) },
  // Olives
  { kind: "olive", d: ellipse(314, 568, 56, 43, -0.22) },
  { kind: "olive", d: ellipse(418, 500, 33, 40, 0.18) },
];

/** Mot « MOODZ » droit, dans la même police (pied de page, en-têtes). */
function wordmark(text, capHeight, tracking) {
  const capUnits = font.tables.os2?.sCapHeight || font.charToGlyph("H").getBoundingBox().y2;
  const size = (capHeight / capUnits) * font.unitsPerEm;
  const scale = size / font.unitsPerEm;
  const glyphs = [...text].map((ch) => font.charToGlyph(ch));
  let x = 0;
  const paths = glyphs.map((g, i) => {
    if (i > 0) x += font.getKerningValue(glyphs[i - 1], g) * scale + tracking * size;
    const path = g.getPath(x, 0, size);
    x += g.advanceWidth * scale;
    return { char: text[i], d: transformPath(path.commands, (px, py) => [px, py]), box: path.getBoundingBox() };
  });
  const minX = Math.min(...paths.map((p) => p.box.x1));
  const maxX = Math.max(...paths.map((p) => p.box.x2));
  const minY = Math.min(...paths.map((p) => p.box.y1));
  const maxY = Math.max(...paths.map((p) => p.box.y2));
  return { glyphs: paths.map(({ char, d }) => ({ char, d })), bounds: [minX, minY, maxX, maxY].map((n) => Math.round(n * 10) / 10) };
}

const title = arcText(TITLE, true);
const motto = arcText(MOTTO, false);
const stars = [star(C - STAR.r, C, STAR.outer, STAR.inner), star(C + STAR.r, C, STAR.outer, STAR.inner)];

const header = `// Fichier généré par scripts/generate-badge.mjs. Ne pas modifier à la main.
// Badge MOODZ « Feed your mood » redessiné d'après le logo de la carte.
// Textes : tracés de la police Roboto Slab Black (SIL Open Font License 1.1).
`;

const body = `
export type BadgePath = { char?: string; kind?: "stem" | "leaf" | "olive"; d: string };

/** Repère : carré de BADGE_SIZE unités, centre au milieu. */
export const BADGE_SIZE = ${SIZE};

/** Anneau extérieur (rayon au milieu du trait) et disque central. */
export const BADGE_RING = { r: ${RING_R}, width: ${RING_W} } as const;
export const BADGE_DISC_R = ${DISC_R};

/** « MOODZ » en arc (haut). */
export const BADGE_TITLE: BadgePath[] = ${JSON.stringify(title, null, 2)};

/** « FEED YOUR MOOD » en arc (bas). */
export const BADGE_MOTTO: BadgePath[] = ${JSON.stringify(motto, null, 2)};

/** Étoiles à gauche et à droite. */
export const BADGE_STARS: string[] = ${JSON.stringify(stars, null, 2)};

/** Branche d'olivier du disque central (tige, feuilles, olives), dans l'ordre de dessin. */
export const BADGE_BRANCH: BadgePath[] = ${JSON.stringify(branch, null, 2)};

/** « MOODZ » droit, même police que le badge ; bounds : [minX, minY, maxX, maxY]. */
export const WORDMARK: { glyphs: BadgePath[]; bounds: [number, number, number, number] } = ${JSON.stringify(wordmark("MOODZ", 100, 0.04), null, 2)};
`;

const out = path.join(path.dirname(new URL(import.meta.url).pathname), "..", "src", "lib", "brand", "badge.ts");
fs.writeFileSync(out, header + body);
console.log(`Badge écrit : ${out} (${title.length + motto.length} lettres, ${branch.length} éléments de branche)`);
