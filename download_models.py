#!/usr/bin/env python3
"""
CapZone - Local Sinhala ONNX, Bilingual English & Meta NLLB-200 Pre-Downloader
Pre-caches all 100% free local models & Sinhala/English dictionaries to disk (Zero paid APIs).
"""

import os
import urllib.request

os.environ.setdefault("HF_HUB_DISABLE_XET", "1")
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

print("==========================================================")
print("Caching CapZone 100% Free Fast Bilingual + NLLB Models...")
print("==========================================================")

from faster_whisper import WhisperModel
from huggingface_hub import snapshot_download
import transformers

from mms_engine import (
    EN_DICT_PATH,
    NLLB_CT2_REPO,
    NLLB_TOK_REPO,
    SI_DICT_PATH,
    WHISPER_EN_REPO,
    WHISPER_TINY_MULTI_REPO,
    load_w2v_sinhala_onnx,
)

print("[1/4] Downloading Sinhala & English Word-Frequency Dictionaries...")
os.makedirs(os.path.join(BASE_DIR, "dicts"), exist_ok=True)
if not os.path.exists(SI_DICT_PATH):
    urllib.request.urlretrieve(
        "https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/si/si_full.txt",
        SI_DICT_PATH,
    )
if not os.path.exists(EN_DICT_PATH):
    urllib.request.urlretrieve(
        "https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/en/en_50k.txt",
        EN_DICT_PATH,
    )

print("[2/4] Ensuring Fast Sinhala Wav2Vec2 ONNX INT8 Model...")
sess, proc = load_w2v_sinhala_onnx()
del sess, proc

print("[3/4] Caching English Bilingual Resolver (base.en & tiny INT8)...")
WhisperModel(WHISPER_EN_REPO, device="cpu", compute_type="int8")
WhisperModel(WHISPER_TINY_MULTI_REPO, device="cpu", compute_type="int8")

print("[4/4] Caching Meta NLLB-200 CT2 INT8 Offline Translator...")
snapshot_download(NLLB_CT2_REPO)
transformers.AutoTokenizer.from_pretrained(NLLB_TOK_REPO)

print("==========================================================")
print("All Fast Sinhala ONNX, Bilingual & NLLB-200 assets ready!")
print("==========================================================")
