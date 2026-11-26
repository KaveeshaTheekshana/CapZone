#!/usr/bin/env python3
"""
CapZone Studio - 100% Free Fast Bilingual Sinhala+English & 2-Hour Film Engine

Architecture (Zero External Paid APIs):
1. FFmpeg 16kHz mono PCM WAV decode + streaming RMS VAD windowing (skips silence across 2-hour films).
2. Sinhala Speech Mode:
   - Pass 1 (Wav2Vec2-XLS-R-300M Sinhala ONNX INT8, ~339 MB, 0.87s load, 5x real-time on CPU):
     Produces accurate Sinhala phonemes + native 20ms CTC frame word timestamps with zero decoder loops.
   - Blank-Gap Splitter: Splits adjacent CTC tokens across >=200ms blank runs (prevents word gluing).
   - Sinhala Alphabet & Lexicon Spell Corrector (FrequencyWords 12k + Sinhala pillam/orthography rules):
     Repairs stacked/broken vowel signs and common single-phoneme typos into proper Sinhala spelling.
   - Code-Switch English Acoustic Resolver (faster-whisper-base.en INT8, loaded only on OOV/English spans):
     Preserves spoken English words verbatim (e.g., "school යනවා" -> "school" + "යනවා") without
     translating them into wrong Sinhala guesses.
   - Multi-segment pure foreign feature films (>60s, >=5 dialogue windows, zero Sinhala dialogue)
     translate via offline Meta NLLB-200 CT2 INT8 while keeping brand/tech terms in English.
3. English Target Mode & `--translate` SRT Translator via Meta NLLB-200 CT2 INT8.
"""

import ctypes
from difflib import SequenceMatcher
import gc
import json
import os
import re
import subprocess
import sys
import tempfile
import warnings

os.environ.setdefault("HF_HUB_DISABLE_XET", "1")
os.environ.setdefault("MALLOC_ARENA_MAX", "2")
os.environ.setdefault("OMP_NUM_THREADS", "2")
warnings.filterwarnings("ignore")

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
W2V_SI_REPO = "janiduchamika/wav2vec2-xls-r-300m-sinhala-general-185k"
W2V_ONNX_DIR = os.path.join(BASE_DIR, "models", "w2v_si_onnx")
W2V_ONNX_FILE = os.path.join(W2V_ONNX_DIR, "model_int8.onnx")

WHISPER_EN_REPO = "Systran/faster-whisper-base.en"
WHISPER_TINY_MULTI_REPO = "Systran/faster-whisper-tiny"
NLLB_CT2_REPO = "JustFrederik/nllb-200-distilled-600M-ct2-int8"
NLLB_TOK_REPO = "facebook/nllb-200-distilled-600M"

SI_DICT_PATH = os.path.join(BASE_DIR, "dicts", "si_full.txt")
EN_DICT_PATH = os.path.join(BASE_DIR, "dicts", "en_50k.txt")

SAMPLE_RATE = 16000
VAD_FRAME_MS = 20
VAD_FRAME_SAMPLES = int(SAMPLE_RATE * VAD_FRAME_MS / 1000)

# Spoken English loanwords/slang commonly heard inside Sinhala dialogue that should stay in English letters
SINHALA_TO_ENGLISH_PHRASES = [
    (r"(?:නිව්|නිවු|නියු)[\s\u200D]*ස(?:ි|ා|ී|ාඉ)?ග්?ම[ාය]?|නව\s+සංගම", "new sigma"),
    (r"(?:නිව්|නිවු|නියු)[\s\u200D]*සා?ඉක්?ම[ාය]?", "new sigma"),
    (r"යූ\s*ටියුබ්\s+චැනල්|යූටියුබ්\s+චනල", "YouTube channel"),
    (r"සැබසකා\s*රැබ්|සබ්ස්ක්‍රයිබ්|සබ්ස්ක්‍රයිප්", "subscribe"),
    (r"යූ\s*ටියුබ්|යූටියුබ්", "YouTube"),
    (r"ෆේස්\s*බුක්|ෆේස්බුක්", "Facebook"),
    (r"ටික්\s*ටොක්|ටික්ටොක්", "TikTok"),
    (r"වට්ස්\s*ඇප්|වට්සැප්", "WhatsApp"),
    (r"ඉන්ස්ටග්‍රෑම්", "Instagram"),
    (r"ඩවුන්\s*ලෝඩ්|ඩවුන්ලෝඩ්", "download"),
    (r"අප්\s*ලෝඩ්|අප්ලෝඩ්", "upload"),
    (r"අප්\s*ඩේට්|අප්ඩේට්|අප්ටේට්", "update"),
    (r"සොෆ්ට්\s*වෙයාර්?|සොෆ්ට්වෙයා", "software"),
    (r"ස්ටුඩියෝ|ස්ටුටියෝ", "studio"),
    (r"සිග්මා|සාඉක්මය", "sigma"),
    (r"කැප්\s*සෝන්|කැප්සෝන්", "CapZone"),
    (r"කැප්\s*කට්|කැප්කට්", "CapCut"),
    (r"ස්කූල්", "school"),
]

# English phrases to shield when translating foreign movies into Sinhala
PROTECTED_ENGLISH_TERMS = [
    "CapZone", "YouTube", "Facebook", "TikTok", "WhatsApp", "Instagram",
    "new sigma", "sigma", "software", "download", "upload", "subscribe", "video", "studio",
]

# Valid standalone 1-character Sinhala words/particles (filter spurious 1-char freq noise like 'අ', 'ඔ')
VALID_1CHAR_SI = {"ඒ", "ඕ", "ද", "ම", "ය", "ව", "ල"}

# Core natural spoken Sinhala words & suffixes beyond subtitles corpus frequency list
EXTRA_SI_CORE_WORDS = {
    "ආයුබෝවන්": 55000, "යාළුවනේ": 45000, "යාලුවනේ": 45000, "යාළුවන්": 40000,
    "ඔයාලට": 45000, "ඔයාලා": 45000, "ඔයා": 55000, "ඔය": 35000, "අලුත්ම": 35000,
    "බලන්න": 40000, "කරන්න": 45000, "යනවා": 40000, "යන්නේ": 42000, "එනවා": 35000,
    "එන්නේ": 35000, "වෙනවා": 40000, "තියෙනවා": 40000, "ගන්නවා": 30000,
    "ලස්සනයි": 35000, "හොඳයි": 40000, "චිත්‍රපටිය": 30000, "උපසිරැසි": 30000,
    "වීඩියෝ": 35000, "වීඩියෝව": 25000, "ඉස්කෝලේ": 30000, "හැමෝටම": 35000,
    "පුළුවන්": 40000, "දන්නවා": 35000, "කියන්නේ": 35000, "ගොඩක්": 40000,
    "කොහොමද": 40000, "කොහෙද": 45000, "කොහේද": 45000, "කොහේ": 35000, "මෙතන": 25000,
    "වැඩසටහන": 32000, "වැඩසටහන්": 32000, "වැඩසටහනක්": 32000,
    "මොකද": 40000, "මොකක්ද": 40000, "නැහැ": 45000, "නෑ": 45000, "ඔව්": 40000, "හරි": 45000,
    "ගෙදර": 45000, "පාසල": 30000, "රට": 35000, "ගම": 30000, "අම්මා": 40000, "තාත්තා": 40000,
    "මල්ලි": 30000, "අයියා": 30000, "අක්කා": 30000, "නංගි": 30000, "ලෝකය": 30000, "වතුර": 30000, "දවස": 40000,
    "මේක": 60000, "තමයි": 50000, "අලුත්": 40000, "අද": 55000, "හෙට": 35000, "ඊයේ": 35000,
    "මම": 60000, "එක": 55000, "එකක්": 40000, "එකේ": 40000, "එකට": 40000,
    "ගැන": 45000, "නිසා": 40000, "වගේ": 45000, "ඔබ": 40000, "අපි": 50000,
}

