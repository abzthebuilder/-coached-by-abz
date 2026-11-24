import type { Metadata, Viewport } from "next";
import { Inter, Oswald } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const oswald = Oswald({ subsets: ["latin"], variable: "--font-oswald", weight: ["400", "500", "600", "700"], display: "swap" });

// Absolute address for link previews. Never throws, so a bad APP_URL can't take the site down.
function siteBase(): URL {
  const configured = process.env.APP_URL || (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : "");
  try {
    return new URL(configured || "http://localhost:3000");
  } catch {
    return new URL("http://localhost:3000");
  }
}

export const metadata: Metadata = {
  title: { default: "Coached by ABZ | Online coaching", template: "%s | Coached by ABZ" },
  description:
    "Build muscle, lose fat, get stronger and feel more confident with online coaching from ABZ.",
  metadataBase: siteBase(),
  appleWebApp: { capable: true, title: "ABZ", statusBarStyle: "black" },
  openGraph: { type: "website", siteName: "Coached by ABZ" },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${oswald.variable}`}>
      <body className="min-h-dvh font-sans antialiased">{children}</body>
    </html>
  );
}
