from flask import Flask, request
from flask_cors import CORS
import joblib

app = Flask(__name__)
CORS(app)

# Load machine learning models
crop_model = joblib.load("../models/crop_model.pkl")
fertilizer_model = joblib.load("../models/fertilizer_model.pkl")
yield_model = joblib.load("../models/yield_model.pkl")

# Load prediction output label encoders
fertilizer_encoder = joblib.load("../models/fertilizer_encoder.pkl")

# Load input feature encoders
yield_crop_encoder = joblib.load("../models/crop_encoder.pkl")
yield_season_encoder = joblib.load("../models/season_encoder.pkl")
yield_state_encoder = joblib.load("../models/state_encoder.pkl")

fertilizer_soil_encoder = joblib.load("../models/soil_encoder.pkl")
fertilizer_crop_encoder = joblib.load("../models/fertilizer_crop_encoder.pkl")

def safe_encode(encoder, value, field_name):
    if value is None:
        raise ValueError(f"Value for '{field_name}' cannot be null/empty.")
    val = str(value).strip().lower()
    
    # Strip and lowercase classes when comparing
    classes_stripped_lower = [c.strip().lower() for c in encoder.classes_]
    if val in classes_stripped_lower:
        idx = classes_stripped_lower.index(val)
        matched_class = encoder.classes_[idx]
        return int(encoder.transform([matched_class])[0])
    else:
        # Display cleaned options to the user
        cleaned_options = sorted(list(set(c.strip() for c in encoder.classes_)))
        raise ValueError(
            f"Invalid value '{value}' for '{field_name}'. "
            f"Allowed options are: {', '.join(cleaned_options)}"
        )

@app.route("/")
def home():
    return {
        "message": "Backend running successfully"
    }

@app.route("/test-models")
def test_models():
    return {
        "crop_model": "loaded",
        "fertilizer_model": "loaded",
        "yield_model": "loaded"
    }

@app.route("/predict-crop", methods=["POST"])
def predict_crop():

    data = request.json

    sample = [[
        data["N"],
        data["P"],
        data["K"],
        data["temperature"],
        data["humidity"],
        data["ph"],
        data["rainfall"]
    ]]

    prediction = crop_model.predict(sample)
    return {
        "recommended_crop": str(prediction[0])
    }


@app.route("/predict-fertilizer", methods=["POST"])
def predict_fertilizer():
    data = request.get_json()
    if not data:
        raise ValueError("Request body must be valid JSON.")

    # Read and encode categorical features safely
    soil_type_encoded = safe_encode(fertilizer_soil_encoder, data.get("Soil Type"), "Soil Type")
    crop_type_encoded = safe_encode(fertilizer_crop_encoder, data.get("Crop Type"), "Crop Type")

    sample = [[
        float(data["Temperature"]),
        float(data["Humidity"]),
        float(data["Moisture"]),
        soil_type_encoded,
        crop_type_encoded,
        float(data["Nitrogen"]),
        float(data["Potassium"]),
        float(data["Phosphorous"])
    ]]

    prediction = fertilizer_model.predict(sample)
    fertilizer = fertilizer_encoder.inverse_transform(prediction)

    return {
        "recommended_fertilizer": str(fertilizer[0])
    }
    
@app.route("/predict-yield", methods=["POST"])
def predict_yield():
    data = request.get_json()
    if not data:
        raise ValueError("Request body must be valid JSON.")

    # Read and encode categorical features safely
    crop_encoded = safe_encode(yield_crop_encoder, data.get("Crop"), "Crop")
    season_encoded = safe_encode(yield_season_encoder, data.get("Season"), "Season")
    state_encoded = safe_encode(yield_state_encoder, data.get("State"), "State")

    sample = [[
        crop_encoded,
        int(data["Crop_Year"]),
        season_encoded,
        state_encoded,
        float(data["Area"]),
        float(data["Production"]),
        float(data["Annual_Rainfall"]),
        float(data["Fertilizer"]),
        float(data["Pesticide"])
    ]]

    prediction = yield_model.predict(sample)

    return {
        "predicted_yield": float(prediction[0])
    }

@app.errorhandler(ValueError)
def handle_value_error(e):
    return {"error": str(e)}, 400

@app.errorhandler(KeyError)
def handle_key_error(e):
    return {"error": f"Missing required parameter: {str(e)}"}, 400

@app.errorhandler(Exception)
def handle_generic_error(e):
    return {"error": f"Internal error: {str(e)}"}, 500

if __name__ == "__main__":
    app.run(debug=True)