import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MOODZ Café · Restaurant",
    short_name: "MOODZ",
    description: "La carte MOODZ et la commande en ligne, à Gambetta, Oran.",
    start_url: "/",
    display: "standalone",
    background_color: "#0c1007",
    theme_color: "#0c1007",
    lang: "fr",
    icons: [
      { src: "/icon", sizes: "64x64", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
