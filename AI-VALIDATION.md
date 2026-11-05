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
