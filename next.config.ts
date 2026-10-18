import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Frame-Options", value: "DENY" },
    ] }, { source: "/sw.js", headers: [
      { key: "Content-Type", value: "application/javascript; charset=utf-8" },
      { key: "Cache-Control", value: "no-store, max-age=0" },
      { key: "Service-Worker-Allowed", value: "/" },
    ] }, { source: "/offline.html", headers: [
      { key: "Cache-Control", value: "no-cache" },
    ] }];
  },
};
export default nextConfig;
