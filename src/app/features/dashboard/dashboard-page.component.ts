/**
 * Review statistics.
 *
 * Same reasoning as the history page: the design's stat tiles, trend chart and
 * recurring-findings table all aggregate stored reviews, which arrive in
 * Phase 6 on top of Phase 5's database. The layout is built now with the tiles
 * showing an explicit "no data" dash instead of invented figures.
 */
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-dashboard-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <div class="wrap">
      <h6 style="color:var(--color-accent); margin-bottom:8px">Dashboard</h6>
      <h2 style="font-size:36px; margin:0">Nothing to summarise yet.</h2>
      <hr class="hr" />

      <div class="grid-hairline" style="grid-template-columns:repeat(auto-fit, minmax(180px, 1fr))">
        @for (tile of tiles; track tile.label) {
          <div>
            <h6 class="text-muted" style="margin:0 0 8px">{{ tile.label }}</h6>
            <div
              class="text-muted"
              style="font-family:var(--font-heading); font-weight:800; font-size:44px; line-height:1"
              aria-label="No data"
            >
              &mdash;
            </div>
            <span class="text-muted" style="font-size:12px">{{ tile.note }}</span>
          </div>
        }
      </div>

      <div style="border:2px solid var(--color-divider); border-top:0; padding:24px">
        <strong style="font-size:15.5px">Statistics are not connected yet.</strong>
        <p class="text-muted" style="font-size:13px; margin:6px 0 0; max-width:64ch">
          Averages, score trends and recurring findings are aggregated across stored
          reviews. Phase 5 adds the storage; Phase 6 adds the
          <span class="mono">GET /api/dashboard/</span> endpoint that fills these tiles.
        </p>
        <a routerLink="/review" class="btn btn-primary btn-lg" style="margin-top:16px">
          Run a review
        </a>
      </div>
    </div>
  `,
})
export class DashboardPageComponent {
  protected readonly tiles = [
    { label: 'Average score', note: 'across all reviews' },
    { label: 'Reviews run', note: 'total submissions' },
    { label: 'Issues found', note: 'by severity' },
    { label: 'Weakest category', note: 'lowest share of points' },
  ];
}
