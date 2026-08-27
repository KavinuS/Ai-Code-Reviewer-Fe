/**
 * Response contract for GET /api/health/.
 * Mirrors backend/config/health.py.
 */

export type HealthStatus = 'ok' | 'degraded';
export type DependencyStatus = 'ok' | 'unavailable';

export interface HealthCheck {
  readonly status: DependencyStatus;
  readonly engine?: string;
  readonly backend?: string;
  readonly error?: string;
}

export interface HealthResponse {
  readonly status: HealthStatus;
  readonly service: string;
  readonly version: string;
  readonly environment: string;
  readonly markingSchemeVersion: string;
  readonly time: string;
  readonly checks: {
    readonly database: HealthCheck;
    readonly cache: HealthCheck;
  };
}
