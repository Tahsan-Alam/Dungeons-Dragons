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
- [x] Implement server-only model roles, durable spend reservations/cache and fixture fallback; verify with mocks.
- [x] Verify bounded Luna planning/narration/legal-choice access with budgeted live experiments (small samples; broader quality remains a playtest task).
- [x] Add bounded cached narrator audio with transcript validation and device fallback; fresh local application-route generation and native Edge playback passed. Hosted generation/playback also passed; audible quality remains unverified.
- [x] Publish the reviewed Windows changes to the existing Site and pass hosted runtime/AI checks before GitHub push.
- [x] Add server-enforced team-password unlock and local developer setup.
- [ ] Add optional generated assets that preserve character identity.
- [ ] Improve encounter variety, onboarding and balancing using playtest feedback.

These are proposed next tasks, not promises that every feature lands in alpha.2. Choose a small scope together for each checkpoint.

## Later

- [ ] Broader content and rule coverage.
- [ ] Support for using the AI narrator alongside a physical tabletop game.

The prototype does not implement the full D&D ruleset. Paid AI is optional and requires server configuration, a team unlock and remaining spending allowance.
