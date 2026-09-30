import { Badge } from "./Badge";

/**
 * Logo du site : le logo importé par le gérant s'il existe (Réglages > Apparence),
 * sinon le badge MOODZ « Feed your mood ».
 */
export function BrandLogo({
  src,
  className,
  imageClassName,
  alt = "MOODZ",
}: {
  src?: string | null;
  className?: string;
  imageClassName?: string;
  alt?: string;
}) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} className={imageClassName ?? className} />;
  }
  return <Badge className={className} compact title={`${alt}, Feed your mood`} />;
}
