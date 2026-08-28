import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { BackendStatusComponent } from './backend-status.component';
import { environment } from '../../../../environments/environment';

/**
 * The connection indicator moved out of the home page into the nav during the
 * design port, so its states are covered here now.
 */
describe('BackendStatusComponent', () => {
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

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BackendStatusComponent],
      providers: [provideHttpClient(withFetch()), provideHttpClientTesting()],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function createIndicator() {
    const fixture = TestBed.createComponent(BackendStatusComponent);
    fixture.detectChanges();
    return { fixture, request: httpMock.expectOne(`${environment.apiBaseUrl}/health/`) };
  }

  it('reports a healthy backend and shows the marking scheme version', async () => {
    const { fixture, request } = createIndicator();
    request.flush(healthResponse);
    await fixture.whenStable();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(fixture.componentInstance.state()).toBe('online');
    expect(text).toContain('Backend connected');
    expect(text).toContain('scheme v1');
  });

  it('distinguishes a degraded backend from an unreachable one', async () => {
    const { fixture, request } = createIndicator();
    request.flush({
      ...healthResponse,
      status: 'degraded',
      checks: {
        database: { status: 'ok', engine: 'sqlite' },
        cache: { status: 'unavailable', backend: 'redis' },
      },
    });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.componentInstance.state()).toBe('degraded');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Backend degraded');
  });

  it('reports an unreachable backend instead of failing silently', async () => {
    const { fixture, request } = createIndicator();
    request.error(new ProgressEvent('error'), { status: 0, statusText: 'Unknown Error' });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.componentInstance.state()).toBe('offline');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Backend unreachable');
  });
});
