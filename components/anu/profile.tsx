"use client";
/* eslint-disable @next/next/no-img-element -- Member avatars are loaded client-side without server proxying. */

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Check, Globe, MapPin, Pencil, ShieldCheck, UserRound } from "lucide-react";
import type { AnuMemberPreferences, AnuMemberProfile, MemberAccount } from "@/lib/anu/profile-types";
import styles from "./profile.module.css";

type Props = {
  profile: AnuMemberProfile | null;
  signedIn: boolean;
  loading: boolean;
  notice: string;
  saving: boolean;
  loginUrl: string;
  draft: AnuMemberPreferences;
  setDraft: (next: AnuMemberPreferences) => void;
  savePreferences: () => void;
  onProfileChange: (profile: AnuMemberProfile) => void;
};
const editable = (account: MemberAccount) => ({ name: account.name, username: account.username || "", bio: account.bio || "", role: account.role || "", skills: account.skills || "", interests: account.interests || "", website: account.website || "", location: account.location || "", location_public: account.location_public });
const safeWebsite = (value: string | null | undefined) => { try { const url = new URL(value || ""); return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password ? url.href : undefined; } catch { return undefined; } };
const safeImage = (value: string | null | undefined) => { try { const url = new URL(value || ""); return url.protocol === "https:" && !url.username && !url.password ? url.href : undefined; } catch { return undefined; } };

