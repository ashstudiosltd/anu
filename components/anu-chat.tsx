"use client";

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  ArrowUp,
  BookOpen,
  ChevronDown,
  CircleHelp,
  Code2,
  Compass,
  Lightbulb,
  Menu,
  MessageCircle,
  Plus,
  Sparkles,
  X,
} from "lucide-react";

type Message = { role: "user" | "assistant"; text: string; sources?: Array<{ title: string; url: string }> };

const suggestions = [
  { icon: Code2, label: "Explain a coding concept", prompt: "Can you explain how React Server Components work?" },
  { icon: Lightbulb, label: "Help me plan a project", prompt: "Help me turn an idea into a small project plan." },
  { icon: Compass, label: "Explore Devvrats", prompt: "What is Devvrats, and how can I get involved?" },
  { icon: BookOpen, label: "Find my next step", prompt: "I’m learning web development. What should I focus on next?" },
];

export function AnuChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [mobileNav, setMobileNav] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy]);

  async function sendMessage(value = input) {
    const text = value.trim();
    if (!text || busy) return;
    const nextMessages: Message[] = [...messages, { role: "user", text }];
    setMessages(nextMessages);
    setInput("");
    setNotice("");
    setBusy(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: nextMessages.slice(-10, -1).map(({ role, text: content }) => ({ role, text: content })),
        }),
      });
      const data = (await response.json()) as { reply?: string; error?: string; sources?: Message["sources"] };
      if (!response.ok) throw new Error(data.error || "Anu couldn't answer just now. Please try again.");
      setMessages((current) => [...current, { role: "assistant", text: data.reply || "I couldn't form a response. Try asking another way.", sources: data.sources }]);
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Anu couldn't answer just now. Please try again.";
      setNotice(reason);
    } finally {
      setBusy(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  }

  function startNewChat() {
    setMessages([]);
    setNotice("");
    setInput("");
    setMobileNav(false);
  }

  return (
    <main className="anu-shell">
      {mobileNav && <button aria-label="Close navigation" className="nav-scrim" onClick={() => setMobileNav(false)} />}
      <aside className={`sidebar ${mobileNav ? "sidebar-open" : ""}`}>
        <div className="brand-lockup">
          <span className="brand-orb" aria-hidden="true"><span /></span>
          <span className="brand-word">ANU<span className="brand-period">.</span></span>
          <button className="icon-button mobile-close" aria-label="Close menu" onClick={() => setMobileNav(false)}><X size={18} /></button>
        </div>

        <button className="new-chat" onClick={startNewChat}><Plus size={17} strokeWidth={2.2} /> New conversation</button>

        <div className="side-section">
          <p className="side-label">YOUR SPACE</p>
          <button className="side-link side-link-active" onClick={startNewChat}><MessageCircle size={17} /> <span>Ask Anu</span></button>
          <button className="side-link side-link-muted" title="Your conversations aren't saved in this preview"><BookOpen size={17} /> <span>Conversation history</span><span className="soon-dot" /></button>
        </div>

        <div className="side-section ecosystem-section">
          <p className="side-label">DEVVRATS</p>
          <button className="side-link side-link-muted" disabled title="Community discovery will connect when Sabha is available"><Compass size={17} /> <span>Explore community</span><span className="soon-dot" /></button>
          <button className="side-link side-link-muted" disabled title="Project discovery will connect when Sabha is available"><Code2 size={17} /> <span>Discover projects</span><span className="soon-dot" /></button>
          <button className="side-link side-link-muted" title="DID features are planned for a later phase"><CircleHelp size={17} /> <span>Understand your DID</span><span className="soon-dot" /></button>
        </div>

        <div className="sidebar-bottom">
          <div className="privacy-note"><span className="privacy-lock">✳</span><p><strong>A thoughtful companion.</strong><br />Your conversations stay in this session.</p></div>
          <div className="profile-row">
            <span className="profile-avatar">D</span>
            <span className="profile-copy"><strong>Devvrat</strong><small>Community preview</small></span>
            <ChevronDown size={15} className="profile-chevron" />
          </div>
        </div>
      </aside>

      <section className="main-panel">
        <header className="topbar">
          <button className="icon-button menu-button" aria-label="Open navigation" onClick={() => setMobileNav(true)}><Menu size={19} /></button>
          <div className="topbar-context"><span className="context-mark" /> Devvrats <span className="context-divider">/</span> <strong>Anu</strong></div>
          <div className="topbar-right"><span className="preview-tag"><span /> Private preview</span><button className="topbar-help" aria-label="About Anu" title="Anu is an AI guide for Devvrats"><CircleHelp size={19} /></button></div>
        </header>

        <div className={`conversation ${messages.length ? "conversation-active" : ""}`}>
          {messages.length === 0 ? (
            <div className="welcome-wrap">
              <div className="welcome-orb-wrap" aria-hidden="true"><div className="welcome-orb"><i /><b /></div><span className="orb-halo halo-one" /><span className="orb-halo halo-two" /></div>
              <p className="welcome-eyebrow"><Sparkles size={13} /> YOUR GUIDE WITHIN DEVVRATS</p>
              <h1>Namastey, Devvrat<span className="title-comma">.</span></h1>
              <p className="welcome-subtitle">I’m here to help you learn, build, and find your next step.</p>

              <form className="composer welcome-composer" onSubmit={handleSubmit}>
                <textarea aria-label="Message Anu" placeholder="Ask Anu anything..." value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={handleKeyDown} rows={1} maxLength={4000} />
                <div className="composer-bottom"><span className="composer-hint">Anu is learning the Devvrats ecosystem</span><button type="submit" className="send-button" aria-label="Send message" disabled={!input.trim() || busy}>{busy ? <span className="tiny-spinner" /> : <ArrowUp size={18} />}</button></div>
              </form>
              {notice && <div className="notice" role="alert">{notice}</div>}

              <div className="suggestions" aria-label="Suggested prompts">
                {suggestions.map(({ icon: Icon, label, prompt }) => <button key={label} className="suggestion" onClick={() => void sendMessage(prompt)}><span className="suggestion-icon"><Icon size={16} /></span><span>{label}</span><ArrowUp className="suggestion-arrow" size={14} /></button>)}
              </div>
              <p className="preview-caption">Anu is an AI companion. Check important information and keep sensitive details private.</p>
            </div>
          ) : (
            <div className="thread-wrap">
              <div className="thread-label"><span className="mini-orb" /> A conversation with Anu</div>
              <div className="message-list">
                {messages.map((message, index) => <article className={`message-row ${message.role}`} key={`${index}-${message.role}`}>
                  {message.role === "assistant" && <span className="message-orb" aria-hidden="true"><span /></span>}
                  <div className={`message-bubble ${message.role}`}><p>{message.text}</p>{message.sources?.length ? <div className="source-list">{message.sources.map((source) => <a key={source.url} href={source.url} className="source-link"><BookOpen size={13} /> {source.title}<ArrowUpRight size={12} /></a>)}</div> : null}</div>
                </article>)}
                {busy && <article className="message-row assistant"><span className="message-orb" aria-hidden="true"><span /></span><div className="typing-bubble"><i /><i /><i /></div></article>}
                {notice && <div className="notice thread-notice" role="alert">{notice}</div>}
                <div ref={endRef} />
              </div>
              <form className="composer thread-composer" onSubmit={handleSubmit}>
                <textarea aria-label="Message Anu" placeholder="Continue the conversation..." value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={handleKeyDown} rows={1} maxLength={4000} />
                <div className="composer-bottom"><span className="composer-hint">Shift + Enter for a new line</span><button type="submit" className="send-button" aria-label="Send message" disabled={!input.trim() || busy}>{busy ? <span className="tiny-spinner" /> : <ArrowUp size={18} />}</button></div>
              </form>
              <div className="thread-footnote">Anu can make mistakes. Verify important information.</div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
