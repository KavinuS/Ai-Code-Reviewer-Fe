/**
 * A user-facing error with an optional retry action.
 *
 * Renders only the pre-mapped ApiError message, never a raw server payload.
 * The "Error" heading is deliberate: the accent rule alone must not be the only
 * signal that something failed.
 */
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-error-message',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      role="alert"
      style="border:1px solid var(--color-divider); border-left:2px solid var(--color-accent); padding:14px 16px; background:var(--color-surface)"
    >
      <strong style="font-size:14px; color:var(--color-accent-800)">{{ title() }}</strong>
      <p style="font-size:13px; margin:6px 0 0">{{ message() }}</p>

      @if (retryable()) {
        <button type="button" class="btn btn-secondary" style="margin-top:12px" (click)="retry.emit()">
          Try again
        </button>
      }
    </div>
  `,
})
export class ErrorMessageComponent {
  readonly title = input('Error');
  readonly message = input.required<string>();
  readonly retryable = input(false);
  readonly retry = output<void>();
}
