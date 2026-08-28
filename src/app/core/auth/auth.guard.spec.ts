import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from '@angular/router';
import { firstValueFrom, isObservable, of } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AuthUser } from '../models/auth.model';
import { requireAnonymous, requireAuth } from './auth.guard';
import { TokenStorageService } from './token-storage.service';

/**
 * The guards decide what a signed-out visitor sees when they follow a link to
 * Review, History or Dashboard. Two behaviours are worth pinning:
 *
 *   * where they are sent, and that the URL they wanted survives the trip -
 *     losing it means signing in dumps you somewhere you did not ask for;
 *   * that a stored session is *checked* before the decision, not guessed at.
 *     Reading `isAuthenticated()` directly would answer "no" on every page
 *     refresh, and bounce signed-in users to the login form.
 *
 * These guards are a navigation convenience, not the security control - Django
 * checks the token on every request regardless.
 */
const USER: AuthUser = {
  id: 1,
  username: 'kavinu',
  email: 'kavinu@example.com',
  displayName: 'Kavinu',
  avatarUrl: '',
  dateJoined: '2026-01-01T00:00:00Z',
  hasUsablePassword: true,
  identities: [],
};

describe('route guards', () => {
  let httpMock: HttpTestingController;
  let storage: TokenStorageService;
  let router: Router;

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withFetch()),
        provideHttpClientTesting(),
      ],
    });

    httpMock = TestBed.inject(HttpTestingController);
    storage = TestBed.inject(TokenStorageService);
    router = TestBed.inject(Router);
  });

  afterEach(() => httpMock.verify());

  /** Run a guard in an injection context and normalise its result to a promise. */
  function run(guard: typeof requireAuth, url = '/review') {
    const result = TestBed.runInInjectionContext(() =>
      guard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot),
    );
    return firstValueFrom(isObservable(result) ? result : of(result));
  }

  it('sends a signed-out visitor to the sign-in page', async () => {
    const result = await run(requireAuth);

    expect(result).toBeInstanceOf(UrlTree);
    expect(router.serializeUrl(result as UrlTree)).toBe('/login?next=%2Freview');
  });

  it('remembers the page that was asked for', async () => {
    const result = await run(requireAuth, '/history');

    // Signing in has to land where the visitor was going, not on a default.
    expect(router.serializeUrl(result as UrlTree)).toContain('next=%2Fhistory');
  });

  it('lets a signed-in visitor through', async () => {
    storage.save({ access: 'a-token', refresh: 'r-token' });

    const pending = run(requireAuth);
    httpMock.expectOne(`${environment.apiBaseUrl}/auth/me/`).flush(USER);

    expect(await pending).toBe(true);
  });

  it('checks a stored token with the server before deciding', async () => {
    // The session has not been settled yet, which is the state every page
    // refresh starts in. Answering from the unsettled state would turn a valid
    // session into a redirect to the login form.
    storage.save({ access: 'stale', refresh: 'stale-refresh' });

    const pending = run(requireAuth);
    httpMock
      .expectOne(`${environment.apiBaseUrl}/auth/me/`)
      .flush({ detail: 'no' }, { status: 401, statusText: 'Unauthorized' });

    const result = await pending;
    expect(result).toBeInstanceOf(UrlTree);
  });

  it('keeps a signed-in visitor off the sign-in page', async () => {
    storage.save({ access: 'a-token', refresh: 'r-token' });

    const pending = run(requireAnonymous, '/login');
    httpMock.expectOne(`${environment.apiBaseUrl}/auth/me/`).flush(USER);

    expect(router.serializeUrl((await pending) as UrlTree)).toBe('/');
  });

  it('lets a signed-out visitor reach the sign-in page', async () => {
    expect(await run(requireAnonymous, '/login')).toBe(true);
  });
});
