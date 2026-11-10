# UI, motion and settings review — November 5, 2026

Local work on `feature/ui-motion-polish`, following the gameplay pass in `2d9d141`. Nothing was pushed or deployed.

## Critic rubric

Three independent agents reviewed five dimensions each, worth 20 points per dimension. A 15 means usable with clear gaps; 18 means polished with minor limitations; 20 requires comprehensive rendered/state validation. Scores are qualitative review judgments, not player research or performance benchmarks.

| Panel | Baseline | Implementation review | Final review |
| --- | ---: | ---: | ---: |
| Visual consistency | 78 | 86 | 90 |
| Motion and accessibility | 76 | 91 | 94 |
| Responsive layout and efficiency | 81 | 89 | 93 |

Visual dimensions: palette, hierarchy, spacing, component consistency, play readability. Motion dimensions: timing, feedback, reduced motion, focus continuity, efficiency. Responsive dimensions: phone layout, resizing, input ergonomics, rendering, state reliability.

## Improvements and resolved critiques

- Settings has four stable sections, one scrolling content pane, a short-landscape sidebar, a 44px close target and compact, aligned appearance/audio controls.
- Sound separates interface effects, narration and music. The two actual Hex Settlers WAV samples total 3,386 bytes. Levels and hover preference persist; activation stays off until explicitly enabled each visit. Preview works independently. Expected playback cancellation does not mute the feature; real errors provide a recovery path.
- Explicit Reduced suppresses all CSS motion independently of the OS. Dialog exits share the same path. Attacks focus Roll d20. Queued rolls retain their dialog and backdrop instead of remounting the whole modal.
- Board keyboard traversal uses one destination Tab stop instead of 60–71 in the default fixture. Arrows preview; Enter/Space commits; Tab leaves the tile grid. Global movement shortcuts still work elsewhere.
- Terrain rendering checks all relevant map fields; depth metadata is cached across pan/hover. Pointer listeners remain stable. Camera bounds are reconciled on resize while preserving manual zoom.
- Gameplay labels, resource counts and vitals are more readable; UI health/result colors are consistent; quest buttons retain their emphasis; replay selection has a visible and accessible pressed state.

## Validation

- `npm run check`: TypeScript, 141 tests and production build. Eight additional tests cover board interaction helpers, imported map invalidation, audio preference migration, feedback throttling and sample integrity.
- Full browser UI adventure: seed `ui-polish`, Ranger plus two companions, Streamlined, all three chapters won in 37 commands. Hero finished at 23/23 HP. No engine actions were injected; the test selected legal moves and clicked the rendered controls.
- Replay reconstructed 153 frames; seeking to the middle/end/start and selecting a hero preserved the saved game. Selected replay hero exposes aria-pressed and a distinct accent outline.
- Settings sections checked at 320×568, 390×844, 844×390 and desktop. No horizontal overflow; content remains scrollable to its end. Desktop Sound fits its entire content in a 548px pane.
- Paint/Pixel, 2D/2.5D, Light/Dark/System and Full/Reduced/System switches preserve saved game JSON. Explicit Reduced with OS motion enabled produced no modal animation and zero-duration button transitions.
- Keyboard destination preview preserved game JSON; Enter committed the legal three-tile movement and reduced the movement allowance from seven to four; Tab moved to the actor controls.
- Attack cancellation preserved state and made the dialog inert during exit. Initial focus was Roll d20; confirmed result focused Continue.
- A three-result shared queue kept the identical native dialog across Next and X, stayed paused, and did not change game state. Back to board closed the batch. All result controls fit at 320×568.
- Hover and click WAV playback completed with readyState 4 and no media errors. Hover-off and interface-off suppress playback. Injected AbortError leaves sounds enabled; a real playback failure displays an error and the next enable recovers. No sample requested before enable/preview.
- Manual zoom remained 160% across desktop, portrait and landscape; a horizontal offset was retained where valid and clamped when the wider landscape viewport exposed map edges.
- A bounded 90-operation camera wheel/keyboard-pan check on the local development build recorded a 0.3ms p95 event-handler duration and no tasks exceeding 50ms. This measures input overhead only. The automated preview throttled animation frames, so no FPS result is asserted.

## Remaining coverage limits

No blocking issue remained in the panels' final reviews. Physical iOS/Safari, multitouch hardware and screen-reader announcements were not exercised. A future optional follow-character camera could make mobile replays easier to watch. The existing rules/save schema, deterministic replay and multiplayer protocol were not changed.


## Living narrator design review — November 7, 2026

Desktop and mobile Image Gen concepts guided the implemented creator. Final
screenshots were compared against both concepts with these five anchors:

1. One bordered editing surface with Story/Narrator tabs; a separate right-side
   guide on desktop. Mobile moves the guide above the form and opens chat on tap.
2. Restrained ink/lavender palette, serif headings and legible sans-serif inputs.
   The real application retains its existing navigation and explicit art switch.
3. Transparent painted/pixel spirit art with local particles and emergence.
   The final desktop stage was enlarged after critique to make Aether prominent.
4. Compact trait chips with visible selection and custom values. A second small
   preview sits beside mobile appearance controls so changes stay observable.
5. One confirmation boundary for proposed changes, then hero selection and game
   settings. Full controls wrap at 320px; reduced motion removes decorative motion.

Intentional differences: stage navigation uses understated text/underlines;
confirmation and honest AI access state occupy space the concept did not model;
more trait choices are available; mobile chat/history collapse; and native CSS
handles the single sprite stage without adding a canvas engine dependency.
The real snapshots were checked in both art styles and light/dark appearances.
Six reusable forms are generated artwork; accessories/motion are local. Exact
phoneme lip sync and arbitrary new bitmap generation are not claimed.
