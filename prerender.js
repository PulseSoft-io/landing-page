// prerender.js
//
// Build-time static site generation for the Vite + React app.
//
// Usage (wired into package.json's "build" script):
//   1. `vite build`                -> builds the client bundle to dist/
//   2. `vite build --ssr src/entry-server.jsx` -> builds a Node-runnable
//      SSR bundle to dist-ssr/entry-server.js
//   3. `node prerender.js`         -> this script. Loads the SSR bundle,
//      renders every route in the route manifest, and writes a static
//      <route>/index.html file into dist/ for each one — using the
//      per-route <head> tags collected by react-helmet-async.
//
// The result is a fully static dist/ folder: every route has real HTML
// and the correct per-route meta tags already in the markup, so it can
// be deployed to any static host or CDN with no Node server required.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, 'dist');

async function run() {
  const templatePath = path.resolve(distDir, 'index.html');

  if (!fs.existsSync(templatePath)) {
    console.error(
      '[prerender] dist/index.html not found. Run `vite build` before prerendering.',
    );
    process.exit(1);
  }

  const template = fs.readFileSync(templatePath, 'utf-8');

  const ssrEntryPath = path.resolve(__dirname, 'dist-ssr/entry-server.js');

  if (!fs.existsSync(ssrEntryPath)) {
    console.error(
      '[prerender] dist-ssr/entry-server.js not found. Run `vite build --ssr src/entry-server.jsx` first.',
    );
    process.exit(1);
  }

  const { render, getAllRoutes } = await import(ssrEntryPath);

  const routes = getAllRoutes();

  console.log(`[prerender] Generating ${routes.length} static route(s)...`);

  function buildPage(url) {
    const { html: appHtml, helmet } = render(url);

    const headTags = helmet
      ? [
          helmet.title.toString(),
          helmet.meta.toString(),
          helmet.link.toString(),
          helmet.script.toString(),
        ]
          .filter(Boolean)
          .join('\n    ')
      : '';

    return template
      .replace(/<title>[^<]*<\/title><!--app-head-->/, headTags) // production: replace dev placeholder + marker with real tags
      .replace('<!--app-head-->', headTags) // fallback, in case the placeholder was already removed
      .replace('<!--app-html-->', appHtml);
  }

  for (const url of routes) {
    const page = buildPage(url);

    const outputPath = routeToOutputPath(url);
    const outputDir = path.dirname(outputPath);

    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(outputPath, page);

    console.log(`[prerender]   ${url.padEnd(40)} -> ${path.relative(distDir, outputPath)}`);
  }

  // Also write the 404 page content as 404.html, which most static
  // hosts (Netlify, GitHub Pages, S3+CloudFront with a custom error
  // response, etc.) will serve automatically for unmatched routes.
  const notFoundPage = buildPage('/__not_found_marker__');
  fs.writeFileSync(path.resolve(distDir, '404.html'), notFoundPage);
  console.log('[prerender]   (404 fallback)                          -> dist/404.html');

  // Clean up the SSR-only build artifacts; they're not needed in the
  // static output that gets deployed.
  fs.rmSync(path.resolve(__dirname, 'dist-ssr'), {
    recursive: true,
    force: true,
  });

  console.log('[prerender] Done.');
}

function routeToOutputPath(url) {
  if (url === '/') {
    return path.resolve(distDir, 'index.html');
  }

  // "/blog/page/2" -> dist/blog/page/2/index.html
  // This mirrors how static hosts resolve clean URLs: a request for
  // /blog/page/2 (no trailing slash) typically maps to that folder's
  // index.html automatically.
  const cleanUrl = url.replace(/\/$/, '');

  return path.resolve(distDir, `.${cleanUrl}/index.html`);
}

run().catch(err => {
  console.error('[prerender] Failed:', err);
  process.exit(1);
});
