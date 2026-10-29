# AI options and a small testing budget

Research checked **October 28, 2026**. These are proposed integrations, not connected services. The first playable build uses scripted game behavior and SVG artwork; it makes no paid AI requests.

## Recommended starting point

Use **GPT-6 Luna for narration and structured scene descriptions**, optionally its **Decisions API for narrow choices**, and keep **SVG assets plus browser speech** as the default. This gives the project useful AI features without image/video generation becoming a recurring expense. Evaluate a small sample before committing to a provider.

| Integration | What AI would do | What stays in ordinary code | First-build replacement |
| --- | --- | --- | --- |
| Storyteller / NPC dialogue | Describe the outcome of a committed game event in the selected narrator's style | Health, inventory, dice, rules, event ordering, and who knows a secret | Seeded story templates and event log |
| Player intent | Classify “I rush the skeleton” as an allowed action; ask for clarification if uncertain | Validate target, range, turn ownership, resources and all consequences | Buttons and map selection |
| NPC decisions | Choose between a supplied set of legal actions or dialogue attitudes | Legal-action enumeration and final validation | Scripted enemies and companions |
| Character / scene design | Return a bounded description: palette, outfit, props, pose, mood | Render approved SVG parts, retain a character's saved appearance | Reusable vector characters and map props |
| Spoken narration | Read the same text shown in the transcript | Playback, captions, mute, caching and scene timing | Browser speech where available |
| Memory / recap | Summarize the confirmed event log or select relevant previous events | Persistent campaign state and original event records | Saved state and readable event log |

No AI is needed to roll dice, calculate damage, construct a connected map, animate SVGs, or synchronize players. Random adventure seeds and weighted encounter tables are also ordinary code. A model can propose content; the game checks it before accepting it.

## Jev and OpenAI Decisions

**Jev is a real TypeSafe AI product**, and **OpenAI has a Decisions API using `gpt-6-luna`**. Both fit narrow judgments with predefined answers. They do not guarantee that a choice is correct; probabilities and confidence are useful for deciding when to ask the player to clarify.

| Option | Published usage price | Where it fits |
| --- | --- | --- |
| OpenAI `gpt-6-luna`, regular generation | $0.10 / million input tokens; $0.50 / million output tokens, standard short-context pricing | Narration, dialogue, custom JSON scene descriptions |
| OpenAI Decisions, `gpt-6-luna` | $0.10 / million uncached input tokens; no output-token charge | Choose action category, target from a known list, NPC attitude, scene mood |
| TypeSafe `jev-1.14.0` | $0.042 / million input tokens; output free | An alternative decision service to compare against Luna |

