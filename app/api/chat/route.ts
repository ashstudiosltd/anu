import { env } from "cloudflare:workers";
import { ANU_CONSTITUTION } from "@/lib/anu/constitution";
import { DEVVRATS_FOUNDATION_KNOWLEDGE } from "@/lib/anu/knowledge";

type HistoryMessage = { role: "user" | "assistant"; text: string };

function json(body: Record<string, unknown>, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: Request) {
  if (!env.GEMINI_API_KEY) {
    return json({ error: "Anu’s reply system isn’t connected yet. This private preview is ready for its Gemini connection." }, 503);
  }

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 40_000) return json({ error: "That message is too long. Please shorten it and try again." }, 413);

  let body: { message?: unknown; history?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: "I couldn't read that message. Please try again." }, 400);
  }

  if (typeof body.message !== "string" || !body.message.trim() || body.message.length > 4000) {
    return json({ error: "Please enter a message under 4,000 characters." }, 400);
  }

  const history = Array.isArray(body.history)
    ? body.history
        .slice(-8)
        .filter((item): item is HistoryMessage =>
          !!item &&
          typeof item === "object" &&
          ((item as HistoryMessage).role === "user" || (item as HistoryMessage).role === "assistant") &&
          typeof (item as HistoryMessage).text === "string" &&
          (item as HistoryMessage).text.length <= 4000,
        )
    : [];

  const model = env.ANU_GEMINI_MODEL || "gemini-3.7-flash";
  if (!/^[a-zA-Z0-9._-]{1,100}$/.test(model)) {
    return json({ error: "Anu is temporarily unavailable. Please try again later." }, 500);
  }

  const contents = [
    ...history.map(({ role, text }) => ({ role: role === "assistant" ? "model" : "user", parts: [{ text }] })),
    { role: "user", parts: [{ text: body.message.trim() }] },
  ];

  try {
    const upstream = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": env.GEMINI_API_KEY,
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: `${ANU_CONSTITUTION}\n\n${DEVVRATS_FOUNDATION_KNOWLEDGE}` }],
        },
        contents,
        generationConfig: { temperature: 0.65, maxOutputTokens: 1200 },
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!upstream.ok) {
      if (upstream.status === 429) return json({ error: "Anu is receiving too many requests right now. Please wait a moment and try again." }, 429);
      return json({ error: "Anu couldn't reach her reply service. Please try again in a moment." }, 502);
    }

    const result = await upstream.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const reply = result.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("").trim();
    if (!reply) return json({ error: "I couldn't form a helpful answer to that. Could you try asking another way?" }, 502);
    const devvratsQuestion = [...history.filter((item) => item.role === "user").map((item) => item.text), body.message]
      .some((text) => /devvrats|sabha|patas|\bdid\b|anu|community ecosystem/i.test(text));
    return json({
      reply,
      sources: devvratsQuestion ? [{ title: "Devvrats foundation reports", url: "/sources/foundation" }] : [],
    });
  } catch {
    return json({ error: "Anu couldn't reach her reply service. Please try again in a moment." }, 502);
  }
}
