# Local AI integration

Verified November 5, 2026. No live API request was made during implementation or testing.

## Play and persistence

All development/tests default to fixtures. A key alone changes nothing. Solo remains offline and fixture-only. For server AI, choose **Gather party**; one human plus companions works for testing alone. Setup offers optional adventure, narrator and character prompts (400 characters each), plus a seed. The campaign keeps fixed three-shard facts and chapter goals. Character recipes select existing classes and palette colors shared by Paint/Pixel and 2D/2.5D. Human names/classes remain fixed. A numerical seed varies local starting material; it does not make model prose deterministic.

During play, open **Settings → AI game master**. **Narrate this moment** saves a caption for committed events. **Suggest a legal action** selects an engine-enumerated choice or asks for clarification; confirm through existing controls, including the attack-roll dialog. Bots remain scripted. The host generates narration/audio; everyone can reuse cached audio. **Read caption** falls back to device speech. Stop and captions remain available; playback stops after 45 seconds or when leaving/changing the moment.

Accepted campaigns, identities and narration persist in the game/replay. Resume, replay, rendering and style/view changes never generate. Old saves remain intact; new campaign metadata requires a new adventure. Narration is bounded flavor, not a semantic guarantee against hallucination. Models never replace executable outcomes or fixed facts. Saved prompts are visible to room members: do not enter secrets.

## Secure setup

