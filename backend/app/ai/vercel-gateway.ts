/**
 * Vercel AI Gateway client.
 *
 * Single source of truth for LLM chat calls across Cureva. Routes every
 * generateStructuredOutput / chat call through Vercel AI Gateway
 * (https://ai-gateway.vercel.sh), so the agents and MCP tools don't
 * care which underlying provider actually answers — Vercel handles
 * the routing, retries, and provider failover.
 *
 * Model strategy (see apps/web/.env.local):
 *   • AI_GATEWAY_PRIMARY_MODEL    — your preferred model. Default
 *                                   below is meta/llama-3.2-90b.
 *   • AI_GATEWAY_FALLBACK_MODEL   — used when the primary fails.
 *
 * Why Vercel AI Gateway:
 *   • One API key (vck_…) covers OpenAI, Anthropic, Meta, Mistral,
 *     Google, Alibaba Qwen, and more.
 *   • OpenAI-compatible schema, no SDK lock-in.
 *   • Built-in routing + failover across providers.
 *
 * ⚠️ Region note for Meta Llama models
 * -------------------------------------
 * Meta's EULA restricts Llama distribution in some regions. When
 * the gateway tries to route `meta/llama-3.2-90b` through AWS
 * Bedrock from a restricted region, you get a 400:
 *   "Access to Meta Llama models is not allowed from unsupported
 *    countries, regions, or territories."
 * Verified working Llama models on Vercel AI Gateway from India:
 *   - meta/llama-3.1-70b          ✅
 *   - meta/llama-3.3-70b          ✅
 *   - anthropic/claude-3.5-haiku  ✅
 *   - openai/gpt-4o-mini          ✅
 * Verified BLOCKED:
 *   - meta/llama-3.2-90b          ❌ (region)
 *   - meta/llama-4-maverick       ❌ (likely region too — same EULA)
 *
 * The fallback chain transparently handles this: if the primary
 * returns a 400/region error, we retry the fallback.
 *
 * Embeddings note
 * ---------------
 * All Vercel AI Gateway embedding models are rate-limited on the
 * free tier. We keep embeddings on OpenRouter
 * (openai/text-embedding-3-small, ~$0.02/1M tokens) — see
 * backend/app/ai/embeddings.ts.
 *
 * Docs: https://vercel.com/docs/ai-gateway
 */

const AI_GATEWAY_URL = 'https://ai-gateway.vercel.sh/v1/chat/completions';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

/**
 * Primary model. The user requested meta/llama-3.2-90b. Note the
 * region caveat above — this will fall through to the fallback in
 * restricted regions.
 */
const DEFAULT_PRIMARY = 'meta/llama-3.2-90b';

/**
 * Fallback model. meta/llama-3.3-70b is the closest available model
 * that works reliably from India and other Meta-restricted regions
 * (it routes through providers other than Bedrock).
 */
const DEFAULT_FALLBACK = 'meta/llama-3.3-70b';

/**
 * Additional Vercel AI Gateway models to try when primary + fallback
 * both return 429 or fail for other reasons. Listed in order of preference.
 */
const FALLBACK_MODELS = [
  'anthropic/claude-3.5-haiku',
  'openai/gpt-4o-mini',
  'google/gemini-2.0-flash-exp',
  'mistralai/mistral-small-3-24b-instruct',
] as const;

/** OpenRouter free model — first OpenRouter attempt. */
const OPENROUTER_FREE_MODEL = 'meta-llama/llama-3.3-70b-instruct:free';

/** OpenRouter cheap non-free model — absolute last resort when free tier is exhausted. */
const OPENROUTER_CHEAP_MODEL = 'meta-llama/llama-3.1-8b-instruct';

/** Number of retry attempts on 429 before giving up on a single model. */
const RETRY_COUNT = 3;

/** Base delay in ms before first retry on 429. Doubled each subsequent retry. */
const RETRY_BASE_DELAY_MS = 2000;

function pickPrimary(): string {
  return process.env.AI_GATEWAY_PRIMARY_MODEL || DEFAULT_PRIMARY;
}

function pickFallback(): string {
  return process.env.AI_GATEWAY_FALLBACK_MODEL || DEFAULT_FALLBACK;
}

function pickApiKey(): string {
  return process.env.AI_GATEWAY_API_KEY || '';
}

function pickOpenRouterApiKey(): string {
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
  /** If provided, the response_format is set to `json_schema`. */
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

export class AiGatewayError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly provider?: string,
    public readonly raw?: unknown
  ) {
    super(message);
    this.name = 'AiGatewayError';
  }
}

// ─── low-level POST ────────────────────────────────────────────────

interface AiGatewayRawResponse {
  choices?: Array<{ message?: { content?: string }; finish_reason?: string }>;
  model?: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  error?: { message?: string; code?: number };
}

