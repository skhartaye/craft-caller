import unittest
from core import ServiceConversation,stop_requested
from voice_cache import cache_name,tagalog_texts

class ConversationPatterns(unittest.TestCase):
    def setUp(self):
        self.service={'name':'Craft Caller','company':'Craft Caller','greeting_tl':'Magandang araw.','faqs':[{'id':'rates','answer':'Setup is 1499 pesos.','answer_tl':'1499 piso ang setup.'}]}
        self.flow=ServiceConversation(self.service)
        self.flow.language='tl'

    def test_tagalog_yes_at_opening_asks_for_need(self):
        text,end=self.flow.before_answer('opo')
        self.assertFalse(end)
        self.assertIn('maitutulong',text)

    def test_question_after_no_is_not_a_refusal(self):
        self.assertIsNone(self.flow.before_answer('Hindi, magkano ang monthly?'))

    def test_completion_and_refusal_are_contextual(self):
        self.assertTrue(self.flow.before_answer('hindi po')[1])
        self.flow.awaiting_completion=True
        self.assertFalse(self.flow.before_answer('hindi po')[1])
        self.assertTrue(self.flow.before_answer('salamat po')[1])

    def test_tagalog_stop_variants(self):
        for text in ['huwag na','wag na','tapos na','ibaba mo na ang tawag','ayoko na']:
            with self.subTest(text=text):self.assertTrue(stop_requested(text))

    def test_script_changes_invalidate_voice_cache(self):
        self.assertNotEqual(cache_name('1499 piso.'),cache_name('499 piso.'))
        self.assertEqual(cache_name(' 1499 piso. '),cache_name('1499 piso.'))

    def test_bilingual_cache_requires_reviewable_translations(self):
        self.assertIn('1499 piso ang setup. Nasagot po ba ang tanong ninyo?',tagalog_texts(self.service))
        del self.service['faqs'][0]['answer_tl']
        with self.assertRaises(ValueError):tagalog_texts(self.service)

    def test_stop_feature_questions_do_not_hang_up(self):
        for text in ['Can it stop automatically?','How do I stop a call?','Tapos na ba ang website?','Huwag mo munang sabihin ang presyo']:
            with self.subTest(text=text):self.assertFalse(stop_requested(text))
