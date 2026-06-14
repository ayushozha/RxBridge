import type { RescueCase, RescueStatus, RescueTimelineItem } from "@/lib/rescue-types";
import { Redis } from "@upstash/redis";

/**
 * Rescue case store.
 *
 * On Vercel, serverless functions do not share memory, so an in memory Map
 * loses cases between the start, authorize, negotiate, and confirm steps. When
 * Vercel KV (Upstash Redis) credentials are present, cases are stored there so
 * every instance sees the same state. Locally, with no KV configured, it falls
 * back to an in memory Map so the dev server keeps working with no setup.
 *
 * Reads and writes are async because KV is async. `withTimeline` stays pure.
 */

const KEY_PREFIX = "rxbridge:case:";
const TTL_SECONDS = 60 * 60 * 24; // a day is plenty for a demo case

// In memory fallback for local development.
const globalStore = globalThis as typeof globalThis & {
  __rxbridgeCases?: Map<string, RescueCase>;
};
const memory = globalStore.__rxbridgeCases ?? new Map<string, RescueCase>();
globalStore.__rxbridgeCases = memory;

// Build a KV client only when credentials exist. Vercel KV injects
// KV_REST_API_URL and KV_REST_API_TOKEN; Upstash uses UPSTASH_REDIS_REST_*.
function makeRedis(): Redis | null {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token =
    process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  try {
    return new Redis({ url, token });
  } catch {
    return null;
  }
}

const redis = makeRedis();

export interface CreateCaseInput {
  patientId: string;
  prescription: RescueCase["prescription"];
  now?: Date;
}

export async function createRescueCase(
  input: CreateCaseInput,
): Promise<RescueCase> {
  const now = input.now ?? new Date();
  const id = `case-${input.patientId}-${slug(input.prescription.ingredient)}-${now.getTime().toString(36)}`;
  const rescueCase: RescueCase = {
    id,
    patientId: input.patientId,
    prescription: input.prescription,
    shortage: null,
    pharmacyQuotes: [],
    substitutionCandidates: [],
    status: "case_created",
    timeline: [
      timelineItem(
        "case_created",
        `Case created for ${input.prescription.medication}.`,
        now,
      ),
    ],
  };
  return saveRescueCase(rescueCase);
}

export async function getRescueCase(
  caseId: string,
): Promise<RescueCase | undefined> {
  if (redis) {
    try {
      const value = await redis.get<RescueCase>(KEY_PREFIX + caseId);
      if (value) return value;
    } catch {
      // fall through to memory on a transient KV error
    }
  }
  return memory.get(caseId);
}

export async function saveRescueCase(
  rescueCase: RescueCase,
): Promise<RescueCase> {
  // Always keep the in memory copy so a warm instance can serve it too.
  memory.set(rescueCase.id, rescueCase);
  if (redis) {
    try {
      await redis.set(KEY_PREFIX + rescueCase.id, rescueCase, {
        ex: TTL_SECONDS,
      });
    } catch {
      // a KV write failure should not break the request; memory still has it
    }
  }
  return rescueCase;
}

export async function updateRescueCase(
  caseId: string,
  updater: (rescueCase: RescueCase) => RescueCase,
): Promise<RescueCase | undefined> {
  const current = await getRescueCase(caseId);
  if (!current) return undefined;
  return saveRescueCase(updater(current));
}

/** Pure: appends a timeline entry and advances status. No IO. */
export function withTimeline(
  rescueCase: RescueCase,
  status: RescueStatus,
  message: string,
  now = new Date(),
): RescueCase {
  return {
    ...rescueCase,
    status,
    timeline: [...rescueCase.timeline, timelineItem(status, message, now)],
  };
}

export async function resetCaseStore() {
  memory.clear();
}

function timelineItem(
  status: RescueStatus,
  message: string,
  at: Date,
): RescueTimelineItem {
  return { at: at.toISOString(), status, message };
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}
