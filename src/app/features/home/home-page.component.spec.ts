import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
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

  afterEach(() => {
    httpMock.verify();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  /** Force the reduced-motion media query to a known answer. */
  function stubReducedMotion(reduce: boolean) {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: reduce && query.includes('prefers-reduced-motion'),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
  }

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

  describe('background video', () => {
    function render() {
      const fixture = TestBed.createComponent(HomePageComponent);
      fixture.detectChanges();
      httpMock.expectOne(`${environment.apiBaseUrl}/evaluation-criteria/`).flush(markingScheme);
      fixture.detectChanges();
      return fixture;
    }

    it('plays the background video when motion is welcome', async () => {
      stubReducedMotion(false);
      const fixture = render();
      await fixture.whenStable();
      fixture.detectChanges();

      const element = fixture.nativeElement as HTMLElement;
      expect(fixture.componentInstance.videoEnabled()).toBe(true);
      expect(element.querySelector('video')).toBeTruthy();
      expect(element.querySelector('source')?.getAttribute('src')).toBe(
        'Neural_network_landing_page_loop_202608281915.mp4',
      );
      // A background video must never grab audio or the tab's focus order.
      // `muted` is asserted as the DOM PROPERTY, not the attribute: the
      // attribute alone leaves the property false on a script-created element,
      // the browser then refuses to autoplay, and an attribute-only assertion
      // passes while the video never starts. That is the bug this pins.
      const video = element.querySelector('video') as HTMLVideoElement;
      expect(video.muted).toBe(true);
      expect(video.hasAttribute('loop')).toBe(true);
      expect(video.getAttribute('tabindex')).toBe('-1');
    });

    it('offers a pause control once playback starts', async () => {
      // jsdom cannot actually play media, so playback is stubbed to succeed.
      vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
      stubReducedMotion(false);

      const fixture = render();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(fixture.componentInstance.videoPaused()).toBe(false);
      const toggle = (fixture.nativeElement as HTMLElement).querySelector(
        '.landing-motion-toggle',
      );
      expect(toggle?.textContent?.trim()).toBe('Pause background');
    });

    it('shows a play control when the browser refuses autoplay', async () => {
      // Data saver, power saving or a browser setting can all refuse playback.
      vi.spyOn(HTMLMediaElement.prototype, 'play').mockRejectedValue(
        new DOMException('NotAllowedError'),
      );
      stubReducedMotion(false);

      const fixture = render();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(fixture.componentInstance.videoPaused()).toBe(true);
      const toggle = (fixture.nativeElement as HTMLElement).querySelector(
        '.landing-motion-toggle',
      );
      // The control must not claim to pause a video that never started.
      expect(toggle?.textContent?.trim()).toBe('Play background');
    });

    it('renders no video at all under prefers-reduced-motion', async () => {
      stubReducedMotion(true);
      const fixture = render();
      await fixture.whenStable();
      fixture.detectChanges();

      const element = fixture.nativeElement as HTMLElement;
      expect(fixture.componentInstance.videoEnabled()).toBe(false);
      // Not merely paused - never requested, so the 2.6 MB is never fetched.
      expect(element.querySelector('video')).toBeNull();
      expect(element.querySelector('.landing-motion-toggle')).toBeNull();
      // The page itself still renders in full.
      expect(element.textContent).toContain('Correctness and Functionality');
    });
  });
});
