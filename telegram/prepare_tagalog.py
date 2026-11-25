import sys, json, subprocess, time
from pathlib import Path
import httpx
import argparse
from core import load_service
parser=argparse.ArgumentParser(description='Prepare approved Tagalog script audio through a local prototype synthesis server. Never reads callee recordings.')
parser.add_argument('--service',type=Path,required=True)
parser.add_argument('--cache',type=Path,required=True)
parser.add_argument('--reference',type=Path,required=True,help='Synthetic voice reference, not a real person recording')
args=parser.parse_args()
from voice_cache import cache_name,tagalog_texts
service=load_service(args.service)
cache=args.cache.resolve()
cache.mkdir(parents=True,exist_ok=True)
texts=sorted(tagalog_texts(service))
with httpx.Client(base_url='http://127.0.0.1:8093/',timeout=120,trust_env=False) as client:
 for index,text in enumerate(texts,1):
  path=cache/cache_name(text)
  if path.exists(): continue
  started=time.monotonic()
  response=client.post('v1/audio/speech',json={'input':text,'reference_audio_path':str(args.reference.resolve()),'control':'A friendly adult man speaking clear Tagalog at a conversational pace.','response_format':'wav','inference_timesteps':4,'max_steps':180,'seed':42})
  response.raise_for_status()
  converted=subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-i','pipe:0','-ar','24000','-ac','1','-f','s16le','pipe:1'],input=response.content,stdout=subprocess.PIPE,stderr=subprocess.PIPE,check=True).stdout
  if not 2400<len(converted)<=35*48000:raise ValueError('Generated script audio duration is outside call limits.')
  temporary=path.with_suffix('.tmp')
  temporary.write_bytes(converted)
  temporary.replace(path)
  print(f'Prepared Tagalog phrase {index}/{len(texts)} in {time.monotonic()-started:.1f}s',flush=True)
print('All approved Tagalog script audio is prepared.',flush=True)
