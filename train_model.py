# train_model.py
# 1) Generate synthetic air quality dataset
# 2) Train ML model to classify AQI category
# 3) Save model + encoder for use in app.py

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
import joblib
import os

# -----------------------------
# 1. Generate synthetic dataset
# -----------------------------

np.random.seed(42)
n = 5000  # number of samples

# realistic-ish synthetic values
pm2_5 = np.clip(np.random.normal(loc=40, scale=25, size=n), 2, 300)      # µg/m3
pm10 = np.clip(np.random.normal(loc=70, scale=35, size=n), 5, 400)      # µg/m3
co2 = np.clip(np.random.normal(loc=750, scale=250, size=n), 350, 3000)  # ppm
voc = np.clip(np.random.normal(loc=250, scale=150, size=n), 10, 2000)   # ppb
temp = np.clip(np.random.normal(loc=28, scale=5, size=n), 10, 45)       # °C
humidity = np.clip(np.random.normal(loc=55, scale=15, size=n), 15, 95)  # %

# simple heuristic “score”
score = (
    (pm2_5 / 150) * 0.35 +
    (pm10 / 200) * 0.25 +
    (co2 / 2000) * 0.20 +
    (voc / 1500) * 0.20
)

def categorize(s):
    if s < 0.4:
        return "Good"
    elif s < 0.8:
        return "Moderate"
    elif s < 1.2:
        return "Unhealthy for Sensitive"
    elif s < 1.8:
        return "Unhealthy"
    else:
        return "Very Unhealthy"

aqi_category = np.array([categorize(s) for s in score])

# professional suggestion text per category
SUGGESTION_MAP = {
    "Good": "Air quality is good. Normal indoor and outdoor activities are acceptable.",
    "Moderate": "Air quality is acceptable. Sensitive individuals should limit prolonged or heavy exertion.",
    "Unhealthy for Sensitive": "Air quality may affect sensitive groups. They should reduce prolonged or heavy outdoor activity.",
    "Unhealthy": "Air quality is unhealthy. Everyone should reduce prolonged or heavy exertion and consider staying indoors.",
    "Very Unhealthy": "Air quality is very unhealthy. Avoid outdoor activity and use air purification/ventilation if available."
}

suggestion = np.array([SUGGESTION_MAP[c] for c in aqi_category])

df = pd.DataFrame({
    "pm2_5": pm2_5.round(2),
    "pm10": pm10.round(2),
    "co2": co2.round(2),
    "voc": voc.round(2),
    "temperature": temp.round(2),
    "humidity": humidity.round(2),
    "aqi_category": aqi_category,
    "suggestion": suggestion
})

csv_path = os.path.join(os.path.dirname(__file__), "air_quality_ai_dataset_5000.csv")
df.to_csv(csv_path, index=False)
print(f"Dataset saved to {csv_path}")

# -----------------------------
# 2. Train ML model
# -----------------------------

X = df[["pm2_5", "pm10", "co2", "voc", "temperature", "humidity"]]
y = df["aqi_category"]

label_encoder = LabelEncoder()
y_encoded = label_encoder.fit_transform(y)

X_train, X_test, y_train, y_test = train_test_split(
    X, y_encoded, test_size=0.2, random_state=42
)

model = RandomForestClassifier(
    n_estimators=250,
    max_depth=12,
    random_state=42
)
model.fit(X_train, y_train)

print("Train accuracy:", model.score(X_train, y_train))
print("Test accuracy :", model.score(X_test, y_test))

# -----------------------------
# 3. Save model + encoder
# -----------------------------

model_path = os.path.join(os.path.dirname(__file__), "air_quality_model.pkl")
enc_path = os.path.join(os.path.dirname(__file__), "label_encoder.pkl")

joblib.dump(model, model_path)
joblib.dump(label_encoder, enc_path)

print(f"Model saved to {model_path}")
print(f"Label encoder saved to {enc_path}")
