# TrailWhisper: Implementation & Architecture Plan

**Hacktoberfest 2026 Week 1 Challenge ("Touch Grass" — Oct 5–11, 2026)**  
*Screen-Zero, Pocket-First AI Audio Companion for Nature Trails*

---

## 1. Executive Summary & Prize Target Alignment

TrailWhisper predicts flora and fauna sightings along hiking trails using tabular foundation models and whispers contextual, immersive nature stories into the hiker's earbuds as they walk—keeping their eyes on the trail and phone in their pocket.

| Prize Target | Prize | Technology / Integration Strategy |
| :--- | :--- | :--- |
| **Best Use of Mastra** | $100 | Mastra agent (`@mastra/core`), memory, workflow tools (`predictSightings`, `generateFieldGuide`, `synthesizeAudio`). |
| **Best Use of TabPFN** | $200 | Prior Labs' TabPFN tabular foundation model running in a FastAPI microservice on curated eBird/GBIF trail dataset. |
| **Best Use of Gemma** | $200 | Google's open-weight Gemma 2 model (`gemma-2-2b-it` / `gemma-2-9b-it`) prompt-engineered for conversational, audio-first narration. |
| **Best Use of ElevenLabs** | $100 | ElevenLabs Flash v2 / Turbo v2.5 low-latency streaming TTS API for natural pacing. |
| **Best Use of Render** | $200 | Multi-service `render.yaml` Blueprint + production Dockerfiles for Node agent and Python ML microservice. |
| **Best Use of Sentry** | $100 | Sentry Agent Tracing (`@sentry/node`) with OpenTelemetry spans tracking tool latency, TabPFN calls, and audio buffer times. |

---

## 2. High-Level Architecture & Flow

```mermaid
flowchart TD
    subgraph Client ["Pocket Client (Web / PWA)"]
        GPS["HTML5 Geolocation / Trail Simulator"]
        Audio["HTML5 Audio + MediaSession API (Lockscreen)"]
    end

    subgraph AgentServer ["Agent Server (Node.js + Mastra)"]
        Sentry["Sentry SDK (Agent Tracing & Spans)"]
        Agent["NatureGuideAgent (Mastra Core)"]
        ToolTab["Tool: predictSightings"]
        ToolGemma["Tool: generateFieldGuide"]
        ToolAudio["Tool: synthesizeAudio"]
    end

    subgraph MLService ["Tabular ML Service (Python + FastAPI)"]
        TabPFN["TabPFN Foundation Model"]
        Dataset[("eBird / GBIF Trail Dataset")]
    end

    subgraph ExternalEngines ["AI & Audio Providers"]
        Gemma["Google Gemma 2 (Ollama / vLLM / Endpoint)"]
        ElevenLabs["ElevenLabs Voice Streaming API"]
    end

    GPS -->|"POST /api/trail/step (Lat, Lon, Elev, Time)"| Agent
    Agent --> Sentry
    Agent --> ToolTab
    ToolTab -->|"HTTP /predict"| TabPFN
    TabPFN --> Dataset
    TabPFN -->|"Top Species Probabilities"| ToolTab
    ToolTab --> Agent
    Agent --> ToolGemma
    ToolGemma -->|"Prompt + Probabilities"| Gemma
    Gemma -->|"Audio-Optimized Script"| ToolGemma
    ToolGemma --> Agent
    Agent --> ToolAudio
    ToolAudio -->|"Text Stream"| ElevenLabs
    ElevenLabs -->|"MP3 Stream"| ToolAudio
    ToolAudio --> Agent
    Agent -->|"Audio URL / Base64 + Telemetry"| Audio
```

---

## 3. Directory Layout (Monorepo)

