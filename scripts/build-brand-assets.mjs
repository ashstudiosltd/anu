import sharp from "sharp";
import { mkdir, readFile, writeFile } from "node:fs/promises";

// One image source for the sidebar, chat avatars, favicons, and installed app.
const orb = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
<defs>
  <radialGradient id="body" cx=".32" cy=".24" r=".87"><stop stop-color="#e2cafa"/><stop offset=".43" stop-color="#c1a0e5"/><stop offset=".77" stop-color="#a181cd"/><stop offset="1" stop-color="#8162ad"/></radialGradient>
  <filter id="plush" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency=".7" numOctaves="3" seed="19" result="fiber"/><feColorMatrix in="fiber" type="saturate" values="0"/><feComponentTransfer result="pile"><feFuncR type="linear" slope=".25" intercept=".79"/><feFuncG type="linear" slope=".25" intercept=".79"/><feFuncB type="linear" slope=".25" intercept=".79"/></feComponentTransfer><feBlend in="SourceGraphic" in2="pile" mode="multiply"/><feComposite in2="SourceGraphic" operator="in"/></filter>
  <radialGradient id="light" cx=".32" cy=".21" r=".8"><stop stop-color="#f0e2ff" stop-opacity=".3"/><stop offset="1" stop-color="#d5b8f9" stop-opacity="0"/></radialGradient>
  <linearGradient id="edge" x1="0" y1="0" x2="0" y2="1"><stop offset=".65" stop-color="white"/><stop offset="1" stop-color="white"/></linearGradient>
  <filter id="soft"><feGaussianBlur stdDeviation="1.7"/></filter>
  <mask id="fade"><circle cx="256" cy="252" r="218" fill="url(#edge)" filter="url(#soft)"/></mask>
</defs>
<g mask="url(#fade)" filter="url(#plush)"><circle cx="256" cy="252" r="238" fill="url(#body)"/><circle cx="256" cy="252" r="238" fill="url(#light)"/></g>
<g fill="#100d14"><path d="M203 155 C203 118 241 118 241 155 Q222 161 203 155Z"/><path d="M271 155 C271 118 309 118 309 155 Q290 161 271 155Z"/></g>
<path d="M202 189 Q256 228 310 189" fill="none" stroke="#100d14" stroke-width="12" stroke-linecap="round"/>
</svg>`;
await mkdir("public/brands", { recursive: true });
await mkdir("public/icons", { recursive: true });
await writeFile("public/brands/anu-orb.svg", orb);
await writeFile("public/favicon.svg", orb);
await sharp(Buffer.from(orb)).png().toFile("public/brands/anu-orb.png");
await sharp(Buffer.from(orb)).png().toFile("public/brands/anu-orb-plush.png");
for (const [name, size] of [["anu-192", 192], ["anu-512", 512], ["anu-apple-180", 180], ["anu-maskable-512", 512]]) {
  // Padding keeps the face within the safe zone on home-screen masks.
  const icon = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512"><rect width="512" height="512" rx="0" fill="#fdfbf7"/><g transform="translate(38 38) scale(.85)">${orb.replace(/<\/?svg[^>]*>/g, "")}</g></svg>`;
  await sharp(Buffer.from(icon)).png().toFile(`public/icons/${name}.png`);
}
const share = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="#fdfbf7"/><g transform="translate(100 85) scale(.9)">${orb.replace(/<\/?svg[^>]*>/g, "")}</g><text x="640" y="325" font-family="Arial, sans-serif" font-size="110" font-weight="600" fill="#28232e">anu.</text><text x="648" y="378" font-family="Arial, sans-serif" font-size="22" fill="#77717c">Your companion within Devvrats</text></svg>`;
await sharp(Buffer.from(share)).png().toFile("public/social/anu-share.png");
// Inline the mark so the offline page doesn't depend on an uncached asset.
const mark = `<!--ANU_MARK_START-->${orb.replace('<svg ', '<svg class="dot" aria-hidden="true" ')}<!--ANU_MARK_END-->`;
const offline = await readFile("public/offline.html", "utf8");
await writeFile("public/offline.html", offline
  .replace(/<!--ANU_MARK_START-->[\s\S]*?<!--ANU_MARK_END-->|<span class="dot" aria-hidden="true"><\/span>/, mark)
  .replace(/\.dot\{[^}]*\}/, ".dot{width:44px;height:44px;overflow:visible}"));
console.log("Anu orb logo, app icons, and social image generated.");
