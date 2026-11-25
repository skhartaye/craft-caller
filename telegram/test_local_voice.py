import unittest
from unittest.mock import AsyncMock
from local_voice import LocalVoiceAI


class ApprovedLocalAnswers(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.ai = LocalVoiceAI.__new__(LocalVoiceAI)
        self.ai.model = 'test'
        self.ai.service = {'faqs':[{'id':'purpose','question':'Why are you calling? What is this test?', 'answer':'This is a voice test.'}]}
        self.ai.client = AsyncMock()

    async def test_unrelated_question_never_reaches_classifier(self):
        reply, ended = await self.ai.answer_text('What is the capital of France?')
        self.assertIn('approved answer', reply)
        self.assertFalse(ended)
        self.ai.client.post.assert_not_called()

    async def test_exact_approved_question_and_stop_skip_model(self):
        self.assertEqual(await self.ai.answer_text('Why are you calling?'), ('This is a voice test.',False))
        self.assertTrue((await self.ai.answer_text('tama na'))[1])
        self.ai.client.post.assert_not_called()
