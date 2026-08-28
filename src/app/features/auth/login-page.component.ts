/**
 * Sign in.
 *
 * The password form and the provider buttons are two ways to reach the same
 * place, so they share one page rather than being split behind a choice the
 * user has to make before seeing either.
 *
 * A failed sign-in is shown as one message above the form, not as a field
 * error. That is not a styling decision: the backend deliberately cannot tell
 * you whether the username or the password was wrong, because doing so would
 * let the form be used to discover which accounts exist. Putting the message
 * under "Password" would claim knowledge nobody has.
 */
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { ApiError } from '../../core/api/api-error';
import { AuthService } from '../../core/auth/auth.service';
import { OAuthButtonsComponent } from './components/oauth-buttons.component';

@Component({
  selector: 'app-login-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, OAuthButtonsComponent],
  template: `
    <div class="wrap" style="max-width:460px">
      <h6 style="color:var(--color-accent); margin-bottom:8px">Sign in</h6>
      <h2 style="font-size:32px; margin:0 0 6px">Welcome back.</h2>
      <p class="text-muted" style="font-size:13px; margin:0">
        Reviewing code, your history and your dashboard all live behind your
        account.
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
            <p class="field-error">Enter your username.</p>
          }
        </div>

        <div class="field">
          <label for="password">Password</label>
          <input
            id="password"
            class="input"
            type="password"
            formControlName="password"
            autocomplete="current-password"
            [attr.aria-invalid]="showError('password') || null"
          />
          @if (showError('password')) {
            <p class="field-error">Enter your password.</p>
          }
        </div>

        <button type="submit" class="btn btn-primary btn-lg" [disabled]="submitting()">
          {{ submitting() ? 'Signing in…' : 'Sign in' }}
        </button>
      </form>

      <div style="display:flex; align-items:center; gap:12px; margin:22px 0 16px">
        <hr class="hr" style="flex:1; margin:0" />
        <span class="text-muted" style="font-size:11px; letter-spacing:0.08em">OR</span>
        <hr class="hr" style="flex:1; margin:0" />
      </div>

      <app-oauth-buttons [nextPath]="nextPath()" [disabled]="submitting()" />

      <p class="text-muted" style="font-size:13px; margin-top:24px">
        No account yet?
        <a [routerLink]="['/register']" [queryParams]="{ next: nextPath() || null }">Create one</a>.
      </p>
    </div>
  `,
})
export class LoginPageComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly form = this.formBuilder.nonNullable.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required]],
  });

  protected readonly submitting = signal(false);
  protected readonly formError = signal<string | null>(null);

  /**
   * Where to go after signing in.
   *
   * Read from the query string, which the guard populates when it turns
   * somebody away. Only same-site paths are honoured - the value reaches this
   * page from a URL anybody can craft, and following an absolute one would
   * make the login page a redirector to any site on the internet.
   */
  protected readonly nextPath = signal(this.safeNextPath());

  protected showError(field: 'username' | 'password'): boolean {
    const control = this.form.controls[field];
    return control.invalid && (control.dirty || control.touched);
  }

  protected onSubmit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.formError.set(null);

    this.auth.login(this.form.getRawValue()).subscribe({
      next: () => {
        this.submitting.set(false);
        void this.router.navigateByUrl(this.nextPath() || '/review');
      },
      error: (error: ApiError) => {
        this.submitting.set(false);
        this.formError.set(error.message);
        this.form.controls.password.reset();
      },
    });
  }

  private safeNextPath(): string {
    const requested = this.route.snapshot.queryParamMap.get('next') ?? '';
    const isSameSitePath = requested.startsWith('/') && !requested.startsWith('//');
    return isSameSitePath ? requested : '';
  }
}
