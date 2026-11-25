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

Install `requirements-local.txt` into the worker environment. Download the Faster Whisper small model to `<model-directory>/whisper-small` and the Piper `en_US-ljspeech-medium` voice and JSON config to `<model-directory>`. Set `LOCAL_VOICE_DIR` to that absolute directory. Ollama must already serve `qwen2.5:3b` on loopback port 11434; `OLLAMA_MODEL` may select another installed local model. No cloud models are selected automatically.

Run the existing call command with `--voice-backend local`. This uses local CPU transcription, local Piper synthesis and loopback-only Ollama classification. No OpenAI key is needed, and call speech is not sent to OpenAI. Telegram still carries the call. The PC must remain running. Model files and credentials remain outside the repository.

The local classifier selects a single approved FAQ identifier using recent conversation context and understands paraphrases without a keyword gate. Unknown or invalid selections prompt a rephrase, then a short topic menu; a third unmatched turn ends politely instead of repeatedly offering a team handoff. Context remains in memory only. Whisper small filters low-confidence/no-speech segments. Test the actual service questions before use. It cannot generate arbitrary spoken answers. Stop detection remains deterministic. Local voices and recognition are checked with a synthetic speech round trip; this does not establish live microphone quality.

Piper engine: [GPL-3.0-or-later](https://github.com/OHF-Voice/piper1-gpl). The selected voice's [model card](https://huggingface.co/rhasspy/piper-voices/blob/main/en/en_US/ljspeech/medium/MODEL_CARD) identifies public-domain LJ Speech training data and training from scratch. [Faster Whisper](https://github.com/SYSTRAN/faster-whisper) is MIT licensed. Models are downloaded separately rather than bundled. Preserve model cards and review engine obligations before redistributing binaries.

## Short service conversation

The opening identifies the company and AI, states the service reason, and asks whether help is needed. An initial short refusal ends politely. An approved FAQ answer is followed by “Does that answer your question?” A clear yes or thanks then ends the conversation and reaches the existing call cleanup; no keeps it open for another question. New substantive questions are evaluated normally, even if they begin with “no.” Stop requests always end immediately. Both voice backends use the same in-memory conversation state. No customer response or completion flag is stored separately. These completion rules have offline tests; a clean live completion hangup still requires verification.

## Sources and licenses

- [Telegram call protocol](https://core.telegram.org/api/calls) and [user-only requestCall](https://core.telegram.org/method/phone.requestCall).
- [Telegram API terms](https://core.telegram.org/api/terms) and [content/AI processing terms](https://telegram.org/tos/content-licensing). Test only with context-specific, informed consent from the participants. This does not authorize bulk unsolicited calling.
- [PyTgCalls](https://github.com/pytgcalls/pytgcalls), [NTgCalls](https://github.com/pytgcalls/ntgcalls), [Telethon](https://github.com/LonamiWebs/Telethon). These are third-party libraries, not official Telegram calling services. Review their distributed licenses before distributing native binaries; they are installed as dependencies and not bundled in this source repository.

## Offline checks

`python -m unittest discover -s telegram -p "test_*.py"` runs without Telegram, credentials, audio uploads or paid model requests.

Local classifier model: https://ollama.com/library/qwen2.5:3b (Qwen license; downloaded separately, not bundled). `LOCAL_STT_MODEL=whisper-base` selects the previous installed recognizer explicitly.

On the tested RTX 4050 Windows setup, install `requirements-cuda.txt` and set `LOCAL_STT_DEVICE=cuda`. The worker adds only that Python environment's NVIDIA runtime directories to its process DLL search path; no system PATH or driver settings are changed. CPU remains the portable default. Synthetic English recognition and FAQ selection passed with GPU processing; this does not verify noisy live input or interruption handling. Conversations remain half-duplex: listen while Marco speaks, then respond.


## Bilingual conversation prototype

A service snapshot can include `greeting_tl` and one `answer_tl` for each FAQ. These are reviewed translations of the same approved facts, tied to the same FAQ IDs. They are not generated during a call. The local worker switches to these texts for recognized Tagalog/Taglish or an explicit language request, and can switch back to English. It retains only the recent two turns in memory. Caller audio and transcripts are not stored.

Shared copy in `dialogue.py` supplies English and Tagalog greetings, clarification, completion, busy/no-callback, repeat and stop responses. Clear completion is contextual: “hindi” at the opening declines help, while “hindi” after an answer asks what remains unanswered. Feature questions about stopping do not count as stop commands. Repetition reuses the previous response, and slower requests adjust playback speed. Automatic interruption while Marco speaks remains unsupported; the caller listens between replies.

### Local Tagalog audio preparation

The English Piper voice is not presented as a native Tagalog voice. The experimental Tagalog path uses pre-generated script PCM from a local VoxCPM2-compatible runtime. `voice_cache.py` hashes the exact spoken script; changing a translation requires preparing its audio again. `TAGALOG_VOICE_CACHE` points to the cache. With that setting, the worker refuses to dial when a required approved phrase has no audio. Synthesized script clips are stored; callee audio is not.

`python telegram/prepare_tagalog.py --service <snapshot.json> --cache <cache-directory> --reference <synthetic-voice.wav>` connects only to the local prototype server on `127.0.0.1:8093`, renders the fixed phrases, validates duration and converts them to 24 kHz mono PCM using FFmpeg. The reference in the local test was generated synthetically, not cloned from a real person. No runtime binaries, model weights or private reference files are included in this repository.

The test runtime was [VoxGen release 0.7.67](https://github.com/NullMagic2/VoxGen/releases/tag/release_0.7.67), ZIP SHA-256 `71b38558cfcbfed9bb93c31e724c40a6a83d632277a2e0a5d52da3c7ca394005`. The model is [OpenBMB VoxCPM2](https://huggingface.co/openbmb/VoxCPM2), Apache-2.0, in the [DennisHuang648 GGUF conversion](https://huggingface.co/DennisHuang648/VoxCPM2-GGUF). **The VoxGen repository has no published license identified during inspection. Its use or redistribution for a paid deployment has not been cleared.** It is only an experimental local preparation path here; resolve runtime rights or replace it with a properly licensed implementation before deployment. Audio pronunciation, voice consistency and noisy Taglish still require listener evaluation.
