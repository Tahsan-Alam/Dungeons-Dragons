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

The adventure creator inherits Light/Dark/System surfaces and text. Narrator traits supply a dark accent for light surfaces and a lighter accent for dark surfaces; they never override the brightness preference. The unformed creator stays neutral. Dark world palettes cover terrain, portraits, outfits and dice in previews, chapter scenes, play and replay; raster narrator art uses a softer exposure without dimming interface text or game markers.

## Title menu and quick start

Camp is now a game title menu instead of a two-column introduction. The left panel holds the title and a vertical list: Continue quest (when a save exists), New quest, Play with friends, Adventures, Adventurer’s guide and Table settings. New quest and Play with friends open short submenus (Quick start / Create your own; Gather party / Join party) with a one-line description under each choice. Arrow keys, Home and End move through the list and Escape returns to the main menu. The shared panorama fills the rest of the screen and follows Paint/Pixel and 2D/2.5D like any other scene; on phones it becomes a band above the menu. The interactive board preview was removed from Camp.

The shared header stays mounted, but its Camp/Adventures buttons are hidden on Camp because the menu already offers them. They keep their slots, so nothing moves when they return on other screens.

Quick start opens the creator on its review step with one of three ready-made adventures (woodland, ruins or coast), a suggested hero and the default guide. It uses built-in drafts, never calls a provider, and neither reads nor overwrites a saved creator draft. Every earlier step remains reachable from the review, and the review names the terrain.

## 2D and 2.5D presentation

World view is a personal Appearance setting, independent of Paint/Pixel, brightness, accent and motion. 2D remains the default for existing players. 2.5D uses a dimetric ground plane, dimensional scenery, upright character cutouts and the same canonical palette/identity. Menus and labels retain their geometry and legibility. The preview, live table, chapter illustrations, portraits and replay all consume this preference.

Projection operates only in rendering. Game coordinates, legal movement, dice, room commands and saved/replayed events do not change. Projected route previews and hit regions use the same transform as the floor; actor motion uses projected waypoints. Camera framing uses projected bounds. View changes safely finish presentation motion and reframe without resetting a game.

Efficiency rule: reuse asset components, palettes and seed data across every view. Construct depth with bounded SVG faces and layers, avoid per-sprite filters or a second generated image set, and never connect a paid provider just to change presentation. The canonical recipe contract and future caching strategy are documented in AI-OPTIONS.md.

## Readability and consistency

Interface text is never smaller than 11px. Health bars turn to the warning colour at half health and the danger colour at a quarter, always beside the number; a fallen hero is also labelled in the party list. Messages clear themselves after six to twelve seconds depending on length, and stay while pointed at or focused. Dialogs carry only a close button: art style is changed from the header or Table settings.

## Single art style

The Pixel art style, the Paint/Pixel switch and their assets are removed; earlier sections that describe two art styles are historical. The hand-drawn style is the only one, and a saved Pixel preference is ignored. `data-theme="paint"` stays on the root element because interface styles use it for specificity. 2D/2.5D, colour mode, accent and motion remain personal settings.

Camp's header shows only the logo: the title menu offers Adventures, the Adventurer’s guide and Table settings. Every other screen keeps the guide and settings buttons in the header, because that is the only way to reach them during setup, play and replay.
