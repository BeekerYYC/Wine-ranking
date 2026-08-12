import type { MetadataRoute } from "next";

/**
 * Web app manifest, served at /manifest.webmanifest.
 *
 * This is what lets "Add to Home Screen" on iOS install the app standalone —
 * its own icon, no Safari chrome, its own card in the app switcher. `background_color`
 * matches the app's background so the launch does not flash white.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Wine Ranker",
    short_name: "Wine Ranker",
    description: "Track and rank your wine collection",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a0608",
    theme_color: "#0a0608",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      // Android/Chrome crops to its own shape; this copy keeps the glass inside
      // the safe zone so nothing important gets cut off.
      { src: "/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
