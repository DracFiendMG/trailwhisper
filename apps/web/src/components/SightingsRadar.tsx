import React from "react";
import { Compass, Eye, Sparkles } from "lucide-react";

export interface SightingItem {
  species: string;
  scientific_name: string;
  category: string;
  probability: number;
  confidence_category: string;
  audio_cue: string;
  visual_cue: string;
  ecological_niche: string;
}

interface SightingsRadarProps {
  sightings: SightingItem[];
  selectedSpeciesName: string;
  modelUsed?: string;
}

export const SightingsRadar: React.FC<SightingsRadarProps> = ({
  sightings,
  selectedSpeciesName,
  modelUsed = "TabPFN Foundation Model",
}) => {
  return (
    <div className="card-panel">
      <div className="card-title">
        <Compass size={18} color="#34d399" />
        <span>TabPFN Biodiversity Radar</span>
        <span
          style={{
            marginLeft: "auto",
            fontSize: "0.7rem",
            color: "#6ee7b7",
            fontFamily: "var(--font-mono)",
            background: "rgba(16, 185, 129, 0.1)",
            padding: "0.2rem 0.5rem",
            borderRadius: "4px",
            border: "1px solid rgba(52, 211, 153, 0.2)"
          }}
        >
          {modelUsed}
        </span>
      </div>

      <div>
        {sightings.map((s, idx) => {
          const isSelected = s.species === selectedSpeciesName;
          const probPercent = Math.round(s.probability * 100);

          return (
            <div
              key={idx}
              className="species-card"
              style={{
                borderColor: isSelected ? "var(--accent-mint)" : undefined,
                background: isSelected ? "rgba(16, 185, 129, 0.15)" : undefined,
              }}
            >
              <div className="species-info">
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <span className="species-title">{s.species}</span>
                  {isSelected && (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.2rem",
                        fontSize: "0.65rem",
                        color: "#f59e0b",
                        background: "rgba(245, 158, 11, 0.15)",
                        padding: "0.1rem 0.4rem",
                        borderRadius: "9999px",
                        fontWeight: 700,
                      }}
                    >
                      <Sparkles size={10} />
                      Active Whisper
                    </span>
                  )}
                </div>
                <span className="species-latin">{s.scientific_name} • {s.category}</span>
                <div style={{ display: "flex", gap: "0.8rem", marginTop: "0.4rem", fontSize: "0.75rem", color: "#a7f3d0" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                    <Eye size={12} color="#34d399" /> {s.visual_cue.slice(0, 48)}...
                  </span>
                </div>
              </div>

              <div className="prob-meter-wrap">
                <span className="prob-pct">{probPercent}%</span>
                <div className="prob-bar">
                  <div className="prob-bar-fill" style={{ width: `${probPercent}%` }} />
                </div>
                <span style={{ fontSize: "0.65rem", color: "#6ee7b7", fontFamily: "var(--font-mono)" }}>
                  {s.confidence_category}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
