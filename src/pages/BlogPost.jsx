import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';

import BackToTopButton from '../components/common/BackToTopButton';
import SEO, { SITE_URL } from '../components/common/SEO';
import SiteFooter from '../components/layout/SiteFooter';
import SiteHeader from '../components/layout/SiteHeader';
import blogPosts, { stripLeadingH1 } from '../data/blogPosts';
import { useScrollState } from '../hooks/useScrollState';

export default function BlogPost() {
  const [menuOpen, setMenuOpen] = useState(false);

  const { isScrolled, showTopButton } = useScrollState();

  const { id, page } = useParams();

  const post = blogPosts.find(p => p.id === id);

  if (!post) {
    return (
      <div className='relative min-h-screen overflow-hidden bg-black text-zinc-100'>
        <SEO
          title='Post Not Found'
          description="The article you're looking for doesn't exist."
          path={`/blog/page/${page || 1}/${id}`}
          noindex
        />

        <div className='glow glow-cyan' />
        <div className='glow glow-violet' />

        <div className='mx-auto max-w-6xl px-6 py-24 lg:px-8'>
          <SiteHeader
            isScrolled={isScrolled}
            menuOpen={menuOpen}
            onToggleMenu={() => setMenuOpen(prev => !prev)}
            onCloseMenu={() => setMenuOpen(false)}
          />

          <main className='flex min-h-[60vh] items-center justify-center'>
            <div className='text-center'>
              <h1 className='mb-5 text-5xl font-bold'>Post not found</h1>

              <p className='mb-8 text-zinc-400'>
                The article you're looking for doesn't exist.
              </p>

              <Link
                to={`/blog/page/${page || 1}`}
                className='rounded-lg border border-zinc-700 px-6 py-3 transition hover:border-blue-400 hover:text-blue-300'
              >
                ← Back to Blog
              </Link>
            </div>
          </main>

          <SiteFooter />
        </div>

        <BackToTopButton show={showTopButton} />
      </div>
    );
  }

  const bodyContent = stripLeadingH1(post.content);

  const postPath = `/blog/page/${page || 1}/${post.id}`;
  const isoDate = new Date(post.date).toISOString();

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    image: post.coverImage,
    datePublished: isoDate,
    author: {
      '@type': 'Person',
      name: post.author,
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${SITE_URL}${postPath}`,
    },
  };

  return (
    <div className='relative min-h-screen overflow-hidden bg-black text-zinc-100'>
      <SEO
        title={post.title}
        description={post.excerpt}
        path={postPath}
        image={post.coverImage}
        type='article'
        publishedTime={isoDate}
        author={post.author}
        jsonLd={articleJsonLd}
      />

      <div className='glow glow-cyan' />
      <div className='glow glow-violet' />
      <div className='pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_45%)]' />

      <div className='mx-auto max-w-6xl px-6 py-24 lg:px-8'>
        <SiteHeader
          isScrolled={isScrolled}
          menuOpen={menuOpen}
          onToggleMenu={() => setMenuOpen(prev => !prev)}
          onCloseMenu={() => setMenuOpen(false)}
        />

        <main className='pt-10'>
          {/* <img
            src={post.coverImage}
            alt={post.title}
            className='mb-10 h-[450px] w-full rounded-2xl object-cover'
          /> */}

          <div className='mx-auto max-w-3xl'>
            <h1 className='text-5xl font-bold leading-tight'>{post.title}</h1>

            <div className='mt-5 text-zinc-500'>
              {post.author} · {post.date} · {post.readTime}
            </div>

            <hr className='my-10 border-zinc-800' />

            <article className='prose prose-invert prose-lg max-w-none prose-headings:font-bold prose-a:text-blue-400'>
              <ReactMarkdown>{bodyContent}</ReactMarkdown>
            </article>

            <Link
              to={`/blog/page/${page || 1}`}
              className='mt-8 inline-flex rounded-lg border border-zinc-700 px-6 py-3 transition hover:border-blue-400 hover:text-blue-300'
            >
              ← Back to Blog
            </Link>
          </div>
        </main>

        <SiteFooter />
      </div>

      <BackToTopButton show={showTopButton} />
    </div>
  );
}
