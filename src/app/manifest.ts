import type { MetadataRoute } from "next";

// Lets clients "Add to Home Screen" and open the portal full-screen like an app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Coached by ABZ",
    short_name: "ABZ",
    description: "Your training, targets, check-ins and progress.",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    icons: [
      { src: "/icon/192", sizes: "192x192", type: "image/png" },
      { src: "/icon/512", sizes: "512x512", type: "image/png" },
      { src: "/icon/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
