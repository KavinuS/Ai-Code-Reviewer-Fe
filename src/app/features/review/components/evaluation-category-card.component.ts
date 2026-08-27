/**
 * One category of the score breakdown: points, feedback, strengths, improvements.
 *
 * The bar is aria-hidden; the score is already stated as text immediately above
 * it, so announcing it twice would only add noise.
 */
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { EvaluationCategoryResult } from '../../../core/models/review.model';

@Component({
  selector: 'app-evaluation-category-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="rounded-lg border border-slate-200 bg-white p-4">
      <header class="flex flex-wrap items-baseline justify-between gap-2">
        <h4 class="font-semibold text-slate-900">{{ category().name }}</h4>
        <p class="text-sm font-semibold tabular-nums text-slate-900">
          {{ category().score }} / {{ category().maxScore }}
          <span class="ml-1 font-normal text-slate-500">({{ percentage() }}%)</span>
        </p>
      </header>

      <div class="mt-2 h-2 overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
        <div class="h-full rounded-full" [class]="barClass()" [style.width.%]="percentage()"></div>
      </div>

      @if (category().feedback) {
        <p class="mt-3 text-sm text-slate-700">{{ category().feedback }}</p>
      }

      @if (category().strengths.length) {
        <h5 class="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Strengths
        </h5>
        <ul class="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-700">
          @for (strength of category().strengths; track strength) {
            <li>{{ strength }}</li>
          }
        </ul>
      }

      @if (category().improvements.length) {
        <h5 class="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Areas for improvement
        </h5>
        <ul class="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-700">
          @for (improvement of category().improvements; track improvement) {
            <li>{{ improvement }}</li>
          }
        </ul>
      }
    </article>
  `,
})
export class EvaluationCategoryCardComponent {
  readonly category = input.required<EvaluationCategoryResult>();

  protected readonly percentage = computed(() => {
    const { score, maxScore } = this.category();
    return maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  });

  protected readonly barClass = computed(() => {
    const value = this.percentage();
    if (value >= 90) return 'bg-green-600';
    if (value >= 80) return 'bg-emerald-600';
    if (value >= 70) return 'bg-amber-500';
    if (value >= 60) return 'bg-orange-500';
    return 'bg-red-600';
  });
}
