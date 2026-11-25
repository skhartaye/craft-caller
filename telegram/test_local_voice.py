import unittest
from unittest.mock import AsyncMock, Mock
from local_voice import LocalVoiceAI
from core import ServiceConversation


class ApprovedLocalAnswers(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.ai = LocalVoiceAI.__new__(LocalVoiceAI)
        self.ai.model = 'test'
        self.ai.history = []
        self.ai.misses = 0
        self.ai.service = {'name':'Craft Caller','faqs':[{'id':'purpose','question':'Why are you calling? What is this test?', 'answer':'This is a voice test.'}]}
        self.ai.client = AsyncMock()
        self.ai.conversation = ServiceConversation(self.ai.service)
        self.respond_with('purpose')

    def respond_with(self, answer_id):
        import json
        self.ai.client.post.return_value = Mock(json=Mock(return_value={'message':{'content':json.dumps({'answerId':answer_id})}}))

    async def test_unrelated_questions_clarify_without_team_handoff_loop(self):
        self.respond_with('__clarify__')
        reply, ended = await self.ai.answer_text('What is the capital of France?')
        self.assertIn('rephrase',reply)
        self.assertFalse(ended)
        reply, ended = await self.ai.answer_text('Tell me the weather')
        self.assertIn('Which would help',reply)
        self.assertFalse(ended)
        self.assertTrue((await self.ai.answer_text('What is two plus two?'))[1])

    async def test_unknown_model_ids_never_become_spoken_claims(self):
        self.respond_with('invented')
        reply, ended = await self.ai.answer_text('Tell me the price')
        self.assertNotIn('This is a voice test',reply)
        self.assertFalse(ended)

    async def test_completion_confirmation_ends_after_answer(self):
        self.assertEqual(await self.ai.answer_text('Why are you calling?'), ('This is a voice test. Does that answer your question?',False))
        self.assertTrue((await self.ai.answer_text('Yes thank you'))[1])

    async def test_negative_completion_allows_another_question(self):
        await self.ai.answer_text('Why are you calling?')
        self.assertFalse((await self.ai.answer_text('No'))[1])
        self.assertFalse(self.ai.conversation.awaiting_completion)

    async def test_initial_refusal_and_stop_skip_model(self):
        self.assertTrue((await self.ai.answer_text('No thanks'))[1])
        self.assertTrue((await self.ai.answer_text('Tama na'))[1])
        self.ai.client.post.assert_not_called()
        self.assertIsNone(self.ai.conversation.before_answer('No, how much does it cost?'))

    async def test_followups_include_bounded_context(self):
        await self.ai.answer_text('What is this test?')
        await self.ai.answer_text('Can you repeat that?')
        import json
        payload=self.ai.client.post.call_args.kwargs['json']
        data=json.loads(payload['messages'][-1]['content'])
        self.assertEqual(data['recentConversation'][0]['text'],'What is this test?')
        self.assertEqual(data['latestCustomerUtterance'],'Can you repeat that?')
        self.assertLessEqual(len(self.ai.history),4)
