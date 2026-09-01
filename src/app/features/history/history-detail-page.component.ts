/**
 * One stored review, opened from history.
 *
 * Renders through `ReviewResultComponent` - the same component the review page
 * uses for a freshly returned result. That is deliberate and is why the backend
 * rebuilds a stored review into the same domain object before serializing it:
 * a review has one appearance, whether it is seconds or months old, and there
 * is no second rendering path here to drift out of step.
 */
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { ApiClientService } from '../../core/api/api-client.service';
import { ApiError } from '../../core/api/api-error';
import { ReviewResult } from '../../core/models/review.model';
import { ReviewService } from '../../core/services/review.service';
import { ReviewResultComponent } from '../review/components/review-result.component';
import { ErrorMessageComponent } from '../../shared/components/error-message/error-message.component';
import { LoadingComponent } from '../../shared/components/loading/loading.component';

@Component({
  selector: 'app-history-detail-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, ReviewResultComponent, LoadingComponent, ErrorMessageComponent],
  template: `
    <div class="wrap">
      <div style="display:flex; align-items:flex-end; justify-content:space-between; gap:24px; flex-wrap:wrap">
        <div>
          <h6 style="color:var(--color-accent); margin-bottom:8px">Stored review</h6>
          <h2 style="font-size:36px; margin:0">
            {{ result()?.filename || 'Review' }}
          </h2>
        </div>
        <a routerLink="/history" class="btn">Back to history</a>
      </div>

      <hr class="hr" />

      @if (error(); as apiError) {
        <app-error-message
          title="Could not load this review"
          [message]="apiError.message"
          [retryable]="true"
          (retry)="load()"
        />
      } @else if (loading()) {
        <app-loading label="Loading review..." />
      } @else if (result(); as review) {
        <div style="display:flex; flex-direction:column; gap:24px">
          <app-review-result [result]="review" />
        </div>
      }
    </div>
  `,
})
export class HistoryDetailPageComponent implements OnInit {
  private readonly reviewService = inject(ReviewService);
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ApiClientService);

  readonly result = signal<ReviewResult | null>(null);
  readonly loading = signal(false);
  readonly error = signal<ApiError | null>(null);

  ngOnInit(): void {
    if (!this.api.isBrowser) {
      return;
    }
    this.load();
  }

  load(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.reviewService.getReview(id).subscribe({
      next: (result) => {
        this.result.set(result);
        this.loading.set(false);
      },
      error: (apiError: ApiError) => {
        this.error.set(apiError);
        this.loading.set(false);
      },
    });
  }
}
