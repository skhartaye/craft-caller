# Callcraft Studio

Next.js / React / TypeScript first-version caller configuration website. Run `npm install`, `npm run dev`, `npm run build`, and `npm test`.

## Implemented

Service creation and editing, saved conversation instructions, approved FAQ management, local browser persistence, archive (retains original records), JSON export, scripted conversation practice, connection prerequisites, responsive workspace UI.

## Important boundaries

This is a local-first prototype. It has no user accounts, server database, AI inference, telephony, recording, appointment booking, or real opt-out enforcement. Practice uses keyword matching, explicitly labeled in the interface. Instructions are saved but not executed by a model. Browser storage is not tenant isolation or an audit system. Do not use it to store customer contact lists or secrets. The sample business content is illustrative.

## Production continuation

Keep this repository as the modular application. Before live calling: integrate Supabase Auth and Postgres with tenant membership and RLS; move records to the server; add immutable service versions and append-only audit events; connect a persistent Node.js call bridge to Twilio and OpenAI Realtime. Authenticate and authorize every request, validate webhook signatures, keep API keys server-side, and enforce contact eligibility, opt-outs, scheduling time zones, deduplication, concurrency, duration and spending caps on the server. Derive readiness from actual configuration and verification results. Confirm destination country, contact source, intended use and calling requirements before enabling outbound calls.

The static export is deployed privately for reviewing the workflow. It is not a production calling service.
