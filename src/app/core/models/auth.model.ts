/**
 * Request and response contracts for the auth API.
 * Mirrors backend/accounts/serializers.py.
 *
 * The token pair is deliberately not modelled as "a session object with an
 * expiry the client checks". The access token's real expiry is inside the JWT,
 * and the client is not the authority on it - the server is. The frontend
 * therefore treats a 401 as the signal to refresh rather than trying to predict
 * one, which is also what makes a clock skew between browser and server
 * harmless.
 */

/** Matches `OAuthIdentity.Provider` on the backend. */
export type OAuthProviderKey = 'github' | 'google';

export interface OAuthProviderInfo {
  readonly key: OAuthProviderKey;
  /** "GitHub", "Google" - supplied by the backend so labels cannot drift. */
  readonly label: string;
}

export interface ConnectedIdentity {
  readonly provider: OAuthProviderKey;
  readonly label: string;
  readonly email: string;
  readonly connectedAt: string;
  readonly lastLoginAt: string | null;
}

export interface AuthUser {
  readonly id: number;
  readonly username: string;
  readonly email: string;
  readonly displayName: string;
  readonly avatarUrl: string;
  readonly dateJoined: string;
  /**
   * False for an account created through a provider. The UI branches on it:
   * such an account is offered "set a password", not "change password", and
   * cannot disconnect its only provider.
   */
  readonly hasUsablePassword: boolean;
  readonly identities: readonly ConnectedIdentity[];
}

/** The body every successful sign-in returns: register, login and OAuth alike. */
export interface AuthSession {
  readonly user: AuthUser;
  readonly access: string;
  readonly refresh: string;
}

export interface TokenPair {
  readonly access: string;
  readonly refresh: string;
}

export interface LoginRequest {
  readonly username: string;
  readonly password: string;
}

export interface RegisterRequest {
  readonly username: string;
  readonly email: string;
  readonly password: string;
  readonly passwordConfirm: string;
}

export interface ChangePasswordRequest {
  readonly currentPassword?: string;
  readonly newPassword: string;
}

/** The JSON `GET /api/auth/oauth/<provider>/authorize/` answers with. */
export interface OAuthAuthorization {
  readonly authorizationUrl: string;
  /**
   * Echoed back on the callback. The frontend keeps it and compares, which is
   * what ties the returning redirect to the browser that started the sign-in.
   */
  readonly state: string;
  readonly mode: 'signin' | 'connect';
}

/** The parsed URL fragment the backend redirects to `/auth/callback` with. */
export interface OAuthCallbackParams {
  readonly state: string;
  readonly ticket?: string;
  readonly error?: string;
  readonly next?: string;
}
