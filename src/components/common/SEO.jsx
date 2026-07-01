import { Helmet } from 'react-helmet-async';

const SITE_NAME = 'PulseSoft';
const SITE_URL = 'https://www.pulsesoft.io'; // TODO: replace with your real production domain
const DEFAULT_DESCRIPTION =
  'PulseSoft helps engineering teams design, build, and operate resilient cloud infrastructure on AWS — landing zones, CI/CD, Kubernetes, and observability.';
const DEFAULT_IMAGE = `${SITE_URL}/og-default.png`; // TODO: add a real default OG image to /public

/**
 * Shared per-route <head> manager.
 *
 * Renders identically on the server (via react-helmet-async's
 * HelmetProvider + helmetContext) and on the client, so each
 * prerendered HTML file gets the correct <title>, meta description,
 * canonical URL, and Open Graph / Twitter tags baked in at build time.
 */
export default function SEO({
  title,
  description = DEFAULT_DESCRIPTION,
  path = '/',
  image = DEFAULT_IMAGE,
  type = 'website',
  noindex = false,
  jsonLd = null,
  publishedTime = null,
  author = null,
}) {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} — Cloud Infrastructure & DevOps`;
  const canonicalUrl = `${SITE_URL}${path === '/' ? '' : path}`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name='description' content={description} />
      <link rel='canonical' href={canonicalUrl} />

      {noindex && <meta name='robots' content='noindex, nofollow' />}

      {/* Open Graph */}
      <meta property='og:type' content={type} />
      <meta property='og:site_name' content={SITE_NAME} />
      <meta property='og:title' content={fullTitle} />
      <meta property='og:description' content={description} />
      <meta property='og:url' content={canonicalUrl} />
      <meta property='og:image' content={image} />
      {publishedTime && (
        <meta property='article:published_time' content={publishedTime} />
      )}
      {author && <meta property='article:author' content={author} />}

      {/* Twitter */}
      <meta name='twitter:card' content='summary_large_image' />
      <meta name='twitter:title' content={fullTitle} />
      <meta name='twitter:description' content={description} />
      <meta name='twitter:image' content={image} />

      {jsonLd && (
        <script type='application/ld+json'>{JSON.stringify(jsonLd)}</script>
      )}
    </Helmet>
  );
}

export { SITE_NAME, SITE_URL, DEFAULT_DESCRIPTION, DEFAULT_IMAGE };
