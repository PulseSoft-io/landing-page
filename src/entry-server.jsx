import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import App from './App.jsx';
import { getAllRoutes } from './data/routeManifest.js';

/**
 * Renders the app for a given URL on the server (or, here, inside the
 * Node prerender script). Returns both the rendered HTML and the Helmet
 * data collected during that render, so the prerender script can inject
 * the correct <title>/<meta>/<link> tags into the static HTML file's
 * <head> for that specific route.
 */
export function render(url) {
  const helmetContext = {};

  const html = renderToString(
    <StrictMode>
      <HelmetProvider context={helmetContext}>
        <StaticRouter location={url}>
          <App />
        </StaticRouter>
      </HelmetProvider>
    </StrictMode>,
  );

  return { html, helmet: helmetContext.helmet };
}

// Re-exported so the prerender script (which runs under plain Node, not
// Vite) can get the route list from this already-bundled SSR entry
// instead of re-importing raw src/ files that use Vite-only import
// syntax (e.g. `?raw` markdown imports), which plain Node can't resolve.
export { getAllRoutes };
