# Windows AI integration validation

November 5, 2026. Feature branch based on exact transferred commit `d009c4769858f34e26135bfa5c6c2ad188909273`. Bundle was 31,752 bytes, SHA-256 `81de940b664f4c1f3264ff706c46afc0f0dee01b653bedc872ec3d7899a4272f`; `git bundle verify` succeeded before import. No incoming working-tree changes were present. Only the temporary bundle was deleted.

## Automated

Node 26.13.0 on Windows; `npm ci` and `npm run check` (types, 155 tests, production build). Original 141 tests preserved. New tests use fixtures, a mocked HTTP transport and SQLite-backed D1 adapters. They cover spend reservations under contention, scope/concurrency/storage limits, failed persistence, retries/duplicates/restarts, refusal/malformed/stale outputs, provider routing, legal choices without RNG mutation, saved replay narration, room authentication and concurrent state changes, plus audio gates/cache/retirement. No provider key or live API call was used.

Local D1 migrations were applied with `--local`. A real localhost HTTP flow passed create → start → saved campaign → narrate → legal suggestion → audio fallback → ordinary action, verifying persisted replay commands. Test room data stays in ignored `.wrangler/state`.

## Browser

URL: `http://127.0.0.1:5347/`. Playwright 1.58.2 with installed Microsoft Edge, isolated browser contexts. Browser plugin absent; T3 shared preview opened but two snapshots failed with `Preview automation snapshot timed out after 15000ms`, so validation used the permitted Playwright fallback. Its scripts/screenshots are outside Git at `C:/Users/mexic/.t3/scratch/painted-realms-qa/`.

| Check | Result |
| --- | --- |
| Page title/meaningful content/no framework overlay | Pass |
| Browser console/page errors | None in final matrix |
| Desktop Paint and Pixel | Pass, 1440×900 |
| Narrow Paint and Pixel | Pass, 390×844 |
| Actual art-style assertion | Pass, checked `html[data-theme]` after hydration |
| Horizontal document/dialog overflow | None |
| Optional prompts | All three saved; premise and character traits visible |
| Narration and suggestion | Saved caption, legal guard suggestion; no automatic action |
| Engine action | Ordinary Guard button still works |
| Replay/resume | Saved caption present in replay; campaign prompt survives resume |
| Screenshots | Setup, Storyteller and board captured for all four cases |

An initial test clicked the art toggle before hydration and mislabeled Paint as Pixel; those results were discarded and the entire matrix rerun with actual style assertions. Review of the desktop setup screenshot also caught unstyled textareas, now using the existing themed field styles. Narrow dialogs scroll vertically and retain their close control.

No new full-campaign browser walkthrough, physical device, Safari, screen reader or reliable FPS measurement. Existing automated complete-game/replay tests still pass. Dev hot reload emitted server-side multiple-renderer warnings; final browser runs had no console errors. Build reports Vinext's existing static route-classification notice, not a failed build.

Live model quality, billing, access permissions and paid voice quality remain unverified. That checkpoint used temporary Speech API audio; the follow-up below replaces it. Offline solo intentionally remains fixture-only; use a one-human server room to exercise the optional provider. Key provisioning is pending the user's secure setup/destination confirmation. No push or deployment.

## Spoken-narrator follow-up (November 5, 2026)

Continued `feature/conservative-ai-integration` directly from `609ac93`, with no incoming modifications, worktree, push or deployment. Replaced the temporary Speech API adapter with a bounded server-owned `gpt-realtime-2.1-mini` request using the documented Realtime protocol. Official endpoint, model, voice, event schemas, lifecycle and prices are linked in AI-OPTIONS.md. This is not an exact-verbatim API: reported audio and final-message transcripts must match the approved caption before playback; audible fidelity is unverified.

Final `npm run check` passed on Windows Node 26.13.0: typecheck, **164 tests**, production build. Ten dedicated speech tests replace the prior temporary-adapter test. They cover reserve-before-connect, disabled/key-only zero traffic, separate audio opt-in, character/byte/token/duration limits, budgets/storage/concurrency, duplicate requests and shared restart cache, transcript mismatch, malformed/missing/incomplete output, invalid session acknowledgement, HTTP refusal, event floods, timeout, abort/disconnect, late upgrade closure, WAV conversion and retained uncertain spending. Existing rules/replay/D1 contention tests still pass. `git diff --check` passed.

A separate local Miniflare test exercised the actual Workers WebSocketPair/101 Response interfaces, transcript validation, PCM WAV conversion and socket close with an injected in-process fake provider. It made no outbound provider request and disposed its runtime. The localhost HTTP/D1 fixture flow was rerun successfully (create/start/narrate/suggest/audio fallback/action/replay).

