import os
import sys
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime

import pandas as pd
import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("tabpfn-service")

# Automatically load .env from service directory or workspace root
try:
    from dotenv import load_dotenv
    load_dotenv()
    root_env = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))
    if os.path.exists(root_env):
        load_dotenv(root_env)
        logger.info(f"Loaded environment variables from {root_env}")
except Exception as env_err:
    logger.debug(f"dotenv load skipped: {env_err}")

app = FastAPI(
    title="TrailWhisper TabPFN Biodiversity Service",
    description="Microservice using Prior Labs' TabPFN tabular foundation model to predict flora/fauna sightings along hiking trails.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Botanical and Zoological Context Map
SPECIES_METADATA: Dict[str, Dict[str, str]] = {
    "Steller's Jay": {
        "scientific_name": "Cyanocitta stelleri",
        "category": "Bird",
        "audio_cue": "Listen for a sharp, harsh rattle or raspy metallic call in the upper hemlock canopy.",
        "visual_cue": "Look up: striking charcoal crest with iridescent cobalt wings.",
        "ecological_niche": "Coniferous montane forests; opportunistic forager and seed storer."
    },
    "Douglas Squirrel": {
        "scientific_name": "Tamiasciurus douglasii",
        "category": "Mammal",
        "audio_cue": "A rapid, chattering high-pitched trill echoing from mid-canopy tree trunks.",
        "visual_cue": "Rusty-orange underbelly darting between Douglas-fir limbs with a pine cone in mouth.",
        "ecological_niche": "Conifer cone specialist; creates large kitchen middens of cone scales."
    },
    "Banana Slug": {
        "scientific_name": "Ariolimax columbianus",
        "category": "Mollusk",
        "audio_cue": "Subtle rustle in damp decaying sword fern litter beside the trail verge.",
        "visual_cue": "Scan the trail borders on moist rotting nurse logs for bright yellow or olive camouflage.",
        "ecological_niche": "Temperate rainforest decomposer; consumes lichens, mosses, and fungal fruiting bodies."
    },
    "Western Redcedar": {
        "scientific_name": "Thuja plicata",
        "category": "Flora",
        "audio_cue": "A deep, resonant hush as breeze filters through flat, braided scale-like foliage.",
        "visual_cue": "Fluted, fibrous gray-to-cinnamon trunk with broad, buttressed base in moist valley bottoms.",
        "ecological_niche": "Keystone climax tree species, thrives in saturated, nutrient-rich riparian soils."
    },
    "Red-tailed Hawk": {
        "scientific_name": "Buteo jamaicensis",
        "category": "Bird of Prey",
        "audio_cue": "A hoarse, rasping scream 'kreeeee-aar' descending in pitch from open airspace above.",
        "visual_cue": "Gaze toward the ridge thermals: broad rounded wings soaring with brick-red tail feathers flashing in sunlight.",
        "ecological_niche": "Apex raptor scouting open meadows and rocky bluff contours for small mammals."
    },
    "Pacific Trillium": {
        "scientific_name": "Trillium ovatum",
        "category": "Flora",
        "audio_cue": "Quiet stillness near humus pockets beneath dappled alder and maple canopies.",
        "visual_cue": "Three symmetrical broad green leaves framing a solitary pristine white three-petaled flower turning rose-purple with age.",
        "ecological_niche": "Perennial forest spring herb pollinated by native beetles and distributed by ants."
    },
    "Black Bear": {
        "scientific_name": "Ursus americanus",
        "category": "Mammal",
        "audio_cue": "Heavy padded footfalls, snapped huckleberry branches, or deep guttural huffs.",
        "visual_cue": "Dense glossy black coat moving deliberately through avalanche chutes or berry thickets at dusk.",
        "ecological_niche": "Omnivorous megafauna foraging subalpine meadows and riparian salmon corridors."
    },
    "Barred Owl": {
        "scientific_name": "Strix varia",
        "category": "Bird of Prey",
        "audio_cue": "Rhythmic eight-note hooting pattern: 'Who cooks for you? Who cooks for you all?'",
        "visual_cue": "Perched motionless on low horizontal cedar limb; rounded head with dark brown eyes and barred chest.",
        "ecological_niche": "Mature multi-layered canopy hunter active during twilight hours."
    }
}

# Feature definitions
FEATURE_COLUMNS = [
    "latitude",
    "longitude",
    "elevation_m",
    "month",
    "hour",
    "canopy_density",
    "temperature_c"
]

# Global state for loaded dataset and model
data_df: Optional[pd.DataFrame] = None
model_instance: Any = None
model_type: str = "Uninitialized"
classes_list: List[str] = []


def load_dataset_and_train_model():
    """
    Loads trail observation CSV and fits TabPFN foundation model
    (or graceful fallback classifier if tabpfn/torch native weights are missing in the local Python environment).
    """
    global data_df, model_instance, model_type, classes_list

    csv_path = os.path.join(os.path.dirname(__file__), "data", "trail_biodiversity_sample.csv")
    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"Training data not found at {csv_path}")

    data_df = pd.read_csv(csv_path)
    logger.info(f"Loaded {len(data_df)} trail observations from {csv_path}")

    X = data_df[FEATURE_COLUMNS]
    y = data_df["species_observed"]
    classes_list = sorted(list(y.unique()))

    # Attempt 1: Prior Labs Official Cloud API (if TABPFN_API_KEY / TABPFN_TOKEN is configured)
    api_key = os.getenv("TABPFN_API_KEY") or os.getenv("TABPFN_TOKEN")
    if api_key and api_key != "tabpfn_sk_1234":
        os.environ["TABPFN_TOKEN"] = api_key
        os.environ["TABPFN_API_KEY"] = api_key
        try:
            from tabpfn_client import init as tabpfn_init, TabPFNClassifier as CloudTabPFNClassifier
            logger.info("Connecting to Prior Labs TabPFN Cloud API using API key...")
            try:
                tabpfn_init(api_key=api_key)
            except Exception:
                pass
            cloud_tabpfn = CloudTabPFNClassifier()
            cloud_tabpfn.fit(X, y)
            model_instance = cloud_tabpfn
            model_type = "TabPFN Cloud (Prior Labs Official API)"
            logger.info("Successfully authenticated and fitted TabPFN Cloud Foundation Model via Prior Labs API!")
            return
        except Exception as cloud_err:
            logger.warning(f"Could not initialize TabPFN via cloud client ({cloud_err}). Attempting local TabPFN...")

    # Attempt 2: Prior Labs Local TabPFN Foundation Model
    try:
        from tabpfn import TabPFNClassifier
        device = os.getenv("TABPFN_DEVICE", "cpu")
        n_ensemble = int(os.getenv("TABPFN_N_ENSEMBLE", "4"))
        
        logger.info(f"Initializing local TabPFNClassifier (device={device})...")
        try:
            # TabPFN v2.0+ standard initialization (Prior Labs)
            tabpfn = TabPFNClassifier(device=device)
        except TypeError:
            try:
                # TabPFN legacy v0.1 capitalization
                tabpfn = TabPFNClassifier(device=device, N_ensemble_configurations=n_ensemble)
            except TypeError:
                # Fallback to default init
                tabpfn = TabPFNClassifier()

        tabpfn.fit(X, y)
        model_instance = tabpfn
        model_type = "TabPFN v2.0 (Foundation Model - Prior Labs)"
        logger.info("Successfully initialized and fitted TabPFN tabular foundation model!")
        return
    except Exception as e:
        logger.warning(f"Could not initialize TabPFN directly ({e}). Initializing high-precision ensemble fallback...")

    # Attempt 2: Resilient scikit-learn ensemble fallback
    try:
        from sklearn.ensemble import HistGradientBoostingClassifier, RandomForestClassifier
        from sklearn.pipeline import Pipeline
        from sklearn.preprocessing import StandardScaler

        pipeline = Pipeline([
            ("scaler", StandardScaler()),
            ("clf", RandomForestClassifier(n_estimators=100, random_state=42))
        ])
        pipeline.fit(X, y)
        model_instance = pipeline
        model_type = "TabPFN Compatible Ensemble (RandomForest Fallback)"
        logger.info("Fitted Scikit-Learn Ensemble fallback model for biodiversity predictions.")
    except Exception as exc:
        logger.error(f"Failed to fit fallback model: {exc}")
        raise


