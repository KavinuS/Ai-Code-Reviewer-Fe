import { Routes } from '@angular/router';

import { requireAnonymous, requireAuth } from './core/auth/auth.guard';

/**
 * Application routes.
 *
 * Every feature is lazily loaded with `loadComponent`, so a visitor to the
 * landing page downloads only that page. History and Dashboard exist as routes
 * now because the design's navigation offers all three tabs; a nav entry that
 * leads nowhere is worse than one that explains what is coming.
 *
 * Everything except the landing page and the auth pages requires an account.
 * History, Dashboard and Account are per-user by definition; Review is gated
 * because each submission spends money at a paid AI provider, and an anonymous
 * caller cannot be held to a budget.
 *
 * The landing page stays open, and has to: it is where somebody decides whether
 * to sign up, and it explains the marking scheme from an endpoint that is
 * public for the same reason.
 *
 * The guards here are a navigation convenience - they send a visitor to the
 * sign-in form instead of to a page of failing requests. The check that
 * actually enforces this is `IsAuthenticated` on the Django view, because a
 * guard runs in code the user controls.
 */
export const routes: Routes = [
  {
    path: '',
    title: 'CODEREVIEW/AI',
    loadComponent: () =>
      import('./features/home/home-page.component').then((m) => m.HomePageComponent),
  },
  {
    path: 'review',
    title: 'Review - CODEREVIEW/AI',
    canActivate: [requireAuth],
    loadComponent: () =>
      import('./features/review/review-page.component').then((m) => m.ReviewPageComponent),
  },
  {
    path: 'history',
    title: 'History - CODEREVIEW/AI',
    canActivate: [requireAuth],
    loadComponent: () =>
      import('./features/history/history-page.component').then((m) => m.HistoryPageComponent),
  },
  {
    path: 'dashboard',
    title: 'Dashboard - CODEREVIEW/AI',
    canActivate: [requireAuth],
    loadComponent: () =>
      import('./features/dashboard/dashboard-page.component').then(
        (m) => m.DashboardPageComponent,
      ),
  },
  {
    path: 'login',
    title: 'Sign in - CODEREVIEW/AI',
    canActivate: [requireAnonymous],
    loadComponent: () =>
      import('./features/auth/login-page.component').then((m) => m.LoginPageComponent),
  },
  {
    path: 'register',
    title: 'Create account - CODEREVIEW/AI',
    canActivate: [requireAnonymous],
    loadComponent: () =>
      import('./features/auth/register-page.component').then((m) => m.RegisterPageComponent),
  },
  {
    // Where Django sends the browser back after GitHub or Google. The path is
    // configurable on the backend as FRONTEND_OAUTH_CALLBACK_PATH; the two
    // must agree.
    //
    // No guard: it has to run for a signed-out user completing a sign-in AND
    // for a signed-in one connecting a second provider.
    path: 'auth/callback',
    title: 'Signing in - CODEREVIEW/AI',
    loadComponent: () =>
      import('./features/auth/oauth-callback-page.component').then(
        (m) => m.OAuthCallbackPageComponent,
      ),
  },
  {
    path: 'account',
    title: 'Account - CODEREVIEW/AI',
    canActivate: [requireAuth],
    loadComponent: () =>
      import('./features/auth/account-page.component').then((m) => m.AccountPageComponent),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
