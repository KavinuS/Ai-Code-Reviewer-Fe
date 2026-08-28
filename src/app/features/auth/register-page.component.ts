/**
 * Create an account.
 *
 * The client-side rules mirror the backend's, which validates everything again
 * regardless. Duplicating them is a convenience - instant feedback, no wasted
 * round trip - not a security measure: a browser check protects nobody from a
 * crafted request.
 *
 * What the client cannot mirror is the parts of the answer only the server
 * knows: whether a username is taken, and whether Django's password validators
 * consider the password too common or too close to the email. Those come back
 * as per-field 400 messages and are rendered under the matching input by
 * `serverErrorsFor`, so a rejection lands where the user has to fix it.
 */
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { ApiError } from '../../core/api/api-error';
import { AuthService } from '../../core/auth/auth.service';
import { OAuthButtonsComponent } from './components/oauth-buttons.component';

/** Matches accounts/serializers.py. */
export const USERNAME_MIN_LENGTH = 3;
export const PASSWORD_MIN_LENGTH = 8;
const USERNAME_PATTERN = /^[A-Za-z0-9._-]+$/;

@Component({
  selector: 'app-register-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, OAuthButtonsComponent],
  template: `
    <div class="wrap" style="max-width:460px">
      <h6 style="color:var(--color-accent); margin-bottom:8px">Create account</h6>
      <h2 style="font-size:32px; margin:0 0 6px">Start reviewing.</h2>
      <p class="text-muted" style="font-size:13px; margin:0">
        An account is needed to run a review, and is what your history and
        dashboard are built from.
      </p>

      <hr class="hr" />

      @if (formError(); as message) {
        <div
          role="alert"
          style="border:1px solid var(--color-divider); border-left:2px solid var(--color-accent); padding:12px 14px; background:var(--color-surface); margin-bottom:16px"
        >
          <p style="font-size:13px; margin:0">{{ message }}</p>
        </div>
      }

      <form [formGroup]="form" (ngSubmit)="onSubmit()" novalidate style="display:flex; flex-direction:column; gap:14px">
        <div class="field">
          <label for="username">Username</label>
          <input
            id="username"
            class="input"
            type="text"
            formControlName="username"
            autocomplete="username"
            autocapitalize="off"
            spellcheck="false"
            [attr.aria-invalid]="showError('username') || null"
          />
          @if (showError('username')) {
            <p class="field-error">
              @if (form.controls.username.hasError('required')) {
                Choose a username.
              } @else if (form.controls.username.hasError('minlength')) {
                At least {{ usernameMinLength }} characters.
              } @else {
                Letters, digits, dots, dashes and underscores only.
              }
            </p>
          }
          @for (message of serverErrorsFor('username'); track message) {
            <p class="field-error">{{ message }}</p>
          }
        </div>

        <div class="field">
          <label for="email">Email</label>
          <input
            id="email"
            class="input"
            type="email"
            formControlName="email"
            autocomplete="email"
            autocapitalize="off"
            spellcheck="false"
            [attr.aria-invalid]="showError('email') || null"
          />
          <p class="text-muted" style="font-size:11.5px; margin:5px 0 0">
            Used to match a GitHub or Google sign-in to this account.
          </p>
          @if (showError('email')) {
            <p class="field-error">Enter a valid email address.</p>
          }
          @for (message of serverErrorsFor('email'); track message) {
            <p class="field-error">{{ message }}</p>
          }
        </div>

        <div class="field">
          <label for="password">Password</label>
          <input
            id="password"
            class="input"
            type="password"
            formControlName="password"
            autocomplete="new-password"
            [attr.aria-invalid]="showError('password') || null"
          />
          <p class="text-muted" style="font-size:11.5px; margin:5px 0 0">
            At least {{ passwordMinLength }} characters, and not a common one.
          </p>
          @if (showError('password')) {
            <p class="field-error">At least {{ passwordMinLength }} characters.</p>
          }
          @for (message of serverErrorsFor('password'); track message) {
            <p class="field-error">{{ message }}</p>
          }
        </div>

        <div class="field">
          <label for="confirm">Confirm password</label>
          <input
            id="confirm"
            class="input"
            type="password"
            formControlName="passwordConfirm"
            autocomplete="new-password"
            [attr.aria-invalid]="showMismatch() || null"
          />
          @if (showMismatch()) {
            <p class="field-error">The two passwords do not match.</p>
          }
          @for (message of serverErrorsFor('passwordConfirm'); track message) {
            <p class="field-error">{{ message }}</p>
          }
        </div>

        <button type="submit" class="btn btn-primary btn-lg" [disabled]="submitting()">
          {{ submitting() ? 'Creating account…' : 'Create account' }}
        </button>
      </form>

      <div style="display:flex; align-items:center; gap:12px; margin:22px 0 16px">
        <hr class="hr" style="flex:1; margin:0" />
        <span class="text-muted" style="font-size:11px; letter-spacing:0.08em">OR</span>
        <hr class="hr" style="flex:1; margin:0" />
      </div>

      <app-oauth-buttons verb="Sign up with" [nextPath]="nextPath()" [disabled]="submitting()" />

      <p class="text-muted" style="font-size:13px; margin-top:24px">
        Already have an account?
        <a [routerLink]="['/login']" [queryParams]="{ next: nextPath() || null }">Sign in</a>.
      </p>
    </div>
  `,
})
export class RegisterPageComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly usernameMinLength = USERNAME_MIN_LENGTH;
  protected readonly passwordMinLength = PASSWORD_MIN_LENGTH;

  protected readonly form = this.formBuilder.nonNullable.group({
    username: [
      '',
      [
        Validators.required,
        Validators.minLength(USERNAME_MIN_LENGTH),
        Validators.maxLength(150),
        Validators.pattern(USERNAME_PATTERN),
      ],
    ],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
    password: [
      '',
      [Validators.required, Validators.minLength(PASSWORD_MIN_LENGTH), Validators.maxLength(128)],
    ],
    passwordConfirm: ['', [Validators.required]],
  });

  protected readonly submitting = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly serverErrors = signal<Readonly<Record<string, readonly string[]>> | null>(
    null,
  );

  protected readonly nextPath = signal(this.safeNextPath());

  protected serverErrorsFor(field: string): readonly string[] {
    return this.serverErrors()?.[field] ?? [];
  }

  protected showError(field: 'username' | 'email' | 'password'): boolean {
    const control = this.form.controls[field];
    return control.invalid && (control.dirty || control.touched);
  }

  /**
   * The mismatch is checked here rather than with a cross-field validator so
   * it only appears once the user has actually typed a confirmation - a
   * group-level error would light up the moment the first password field is
   * filled in, which reads as a mistake the user has not made yet.
   */
  protected showMismatch(): boolean {
    const confirm = this.form.controls.passwordConfirm;
    return (
      (confirm.dirty || confirm.touched) &&
      confirm.value.length > 0 &&
      confirm.value !== this.form.controls.password.value
    );
  }

  protected onSubmit(): void {
    if (this.form.invalid || this.showMismatch() || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.formError.set(null);
    this.serverErrors.set(null);

    this.auth.register(this.form.getRawValue()).subscribe({
      next: () => {
        this.submitting.set(false);
        void this.router.navigateByUrl(this.nextPath() || '/review');
      },
      error: (error: ApiError) => {
        this.submitting.set(false);
        this.serverErrors.set(error.fieldErrors ?? null);
        // Only show the banner when nothing landed on a field, so a rejected
        // username is not also announced twice at the top of the page.
        this.formError.set(error.fieldErrors ? null : error.message);
      },
    });
  }

  private safeNextPath(): string {
    const requested = this.route.snapshot.queryParamMap.get('next') ?? '';
    const isSameSitePath = requested.startsWith('/') && !requested.startsWith('//');
    return isSameSitePath ? requested : '';
  }
}