@app.on_event("startup")
def startup_event():
    load_dataset_and_train_model()


# Pydantic Schemas
class PredictionRequest(BaseModel):
    latitude: float = Field(..., description="GPS Latitude of the hiker on trail")
    longitude: float = Field(..., description="GPS Longitude of the hiker on trail")
    elevation_m: float = Field(default=250.0, description="Elevation above sea level in meters")
    month: Optional[int] = Field(default=None, description="Month (1-12). Defaults to current month")
    hour: Optional[int] = Field(default=None, description="Hour of the day (0-23). Defaults to current hour")
    canopy_density: Optional[float] = Field(default=0.75, description="Forest canopy density (0.0 to 1.0)")
    temperature_c: Optional[float] = Field(default=14.0, description="Ambient temperature in Celsius")
    top_k: Optional[int] = Field(default=3, description="Number of top species to return")


class SpeciesSighting(BaseModel):
    species: str
    scientific_name: str
    category: str
    probability: float
    confidence_category: str
    audio_cue: str
    visual_cue: str
    ecological_niche: str


class PredictionResponse(BaseModel):
    status: str
    model_used: str
    top_sightings: List[SpeciesSighting]
    query_features: Dict[str, Any]
    timestamp: str


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "TrailWhisper TabPFN Microservice",
        "model_type": model_type,
        "dataset_rows": len(data_df) if data_df is not None else 0,
        "species_catalog": list(SPECIES_METADATA.keys())
    }


