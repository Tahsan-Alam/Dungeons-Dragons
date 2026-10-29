# Online rooms

Multiplayer uses a shared server and a durable Cloudflare D1 room record. A browser does not submit dice results, replacement game states, damage, or another player's identity. It submits a permitted action; the server authenticates its seat and applies the same rules engine used by solo play.

Rooms hold up to **10 total adventurers**, including optional companions. Remove companions in the lobby to make space for friends. The host starts after every human is ready. New seats cannot join a game already underway, but a browser with its saved seat token can reconnect. Do not share or log that token; share only the six-letter room code.

## HTTP contract

All requests use same-origin URLs. POST requests require JSON, at most 8 KiB. Successful responses and errors are never cached.

| Endpoint | Request | Response |
|---|---|---|
| `POST /api/rooms` | `{name, heroClass, options, requestId}` | `{session, room}` |
| `POST /api/rooms/join` | `{code, name, heroClass, requestId}` | `{session, room}` |
| `GET /api/rooms/:code?version=N` | `Authorization: Bearer <session.token>` | `{room}` or `{unchanged:true, version, players, hostId}` |
| `POST /api/rooms/:code` | Same authorization, `{requestId,version,command}` | `{room}` or `{left:true}` |

Create/join use a fresh client-generated random UUID (`crypto.randomUUID()`) per new intention. Keep the pending UUID if a response is lost and retry with the **same ID and parameters**: the server recovers the same seat and credentials, even after another server instance handles the request. These admission request IDs act as recovery secrets; do not share or log them. The server stores only hashes. Replaying an admission cannot restore a removed or departed seat. If no request ID is supplied, creation is intentionally a new non-recoverable request.

Commands likewise use a fresh UUID request ID for a new user intention. Retry an uncertain command using its **same** request ID. The server retains the last 128 applied command IDs per room to make ordinary short-lived retries safe. For stale commands it returns HTTP 409, `code: STALE_VERSION`, and the current room; display the update and let the player decide again.

Commands: `ready` with `ready`; `options` with complete `options`; `addBot` with optional `heroClass`; `remove` with `playerId`; `start`; `action` with `action`; `skip`; `leave`. Host-only commands are options, addBot, remove, start, and skip. Settings and roster changes are lobby-only. A departing human's character becomes a scripted companion during play.

Poll about once per second during an active game and more slowly in the lobby. Presence writes happen at most every 15 seconds per seat. Unchanged responses omit the full board and history. A host may skip a current player's turn after that player has not polled for 45 seconds. After 90 seconds without host presence, an active human becomes host. Closing a tab does not remove a seat; explicitly Leave to release it.

The Games screen checks one unarchived waiting room every 2.5 seconds, rotating through saved seats. These reads use `background=1`, which does not heartbeat, transfer hosts, or extend expiration. Archiving stops these checks. Background checks stop when the page is hidden or a game is open. Human turns are never automatically submitted while away.

The local library uses IndexedDB, with one record per adventure. Each record contains its own board, saved seat, metadata, and replay. Serialized saves and revision checks prevent another tab's newer progress from being silently overwritten. Opening a saved game reloads its persisted record. Legacy solo data imports once; each legacy online seat imports independently. Deleting an entry removes this browser's copy and seat and atomically stores a deletion marker, so another tab's pending save or a legacy import cannot resurrect it. Explicitly leaving a live room converts its character to a companion. Neither action deletes another player's shared room.

Replays store an initial state and a deterministic log of accepted actions and departures inside the authoritative room record. Missed polls therefore cannot drop another player's turns from a replay. A retry does not append twice. Reconstructing yields each bot movement, action, and turn handoff; map data is shared per chapter. Legacy rooms begin a clearly labeled partial replay at their preserved position. The viewer reconstructs in batches to keep long timelines responsive and never modifies live state. Browser copies already downloaded remain replayable after server expiry; clearing browser data removes those copies.

The database has a separate internal revision counter. All mutations, including presence, use compare-and-swap. Concurrent joins retry safely; stale game commands cannot overwrite each other. Only token hashes are stored. Authentication material and admission receipts are omitted from every room response.

Distributed D1 rate limits use hashed connection identifiers and atomic counters. Each connection has fixed one-minute limits of 12 creates, 40 joins, 900 reads, and 600 commands. Each seat also has a 120-command limit. The poll allowance supports ten players on a shared connection at a one-second interval. HTTP 429 includes `Retry-After: 60`. Production trusts Cloudflare's supplied client-address header; previews without it share one local bucket. Expired rate-limit buckets receive bounded cleanup on new buckets. No raw IP address or token is stored in this rate-limit table. These limits slow code guessing and accidental loops; they are not comprehensive protection against a distributed attack.

Room records expire after 30 days without activity; an abandoned room with no humans expires after a minute. Expiration is enforced when loading. Expired records remain in D1 until maintenance removes them; no scheduled job or paid service is installed by this implementation.

## Deployment and limits

The `.openai/hosting.json` D1 binding must be `DB`. Generate the schema migration and apply it locally before testing the preview. Sites applies the checked-in migration during deployment. An online game requires the deployed URL and Site access for every friend; a localhost URL is only the preview on one computer.

There is no paid AI traffic. For this first version, movement and turns are refreshed by polling rather than continuous real-time action. The server is designed for a small class demo. Before operating at a larger public scale, add abuse monitoring, room passwords or explicit invitations if wanted, and an expired-room cleanup schedule. Room codes provide invitation discovery, not a password; anyone who knows a lobby's code can claim an empty seat.
