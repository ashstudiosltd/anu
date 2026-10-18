export type ChatSpace = "anu" | "devvrats";
export type StoredMessage = { role: "user" | "assistant"; text: string };
export const HISTORY_RETENTION_DAYS = 45;
export const HISTORY_MAX_BYTES = 30_000; // Room for PostgreSQL JSONB serialization overhead.
export function compactMessages(messages: StoredMessage[]): Array<[0 | 1, string]> {
  const packed: Array<[0 | 1, string]> = messages.slice(-60).map((message) => [message.role === "user" ? 0 : 1, message.text]);
  const encoder = new TextEncoder();
  while (packed.length > 1 && encoder.encode(JSON.stringify(packed)).length > HISTORY_MAX_BYTES) packed.shift();
  // Avoid a retained assistant answer starting without its corresponding question.
  if (packed.length > 1 && packed[0][0] === 1) packed.shift();
  if (encoder.encode(JSON.stringify(packed)).length > HISTORY_MAX_BYTES) throw new RangeError("A message is too large to sync.");
  return packed;
}
export function expandMessages(packed: Array<[0 | 1, string]>): StoredMessage[] {
  return packed.map(([role, text]) => ({ role: role === 0 ? "user" : "assistant", text }));
}
