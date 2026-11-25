import json
from pathlib import Path
import struct
import tempfile
import unittest
import wave
import io

from core import (BYTES_PER_SECOND,FALLBACK,UtteranceDetector,approved_reply,load_service,stop_requested,validate_peer,wav_bytes)


class CallerRules(unittest.TestCase):
    def test_self_calls_and_non_users_are_rejected(self):
        with self.assertRaisesRegex(ValueError,'same Telegram account'):
            validate_peer(10,10,False,True)
        for args in [(10,11,True,True),(10,-11,False,False)]:
            with self.assertRaises(ValueError):
                validate_peer(*args)
        validate_peer(10,11,False,True)

    def test_generated_text_and_unknown_ids_cannot_be_spoken(self):
        service={'faqs':[{'id':'price','answer':'Our team will confirm pricing.'}]}
        self.assertEqual(approved_reply({'action':'answer','answerIds':['price'],'text':'Invented price'},service)[0],'Our team will confirm pricing.')
        self.assertEqual(approved_reply({'action':'answer','answerIds':['invented']},service)[0],FALLBACK)
        self.assertEqual(approved_reply({'action':'answer','answerIds':[{'bad':1}]},service)[0],FALLBACK)

    def test_stop_requests(self):
        for text in ['Please stop calling','Do not call','End this call','Tama na','Ayoko']:
            self.assertTrue(stop_requested(text))
        self.assertFalse(stop_requested('What service do you offer?'))

    def test_silence_is_not_uploaded_and_utterance_is_bounded(self):
        detector=UtteranceDetector()
        self.assertIsNone(detector.push(b'\0'*BYTES_PER_SECOND))
        voice=struct.pack('<h',1500)*24000
        self.assertIsNone(detector.push(voice))
        self.assertIsNotNone(detector.push(b'\0'*BYTES_PER_SECOND))
        detector.push(voice*11)
        result=detector.push(voice)
        self.assertIsNotNone(result)
        self.assertEqual(len(detector.buffer),0)

    def test_pcm_is_wrapped_at_exact_native_sample_rate(self):
        with wave.open(io.BytesIO(wav_bytes(b'\0'*48000)),'rb') as wav:
            self.assertEqual((wav.getframerate(),wav.getnchannels(),wav.getsampwidth(),wav.getnframes()),(24000,1,2,24000))

    def test_archived_and_incomplete_service_exports_are_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            path=Path(directory)/'service.json'
            path.write_text(json.dumps({'name':'Incomplete'}))
            with self.assertRaises(ValueError):
                load_service(path)


if __name__=='__main__':
    unittest.main()
