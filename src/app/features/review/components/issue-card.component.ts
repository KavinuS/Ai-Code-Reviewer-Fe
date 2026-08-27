/**
 * A single review finding.
 *
 * Two safety points, both required by the spec:
 *
 *  - suggestedCode is rendered with `{{ }}` interpolation inside a <pre>, never
 *    with [innerHTML]. Angular escapes interpolated text, so AI-generated
 *    content cannot inject markup or script into the page, and nothing here
 *    ever executes it.
 *  - severity, type and confidence are shown as words, not just colours. The
 *    coloured chip is reinforcement; the label carries the meaning.
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
    <article class="rounded-lg border border-slate-200 bg-white p-4">
      <div class="flex flex-wrap items-center gap-2">
        <span
          class="rounded-full border px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide"
          [class]="severityClass()"
        >
          {{ severityLabel() }}
        </span>
        <span
          class="rounded-full border border-slate-300 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-700"
        >
          {{ typeLabel() }}
        </span>

        @if (issue().confidence === 'POSSIBLE') {
          <span
            class="rounded-full border border-slate-300 bg-white px-2.5 py-0.5 text-xs font-medium text-slate-600"
            title="The reviewer could not confirm this from the code alone."
          >
            Possible concern
          </span>
        } @else {
          <span
            class="rounded-full border border-slate-300 bg-white px-2.5 py-0.5 text-xs font-medium text-slate-600"
          >
            Confirmed
          </span>
        }

        @if (issue().line !== null) {
          <span class="ml-auto font-mono text-xs text-slate-600">Line {{ issue().line }}</span>
        } @else {
          <span class="ml-auto text-xs text-slate-500">Line not determined</span>
        }
      </div>

      <h4 class="mt-3 font-semibold text-slate-900">{{ issue().title }}</h4>

      <h5 class="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Why this is a problem
      </h5>
      <p class="mt-1 text-sm text-slate-700">{{ issue().description }}</p>

      @if (issue().suggestion) {
        <h5 class="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Suggested fix
        </h5>
        <p class="mt-1 text-sm text-slate-700">{{ issue().suggestion }}</p>
      }

      @if (issue().suggestedCode) {
        <button
          type="button"
          class="mt-3 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
          [attr.aria-expanded]="codeVisible()"
          (click)="toggleCode()"
        >
          {{ codeVisible() ? 'Hide suggested code' : 'View suggested code' }}
        </button>

        @if (codeVisible()) {
          <div class="mt-3">
            <p class="mb-1 text-xs text-slate-500">
              Example only. This code is never run by the application.
            </p>
            <pre
              class="overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs leading-relaxed text-slate-100"
            ><code>{{ issue().suggestedCode }}</code></pre>
          </div>
        }
      }
    </article>
  `,
})
export class IssueCardComponent {
  readonly issue = input.required<ReviewIssue>();

  protected readonly codeVisible = signal(false);

  protected readonly severityLabel = computed(() => SEVERITY_LABELS[this.issue().severity]);
  protected readonly typeLabel = computed(() => ISSUE_TYPE_LABELS[this.issue().type]);

  protected readonly severityClass = computed(() => {
    switch (this.issue().severity) {
      case 'CRITICAL':
        return 'border-red-400 bg-red-100 text-red-900';
      case 'HIGH':
        return 'border-orange-400 bg-orange-100 text-orange-900';
      case 'MEDIUM':
        return 'border-amber-400 bg-amber-100 text-amber-900';
      case 'LOW':
        return 'border-blue-400 bg-blue-100 text-blue-900';
      default:
        return 'border-slate-400 bg-slate-100 text-slate-800';
    }
  });

  protected toggleCode(): void {
    this.codeVisible.update((visible) => !visible);
  }
}
