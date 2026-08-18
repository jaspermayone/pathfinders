import type {
  ApiErrorBody,
  Collection,
  Day,
  Instructor,
  Section,
  Subject,
  Term,
} from "./types";

const DEFAULT_BASE_URL = "https://calendar.witcc.dev";

/**
 * Resolve the API host. An unset variable and an empty one must behave the
 * same: `??` alone keeps "", which makes every request relative, and a host
 * that rewrites unknown paths to index.html then answers with HTML instead of
 * JSON. Treat blank as absent.
 */
export function resolveBaseUrl(raw: string | undefined): string {
  const trimmed = raw?.trim();
  return (trimmed ? trimmed : DEFAULT_BASE_URL).replace(/\/$/, "");
}

const BASE_URL = resolveBaseUrl(import.meta.env.VITE_API_BASE_URL);

/** An error the API reported itself, with its filter message intact. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorBody["code"] | "UNKNOWN";

  constructor(message: string, status: number, code: ApiError["code"]) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export interface SectionFilters {
  term_uid?: number;
  subject?: string[];
  course_number?: string[];
  crn?: number[];
  q?: string;
  schedule_type?: string[];
  credit_hours?: number[];
  instructor?: string;
  meets_on?: Day[];
  free_days?: Day[];
  /** "HH:MM" or "HHMM". Inclusive at the boundary. */
  begins_after?: string;
  ends_before?: string;
  include_cancelled?: boolean;
  page?: number;
  per_page?: number;
}

/**
 * The API takes a list as one comma-separated value, not as repeated keys.
 * An empty list must be dropped: `subject=` would be read as a filter for a
 * subject with an empty name and would return nothing.
 */
function toQuery(filters: object): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      if (value.length === 0) continue;
      params.set(key, value.join(","));
    } else {
      params.set(key, String(value));
    }
  }

  const query = params.toString();
  return query ? `?${query}` : "";
}

async function get<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    signal,
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    // A 429 or a 502 from the edge is not JSON, so parsing must not throw
    // over the top of the real status.
    let body: Partial<ApiErrorBody> = {};
    try {
      body = await response.json();
    } catch {
      /* keep the status-based message below */
    }
    throw new ApiError(
      body.error ?? `Request failed with status ${response.status}`,
      response.status,
      body.code ?? "UNKNOWN",
    );
  }

  // A 200 that is not JSON means something other than the API answered, most
  // often a static host rewriting an unknown path to index.html. Say that,
  // rather than leaking a parse error about "<!doctype".
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("json")) {
    throw new ApiError(
      `Expected JSON from ${BASE_URL}${path} but received "${
        contentType || "no content type"
      }". Check VITE_API_BASE_URL.`,
      response.status,
      "UNKNOWN",
    );
  }

  return response.json() as Promise<T>;
}

export const catalog = {
  terms: (signal?: AbortSignal) =>
    get<{ data: Term[] }>("/api/v1/catalog/terms", signal).then((r) => r.data),

  subjects: (termUid: number | undefined, signal?: AbortSignal) =>
    get<{ data: Subject[] }>(
      `/api/v1/catalog/subjects${toQuery({ term_uid: termUid })}`,
      signal,
    ).then((r) => r.data),

  sections: (filters: SectionFilters, signal?: AbortSignal) =>
    get<Collection<Section>>(
      `/api/v1/catalog/sections${toQuery(filters)}`,
      signal,
    ),

  section: (crn: number, termUid: number | undefined, signal?: AbortSignal) =>
    get<{ data: Section }>(
      `/api/v1/catalog/sections/${crn}${toQuery({ term_uid: termUid })}`,
      signal,
    ).then((r) => r.data),

  instructors: (
    params: { term_uid?: number; q?: string; page?: number; per_page?: number },
    signal?: AbortSignal,
  ) =>
    get<Collection<Instructor>>(
      `/api/v1/catalog/instructors${toQuery(params)}`,
      signal,
    ),
};

export const __testing = { toQuery, BASE_URL };
