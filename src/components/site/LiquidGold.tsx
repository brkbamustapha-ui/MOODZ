"use client";

import { useInView } from "motion/react";
import dynamic from "next/dynamic";
import { useRef } from "react";
import { useMediaQuery } from "@/lib/hooks/useMediaQuery";

// Forme liquide métallique en WebGL brut (ThreeUI), teintée en or
const LiquidFormBackground = dynamic(
  () => import("@designcodeio/threeui/components/LiquidFormBackground").then((m) => m.LiquidFormBackground),
  { ssr: false },
);

/**
 * Or liquide. Sur écran tactile, la version WebGL (lancer de rayons sur chaque pixel) sature le
 * processeur graphique d'un téléphone et fait saccader le défilement : on affiche à la place un
 * or poli immobile, parcouru d'un reflet animé par le compositeur.
 */
export function LiquidGold({ className = "", hue = 40 }: { className?: string; hue?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const near = useInView(ref, { margin: "300px 0px", once: true });
  const touch = useMediaQuery("(hover: none), (pointer: coarse)");
  return (
    <div ref={ref} className={`absolute inset-0 ${className}`} aria-hidden>
      {touch ? (
        <div className="liquid-still" />
      ) : (
        near && (
          <LiquidFormBackground speed={0.55} morph={0.9} noiseScale={0.9} mouseAmount={0.2} metal={1} camera={5.8} tintHue={hue} tintAmount={0.72} />
        )
      )}
    </div>
  );
}
