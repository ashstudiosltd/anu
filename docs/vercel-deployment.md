# Anu v0.1: Vercel deployment

## Code and build

Anu now uses standard Next.js App Router with Node.js route handlers. `npm run build` builds for Vercel; `npm run dev` runs Anu on port 5173. Local values live in `.env.local` (Next does not load `.dev.vars`). Previous Sites/Vinext build tooling remains in the repository for reference, excluded from the Vercel upload. The active application has no Cloudflare runtime imports and does not use D1/R2.

Use Node.js 22.x, Next.js framework preset, project root `.`, `npm ci` install command, and `npm run build`. Let Next/Vercel choose the output directory. Functions have a 60-second maximum duration; Gemini requests time out after 45 seconds. Build succeeds locally; this is not evidence of a remote deployment or completed OAuth flow.

## Production environment variables

An ignored `.env.production.local` has been prepared privately from existing application configuration with fresh production signing/integration secrets. Do not upload this file as source or commit it. Add the values as Production environment variables in Vercel (sensitive for secret values), then deploy. Keep previews isolated from production secrets and accounts.

| Variable | Production value/source |
| --- | --- |
| GEMINI_API_KEY | Existing Gemini key, server-only |
| ANU_GEMINI_MODEL | Existing working model from local configuration |
| NEXT_PUBLIC_SUPABASE_URL | Main’s Supabase project root URL |
| NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | Main’s publishable key; never a secret/service-role key |
| DEVVRATS_AUTH_ORIGIN | https://www.devvrats.in |
| ANU_PUBLIC_URL | https://anu.devvrats.in |
| ANU_PREVIEW_SECRET | Fresh production-only signing secret from private configuration |
| ANU_INTEGRATION_SECRET | Same private value on Anu, Main and Sabha servers |
| SABHA_PUBLIC_URL | https://sabha.devvrats.in |

Create/link Anu in the intended Vercel team. CLI deployment can upload this local project without creating a GitHub repository: `npx vercel link`, configure environment variables, then `npx vercel --prod`. `.vercelignore` prevents uploading local environment files, build artifacts and legacy tooling. Do not pass secrets as command-line flags. For future Git deployments connect the intended private repository after reviewing the source; no repository has been created or pushed automatically.

## Main deployment is part of the sign-in setup

Deploy the prepared Main auth changes as well: `/auth/start`, `/auth/callback`, registration `next` handling, safe return allowlist, and shared `.devvrats.in` Supabase cookies. Anu depends on the production Main callback to return the member to Anu. Updating Anu alone cannot update Main’s deployed auth behavior.

On Main set `ANU_API_URL=https://anu.devvrats.in`, `NEXT_PUBLIC_ANU_URL=https://anu.devvrats.in/`, and the matching server-only `ANU_INTEGRATION_SECRET`. Redeploy Main after changing these values. The Fundamentals demo stays limited; its CTA opens standalone Anu. In Sabha set `ANU_API_URL=https://anu.devvrats.in` and the same server-only integration secret when deploying its existing Blogs integration and public context route. Blogs does not redirect to the standalone portal. Sabha’s account migration remains separate.

## Supabase

In Main’s Supabase project, Authentication → URL Configuration:

- Site URL: `https://www.devvrats.in`.
- Production redirect: `https://www.devvrats.in/auth/callback` (and apex callback only if Main supports apex login).
- Development redirect: `http://localhost:3001/**`.
- Keep existing Sabha production redirect until its account migration completes.

Main handles the OAuth code exchange; Anu needs no separate provider callback. Google/GitHub provider dashboards use Supabase’s `/auth/v1/callback`, not Anu’s URL. The validated `next` destination carries Anu/Main’s return site. Shared login requires the same Supabase project and all auth/session responses must remain uncached. A `vercel.app` domain cannot share `.devvrats.in` cookies; perform the full SSO check on the custom domain.

## Hostinger domain

First add `anu.devvrats.in` in Anu’s Vercel project → Settings → Domains. Use the exact DNS record target Vercel displays for this project; do not guess a generic CNAME target.

In Hostinger hPanel → Domains → devvrats.in → DNS / Nameservers → DNS records:

- Type: CNAME
- Name: anu
- Target/Points to: exact Vercel-provided target
- TTL: default

Only replace conflicting records for `anu`; preserve apex/www, Sabha, mail and other records. If Vercel asks for a verification TXT record, add the exact name/value it displays. Do not change nameservers merely to connect this subdomain. Confirm authoritative DNS is actually hosted at Hostinger before editing. Wait for Vercel to report Valid Configuration and issue HTTPS.

## Release checks and limitations

After domain and production Main deployment are ready, complete a real Google/GitHub login from Anu and Main, confirm the return destinations and member name, and sign out. Confirm the limited Main demo and Blogs context/summary against their deployed services. These end-to-end checks are not complete just because the build passed.

This release keeps history in browser-tab session storage, scoped by member or guest; it does not persist chat history in Supabase. Guest preview has five attempts per signed browser cookie over 24 hours; clearing cookies resets it. Integration routes require a shared server secret, but current request budgets are per-instance and reset across serverless invocations. Configure Vercel Firewall rate limits for chat/auth/integration paths before inviting broad public traffic; durable per-account usage quotas remain future work. Do not describe the preview cookie as an abuse-proof usage limit.

Rollback: in Vercel promote the previous healthy deployment. Keep production secret values stable across redeploys. DNS stays on the same Anu project. Revert Main/Sabha integration configuration together if rolling back the shared secret protocol.
