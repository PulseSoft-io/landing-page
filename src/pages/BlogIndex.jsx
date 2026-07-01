import { useState } from 'react';

import BackToTopButton from '../components/common/BackToTopButton';
import BlogCard from '../components/blog/BlogCard';
import SEO from '../components/common/SEO';
import SiteFooter from '../components/layout/SiteFooter';
import SiteHeader from '../components/layout/SiteHeader';
import blogPosts from '../data/blogPosts';
import { POSTS_PER_PAGE } from '../data/routeManifest';
import { useScrollState } from '../hooks/useScrollState';
import { useParams, Link } from 'react-router-dom';
import { Navigate } from 'react-router-dom';

export default function BlogIndex() {
  const [menuOpen, setMenuOpen] = useState(false);

  const { isScrolled, showTopButton } = useScrollState();

  const { page } = useParams();

  const currentPage = Number(page) || 1;

  const totalPages = Math.ceil(blogPosts.length / POSTS_PER_PAGE);

  const startIndex = (currentPage - 1) * POSTS_PER_PAGE;

  const paginatedPosts = blogPosts.slice(
    startIndex,
    startIndex + POSTS_PER_PAGE,
  );

  const featuredPost = currentPage === 1 ? paginatedPosts[0] : null;

  const posts = currentPage === 1 ? paginatedPosts.slice(1) : paginatedPosts;
  if (currentPage > totalPages) {
    return <Navigate to={`/blog/page/${totalPages}`} replace />;
  }

  if (currentPage < 1) {
    return <Navigate to='/blog' replace />;
  }

  return (
    <div className='relative min-h-screen overflow-hidden bg-black text-zinc-100'>
      <SEO
        title={currentPage === 1 ? 'Blog' : `Blog — Page ${currentPage}`}
        description='Articles covering AWS, cloud architecture, DevOps, distributed systems, backend engineering and modern software development.'
        path={currentPage === 1 ? '/blog' : `/blog/page/${currentPage}`}
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

          {featuredPost && (
            <BlogCard featured post={featuredPost} currentPage={currentPage} />
          )}

          <section className='mt-16'>
            <h2 className='mb-8 text-3xl font-semibold'>Latest Articles</h2>

            <div className='grid gap-8 md:grid-cols-2'>
              {posts.map(post => (
                <BlogCard key={post.id} post={post} currentPage={currentPage} />
              ))}
            </div>

            <div className='mt-16 flex justify-center gap-3'>
              {Array.from({ length: totalPages }, (_, i) => (
                <Link
                  key={i}
                  to={i === 0 ? '/blog' : `/blog/page/${i + 1}`}
                  className={`rounded-lg border px-4 py-2 transition ${
                    currentPage === i + 1
                      ? 'border-blue-500 bg-blue-500 text-white'
                      : 'border-zinc-700 hover:border-blue-400'
                  }`}
                >
                  {i + 1}
                </Link>
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
