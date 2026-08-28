/**
 * The nav's backend-connection indicator.
 *
 * The design puts a "Backend connected" chip and a user identity in the top
 * right. The identity is `UserMenuComponent`; this half reports the connection
 * and the marking scheme version the API is serving, which is the one piece of
 * backend state that changes what a score means.
 *
 * Lifted out of the home page so the indicator is present on every route, as
 * the design intends. Each state carries a text label, so the dot's colour is
 * reinforcement rather than the only signal.
 */
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';

import { ApiClientService } from '../../../core/api/api-client.service';
import { HealthResponse } from '../../../core/models/health.model';
import { HealthService } from '../../../core/services/health.service';

type ConnectionState = 'idle' | 'checking' | 'online' | 'degraded' | 'offline';

@Component({
  selector: 'app-backend-status',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap">
      <span class="tag" [class]="tagClass()" style="display:inline-flex; gap:6px; align-items:center" role="status">
        <span aria-hidden="true" [style.background]="dotColour()" style="width:6px; height:6px; display:inline-block"></span>
        {{ label() }}
      </span>

      @if (health(); as status) {
        <span class="mono text-muted" style="font-size:12px">
          scheme {{ status.markingSchemeVersion }} &middot; {{ status.environment }}
        </span>
      }
    </div>
  `,
})
export class BackendStatusComponent implements OnInit {
  private readonly healthService = inject(HealthService);
  private readonly api = inject(ApiClientService);

  readonly state = signal<ConnectionState>('idle');
  readonly health = signal<HealthResponse | null>(null);

  protected readonly label = computed(() => {
    switch (this.state()) {
      case 'checking':
        return 'Checking backend';
      case 'online':
        return 'Backend connected';
      case 'degraded':
        return 'Backend degraded';
      case 'offline':
        return 'Backend unreachable';
      default:
        return 'Backend';
    }
  });

  protected readonly tagClass = computed(() =>
    this.state() === 'offline' ? 'tag-accent' : 'tag-neutral',
  );

  protected readonly dotColour = computed(() => {
    switch (this.state()) {
      case 'online':
        return 'var(--color-good)';
      case 'degraded':
        return 'var(--color-medium)';
      case 'offline':
        return 'var(--color-accent)';
      default:
        return 'var(--color-neutral-500)';
    }
  });

  ngOnInit(): void {
    // Skipped during server-side rendering; runs once the page hydrates.
    if (!this.api.isBrowser) {
      return;
    }
    this.check();
  }

  check(): void {
    this.state.set('checking');
    this.healthService.check().subscribe({
      next: (response) => {
        this.health.set(response);
        this.state.set(response.status === 'ok' ? 'online' : 'degraded');
      },
      error: () => {
        this.health.set(null);
        this.state.set('offline');
      },
    });
  }
}
