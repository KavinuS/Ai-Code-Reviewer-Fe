/**
 * Submits code for review.
 *
 * Thin by design: the component owns the UI state machine, this owns the call.
 * Errors arrive already mapped to ApiError by ApiClientService.
 */
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiClientService } from '../api/api-client.service';
import { ReviewRequest, ReviewResult } from '../models/review.model';

@Injectable({ providedIn: 'root' })
export class ReviewService {
  private readonly api = inject(ApiClientService);

  createReview(request: ReviewRequest): Observable<ReviewResult> {
    return this.api.post<ReviewResult, ReviewRequest>('/reviews/', request);
  }
}
