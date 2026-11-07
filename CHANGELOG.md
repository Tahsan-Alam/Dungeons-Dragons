# Changelog

Record user-visible changes at version checkpoints. Git history and pull requests track the individual edits between them.

## Unreleased

- Story-first adventure creation: describe a premise and narrator, select or converse about traits, preview three narrator profiles in Paint and Pixel, shape an editable storyline, choose or customize a story-linked hero, then set the rules and begin. Custom traits receive category-fit feedback and replacement suggestions.
- Fresh narrator auditions use generated sample text and persona-specific delivery. Live auditions require the existing team unlock, paid-audio opt-in and shared allowance. Selected narrator identity, voice direction, reviewed story, key locations and hero recipe persist through gameplay, saves and replay.

- Team-password AI access in Table settings → AI. Remembered devices default to enabled, retain their on/off choice, and can forget access. Server checks cover every paid route; the API key never reaches visitors.
- Shared hosted budget controls support $25/month, $2/day and $0.50/campaign, while local defaults stay conservative. Added private developer key/password setup and additive access migrations.

- Optional server-only Luna campaign recipes, narration and legal suggestions, plus bounded cached Realtime speech. Paid generation remains off by default; persisted captions and engine-authoritative gameplay survive presentation changes and reloads.
- Clearer local narration fallback messaging and an authorization recheck before returning in-flight suggestions or audio to a revoked seat.
- Release validation covers fresh local HTTP-route speech/playback and two-seat multiplayer; hosted generation/playback checks also passed; audible fidelity remains unverified. See AI-VALIDATION.md.

- Compact settings with stable section navigation, grouped sound controls and 44px close target. Appearance includes art style, world view, color, accent and motion.
- Optional Hex Settlers hover/click sounds with independent interface volume, preview, hover/focus toggle and recoverable playback errors. Audio levels migrate without enabling sound automatically.
- Consistent interface motion and a complete in-app Reduced override. Attack dialogs focus Roll d20; queued results preserve one dialog/backdrop, and dismissal controls share the exit transition.
- One keyboard destination in the board's Tab order, directional previews and Enter/Space movement. Camera framing stays bounded after manual zoom and resize; terrain and depth calculations avoid unnecessary work during interaction.
- More readable action labels and supply counts, consistent HP/result colors, visible replay selection and persistent quest-action emphasis.

- Player-triggered attack dice and queued results for other players, companions, enemies, and death saves.
- Pause/resume shared-roll playback or return directly to the board; recent results remain in the adventure log. Incoming rolls wait while another table dialog or mobile drawer is open.
- Persistent mobile turn guidance, legal-target counts, and clear next steps when movement or actions are exhausted.
- Chest and gateway controls reflect proximity and show “Finish adventure” at the final gateway. Waiting players retain their own power labels and supply counts.

## 0.1.0-alpha.1 — 2026-11-02

First shared repository checkpoint of the existing Painted Realms prototype.

- Solo play, scripted companions and online multiplayer for up to ten heroes.
- Seeded three-chapter adventures with streamlined and Classic SRD-inspired rules.
- Paint and Pixel art with independent 2D/2.5D views.
- Responsive interface, light/dark modes, accent colors and configurable controls.
- Saved adventures, replay, browser narration and synthesized background music.
- Team contribution guide, roadmap and automated type/test/build checks.

Known scope: paid AI generation is not connected; the rules are a custom subset; saved-game compatibility may change during alpha. Hosting the source on GitHub does not automatically redeploy the game.
