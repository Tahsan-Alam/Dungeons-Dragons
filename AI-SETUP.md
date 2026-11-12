# AI setup

AI is password-free by default. The owner requested open access for collaboration. Server credentials, paid text/audio opt-ins, durable reservations, request limits and game rules still apply. Open access does not expose keys or grant control of other players' rooms.

See [Team development](TEAM-DEVELOPMENT.md) for setup, [AI usage limits](AI-USAGE-LIMITS.md) for current caps, and [AI validation](AI-VALIDATION.md) for historical evidence and limitations. Historical records describe settings at the time of those tests, not the current access policy.

## Server configuration

Keep OPENAI_API_KEY in an ignored root .dev.vars locally or a secret binding on the host, never frontend code or Git. The server requires all of:

- A persistent D1 DB binding with the ledger schema.
- AI_MODE=openai.
- AI_ENABLE_PAID=I_ACCEPT_SMALL_API_CHARGES.
- A server-side OPENAI_API_KEY.
- Remaining campaign, day and month allowance.

Paid voice additionally requires AI_ENABLE_AUDIO=I_ACCEPT_PAID_AUDIO. Keys alone enable no paid work. AI_MODE=fixture disables new paid work while retaining adventures and receipts. Tests use mocks/fixtures; npm run check needs no provider key.

AI_ACCESS_MODE=open (also the default when unset) allows visitors to use configured AI without unlocking a device. An old AI_ACCESS_PASSWORD_HASH is ignored in this mode, so existing deployments become password-free when this code is published. Enable AI / Disable AI saves a browser preference in an HttpOnly, SameSite cookie. Disabling prevents new paid work from that browser, not other visitors. Clearing browser data restores default open access. Already-running work may finish.

An optional gate remains: set AI_ACCESS_MODE=password and supply a valid AI_ACCESS_PASSWORD_HASH from node scripts/team-password.mjs. It uses hashed opaque sessions and a PBKDF2 verifier. Missing/invalid verifier or an unknown access mode fails closed. Password mode is not required for normal team development.

## Local database and server

Run npm ci, then npm run local:setup, then npm run dev -- --port 5347 --hostname 127.0.0.1.

local:setup builds and applies missing local schema statements from drizzle/*.sql, including manually initialized older databases. It preserves rooms and AI reservations. Its planner stops on unsupported SQL or missing expected columns. Run it with servers stopped on Windows. npm run local:setup -- --skip-build skips building only when the existing build and bindings are current.

npm start -- --port 5347 runs the built application and explicitly loads the ignored root .dev.vars. Dev and built servers share .wrangler/state within that checkout. Separate clones have independent databases. Local setup never changes the hosted database or publishes code.

## Spending boundaries

The hosted configured ceiling remains **$25/month**, with $8/day and $2/campaign. Fresh local defaults are $4/month, $1/day and $0.40/campaign; fixture mode remains the initial setup. All are conservative reservation caps, not billing statements. Invalid/zero caps disable paid work. [AI-USAGE-LIMITS.md](AI-USAGE-LIMITS.md) lists the full inventory.

Each database has a separate ledger. Local testing does not consume or obey the hosted ledger's $25 cap; agree on a combined budget. A shared billing project does not make separate app ledgers global. Provider billing controls are separate and are not changed by local setup.

D1 reserves allowance atomically before outbound calls. Failures retain reservations; uncertain calls are not automatically retried. Cached results and duplicate requests avoid regeneration. Session duration, idle, token, payload, concurrency and storage limits remain enforced. Do not clear receipts to obtain more allowance.

Text uses the bounded Responses adapter and validated structured outputs. Narration uses committed events; dice, actions, combat and maps stay engine-owned. Paired Paint/Pixel recipes preserve identity. Voice uses a server relay without exposing the provider credential; see [live voice](server/live-voice.md). Removed dictation is not part of current setup.

## Hosted publishing

Keep the existing Site identity and DB binding in .openai/hosting.json. Pushes and merges do not deploy. The release coordinator publishes after the user asks, preserving the audience. Local .dev.vars is never packaged; deployed credentials stay in the host's secret store. Open access shares the configured allowance among all visitors who can reach the Site.
