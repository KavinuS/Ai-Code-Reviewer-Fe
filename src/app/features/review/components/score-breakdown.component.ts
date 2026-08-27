/**
 * The full category-by-category breakdown, plus how the total was calculated.
 *
 * The calculation explanation comes from the backend rather than being
 * reconstructed here, so the number the user sees and the sentence explaining
 * it always come from the same source.
 */
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { Evaluation } from '../../../core/models/review.model';
import { EvaluationCategoryCardComponent } from './evaluation-category-card.component';

@Component({
  selector: 'app-score-breakdown',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EvaluationCategoryCardComponent],
  template: `
    <section>
      <h3 class="text-lg font-semibold text-slate-900">Score breakdown</h3>

      <div class="mt-4 grid gap-4 sm:grid-cols-2">
        @for (category of evaluation().categories; track category.key) {
          <app-evaluation-category-card [category]="category" />
        }
      </div>

      <details class="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <summary class="cursor-pointer text-sm font-semibold text-slate-900">
          How this score was calculated
        </summary>
        <p class="mt-3 text-sm text-slate-700">
          {{ evaluation().calculationExplanation }}
        </p>

        @if (evaluation().adjustments.length) {
          <h4 class="mt-4 text-sm font-semibold text-slate-900">
            Corrections applied to the AI's proposed scores
          </h4>
          <ul class="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-700">
            @for (adjustment of evaluation().adjustments; track adjustment) {
              <li>{{ adjustment }}</li>
            }
          </ul>
        }

        <p class="mt-4 text-xs text-slate-500">
          Marking scheme version {{ evaluation().markingSchemeVersion }}
        </p>
      </details>
    </section>
  `,
})
export class ScoreBreakdownComponent {
  readonly evaluation = input.required<Evaluation>();
}
