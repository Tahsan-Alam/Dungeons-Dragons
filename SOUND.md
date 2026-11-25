# Sound design

How Painted Realms sounds, where every sound comes from, and how to add more. Read with DESIGN.md (the look) and CREDITS.md (licences).

## The tone

The Lantern Marches are a painted storybook, not a war game. The sound follows the same rules as the art:

- **Warm, close and wooden.** Pages, leather, latches, dice on a table, lanterns. The table is a real table.
- **The light is the hero.** Shards, waymarks and the gateway ring like glass and small bells; they are the brightest sounds in the game.
- **Danger is heard before it is seen.** Each Keeper warns with its own sound (a howl, an indrawn breath, ringing glass, grinding stone) the turn before it strikes.
- **Day and dusk differ.** Daylight has birds, wind and gulls and a lighter theme; after dusk the crickets come out, the theme darkens and the lamps carry the scene, as on the board.
- **Never app-like.** No beeps, no notification chimes, no synth bloops on the table. The interface sounds like the objects it is drawn as.
- **Quiet by default.** Effects sit under the music; the narrator's voice lowers the music while it speaks.

## The regions

| Region | By day | After dusk | Surroundings |
|---|---|---|---|
| Lanternwood | *Forest Whisper*: gentle, open | *Dark forest theme*: acoustic guitar and strings | Birds and light wind / crickets and wind |
| The Hollow Reach | *Ancient temple*: plucked, sparse | *Rising Moon*: windy night | Strong wind, a few birds / high wind, wind, faint crickets |
| Saltreach Harbour | *Merchants and sea salt*: port town | *Eyes of the ocean*: dark, low | Waves and passing gulls / waves only |
| Vaults, archives, chambers | (the region's theme) | (the region's theme) | Cave drips and low wind (waves faintly at Saltreach) |

Other music: the title and menus share *Exploration*; the party camp has *Calming town theme* over a camp fire; the between-chapters map plays *Fantasy choir* while the road relights; a living Keeper brings *Epic boss battle*; a fallen hero brings *Medieval battle* (peril) until they are back up; victory and defeat have their own short pieces; the replay theatre plays *Beautiful forest*.

## What makes a sound

| Moment | Sound |
|---|---|
| First press or key | Opens the audio graph; nothing plays before it (browsers require this, and so do we) |
| Any button | The table's soft click and hover (the existing thocks) |
| Choosers and switches | A wooden tick that rises with the value; switches latch |
| Journal, guide | A book opens; tabs and pages turn; it closes |
| Dialogs | A page lifts; parchment notes unfold |
| The road map | Unfolds and folds; each relit stretch of road chimes, a little higher each time |
| Sealed note | The wax snaps, the paper opens |
| Begin adventure | A small bell |
| Party camp | A wooden chime as someone joins, a latch as someone is ready |
| Live voice | A soft rise as the narrator starts listening, a fall as it stops |
| Messages | A dull knock (messages are nearly always something that could not be done) |
| Your turn / the creatures' turn | A soft bell / a low gong |
| Moving | Footsteps timed to the walk: soft ground, stone, the pier's planks at Saltreach, splashes in water |
| Choosing an attack | The dice rattle in the hand |
| Every roll | The die lands; the blow lands when the die stops (0.8 s, shorter with reduced motion) |
| Hero blows | Knight sword swing (special: blade drawn, heavy swing); ranger arrow (special: from the quiver); mage spell (special: fire); rogue knife; cleric swing (special: healing light); guardian heavy swing (special: metal shield wall); bard swing (special: a song); druid roots |
| Hits | A body blow; a critical lands heavier with a bright bell; a guarded target clashes |
| Creatures | One voice per family (imps chitter, goblins and bandits grunt, wisps whisper, golems and sentinels grind, thorn beasts growl, oozes squelch, crabs clack, eels burble, moths buzz): as they strike, when hurt, when they fall |
| Guard, potion | Chainmail settles; a cork pops and the potion is drunk |
| Down and back up | A fall; a soft healing shimmer when the lantern revives them |
| Chest and shard | The lock turns, the lid creaks, the shard glints and a bell rings |
| Gateway | A rush of wind as the party passes into the next chapter |
| Keepers | Warning (wolf howl, dragon breath, warden and eye glass, giant and Hollow Keeper stone), then release (pounce, fire, breaking tide, rockfall); a deep roar as one falls; a soft chime when a hero escapes the marked ground |

Opening a save or returning to a chapter is silent: only changes you watch happen make sounds. The replay theatre plays its music only, without the effects.

## How it works

