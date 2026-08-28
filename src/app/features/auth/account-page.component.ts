/**
 * Account settings: connected providers, and the password.
 *
 * This page exists because of a deliberate refusal on the backend. An OAuth
 * sign-in whose verified email already belongs to a password account is
 * rejected rather than linked, since registration does not verify addresses
 * and an email match therefore proves nothing about who owns the account. The
 * safe way to make that link is from here, where the request carries a token -
 * so somebody has already proved they own the account before connecting
 * anything to it.
 *
 * The other half is the reverse case: an account created through GitHub has no
 * password, so "set a password" is offered instead of "change password", and
 * disconnecting the last provider is refused until there is one.
 */
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { ApiError } from '../../core/api/api-error';
import { AuthService } from '../../core/auth/auth.service';
import { OAuthProviderKey } from '../../core/models/auth.model';
import { OAuthButtonsComponent } from './components/oauth-buttons.component';
import { PASSWORD_MIN_LENGTH } from './register-page.component';

@Component({
  selector: 'app-account-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, DatePipe, OAuthButtonsComponent],
  template: `
    @if (user(); as account) {
      <div class="wrap" style="max-width:760px">
        <h6 style="color:var(--color-accent); margin-bottom:8px">Account</h6>
        <h2 style="font-size:32px; margin:0">{{ account.displayName }}</h2>
        <p class="text-muted mono" style="font-size:13px; margin:6px 0 0">
          {{ account.username }} &middot; {{ account.email }} &middot; joined
          {{ account.dateJoined | date: 'mediumDate' }}
        </p>

        <hr class="hr" />

        <section>
          <h3 style="font-size:18px; margin:0 0 4px">Connected sign-ins</h3>
          <p class="text-muted" style="font-size:13px; margin:0 0 14px">
            Connecting a provider lets you sign in with it. It never gives this
            application access to your repositories or your contacts.
          </p>

          @if (account.identities.length > 0) {
            <table class="table" style="margin-bottom:18px">
              <thead>
                <tr>
                  <th>Provider</th>
                  <th>Account</th>
                  <th>Connected</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                @for (identity of account.identities; track identity.provider) {
                  <tr>
                    <td>{{ identity.label }}</td>
                    <td class="mono" style="font-size:12.5px">{{ identity.email || '—' }}</td>
                    <td>{{ identity.connectedAt | date: 'mediumDate' }}</td>
                    <td class="num">
                      <button
                        type="button"
                        class="btn btn-ghost"
                        [disabled]="busy()"
                        (click)="disconnect(identity.provider)"
                      >
                        Disconnect
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          } @else {
            <p class="text-muted" style="font-size:13px">
              No providers are connected to this account yet.
            </p>
          }

          @if (disconnectError(); as message) {
            <p class="field-error" role="alert">{{ message }}</p>
          }

          <app-oauth-buttons verb="Connect" [hide]="connectedProviders()" [disabled]="busy()" />
        </section>

        <hr class="hr" />

        <section>
          <h3 style="font-size:18px; margin:0 0 4px">
            {{ account.hasUsablePassword ? 'Change password' : 'Set a password' }}
          </h3>
          <p class="text-muted" style="font-size:13px; margin:0 0 14px">
            @if (account.hasUsablePassword) {
              Changing it issues fresh tokens for this browser. Other browsers stay
              signed in until their session expires.
            } @else {
              This account signs in through a provider. Setting a password adds a
              second way in, and is what lets you disconnect the provider later.
            }
          </p>

          @if (passwordSaved()) {
            <p role="status" style="font-size:13px; color:var(--color-good)">
              Password updated.
            </p>
          }

          <form
            [formGroup]="passwordForm"
            (ngSubmit)="onSubmitPassword()"
            novalidate
            style="display:flex; flex-direction:column; gap:14px; max-width:420px"
          >
            @if (account.hasUsablePassword) {
              <div class="field">
                <label for="current">Current password</label>
                <input
                  id="current"
                  class="input"
                  type="password"
                  formControlName="currentPassword"
                  autocomplete="current-password"
                />
                @for (message of passwordErrorsFor('currentPassword'); track message) {
                  <p class="field-error">{{ message }}</p>
                }
              </div>
            }

            <div class="field">
              <label for="new">New password</label>
              <input
                id="new"
                class="input"
                type="password"
                formControlName="newPassword"
                autocomplete="new-password"
              />
              <p class="text-muted" style="font-size:11.5px; margin:5px 0 0">
                At least {{ passwordMinLength }} characters, and not a common one.
              </p>
              @for (message of passwordErrorsFor('newPassword'); track message) {
                <p class="field-error">{{ message }}</p>
              }
            </div>

            @if (passwordError(); as message) {
              <p class="field-error" role="alert">{{ message }}</p>
            }

            <button type="submit" class="btn btn-primary btn-lg" [disabled]="busy()">
              {{ account.hasUsablePassword ? 'Change password' : 'Set password' }}
            </button>
          </form>
        </section>
      </div>
    }
  `,
})
export class AccountPageComponent {
  private readonly auth = inject(AuthService);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly user = this.auth.user;
  protected readonly passwordMinLength = PASSWORD_MIN_LENGTH;

  protected readonly connectedProviders = computed<readonly OAuthProviderKey[]>(() =>
    (this.user()?.identities ?? []).map((identity) => identity.provider),
  );

  protected readonly busy = signal(false);
  protected readonly disconnectError = signal<string | null>(null);
  protected readonly passwordError = signal<string | null>(null);
  protected readonly passwordSaved = signal(false);
  protected readonly passwordFieldErrors = signal<Readonly<
    Record<string, readonly string[]>
  > | null>(null);

  protected readonly passwordForm = this.formBuilder.nonNullable.group({
    currentPassword: [''],
    newPassword: [
      '',
      [Validators.required, Validators.minLength(PASSWORD_MIN_LENGTH), Validators.maxLength(128)],
    ],
  });

  protected passwordErrorsFor(field: string): readonly string[] {
    return this.passwordFieldErrors()?.[field] ?? [];
  }

  protected disconnect(provider: OAuthProviderKey): void {
    this.busy.set(true);
    this.disconnectError.set(null);

    this.auth.disconnectProvider(provider).subscribe({
      next: () => this.busy.set(false),
      error: (error: ApiError) => {
        this.busy.set(false);
        // The backend refuses to remove the last way into an account. That is
        // the useful message here, so it is shown as-is.
        this.disconnectError.set(error.message);
      },
    });
  }

  protected onSubmitPassword(): void {
    if (this.passwordForm.invalid || this.busy()) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    this.busy.set(true);
    this.passwordError.set(null);
    this.passwordFieldErrors.set(null);
    this.passwordSaved.set(false);

    const value = this.passwordForm.getRawValue();
    this.auth
      .changePassword({
        // Omitted entirely for an account that has no password to confirm.
        currentPassword: this.user()?.hasUsablePassword ? value.currentPassword : undefined,
        newPassword: value.newPassword,
      })
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.passwordSaved.set(true);
          this.passwordForm.reset();
        },
        error: (error: ApiError) => {
          this.busy.set(false);
          this.passwordFieldErrors.set(error.fieldErrors ?? null);
          this.passwordError.set(error.fieldErrors ? null : error.message);
        },
      });
  }
}
