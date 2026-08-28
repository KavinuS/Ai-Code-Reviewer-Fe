/**
 * Route guards for signed-in and signed-out routes.
 *
 * These are a navigation convenience, not a security control. Every guarded
 * route's data comes from the API, and the API checks the token itself on
 * every request - which is the check that actually matters, because a guard
 * runs in code the user controls. What these buy is that somebody following a
 * bookmark to /history lands on the login form instead of on a page full of
 * failed requests.
 */
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';

import { ApiClientService } from '../api/api-client.service';
import { AuthService } from './auth.service';

/**
 * Requires a signed-in user, and remembers where they were going.
 *
 * `restore()` is awaited rather than reading `isAuthenticated()` directly: on
 * a page refresh the stored token has not been checked yet, and answering from
 * an unsettled state would bounce a signed-in user to the login page.
 */
export const requireAuth: CanActivateFn = (_route, state) => {
  const api = inject(ApiClientService);
  const auth = inject(AuthService);
  const router = inject(Router);

  // Nothing is stored during server-side rendering, so the server can only
  // ever conclude "anonymous". Deferring lets the browser decide once, with
  // the real answer, instead of rendering a login page that immediately
  // replaces itself.
  if (!api.isBrowser) {
    return true;
  }

  return auth.restore().pipe(
    map(
      (signedIn) =>
        signedIn ||
        router.createUrlTree(['/login'], { queryParams: { next: state.url } }),
    ),
  );
};

/**
 * The mirror image: keeps a signed-in user off the login and register pages.
 *
 * Without it, the back button after signing in lands on a login form that is
 * no longer true, and submitting it would replace a good session with a
 * second one for no reason.
 */
export const requireAnonymous: CanActivateFn = () => {
  const api = inject(ApiClientService);
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!api.isBrowser) {
    return true;
  }

  return auth.restore().pipe(map((signedIn) => !signedIn || router.createUrlTree(['/'])));
};
