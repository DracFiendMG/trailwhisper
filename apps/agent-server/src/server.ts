import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { initSentry, Sentry, traceAgentSpan } from "./sentry.js";
import {
  runPredictSightings,
  runGenerateFieldGuide,
  runSynthesizeAudio,
  predictSightingsTool,
  generateFieldGuideTool,
  synthesizeAudioTool,
} from "./mastra/index.js";

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Robustly find and load .env from workspace root or current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envCandidates = [
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), "..", "..", ".env"),
  path.resolve(__dirname, "..", "..", ".env"),
  path.resolve(__dirname, "..", "..", "..", ".env"),
];

let envLoaded = false;
for (const envPath of envCandidates) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    console.log(`[Config] Loaded environment variables from: ${envPath}`);
    envLoaded = true;
    break;
  }
}

if (!envLoaded) {
  dotenv.config();
}

// Initialize Sentry AI agent tracing
initSentry();

const app = express();
const port = parseInt(process.env.PORT || "4000", 10);

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "healthy",
    framework: "Mastra (@mastra/core)",
    service: "TrailWhisper Agent Server",
    observability: "Sentry OpenTelemetry Agent Tracing",
    features: [
      "TabPFN Biodiversity Predictor",
      "Gemma 2 Audio Script Synthesis",
      "ElevenLabs Voice Streaming",
    ],
    timestamp: new Date().toISOString(),
  });
});

/**
 * Main Hiker Step API:
 * Triggered by pocket PWA when GPS updates or a trail micro-waypoint is reached.
 * Orchestrates TabPFN -> Gemma 2 -> ElevenLabs pipeline inside a Sentry agent trace.
 */
app.post("/api/trail/step", async (req: Request, res: Response) => {
  const {
    latitude = 47.9250,
    longitude = -123.6300,
    elevation_m = 220.0,
    canopy_density = 0.80,
    temperature_c = 14.0,
    previous_species = "",
  } = req.body;

  const startTime = Date.now();

  try {
    const result = await traceAgentSpan(
      "ai.agent.trail_step",
      "ai.agent.orchestration",
      {
        "trail.lat": latitude,
        "trail.lon": longitude,
        "trail.elevation": elevation_m,
      },
      async (span) => {
        // Step 1: Predict sightings using TabPFN foundation model
        const tabpfnResult = await runPredictSightings({
          latitude,
          longitude,
          elevation_m,
          canopy_density,
          temperature_c,
          top_k: 3,
        });

        const topSightings = tabpfnResult.top_sightings || [];

        // Pick top candidate (or second if immediately repeated)
        let selectedSighting = topSightings[0];
        if (topSightings.length > 1 && selectedSighting?.species === previous_species) {
          selectedSighting = topSightings[1];
        }

        if (!selectedSighting) {
          throw new Error("No species predicted for current coordinates");
        }

        span?.setAttribute("ai.selected_species", selectedSighting.species);
        span?.setAttribute("ai.selected_probability", selectedSighting.probability);

        // Step 2: Synthesize audio field guide note using Google Gemma 2
        const trailContext = `elevation ${elevation_m.toFixed(0)}m, canopy density ${(canopy_density * 100).toFixed(0)}%, temperature ${temperature_c.toFixed(1)}°C`;
        const gemmaResult = await runGenerateFieldGuide({
          species: selectedSighting.species,
          scientific_name: selectedSighting.scientific_name,
          probability: selectedSighting.probability,
          visual_cue: selectedSighting.visual_cue,
          audio_cue: selectedSighting.audio_cue,
          trail_context: trailContext,
        });

        // Step 3: Stream speech synthesis via ElevenLabs
        const audioResult = await runSynthesizeAudio({
          text: gemmaResult.script,
        });

        const totalDurationMs = Date.now() - startTime;
        span?.setAttribute("ai.workflow.total_duration_ms", totalDurationMs);

        return {
          location: { latitude, longitude, elevation_m },
          sightings: topSightings,
          selectedSpecies: selectedSighting,
          fieldGuide: gemmaResult,
          audio: audioResult,
          telemetry: {
            durationMs: totalDurationMs,
            modelTabular: tabpfnResult.model_used,
            modelReasoning: gemmaResult.model,
            audioProvider: audioResult.isMock ? "Browser Speech API (Fallback)" : "ElevenLabs Turbo v2.5",
            sentryRelease: "trailwhisper@0.1.0",
            timestamp: new Date().toISOString(),
          },
        };
      }
    );

    res.json(result);
  } catch (error: any) {
    console.error("[Agent Step Error]", error);
    Sentry.captureException(error);
    res.status(500).json({
      error: "Failed to process trail waypoint",
      message: error?.message || "Internal server error",
    });
  }
});

/**
 * Direct TabPFN Prediction Endpoint
 */
app.post("/api/trail/predict", async (req: Request, res: Response) => {
  try {
    const result = await runPredictSightings(req.body);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Direct Gemma + ElevenLabs Whisper Endpoint
 */
app.post("/api/trail/whisper", async (req: Request, res: Response) => {
  try {
    const { species, scientific_name = "", visual_cue = "", audio_cue = "", probability = 0.5, trail_context = "" } = req.body;
    const gemma = await runGenerateFieldGuide({
      species,
      scientific_name,
      visual_cue,
      audio_cue,
      probability,
      trail_context,
    });

    const audio = await runSynthesizeAudio({
      text: gemma.script,
    });

    res.json({ gemma, audio });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`🌲 [TrailWhisper] Agent server listening on http://localhost:${port}`);
  console.log(`📡 [Mastra] Core Agent & Tools ready`);
  console.log(`🔍 [Sentry] Tracing active for AI agent workflows`);
});
