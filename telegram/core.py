"""Pure, offline-tested rules for one consenting Telegram call."""
import array
import io
import json
import math
import re
import sys
import wave
from pathlib import Path
from dialogue import phrase

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
        if 'question_tl' in faq and (not isinstance(faq['question_tl'],str) or len(faq['question_tl'])>200):
            raise ValueError('Invalid Tagalog question aliases.')
        if 'answer_tl' in faq and (not isinstance(faq['answer_tl'],str) or not faq['answer_tl'].strip() or len(faq['answer_tl'])>1000):
            raise ValueError('Invalid approved Tagalog answer.')
        ids.add(faq['id'])
    if 'greeting_tl' in service and (not isinstance(service['greeting_tl'],str) or not service['greeting_tl'].strip() or len(service['greeting_tl'])>4000):
        raise ValueError('Invalid Tagalog greeting.')
    return service


def validate_peer(sender_id: int, recipient_id: int, is_bot: bool, is_user: bool) -> None:
    if sender_id == recipient_id:
        raise ValueError('The caller and recipient are the same Telegram account. Use a separate caller account.')
    if not is_user or is_bot or recipient_id <= 0:
        raise ValueError('Only a regular individual Telegram recipient is supported.')


def stop_requested(text: str) -> bool:
    value=re.sub(r'[^a-z0-9 ]','',text.lower()).strip()
    if re.search(r'\b(unsubscribe|goodbye|bye)\b|do not call|dont call|remove me|not interested|end (the|this) call|ayoko|ibaba (mo )?(na )?(ang )?tawag',value):
        return True
    if re.search(r'^(please )?stop\b|\bplease stop\b|\bcan you stop\b|\byou can stop now\b',value):
        return True
    return bool(re.fullmatch(r'(tama na|tapos na|huwag na|wag na)( po)?',value) or re.search(r'(huwag|wag) (mo )?(na )?(akong )?tawagan',value))


class ServiceConversation:
    """Short service check; hang up only after an explicit completion or refusal."""
    def __init__(self, service):
        self.service = service
        self.awaiting_completion = False
        self.language = 'en'

    def say(self, key):
        return phrase(key,self.language,self.service)

    def before_answer(self, text):
        normalized = re.sub(r'[^a-z0-9 ]', '', text.lower()).strip()
        if stop_requested(text):
            return self.say('stop'), True
        yes = normalized in {'yes','yes please','yeah','yep','yup','sure','okay','ok','oo','opo','sige','sige po','oo naman','yes po','oo sige','oo sige po'}
        no = normalized in {'no','no thanks','no thank you','nope','not now','not today','no need','no i dont need help','wala','wala naman','hindi','wala na','hindi na','hindi po','hindi kailangan'}
        done = normalized in {'thanks','thank you','thats all','that is all','all good','im good','that helps','that answers my question','yes that answers it','yes thanks','yes thank you','nothing else','thank you thats all','salamat','salamat po','okay na','ok na','yun lang','iyon lang','nasagot na','oo salamat'}
        done = done or bool(re.fullmatch(r'(sige |okay |oo )?salamat( po)?',normalized))
        if self.awaiting_completion:
            if yes or done:
                return self.say('done'), True
            if no:
                self.awaiting_completion = False
                return self.say('more'), False
        elif no or done:
            return self.say('decline'), True
        elif yes:
            return self.say('help'), False
        if normalized in {'busy','im busy','call later','later','busy ako','busy po','mamaya na','mamaya na lang','mamaya nalang'}:
            return self.say('busy'), True
        if normalized in {'hello','hi','hello po','kumusta','magandang araw'}:
            return self.say('hello'), False
        return None

    def after_answer(self, reply, ended):
        if ended:
            return reply, True
        answers = [f['answer'] for f in self.service['faqs']]
        if reply in answers or any(reply == a + ' ' + b for a in answers for b in answers):
            self.awaiting_completion = True
            return reply + ' ' + self.say('answered'), False
        return reply, False


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

    def flush(self):
        result = bytes(self.buffer) if self.voiced >= int(.25 * BYTES_PER_SECOND) else None
        self.reset()
        return result

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
            return self.flush()
        return None
