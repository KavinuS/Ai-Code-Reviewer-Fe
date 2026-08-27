import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, withFetch } from '@angular/common/http';

import { HomePageComponent } from './home-page.component';
import { environment } from '../../../environments/environment';

/**
 * These tests cover the two states that matter most on this page: the marking
 * scheme rendering correctly from backend data, and a dead backend producing a
 * helpful message rather than a blank screen.
 */
describe('HomePageComponent', () => {
  let httpMock: HttpTestingController;

  const healthResponse = {
    status: 'ok',
    service: 'ai-code-review-assistant',
    version: '0.1.0',
    environment: 'test',
    markingSchemeVersion: 'v1',
    time: '2026-01-01T00:00:00Z',
    checks: {
      database: { status: 'ok', engine: 'sqlite' },
      cache: { status: 'ok', backend: 'locmem' },
    },
  };

  const markingScheme = {
    version: 'v1',
    maxScore: 100,
    categories: [
      { key: 'correctness', name: 'Correctness and Functionality', maxScore: 25, description: 'x' },
      { key: 'security', name: 'Security', maxScore: 15, description: 'y' },
    ],
    gradeBands: [
      { grade: 'A', band: 'Excellent', minScore: 90, maxScore: 100, meaning: 'z' },
      { grade: 'F', band: 'Poor', minScore: 0, maxScore: 59, meaning: 'w' },
    ],
    languages: [{ key: 'python', label: 'Python' }],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomePageComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(withFetch()),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  function expectRequests() {
    return {
      health: httpMock.expectOne(`${environment.apiBaseUrl}/health/`),
      criteria: httpMock.expectOne(`${environment.apiBaseUrl}/evaluation-criteria/`),
    };
  }

  it('shows the backend as connected and renders the marking scheme', async () => {
    const fixture = TestBed.createComponent(HomePageComponent);
    fixture.detectChanges();

    const requests = expectRequests();
    requests.health.flush(healthResponse);
    requests.criteria.flush(markingScheme);

    await fixture.whenStable();
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(fixture.componentInstance.connectionState()).toBe('online');
    expect(element.textContent).toContain('Backend connected');
    expect(element.textContent).toContain('Correctness and Functionality');
    expect(element.textContent).toContain('Marking scheme version v1');
  });

  it('reports the backend as unreachable instead of failing silently', async () => {
    const fixture = TestBed.createComponent(HomePageComponent);
    fixture.detectChanges();

    const requests = expectRequests();
    requests.health.error(new ProgressEvent('error'), { status: 0, statusText: 'Unknown Error' });
    requests.criteria.error(new ProgressEvent('error'), { status: 0, statusText: 'Unknown Error' });

    await fixture.whenStable();
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(fixture.componentInstance.connectionState()).toBe('offline');
    expect(element.textContent).toContain('Backend unreachable');
    expect(element.textContent).toContain('Could not reach the server');
  });

  it('treats a degraded backend as reachable but unhealthy', async () => {
    const fixture = TestBed.createComponent(HomePageComponent);
    fixture.detectChanges();

    const requests = expectRequests();
    requests.health.flush({
      ...healthResponse,
      status: 'degraded',
      checks: {
        database: { status: 'ok', engine: 'sqlite' },
        cache: { status: 'unavailable', backend: 'redis' },
      },
    });
    requests.criteria.flush(markingScheme);

    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.componentInstance.connectionState()).toBe('degraded');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Backend degraded');
  });
});
