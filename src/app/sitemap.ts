import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";

export default function sitemap(): MetadataRoute.Sitemap {
  const site = getSiteUrl() ?? `http://localhost:${process.env.PORT ?? 3000}`;
  return [{ url: `${site}/`, changeFrequency: "weekly", priority: 1 }];
}
