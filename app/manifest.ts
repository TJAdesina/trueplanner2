import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TruePlanner",
    short_name: "TruePlanner",
    description: "A simple to-do list that notices when a task slips and suggests a useful next step.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#FFF9F0",
    theme_color: "#193B32",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
