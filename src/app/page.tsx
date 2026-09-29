import { introBootScript } from "@/components/site/Intro";
import { SiteShell } from "@/components/site/SiteShell";
import { getOpenStatus } from "@/lib/hours";
import { getPublicMenu } from "@/lib/server/menu";
import { getSettings, toPublicSettings } from "@/lib/server/settings";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [menu, settings] = await Promise.all([getPublicMenu(), getSettings()]);
  const status = getOpenStatus(settings.hours);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  // Données structurées : restaurant et carte (référencement Google)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: settings.restaurantName,
    description: settings.heroSubtitle,
    address: { "@type": "PostalAddress", streetAddress: settings.address, addressLocality: "Oran", addressCountry: "DZ" },
    telephone: settings.phone || undefined,
    url: siteUrl || undefined,
    servesCuisine: ["Café", "Brunch", "Burgers", "Pizzas", "Desserts"],
    priceRange: "DA",
    sameAs: [settings.instagram, settings.tiktok].filter(Boolean),
    hasMenu: {
      "@type": "Menu",
      hasMenuSection: menu.map((c) => ({
        "@type": "MenuSection",
        name: c.name,
        hasMenuItem: c.items.map((i) => ({
          "@type": "MenuItem",
          name: i.name,
          description: i.description || undefined,
          offers: { "@type": "Offer", price: i.variants[0]?.price ?? i.price, priceCurrency: "DZD" },
        })),
      })),
    },
  };

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: introBootScript }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <SiteShell menu={menu} settings={toPublicSettings(settings)} status={status} />
    </>
  );
}
