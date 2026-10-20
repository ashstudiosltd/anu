import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Anu — Devvrats",
    short_name: "Anu",
    description: "Learn, build, and find your next step with Anu, a core AI member of Devvrats.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#101012",
    lang: "en",
    categories: ["education", "productivity"],
    icons: [
      { src: "/icons/anu-192.png?v=plush", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/anu-512.png?v=plush", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/anu-maskable-512.png?v=plush", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
