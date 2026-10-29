# Painted Realms

A playable cooperative browser adventure with Paint and Pixel artwork, each available in 2D and 2.5D. All four presentations render the same game state without restarting the room, turn or character. Changing world view reframes the camera; changing art style preserves it. No paid AI service is connected.

## Play

- **Solo quest:** choose a class, rules, setting, seed and 0–3 scripted companions. Use arrow keys or select highlighted tiles to move, then attack, use a power, guard, or drink a potion. End your turn to let the other characters act.
- **Gather party:** create a room and share its invite link/code. Up to ten heroes total, including companions. Everyone clicks Ready, then the host begins.
- Defeat the enemies, move beside the chest and open it, then reach the gateway. Recover three lantern shards to win.
- Camp has an interactive example board; Adventures is a separate saved-game library. The same navigation, art controls, help, and settings remain available on every screen.
- Paint/Pixel changes geometry and rendering while preserving the palette. Table settings provides independent Light, Dark, and System appearance, five accent colors and Full/Reduced/System motion. Light uses a white canvas; Dark uses black. These preferences persist locally and sync across browser tabs.
- Table settings → Appearance → World view switches between 2D and 2.5D. The angled view raises scenery and keeps characters upright. Live games, previews, portraits, chapter scenes and replays share the preference. Other players can use a different view in the same room. Switching uses local SVG components, with no new generation or image downloads.
- Adventures saves multiple solo adventures and online seats in this browser. Pin, rename, archive, restore, or delete entries independently. Solo games pause when you return to Adventures; online friends can continue their turns. Online rooms remain available for 30 days after the last active visit or game change. Keep your browser data to recover your character. Room codes let a friend claim an open seat; they are not passwords.
- Drag the dividers beside Party and the adventure log to resize; double-click a divider to reset it. Keyboard users can focus the divider and use arrows or Home. Table settings → Key bindings includes two shortcuts per action, optional unused-action confirmation and mouse edge reveal. Touch users can drag/pinch the board and open Party/log with buttons.
- Arrow keys move your hero by one legal tile; Shift + arrows pan the camera. Hover or focus a reachable tile to preview its path and cost. Movement follows the path smoothly, with reduced motion available. Compact layouts frame the hero at a readable size; Fit board shows the full map. Dark mode also darkens terrain while keeping paths, markers and characters legible.
- Replays contain the starting state and every accepted input, including scripted turns and departures. Finished and in-progress games can be scrubbed without changing the saved game. Games made before replay support are labeled as starting at their imported save. Replay data already downloaded to this browser remains available after an online room expires.

## Run locally

Requires Node.js 22.13+; tested with Node 26. Install with `npm ci`, then `npm run dev -- --port 5347 --hostname 127.0.0.1`. Open the address printed by the server.

For a fresh local multiplayer database, build once with `npm run build`, then run:

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_wealthy_ben_grimm.sql
```

Run that initial migration only once. The dev and built previews share `.wrangler/state`. `npm start -- --port 5347` runs the production build locally. A local address is only available on this computer; friends elsewhere need the hosted deployment and visitor access.

## Verify

```sh
npx tsc --noEmit
node --experimental-strip-types --test game/*.test.ts server/*.test.ts app/ui/*.test.ts
npm run build
```

The pure engine and server tests need Node 22.13+ (Node 26 recommended for `node:sqlite`). No provider credentials are needed. See test files for actual coverage rather than treating passing tests as full D&D compliance.

## What is here

- Three seeded encounters, connected maps, four custom classes, ranged/melee attacks, limited powers, guard, healing, inventory and party objectives.
- Streamlined rules and **Classic (SRD subset)**. Classic adds initiative, Armor Class, advantage, critical hits and death saves. It is not full D&D: complete classes, species, spells, progression, reactions, conditions and many other rules remain future work. See [RULES.md](RULES.md).
- Server-owned dice and game state, optimistic concurrency, ten-seat room cap, readiness, reconnection, host transfer, disconnected-turn recovery, request retry protection and D1 persistence. See [MULTIPLAYER.md](MULTIPLAYER.md).
- Paint and Pixel SVG sprites, terrain and illustrations, with shared 2D/2.5D identity; projected movement paths and hit areas; board pan/zoom; accessible HTML controls; responsive party/story drawers; reduced-motion support.
- Device speech reads story captions. Locally synthesized ambient music is optional. Narration volume/speed and music volume are adjustable and saved; playback starts only when enabled. Browser/device voices vary. Neither feature calls a paid model.
- Safe fixture interfaces for future narration, decisions, art specifications and speech. See [AI-OPTIONS.md](AI-OPTIONS.md) for verified model options, costs, examples and the spending controls required before connecting any provider.

## Architecture

`game/engine.ts` is a pure, validated state machine shared by solo and online play. `game/types.ts` defines the serializable commands/state. Online routes delegate to `server/rooms.ts`; `server/room-store.ts` persists rooms using versioned atomic updates. The client never supplies authoritative health, inventory or dice values.

The presentation layer in `app/ui/` consumes state and sends actions. Theme state lives separately from game/session state. `Art.tsx` chooses prebuilt vector renderers; `PixelArt.tsx` contains integer-grid pixel artwork. `board-projection.ts` maps canonical coordinates into either view, and `DepthArt.tsx` derives dimensional surfaces from the same asset families. No images are downloaded during a theme or view switch. A later physical-tabletop interface can reuse the same commands, rules, adventure state and storyteller, with its own input adapter.

All assets are generated ahead of play as authored SVG components. Future models can choose validated artwork properties; they should not insert arbitrary SVG/HTML or overwrite game state. No API key field or provider SDK is included in this version.

## Limits

This is a complete short first-playable adventure, not a finished commercial virtual tabletop. Multiplayer uses lightweight polling (roughly 1.2 seconds), appropriate for turn-based play; it is not a real-time action-game server. Room invite codes do not provide private campaign passwords. Gameplay, art and narration are deliberately bounded to a small reusable set. AI-driven free-form conversations and campaign generation, character leveling, full D&D and physical board input remain future work.

See [CREDITS.md](CREDITS.md) for SRD attribution.
