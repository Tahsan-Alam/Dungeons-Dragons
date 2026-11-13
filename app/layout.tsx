import type { Metadata } from "next";
import "./globals.css";
import "./appearance.css";
import "./ui/button-surfaces.css";
import "./ui/motion.css";
import {APPEARANCE_BOOTSTRAP} from "./ui/appearance";
import {ThemeProvider} from "./ui/Theme";

export const metadata: Metadata = {
  title: "Painted Realms",
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
    <html lang="en" data-theme="paint" data-view-mode="2d" data-color-mode="light" data-color-preference="system" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{__html:APPEARANCE_BOOTSTRAP}}/></head>
      <body><ThemeProvider>{children}</ThemeProvider></body>
    </html>
  );
}
