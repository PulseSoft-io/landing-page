/**
 * Pulls a usable title + description out of a raw markdown string,
 * so case-study SEO tags stay correct without duplicating content
 * by hand. Looks for the first `# Heading` for the title, and the
 * first non-empty, non-heading, non-bold-metadata line for the
 * description.
 */
export function extractMarkdownMeta(markdown, fallbackTitle = 'Case Study') {
  if (!markdown) {
    return { title: fallbackTitle, description: '' };
  }

  const lines = markdown.split('\n').map(line => line.trim());

  const headingLine = lines.find(line => line.startsWith('# '));
  const title = headingLine ? headingLine.replace(/^#\s+/, '') : fallbackTitle;

  const descriptionLine = lines.find(
    line =>
      line &&
      !line.startsWith('#') &&
      !line.startsWith('**') &&
      !line.startsWith('!') &&
      !line.startsWith('[') &&
      !/^-{3,}$/.test(line),
  );

  let description = descriptionLine || '';
  // Strip basic markdown emphasis/links for a clean meta description.
  description = description
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1');

  if (description.length > 160) {
    description = `${description.slice(0, 157).trimEnd()}...`;
  }

  return { title, description };
}
