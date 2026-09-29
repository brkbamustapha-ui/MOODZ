"use client";

import { useInView } from "motion/react";
import dynamic from "next/dynamic";
import { useRef } from "react";

// Forme liquide métallique en WebGL brut (ThreeUI), teintée en or
const LiquidFormBackground = dynamic(
  () => import("@designcodeio/threeui/components/LiquidFormBackground").then((m) => m.LiquidFormBackground),
  { ssr: false },
);

export function LiquidGold({ className = "", hue = 40 }: { className?: string; hue?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const near = useInView(ref, { margin: "300px 0px", once: true });
  return (
    <div ref={ref} className={`absolute inset-0 ${className}`} aria-hidden>
      {near && (
        <LiquidFormBackground speed={0.55} morph={0.9} noiseScale={0.9} mouseAmount={0.2} metal={1} camera={5.8} tintHue={hue} tintAmount={0.72} />
      )}
    </div>
  );
}
