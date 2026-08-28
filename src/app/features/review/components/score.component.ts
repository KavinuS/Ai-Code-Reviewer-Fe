/**
 * The headline score block: big numeral, denominator, grade and band.
 *
 * The design system has no circular gauges - it states numbers plainly at large
 * size in the heading face. That is followed here: the score is type, not a
 * chart. Grade and band are spelled out beside it, so nothing depends on colour.
 */
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-score',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div style="text-align:right; flex:none">
      <div
        class="tabular"
        style="font-family:var(--font-heading); font-weight:800; font-size:56px; line-height:0.9"
      >
        {{ score() }}
      </div>
      <div class="text-muted mono" style="font-size:12px">
        / {{ maxScore() }} &middot; grade {{ grade() }}
      </div>
      <div class="tag" [class]="bandClass()" style="margin-top:6px">{{ band() }}</div>
    </div>
  `,
})
export class ScoreComponent {
  readonly score = input.required<number>();
  readonly maxScore = input.required<number>();
  readonly grade = input.required<string>();
  readonly band = input.required<string>();

  /** A passing grade reads as neutral; D and F take the accent. */
  protected readonly bandClass = computed(() =>
    ['D', 'F'].includes(this.grade().toUpperCase()) ? 'tag-solid' : 'tag-accent',
  );
}
