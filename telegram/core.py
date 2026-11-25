"""Pure, offline-tested rules for one consenting Telegram call."""
import array
import io
import json
import math
import re
import sys
import wave
from pathlib import Path

RATE = 24000
BYTES_PER_SECOND = RATE * 2
FRAME_BYTES = BYTES_PER_SECOND // 100
FALLBACK = 'I don’t have an approved answer for that. Would you like our team to clarify it?'


def load_service(path: Path) -> dict:
    if path.stat().st_size > 45000:
        raise ValueError('Service export is too large.')
    service = json.loads(path.read_text(encoding='utf-8-sig'))
    if not isinstance(service, dict):
        raise ValueError('Use an exported service object.')
    for key in ('name', 'company', 'description', 'reason', 'goal', 'greeting', 'rules'):
        if not isinstance(service.get(key), str) or len(service[key]) > 4000:
            raise ValueError(f'Invalid service field: {key}')
    if not all(service[k].strip() for k in ('name', 'company', 'description', 'reason')):
        raise ValueError('Complete the required service details before exporting.')
    faqs = service.get('faqs')
    if not isinstance(faqs, list) or len(faqs) > 30 or service.get('archived') is not False:
        raise ValueError('Use an active service with at most 30 approved answers.')
    ids = set()
    for faq in faqs:
        if not isinstance(faq, dict) or any(not isinstance(faq.get(k), str) or not faq[k].strip() for k in ('id', 'question', 'answer')):
            raise ValueError('Invalid approved answer.')
        if faq['id'] in ids or len(faq['question']) > 200 or len(faq['answer']) > 1000:
            raise ValueError('Invalid or duplicate approved answer.')
        ids.add(faq['id'])
    return service


def validate_peer(sender_id: int, recipient_id: int, is_bot: bool, is_user: bool) -> None:
    if sender_id == recipient_id:
        raise ValueError('The caller and recipient are the same Telegram account. Use a separate caller account.')
    if not is_user or is_bot or recipient_id <= 0:
        raise ValueError('Only a regular individual Telegram recipient is supported.')


def stop_requested(text: str) -> bool:
    return bool(re.search(r'\b(stop|unsubscribe|goodbye|bye)\b|do not call|don.t call|remove me|not interested|end (the|this) call|ayoko|tama na', text, re.I))


def approved_reply(decision: object, service: dict) -> tuple[str, bool]:
    if not isinstance(decision, dict):
        return FALLBACK, False
    if decision.get('action') == 'stop':
        return 'Understood. I’ll end the call now. Thank you for your time.', True
    ids = decision.get('answerIds')
    if decision.get('action') != 'answer' or not isinstance(ids, list) or not 1 <= len(ids) <= 2 or any(not isinstance(i, str) for i in ids):
        return FALLBACK, False
    facts = {f['id']: f['answer'] for f in service['faqs']}
    if any(i not in facts for i in ids):
        return FALLBACK, False
    return ' '.join(facts[i] for i in dict.fromkeys(ids)), False


def wav_bytes(pcm: bytes) -> bytes:
    out = io.BytesIO()
    with wave.open(out, 'wb') as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(RATE)
        wav.writeframes(pcm[:len(pcm) // 2 * 2])
    return out.getvalue()


class UtteranceDetector:
    """Bounded, half-duplex RMS detector. No audio files or transcripts retained."""
    def __init__(self, threshold: int = 350):
        self.threshold = threshold
        self.reset()

    def reset(self):
        self.buffer = bytearray()
        self.silence = 0
        self.voiced = 0

    def push(self, frame: bytes) -> bytes | None:
        frame = frame[:len(frame) // 2 * 2]
        if not frame:
            return None
        samples = array.array('h', frame)
        if sys.byteorder != 'little':
            samples.byteswap()
        active = math.sqrt(sum(s * s for s in samples) / len(samples)) >= self.threshold
        if active:
            self.voiced += len(frame)
            self.silence = 0
        elif self.buffer:
            self.silence += len(frame)
        if active or self.buffer:
            self.buffer.extend(frame)
        if len(self.buffer) >= 12 * BYTES_PER_SECOND or self.silence >= int(.7 * BYTES_PER_SECOND):
            result = bytes(self.buffer) if self.voiced >= int(.25 * BYTES_PER_SECOND) else None
            self.reset()
            return result
        return None
