import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import BackToTopButton from '../components/common/BackToTopButton';
import SiteFooter from '../components/layout/SiteFooter';
import SiteHeader from '../components/layout/SiteHeader';
import blogPosts from '../data/blogPosts';
import { useScrollState } from '../hooks/useScrollState';

export default function BlogPost() {
  const [menuOpen, setMenuOpen] = useState(false);

  const { isScrolled, showTopButton } = useScrollState();

  const { id } = useParams();

  const post = blogPosts.find(p => p.id === id);

  if (!post) {
    return (
      <div className='relative min-h-screen overflow-hidden bg-black text-zinc-100'>
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
                to='/blog'
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

  const paragraphs = post.content.split('\n').filter(p => p.trim() !== '');

  return (
    <div className='relative min-h-screen overflow-hidden bg-black text-zinc-100'>
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
          <img
            src={post.coverImage}
            alt={post.title}
            className='mb-10 h-[450px] w-full rounded-2xl object-cover'
          />

          <div className='mx-auto max-w-3xl'>
            <h1 className='text-5xl font-bold leading-tight'>{post.title}</h1>

            <div className='mt-5 text-zinc-500'>
              {post.author} · {post.date} · {post.readTime}
            </div>

            <hr className='my-10 border-zinc-800' />

            <article>
              {paragraphs.map((paragraph, index) => (
                <p key={index} className='mb-8 text-lg leading-9 text-zinc-300'>
                  {paragraph}
                </p>
              ))}
            </article>

            <Link
              to='/blog'
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