/**
 * Returns true when the response is a region-restriction error
 * (Meta EULA blocking, etc.) that should trigger an immediate
 * fallback to a different model rather than retrying the same one.
 */
function isRegionBlockError(status: number | undefined, body: string): boolean {
  if (!body) return false;
  return (
    /unsupported countries|regions, or territories/i.test(body) ||
    /not allowed from/i.test(body)
  );
}

/**
 * Returns true when the response is a 429 rate-limit error.
 */
function isRateLimitError(status: number | undefined, body: string): boolean {
  if (status === 429) return true;
  return /rate.?limit|too.?many.?requests|quota.?exceeded/i.test(body);
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

  const res = await fetch(AI_GATEWAY_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const err = new AiGatewayError(
      `Vercel AI Gateway ${res.status}: ${text.slice(0, 400) || res.statusText}`,
      res.status,
      model
    );
    // Mark region blocks so the fallback path can skip retrying the same model.
    if (isRegionBlockError(res.status, text)) {
      (err as any).regionBlocked = true;
    }
    // Mark rate limits for the retry wrapper.
    if (isRateLimitError(res.status, text)) {
      (err as any).rateLimited = true;
    }
    throw err;
  }

  const data = (await res.json()) as AiGatewayRawResponse;
  if (data.error?.message) {
    throw new AiGatewayError(
      `Vercel AI Gateway error: ${data.error.message}`,
      data.error.code,
      model
    );
  }

  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || content.length === 0) {
    throw new AiGatewayError(
      `Vercel AI Gateway returned empty content (finish_reason=${
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

/**
 * POST with automatic retry-on-429 and exponential backoff.
 * Retries up to RETRY_COUNT times with 2s, 4s, 8s delays.
 * Region blocks and other errors are thrown immediately (no retry).
 */
async function postWithRetry(
  model: string,
  body: Omit<ChatCompletionRequest, 'model'>,
  apiKey: string,
  isRateLimited = false
): Promise<ChatCompletionResult> {
  let lastError: AiGatewayError | undefined;

  for (let attempt = 0; attempt <= RETRY_COUNT; attempt++) {
    try {
      return await postOnce(model, body, apiKey);
    } catch (err) {
      lastError = err as AiGatewayError;

      // Immediate fail: region block — don't retry the same model.
      if ((err as any).regionBlocked) throw err;

      // Immediate fail: not a rate limit — don't retry.
      if (!isRateLimited && !(err as any).rateLimited) throw err;

      // Out of retries — give up on this model.
      if (attempt >= RETRY_COUNT) break;

      // Exponential backoff before next attempt.
      const delayMs = RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
      await sleep(delayMs);
    }
  }

  throw lastError;
}

/**
 * OpenRouter POST for last-resort fallback.
 * Tries the free model first, then falls back to a cheap non-free model
 * (llama-3.1-8b-instruct, ~$0.07/M tokens on OpenRouter).
 */
async function postOpenRouter(
  body: Omit<ChatCompletionRequest, 'model'>
): Promise<ChatCompletionResult> {
  const apiKey = pickOpenRouterApiKey();
  if (!apiKey) {
    throw new AiGatewayError('OPENROUTER_API_KEY not configured.');
  }

  const models = [OPENROUTER_FREE_MODEL, OPENROUTER_CHEAP_MODEL];
  let lastError: AiGatewayError | undefined;

  for (const model of models) {
    try {
      return await _postOpenRouterOnce(model, body, apiKey);
    } catch (err) {
      lastError = err as AiGatewayError;
      // If rate-limited, try the next model.
      if ((err as any).rateLimited || lastError.status === 429) {
        continue;
      }
      // Other errors (auth, etc.) are fatal.
      throw err;
    }
  }

  throw lastError;
}

async function _postOpenRouterOnce(
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
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const err = new AiGatewayError(
      `OpenRouter ${res.status}: ${text.slice(0, 400) || res.statusText}`,
      res.status,
      model
    );
    if (res.status === 429) (err as any).rateLimited = true;
    throw err;
  }

  const data = (await res.json()) as AiGatewayRawResponse;
  if (data.error?.message) {
    throw new AiGatewayError(
      `OpenRouter error: ${data.error.message}`,
      undefined,
      model
    );
  }

  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || content.length === 0) {
    throw new AiGatewayError(
      `OpenRouter returned empty content (finish_reason=${data.choices?.[0]?.finish_reason ?? 'unknown'})`,
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
    fromFallback: true,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
    throw new AiGatewayError(
      'AI_GATEWAY_API_KEY not configured. Add it to apps/web/.env.local.'
    );
  }
  const model = req.model || pickPrimary();
  return postOnce(model, req, apiKey);
}

/**
 * Resilient chat completion: tries the primary model, falls back to the
 * secondary model on rate-limit, 5xx, region blocks, structured-output
 * errors, or when the primary's response isn't valid JSON (and a schema
 * was requested).
 *
 * Now walks an expanded chain: primary → fallback → FALLBACK_MODELS → OpenRouter.
 */
export async function chatCompletionWithFallback(
  req: ChatCompletionRequest
): Promise<ChatCompletionResult> {
  return chatCompletionMultiFallback(req);
}

/**
 * Walk the full model chain: primary → fallback → FALLBACK_MODELS → OpenRouter.
 * Each model gets retry-on-429 with exponential backoff.
 * Returns the first successful response.
 */
export async function chatCompletionMultiFallback(
  req: ChatCompletionRequest
): Promise<ChatCompletionResult> {
  const apiKey = pickApiKey();
  if (!apiKey) {
    throw new AiGatewayError(
      'AI_GATEWAY_API_KEY not configured. Add it to apps/web/.env.local.'
    );
  }

  const primary = req.model || pickPrimary();
  const fallback = pickFallback();
  const schemaWanted = Boolean(req.responseSchema);

  // Build the full model chain: primary, fallback, then the rest of FALLBACK_MODELS.
  const chain: string[] = [primary];
  if (fallback !== primary) chain.push(fallback);
  for (const m of FALLBACK_MODELS) {
    if (m !== primary && m !== fallback) chain.push(m);
  }

  let lastError: AiGatewayError | undefined;

  for (const model of chain) {
    try {
      const result = await postWithRetry(model, req, apiKey, false);

      if (schemaWanted) {
        if (!tryParseJson(result.text)) {
          // Non-JSON response on a schema request — try next model.
          lastError = new AiGatewayError(
            `Model ${model} returned non-JSON, trying next model`,
            undefined,
            model
          );
          continue;
        }
      }
      return result;
    } catch (err) {
      lastError = err as AiGatewayError;
      // If region-blocked, skip immediately to next model (already thrown by postOnce).
      // For rate limits that exhausted all retries, try next model.
      if ((err as any).regionBlocked) {
        continue;
      }
      // Other errors (5xx, auth, etc.) — try next model.
      continue;
    }
  }

  // All Vercel models exhausted — last resort: OpenRouter.
  try {
    const result = await postOpenRouter(req);

    if (schemaWanted && !tryParseJson(result.text)) {
      // Even OpenRouter didn't give us JSON — return what we have.
      // The caller will see the raw text and can decide how to handle.
    }
    return result;
  } catch (openRouterErr) {
    // Combine both error messages for better diagnostics.
    const orErr = openRouterErr as AiGatewayError;
    const combinedMsg = lastError
      ? `Vercel exhausted: ${lastError.message}; OpenRouter failed: ${orErr.message}`
      : `All providers failed: ${orErr.message}`;
    throw new AiGatewayError(combinedMsg, orErr.status, 'openrouter');
  }
}

/**
 * Explicit OpenRouter call — exposed for callers who want to go directly
 * to OpenRouter without waiting for Vercel to exhaust its chain.
 */
export async function chatCompletionOpenRouter(
  req: ChatCompletionRequest
): Promise<ChatCompletionResult> {
  return postOpenRouter(req);
}

/**
 * Strict structured-output helper. Uses the full model chain
 * (primary → fallback → FALLBACK_MODELS → OpenRouter), each with
 * retry-on-429. If JSON parsing fails, retries once with a nudge.
 */
export async function chatCompletionJson<T = unknown>(
  req: ChatCompletionRequest
): Promise<{ data: T | null; result: ChatCompletionResult | null }> {
  const schemaWanted = Boolean(req.responseSchema);

  // First attempt: structured output through the full multi-fallback chain.
  try {
    const result = await chatCompletionMultiFallback(req);
    const parsed = tryParseJson(result.text) as T | null;
    if (parsed != null) return { data: parsed, result };
    // All models returned non-JSON — fall through to nudge retry.
  } catch {
    // fall through to retry
  }

  // Retry once: tell the model explicitly to return JSON only.
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
    const result = await chatCompletionMultiFallback(nudged);
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

// ─── legacy aliases ────────────────────────────────────────────────

/**
 * @deprecated Use `chatCompletionWithFallback` or `AiGatewayError`.
 *   These names exist so old imports keep working during the
 *   openrouter → vercel-gateway rename.
 */
export const chatCompletionWithFallbackOpenRouter = chatCompletionWithFallback;
/**
 * @deprecated Use `chatCompletionJson`.
 */
export const chatCompletionJsonOpenRouter = chatCompletionJson;

/**
 * @deprecated Use `AiGatewayError`.
 */
export class OpenRouterError extends AiGatewayError {}
