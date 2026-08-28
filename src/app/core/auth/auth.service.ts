/**
 * The signed-in user, and every operation that changes who that is.
 *
 * Holds the one piece of state the whole application reads - `user()` - so a
 * component never has to ask "am I signed in?" by inspecting a token. The
 * token is a transport detail; identity is what components care about, and the
 * server is the authority on it.
 *
 * Two things are worth knowing about the shape of this service:
 *
 *   * `restore()` is memoised. The nav, the router guard and the account page
 *     all want the session on first paint, and without memoisation that is
 *     three simultaneous calls to /auth/me/ answering the same question.
 *
 *   * `refresh()` shares one in-flight request. When a page fires four API
 *     calls and the access token has just expired, all four get a 401 at once.
 *     Sharing means one refresh happens and the other three wait for it -
 *     which matters more than usual here, because the backend rotates refresh
 *     tokens and blacklists the used one, so four parallel refreshes would
 *     invalidate each other and sign the user out.
 */
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, shareReplay, tap, throwError } from 'rxjs';

import { ApiClientService } from '../api/api-client.service';
import {
  AuthSession,
  AuthUser,
  ChangePasswordRequest,
  LoginRequest,
  OAuthAuthorization,
  OAuthProviderInfo,
  OAuthProviderKey,
  RegisterRequest,
  TokenPair,
} from '../models/auth.model';
import { TokenStorageService } from './token-storage.service';

/**
 * 'unknown' until a stored session has been checked against the server. The
 * distinction matters: a guard must wait during 'unknown' rather than
 * bouncing a signed-in user to the login page on a page refresh.
 */
