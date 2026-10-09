import Link from "next/link";

export default function FoundationSources() {
  return (
    <main className="source-page">
      <Link className="source-back" href="/">← Back to Anu</Link>
      <div className="source-orb" aria-hidden="true"><span /></div>
      <p className="source-eyebrow">ANU KNOWLEDGE · SOURCE NOTE</p>
      <h1>Devvrats sources</h1>
      <p className="source-lead">Anu’s Devvrats knowledge combines the community’s public website with founder-provided reports about its vision.</p>
      <section className="source-card">
        <h2>Official public website</h2>
        <p><a href="https://www.devvrats.in/" target="_blank" rel="noreferrer">devvrats.in</a> describes Devvrats’ community mission and introduces Anu, Sabha, Pata, ranked kata challenges, and Devvrats ID.</p>
      </section>
      <section className="source-card">
        <h2>Founder-provided reports</h2>
        <ul>
          <li>Longer-term Devvrats ecosystem vision.</li>
          <li>Proposed DID and Patas capabilities and roadmap.</li>
          <li>Anu’s character, principles, and intended role.</li>
        </ul>
      </section>
      <aside className="source-caution"><strong>Public descriptions and preview access are different.</strong> The website describes Devvrats products, while founder reports add future plans. This local preview does not connect to live Sabha, DID, Pata/Patas, GitHub, member, or project data. Anu should say when a current implementation detail cannot be verified.</aside>
    </main>
  );
}
