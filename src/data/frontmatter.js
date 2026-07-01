/**
 * Minimal frontmatter parser for blog post markdown files.
 *
 * Expects a file shaped like:
 *
 *   ---
 *   title: My Post Title
 *   excerpt: A one or two sentence summary.
 *   author: Jane Doe
 *   date: June 20, 2026
 *   readTime: 6 min read
 *   coverImage: https://example.com/image.jpg
 *   ---
 *   # The actual markdown body starts here...
 *
 * Deliberately hand-rolled instead of pulling in a YAML parser: every
 * frontmatter field here is a flat string, so a full YAML parser would
 * be overkill. If post frontmatter ever needs nested data (arrays,
 * objects), swap this out for `gray-matter` or `js-yaml` instead of
 * extending this by hand.
 */
export function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);

  if (!match) {
    // No frontmatter block found — treat the whole file as the body
    // with empty metadata, rather than throwing, so a malformed post
    // doesn't take down the whole build.
    return { data: {}, content: raw.trim() };
  }

  const [, frontmatterBlock, body] = match;
  const data = {};

  frontmatterBlock.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;

    const separatorIndex = trimmed.indexOf(':');
    if (separatorIndex === -1) return;

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    // Strip matching surrounding quotes, e.g. title: "Hello: World"
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    data[key] = value;
  });

  return { data, content: body.trim() };
}
