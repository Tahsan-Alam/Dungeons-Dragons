# Painted Realms design and scope

The user's requested SVG-first, Microsoft Paint-like artwork is an intentional departure from the frontend skill's raster concept/asset workflow. All artwork is authored SVG; no image service is connected or charged. Rough outlines and flat colors are deliberate, while controls and motion remain precise. The art is reusable rather than AI-generated each turn.

Interface palette: true white #fff or true black #000 canvas, neutral gray surfaces, blue accents. Color mode (Light/Dark/System) is independent from art style (Paint/Pixel). Both art styles use the same semantic interface and scene colors. Georgia display headings, system sans UI, monospace small numerical annotations. 2px ink outlines, gently irregular corners, short offset shadows. No external fonts or image requests.

Main surfaces: menu/illustrated adventure preview; setup/class/rules selection; shared lobby; full-height play table with party rail, pan/zoom board, action dock, storyteller rail; chapter illustration and outcome; rules and AI options dialogs. Narrow screens collapse party/journal to accessible drawers while keeping board/actions available. Controls remain real HTML and board is semantic SVG.

MVP: three encounters, four classes, procedural seeded maps, solo companions, server-authoritative cooperative rooms up to ten players, persisted room progress, simple and classic rules subset. Classic is not the entire D&D rules system. Scripted narrator/enemies are explicitly disclosed. AI hooks live behind replaceable interfaces and fixtures; no provider SDK or credentials.

Future physical tabletop: commands and serializable game state are independent of SVG rendering and networking. A tabletop input adapter can later supply manual movement/rolls, with separate validation rather than silently trusting client state.

## October 29 interface revision

The home screen is now a game library, not a promotional landing page. Removed slogans, decorative subtitles, duplicate turn labels and prominent development details. Keep story prose in the adventure and journal; UI copy names an action, object or useful status. AI/provider information belongs in Settings.

The library uses compact rows with resume/replay, pin and an overflow menu. Both themes keep the same geometry. Party and journal widths use viewport-based defaults, saved proportions, clamps and keyboard-accessible separators; compact screens use touch-first modal drawers. A pointer-only edge reveal is optional. Two shortcuts per action are editable with conflict checks, while typing and dialogs suspend gameplay shortcuts. Replay uses a separate read-only renderer and asynchronously reconstructs immutable recorded frames.

## Home, navigation, and appearance revision

Home is a compact introduction with a real SVG game preview, separate from the Games library. Copy describes the actual experience: headline “A tabletop adventure in your browser.”; one short description; Play solo, Create room, Join with a room code; three useful facts; optional continue link. The preview has three deterministic example states from the game engine, can pan/zoom and inspect characters, and never writes a save or joins a room. No rotating marketing claims, slogans, badges, or decorative counters.

One shared header remains mounted on Home, Games, setup, lobby, gameplay, and replay. It contains the logo, Home/Games, Paint/Pixel, How to play and Settings in the same positions. Mobile uses two short rows. Resizing panels and opening drawers account for the measured header height.

Layout: open two-column hero on desktop, roughly 45% descriptive copy / 55% board preview, neutral framing, 48–66px display title and 12–15px controls/body; stacked on phones with the preview immediately after the primary actions. Existing SVG system is the reference, following the user's code-drawn art direction. White stays #fff, black stays #000. Light/dark mode changes interface surfaces; scene colors remain coherent and identical across art styles.

## Play table, preferences and language revision

The board fills the remaining viewport below a compact scene row. The bottom dock always keeps the player's health, armor, remaining movement and action visible beside the main actions. Narrow layouts use Party and Adventure log drawers, mobile camera framing, and 44px-or-larger primary actions. Desktop rails have smaller initial widths and retain their resizable boundaries.

Directional shortcuts move one legal tile, Shift+direction pans, and pointer/focus route previews show the actual cardinal path and movement cost. Animated paths use validated prior/new state and avoid crossing walls or occupied squares. New snapshots, timeline seeks and reduced motion safely cancel animation; presentation never mutates the rules.

The shared world palette has both light and muted dark variants. Paint and Pixel continue to use identical semantic colors at each brightness. Personal accents, brightness, art style and motion remain independent. Settings has Appearance, Sound & voice, Key bindings, and At the table sections. Searchable bindings retain two slots; audio levels, motion, chapter screens and turn confirmation are explicit preferences.

Use restrained tabletop terms across the product: Camp, Adventures, Solo quest, Gather party, Join party, Continue quest, Adventurer’s guide, Table settings, and Adventure log. Keep conventional gameplay verbs and operational labels clear. Do not add decorative slogans or explanatory filler.