- `app/ui/sound/catalog.ts` names every cue, its level (music, ambience, effects, interface), its loudness and its pitch spread. Cues with several recordings pick one at random, never the same twice running.
- `app/ui/sound/engine.ts` is the one Web Audio graph: a level per kind of sound under a master that goes silent while the tab is hidden. Music crossfades; ambience beds fade in and out; files load on first use and stay cached; a chapter's creature voices and the dice load as it opens.
- `app/ui/sound/game-sounds.ts` works out sound from game state only: the music and beds for where the party stands (`musicForPlay`, `ambienceForPlay`) and the cues for what changed between two states (`soundsForChange`). It never touches rules or saves, so solo, multiplayer and replays sound the same. Tests in `game-sounds.test.ts` run real engine actions and check every file exists.
- `app/ui/sound/useSoundDirector.ts` connects it to the screens; table pieces (journal, guide, dialogs, map, seal, camp, settings controls) play their own cues through `playSound` and `useOpenCue` / `useChangeCue`.
- **Settings › Sound**: Music on/off and volume; Sounds of play on/off, effects volume and surroundings volume; Table sounds on/off, volume and pointing sounds; the narrator as before. Choices are kept on the device. Narration still starts with a choice each visit.

## Where sounds come from

Only **CC0** (public domain) sources, so nothing can be claimed back and no credit is legally required; we credit every author anyway in `public/audio/CREDITS.md`. All current files come from OpenGameArt packs by Kenney, rubberduck, RandomMind, Cleyton Kauffman, cynicmusic, Juhani Junkala and others (the full list is in the credits page).

To add or replace a sound:

1. Find a CC0 source. Check the licence on its page **and** in the pack's own licence file; skip anything CC-BY-NC, "free for personal use", ripped from a game, or with unclear origin. CC-BY is acceptable only with the credit added, but prefer CC0.
2. Download it into a scratch folder (never into the repo), add its pack to `SOURCES` and the file to `SFX`, `MUSIC` or `AMBIENCE` in `scripts/audio/build_audio.py`.
3. Run `python scripts/audio/build_audio.py <scratch folder> <ffmpeg>`. It trims silence, sets loudness (music about −19 LUFS, beds −28 to −34, effects peak at −3 dBFS), makes loops seamless, encodes MP3 and rewrites `credits.json` and `CREDITS.md`.
4. Add the cue to `catalog.ts` with its level, and to `game-sounds.ts` or the component that plays it. `npm run check` fails if a cue's file is missing.

Budget: the whole set is about 18 MB (music 15 MB). Music is 96 kb/s stereo, ambience 64 kb/s mono, effects 80 kb/s mono. Only what a screen needs is downloaded.

## Next

- **Listen-through.** The tracks were chosen from their descriptions, loudness and spectrograms, not by ear. A playtest pass should confirm each region's pair, the levels against each other and any loop seam; swapping a track is a one-line change in the build script.
- **Narrator voice** (see below).
- **Per-place themes** for the long tales' middle places, and a market theme for Starfall Market (RandomMind's *Market Day*, CC0, is a candidate).
- **Our own recordings** for the signature sounds (the lantern shard, the Waylantern relight) once there is a recording setup; they are the sounds most worth making unique.
- **Reduced sound** option: surroundings off and fewer cues per action, for players who find the table busy.

## Narrator voice: how to add an API later

The game already has three pieces to build on: device speech (free, the default), a server route that turns one caption into speech with a paid model (`server/ai-speech.ts`, behind `AI_ENABLE_AUDIO` and the usage limits), and the live, conversational narrator (`server/live-voice.md`). A voice API should slot in like this:

1. **One voice interface in the client.** A `VoiceProvider` with `speak(line, voice)` and `stop()`, with device speech as the first implementation. The paid provider is a second implementation that fetches a clip from our server. Audio plays through the sound engine on its own **voice** level, so music ducks under it and Settings keeps one narrator volume.
2. **The key stays on the server.** The browser calls our `/api/…` route; the Worker calls the provider with the key from secrets. The existing access check, rate limits, cost reservations and `AI_MODE=fixture` apply unchanged, and the scripted fixtures keep tests free.
3. **Cache every clip.** Key clips by a hash of the text, voice and model version, and store them (R2 or the existing cache) so replays and other players hear the same clip without paying twice. Ship a short silence as the fixture.
4. **Built-in tales can be voiced ahead of time.** Their narration is fixed text (`game/lore.ts`), so its lines can be generated once at dev time, reviewed and shipped as static files like the music. They then cost nothing at play time and sound identical for every player. Live generation is then only for custom tales and Ask the Game Master.
5. **A voice per Game Master.** The Wanderer, the Survivor and the Cursed One each map to a provider voice id from an allowlist; a custom Game Master picks from the same list.
6. **Choosing a provider** is the owner's call, and connecting it or raising its spending limits needs explicit authorization (AGENTS.md). The current paid path is OpenAI's Realtime mini (AI-OPTIONS.md lists the retirement of the older text-to-speech models). Compare price per minute, voice quality and licence terms for commercial use before switching.
