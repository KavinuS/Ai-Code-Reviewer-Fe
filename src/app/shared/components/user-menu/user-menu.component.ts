/**
 * The nav's identity slot: who is signed in, or a way to sign in.
 *
 * Sits beside the backend indicator, which is where the design puts a user
 * identity. It renders nothing at all while the session is still 'unknown' -
 * on a page refresh the stored token has not been checked yet, and flashing
 * "Sign in" at somebody who is signed in is worse than a moment of empty space.
 *
 * A details/summary element carries the menu rather than a click-outside
 * handler on the document: the browser already handles opening, closing,
 * Escape and focus for it, and none of that behaviour has to be reimplemented
 * or kept accessible by hand.
 */
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnInit,
  inject,
  viewChild,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { ApiClientService } from '../../../core/api/api-client.service';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-user-menu',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    @if (status() === 'authenticated' && user(); as account) {
      <details #menu style="position:relative">
        <summary
          class="btn btn-secondary"
          style="list-style:none; cursor:pointer; display:inline-flex; gap:8px; align-items:center"
        >
          @if (account.avatarUrl) {
            <img
              [src]="account.avatarUrl"
              alt=""
              width="18"
              height="18"
              style="width:18px; height:18px; object-fit:cover"
            />
          }
          {{ account.username }}
        </summary>

        <div
          style="position:absolute; right:0; top:calc(100% + 6px); z-index:20; min-width:200px; background:var(--color-surface); border:1px solid var(--color-divider); box-shadow:var(--shadow-md); padding:6px"
        >
          <p class="text-muted mono" style="font-size:11.5px; margin:6px 8px 8px; overflow-wrap:anywhere">
            {{ account.email }}
          </p>
          <a
            routerLink="/account"
            class="btn btn-secondary"
            style="width:100%; justify-content:flex-start; border:0"
            (click)="close()"
          >
            Account settings
          </a>
          <button
            type="button"
            class="btn btn-secondary"
            style="width:100%; justify-content:flex-start; border:0"
            (click)="signOut()"
          >
            Sign out
          </button>
        </div>
      </details>
    } @else if (status() === 'anonymous') {
      <a routerLink="/login" class="btn btn-secondary">Sign in</a>
    }
  `,
})
export class UserMenuComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly api = inject(ApiClientService);
  private readonly router = inject(Router);

  private readonly menu = viewChild<ElementRef<HTMLDetailsElement>>('menu');

  protected readonly user = this.auth.user;
  protected readonly status = this.auth.status;

  ngOnInit(): void {
    // The nav is on every route, so this is where a stored session gets
    // checked on first paint. `restore()` is memoised and does nothing when
    // there is no stored token, so a route guard asking the same question a
    // moment later does not cause a second request.
    if (!this.api.isBrowser) {
      return;
    }
    this.auth.restore().subscribe();
  }

  protected close(): void {
    const element = this.menu()?.nativeElement;
    if (element) {
      element.open = false;
    }
  }

  protected signOut(): void {
    this.close();
    // Navigate immediately: `logout` clears the local session before it calls
    // the server, so there is nothing to wait for and no reason to leave a
    // signed-out user looking at a page that needs an account.
    this.auth.logout().subscribe();
    void this.router.navigate(['/']);
  }
}
