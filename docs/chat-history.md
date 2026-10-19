# Anu chat history

## Enable in Supabase before deploying

Use the existing Supabase project that verifies Devvrats accounts. In its SQL Editor, run `supabase/migrations/20261018_anu_history.sql`. This creates only Anu-specific objects; no service-role key is added to the application. Enable the Supabase Cron integration, then run `supabase/schedule-history-cleanup.sql` as the database owner. Confirm both named jobs exist in the Cron dashboard. The code does not enable cloud storage or a scheduled job until these steps have been applied.

Apply the migration once through your normal migration workflow. After changing database objects, PostgREST may need a schema refresh: `notify pgrst, 'reload schema';`.

## Storage and retention

ANU and DEVVRATS each keep up to 20 conversations per account. Inserting a 21st chat removes the oldest in that space. Guest history is session-only. Existing browser history is not bulk-uploaded; an old local chat syncs when a new reply is saved. Older history without a recorded space is treated as ANU.

Each conversation is one JSONB row, with compact `[roleNumber, text]` tuples and a short title. The application packs at most 60 recent messages into about 30 KB, and PostgreSQL enforces 32 KiB of serialized message JSON per row. PostgreSQL handles large-value storage/compression; no attachment blobs, duplicated source cards, embeddings, or separate indexes of message contents are stored. Titles and revision metadata load first. Message contents load only when a chat is selected. Search scans only the requesting user's bounded space and returns metadata, not every full transcript.

Forty message payloads at the maximum account cap total at most 1.25 MiB, plus row/index/JSONB storage overhead. Typical text chats are smaller. This is a per-account cap, not a guarantee of fitting an unlimited number of users into a shared free-tier project. Monitor table and index usage in Supabase and lower caps or retention if necessary.

Chats become inaccessible 45 days after the last successful save; viewing does not renew retention. A daily 03:20 UTC job deletes expired rows, and a separate job trims only these jobs' old execution logs. Deleting rows makes space reusable by PostgreSQL; the database's physical file size may not immediately shrink. User deletion removes the account row and local tab copy; provider-side Gemini retention is separate.

## Access and consistency

Every API request verifies the member server-side. RLS allows each member to read/delete only their records. Direct authenticated inserts/updates are revoked. The owner-scoped save function validates content, serializes saves per account with a transaction lock, and checks revision numbers before writing. Cross-device conflicts do not overwrite newer records. Reopen the chat to load the newer version. Failed cloud saves keep a local tab copy with an explicit sync notice. No service worker caches history responses.

## Verify

Run lint, TypeScript, and the production build. Database behavior can be tested with the PGlite embedded PostgreSQL test runtime without connecting to production:

```
npm install --prefix /tmp/anu-history-validation --no-audit --no-fund @electric-sql/pglite
ANU_TEST_PGLITE_MODULE=/tmp/anu-history-validation/node_modules/@electric-sql/pglite/dist/index.js node scripts/check-history-db.mjs
```

The test checks owner isolation, anonymous denial, direct-write denial, revisions, separate space search, chat caps, expiry, and cleanup. It does not substitute for testing the target Supabase project's permissions and scheduler. Before deployment, sign in with two test accounts, confirm cross-account isolation, save/reopen each space on another device, test deletion, check a revision conflict, and confirm the cleanup job succeeds. Do not change production signing or integration secrets to enable chat history.

## Permission-checked Sabha conversations

DEVVRATS now uses `/api/sabha/*`, a fixed-destination server bridge to Sabha, instead of storing new private transcripts in this table. The bridge requires a verified Anu member and forwards only this Supabase project's shared auth cookies plus the server integration secret and expected member ID. Sabha independently verifies the session and matching member. No service-role access or browser-held integration credential is introduced.

DEVVRATS transcripts are not written to sessionStorage. Its conversation list and reopening use Sabha's source-permission checks. ANU history continues using `anu_conversations`. Old DEVVRATS rows in that table remain until expired/deleted but are not republished as authorized Sabha history. A deployment of both applications is required for the new paths.
