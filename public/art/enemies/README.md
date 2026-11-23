# Enemy artwork

Original project artwork for Painted Realms, designed on the team's design canvas ("Wandering Storyteller"), November 2026.

- **Regular enemies and the Tideglass Warden** are flat-colour SVGs with the same dark slate outline as the heroes. Each file has a tight viewBox taken from the drawing's measured bounds.
- **The Wolf at the Last Light and the dragon of The Hollow Crown** are the approved paintings, stored as transparent WebP images (1774 × 887).
- Extra poses (wind-ups, Guard, gaze, pounce, roar, the Warden's cuts and surrender) ship now for the signature attacks that come later in the rules.

- **The Mirewisp, the Star moth and the Mist eel** (long tales' middle places) are drawn in the same flat style for the Long tales board, November 2026.

Every figure stands on its tile through `app/ui/enemy-art-data.ts`: the `anchor` is the point that touches the tile, `unitsPerTile` sets the shared board scale with the heroes, and `portrait` is the square crop used for turn order and lists. Portraits are cropped in the interface; there are no separate portrait files.

All creature art faces right. The board mirrors enemies so they face the party.
