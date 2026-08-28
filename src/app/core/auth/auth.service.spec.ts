import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { TokenStorageService } from './token-storage.service';
import { AuthUser } from '../models/auth.model';

/**
 * The session state machine, pinned.
 *
 * These cover the transitions a component depends on but never triggers
 * directly: what happens to `status` while a stored token is being checked,
 * and what happens to the stored tokens when the server rejects one. Both are
 * places where getting it slightly wrong produces a UI that claims to be
 * signed in and fails every request.
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

describe('AuthService', () => {
  let service: AuthService;
  let storage: TokenStorageService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();

    TestBed.configureTestingModule({
      providers: [provideHttpClient(withFetch()), provideHttpClientTesting()],
    });

    service = TestBed.inject(AuthService);
    storage = TestBed.inject(TokenStorageService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('starts in an unsettled state rather than claiming anonymous', () => {
    expect(service.status()).toBe('unknown');
    expect(service.user()).toBeNull();
  });

  it('settles to anonymous without a request when nothing is stored', async () => {
    const signedIn = await new Promise((resolve) => service.restore().subscribe(resolve));

    expect(signedIn).toBe(false);
    expect(service.status()).toBe('anonymous');
    // No /auth/me/ call to verify - httpMock.verify() in afterEach asserts it.
  });

  it('restores a stored session from the server', async () => {
    storage.save({ access: 'stored-access', refresh: 'stored-refresh' });

    const restored = new Promise((resolve) => service.restore().subscribe(resolve));
    httpMock.expectOne(`${environment.apiBaseUrl}/auth/me/`).flush(USER);

    expect(await restored).toBe(true);
    expect(service.isAuthenticated()).toBe(true);
    expect(service.user()?.username).toBe('kavinu');
  });

  it('discards a stored token the server rejects', async () => {
    storage.save({ access: 'stale', refresh: 'stale-refresh' });

    const restored = new Promise((resolve) => service.restore().subscribe(resolve));
    httpMock
      .expectOne(`${environment.apiBaseUrl}/auth/me/`)
      .flush({ detail: 'no' }, { status: 401, statusText: 'Unauthorized' });

    expect(await restored).toBe(false);
    expect(service.status()).toBe('anonymous');
    // Keeping it would mean every later request fails in the same way, with
    // the UI still showing a signed-in user.
    expect(storage.refresh).toBeNull();
  });

  it('makes one request when several callers restore at once', async () => {
    storage.save({ access: 'stored-access', refresh: 'stored-refresh' });

    const first = new Promise((resolve) => service.restore().subscribe(resolve));
    const second = new Promise((resolve) => service.restore().subscribe(resolve));

    httpMock.expectOne(`${environment.apiBaseUrl}/auth/me/`).flush(USER);

    expect(await first).toBe(true);
    expect(await second).toBe(true);
  });

  it('stores both tokens and the user after a login', async () => {
    const loggedIn = new Promise((resolve) =>
      service.login({ username: 'kavinu', password: 'correct-horse-9' }).subscribe(resolve),
    );

    const request = httpMock.expectOne(`${environment.apiBaseUrl}/auth/login/`);
    expect(request.request.method).toBe('POST');
    request.flush({ user: USER, access: 'a-token', refresh: 'r-token' });

    await loggedIn;
    expect(storage.access).toBe('a-token');
    expect(storage.refresh).toBe('r-token');
    expect(service.isAuthenticated()).toBe(true);
  });

  it('clears the local session before the logout call is answered', () => {
    storage.save({ access: 'a', refresh: 'r' });
    service.login({ username: 'kavinu', password: 'p' }).subscribe({ error: () => undefined });
    httpMock
      .expectOne(`${environment.apiBaseUrl}/auth/login/`)
      .flush({ user: USER, access: 'a', refresh: 'r' });

    service.logout().subscribe();

    // Signed out here and now, whatever the server goes on to say.
    expect(service.status()).toBe('anonymous');
    expect(storage.refresh).toBeNull();
    httpMock.expectOne(`${environment.apiBaseUrl}/auth/logout/`).flush(null, { status: 204, statusText: 'No Content' });
  });

  it('still signs out locally when the logout call fails', async () => {
    storage.save({ access: 'a', refresh: 'r' });

    const done = new Promise((resolve) => service.logout().subscribe(resolve));
    httpMock
      .expectOne(`${environment.apiBaseUrl}/auth/logout/`)
      .error(new ProgressEvent('error'), { status: 0 });

    await done;
    expect(storage.refresh).toBeNull();
    expect(service.status()).toBe('anonymous');
  });

  it('treats an unreachable providers endpoint as "no providers"', async () => {
    const providers = new Promise((resolve) =>
      service.availableProviders().subscribe(resolve),
    );
    httpMock
      .expectOne(`${environment.apiBaseUrl}/auth/providers/`)
      .error(new ProgressEvent('error'), { status: 0 });

    // The password form has to render even when the provider list cannot.
    expect(await providers).toEqual([]);
  });
});
