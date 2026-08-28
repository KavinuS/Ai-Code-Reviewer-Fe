/**
 * Assembles a completed review: verdict header, score breakdown, issue list.
 *
 * Presentational only - it receives a result and renders it. Fetching, loading
 * and error handling stay in ReviewPageComponent, which keeps this component
 * reusable by the history detail page in Phase 5.
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
    <app-evaluation-summary
      [evaluation]="result().evaluation"
      [summary]="result().summary"
      [headline]="headline()"
    />

    @if (result().cached) {
      <p class="text-muted mono" style="font-size:11.5px; margin:0">
        Served from cache &mdash; identical to an earlier submission.
      </p>
    }

    <app-score-breakdown [evaluation]="result().evaluation" />

    <hr class="hr" style="margin:0" />

    <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap">
      <h6 class="text-muted" style="margin:0; margin-right:auto">
        Issues ({{ result().issues.length }})
      </h6>
      @for (entry of severityCounts(); track entry.severity) {
        <span class="tag tag-neutral">{{ entry.label }} {{ entry.count }}</span>
      }
    </div>

    @if (result().issues.length) {
      <div style="display:flex; flex-direction:column; gap:12px">
        @for (issue of result().issues; track $index) {
          <app-issue-card [issue]="issue" />
        }
      </div>
    } @else {
      <div style="border:1px solid var(--color-divider); padding:14px 16px">
        <strong style="font-size:15.5px">No issues reported.</strong>
        <p class="text-muted" style="font-size:13px; margin:6px 0 0">
          Nothing specific was flagged in this submission. The category feedback above
          still shows where the code could be strengthened.
        </p>
      </div>
    }
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

  /**
   * The one-line verdict above the summary, e.g. "Four issues, one critical."
   *
   * Derived from the real counts rather than taken from the AI, so it can never
   * contradict the list underneath it.
   */
  protected readonly headline = computed(() => {
    const issues = this.result().issues;
    if (issues.length === 0) {
      return 'No issues found.';
    }

    const critical = issues.filter((issue) => issue.severity === 'CRITICAL').length;
    const high = issues.filter((issue) => issue.severity === 'HIGH').length;
    const noun = issues.length === 1 ? 'issue' : 'issues';
    const count = `${this.spell(issues.length)} ${noun}`;

    let sentence: string;
    if (critical > 0) {
      sentence = `${count}, ${this.spell(critical)} critical.`;
    } else if (high > 0) {
      sentence = `${count}, ${this.spell(high)} high.`;
    } else {
      sentence = `${count}, none critical.`;
    }
    return sentence.charAt(0).toUpperCase() + sentence.slice(1);
  });

  /**
   * Small numbers read better as words in a headline. Kept lower-case here and
   * capitalised once at the start of the sentence, so a count appearing mid
   * sentence ("four issues, one critical") is not wrongly capitalised.
   */
  private spell(value: number): string {
    const words = [
      'no', 'one', 'two', 'three', 'four', 'five', 'six',
      'seven', 'eight', 'nine', 'ten',
    ];
    return value <= 10 ? words[value] : String(value);
  }
}