export function AnuProfile(props: Props) {
  const { profile, draft, setDraft } = props;
  const [tab, setTab] = useState("about");
  const [editing, setEditing] = useState(false);
  const [accountDraft, setAccountDraft] = useState(profile ? editable(profile.account) : null);
  const [savingAccount, setSavingAccount] = useState(false);
  const [accountNotice, setAccountNotice] = useState("");
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const account = profile?.account;
  async function saveAccount() {
    if (!accountDraft || savingAccount) return;
    const request = new AbortController(); controller.current = request;
    setSavingAccount(true); setAccountNotice("");
    try {
      const response = await fetch("/api/profile", { method: "PUT", headers: { "Content-Type": "application/json", "x-anu-account": profile?.account.id || "guest" }, signal: request.signal, body: JSON.stringify({ section: "account", account: accountDraft }) });
      const data = await response.json() as AnuMemberProfile & { error?: string };
      if (!response.ok || !data.account) throw new Error(data.error || "Your profile could not be saved.");
      if (request.signal.aborted) return;
      props.onProfileChange(data); setAccountDraft(editable(data.account)); setEditing(false); setAccountNotice("Your Devvrats profile is updated.");
    } catch (error) { if (!request.signal.aborted) setAccountNotice(error instanceof Error ? error.message : "Please try again."); }
    finally { if (!request.signal.aborted) setSavingAccount(false); }
  }
  return <div className={styles.profile}>
    <div className={styles.cover} aria-hidden="true"><span /><span /><span /></div>
    <div className={styles.identity}>
      <div className={styles.avatar}>
        {/* Remote member images stay client-side and are never fetched by the server. */}
        {safeImage(account?.avatar_url) ? <img src={safeImage(account?.avatar_url)} alt="" referrerPolicy="no-referrer" onError={(event) => { event.currentTarget.style.display = "none"; }} /> : <UserRound size={32} />}
      </div>
      <div className={styles.identityText}><p className={styles.eyebrow}>Your Devvrats account</p><h3>{account?.name || (props.loading ? "Loading your profile…" : "Make yourself at home.")}</h3>{account?.username && <span>@{account.username}</span>}{account?.role && <p>{account.role}</p>}</div>
      {account && <button type="button" className={styles.editButton} onClick={() => { setAccountDraft(editable(account)); setEditing(!editing); setTab("about"); }} disabled={savingAccount}><Pencil size={14} />{editing ? "Cancel" : "Edit profile"}</button>}
    </div>
    {!props.signedIn ? <div className={styles.guest}><p>One profile, across Anu and Sabha. Sign in with your Devvrats account to personalize your experience.</p><a href={props.loginUrl}>Continue with Devvrats <ArrowUpRight size={16} /></a></div> : <>
      <div className={styles.tabs} role="tablist" aria-label="Profile sections">{[["about", "Profile"], ["personalize", "Anu & you"], ["appearance", "Appearance"]].map(([id, label]) => <button key={id} type="button" id={`profile-tab-${id}`} role="tab" aria-selected={tab === id} aria-controls={`profile-panel-${id}`} tabIndex={tab === id ? 0 : -1} onKeyDown={(event) => { if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return; event.preventDefault(); const ids = ["about", "personalize", "appearance"]; const index = event.key === "Home" ? 0 : event.key === "End" ? 2 : (ids.indexOf(tab) + (event.key === "ArrowRight" ? 1 : 2)) % 3; setTab(ids[index]); document.getElementById(`profile-tab-${ids[index]}`)?.focus(); }} onClick={() => setTab(id)}>{label}</button>)}</div>
      <div id={`profile-panel-${tab}`} role="tabpanel" aria-labelledby={`profile-tab-${tab}`} className={styles.content}>
        {props.loading ? <p role="status">Loading your Devvrats details…</p> : !profile ? <p role="alert">{props.notice || "Your profile is unavailable. Close this window and try again."}</p> : tab === "about" ? <>
          {editing && accountDraft ? <form className={styles.form} onSubmit={(event) => { event.preventDefault(); void saveAccount(); }}>
            <div className={styles.fieldGrid}>{([["name", "Display name", 80], ["username", "Username", 30], ["role", "Role", 80], ["website", "Website", 300], ["location", "Location", 120], ["skills", "Skills", 500], ["interests", "Interests", 500]] as const).map(([key, label, max]) => <label key={key}>{label}<input value={accountDraft[key]} onChange={(event) => setAccountDraft({ ...accountDraft, [key]: event.target.value })} maxLength={max} required={key === "name" || key === "username"} minLength={key === "name" ? 2 : key === "username" ? 3 : undefined} pattern={key === "username" ? "[a-z0-9_]{3,30}" : undefined} type={key === "website" ? "url" : "text"} autoComplete={key === "name" ? "name" : key === "username" ? "username" : "off"} disabled={savingAccount} /></label>)}</div>
            <label>Introduction<textarea value={accountDraft.bio} onChange={(event) => setAccountDraft({ ...accountDraft, bio: event.target.value })} maxLength={500} rows={3} disabled={savingAccount} /></label>
            <label className={styles.checkbox}><input type="checkbox" checked={accountDraft.location_public} onChange={(event) => setAccountDraft({ ...accountDraft, location_public: event.target.checked })} disabled={savingAccount} />Show my location on my public Devvrats profile</label>
            <p className={styles.note}>These changes update your shared Devvrats profile, including Sabha.</p><button className={styles.primary} type="submit" disabled={savingAccount}>{savingAccount ? "Saving…" : "Save profile"}<Check size={15} /></button>
          </form> : <div className={styles.overview}>
            <section className={styles.card}><h4>Introduction</h4><p>{account?.bio || "Add a little about yourself, your work, and what you’re exploring."}</p>{account?.skills && <><h5>Skills</h5><p>{account.skills}</p></>}{account?.interests && <><h5>Interests</h5><p>{account.interests}</p></>}{safeWebsite(account?.website) && <p className={styles.detail}><Globe size={15} /><a href={safeWebsite(account?.website)} target="_blank" rel="noreferrer">{account?.website?.replace(/^https?:\/\//, "")}<ArrowUpRight size={12} /></a></p>}{account?.location && <p className={styles.detail}><MapPin size={15} />{account.location}<small>{account.location_public ? "Public" : "Private"}</small></p>}</section>
            <section className={styles.card}><h4>Account details</h4><dl><dt>Email</dt><dd>{account?.email || "Not provided"}</dd><dt>Member since</dt><dd>{account?.joined_at && Number.isFinite(Date.parse(account.joined_at)) ? new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(new Date(account.joined_at)) : "Not available"}</dd><dt>Profile source</dt><dd>Devvrats / Sabha</dd></dl><a className={styles.manage} href="https://sabha.devvrats.in/settings/profile" target="_blank" rel="noreferrer">Manage photo & shared account <ArrowUpRight size={14} /></a><p className={styles.note}>Email and contact details are displayed here for you and are not included in Anu’s AI context.</p></section>
          </div>}
        </> : tab === "personalize" ? <div className={styles.form}><h4>A little context goes a long way.</h4><p className={styles.note}>Anu uses your Devvrats introduction, role, skills, and interests when relevant. Private notes below are yours to edit or clear. Relevant context is processed by the existing AI provider to answer your message.</p><label>What would you like Anu to remember?<textarea rows={4} maxLength={1500} value={draft.remember} onChange={(event) => setDraft({ ...draft, remember: event.target.value })} placeholder="Your goals, current projects, or how you like to learn…" /></label><label>How should Anu respond?<textarea rows={3} maxLength={1000} value={draft.response_style} onChange={(event) => setDraft({ ...draft, response_style: event.target.value })} placeholder="For example: keep it concise and use practical examples." /></label><p className={styles.note}><ShieldCheck size={15} />Notes are private to your account. Keep passwords and sensitive information out of them.</p><button type="button" className={styles.primary} disabled={props.saving} onClick={props.savePreferences}>{props.saving ? "Saving…" : "Save preferences"}<Check size={15} /></button></div> : <div className={styles.form}><h4>A space that feels like you.</h4><p className={styles.note}>Choose how Anu’s app looks across your signed-in sessions.</p><div className={styles.themes} role="group" aria-label="Theme">{(["light", "dark", "system"] as const).map((theme) => <button key={theme} type="button" aria-pressed={draft.theme === theme} onClick={() => setDraft({ ...draft, theme })}><span className={styles.themePreview} data-theme={theme} />{theme[0].toUpperCase() + theme.slice(1)}{draft.theme === theme && <Check size={14} />}</button>)}</div><button type="button" className={styles.primary} disabled={props.saving} onClick={props.savePreferences}>{props.saving ? "Saving…" : "Save appearance"}<Check size={15} /></button></div>}
        {(accountNotice || props.notice) && <p className={styles.status} role="status">{accountNotice || props.notice}</p>}
      </div>
    </>}
  </div>;
}
