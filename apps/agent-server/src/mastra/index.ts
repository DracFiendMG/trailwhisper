import { Mastra } from "@mastra/core";
import { LibSQLStore } from "@mastra/libsql";
import { natureGuideAgent } from "./agents/natureGuide.js";
import {
  predictSightingsTool,
  runPredictSightings,
  SpeciesPrediction,
  TabPFNOutput,
} from "./tools/tabpfnTool.js";
import {
  generateFieldGuideTool,
  runGenerateFieldGuide,
  GemmaOutput,
} from "./tools/gemmaTool.js";
import {
  synthesizeAudioTool,
  runSynthesizeAudio,
  ElevenLabsOutput,
} from "./tools/elevenlabsTool.js";

const storageUrl = process.env.MASTRA_STORAGE_URL || "file:trailwhisper.db";

// Centralized Agent and Tools Orchestration with persistent LibSQL storage
export const mastra = new Mastra({
  storage: new LibSQLStore({
    id: "trailwhisper-storage",
    url: storageUrl,
  }),
  agents: {
    natureGuide: natureGuideAgent,
  },
});

export {
  natureGuideAgent,
  predictSightingsTool,
  runPredictSightings,
  generateFieldGuideTool,
  runGenerateFieldGuide,
  synthesizeAudioTool,
  runSynthesizeAudio,
};

export type {
  SpeciesPrediction,
  TabPFNOutput,
  GemmaOutput,
  ElevenLabsOutput,
};
