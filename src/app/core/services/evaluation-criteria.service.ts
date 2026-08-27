/**
 * Reads the active marking scheme from the backend.
 *
 * The scheme changes only when its version is bumped, so the response is cached
 * for the lifetime of the page with shareReplay: navigating between the home,
 * review and history pages must not re-fetch it. `shareReplay` is configured
 * with refCount: false so the cached value survives the last unsubscribe.
 */
import { Injectable, inject } from '@angular/core';
import { Observable, shareReplay } from 'rxjs';

import { ApiClientService } from '../api/api-client.service';
import { MarkingScheme } from '../models/marking-scheme.model';

@Injectable({ providedIn: 'root' })
export class EvaluationCriteriaService {
  private readonly api = inject(ApiClientService);
  private markingScheme$?: Observable<MarkingScheme>;

  getMarkingScheme(): Observable<MarkingScheme> {
    this.markingScheme$ ??= this.api
      .get<MarkingScheme>('/evaluation-criteria/')
      .pipe(shareReplay({ bufferSize: 1, refCount: false }));
    return this.markingScheme$;
  }
}
