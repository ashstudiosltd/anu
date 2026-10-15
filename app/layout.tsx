import { Roboto } from "next/font/google";
import type { Metadata } from "next";
import "./globals.css";
import { AnuThemeProvider } from "@/components/anu-theme-provider";

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  style: ["normal", "italic"],
  display: "swap",
});

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
    <html lang="en" className={roboto.variable} suppressHydrationWarning>
      <body className="antialiased"><AnuThemeProvider>{children}</AnuThemeProvider></body>
    </html>
  );
}
