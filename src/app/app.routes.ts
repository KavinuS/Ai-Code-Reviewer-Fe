import { Routes } from '@angular/router';

/**
 * Application routes.
 *
 * Every feature is lazily loaded with `loadComponent`, so a visitor to the
 * landing page downloads only that page. History and Dashboard exist as routes
 * now because the design's navigation offers all three tabs; a nav entry that
 * leads nowhere is worse than one that explains what is coming.
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
    loadComponent: () =>
      import('./features/review/review-page.component').then((m) => m.ReviewPageComponent),
  },
  {
    path: 'history',
    title: 'History - CODEREVIEW/AI',
    loadComponent: () =>
      import('./features/history/history-page.component').then((m) => m.HistoryPageComponent),
  },
  {
    path: 'dashboard',
    title: 'Dashboard - CODEREVIEW/AI',
    loadComponent: () =>
      import('./features/dashboard/dashboard-page.component').then(
        (m) => m.DashboardPageComponent,
      ),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
