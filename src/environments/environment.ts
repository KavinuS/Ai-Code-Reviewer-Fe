/**
 * Production environment values.
 *
 * `apiBaseUrl` is a same-origin relative path: in production a reverse proxy
 * serves the Angular bundle and forwards /api/* to Django, which removes the
 * cross-origin request entirely.
 */
export const environment = {
  production: true,
  apiBaseUrl: '/api',
};
