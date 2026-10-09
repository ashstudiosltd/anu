# First release state — 2026-10-09

- Vercel team: `ashstudios-projects`.
- Anu project: `anu`.
- Anu production deployment: `anu-rhps334xe-ashstudios-projects.vercel.app` — Ready.
- Public Vercel URL: https://anu-eight-blush.vercel.app/
- Intended custom domain: https://anu.devvrats.in/ — CNAME configured and Vercel verified on 2026-10-09.
- Main production deployment: `devvrats-main-6arxo6sr9-ashstudios-projects.vercel.app` — Ready, serving https://www.devvrats.in/.
- Anu and Main production environment variables configured; secrets were not printed.
- Local build succeeded; deployed Anu renders the guest preview and production Main sign-in link.
- No real production provider login, Gemini reply, or cross-domain sign-out was completed during this deployment.

## Original DNS handoff (completed)

At Hostinger add CNAME `anu` → `4e3532004b1571f5.vercel-dns-017.com` with default TTL. Hostinger was signed out in the available browser, so no DNS edits were made. Vercel reports domain ownership verified but DNS invalid; no CNAME/A record was present on the final check.

DNS has since been verified in Vercel. HTTPS issuance and a real member login are the remaining checks. Main’s new Anu links and backend URL target the custom domain and depend on that DNS step. Supabase Dashboard was signed out; its remote settings were not changed. The user previously supplied production redirect entries including Main’s `/auth/callback`. Main now uses that exact callback; the originating destination is preserved in a short-lived cookie.

Sabha was not redeployed or migrated in this release. Its local server proxy has the shared integration-secret support prepared; deploy it with the same production integration secret when rolling out the Blogs changes. Existing local servers continue to use development configuration. Local Anu now reads `.env.local`, not `.dev.vars`.

## DNS follow-up

The user added the Hostinger CNAME. Vercel `domains verify` now reports `configured-correctly`, ownership verified, and no issues. Public DNS resolves to Vercel. The in-app browser still returned a cached `ERR_NAME_NOT_RESOLVED` on two attempts, so the custom-domain page and real production sign-in were not confirmed in that browser.

HTTPS follow-up: issued the Anu certificate through Vercel successfully. A standard TLS handshake verified the certificate for `anu.devvrats.in` (expires 2027-01-07 UTC). Domain DNS and HTTPS are ready. The in-app browser still has a cached DNS lookup failure, so a real production member sign-in remains unconfirmed.
