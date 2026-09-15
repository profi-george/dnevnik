import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Дневник ведения",
    short_name: "Дневник",
    description: "Дневник фиксации правок в рекламных кампаниях и контроля результатов",
    start_url: "/diary",
    display: "standalone",
    background_color: "#FAFAFC",
    theme_color: "#3742C1",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
