/**
 * Lightweight abuse guards for API routes that spend money per call.
 *
 * These are deliberately simple and in memory: a same origin check so the
 * routes cannot be driven cross origin from a stranger's page, and a small per
 * client rate limit so a tight loop cannot drain the upstream quota. For a real
 * deployment, replace the in memory limiter with a shared store (for example
 * Redis) and put proper authentication in front of these routes.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export interface GuardOptions {
  /** Max requests allowed inside the window. */
  limit?: number;
  /** Window length in milliseconds. */
  windowMs?: number;
}

/**
 * Validates the request and applies a per client rate limit.
 * Returns null when the request is allowed, or a Response to return as is when
 * it should be rejected.
 */
export function guardRequest(
  req: Request,
  nowMs: number,
  opts: GuardOptions = {},
): Response | null {
  const limit = opts.limit ?? 12;
  const windowMs = opts.windowMs ?? 60_000;

  // Same origin check. In dev the Origin header may be absent for direct tool
  // calls, so we only reject when an Origin is present and does not match Host.
  const origin = req.headers.get("origin");
  if (origin) {
    try {
      const originHost = new URL(origin).host;
      const host = req.headers.get("host");
      if (host && originHost !== host) {
        return Response.json(
          { error: "Cross origin requests are not allowed." },
          { status: 403 },
        );
      }
    } catch {
      return Response.json({ error: "Bad origin." }, { status: 403 });
    }
  }

  // Per client rate limit, keyed by best effort client address.
  const key =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "local";

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= nowMs) {
    buckets.set(key, { count: 1, resetAt: nowMs + windowMs });
  } else {
    bucket.count += 1;
    if (bucket.count > limit) {
      const retryAfter = Math.ceil((bucket.resetAt - nowMs) / 1000);
      return Response.json(
        { error: "Too many requests. Please slow down." },
        { status: 429, headers: { "Retry-After": String(retryAfter) } },
      );
    }
  }

  return null;
}
