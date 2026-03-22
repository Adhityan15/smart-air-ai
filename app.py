# app.py
# Flask API to serve air-quality predictions for your frontend

from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import numpy as np
import os

app = Flask(__name__)
CORS(app)  # allow calls from http://localhost:8000

BASE_DIR = os.path.dirname(__file__)
MODEL_PATH = os.path.join(BASE_DIR, "air_quality_model.pkl")
ENCODER_PATH = os.path.join(BASE_DIR, "label_encoder.pkl")

model = joblib.load(MODEL_PATH)
label_encoder = joblib.load(ENCODER_PATH)

SUGGESTION_MAP = {
    "Good": "Air quality is good. Normal indoor and outdoor activities are acceptable.",
    "Moderate": "Air quality is acceptable. Sensitive individuals should limit prolonged or heavy exertion.",
    "Unhealthy for Sensitive": "Air quality may affect sensitive groups. They should reduce prolonged or heavy outdoor activity.",
    "Unhealthy": "Air quality is unhealthy. Everyone should reduce prolonged or heavy exertion and consider staying indoors.",
    "Very Unhealthy": "Air quality is very unhealthy. Avoid outdoor activity and use air purification/ventilation if available."
}

def build_professional_message(category: str) -> str:
    base = {
        "Good": "Current air quality is classified as good.",
        "Moderate": "Current air quality is classified as moderate.",
        "Unhealthy for Sensitive": "Current air quality may affect individuals with respiratory or cardiac conditions.",
        "Unhealthy": "Current air quality is unhealthy for the general population.",
        "Very Unhealthy": "Current air quality is very unhealthy and may pose significant health risks."
    }
    return base.get(category, "Current air quality assessment is available.") + " Please follow the recommendation provided."

@app.route("/predict", methods=["POST"])
def predict():
    """
    Expects JSON like:
    {
      "pm2_5": 45.2,
      "pm10": 70.1,
      "co2": 900,
      "voc": 300,
      "temperature": 28.5,
      "humidity": 60
    }
    """
    try:
        data = request.get_json(force=True)

        features = [
            float(data["pm2_5"]),
            float(data["pm10"]),
            float(data["co2"]),
            float(data["voc"]),
            float(data["temperature"]),
            float(data["humidity"])
        ]
    except Exception as e:
        return jsonify({
            "error": "Invalid or missing input values.",
            "details": str(e)
        }), 400

    x = np.array([features])
    pred_encoded = model.predict(x)[0]
    category = label_encoder.inverse_transform([pred_encoded])[0]
    suggestion = SUGGESTION_MAP.get(category, "No recommendation available.")
    message = build_professional_message(category)

    return jsonify({
        "aqi_category": category,
        "suggestion": suggestion,
        "message": message
    })

if __name__ == "__main__":
    # run on localhost:5000
    app.run(host="127.0.0.1", port=5000, debug=True)
