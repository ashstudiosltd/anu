export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";
import { replyToChat } from "@/lib/anu/reply-service";
import { memberIdentity, previewAllowance } from "@/lib/anu/auth";
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return new Response(null, {status:403});
  try {
    const member = await memberIdentity();
    if (request.headers.get("x-anu-account") !== (member?.id || "guest")) return Response.json({error:"Your account changed. Reloading your conversation."}, {status:409, headers:{"Cache-Control":"no-store"}});
    if (!member) {
      const preview = await previewAllowance(true);
      if (!preview.allowed) return Response.json({error:"Sign in with Devvrats to keep talking with Anu.", loginRequired:true}, {status:401, headers:{"Cache-Control":"no-store"}});
    }
    return replyToChat(request, member ? "full" : "main-demo", undefined, member?.name);
  } catch {
    return Response.json({error:"Accounts are temporarily unavailable. Please try again."}, {status:503, headers:{"Cache-Control":"no-store"}});
  }
}
