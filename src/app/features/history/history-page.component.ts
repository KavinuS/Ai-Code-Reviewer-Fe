/**
 * Review history.
 *
 * The design's History tab renders a table of past reviews. That table needs
 * persisted reviews, which arrive in Phase 5 with PostgreSQL and the
 * GET /api/reviews/ endpoint.
 *
 * The page is built now, in its final design, showing the real empty state
 * rather than sample rows. Fabricating "28 reviews, 12 files" would put numbers
 * on screen that no backend produced - which is exactly the kind of unearned
 * claim this product is supposed to avoid. When the endpoint lands, the empty
 * state gives way to rows and nothing else here changes.
 */
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-history-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <div class="wrap">
      <div style="display:flex; align-items:flex-end; justify-content:space-between; gap:24px; flex-wrap:wrap">
        <div>
          <h6 style="color:var(--color-accent); margin-bottom:8px">History</h6>
          <h2 style="font-size:36px; margin:0">No reviews stored yet.</h2>
        </div>
        <div style="display:flex; gap:10px; align-items:center">
          <input class="input" type="search" placeholder="Filter by filename" style="width:220px" disabled />
          <div class="seg">
            <label class="seg-opt"><input type="radio" name="range" checked disabled />30 days</label>
            <label class="seg-opt"><input type="radio" name="range" disabled />All time</label>
          </div>
        </div>
      </div>

      <hr class="hr" />

      <table class="table">
        <thead>
          <tr>
            <th>File</th>
            <th>Language</th>
            <th>Reviewed</th>
            <th class="num">Issues</th>
            <th class="num">Score</th>
            <th class="num">Grade</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colspan="7" style="padding:32px 8px">
              <strong style="font-size:15.5px">Review history is not connected yet.</strong>
              <p class="text-muted" style="font-size:13px; margin:6px 0 0; max-width:60ch">
                Reviews are currently returned to the browser and not persisted. Phase 5
                adds PostgreSQL storage and the <span class="mono">GET /api/reviews/</span>
                endpoint that fills this table.
              </p>
              <a routerLink="/review" class="btn btn-primary btn-lg" style="margin-top:16px">
                Run a review
              </a>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  `,
})
export class HistoryPageComponent {}