Prices are from [OpenAI pricing](https://developers.openai.com/api/docs/pricing), the [Decisions guide](https://developers.openai.com/api/docs/guides/decisions), and [TypeSafe's model reference](https://docs.typesafe.ai/models). Jev 1.14 is the current release on the date above. Account access and actual latency still need testing.

Decisions returns a choice, predicate probability, or rubric score. Use regular generation with [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs) for an arbitrary schema or written narration. Avoid paying twice for a classifier and a writer on every turn: start with a single narration request and add Decisions only where a separate fast choice demonstrably helps. At this scale, service simplicity matters more than the small price difference between decision providers.

## SVG first; raster only when it adds something

Keep characters as saved component specifications, such as an approved body shape, hat, cape, colors and props. AI can propose those specifications, and the existing renderer assembles them. Animate the same SVG parts for movement, attacks and story beats. This preserves identity and keeps backgrounds naturally transparent.

Do not execute model-produced JavaScript or insert arbitrary model-produced SVG markup. Accept only a validated data schema with approved asset IDs and bounded transforms. Shared event IDs should drive both the transcript and the corresponding scene beats.

If you later want raster portraits or backdrops:

| Option | Published cost reference | Tradeoff |
| --- | --- | --- |
| GPT Image 1 Mini | 1024×1024 output: about $0.005 low or $0.011 medium, plus prompt/image input charges | Convenient low-cost experiment; compare quality on the actual art style |
| Cloudflare FLUX.1 Schnell | $0.0000528 per 512×512 tile plus $0.0001056 per step | Very low usage price, separate provider setup; JPEG output requires another step for transparency |
| GPT Image 2.5 Flare / Sunburst | $30 / million image output tokens, with size and quality affecting token count | Current models support transparent PNG/WebP; measure a small sample rather than assuming a fixed image price |

Sources: [OpenAI image generation guide](https://developers.openai.com/api/docs/guides/image-generation), [Cloudflare Workers AI pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/), and [FLUX.1 Schnell model documentation](https://developers.cloudflare.com/workers-ai/models/flux-1-schnell/).

For imported opaque images, [rembg](https://github.com/danielgatis/rembg) can remove backgrounds locally without a per-image API bill. It needs a separate processing environment and model download; inspect thin outlines and model-license terms. It would be an asset-preparation step, not something to run in the game loop. None of this is required for the SVG version.

## Audio

Start with browser [SpeechSynthesis](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis): no paid API requests, but available voices and playback behavior vary by browser/device. Keep captions available and make speech optional. Use generated tones or a small reusable soundtrack rather than generating music during every turn.

For an optional better voice, [ElevenLabs' published API pricing](https://elevenlabs.io/pricing/api) lists **v4 Turbo at $0.04 per 1,000 characters** and v4 at $0.08. For example, 100,000 characters on v4 Turbo is about **$4 before taxes** at that usage rate; verify the selected account's payment terms. Generate each line once per room and reuse the audio for every player and replay.

Do not start a new integration around OpenAI `gpt-4o-mini-tts`, `tts-1`, or `tts-1-hd`: the [current speech guide](https://developers.openai.com/api/docs/guides/text-to-speech) says they shut down January 6, 2027 and points to a Realtime workflow. Browser speech or the dedicated ElevenLabs API is a simpler first comparison for this project.

## What $10–$30 could cover

These are **usage estimates, not purchases or guarantees**, and exclude hosting, taxes, image retries and any provider minimum purchase. They assume one shared request per game event, not a separate call for each of the ten players.

A sample 100-event session, using standard Luna pricing:

- Narration: 100 × (4,000 input tokens × $0.10/M + 400 billable output tokens × $0.50/M) = **$0.06**.
- Optional Decisions: 100 × 1,000 uncached input tokens × $0.10/M = **$0.01**.
- Combined estimate: **$0.07 per session**, or **$1.40 for 20 sessions**.

The output allowance must include any billable reasoning tokens. Long histories, larger outputs, extra calls and retries increase the total; cache discounts are not assumed here.

| Proposed $10 test allocation | Amount |
| --- | ---: |
| Narration and decision testing, with room to rerun | $3 |
| Optional raster asset experiments | $2 |
| Optional v4 Turbo voice sample budget | $4 |
| Reserve | $1 |

For **$20–$30**, begin with the same $10 test allocation and leave the remainder unspent until measured quality and usage justify more. If keeping SVG and browser speech, most of the budget can remain untouched.

## Required controls before connecting a provider

These controls are a plan for the live-AI phase, not a claim that live metering already exists:

1. Store provider credentials only on the server through secure setup.
2. Reserve a worst-case request allowance against a shared project budget before dispatch, then reconcile actual usage. Enforce the limit in server code; provider budget alerts alone are not a hard stop.
3. Cap request size, output tokens, retries and concurrent generations. Add per-room cooldowns and an owner-controlled AI off switch.
4. Cache results by campaign/event/voice/asset version and broadcast a shared result to all players. Never generate once per connected client.
5. Keep only relevant state and a bounded recap in prompts. Never send another character's hidden information unnecessarily.
6. On timeout, invalid output or exhausted budget, keep the game playable with the scripted provider.
7. Before choosing a provider, compare a small fixed set of game cases for valid actions, story consistency, response time and cost.

## Provider contracts to keep replaceable

These boundaries have local fixture implementations in `game/ai.ts`; there are no external API calls:

| Contract | Input | Validated result | Fallback |
| --- | --- | --- | --- |
| Narrate event | Event ID, committed outcome, narrator style, relevant known facts, bounded recap | Display text plus sentence/scene beat IDs; no state mutation | Existing event template |
| Decide action | Player text, visible state, enumerated legal action/target combinations | One candidate ID plus confidence; uncertainty returns a clarification | Existing action buttons or scripted bot |
| Describe artwork | Character/scene brief, saved identity, approved asset catalog and palette | Approved asset IDs, colors, bounded positions/scales, allowed poses | Existing SVG specification |
| Speak narration | Exact displayed text, voice ID, event/beat ID | Cached audio reference and optional timing marks | Browser speech or captions |

Each result should carry its provider/model version, usage, estimated cost, request ID and fallback status. Only the server orchestrator may spend budget or accept a result for a room. Art and narration can arrive after the rules result; a slow image or voice request should not stall a player's legal action.

`MockStoryProvider` implements the async `StoryProvider` interface. Its results explicitly report `provider: scripted`, no model, zero cost and no external request. `currentNarration(game)` returns the committed story caption for display. `buildNarrationRequest(game)` copies only the current scene and six recent events, caps the text fields, and excludes the full game state. `classifyFixtureIntent` is a conservative phrase matcher; it never executes an action. `parseArtSpec` accepts only known component IDs, hex colors, poses and bounded geometry; extra SVG/code fields fail validation. Speech returns the exact displayed caption for browser playback. Live providers, metering and richer natural-language interpretation remain future work.

The first live integration should be narration, with a small optional Decisions experiment for the action selector or NPC behavior. That makes its value and cost easy to measure while the tested game engine remains in control.
