/**
 * One category in the score breakdown: name, points, and a square meter.
 *
 * The design system draws progress as a flat 6px bar with no radius, filled
 * with the foreground colour - switching to the accent only when the category
 * is weak. That makes a problem area findable by scanning the column, while the
 * numeric "18 / 25" beside it carries the same information as text.
 */
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { EvaluationCategoryResult } from '../../../core/models/review.model';

/** Below this share of the available points, a category is flagged as weak. */
const WEAK_THRESHOLD = 0.6;

@Component({
  selector: 'app-evaluation-category-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div>
      <div style="display:flex; justify-content:space-between; gap:12px; font-size:13px">
        <span>{{ category().name }}</span>
        <span class="mono tabular" style="flex:none">
          {{ category().score }} / {{ category().maxScore }}
        </span>
      </div>
      <div class="meter">
        <span [class.is-weak]="isWeak()" [style.width.%]="percentage()"></span>
      </div>

      @if (detailed()) {
        @if (category().feedback) {
          <p class="text-muted" style="font-size:12.5px; margin:8px 0 0">
            {{ category().feedback }}
          </p>
        }

        @if (category().strengths.length) {
          <h6 class="text-muted" style="font-size:10px; margin:10px 0 4px">Strengths</h6>
          <ul style="margin:0; padding-left:16px; font-size:12.5px">
            @for (strength of category().strengths; track strength) {
              <li>{{ strength }}</li>
            }
          </ul>
        }

        @if (category().improvements.length) {
          <h6 class="text-muted" style="font-size:10px; margin:10px 0 4px">
            Areas for improvement
          </h6>
          <ul style="margin:0; padding-left:16px; font-size:12.5px">
            @for (improvement of category().improvements; track improvement) {
              <li>{{ improvement }}</li>
            }
          </ul>
        }
      }
    </div>
  `,
})
export class EvaluationCategoryCardComponent {
  readonly category = input.required<EvaluationCategoryResult>();
  /** When true, also render feedback, strengths and improvements. */
  readonly detailed = input(false);

  protected readonly percentage = computed(() => {
    const { score, maxScore } = this.category();
    return maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  });

  protected readonly isWeak = computed(() => this.percentage() < WEAK_THRESHOLD * 100);
}
