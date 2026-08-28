/**
 * Loading indicator.
 *
 * `role="status"` with `aria-live="polite"` announces the label when it
 * appears; the square pulse is aria-hidden because it carries no information a
 * non-visual user needs. Square, not a spinner - the design system has no
 * rounded corners anywhere.
 */
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-loading',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    .pulse {
      width: 8px;
      height: 8px;
      flex: none;
      background: var(--color-accent);
      animation: blink 1s steps(2, end) infinite;
    }
    @keyframes blink {
      50% { opacity: 0.25; }
    }
  `,
  template: `
    <div
      style="display:flex; align-items:center; gap:10px; font-size:13px"
      class="text-muted"
      role="status"
      aria-live="polite"
    >
      <span class="pulse" aria-hidden="true"></span>
      <span>{{ label() }}</span>
    </div>
  `,
})
export class LoadingComponent {
  readonly label = input('Loading...');
}
