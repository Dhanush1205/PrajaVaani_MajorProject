import sys
import json
import joblib
import re
import os
import warnings
warnings.filterwarnings("ignore")

if len(sys.argv) < 2:
    print(json.dumps({"error": "No text provided"}))
    sys.exit(1)

text = sys.argv[1]

try:
    script_dir = os.path.dirname(os.path.realpath(__file__))
    sys.path.append(script_dir)
    import utils # Needed to unpickle the pipeline containing EngineeredFeaturesExtractor
    
    model_path = os.path.join(script_dir, 'fake_scheme_model.pkl')
    pipeline = joblib.load(model_path)
    
    prob = pipeline.predict_proba([text])[0]
    fake_prob = prob[1]
    
    text_lower = text.lower()
    patterns = []
    
    if bool(re.search(r'\b(pay|fee|cost|registration)\b', text_lower)):
        patterns.append("Payment request found")
    if bool(re.search(r'\b(urgent|limited|fast|today|immediately|quickly|now)\b', text_lower)):
        patterns.append("Urgency language detected")
    if bool(re.search(r'\.(com|xyz|online|info|support)', text_lower)):
        patterns.append("Suspicious domain (.com/.xyz/.online/.info)")
    if bool(re.search(r'\b(share|forward|groups|whatsapp)\b', text_lower)):
        patterns.append("WhatsApp forward pattern detected")
    if bool(re.search(r'\b(lakh|free|prize|guaranteed)\b', text_lower)):
        patterns.append("Unrealistic offer language")
    if bool(re.search(r'\b(otp|bank|kyc|transaction|blocked|refund)\b', text_lower)):
        patterns.append("Bank transaction or OTP request detected")
        fake_prob = max(fake_prob, 0.85)  # Heavily penalize OTP requests
    if text.count('!') > 1:
        patterns.append("Excessive use of exclamations")
        
    label = "Fake / Scam" if fake_prob > 0.5 else "Real Scheme"
    
    print(json.dumps({
        "risk_score": round(fake_prob * 100, 2),
        "label": label,
        "detected_patterns": patterns if len(patterns) > 0 else ["No scam indicators detected."]
    }))

except Exception as e:
    print(json.dumps({"error": str(e)}))