Shared preview opened the localhost page, but two new snapshot attempts both failed with `Preview automation snapshot timed out after 15000ms.` The tab was closed and validation used the permitted Playwright 1.58.2 / Microsoft Edge fallback. All four viewport/style cases passed: desktop 1440x900 and narrow 390x844, both Paint and Pixel. No page/console errors or horizontal document/dialog overflow. The ordinary setup/story/legal-action/replay/resume matrix passed again. The speech matrix exercised an authenticated local room with mocked audio responses/playback: Stop aborts pending fetch, a late result cannot play, paid audio honors voice volume, Stop pauses it, unavailable/failed requests use device speech, zero voice volume makes zero audio requests, and updated provider disclosure renders. Device synthesis was spied, not acoustically evaluated. Narrow dialogs scroll and keep their close control reachable; desktop controls fit. Screenshots were inspected.

Scripts/results/screenshots remain outside Git at `C:/Users/mexic/.t3/scratch/painted-realms-qa/`: `speech.mjs`, `speech-results.json`, `speech-worker.mjs`, `speech-{390,1440}-{Paint,Pixel}.png`, plus the rerun original matrix. Test browser contexts and runtime were closed; the task's dev server was stopped after validation.

No key was created, requested, installed or read, and no paid calls were made. The existing secure destination confirmation remains pending and untouched. Fixture-only defaults and separate paid-text/audio opt-ins remain unchanged; a key alone enables nothing. Live account permissions, protocol compatibility with the actual OpenAI service, voice quality, latency and billing still need a separately authorized budgeted test. No key-independent implementation blocker remains. The 600 KB shared ledger intentionally holds few large clips and falls back when full. Provider transport buffering happens before application event-size checks; the adapter rejects oversized events and closes immediately upon delivery. Budget reservations are conservative app accounting, not an exact billing guarantee.

## Authorized live validation and repairs (November 5, 2026)

This section supersedes the pending-key/no-live-results statements in the historical checkpoints above. Started from clean `7156b1e` on `feature/conservative-ai-integration`. Reused the installed service-account key under explicit authorization; no key creation, account billing changes, push, deployment or production writes. The previously blocked temporary-key artifacts were not touched.

### Findings and repairs

- The built local preview missed root `.dev.vars` because its Wrangler configuration lives in `dist/server`. `npm start` now resolves the root file explicitly, without copying secrets. The new entry point was used successfully for HTTP and browser validation.
- Workers native `fetch` threw `Illegal invocation` when stored and invoked as an object method. The default adapter now calls it through a wrapper.
- Workers rejects `redirect: 'error'`. Text and speech now use `manual` and reject non-success/non-upgrade responses, so credentials are not forwarded to a redirected destination.
- A real completed Realtime message uses `content.type: 'output_audio'`, not the previous fixture's `audio`. Corrected the validator and mock protocol. The actual observed transcript `The lantern glows.` matched; that attempt still rejected the final message before the fix and its reservation was retained.
- Added bounded, fixed-category receipt diagnostics without raw provider messages/secrets, and retained reported text usage even when validation rejects the output. A Miniflare regression test exercises native Workers fetch against an intercepted provider, with outbound networking disabled.

### Live model results

The official model pages, Structured Outputs guide and Realtime client/server event references linked in AI-OPTIONS.md were fetched again. Listed prices and requested schemas were checked before inference. Three authenticated `GET /v1/models/{id}` probes returned HTTP 200 with the exact requested IDs; these are catalog checks, not proof of inference.

| Model | Actual inference result |
| --- | --- |
| `gpt-6-luna` | Successful campaign/character plan, narration and legal guard suggestion through actual localhost room routes. |
| `gpt-realtime-2.1-mini` | Three bounded inference attempts. First returned fallback before diagnostics existed. Second produced matching short transcript/audio events but was rejected by the incorrect final content-type check. After repair, the final route failed exact transcript validation and withheld playback. Access and inference are verified; playable paid audio is **not** verified. |
| `gpt-6.1-terra` | Catalog accessible; optional planner inference deliberately not invoked. |

The live text room had one human, no bots, a courier/shard prompt, personality preferences and seed `live-budgeted-20261105`. Accepted campaign prose stayed within the woodland/three-shard premise. Human name `Rowan Live`, ranger class and personality were preserved. Narration was `A crooked path leads toward the first shard.`, grounded in the initial committed event. The suggestion selected the engine's guard action and did not execute it. Fresh engine construction reproduced tiles and RNG; replay reconstruction matched the saved game exactly. Generated prose itself is not deterministic and semantic grounding beyond this small sample is not guaranteed.

Repeated identical narration, suggestion and failed-audio requests before disabling reused persisted results with an unchanged ledger. HTTP reload and replay retained the campaign, identity and caption. The browser later reopened the same live-generated campaign after a server restart with paid features disabled. Failure deduplication was never reset to obtain another attempt.

