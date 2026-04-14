# run : uvicorn main:app --host 0.0.0.0 --port 8000 --reload
from fastapi import FastAPI, BackgroundTasks
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

app = FastAPI(docs_url="/api/docs", openapi_url="/api/openapi.json")
okt = Okt()

# --- CACHES ---
audio_cache = {}
word_cache = {}
sentence_cache = {}

CACHE_DIR = "audio_cache"
os.makedirs(CACHE_DIR, exist_ok=True)
KRDICT_API_KEY = "32E161B62530D1AF98C447AD84DA8348"

# --- MODELS ---
class WordInput(BaseModel):
    text: str

class StoryInput(BaseModel):
    text: str

async def fetch_and_cache_word(raw_word: str):
    # check if translation is already in the dictionary
    if raw_word in word_cache:
        return word_cache[raw_word]
        
    # analyzed chunks = [("word1", "pos1"), ("word2", "pos2")...] for every word in sentence 
    # (raw_word is a string that could be a sentence)
    # stem=True autoconverts the word to the stem
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
            # Run the synchronous translator in a separate thread so it doesn't block FastAPI
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
        # deep_translator is synchronous, so we run it in a thread to keep FastAPI fast
        translated_text = await asyncio.to_thread(
            GoogleTranslator(source='ko', target='en').translate, sentence
        )
    except Exception as e:
        print(f"Sentence translation failed: {e}")
        translated_text = "Translation failed."

    # We return the exact same dictionary structure as a word so the React popup doesn't break!
    result = {
        "is_sentence": True,
        "original_input": sentence,
        "base_word": sentence, # Put the full sentence in the title spot
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
        # Hardcode the voice to instantly skip the slow network fetch!
        # Use "ko-KR-SunHiNeural" for female, or "ko-KR-InJoonNeural" for male.
        selected_voice = "ko-KR-SunHiNeural" 
        
        communicate = edge_tts.Communicate(text, selected_voice)
        await communicate.save(filepath)

    audio_cache[text] = filepath
    return filepath

# --- ENDPOINTS ---
@app.post("/api/audio")
async def audio(payload: dict):
    # Now this endpoint is beautifully clean and just calls the helper
    filepath = await generate_and_cache_audio(payload["text"])
    return FileResponse(filepath, media_type="audio/mpeg")

@app.post("/api/parse-word")
async def parse_word(user_input: WordInput):
    return await fetch_and_cache_word(user_input.text)

@app.post("/api/translate-sentence")
async def translate_sentence(payload: WordInput):
    return await translate_and_cache_sentence(payload.text)

# --- BACKGROUND TASK ---
async def background_preload(text: str):
    # 1. Preload audio for the full sentences
    # This regex mimics your React frontend's splitting logic
    sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', text) if s.strip()]
    for sentence in sentences:
        if sentence not in audio_cache:
            await generate_and_cache_audio(sentence)
            await asyncio.sleep(0.1) # Be polite to the Microsoft Edge servers

    # 2. Preload dictionary definitions AND word audio
    clean_text = re.sub(r'[.!?,"\'\n]', ' ', text)
    unique_words = set(word for word in clean_text.split() if word)
    
    for word in unique_words:
        if word not in word_cache:
            # Cache the dictionary definition
            dict_result = await fetch_and_cache_word(word)
            
            # Cache the audio for the dictionary's base word (for the popup)
            base_word = dict_result["base_word"]
            if base_word not in audio_cache:
                await generate_and_cache_audio(base_word)
                
            # Be polite to both servers
            await asyncio.sleep(0.2) 

@app.post("/api/preload-story")
async def preload_story(payload: StoryInput, background_tasks: BackgroundTasks):
    background_tasks.add_task(background_preload, payload.text)
    return {"message": "Preloading started in the background"}