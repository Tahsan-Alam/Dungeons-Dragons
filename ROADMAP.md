# Roadmap

Keep this as the short checkpoint overview. Use GitHub issues for individual tasks and pull requests for the actual changes. Put a teammate's name on a task when starting it.

## v0.1.0-alpha.1 — current playable prototype

- [x] Solo adventures with scripted companions and seeded encounters.
- [x] Online rooms for up to ten heroes, turn handling and reconnection.
- [x] Streamlined rules and a Classic SRD-inspired subset.
- [x] Paint/Pixel art, 2D/2.5D views, dark/light modes and responsive controls.
- [x] Saved adventures, replay, configurable shortcuts and local audio.
- [x] Automated engine/server tests and shared repository checks.

## Next alpha checkpoints

- [ ] Have every teammate run the project and complete a first small pull request.
- [ ] Playtest solo and a full multiplayer session; record and fix reproducible bugs.
- [x] Add optional prompts and saved bounded campaign facts/character recipes.
- [x] Implement guided hero/story/review setup, a wrapping Continue adventure card, optional quest ideas, and a Settings default with per-quest AI override.
- [x] Add server-backed AI solo with direct start and recoverable camp, plus 1/3/5-chapter adventure lengths.
- [x] Add Pip's help, saved creative direction, brisk narration, early gateway endings, chapter memories and boundary/ending tellings while preserving legal actions and replay.
- [x] Add post-recording dictation with a visible 60-second cap, conservative cleanup, editable review and durable spend/cache boundaries; validate the route with synthetic speech.
- [x] Reuse validated AI character class/palette/personality recipes across the existing Paint/Pixel SVG libraries, retaining hero identities across chapters.
- [x] Implement server-only model roles, durable spend reservations/cache and fixture fallback; verify with mocks.
- [x] Verify bounded Luna planning/narration/legal-choice access with budgeted live experiments (small samples; broader quality remains a playtest task).
- [x] Add bounded cached narrator audio with transcript validation and device fallback; fresh local application-route generation and native Edge playback passed. Hosted operation and audible quality remain unverified.
- [ ] Publish the reviewed Windows changes to the existing Site and pass hosted runtime/AI checks before GitHub push.
- [x] Verify the new setup, Continue card, Pip, ordinary actions, style identity and resume at desktop/narrow sizes in both Paint and Pixel through the explicitly approved local browser fallback; synthetic microphone capture/transcription/review and stubbed speech animation also passed. Human microphone/audio and physical devices remain unverified.
- [x] Complete the three-model UI/gameplay/AI panel and fix supported findings within ten quality rounds; measured mean 90.87/100 before final corrections, below the aspirational95 target.
- [ ] Add optional novel generated image assets that preserve character identity; current AI art uses paired reusable SVG recipes.
- [ ] Improve encounter variety and balancing using human playtest feedback; longer adventures currently reuse the validated encounter families.

These are proposed next tasks, not promises that every feature lands in alpha.2. Choose a small scope together for each checkpoint.

## Later

- [ ] Broader content and rule coverage.
- [ ] Support for using the AI narrator alongside a physical tabletop game.

The prototype does not implement the full D&D ruleset. Optional server-side paid AI is implemented behind explicit configuration and conservative spending controls; checked-in defaults use fixtures. See [AI-VALIDATION.md](AI-VALIDATION.md) for current evidence and remaining checks. Hosted publication and hosted AI verification remain separate from successful local API tests.