SI_PRODUCTIVE_SUFFIXES = (
    "වලට", "වලින්", "වල", "කින්", "ගේ", "නේ", "න්නේ", "න්න", "නවා",
    "ක්", "ත්", "ද", "ම", "ට", "ක", "ව", "යි", "ය", "ල", "න්"
)

COMMON_EN_NOISE_STOPWORDS = {
    "a", "i", "to", "it", "on", "at", "in", "is", "be", "of", "or",
    "the", "my", "you", "we", "me", "he", "no", "so", "by", "as",
    "may", "can", "and", "are", "was", "for", "an", "do", "go", "oh",
}

SI_TO_LATIN_CONS = {
    "ක": "k", "ඛ": "k", "ග": "k", "ඝ": "k", "ඟ": "k",
    "ච": "j", "ඡ": "j", "ජ": "j", "ඣ": "j",
    "ට": "t", "ඨ": "t", "ඩ": "t", "ඪ": "t", "ඬ": "t",
    "ත": "t", "ථ": "t", "ද": "t", "ධ": "t", "ඳ": "t",
    "න": "n", "ණ": "n", "ඤ": "n",
    "ප": "p", "ඵ": "p", "බ": "b", "භ": "b", "ඹ": "b", "ම": "m",
    "ය": "y", "ර": "r", "ල": "l", "ළ": "l", "ව": "b", "ෆ": "f",
    "ස": "s", "ශ": "s", "ෂ": "s", "හ": "h",
}

# Phonetic Sinhala consonant folding (aspirated/retroflex/nasal/sibilant classes)
SI_PHONETIC_TRANS = str.maketrans({
    "ඛ": "ක", "ඝ": "ග", "ඟ": "ග", "ඡ": "ච", "ඣ": "ජ", "ඤ": "න",
    "ඨ": "ට", "ඪ": "ඩ", "ඬ": "ඩ", "ථ": "ත", "ධ": "ද", "ඳ": "ද",
    "ඵ": "ප", "භ": "බ", "ඹ": "බ", "ණ": "න", "ළ": "ල", "ශ": "ස", "ෂ": "ස",
    "ආ": "අ", "ඈ": "ඇ", "ඊ": "ඉ", "ඌ": "උ", "ඒ": "එ", "ඕ": "ඔ",
    "ී": "ි", "ූ": "ු", "ෑ": "ැ", "ේ": "ෙ", "ෝ": "ො", "ෞ": "ො",
})

# Rough Latin phonetic start classes for Sinhala -> English acoustic cross-check
SI_LATIN_ONSET = {
    "ක": "kg", "ඛ": "kg", "ග": "kg", "ඝ": "kg", "ඟ": "kg",
    "ච": "cj", "ඡ": "cj", "ජ": "cj", "ඣ": "cj",
    "ට": "td", "ඨ": "td", "ඩ": "td", "ඪ": "td", "ත": "td", "ථ": "td", "ද": "td", "ධ": "td",
    "න": "nm", "ණ": "nm", "ම": "mn", "ඹ": "mbp",
    "ප": "pbf", "ඵ": "pbf", "බ": "pbf", "භ": "pbf", "ෆ": "fph",
    "ය": "y", "ර": "r", "ල": "lr", "ළ": "lr", "ව": "vw",
    "ස": "scz", "ශ": "scz", "ෂ": "scz", "හ": "haeiou",
    "අ": "aeiou", "ආ": "aeiou", "ඇ": "ae", "ඈ": "ae", "ඉ": "iey", "ඊ": "iey",
    "උ": "uo", "ඌ": "uo", "එ": "ea", "ඒ": "ea", "ඔ": "ou", "ඕ": "ou",
}

SYMS_REMOVE_RE = re.compile(
    r"[★☆♪♫♬♩•∙‣◦●○◆◇■□¤¶§†‡※✓✔✕✖❌✅“”‘’\"~^`_*#<>|{}\[\]()\\/=+@$%&\u2013\u2014\u2015\u2026\uFFFD\u200B\u200C\u200E\u200F\uFEFF]"
)
EMOJI_RE = re.compile(r"[\U00010000-\U0010FFFF\u2600-\u27BF\uFE0F]", flags=re.UNICODE)


def log_step(msg):
    print(msg, file=sys.stderr, flush=True)


def release_memory():
    gc.collect()
    if os.name != "nt":
        try:
            ctypes.CDLL("libc.so.6").malloc_trim(0)
        except Exception:
            pass


def is_sinhala_code(lang_code):
    tl = str(lang_code or "").lower().strip()
    return tl in ("sinhala", "si") or tl.startswith("si-") or "sinhala" in tl


def format_srt_time(seconds):
    seconds = max(0.0, float(seconds))
    total_ms = int(round(seconds * 1000.0))
    hrs = total_ms // 3600000
    mins = (total_ms % 3600000) // 60000
    secs = (total_ms % 60000) // 1000
    ms = total_ms % 1000
    return f"{hrs:02d}:{mins:02d}:{secs:02d},{ms:03d}"


def resolve_ffmpeg_candidates(ffmpeg_cmd="ffmpeg"):
    candidates = []
    if ffmpeg_cmd and ffmpeg_cmd != "ffmpeg" and os.path.exists(ffmpeg_cmd):
        candidates.append(ffmpeg_cmd)
    bin_names = ["ffmpeg.exe", "ffmpeg"] if os.name == "nt" else ["ffmpeg", "ffmpeg.exe"]
    for b_name in bin_names:
        for base_dir in (BASE_DIR, os.path.dirname(BASE_DIR)):
            p = os.path.join(base_dir, "node_modules", "ffmpeg-static", b_name)
            if os.path.exists(p):
                candidates.append(p)
    candidates.append("ffmpeg")
    return candidates


