import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { traceAgentSpan } from "../../sentry.js";

export const elevenlabsInputSchema = z.object({
  text: z.string().describe("Spoken field note script to convert into voice audio"),
  voice_id: z.string().optional().describe("ElevenLabs Voice ID (defaults to Charlotte or George)"),
  model_id: z.string().optional().default("eleven_turbo_v2_5").describe("ElevenLabs model ID"),
});

export type ElevenLabsInput = z.input<typeof elevenlabsInputSchema>;

export interface ElevenLabsOutput {
  status: string;
  audioBase64?: string;
  mimeType: string;
  characterCount: number;
  voiceId: string;
  modelId: string;
  isMock: boolean;
  message?: string;
}

export async function runSynthesizeAudio(context: ElevenLabsInput): Promise<ElevenLabsOutput> {
  const apiKey = process.env.ELEVENLABS_API_KEY || "";
  const voiceId = context.voice_id || process.env.ELEVENLABS_VOICE_ID || "XB0fDUnXU5ikFXr333ED";
  const modelId = context.model_id || process.env.ELEVENLABS_MODEL_ID || "eleven_turbo_v2_5";

  const charCount = context.text.length;

  return await traceAgentSpan(
    "ai.tool.elevenlabs.tts",
    "ai.tool.audio",
    {
      "ai.audio.provider": "elevenlabs",
      "ai.audio.voice_id": voiceId,
      "ai.audio.model_id": modelId,
      "ai.audio.char_count": charCount,
    },
    async (span) => {
      if (!apiKey || apiKey === "your_elevenlabs_api_key_here") {
        console.warn("[ElevenLabs Tool] No ELEVENLABS_API_KEY detected. Returning client-side speech synthesis directive.");
        span?.setAttribute("ai.audio.mode", "client_fallback");
        return {
          status: "ready_for_client_tts",
          mimeType: "text/plain",
          characterCount: charCount,
          voiceId,
          modelId,
          isMock: true,
          message: "Using browser Web Speech API / client-side audio player for screen-zero delivery while API key is unconfigured.",
        };
      }

      try {
        const endpoint = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`;
        const res = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "xi-api-key": apiKey,
          },
          body: JSON.stringify({
            text: context.text,
            model_id: modelId,
            voice_settings: {
              stability: 0.60,
              similarity_boost: 0.80,
              style: 0.20,
              use_speaker_boost: true,
            },
          }),
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`ElevenLabs API returned ${res.status}: ${errText}`);
        }

        const arrayBuffer = await res.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64Audio = buffer.toString("base64");

        span?.setAttribute("ai.audio.bytes_received", buffer.length);
        span?.setAttribute("ai.audio.mode", "elevenlabs_stream");

        return {
          status: "success",
          audioBase64: `data:audio/mpeg;base64,${base64Audio}`,
          mimeType: "audio/mpeg",
          characterCount: charCount,
          voiceId,
          modelId,
          isMock: false,
        };
      } catch (err: any) {
        console.error(`[ElevenLabs Tool] Error streaming audio: ${err.message}`);
        span?.setStatus({ code: 2, message: err.message });

        return {
          status: "client_fallback_after_error",
          mimeType: "text/plain",
          characterCount: charCount,
          voiceId,
          modelId,
          isMock: true,
          message: `ElevenLabs call failed (${err.message}); fallback to client audio player.`,
        };
      }
    }
  );
}

export const synthesizeAudioTool = createTool({
  id: "synthesizeAudio",
  description: "Converts the nature guide field script into lifelike, hands-free spoken audio using ElevenLabs low-latency voice streaming.",
  inputSchema: elevenlabsInputSchema,
  execute: async (context: ElevenLabsInput) => {
    return await runSynthesizeAudio(context);
  },
});
