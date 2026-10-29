# Painted Realms

A playable, 2D cooperative browser adventure with a hand-drawn Paint theme and a complete Pixel theme. Both themes render the same game state: switching changes appearance without restarting the room, turn, board camera, or character. No paid AI service is connected.

## Play

- **Play solo:** choose a class, rules, setting, seed and 0–3 scripted companions. Click highlighted tiles to move, then attack, use a power, guard, or drink a potion. End your turn to let the other characters act.
- **Create room:** create a room and share its invite link/code. Up to ten heroes total, including companions. Everyone clicks Ready, then the host begins.
- Defeat the enemies, move beside the chest and open it, then reach the gateway. Recover three lantern shards to win.
- Paint/Pixel switches are in the headers and dialogs. Art preferences stay local; each player can use their preferred theme.
- Games saves multiple solo adventures and online seats in this browser. Pin, rename, archive, restore, or delete entries independently. Solo games pause when you return to Games; online friends can continue their turns. Online rooms remain available for 30 days after the last active visit or game change. Keep your browser data to recover your character. Room codes let a friend claim an open seat; they are not passwords.
- Drag the dividers beside Party and Journal to resize; double-click a divider to reset it. Keyboard users can focus the divider and use arrows or Home. Settings → Controls includes two shortcuts per action, optional unused-action confirmation and mouse edge reveal. Touch users can drag/pinch the board and open Party/Journal with buttons.
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
node --experimental-strip-types --test game/*.test.ts server/*.test.ts app/ui/controls.test.ts
npm run build
```

The pure engine and server tests need Node 22.13+ (Node 26 recommended for `node:sqlite`). No provider credentials are needed. See test files for actual coverage rather than treating passing tests as full D&D compliance.

## What is here

- Three seeded encounters, connected maps, four custom classes, ranged/melee attacks, limited powers, guard, healing, inventory and party objectives.
- Streamlined rules and **Classic (SRD subset)**. Classic adds initiative, Armor Class, advantage, critical hits and death saves. It is not full D&D: complete classes, species, spells, progression, reactions, conditions and many other rules remain future work. See [RULES.md](RULES.md).
- Server-owned dice and game state, optimistic concurrency, ten-seat room cap, readiness, reconnection, host transfer, disconnected-turn recovery, request retry protection and D1 persistence. See [MULTIPLAYER.md](MULTIPLAYER.md).
- Separate Paint and Pixel SVG sprites, terrain and illustrations; board pan/zoom; accessible HTML controls; responsive party/story drawers; reduced-motion support.
- Device speech reads story captions. Locally synthesized ambient music is optional. Browser/device voices vary. Neither feature calls a paid model.
- Safe fixture interfaces for future narration, decisions, art specifications and speech. See [AI-OPTIONS.md](AI-OPTIONS.md) for verified model options, costs, examples and the spending controls required before connecting any provider.

## Architecture

`game/engine.ts` is a pure, validated state machine shared by solo and online play. `game/types.ts` defines the serializable commands/state. Online routes delegate to `server/rooms.ts`; `server/room-store.ts` persists rooms using versioned atomic updates. The client never supplies authoritative health, inventory or dice values.

The presentation layer in `app/ui/` consumes state and sends actions. Theme state lives separately from game/session state. `Art.tsx` chooses prebuilt vector renderers; `PixelArt.tsx` contains integer-grid pixel artwork. No images are downloaded during a theme switch. A later physical-tabletop interface can reuse the same commands, rules, adventure state and storyteller, with its own input adapter.

All assets are generated ahead of play as authored SVG components. Future models can choose validated artwork properties; they should not insert arbitrary SVG/HTML or overwrite game state. No API key field or provider SDK is included in this version.

## Limits

This is a complete short first-playable adventure, not a finished commercial virtual tabletop. Multiplayer uses lightweight polling (roughly 1.2 seconds), appropriate for turn-based play; it is not a real-time action-game server. Room invite codes do not provide private campaign passwords. Gameplay, art and narration are deliberately bounded to a small reusable set. AI-driven free-form conversations and campaign generation, character leveling, full D&D and physical board input remain future work.

See [CREDITS.md](CREDITS.md) for SRD attribution.
