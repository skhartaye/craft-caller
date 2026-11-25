# Telegram personal-account voice prototype

This is a local Python worker for one explicitly agreed Telegram test call. It is not a bot, a regular mobile carrier call, a cold-call campaign tool, or a running hosted service. No call or Telegram sign-in has been performed during development.

## Verified locally

Python 3.13 on Windows x64; native imports of PyTgCalls 3.0.1 and NTgCalls 3.0.7; Telethon 1.42.0; offline audio framing and service-answer tests. Live Telegram signalling, audio quality, microphone capture, AI recognition and playback remain unverified until an authorized two-account test. Calls have a 120-second session cap (130-second overall watchdog), eight-turn cap, one process lock, and no automatic retry. The prototype is half-duplex: it listens between replies, not while speaking. It may need microphone/noise tuning.

## Set up locally

1. Use a separate regular Telegram caller account and a consenting receiving account. The worker checks resolved Telegram user IDs and refuses self-calls, bots and groups. Do not use strangers' numbers or import contact lists.
2. Obtain your own `api_id` and `api_hash` from [Telegram API development tools](https://my.telegram.org/apps). Enter passwords, two-step passwords and login codes yourself; do not paste them into chats or the website.
3. Create a local Python 3.13 environment and install `telegram/requirements.txt`. Copy the names from `.env.example` into environment variables in your own terminal. The worker deliberately does not scan for or load other applications' credentials.
4. `python telegram/worker.py doctor` only checks imports/configuration. It performs no network sign-in, model request or call.
5. `python telegram/worker.py login` asks for the caller's number, Telegram code and optional two-step password directly in your terminal. This creates a local Telegram session outside the source checkout in the sibling `telegram-private/` folder. Treat that folder as an account credential, restrict access to your Windows account, and never upload it. Revoke the session through Telegram Settings > Devices when no longer needed.
6. On Craft Caller, save your service and export its JSON. Treat the export as the approved snapshot for that test. Keep private exports outside the source checkout. Set `TELEGRAM_RECIPIENT` to one @username and configure your OpenAI models/key locally.
7. Once both people understand and consent to AI processing of this call, explicitly run `python telegram/worker.py call --service <absolute-service-export.json> --confirm-call --consent`.

The last command places a real Telegram call and uses paid AI services. Do not run it until the account, recipient and AI spending are authorized. The worker announces it is AI, uses short approved FAQ answers only, hands off unknown questions, and ends on recognized stop requests. The answer classifier may still select an irrelevant approved answer. Audio and transcription exist in memory for the call and are sent to the configured OpenAI APIs. No call audio or transcripts are written locally. A metadata-only local event records time, outcome and the service snapshot hash. No account history is read.

The native library calls its live-audio input operation `record`; this worker requests external PCM frames and does not save recordings. The local audio buffer is bounded to twelve seconds per utterance. Account session storage is managed by Telethon. This is a prototype, not a guarantee that SDK internals or providers retain no metadata.

## Website boundary

Netlify cannot host this long-running native calling process. The website currently configures and exports approved service knowledge; it does not control this worker or place Telegram calls. The Telegram page must remain marked as setup until a persistent authenticated worker connection exists. Do not expose this worker or a local session file to the public internet. A future web-triggered call needs authenticated, owner-scoped requests, durable outcomes, deduplication and spending controls before activation.

## Sources and licenses

- [Telegram call protocol](https://core.telegram.org/api/calls) and [user-only requestCall](https://core.telegram.org/method/phone.requestCall).
- [Telegram API terms](https://core.telegram.org/api/terms) and [content/AI processing terms](https://telegram.org/tos/content-licensing). Test only with context-specific, informed consent from the participants. This does not authorize bulk unsolicited calling.
- [PyTgCalls](https://github.com/pytgcalls/pytgcalls), [NTgCalls](https://github.com/pytgcalls/ntgcalls), [Telethon](https://github.com/LonamiWebs/Telethon). These are third-party libraries, not official Telegram calling services. Review their distributed licenses before distributing native binaries; they are installed as dependencies and not bundled in this source repository.

## Offline checks

`python -m unittest discover -s telegram -p "test_*.py"` runs without Telegram, credentials, audio uploads or paid model requests.