Both art styles share modern, subtly raised controls with soft 9px corners, faint highlights and short shadows. Typography, logo, panel corners, spacing and interface icons stay identical when changing styles, including icon strokes and rounded edges. Paint/Pixel only changes the game viewport and illustrated assets, including character portraits and scenery. Focus and selected rings are contained within control bounds so they cannot overlap adjacent stats or actions. Hover/press movement is small and honors the motion preference. Tooltips explain controls and current shortcuts without becoming persistent UI copy.

The earlier conversation-led adventure creator (Imagine → Your hero → Begin, with the Aether guide and its creation scene) was removed in November 2026; quest setup and the Tale step's Write your own / Talk it through replaced it.

## Title menu and quick start

Camp is now a game title menu instead of a two-column introduction. The left panel holds the title and a vertical list: Continue quest (when a save exists), New quest, Play with friends, Adventures, Adventurer’s guide and Table settings. New quest and Play with friends open short submenus (Quick start / Create your own; Gather party / Join party) with a one-line description under each choice. Arrow keys, Home and End move through the list and Escape returns to the main menu. The shared panorama fills the rest of the screen and follows Paint/Pixel and 2D/2.5D like any other scene; on phones it becomes a band above the menu. The interactive board preview was removed from Camp.

The shared header stays mounted, but its Camp/Adventures buttons are hidden on Camp because the menu already offers them. They keep their slots, so nothing moves when they return on other screens.

Quick start opens quest setup on its Set Out step with the default Game Master, tale and hero, without reading or overwriting the saved setup draft.

## 2D and 2.5D presentation

World view is a personal Appearance setting, independent of Paint/Pixel, brightness, accent and motion. 2D remains the default for existing players. 2.5D uses a dimetric ground plane, dimensional scenery, upright character cutouts and the same canonical palette/identity. Menus and labels retain their geometry and legibility. The preview, live table, chapter illustrations, portraits and replay all consume this preference.

**Update, November 2026.** The 2.5D scene is now the default view and uses a front-facing camera instead of the dimetric plane: tiles keep their width and show 56% of their depth, rows recede up the screen, and nearer rows draw over farther ones. Heroes stand on their tiles as their illustrated art; enemies stand as the approved creature art from `public/art/enemies`, mirrored to face the party, and each tale's Hollow Keeper uses its own boss art (the wolf, the dragon, the Tideglass Warden). Turn order, the party and enemy lists, and the detail panel show portraits cut from the same art. 2D is offered as the **tactical map**, the same board seen from above; a player who saved 2D keeps it. Neither view changes the rules, saved games or replays.

Projection operates only in rendering. Game coordinates, legal movement, dice, room commands and saved/replayed events do not change. Projected route previews and hit regions use the same transform as the floor; actor motion uses projected waypoints. Camera framing uses projected bounds. View changes safely finish presentation motion and reframe without resetting a game.

Efficiency rule: reuse asset components, palettes and seed data across every view. Construct depth with bounded SVG faces and layers, avoid per-sprite filters or a second generated image set, and never connect a paid provider just to change presentation. The canonical recipe contract and future caching strategy are documented in AI-OPTIONS.md.

## Readability and consistency

Interface text is never smaller than 11px. Health bars turn to the warning colour at half health and the danger colour at a quarter, always beside the number; a fallen hero is also labelled in the party list. Messages clear themselves after six to twelve seconds depending on length, and stay while pointed at or focused. Dialogs carry only a close button: art style is changed from the header or Table settings.

## Single art style

The Pixel art style, the Paint/Pixel switch and their assets are removed; earlier sections that describe two art styles are historical. The hand-drawn style is the only one, and a saved Pixel preference is ignored. `data-theme="paint"` stays on the root element because interface styles use it for specificity. 2D/2.5D, colour mode, accent and motion remain personal settings.

Camp has no app header: it is a full-screen title menu with its own logo, and it offers Adventures, the Adventurer’s guide and Table settings. The scene sits under a fixed dark wash with light text, so the menu looks the same in light and dark mode. Every other screen keeps the guide and settings buttons in the header, because that is the only way to reach them during setup, play and replay.

## Realm interface

The screens are being rebuilt from the team's design canvas ("Wandering Storyteller", November 2026). They should feel like a game: each screen starts from a scene or an object in the world, and the controls sit inside it.

