/**
 * Turns any HTTP failure into a small, displayable shape.
 *
 * Requirement: the user must never see a raw server error or a stack trace.
 * Mapping happens once, here, so every feature gets consistent wording and no
 * component has to interpret HttpErrorResponse itself.
 */
import { HttpErrorResponse } from '@angular/common/http';

export interface ApiError {
  /** Safe to render to the user. */
  readonly message: string;
  /** HTTP status, or 0 when the request never reached the server. */
  readonly status: number;
  /** Machine-readable hint for components that want to branch on the cause. */
  readonly kind: 'network' | 'client' | 'server' | 'unknown';
  /** Field-level validation messages, keyed by field name (used from Phase 2). */
  readonly fieldErrors?: Readonly<Record<string, readonly string[]>>;
}

const NETWORK_MESSAGE =
  'Could not reach the server. Check that the backend is running and try again.';
const SERVER_MESSAGE =
  'The server ran into a problem handling this request. Please try again shortly.';
const UNKNOWN_MESSAGE = 'Something went wrong. Please try again.';

/** Pull a human-readable message out of a DRF error body, if there is one. */
function extractServerMessage(body: unknown): string | null {
  if (typeof body === 'string' && body.trim().length > 0) {
    return body;
  }
  if (body && typeof body === 'object') {
    const record = body as Record<string, unknown>;
    for (const key of ['detail', 'message', 'error']) {
      const value = record[key];
      if (typeof value === 'string' && value.trim().length > 0) {
        return value;
      }
    }
  }
  return null;
}

/** Collect DRF's `{ field: ["msg", ...] }` validation errors. */
function extractFieldErrors(body: unknown): Record<string, string[]> | undefined {
  if (!body || typeof body !== 'object') {
    return undefined;
  }
  const fieldErrors: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
    if (key === 'detail') {
      continue;
    }
    if (Array.isArray(value) && value.every((item) => typeof item === 'string')) {
      fieldErrors[key] = value as string[];
    }
  }
  return Object.keys(fieldErrors).length > 0 ? fieldErrors : undefined;
}

export function toApiError(error: unknown): ApiError {
  if (!(error instanceof HttpErrorResponse)) {
    return { message: UNKNOWN_MESSAGE, status: 0, kind: 'unknown' };
  }

  // Status 0 means the browser blocked or could not complete the request:
  // backend down, wrong port, or a missing CORS allow-list entry.
  if (error.status === 0) {
    return { message: NETWORK_MESSAGE, status: 0, kind: 'network' };
  }

  if (error.status >= 500) {
    return { message: SERVER_MESSAGE, status: error.status, kind: 'server' };
  }

  return {
    message: extractServerMessage(error.error) ?? UNKNOWN_MESSAGE,
    status: error.status,
    kind: 'client',
    fieldErrors: extractFieldErrors(error.error),
  };
}
