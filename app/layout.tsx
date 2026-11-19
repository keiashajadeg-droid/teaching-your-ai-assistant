import type { Metadata } from "next";
import { Fraunces, Figtree, JetBrains_Mono, VT323 } from "next/font/google";
import "./globals.css";

// next/font downloads these at build time and serves them locally, so the app works offline.
const serif = Fraunces({ subsets: ["latin"], variable: "--f-serif", style: ["normal", "italic"] });
const sans = Figtree({ subsets: ["latin"], variable: "--f-sans" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--f-mono" });
const pixel = VT323({ subsets: ["latin"], weight: "400", variable: "--f-pixel" });

export const metadata: Metadata = {
  title: "Teaching Your AI Assistant · replay",
  description: "Replays of real Claude Code chats, showing how a project's context notes change.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable} ${mono.variable} ${pixel.variable}`}>
      <body>{children}</body>
    </html>
  );
}
