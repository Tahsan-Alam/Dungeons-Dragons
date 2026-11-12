# AI usage limits

Updated November 11, 2026. These are application limits, independent of the OpenAI account's billing, credit balance, provider quotas and spending controls. Amounts count conservative reservations, including failed or uncertain attempts, rather than verified invoices. Existing receipts are retained; raising a ceiling does not reset usage. Day and month scopes use UTC.

## Spending

The hosted environment was read before this change. Its values are explicit overrides, separate from fixture/development defaults. The new environment revision requires publication of the corresponding code before it takes effect.

| Scope | Previous hosted limit | New hosted limit | Environment setting (microdollars) |
| --- | ---: | ---: | --- |
| Adventure or creation scope | $0.50 | $2.00 | `AI_CAMPAIGN_MICRO_USD=2000000` |
| Entire site per UTC day | $2.00 | $8.00 | `AI_DAY_MICRO_USD=8000000` |
| Entire site per UTC month | $25.00 | $25.00 (unchanged) | `AI_MONTH_MICRO_USD=25000000` |

The hard configuration ceilings now match these new hosted values. Defaults when overrides are absent also increase fourfold: $0.10 to $0.40 per scope, $0.25 to $1/day, and $1 to $4/month. A pre-game creation scope and a started adventure have separate per-scope accounting; they still share the same site-wide day/month ledger.

## Requests and generated speech

| Limit | Previous | New |
| --- | ---: | ---: |
| Simultaneous reserved AI requests, site-wide | 2 | 8 |
| Creation requests/live-voice starts per IP per minute, combined | 30 | 120 |
| Saved narration captions per adventure | 100 | 400 |
| Ledger receipts, subject to the existing byte ceiling | 2,000 | 8,000 |
| Planning/creation maximum output tokens | 1,600 | 6,400 |
| Narration/guidance/choice maximum output tokens | 500 | 2,000 |
| Text generation deadline | 15 seconds | 60 seconds |
| Generated speech maximum output tokens | 1,800 | 7,200 |
| Generated speech deadline | 15 seconds | 60 seconds |
| Generated narration clip | 30 seconds | 120 seconds |
| Narrator audition clip | 12 seconds | 48 seconds |
| Generated-speech stream event count / aggregate wire bytes | 2,000 / 1 MB | 8,000 / 4 MB |

Speech reservations are recalculated from the new output budget: $0.295373 per attempt, previously $0.079373. These are conservative allowances, not invoice amounts. Short clips remain reusable. Auditions and clips exceeding the 321,000-byte reusable cache are delivered once and retained in the browser; their durable delivery receipt prevents another charge for the same request. Replaying such a request cannot recover expired transient audio.

## Live voice

| Limit | Previous | New |
| --- | ---: | ---: |
| Short spoken comment | 18 seconds | 72 seconds |
| Maximum conversation | 90 seconds | 360 seconds (6 minutes) |
| Smaller funded conversation windows | 60 / 30 seconds | 240 / 120 seconds |
| Idle conversation cutoff | 30 seconds | 120 seconds |
| Delegated proposals per connection | 8 | 32 |
| Non-audio controls per connection | 60 | 240 |
| Provider stream events / aggregate wire bytes | 12,000 / 18 MB | 48,000 / 72 MB |

Reserved live allowances increase fourfold: comments $0.06 to $0.24; full calls $0.20 to $0.80; smaller windows $0.125/$0.075 to $0.50/$0.30. The server still selects the largest window the remaining allowance can fund. PCM stream totals follow the funded duration, and final usage accepts the entire funded lifetime, including connection/closure time.

## Retained safeguards

Authentication, unlock throttling, game-action limits, validated text lengths, request/individual event sizes, legal game rules, model/voice allowlists, transcript matching, cache/ledger byte limits, connection-start and forced-close timeouts, and playback buffer sizes remain unchanged. They protect protocol validity, responsiveness and storage rather than allocate paid usage. Provider billing, account budgets, purchased credits and model limits are not modified. Automatic retries/reconnects remain disabled.

The ledger remains bounded to 600,000 serialized bytes; that storage safeguard can stop new reservations before the receipt-count or spending ceiling. Pending uncertain receipts continue occupying a concurrency slot until reconciled. No existing receipt is deleted or refunded automatically.
