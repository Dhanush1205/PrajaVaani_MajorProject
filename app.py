import os
import json
import re
import uuid
from typing import List, Dict, Optional

from fastapi import FastAPI, Request, Form
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from gtts import gTTS
import uvicorn
from mtranslate import translate

# --- Configuration & Load Data ---
SCHEMES_FILE = "schemes_dataset.json"
AUDIO_DIR = "static/audio"
os.makedirs(AUDIO_DIR, exist_ok=True)

app = FastAPI(title="PrajaVaani Keyword Engine (No-AI)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load schemes
try:
    with open(SCHEMES_FILE, "r", encoding="utf-8") as f:
        schemes_data = json.load(f)
    print(f"[OK] {len(schemes_data)} schemes loaded.")
except Exception as e:
    print(f"[ERROR] Could not load schemes: {e}")
    schemes_data = []

# --- Keyword Mapping Logic ---
# Build a robust mapping from all scheme titles in the dataset
def build_keyword_map():
    mapping = {}
    print("Building high-speed bilingual map...")
    for s in schemes_data:
        scheme_id = s.get("id")
        title_en = s.get("title", "").lower()
        if not scheme_id: continue
        
        # 1. Base keywords
        kws = {title_en, scheme_id.replace('-', ' ')}
        
        # 2. Extract significant words from English title
        ignore_words = {"scheme", "the", "and", "of", "for", "in", "to", "plus", "edition", "ts", "pm", "cm", "telangana", "india"}
        words = re.findall(r'\w+', title_en)
        for word in words:
            if len(word) > 3 and word not in ignore_words:
                kws.add(word)
        
        # 3. Add Specific Synonyms (Bilingual)
        if "mahalakshmi" in title_en: kws.update(["mahalaxmi", "mahalakshmi", "free bus", "మహాలక్ష్మి", "బస్సు"])
        if "rythu" in title_en: kws.update(["farmer", "investment", "rythu", "bharosa", "రైతు", "భరోసా"])
        if "gruha" in title_en: kws.update(["power", "electricity", "energy", "200 units", "గృహ", "జ్యోతి", "కరెంట్"])
        if "indiramma" in title_en: kws.update(["housing", "house", "homes", "ఇందిరమ్మ", "ఇల్లు"])
        if "pension" in title_en or "cheyutha" in title_en: kws.update(["pension", "old age", "monthly money", "పింఛన్", "పెన్షన్", "చేయూత"])
        if "kalyana" in title_en: kws.update(["marriage", "wedding", "shaadi", "మ్యారేజ్", "కళ్యాణ", "లక్ష్మి"])
        if "arogyasri" in title_en: kws.update(["health", "medical", "hospital", "ఆరోగ్యశ్రీ", "వైద్యం"])
        if "chenetha" in title_en: kws.update(["weaver", "handloom", "నేతన్న", "చేనేత"])
        if "vidya" in title_en: kws.update(["education", "scholarship", "స్టూడెంట్", "విద్య"])
        if "kisan" in title_en: kws.update(["pm kisan", "central farmer", "పీఎం కిసాన్"])
        if "asara" in title_en: kws.update(["aasara", "ఆసరా"])
        
        mapping[scheme_id] = list(kws)
    
    print(f"Map ready! {len(mapping)} schemes active.")
    return mapping

SCHEME_KEYWORDS = build_keyword_map()

def find_best_scheme_local(query: str) -> Optional[str]:
    query_lower = query.lower()
    
    # 1. Clean query of filler phrases
    fillers = [
        "can you tell me about ", "tell me about ", "information on ", "details about ",
        "what is ", "about ", "please ", " పథకం గురించి చెప్పు", " గురించి చెప్పు", " గురించి చెప్పండి"
    ]
    cleaned_query = query_lower
    for f in fillers:
        cleaned_query = cleaned_query.replace(f, "")
    cleaned_query = cleaned_query.strip()

    # 2. Score Matching
    best_match = None
    max_score = 0
    
    # Generic stopwords that shouldn't trigger a match alone
    generic_stopwords = {"scheme", "pathakam", "పథకం", "స్కీమ్", "చెప్పు", "tell", "about", "information"}

    # Special handling for "lakshmi" to avoid collisions between Kalyana and Mahalakshmi
    if "mahalakshmi" in cleaned_query or "mahalaxmi" in cleaned_query:
        return "ts-mahalakshmi"

    for scheme_id, keywords in SCHEME_KEYWORDS.items():
        score = 0
        for kw in keywords:
            if kw in generic_stopwords: continue
            
            # Use whole word matching for shorter keywords to avoid collisions (like 'pm')
            if len(kw) <= 3:
                if re.search(r'\b' + re.escape(kw) + r'\b', cleaned_query):
                    score += (len(kw) ** 2)
            elif kw in cleaned_query:
                # Direct match
                score += (len(kw) ** 2)
        
        if score > max_score:
            max_score = score
            best_match = scheme_id
            
    # Require a decent score representing at least 4-5 chars of unique keyword
    return best_match if max_score >= 16 else None

# --- Helper Functions ---

def clean_for_speech(text: str) -> str:
    """Remove emojis for clean speech."""
    # Strip emojis and special symbols
    text = re.sub(r'[^\x00-\x7F\u0c00-\u0c7f\s\.,;!]', '', text)
    return text

def create_audio_reply(text: str, lang: str = 'te') -> str:
    """TTS generation."""
    try:
        clean_text = clean_for_speech(text)
        filename = f"reply_{uuid.uuid4().hex}.mp3"
        filepath = os.path.join(AUDIO_DIR, filename)
        # Use gTTS (Google TTS)
        tts = gTTS(text=clean_text, lang=lang)
        tts.save(filepath)
        return f"/static/audio/{filename}"
    except Exception as e:
        print(f"TTS Error: {e}")
        return ""

def translate_to_telugu(text: str) -> str:
    """Translate English text to Telugu using mTranslate."""
    try:
        translated = translate(text, "te", "en")
        return translated
    except Exception as e:
        print(f"Translation Error: {e}")
        return text

# --- API Endpoints ---

@app.get("/")
async def index():
    return FileResponse("index.html")

@app.get("/style.css")
async def get_css():
    return FileResponse("style.css")

@app.get("/script.js")
async def get_js():
    return FileResponse("script.js")

@app.get("/subsidyCalculator.js")
async def get_subsidy_calculator_js():
    return FileResponse("subsidyCalculator.js")

@app.get("/nearestHelp.js")
async def get_nearest_help_js():
    return FileResponse("nearestHelp.js")

@app.get("/schemes_dataset.json")
async def get_schemes_dataset():
    return FileResponse("schemes_dataset.json")

@app.post("/api/text-query")
async def text_query(request: Request):
    form = await request.form()
    query = form.get("query", "")
    lang_override = form.get("lang_override", "en") # 'en' or 'te'
    
    if not query:
        return JSONResponse({"error": "Empty query"}, status_code=400)

    print(f"Query: {query} (Manual Lang: {lang_override})")
    
    # 1. Match Scheme
    scheme_id = find_best_scheme_local(query)
    
    # 2. Build Response
    if scheme_id:
        scheme = next((s for s in schemes_data if s["id"] == scheme_id), None)
        title_en = scheme.get("title", scheme_id)
        desc_en = scheme.get("description", "No details available.")
        benefits_en = scheme.get("benefits", "")
        docs_list = scheme.get("documents", [])
        docs_en = ", ".join(docs_list) if docs_list else "Not specified"
        
        full_info_en = (
            f"Scheme Details: {desc_en} "
            f"Benefits: {benefits_en} "
            f"Required Documents: {docs_en}."
        )


        
        if lang_override == "te":
            # Translate to Telugu
            telugu_info = translate_to_telugu(full_info_en)
            reply = telugu_info
            audio_url = create_audio_reply(reply, 'te')
            detected_lang = "Telugu"
        else:
            reply = full_info_en
            audio_url = create_audio_reply(reply, 'en')
            detected_lang = "English"
    else:
        # Fallback for "No scheme found"
        if lang_override == "te":
            reply = "క్షమించాలి, మీరు అడిగిన పథకం గురించి నాకు తెలియదు. దయచేసి మరోసారి ప్రయత్నించండి."
            audio_url = create_audio_reply(reply, 'te')
            detected_lang = "Unknown"
        else:
            reply = "I'm sorry, I couldn't find information about that specific scheme. Could you please try again?"
            audio_url = create_audio_reply(reply, 'en')
            detected_lang = "Unknown"

    return {
        "transcribed_text": query,
        "detected_language": detected_lang,
        "english_reply": reply,
        "audio_url": audio_url
    }

@app.get("/api/history")
async def get_history():
    return {"history": []}

@app.delete("/api/history")
async def clear_history():
    return {"success": True}

@app.post("/api/voice-query")
async def voice_query_fallback(request: Request):
    """Old endpoint fallback to notify user."""
    return JSONResponse({
        "error": "New version active! Please REFRESH your browser page (Ctrl+F5) to enable the new voice recognition system."
    }, status_code=400)

@app.post("/api/check-eligibility")
async def check_eligibility_fallback(request: Request):
    """Redirect to the main eligibility system if needed, or ask to refresh."""
    return JSONResponse({
        "error": "Backend updated. Please REFRESH your browser page (Ctrl+F5)."
    }, status_code=400)

# Serve Static Files
app.mount("/static", StaticFiles(directory="static"), name="static")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
