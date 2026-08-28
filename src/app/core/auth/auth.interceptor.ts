/**
 * Attaches the bearer token, and renews it when the server says it is stale.
 *
 * Doing this in an interceptor rather than in each service means no feature has
 * to know that authentication exists: `ReviewService` posts a review, and if
 * the access token expired mid-session the request is retried transparently
 * with a fresh one. The user notices a slightly slower request, not a logout.
 *
 * Two rules keep that from misfiring:
 *
 *   * The sign-in endpoints are skipped entirely. `POST /auth/login/` answers
 *     401 for a wrong password, and treating that as an expired token would
 *     send the app off to refresh - and, worse, sign the user out when the
 *     refresh fails. A 401 only means "your token is stale" on an endpoint
 *     that was not being asked to issue one.
 *
 *   * A retried request is never retried again. If the second attempt is also
 *     401, the token is not the problem, and looping would turn one rejection
 *     into an unbounded stream of requests.
 */
import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { TokenStorageService } from './token-storage.service';

/**
 * Paths that neither carry a token nor trigger a renewal.
 *
 * `/auth/oauth/<provider>/authorize/` is deliberately absent: it *does* take a
 * token, because sending one is what turns a sign-in into "connect this
 * provider to my account".
 */
const UNAUTHENTICATED_PATHS = [
  '/auth/login/',
  '/auth/register/',
  '/auth/refresh/',
  '/auth/logout/',
  '/auth/providers/',
  '/auth/oauth/exchange/',
];

function isUnauthenticatedPath(request: HttpRequest<unknown>): boolean {
  return UNAUTHENTICATED_PATHS.some((path) =>
    request.url.startsWith(`${environment.apiBaseUrl}${path}`),
  );
}

function withToken(request: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return request.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  // Only this application's API. A token must never be attached to a
  // third-party URL that happens to pass through HttpClient.
  const isApiRequest = request.url.startsWith(environment.apiBaseUrl);
  if (!isApiRequest || isUnauthenticatedPath(request)) {
    return next(request);
  }

  const storage = inject(TokenStorageService);
  const auth = inject(AuthService);

  const access = storage.access;
  const outgoing = access ? withToken(request, access) : request;

  return next(outgoing).pipe(
    catchError((error: unknown) => {
      const isExpiredToken =
        error instanceof HttpErrorResponse && error.status === 401 && access !== null;

      if (!isExpiredToken) {
        return throwError(() => error);
      }

      // One renewal, one retry. `AuthService.refresh` shares a single in-flight
      // request, so a page that fired several calls at once produces one
      // refresh rather than a burst that would invalidate itself - the backend
      // rotates refresh tokens and blacklists the one just used.
      return auth.refresh().pipe(
        switchMap((renewed) => next(withToken(request, renewed))),
        catchError((refreshError: unknown) => {
          // The refresh failed, so the session is genuinely over.
          // `AuthService` has already cleared it; surface the original 401,
          // which is the answer to the request the caller actually made.
          void refreshError;
          return throwError(() => error);
        }),
      );
    }),
  );
};
