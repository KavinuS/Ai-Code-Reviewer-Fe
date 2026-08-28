/**
 * Home page.
 *
 * Landing page.
 *
 * It renders the marking scheme straight from /api/evaluation-criteria/ rather
 * than restating it in markup, so the criteria a visitor reads here are exactly
 * the ones their code will be marked against. The backend-connection indicator
 * lives in the nav now, on every route, rather than only on this page.
 */
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ApiClientService } from '../../core/api/api-client.service';
import { ApiError } from '../../core/api/api-error';
import { MarkingScheme } from '../../core/models/marking-scheme.model';
import { EvaluationCriteriaService } from '../../core/services/evaluation-criteria.service';
import { ErrorMessageComponent } from '../../shared/components/error-message/error-message.component';
import { LoadingComponent } from '../../shared/components/loading/loading.component';

@Component({
  selector: 'app-home-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, LoadingComponent, ErrorMessageComponent],
  templateUrl: './home-page.component.html',
})
export class HomePageComponent implements OnInit {
  private readonly criteriaService = inject(EvaluationCriteriaService);
  private readonly api = inject(ApiClientService);

  readonly markingScheme = signal<MarkingScheme | null>(null);
  readonly criteriaLoading = signal(false);
  readonly criteriaError = signal<ApiError | null>(null);

  /**
   * Static landing-page copy.
   *
   * Held as data rather than repeated markup so the two card grids stay
   * consistent and adding a capability is a one-line change. These are
   * descriptions of the product, not backend configuration, so unlike the
   * marking scheme they are correctly defined here.
   */
  protected readonly capabilities = [
    {
      tag: 'Bug',
      title: 'Bugs and logical errors',
      description:
        'Null dereferences, off-by-one mistakes, unhandled edge cases, and control flow that does not do what it appears to.',
    },
    {
      tag: 'Security',
      title: 'Security issues',
      description:
        'Injection risks, unsafe deserialization, hard-coded secrets, and input that reaches sensitive operations unvalidated.',
    },
    {
      tag: 'Performance',
      title: 'Performance problems',
      description:
        'Avoidable algorithmic cost, repeated work, N+1 queries, and resources such as files or connections that are never closed.',
    },
    {
      tag: 'Code quality',
      title: 'Poor practices',
      description:
        'Unclear naming, oversized functions, duplication, and departures from the accepted idioms of the language.',
    },
    {
      tag: 'Maintainability',
      title: 'Maintainability risks',
      description:
        'Tight coupling, mixed responsibilities, and structure that will make the next change harder than it needs to be.',
    },
    {
      tag: 'Scoring',
      title: 'A transparent score',
      description:
        'Seven categories out of 100, each with feedback, strengths and improvements, plus the arithmetic behind the total.',
    },
  ];

  protected readonly steps = [
    {
      title: 'Pick a language',
      description: 'Choose from the languages the backend accepts, and optionally name the file.',
    },
    {
      title: 'Paste your code',
      description: 'Add optional instructions to steer what the review emphasises.',
    },
    {
      title: 'The backend reviews it',
      description:
        'Django calls the AI provider, then validates every category score against the marking scheme.',
    },
    {
      title: 'Read the result',
      description:
        'Issues with explanations and fixes, plus a score breakdown showing exactly how the total was reached.',
    },
  ];

  ngOnInit(): void {
    // Skipped during server-side rendering: the shell is prerendered without
    // waiting on the API, and these calls run once the page hydrates.
    if (!this.api.isBrowser) {
      return;
    }
    this.loadCriteria();
  }

  loadCriteria(): void {
    this.criteriaLoading.set(true);
    this.criteriaError.set(null);
    this.criteriaService.getMarkingScheme().subscribe({
      next: (scheme) => {
        this.markingScheme.set(scheme);
        this.criteriaLoading.set(false);
      },
      error: (error: ApiError) => {
        this.criteriaError.set(error);
        this.criteriaLoading.set(false);
      },
    });
  }
}
