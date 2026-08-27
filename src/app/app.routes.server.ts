import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * Server rendering strategy per route.
 *
 * The home page is prerendered at build time: its content is static marketing
 * copy, so it can be served as a finished HTML file and hydrate afterwards.
 *
 * Everything else renders on the client. Those routes depend on the Django API
 * and on user input, so there is nothing meaningful to render on the server -
 * and attempting it would mean the Node process needs network access to the API
 * just to serve a page shell.
 */
export const serverRoutes: ServerRoute[] = [
  {
    path: '',
    renderMode: RenderMode.Prerender,
  },
  {
    path: '**',
    renderMode: RenderMode.Client,
  },
];
