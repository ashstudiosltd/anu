import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function FoundationSources() {
  return (
    <main className="source-page">
      <Link className="source-back" href="/"><ArrowLeft size={17} aria-hidden="true" />Back to Anu</Link>
      <div className="source-orb" aria-hidden="true" />
      <p className="source-eyebrow">ANU · KNOWLEDGE</p>
      <h1>What Anu knows</h1>
      <p className="source-lead">Our story, our community, and the things we’re building together.</p>
      <section className="source-card report-brief">
        <h2>The Devvrats report, in brief</h2>
        <p>Devvrats brings people together to learn, create, and grow. Founded by Ashutosh Kahlon, its identity carries the slogan <strong>RISE</strong>. Sabha is the community space, DID is the developer identity initiative in development, and Anu is a core AI member helping people find their next step.</p>
        <p className="report-edition">Based on the Devvrats Master Report and Anu Knowledge Guide · 17 October 2026</p>
      </section>
      <section className="source-card">
        <h2>A grounded understanding</h2>
        <p>Anu draws on the report’s history, product descriptions, and reference answers, alongside <a href="https://www.devvrats.in/" target="_blank" rel="noreferrer">Devvrats’ public website</a>. Plans stay plans, and details that haven’t been confirmed stay open.</p>
      </section>
      <section className="source-card">
        <h2>Help within Sabha</h2>
        <p>Anu can explain shared context, summarize articles, and help you understand projects, discussions, and code when Sabha provides those records. She only uses what the connected experience makes available to your account.</p>
      </section>
      <p className="source-note">The report informs Anu’s answers. It doesn’t give her access to private profiles, every community record, or permanent memory.</p>
    </main>
  );
}
