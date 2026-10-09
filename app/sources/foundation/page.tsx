import Link from "next/link";

export default function FoundationSources() {
  return (
    <main className="source-page">
      <Link className="source-back" href="/">← Back to Anu</Link>
      <div className="source-orb" aria-hidden="true"><span /></div>
      <p className="source-eyebrow">ANU KNOWLEDGE · SOURCE NOTE</p>
      <h1>Devvrats foundation reports</h1>
      <p className="source-lead">This preview uses founder-provided reports describing the vision for Devvrats and Anu.</p>
      <section className="source-card">
        <h2>What these notes cover</h2>
        <ul>
          <li>Devvrats as a developer community and connected ecosystem.</li>
          <li>Sabha as the community and collaboration space for blogs, conversations, and projects.</li>
          <li>DID as a proposed developer identity and contribution layer.</li>
          <li>Patas as a proposed progression and recognition layer.</li>
          <li>Anu’s character, principles, privacy boundaries, and intended roadmap.</li>
        </ul>
      </section>
      <aside className="source-caution"><strong>Vision is not proof of launch.</strong> These reports describe intended products and future capabilities. This preview does not connect to live Sabha, DID, Patas, or GitHub data. Anu should say when a current implementation detail cannot be verified.</aside>
    </main>
  );
}
