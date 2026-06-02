import { useState } from "react";
import axios from "axios";
import "./App.css";

// API Base URL (Supports environment variable for production)
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000";

// Allowed choices for drop-down lists to ensure safety
const SOIL_TYPES = ["Black", "Clayey", "Loamy", "Red", "Sandy"];
const FERTILIZER_CROPS = ["Barley", "Cotton", "Ground Nuts", "Maize", "Millets", "Oil seeds", "Paddy", "Pulses", "Sugarcane", "Tobacco", "Wheat"];
const SEASONS = ["Autumn", "Kharif", "Rabi", "Summer", "Whole Year", "Winter"];
const STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Delhi", "Goa", "Gujarat",
  "Haryana", "Himachal Pradesh", "Jammu & Kashmir", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
  "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal"
];
const YIELD_CROPS = [
  "Arecanut", "Arhar/Tur", "Castor seed", "Coconut", "Cotton(lint)", "Dry chillies", "Ginger", "Gram",
  "Groundnut", "Horse-gram", "Jowar", "Maize", "Masoor", "Mesta", "Moong(Green Gram)", "Niger seed",
  "Other Kharif pulses", "Other Rabi pulses", "Other Rabi crops", "Paddy", "Peas & beans (Pulses)",
  "Potato", "Ragi", "Rapeseed &Mustard", "Rice", "Safflower", "Sesamum", "Small millets", "Soyabean",
  "Sugarcane", "Sunflower", "Sweet potato", "Tapioca", "Tobacco", "Turmeric", "Urad", "Wheat"
];

// Helper details mapping crop name to description and advice
const CROP_ADVICE_MAP = {
  rice: { icon: "🌾", desc: "Rice is a staple cereal crop requiring plenty of water and warm conditions.", advice: "Ensure field bunding to retain standing water (5-10cm) during vegetative stages. Monitor for stem borer pests." },
  maize: { icon: "🌽", desc: "Maize (Corn) thrives in well-drained soils and requires good sunshine.", advice: "Maintain nitrogen supply at critical stages. Avoid waterlogged soil conditions as it stunts crop growth." },
  cotton: { icon: "☁️", desc: "Cotton is a major cash crop requiring high temperatures and moderate rainfall.", advice: "Prune properly to boost branching. Scout regularly for bollworms and whiteflies." },
  sugarcane: { icon: "🎋", desc: "Sugarcane is a long-duration high-water crop with high biomass output.", advice: "Apply potassium to improve sucrose content. Keep up with frequent earthing-up and weeding operations." },
  wheat: { icon: "🌾", desc: "Wheat is a cool-season rabi crop grown extensively in silty-loam soils.", advice: "Provide crucial irrigation at crown root initiation and flowering stages to optimize grain filling." }
};

// Helper details mapping fertilizer to advice
const FERTILIZER_ADVICE_MAP = {
  Urea: { icon: "🧪", formula: "46-0-0 (High Nitrogen)", advice: "Apply in split doses (basal, vegetative growth, and top-dressing) to reduce volatilization losses. Ensure soil is moist but not flooded." },
  DAP: { icon: "🧫", formula: "18-46-0 (High Phosphorus)", advice: "Apply directly near the root zone during sowing (basal application). It supports early-stage root development." },
  "14-35-14": { icon: "📦", formula: "NPK Ratio 1:2.5:1", advice: "Ideal for soil deficient in phosphorus. Promotes strong root systems and flowering in fruit-bearing crops." },
  "28-28": { icon: "🧪", formula: "28-28-0 (Nitrogen & Phosphorus)", advice: "Excellent complex fertilizer for grain crops. Best applied at sowing or early tillering stage." },
  "17-17-17": { icon: "📦", formula: "Balanced N-P-K Complex", advice: "Provides uniform nutrition. Suitable for vegetables, cash crops, and keeping generalized soil chemistry stable." }
};

