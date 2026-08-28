/**
 * The result header: a one-line verdict, the written summary, and the score.
 *
 * The design opens the result panel with a sentence that states the finding
 * ("Four issues, one critical."), not a label. That headline is derived from
 * the real issue counts by the parent, so it is always true of what follows.
 */
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { Evaluation } from '../../../core/models/review.model';
import { ScoreComponent } from './score.component';

@Component({
  selector: 'app-evaluation-summary',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ScoreComponent],
  template: `
    <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:16px">
      <div>
        <h6 style="color:var(--color-accent); margin-bottom:8px">Result</h6>
        <h3 style="font-size:26px; margin:0 0 6px">{{ headline() }}</h3>
        <p class="text-muted" style="font-size:13.5px; max-width:46ch; margin:0">
          {{ summary() }}
        </p>
      </div>

      <app-score
        [score]="evaluation().totalScore"
        [maxScore]="evaluation().maxScore"
        [grade]="evaluation().grade"
        [band]="evaluation().band"
      />
    </div>
  `,
})
export class EvaluationSummaryComponent {
  readonly evaluation = input.required<Evaluation>();
  readonly summary = input.required<string>();
  readonly headline = input.required<string>();
}
