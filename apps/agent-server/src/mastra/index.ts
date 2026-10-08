import { Mastra } from "@mastra/core";
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

// Centralized Agent and Tools Orchestration
export const mastra = new Mastra({
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
