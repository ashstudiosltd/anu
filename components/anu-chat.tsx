"use client";

import { CSSProperties, FormEvent, KeyboardEvent, useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { AnuOrb } from "./anu/orb";
import orbStyles from "./anu/orb.module.css";
import { useTheme } from "next-themes";
import { AnuActionCard, type ActionPreview } from "./anu/action-card";
import { AnuPwa } from "./anu-pwa";
import { AnuMessage } from "./anu-message";
import {
  ArrowUpRight,
  ArrowUp,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Square,
  MessageCircle,
  Plus,
  Sun,
  Moon,
  ShieldCheck,
  Users,
  UserRound,
  X,
  ChevronDown,
} from "lucide-react";

type Message = { role: "user" | "assistant"; text: string; sources?: Array<{ title: string; url: string }>; action?: ActionPreview; published?: { message: string; url: string } };
type Conversation = { id: string; title: string; updatedAt: number; messages: Message[]; space?: "anu" | "devvrats"; revision?: number; loaded?: boolean };
const HISTORY_KEY = "anu-session-conversations-v2";
type AccountSession = { user: { id: string; name: string } | null; remaining: number | null; loginUrl: string };
type AnuPreferences = { remember: string; response_style: string; theme: "light" | "dark" | "system" };
type MemberProfile = { account: { id: string; name: string; username: string | null; email: string | null }; preferences: AnuPreferences; hasPreferences: boolean };
const MAX_CONVERSATIONS = 20;
const MAX_STORED_CHARACTERS = 350_000;

function fitHistory(items: Conversation[]) {
  let result = items.filter((item) => item.updatedAt > Date.now() - 45 * 86400000).slice(0, MAX_CONVERSATIONS).map((item) => ({ ...item, messages: item.messages.slice(-60) }));
  while (JSON.stringify(result).length > MAX_STORED_CHARACTERS) {
    if (result.length > 1) result = result.slice(0, -1);
    else if (result[0]?.messages.length && result[0].messages.length > 1) result = [{ ...result[0], messages: result[0].messages.slice(-Math.ceil(result[0].messages.length / 2)) }];
    else break;
  }
  return result;
}

function makeConversation(id: string, messages: Message[], space: "anu" | "devvrats", revision = 0): Conversation {
  const firstUserMessage = messages.find((message) => message.role === "user")?.text || "Conversation with Anu";
  return {
    id,
    space,
    revision,
    loaded: true,
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

type DotState = "idle" | "listening" | "thinking" | "replying";

function LivingDot({ state = "idle", energy = 0, className = "" }: { state?: DotState; energy?: number; className?: string }) {
  return <span className={`living-dot dot-${state} ${className}`} style={{ "--dot-energy": energy } as CSSProperties} aria-hidden="true"><Image className="dot-body" src="/brands/anu-orb-plush.png" width={512} height={512} alt="" /></span>;
}

export function AnuChat({ localDemo = false }: { localDemo?: boolean }) {
  const { resolvedTheme, setTheme } = useTheme();
  const currentTheme = useRef(resolvedTheme);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [composerFocused, setComposerFocused] = useState(false);
  const [composerMenu, setComposerMenu] = useState(false);
  const [sidebarModeOpen, setSidebarModeOpen] = useState(false);
  const composerRef = useRef<HTMLDivElement>(null);
  const composerOrigin = useRef<DOMRect | null>(null);
  const composerAnimation = useRef<Animation | null>(null);
  const [welcomeIndex, setWelcomeIndex] = useState(-1);
  useEffect(() => {
    if (messages.length) return;
    const timer = window.setInterval(() => setWelcomeIndex((previous) => {
      const choices = [0, 1, 2].filter((value) => value !== previous);
      return choices[Math.floor(Math.random() * choices.length)];
    }), 6000);
    return () => window.clearInterval(timer);
  }, [messages.length]);
  function updateInput(value: string) {
    setInput(value);
  }
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [mobileNav, setMobileNav] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(272);
  const [search, setSearch] = useState("");
  const [searchMatches, setSearchMatches] = useState<Conversation[] | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [space, setSpace] = useState<"anu" | "devvrats">("anu");
  const [devvratsOpen, setDevvratsOpen] = useState(false);
  const devvratsRef = useRef<HTMLDialogElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const searchDialogRef = useRef<HTMLDialogElement>(null);
  const [clansOpen, setClansOpen] = useState(false);
  const clansRef = useRef<HTMLDialogElement>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDialogElement>(null);
  const [memberProfile, setMemberProfile] = useState<MemberProfile | null>(null);
  const [profileDraft, setProfileDraft] = useState<AnuPreferences>({ remember: "", response_style: "", theme: "system" });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileNotice, setProfileNotice] = useState("");
  const [account, setAccount] = useState<AccountSession | null>(localDemo ? { user: null, remaining: null, loginUrl: "/auth" } : null);
  const accountId = account?.user?.id;
  const visibleProfile = memberProfile?.account.id === accountId ? memberProfile : null;
  const profileLoading = !!accountId && !visibleProfile && !profileNotice;

  useEffect(() => { currentTheme.current = resolvedTheme; }, [resolvedTheme]);

  useEffect(() => {
    if (devvratsOpen && !devvratsRef.current?.open) devvratsRef.current?.showModal();
    if (!devvratsOpen && devvratsRef.current?.open) devvratsRef.current.close();
  }, [devvratsOpen]);

  useEffect(() => {
    if (searchOpen) { searchDialogRef.current?.showModal(); searchRef.current?.focus(); }
    else if (searchDialogRef.current?.open) searchDialogRef.current.close();
  }, [searchOpen]);
  useEffect(() => {
    if (clansOpen) clansRef.current?.showModal();
    else if (clansRef.current?.open) clansRef.current.close();
  }, [clansOpen]);
  useEffect(() => {
    if (profileOpen) profileRef.current?.showModal();
    else if (profileRef.current?.open) profileRef.current.close();
  }, [profileOpen]);

  useEffect(() => {
    let active = true;
    if (!accountId) return;
    void fetch("/api/profile", { cache: "no-store" }).then(async (response) => {
      const data = await response.json() as MemberProfile & { error?: string };
      if (!response.ok) throw new Error(data.error || "Your profile could not be loaded.");
      if (!active) return;
      setMemberProfile(data);
      const localTheme: AnuPreferences["theme"] = currentTheme.current === "dark" ? "dark" : "light";
      const synced: AnuPreferences = data.hasPreferences ? data.preferences : { ...data.preferences, theme: localTheme };
      setProfileDraft(synced);
      if (data.hasPreferences) setTheme(data.preferences.theme);
      setProfileNotice("");
    }).catch((error) => { if (active) setProfileNotice(error instanceof Error ? error.message : "Your profile could not be loaded."); });
    return () => { active = false; };
  }, [accountId, setTheme]);

  async function saveProfile() {
    setProfileSaving(true);
    setProfileNotice("");
    try {
      const response = await fetch("/api/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(profileDraft) });
      const data = await response.json() as { preferences?: AnuPreferences; error?: string };
      if (!response.ok || !data.preferences) throw new Error(data.error || "Your profile could not be saved.");
      setMemberProfile((current) => current ? { ...current, preferences: data.preferences!, hasPreferences: true } : current);
      setProfileDraft(data.preferences);
      setTheme(data.preferences.theme);
      setProfileNotice("Your profile is saved and synced with Devvrats.");
    } catch (error) { setProfileNotice(error instanceof Error ? error.message : "Your profile could not be saved."); }
    finally { setProfileSaving(false); }
  }

  async function changeTheme(nextTheme: "light" | "dark") {
    setTheme(nextTheme);
    setProfileDraft((current) => ({ ...current, theme: nextTheme }));
    if (!visibleProfile) return;
    try {
      const response = await fetch("/api/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...visibleProfile.preferences, theme: nextTheme }) });
      const data = await response.json() as { preferences?: AnuPreferences };
      if (response.ok && data.preferences) setMemberProfile((current) => current ? { ...current, preferences: data.preferences!, hasPreferences: true } : current);
    } catch { /* The chosen theme remains active on this device if sync is unavailable. */ }
  }

  function chooseSpace(next: "anu" | "devvrats") {
    if (next === "devvrats" && !account?.user) { setDevvratsOpen(true); return; }
    if (busy) return;
    if (next === space) return;
    setHistoryReady(false);
    setSearchOpen(false);
    setSearchMatches(null);
    setSpace(next);
    startNewChat();
  }
  const [historyReady, setHistoryReady] = useState(localDemo);
  const [freshReply, setFreshReply] = useState<number | null>(null);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const historyKey = useRef("");
  const identityRef = useRef<string | null>(null);
  const busyRef = useRef(false);
  const requestRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const presenceRef = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const privacyRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (localDemo) return;
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
        const owner = next.user?.id || "guest";
        const identity = `${owner}:${space}`;
        if (identityRef.current !== identity) {
          requestRef.current?.abort();
          setHistoryReady(false);
          setConversations([]);
          setMessages([]);
          setActiveConversationId(null);
          const key = `${HISTORY_KEY}:${identity}`;
          let restored: Conversation[] = [];
          try {
            restored = space === "devvrats" ? [] : restoreHistory(sessionStorage.getItem(key));
            if (!restored.length && space === "anu") restored = restoreHistory(sessionStorage.getItem(`${HISTORY_KEY}:${owner}`));
          } catch { /* Storage can be disabled. */ }
          let syncNotice = "";
          if (next.user) {
            try {
              const historyResponse = await fetch(space === "devvrats" ? "/api/sabha/conversations" : `/api/history?space=${space}`, { cache: "no-store" });
              const data = await historyResponse.json() as { error?: string; conversations: Conversation[] };
              if (!historyResponse.ok) throw new Error(data.error || "Chat sync is unavailable. Your history stays in this tab.");
              const remote = data.conversations as Conversation[];
              restored = fitHistory([
                ...remote.map((item) => { const local = restored.find((cached) => cached.id === item.id && cached.revision === item.revision && cached.loaded !== false); return local ? { ...item, messages: local.messages, loaded: true } : item; }),
                ...restored.filter((item) => !item.revision && !remote.some((row) => row.id === item.id)),
              ].sort((a, b) => b.updatedAt - a.updatedAt));
            } catch (error) { syncNotice = error instanceof Error ? error.message : "Chat sync is unavailable."; }
          }
          if (!active) return;
          historyKey.current = key;
          identityRef.current = identity;
          setConversations(restored);
          setActiveConversationId(null);
          setMessages([]);
          setInput("");
          setFreshReply(null);
          setNotice(syncNotice);
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
  }, [space, localDemo]);

  useEffect(() => {
    if (!historyReady || !historyKey.current || space === "devvrats") return;
    try { sessionStorage.setItem(historyKey.current, JSON.stringify(fitHistory(conversations))); } catch { /* Chat still works without storage. */ }
  }, [conversations, historyReady, space]);

  useEffect(() => {
    if (!searchOpen || !search.trim() || !account?.user) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`${space === "devvrats" ? "/api/sabha/conversations?" : `/api/history?space=${space}&`}q=${encodeURIComponent(search.trim().slice(0, 200))}`, { cache: "no-store", signal: controller.signal });
        const data = await response.json() as { conversations: Conversation[]; error?: string };
        if (!response.ok) throw new Error(data.error || "Could not search synced chats.");
        if (!controller.signal.aborted) setSearchMatches(data.conversations);
      } catch (error) { if (!controller.signal.aborted) setNotice(error instanceof Error ? error.message : "Could not search synced chats."); }
    }, 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [search, searchOpen, account?.user, space]);

  async function signOut() {
    if (busy) return;
    try {
      const response = await fetch("/api/auth/session", { method: "DELETE" });
      if (!response.ok) throw new Error("Could not sign out. Please try again.");
      try {
        if (historyKey.current) sessionStorage.removeItem(historyKey.current);
        if (account?.user) for (const suffix of [account.user.id, `${account.user.id}:anu`, `${account.user.id}:devvrats`]) sessionStorage.removeItem(`${HISTORY_KEY}:${suffix}`);
      } catch { /* Signing out still succeeds if browser storage is unavailable. */ }
      window.location.reload();
    } catch (error) { setNotice(error instanceof Error ? error.message : "Could not sign out."); }
  }

  useEffect(() => {
    const scroller = scrollRef.current;
    const presence = presenceRef.current;
    if (!messages.length || !scroller || !presence || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    let lastTop = scroller.scrollTop;
    let lastTime = 0;
    let motion = 0;
    let target = 0;
    const settle = (now: number) => {
      const dt = lastTime ? Math.min((now - lastTime) / 1000, .032) : 1 / 60;
      lastTime = now;
      motion += (target - motion) * (1 - Math.exp(-9 * dt));
      target *= Math.exp(-7 * dt);
      presence.style.setProperty("--scroll-drift", `${motion * 2.5}px`);
      presence.style.setProperty("--scroll-tilt", `${motion * .8}deg`);
      if (Math.abs(motion) + Math.abs(target) > .002) frame = requestAnimationFrame(settle);
      else { frame = 0; lastTime = 0; }
    };
    const followScroll = () => {
      target = Math.max(-1, Math.min(1, (scroller.scrollTop - lastTop) / 45));
      lastTop = scroller.scrollTop;
      if (!frame) frame = requestAnimationFrame(settle);
    };
    scroller.addEventListener("scroll", followScroll, { passive: true });
    return () => {
      scroller.removeEventListener("scroll", followScroll);
      cancelAnimationFrame(frame);
      presence.style.removeProperty("--scroll-drift");
      presence.style.removeProperty("--scroll-tilt");
    };
  }, [messages.length]);

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

  useLayoutEffect(() => {
    const origin = composerOrigin.current;
    const node = composerRef.current;
    composerOrigin.current = null;
    if (!origin || !node || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const destination = node.getBoundingClientRect();
    composerAnimation.current?.cancel();
    composerAnimation.current = node.animate([
      { transform: `translateY(${origin.top - destination.top}px)` },
      { transform: "translateY(0)" },
    ], { duration: 580, easing: "cubic-bezier(.22,.61,.36,1)" });
  }, [messages.length]);

  useEffect(() => () => {
    composerAnimation.current?.cancel();
    requestRef.current?.abort();
  }, []);

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
    if (!messages.length) composerOrigin.current = composerRef.current?.getBoundingClientRect() || null;
    setComposerMenu(false);
    setMessages(nextMessages);
    setConversations((current) => fitHistory([
      makeConversation(conversationId, nextMessages, space, conversations.find((item) => item.id === conversationId)?.revision || 0),
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
      if (localDemo) {
        // This branch is available only on the development-only /demo page.
        await new Promise<void>((resolve, reject) => {
          const abort = () => { window.clearTimeout(timer); reject(new DOMException("Stopped", "AbortError")); };
          const timer = window.setTimeout(() => { controller.signal.removeEventListener("abort", abort); resolve(); }, 1100);
          controller.signal.addEventListener("abort", abort, { once: true });
        });
        const reply = /\b(sad|lonely|worried)\b/i.test(text)
          ? "I’m here with you. We can take this one little step at a time. What’s on your mind?"
          : /\b(hi|hello|hey)\b/i.test(text)
            ? "Hey, you. I’m right here, keeping you company. What shall we explore together?"
            : "I’m listening. Tell me a little more — we can think it through together. This is a local practice conversation, so I’m only using a simulated reply.";
        const completed: Message[] = [...nextMessages, { role: "assistant", text: reply }];
        setMessages(completed);
        setFreshReply(completed.length - 1);
        setConversations((current) => fitHistory([
          makeConversation(conversationId, completed, space),
          ...current.filter((item) => item.id !== conversationId),
        ]));
        return;
      }
      const response = await fetch(space === "devvrats" ? "/api/sabha/chat" : "/api/chat", {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json", "x-anu-account": account.user?.id || "guest" },
        body: JSON.stringify({
          message: text,
          space,
          ...(space === "devvrats" ? { scope: `portal:${conversationId}`, turnId: crypto.randomUUID() } : { history: contextHistory }),
        }),
      });
      if (response.status === 409) { window.location.reload(); return; }
      const data = (await response.json()) as { reply?: string; error?: string; sources?: Message["sources"]; loginRequired?: boolean; action?: ActionPreview; published?: Message["published"]; actionNotice?: string; historySaved?: boolean };
      if (requestIdentity !== identityRef.current) return;
      if (!account.user && (response.ok || data.loginRequired)) setAccount((current) => current ? {...current, remaining: data.loginRequired ? 0 : Math.max(0, (current.remaining ?? 5)-1)} : current);
      if (!response.ok) throw new Error(data.error || "Anu couldn't answer just now. Please try again.");
      const completedMessages: Message[] = [...nextMessages, { role: "assistant", text: data.reply || "I couldn't form a response. Try asking another way.", sources: data.sources, action: data.action, published: data.published }];
      setMessages(completedMessages);
      setFreshReply(completedMessages.length - 1);
      setConversations((current) => fitHistory([
        makeConversation(conversationId, completedMessages, space, conversations.find((item) => item.id === conversationId)?.revision || 0),
        ...current.filter((item) => item.id !== conversationId),
      ]));
      if (space === "devvrats") {
        if (!data.historySaved) setNotice("This Sabha reply was not saved to your account.");
        if (data.actionNotice) setNotice(data.actionNotice);
        if (data.historySaved) setConversations((current) => current.map((item) => item.id === conversationId ? { ...item, revision: 1 } : item));
      }
      if (account.user && space === "anu") {
        const saved = makeConversation(conversationId, completedMessages, space, conversations.find((item) => item.id === conversationId)?.revision || 0);
        try {
          const sync = await fetch("/api/history", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...saved, messages: saved.messages.slice(-60).map(({ role, text }) => ({ role, text })) }), signal: controller.signal });
          const result = await sync.json() as { error?: string; revision: number; updatedAt: number };
          if (!sync.ok) throw new Error(result.error || "Chat sync is unavailable. This reply is saved in this tab.");
          if (identityRef.current !== requestIdentity) return;
          setConversations((current) => current.map((item) => item.id === conversationId ? { ...item, revision: result.revision, updatedAt: result.updatedAt } : item));
        } catch (error) {
          if (!controller.signal.aborted && identityRef.current === requestIdentity) setNotice(error instanceof Error ? error.message : "Chat sync is unavailable. This reply is saved in this tab.");
        }
      }
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

  async function openConversation(conversation: Conversation) {
    if (busyRef.current) return;
    const identity = identityRef.current;
    if (account?.user && conversation.revision) {
      busyRef.current = true; setBusy(true);
      try {
        const response = await fetch(space === "devvrats" ? `/api/sabha/history?scope=portal:${conversation.id}` : `/api/history?space=${space}&id=${conversation.id}`, { cache: "no-store" });
        const data = await response.json() as { error?: string; conversation: Conversation; turns?: Array<{ question: string; answer: string; sources: Message["sources"] }> };
        if (!response.ok) throw new Error(data.error || "Could not load this chat.");
        if (identity !== identityRef.current) return;
        conversation = space === "devvrats" ? { ...conversation, messages: (data.turns || []).flatMap((turn): Message[] => [{ role: "user", text: turn.question }, { role: "assistant", text: turn.answer, sources: turn.sources }]), loaded: true } : { ...data.conversation, loaded: true };
        setConversations((current) => current.map((item) => item.id === conversation.id ? conversation : item));
      } catch (error) { setNotice(error instanceof Error ? error.message : "Could not load this chat."); return; }
      finally { busyRef.current = false; setBusy(false); }
    }
    setActiveConversationId(conversation.id);
    setMessages(conversation.messages);
    setFreshReply(null);
    nearBottom.current = true;
    setNotice("");
    setInput("");
    setMobileNav(false);
  }

  async function deleteConversation(id: string) {
    if (busyRef.current) return;
    if (account?.user) {
      busyRef.current = true; setBusy(true);
      try {
        const response = await fetch(space === "devvrats" ? `/api/sabha/history?scope=portal:${id}` : `/api/history?space=${space}&id=${id}`, { method: "DELETE" });
        if (!response.ok) { const data = await response.json() as { error?: string }; throw new Error(data.error || "Could not delete this chat."); }
      } catch (error) { setNotice(error instanceof Error ? error.message : "Could not delete this chat."); return; }
      finally { busyRef.current = false; setBusy(false); }
    }
    const remaining = conversations.filter((conversation) => conversation.id !== id);
    setConversations(remaining);
    if (activeConversationId === id) {
      setActiveConversationId(null);
      setMessages([]);
      setNotice("");
      setInput("");
    }
  }

  const localMatches = conversations.filter((conversation) => !search.trim() || `${conversation.title} ${conversation.messages.map((message) => message.text).join(" ")}`.toLowerCase().includes(search.toLowerCase().trim()));
  const visibleConversations = searchOpen && search.trim() && account?.user && searchMatches ? [...searchMatches, ...localMatches.filter((item) => !searchMatches.some((match) => match.id === item.id))].slice(0, 20) : localMatches;
  const firstName = account?.user?.name.trim().split(/\s+/)[0] || "DEVVRAT";

  return (
    <main style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties} className={`anu-shell ${sidebarCollapsed ? "sidebar-collapsed" : ""} ${mobileNav ? "nav-is-open" : ""}`}>
      {mobileNav && <button aria-label="Close navigation" className="nav-scrim" onClick={() => setMobileNav(false)} />}
      <aside className={`sidebar ${mobileNav ? "sidebar-open" : ""}`} aria-label="Conversations" onClick={(event) => { if (sidebarCollapsed && !(event.target as HTMLElement).closest("button, a, input, [role=separator]")) setSidebarCollapsed(false); }}>
        <div className="brand-lockup">
          <div className="brand-mode-wrap">
            <button className="brand-mode-toggle" aria-haspopup="menu" aria-expanded={sidebarModeOpen} aria-label={`Switch chat mode. Current mode: ${space === "anu" ? "Anu" : "Devvrats"}`} onClick={() => setSidebarModeOpen((open) => !open)}>
              <LivingDot className="brand-dot" />
              <span className="brand-word">anu<span>.</span></span>
              <ChevronDown className="brand-mode-chevron" size={15} />
            </button>
            {sidebarModeOpen && <><button className="mode-menu-dismiss" aria-label="Close mode menu" onClick={() => setSidebarModeOpen(false)} /><div className="mode-menu sidebar-mode-menu" role="menu" aria-label="Choose Anu mode"><button type="button" role="menuitemradio" aria-checked={space === "anu"} onClick={() => { if (space !== "anu") chooseSpace("anu"); setSidebarModeOpen(false); }}><span className="mode-option-logo logo-anu" aria-hidden="true" /><span className="mode-option-copy"><strong>Anu</strong><small>Your guide within Devvrats</small></span>{space === "anu" && <span className="mode-check">✓</span>}</button><button type="button" role="menuitemradio" aria-checked={space === "devvrats"} onClick={() => { if (space !== "devvrats") chooseSpace("devvrats"); setSidebarModeOpen(false); }}><span className="mode-option-logo logo-devvrats" aria-hidden="true" /><span className="mode-option-copy"><strong>Devvrats</strong><small>Explore Sabha with Anu</small></span>{space === "devvrats" && <span className="mode-check">✓</span>}</button></div></>}
          </div>
          <div className="sidebar-tools"><button className="icon-button" aria-label="Search conversations" title="Search conversations" onClick={() => { setSearch(""); setSearchMatches(null); setSearchOpen(true); }}><Search size={17} /></button><button className="icon-button collapse-button" aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"} title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"} onClick={() => { if (window.matchMedia("(max-width: 780px)").matches) setMobileNav(false); else setSidebarCollapsed((value) => !value); }}>{sidebarCollapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}</button></div>
          <button className="icon-button mobile-close" aria-label="Close menu" onClick={() => setMobileNav(false)}><X size={18} /></button>
        </div>

        <button className="new-chat" title="New chat" aria-label="New chat" onClick={startNewChat} disabled={busy || !historyReady}><Plus size={16} /><span>New chat</span> <span className="new-chat-mark">↗</span></button>
        <button className="side-link clans-link" title="Clans" aria-label="Clans" onClick={() => setClansOpen(true)}><Users size={18} /><span>Clans</span></button>
        <div className="history-heading"><p>Recents</p></div>
        <div className="history-list">
          {conversations.length ? conversations.map((conversation) => (
            <div className={`history-item ${activeConversationId === conversation.id ? "history-item-active" : ""}`} key={conversation.id}>
              <button className="history-open" onClick={() => openConversation(conversation)} disabled={busy} title={conversation.title} aria-current={activeConversationId === conversation.id ? "true" : undefined}>
                <MessageCircle size={14} /><span>{conversation.title}</span>
              </button>
              <button className="icon-button history-delete" onClick={() => deleteConversation(conversation.id)} disabled={busy} aria-label={`Delete conversation: ${conversation.title}`} title="Delete conversation"><X size={13} /></button>
            </div>
          )) : null}
        </div>

        <div className="sidebar-bottom">
          <AnuPwa />
          <a className="side-link" aria-label="Devvrats" title="Devvrats" href="https://www.devvrats.in/" target="_blank" rel="noreferrer"><span>Devvrats</span></a>
          <a className="side-link" aria-label="What Anu knows" title="What Anu knows" href="/sources/foundation"><span>What Anu knows</span></a>
          <button className="side-link" title="Memory & privacy" aria-label="Memory and privacy" onClick={() => setPrivacyOpen(true)}><span>Memory &amp; privacy</span></button>
          <div className="sidebar-account">{account?.user ? <><button className="account-avatar" aria-label="Open profile" title="Profile" onClick={() => setProfileOpen(true)}><UserRound size={18} /></button><div><strong>{account.user.name}</strong></div><button className="icon-button" aria-label="Sign out" title="Sign out" onClick={() => void signOut()} disabled={busy}><ArrowUpRight size={16} /></button></> : <Link className="sidebar-sign-in" href={account?.loginUrl || "/auth"} title="Sign in"><UserRound size={19} /><span>Sign in</span><ArrowUpRight size={15} /></Link>}</div>
        </div>
        <div className="sidebar-resize" role="separator" aria-label="Resize sidebar" aria-orientation="vertical" aria-valuemin={64} aria-valuemax={400} aria-valuenow={sidebarCollapsed ? 64 : sidebarWidth} tabIndex={0}
          onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); }}
          onPointerMove={(event) => { if (!event.currentTarget.hasPointerCapture(event.pointerId)) return; const width = event.clientX - event.currentTarget.parentElement!.getBoundingClientRect().left; setSidebarCollapsed(width < 150); setSidebarWidth(Math.max(220, Math.min(400, width))); }}
          onPointerUp={(event) => event.currentTarget.releasePointerCapture(event.pointerId)}
          onKeyDown={(event) => { if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); if (event.key === "ArrowLeft" && sidebarWidth <= 220) setSidebarCollapsed(true); else { setSidebarCollapsed(false); setSidebarWidth((width) => Math.max(220, Math.min(400, width + (event.key === "ArrowLeft" ? -20 : 20)))); } } }} />
      </aside>

      <section className="main-panel" aria-label="Chat with Anu">
        <header className="topbar">
          <button className="icon-button menu-button" aria-label="Open conversations" aria-expanded={mobileNav} onClick={() => setMobileNav(true)}><Menu size={20} /></button>
          <button className="icon-button theme-toggle topbar-theme" onClick={() => void changeTheme(resolvedTheme === "dark" ? "light" : "dark")} aria-label="Switch between light and dark theme" title="Switch light / dark theme"><Sun className="sun-icon" size={19} /><Moon className="moon-icon" size={19} /></button>
        </header>
        {notice && <div className="notice topbar-notice" role="alert">{notice}</div>}

        <div className={`chat-stage ${messages.length ? "has-messages" : "is-welcome"}`}>
          <div ref={presenceRef} className={`${orbStyles.presence} ${messages.length ? orbStyles.presenceChat : ""}`} aria-label={messages.length ? "Anu is here with you" : "Meet Anu"}>
            <AnuOrb inputRef={textareaRef} value={input} focused={composerFocused} busy={busy} chatting={messages.length > 0} replying={freshReply !== null} />
          </div>
          <div className={`conversation-scroll ${messages.length ? orbStyles.conversation : ""}`} ref={scrollRef} onScroll={(event) => {
            const node = event.currentTarget;
            nearBottom.current = node.scrollHeight - node.scrollTop - node.clientHeight < 120;
          }}>
            {messages.length === 0 ? (
              <div className="welcome-wrap">
                <h1 key={welcomeIndex} className="dynamic-greeting">
                  {welcomeIndex === -1 ? <>Namastey, <span className="greeting-highlight">{firstName}</span>.</> : welcomeIndex === 0 ? <>What is <span className="greeting-highlight">Anu</span>?</> : welcomeIndex === 1 ? <>What is <span className="greeting-highlight">Pata</span>?</> : <><span className="greeting-highlight">{firstName}</span>, what are you building?</>}
                </h1>
              </div>
            ) : (
              <div className="thread-wrap" key={activeConversationId}>
                <div className="message-list" role="log" aria-label="Conversation messages" aria-live="polite" aria-relevant="additions">
                  {messages.map((message, index) => <article className={`message-row ${message.role} ${index === freshReply ? "fresh-message" : ""} ${orbStyles.message}`} key={`${index}-${message.role}`}>
                    <div className={`message-bubble ${message.role}`} aria-label={message.role === "user" ? "Your message" : "Anu’s reply"}>
                      {message.role === "assistant" ? <AnuMessage text={message.text} fresh={index === freshReply} /> : <p>{message.text}</p>}
                      {space === "devvrats" && message.sources?.length ? <div className="source-list">{message.sources.map((source) => <a key={source.url} className="source-link" href={source.url} target="_blank" rel="noreferrer">{source.title} ↗</a>)}</div> : null}
                      {message.action && <AnuActionCard action={message.action} endpoint="/api/sabha/actions" />}
                      {message.published && <div className="anu-action-card" role="status"><strong>{message.published.message}</strong><a href={`https://sabha.devvrats.in${message.published.url}`} target="_blank" rel="noreferrer">View in Sabha ↗</a></div>}
                    </div>
                  </article>)}
                </div>
                {busy && <div className="message-row assistant thinking-row" role="status" aria-label="Anu is thinking"><div className="typing-bubble" aria-hidden="true"><i /><i /><i /></div></div>}
              </div>
            )}
          </div>

          <div className="composer-dock" ref={composerRef}>
            <form className="composer" onSubmit={handleSubmit}>
              <div className="composer-meta">
                {space === "anu" ? <LivingDot className="composer-living-dot" state={busy ? "replying" : input.trim() ? "listening" : "idle"} energy={Math.min(input.trim().length / 80, 1)} /> : <span className={`composer-active-logo logo-devvrats ${busy ? "brand-replying" : input.trim() ? "brand-listening" : ""}`} aria-hidden="true" />}
              </div>
              <div className="composer-input-shell">
                <div className="composer-add-wrap">
                  <button type="button" className="icon-button composer-add" aria-label="Chat options" aria-expanded={composerMenu} onClick={() => setComposerMenu((open) => !open)}><Plus size={20} /></button>
                  {composerMenu && <><button type="button" className="composer-menu-dismiss" aria-label="Close chat options" onClick={() => setComposerMenu(false)} /><div className="composer-menu"><button type="button" onClick={() => { setComposerMenu(false); startNewChat(); }} disabled={busy || !historyReady}><Plus size={15} />New chat</button><button type="button" onClick={() => { setComposerMenu(false); setPrivacyOpen(true); }}><ShieldCheck size={15} />Memory &amp; privacy</button></div></>}
                </div>
                <textarea ref={textareaRef} onFocus={() => setComposerFocused(true)} onBlur={() => setComposerFocused(false)} aria-label="Message" placeholder="Ask anything…" value={input} onChange={(event) => updateInput(event.target.value)} onKeyDown={handleKeyDown} rows={1} maxLength={space === "devvrats" ? 2000 : account?.user ? 4000 : 1000} />
                {busy ? <button type="button" className="send-button stop-button" aria-label="Stop response" onClick={() => requestRef.current?.abort()}><Square size={13} fill="currentColor" /></button> : <button type="submit" className="send-button" aria-label="Send message" disabled={!input.trim() || !historyReady}><ArrowUp size={19} /></button>}
              </div>
            </form>
            {localDemo && <div className="guest-access">Local preview · simulated replies</div>}
            {!localDemo && !account?.user && account && <div className="guest-access">{account.remaining === 0 ? "Your preview is complete." : `${account.remaining ?? 0} preview ${(account.remaining ?? 0) === 1 ? "message" : "messages"} available.`} Sign in with <Link href="/auth" prefetch={false} aria-label="Sign in with Devvrats">Devvrats</Link></div>}
            <div className="composer-footnote"><span>Anu can make mistakes. Verify what matters.</span></div>
          </div>
        </div>
      </section>
      <dialog ref={searchDialogRef} className="chat-search-dialog" aria-label="Search Anu conversations" onClose={() => { setSearchOpen(false); setSearch(""); }} onClick={(event) => { if (event.target === event.currentTarget) setSearchOpen(false); }}>
        <div className="chat-search-input"><Search size={20} /><input ref={searchRef} aria-label="Search conversation history" placeholder="Search…" value={search} onChange={(event) => { setSearchMatches(null); setSearch(event.target.value); }} /><button className="icon-button" aria-label="Close search" onClick={() => setSearchOpen(false)}><X size={18} /></button></div>
        <p className="search-heading">{search.trim() ? "Search results" : "Recent chats"}</p>
        <div className="search-results">{visibleConversations.map((conversation) => <button className="search-result" key={conversation.id} disabled={busy} onClick={() => { openConversation(conversation); setSearchOpen(false); }}><MessageCircle size={18} /><span><strong>{conversation.title}</strong>{search.trim() && <small>{conversation.messages.find((message) => message.text.toLowerCase().includes(search.toLowerCase().trim()))?.text.slice(0, 140)}</small>}</span><ArrowUpRight size={15} /></button>)}{!visibleConversations.length && <p className="search-empty">{search.trim() ? "No conversations match your search." : "No conversations yet."}</p>}</div>
      </dialog>
      <dialog ref={clansRef} className="privacy-dialog" aria-labelledby="clans-heading" onClose={() => setClansOpen(false)} onClick={(event) => { if (event.target === event.currentTarget) setClansOpen(false); }}><div className="dialog-heading"><Users size={23} /><button className="icon-button" aria-label="Close clans" onClick={() => setClansOpen(false)}><X size={18} /></button></div><h2 id="clans-heading">Clans</h2><p>Clans aren’t connected to Anu yet. This space will hold your groups when they’re available.</p></dialog>
      <dialog ref={profileRef} className="privacy-dialog profile-dialog" aria-labelledby="profile-heading" onClose={() => setProfileOpen(false)} onClick={(event) => { if (event.target === event.currentTarget) setProfileOpen(false); }}>
        <div className="dialog-heading"><UserRound size={23} /><button className="icon-button" aria-label="Close profile" onClick={() => setProfileOpen(false)}><X size={18} /></button></div>
        <h2 id="profile-heading">Your Anu profile</h2>
        {!account?.user ? <><p>Sign in with Devvrats to sync your profile and preferences across your devices.</p><Link className="devvrats-cta" href={account?.loginUrl || "/auth"}>Continue with Devvrats <ArrowUpRight size={16} /></Link></> : <>
          <section className="profile-account"><span className="profile-avatar"><UserRound size={19} /></span><div><strong>{visibleProfile?.account.name || account.user.name}</strong><span>{visibleProfile?.account.email || "Signed in with Devvrats"}</span>{visibleProfile?.account.username && <span>@{visibleProfile.account.username}</span>}</div><a href="https://sabha.devvrats.in/settings/profile" target="_blank" rel="noreferrer">Manage account <ArrowUpRight size={13} /></a></section>
          <label className="profile-label" htmlFor="profile-remember">What should Anu remember about you?</label>
          <textarea id="profile-remember" className="profile-textarea" maxLength={1500} placeholder="Your role, goals, projects, or details that help Anu give relevant answers…" value={profileDraft.remember} onChange={(event) => setProfileDraft((current) => ({ ...current, remember: event.target.value }))} />
          <label className="profile-label" htmlFor="profile-style">How would you like Anu to respond?</label>
          <textarea id="profile-style" className="profile-textarea profile-style" maxLength={1000} placeholder="For example: concise answers, explain unfamiliar terms, use examples…" value={profileDraft.response_style} onChange={(event) => setProfileDraft((current) => ({ ...current, response_style: event.target.value }))} />
          <label className="profile-label">Theme</label>
          <div className="profile-theme" role="group" aria-label="Choose theme"><button type="button" aria-pressed={profileDraft.theme === "light"} onClick={() => setProfileDraft((current) => ({ ...current, theme: "light" }))}>Light</button><button type="button" aria-pressed={profileDraft.theme === "dark"} onClick={() => setProfileDraft((current) => ({ ...current, theme: "dark" }))}>Dark</button><button type="button" aria-pressed={profileDraft.theme === "system"} onClick={() => setProfileDraft((current) => ({ ...current, theme: "system" }))}>System</button></div>
          <p className="profile-privacy">Your profile notes are private to your Devvrats account and shape replies in both Anu and DEVVRATS. Anu includes them with your message when asking Google Gemini; don’t add passwords, keys, or details you wouldn’t want processed to answer you.</p>
          {profileNotice && <p className="profile-status" role="status">{profileNotice}</p>}
          <div className="profile-actions"><button className="profile-save" type="button" onClick={() => void saveProfile()} disabled={profileLoading || profileSaving}>{profileSaving ? "Saving…" : "Save profile"}</button>{profileLoading && <span>Syncing profile…</span>}</div>
        </>}
      </dialog>
      <dialog ref={devvratsRef} className="devvrats-dialog" aria-labelledby="devvrats-heading" onClose={() => setDevvratsOpen(false)} onClick={(event) => { if (event.target === event.currentTarget) setDevvratsOpen(false); }}>
        <button className="icon-button devvrats-close" aria-label="Close Devvrats introduction" onClick={() => setDevvratsOpen(false)}><X size={19} /></button>
        <h2 id="devvrats-heading">Anu, within Sabha.</h2>
        <p>Explore Sabha, understand your projects, and turn ideas into reviewed posts and changes.</p>
        <p className="devvrats-dialog-detail">Sign in with Devvrats to continue. Anu uses your Sabha permissions. You review and confirm changes before they’re made.</p>
        <Link className="devvrats-cta" href={account?.loginUrl || "/auth"}>Continue with Devvrats <ArrowUpRight size={16} /></Link>
        <a className="devvrats-learn" href="https://www.devvrats.in/" target="_blank" rel="noreferrer">Discover Devvrats</a>
      </dialog>
      <dialog ref={privacyRef} className="privacy-dialog" onClose={() => setPrivacyOpen(false)} onClick={(event) => { if (event.target === event.currentTarget) setPrivacyOpen(false); }}>
        <div className="dialog-heading"><ShieldCheck size={20} /><button className="icon-button" aria-label="Close privacy information" onClick={() => setPrivacyOpen(false)}><X size={19} /></button></div>
        <h2>Your chats, your space.</h2>
        <p>ANU and DEVVRATS have separate histories. Signed-in chats sync to your account when connected. DEVVRATS chats use Sabha’s history, with source access rechecked when reopened. Guest chats stay in this browser tab.</p>
        <p>ANU keeps up to 20 chats with recent text within a compact storage limit. DEVVRATS keeps up to 20 portal chats with 20 recent question-and-answer turns each. History expires after 45 days; older context may be omitted. DEVVRATS transcripts are not copied into this browser’s session storage.</p>
        <p>You can delete a chat from the sidebar. Deletion removes its synced record and this tab’s local copy. Deleting chats does not erase content already sent to Google. Keep sensitive information out of chat.</p>
        <a href="https://ai.google.dev/gemini-api/terms" target="_blank" rel="noreferrer">Google’s Gemini API terms <ArrowUpRight size={13} /></a>
        <p className="dialog-note">Signing out removes this account’s local cache from this tab. Synced chats remain until deleted or expired. Anu receives your verified display name and the selected conversation’s recent messages, not your entire history.</p>
      </dialog>
    </main>
  );
}
