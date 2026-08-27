/**
 * The headline result: score ring, grade, band and the written summary.
 */
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { Evaluation } from '../../../core/models/review.model';
import { ScoreComponent } from './score.component';

@Component({
  selector: 'app-evaluation-summary',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ScoreComponent],
  template: `
    <section class="rounded-xl border border-slate-200 bg-white p-6">
      <div class="flex flex-col gap-6 sm:flex-row sm:items-center">
        <app-score
          [score]="evaluation().totalScore"
          [maxScore]="evaluation().maxScore"
          [grade]="evaluation().grade"
          [band]="evaluation().band"
        />

        <div class="flex-1">
          <h2 class="text-xl font-bold text-slate-900">
            Overall score {{ evaluation().totalScore }} / {{ evaluation().maxScore }}
          </h2>

          <dl class="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <div class="flex gap-1.5">
              <dt class="text-slate-500">Grade:</dt>
              <dd class="font-semibold text-slate-900">{{ evaluation().grade }}</dd>
            </div>
            <div class="flex gap-1.5">
              <dt class="text-slate-500">Band:</dt>
              <dd class="font-semibold text-slate-900">{{ evaluation().band }}</dd>
            </div>
          </dl>

          <p class="mt-2 text-sm text-slate-600">{{ evaluation().bandMeaning }}</p>

          <h3 class="mt-5 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Summary
          </h3>
          <p class="mt-1 text-slate-700">{{ summary() }}</p>
        </div>
      </div>

      <p class="mt-6 border-t border-slate-200 pt-4 text-xs text-slate-500">
        This score is a structured code-quality aid, not a measure of developer
        ability. It reflects only the code submitted, without the requirements,
        constraints or context behind it.
      </p>
    </section>
  `,
})
export class EvaluationSummaryComponent {
  readonly evaluation = input.required<Evaluation>();
  readonly summary = input.required<string>();
}
