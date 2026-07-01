import { parseFrontmatter } from './frontmatter';

/**
 * Auto-discovers every markdown file in src/blog/ at build time.
 *
 * To add a new blog post: drop a new .md file into src/blog/ with a
 * frontmatter block (title, excerpt, author, date, readTime,
 * coverImage) followed by the article body in markdown. That's it --
 * no need to touch this file, App.jsx, or any route config. The next
 * `npm run dev` or `npm run build` picks it up automatically.
 *
 * `eager: true` means these are bundled in directly (not lazy-loaded
 * via dynamic import), which keeps this synchronous -- important
 * because the prerender script and route manifest need the full post
 * list available immediately at build time, not after an async fetch.
 */
const postModules = import.meta.glob('../blog/*.md', {
  eager: true,
  query: '?raw',
  import: 'default',
});

function slugFromPath(filePath) {
  // '../blog/why-cloud-projects-fail.md' -> 'why-cloud-projects-fail'
  const fileName = filePath.split('/').pop();
  return fileName.replace(/\.md$/, '');
}

function parsePostDate(dateString) {
  // Falls back to the epoch if a date doesn't parse, so malformed
  // dates sort last instead of crashing the build.
  return Date.parse(dateString) || 0;
}

const blogPosts = Object.entries(postModules)
  // Newest first, so new posts you add automatically show up at the
  // top of the blog index without manual reordering.
  .sort(
    ([, rawA], [, rawB]) =>
      parsePostDate(parseFrontmatter(rawB).data.date) -
      parsePostDate(parseFrontmatter(rawA).data.date),
  )
  .map(([filePath, raw]) => {
    const { data, content } = parseFrontmatter(raw);
    const slug = data.slug || slugFromPath(filePath);

    return {
      id: slug,
      title: data.title || slug,
      excerpt: data.excerpt || '',
      content,
      author: data.author || 'PulseSoft Team',
      date: data.date || '',
      readTime: data.readTime || '',
      coverImage: data.coverImage || '',
    };
  })
  // Hide posts scheduled for a future date. Since the site is
  // statically prerendered at build time, this comparison runs once
  // during `npm run build` on Netlify -- a post dated tomorrow won't
  // appear until the next build after that date passes.
  .filter(post => parsePostDate(post.date) <= Date.now());

/**
 * Strips a single leading H1 ("# Title") from markdown content.
 *
 * Blog post pages render the title in their own styled header above
 * the article body (separate from the markdown itself), so if the
 * markdown body also starts with an H1 matching the title, it would
 * render twice. This only strips a *leading* H1 -- any other heading
 * in the body, including a second H1 further down, is left alone.
 */
export function stripLeadingH1(content) {
  return content.replace(/^#\s+.+\r?\n+/, '');
}

export default blogPosts;
