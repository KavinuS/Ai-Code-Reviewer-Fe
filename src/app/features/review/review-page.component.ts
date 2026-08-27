/**
 * Code review page - the container that owns the UI state machine.
 *
 * Everything asynchronous on this page has four states, and all four are
 * handled: loading, success, empty and error. The child components stay purely
 * presentational, which is what lets ReviewResultComponent be reused unchanged
 * by the history detail page in Phase 5.
 */
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ApiClientService } from '../../core/api/api-client.service';
import { ApiError } from '../../core/api/api-error';
import { SupportedLanguage } from '../../core/models/marking-scheme.model';
import { ReviewRequest, ReviewResult } from '../../core/models/review.model';
import { EvaluationCriteriaService } from '../../core/services/evaluation-criteria.service';
import { ReviewService } from '../../core/services/review.service';
import { ErrorMessageComponent } from '../../shared/components/error-message/error-message.component';
import { LoadingComponent } from '../../shared/components/loading/loading.component';
import { ReviewFormComponent } from './components/review-form.component';
import { ReviewResultComponent } from './components/review-result.component';

@Component({
  selector: 'app-review-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    ReviewFormComponent,
    ReviewResultComponent,
    LoadingComponent,
    ErrorMessageComponent,
  ],
  templateUrl: './review-page.component.html',
})
export class ReviewPageComponent implements OnInit {
  private readonly reviewService = inject(ReviewService);
  private readonly criteriaService = inject(EvaluationCriteriaService);
  private readonly api = inject(ApiClientService);

  readonly languages = signal<readonly SupportedLanguage[]>([]);
  readonly criteriaError = signal<ApiError | null>(null);

  readonly submitting = signal(false);
  readonly result = signal<ReviewResult | null>(null);
  readonly error = signal<ApiError | null>(null);

  /** Last request, so "Try again" can resubmit without retyping. */
  private lastRequest: ReviewRequest | null = null;

  ngOnInit(): void {
    if (!this.api.isBrowser) {
      return;
    }
    this.loadLanguages();
  }

  loadLanguages(): void {
    this.criteriaError.set(null);
    this.criteriaService.getMarkingScheme().subscribe({
      next: (scheme) => this.languages.set(scheme.languages),
      error: (error: ApiError) => this.criteriaError.set(error),
    });
  }

  onReview(request: ReviewRequest): void {
    this.lastRequest = request;
    this.submitting.set(true);
    this.error.set(null);
    // The previous result is cleared so a stale score is never shown next to a
    // request that is still running.
    this.result.set(null);

    this.reviewService.createReview(request).subscribe({
      next: (result) => {
        this.result.set(result);
        this.submitting.set(false);
      },
      error: (error: ApiError) => {
        this.error.set(error);
        this.submitting.set(false);
      },
    });
  }

  retry(): void {
    if (this.lastRequest) {
      this.onReview(this.lastRequest);
    }
  }

  /** Field errors from a 400, handed back to the form. */
  fieldErrors(): Readonly<Record<string, readonly string[]>> | null {
    return this.error()?.fieldErrors ?? null;
  }

  /** A 400 is already reported next to each field; don't repeat it in the banner. */
  showErrorBanner(): boolean {
    const error = this.error();
    return !!error && !error.fieldErrors;
  }
}
