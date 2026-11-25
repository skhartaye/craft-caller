import unittest
from unittest.mock import AsyncMock
from local_voice import LocalVoiceAI
from core import ServiceConversation


class ApprovedLocalAnswers(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.ai = LocalVoiceAI.__new__(LocalVoiceAI)
        self.ai.model = 'test'
        self.ai.service = {'faqs':[{'id':'purpose','question':'Why are you calling? What is this test?', 'answer':'This is a voice test.'}]}
        self.ai.client = AsyncMock()
        self.ai.conversation = ServiceConversation(self.ai.service)

    async def test_unrelated_question_never_reaches_classifier(self):
        reply, ended = await self.ai.answer_text('What is the capital of France?')
        self.assertIn('approved answer', reply)
        self.assertFalse(ended)
        self.ai.client.post.assert_not_called()

    async def test_exact_approved_question_and_stop_skip_model(self):
        self.assertEqual(await self.ai.answer_text('Why are you calling?'), ('This is a voice test. Does that answer your question?',False))
        self.assertTrue((await self.ai.answer_text('tama na'))[1])
        self.ai.client.post.assert_not_called()

    async def test_completion_confirmation_ends_after_answer(self):
        await self.ai.answer_text('Why are you calling?')
        self.assertTrue((await self.ai.answer_text('Yes thank you'))[1])

    async def test_negative_completion_allows_another_question(self):
        await self.ai.answer_text('Why are you calling?')
        self.assertFalse((await self.ai.answer_text('No'))[1])
        self.assertFalse(self.ai.conversation.awaiting_completion)

    async def test_initial_refusal_ends_but_new_question_does_not(self):
        self.assertTrue((await self.ai.answer_text('No thanks'))[1])
        self.assertIsNone(self.ai.conversation.before_answer('No, how much does it cost?'))