function App() {
  const [activeTab, setActiveTab] = useState("crop"); // 'crop' | 'fertilizer' | 'yield'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  // Form State - Crop Advisor
  const [cropForm, setCropForm] = useState({ N: "", P: "", K: "", temp: "", humidity: "", ph: "", rainfall: "" });

  // Form State - Fertilizer Advisor
  const [fertForm, setFertForm] = useState({ temp: "", humidity: "", moisture: "", soilType: "Sandy", cropType: "Maize", N: "", K: "", P: "" });

  // Form State - Yield Forecaster
  const [yieldForm, setYieldForm] = useState({ crop: "Wheat", year: "2026", season: "Rabi", state: "Uttar Pradesh", area: "", production: "", rainfall: "", fertilizer: "", pesticide: "" });

  // Handle Form Input Changes
  const handleInputChange = (tab, field, value) => {
    setError("");
    setResult(null);
    if (tab === "crop") {
      setCropForm(prev => ({ ...prev, [field]: value }));
    } else if (tab === "fertilizer") {
      setFertForm(prev => ({ ...prev, [field]: value }));
    } else if (tab === "yield") {
      setYieldForm(prev => ({ ...prev, [field]: value }));
    }
  };

  // Helper validation
  const validateNumeric = (val, name, min, max) => {
    const num = Number(val);
    if (isNaN(num)) throw new Error(`${name} must be a valid number.`);
    if (min !== undefined && num < min) throw new Error(`${name} must be at least ${min}.`);
    if (max !== undefined && num > max) throw new Error(`${name} cannot exceed ${max}.`);
    return num;
  };

  // Submit Predictions
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    try {
      if (activeTab === "crop") {
        // Validate Crop form
        const N = validateNumeric(cropForm.N, "Nitrogen (N)", 0, 150);
        const P = validateNumeric(cropForm.P, "Phosphorus (P)", 0, 150);
        const K = validateNumeric(cropForm.K, "Potassium (K)", 0, 250);
        const temp = validateNumeric(cropForm.temp, "Temperature", -10, 60);
        const humidity = validateNumeric(cropForm.humidity, "Humidity", 0, 100);
        const ph = validateNumeric(cropForm.ph, "pH level", 0, 14);
        const rainfall = validateNumeric(cropForm.rainfall, "Rainfall", 0, 500);

        const response = await axios.post(`${API_BASE_URL}/predict-crop`, {
          N, P, K, temperature: temp, humidity, ph, rainfall
        });
        
        const cropName = response.data.recommended_crop;
        const details = CROP_ADVICE_MAP[cropName.toLowerCase()] || {
          icon: "🌱",
          desc: "A highly suitable crop for your current soil and environmental conditions.",
          advice: "Maintain routine field weeding, supply adequate water, and apply NPK nutrients based on general recommendations."
        };

        setResult({ type: "crop", value: cropName, ...details });

      } else if (activeTab === "fertilizer") {
        // Validate Fertilizer form
        const temp = validateNumeric(fertForm.temp, "Temperature", -10, 60);
        const humidity = validateNumeric(fertForm.humidity, "Humidity", 0, 100);
        const moisture = validateNumeric(fertForm.moisture, "Moisture", 0, 100);
        const N = validateNumeric(fertForm.N, "Nitrogen", 0, 150);
        const K = validateNumeric(fertForm.K, "Potassium", 0, 150);
        const P = validateNumeric(fertForm.P, "Phosphorous", 0, 150);

        const response = await axios.post(`${API_BASE_URL}/predict-fertilizer`, {
          Temperature: temp,
          Humidity: humidity,
          Moisture: moisture,
          "Soil Type": fertForm.soilType,
          "Crop Type": fertForm.cropType,
          Nitrogen: N,
          Potassium: K,
          Phosphorous: P
        });

        const fertName = response.data.recommended_fertilizer;
        const details = FERTILIZER_ADVICE_MAP[fertName] || {
          icon: "🧪",
          formula: "N-P-K Complex",
          advice: "Apply this fertilizer based on standard local packaging guidance. Wear gloves during distribution."
        };

        setResult({ type: "fertilizer", value: fertName, ...details });

      } else if (activeTab === "yield") {
        // Validate Yield form
        const year = validateNumeric(yieldForm.year, "Crop Year", 1900, 2100);
        const area = validateNumeric(yieldForm.area, "Area", 0.01, 10000000);
        const production = validateNumeric(yieldForm.production, "Production", 0, 100000000);
        const rainfall = validateNumeric(yieldForm.rainfall, "Annual Rainfall", 0, 10000);
        const fertilizer = validateNumeric(yieldForm.fertilizer, "Fertilizer Usage", 0, 500000000);
        const pesticide = validateNumeric(yieldForm.pesticide, "Pesticide Usage", 0, 50000000);

        const response = await axios.post(`${API_BASE_URL}/predict-yield`, {
          Crop: yieldForm.crop,
          Crop_Year: year,
          Season: yieldForm.season,
          State: yieldForm.state,
          Area: area,
          Production: production,
          Annual_Rainfall: rainfall,
          Fertilizer: fertilizer,
          Pesticide: pesticide
        });

        const yieldVal = response.data.predicted_yield;
        setResult({
          type: "yield",
          value: `${yieldVal.toFixed(3)} Tonnes/Hectare`,
          icon: "📈",
          crop: yieldForm.crop,
          advice: `Based on an area of ${area} hectares producing an estimated ${production} tonnes under ${rainfall}mm of rainfall, the model estimates a yield factor of ${yieldVal.toFixed(3)} units.`
        });
      }
    } catch (err) {
      console.error(err);
      if (err.response && err.response.data && err.response.data.error) {
        setError(err.response.data.error);
      } else {
        setError(err.message || "An unexpected error occurred during prediction.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="brand-section">
          <div>
            <h2 className="brand-logo">AgroIntel</h2>
            <div className="brand-tagline">AI Smart Farming</div>
          </div>
        </div>

        <nav className="navigation-tabs">
          <button
            id="tab-btn-crop"
            className={`tab-btn ${activeTab === "crop" ? "active tab-crop" : ""}`}
            onClick={() => { setActiveTab("crop"); setError(""); setResult(null); }}
          >
            🌾 Crop Advisor
          </button>
          <button
            id="tab-btn-fertilizer"
            className={`tab-btn ${activeTab === "fertilizer" ? "active tab-fertilizer" : ""}`}
            onClick={() => { setActiveTab("fertilizer"); setError(""); setResult(null); }}
          >
            🧪 Fertilizer Guide
          </button>
          <button
            id="tab-btn-yield"
            className={`tab-btn ${activeTab === "yield" ? "active tab-yield" : ""}`}
            onClick={() => { setActiveTab("yield"); setError(""); setResult(null); }}
          >
            📈 Yield Forecaster
          </button>
        </nav>

        <div className="sidebar-footer">
          <p>© 2026 AgroIntel</p>
          <p style={{ marginTop: "4px", fontSize: "10px" }}>Precision advisory tool</p>
        </div>
      </aside>

      {/* Main Advisory Board */}
      <main className="main-content">
        {/* Tab Headers */}
        {activeTab === "crop" && (
          <header className="tab-header">
            <h1>Crop Suitability Advisor</h1>
            <p>Enter your soil chemistry metrics and weather forecasts to predict the most compatible crop to grow.</p>
          </header>
        )}
        {activeTab === "fertilizer" && (
          <header className="tab-header">
            <h1>Fertilizer Guidance</h1>
            <p>Determine the optimal fertilizer formulation based on temperature, moisture, and N-P-K soil indicators.</p>
          </header>
        )}
        {activeTab === "yield" && (
          <header className="tab-header">
            <h1>Crop Yield Forecaster</h1>
            <p>Predict expected production yields (tonnes per hectare) using geographical, seasonal, and pesticide details.</p>
          </header>
        )}

        {/* Dashboard Panels */}
        <section className="dashboard-grid">
          {/* Active Input Panel */}
          <div className="glass-panel">
            {activeTab === "crop" && (
              <form onSubmit={handleSubmit} className="form-crop form-grid">
                <div className="form-group">
                  <div className="label-container">
                    <label className="form-label" htmlFor="crop-n">Nitrogen (N)</label>
                    <span className="tooltip-trigger" title="Nitrogen content in soil (recommended: 0 - 140 mg/kg)">ℹ️</span>
                  </div>
                  <input
                    id="crop-n"
                    className="input-field"
                    type="number"
                    placeholder="e.g. 90"
                    value={cropForm.N}
                    onChange={(e) => handleInputChange("crop", "N", e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <div className="label-container">
                    <label className="form-label" htmlFor="crop-p">Phosphorus (P)</label>
                    <span className="tooltip-trigger" title="Phosphorus content in soil (recommended: 5 - 145 mg/kg)">ℹ️</span>
                  </div>
                  <input
                    id="crop-p"
                    className="input-field"
                    type="number"
                    placeholder="e.g. 42"
                    value={cropForm.P}
                    onChange={(e) => handleInputChange("crop", "P", e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <div className="label-container">
                    <label className="form-label" htmlFor="crop-k">Potassium (K)</label>
                    <span className="tooltip-trigger" title="Potassium content in soil (recommended: 5 - 205 mg/kg)">ℹ️</span>
                  </div>
                  <input
                    id="crop-k"
                    className="input-field"
                    type="number"
                    placeholder="e.g. 43"
                    value={cropForm.K}
                    onChange={(e) => handleInputChange("crop", "K", e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <div className="label-container">
                    <label className="form-label" htmlFor="crop-temp">Temperature (°C)</label>
                    <span className="tooltip-trigger" title="Surrounding air temperature (recommended: 10 - 45 °C)">ℹ️</span>
                  </div>
                  <input
                    id="crop-temp"
                    className="input-field"
                    type="number"
                    step="0.1"
                    placeholder="e.g. 20.8"
                    value={cropForm.temp}
                    onChange={(e) => handleInputChange("crop", "temp", e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <div className="label-container">
                    <label className="form-label" htmlFor="crop-humidity">Humidity (%)</label>
                    <span className="tooltip-trigger" title="Relative humidity ratio (recommended: 15 - 95%)">ℹ️</span>
                  </div>
                  <input
                    id="crop-humidity"
                    className="input-field"
                    type="number"
                    step="0.1"
                    placeholder="e.g. 82.0"
                    value={cropForm.humidity}
                    onChange={(e) => handleInputChange("crop", "humidity", e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <div className="label-container">
                    <label className="form-label" htmlFor="crop-ph">pH Level</label>
                    <span className="tooltip-trigger" title="Soil pH acidity/alkalinity scale (recommended: 4.5 - 8.5)">ℹ️</span>
                  </div>
                  <input
                    id="crop-ph"
                    className="input-field"
                    type="number"
                    step="0.01"
                    placeholder="e.g. 6.50"
                    value={cropForm.ph}
                    onChange={(e) => handleInputChange("crop", "ph", e.target.value)}
                    required
                  />
                </div>

                <div className="form-group full-width">
                  <div className="label-container">
                    <label className="form-label" htmlFor="crop-rainfall">Rainfall (mm)</label>
                    <span className="tooltip-trigger" title="Average precipitation volume (recommended: 30 - 300 mm)">ℹ️</span>
                  </div>
                  <input
                    id="crop-rainfall"
                    className="input-field"
                    type="number"
                    step="0.1"
                    placeholder="e.g. 202.9"
                    value={cropForm.rainfall}
                    onChange={(e) => handleInputChange("crop", "rainfall", e.target.value)}
                    required
                  />
                </div>

                <button type="submit" id="btn-submit-crop" className="submit-btn submit-btn-crop">
                  Analyze Suitability 🌾
                </button>
              </form>
            )}

            {activeTab === "fertilizer" && (
              <form onSubmit={handleSubmit} className="form-fertilizer form-grid">
                <div className="form-group">
                  <div className="label-container">
                    <label className="form-label" htmlFor="fert-temp">Temperature (°C)</label>
                    <span className="tooltip-trigger" title="Soil ambient temperature (recommended: 20 - 40 °C)">ℹ️</span>
                  </div>
                  <input
                    id="fert-temp"
                    className="input-field"
                    type="number"
                    placeholder="e.g. 28"
                    value={fertForm.temp}
                    onChange={(e) => handleInputChange("fertilizer", "temp", e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <div className="label-container">
                    <label className="form-label" htmlFor="fert-humidity">Humidity (%)</label>
                    <span className="tooltip-trigger" title="Relative humidity ratio (recommended: 50 - 70%)">ℹ️</span>
                  </div>
                  <input
                    id="fert-humidity"
                    className="input-field"
                    type="number"
                    placeholder="e.g. 54"
                    value={fertForm.humidity}
                    onChange={(e) => handleInputChange("fertilizer", "humidity", e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <div className="label-container">
                    <label className="form-label" htmlFor="fert-moisture">Soil Moisture</label>
                    <span className="tooltip-trigger" title="Soil moisture saturation ratio (recommended: 25 - 65)">ℹ️</span>
                  </div>
                  <input
                    id="fert-moisture"
                    className="input-field"
                    type="number"
                    placeholder="e.g. 46"
                    value={fertForm.moisture}
                    onChange={(e) => handleInputChange("fertilizer", "moisture", e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <div className="label-container">
                    <label className="form-label" htmlFor="fert-soil">Soil Type</label>
                    <span className="tooltip-trigger" title="Physical classification of target field soil">ℹ️</span>
                  </div>
                  <select
                    id="fert-soil"
                    className="input-field"
                    value={fertForm.soilType}
                    onChange={(e) => handleInputChange("fertilizer", "soilType", e.target.value)}
                  >
                    {SOIL_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <div className="label-container">
                    <label className="form-label" htmlFor="fert-crop">Crop Type</label>
                    <span className="tooltip-trigger" title="Type of crop currently planted or planned">ℹ️</span>
                  </div>
                  <select
                    id="fert-crop"
                    className="input-field"
                    value={fertForm.cropType}
                    onChange={(e) => handleInputChange("fertilizer", "cropType", e.target.value)}
                  >
                    {FERTILIZER_CROPS.map(type => <option key={type} value={type}>{type}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <div className="label-container">
                    <label className="form-label" htmlFor="fert-n">Nitrogen (N)</label>
                    <span className="tooltip-trigger" title="Nitrogen concentration index (recommended: 0 - 50 mg/kg)">ℹ️</span>
                  </div>
                  <input
                    id="fert-n"
                    className="input-field"
                    type="number"
                    placeholder="e.g. 35"
                    value={fertForm.N}
                    onChange={(e) => handleInputChange("fertilizer", "N", e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <div className="label-container">
                    <label className="form-label" htmlFor="fert-k">Potassium (K)</label>
                    <span className="tooltip-trigger" title="Potassium concentration index (recommended: 0 - 25 mg/kg)">ℹ️</span>
                  </div>
                  <input
                    id="fert-k"
                    className="input-field"
                    type="number"
                    placeholder="e.g. 0"
                    value={fertForm.K}
                    onChange={(e) => handleInputChange("fertilizer", "K", e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <div className="label-container">
                    <label className="form-label" htmlFor="fert-p">Phosphorous (P)</label>
                    <span className="tooltip-trigger" title="Phosphorus concentration index (recommended: 0 - 45 mg/kg)">ℹ️</span>
                  </div>
                  <input
                    id="fert-p"
                    className="input-field"
                    type="number"
                    placeholder="e.g. 0"
                    value={fertForm.P}
                    onChange={(e) => handleInputChange("fertilizer", "P", e.target.value)}
                    required
                  />
                </div>

                <button type="submit" id="btn-submit-fertilizer" className="submit-btn submit-btn-fertilizer">
                  Calculate Dosage 🧪
                </button>
              </form>
            )}

            {activeTab === "yield" && (
              <form onSubmit={handleSubmit} className="form-yield form-grid">
                <div className="form-group">
                  <div className="label-container">
                    <label className="form-label" htmlFor="yield-crop">Target Crop</label>
                    <span className="tooltip-trigger" title="Crop being evaluated for yield prediction">ℹ️</span>
                  </div>
                  <select
                    id="yield-crop"
                    className="input-field"
                    value={yieldForm.crop}
                    onChange={(e) => handleInputChange("yield", "crop", e.target.value)}
                  >
                    {YIELD_CROPS.map(type => <option key={type} value={type}>{type}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <div className="label-container">
                    <label className="form-label" htmlFor="yield-year">Crop Year</label>
                    <span className="tooltip-trigger" title="Target farming calendar year (recommended: 1997 - 2026)">ℹ️</span>
                  </div>
                  <input
                    id="yield-year"
                    className="input-field"
                    type="number"
                    placeholder="e.g. 2026"
                    value={yieldForm.year}
                    onChange={(e) => handleInputChange("yield", "year", e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <div className="label-container">
                    <label className="form-label" htmlFor="yield-season">Farming Season</label>
                    <span className="tooltip-trigger" title="Seasonal period of the crop cycle">ℹ️</span>
                  </div>
                  <select
                    id="yield-season"
                    className="input-field"
                    value={yieldForm.season}
                    onChange={(e) => handleInputChange("yield", "season", e.target.value)}
                  >
                    {SEASONS.map(type => <option key={type} value={type}>{type}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <div className="label-container">
                    <label className="form-label" htmlFor="yield-state">State / Region</label>
                    <span className="tooltip-trigger" title="Geographical administrative state location">ℹ️</span>
                  </div>
                  <select
                    id="yield-state"
                    className="input-field"
                    value={yieldForm.state}
                    onChange={(e) => handleInputChange("yield", "state", e.target.value)}
                  >
                    {STATES.map(type => <option key={type} value={type}>{type}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <div className="label-container">
                    <label className="form-label" htmlFor="yield-area">Area (Hectares)</label>
                    <span className="tooltip-trigger" title="Total land surface area cultivated in hectares">ℹ️</span>
                  </div>
                  <input
                    id="yield-area"
                    className="input-field"
                    type="number"
                    step="0.01"
                    placeholder="e.g. 10.0"
                    value={yieldForm.area}
                    onChange={(e) => handleInputChange("yield", "area", e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <div className="label-container">
                    <label className="form-label" htmlFor="yield-prod">Production (Tonnes)</label>
                    <span className="tooltip-trigger" title="Total expected crop harvest weight in tonnes">ℹ️</span>
                  </div>
                  <input
                    id="yield-prod"
                    className="input-field"
                    type="number"
                    placeholder="e.g. 120"
                    value={yieldForm.production}
                    onChange={(e) => handleInputChange("yield", "production", e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <div className="label-container">
                    <label className="form-label" htmlFor="yield-rainfall">Annual Rainfall (mm)</label>
                    <span className="tooltip-trigger" title="Total annual accumulation of rainfall in millimeters">ℹ️</span>
                  </div>
                  <input
                    id="yield-rainfall"
                    className="input-field"
                    type="number"
                    step="0.1"
                    placeholder="e.g. 1250.0"
                    value={yieldForm.rainfall}
                    onChange={(e) => handleInputChange("yield", "rainfall", e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <div className="label-container">
                    <label className="form-label" htmlFor="yield-fert">Fertilizer Used (kg)</label>
                    <span className="tooltip-trigger" title="Total fertilizer volume applied across the field in kilograms">ℹ️</span>
                  </div>
                  <input
                    id="yield-fert"
                    className="input-field"
                    type="number"
                    placeholder="e.g. 1500"
                    value={yieldForm.fertilizer}
                    onChange={(e) => handleInputChange("yield", "fertilizer", e.target.value)}
                    required
                  />
                </div>

                <div className="form-group full-width">
                  <div className="label-container">
                    <label className="form-label" htmlFor="yield-pest">Pesticide Used (kg)</label>
                    <span className="tooltip-trigger" title="Total chemical pesticides applied in kilograms">ℹ️</span>
                  </div>
                  <input
                    id="yield-pest"
                    className="input-field"
                    type="number"
                    placeholder="e.g. 5"
                    value={yieldForm.pesticide}
                    onChange={(e) => handleInputChange("yield", "pesticide", e.target.value)}
                    required
                  />
                </div>

                <button type="submit" id="btn-submit-yield" className="submit-btn submit-btn-yield">
                  Estimate Yield Forecast 📈
                </button>
              </form>
            )}
          </div>

          {/* Results Visualizer Panel */}
          <div className="results-panel">
            {/* Loading Spinner */}
            {loading && (
              <div className="glass-panel spinner-container" style={{ "--spinner-color": activeTab === "crop" ? "var(--color-accent-green)" : activeTab === "fertilizer" ? "var(--color-accent-blue)" : "var(--color-accent-amber)" }}>
                <div className="spinner"></div>
                <h3 style={{ color: "var(--text-secondary)" }}>Running AI Predictive Models...</h3>
                <p style={{ color: "var(--text-muted)", fontSize: "14px" }}>Querying government-backed datasets...</p>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="error-alert">
                <h4>⚠️ Calculation Error</h4>
                <p>{error}</p>
                <p style={{ fontSize: "12px", opacity: 0.8, marginTop: "4px" }}>
                  Please check your input values and verify they lie within standard agricultural boundaries.
                </p>
              </div>
            )}

            {/* Empty State Prompt */}
            {!loading && !error && !result && (
              <div className="empty-state">
                <div className="empty-icon">📊</div>
                <h3>Awaiting Analysis</h3>
                <p>Fill out the parameters on the left and submit the calculation request to review detailed predictions.</p>
              </div>
            )}

            {/* Active Output Card */}
            {!loading && !error && result && (
              <div className="glass-panel result-card">
                {result.type === "crop" && (
                  <>
                    <span className="result-badge badge-crop">Model Prediction</span>
                    <div className="prediction-output">
                      <div className="output-icon-circle circle-crop">
                        {result.icon}
                      </div>
                      <div>
                        <div className="prediction-value-label">Recommended Crop</div>
                        <div className="prediction-value" style={{ color: "var(--color-accent-green)" }}>
                          {result.value}
                        </div>
                      </div>
                    </div>
                    
                    <div className="prediction-info-block">
                      <div className="info-title">ℹ️ Crop Overview</div>
                      <p className="info-text">{result.desc}</p>
                    </div>

                    <div className="prediction-info-block">
                      <div className="info-title">💡 Actionable Farming Advice</div>
                      <p className="info-text">{result.advice}</p>
                    </div>
                  </>
                )}

                {result.type === "fertilizer" && (
                  <>
                    <span className="result-badge badge-fertilizer">Model Prediction</span>
                    <div className="prediction-output">
                      <div className="output-icon-circle circle-fertilizer">
                        {result.icon}
                      </div>
                      <div>
                        <div className="prediction-value-label">Recommended Fertilizer</div>
                        <div className="prediction-value" style={{ color: "var(--color-accent-blue)" }}>
                          {result.value}
                        </div>
                        <div style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>
                          {result.formula}
                        </div>
                      </div>
                    </div>

                    <div className="prediction-info-block">
                      <div className="info-title">💡 Application Guidance</div>
                      <p className="info-text">{result.advice}</p>
                    </div>
                  </>
                )}

                {result.type === "yield" && (
                  <>
                    <span className="result-badge badge-yield">Model Prediction</span>
                    <div className="prediction-output">
                      <div className="output-icon-circle circle-yield">
                        {result.icon}
                      </div>
                      <div>
                        <div className="prediction-value-label">Forecasted Yield</div>
                        <div className="prediction-value" style={{ color: "var(--color-accent-amber)" }}>
                          {result.value}
                        </div>
                        <div style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>
                          Target Crop: {result.crop}
                        </div>
                      </div>
                    </div>

                    <div className="prediction-info-block">
                      <div className="info-title">💡 Yield Breakdown</div>
                      <p className="info-text">{result.advice}</p>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;