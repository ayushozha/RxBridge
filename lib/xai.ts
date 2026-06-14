/**
 * Realtime-news subagent client for the xAI (Grok) Responses API.
 *
 * This is a thin, server-only wrapper that asks Grok to run a live web/news
 * search (via the web_search tool) and return a STRUCTURED JSON answer that
 * matches a caller-supplied JSON schema. It uses only the built-in global
 * fetch, so it adds no npm dependency and is safe to import from a Next.js
 * App Router route handler running on the Node runtime.
 *
 * Never log or surface the API key. Errors are kept generic so request
 * internals do not leak to clients.
 */

const XAI_ENDPOINT = "https://api.x.ai/v1/responses";
const DEFAULT_MODEL = "grok-4.3";
const DEFAULT_TIMEOUT_MS = 60_000;

/** A single deduped citation backing a Grok answer. */
export interface XaiCitation {
  url: string;
  title: string;
}

/** Annotation shape returned on the message content item. */
interface XaiAnnotation {
  type?: string;
  url?: string;
  title?: string;
  start_index?: number;
  end_index?: number;
}

interface XaiMessageContent {
  type?: string;
  text?: string;
  annotations?: XaiAnnotation[];
}

interface XaiOutputItem {
  type?: string;
  content?: XaiMessageContent[];
}

interface XaiResponse {
  status?: string;
  error?: unknown;
  output?: XaiOutputItem[];
}

/**
 * Run a realtime web/news search through Grok and parse the answer as T.
 *
 * The schema describes the JSON object Grok must return. The returned data is
 * that parsed object, alongside the deduped citations Grok used.
 */
export async function grokStructuredSearch<T>(args: {
  system: string;
  user: string;
  schemaName: string;
  schema: Record<string, unknown>;
  signal?: AbortSignal;
}): Promise<{ data: T; citations: XaiCitation[] }> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    throw new Error("XAI_API_KEY is not set.");
  }

  const model = process.env.XAI_MODEL || DEFAULT_MODEL;

  const body = {
    model,
    input: [
      { role: "system", content: args.system },
      { role: "user", content: args.user },
    ],
    tools: [{ type: "web_search" }],
    text: {
      format: {
        type: "json_schema",
        name: args.schemaName,
        schema: args.schema,
        // strict mode makes Grok return JSON that always matches the schema,
        // so the JSON.parse below is reliable instead of best effort.
        strict: true,
      },
    },
  };

  // Use the caller's signal if provided, otherwise enforce our own timeout.
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let signal: AbortSignal;
  if (args.signal) {
    signal = args.signal;
  } else {
    const controller = new AbortController();
    timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
    signal = controller.signal;
  }

  let response: Response;
  try {
    response = await fetch(XAI_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal,
    });
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    const detail = text.slice(0, 300);
    throw new Error(`xAI request failed (${response.status}): ${detail}`);
  }

  const parsed = (await response.json()) as XaiResponse;

  if (parsed.error || parsed.status !== "completed") {
    const reason = parsed.status ? `status ${parsed.status}` : "request error";
    throw new Error(`xAI did not complete the search (${reason}).`);
  }

  const message = (parsed.output || []).find((item) => item.type === "message");
  // The content array can hold more than one item, and the text lives on the
  // one whose type is "output_text". Do not assume it is at index 0.
  const content =
    message?.content?.find((c) => c.type === "output_text") ??
    message?.content?.[0];
  const rawText = content?.text;
  if (!rawText) {
    throw new Error("Grok returned no message output.");
  }

  let data: T;
  try {
    data = JSON.parse(rawText) as T;
  } catch {
    throw new Error("Grok returned malformed JSON.");
  }

  const citations = collectCitations(content?.annotations);

  return { data, citations };
}

/** Dedupe annotations by url and map them to {url, title}. */
function collectCitations(annotations: XaiAnnotation[] | undefined): XaiCitation[] {
  if (!annotations) {
    return [];
  }

  const seen = new Set<string>();
  const citations: XaiCitation[] = [];

  for (const annotation of annotations) {
    const url = annotation.url;
    if (!url || seen.has(url)) {
      continue;
    }
    seen.add(url);

    const title = annotation.title?.trim() || hostnameOf(url);
    citations.push({ url, title });
  }

  return citations;
}

/** Best-effort hostname for a citation fallback title. */
function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}
