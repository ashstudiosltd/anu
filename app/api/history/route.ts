import { authClient, memberIdentity } from "@/lib/anu/auth";
import { compactMessages, expandMessages, HISTORY_RETENTION_DAYS, type StoredMessage } from "@/lib/anu/chat-history";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const json = (body: object, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
type HistoryRow = { id: string; space: string; title: string; updated_at: string; revision: number; messages?: Array<[0 | 1, string]> };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const cutoff = () => new Date(Date.now() - HISTORY_RETENTION_DAYS * 86400000).toISOString();
function unavailable() { return json({ error: "Chat sync is unavailable. Your chat remains in this tab; please try again later." }, 503); }
export async function GET(request: Request) {
  try {
    const member = await memberIdentity();
    if (!member) return json({ error: "Sign in to sync chat history." }, 401);
    const url = new URL(request.url), space = url.searchParams.get("space"), id = url.searchParams.get("id");
    if (!["anu", "devvrats"].includes(space || "") || (id && !uuid.test(id))) return json({ error: "Invalid conversation." }, 400);
    const client = await authClient();
    const search = url.searchParams.get("q")?.trim();
    if (search && !id) {
      if (search.length > 200) return json({ error: "Search is too long." }, 400);
      const { data, error } = await client.rpc("anu_search_conversations", { p_space: space, p_query: search });
      if (error) return unavailable();
      return json({ conversations: (data as HistoryRow[]).map((row) => ({ id: row.id, space: row.space, title: row.title, updatedAt: Date.parse(row.updated_at), revision: row.revision, messages: [], loaded: false })) });
    }
    const query = client.from("anu_conversations").select(id ? "id,space,title,updated_at,revision,messages" : "id,space,title,updated_at,revision").eq("user_id", member.id).eq("space", space).gt("updated_at", cutoff());
    if (id) {
      const { data, error } = await query.eq("id", id).returns<HistoryRow[]>().maybeSingle();
      if (error) return unavailable();
      if (!data) return json({ error: "This chat has expired or been deleted." }, 404);
      return json({ conversation: { id: data.id, space: data.space, title: data.title, updatedAt: Date.parse(data.updated_at), revision: data.revision, messages: expandMessages(data.messages || []) } });
    }
    const { data, error } = await query.order("updated_at", { ascending: false }).limit(20).returns<HistoryRow[]>();
    if (error) return unavailable();
    return json({ conversations: data.map((row) => ({ id: row.id, space: row.space, title: row.title, updatedAt: Date.parse(row.updated_at), revision: row.revision, messages: [], loaded: false })) });
  } catch { return unavailable(); }
}
export async function PUT(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return json({ error: "Invalid request." }, 403);
  try {
    const member = await memberIdentity();
    if (!member) return json({ error: "Sign in to sync chat history." }, 401);
    const raw = await request.text();
    if (new TextEncoder().encode(raw).length > 350000) return json({ error: "Chat is too large." }, 413);
    let body;
    try { body = JSON.parse(raw); } catch { return json({ error: "Invalid conversation." }, 400); }
    if (!body || typeof body !== "object") return json({ error: "Invalid conversation." }, 400);
    if (!uuid.test(body.id) || !["anu", "devvrats"].includes(body.space) || typeof body.title !== "string" || !body.title.trim() || body.title.length > 80 || !Number.isInteger(body.revision) || body.revision < 0 || !Array.isArray(body.messages) || body.messages.length > 60 || body.messages.some((m: StoredMessage) => !m || !["user", "assistant"].includes(m.role) || typeof m.text !== "string" || m.text.length > 10000)) return json({ error: "Invalid conversation." }, 400);
    let packed: ReturnType<typeof compactMessages>;
    try { packed = compactMessages(body.messages); } catch { return json({ error: "A message is too large to sync. Your chat remains in this tab." }, 413); }
    const client = await authClient();
    const { data, error } = await client.rpc("anu_save_conversation", { p_id: body.id, p_space: body.space, p_title: body.title, p_messages: packed, p_revision: body.revision });
    if (error?.code === "40001") return json({ error: "This chat changed on another device. Reopen it before continuing. Your new messages remain in this tab." }, 409);
    if (error) return unavailable();
    return json({ ...data, retainedMessages: packed.length });
  } catch { return unavailable(); }
}
export async function DELETE(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return json({ error: "Invalid request." }, 403);
  try {
    const member = await memberIdentity();
    if (!member) return json({ error: "Sign in to sync chat history." }, 401);
    const url = new URL(request.url), id = url.searchParams.get("id"), space = url.searchParams.get("space");
    if (!uuid.test(id || "") || !["anu", "devvrats"].includes(space || "")) return json({ error: "Invalid conversation." }, 400);
    const client = await authClient();
    const { error } = await client.from("anu_conversations").delete().eq("user_id", member.id).eq("space", space).eq("id", id);
    return error ? unavailable() : json({ ok: true });
  } catch { return unavailable(); }
}
