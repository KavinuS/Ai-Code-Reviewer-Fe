/**
 * Home page.
 *
 * Beyond explaining the product, this page is the project's end-to-end smoke
 * test: it calls /api/health/ and /api/evaluation-criteria/ and renders the
 * result. If Angular, CORS, Django and the marking scheme are wired up
 * correctly, you can see it. If any link in that chain is broken, you see
 * exactly which one, on the first page you load.
 *
 * State is held in signals and the four UI states required of every async view
 * - loading, success, empty, error - are all handled here.
 */
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ApiClientService } from '../../core/api/api-client.service';
import { ApiError } from '../../core/api/api-error';
import { HealthResponse } from '../../core/models/health.model';
import { MarkingScheme } from '../../core/models/marking-scheme.model';
import { EvaluationCriteriaService } from '../../core/services/evaluation-criteria.service';
import { HealthService } from '../../core/services/health.service';
import { ErrorMessageComponent } from '../../shared/components/error-message/error-message.component';
import { LoadingComponent } from '../../shared/components/loading/loading.component';

type ConnectionState = 'idle' | 'checking' | 'online' | 'degraded' | 'offline';

@Component({
  selector: 'app-home-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, LoadingComponent, ErrorMessageComponent],
  templateUrl: './home-page.component.html',
})
export class HomePageComponent implements OnInit {
  private readonly healthService = inject(HealthService);
  private readonly criteriaService = inject(EvaluationCriteriaService);
  private readonly api = inject(ApiClientService);

  readonly connectionState = signal<ConnectionState>('idle');
  readonly health = signal<HealthResponse | null>(null);

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
      title: 'Bugs and logical errors',
      description:
        'Null dereferences, off-by-one mistakes, unhandled edge cases and control flow that does not do what it appears to.',
    },
    {
      title: 'Security issues',
      description:
        'Injection risks, unsafe deserialization, hard-coded secrets, and input that reaches sensitive operations unvalidated.',
    },
    {
      title: 'Performance problems',
      description:
        'Avoidable algorithmic cost, repeated work, N+1 queries, and resources such as files or connections that are never closed.',
    },
    {
      title: 'Poor practices',
      description:
        'Unclear naming, oversized functions, duplication, and departures from the accepted idioms of the language.',
    },
    {
      title: 'Maintainability risks',
      description:
        'Tight coupling, mixed responsibilities, and structure that will make the next change harder than it needs to be.',
    },
    {
      title: 'A transparent score',
      description:
        'Seven categories out of 100 points, each with feedback, strengths and improvements, plus the arithmetic behind the total.',
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
    this.checkConnection();
    this.loadCriteria();
  }

  checkConnection(): void {
    this.connectionState.set('checking');
    this.healthService.check().subscribe({
      next: (response) => {
        this.health.set(response);
        this.connectionState.set(response.status === 'ok' ? 'online' : 'degraded');
      },
      error: () => {
        // A degraded backend still answers (503 with a body); a request that
        // fails outright means the API was not reachable at all.
        this.health.set(null);
        this.connectionState.set('offline');
      },
    });
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
