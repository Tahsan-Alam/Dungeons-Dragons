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
