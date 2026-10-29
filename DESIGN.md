# Painted Realms design and scope

The user's requested SVG-first, Microsoft Paint-like artwork is an intentional departure from the frontend skill's raster concept/asset workflow. All artwork is authored SVG; no image service is connected or charged. Rough outlines and flat colors are deliberate, while controls and motion remain precise. The art is reusable rather than AI-generated each turn.

Palette: paper #f7f4eb, ink #293e35, sage #dfe8d0, forest #335749, apricot #ed9877, lavender #b4a6cf. Georgia display headings, system sans UI, monospace small numerical annotations. 2px ink outlines, gently irregular corners, short offset shadows. No external fonts or image requests.

Main surfaces: menu/illustrated adventure preview; setup/class/rules selection; shared lobby; full-height play table with party rail, pan/zoom board, action dock, storyteller rail; chapter illustration and outcome; rules and AI options dialogs. Narrow screens collapse party/journal to accessible drawers while keeping board/actions available. Controls remain real HTML and board is semantic SVG.

MVP: three encounters, four classes, procedural seeded maps, solo companions, server-authoritative cooperative rooms up to ten players, persisted room progress, simple and classic rules subset. Classic is not the entire D&D rules system. Scripted narrator/enemies are explicitly disclosed. AI hooks live behind replaceable interfaces and fixtures; no provider SDK or credentials.

Future physical tabletop: commands and serializable game state are independent of SVG rendering and networking. A tabletop input adapter can later supply manual movement/rolls, with separate validation rather than silently trusting client state.
