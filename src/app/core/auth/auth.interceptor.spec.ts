import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { environment } from '../../../environments/environment';
import { authInterceptor } from './auth.interceptor';
import { TokenStorageService } from './token-storage.service';

/**
 * The interceptor is where a small mistake becomes a logout loop, so its rules
 * are pinned individually: what carries a token, what a 401 means on each kind
 * of endpoint, and that a retry never retries itself.
 */
describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let storage: TokenStorageService;

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    storage = TestBed.inject(TokenStorageService);
  });

  afterEach(() => httpMock.verify());

  it('attaches the access token to an API request', () => {
    storage.save({ access: 'a-token', refresh: 'r-token' });

    http.get(`${environment.apiBaseUrl}/reviews/`).subscribe();

    const request = httpMock.expectOne(`${environment.apiBaseUrl}/reviews/`);
    expect(request.request.headers.get('Authorization')).toBe('Bearer a-token');
    request.flush({});
  });

  it('sends no header when there is no session', () => {
    http.get(`${environment.apiBaseUrl}/reviews/`).subscribe();

    const request = httpMock.expectOne(`${environment.apiBaseUrl}/reviews/`);
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({});
  });

  it('does not attach a stale token to the login endpoint', () => {
    storage.save({ access: 'stale', refresh: 'stale-refresh' });

    http.post(`${environment.apiBaseUrl}/auth/login/`, {}).subscribe();

    const request = httpMock.expectOne(`${environment.apiBaseUrl}/auth/login/`);
    // A token the server rejects would make the login attempt fail with 401
    // before the view ever saw the credentials.
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({});
  });

  it('does attach a token to the OAuth authorize call', () => {
    storage.save({ access: 'a-token', refresh: 'r-token' });

    http.get(`${environment.apiBaseUrl}/auth/oauth/github/authorize/`).subscribe();

    const request = httpMock.expectOne(`${environment.apiBaseUrl}/auth/oauth/github/authorize/`);
    // Sending one is what turns a sign-in into "connect this to my account".
    expect(request.request.headers.get('Authorization')).toBe('Bearer a-token');
    request.flush({});
  });

  it('leaves a non-API URL alone', () => {
    storage.save({ access: 'a-token', refresh: 'r-token' });

    http.get('https://example.com/thing').subscribe();

    const request = httpMock.expectOne('https://example.com/thing');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({});
  });

  it('renews the token on a 401 and retries the original request', async () => {
    storage.save({ access: 'expired', refresh: 'r-token' });

    const result = new Promise((resolve) =>
      http.get(`${environment.apiBaseUrl}/reviews/`).subscribe(resolve),
    );

    httpMock
      .expectOne(`${environment.apiBaseUrl}/reviews/`)
      .flush({ detail: 'expired' }, { status: 401, statusText: 'Unauthorized' });

    httpMock
      .expectOne(`${environment.apiBaseUrl}/auth/refresh/`)
      .flush({ access: 'fresh', refresh: 'rotated' });

    const retried = httpMock.expectOne(`${environment.apiBaseUrl}/reviews/`);
    expect(retried.request.headers.get('Authorization')).toBe('Bearer fresh');
    retried.flush({ ok: true });

    expect(await result).toEqual({ ok: true });
    expect(storage.access).toBe('fresh');
    // The backend rotates and blacklists, so the new refresh token has to be
    // the one that gets stored.
    expect(storage.refresh).toBe('rotated');
  });

  it('gives up and signs out when the renewal itself is rejected', async () => {
    storage.save({ access: 'expired', refresh: 'dead' });

    const failed = new Promise((resolve) =>
      http.get(`${environment.apiBaseUrl}/reviews/`).subscribe({ error: resolve }),
    );

    httpMock
      .expectOne(`${environment.apiBaseUrl}/reviews/`)
      .flush({ detail: 'expired' }, { status: 401, statusText: 'Unauthorized' });
    httpMock
      .expectOne(`${environment.apiBaseUrl}/auth/refresh/`)
      .flush({ detail: 'blacklisted' }, { status: 401, statusText: 'Unauthorized' });

    await failed;
    expect(storage.refresh).toBeNull();
  });

  it('renews once for several requests that expire together', async () => {
    storage.save({ access: 'expired', refresh: 'r-token' });

    const first = new Promise((resolve) =>
      http.get(`${environment.apiBaseUrl}/reviews/`).subscribe(resolve),
    );
    const second = new Promise((resolve) =>
      http.get(`${environment.apiBaseUrl}/health/`).subscribe(resolve),
    );

    httpMock
      .expectOne(`${environment.apiBaseUrl}/reviews/`)
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    httpMock
      .expectOne(`${environment.apiBaseUrl}/health/`)
      .flush({}, { status: 401, statusText: 'Unauthorized' });

    // One renewal, not two. Two would rotate the refresh token twice and
    // blacklist the second one's input, signing the user out.
    httpMock
      .expectOne(`${environment.apiBaseUrl}/auth/refresh/`)
      .flush({ access: 'fresh', refresh: 'rotated' });

    httpMock.expectOne(`${environment.apiBaseUrl}/reviews/`).flush({ a: 1 });
    httpMock.expectOne(`${environment.apiBaseUrl}/health/`).flush({ b: 2 });

    expect(await first).toEqual({ a: 1 });
    expect(await second).toEqual({ b: 2 });
  });

  it('does not retry a request that is already a retry', async () => {
    storage.save({ access: 'expired', refresh: 'r-token' });

    const failed = new Promise((resolve) =>
      http.get(`${environment.apiBaseUrl}/reviews/`).subscribe({ error: resolve }),
    );

    httpMock
      .expectOne(`${environment.apiBaseUrl}/reviews/`)
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    httpMock
      .expectOne(`${environment.apiBaseUrl}/auth/refresh/`)
      .flush({ access: 'fresh', refresh: 'rotated' });
    // The retry is rejected too. If this produced another renewal, one
    // rejection would become an unbounded stream of requests.
    httpMock
      .expectOne(`${environment.apiBaseUrl}/reviews/`)
      .flush({}, { status: 401, statusText: 'Unauthorized' });

    await failed;
    httpMock.verify();
  });
});
