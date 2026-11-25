"""Cache keys for locally generated script audio; never stores callee audio."""
import hashlib

def cache_name(text):
    return hashlib.sha256(('marco-voxgen-0.7.67|'+text.strip()).encode()).hexdigest()+'.pcm'

def tagalog_texts(service):
    from dialogue import MESSAGES,phrase
    if not service.get('greeting_tl') or any(not f.get('answer_tl') for f in service['faqs']):
        raise ValueError('Add approved Tagalog translations before preparing bilingual voice.')
    texts={phrase(key,'tl',service) for key in MESSAGES}
    texts.add(service['greeting_tl']+' '+phrase('stop_hint','tl',service))
    for faq in service['faqs']:
        if 'answer_tl' in faq:
            texts.add(faq['answer_tl'])
            texts.add(faq['answer_tl']+' '+phrase('answered','tl',service))
    return texts
