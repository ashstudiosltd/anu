"use client";

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { AnuMessage } from "./anu-message";
import {
  ArrowUpRight,
  ArrowUp,
  BookOpen,
  ChevronDown,
  Code2,
  Compass,
  Lightbulb,
  Menu,
  MessageCircle,
  Plus,
  Sun,
  Moon,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";

type Message = { role: "user" | "assistant"; text: string; sources?: Array<{ title: string; url: string }> };
type Conversation = { id: string; title: string; updatedAt: number; messages: Message[] };
const HISTORY_KEY = "anu-session-conversations-v2";
type AccountSession = { user: { id: string; name: string } | null; remaining: number | null; loginUrl: string };
const MAX_CONVERSATIONS = 20;
const MAX_STORED_CHARACTERS = 350_000;

function fitHistory(items: Conversation[]) {
  let result = items.slice(0, MAX_CONVERSATIONS).map((item) => ({ ...item, messages: item.messages.slice(-60) }));
  while (JSON.stringify(result).length > MAX_STORED_CHARACTERS) {
    if (result.length > 1) result = result.slice(0, -1);
    else if (result[0]?.messages.length && result[0].messages.length > 1) result = [{ ...result[0], messages: result[0].messages.slice(-Math.ceil(result[0].messages.length / 2)) }];
    else break;
  }
  return result;
}

function makeConversation(id: string, messages: Message[]): Conversation {
  const firstUserMessage = messages.find((message) => message.role === "user")?.text || "Conversation with Anu";
  return {
    id,
    title: firstUserMessage.replace(/\s+/g, " ").slice(0, 46),
    updatedAt: Date.now(),
    messages,
  };
}

function restoreHistory(raw: string | null): Conversation[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return fitHistory(value.filter((item): item is Conversation => {
      if (!item || typeof item !== "object") return false;
      const candidate = item as Partial<Conversation>;
      return typeof candidate.id === "string" && typeof candidate.title === "string" &&
        typeof candidate.updatedAt === "number" && Array.isArray(candidate.messages) &&
        candidate.messages.every((message: unknown) =>
          !!message && typeof message === "object" &&
          ((message as Message).role === "user" || (message as Message).role === "assistant") &&
          typeof (message as Message).text === "string",
        );
    }));
  } catch {
    return [];
  }
}

const suggestions = [
  { icon: Compass, label: "What is Devvrats?", prompt: "What is Devvrats, and how can I get involved?" },
  { icon: Code2, label: "Explain a concept", prompt: "Help me understand a coding concept. Where should we start?" },
  { icon: Lightbulb, label: "Plan a project", prompt: "Help me turn an idea into a small project plan." },
  { icon: BookOpen, label: "Review my approach", prompt: "Can you help me review my approach to a coding problem?" },
];

function LivingDot({ state = "idle", className = "" }: { state?: "idle" | "thinking" | "replying"; className?: string }) {
  return <span className={`living-dot dot-${state} ${className}`} aria-hidden="true"><span className="dot-halo" /><span className="dot-body"><i /></span></span>;
}

