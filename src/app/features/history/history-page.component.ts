/**
 * Review history.
 *
 * Renders the caller's stored reviews from GET /api/reviews/history/. The
 * backend scopes the list to the signed-in account, so this component never
 * filters by owner itself - there is nothing here that could show somebody
 * else's review, because nothing else is ever sent.
 *
 * The empty state is still the real one: a new account genuinely has no
 * reviews, and that reads differently from "not connected yet". Deleting is
 * confirmed in the UI first, because it is irreversible and the row is the
 * only copy.
 */
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';

import { ApiClientService } from '../../core/api/api-client.service';
import { ApiError } from '../../core/api/api-error';
import { ReviewHistoryItem } from '../../core/models/review.model';
import { ReviewService } from '../../core/services/review.service';
import { ErrorMessageComponent } from '../../shared/components/error-message/error-message.component';
import { LoadingComponent } from '../../shared/components/loading/loading.component';

@Component({
  selector: 'app-history-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DatePipe, LoadingComponent, ErrorMessageComponent],
  template: `
    <div class="wrap">
      <div style="display:flex; align-items:flex-end; justify-content:space-between; gap:24px; flex-wrap:wrap">
        <div>
          <h6 style="color:var(--color-accent); margin-bottom:8px">History</h6>
          <h2 style="font-size:36px; margin:0">
            @if (loading()) {
              Loading your reviews&hellip;
            } @else if (total() === 0) {
              No reviews stored yet.
            } @else {
              {{ total() }} {{ total() === 1 ? 'review' : 'reviews' }} stored.
            }
          </h2>
        </div>
      </div>

      <hr class="hr" />

      @if (error(); as apiError) {
        <app-error-message
          title="Could not load history"
          [message]="apiError.message"
          [retryable]="true"
          (retry)="load()"
        />
      } @else if (loading()) {
        <app-loading label="Loading history..." />
      } @else {
        <table class="table">
          <thead>
            <tr>
              <th>File</th>
              <th>Language</th>
              <th>Reviewed</th>
              <th class="num">Issues</th>
              <th class="num">Score</th>
              <th class="num">Grade</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (review of reviews(); track review.id) {
              <tr>
                <td>
                  <a [routerLink]="['/history', review.id]" class="mono">
                    {{ review.filename || 'Untitled' }}
                  </a>
                </td>
                <td>{{ review.language }}</td>
                <td>{{ review.createdAt | date: 'medium' }}</td>
                <td class="num">{{ review.issueCount }}</td>
                <td class="num">{{ review.score }}/{{ review.maxScore }}</td>
                <td class="num">{{ review.grade }}</td>
                <td class="num">
                  @if (confirmingId() === review.id) {
                    <button
                      type="button"
                      class="btn"
                      [disabled]="deletingId() === review.id"
                      (click)="confirmDelete(review.id)"
                    >
                      {{ deletingId() === review.id ? 'Deleting...' : 'Confirm' }}
                    </button>
                    <button type="button" class="btn" (click)="confirmingId.set(null)">
                      Cancel
                    </button>
                  } @else {
                    <button type="button" class="btn" (click)="confirmingId.set(review.id)">
                      Delete
                    </button>
                  }
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="7" style="padding:32px 8px">
                  <strong style="font-size:15.5px">Nothing here yet.</strong>
                  <p class="text-muted" style="font-size:13px; margin:6px 0 0; max-width:60ch">
                    Reviews you run are stored against your account and listed here.
                  </p>
                  <a routerLink="/review" class="btn btn-primary btn-lg" style="margin-top:16px">
                    Run a review
                  </a>
                </td>
              </tr>
            }
          </tbody>
        </table>

        @if (deleteError(); as apiError) {
          <p class="text-muted" style="font-size:13px; margin-top:12px">
            {{ apiError.message }}
          </p>
        }

        @if (hasMore()) {
          <button
            type="button"
            class="btn"
            style="margin-top:16px"
            [disabled]="loadingMore()"
            (click)="loadMore()"
          >
            {{ loadingMore() ? 'Loading...' : 'Load more' }}
          </button>
        }
      }
    </div>
  `,
})
export class HistoryPageComponent implements OnInit {
  private readonly reviewService = inject(ReviewService);
  private readonly api = inject(ApiClientService);

  readonly reviews = signal<readonly ReviewHistoryItem[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly loadingMore = signal(false);
  readonly error = signal<ApiError | null>(null);
  readonly deleteError = signal<ApiError | null>(null);

  /** Row awaiting a second click, so a delete is never one stray click away. */
  readonly confirmingId = signal<string | null>(null);
  readonly deletingId = signal<string | null>(null);

  private page = 1;
  private nextPage: string | null = null;

  ngOnInit(): void {
    // Guarded because this component also renders once under SSR, where there
    // is no session to list history for.
    if (!this.api.isBrowser) {
      return;
    }
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.page = 1;

    this.reviewService.listHistory(this.page).subscribe({
      next: (payload) => {
        this.reviews.set(payload.results);
        this.total.set(payload.count);
        this.nextPage = payload.next;
        this.loading.set(false);
      },
      error: (error: ApiError) => {
        this.error.set(error);
        this.loading.set(false);
      },
    });
  }

  hasMore(): boolean {
    return this.nextPage !== null;
  }

  loadMore(): void {
    this.loadingMore.set(true);
    this.page += 1;

    this.reviewService.listHistory(this.page).subscribe({
      next: (payload) => {
        this.reviews.update((current) => [...current, ...payload.results]);
        this.total.set(payload.count);
        this.nextPage = payload.next;
        this.loadingMore.set(false);
      },
      error: (error: ApiError) => {
        this.deleteError.set(error);
        this.loadingMore.set(false);
        this.page -= 1;
      },
    });
  }

  confirmDelete(id: string): void {
    this.deletingId.set(id);
    this.deleteError.set(null);

    this.reviewService.deleteReview(id).subscribe({
      next: () => {
        // Removed locally rather than by refetching: the server has already
        // confirmed, and a refetch would reset a list the user has paged
        // through.
        this.reviews.update((current) => current.filter((review) => review.id !== id));
        this.total.update((count) => Math.max(0, count - 1));
        this.deletingId.set(null);
        this.confirmingId.set(null);
      },
      error: (error: ApiError) => {
        this.deleteError.set(error);
        this.deletingId.set(null);
        this.confirmingId.set(null);
      },
    });
  }
}