A non-generating Realtime configuration probe verified voice `marin`, mu-law output, disabled VAD/transcription, empty tools and the 1,800-token cap; it never sent `response.create`. The final paid-audio route used a separately created fixture room to avoid further text spending. The final transcript mismatch was rejected without playing partial audio. No microphone, ongoing conversation, automatic retry or free-running session was used. There is no successful live cached WAV or acoustic-quality claim.

### Accounting and shutdown

The existing local D1 ledger began empty; it was never erased or reset. All billable routes and the direct speech diagnostic shared that ledger and its atomic reservations. Local ceilings were $0.10/campaign, $0.25/day and $0.25/month, below the authorized $0.50 task maximum. Tests ran within one UTC day/month. The direct diagnostic reserved before opening its transport and used the same caps as the server. No other direct generation probes were used.

- **6 provider inference requests:** 3 text and 3 speech (2 route speech attempts, 1 direct Workers diagnostic).
- **8 reserved attempts:** the 6 above plus 2 text attempts that failed locally before outbound HTTP. An initial fixture-only setup and two server-not-ready calls made no reservation/provider call.
- **$0.249831 retained reservations:** $0.011712 text, including $0.005396 for the two local failures; $0.238119 for three speech attempts. No pending receipt remains. No refunds were applied.
- Successful text usage: plan 438 input/108 output, narration 398/27, suggestion 1,324/15. Total 2,160 input/150 output. Estimated $0.000291 at uncached Standard rates, or $0.000345 conservatively pricing all input as cache writes.
- The direct speech diagnostic reported 67 text-input tokens and 51 output tokens (17 text, 34 audio): approximately $0.000761 using the documented modality rates. Its full $0.079373 reservation remains despite validation rejection. The other two speech attempts have unknown usage; both retain full reservations. Known-usage estimates exclude those attempts and are **not total confirmed billing**.
- Confirmed provider billing was not obtained. The retained $0.249831 is the conservative task accounting, not an invoice or a claim of actual charges. No $10 account cap was set or assumed.

The durable record and safe provider trace are outside Git at `C:/Users/mexic/.t3/scratch/painted-realms-qa/live-20261105/record.json` and `speech-diagnostic.json`; the original receipts remain in ignored `.wrangler/state`. Final `.dev.vars` has `AI_MODE=fixture`, `AI_ENABLE_PAID=DISABLED`, `AI_ENABLE_AUDIO=DISABLED`. The installed key is preserved. Task-owned servers, browsers and Miniflare runtimes were stopped; user-owned processes were preserved.

### Automated and browser evidence

Final `npm run check`: typecheck, **167 passing tests**, production build. Tests use fake transports and do not read `.dev.vars` or call the provider; the new Workers test disables real networking. Existing coverage includes concurrency/durable dedup, budget and storage exhaustion, missing key/disabled modes, auth/rate/timeout/provider errors, cancellation, malformed/stale output, forbidden actions, immutable facts, replay and recovery. Arbitrary off-story prose is not semantically guaranteed to be rejected. The native WebSocketPair/WAV/closure fixture and real HTTP/D1 fixture flow also passed after the repairs. One earlier build hit Windows' locked `dist` while the preview ran; stopping the task-owned preview resolved it.

Browser plugin unavailable; regular Playwright 1.58.2 with installed Microsoft Edge was used as explicitly requested. No T3 preview or desktop automation was used. Isolated agent-owned contexts at `http://127.0.0.1:5347`, desktop 1440x900 and narrow 390x844, both Paint and Pixel:

| Check | Result |
| --- | --- |
| Page identity, meaningful UI, no framework overlay | Pass |
| Browser page/console errors | None in all three final matrices |
| Document/dialog horizontal overflow | None; screenshots inspected |
| Solo prompts, narration, guard suggestion, ordinary guard, replay/resume | Pass, fixture mode |
| Actual live-generated campaign/caption after restart/reload | Pass in all four viewport/style combinations |
| Live-generated character identity and caption in replay | Pass; presentation switches retained state |
| Stop aborts pending speech; late result cannot play | Pass with mocked transport |
| Paid playback volume/stop; fallback; muted zero requests | Pass with mocked playback, not live audio |
| Live playable paid audio, acoustic fidelity, shared successful live audio cache | Not established; transcript gate withheld audio |

Scripts, JSON results and screenshots are in the same external `live-20261105` directory: `results.json`, `speech-results.json`, `live-browser-results.json`, `story-*`, `speech-*`, `live-text-*`. Two browser-script assumptions were corrected once each (resume has no chapter Continue button; caption appears in both journal and dialog). No browser backend switch was needed. No physical-device/Safari/screen-reader/full-campaign or acoustic quality validation was performed in this task.

Readiness: bounded Luna text can be used experimentally with explicit opt-in. Keep paid speech off: after protocol repairs, exact transcript fidelity and successful playable/cached speech still require a later budgeted validation. Do not weaken the transcript check or reset receipts to make the test pass.
