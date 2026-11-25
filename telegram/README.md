# Telegram personal-account voice prototype

This is a local Python worker for one explicitly agreed Telegram test call. It is not a bot, a regular mobile carrier call, a cold-call campaign tool, or a running hosted service. A two-account silent connection test has succeeded on Windows; conversational audio still requires a separate live test.

## Verified locally

Python 3.13 on Windows x64; native imports of PyTgCalls 3.0.1 and NTgCalls 3.0.7; Telethon 1.42.0; offline audio framing and service-answer tests. Live Telegram signalling, audio quality, microphone capture, AI recognition and playback remain unverified until an authorized two-account test. Calls have a 120-second session cap (130-second overall watchdog), eight-turn cap, one process lock, and no automatic retry. The prototype is half-duplex: it listens between replies, not while speaking. It may need microphone/noise tuning.

## Set up locally

1. Use a separate regular Telegram caller account and a consenting receiving account. The worker checks resolved Telegram user IDs and refuses self-calls, bots and groups. Do not use strangers' numbers or import contact lists.
2. Obtain your own `api_id` and `api_hash` from [Telegram API development tools](https://my.telegram.org/apps). Enter passwords, two-step passwords and login codes yourself; do not paste them into chats or the website.
3. Create a local Python 3.13 environment and install `telegram/requirements.txt`. Copy the names from `.env.example` into environment variables in your own terminal. The worker deliberately does not scan for or load other applications' credentials.
4. `python telegram/worker.py doctor` only checks imports/configuration. It performs no network sign-in, model request or call.
5. `python telegram/worker.py connect` asks for your API ID and API hash if missing, then the caller's number, Telegram code and optional two-step password directly in your terminal. It asks for the receiving @username and refuses a self-call before any dialing is possible. API details stay in the process; no environment or credential file is written for them. The login creates a local Telegram session outside the source checkout in the sibling `telegram-private/` folder; on Windows the folder ACL is restricted to your user and SYSTEM before login. Treat that folder as an account credential and never upload it. Revoke the session through Telegram Settings > Devices when no longer needed. The connect command never places a call or uses AI credits; a metadata-only status file records whether identity verification passed.
6. On Craft Caller, save your service and export its JSON. Treat the export as the approved snapshot for that test. Keep private exports outside the source checkout. Set `TELEGRAM_RECIPIENT` to one @username and configure your OpenAI models/key locally.
7. Once both people understand and consent to AI processing of this call, explicitly run `python telegram/worker.py call --service <absolute-service-export.json> --confirm-call --consent`.

The last command places a real Telegram call and uses paid AI services. Do not run it until the account, recipient and AI spending are authorized. The worker announces it is AI, uses short approved FAQ answers only, hands off unknown questions, and ends on recognized stop requests. The answer classifier may still select an irrelevant approved answer. Audio and transcription exist in memory for the call and are sent to the configured OpenAI APIs. No call audio or transcripts are written locally. A metadata-only local event records time, outcome and the service snapshot hash. No account history is read.

The native library calls its live-audio input operation `record`; this worker requests external PCM frames and does not save recordings. The local audio buffer is bounded to twelve seconds per utterance. Account session storage is managed by Telethon. This is a prototype, not a guarantee that SDK internals or providers retain no metadata.

## Website boundary

Netlify cannot host this long-running native calling process. The website currently configures and exports approved service knowledge; it does not control this worker or place Telegram calls. The Telegram page must remain marked as setup until a persistent authenticated worker connection exists. Do not expose this worker or a local session file to the public internet. A future web-triggered call needs authenticated, owner-scoped requests, durable outcomes, deduplication and spending controls before activation.

## Local voice without API credits

Install `requirements-local.txt` into the worker environment. Download the Faster Whisper base model to `<model-directory>/whisper-base` and the Piper `en_US-ljspeech-medium` voice and JSON config to `<model-directory>`. Set `LOCAL_VOICE_DIR` to that absolute directory. Ollama must already serve `llama3.2:3b` on loopback port 11434; `OLLAMA_MODEL` may select another installed local model. No cloud models are selected automatically.

Run the existing call command with `--voice-backend local`. This uses local CPU transcription, local Piper synthesis and loopback-only Ollama classification. No OpenAI key is needed, and call speech is not sent to OpenAI. Telegram still carries the call. The PC must remain running. Model files and credentials remain outside the repository.

The local classifier first requires shared subject words with approved FAQs, accepts exact approved questions directly, then uses constrained JSON selection for other candidates. Unknown or invalid selections fall back to the approved handoff. This deliberately conservative matching may miss paraphrases; test the service's actual questions before use. It cannot generate arbitrary spoken answers. Stop detection remains deterministic. Local voices and recognition are checked with a synthetic speech round trip; this does not establish live microphone quality.

Piper engine: [GPL-3.0-or-later](https://github.com/OHF-Voice/piper1-gpl). The selected voice's [model card](https://huggingface.co/rhasspy/piper-voices/blob/main/en/en_US/ljspeech/medium/MODEL_CARD) identifies public-domain LJ Speech training data and training from scratch. [Faster Whisper](https://github.com/SYSTRAN/faster-whisper) is MIT licensed. Models are downloaded separately rather than bundled. Preserve model cards and review engine obligations before redistributing binaries.

## Short service conversation

The opening identifies the company and AI, states the service reason, and asks whether help is needed. An initial short refusal ends politely. An approved FAQ answer is followed by “Does that answer your question?” A clear yes or thanks then ends the conversation and reaches the existing call cleanup; no keeps it open for another question. New substantive questions are evaluated normally, even if they begin with “no.” Stop requests always end immediately. Both voice backends use the same in-memory conversation state. No customer response or completion flag is stored separately. These completion rules have offline tests; a clean live completion hangup still requires verification.

## Sources and licenses

- [Telegram call protocol](https://core.telegram.org/api/calls) and [user-only requestCall](https://core.telegram.org/method/phone.requestCall).
- [Telegram API terms](https://core.telegram.org/api/terms) and [content/AI processing terms](https://telegram.org/tos/content-licensing). Test only with context-specific, informed consent from the participants. This does not authorize bulk unsolicited calling.
- [PyTgCalls](https://github.com/pytgcalls/pytgcalls), [NTgCalls](https://github.com/pytgcalls/ntgcalls), [Telethon](https://github.com/LonamiWebs/Telethon). These are third-party libraries, not official Telegram calling services. Review their distributed licenses before distributing native binaries; they are installed as dependencies and not bundled in this source repository.

## Offline checks

`python -m unittest discover -s telegram -p "test_*.py"` runs without Telegram, credentials, audio uploads or paid model requests.