- **Colours.** Dark slate surfaces, ivory text, pale blue `#9CC9EA` for selection, steel blue `#284B68` for the primary action, slate `#435263` for ordinary edges. Amber comes only from lanterns, fires and other lights in the artwork.
- **States.** Hover lightens a surface and its edge. Selection is a 2 px pale-blue edge, a faint blue tint behind the label and one small diamond or check. Keyboard focus is a separate thin ivory ring outside the control. Unavailable actions stay readable in muted slate, and status is always written out (**Taken · Leo**, **Choosing**, **Ready** with a green check).
- **Kit.** `app/ui/RealmKit.tsx` and `realm-kit.css` hold the clipped buttons, the selection marks, the quest steps (Game Master → Tale → Hero → Set Out) and the portrait frame. Screens opt in with the `realm` class.
- **Presets.** `game/presets.ts` holds the three Game Masters, three tales and sixteen heroes. Each carries the same validated profile the AI produces, so built-in and generated content mix freely: any hero can join any tale, and any Game Master can tell a custom story. Each hero plays as their own class (Warrior heroes as knights); the rules for all eight classes are in RULES.md.
- **Quest setup.** New solo and online quests open on a choice-first flow (`app/ui/QuestSetup.tsx`): Game Master → Tale → Hero (with a hero sheet) → Set Out. Each step shows the choice in its scene and cross-fades when it changes; the cards, steps and buttons stay put. **Write your own** on the Tale step sends one sentence through the existing creation request (the scripted fixture unless the player has turned AI on) and adds the result as a tale card. **Talk it through with [the chosen Game Master]** opens a conversation screen (`app/ui/TaleConversation.tsx`): the Game Master stands in their scene, the tale forms beside them, and one dialogue panel holds the exchange. It uses the same guide request, validation, live voice and captions as the earlier creator; suggested changes are applied only when the player chooses **Use this**, and **Keep this tale** adds the result to the Tale list. The earlier conversation-led creator (`AdventureCreator.tsx`) is no longer reachable; making a custom Game Master will return as its own option. Begin Adventure hands the game the same blueprint and options the creator did, so play, saves and replays are unchanged. On phones each step stacks into one column with the actions pinned to the bottom.
- **Art.** Full-body heroes and Game Masters live in `public/art/heroes` and `public/art/game-masters`; tale, Game Master and hero-stage scenes live in `public/art/scenes`. Portraits are head-to-chest crops of the same files, aligned on each face centre; there are no separate portrait images.

## Screens outside the board

- **Narrator conversation.** Questions and replies form a thread of the newest twelve exchanges, kept in memory for the open adventure. It is presentation only: nothing is saved, replayed or sent as context.
- **Join party.** Code first, hero second. Once all six letters are in, `GET /api/rooms/:code/preview` returns the invitation (tale, host, who is at the fire, seats) without a session token; the party code is the only credential. Joiners then pick from the same 16-hero roster as solo setup; heroes already in the party are marked taken, and the server rejects a hero who is already there (`HERO_TAKEN`).
- **Party camp.** The party stands in an arc around one fire (`app/ui/PartyCamp.tsx`), each player drawn as their roster hero or, without one, their class figure. Companions added by the host become roster heroes nobody has taken. The title comes from the created story. Open seats are counted against the ten-player limit. On phones the scene shrinks and the party is listed beneath it.
- **Adventures journal.** Saves are listed on the left (In progress, Finished, Archived) with the tale's thumbnail and one line of state; the chosen save opens on the right with its region's scene, the hero's framed portrait and chapter markers (`app/ui/GameLibrary.tsx`). The main action follows the save: **Continue** on your turn or for solo, **Open** while waiting for another player, **Watch Replay** once finished, **Open party camp** before the start. Saves record their region, tale title, chapter count and whose turn it is (`journal()` in `game/library.ts`); every field is optional, so older saves still load and fall back to woodland art. A renamed save keeps its own name; otherwise the journal shows the tale. On phones the opened save sits above the list.
- **Results.** The recap reads the final game state. Damage and critical hits come from the retained event log (the newest 180 events), so a long adventure is told that the totals cover its last part.

## World: the Lantern Marches

The three built-in tales share one setting, the Lantern Marches (`SETTING` in `game/presets.ts`). Lanternwood, the Hollow Reach and Saltreach Harbour stay the region names and remain the tales' `story.world`. The setting name is display only: art and enemies follow `biome`, chapters follow `locations` and the adventure length, and saves record the biome and tale title, so no saved field changed. The design reference is the World page on the design canvas (the Threeway Crossing map and one mood board per region), built from the team's World Guide; the Story Bible still owns chapter names, hero histories, Game Master voices and encounter rules.

