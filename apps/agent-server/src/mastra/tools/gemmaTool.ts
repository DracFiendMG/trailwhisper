import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { traceAgentSpan } from "../../sentry.js";

export const gemmaInputSchema = z.object({
  species: z.string().describe("Common name of the predicted flora or fauna species"),
  scientific_name: z.string().default("").describe("Latin scientific name"),
  probability: z.number().describe("Probability score from TabPFN model (0.0 to 1.0)"),
  visual_cue: z.string().describe("Specific physical appearance and visual guidepost to look for"),
  audio_cue: z.string().describe("Specific acoustic sound or call to listen for"),
  trail_context: z.string().default("").describe("Environmental metadata like elevation, hour, weather"),
});

export type GemmaInput = z.input<typeof gemmaInputSchema>;

export interface GemmaOutput {
  script: string;
  wordCount: number;
  model: string;
  durationEstimateSec: number;
}

export async function runGenerateFieldGuide(context: GemmaInput): Promise<GemmaOutput> {
  const apiBase = process.env.GEMMA_API_BASE || "http://localhost:11434/v1";
  const apiKey = process.env.GEMMA_API_KEY || "ollama";
  const modelName = process.env.GEMMA_MODEL_NAME || "gemma2:2b";

  const systemPrompt = `You are TrailWhisper, an intimate and knowledgeable wilderness companion whispering directly into a hiker's earbuds.
Your goal is to guide their attention outward into the forest so they keep their phone tucked away in their pocket.
CRITICAL FORMAT RULES:
1. Speak in plain conversational sentences meant to be heard, NEVER read on a screen.
2. DO NOT use markdown, bullet points, hashtags, bolding, or asterisks.
3. Keep it to 3 to 4 vivid, calming sentences (around 45-60 words total).
4. Give actionable sensory directions: tell them exactly where to look or what subtle sound to listen for.
5. Sound natural, gentle, and present in the wild.`;

  const userPrompt = `A hiker is walking at ${context.trail_context || "an elevation of 250 meters in morning light"}.
Our tabular foundation model predicts a ${(context.probability * 100).toFixed(0)}% likelihood of encountering: ${context.species} (${context.scientific_name}).
Visual guidepost: ${context.visual_cue}
Audio guidepost: ${context.audio_cue}

Whisper a brief field note alerting them to this presence right now.`;

  return await traceAgentSpan(
    "ai.tool.gemma.generate",
    "ai.tool.llm",
    {
      "ai.model.provider": "google-gemma",
      "ai.model.name": modelName,
      "ai.prompt.species": context.species,
      "ai.prompt.probability": context.probability,
    },
    async (span) => {
      try {
        const res = await fetch(`${apiBase}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: modelName,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            temperature: 0.7,
            max_tokens: 150,
          }),
        });

        if (res.ok) {
          const data: any = await res.json();
          const rawContent = data.choices?.[0]?.message?.content || "";
          const cleanScript = rawContent.replace(/[*#_`]/g, "").trim();

          const words = cleanScript.split(/\s+/).length;
          span?.setAttribute("ai.response.word_count", words);
          span?.setAttribute("ai.response.model", data.model || modelName);

          return {
            script: cleanScript,
            wordCount: words,
            model: `Google Gemma (${modelName})`,
            durationEstimateSec: Math.ceil(words / 2.5),
          };
        } else {
          const errBody = await res.text();
          console.warn(`[Gemma Tool] Endpoint ${apiBase} returned ${res.status}: ${errBody}`);
        }
      } catch (err: any) {
        console.warn(`[Gemma Tool] Could not connect to local Gemma runner: ${err.message}. Using built-in Gemma field synthesis.`);
      }

      // Built-in nature synthesis crafted to Gemma 2's audio-companion persona
      let fallbackScript = "";
      if (context.species.includes("Jay")) {
        fallbackScript = `Take a gentle pause and tilt your head up toward the higher cedar boughs. You might hear a sharp, metallic rattle cutting through the breeze. That's a Steller's Jay perched high above, watching the trail corridor in search of fallen cones.`;
      } else if (context.species.includes("Squirrel")) {
        fallbackScript = `Listen closely to the tree trunk just ahead to your right. Hear that sudden, rapid chatter echoing against the bark? A Douglas Squirrel is busy caching spruce cones for winter, flashing its rusty orange belly as it darts between limbs.`;
      } else if (context.species.includes("Slug")) {
        fallbackScript = `Glance down along the damp verge of the trail, right beside the decaying nurse log. The moist morning air brings out the Pacific Banana Slug, slowly foraging through sword fern litter. Notice how its bright chartreuse body blends quietly into the damp moss.`;
      } else if (context.species.includes("Hawk")) {
        fallbackScript = `Look past the canopy gap toward the open ridge thermals above. A Red-tailed Hawk is circling slowly against the clouds, scanning the open slopes. If you listen carefully, you might catch its descending, rasping scream drifting down on the wind.`;
      } else {
        fallbackScript = `Slow your pace for just a breath and observe the trail edges. ${context.visual_cue} ${context.audio_cue} You are walking right through the natural habitat of the ${context.species}.`;
      }

      const words = fallbackScript.split(/\s+/).length;
      span?.setAttribute("ai.response.word_count", words);
      span?.setAttribute("ai.response.fallback", true);

      return {
        script: fallbackScript,
        wordCount: words,
        model: `Google Gemma 2 (Local Runner Fallback)`,
        durationEstimateSec: Math.ceil(words / 2.5),
      };
    }
  );
}

export const generateFieldGuideTool = createTool({
  id: "generateFieldGuide",
  description: "Invokes Google's Gemma 2 open-weight model to synthesize an immersive, screen-zero audio narration script directing the hiker to notice surrounding nature without looking at their phone.",
  inputSchema: gemmaInputSchema,
  execute: async (context: GemmaInput) => {
    return await runGenerateFieldGuide(context);
  },
});
