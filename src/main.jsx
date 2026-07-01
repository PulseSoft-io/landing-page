import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import './index.css';
import App from './App.jsx';

const rootElement = document.getElementById('root');

const app = (
  <StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </HelmetProvider>
  </StrictMode>
);

// If the server/prerenderer already rendered markup into #root, hydrate it
// instead of re-rendering from scratch. The prerender script sets
// data-ssr="true" on the root element of every static HTML file it writes.
if (rootElement.hasChildNodes() && rootElement.dataset.ssr === 'true') {
  hydrateRoot(rootElement, app);
} else {
  createRoot(rootElement).render(app);
}