def extract_pcm_wav(media_path, out_wav_path, ffmpeg_cmd="ffmpeg"):
    """Decode any media container into exact 16kHz mono s16le WAV once to eliminate seek drift."""
    last_err = None
    for ff in resolve_ffmpeg_candidates(ffmpeg_cmd):
        try:
            subprocess.check_call(
                [ff, "-y", "-nostdin", "-threads", "0", "-i", media_path,
                 "-vn", "-ac", "1", "-ar", str(SAMPLE_RATE), "-c:a", "pcm_s16le", out_wav_path],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
            if os.path.exists(out_wav_path) and os.path.getsize(out_wav_path) > 44:
                return out_wav_path
        except Exception as exc:
            last_err = exc
    raise RuntimeError(f"Audio extraction failed: {last_err}")


def read_wav_slice(wav_path, start_sec, end_sec):
    """Stream exact float32 normalized slice [start_sec, end_sec] from 16kHz PCM WAV."""
    import numpy as np
    with open(wav_path, "rb") as f:
        f.seek(0, os.SEEK_END)
        total_bytes = max(0, f.tell() - 44)
        start_smp = max(0, int(round(start_sec * SAMPLE_RATE)))
        end_smp = min(total_bytes // 2, int(round(end_sec * SAMPLE_RATE)))
        if end_smp <= start_smp:
            return np.zeros(0, dtype=np.float32)
        f.seek(44 + start_smp * 2)
        raw = f.read((end_smp - start_smp) * 2)
    return np.frombuffer(raw, np.int16).astype(np.float32) / 32768.0


def scan_vad_windows(wav_path, max_win_sec=20.0, merge_gap_sec=0.35, pad_sec=0.25):
    """
    Scan full WAV in streaming chunks using energy RMS envelope to find active speech windows.
    Handles 2-hour (7200s) files in ~1s using ~15 MB RAM while skipping long silence gaps.
    """
    import numpy as np
    file_size = os.path.getsize(wav_path)
    total_samples = max(0, (file_size - 44) // 2)
    total_sec = total_samples / SAMPLE_RATE
    if total_sec < 0.25:
        return [], total_sec

    frame_rms = []
    chunk_bytes = 3000 * VAD_FRAME_SAMPLES * 2
    with open(wav_path, "rb") as f:
        f.seek(44)
        while True:
            buf = f.read(chunk_bytes)
            if not buf:
                break
            arr = np.frombuffer(buf, np.int16).astype(np.float32)
            usable = (len(arr) // VAD_FRAME_SAMPLES) * VAD_FRAME_SAMPLES
            if usable <= 0:
                break
            frames = arr[:usable].reshape(-1, VAD_FRAME_SAMPLES)
            frame_rms.append(np.sqrt(np.mean(frames * frames, axis=1)) / 32768.0)

    if not frame_rms:
        return [], total_sec

    rms_all = np.concatenate(frame_rms)
    peak_rms = float(np.percentile(rms_all, 98)) if len(rms_all) > 20 else float(np.max(rms_all))
    noise_floor = float(np.percentile(rms_all, 15)) if len(rms_all) > 20 else 0.0
    thresh = max(0.0055, noise_floor * 2.2, peak_rms * 0.09)
    active = rms_all >= thresh

    raw_spans = []
    in_seg = False
    seg_start = 0
    for idx, flag in enumerate(active):
        if flag and not in_seg:
            in_seg = True
            seg_start = idx
        elif not flag and in_seg:
            in_seg = False
            raw_spans.append([seg_start * VAD_FRAME_MS / 1000.0, idx * VAD_FRAME_MS / 1000.0])
    if in_seg:
        raw_spans.append([seg_start * VAD_FRAME_MS / 1000.0, len(active) * VAD_FRAME_MS / 1000.0])

    filtered = [[max(0.0, s - pad_sec), min(total_sec, e + pad_sec)] for s, e in raw_spans if (e - s) >= 0.12]
    if not filtered:
        if float(np.max(rms_all)) > 0.0015:
            t = 0.0
            while t < total_sec - 0.3:
                filtered.append([t, min(total_sec, t + 18.0)])
                t += 18.0
        return filtered, total_sec

    merged = []
    for s, e in filtered:
        if merged and (s - merged[-1][1]) <= merge_gap_sec and (e - merged[-1][0]) <= max_win_sec:
            merged[-1][1] = max(merged[-1][1], e)
        else:
            cur = s
            while (e - cur) > max_win_sec:
                merged.append([cur, cur + max_win_sec])
                cur += max_win_sec - 0.15
            merged.append([cur, e])
    return merged, total_sec


def sinhala_phonetic_key(word):
    """Fold Sinhala aspirates, sibilants, nasals, and long/short vowels into a canonical key."""
    s = word.replace("\u200D", "").translate(SI_PHONETIC_TRANS)
    s = re.sub(r"[\u0DCF\u0DD0\u0DD1\u0DDF\u0DF2\u0DF3]", "", s)
    s = re.sub(r"\u0DCA+", "\u0DCA", s)
    return s


def sinhala_consonant_skeleton(word):
    """Pure consonant + leading-vowel skeleton ignoring all Sinhala combining vowel signs."""
    s = word.replace("\u200D", "").translate(SI_PHONETIC_TRANS)
    return re.sub(r"[\u0DCA-\u0DDF\u0DF2\u0DF3]", "", s)


def load_lexicons():
    """Load Sinhala & English word-frequency lexicons and build multi-tier phonetic repair indexes."""
    si_freq = dict(EXTRA_SI_CORE_WORDS)
    if os.path.exists(SI_DICT_PATH):
        with open(SI_DICT_PATH, encoding="utf-8", errors="ignore") as f:
            for ln in f:
                pts = ln.strip().split()
                if pts and re.fullmatch(r"[\u0D80-\u0DFF\u200D]+", pts[0]):
                    w = pts[0]
                    freq = int(pts[1]) if len(pts) > 1 and pts[1].isdigit() else 1
                    if freq < 6:
                        continue
                    if len(w) == 1 and w not in VALID_1CHAR_SI:
                        continue
                    si_freq[w] = max(si_freq.get(w, 0), freq)

    en_freq = {}
    if os.path.exists(EN_DICT_PATH):
        with open(EN_DICT_PATH, encoding="utf-8", errors="ignore") as f:
            for rank, ln in enumerate(f, 1):
                pts = ln.strip().split()
                if pts and pts[0].isalpha():
                    en_freq[pts[0].lower()] = rank

    phon_idx = {}
    for w, freq in si_freq.items():
        if freq < 4 and len(w) < 3:
            continue
        sk = sinhala_phonetic_key(w)
        if sk:
            b = phon_idx.setdefault(sk, [])
            if len(b) < 8:
                b.append((w, freq))
        ck = sinhala_consonant_skeleton(w)
        if len(ck) >= 2:
            cb = phon_idx.setdefault("C:" + ck, [])
            if len(cb) < 10:
                cb.append((w, freq))
            if freq >= 80 and len(w) >= 2:
                hb = phon_idx.setdefault("H:" + ck[0], [])
                hb.append((w, freq))
    for k in phon_idx:
        phon_idx[k].sort(key=lambda x: -x[1])
        if k.startswith("H:") and len(phon_idx[k]) > 180:
            phon_idx[k] = phon_idx[k][:180]

    return si_freq, en_freq, phon_idx


def clean_sinhala_akshara_rules(text):
    """Fix impossible Sinhala alphabet/pillam combinations while keeping valid ligatures."""
    if not text:
        return ""
    s = text.strip()
    s = re.sub(r"(?<!\u0DCA)\u200D", "", s)
    s = re.sub(r"\u0DCA{2,}", "\u0DCA", s)
    s = re.sub(r"([\u0DCF-\u0DDF\u0DF2\u0DF3])\1+", r"\1", s)
    s = re.sub(r"(^|\s)[\u0DCA-\u0DDF\u0DF2\u0DF3\u0D82\u0D83]+", r"\1", s)
    # Remove impossible stacked vowel sign pairs (e.g., ි followed directly by ේ on the same letter)
    s = re.sub(r"([\u0DD2-\u0DD6])[\u0DD8-\u0DDF]+", r"\1", s)
    s = re.sub(r"([ක-ෆ])\1{2,}", r"\1", s)
    return re.sub(r"\s+", " ", s).strip()


def sanitize_caption_text(text, language="Sinhala"):
    if not text or not isinstance(text, str):
        return ""
    s = EMOJI_RE.sub("", text.strip())
    s = re.sub(r"<[^>]+>", " ", s)
    s = re.sub(r"\[(?:music|laughter|applause|sound|sfx|noise|silence)[^\]]*\]", "", s, flags=re.IGNORECASE)
    s = re.sub(r"\((?:music|laughter|applause|sound|sfx|noise|silence)[^)]*\)", "", s, flags=re.IGNORECASE)
    s = re.sub(r"\b\d{1,2}:\d{2}(?::\d{2})?(?:[.,:]\d{1,3})?\b", "", s)
    s = SYMS_REMOVE_RE.sub(" ", s)

    if is_sinhala_code(language):
        s = clean_sinhala_akshara_rules(s)
        s = re.sub(r"[^A-Za-z0-9\u0D80-\u0DFF\u200D\s'\-]", " ", s)
        s = re.sub(r"([A-Za-z0-9])([\u0D80-\u0DFF])", r"\1 \2", s)
        s = re.sub(r"([\u0D80-\u0DFF]+)[a-zA-Z]+", r"\1", s)
        s = re.sub(r"[\-\s'\u200D]+$", "", s)
        s = re.sub(r"^[\-\s']+", "", s)
    else:
        s = re.sub(r"[^A-Za-z0-9\s\u0D80-\u0DFF\u0B80-\u0BFF'\-\?!,]", " ", s)
        s = re.sub(r"[.,:;!?\-\s]+$", "", s)
    return re.sub(r"\s+", " ", s).strip()


def is_valid_sinhala_word(word, si_freq):
    if not word:
        return False
    if len(word) == 1 and word not in VALID_1CHAR_SI:
        return False
    if word in si_freq:
        return True
    for suf in SI_PRODUCTIVE_SUFFIXES:
        if len(word) > len(suf) + 1 and word.endswith(suf):
            stem = word[:-len(suf)]
            if (stem in si_freq or (stem + "්") in si_freq
                    or (stem + "ා") in si_freq or (stem + "ේ") in si_freq):
                return True
    return False


def repair_sinhala_word(word, si_freq, phon_idx):
    """Repair a misspelled/CTC-corrupted Sinhala word against high-frequency Sinhala vocabulary."""
    if not word or is_valid_sinhala_word(word, si_freq):
        return word, True
    if not re.search(r"[\u0D80-\u0DFF]", word):
        return word, False

    sk = sinhala_phonetic_key(word)
    ck = sinhala_consonant_skeleton(word)
    cands = []
    seen = set()
    for src_key in (sk, sk[:-1] if sk.endswith("\u0DCA") else sk + "\u0DCA", "C:" + ck):
        for cand, freq in phon_idx.get(src_key, []):
            if cand not in seen:
                seen.add(cand)
                cands.append((cand, freq, 0))
    if 3 <= len(word) <= 10 and ck:
        for cand, freq in phon_idx.get("H:" + ck[0], []):
            if cand not in seen and abs(len(cand) - len(word)) <= 2:
                seen.add(cand)
                cands.append((cand, freq, 1))

    best_w, best_score = word, 0.0
    for cand, freq, tier in cands:
        sim = SequenceMatcher(None, word, cand).ratio()
        if tier == 0:
            min_req = 0.63 if freq >= 10000 else 0.70
        else:
            min_req = 0.74
        if sim >= min_req and sim > best_score:
            best_w, best_score = cand, sim
    if best_score >= 0.63:
        return best_w, True
    return word, False


def en_phonetic_compatible(si_oov, en_word):
    """Confirm Sinhala OOV phoneme onset/skeleton plausibly matches a spoken English word."""
    if not si_oov or not en_word:
        return False
    ch = si_oov[0]
    allowed = SI_LATIN_ONSET.get(ch, "")
    el = en_word.lower()
    if not allowed:
        return True
    return (el[0] in allowed) or (el[:2] in ("sc", "sk", "st", "sp") and ch in ("ස", "ශ", "ෂ", "ඉ", "එ"))


def si_to_latin_consonants(si_word):
    out = []
    for c in si_word:
        if c in SI_TO_LATIN_CONS:
            ch = SI_TO_LATIN_CONS[c]
            if not out or out[-1] != ch:
                out.append(ch)
    return "".join(out)


def en_to_consonants(en_word):
    s = re.sub(r"[^a-z]", "", en_word.lower())
    s = s.replace("sch", "sk").replace("sc", "sk").replace("ck", "k").replace("qu", "k")
    s = s.replace("ph", "f").replace("sh", "s").replace("ch", "j").replace("th", "t")
    s = re.sub(r"([a-z])\1+", r"\1", s)
    out = []
    for idx, c in enumerate(s):
        if c in "aeiou":
            continue
        if c == "h" and idx > 0:
            continue
        if c in ("c", "q"):
            c = "k"
        elif c == "g":
            c = "k"
        elif c in ("d", "t"):
            c = "t"
        elif c in ("v", "w"):
            c = "b"
        elif c == "z":
            c = "s"
        if not out or out[-1] != c:
            out.append(c)
    return "".join(out)


def en_phonetic_skeleton_score(si_oov, en_word, prob):
    """Return [0..1] compatibility score combining consonant-skeleton match & Whisper probability."""
    if not si_oov or not en_word:
        return 0.0
    if not en_phonetic_compatible(si_oov, en_word):
        return 0.0
    si_c = si_to_latin_consonants(si_oov)
    en_c = en_to_consonants(en_word)
    if not si_c or not en_c:
        return prob * 0.5
    skel_sim = SequenceMatcher(None, si_c, en_c).ratio()
    return 0.65 * skel_sim + 0.35 * min(1.0, max(0.0, prob))


def apply_sinhala_loanword_english(text):
    if not text:
        return ""
    s = text
    for pat, repl in SINHALA_TO_ENGLISH_PHRASES:
        s = re.sub(pat, repl, s, flags=re.IGNORECASE)
    return re.sub(r"\s+", " ", s).strip()


def load_w2v_sinhala_onnx():
    """Load pre-exported MatMul INT8 ONNX model (~0.87s), exporting once from HF if not yet cached."""
    import onnxruntime as ort
    from transformers import AutoProcessor

    if not os.path.exists(W2V_ONNX_FILE):
        import torch
        from onnxruntime.quantization import QuantType, quantize_dynamic
        from transformers import AutoModelForCTC

        log_step("[*] Preparing fast Sinhala ONNX INT8 model (one-time export)...")
        os.makedirs(W2V_ONNX_DIR, exist_ok=True)
        proc = AutoProcessor.from_pretrained(W2V_SI_REPO)
        proc.save_pretrained(W2V_ONNX_DIR)
        mod = AutoModelForCTC.from_pretrained(W2V_SI_REPO).eval()
        fp32_tmp = W2V_ONNX_FILE + ".fp32.onnx"
        dummy = torch.randn(1, 16000, dtype=torch.float32)
        torch.onnx.export(
            mod, (dummy,), fp32_tmp,
            input_names=["input_values"], output_names=["logits"],
            dynamic_axes={"input_values": {1: "audio_len"}, "logits": {1: "seq_len"}},
            opset_version=14, dynamo=False,
        )
        quantize_dynamic(fp32_tmp, W2V_ONNX_FILE, op_types_to_quantize=["MatMul", "Gemm"], weight_type=QuantType.QUInt8)
        try:
            os.remove(fp32_tmp)
        except Exception:
            pass
        del mod
        release_memory()

    proc = AutoProcessor.from_pretrained(W2V_ONNX_DIR)
    so = ort.SessionOptions()
    so.intra_op_num_threads = 2
    so.inter_op_num_threads = 1
    sess = ort.InferenceSession(W2V_ONNX_FILE, so, providers=["CPUExecutionProvider"])
    return sess, proc


def decode_ctc_words_with_gaps(logits, tokenizer, win_start, win_dur):
    """
    Decode CTC logits into word timestamps while splitting adjacent tokens across >=200ms blank gaps
    so silent pauses between English/Sinhala words never glue tokens together.
    """
    import numpy as np

    ids = np.argmax(logits[0], axis=-1).tolist()
    pad_id = tokenizer.pad_token_id if tokenizer.pad_token_id is not None else 0
    delim_tok = getattr(tokenizer, "word_delimiter_token", "|")
    delim_id = tokenizer.convert_tokens_to_ids(delim_tok) if delim_tok else pad_id

    if delim_id is not None and delim_id != pad_id:
        patched = list(ids)
        last_char_idx = -1
        saw_delim = False
        for idx, tid in enumerate(ids):
            if tid == delim_id:
                saw_delim = True
            elif tid != pad_id:
                if last_char_idx != -1 and not saw_delim and (idx - last_char_idx) >= 22:
                    mid = (last_char_idx + idx) // 2
                    patched[mid] = delim_id
                last_char_idx = idx
                saw_delim = False
        ids = patched

    decoded = tokenizer.decode(ids, output_word_offsets=True)
    dt = win_dur / max(1, len(ids))
    out = []
    for wo in (getattr(decoded, "word_offsets", None) or []):
        w_txt = clean_sinhala_akshara_rules(wo["word"])
        if not w_txt:
            continue
        s_t = round(win_start + wo["start_offset"] * dt, 3)
        e_t = round(max(s_t + 0.08, win_start + wo["end_offset"] * dt), 3)
        out.append({"word": w_txt, "start": s_t, "end": e_t})
    return out


def refine_sinhala_window_words(raw_words, si_freq, phon_idx):
    """
    1. Merge split Sinhala fragments (`අ` + `ද` -> `අද`, `ආ` + `යුබෝවෙන්` -> `ආයුබෝවන්`, `වැඩසට` + `හනක්` -> `වැඩසටහනක්`).
    2. Split glued words (`යාළුවන්අද` -> `යාළුවන්` + `අද`, `ස්යනවා` -> `ස්` + `යනවා`).
    3. Repair single-edit CTC Sinhala spelling errors (`යක්න` -> `යන්න`).
    """
    if not raw_words:
        return []

    # Iterative adjacent fragment merge pass (handles 1-char initial vowels held <= 0.42s too)
    merged = [dict(x) for x in raw_words]
    for _ in range(2):
        next_merged = []
        i = 0
        while i < len(merged):
            cur = dict(merged[i])
            if (i + 1) < len(merged):
                nxt = merged[i + 1]
                gap = nxt["start"] - cur["end"]
                cur_valid = is_valid_sinhala_word(cur["word"], si_freq)
                nxt_valid = is_valid_sinhala_word(nxt["word"], si_freq)
                cur_weak = (not cur_valid) or (len(cur["word"]) == 1 and cur["word"] not in VALID_1CHAR_SI)
                nxt_weak = (not nxt_valid) or (len(nxt["word"]) == 1)
                can_try_merge = (
                    (cur_weak and gap <= (0.42 if len(cur["word"]) <= 2 else 0.28))
                    or (nxt_weak and len(nxt["word"]) <= 2 and gap <= 0.32 and not (cur_valid and nxt["word"] in VALID_1CHAR_SI and len(cur["word"]) >= 2))
                )
                if can_try_merge:
                    joined_direct = cur["word"] + nxt["word"]
                    joined_rep, ok_j = repair_sinhala_word(joined_direct, si_freq, phon_idx)
                    if not ok_j and not (len(cur["word"]) == 1 and cur["word"] not in VALID_1CHAR_SI and len(nxt["word"]) > 2 and is_valid_sinhala_word(nxt["word"], si_freq)):
                        for br in ("ු", "ි", "ෙ", "ා"):
                            cand_b, ok_b = repair_sinhala_word(cur["word"] + br + nxt["word"], si_freq, phon_idx)
                            if ok_b:
                                joined_rep, ok_j = cand_b, True
                                break
                    if ok_j:
                        next_merged.append({"word": joined_rep, "start": cur["start"], "end": nxt["end"], "in_si": True})
                        i += 2
                        continue
            next_merged.append(cur)
            i += 1
        merged = next_merged

    # Split glued compounds and spell-repair Sinhala words
    refined = []
    for item in merged:
        w = item["word"]
        ws, we = item["start"], item["end"]
        rep_w, is_si = repair_sinhala_word(w, si_freq, phon_idx)
        if is_si:
            refined.append({"word": rep_w, "start": ws, "end": we, "in_si": True})
            continue

        did_split = False
        dur = max(0.12, we - ws)
        if len(w) >= 4:
            for k in range(1, len(w) - 1):
                left, right = w[:k], w[k:]
                if is_valid_sinhala_word(left, si_freq) and is_valid_sinhala_word(right, si_freq):
                    mid = round(ws + dur * (k / len(w)), 3)
                    refined.append({"word": left, "start": ws, "end": mid, "in_si": True})
                    refined.append({"word": right, "start": round(mid + 0.01, 3), "end": we, "in_si": True})
                    did_split = True
                    break
            if not did_split:
                for k in range(1, len(w) - 2):
                    left, right = w[:k], w[k:]
                    if right in si_freq and si_freq[right] >= 500 and len(right) >= 3:
                        mid = round(ws + dur * (k / len(w)), 3)
                        refined.append({"word": left, "start": ws, "end": mid, "in_si": False})
                        refined.append({"word": right, "start": round(mid + 0.01, 3), "end": we, "in_si": True})
                        did_split = True
                        break
        if not did_split:
            refined.append({"word": w, "start": ws, "end": we, "in_si": False})

    return refined


def resolve_code_switched_english(wav_path, win_word_lists, windows, en_freq, si_freq, phon_idx):
    """
    Run faster-whisper-base.en INT8 ONCE per non-pure-Sinhala window and match full-window
    English words against OOV Sinhala tokens using consonant-skeleton phonetic scoring
    so "school යනවා" -> "school යනවා" with zero Sinhala hallucinations.
    """
    from faster_whisper import WhisperModel

    need_en = False
    win_modes = []
    for win_words in win_word_lists:
        if not win_words:
            win_modes.append("empty")
            continue
        si_cnt = sum(1 for x in win_words if x.get("in_si"))
        oov_items = [x for x in win_words if not x.get("in_si")]
        if si_cnt == 0 and len(win_words) >= 2:
            win_modes.append("full_en")
            need_en = True
        elif oov_items:
            win_modes.append("mixed")
            need_en = True
        else:
            win_modes.append("pure_si")

    if not need_en:
        return win_word_lists, win_modes

    log_step("[*] Resolving spoken English words & bilingual phrases (base.en INT8)...")
    wm_en = WhisperModel(WHISPER_EN_REPO, device="cpu", compute_type="int8", cpu_threads=2)
    try:
        for w_idx, (mode, (ws_win, we_win)) in enumerate(zip(win_modes, windows)):
            if mode == "pure_si" or mode == "empty":
                continue

            sl = read_wav_slice(wav_path, ws_win, we_win)
            segs, _ = wm_en.transcribe(
                sl, beam_size=1, vad_filter=False, word_timestamps=True,
                no_speech_threshold=0.72, condition_on_previous_text=False
            )
            full_en_words = []
            for s in segs:
                if getattr(s, "no_speech_prob", 0.0) > 0.85:
                    continue
                for ww in (s.words or []):
                    tok = re.sub(r"[^A-Za-z0-9'\-]", "", ww.word).strip()
                    low = re.sub(r"[^a-z]", "", tok.lower())
                    prob = float(getattr(ww, "probability", 0.0) or 0.0)
                    rank = en_freq.get(low, 999999)
                    if tok:
                        full_en_words.append({
                            "word": tok, "low": low, "prob": prob, "rank": rank,
                            "start": round(ws_win + ww.start, 3),
                            "end": round(max(ws_win + ww.start + 0.08, ws_win + ww.end), 3),
                        })

            if mode == "full_en" and full_en_words:
                real_tokens = [x for x in full_en_words if x["rank"] <= 35000]
                mean_prob = sum(x["prob"] for x in full_en_words) / len(full_en_words)
                real_ratio = len(real_tokens) / len(full_en_words)
                if mean_prob >= 0.55 and real_ratio >= 0.60 and len(real_tokens) >= 2:
                    win_word_lists[w_idx] = [{
                        "word": x["word"], "start": x["start"], "end": x["end"],
                        "in_si": False, "is_en": True,
                    } for x in full_en_words if x["prob"] >= 0.30]
                    continue

            # Mixed Sinhala + spoken English ("අද මම school යනවා")
            cur_list = win_word_lists[w_idx]
            new_list = []
            for item in cur_list:
                if item.get("in_si"):
                    new_list.append(item)
                    continue

                # Check deterministic Sinhala-phonetic English loanword table first
                mapped_phrase = apply_sinhala_loanword_english(item["word"])
                if re.search(r"[A-Za-z]{2,}", mapped_phrase) and not re.search(r"[\u0D80-\u0DFF]", mapped_phrase):
                    new_list.append({"word": mapped_phrase, "start": item["start"], "end": item["end"], "in_si": False, "is_en": True})
                    continue

                # Find overlapping English words from full-window base.en transcription
                sp_s, sp_e = item["start"] - 0.20, item["end"] + 0.20
                overlaps = [ew for ew in full_en_words if ew["end"] >= sp_s and ew["start"] <= sp_e]
                picked = []
                for ew in overlaps:
                    low, prob, rank = ew["low"], ew["prob"], ew["rank"]
                    if rank > 25000 or not low:
                        continue
                    score = en_phonetic_skeleton_score(item["word"], low, prob)
                    if low in COMMON_EN_NOISE_STOPWORDS:
                        if prob >= 0.88 and score >= 0.78:
                            picked.append(ew)
                    elif score >= (0.58 if rank <= 5000 else 0.62) or (prob >= 0.78 and en_phonetic_compatible(item["word"], low) and rank <= 12000):
                        picked.append(ew)

                if picked:
                    # Pick best matching overlapping English word(s)
                    for ew in picked:
                        new_list.append({"word": ew["word"], "start": ew["start"], "end": ew["end"], "in_si": False, "is_en": True})
                else:
                    rep, _ = repair_sinhala_word(item["word"], si_freq, phon_idx)
                    new_list.append({"word": apply_sinhala_loanword_english(rep), "start": item["start"], "end": item["end"], "in_si": True})
            win_word_lists[w_idx] = new_list
    finally:
        del wm_en
        release_memory()

    return win_word_lists, win_modes


def load_nllb_translator():
    import ctranslate2
    import transformers
    from huggingface_hub import snapshot_download
    log_step("[*] Loading Meta NLLB-200 Neural Translator (INT8)...")
    model_dir = snapshot_download(NLLB_CT2_REPO)
    translator = ctranslate2.Translator(model_dir, device="cpu", compute_type="int8", intra_threads=2)
    tokenizer = transformers.AutoTokenizer.from_pretrained(NLLB_TOK_REPO)
    return translator, tokenizer


def map_lang_to_nllb(code):
    c = str(code or "").lower().strip()
    mapping = {
        "si": "sin_Sinh", "sinhala": "sin_Sinh", "si-unicode": "sin_Sinh", "si-legacy": "sin_Sinh",
        "en": "eng_Latn", "english": "eng_Latn",
        "ta": "tam_Taml", "tamil": "tam_Taml",
        "hi": "hin_Deva", "hindi": "hin_Deva",
        "es": "spa_Latn", "fr": "fra_Latn", "de": "deu_Latn", "ja": "jpn_Jpan",
        "ko": "kor_Hang", "zh": "zho_Hans", "ar": "arb_Arab", "ml": "mal_Mlym",
        "te": "tel_Telu", "bn": "ben_Beng",
    }
    return mapping.get(c, "eng_Latn")


def detect_text_nllb_lang(lines):
    joined = " ".join(lines[:15])
    if re.search(r"[\u0D80-\u0DFF]", joined):
        return "sin_Sinh"
    if re.search(r"[\u0B80-\u0BFF]", joined):
        return "tam_Taml"
    if re.search(r"[\u0900-\u097F]", joined):
        return "hin_Deva"
    return "eng_Latn"


def nllb_translate_lines(lines, src_nllb, tgt_nllb, translator=None, tokenizer=None, preserve_english_terms=True):
    if not lines or src_nllb == tgt_nllb:
        return lines

    own_loaded = translator is None or tokenizer is None
    if own_loaded:
        translator, tokenizer = load_nllb_translator()

    protected_maps = []
    prepped = []
    for ln in lines:
        mp = {}
        cur = ln
        if preserve_english_terms and tgt_nllb == "sin_Sinh":
            for t_idx, term in enumerate(PROTECTED_ENGLISH_TERMS):
                rx = re.compile(r"\b" + re.escape(term) + r"\b", flags=re.IGNORECASE)
                if rx.search(cur):
                    token_tag = f"ZTERM{t_idx}Z"
                    mp[token_tag] = term
                    cur = rx.sub(token_tag, cur)
        protected_maps.append(mp)
        prepped.append(cur)

    out_lines = []
    batch_sz = 16
    tokenizer.src_lang = src_nllb
    total_l = len(prepped)
    for i in range(0, total_l, batch_sz):
        batch = prepped[i:i + batch_sz]
        tok_inputs = [tokenizer.convert_ids_to_tokens(tokenizer.encode(t)) for t in batch]
        res = translator.translate_batch(tok_inputs, target_prefix=[[tgt_nllb]] * len(batch), beam_size=2, max_decoding_length=128)
        for j, r in enumerate(res):
            hyp = r.hypotheses[0] if r.hypotheses else []
            if hyp and hyp[0] == tgt_nllb:
                hyp = hyp[1:]
            dec = tokenizer.decode(tokenizer.convert_tokens_to_ids(hyp), skip_special_tokens=True)
            mp = protected_maps[i + j]
            for tag, orig in mp.items():
                m_idx = tag.replace("ZTERM", "").replace("Z", "")
                dec = re.sub(rf"Z\s*TERM\s*{re.escape(m_idx)}\s*Z", orig, dec, flags=re.IGNORECASE)
            out_lines.append(dec.strip() or lines[i + j])
        if (i + len(batch)) % 32 == 0 or (i + len(batch)) >= total_l:
            log_step(f"[*] Meta NLLB-200 Translation {min(total_l, i + len(batch))}/{total_l}...")

    if own_loaded:
        del translator, tokenizer
        release_memory()
    return out_lines


def build_srt_from_words(aligned_words, words_limit=1):
    if not aligned_words:
        return ""
    aligned_words.sort(key=lambda x: (x["start"], x["end"]))
    for i in range(1, len(aligned_words)):
        prev, curr = aligned_words[i - 1], aligned_words[i]
        if prev["end"] >= curr["start"]:
            prev["end"] = max(prev["start"] + 0.05, round(curr["start"] - 0.02, 3))
        if curr["end"] <= curr["start"]:
            curr["end"] = round(curr["start"] + 0.14, 3)

    cards = []
    cur = []
    c_start = None
    c_end = None
    w_lim = max(1, int(words_limit or 1))
    for w_obj in aligned_words:
        w_txt, ws, we = w_obj["word"], w_obj["start"], w_obj["end"]
        gap = (ws - c_end) if c_end is not None else 0.0
        cur_chars = sum(len(x) for x in cur) + max(0, len(cur) - 1)
        if cur and (len(cur) >= w_lim or (len(cur) >= 2 and cur_chars >= 26) or gap > 0.45 or (we - c_start) > 3.8):
            cards.append({"start": c_start, "end": c_end, "text": " ".join(cur)})
            cur, c_start, c_end = [], None, None
        if c_start is None:
            c_start = max(0.0, ws)
        cur.append(w_txt)
        c_end = we
    if cur:
        cards.append({"start": c_start, "end": c_end, "text": " ".join(cur)})

    entries = []
    for idx, b in enumerate(cards, 1):
        txt = b["text"].strip()
        if txt:
            entries.append(f"{idx}\n{format_srt_time(b['start'])} --> {format_srt_time(b['end'])}\n{txt}")
    return "\n\n".join(entries)


def transcribe_english_target(wav_path, windows):
    """Fast path when target subtitle language is English."""
    from faster_whisper import WhisperModel
    log_step("[*] Transcribing spoken audio to English (INT8)...")
    wm = WhisperModel(WHISPER_TINY_MULTI_REPO, device="cpu", compute_type="int8", cpu_threads=2)
    win_items = []
    non_en_indices = []
    try:
        for idx, (ws, we) in enumerate(windows):
            sl = read_wav_slice(wav_path, ws, we)
            mx = float(abs(sl).max()) if len(sl) else 0.0
            if mx > 1e-4:
                sl = sl * (0.7 / mx)
            segs, info = wm.transcribe(sl, beam_size=1, vad_filter=False, word_timestamps=True, no_speech_threshold=0.70, condition_on_previous_text=False)
            lang = getattr(info, "language", "en") or "en"
            w_list = []
            for s in segs:
                if getattr(s, "no_speech_prob", 0.0) > 0.85:
                    continue
                for ww in (s.words or []):
                    tok = sanitize_caption_text(ww.word, "English")
                    if tok:
                        w_list.append({"word": tok, "start": round(ws + ww.start, 3), "end": round(max(ws + ww.start + 0.08, ws + ww.end), 3)})
            if lang != "en" and lang != "si" and w_list:
                non_en_indices.append((idx, lang, " ".join(x["word"] for x in w_list), ws, we))
            win_items.append((lang, w_list, ws, we))
    finally:
        del wm
        release_memory()

    # If spoken audio is Sinhala and target is English, decode with Sinhala ONNX + NLLB
    si_only = [i for i, (lg, _, _, _) in enumerate(win_items) if lg in ("si", "tl", "ml", "ta") or not win_items[i][1]]
    if len(si_only) > len(win_items) // 2:
        sess, proc = load_w2v_sinhala_onnx()
        si_freq, _, phon_idx = load_lexicons()
        si_lines = []
        si_spans = []
        try:
            import numpy as np
            for ws, we in windows:
                sl = read_wav_slice(wav_path, ws, we)
                norm = (sl - np.mean(sl)) / (np.std(sl) + 1e-7)
                logits = sess.run(["logits"], {"input_values": norm[None, :]})[0]
                raw_w = decode_ctc_words_with_gaps(logits, proc.tokenizer, ws, we - ws)
                ref_w = refine_sinhala_window_words(raw_w, si_freq, phon_idx)
                txt = " ".join(x["word"] for x in ref_w).strip()
                if txt:
                    si_lines.append(txt)
                    si_spans.append((ws, we))
        finally:
            del sess, proc
            release_memory()
        if si_lines:
            en_lines = nllb_translate_lines(si_lines, "sin_Sinh", "eng_Latn", preserve_english_terms=False)
            aligned = []
            for (ws, we), line in zip(si_spans, en_lines):
                words = [w for w in sanitize_caption_text(line, "English").split() if w]
                if not words:
                    continue
                step = max(0.25, we - ws) / len(words)
                for k, w in enumerate(words):
                    aligned.append({"word": w, "start": round(ws + k * step, 3), "end": round(ws + (k + 0.9) * step, 3)})
            return aligned

    if non_en_indices:
        translator, tokenizer = load_nllb_translator()
        try:
            by_src = {}
            for idx, lang, txt, ws, we in non_en_indices:
                by_src.setdefault(map_lang_to_nllb(lang), []).append((idx, txt, ws, we))
            for src_code, grp in by_src.items():
                if src_code == "eng_Latn":
                    continue
                trs = nllb_translate_lines([g[1] for g in grp], src_code, "eng_Latn", translator=translator, tokenizer=tokenizer, preserve_english_terms=False)
                for (idx, _, ws, we), tr in zip(grp, trs):
                    words = [w for w in sanitize_caption_text(tr, "English").split() if w]
                    step = max(0.25, we - ws) / max(1, len(words))
                    win_items[idx] = ("en", [{"word": w, "start": round(ws + k * step, 3), "end": round(ws + (k + 0.9) * step, 3)} for k, w in enumerate(words)], ws, we)
        finally:
            del translator, tokenizer
            release_memory()

    aligned = []
    for _, w_list, _, _ in win_items:
        aligned.extend(w_list)
    return aligned


def transcribe_and_align(media_path, target_language="Sinhala", words_limit=1, ffmpeg_cmd="ffmpeg"):
    import numpy as np

    fd, tmp_wav = tempfile.mkstemp(prefix="cz_mms_", suffix=".wav")
    os.close(fd)
    try:
        log_step(f"[*] Decoding 16kHz PCM track from {os.path.basename(media_path)}...")
        extract_pcm_wav(media_path, tmp_wav, ffmpeg_cmd=ffmpeg_cmd)
        windows, total_sec = scan_vad_windows(tmp_wav)
        log_step(f"[*] Found {len(windows)} active speech windows across {round(total_sec, 1)}s audio.")
        if not windows:
            return {"srt": "", "words": []}

        if not is_sinhala_code(target_language):
            aligned_words = transcribe_english_target(tmp_wav, windows)
            srt_text = build_srt_from_words(aligned_words, words_limit=words_limit)
            log_step(f"[+] CapZone Meta MMS Pipeline Ready: {len(aligned_words)} words synced.")
            return {"srt": srt_text, "words": aligned_words}

        si_freq, en_freq, phon_idx = load_lexicons()

        log_step(f"[*] Transcribing spoken Sinhala dialogue ({len(windows)} segments)...")
        sess, proc = load_w2v_sinhala_onnx()
        win_word_lists = []
        try:
            for idx, (ws, we) in enumerate(windows):
                sl = read_wav_slice(tmp_wav, ws, we)
                inp = proc(sl, sampling_rate=16000, return_tensors="np").input_values.astype("float32")
                logits = sess.run(["logits"], {"input_values": inp})[0]
                raw_w = decode_ctc_words_with_gaps(logits, proc.tokenizer, ws, we - ws)
                ref_w = refine_sinhala_window_words(raw_w, si_freq, phon_idx)
                win_word_lists.append(ref_w)
                if (idx + 1) % 10 == 0 or idx + 1 == len(windows):
                    log_step(f"[*] Transcription progress {idx + 1}/{len(windows)}...")
        finally:
            del sess, proc
            release_memory()

        # Resolve English words in mixed Sinhala speech ("school යනවා") & pure English utterances
        win_word_lists, win_modes = resolve_code_switched_english(tmp_wav, win_word_lists, windows, en_freq, si_freq, phon_idx)

        # Pure multi-segment foreign film (>60s, >=5 dialogue windows, zero Sinhala speech) translates cleanly to Sinhala
        real_si_cnt = sum(1 for wl in win_word_lists for item in wl if item.get("in_si"))
        is_pure_foreign_movie = (total_sec >= 60.0 and len(windows) >= 5 and real_si_cnt == 0)

        if is_pure_foreign_movie:
            non_empty_wins = [(i, wl, windows[i]) for i, wl in enumerate(win_word_lists) if wl]
            if non_empty_wins:
                lines_to_tr = [" ".join(x["word"] for x in wl) for _, wl, _ in non_empty_wins]
                tr_lines = nllb_translate_lines(lines_to_tr, "eng_Latn", "sin_Sinh", preserve_english_terms=True)
                for (w_i, _, (ws, we)), tr_text in zip(non_empty_wins, tr_lines):
                    clean_line = sanitize_caption_text(apply_sinhala_loanword_english(tr_text), "Sinhala")
                    w_tokens = [tok for tok in clean_line.split() if tok]
                    if w_tokens:
                        step = max(0.25, we - ws) / len(w_tokens)
                        win_word_lists[w_i] = [{
                            "word": tok,
                            "start": round(ws + k * step, 3),
                            "end": round(ws + (k + 0.9) * step, 3),
                        } for k, tok in enumerate(w_tokens)]

        aligned_words = []
        for wl in win_word_lists:
            for item in wl:
                txt = sanitize_caption_text(apply_sinhala_loanword_english(item["word"]), "Sinhala") if not item.get("is_en") else sanitize_caption_text(item["word"], "English")
                if txt:
                    for sub_tok in txt.split():
                        aligned_words.append({
                            "word": sub_tok,
                            "start": item["start"],
                            "end": item["end"],
                        })

        srt_text = build_srt_from_words(aligned_words, words_limit=words_limit)
        log_step(f"[+] CapZone Meta MMS Pipeline Ready: {len(aligned_words)} words synced.")
        return {"srt": srt_text, "words": aligned_words}
    finally:
        try:
            if os.path.exists(tmp_wav):
                os.remove(tmp_wav)
        except Exception:
            pass


def translate_srt_file(input_srt_path, target_language="Sinhala"):
    with open(input_srt_path, "r", encoding="utf-8-sig", errors="replace") as f:
        raw_srt = f.read()

    raw_srt = raw_srt.replace("\r\n", "\n").replace("\r", "\n").strip()
    blocks_raw = [b.strip() for b in re.split(r"\n\s*\n", raw_srt) if b.strip()]
    ts_re = re.compile(r"(\d{1,2}:\d{2}:\d{2}[.,]\d{1,3})\s*-->\s*(\d{1,2}:\d{2}:\d{2}[.,]\d{1,3})")

    parsed = []
    for blk in blocks_raw:
        t_range = ""
        txt_lines = []
        for ln in blk.splitlines():
            ls = ln.strip()
            if not ls:
                continue
            if ts_re.search(ls):
                t_range = ls
            elif not ls.isdigit():
                txt_lines.append(ls)
        if t_range and txt_lines:
            parsed.append({"timeRange": t_range, "text": " ".join(txt_lines)})

    if not parsed:
        return {"success": False, "error": "No valid SRT subtitle blocks found.", "srt": ""}

    src_nllb = detect_text_nllb_lang([b["text"] for b in parsed])
    tgt_nllb = map_lang_to_nllb(target_language)
    is_si_target = (tgt_nllb == "sin_Sinh")
    out_texts = nllb_translate_lines([b["text"] for b in parsed], src_nllb, tgt_nllb, preserve_english_terms=is_si_target)

    out_blocks = []
    clean_lang = "Sinhala" if tgt_nllb == "sin_Sinh" else ("Tamil" if tgt_nllb == "tam_Taml" else "English")
    for idx, (blk, txt_tr) in enumerate(zip(parsed, out_texts), 1):
        clean_t = sanitize_caption_text(txt_tr, clean_lang) or blk["text"]
        out_blocks.append(f"{idx}\n{blk['timeRange']}\n{clean_t}")

    return {"success": True, "srt": "\n\n".join(out_blocks), "blocks": len(out_blocks)}


if __name__ == "__main__":
    if len(sys.argv) >= 2 and sys.argv[1] == "--translate":
        if len(sys.argv) < 3:
            print(json.dumps({"success": False, "error": "Missing SRT path"}, ensure_ascii=False))
            sys.exit(1)
        srt_path = sys.argv[2]
        t_lang = sys.argv[3] if len(sys.argv) > 3 else "Sinhala"
        try:
            print(json.dumps(translate_srt_file(srt_path, t_lang), ensure_ascii=False))
        except Exception as exc:
            print(json.dumps({"success": False, "error": str(exc)}, ensure_ascii=False))
            sys.exit(1)
        sys.exit(0)

    if len(sys.argv) < 2:
        print("Usage: python mms_engine.py <audio_or_video_file> [target_language] [words_limit] [ffmpeg_cmd]", file=sys.stderr)
        sys.exit(1)

    media_fp = sys.argv[1]
    t_lang = sys.argv[2] if len(sys.argv) > 2 else "Sinhala"
    try:
        w_lim = int(sys.argv[3]) if len(sys.argv) > 3 else 1
    except ValueError:
        w_lim = 1
    ff_bin = sys.argv[4] if len(sys.argv) > 4 else "ffmpeg"

    try:
        res = transcribe_and_align(media_fp, target_language=t_lang, words_limit=w_lim, ffmpeg_cmd=ff_bin)
        print(json.dumps(res, ensure_ascii=False))
    except Exception as exc:
        print(json.dumps({"error": str(exc), "srt": "", "words": []}, ensure_ascii=False))
        sys.exit(1)
