"""Fixed conversation copy shared by the caller and speech preparation."""
MESSAGES = {
 'stop': ('Understood. I will end the call now. Thank you for your time.', 'Sige po, tatapusin ko na ang tawag. Salamat sa oras ninyo.'),
 'done': ('Glad I could help. Thank you for your time. Goodbye!', 'Mabuti po kung nakatulong ako. Salamat sa oras ninyo. Paalam!'),
 'more': ('Okay. What else would you like to know?', 'Sige po. Ano pa ang gusto ninyong malaman?'),
 'decline': ('No problem. Thank you for your time. Goodbye!', 'Walang problema po. Salamat sa oras ninyo. Paalam!'),
 'help': ('Of course. What help do you need with {name}?', 'Sige po. Ano ang maitutulong ko tungkol sa {name}?'),
 'busy': ('No problem. I will end the call now. I have not scheduled another call. Thank you.', 'Sige po, tatapusin ko na ang tawag. Wala po akong naiskedyul na susunod na tawag. Salamat.'),
 'hello': ('Hello! This is {company}. What would you like to know?', 'Magandang araw po! Mula ito sa {company}. Ano po ang gusto ninyong malaman?'),
 'answered': ('Does that answer your question?', 'Nasagot po ba ang tanong ninyo?'),
 'language': ('Sure. I can continue in English. What would you like to know?', 'Sige po, magtatagalog tayo. Ano po ang gusto ninyong malaman?'),
 'repeat_what': ('What would you like me to repeat?', 'Alin po ang gusto ninyong ulitin ko?'),
 'not_heard': ('I did not catch that. Could you say it again?', 'Hindi ko po narinig nang malinaw. Pakiulit po ang tanong.'),
 'rephrase': ('I am not sure I understood. Could you rephrase your question?', 'Hindi ko po gaanong naintindihan. Puwede pong sabihin sa ibang paraan?'),
 'topics': ('I can explain the service, pricing, or how to contact the owner. Which would help?', 'Puwede nating pag-usapan ang serbisyo, presyo, o paano makontak ang may-ari. Alin po ang gusto ninyo?'),
 'unknown_end': ('I am sorry I could not answer your question. Thank you for your time. Goodbye.', 'Pasensya po, wala akong tiyak na sagot sa tanong ninyo. Salamat sa oras ninyo. Paalam.'),
 'stop_hint': ('You can say stop at any time.', 'Sabihin lang po kung gusto ninyong tapusin ang tawag.'),
 'silence_end': ('I have not heard a reply, so I will end the call. Thank you for your time.', 'Wala po akong narinig na sagot, kaya tatapusin ko na ang tawag. Salamat po.'),
 'limit_end': ('That is the end of this short test. Thank you for your time.', 'Tapos na po ang maikling pagsubok na ito. Salamat sa oras ninyo.'),
}

def phrase(key, language, service):
    return MESSAGES[key][1 if language=='tl' else 0].format(name=service['name'],company=service['company'])
