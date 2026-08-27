/**
 * Displays a user-facing error with an optional retry action.
 *
 * It renders only the pre-mapped ApiError message, never a raw server payload.
 * The leading "Error" text label is deliberate: the red border alone must not
 * be the only signal that something failed.
 */
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-error-message',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      role="alert"
      class="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-900"
    >
      <p class="font-semibold">{{ title() }}</p>
      <p class="mt-1">{{ message() }}</p>

      @if (retryable()) {
        <button
          type="button"
          class="mt-3 rounded-md border border-red-400 px-3 py-1.5 font-medium text-red-900 hover:bg-red-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
          (click)="retry.emit()"
        >
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
