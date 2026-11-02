# Painted Realms

Read README.md for setup, CONTRIBUTING.md for the team workflow, and ROADMAP.md for current scope. DESIGN.md, RULES.md, MULTIPLAYER.md and AI-OPTIONS.md describe the existing design and proposed integrations.

- Keep changes focused on the assigned task. Work on a feature/fix branch and explain validation in the pull request.
- Run `npm run check` before proposing a merge. For visible changes, check narrow/mobile and desktop layouts in both Paint and Pixel.
- Art style and 2D/2.5D view are presentation choices over the same game state. Preserve character identity and replay behavior when switching them.
- Keep dice, legal actions, combat and map validation in game code. Generated content must pass the existing validation boundaries.
- Use scripted AI fixtures by default. Connecting paid services or changing their spending limits requires explicit task authorization.
- Keep secrets, generated build output and local databases out of Git. Preserve third-party credits and SRD attribution.
- A code push does not authorize a deployment. Publish the hosted game only when the human asks to publish the current changes; preserve its audience and site identity.
