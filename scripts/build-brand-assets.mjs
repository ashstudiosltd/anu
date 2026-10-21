import sharp from "sharp";
import opentype from "@shuding/opentype.js";
import { mkdir, readFile, writeFile } from "node:fs/promises";

// One image source for the sidebar, chat avatars, favicons, and installed app.
const orb = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
<defs>
  <radialGradient id="body" cx=".34" cy=".24" r=".88"><stop stop-color="#e0d0fa"/><stop offset=".52" stop-color="#cdb6ed"/><stop offset="1" stop-color="#b99cde"/></radialGradient>
  <filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="7"/></filter>
  <filter id="bloom" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="18"/></filter>
  <linearGradient id="lower" x1="0" y1="0" x2="0" y2="1"><stop offset=".45" stop-color="white"/><stop offset="1" stop-color="#555"/></linearGradient>
  <mask id="fade"><ellipse cx="256" cy="252" rx="214" ry="218" fill="url(#lower)" filter="url(#soft)"/></mask>
</defs>
<ellipse cx="256" cy="269" rx="205" ry="202" fill="#c6ace8" opacity=".28" filter="url(#bloom)"/>
<g mask="url(#fade)"><ellipse cx="256" cy="252" rx="236" ry="239" fill="url(#body)"/></g>
<g fill="#0d0a12"><path d="M201 140 C201 100 243 100 243 140 Q222 147 201 140Z"/><path d="M269 140 C269 100 311 100 311 140 Q290 147 269 140Z"/></g>
<path d="M194 173 Q256 216 318 173" fill="none" stroke="#0d0a12" stroke-width="15" stroke-linecap="round"/>
</svg>`;
await mkdir("public/brands", { recursive: true });
await mkdir("public/icons", { recursive: true });
await writeFile("public/brands/anu-orb.svg", orb);
await writeFile("public/favicon.svg", orb);
await sharp(Buffer.from(orb)).png().toFile("public/brands/anu-orb.png");
await sharp(Buffer.from(orb)).png().toFile("public/brands/anu-orb-soft.png");
for (const [name, size] of [["anu-192", 192], ["anu-512", 512], ["anu-apple-180", 180], ["anu-maskable-512", 512]]) {
  // Padding keeps the face within the safe zone on home-screen masks.
  const icon = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512"><rect width="512" height="512" rx="0" fill="#fdfbf7"/><g transform="translate(38 38) scale(.85)">${orb.replace(/<\/?svg[^>]*>/g, "")}</g></svg>`;
  await sharp(Buffer.from(icon)).png().toFile(`public/icons/${name}.png`);
}
// Outline the actual Roboto glyphs so exported logos never substitute a font.
const fontData = await readFile("public/fonts/Roboto-Bold.ttf");
const font = opentype.parse(fontData.buffer.slice(fontData.byteOffset, fontData.byteOffset + fontData.byteLength));
let cursor = 0;
let top = 0;
let bottom = 0;
const letters = [..."anu."].map((letter, index) => {
  const glyph = font.charToGlyph(letter);
  const path = glyph.getPath(cursor, 0, 160);
  const box = { y1: -glyph.yMax / font.unitsPerEm * 160, y2: -glyph.yMin / font.unitsPerEm * 160 };
  top = Math.min(top, box.y1);
  bottom = Math.max(bottom, box.y2);
  cursor += (glyph.advanceWidth / font.unitsPerEm) * 160 - 5;
  if (index < 3) cursor += font.getKerningValue(glyph, font.charToGlyph("anu."[index + 1])) / font.unitsPerEm * 160;
  return { path: path.toPathData(3), accent: index === 1 || index === 3 };
});
const wordWidth = Math.ceil(cursor + 21);
const wordHeight = Math.ceil(bottom - top + 16);
const wordmarkFor = (ink) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${wordWidth} ${wordHeight}" role="img" aria-label="Anu"><g transform="translate(8 ${8 - top})">${letters.map(({ path, accent }) => `<path d="${path}" fill="${accent ? "#a78bda" : ink}"/>`).join("")}</g></svg>`;
const wordmark = wordmarkFor("#28232e");
await writeFile("public/brands/anu-wordmark.svg", wordmark);
await writeFile("public/brands/anu-wordmark-dark.svg", wordmarkFor("#f2eef8"));
await sharp(Buffer.from(wordmark)).resize({ width: 1000 }).png().toFile("public/brands/anu-wordmark.png");
const lockup = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 220">${orb.replace('<svg ', '<svg x="0" y="0" width="220" height="220" ')}${wordmark.replace('<svg ', '<svg x="224" y="60" width="390" height="120" ')}</svg>`;
await writeFile("public/brands/anu-logo.svg", lockup);
await sharp(Buffer.from(lockup)).resize({ width: 1280 }).png().toFile("public/brands/anu-logo.png");
const share = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="#fdfbf7"/><g transform="translate(100 85) scale(.9)">${orb.replace(/<\/?svg[^>]*>/g, "")}</g>${wordmark.replace('<svg ', '<svg x="640" y="245" width="400" height="160" ')}</svg>`;
await sharp(Buffer.from(share)).png().toFile("public/social/anu-share.png");
// Inline the mark so the offline page doesn't depend on an uncached asset.
const mark = `<!--ANU_MARK_START-->${orb.replace('<svg ', '<svg class="dot" aria-hidden="true" ')}<!--ANU_MARK_END-->`;
const offline = await readFile("public/offline.html", "utf8");
await writeFile("public/offline.html", offline
  .replace(/<!--ANU_MARK_START-->[\s\S]*?<!--ANU_MARK_END-->|<span class="dot" aria-hidden="true"><\/span>/, mark)
  .replace(/\.dot\{[^}]*\}/, ".dot{width:44px;height:44px;overflow:visible}")
  .replace(/<!--ANU_WORD_START-->[\s\S]*?<!--ANU_WORD_END-->|<span>anu<span class="period">\.<\/span><\/span>/, `<!--ANU_WORD_START-->${wordmarkFor("currentColor").replace('<svg ', '<svg class="wordmark" ')}<!--ANU_WORD_END-->`)
  .replace(/(?:\.wordmark\{[^}]*\})?\.period\{/, ".wordmark{width:100px;height:auto;overflow:visible}.period{"));
console.log("Anu orb logo, app icons, and social image generated.");
