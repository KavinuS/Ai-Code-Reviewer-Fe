import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';

import { routes } from './app.routes';
import { authInterceptor } from './core/auth/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withInMemoryScrolling({ scrollPositionRestoration: 'top' })),
    // withFetch() uses the Fetch API instead of XHR, which is what makes
    // HttpClient work inside the Node server during SSR.
    //
    // authInterceptor attaches the bearer token and renews it on a 401, so no
    // feature service has to know that authentication exists.
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
    provideClientHydration(withEventReplay()),
    // A stored session is settled lazily - by the nav's user menu on first
    // paint, and by a route guard when one runs - rather than in an app
    // initializer. Blocking bootstrap on /auth/me/ would mean a slow or
    // unreachable backend delays the whole application, the landing page and
    // the sign-in form included. AuthService.restore() is memoised, so the two
    // callers still produce one request.
  ],
};
