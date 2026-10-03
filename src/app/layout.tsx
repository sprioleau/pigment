import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import ButtonDelight from "@/components/button-delight";
import GlobalPaintCursor from "@/components/global-paint-cursor";
import MusicPlayer from "@/components/music-player";
import "./globals.css";
import "@/components/paint-cursor-global.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://pigment.sprioleau.dev",
  ),
  title: "Pigment",
  applicationName: "Pigment",
  description: "An enchanted color-by-number game for little artists.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Pigment",
    statusBarStyle: "default",
  },
  openGraph: {
    title: "Pigment",
    description:
      "A little color, a little magic. An enchanted color-by-number game for little artists.",
    siteName: "Pigment",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pigment",
    description:
      "A little color, a little magic. An enchanted color-by-number game for little artists.",
  },
};

export const viewport: Viewport = {
  themeColor: "#7351b5",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <MusicPlayer />
        <GlobalPaintCursor />
        <ButtonDelight />
      </body>
    </html>
  );
}