- **Words.** The Waylantern is the broken lantern at Threeway Crossing. Aether is the current its light follows from waymark to waymark (“Follow Aether’s light to the next waymark”). The live-voice guide is also named Aether; keep the two readings compatible.
- **Chapter openings.** For the built-in tales, `game/lore.ts` leads each opening with a clue the party can see, in the Game Master's voice: the empty salt stall at Starfall Market, the name chiselled from the arch carving, the lamp cage stripped of its glass on the lantern pier. Short and long runs add the place's clue to the standard shard line. Victory relights the tale's road toward the Waylantern. Custom tales keep their own world and the classic text.
- **Older saves.** New games carry `lore: 1`. Saves made before it have no marker and keep the openings they were played with, live and in replay.
- **Display.** The tale list reads “Lanternwood · 3 chapters”; the chosen tale and the chapter card read “The Lantern Marches · Lanternwood”.
- **Chapter I landmarks.** The first chapter of each built-in tale is an authored layout (`game/set-pieces.ts`) drawn over the seeded map, from the approved World page samples: Starfall Market (shop, a full stall, the empty salt stall, a skewed stall, the oil cart, the last lamp and the broken gateway as the exit), the broken arch (the carved wall with the scraped name, the arch as the exit, the retaining wall broken behind it, cart grooves, fallen blocks) and the lantern pier (plank deck over water, the stripped cage with a lens shard, the working lens, crates as cover, a loading square, a mooring post and quay stairs as the exit). Props are wall tiles, so movement, line of sight and map validation are unchanged; `span` marks the extra tiles of a wide prop, and a prop stands on the ground in front of it (`groundOf`). Art lives in `app/ui/SetPieceArt.tsx` for both views, in the board palette. Chapter I is part of every save's first frame, so existing saves and replays keep the map they began with. The other chapters, the regional day and dusk scenes and custom tales still use generated maps.
- **Between chapters.** In the built-in tales the chapter card is a map screen (`app/ui/ChapterMap.tsx`). The map is the approved World page art: static terrain in `public/art/world/lantern-marches.svg`, with roads, waymarks, stops and labels drawn live from `app/ui/route-map-data.ts` (generated from the design canvas). `routeView()` in `app/ui/route-map.ts` reads only the saved game: the stretch just cleared relights once (about 1.2 s) and its waymark fills, recovered stops get a shard mark, and the party ring sits on the next stop. Selecting the map finishes the animation, reduced motion shows the end state, Escape or Continue closes it, and it never pauses a party table. Long runs revisit the three stops without relighting a leg twice. The view grows to fit any panel without cropping the route. Chapter I opens on the map with nothing lit. Custom tales keep the chapter card. The map at victory and a Map button during play are still to build. Design: Play screen page, “Between chapters”.

## Play screen and its scenes

Built from the design canvas (Play screen page and the Chapter and Ask boards); see the board “Before the build · where every control goes” for where each older control went.

- **Play screen** (`PlayTable.tsx`, `play-hud.css`): the board sits between the top strip and the action bar; the floating cards are marked `ph-ui` and draw their own controls (the global button surfaces skip `.ph-ui`, `.gm-scene`, `.adventure-end` and `.app-header`). Phones keep Party, Journal, the guide and Settings in the top row; Sound and Leave are in Table settings there.
- **Journal** (`JournalDrawer.tsx`): Log, Dialogue (questions and Tell this moment) and Story (pace and direction, host only). Ask’s Dialogue Log opens it on its Dialogue tab.
- **Dice** (`RollCard.tsx`): the own attack rolls as soon as it is chosen on the foe’s card; shared rolls queue in the same card. Attack events record `bonus` and `ac` for the “roll + bonus = total against AC” line; older events show the die only.
- **Game Master scenes** (`GameMasterScene.tsx`): the chapter opening (`ChapterOpening.tsx`, after `ChapterMap` in built-in tales) and Ask (`AskScene.tsx`, using `ask-game-master.ts`). The backdrop is the tale’s scene art and the figure is the Game Master’s full art; custom narrators use their avatar.
- **Ending** (`AdventureEnd.tsx`): victory in a built-in tale shows the whole road lit on the route map; otherwise the Game Master in the tale’s place.
- **Dialogs and shell** (`realm-dialog.css`, `realm-shell.css`): the shared theme variables are reset to the realm palette on dialogs, the header, replay, notices and loading, so their existing controls follow.

## Styles

The interface is hand-written CSS in `app/`; there is no component library. Before adding `!important`, look for the rule being overridden and raise or reorder that instead. The overrides that remain are reduced-motion rules, focus and pressed states, and a few specificity conflicts between `globals.css` and the `.play-refined` and creator layers that still need untangling.
