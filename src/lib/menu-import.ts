import type { Variant } from "./types";

export type ParsedItem = { name: string; description: string; price: number; variants: Variant[] };
export type ParsedCategory = { name: string; items: ParsedItem[] };
export type ParseResult = { categories: ParsedCategory[]; warnings: string[] };

const PRICE = String.raw`(\d{1,3}(?:[ .  ]\d{3})+|\d+)(?:[.,]\d{1,2})?\s*(?:da|dzd|dinars?)?`;
const PRICE_RE = new RegExp(PRICE, "i");
const TRAILING_PRICE_RE = new RegExp(`${PRICE}\\s*$`, "i");

function toInt(raw: string): number {
  return Number(raw.replace(/[ .  ]/g, "")) || 0;
}

function cleanName(raw: string): string {
  return raw
    .replace(/[\s.…·_:–—-]+$/u, "")
    .replace(/^[\s•*·–—-]+/u, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function isCategoryLine(line: string): string | null {
  if (line.startsWith("#")) return cleanName(line.replace(/^#+/, ""));
  if (/:\s*$/.test(line) && !PRICE_RE.test(line)) return cleanName(line.replace(/:\s*$/, ""));
  if (!/\d/.test(line) && line === line.toUpperCase() && /[A-ZÀ-Ý]/.test(line)) {
    const name = cleanName(line).toLocaleLowerCase("fr-FR");
    return name.charAt(0).toLocaleUpperCase("fr-FR") + name.slice(1);
  }
  return null;
}

/**
 * Transforme un texte collé (copié depuis une carte existante) en catégories et articles.
 *
 * Formats reconnus :
 *   # Burgers                 (ou "BURGERS", ou "Burgers :")
 *   Classic burger - 900
 *   Burger MOODZ : 1 400 DA | Double steak, cheddar
 *   Margherita - Moyenne 800 / Large 1150
 */
export function parseMenuText(text: string): ParseResult {
  const categories: ParsedCategory[] = [];
  const warnings: string[] = [];
  let current: ParsedCategory | null = null;

  const lines = text.split(/\r?\n/);
  lines.forEach((rawLine, index) => {
    const line = rawLine.trim();
    if (!line) return;

    const categoryName = isCategoryLine(line);
    if (categoryName) {
      current = { name: categoryName.slice(0, 60), items: [] };
      categories.push(current);
      return;
    }

    const [main, ...descParts] = line.split(/\s+\|\s+/);
    const description = descParts.join(" | ").trim().slice(0, 280);

    // Variantes : "Moyenne 800 / Large 1150"
    const segments = main.split(/\s+\/\s+/);
    let name = "";
    let variants: Variant[] = [];
    let price = 0;

    if (segments.length > 1 && segments.every((s) => TRAILING_PRICE_RE.test(s))) {
      const first = segments[0];
      const sep = first.match(/^(.*?)(?:\s[-:–—]\s|\t|\s{2,}|\.{2,}|…)(.*)$/u);
      if (sep) {
        name = cleanName(sep[1]);
        segments[0] = sep[2];
      } else {
        const m = first.match(new RegExp(`^(.*?)\\s+(\\S+)\\s+${PRICE}\\s*$`, "i"));
        name = cleanName(m?.[1] ?? first);
        segments[0] = m ? `${m[2]} ${m[3]}` : first;
      }
      variants = segments
        .map((segment) => {
          const m = segment.trim().match(new RegExp(`^(.*?)\\s*${PRICE}\\s*$`, "i"));
          return { label: cleanName(m?.[1] ?? "") || "Standard", price: toInt(m?.[2] ?? "0") };
        })
        .filter((v) => v.price > 0)
        .slice(0, 8);
      price = variants.length ? Math.min(...variants.map((v) => v.price)) : 0;
    } else {
      const m = main.match(new RegExp(`^(.*?)${PRICE}\\s*$`, "i"));
      if (m) {
        name = cleanName(m[1]);
        price = toInt(m[2]);
      } else {
        name = cleanName(main);
      }
    }

    if (!name) return;
    if (!price) warnings.push(`Ligne ${index + 1} : prix introuvable pour « ${name} »`);
    if (!current) {
      current = { name: "Carte", items: [] };
      categories.push(current);
    }
    (current as ParsedCategory).items.push({ name: name.slice(0, 80), description, price, variants });
  });

  return { categories: categories.filter((c) => c.items.length > 0), warnings };
}
