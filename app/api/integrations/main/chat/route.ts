import { integrationAuthorized } from "@/lib/anu/integration-auth";
export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";
import { replyToChat } from "@/lib/anu/reply-service";

// Coarse per-instance budget for the public demo. Use a shared store before launch.
let windowStart = 0;
let requests = 0;
export async function POST(request: Request) {
  if (!integrationAuthorized(request)) return Response.json({ error: "This integration is not connected." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  if (Date.now() - windowStart > 60_000) { windowStart = Date.now(); requests = 0; }
  if (++requests > 60) return Response.json({ error: "Anu is busy. Please try again in a minute." }, { status: 429, headers: { "Cache-Control": "no-store", "Retry-After": "60" } });
  return replyToChat(request, "main-demo");
}
