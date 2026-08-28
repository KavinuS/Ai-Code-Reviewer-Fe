/**
 * Where the token pair lives between page loads.
 *
 * `localStorage`, and the trade-off is worth stating plainly: it survives a
 * reload and a new tab, which is what "stay signed in" means, but it is
 * readable by any script running on the page. An httpOnly cookie would not be,
 * and would be the better answer if the API were same-origin - it is not in
 * development, and a cross-origin cookie session needs credentialed CORS plus
 * CSRF protection on every write, which is a larger surface than the one it
 * closes. The mitigation that actually matters is the one already in place:
 * no user-supplied content is ever rendered as HTML, so there is no script to
 * do the reading.
 *
 * Every access is wrapped, because `localStorage` does not merely return null
 * when it is unavailable - it throws. Private browsing modes, "block site
 * data" settings and server-side rendering all reach this code, and none of
 * them should be able to break sign-in for everybody else.
 */
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

import { TokenPair } from '../models/auth.model';

const ACCESS_KEY = 'acra.auth.access';
const REFRESH_KEY = 'acra.auth.refresh';
/** Namespaced the same way, but session-scoped: it is per sign-in attempt. */
const OAUTH_STATE_KEY = 'acra.auth.oauthState';

@Injectable({ providedIn: 'root' })
export class TokenStorageService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  /**
   * Mirrors what is in storage.
   *
   * Reads go through here rather than to `localStorage` on every request: the
   * HTTP interceptor asks for the access token on each call, and touching a
   * synchronous, disk-backed API that often is wasteful. The copy is only ever
   * written alongside the real store, so the two cannot diverge.
   */
  private cache: { access: string | null; refresh: string | null } | null = null;

  get access(): string | null {
    return this.read().access;
  }

  get refresh(): string | null {
    return this.read().refresh;
  }

  get hasSession(): boolean {
    return this.read().refresh !== null;
  }

  save(tokens: TokenPair): void {
    this.cache = { access: tokens.access, refresh: tokens.refresh };
    this.write(ACCESS_KEY, tokens.access);
    this.write(REFRESH_KEY, tokens.refresh);
  }

  /** Replace only the access token, after a refresh that did not rotate. */
  saveAccess(access: string): void {
    this.cache = { access, refresh: this.read().refresh };
    this.write(ACCESS_KEY, access);
  }

  clear(): void {
    this.cache = { access: null, refresh: null };
    this.remove(ACCESS_KEY);
    this.remove(REFRESH_KEY);
  }

  // -- OAuth state ---------------------------------------------------------
  // Kept in sessionStorage, not localStorage: it is meaningful for the length
  // of one sign-in attempt in one tab, and leaving it behind afterwards would
  // let a stale value satisfy a later comparison.

  saveOAuthState(state: string): void {
    this.writeSession(OAUTH_STATE_KEY, state);
  }

  /** Read the pending state and remove it, so it can satisfy exactly one callback. */
  takeOAuthState(): string | null {
    const value = this.readSession(OAUTH_STATE_KEY);
    this.removeSession(OAUTH_STATE_KEY);
    return value;
  }

  // -- storage plumbing ----------------------------------------------------

  private read(): { access: string | null; refresh: string | null } {
    if (this.cache === null) {
      this.cache = {
        access: this.readLocal(ACCESS_KEY),
        refresh: this.readLocal(REFRESH_KEY),
      };
    }
    return this.cache;
  }

  private readLocal(key: string): string | null {
    if (!this.isBrowser) {
      return null;
    }
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  private write(key: string, value: string): void {
    if (!this.isBrowser) {
      return;
    }
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Storage full or blocked. The in-memory copy still carries the session
      // for this page, so the user is signed in until they reload.
    }
  }

  private remove(key: string): void {
    if (!this.isBrowser) {
      return;
    }
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Nothing useful to do: the caller is signing out either way.
    }
  }

  private readSession(key: string): string | null {
    if (!this.isBrowser) {
      return null;
    }
    try {
      return window.sessionStorage.getItem(key);
    } catch {
      return null;
    }
  }

  private writeSession(key: string, value: string): void {
    if (!this.isBrowser) {
      return;
    }
    try {
      window.sessionStorage.setItem(key, value);
    } catch {
      // The callback comparison will fail closed, which is the safe direction.
    }
  }

  private removeSession(key: string): void {
    if (!this.isBrowser) {
      return;
    }
    try {
      window.sessionStorage.removeItem(key);
    } catch {
      // Ignored for the same reason as `remove`.
    }
  }
}
