import pandas as pd
import joblib
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.pipeline import Pipeline, FeatureUnion
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report
import os
import sys

# Ensure Python can load utils from same directory
script_dir = os.path.dirname(os.path.realpath(__file__))
sys.path.append(script_dir)
from utils import EngineeredFeaturesExtractor, clean_text

print("Loading dataset...")
df = pd.read_csv(os.path.join(script_dir, 'schemes_dataset.csv'))
X = df['text']
y = df['label']

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

print("Training Pipeline...")
pipeline = Pipeline([
    ('features', FeatureUnion([
        ('tfidf', TfidfVectorizer(preprocessor=clean_text, max_features=1000, ngram_range=(1,2))),
        ('engineered_features', EngineeredFeaturesExtractor())
    ])),
    ('classifier', LogisticRegression(max_iter=1000))
])

pipeline.fit(X_train, y_train)

y_pred = pipeline.predict(X_test)
print(f"Accuracy: {accuracy_score(y_test, y_pred)*100:.2f}%")
print(classification_report(y_test, y_pred))

model_path = os.path.join(script_dir, 'fake_scheme_model.pkl')
joblib.dump(pipeline, model_path)
print(f"Model saved to {model_path}")
