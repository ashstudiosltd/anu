# Anu — first Vercel release

**Current runtime:** standard Next.js on Vercel. Local development uses `npm run dev` on port 5173 and ignored `.env.local`; `.dev.vars` belongs to the previous Sites runtime. Production setup and release limitations are documented in [docs/vercel-deployment.md](docs/vercel-deployment.md). Older notes below describe the development history and may refer to the former Cloudflare/Vinext setup.

# Anu — Devvrats

Anu's private 0.1 preview. The chat route uses Gemini from the server and defaults to `gemini-3.5-flash-lite` for low-latency free-tier chat.

## Local Gemini setup

For local development, copy `.dev.vars.example` to `.dev.vars` and put your rotated Gemini key in the `GEMINI_API_KEY` entry. Keep `.dev.vars` on your machine: it is ignored by Git. Never commit the key or add it to browser code. Optionally set `ANU_GEMINI_MODEL` to a model enabled for your tier.

Start the local app with `npm run dev`; the portable preview normally runs at `http://localhost:5173`. The chat route reads the key through the local Cloudflare Worker runtime. If you change `.dev.vars` while the server is running and the key is not picked up, stop and restart the dev server.

The current preview discloses that messages are sent to Gemini and that free-tier data may be used to improve Google products. Do not use this preview with private member data or secrets.

Production deployment is paused while developing locally. The existing Codex Site remains hosted separately. Vercel deployment will need its own environment-variable setup and a compatibility review before publishing.

