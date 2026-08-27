/**
 * Circular score indicator.
 *
 * The ring is drawn with an SVG stroke-dasharray so it needs no library. It is
 * marked aria-hidden and the real value is exposed as text, because a screen
 * reader user needs "78 out of 100, grade C, Good" - not a description of a
 * circle. Grade and band are always rendered as words next to the number, so
 * the colour of the ring is decoration rather than information.
 */
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

@Component({
  selector: 'app-score',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col items-center gap-3">
      <div class="relative h-36 w-36">
        <svg viewBox="0 0 120 120" class="h-full w-full -rotate-90" aria-hidden="true">
          <circle cx="60" cy="60" [attr.r]="radius" fill="none" stroke="currentColor"
                  class="text-slate-200" stroke-width="10" />
          <circle cx="60" cy="60" [attr.r]="radius" fill="none" stroke="currentColor"
                  [class]="ringClass()" stroke-width="10" stroke-linecap="round"
                  [attr.stroke-dasharray]="circumference"
                  [attr.stroke-dashoffset]="dashOffset()" />
        </svg>

        <div class="absolute inset-0 flex flex-col items-center justify-center" aria-hidden="true">
          <span class="text-3xl font-bold tabular-nums text-slate-900">{{ score() }}</span>
          <span class="text-xs text-slate-500">/ {{ maxScore() }}</span>
        </div>
      </div>

      <p class="sr-only">
        Score {{ score() }} out of {{ maxScore() }}. Grade {{ grade() }}, {{ band() }}.
      </p>

      <div class="text-center" aria-hidden="true">
        <p class="text-sm font-semibold text-slate-900">
          Grade {{ grade() }} &middot; {{ band() }}
        </p>
      </div>
    </div>
  `,
})
export class ScoreComponent {
  readonly score = input.required<number>();
  readonly maxScore = input.required<number>();
  readonly grade = input.required<string>();
  readonly band = input.required<string>();

  protected readonly radius = RADIUS;
  protected readonly circumference = CIRCUMFERENCE;

  protected readonly percentage = computed(() => {
    const max = this.maxScore();
    return max > 0 ? Math.min(1, Math.max(0, this.score() / max)) : 0;
  });

  protected readonly dashOffset = computed(
    () => CIRCUMFERENCE * (1 - this.percentage()),
  );

  protected readonly ringClass = computed(() => {
    switch (this.grade().toUpperCase()) {
      case 'A':
        return 'text-green-600';
      case 'B':
        return 'text-emerald-600';
      case 'C':
        return 'text-amber-500';
      case 'D':
        return 'text-orange-600';
      default:
        return 'text-red-600';
    }
  });
}