One server-side project credential can serve all roles if endpoint/model permissions permit. Separate dev/prod projects and keys isolate usage; a key per model is unnecessary. See [authentication](https://developers.openai.com/api/reference/overview#authentication) and [permissions](https://developers.openai.com/api/docs/guides/rbac).

The connected OpenAI Platform tool found an account/project and supports secure key creation. Complete its private picker and confirm the ignored workspace `.dev.vars` destination. For an existing key, use a private `request_secret` card, never chat. Store `OPENAI_API_KEY` only in the server secret binding/ignored `.dev.vars`, never browser storage, a public environment variable, Git or logs. Account credits/billing and model access remain user-owned prerequisites. This task buys nothing and changes no account limits.

Initialize a fresh local DB once, after `npm ci` and `npm run build` (Node 26):

```powershell
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_wealthy_ben_grimm.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_ai_ledger.sql
```

Both are already applied locally on the handoff laptop. Do not reapply the initial migration to an existing DB. No remote migration/deployment was performed.

After secure provisioning, add these **nonsecret** settings to `.dev.vars` and restart the local server for a small text-only experiment:

```dotenv
AI_MODE=openai
AI_ENABLE_PAID=I_ACCEPT_SMALL_API_CHARGES
AI_CAMPAIGN_MICRO_USD=50000
AI_DAY_MICRO_USD=100000
AI_MONTH_MICRO_USD=250000
```

These select $0.05/campaign, $0.10/day and $0.25/month reservation ceilings. Leave audio off. Start a Gather party adventure and request one narration. `AI_MODE=fixture` disables new paid work after restart, retaining history. `AI_PLANNER_MODEL=gpt-6.1-terra` optionally selects the costlier planner; otherwise all text roles use Luna. Unknown model values cannot select arbitrary providers. Keep this test server local.

Optional paid speech additionally requires `AI_ENABLE_AUDIO=I_ACCEPT_PAID_AUDIO`. It now uses `gpt-realtime-2.1-mini`, voice `marin`, through a server-owned Realtime WebSocket upgrade. No browser credential, microphone, tools, ongoing conversation or paid retry. Device speech needs no key. For a single small audio experiment, the $0.05 text-only campaign cap above intentionally blocks audio: explicitly use `AI_CAMPAIGN_MICRO_USD=100000`, keeping the $0.10/day and $0.25/month experiment caps. One audio attempt reserves $0.079373, including failures; prior text calls also count. These are suggested settings only, not enabled by this change.

## Spending safeguards

Defaults: $0.10/campaign (the persisted session), $0.25/UTC day, $1/UTC month, two global outstanding calls. Configuration can only lower ceilings; invalid/zero caps disable live requests. D1 compare-and-swap reserves allowance **before** outbound traffic across concurrent workers/users. Reconnect does not reset spending. Missing persistence fails closed.

Text requests are bounded to 16,000 UTF-8 bytes, 1,600 output tokens for planning or 500 for narration/intent. No tools, automatic paid retries, streaming or background requests. Reservations use byte-based input bounds plus 2,048 framing tokens, cache-write rates and a 2× margin. This is conservative accounting, **not exact provider billing**. Failed calls retain reservations; reported usage is saved without automatic refunds. At maximum input size Luna planning reserves ~$0.006112 and narration ~$0.005012; Terra planning reserves ~$0.06112 (too large for the suggested $0.05 experiment). Typical inputs are smaller. Provider price changes, taxes and external charges are separate; recheck rates before enabling.

Audio accepts at most 600 characters and a 4,096-byte request, allows 1,800 output tokens, and reserves 79,373 microdollars before even connecting. The calculation is 2 * ((4,096 + 2,048 framing tokens) * $0.60/M + 1,800 * $20/M). Charging every output token at the audio rate conservatively includes text and reasoning output; cached input is charged at full input rate, with a 2x margin. No input audio, images, transcription or tool fees can be incurred by this path. Each attempt allows one response, 15 seconds wall time including connection, 30 seconds decoded audio (240,000 mu-law bytes), 1 MB wire events, 350 KB per event and 2,000 events. Text also times out after 15 seconds.

Audio is buffered until completed, then both the audio transcript and final message transcript must match the approved caption (whitespace normalization only). Deviations, missing transcripts and truncation fall back to device speech. This is a check of reported transcripts, not a guarantee of audible verbatim fidelity. The clip is stored compactly as mu-law and served as mono PCM WAV. Stop, leaving the dialog, changing the moment and HTTP request abort cancel pending work; an independent deadline closes it even if the runtime cannot propagate client disconnect. No partial audio plays. Voice volume/speed apply to paid and device playback; zero volume makes no audio request. Refused, malformed, stale or failed output falls back without changing rules. Intent is deduplicated per room/player/event even if the text changes. Narration is once per event, maximum 100 saved captions per campaign.

The durable ledger stores receipts/cache and usage, not credentials or input prompt transcripts. It stops at 2,000 receipts or 600,000 UTF-8 serialized bytes. Reservations account for pending results before connecting: 321,000 bytes for audio or 32,000 for text, plus receipt overhead. Oversized results cannot be committed. This deliberately small shared ledger may fit only one maximum-length clip; storage exhaustion falls back without paid regeneration. Successful clips are keyed by room, approved text, model, voice and adapter version, shared by all players and repeated identical captions, and remain readable after paid generation is disabled. Failed attempts are also deduplicated. A crash may leave a pending receipt occupying a concurrency slot. Do not reset/delete it to retry uncertain paid work: reconcile provider usage first. Manual ledger maintenance is deliberately outside gameplay; this is a small local prototype, not an indefinite billing database.

OpenAI documents both alerts and enforced hard limits; alerts alone do not stop calls, and hard limits may slightly overshoot while usage propagates. This task changes neither. [Spend limits documentation](https://developers.openai.com/api/docs/guides/spend-limits). App reservations cover only this app's requests.

## Validation

`npm run check` covers types, tests and production build. `server/ai.test.ts` and `server/ai-speech.test.ts` test zero-call fixture/key-only modes, atomic D1 contention, all caps, concurrency/storage exhaustion, duplicate/restart caching, failed requests without retries, malformed/stale results, legal actions without RNG mutation, replay, authenticated rooms and audio gating, bounded Realtime sessions, transcript checks, cancellation and caching. See `AI-VALIDATION.md` for browser results.

Live quality, latency, billing, model access and synthesized audio quality remain unverified. No API key has been installed by this implementation checkpoint.
