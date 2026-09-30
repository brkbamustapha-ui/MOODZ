"use client";

import { InstagramLogoIcon, TiktokLogoIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { Wordmark } from "@/components/brand/Badge";
import { BrandLogo } from "@/components/brand/BrandLogo";
import type { PublicSettings } from "@/lib/site-config";
import { scrollToId } from "./SmoothScroll";

export function Footer({ settings }: { settings: PublicSettings }) {
  const year = new Date().getFullYear();
  return (
    <footer className="relative overflow-hidden px-4 pb-10 pt-20">
      <div className="hairline-gold mx-auto max-w-[1200px]" />
      <div className="mx-auto mt-16 grid max-w-[1200px] gap-12 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <BrandLogo src={settings.logoDataUrl} alt={settings.restaurantName} className="h-24 w-24" imageClassName="h-14 w-auto object-contain" />
          <p className="mt-5 max-w-[34ch] text-[14px] leading-relaxed text-text-3">
            {settings.tagline}. {settings.address}.
          </p>
        </div>
        <nav aria-label="Liens du pied de page">
          <ul className="space-y-3 text-[14px] text-text-2">
            {[
              ["carte", "La carte"],
              ["signatures", "Signatures"],
              ["maison", "La maison"],
              ["infos", "Horaires et adresse"],
            ].map(([id, label]) => (
              <li key={id}>
                <a
                  href={`#${id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToId(id);
                  }}
                  className="transition-colors duration-500 hover:text-gold-200"
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex flex-col gap-3 text-[14px]">
          <div className="flex gap-2">
            {settings.instagram && (
              <a href={settings.instagram} target="_blank" rel="noopener noreferrer" className="btn-ghost flex h-11 w-11 items-center justify-center rounded-full" aria-label="Instagram">
                <InstagramLogoIcon size={19} weight="light" />
              </a>
            )}
            {settings.tiktok && (
              <a href={settings.tiktok} target="_blank" rel="noopener noreferrer" className="btn-ghost flex h-11 w-11 items-center justify-center rounded-full" aria-label="TikTok">
                <TiktokLogoIcon size={19} weight="light" />
              </a>
            )}
          </div>
          <Link href="/admin" className="mt-3 text-text-3 transition-colors duration-500 hover:text-gold-200">
            Espace gérant
          </Link>
        </div>
      </div>

      <div aria-hidden className="pointer-events-none mx-auto mt-20 max-w-[1400px] opacity-[0.07]">
        <Wordmark className="w-full text-text" />
      </div>

      <p className="mx-auto mt-8 max-w-[1200px] text-center text-[12px] text-text-3">
        © {year} {settings.restaurantName}. Tous droits réservés.
      </p>
    </footer>
  );
}
