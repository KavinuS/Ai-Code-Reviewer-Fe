/**
 * Where GitHub and Google land the browser after Django has finished with them.
 *
 * This page does three things, in this order, and the order is the point:
 *
 *   1. Read the URL fragment. A fragment, not a query string, because
 *      fragments are never sent to a server - so the ticket does not appear in
 *      Django's access log, in a proxy log, or in a `Referer` header.
 *
 *   2. Compare the returned `state` with the one this browser stored when it
 *      started the sign-in. The backend has already checked the signature;
 *      this check answers the different question of whether *this browser*
 *      asked for it. Without it, an attacker could complete a sign-in with
 *      their own authorization code inside somebody else's browser and leave
 *      that person quietly working inside the attacker's account.
 *
 *   3. Only then exchange the ticket for a real session.
 *
 * The fragment is stripped from the address bar as soon as it has been read,
 * so a shared or bookmarked URL carries nothing.
 */
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { ApiClientService } from '../../core/api/api-client.service';
import { ApiError } from '../../core/api/api-error';
import { AuthService } from '../../core/auth/auth.service';
import { OAuthCallbackParams } from '../../core/models/auth.model';

/**
 * Error codes the backend puts in the fragment, mapped to something a person
 * can act on. Anything unrecognised falls back to the generic message rather
 * than being shown raw.
 */
const ERROR_MESSAGES: Record<string, string> = {
  oauth_declined: 'You cancelled the sign-in. Nothing was changed.',
  oauth_invalid_state:
    'That sign-in link has expired. Please start again from the sign-in page.',
  oauth_not_configured:
    'This sign-in provider is not configured on the server. An administrator must set it up.',
  oauth_unavailable:
    'The sign-in provider could not be reached. Please try again in a moment.',
  oauth_exchange_failed: 'The provider refused the sign-in. Please try again.',
  oauth_email_unverified:
    'That provider account has no verified email address. Verify your email with the provider, then try again.',
  oauth_account_conflict:
    'An account already exists for this email address. Sign in with your password, then connect this provider from your account page.',
};

const GENERIC_ERROR = 'The sign-in could not be completed. Please try again.';

@Component({
  selector: 'app-oauth-callback-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="wrap" style="max-width:460px">
      @if (error(); as message) {
        <h6 style="color:var(--color-accent); margin-bottom:8px">Sign-in failed</h6>
        <h2 style="font-size:28px; margin:0 0 10px">That did not complete.</h2>
        <p role="alert" style="font-size:14px; margin:0 0 20px">{{ message }}</p>
        <button type="button" class="btn btn-primary btn-lg" (click)="backToSignIn()">
          Back to sign in
        </button>
      } @else {
        <h6 style="color:var(--color-accent); margin-bottom:8px">Signing in</h6>
        <h2 style="font-size:28px; margin:0 0 10px">Finishing up…</h2>
        <p class="text-muted" style="font-size:13px; margin:0" role="status">
          Completing the sign-in with your provider.
        </p>
      }
    </div>
  `,
})
export class OAuthCallbackPageComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly api = inject(ApiClientService);
  private readonly router = inject(Router);

  protected readonly error = signal<string | null>(null);

  ngOnInit(): void {
    // The fragment only exists in a browser; there is nothing to complete
    // during server-side rendering.
    if (!this.api.isBrowser) {
      return;
    }

    const params = this.readFragment();
    this.clearFragment();

    const expectedState = this.auth.takePendingOAuthState();

    // Fail closed. A missing or mismatched state means this response cannot be
    // shown to belong to a sign-in started here, whatever else it contains.
    if (!params.state || params.state !== expectedState) {
      this.error.set(
        'This sign-in did not start in this browser, or the page was reloaded. ' +
          'Please start again from the sign-in page.',
      );
      return;
    }

    if (params.error) {
      this.error.set(ERROR_MESSAGES[params.error] ?? GENERIC_ERROR);
      return;
    }

    if (!params.ticket) {
      this.error.set(GENERIC_ERROR);
      return;
    }

    this.auth.completeOAuth(params.ticket).subscribe({
      next: () => {
        // `replaceUrl` keeps the callback out of the history stack: pressing
        // back should return to where the user was, not to a spent ticket.
        void this.router.navigateByUrl(params.next || '/review', { replaceUrl: true });
      },
      error: (apiError: ApiError) => this.error.set(apiError.message || GENERIC_ERROR),
    });
  }

  protected backToSignIn(): void {
    void this.router.navigate(['/login'], { replaceUrl: true });
  }

  private readFragment(): OAuthCallbackParams {
    const raw = window.location.hash.replace(/^#/, '');
    const values = new URLSearchParams(raw);

    const next = values.get('next') ?? '';
    return {
      state: values.get('state') ?? '',
      ticket: values.get('ticket') ?? undefined,
      error: values.get('error') ?? undefined,
      // Validated here as well as on the backend: it arrives from a URL, and
      // a same-site path is the only thing safe to navigate to.
      next: next.startsWith('/') && !next.startsWith('//') ? next : '',
    };
  }

  private clearFragment(): void {
    window.history.replaceState(
      window.history.state,
      '',
      window.location.pathname + window.location.search,
    );
  }
}