```
trailwhisper/
├── apps/
│   ├── agent-server/              # Node.js + Mastra + Sentry Orchestrator
│   │   ├── src/
│   │   │   ├── mastra/
│   │   │   │   ├── agents/
│   │   │   │   │   └── natureGuide.ts     # Mastra Agent definition & prompt
│   │   │   │   ├── tools/
│   │   │   │   │   ├── tabpfnTool.ts      # Calls TabPFN FastAPI endpoint
│   │   │   │   │   ├── gemmaTool.ts       # Calls Gemma 2 endpoint/runner
│   │   │   │   │   └── elevenlabsTool.ts  # Calls ElevenLabs TTS API
│   │   │   │   └── index.ts               # Mastra configuration export
│   │   │   ├── sentry.ts                  # Sentry Agent Tracing initialization
│   │   │   └── server.ts                  # HTTP API server & route handlers
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── Dockerfile
│   └── web/                       # Zero-Screen Pocket PWA Client
│       ├── public/
│       ├── src/
│       │   ├── App.tsx                    # Main UI: Pocket mode toggle, GPS tracker
│       │   ├── components/                # Audio player, Live sighting cards, Sentry badge
│       │   ├── utils/trailSimulator.ts    # GPS path simulator for indoor/desktop testing
│       │   └── index.css                  # Rich forest dark mode & glassmorphism
│       ├── index.html
│       ├── package.json
│       ├── vite.config.ts
│       └── tsconfig.json
├── services/
│   └── tabpfn-service/            # Python TabPFN Microservice
│       ├── app.py                         # FastAPI app exposing /predict and /health
│       ├── data/
│       │   └── trail_biodiversity.csv     # Curated GBIF/eBird trail observations
│       ├── requirements.txt
│       └── Dockerfile                     # Python 3.11 with TabPFN + PyTorch
├── render.yaml                    # Multi-service Render Blueprint (Agent + ML + Web)
├── package.json                   # Root package.json with npm workspaces
└── README.md                      # Complete setup, credentials, and architecture guide
```

---

## 4. Phase-by-Phase Implementation Roadmap

### Phase 1: Project Scaffolding & Dependencies (Current Step)
- Create root `package.json` for npm workspaces (`apps/agent-server`, `apps/web`).
- Create `services/tabpfn-service` with `requirements.txt`, sample biodiversity CSV, and FastAPI service skeleton.
- Create `apps/agent-server` with `package.json`, `tsconfig.json`, and initial folder structure.
- Create `apps/web` with Vite + React + TypeScript skeleton.

### Phase 2: Python TabPFN Microservice (`services/tabpfn-service`)
- Build realistic dataset with 500+ records of trail wildlife/flora occurrences (Pacific Northwest & alpine trails: Douglas Squirrel, Steller's Jay, Banana Slug, Western Redcedar, Red-tailed Hawk, Pacific Trillium, Black Bear).
- Implement FastAPI app with TabPFN classifier loading, zero-shot inference, and resilient fallback classifier (RandomForest / GradientBoosting) if running on environments without CUDA or compatible wheels.
- Implement `/predict` and `/health` endpoints with Pydantic validation.

### Phase 3: Mastra TypeScript Orchestrator (`apps/agent-server`)
- Initialize `@mastra/core` agent instance (`natureGuideAgent`).
- Implement Mastra Tools:
  - `predictSightings`: connects to TabPFN service with GPS coordinates and time.
  - `generateFieldGuide`: formats context and sends to Gemma 2 (Ollama / OpenAI-compatible / Gemini-fallback) with audio-specific instructions (no markdown, sensory cues, gentle speech rhythm).
  - `synthesizeAudio`: streams speech using ElevenLabs API with graceful fallback to web synthesis.
- Wrap workflow execution in Sentry OpenTelemetry spans (`ai.agent.run`, `ai.tool.tabpfn`, `ai.tool.gemma`, `ai.tool.elevenlabs`).

### Phase 4: Pocket-First Web/Mobile PWA (`apps/web`)
- Design ultra-clean, pocket-friendly UI (Forest Emerald & Obsidian dark mode, glassmorphism).
- Implement Geolocation watcher + interactive Trail Simulator (simulate walking a 2km trail with elevation and waypoints).
- HTML5 Audio & MediaSession API integration (controls on phone lock screen so the phone stays in the pocket).
- Telemetry view showing real-time TabPFN probabilities, Gemma scripts, and Sentry trace IDs.

### Phase 5: Render Deployment & Verification
- Create `render.yaml` declaring the FastAPI service, Node agent, and Web PWA.
- Configure production Dockerfiles and environment variables.
- Run end-to-end integration tests and verify full workflow.

---

## 5. Next Immediate Actions
1. Scaffold root `package.json` and `.gitignore`.
2. Scaffold `services/tabpfn-service` (`requirements.txt`, dataset, `app.py`, `Dockerfile`).
3. Scaffold `apps/agent-server` (`package.json`, `tsconfig.json`, Mastra agent, tools, Sentry).
4. Scaffold `apps/web` (`package.json`, Vite configuration, UI components).
