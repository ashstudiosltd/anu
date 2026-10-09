export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";
import { memberIdentity, previewAllowance, loginUrl, authClient } from "@/lib/anu/auth";
export async function GET() {
  try {
    const user = await memberIdentity();
    const preview = user ? null : await previewAllowance();
    return Response.json({ user, remaining: preview?.remaining ?? null, loginUrl: loginUrl() }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return Response.json({ error: "Accounts are temporarily unavailable. Please try again." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
export async function DELETE(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return new Response(null, { status: 403 });
  const client = await authClient();
  const { error } = await client.auth.signOut({ scope: "local" });
  return Response.json(error ? {error:"Could not sign out. Please try again."} : {ok:true}, {status: error ? 503 : 200, headers:{"Cache-Control":"no-store"}});
}
