/**
 * "Continue with GitHub" / "Continue with Google".
 *
 * The list comes from `GET /api/auth/providers/`, not from a constant here, so
 * a deployment that has configured only GitHub shows only GitHub. A button
 * that can only produce "this provider is not configured" is worse than no
 * button: it looks like the application is broken rather than the deployment
 * being deliberate.
 *
 * The same component serves the sign-in page and the account page. The only
 * difference is what the backend does with the request, which it decides from
 * whether a token was attached - so this stays one component with one label
 * input rather than two that drift apart.
 */
import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';

import { AuthService } from '../../../core/auth/auth.service';
import { ApiError } from '../../../core/api/api-error';
import { OAuthProviderInfo, OAuthProviderKey } from '../../../core/models/auth.model';

@Component({
  selector: 'app-oauth-buttons',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (providers().length > 0) {
      <div style="display:flex; flex-direction:column; gap:10px">
        @for (provider of providers(); track provider.key) {
          <button
            type="button"
            class="btn btn-secondary btn-lg"
            style="width:100%"
            [disabled]="disabled() || pending() !== null"
            (click)="start(provider.key)"
          >
            @if (pending() === provider.key) {
              Redirecting to {{ provider.label }}…
            } @else {
              {{ verb() }} {{ provider.label }}
            }
          </button>
        }
      </div>

      @if (error(); as message) {
        <p class="field-error" role="alert" style="margin-top:10px">{{ message }}</p>
      }
    }
  `,
})
export class OAuthButtonsComponent {
  private readonly auth = inject(AuthService);

  /** Prefix shown before the provider name. */
  readonly verb = input('Continue with');
  /** Path to return to once signed in. Ignored when connecting a provider. */
  readonly nextPath = input('');
  readonly disabled = input(false);
  /**
   * Providers to leave out - the account page passes the ones already
   * connected, since the backend refuses a second account from one provider
   * and offering the button anyway would only produce that error.
   */
  readonly hide = input<readonly OAuthProviderKey[]>([]);

  /** Emitted when the redirect could not even be started. */
  readonly failed = output<ApiError>();

  private readonly available = signal<readonly OAuthProviderInfo[]>([]);
  protected readonly providers = computed(() =>
    this.available().filter((provider) => !this.hide().includes(provider.key)),
  );
  protected readonly pending = signal<OAuthProviderKey | null>(null);
  protected readonly error = signal<string | null>(null);

  constructor() {
    this.auth.availableProviders().subscribe((providers) => this.available.set(providers));
  }

  protected start(provider: OAuthProviderKey): void {
    this.pending.set(provider);
    this.error.set(null);

    this.auth.startOAuth(provider, this.nextPath()).subscribe({
      // No `next` handler: on success the browser has already left the page.
      error: (apiError: ApiError) => {
        this.pending.set(null);
        this.error.set(apiError.message);
        this.failed.emit(apiError);
      },
    });
  }
}
