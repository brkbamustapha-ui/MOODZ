"use client";

import { LogoMark } from "./LogoMark";

/**
 * Logo du site : le logo importé par le gérant s'il existe (Réglages > Apparence),
 * sinon le logotype MOODZ vectoriel.
 */
export function BrandLogo({
  src,
  className,
  imageClassName,
  tone,
  alt = "MOODZ",
}: {
  src?: string | null;
  className?: string;
  imageClassName?: string;
  tone?: "metal" | "solid";
  alt?: string;
}) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} className={imageClassName ?? className} />;
  }
  return <LogoMark className={className} tone={tone} title={alt} />;
}
