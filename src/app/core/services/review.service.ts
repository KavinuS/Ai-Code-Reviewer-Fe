/**
 * Submits code for review, and reads back what was stored.
 *
 * Thin by design: the component owns the UI state machine, this owns the call.
 * Errors arrive already mapped to ApiError by ApiClientService.
 */
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiClientService } from '../api/api-client.service';
import {
  Paginated,
  ReviewHistoryItem,
  ReviewRequest,
  ReviewResult,
} from '../models/review.model';

@Injectable({ providedIn: 'root' })
export class ReviewService {
  private readonly api = inject(ApiClientService);

  createReview(request: ReviewRequest): Observable<ReviewResult> {
    return this.api.post<ReviewResult, ReviewRequest>('/reviews/', request);
  }

  listHistory(page = 1, pageSize = 20): Observable<Paginated<ReviewHistoryItem>> {
    return this.api.get<Paginated<ReviewHistoryItem>>('/reviews/history/', {
      page,
      pageSize,
    });
  }

  getReview(id: string): Observable<ReviewResult> {
    return this.api.get<ReviewResult>(`/reviews/history/${id}/`);
  }

  deleteReview(id: string): Observable<void> {
    return this.api.delete<void>(`/reviews/history/${id}/`);
  }
}
