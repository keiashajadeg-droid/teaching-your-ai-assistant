import type { NextConfig } from "next";

// Static site: `npm run build` writes plain files to out/ (works offline and on GitHub Pages).
// On GitHub Pages the site lives under /<repo-name>, set by NEXT_PUBLIC_BASE_PATH in the deploy workflow.
const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  basePath: base,
  images: { unoptimized: true },
};

export default nextConfig;
