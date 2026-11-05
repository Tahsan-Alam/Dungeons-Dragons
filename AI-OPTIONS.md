# AI models for Painted Realms

Independently checked against official OpenAI sources November 5, 2026. These are application API IDs, not inferred coding-agent picker labels. No billable comparison was run; account-specific access is unverified.

| Role | API model and endpoint | Listed Standard price |
| --- | --- | --- |
| Campaign/character recipes (default), narration, intent | [gpt-6-luna](https://developers.openai.com/api/docs/models/gpt-6-luna), POST /v1/responses | $0.10/M input, $0.50/M output; 30-minute cache writes $0.125/M |
| Optional campaign planner | [gpt-6.1-terra](https://developers.openai.com/api/docs/models/gpt-6.1-terra), same endpoint | $1/M input, $5/M output; 30-minute cache writes $1.25/M |
| Spoken narration default | Device speech | No OpenAI API charge |
| Temporary paid speech adapter | [tts-1](https://developers.openai.com/api/docs/models/tts-1), POST /v1/audio/speech | $15/M characters; deprecated, shuts down January 6, 2027 |
| Long-term speech successor, not wired | gpt-realtime-2.1-mini, Realtime API | $0.60/M text input; $20/M audio output |

The [current catalog](https://developers.openai.com/api/docs/models) and [pricing](https://developers.openai.com/api/docs/pricing) confirm Luna and Terra. Both support [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs). The code uses strict schemas, Standard service, no reasoning and no paid tools. This coding session's Astra/Fast settings do not select the game's model or tier.

The [deprecation register](https://developers.openai.com/api/docs/deprecations) marks tts-1, tts-1-hd and gpt-4o-mini-tts for January 6, 2027 retirement, with Realtime mini as successor. The temporary adapter has an enforced cutoff and defaults off. Do not build a long-term deployment around it. GPT-5.4 nano is also deprecated, scheduled for April 1, 2027 removal. No retirement was listed for selected Luna/Terra models when checked; recheck before live use.

One project credential can route all roles subject to permissions. Separate dev/prod projects and keys isolate spending; a key per model is unnecessary. See [authentication](https://developers.openai.com/api/reference/overview#authentication), [permissions](https://developers.openai.com/api/docs/guides/rbac), and [spend limits](https://developers.openai.com/api/docs/guides/spend-limits). Alerts alone are not hard limits. Even enforced provider limits can overshoot slightly; this app reserves allowance before requests.

The engine owns maps, dice, combat, damage, turns and legal actions. Fixed three-shard facts and chapter goals cannot be replaced by model output. Generated text adds bounded flavor, not autonomous rule adjudication or a semantic truth guarantee. Recipes select existing classes/colors; no images, arbitrary SVG, HTML, code or new game assets are generated. Bots remain scripted. Intent suggestions require confirmation through ordinary controls.

See [AI-SETUP.md](AI-SETUP.md) for local setup, secure provisioning, explicit opt-in, cost estimates, persistence and limits, and [AI-VALIDATION.md](AI-VALIDATION.md) for tests.
