import type { Metadata } from "next";
import "./globals.css";
import "./pixel.css";
import {ThemeProvider} from "./ui/Theme";

export const metadata: Metadata = {
  title: "Painted Realms — a little ink, a big adventure",
  description: "A hand-drawn cooperative adventure. Play solo or gather a party of up to ten.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head><link rel="preload" href="/fonts/pixelify-sans.ttf" as="font" type="font/ttf" crossOrigin="anonymous"/></head>
      <body><ThemeProvider>{children}</ThemeProvider></body>
    </html>
  );
}
