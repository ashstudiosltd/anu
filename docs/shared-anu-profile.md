# Shared Anu and Devvrats profiles

Anu uses `profiles` as the identity source, never OAuth display metadata. The editable profile uses the existing Sabha columns; no new profile schema is required. `anu_member_preferences` and its owner-only RLS policies must already be installed. Profile writes verify the current account, request origin, field lengths, URL schemes and username format, and run through the authenticated Supabase client.

Only introduction, role, skills, interests and member-entered Anu preferences enter AI context. Email, location, website and avatar do not. The configured Gemini model is unchanged. Sabha capabilities remain on the authenticated Devvrats bridge, separate from Anu chat.

## One interface in Sabha

Sabha opens the canonical Anu `/embed` route. Only that route allows framing by `https://sabha.devvrats.in`; other routes deny framing. Development additionally permits localhost. The embed receives only a validated page kind and UUID through an origin-checked message; records and actions still require server authorization. The launcher asset is copied from Anu's canonical orb SVG.

Production defaults to `https://anu.devvrats.in`. For local Sabha development, set `NEXT_PUBLIC_ANU_URL=http://localhost:3000` (or the actual Anu port) and restart Sabha. The public URL contains no secrets. Set Sabha's existing `ANU_API_URL` to the same running Anu service for replies. Both servers need the same existing integration secret and shared account configuration. Production requires shared `.devvrats.in` auth cookies.

The development-only `/demo` remains API-free and returns not-found in production. `/embed` uses real authentication and real APIs.

## Release checks still required

Compilation and lint do not establish end-to-end authentication, database policy correctness, cross-browser rendering or distributed abuse protection. Check those against the configured production environment before releasing. Existing in-memory request limits are per instance, not a distributed rate limiter. No claim of zero vulnerabilities is made. This change has not been deployed.
