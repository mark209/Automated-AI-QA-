import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "QA AI Automation",
    short_name: "QA AI",
    description: "Call quality assurance powered by ARC AI Engine.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f8fa",
    theme_color: "#13243a",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