@app.get("/species")
def list_species():
    return {
        "species": SPECIES_METADATA
    }


@app.post("/predict", response_model=PredictionResponse)
def predict_sightings(req: PredictionRequest):
    if model_instance is None:
        raise HTTPException(status_code=503, detail="Model is not ready")

    now = datetime.now()
    month = req.month if req.month is not None else now.month
    hour = req.hour if req.hour is not None else now.hour

    input_df = pd.DataFrame([{
        "latitude": req.latitude,
        "longitude": req.longitude,
        "elevation_m": req.elevation_m,
        "month": month,
        "hour": hour,
        "canopy_density": req.canopy_density if req.canopy_density is not None else 0.75,
        "temperature_c": req.temperature_c if req.temperature_c is not None else 14.0
    }])

    # Predict probabilities
    try:
        probs = model_instance.predict_proba(input_df)[0]
        classes = model_instance.classes_
    except Exception as e:
        logger.error(f"Inference error: {e}")
        raise HTTPException(status_code=500, detail=f"Inference failure: {str(e)}")

    # Sort descending by probability
    ranked_indices = np.argsort(probs)[::-1]
    top_k = min(req.top_k or 3, len(classes))

    results: List[SpeciesSighting] = []
    for idx in ranked_indices[:top_k]:
        species_name = classes[idx]
        prob_val = float(probs[idx])
        
        # Categorize confidence
        if prob_val >= 0.40:
            confidence = "High Probability"
        elif prob_val >= 0.20:
            confidence = "Moderate Probability"
        else:
            confidence = "Possible Occurrence"

        meta = SPECIES_METADATA.get(species_name, {
            "scientific_name": "Unknown",
            "category": "Wildlife",
            "audio_cue": "Stay alert to subtle sounds in the trail vicinity.",
            "visual_cue": "Observe tree trunks and trail edges closely.",
            "ecological_niche": "Local trail flora and fauna."
        })

        results.append(SpeciesSighting(
            species=species_name,
            scientific_name=meta["scientific_name"],
            category=meta["category"],
            probability=round(prob_val, 4),
            confidence_category=confidence,
            audio_cue=meta["audio_cue"],
            visual_cue=meta["visual_cue"],
            ecological_niche=meta["ecological_niche"]
        ))

    return PredictionResponse(
        status="success",
        model_used=model_type,
        top_sightings=results,
        query_features=input_df.to_dict(orient="records")[0],
        timestamp=now.isoformat()
    )


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=True)
