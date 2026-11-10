# Narrator artwork

Generated for Painted Realms with OpenAI Image Gen on 2026-11-07.
Each transparent 1536 by 1024 atlas has six aligned cells:

| | Column 1 | Column 2 | Column 3 |
|---|---|---|---|
| Row 1 | Spirit / Aether | Human | Cat |
| Row 2 | Owl | Fox | Dragon |

`paint-atlas.webp` preserves the hand-painted version. `pixel-atlas.webp`
contains a separately generated pixel interpretation of the same identities.
Both are losslessly encoded from transparent PNG masters. The app uses one
atlas for the active style, with local orbital particles, blinking, emergence,
and talking resonance. Accessories are small SVG overlays. No image service is
called while selecting traits or switching art styles.

These are reusable character forms, not on-demand generation of arbitrary new
species. Unusual requests are interpreted using the closest supported form and
kept in the narrator's persona/appearance description.

## Ether, second edition

`ether-paint.png` and `ether-pixel.png` replace the original hooded spirit cell.
Both were generated using the built-in OpenAI Image Gen tool on 2026-11-07,
with genuinely transparent backgrounds. The Paint prompt requested an abstract,
faceless, hollow white/silver cosmic vortex with sparse rainbow freckles,
hand-painted wisps, no dominant hue, and no baked-in environment. The Pixel edit
preserved that silhouette and identity using sharp pixel clusters and dithering.

`CreationScene` composes this reusable core with two animated canvas planes:
stars, elliptical orbital trails, gathering motes and speaking rings. Planets,
ribbons, world silhouettes, growing scenery and the narrator form animate as
independent layers. Selecting a supported story setting builds a corresponding
forest, coastal, ruined or floating-city background; these visual hints do not
change game rules. Motion pauses when hidden and honors reduced-motion settings.
The image assets themselves are static; all movement is rendered locally.

### Generation prompts

Built-in Image Gen, Paint:

> Production game asset, isolated transparent-background Ether aura core for a fantasy narrator creation scene. A spectacular abstract faceless circular twisting wisp of white and silver hand-painted cosmic energy, a hollow almost black heart at center framed by luminous white ribbons. Predominantly monochrome black-white-silver, with tiny rainbow freckles scattered throughout evenly red orange yellow green cyan blue violet pink, no single dominant hue. Cutout negative space and fine curved wispy strokes like a detailed Microsoft Paint illustration. No person, eyes, face, clothing, planet, rectangular backdrop, lettering or UI. Single roughly circular centered core, soft hand-painted edges, starry threads and sparse rainbow sparks. Planets, particles, rays and rings animate separately in code; no baked-in space scene. Bright silhouette readable over a dark background. Fully transparent background.

Built-in Image Gen, Pixel edit using the Paint core:

> Preserve the abstract hollow twisting silver/white faceless energy vortex and sparsely distributed rainbow flecks, completely transparent backdrop, no environment and no face or humanoid. Deliberate pixel clusters and dithering like a 128×128 adventure-game sprite upscaled with nearest neighbor, sharp square edges, white and silver charcoal grayscale, small red orange yellow green cyan blue purple pink star glints, no dominant color. Same centered circular silhouette and magical identity. No blurred edges, no antialiasing, no text. Genuinely transparent background.
