import os
import unittest
from unittest.mock import patch
from worker import api_credentials


class InteractiveSetup(unittest.TestCase):
    def test_api_details_are_prompted_without_writing_to_environment(self):
        with patch.dict(os.environ,{},clear=True),patch('builtins.input',return_value='12345'),patch('getpass.getpass',return_value='a'*32):
            self.assertEqual(api_credentials(interactive=True),(12345,'a'*32))
            self.assertNotIn('TELEGRAM_API_HASH',os.environ)

    def test_invalid_details_are_rejected_without_network_activity(self):
        with patch.dict(os.environ,{'TELEGRAM_API_ID':'12345','TELEGRAM_API_HASH':'wrong'},clear=True):
            with self.assertRaises(ValueError):
                api_credentials()

    def test_noninteractive_calls_do_not_prompt_for_secrets(self):
        with patch.dict(os.environ,{},clear=True),patch('getpass.getpass') as prompt:
            with self.assertRaises(ValueError):
                api_credentials()
            prompt.assert_not_called()
