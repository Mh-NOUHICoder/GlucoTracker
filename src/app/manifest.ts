import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "GlucoTrack - Intelligent Care",
    short_name: "GlucoTrack",
    description: "Modern PWA for diabetes tracking and analysis",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0c0e",
    theme_color: "#00e5ff",
    icons: [
      {
        src: "/assets/android/launchericon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/assets/android/launchericon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/assets/windows/Square44x44Logo.targetsize-256.png",
        sizes: "256x256",
        type: "image/png",
      },
      {
        src: "/glucotracker.png",
        sizes: "309x357",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/ios.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
    screenshots: [
      {
        src: "/screenshots/desktop.png",
        sizes: "1280x720",
        type: "image/png",
        form_factor: "wide",
        label: "GlucoTrack Desktop Dashboard",
      },
      {
        src: "/screenshots/mobile.png",
        sizes: "750x1334",
        type: "image/png",
        label: "GlucoTrack Mobile Interface",
      },
    ],
  };
}