export type AuthStatus = 'unknown' | 'anonymous' | 'authenticated';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiClientService);
  private readonly storage = inject(TokenStorageService);

  private readonly currentUser = signal<AuthUser | null>(null);
  private readonly currentStatus = signal<AuthStatus>('unknown');

  readonly user = this.currentUser.asReadonly();
  readonly status = this.currentStatus.asReadonly();
  readonly isAuthenticated = computed(() => this.currentStatus() === 'authenticated');

  private restoring: Observable<boolean> | null = null;
  private refreshing: Observable<string> | null = null;
  private providers: Observable<readonly OAuthProviderInfo[]> | null = null;

  // -- session -------------------------------------------------------------

  /**
   * Settle `status` from whatever is in storage. Safe to call repeatedly.
   *
   * Resolves to whether there is a signed-in user, so a guard can subscribe to
   * it directly instead of polling the signal.
   */
  restore(): Observable<boolean> {
    if (this.currentStatus() !== 'unknown') {
      return of(this.isAuthenticated());
    }
    if (this.restoring) {
      return this.restoring;
    }

    // Nothing stored, or rendering on the server where nothing can be stored.
    if (!this.api.isBrowser || !this.storage.hasSession) {
      this.setAnonymous();
      return of(false);
    }

    this.restoring = this.api.get<AuthUser>('/auth/me/').pipe(
      map((user) => {
        this.setUser(user);
        return true;
      }),
      // A stored token that the server rejects is a token worth dropping: the
      // alternative is a UI that says "signed in" and fails every request.
      catchError(() => {
        this.signOutLocally();
        return of(false);
      }),
      tap(() => (this.restoring = null)),
      shareReplay(1),
    );
    return this.restoring;
  }

  login(request: LoginRequest): Observable<AuthUser> {
    return this.api
      .post<AuthSession, LoginRequest>('/auth/login/', request)
      .pipe(map((session) => this.acceptSession(session)));
  }

  register(request: RegisterRequest): Observable<AuthUser> {
    return this.api
      .post<AuthSession, RegisterRequest>('/auth/register/', request)
      .pipe(map((session) => this.acceptSession(session)));
  }

  /**
   * Sign out here and on the server.
   *
   * The local state is cleared first and unconditionally. A failed logout call
   * must still sign the user out of this browser - refusing to would leave
   * somebody unable to end their session because the network is down, which is
   * exactly when they most want to.
   */
  logout(): Observable<void> {
    const refresh = this.storage.refresh;
    this.signOutLocally();

    if (!refresh) {
      return of(void 0);
    }
    return this.api
      .post<void, { refresh: string }>('/auth/logout/', { refresh })
      .pipe(catchError(() => of(void 0)));
  }

  /**
   * Exchange the refresh token for a new pair.
   *
   * Called by the HTTP interceptor on a 401, never by a component.
   */
  refresh(): Observable<string> {
    if (this.refreshing) {
      return this.refreshing;
    }

    const refresh = this.storage.refresh;
    if (!refresh) {
      this.signOutLocally();
      return throwError(() => new Error('No refresh token'));
    }

    this.refreshing = this.api
      .post<TokenPair, { refresh: string }>('/auth/refresh/', { refresh })
      .pipe(
        tap((tokens) => this.storage.save(tokens)),
        map((tokens) => tokens.access),
        catchError((error: unknown) => {
          // The refresh token is expired, blacklisted or forged. There is no
          // way back from here except signing in again.
          this.signOutLocally();
          return throwError(() => error);
        }),
        tap({
          next: () => (this.refreshing = null),
          error: () => (this.refreshing = null),
        }),
        shareReplay(1),
      );
    return this.refreshing;
  }

  changePassword(request: ChangePasswordRequest): Observable<AuthUser> {
    return this.api
      .post<AuthSession, ChangePasswordRequest>('/auth/password/', request)
      .pipe(map((session) => this.acceptSession(session)));
  }

  /** Re-read the user, after something that changes it outside this service. */
  reloadUser(): Observable<AuthUser> {
    return this.api.get<AuthUser>('/auth/me/').pipe(tap((user) => this.setUser(user)));
  }

  // -- OAuth ---------------------------------------------------------------

  /** Which providers this deployment can actually complete a sign-in with. */
  availableProviders(): Observable<readonly OAuthProviderInfo[]> {
    if (!this.providers) {
      this.providers = this.api.get<OAuthProviderInfo[]>('/auth/providers/').pipe(
        // A deployment with no providers configured is a normal state, and the
        // sign-in page should still render its password form.
        catchError(() => of([] as OAuthProviderInfo[])),
        shareReplay(1),
      );
    }
    return this.providers;
  }

  /**
   * Ask the backend for a provider URL and leave the page for it.
   *
   * The returned `state` is kept in session storage first. On the way back,
   * the callback page compares it with what the redirect carries - which is
   * what ties the response to the browser that started the flow, and stops an
   * attacker completing their own sign-in inside somebody else's browser.
   */
  startOAuth(provider: OAuthProviderKey, nextPath = ''): Observable<void> {
    const params = nextPath ? { next: nextPath } : undefined;

    return this.api
      .get<OAuthAuthorization>(`/auth/oauth/${provider}/authorize/`, params)
      .pipe(
        map((authorization) => {
          this.storage.saveOAuthState(authorization.state);
          window.location.assign(authorization.authorizationUrl);
        }),
      );
  }

  /** Trade the callback's one-time ticket for a real session. */
  completeOAuth(ticket: string): Observable<AuthUser> {
    return this.api
      .post<AuthSession, { ticket: string }>('/auth/oauth/exchange/', { ticket })
      .pipe(map((session) => this.acceptSession(session)));
  }

  /** The state this browser stored when it started a sign-in, consumed once. */
  takePendingOAuthState(): string | null {
    return this.storage.takeOAuthState();
  }

  disconnectProvider(provider: OAuthProviderKey): Observable<AuthUser> {
    return this.api
      .delete<AuthUser>(`/auth/oauth/${provider}/`)
      .pipe(tap((user) => this.setUser(user)));
  }

  // -- state ---------------------------------------------------------------

  private acceptSession(session: AuthSession): AuthUser {
    this.storage.save(session);
    this.setUser(session.user);
    return session.user;
  }

  private setUser(user: AuthUser): void {
    this.currentUser.set(user);
    this.currentStatus.set('authenticated');
  }

  private setAnonymous(): void {
    this.currentUser.set(null);
    this.currentStatus.set('anonymous');
  }

  /** Drop the session in this browser without calling the server. */
  private signOutLocally(): void {
    this.storage.clear();
    this.setAnonymous();
    this.restoring = null;
    this.refreshing = null;
  }
}
