/**
 * OpenRouter client.
 *
 * Single source of truth for LLM calls across CureV. Routes every
 * generateStructuredOutput / chat call through OpenRouter so the
 * agents and MCP tools don't care which provider actually answers.
 *
 * Model strategy (see apps/web/.env.local):
 *   • OPENROUTER_PRIMARY_MODEL    — strong, free. Default: Hermes 3 405B.
 *   • OPENROUTER_FALLBACK_MODEL   — secondary free model used when
 *                                   the primary fails (rate-limit,
 *                                   5xx, invalid JSON, structured-
 *                                   output unsupported, …).
 *
 * Why OpenRouter: one API key, dozens of free models, OpenAI-compatible
 * schema, no SDK lock-in.
 *
 * Docs: https://openrouter.ai/docs
 */

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

const DEFAULT_PRIMARY = 'nousresearch/hermes-3-llama-3.1-405b:free';
const DEFAULT_FALLBACK = 'meta-llama/llama-3.3-70b-instruct:free';

function pickPrimary(): string {
  return process.env.OPENROUTER_PRIMARY_MODEL || DEFAULT_PRIMARY;
}

function pickFallback(): string {
  return process.env.OPENROUTER_FALLBACK_MODEL || DEFAULT_FALLBACK;
}

function pickApiKey(): string {
  return process.env.OPENROUTER_API_KEY || '';
}

// ─── types ─────────────────────────────────────────────────────────

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  /** Optional name for multi-user/tool conversations. */
  name?: string;
}

export interface ChatCompletionRequest {
  messages: ChatMessage[];
  /** If provided, OpenRouter's `response_format` is set to `json_schema`. */
  responseSchema?: Record<string, any>;
  /** Schema name (for json_schema mode). */
  schemaName?: string;
  /** Force JSON output via prompting + post-parse (used for fallback). */
  forceJsonMode?: boolean;
  temperature?: number;
  maxTokens?: number;
  /** Override the model used for this call. Falls back to env / default. */
  model?: string;
}

export interface ChatCompletionResult {
  text: string;
  model: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  /** True when the result came from the fallback model. */
  fromFallback: boolean;
}

export class OpenRouterError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly provider?: string,
    public readonly raw?: unknown
  ) {
    super(message);
    this.name = 'OpenRouterError';
  }
}

// ─── low-level POST ────────────────────────────────────────────────

interface OpenRouterRawResponse {
  choices?: Array<{ message?: { content?: string }; finish_reason?: string }>;
  model?: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  error?: { message?: string; code?: number };
}

async function postOnce(
  model: string,
  body: Omit<ChatCompletionRequest, 'model'>,
  apiKey: string
): Promise<ChatCompletionResult> {
  const payload: Record<string, any> = {
    model,
    messages: body.messages,
    temperature: body.temperature ?? 0.4,
    max_tokens: body.maxTokens ?? 2048,
    stream: false,
  };

  // Prefer JSON-schema structured output when the caller asked for a schema.
  // Some free models ignore this — the caller's retry/fallback path handles
  // that by switching models and/or dropping into prompt-engineered JSON.
  if (body.responseSchema) {
    payload.response_format = {
      type: 'json_schema',
      json_schema: {
        name: body.schemaName || 'cureva_response',
        strict: false,
        schema: body.responseSchema,
      },
    };
  } else if (body.forceJsonMode) {
    payload.response_format = { type: 'json_object' };
  }

  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://cureva.health',
      'X-Title': 'CureV',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new OpenRouterError(
      `OpenRouter ${res.status}: ${text.slice(0, 400) || res.statusText}`,
      res.status,
      model
    );
  }

  const data = (await res.json()) as OpenRouterRawResponse;
  if (data.error?.message) {
    throw new OpenRouterError(
      `OpenRouter error: ${data.error.message}`,
      data.error.code,
      model
    );
  }

  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || content.length === 0) {
    throw new OpenRouterError(
      `OpenRouter returned empty content (finish_reason=${
        data.choices?.[0]?.finish_reason ?? 'unknown'
      })`,
      undefined,
      model
    );
  }

  return {
    text: content,
    model: data.model ?? model,
    usage: data.usage
      ? {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
        }
      : undefined,
    fromFallback: false,
  };
}

// ─── public API ────────────────────────────────────────────────────

/**
 * Single-call chat completion. Throws on transport / API errors.
 * Use `chatCompletionWithFallback` for the resilient path.
 */
export async function chatCompletion(
  req: ChatCompletionRequest
): Promise<ChatCompletionResult> {
  const apiKey = pickApiKey();
  if (!apiKey) {
    throw new OpenRouterError(
      'OPENROUTER_API_KEY not configured. Add it to apps/web/.env.local.'
    );
  }
  const model = req.model || pickPrimary();
  return postOnce(model, req, apiKey);
}

/**
 * Resilient chat completion: tries the primary model, falls back to the
 * secondary free model on rate-limit, 5xx, structured-output errors, or
 * when the primary's response isn't valid JSON (and a schema was requested).
 */
