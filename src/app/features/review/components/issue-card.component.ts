/**
 * A single review finding, in the design's issue-card form: a hairline box with
 * a 2px accent rule down the left edge, a row of tags, then title, cause, fix
 * and the suggested snippet.
 *
 * Two safety properties, unchanged by the restyle:
 *
 *  - `suggestedCode` is rendered with `{{ }}` interpolation, never
 *    `[innerHTML]`. Angular escapes interpolated text, so AI-generated content
 *    cannot inject markup or script, and nothing here ever executes it.
 *  - severity, type and confidence are shown as words. The coloured tag is
 *    reinforcement; the label carries the meaning.
 *
 * The design shows the snippet always open. That is kept for CRITICAL and HIGH
 * findings, where the fix is the point, and collapsed below that so a long list
 * of minor issues stays scannable.
 */
import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

import {
  ISSUE_TYPE_LABELS,
  ReviewIssue,
  SEVERITY_LABELS,
} from '../../../core/models/review.model';

@Component({
  selector: 'app-issue-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article
      style="border:1px solid var(--color-divider); border-left:2px solid var(--color-accent); padding:14px 16px; display:flex; flex-direction:column; gap:8px"
    >
      <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap">
        <span class="tag" [class]="severityClass()">{{ severityLabel() }}</span>
        <span class="tag tag-neutral">{{ typeLabel() }}</span>
        <span class="text-muted mono" style="font-size:11px">{{ where() }}</span>
      </div>

      <strong style="font-size:15.5px">{{ issue().title }}</strong>

      <p class="text-muted" style="font-size:13px; margin:0">{{ issue().description }}</p>

      @if (issue().suggestion) {
        <p style="font-size:13px; margin:0"><strong>Fix. </strong>{{ issue().suggestion }}</p>
      }

      @if (issue().suggestedCode) {
        @if (codeVisible()) {
          <pre class="code-block">{{ issue().suggestedCode }}</pre>
          <p class="text-muted" style="font-size:11px; margin:0">
            Example only. This code is never run by the application.
          </p>
        } @else {
          <button
            type="button"
            class="btn btn-ghost"
            style="align-self:flex-start"
            [attr.aria-expanded]="codeVisible()"
            (click)="toggleCode()"
          >
            View suggested code
          </button>
        }
      }
    </article>
  `,
})
export class IssueCardComponent {
  readonly issue = input.required<ReviewIssue>();

  /** null until the reader opens or closes the snippet themselves. */
  private readonly userToggled = signal<boolean | null>(null);

  /** Serious findings open with the fix visible; a reader's choice always wins. */
  protected readonly codeVisible = computed(
    () =>
      this.userToggled() ??
      ['CRITICAL', 'HIGH'].includes(this.issue().severity),
  );

  protected readonly severityLabel = computed(() =>
    SEVERITY_LABELS[this.issue().severity].toUpperCase(),
  );
  protected readonly typeLabel = computed(() => ISSUE_TYPE_LABELS[this.issue().type]);

  /** "line 24 · confirmed", or "line not determined · possible". */
  protected readonly where = computed(() => {
    const issue = this.issue();
    const location = issue.line === null ? 'line not determined' : `line ${issue.line}`;
    return `${location} · ${issue.confidence.toLowerCase()}`;
  });

  protected readonly severityClass = computed(
    () => `tag-sev-${this.issue().severity.toLowerCase()}`,
  );

  protected toggleCode(): void {
    this.userToggled.set(!this.codeVisible());
  }
}
