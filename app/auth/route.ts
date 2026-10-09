import { loginUrl } from "@/lib/anu/auth";
export function GET() { return Response.redirect(loginUrl(), 302); }
