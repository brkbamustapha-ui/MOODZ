import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Geist, Geist_Mono } from "next/font/google";
import { getSettings } from "@/lib/server/settings";
import { getSiteUrl } from "@/lib/site-url";
import "./globals.css";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"], display: "swap" });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"], display: "swap" });
const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: siteUrl ? new URL(siteUrl) : undefined,
  title: {
    default: "MOODZ | Café · Restaurant à Gambetta, Oran",
    template: "%s | MOODZ",
  },
  description:
    "MOODZ, café-restaurant à Gambetta, Oran. Découvrez la carte et commandez en ligne : à emporter, en livraison ou sur place.",
  applicationName: "MOODZ",
  openGraph: {
    type: "website",
    locale: "fr_DZ",
    siteName: "MOODZ",
    title: "MOODZ | Café · Restaurant à Oran",
    description: "La carte MOODZ en ligne. Commandez, nous confirmons rapidement.",
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#0b0a09",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const settings = await getSettings().catch(() => null);
  const accent = settings?.theme.accent ?? "#d8b46a";

  return (
    <html
      lang="fr"
      className={`${geist.variable} ${geistMono.variable} ${cormorant.variable} antialiased`}
      style={{ ["--accent" as string]: accent }}
      suppressHydrationWarning
    >
      <body className="grain min-h-dvh overflow-x-clip">{children}</body>
    </html>
  );
}
