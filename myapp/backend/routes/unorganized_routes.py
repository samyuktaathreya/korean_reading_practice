from fastapi import APIRouter, BackgroundTasks
from fastapi.responses import FileResponse
import edge_tts
import hashlib
import os
import asyncio
import re
from pydantic import BaseModel
from konlpy.tag import Okt
import httpx
import xml.etree.ElementTree as ET
from deep_translator import GoogleTranslator
import fitz  # PyMuPDF

# Initialize the router instead of the FastAPI app
router = APIRouter()
okt = Okt()

# --- CACHES ---
audio_cache = {}
word_cache = {}
sentence_cache = {}
text_cache = {}  

CACHE_DIR = "audio_cache"
os.makedirs(CACHE_DIR, exist_ok=True)
KRDICT_API_KEY = "32E161B62530D1AF98C447AD84DA8348"

# --- MODELS ---
class WordInput(BaseModel):
    text: str

class StoryInput(BaseModel):
    text: str

class PageRequest(BaseModel):
    page_number: int
    pdf_filename: str = "SejongKorean1.pdf"

# --- HELPER FUNCTIONS ---
async def extract_text_from_page(page_number: int, pdf_filename: str):
    pdf_filename = os.path.basename(pdf_filename)
    print("pdf filename: ", pdf_filename)
    cache_key = f"{pdf_filename}_page_{page_number}"
    
    if cache_key in text_cache:
        return text_cache[cache_key]

    try:
        def read_pdf_text():
            doc = fitz.open(pdf_filename)
            if page_number < 1 or page_number > len(doc):
                doc.close()
                return ""
                
            page = doc[page_number - 1]
            text = page.get_text("text") 
            doc.close()
            return text

        raw_text = await asyncio.to_thread(read_pdf_text)
        lines = raw_text.split('\n')
        extracted_lines = []

        for line in lines:
            line = line.strip()
            if len(line) < 6:
                continue
            if not re.search(r'[\uAC00-\uD7A3]', line):
                continue

            total_chars = len(line.replace(" ", ""))
            if total_chars == 0:
                continue
                
            num_chars = len(re.findall(r'\d', line))
            hangul_chars = len(re.findall(r'[\uAC00-\uD7A3]', line))
            
            if (num_chars / total_chars) > 0.3:
                continue
            if (hangul_chars / total_chars) < 0.4:
                continue

            extracted_lines.append(line)

        text_cache[cache_key] = extracted_lines
        return extracted_lines

    except Exception as e:
        print(f"Text Extraction failed: {e}")
        return []

async def fetch_and_cache_word(raw_word: str):
    if raw_word in word_cache:
        return word_cache[raw_word]
        
    analyzed_chunks = okt.pos(raw_word, stem=True)
    base_word = raw_word
    part_of_speech = "Unknown"

    for chunk, pos in analyzed_chunks:
        if pos not in ["Josa", "Punctuation"]:
            base_word = chunk
            part_of_speech = pos
            break

    translation = "Translation not found"
    async with httpx.AsyncClient() as client:
        api_url = "https://krdict.korean.go.kr/api/search"
        params = {
            "key": KRDICT_API_KEY,
            "q": base_word,
            "translated": "y",
            "trans_lang": "1"
        }
        try:
            dict_response = await client.get(api_url, params=params)
            if dict_response.status_code == 200:
                root = ET.fromstring(dict_response.text)
                trans_word_node = root.find('.//item/sense/translation/trans_word')
                if trans_word_node is not None and trans_word_node.text:
                    translation = trans_word_node.text.strip()
        except Exception as e:
            print(f"Failed to fetch from dictionary: {e}")

    if translation == "Translation not found":
        try:
            translation = await asyncio.to_thread(
                GoogleTranslator(source='ko', target='en').translate, raw_word
            )
        except Exception as e:
            print(f"Fallback translation failed: {e}")
            
        if translation == raw_word:
            translation = "Translation not found"

    result = {
        "is_sentence": False,
        "original_input": raw_word,
        "base_word": base_word,
        "part_of_speech": part_of_speech,
        "translation": translation
    }
    word_cache[raw_word] = result
    return result

async def translate_and_cache_sentence(sentence: str):
    if sentence in sentence_cache:
        return sentence_cache[sentence]
    
    try:
        translated_text = await asyncio.to_thread(
            GoogleTranslator(source='ko', target='en').translate, sentence
        )
    except Exception as e:
        print(f"Sentence translation failed: {e}")
        translated_text = "Translation failed."

    result = {
        "is_sentence": True,
        "original_input": sentence,
        "base_word": sentence,
        "part_of_speech": "Full Sentence",
        "translation": translated_text
    }
    
    sentence_cache[sentence] = result
    return result

async def generate_and_cache_audio(text: str):
    if text in audio_cache:
        return audio_cache[text]

    filename = hashlib.md5(text.encode("utf-8")).hexdigest() + ".mp3"
    filepath = os.path.join(CACHE_DIR, filename)

    if not os.path.exists(filepath):
        selected_voice = "ko-KR-SunHiNeural" 
        communicate = edge_tts.Communicate(text, selected_voice)
        await communicate.save(filepath)

    audio_cache[text] = filepath
    return filepath

# --- BACKGROUND TASK ---
async def background_preload(text: str):
    sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', text) if s.strip()]
    for sentence in sentences:
        if sentence not in audio_cache:
            await generate_and_cache_audio(sentence)
            await asyncio.sleep(0.1)

    clean_text = re.sub(r'[.!?,"\'\n]', ' ', text)
    unique_words = set(word for word in clean_text.split() if word)
    
    for word in unique_words:
        if word not in word_cache:
            dict_result = await fetch_and_cache_word(word)
            base_word = dict_result["base_word"]
            if base_word not in audio_cache:
                await generate_and_cache_audio(base_word)
            await asyncio.sleep(0.2) 

# --- ENDPOINTS ---
# Change @app.post to @router.post
@router.post("/api/audio")
async def audio(payload: dict):
    filepath = await generate_and_cache_audio(payload["text"])
    return FileResponse(filepath, media_type="audio/mpeg")

@router.post("/api/parse-word")
async def parse_word(user_input: WordInput):
    return await fetch_and_cache_word(user_input.text)

@router.post("/api/translate-sentence")
async def translate_sentence(payload: WordInput):
    return await translate_and_cache_sentence(payload.text)

@router.post("/api/ocr-page")
async def ocr_page(payload: PageRequest):
    lines = await extract_text_from_page(payload.page_number, payload.pdf_filename)
    return {"lines": lines}

@router.post("/api/preload-story")
async def preload_story(payload: StoryInput, background_tasks: BackgroundTasks):
    background_tasks.add_task(background_preload, payload.text)
    return {"message": "Preloading started in the background"}