A clean full-stack starter running on [vinext](https://github.com/cloudflare/vinext), with optional Cloudflare D1 and Drizzle support.

## Prerequisites

- Node.js `>=22.13.0`
- Portable: Windows, macOS, or Linux; no Bash required
- Managed Linux: managed Linux runtime with Bash, `flock`, `curl`, `sha256sum`, and GNU `timeout`
- Git is required only for publishing

## Sites Lifecycle

The Sites initializer copies the shared starter and selects managed-linux only when `SITES_MANAGED_LINUX_CONTAINER=1`; otherwise it selects portable. It saves the selection only in ignored `.sites-runtime/execution-profile.json`. Both profiles copy/configure first, then use the plugin's separate `install-dependencies.mjs` step to measure installation independently. Edit source under `app/` and follow the Sites skill for installation, preview, builds, and publishing.

Run `node <plugin-root>/scripts/configure-execution-profile.mjs` only when the profile is unknown for the current checkout and environment. Profile changes do not alter tracked source or require reinstalling otherwise-valid dependencies; restart an existing preview to use the new selection. Do not commit or upload `.sites-runtime/`.

This starter does not use `wrangler.jsonc`.

`install:ci` runs `npm ci` once against the shared lockfile, disables parent-workspace discovery, and includes required dev/optional dependencies despite production/omit settings. Sharp defaults to prebuilt binaries unless explicitly configured otherwise. Do not overlap installers.

- **Portable:** Preserve host HOME, npm cache, registry, proxy, temporary paths, retry/concurrency settings, and lifecycle-script policy. Use `--prefer-offline --no-audit --no-fund`.
- **Managed Linux:** Use the existing project-local HOME/cache/tmp setup and Linux install lock, tarball preflight, and timeout. Restore the image-seeded npm cache only when its lockfile hash matches; retain network fallback. Builds keep their existing timeout. These helpers are not invoked by the portable profile.

`scripts/sites-env.mjs` preserves the caller's HOME, npm cache, proxy, XDG, and temporary-directory configuration while defaulting Wrangler and Miniflare state to the checkout. If npm reports an unwritable cache, select a writable path with `npm_config_cache` for that install. The `dev` and `start` scripts also keep Wrangler logs inside the checkout. Generated `.sites-runtime/` and `.wrangler/` directories are disposable and ignored by Git.

On portable, `npm run dev` uses `vinext dev` with HMR, starting at port 5173. Vinext records the running server in ignored `.vinext/` state, rejects an ordinary duplicate launch, and recovers stale state after a stopped process; exactly simultaneous starts can race. Pass `--port <port>` or `--hostname <host>` after `npm run dev --` when needed; keep portable previews on loopback.

For browser QA on managed Linux, use `sites-preview start`. The project's dev script runs Vite and accepts the supervisor's `--host 0.0.0.0 --port 4173 --strictPort` arguments. The internal browser uses `http://terminal.local:4173/`; it is not a user-facing URL. The supervisor owns the preview lifecycle. The ignored local profile survives the supervisor's cleared process environment.

The portable profile simulates ChatGPT sign-in only for loopback development requests. Visit `/signin-with-chatgpt?return_to=/` to sign in as `local_seedy` (`seedy@sites.test`, display name `Seedy`) and `/signout-with-chatgpt?return_to=/` to sign out. The development cookie preserves that identity across server restarts. Mock auth is disabled in the managed-linux profile and is not included in production builds; hosted authentication remains dispatch-owned.

The Worker uses `vinext/server/fetch-handler`, including Vinext's config-aware image handling. After building, `npm start` runs that Worker locally through Wrangler on `127.0.0.1`, sharing `.wrangler/state` with dev preview and local D1 migrations; it does not deploy the site or simulate sign-in. Use the URL printed by the server. Pass `npm start -- --port <port>` to select a different built-preview port.

Local previews use Miniflare's placeholder `Request.cf` metadata without a network lookup. Set `CLOUDFLARE_CF_FETCH_ENABLED=true` to opt into fetching preview metadata; this setting does not change hosted request metadata.

Local tool usage metrics are disabled by default. Set `WRANGLER_SEND_METRICS=true` to opt in.

## Included Shape

- edit site code under `app/`
- `app/chatgpt-auth.ts` provides optional dispatch-owned ChatGPT sign-in helpers
- `.openai/hosting.json` declares optional Sites D1 and R2 bindings
- `vite.config.ts` simulates declared bindings for local development
- `db/index.ts` reads the D1 binding from the Cloudflare Worker environment
- `db/schema.ts` starts intentionally empty
- `@cloudflare/workers-types` provides Worker types; `cloudflare-env.d.ts` declares optional `DB`/`BUCKET` bindings—update these declarations if binding names change
- `examples/d1/` contains an optional D1 example surface
- `drizzle.config.ts` supports local migration generation when needed

## Workspace Auth Headers

Signed-in visitors receive both `oai-authenticated-user-id` and `oai-authenticated-user-email`. Private Sites require every visitor to sign in; public Sites may also have anonymous visitors, for whom neither header is present.

The user ID is stable for the same user on the same Site and different across Sites. Use it as the durable user key; use email and name for display or contact purposes.

SIWC-authenticated workspace sites may also receive `oai-authenticated-user-full-name` when the user's SIWC profile has a non-empty `name` claim. The full-name value is percent-encoded UTF-8 and is accompanied by `oai-authenticated-user-full-name-encoding: percent-encoded-utf-8`.

Treat the full name as optional and fall back to email when it is absent:

```tsx
import { headers } from "next/headers";

export default async function Home() {
  const requestHeaders = await headers();
  const userId = requestHeaders.get("oai-authenticated-user-id");
  const email = requestHeaders.get("oai-authenticated-user-email");
  const encodedFullName = requestHeaders.get("oai-authenticated-user-full-name");
  const fullName =
    encodedFullName &&
    requestHeaders.get("oai-authenticated-user-full-name-encoding") ===
      "percent-encoded-utf-8"
      ? decodeURIComponent(encodedFullName)
      : null;

  const displayName = fullName ?? email;
  // ...
}
```

## Optional Dispatch-Owned ChatGPT Sign-In

Import the ready-to-use helpers from `app/chatgpt-auth.ts` when the site needs optional or required ChatGPT sign-in:

- Use `getChatGPTUser()` for optional signed-in UI.
- Use the returned `userId` as the stable user key for user-owned records; do not use email as a durable identifier.
- Use `requireChatGPTUser(returnTo)` for server-rendered pages that should send anonymous visitors through Sign in with ChatGPT.
- In a Server Component, start sign-in with `<a href={chatGPTSignInPath(returnTo)} target="_top">`. The auth helper module is server-only; do not import it into a Client Component.
- Do not use `fetch`, XHR, a client-side router, or a framework link that can prefetch the sign-in route. SIWC must start as a top-level navigation.
- Never request the AuthAPI authorization endpoint directly. The dispatch-owned `/signin-with-chatgpt` route must start the SIWC flow.
- Use `chatGPTSignOutPath(returnTo)` for browser sign-out links or actions.
- Pass a same-origin relative `returnTo` path for the destination after sign-in or sign-out. The helper validates and safely encodes it.
- Mark protected pages with `export const dynamic = "force-dynamic"` because they depend on per-request identity headers.

Dispatch owns `/signin-with-chatgpt`, `/signout-with-chatgpt`, `/callback`, the OAuth cookies, and identity header injection. Do not implement app routes for those reserved paths. Routes that do not import and call the helper remain anonymous-compatible.

SIWC establishes identity only; it does not prove workspace membership. Use the Sites hosting platform's access policy controls for workspace-wide restrictions, or enforce explicit server-side membership or allowlist checks.

Use SIWC for account pages, user-specific dashboards, saved records, and write actions tied to the current ChatGPT user. Leave public content anonymous.

## Local D1 migrations

For a D1-backed local preview, generate SQL with `npm run db:generate`. Build once through the Sites skill's build entrypoint (or `npm run build` for standalone use) to generate `dist/server/wrangler.json`, rebuilding if bindings change. From the project root, apply each pending migration in order:

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_example.sql
```

Replace the filename with the pending migration and `DB` with your D1 binding name if different. Use `.wrangler/state`, not `.wrangler/state/v3`; Wrangler adds the versioned directories. Do not replay migrations already applied locally. This updates only the preview database; publishing applies production migrations separately.

## Diagnostic Commands

- `npm run install:ci`: perform the one locked dependency install
- `npm run dev`: start the Vite/Vinext development server
- `npm run build`: build the deployable Sites artifact
- `npm run start`: preview the built Worker locally with D1/R2 support
- `npm run db:generate`: generate Drizzle migrations after schema changes

When using the Sites plugin, follow its skill instructions for installation, builds, and publishing. These npm commands remain available for standalone use.

The portable build runs Vinext directly without a host `timeout` command. The managed-linux build uses `scripts/build-verified.sh` and its existing `SITES_BUILD_TIMEOUT` setting.

## Learn More

- [vinext Documentation](https://github.com/cloudflare/vinext)
- [Drizzle D1 Guide](https://orm.drizzle.team/docs/get-started/d1-new)

Main's Fundamentals demo now calls `/api/integrations/main/chat`. The endpoint
uses the same reply service, constitution, knowledge and Gemini secret as the
full `/api/chat`, with a centrally defined concise demo policy and bounded context.
Run this Anu checkout on port 5173 alongside Devvrats.Main locally. No production
host or deployment was configured. Public-launch rate limits still need a shared
store rather than the current per-instance budget.

### Sabha Blogs capability (local)

`POST /api/integrations/blogs/chat` is the central Blogs capability. It retrieves
current public reference data from Sabha's `/api/anu/blogs-context` and applies
Blogs-specific instructions on top of Anu's shared constitution and knowledge.
Anu defaults to the local Sabha server at `http://127.0.0.1:3000`.
Set server runtime `SABHA_PUBLIC_URL` to change that address; use the deployed
Sabha HTTPS origin before production deployment. Gemini credentials remain here.
The Main demo and full chat continue using their existing endpoints.

Retrieval considers the latest 80 public posts plus any selected article,
returns up to five references, and bounds article text (truncation is marked).
This is current retrieval, not model training or an exhaustive archive index.
Rate budgets are per instance and require shared storage before public launch.

## Shared Devvrats accounts

Anu verifies Main’s Supabase cookies using `auth.getUser()` on the server. It never accepts user names or membership claims from a request body. Only the verified display name is passed to Gemini. `GET /api/auth/session` returns the member ID/name or guest allowance; it is private and never cached. Account changes are checked on focus and once a minute. Chat requests also compare the current verified account to the account owning the client’s history, preventing a stale tab from sending another account’s context.

Use **http://localhost:5173/** for Anu and **http://localhost:3001/** for Main locally. Cookies work across localhost ports; `127.0.0.1` has separate cookies. Main is the only sign-in UI. Anu’s Sign in links there with a validated return destination. Signed-in visitors arriving at Main’s registration page return immediately without another provider prompt.

Local runtime configuration lives in ignored `.dev.vars`: Main’s `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `DEVVRATS_AUTH_ORIGIN`, and a random `ANU_PREVIEW_SECRET`. Restart Anu after changing these. No service-role key is needed. A real local preview signing secret has been generated without exposing it.

Guests get five short messages per 24-hour browser preview. The quota is enforced on the server using a signed HttpOnly cookie, so a new conversation or refresh does not reset it. Clearing cookies can reset this preview; this is not an abuse-resistant public rate limiter. Requests, including failed attempts, consume allowance. Members get the standalone conversation limits (4,000-character messages and bounded context), with no guest quota. Embedded Main/Blogs modes retain their existing policies.

History remains in tab sessionStorage, keyed by verified account ID or guest. Signing out deletes that account’s local history in the current tab and clears the shared auth session; it does not delete other tabs’ stored copies. History does not sync across devices. Existing unscoped preview history is not imported into member histories.

### Production configuration before deployment

1. Deploy Main, Anu and eventually Sabha under trusted `devvrats.in` subdomains, over HTTPS. Shared cookies use `.devvrats.in`. Every subdomain receiving this cookie must be trusted; do not host untrusted applications there.
2. Set Anu runtime values to the same Main Supabase project/publishable key, `DEVVRATS_AUTH_ORIGIN=https://www.devvrats.in`, and an independently generated `ANU_PREVIEW_SECRET`. Keep Gemini server-only. Set Main’s `NEXT_PUBLIC_ANU_URL=https://anu.devvrats.in/` if overriding its default.
3. In **Main’s Supabase project → Authentication → URL Configuration**, set Site URL to `https://www.devvrats.in` and allow `https://www.devvrats.in/auth/callback` (and `https://devvrats.in/auth/callback` if supporting apex login). For development allow `http://localhost:3001/auth/callback`. Query strings carry a validated first-party return path. Configure Google/GitHub providers on Main’s project; their provider callback is the Supabase callback, not Anu.
4. Anu has no separate OAuth exchange: Main exchanges the code and writes the shared cookie, then returns to Anu. Existing host-only sessions may require one fresh sign-in after deployment.
5. Add a durable edge/account rate limiter before public launch. Never cache auth responses or chat responses. Confirm an actual Google/GitHub login and return flow after provider/dashboard settings are configured; this has not been completed with a real member during this implementation.

Sabha currently uses a different Supabase project. Do not replace its environment values before completing the migration plan at `/Users/devvrats./Desktop/sabha/docs/shared-auth-migration.md`.
