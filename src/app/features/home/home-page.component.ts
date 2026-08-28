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
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnInit,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
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
  styleUrl: './home-page.component.css',
})
export class HomePageComponent implements OnInit {
  private readonly criteriaService = inject(EvaluationCriteriaService);
  private readonly api = inject(ApiClientService);

  readonly markingScheme = signal<MarkingScheme | null>(null);
  readonly criteriaLoading = signal(false);
  readonly criteriaError = signal<ApiError | null>(null);

  private readonly videoRef = viewChild<ElementRef<HTMLVideoElement>>('bgVideo');

  /**
   * Whether the background video is rendered at all.
   *
   * False on the server (no element to autoplay into, and nothing to gain from
   * shipping a 2.6 MB request in prerendered HTML) and false for a reader whose
   * system asks for reduced motion - for whom the correct amount of ambient
   * animation is none, not a paused first frame.
   */
  readonly videoEnabled = signal(false);

  /** Set once the first frame decodes, which triggers the fade-in. */
  readonly videoReady = signal(false);

  readonly videoPaused = signal(false);

  constructor() {
    effect(() => {
      const element = this.videoRef()?.nativeElement;
      if (!element) {
        return;
      }
      this.startPlayback(element);
    });
  }

  /**
   * Start the background video.
   *
   * `element.muted = true` is not redundant with the `muted` attribute in the
   * template, and leaving it out is why autoplay silently failed here first
   * time round. The content attribute reflects to `defaultMuted`; the `muted`
   * IDL property - the one the autoplay policy actually checks - is only
   * seeded from it when the HTML parser creates the element. Angular creates
   * the element in script and sets attributes afterwards, so `muted` stays
   * false and the browser refuses to autoplay what it considers a video with
   * sound. Setting the property closes that gap.
   */
  private startPlayback(element: HTMLVideoElement): void {
    element.muted = true;
    element.play().then(
      () => this.videoPaused.set(false),
      // Still refused (data saver, power saving, a browser setting). Show the
      // control as "Play" rather than lying about the state.
      () => this.videoPaused.set(true),
    );
  }

  /**
   * Turn the background video on, unless this reader asked for less motion.
   *
   * matchMedia is read once at init rather than watched: someone flipping the
   * OS setting mid-visit is vanishingly rare, and a listener here would outlive
   * the component without a teardown.
   */
  private initBackgroundVideo(): void {
    const prefersReducedMotion =
      typeof matchMedia === 'function' &&
      matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.videoEnabled.set(!prefersReducedMotion);
  }

  /**
   * First frame decoded: fade the video in, and record whether it is actually
   * playing.
   *
   * Autoplay can be refused (power saving, data saver, a browser setting).
   * Because the element carries the `autoplay` attribute there is no promise to
   * catch, so the honest signal is the element's own paused state once it has
   * data. Without this the control would offer "Pause" over a video that never
   * started.
   */
  onVideoReady(): void {
    this.videoReady.set(true);
  }

  toggleMotion(): void {
    const element = this.videoRef()?.nativeElement;
    if (!element) {
      return;
    }

    if (element.paused) {
      this.startPlayback(element);
    } else {
      element.pause();
      this.videoPaused.set(true);
    }
  }

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
    this.initBackgroundVideo();
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
