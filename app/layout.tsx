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

const shareTitle = "Anu — Your AI companion within Devvrats";
const shareDescription = "Learn, build, and find your next step with Anu, a core AI member of Devvrats.";

export const metadata: Metadata = {
  metadataBase: new URL("https://anu.devvrats.in"),
  title: "Anu — Your guide within Devvrats",
  description: shareDescription,
  openGraph: {
    type: "website",
    locale: "en_IN",
    siteName: "Anu",
    url: "/",
    title: shareTitle,
    description: shareDescription,
    images: [{ url: "/social/anu-share.png", width: 1200, height: 630, alt: "Anu’s lavender dot and wordmark on a white canvas with lavender gradients", type: "image/png" }],
  },
  twitter: {
    card: "summary_large_image",
    title: shareTitle,
    description: shareDescription,
    images: [{ url: "/social/anu-share.png", alt: "Anu — Your AI companion within Devvrats" }],
  },
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
