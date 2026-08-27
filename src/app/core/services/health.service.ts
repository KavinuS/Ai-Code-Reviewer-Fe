/**
 * Reads the backend health endpoint.
 *
 * Used by the home page to show whether the API is reachable, which is what
 * makes an end-to-end wiring problem obvious immediately instead of surfacing
 * as a confusing failure on the review page later.
 */
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiClientService } from '../api/api-client.service';
import { HealthResponse } from '../models/health.model';

@Injectable({ providedIn: 'root' })
export class HealthService {
  private readonly api = inject(ApiClientService);

  check(): Observable<HealthResponse> {
    return this.api.get<HealthResponse>('/health/');
  }
}
