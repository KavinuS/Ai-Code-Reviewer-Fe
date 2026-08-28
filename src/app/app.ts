import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { BackendStatusComponent } from './shared/components/backend-status/backend-status.component';

/**
 * Root shell: the persistent nav from the design, the routed view, and the
 * standing disclaimer in the footer.
 *
 * The design drives tab state from component state; here the router owns it,
 * so `routerLinkActive` supplies the accent underline and the browser keeps
 * real URLs, history and deep links.
 */
@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, BackendStatusComponent],
  templateUrl: './app.html',
})
export class App {}
