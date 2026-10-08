import * as Sentry from "@sentry/node";

// AI Agent Tracing with OpenTelemetry Spans
export function initSentry() {
  const dsn = process.env.SENTRY_DSN || "";
  const environment = process.env.SENTRY_ENVIRONMENT || "development";
  const tracesSampleRate = parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || "1.0");

  const integrations: any[] = [];
  try {
    // Profiling is supported natively in Node 20-22 (used in production Docker container)
    // On newer Node ABIs, Sentry agent tracing and span tracking run natively without native C++ compilation
    const { nodeProfilingIntegration } = require("@sentry/profiling-node");
    integrations.push(nodeProfilingIntegration());
  } catch {
    // profiling skipped on local dev environments without matching C++ binaries
  }

  Sentry.init({
    dsn: dsn || undefined,
    environment,
    tracesSampleRate,
    integrations,
    release: "trailwhisper@0.1.0",
    beforeSend(event) {
      // Annotate event with agent system tags
      if (event.tags) {
        event.tags["ai.framework"] = "mastra";
        event.tags["ai.model.tabular"] = "tabpfn";
        event.tags["ai.model.reasoning"] = "gemma";
      }
      return event;
    },
  });

  if (dsn) {
    console.log(`[Sentry] Initialized Sentry Agent Tracing in environment: ${environment}`);
  } else {
    console.log(`[Sentry] SENTRY_DSN not provided; running with local fallback tracing tracer`);
  }
}

/**
 * Tracing wrapper to record AI Agent tool execution, token usage, and latency in Sentry
 */
export async function traceAgentSpan<T>(
  spanName: string,
  op: string,
  attributes: Record<string, string | number | boolean>,
  fn: (span?: any) => Promise<T>
): Promise<T> {
  return await Sentry.startSpan(
    {
      name: spanName,
      op,
      attributes: {
        "ai.agent.framework": "mastra",
        ...attributes,
      },
    },
    async (span) => {
      const startTime = Date.now();
      try {
        const result = await fn(span);
        const durationMs = Date.now() - startTime;
        span?.setAttribute("ai.span.duration_ms", durationMs);
        return result;
      } catch (err: any) {
        span?.setStatus({ code: 2, message: err?.message || "error" });
        Sentry.captureException(err);
        throw err;
      }
    }
  );
}

export { Sentry };
