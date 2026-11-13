# Living narrator voice

`/api/quest/live` is a same-origin WebSocket endpoint. It requires the existing
team AI session cookie, configured paid AI, configured paid audio, D1, and the
creator rate limit. A non-upgrade GET performs a free access preflight before
microphone permission, so disabled audio or unavailable AI access produces a readable
error instead of an opaque WebSocket failure. Keys and provider sockets remain in the Worker. There is no
browser ephemeral token with a session lifetime the browser could extend.

The server upgrades a primary connection to
`https://api.openai.com/v1/live/sessions`, sends `session.start` for `gpt-live-1`
with `store: false`, client delegation, and mono PCM16LE at 24 kHz. It sends a
silence frame every 100 ms when the browser is not supplying microphone frames;
GPT-Live needs an advancing input timeline even for one short spoken comment.
This is the Live protocol, not the older Realtime `response.create` protocol.

Aether always requests the built-in `vesper` voice and a composed British,
mythic delivery. A selected narrator requests its validated built-in voice and
delivery traits. Identity is stable across sessions; exact acoustic delivery and
accent adherence remain model behavior, not a deterministic voice synthesis
guarantee. A confirmed name, voice, or delivery change closes the old connection.
The player explicitly reconnects with the new voice. The app can return to
Aether without replacing the saved narrator.

The hook starts muted. Enabling the speaker allows a short comment using the
same Live voice; unmuting the mic opens a conversation after browser microphone
permission succeeds. Mic and output mute are independent. Muted microphone
frames are discarded locally and server-side, and the server also sends Live's
input mute command. Speaker mute discards queued and new output; it never replays
missed speech. Muting both immediately ends the session. There is no microphone
dictation-to-text-box feature.

## Bounds and accounting

- Short comment: at most 72 seconds after startup, reserved **$0.24**.
- Conversation: at most 360 seconds after startup, reserved **$0.80**. If that
  reservation does not fit, try a 240-second window for **$0.50**, then a
  120-second window for **$0.30**. Each smaller window retains a 2x margin over
  its full startup, conversation and closure lifetime. See [current AI usage limits](../AI-USAGE-LIMITS.md).
- No user activity for 120 seconds: close the conversation.
- Startup: 10 seconds; graceful provider close: 3 seconds, then force close.
- Browser startup also times out after 15 seconds. No automatic reconnect.
- At most 32 delegated proposals, 240 non-audio controls, and bounded PCM,
  transcript, event, wire and context sizes per connection.
- The existing durable D1 ledger reserves before contacting OpenAI and shares
  creator, daily, monthly and concurrent-request limits with text generation.
- Reservations are conservative spend allowances and are never automatically
  refunded. They are not claimed to be provider invoices. `session.closed`
  records valid final `usage.seconds`; missing final usage is marked unconfirmed.
  A failed ledger completion remains pending and fails closed. `waitUntil` keeps
  receipt persistence alive after socket closure.

The published model rate reviewed on 2026-11-07 is $0.05 per active minute,
billed by the second. These reservations include startup/closure and a safety
margin. The relay does not enable hosted Responses delegation or provider tools.
The app's `guide` request is separately reserved through its existing text AI
path. Account billing and provider controls are independent of these app limits. A remaining
allowance below the smallest reservation blocks a call. The default $0.40
campaign allowance can fund a short call instead of rejecting every call.

## Changes and confirmation

The Live model asks for client delegation when the player describes a desired
story, narrator or hero change. A delegation marker does not contain the user's
text: the relay waits for a 900 ms quiet transcript boundary before forwarding the
request. The hook keeps one guide request running and coalesces later transcript
snapshots into one pending request, so a second sentence or correction is not
discarded while a proposal is being prepared. It calls the existing creation `guide` action, then feeds its reply
back as commentary with the delegation ID. The UI shows the proposed profile or
story and requires Apply; only version-checked confirmation edits the draft.
Spoken dialogue has no authority to mutate game state or bypass confirmation.
Context updates during a call are debounced; closing voice leaves draft editing
and any independent creation request intact.

`session.output_audio.delta` has no output-done marker. The browser schedules PCM
playback, caps queued audio to four seconds, and drives the avatar from an audio
analyser rather than from a guessed text duration. The relay ends a short comment
after returned audio settles or the hard deadline. Transcript timing does not
prove that audio was heard.

## Verification

`server/live-relay.test.ts` uses an injected clock, provider and ledger. It covers
reservation-before-connection, cap denial, credential isolation, hard and idle
closure, muted input, silence pacing, fragmented delegation, invalid commands,
provider failure and unconfirmed disconnect usage. These fixture tests make no
paid calls. Actual WebSocket upgrade through the app runtime, Live account
availability, human microphone quality, audible accent and lip synchronization
must be checked separately; tests alone do not establish them.

`server/live-route-worker.test.ts` also exercises the real Worker timer receiver,
access preflight and WebSocket upgrade. This catches Worker-only startup errors
that injected-clock unit tests cannot detect.

Official references:

- [GPT-Live 1 model and rates](https://developers.openai.com/api/docs/models/gpt-live-1)
- [WebSocket connection](https://developers.openai.com/api/docs/guides/voice-websockets?api=live)
- [Conversation and session lifecycle](https://developers.openai.com/api/docs/guides/live-conversations)
- [Client delegation](https://developers.openai.com/api/docs/guides/live-delegation)
- [Server and playback controls](https://developers.openai.com/api/docs/guides/voice-server-controls?api=live)
