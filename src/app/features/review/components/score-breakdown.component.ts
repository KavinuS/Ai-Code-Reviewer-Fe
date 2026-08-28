/**
 * The category breakdown, and the arithmetic behind the total.
 *
 * The design prints the sum as a single monospace line under the meters
 * ("18 + 9 + 12 + 13 + 7 + 3 = 62 · scheme v1.4"). That line is reproduced here
 * from real values, because the product claim is that the score is the sum of
 * its parts - so the sum should be legible at a glance, not hidden behind a
 * disclosure.
 */
import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

import { Evaluation } from '../../../core/models/review.model';
import { EvaluationCategoryCardComponent } from './evaluation-category-card.component';

@Component({
  selector: 'app-score-breakdown',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EvaluationCategoryCardComponent],
  template: `
    <div>
      <div style="display:flex; align-items:baseline; gap:12px">
        <h6 class="text-muted" style="margin:0; margin-right:auto">Score breakdown</h6>
        <button type="button" class="btn btn-ghost" (click)="toggleDetail()">
          {{ detailed() ? 'Hide feedback' : 'Show feedback' }}
        </button>
      </div>

      <div style="display:flex; flex-direction:column; gap:10px; margin-top:12px">
        @for (category of evaluation().categories; track category.key) {
          <app-evaluation-category-card [category]="category" [detailed]="detailed()" />
        }
      </div>

      <p class="mono text-muted" style="font-size:11.5px; margin-top:12px">
        {{ sumLine() }}
      </p>

      @if (evaluation().adjustments.length) {
        <div style="border-left:2px solid var(--color-accent); padding:8px 12px; margin-top:12px">
          <h6 class="text-muted" style="margin:0 0 6px">Corrections applied by the backend</h6>
          <ul style="margin:0; padding-left:16px; font-size:12.5px">
            @for (adjustment of evaluation().adjustments; track adjustment) {
              <li>{{ adjustment }}</li>
            }
          </ul>
        </div>
      }

      <details style="margin-top:12px">
        <summary style="cursor:pointer; font-size:12.5px">How this score was calculated</summary>
        <p class="text-muted" style="font-size:12.5px; margin:8px 0 0">
          {{ evaluation().calculationExplanation }}
        </p>
      </details>
    </div>
  `,
})
export class ScoreBreakdownComponent {
  readonly evaluation = input.required<Evaluation>();

  protected readonly detailed = signal(false);

  /** e.g. "21 + 16 + 12 + 13 + 7 + 6 + 3 = 78 / 100 · scheme v1" */
  protected readonly sumLine = computed(() => {
    const evaluation = this.evaluation();
    const parts = evaluation.categories.map((category) => category.score).join(' + ');
    return `${parts} = ${evaluation.totalScore} / ${evaluation.maxScore} · scheme ${evaluation.markingSchemeVersion}`;
  });

  protected toggleDetail(): void {
    this.detailed.update((value) => !value);
  }
}
