import type { Metadata } from "next";
import "./globals.css";
import { AnuThemeProvider } from "@/components/anu-theme-provider";

export const metadata: Metadata = {
  title: "Anu — Your guide within Devvrats",
  description: "A thoughtful AI companion to help Devvrats learn, build, and move forward.",
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
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased"><AnuThemeProvider>{children}</AnuThemeProvider></body>
    </html>
  );
}
