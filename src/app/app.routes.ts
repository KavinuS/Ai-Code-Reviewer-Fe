import { Routes } from '@angular/router';

/**
 * Application routes.
 *
 * Every feature is lazily loaded with `loadComponent`, so a visitor to the home
 * page downloads only the home page. That stays cheap as the review, history
 * and dashboard features grow.
 */
export const routes: Routes = [
  {
    path: '',
    title: 'AI Code Review Assistant',
    loadComponent: () =>
      import('./features/home/home-page.component').then((m) => m.HomePageComponent),
  },
  {
    path: 'review',
    title: 'Review Code - AI Code Review Assistant',
    loadComponent: () =>
      import('./features/review/review-page.component').then((m) => m.ReviewPageComponent),
  },
  // Phase 5 adds 'history', Phase 6 adds 'dashboard'.
  {
    path: '**',
    redirectTo: '',
  },
];
