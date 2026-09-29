"use client";

import { MotionConfig } from "motion/react";
import { useMemo } from "react";
import type { OpenStatus } from "@/lib/hours";
import type { PublicSettings } from "@/lib/site-config";
import type { PublicCategory } from "@/lib/types";
import { CartDrawer } from "./cart/CartDrawer";
import { CartProvider } from "./cart/CartContext";
import { CartIsland } from "./cart/CartIsland";
import { Experience } from "./Experience";
import { Footer } from "./Footer";
import { Hero } from "./hero/Hero";
import { Infos } from "./Infos";
import { Intro, useIntroDone } from "./Intro";
import { MenuSection } from "./menu/MenuSection";
import { Nav } from "./Nav";
import { Signatures } from "./Signatures";
import { SmoothScroll } from "./SmoothScroll";

type Props = {
  menu: PublicCategory[];
  settings: PublicSettings;
  status: OpenStatus;
};

export function SiteShell({ menu, settings, status }: Props) {
  const play = useIntroDone();
  const signatures = useMemo(() => menu.flatMap((c) => c.items).filter((i) => i.tags.includes("signature")), [menu]);
  const bandWords = useMemo(() => menu.map((c) => c.name.split(/\s+[&,]\s+|\s+et\s+/i)[0]).slice(0, 8), [menu]);

  return (
    <MotionConfig reducedMotion="user">
      <CartProvider menu={menu}>
        <SmoothScroll />
        <Intro tagline={settings.tagline} logoUrl={settings.logoDataUrl} />
        <Nav settings={settings} />
        <main className="w-full max-w-full overflow-x-clip">
          <Hero settings={settings} status={status} play={play} />
          <Signatures items={signatures} />
          <MenuSection menu={menu} />
          <Experience title={settings.aboutTitle} text={settings.aboutText} words={bandWords} />
          <Infos settings={settings} status={status} />
        </main>
        <Footer settings={settings} />
        <CartIsland />
        <CartDrawer settings={settings} status={status} />
      </CartProvider>
    </MotionConfig>
  );
}
