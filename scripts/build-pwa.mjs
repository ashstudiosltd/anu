import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
const worker = await readFile(new URL("../lib/pwa/worker.js", import.meta.url), "utf8");
const offline = await readFile(new URL("../public/offline.html", import.meta.url), "utf8");
const version = createHash("sha256").update(worker).update(offline).digest("hex").slice(0, 16);
await writeFile(new URL("../public/sw.js", import.meta.url), worker.replaceAll("__PWA_VERSION__", version));
console.log(`Anu PWA worker prepared (${version})`);
