import re
import numpy as np
from sklearn.base import BaseEstimator, TransformerMixin

class EngineeredFeaturesExtractor(BaseEstimator, TransformerMixin):
    def fit(self, X, y=None):
        return self
        
    def transform(self, X):
        features = []
        for text in X:
            text_lower = str(text).lower()
            
            has_payment = int(bool(re.search(r'\b(pay|fee|cost|registration)\b', text_lower)))
            has_urgency = int(bool(re.search(r'\b(urgent|limited|fast|today|immediately|quickly|now)\b', text_lower)))
            suspicious_url = int(bool(re.search(r'\.(com|xyz|online|info|support)', text_lower)))
            unrealistic_offer = int(bool(re.search(r'\b(lakh|free|prize|guaranteed)\b', text_lower)))
            whatsapp_forward = int(bool(re.search(r'\b(share|forward|groups|whatsapp)\b', text_lower)))
            has_otp_bank = int(bool(re.search(r'\b(otp|bank|kyc|transaction|blocked|refund)\b', text_lower)))
            
            num_exclamations = str(text).count('!')
            text_length = len(str(text))
            
            features.append([has_payment, has_urgency, suspicious_url, unrealistic_offer, whatsapp_forward, has_otp_bank, num_exclamations, text_length])
            
        return np.array(features)

def clean_text(text):
    text = str(text).lower()
    text = re.sub(r'[^a-z0-9\s₹\.]', '', text)
    return text
