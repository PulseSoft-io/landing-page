import blogPosts from './blogPosts.js';
import { caseStudyFiles } from './caseStudyFiles.js';

export const POSTS_PER_PAGE = 9;

export const TOTAL_BLOG_PAGES = Math.max(
  1,
  Math.ceil(blogPosts.length / POSTS_PER_PAGE),
);

/**
 * Every URL the prerenderer should generate static HTML for.
 * Kept here (rather than inferred from <Route> elements) so it's
 * trivial to read, audit, and extend as content grows.
 */
export function getAllRoutes() {
  const routes = ['/', '/blog'];

  // Paginated blog index: /blog/page/2, /blog/page/3, ...
  // (page 1 is served at /blog itself, see BlogIndex.jsx)
  for (let page = 2; page <= TOTAL_BLOG_PAGES; page++) {
    routes.push(`/blog/page/${page}`);
  }

  // Individual blog posts: /blog/page/<page>/<id>
  blogPosts.forEach((post, index) => {
    const page = Math.floor(index / POSTS_PER_PAGE) + 1;
    routes.push(`/blog/page/${page}/${post.id}`);
  });

  // Case studies
  Object.keys(caseStudyFiles).forEach(slug => {
    routes.push(`/case-study/${slug}`);
  });

  return routes;
}
