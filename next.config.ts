import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },

    ] }, { source: "/((?!embed$).*)", headers: [{ key: "X-Frame-Options", value: "DENY" }, { key: "Content-Security-Policy", value: "frame-ancestors 'none'" }] }, { source: "/embed", headers: [{ key: "Content-Security-Policy", value: `frame-ancestors 'self' https://sabha.devvrats.in${process.env.NODE_ENV !== "production" ? " http://localhost:* http://127.0.0.1:*" : ""}` }, { key: "Cache-Control", value: "private, no-store" }] }, { source: "/sw.js", headers: [
      { key: "Content-Type", value: "application/javascript; charset=utf-8" },
      { key: "Cache-Control", value: "no-store, max-age=0" },
      { key: "Service-Worker-Allowed", value: "/" },
    ] }, { source: "/offline.html", headers: [
      { key: "Cache-Control", value: "no-cache" },
    ] }];
  },
};
export default nextConfig;
