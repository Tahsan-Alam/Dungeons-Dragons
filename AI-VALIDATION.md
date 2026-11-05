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

Live model quality, billing, access permissions and paid voice quality remain unverified. Optional paid voice is a temporary deprecated Speech API adapter with a hard retirement cutoff; Realtime migration is not implemented. Offline solo intentionally remains fixture-only; use a one-human server room to exercise the optional provider. Key provisioning is pending the user's secure setup/destination confirmation. No push or deployment.
