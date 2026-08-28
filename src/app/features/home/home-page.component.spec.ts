import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { HomePageComponent } from './home-page.component';
import { environment } from '../../../environments/environment';

/**
 * The landing page's job is to render the marking scheme from backend data
 * rather than restating it, so that is what is asserted here - plus the error
 * path, which must explain itself rather than leave a blank section.
 */
describe('HomePageComponent', () => {
  let httpMock: HttpTestingController;

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
      providers: [provideRouter([]), provideHttpClient(withFetch()), provideHttpClientTesting()],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('renders the marking scheme fetched from the API', async () => {
    const fixture = TestBed.createComponent(HomePageComponent);
    fixture.detectChanges();

    httpMock.expectOne(`${environment.apiBaseUrl}/evaluation-criteria/`).flush(markingScheme);
    await fixture.whenStable();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Correctness and Functionality');
    expect(text).toContain('Excellent');
    expect(text).toContain('scheme v1');
  });

  it('explains a failure to load the criteria instead of rendering nothing', async () => {
    const fixture = TestBed.createComponent(HomePageComponent);
    fixture.detectChanges();

    httpMock
      .expectOne(`${environment.apiBaseUrl}/evaluation-criteria/`)
      .error(new ProgressEvent('error'), { status: 0, statusText: 'Unknown Error' });
    await fixture.whenStable();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Could not load the evaluation criteria');
    expect(text).toContain('Could not reach the server');
  });

  it('links to the review page from the hero', async () => {
    const fixture = TestBed.createComponent(HomePageComponent);
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiBaseUrl}/evaluation-criteria/`).flush(markingScheme);
    await fixture.whenStable();
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const cta = element.querySelector('a[href="/review"]');
    expect(cta?.textContent?.trim()).toBe('Review code');
  });
});
