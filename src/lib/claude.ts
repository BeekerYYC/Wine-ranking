import Anthropic from "@anthropic-ai/sdk";

/**
 * Every Claude call in the app goes through this file, so the model and its
 * settings live in one place.
 *
 * Low effort: label reading, receipt parsing and enrichment lean on Claude's
 * knowledge more than on long reasoning, and low effort keeps each call well
 * inside Vercel's 60-second function limit.
 */
export const CLAUDE_MODEL = "claude-opus-5-5";
const EFFORT = "low" as const;

// If Claude declines a request, the API re-runs it on a fallback model inside
// the same call instead of returning nothing. Wine labels essentially never
// trigger this; it is a safety net. SDK 0.81 predates the `fallbacks` field, so
// it is passed through untyped below.
const FALLBACK_BETA = "server-side-fallback-2026-07-01";

// Below the 60s function limit, so a stalled call fails with a readable error
// instead of the platform killing the request mid-flight.
export const anthropic = new Anthropic({ timeout: 50_000 });

export function hasApiKey(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

// ---------------------------------------------------------------------------
// JSON schema building blocks for structured outputs. The API requires every
// object to set additionalProperties: false, and does not support numeric or
// length constraints, so ranges are enforced in code after parsing.

type Schema = Record<string, unknown>;

export const str: Schema = { type: "string" };
export const num: Schema = { type: "number" };
export const int: Schema = { type: "integer" };
export const nullable = (schema: Schema): Schema => ({ anyOf: [schema, { type: "null" }] });
export const oneOf = (values: string[]): Schema => ({ type: "string", enum: values });
export const arrayOf = (items: Schema): Schema => ({ type: "array", items });

/** An object schema where every property is required (use nullable() for optional ones). */
export function object(properties: Record<string, Schema>): Schema {
  return {
    type: "object",
    properties,
    required: Object.keys(properties),
    additionalProperties: false,
  };
}

/** A 0-100 score, or null if the value is missing or out of range. */
export function toScore(value: unknown): number | null {
  const n = typeof value === "number" ? value : parseFloat(String(value));
  return Number.isFinite(n) && n > 0 && n <= 100 ? n : null;
}

/** A 0-1 confidence, clamped, or null if missing. */
export function toConfidence(value: unknown): number | null {
  const n = typeof value === "number" ? value : parseFloat(String(value));
  return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : null;
}

// ---------------------------------------------------------------------------

/** Turn a data: URL from the browser into an image block. */
export function imageBlock(dataUrl: string): Anthropic.Beta.BetaImageBlockParam {
  const match = dataUrl.match(/^data:(image\/(?:jpeg|png|gif|webp));base64,/);
  const mediaType = (match?.[1] ?? "image/jpeg") as "image/jpeg" | "image/png" | "image/gif" | "image/webp";
  return {
    type: "image",
    source: { type: "base64", media_type: mediaType, data: dataUrl.replace(/^data:[^,]*,/, "") },
  };
}

function baseParams(maxTokens: number) {
  return {
    model: CLAUDE_MODEL,
    max_tokens: maxTokens,
    betas: [FALLBACK_BETA],
    fallbacks: "default",
  };
}

function textOf(response: Anthropic.Beta.BetaMessage): string {
  // Current models think before answering, so the answer is not content[0].
  // Thinking blocks come back with empty text; only the text blocks hold the answer.
  return response.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
}

function checkStop(response: Anthropic.Beta.BetaMessage) {
  if (response.stop_reason === "refusal") {
    throw new Error("Claude declined this request");
  }
  if (response.stop_reason === "max_tokens") {
    throw new Error("Claude's answer was cut off before it finished");
  }
}

/**
 * Ask Claude for JSON that matches `schema`. Structured outputs guarantee the
 * reply parses, so there is no fence-stripping or regex guessing; callers still
 * clamp values the schema cannot constrain (ranges, lengths).
 */
export async function askForJson<T>(opts: {
  content: string | Anthropic.Beta.BetaContentBlockParam[];
  schema: Schema;
  system?: string;
  maxTokens?: number;
}): Promise<T> {
  const params = {
    ...baseParams(opts.maxTokens ?? 16000),
    output_config: { effort: EFFORT, format: { type: "json_schema", schema: opts.schema } },
    ...(opts.system ? { system: opts.system } : {}),
    messages: [{ role: "user", content: opts.content }],
  } as Anthropic.Beta.MessageCreateParamsNonStreaming;

  const response = await anthropic.beta.messages.create(params);
  checkStop(response);
  return JSON.parse(textOf(response)) as T;
}

/**
 * Ask Claude a question it should answer using web search, and return its
 * final text. Structured outputs cannot be combined with the citations that
 * search results carry, so callers parse the text themselves.
 */
export async function askWithWebSearch(opts: {
  prompt: string;
  maxUses?: number;
  timeoutMs?: number;
}): Promise<string> {
  const params = {
    ...baseParams(16000),
    output_config: { effort: EFFORT },
    tools: [{ type: "web_search_20260209", name: "web_search", max_uses: opts.maxUses ?? 3 }],
    messages: [{ role: "user", content: opts.prompt }],
  } as Anthropic.Beta.MessageCreateParamsNonStreaming;

  const response = await anthropic.beta.messages.create(params, {
    timeout: opts.timeoutMs ?? 40_000,
    maxRetries: 0,
  });
  checkStop(response);
  // Search answers can be split across several text blocks (one per citation),
  // so return all of it; callers look for their answer at the end.
  return textOf(response);
}