export async function chatCompletionWithFallback(
  req: ChatCompletionRequest
): Promise<ChatCompletionResult> {
  const apiKey = pickApiKey();
  if (!apiKey) {
    throw new OpenRouterError(
      'OPENROUTER_API_KEY not configured. Add it to apps/web/.env.local.'
    );
  }

  const primary = req.model || pickPrimary();
  const fallback = pickFallback();
  const schemaWanted = Boolean(req.responseSchema);

  try {
    const result = await postOnce(primary, req, apiKey);

    if (schemaWanted) {
      // Verify the primary's response is actually JSON (some free models
      // ignore response_format and emit prose wrapped in ``` fences).
      if (!tryParseJson(result.text)) {
        throw new OpenRouterError(
          'Primary model response is not valid JSON, retrying with fallback',
          undefined,
          primary,
          result.text
        );
      }
    }
    return result;
  } catch (primaryErr) {
    if (primary === fallback) throw primaryErr; // no point retrying same model

    // Last-ditch: tell the fallback to respond as JSON via prompting since
    // many free models (Llama 3.3, Mistral, …) ignore json_schema mode.
    const fallbackReq: ChatCompletionRequest = {
      ...req,
      // Keep schema for fallback; if it doesn't work the caller will fail.
      model: fallback,
    };

    if (schemaWanted && !req.messages.some((m) => m.role === 'system')) {
      fallbackReq.messages = [
        {
          role: 'system',
          content:
            'You must respond with valid JSON only. No prose, no markdown fences. ' +
            'Output should be parseable by JSON.parse().',
        },
        ...req.messages,
      ];
    } else if (schemaWanted) {
      // Prepend JSON-only reminder to the existing system message.
      fallbackReq.messages = req.messages.map((m, i) =>
        i === 0 && m.role === 'system'
          ? {
              ...m,
              content:
                m.content +
                '\n\nIMPORTANT: Respond with valid JSON only — no markdown fences, no commentary.',
            }
          : m
      );
    }

    const result = await postOnce(fallback, fallbackReq, apiKey);
    return { ...result, fromFallback: true };
  }
}

/**
 * Strict structured-output helper. Retries once with a "respond with
 * JSON only" instruction if the response isn't parseable, then falls
 * back to the secondary model via chatCompletionWithFallback.
 */
export async function chatCompletionJson<T = unknown>(
  req: ChatCompletionRequest
): Promise<{ data: T | null; result: ChatCompletionResult | null }> {
  const schemaWanted = Boolean(req.responseSchema);

  // First attempt: structured output through fallback-aware wrapper.
  try {
    const result = await chatCompletionWithFallback(req);
    const parsed = tryParseJson(result.text) as T | null;
    if (parsed != null) return { data: parsed, result };
    // Primary/fallback both returned non-JSON — last try with explicit nudge.
  } catch {
    // fall through to retry
  }

  // Retry once: tell the primary explicitly to return JSON only.
  try {
    const nudged: ChatCompletionRequest = {
      ...req,
      messages: [
        ...(req.messages[0]?.role === 'system'
          ? [
              {
                ...req.messages[0],
                content:
                  req.messages[0].content +
                  '\n\nRespond with valid JSON only. No markdown, no commentary.',
              },
              ...req.messages.slice(1),
            ]
          : [
              {
                role: 'system' as const,
                content:
                  'Respond with valid JSON only. No markdown, no commentary.',
              },
              ...req.messages,
            ]),
      ],
      responseSchema: undefined, // drop strict schema so the nudge has full weight
      forceJsonMode: true,
    };
    const result = await chatCompletion(nudged);
    const parsed = tryParseJson(result.text) as T | null;
    return { data: parsed, result };
  } catch {
    return { data: null, result: null };
  }
}

// ─── utils ─────────────────────────────────────────────────────────

/** Strip ```json … ``` fences and return the inner JSON if present. */
export function tryParseJson(text: string): unknown | null {
  if (!text) return null;
  const trimmed = text.trim();

  // Direct parse first.
  try {
    return JSON.parse(trimmed);
  } catch {
    // ignore — try fence stripping below.
  }

  // Match ```json ... ``` or ``` ... ```
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]+?)\s*```/i);
  if (fence) {
    try {
      return JSON.parse(fence[1]);
    } catch {
      // fall through
    }
  }

  // Last resort: first { … } block.
  const braceStart = trimmed.indexOf('{');
  const braceEnd = trimmed.lastIndexOf('}');
  if (braceStart !== -1 && braceEnd > braceStart) {
    try {
      return JSON.parse(trimmed.slice(braceStart, braceEnd + 1));
    } catch {
      // ignore
    }
  }

  return null;
}

/**
 * Convenience: run a single LLM call where the caller just wants a
 * plain-text reply (no JSON parsing).
 */
export async function chatCompletionText(
  req: Omit<ChatCompletionRequest, 'responseSchema' | 'forceJsonMode'>
): Promise<string> {
  const r = await chatCompletionWithFallback(req);
  return r.text.trim();
}
