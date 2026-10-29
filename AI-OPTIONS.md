# AI options for Painted Realms

Verified against provider documentation **October 29, 2026**. This is a proposal: no paid providers are connected, no keys were requested, and this research made no billable model calls. The playable game currently uses local artwork, scripted behavior, and optional browser speech.

## Recommended combination

Use **GPT-6 Luna for turn narration, dialogue and structured visual descriptions**. Compare **GPT-6.1 Terra for the initial campaign plan and occasional chapter planning**. Keep map construction, rules, movement and animation in code. Add a paid voice only after the story works well. Optional raster images can supply a few portraits or major-event illustrations; SVG scenes should remain the default.

These are verified API model IDs, not names inferred from the Codex model picker: [`gpt-6-luna`](https://developers.openai.com/api/docs/models/gpt-6-luna) and [`gpt-6.1-terra`](https://developers.openai.com/api/docs/models/gpt-6.1-terra). Both support Structured Outputs. Quality and latency on our actual game still need a small comparison; the recommendations below are engineering choices, not measured benchmark results.

| Role | Proposed model or service | How it fits |
| --- | --- | --- |
| Campaign and chapter planning | `gpt-6.1-terra` through Responses; Luna budget alternative | Produce a short campaign outline, locations, factions, goals, encounter briefs and possible consequences. Run at creation and chapter boundaries. |
| Narrator and NPC dialogue | `gpt-6-luna` through Responses | Describe confirmed outcomes in the selected personality; return narration and scene beats together. |
| Map and character design | `gpt-6-luna`, structured data | Propose terrain themes, rooms, landmarks, character appearance and props. Code validates and renders the result. |
| Narrow choices and player intent | Optional `gpt-6-luna` through Decisions | Select from legal action IDs or classify intent; unclear requests ask for clarification. |
| Spoken narration | Browser speech first; compare ElevenLabs `eleven_v4_turbo` | Speak the displayed text once, cache the audio and share it with the room. |
| Optional raster artwork | `gpt-image-2.5-flare` | Generate a few reusable transparent portraits or illustrations; do not request an image on every turn. |

### Decisions versus ordinary generation

[OpenAI Decisions](https://developers.openai.com/api/docs/guides/decisions) currently supports `gpt-6-luna` and returns typed choices, predicate probabilities or scores. Use [Responses with Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs) for our own JSON schemas, narration, maps and art recipes. A decision is still a model judgment: the game engine must enumerate legal choices and validate the selected result. Dice, damage, inventory and turn order remain authoritative server calculations.

[TypeSafe Jev](https://docs.typesafe.ai/models) is another genuine option: `jev-1.14.0` costs **$0.042 per million input tokens, with free output**. The savings over Luna Decisions are tiny at this project's scale, so start with one provider unless a comparison shows better decisions or latency. Avoid adding a classifier call to every turn when a button already identifies the action.

## Varied adventures that remain coherent

Game creation can offer an optional **Adventure prompt**, a **seed**, narrator personality, and a grounded/fantastical tone. Blank fields generate a starting brief. A prompt such as “a missing courier near a flooded mining town” supplies direction; it should not secretly alter combat rules.

1. **Generate a campaign plan once.** Combine the user prompt with seeded choices from compatible tables: region, conflict, factions, motivation, landmarks, encounter mix and stakes. These provide genuine input variation; narrator personality alone does not.
2. **Save a campaign bible.** Record established people, appearances, geography, timeline, motivations, unresolved leads and explicit world constraints. Keep separate public facts and unrevealed information. The planner proposes additions; validated results become saved facts.
3. **Track recent patterns.** A variety ledger records encounter types, plot devices, locations and recent openings. Downweight repeated combinations across chapters; optionally use a small local history across campaigns. Diversity should not contradict established facts or insert arbitrary surprises.
4. **Plan only the next useful section.** Give the model current facts, player choices and a bounded recap. Return a few grounded scene options, each with prerequisites and consequences. Code rejects impossible locations, inaccessible objectives, unknown characters and rewards outside the rules.
5. **Save accepted outputs.** A numerical seed makes our procedural map and table selections repeatable. It does not guarantee identical model prose. Persist generated plans, maps, characters, narration and event IDs so resuming or replaying never regenerates history.

These are proposed application structures, not a claim that an LLM remembers everything. Campaign state remains in storage, and every model request receives the relevant facts.

## On-the-fly maps, assets and scenes

An AI map brief can specify a room graph, entrances, terrain, landmarks and encounter roles. Ordinary generation code builds the tile layout, checks connectivity and reachable objectives, and applies encounter limits. This allows varied maps without asking an image model to invent a playable board.

For characters, save a persistent identity specification: silhouette, outfit, colors, equipment and allowed poses. An AI can create or extend a **validated component recipe**; both Paint and Pixel renderers consume the same identity. New recipes can appear during play, while existing characters retain their defining details. Allowlisted shapes, paths and transforms can expand visual variety over time. Do not insert arbitrary model-produced SVG markup or execute generated scripts.

For scenes, generate text plus ordered beats such as `enter`, `move`, `focus`, `attack` and `reveal`. Code animates existing assets, with narration/captions tied to the same beat IDs. Replay stores those beats. This supports animated storytelling without a video generation service. A small reusable soundtrack and sound palette can cover ambience initially.

Optional raster generation: [GPT Image 2.5 Flare](https://developers.openai.com/api/docs/guides/image-generation) supports `background: "transparent"` with PNG/WebP output, so an additional background-removal service is unnecessary for newly generated cutouts. SVGs are already transparent. Raster art does not automatically become editable SVG or match both themes; it should be supplemental, with a matching fallback while it loads. Sunburst is an optional comparison for more precise edits, not an initial dependency.

## Voice options

Browser speech remains the free fallback, with device-dependent voices and timing. Paid narration should read the approved transcript, with captions and mute always available.

ElevenLabs documents [`eleven_v4_turbo`](https://elevenlabs.io/docs/overview/models) through its Text to Dialogue WebSocket. Its [API pricing](https://elevenlabs.io/pricing/api) is **$0.04 per 1,000 characters**; `eleven_v4` is $0.08. The provider also shows approximate minutes, but characters are the billing unit for this estimate. Compare a short narrator sample before choosing a voice.

An all-OpenAI alternative is [`gpt-realtime-2.1-mini`](https://developers.openai.com/api/docs/models/gpt-realtime-2.1-mini), with **$20/M audio output tokens**, plus input/text charges. At the documented [one output audio token per 50 ms](https://developers.openai.com/api/docs/guides/voice-latency-cost), output audio alone is approximately **$0.024/minute**. Conversation history and text add cost; test transcript fidelity and avoid carrying an ever-growing audio session just to read captions. The [speech guide](https://developers.openai.com/api/docs/guides/text-to-speech) lists `gpt-4o-mini-tts`, `tts-1` and `tts-1-hd` for shutdown January 6, 2027, so they are unsuitable foundations for this new integration.

## What the $10–$30 budget could cover

[OpenAI standard short-context prices](https://developers.openai.com/api/docs/pricing): Luna **$0.10/M input + $0.50/M output**, Terra **$1/M + $5/M**. Decisions charges **$0.10/M uncached input** with no output charge. Image Flare charges **$5/M text input, $8/M image input and $30/M image output tokens**. Image size and quality determine token use; there is no single per-image price to assume.

Illustrative **100-turn shared-room session**, excluding hosting, taxes, retries and provider minimum purchases:

| Work | Assumed usage | Estimated cost |
| --- | --- | ---: |
| Luna narration | 100 × (4,000 input + 400 billable output tokens) | $0.060 |
| Optional Luna Decisions | 100 × 1,000 uncached input tokens | $0.010 |
| Terra campaign plan | 8,000 input + 2,000 output tokens | $0.018 |
| Terra chapter plans | 3 × (4,000 input + 1,000 output tokens) | $0.027 |
| Luna art/map recipes | 20 × (1,500 input + 300 output tokens) | $0.006 |
| **Text and planning total** | One shared result per event, regardless of player count | **$0.121** |
| Optional v4 Turbo narration | 20,000 spoken characters total, e.g. short excerpts | **$0.800** |

Thus **20 sessions are about $2.42 for the assumed text workload**, or **$18.42 with that voice allowance**, before images and excluded costs. Speaking every full 400-token response would use substantially more audio than the short-excerpt example. All billable reasoning tokens must fit the output allowance; this is a planning estimate, not a fixed session price. Cache discounts are not assumed.

For an image-cost illustration only, a request using 1,000 text input tokens and 2,000 image output tokens would cost **$0.065** before any image inputs. That token count is an assumption, not a promised quality preset. Measure actual usage on a few samples.

Start with a **$10 test ceiling**: $3 text/planning, $2 optional images, $4 voice and $1 reserve. Keep any remaining $10–$20 unspent until results justify it. SVG plus browser speech gives the largest testing allowance.

## Integration and spending controls

Keep separate replaceable providers for planning, narration, decisions, art and speech. Each job carries the campaign ID, event/state version, model, prompt version and idempotency key. The server validates the result, records usage and accepts it only if it still applies to the room.

- Commit game actions first; generate narration and media asynchronously. Show immediate movement/results, then add presentation when ready. Prefetch likely next-chapter assets, not every possible branch.
- Cache by campaign, character/asset version, text and voice. Generate once per room, share with all players, and reuse for replay. Style switching uses existing saved data and does not trigger regeneration.
- Bound context, output, retries and concurrency. Reserve a worst-case allowance against the shared budget before a request, then reconcile actual usage; stop new paid jobs when the cap is reached.
- Keep credentials server-side. On timeout, rejected output, exhausted budget or unavailable service, retain the existing scripted story and art.

First comparison: run the same small set of campaign briefs and difficult player choices through Luna and Terra; compare consistency, valid structured results, variety, delay and actual cost. Then connect narration, followed by planning, visual recipes and finally paid speech if worthwhile. The game should remain playable throughout.

## One generation, four presentations

Keep generation independent of `artStyle` and `viewMode`: one saved design produces Paint/2D, Paint/2.5D, Pixel/2D and Pixel/2.5D. Neither setting should be included in the campaign generation request or trigger a new paid job. UI icons and readable labels remain screen-facing.

The current artwork is procedural SVG. Its 2.5D presentation projects the same ground coordinates and raises scenery above them, while characters retain an upright silhouette. Corresponding portraits and scene illustrations reuse their original geometry with depth layers. No additional image model, video, 3D mesh, texture download or background-removal pass is needed to switch views.

For a future provider, request a small **canonical asset recipe**, not four separate images:

- Stable asset ID, revision and seed; component family and palette tokens.
- Shared identity details (class, outfit, equipment, silhouette), scale and foot/pivot anchor.
- A bounded footprint, height and approved shape/layer IDs. Props use these to create side faces; characters use layered cutouts.
- Optional named poses and animation beats. The renderer owns projection, shadows, placement and motion.

Validate recipes against allowed components and numeric limits, then persist them. Cache the canonical recipe by content/version and derive presentations locally; one multiplayer room shares one generation. Keep dimension and art style out of authoritative rules and replay records. Replays use saved identities and events in whichever view the viewer selects.

An optional raster portrait can be used as an upright cutout in either view, but a single image cannot reveal unseen geometry or become editable SVG. Use the procedural counterpart for depth and consistency unless a deliberately budgeted asset requires separately authored geometry. Start with the supported component families and grow that library as new recipes prove useful.
