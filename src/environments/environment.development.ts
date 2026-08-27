/**
 * Development environment values, swapped in by the `fileReplacements` entry in
 * angular.json. The Angular dev server (4200) and Django (8000) are different
 * origins, so the API URL must be absolute and Django must allow the origin
 * via CORS_ALLOWED_ORIGINS.
 */
export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:8000/api',
};
