# Callcraft Studio

Source repository: [skhartaye/craft-caller](https://github.com/skhartaye/craft-caller).

Live website: [craft-caller.netlify.app](https://craft-caller.netlify.app). Dedicated Supabase project: `zjgcsdfngvidatczndkn`. Service schema applied and public connection variables configured on Netlify. Hosted sign-in and service saving still require end-to-end verification with real accounts; no phone call has been made.

Calling direction: the user selected a regular personal Telegram account, not Twilio or business calling. See [Telegram worker setup](telegram/README.md). The local native dependencies import successfully on Windows and offline rules are tested. Telegram login, recipient identity, live audio, and an actual AI call remain unverified. The website exports service snapshots for the local worker; it does not yet launch Telegram calls.

Next.js, React and TypeScript studio, with a static frontend and Netlify server functions. Supabase supplies authentication and Postgres; OpenAI supplies optional text-based approved-answer matching. This is not yet a live telephone caller.

## Run and verify

`npm ci`, `npm run build`, `npm test`. For a local frontend and real function routes, use `npx netlify-cli dev --offline --dir out --framework '#static' --port 3017 --no-open`. `npm run dev` serves only the frontend.

## Available workflows

- Browser drafts: service editing, approved FAQs, saved instructions, scripted practice, JSON export, archive and restoration.
- Cloud workspace: password sign-in using an existing Supabase account, owner-isolated services, immutable versions, optimistic conflict protection, archive/restore. Cloud records are not mirrored to local draft storage. Sign-out clears cloud records from the interface. No automatic upload of browser data occurs.
- AI practice: explicitly select AI mode on a saved cloud service. The backend retrieves the authorized service version, applies request limits, and asks the model to select FAQ IDs. Only approved answer text is returned; invented IDs fall back to a handoff. The model may still choose an irrelevant answer, so real-world evaluation is required. Service instructions cannot override server boundaries.

## Deployment configuration

1. The user selected a dedicated Callcraft Supabase project. Review and apply `supabase/migrations/202611250001_callcraft.sql` once after provisioning it. This creates only `callcraft_*` objects. Verify actual hosted authentication and RLS before production. PGlite tests exercise PostgreSQL security and mutations locally; they do not verify a hosted project.
2. Configure `SUPABASE_URL` and `SUPABASE_ANON_KEY` in Netlify. Use a publishable/anon key only; privileged secret/service-role keys are refused.
3. Configure `OPENAI_API_KEY` and an explicit `OPENAI_MODEL` supporting Responses structured outputs. Keys stay server-side. API credits are consumed only when a signed-in user selects AI practice and sends a reply. Pilot limits: 10 requests/minute and 100/rolling 24 hours per user. Each request reserves a slot before provider invocation, including provider failures. These are not a total dollar budget; configure a provider project budget before broader use.
4. `netlify.toml` deploys `out/` and bundles `netlify/functions`. Authorize the CLI and deploy a dedicated Callcraft project. Do not overwrite another app or copy credentials from another app.

The existing ChatGPT Sites publication remains a separate static prototype. Netlify is the active deployment and publishes from GitHub `main`.

## Security and source of truth

Each service has one owner. Content lives in immutable versions; the current-service view derives the latest version and archive state. RLS protects reads; scoped database functions validate ownership before mutations. App roles cannot directly update or delete history. Server requests use the user's JWT instead of a privileged key. Locks and expected versions prevent lost edits. Rate limits derive from immutable request events. Auth uses the Supabase SDK.

This release supports individual workspaces. Shared organizations and roles need explicit requirements. Example service content is illustrative.

## Not implemented or enabled

Voice, Twilio dialing, contacts, recording, real-world opt-outs, callbacks, and appointment booking. The status endpoint always reports live calling disabled. Before enabling calls, verify destination country, contact eligibility, calling hours, provider setup, signature-verified webhooks, deduplication, global spending caps, opt-out enforcement, and accountable outcomes. A persistent call bridge is still needed for live audio; Netlify request functions are not that bridge.
