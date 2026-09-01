import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { ReviewPageComponent } from './review-page.component';
import { environment } from '../../../environments/environment';
import { ReviewResult } from '../../core/models/review.model';

const markingScheme = {
  version: 'v1',
  maxScore: 100,
  categories: [
    { key: 'correctness', name: 'Correctness and Functionality', maxScore: 25, description: '' },
  ],
  gradeBands: [{ grade: 'C', band: 'Good', minScore: 70, maxScore: 79, meaning: '' }],
  languages: [
    { key: 'python', label: 'Python' },
    { key: 'java', label: 'Java' },
  ],
};

const reviewResult: ReviewResult = {
  id: '6f1c9d4e-6f0f-4d2a-9a5f-3f0d2c1b4a77',
  summary: 'The service works but does not validate input.',
  language: 'python',
  filename: 'service.py',
  cached: false,
  score: 78,
  grade: 'C',
  evaluationBand: 'Good',
  evaluation: {
    totalScore: 78,
    maxScore: 100,
    grade: 'C',
    band: 'Good',
    bandMeaning: 'Generally acceptable code.',
    markingSchemeVersion: 'v1',
    calculationExplanation: 'The total is the sum of the 7 category scores.',
    adjustments: [],
    categories: [
      {
        key: 'correctness',
        name: 'Correctness and Functionality',
        score: 21,
        maxScore: 25,
        feedback: 'Mostly correct.',
        strengths: ['Clear core logic.'],
        improvements: ['Validate input.'],
      },
    ],
  },
  issues: [
    {
      type: 'BUG',
      severity: 'HIGH',
      confidence: 'CONFIRMED',
      line: 24,
      title: 'Possible null reference',
      description: 'The user object may be null.',
      suggestion: 'Check before accessing.',
      suggestedCode: 'if (user != null) { ... }',
    },
  ],
};

describe('ReviewPageComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReviewPageComponent],
      providers: [provideRouter([]), provideHttpClient(withFetch()), provideHttpClientTesting()],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function createPage() {
    const fixture = TestBed.createComponent(ReviewPageComponent);
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiBaseUrl}/evaluation-criteria/`).flush(markingScheme);
    fixture.detectChanges();
    return fixture;
  }

  it('populates the language dropdown from the backend', async () => {
    const fixture = createPage();
    await fixture.whenStable();
    fixture.detectChanges();

    const options = (fixture.nativeElement as HTMLElement).querySelectorAll('select option');
    expect(Array.from(options).map((o) => o.textContent?.trim())).toEqual(['Python', 'Java']);
  });

  it('renders the score, grade, band and issues after a successful review', async () => {
    const fixture = createPage();
    fixture.componentInstance.onReview({ language: 'python', code: 'x = 1' });

    const request = httpMock.expectOne(`${environment.apiBaseUrl}/reviews/`);
    expect(request.request.method).toBe('POST');
    request.flush(reviewResult, { status: 201, statusText: 'Created' });

    await fixture.whenStable();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('78');
    expect(text).toContain('/ 100 · grade C');
    expect(text).toContain('Good');
    expect(text).toContain('Possible null reference');
    expect(text).toContain('line 24 · confirmed');
    expect(text).toContain('21 / 25');
    // Headline is derived from the real issue counts, not from the AI.
    expect(text).toContain('One issue, one high.');
  });

  it('shows how the score was calculated', async () => {
    const fixture = createPage();
    fixture.componentInstance.onReview({ language: 'python', code: 'x = 1' });
    httpMock.expectOne(`${environment.apiBaseUrl}/reviews/`).flush(reviewResult, { status: 201, statusText: 'Created' });
    await fixture.whenStable();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('How this score was calculated');
    expect(text).toContain('The total is the sum of the 7 category scores.');
  });

  it('renders an empty state when no issues are reported', async () => {
    const fixture = createPage();
    fixture.componentInstance.onReview({ language: 'python', code: 'x = 1' });
    httpMock
      .expectOne(`${environment.apiBaseUrl}/reviews/`)
      .flush({ ...reviewResult, issues: [] }, { status: 201, statusText: 'Created' });
    await fixture.whenStable();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('No issues reported.');
    expect(text).toContain('No issues found.');
  });

  it('shows a friendly message when the AI service is unavailable', async () => {
    const fixture = createPage();
    fixture.componentInstance.onReview({ language: 'python', code: 'x = 1' });
    httpMock.expectOne(`${environment.apiBaseUrl}/reviews/`).flush(
      { detail: 'The AI review service is temporarily unavailable.', code: 'ai_unavailable' },
      { status: 503, statusText: 'Service Unavailable' },
    );

    await fixture.whenStable();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('The review could not be completed');
    expect(fixture.componentInstance.result()).toBeNull();
  });

  it('maps 400 field errors back onto the form instead of a banner', async () => {
    const fixture = createPage();
    fixture.componentInstance.onReview({ language: 'python', code: '' });
    httpMock
      .expectOne(`${environment.apiBaseUrl}/reviews/`)
      .flush({ code: ['Please provide some code to review.'] }, { status: 400, statusText: 'Bad Request' });

    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.componentInstance.showErrorBanner()).toBe(false);
    expect(fixture.componentInstance.fieldErrors()).toEqual({
      code: ['Please provide some code to review.'],
    });
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Please provide some code to review.',
    );
  });

  it('clears a previous result while a new review is running', async () => {
    const fixture = createPage();
    fixture.componentInstance.onReview({ language: 'python', code: 'x = 1' });
    httpMock.expectOne(`${environment.apiBaseUrl}/reviews/`).flush(reviewResult, { status: 201, statusText: 'Created' });
    await fixture.whenStable();
    expect(fixture.componentInstance.result()).not.toBeNull();

    fixture.componentInstance.onReview({ language: 'python', code: 'y = 2' });
    expect(fixture.componentInstance.result()).toBeNull();
    expect(fixture.componentInstance.submitting()).toBe(true);

    httpMock.expectOne(`${environment.apiBaseUrl}/reviews/`).flush(reviewResult, { status: 201, statusText: 'Created' });
  });

  it('escapes AI-generated suggested code rather than injecting it as HTML', async () => {
    const fixture = createPage();
    fixture.componentInstance.onReview({ language: 'python', code: 'x = 1' });
    httpMock.expectOne(`${environment.apiBaseUrl}/reviews/`).flush(
      {
        ...reviewResult,
        issues: [
          {
            ...reviewResult.issues[0],
            suggestedCode: '<img src=x onerror="alert(1)">',
          },
        ],
      },
      { status: 201, statusText: 'Created' },
    );
    await fixture.whenStable();
    fixture.detectChanges();

    // A HIGH-severity finding shows its snippet without a click.
    const element = fixture.nativeElement as HTMLElement;
    const block = element.querySelector('pre.code-block');

    // The payload appears as visible text, and no element was created from it.
    expect(block?.textContent).toContain('<img src=x');
    expect(element.querySelector('img')).toBeNull();
  });
});
