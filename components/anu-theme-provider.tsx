"use client";

import { ThemeProvider } from "next-themes";

export function AnuThemeProvider({ children }: { children: React.ReactNode }) {
  return <ThemeProvider attribute="data-theme" defaultTheme="system" enableSystem>{children}</ThemeProvider>;
}
