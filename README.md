# Painted Realms

**Status: `0.1.0-alpha.1` — playable prototype.** Features, rules and saved-game formats may change during alpha.

[Play the hosted game](https://painted-realms.richie-r9.chatgpt.site/) · [Contribute](CONTRIBUTING.md) · [Roadmap](ROADMAP.md) · [Changelog](CHANGELOG.md)

A playable cooperative browser adventure with Paint and Pixel artwork, each available in 2D and 2.5D. All four presentations render the same game state without restarting the room, turn or character. Changing world view reframes the camera; changing art style preserves it. Local stories work without credentials; optional server-side AI adds quest planning, companion identities, narration, guidance and live voice. Paid AI also requires the team password in Table settings > AI and remaining shared allowance.

## Play

- **Create an adventure:** the creator follows **Imagine → Your hero → Begin**. Use one conversation to describe a world, shape a narrator, or ask a question. The editing column scrolls while Aether’s animated creation scene stays in view (above the editor on phones). White/silver Ether begins with rainbow particles; personality, delivery and appearance shape the narrator’s palette across the creator. A separate story background builds behind the character. Paint and Pixel preserve the same identity, and reduced motion is supported.
- **Shape the story and hero:** your chosen narrator drafts a short synopsis, timeline, world and key locations. Refine through conversation or edit the fields directly. Pick one of three story-linked heroes, or customize a character with a prompt, background/personality traits, name, class and palette. Choose length, companions and rules last. The reviewed synopsis, narrator, character and location names are saved into the game and replay; starting does not regenerate your approved story.
- **AI adventures:** enabling or unlocking AI in Settings also enables the creator. A per-quest choice remains separate and survives draft reloads. The creator waits for access checks and never silently replaces enabled AI with an offline draft; failed requests retain your message. Greetings remain conversation, without a story proposal. Aether uses a persistent Vesper voice; confirmed narrators keep their own voice and delivery. **Start voice** checks access before requesting the microphone. Speaker and microphone mute independently. Calls close after 30 seconds of inactivity or a funded 30/60/90-second window; both sides muted ends the call. Spending caps are unchanged. [Voice architecture and bounds](server/live-voice.md). AI solo starts a saved server room; offline solo stays local.
- **Gather party:** create a room and share its invite link/code. Up to ten heroes total, including companions. Everyone clicks Ready, then the host begins.
- Everyone at an open table sees other players', companions' and enemies' dice rolls, with the character, target and confirmed result. Rolls arriving together play in order: use Next roll, Pause auto-advance to read at your own pace, or Back to board to skip the queued presentations. Recent results remain in the adventure log. Rolls wait while you inspect a character or use a table dialog. Your own attack still starts with Roll d20. Opening a saved adventure does not replay old rolls.
- Turn guidance stays visible on phones. Targeting shows available choices and explains when to move or end your turn. Chest and gateway buttons become available when you are close enough; the final gateway shows Finish adventure.
- Defeat the enemies, move beside the chest and open it, then reach the gateway. Short, Standard and Long adventures contain **1, 3 and 5 chapters** respectively, with one shard per chapter. These are chapter counts, not promised play times.
- **Your narrator:** open **Ask [name]** from the board to ask how to play or what to do next. The selected persona and delivery style carry into live narration, help and generated speech. Older adventures retain Pip. Under **Guide the story**, the host can save creative direction, request shorter narration or end at the current chapter's gateway after completing its objective. Guidance makes no moves. Saved memories and character identities inform later narration; paired avatars blink and talk, with reduced motion available.
- Camp and Adventures use a neutral monochrome interface. Camp has an interactive example board; Adventures is a separate saved-game library. The same navigation, art controls, help, and settings remain available on every screen.
- Paint/Pixel changes the artwork while preserving the same interface typography, logo, button shapes, spacing and outline icons. Table settings provides independent Light, Dark, and System appearance, five accent colors and Full/Reduced/System motion. Light uses a white canvas; Dark uses black, including adventure creation. Narrator accents adapt to both modes; terrain, outfits, dice and narrator art soften in Dark. These preferences persist locally and sync across browser tabs.
- Table settings → Appearance → World view switches between 2D and 2.5D. The angled view raises scenery and keeps characters upright. Live games, previews, portraits, chapter scenes and replays share the preference. Other players can use a different view in the same room. Switching uses local SVG components, with no new generation calls.
- Adventures saves multiple local adventures and server seats in this browser. Pin, rename, archive, restore, or delete entries independently. Local solo games pause when you return to Adventures; server rooms, including AI solo, retain their room behavior and friends can continue their turns. Rooms remain available for 30 days after the last active visit or game change. Keep your browser data to recover your character. Room codes let a friend claim an open seat; they are not passwords.
- Drag the dividers beside Party and the adventure log to resize; double-click a divider to reset it. Keyboard users can focus the divider and use arrows or Home. Table settings → Controls includes two shortcuts per action; Table contains optional unused-action confirmation and mouse edge reveal. Touch users can drag/pinch the board and open Party/log with buttons.
- Arrow keys move your hero by one legal tile outside the tile grid; Shift + arrows pan the camera. When a reachable tile has keyboard focus, arrows preview destinations and Enter/Space commits the move. Only one destination is in the Tab order, so Tab leaves the grid promptly. Hover or focus a reachable tile to preview its path and cost. Movement follows the path smoothly, with reduced motion available. Compact layouts frame the hero at a readable size; Fit board shows the full map. Dark mode also darkens terrain while keeping paths, markers and characters legible.
- Replays contain the starting state and every accepted input, including scripted turns and departures. Finished and in-progress games can be scrubbed without changing the saved game. Games made before replay support are labeled as starting at their imported save. Replay data already downloaded to this browser remains available after an online room expires.

## Run locally

Use **Node.js 26**, matching `.nvmrc` and the automated checks. Node 22.13+ is supported, but the tests also require `node:sqlite`.

```sh
git clone https://github.com/Tahsan-Alam/Dungeons-Dragons.git
cd Dungeons-Dragons
npm ci
npm run dev -- --port 5347 --hostname 127.0.0.1
```

Open the address printed by the server. Start with offline solo play; no AI keys are required. Multiplayer and AI solo need the local database initialization below. Live AI also needs server-only credentials and explicit paid flags; a key or player preference alone enables no paid requests.

For a fresh local multiplayer database, build once with `npm run build`, then run:

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_wealthy_ben_grimm.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_ai_ledger.sql
```

Apply each migration only once; check existing tables before initializing an existing database. The dev and built previews share `.wrangler/state`. `npm start -- --port 5347` runs the production build locally and loads the ignored root `.dev.vars` when present. A local address is only available on this computer; friends elsewhere need the hosted deployment and visitor access. Apply outstanding AI access migrations as described in [AI setup](AI-SETUP.md#secure-setup).

## Verify

```sh
npm run check
```

The pure engine and server tests need Node 22.13+ (Node 26 recommended for `node:sqlite`). No provider credentials are needed. See test files for actual coverage rather than treating passing tests as full D&D compliance.

## What is here

- Adventures of one, three or five chapters using seeded connected maps, four custom classes, ranged/melee attacks, limited powers, guard, healing, inventory and party objectives. Longer adventures reuse the validated encounter families.
- Streamlined rules and **Classic (SRD subset)**. Classic adds initiative, Armor Class, advantage, critical hits and death saves. It is not full D&D: complete classes, species, spells, progression, reactions, conditions and many other rules remain future work. See [RULES.md](RULES.md).
- Server-owned dice and game state, optimistic concurrency, ten-seat room cap, readiness, reconnection, host transfer, disconnected-turn recovery, request retry protection and D1 persistence. See [MULTIPLAYER.md](MULTIPLAYER.md).
- Paint and Pixel SVG sprites, terrain and illustrations, with shared 2D/2.5D identity; projected movement paths and hit areas; board pan/zoom; accessible HTML controls; responsive party/story drawers; reduced-motion support.
- Table settings groups Appearance, Sound, Controls, Table and AI preferences in one scrolling pane. Sound includes optional Hex Settlers hover/click samples, device narration and synthesized ambient music, each with its own level. Hover/focus feedback can be turned off independently. Levels persist; audio starts only when enabled or explicitly previewed each visit. Browser/device voices vary. These Sound controls use local audio; the Storyteller also offers separately opted-in server speech with device fallback.
- Saved seeded campaigns, validated companion class/palette/personality recipes, chapter memories, creative direction and Pip's persisted narration and guidance. Existing Paint/Pixel SVG libraries render both versions of each recipe, and common scenery is reused. Default fixture mode makes no API calls. See [AI-SETUP.md](AI-SETUP.md) for spending controls and secure local setup, and [AI-VALIDATION.md](AI-VALIDATION.md) for current tests and evidence limits. [AI-OPTIONS.md](AI-OPTIONS.md) records the earlier model evaluation.

## Architecture

`game/engine.ts` is a pure, validated state machine shared by solo and online play. `game/types.ts` defines the serializable commands/state. Online routes delegate to `server/rooms.ts`; `server/room-store.ts` persists rooms using versioned atomic updates. The client never supplies authoritative health, inventory or dice values.

The presentation layer in `app/ui/` consumes state and sends actions. Theme state lives separately from game/session state. `Art.tsx` chooses prebuilt vector renderers; `PixelArt.tsx` contains integer-grid pixel artwork. `board-projection.ts` maps canonical coordinates into either view, and `DepthArt.tsx` derives dimensional surfaces from the same asset families. No images are downloaded during a theme or view switch. A later physical-tabletop interface can reuse the same commands, rules, adventure state and storyteller, with its own input adapter.

Visual assets are authored SVG components; the two small interface audio samples are bundled locally. AI chooses validated character class/palette recipes shared by both art styles; it does not generate raster images, insert arbitrary SVG/HTML or overwrite game state. No browser API key field is included. The server-only OpenAI adapter uses bounded text requests, separately enabled bounded GPT-Live sessions; see [AI-SETUP.md](AI-SETUP.md) for explicit opt-in and safeguards.

## Limits

This is a first-playable adventure, not a finished commercial virtual tabletop. Multiplayer uses lightweight polling (roughly 1.2 seconds), appropriate for turn-based play. Room invite codes do not provide private campaign passwords. AI can shape a premise and tell a grounded story, while encounters, maps, classes, identities and legal actions stay within validated boundaries. Novel image generation, unconstrained campaigns, character leveling, full D&D and physical board input remain future work. Local browser workflows passed in desktop and narrow Paint/Pixel layouts, including a complete short AI quest. Human microphone quality, audible playback and physical-device behavior remain unverified; [AI-VALIDATION.md](AI-VALIDATION.md) records the evidence and limits.

See [CREDITS.md](CREDITS.md) for SRD attribution.
