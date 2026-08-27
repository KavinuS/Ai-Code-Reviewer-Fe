/**
 * The code submission form.
 *
 * A reactive form, with the same limits the backend enforces (required code,
 * length caps, filename shape). Validating on the client is a convenience -
 * instant feedback and no wasted round trip - not a security measure. The
 * backend re-validates everything regardless, because a browser check protects
 * nobody from a crafted request.
 *
 * Server-side field errors are pushed back onto the matching controls via
 * `serverErrors`, so a 400 from DRF lands next to the offending input instead
 * of in a generic banner.
 */
import { ChangeDetectionStrategy, Component, effect, input, output } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { inject } from '@angular/core';

import { SupportedLanguage } from '../../../core/models/marking-scheme.model';
import { ReviewRequest } from '../../../core/models/review.model';

export const MAX_CODE_LENGTH = 80_000;
export const MAX_INSTRUCTIONS_LENGTH = 2_000;

@Component({
  selector: 'app-review-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, DecimalPipe],
  templateUrl: './review-form.component.html',
})
export class ReviewFormComponent {
  private readonly formBuilder = inject(FormBuilder);

  readonly languages = input.required<readonly SupportedLanguage[]>();
  readonly submitting = input(false);
  /** Field-level messages returned by the API, keyed by field name. */
  readonly serverErrors = input<Readonly<Record<string, readonly string[]>> | null>(null);

  readonly review = output<ReviewRequest>();

  protected readonly form = this.formBuilder.nonNullable.group({
    language: ['python', [Validators.required]],
    filename: ['', [Validators.pattern(/^[A-Za-z0-9._-]*$/), Validators.maxLength(255)]],
    instructions: ['', [Validators.maxLength(MAX_INSTRUCTIONS_LENGTH)]],
    code: ['', [Validators.required, Validators.maxLength(MAX_CODE_LENGTH)]],
  });

  protected readonly maxCodeLength = MAX_CODE_LENGTH;
  protected readonly maxInstructionsLength = MAX_INSTRUCTIONS_LENGTH;

  constructor() {
    // Disable the whole form while a review is running, so a second submission
    // cannot be started against a request that is still in flight.
    effect(() => {
      if (this.submitting()) {
        this.form.disable({ emitEvent: false });
      } else {
        this.form.enable({ emitEvent: false });
      }
    });
  }

  protected serverErrorsFor(field: string): readonly string[] {
    return this.serverErrors()?.[field] ?? [];
  }

  protected showError(field: 'language' | 'filename' | 'instructions' | 'code'): boolean {
    const control = this.form.controls[field];
    return control.invalid && (control.dirty || control.touched);
  }

  protected get codeLength(): number {
    return this.form.controls.code.value.length;
  }

  protected onSubmit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    this.review.emit({
      language: value.language,
      code: value.code,
      filename: value.filename.trim() || undefined,
      instructions: value.instructions.trim() || undefined,
    });
  }

  protected onClear(): void {
    // Language is a preference worth keeping across submissions; the rest is not.
    this.form.patchValue({ filename: '', instructions: '', code: '' });
    this.form.markAsPristine();
    this.form.markAsUntouched();
  }
}
