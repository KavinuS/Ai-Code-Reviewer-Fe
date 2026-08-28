import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { App } from './app';
import { environment } from '../environments/environment';

describe('App shell', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([]), provideHttpClient(withFetch()), provideHttpClientTesting()],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  /** The nav hosts the backend indicator, so every render issues a health call. */
  function createShell() {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiBaseUrl}/health/`).error(new ProgressEvent('error'), {
      status: 0,
      statusText: 'Unknown Error',
    });
    fixture.detectChanges();
    return fixture;
  }

  it('creates the root component', () => {
    expect(createShell().componentInstance).toBeTruthy();
  });

  it('renders the three product tabs', async () => {
    const fixture = createShell();
    await fixture.whenStable();

    const element = fixture.nativeElement as HTMLElement;
    const tabs = Array.from(element.querySelectorAll('.nav-tab')).map((a) => a.textContent?.trim());
    expect(tabs).toEqual(['Review', 'History', 'Dashboard']);
  });

  it('renders the brand mark', async () => {
    const fixture = createShell();
    await fixture.whenStable();

    const brand = (fixture.nativeElement as HTMLElement).querySelector('.nav-brand');
    expect(brand?.textContent?.replace(/\s+/g, '')).toBe('CODEREVIEW/AI');
  });

  it('provides a skip link for keyboard users', async () => {
    const fixture = createShell();
    await fixture.whenStable();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('a[href="#main-content"]')).toBeTruthy();
    expect(element.querySelector('#main-content')).toBeTruthy();
  });

  it('keeps the score disclaimer in the footer', async () => {
    const fixture = createShell();
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'not a judgement of developer ability',
    );
  });
});
