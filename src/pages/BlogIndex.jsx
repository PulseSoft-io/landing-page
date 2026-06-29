import { useState } from 'react';

import BackToTopButton from '../components/common/BackToTopButton';
import BlogCard from '../components/blog/BlogCard';
import SiteFooter from '../components/layout/SiteFooter';
import SiteHeader from '../components/layout/SiteHeader';
import blogPosts from '../data/blogPosts';
import { useScrollState } from '../hooks/useScrollState';

export default function BlogIndex() {
  const [menuOpen, setMenuOpen] = useState(false);

  const { isScrolled, showTopButton } = useScrollState();

  const [featuredPost, ...posts] = blogPosts;

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

        <main className='pt-12'>
          <div className='mb-16'>
            <span className='text-sm uppercase tracking-[0.3em] text-blue-400'>
              PulseSoft Blog
            </span>

            <h1 className='mt-5 text-5xl font-bold'>
              Cloud Engineering Insights
            </h1>

            <p className='mt-6 max-w-3xl text-lg leading-8 text-zinc-400'>
              Articles covering AWS, cloud architecture, DevOps, distributed
              systems, backend engineering and modern software development.
            </p>
          </div>

          <BlogCard featured post={featuredPost} />

          <section className='mt-16'>
            <h2 className='mb-8 text-3xl font-semibold'>Latest Articles</h2>

            <div className='grid gap-8 md:grid-cols-2'>
              {posts.map(post => (
                <BlogCard key={post.id} post={post} />
              ))}
            </div>
          </section>
        </main>

        <SiteFooter />
      </div>

      <BackToTopButton show={showTopButton} />
    </div>
  );
}
