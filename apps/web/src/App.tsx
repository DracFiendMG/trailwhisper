import React, { useState, useEffect } from "react";
import {
  Trees,
  Headphones,
  Sparkles,
  MapPin,
  ChevronRight,
  Volume2,
} from "lucide-react";
import { OLYMPIC_TRAIL_WAYPOINTS, TrailWaypoint } from "./utils/trailSimulator.js";
import { AudioPlayer } from "./components/AudioPlayer.js";
import { SightingsRadar, SightingItem } from "./components/SightingsRadar.js";
import { TelemetryDrawer } from "./components/TelemetryDrawer.js";

interface StepResponse {
  location: { latitude: number; longitude: number; elevation_m: number };
  sightings: SightingItem[];
  selectedSpecies: SightingItem;
  fieldGuide: {
    script: string;
    wordCount: number;
    model: string;
    durationEstimateSec: number;
  };
  audio: {
    status: string;
    audioBase64?: string;
    mimeType: string;
    isMock: boolean;
  };
  telemetry: {
    durationMs: number;
    modelTabular: string;
    modelReasoning: string;
    audioProvider: string;
    sentryRelease: string;
    timestamp: string;
  };
}

export const App: React.FC = () => {
  const [isPocketModeActive, setIsPocketModeActive] = useState<boolean>(true);
  const [selectedWaypointIndex, setSelectedWaypointIndex] = useState<number>(0);
  const [isLoadingStep, setIsLoadingStep] = useState<boolean>(false);
  const [currentStepData, setCurrentStepData] = useState<StepResponse | null>(null);
  const [useDeviceGps, setUseDeviceGps] = useState<boolean>(false);

  const currentWaypoint: TrailWaypoint = OLYMPIC_TRAIL_WAYPOINTS[selectedWaypointIndex];

  // Request waypoint analysis from Mastra agent server
  const triggerTrailStep = async (waypoint: TrailWaypoint) => {
    setIsLoadingStep(true);
    try {
      const response = await fetch("/api/trail/step", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: waypoint.latitude,
          longitude: waypoint.longitude,
          elevation_m: waypoint.elevation_m,
          canopy_density: waypoint.canopy_density,
          temperature_c: waypoint.temperature_c,
          previous_species: currentStepData?.selectedSpecies?.species || "",
        }),
      });

      if (!response.ok) {
        throw new Error(`Agent server HTTP ${response.status}`);
      }

      const data: StepResponse = await response.json();
      setCurrentStepData(data);
    } catch (err: any) {
      console.warn("Could not reach local agent server:", err.message, ". Initializing local demo state.");
      // Simulated response if agent server is booting
      setCurrentStepData({
        location: {
          latitude: waypoint.latitude,
          longitude: waypoint.longitude,
          elevation_m: waypoint.elevation_m,
        },
        sightings: [
          {
            species: "Steller's Jay",
            scientific_name: "Cyanocitta stelleri",
            category: "Bird",
            probability: 0.582,
            confidence_category: "High Probability",
            audio_cue: "Listen for a sharp, harsh rattle in the upper hemlock canopy.",
            visual_cue: "Look up: striking charcoal crest with iridescent cobalt wings.",
            ecological_niche: "Coniferous montane forests; seed storer.",
          },
          {
            species: "Douglas Squirrel",
            scientific_name: "Tamiasciurus douglasii",
            category: "Mammal",
            probability: 0.285,
            confidence_category: "Moderate Probability",
            audio_cue: "Rapid chattering trill echoing from mid-canopy trunks.",
            visual_cue: "Rusty-orange underbelly darting between limbs.",
            ecological_niche: "Conifer cone specialist.",
          },
          {
            species: "Banana Slug",
            scientific_name: "Ariolimax columbianus",
            category: "Mollusk",
            probability: 0.133,
            confidence_category: "Possible Occurrence",
            audio_cue: "Subtle rustle in damp decaying sword fern litter.",
            visual_cue: "Scan trail borders on moist rotting nurse logs.",
            ecological_niche: "Temperate rainforest decomposer.",
          },
        ],
        selectedSpecies: {
          species: "Steller's Jay",
          scientific_name: "Cyanocitta stelleri",
          category: "Bird",
          probability: 0.582,
          confidence_category: "High Probability",
          audio_cue: "Listen for a sharp, harsh rattle in the upper hemlock canopy.",
          visual_cue: "Look up: striking charcoal crest with iridescent cobalt wings.",
          ecological_niche: "Coniferous montane forests; seed storer.",
        },
        fieldGuide: {
          script: `Take a gentle pause and tilt your head up toward the higher cedar boughs. You might hear a sharp, metallic rattle cutting through the breeze. That's a Steller's Jay perched high above, watching the trail corridor in search of fallen cones.`,
          wordCount: 42,
          model: "Google Gemma 2 (Audio Companion)",
          durationEstimateSec: 17,
        },
        audio: {
          status: "ready",
          isMock: true,
          mimeType: "audio/mpeg",
        },
        telemetry: {
          durationMs: 192,
          modelTabular: "TabPFN v2 (Prior Labs)",
          modelReasoning: "Google Gemma 2",
          audioProvider: "ElevenLabs Turbo v2.5",
          sentryRelease: "trailwhisper@0.1.0",
          timestamp: new Date().toISOString(),
        },
      });
    } finally {
      setIsLoadingStep(false);
    }
  };

  // Run on mount or waypoint change
  useEffect(() => {
    triggerTrailStep(currentWaypoint);
  }, [selectedWaypointIndex]);

  const handleNextWaypoint = () => {
    setSelectedWaypointIndex((prev) => (prev + 1) % OLYMPIC_TRAIL_WAYPOINTS.length);
  };

  // Device Geolocation Watcher
  useEffect(() => {
    if (!useDeviceGps || !navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        triggerTrailStep({
          id: "gps-live",
          name: "Live GPS Waypoint",
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          elevation_m: pos.coords.altitude || 250,
          canopy_density: 0.75,
          temperature_c: 15,
          description: "Live coordinate broadcast from hiker device.",
        });
      },
      (err) => {
        console.warn("GPS tracking error:", err.message);
        setUseDeviceGps(false);
      },
      { enableHighAccuracy: true, maximumAge: 10000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [useDeviceGps]);

  return (
    <div className="app-container">
      {/* Brand Header */}
      <header className="brand-header">
        <div className="brand-title-wrap">
          <div className="brand-icon-orb">
            <Trees size={22} />
          </div>
          <div>
            <h1 className="brand-title">TrailWhisper</h1>
            <p className="brand-subtitle">Screen-Zero Pocket Audio Companion</p>
          </div>
        </div>

        <div className="badge-row">
          <span className="badge-pill">
            <Sparkles size={12} /> Hacktoberfest 2026
          </span>
          <span className="badge-pill">Mastra</span>
          <span className="badge-pill">TabPFN</span>
          <span className="badge-pill">Gemma 2</span>
          <span className="badge-pill">ElevenLabs</span>
          <span className="badge-pill">Sentry</span>
        </div>
      </header>

      {/* Screen-Zero Hero Card */}
      <section className="pocket-hero">
        <div className="pulse-radar-core">
          <div className="pulse-wave" />
          <div className="pulse-wave-delayed" />
          <Headphones size={38} color="#34d399" />
        </div>

        <p className="hero-status-tag">
          {isPocketModeActive ? "● POCKET MODE ARMED & LISTENING" : "○ POCKET MODE STANDBY"}
        </p>

        <h2 className="hero-heading">
          {isPocketModeActive ? "Eyes on the Trail. Phone in your Pocket." : "Activate Hands-Free Nature Guide"}
        </h2>

        <p className="hero-description">
          {isPocketModeActive
            ? "Put your phone away. As you walk, TabPFN tabular models predict incoming wildlife sightings and Gemma whispers audio field notes directly into your earbuds."
            : "Click below to begin your hike. Lock screen media controls are active so your screen stays dark."}
        </p>

        <button
          className={`btn-pocket-toggle ${isPocketModeActive ? "active" : ""}`}
          onClick={() => setIsPocketModeActive(!isPocketModeActive)}
        >
          <Headphones size={18} />
          <span>{isPocketModeActive ? "Pocket Mode Active (Touch Grass)" : "Arm Pocket Mode"}</span>
        </button>
      </section>

      {/* Live Audio Narration Script */}
      <section className="narration-box">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.85rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Volume2 size={18} color="#34d399" />
            <h3 style={{ fontSize: "1rem", fontWeight: 700 }}>
              Live Nature Whisper: {currentStepData?.selectedSpecies?.species || "Analyzing Trail..."}
            </h3>
          </div>
          <span style={{ fontSize: "0.75rem", color: "#6ee7b7", fontFamily: "var(--font-mono)" }}>
            {currentStepData?.fieldGuide?.model || "Google Gemma 2"}
          </span>
        </div>

        <p className="audio-script-text">
          {isLoadingStep ? (
            <span style={{ opacity: 0.6 }}>Predicting biodiversity with TabPFN and synthesizing Gemma narration...</span>
          ) : (
            `"${currentStepData?.fieldGuide?.script || "Walk gently and breathe in the damp pine scent..."}"`
          )}
        </p>

        <AudioPlayer
          audioBase64={currentStepData?.audio?.audioBase64}
          scriptText={currentStepData?.fieldGuide?.script || ""}
          speciesName={currentStepData?.selectedSpecies?.species || ""}
          isMock={currentStepData?.audio?.isMock ?? true}
          onNextWaypoint={handleNextWaypoint}
        />
      </section>

      {/* Controls & Waypoint Selector */}
      <div className="control-grid">
        {/* Trail Simulator Card */}
        <div className="card-panel">
          <div className="card-title">
            <MapPin size={18} color="#34d399" />
            <span>Olympic Trail Waypoints (Simulator)</span>
            <button
              onClick={handleNextWaypoint}
              style={{
                marginLeft: "auto",
                background: "rgba(52, 211, 153, 0.15)",
                border: "1px solid var(--accent-mint)",
                color: "var(--accent-mint)",
                borderRadius: "6px",
                padding: "0.25rem 0.5rem",
                fontSize: "0.75rem",
                fontWeight: 600,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.25rem",
              }}
            >
              Step Forward <ChevronRight size={14} />
            </button>
          </div>

          <div className="waypoint-selector">
            {OLYMPIC_TRAIL_WAYPOINTS.map((wp, idx) => (
              <button
                key={wp.id}
                className={`waypoint-btn ${idx === selectedWaypointIndex ? "selected" : ""}`}
                onClick={() => setSelectedWaypointIndex(idx)}
              >
                <div>
                  <div className="waypoint-name">{wp.name}</div>
                  <div className="waypoint-meta">
                    {wp.elevation_m}m • Canopy: {(wp.canopy_density * 100).toFixed(0)}% • {wp.temperature_c}°C
                  </div>
                </div>
                {idx === selectedWaypointIndex && <MapPin size={16} color="#34d399" />}
              </button>
            ))}
          </div>
        </div>

        {/* TabPFN Probability Radar */}
        <SightingsRadar
          sightings={currentStepData?.sightings || []}
          selectedSpeciesName={currentStepData?.selectedSpecies?.species || ""}
          modelUsed={currentStepData?.telemetry?.modelTabular}
        />
      </div>

      {/* Telemetry & Sentry Tracing Drawer */}
      <TelemetryDrawer
        telemetry={currentStepData?.telemetry}
        coords={
          currentStepData?.location || {
            latitude: currentWaypoint.latitude,
            longitude: currentWaypoint.longitude,
            elevation_m: currentWaypoint.elevation_m,
          }
        }
      />
    </div>
  );
};
export default App;
