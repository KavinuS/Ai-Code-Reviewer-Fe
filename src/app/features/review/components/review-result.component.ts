/**
 * Assembles a completed review: headline evaluation, score breakdown, issues.
 *
 * Presentational only - it receives a result and renders it. Fetching, loading
 * and error handling stay in ReviewPageComponent, which keeps this component
 * trivial to reuse from the history detail page in Phase 5.
 */
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import {
  ReviewResult,
  SEVERITY_LABELS,
  SEVERITY_ORDER,
  Severity,
} from '../../../core/models/review.model';
import { EvaluationSummaryComponent } from './evaluation-summary.component';
import { IssueCardComponent } from './issue-card.component';
import { ScoreBreakdownComponent } from './score-breakdown.component';

@Component({
  selector: 'app-review-result',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EvaluationSummaryComponent, ScoreBreakdownComponent, IssueCardComponent],
  template: `
    <div class="space-y-8">
      <app-evaluation-summary
        [evaluation]="result().evaluation"
        [summary]="result().summary"
      />

      @if (result().cached) {
        <p class="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600">
          This result was served from cache, so it matches an identical earlier
          submission.
        </p>
      }

      <app-score-breakdown [evaluation]="result().evaluation" />

      <section>
        <div class="flex flex-wrap items-baseline justify-between gap-2">
          <h3 class="text-lg font-semibold text-slate-900">
            Issues ({{ result().issues.length }})
          </h3>

          @if (result().issues.length) {
            <ul class="flex flex-wrap gap-2 text-xs text-slate-600">
              @for (entry of severityCounts(); track entry.severity) {
                <li class="rounded-full border border-slate-300 px-2 py-0.5">
                  {{ entry.label }}: {{ entry.count }}
                </li>
              }
            </ul>
          }
        </div>

        @if (result().issues.length) {
          <div class="mt-4 space-y-4">
            @for (issue of result().issues; track $index) {
              <app-issue-card [issue]="issue" />
            }
          </div>
        } @else {
          <!-- Empty state: no issues found is a real result, not a failure. -->
          <p
            class="mt-4 rounded-lg border border-green-300 bg-green-50 p-4 text-sm text-green-900"
          >
            No specific issues were reported for this submission. The category
            feedback above still shows where the code could be strengthened.
          </p>
        }
      </section>
    </div>
  `,
})
export class ReviewResultComponent {
  readonly result = input.required<ReviewResult>();

  /** Counts per severity, in severity order, omitting empty buckets. */
  protected readonly severityCounts = computed(() => {
    const issues = this.result().issues;
    return SEVERITY_ORDER.map((severity: Severity) => ({
      severity,
      label: SEVERITY_LABELS[severity],
      count: issues.filter((issue) => issue.severity === severity).length,
    })).filter((entry) => entry.count > 0);
  });
}