export function AnuChat() {
  const { resolvedTheme, setTheme } = useTheme();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [mobileNav, setMobileNav] = useState(false);
  const [historyReady, setHistoryReady] = useState(false);
  const [freshReply, setFreshReply] = useState<number | null>(null);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [account, setAccount] = useState<AccountSession | null>(null);
  const historyKey = useRef("");
  const identityRef = useRef<string | null>(null);
  const busyRef = useRef(false);
  const requestRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const privacyRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    let active = true;
    let pending = false;
    async function refreshAccount() {
      if (pending || busyRef.current) return;
      pending = true;
      try {
        const response = await fetch("/api/auth/session", { cache: "no-store" });
        if (!response.ok) throw new Error("Accounts are temporarily unavailable. Please refresh to try again.");
        const next = await response.json() as AccountSession;
        if (!active) return;
        const identity = next.user?.id || "guest";
        if (identityRef.current !== identity) {
          requestRef.current?.abort();
          setHistoryReady(false);
          const key = `${HISTORY_KEY}:${identity}`;
          let restored: Conversation[] = [];
          try { restored = restoreHistory(sessionStorage.getItem(key)); } catch { /* Storage can be disabled. */ }
          historyKey.current = key;
          identityRef.current = identity;
          setConversations(restored);
          setActiveConversationId(restored[0]?.id || null);
          setMessages(restored[0]?.messages || []);
          setInput("");
          setFreshReply(null);
          setNotice("");
          setHistoryReady(true);
        }
        setAccount(next);
      } catch (error) {
        if (active) setNotice(error instanceof Error ? error.message : "Could not connect to accounts.");
      } finally { pending = false; }
    }
    void refreshAccount();
    window.addEventListener("focus", refreshAccount);
    const timer = window.setInterval(refreshAccount, 60_000);
    return () => { active = false; clearInterval(timer); window.removeEventListener("focus", refreshAccount); requestRef.current?.abort(); };
  }, []);

  useEffect(() => {
    if (!historyReady || !historyKey.current) return;
    try { sessionStorage.setItem(historyKey.current, JSON.stringify(fitHistory(conversations))); } catch { /* Chat still works without storage. */ }
  }, [conversations, historyReady]);

  async function signOut() {
    if (busy) return;
    try {
      const response = await fetch("/api/auth/session", { method: "DELETE" });
      if (!response.ok) throw new Error("Could not sign out. Please try again.");
      if (historyKey.current) sessionStorage.removeItem(historyKey.current);
      window.location.reload();
    } catch (error) { setNotice(error instanceof Error ? error.message : "Could not sign out."); }
  }

  useEffect(() => {
    const scroller = scrollRef.current;
    if (scroller && nearBottom.current) {
      scroller.scrollTo({ top: scroller.scrollHeight, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
    }
  }, [messages, busy]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
  }, [input]);

  useEffect(() => {
    const dialog = privacyRef.current;
    if (privacyOpen && !dialog?.open) dialog?.showModal();
    if (!privacyOpen && dialog?.open) dialog.close();
  }, [privacyOpen]);

  useEffect(() => {
    if (freshReply === null) return;
    const timer = window.setTimeout(() => setFreshReply(null), 2000);
    return () => window.clearTimeout(timer);
  }, [freshReply]);

  useEffect(() => {
    if (!mobileNav) return;
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setMobileNav(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [mobileNav]);

  async function sendMessage(value = input) {
    const text = value.trim();
    if (!text || busyRef.current || !historyReady || !account) return;
    if (!account.user && account.remaining === 0) { setNotice("Sign in with Devvrats to keep talking with Anu."); return; }
    busyRef.current = true;
    const requestIdentity = identityRef.current;
    const controller = new AbortController();
    requestRef.current = controller;
    nearBottom.current = true;
    setFreshReply(null);
    const conversationId = activeConversationId || crypto.randomUUID();
    if (!activeConversationId) setActiveConversationId(conversationId);
    const nextMessages: Message[] = [...messages, { role: "user", text }];
    setMessages(nextMessages);
    setConversations((current) => fitHistory([
      makeConversation(conversationId, nextMessages),
      ...current.filter((item) => item.id !== conversationId),
    ]));
    setInput("");
    setNotice("");
    setBusy(true);

    const contextHistory: Array<{ role: Message["role"]; text: string }> = [];
    for (const previous of nextMessages.slice(0, -1).reverse()) {
      const candidate = [{ role: previous.role, text: previous.text }, ...contextHistory];
      const requestSize = new TextEncoder().encode(JSON.stringify({ message: text, history: candidate })).length;
      if (requestSize > 38_000) break;
      contextHistory.unshift({ role: previous.role, text: previous.text });
    }

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json", "x-anu-account": account.user?.id || "guest" },
        body: JSON.stringify({
          message: text,
          history: contextHistory,
        }),
      });
      if (response.status === 409) { window.location.reload(); return; }
      const data = (await response.json()) as { reply?: string; error?: string; sources?: Message["sources"]; loginRequired?: boolean };
      if (requestIdentity !== identityRef.current) return;
      if (!account.user) setAccount((current) => current ? {...current, remaining: data.loginRequired ? 0 : Math.max(0, (current.remaining ?? 5)-1)} : current);
      if (!response.ok) throw new Error(data.error || "Anu couldn't answer just now. Please try again.");
      const completedMessages: Message[] = [...nextMessages, { role: "assistant", text: data.reply || "I couldn't form a response. Try asking another way.", sources: data.sources }];
      setMessages(completedMessages);
      setFreshReply(completedMessages.length - 1);
      setConversations((current) => fitHistory([
        makeConversation(conversationId, completedMessages),
        ...current.filter((item) => item.id !== conversationId),
      ]));
    } catch (error) {
      if (controller.signal.aborted) return;
      const reason = error instanceof Error ? error.message : "Anu couldn't answer just now. Please try again.";
      setNotice(reason);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void sendMessage();
    }
  }

  function startNewChat() {
    if (busy) return;
    setActiveConversationId(null);
    setMessages([]);
    setFreshReply(null);
    setNotice("");
    setInput("");
    setMobileNav(false);
  }

  function openConversation(conversation: Conversation) {
    if (busy) return;
    setActiveConversationId(conversation.id);
    setMessages(conversation.messages);
    setFreshReply(null);
    nearBottom.current = true;
    setNotice("");
    setInput("");
    setMobileNav(false);
  }

  function deleteConversation(id: string) {
    if (busy) return;
    const remaining = conversations.filter((conversation) => conversation.id !== id);
    setConversations(remaining);
    if (activeConversationId === id) {
      const next = remaining[0];
      setActiveConversationId(next?.id || null);
      setMessages(next?.messages || []);
      setNotice("");
      setInput("");
    }
  }

  function clearHistory() {
    if (busy) return;
    setConversations([]);
    setActiveConversationId(null);
    setMessages([]);
    setNotice("");
    setInput("");
  }

  const dotState = busy ? "thinking" : freshReply !== null ? "replying" : "idle";
  const activeTitle = conversations.find((item) => item.id === activeConversationId)?.title;

  return (
    <main className={`anu-shell ${mobileNav ? "nav-is-open" : ""}`}>
      {mobileNav && <button aria-label="Close navigation" className="nav-scrim" onClick={() => setMobileNav(false)} />}
      <aside className={`sidebar ${mobileNav ? "sidebar-open" : ""}`} aria-label="Conversations">
        <div className="brand-lockup">
          <LivingDot className="brand-dot" />
          <a className="brand-word" href="/" aria-label="Anu home">anu<span>.</span></a>
          <span className="brand-caption">WITHIN DEVVRATS</span>
          <button className="icon-button mobile-close" aria-label="Close menu" onClick={() => setMobileNav(false)}><X size={18} /></button>
        </div>

        <button className="new-chat" onClick={startNewChat} disabled={busy || !historyReady}><Plus size={16} /> New conversation <span className="new-chat-mark">↗</span></button>
        <div className="history-heading">
          <p>THIS SESSION</p>
          <button className="icon-button clear-history" onClick={clearHistory} disabled={busy || !conversations.length} aria-label="Clear all local conversations" title="Clear local history"><Trash2 size={14} /></button>
        </div>
        <div className="history-list">
          {conversations.length ? conversations.map((conversation) => (
            <div className={`history-item ${activeConversationId === conversation.id ? "history-item-active" : ""}`} key={conversation.id}>
              <button className="history-open" onClick={() => openConversation(conversation)} disabled={busy} title={conversation.title} aria-current={activeConversationId === conversation.id ? "true" : undefined}>
                <MessageCircle size={14} /><span>{conversation.title}</span>
              </button>
              <button className="icon-button history-delete" onClick={() => deleteConversation(conversation.id)} disabled={busy} aria-label={`Delete conversation: ${conversation.title}`} title="Delete conversation"><X size={13} /></button>
            </div>
          )) : <div className="history-empty"><MessageCircle size={20} /><p>A little room for your thoughts.</p><span>Your conversations will appear here.</span></div>}
        </div>

        <div className="sidebar-bottom">
          <a className="side-link" href="https://www.devvrats.in/" target="_blank" rel="noreferrer"><Compass size={16} /> Devvrats <ArrowUpRight size={13} /></a>
          <a className="side-link" href="/sources/foundation"><BookOpen size={16} /> What Anu knows <ArrowUpRight size={13} /></a>
          <button className="side-link" onClick={() => setPrivacyOpen(true)}><ShieldCheck size={16} /> Memory &amp; privacy <ChevronDown size={13} /></button>
          <div className="session-label"><span /> Your browser session <span className="session-badge">LOCAL</span></div>
        </div>
      </aside>

      <section className="main-panel" aria-label="Chat with Anu">
        <header className="topbar">
          <button className="icon-button menu-button" aria-label="Open conversations" aria-expanded={mobileNav} onClick={() => setMobileNav(true)}><Menu size={20} /></button>
          <div className="topbar-identity"><LivingDot state={dotState} className="header-dot" /><span>Anu<small>{busy ? "Thinking it through" : "Your guide within Devvrats"}</small></span></div>
          <div className="topbar-right">{account?.user ? <><span className="account-name" title={account.user.name}>{account.user.name}</span><button className="account-action" onClick={() => void signOut()} disabled={busy}>Sign out</button></> : <a className="account-action" href={account?.loginUrl || "/auth"}>Sign in</a>}<button className="icon-button theme-toggle" onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")} aria-label="Switch between light and dark theme" title="Switch light / dark theme"><Sun className="sun-icon" size={18} /><Moon className="moon-icon" size={18} /></button><button className="icon-button mobile-new" onClick={startNewChat} disabled={busy} aria-label="New conversation"><Plus size={20} /></button></div>
        </header>

        <div className={`chat-stage ${messages.length ? "has-messages" : "is-welcome"}`}>
          <div className="conversation-scroll" ref={scrollRef} onScroll={(event) => {
            const node = event.currentTarget;
            nearBottom.current = node.scrollHeight - node.scrollTop - node.clientHeight < 120;
          }}>
            {messages.length === 0 ? (
              <div className="welcome-wrap">
                <LivingDot className="welcome-dot" />
                <p className="welcome-eyebrow">A LITTLE CLARITY, TOGETHER</p>
                <h1>{account?.user ? `Namastey, ${account.user.name.split(" ")[0]}` : "Where shall we begin"}<span>{account?.user ? "." : "?"}</span></h1>
                <p className="welcome-subtitle">A question, a bug, an idea.<br />Let’s find your next step.</p>
                <div className="suggestions" aria-label="Suggested prompts">
                  {suggestions.map(({ icon: Icon, label, prompt }) => <button key={label} className="suggestion" onClick={() => void sendMessage(prompt)} disabled={busy || !historyReady}><Icon size={15} /><span>{label}</span><ArrowUpRight size={13} /></button>)}
                </div>
              </div>
            ) : (
              <div className="thread-wrap" key={activeConversationId}>
                <p className="thread-label"><span /> {activeTitle || "A conversation with Anu"}</p>
                <div className="message-list" role="log" aria-label="Conversation messages" aria-live="polite" aria-relevant="additions">
                  {messages.map((message, index) => <article className={`message-row ${message.role} ${index === freshReply ? "fresh-message" : ""}`} key={`${index}-${message.role}`}>
                    {message.role === "assistant" && <LivingDot state={index === freshReply ? "replying" : "idle"} className="message-dot" />}
                    <div className={`message-bubble ${message.role}`}>
                      <span className="sr-only">{message.role === "user" ? "You: " : "Anu: "}</span>
                      {message.role === "assistant" ? <AnuMessage text={message.text} fresh={index === freshReply} /> : <p>{message.text}</p>}
                      {message.sources?.length ? <div className="source-list" aria-label="Sources">{message.sources.map((source) => <a key={source.url} href={source.url} className="source-link" target={source.url.startsWith("https://") ? "_blank" : undefined} rel="noreferrer"><BookOpen size={12} /> {source.title}<ArrowUpRight size={12} /></a>)}</div> : null}
                    </div>
                  </article>)}
                </div>
                {busy && <div className="message-row assistant thinking-row" role="status" aria-label="Anu is thinking"><LivingDot state="thinking" className="message-dot" /><div className="typing-bubble" aria-hidden="true"><i /><i /><i /></div></div>}
              </div>
            )}
          </div>

          <div className="composer-dock">
            {!account?.user && account && <div className="guest-access">{account.remaining === 0 ? "Your preview is complete." : `${account.remaining} preview messages available.`} <a href={account.loginUrl}>Sign in to continue with Devvrats</a></div>}
            {notice && <div className="notice" role="alert">{notice}</div>}
            <form className="composer" onSubmit={handleSubmit}>
              <textarea ref={textareaRef} aria-label="Message Anu" placeholder={messages.length ? "Continue the conversation…" : "Ask Anu anything…"} value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={handleKeyDown} rows={1} maxLength={account?.user ? 4000 : 1000} />
              <div className="composer-bottom"><span className="composer-hint"><span className={`composer-status ${busy ? "is-thinking" : ""}`} />{busy ? "Thinking it through…" : "A little help with your next step"}</span><button type="submit" className="send-button" aria-label="Send message" disabled={!input.trim() || busy || !historyReady}>{busy ? <span className="tiny-spinner" /> : <ArrowUp size={18} />}</button></div>
            </form>
            <div className="composer-footnote"><span>Anu can make mistakes. <span className="footnote-extra">Verify what matters.</span></span><button onClick={() => setPrivacyOpen(true)}>Session memory <ShieldCheck size={11} /></button></div>
          </div>
        </div>
      </section>
      <dialog ref={privacyRef} className="privacy-dialog" onClose={() => setPrivacyOpen(false)} onClick={(event) => { if (event.target === event.currentTarget) setPrivacyOpen(false); }}>
        <div className="dialog-heading"><ShieldCheck size={20} /><button className="icon-button" aria-label="Close privacy information" onClick={() => setPrivacyOpen(false)}><X size={19} /></button></div>
        <h2>A little context on memory.</h2>
        <p>Conversations stay in this browser tab’s session. You can reopen them, delete one, or clear them all from the sidebar. A new conversation starts fresh.</p>
        <p>History is limited to the most recent 20 conversations and 60 messages per conversation, with an overall storage limit. Anu receives recent messages that fit within her context limit when you continue a conversation.</p>
        <p>Clearing history removes the local copy. It does not delete content already sent to Google. With the Gemini API free tier, submitted content and replies may be used to improve Google products and reviewed by people. Keep sensitive details out of chat.</p>
        <a href="https://ai.google.dev/gemini-api/terms" target="_blank" rel="noreferrer">Google’s Gemini API terms <ArrowUpRight size={13} /></a>
        <p className="dialog-note">History is stored separately for each account in this browser tab. Signing out removes this account’s local history from this tab. Chats do not yet sync across devices. Anu receives your verified display name when you are signed in.</p>
      </dialog>
    </main>
  );
}
