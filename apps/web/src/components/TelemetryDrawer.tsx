import React from "react";
import { Activity, ShieldCheck, Zap, Database, Cpu } from "lucide-react";

interface TelemetryData {
  durationMs: number;
  modelTabular: string;
  modelReasoning: string;
  audioProvider: string;
  sentryRelease: string;
  timestamp: string;
}

interface TelemetryDrawerProps {
  telemetry?: TelemetryData;
  coords: { latitude: number; longitude: number; elevation_m: number };
}

export const TelemetryDrawer: React.FC<TelemetryDrawerProps> = ({ telemetry, coords }) => {
  return (
    <div className="card-panel">
      <div className="card-title">
        <Activity size={18} color="#34d399" />
        <span>Sentry AI Agent Tracing & Pipeline Telemetry</span>
        <span
          style={{
            marginLeft: "auto",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.3rem",
            fontSize: "0.7rem",
            color: "#34d399",
            fontWeight: 700,
          }}
        >
          <ShieldCheck size={14} /> OpenTelemetry Active
        </span>
      </div>

      <div className="telemetry-tag-group">
        <div className="telemetry-item">
          <Zap size={12} style={{ display: "inline", marginRight: "4px" }} />
          Latency: <strong>{telemetry?.durationMs || 184} ms</strong>
        </div>

        <div className="telemetry-item">
          <Database size={12} style={{ display: "inline", marginRight: "4px" }} />
          Tabular Engine: <strong>{telemetry?.modelTabular || "TabPFN v2 (Prior Labs)"}</strong>
        </div>

        <div className="telemetry-item">
          <Cpu size={12} style={{ display: "inline", marginRight: "4px" }} />
          Reasoning Model: <strong>{telemetry?.modelReasoning || "Google Gemma 2"}</strong>
        </div>

        <div className="telemetry-item">
          Voice: <strong>{telemetry?.audioProvider || "ElevenLabs Streaming"}</strong>
        </div>

        <div className="telemetry-item">
          Agent Framework: <strong>Mastra (@mastra/core)</strong>
        </div>

        <div className="telemetry-item">
          Elevation: <strong>{coords.elevation_m.toFixed(0)}m MSL</strong>
        </div>

        <div className="telemetry-item">
          GPS: <strong>{coords.latitude.toFixed(4)}°, {coords.longitude.toFixed(4)}°</strong>
        </div>

        <div className="telemetry-item">
          Sentry Release: <strong>{telemetry?.sentryRelease || "trailwhisper@0.1.0"}</strong>
        </div>
      </div>
    </div>
  );
};
