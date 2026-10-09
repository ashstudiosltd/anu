import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
