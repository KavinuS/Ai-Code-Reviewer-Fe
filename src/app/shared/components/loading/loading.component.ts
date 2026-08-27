/**
 * Loading indicator, reused by every asynchronous view.
 *
 * `role="status"` with `aria-live="polite"` means a screen reader announces the
 * label when it appears; the spinner itself is aria-hidden because it carries
 * no information a non-visual user needs.
 */
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-loading',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex items-center gap-3 py-4 text-slate-600" role="status" aria-live="polite">
      <span
        aria-hidden="true"
        class="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700"
      ></span>
      <span class="text-sm">{{ label() }}</span>
    </div>
  `,
})
export class LoadingComponent {
  readonly label = input('Loading...');
}
