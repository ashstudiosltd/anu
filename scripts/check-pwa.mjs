import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
const source = await readFile(new URL("../public/sw.js", import.meta.url), "utf8");
assert.ok(!source.includes("__PWA_VERSION__"));
const listeners = new Map();
const deleted = [];
const stored = [];
let offline = false;
let failInstall = false;
const fallback = new Response("offline page");
const sandbox = {
  self: { location: { origin: "https://anu.devvrats.in" }, addEventListener: (name, fn) => listeners.set(name, fn) },
  URL, Response,
  fetch: async (input) => { if (offline) throw new Error("offline"); return new Response("fresh network", { status: failInstall && input === "/offline.html" ? 503 : 200 }); },
  caches: {
    open: async () => ({ put: async (url) => stored.push(url) }),
    keys: async () => ["anu-offline-old", "unrelated-cache", source.match(/anu-offline-[a-f0-9]+/)[0]],
    delete: async (key) => deleted.push(key),
    match: async (url) => { assert.equal(url, "/offline.html"); return fallback; },
  },
};
vm.runInNewContext(source, sandbox);
let pending;
listeners.get("install")({ waitUntil: (promise) => { pending = promise; } });
await pending;
assert.deepEqual(stored, ["/offline.html"]);
failInstall = true;
listeners.get("install")({ waitUntil: (promise) => { pending = promise; } });
await assert.rejects(pending, /Offline page unavailable/);
failInstall = false;
listeners.get("activate")({ waitUntil: (promise) => { pending = promise; } });
await pending;
assert.deepEqual(deleted, ["anu-offline-old"]);
const navigation = { method: "GET", mode: "navigate", url: "https://anu.devvrats.in/" };
const intercepted = (request) => {
  let response;
  listeners.get("fetch")({ request, respondWith: (promise) => { response = promise; } });
  return response;
};
for (const request of [
  { ...navigation, url: "https://anu.devvrats.in/api/auth/session" },
  { ...navigation, url: "https://anu.devvrats.in/auth" },
  { ...navigation, method: "POST", url: "https://anu.devvrats.in/api/chat" },
  { ...navigation, mode: "cors", url: "https://anu.devvrats.in/?_rsc=test" },
  { ...navigation, url: "https://www.devvrats.in/registration" },
]) assert.equal(intercepted(request), undefined);
assert.equal(await (await intercepted(navigation)).text(), "fresh network");
offline = true;
assert.equal(await intercepted(navigation), fallback);
assert.deepEqual(stored, ["/offline.html"]);
console.log("PASS: fresh online navigation, offline fallback, failed install, cache cleanup, and no interception/caching of chat, auth, RSC or external requests.");
