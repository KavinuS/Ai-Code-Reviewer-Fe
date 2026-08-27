/**
 * The single place the frontend talks to the backend.
 *
 * Every feature service goes through this instead of injecting HttpClient
 * directly, which buys three things:
 *   - the base URL is configured once, from the environment file,
 *   - every error is normalised to ApiError before a component sees it,
 *   - SSR safety is enforced in one place (see `isBrowser`).
 */
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { toApiError } from './api-error';

@Injectable({ providedIn: 'root' })
export class ApiClientService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);

  /**
   * True only in the browser.
   *
   * This app is server-rendered, so component code also runs once inside Node.
   * `apiBaseUrl` is a relative path in production, which Node cannot resolve,
   * and rendering the shell should never wait on the API anyway. Components
   * check this before issuing a request.
   */
  readonly isBrowser = isPlatformBrowser(this.platformId);

  get<T>(path: string, params?: Record<string, string | number>): Observable<T> {
    return this.http
      .get<T>(this.buildUrl(path), { params: this.buildParams(params) })
      .pipe(catchError((error: unknown) => throwError(() => toApiError(error))));
  }

  post<TResponse, TBody>(path: string, body: TBody): Observable<TResponse> {
    return this.http
      .post<TResponse>(this.buildUrl(path), body)
      .pipe(catchError((error: unknown) => throwError(() => toApiError(error))));
  }

  delete<T>(path: string): Observable<T> {
    return this.http
      .delete<T>(this.buildUrl(path))
      .pipe(catchError((error: unknown) => throwError(() => toApiError(error))));
  }

  private buildUrl(path: string): string {
    const normalised = path.startsWith('/') ? path : `/${path}`;
    return `${environment.apiBaseUrl}${normalised}`;
  }

  private buildParams(params?: Record<string, string | number>): HttpParams | undefined {
    if (!params) {
      return undefined;
    }
    let httpParams = new HttpParams();
    for (const [key, value] of Object.entries(params)) {
      httpParams = httpParams.set(key, String(value));
    }
    return httpParams;
  }
}
