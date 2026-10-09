import "server-only";
import { timingSafeEqual } from "node:crypto";
export function integrationAuthorized(request: Request) {
  const expected = process.env.ANU_INTEGRATION_SECRET;
  if (!expected) return process.env.NODE_ENV !== "production";
  const actual = request.headers.get("x-anu-integration-key") || "";
  const a = Buffer.from(actual), b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
