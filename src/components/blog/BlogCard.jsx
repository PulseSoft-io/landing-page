import { Link } from 'react-router-dom';

export default function BlogCard({ post, featured = false, currentPage }) {
  if (featured) {
    return (
      <Link
        to={`/blog/page/${currentPage}/${post.id}`}
        className='group mb-12 block overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 transition duration-300 hover:-translate-y-1 hover:border-blue-500/40 hover:shadow-2xl'
      >
        <div className='grid md:grid-cols-2'>
          {/* <div className='overflow-hidden'>
            <img
              src={post.coverImage}
              alt={post.title}
              className='h-full w-full object-cover transition duration-500 group-hover:scale-105'
            />
          </div> */}

          <div className='flex flex-col justify-center p-8'>
            <span className='mb-3 text-sm uppercase tracking-widest text-blue-400'>
              Featured
            </span>

            <h2 className='mb-4 text-4xl font-bold text-white'>{post.title}</h2>

            <p className='mb-6 text-zinc-300 leading-7'>{post.excerpt}</p>

            <div className='text-sm text-zinc-500'>
              {post.author} · {post.date} · {post.readTime}
            </div>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      to={`/blog/page/${currentPage}/${post.id}`}
      className='group overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 transition duration-300 hover:-translate-y-1 hover:border-blue-500/40 hover:shadow-xl'
    >
      {/* <div className='overflow-hidden'>
        <img
          src={post.coverImage}
          alt={post.title}
          className='h-56 w-full object-cover transition duration-500 group-hover:scale-105'
        />
      </div> */}

      <div className='p-6'>
        <h3 className='mb-3 text-2xl font-semibold text-white transition group-hover:text-blue-300'>
          {post.title}
        </h3>

        <p className='mb-5 leading-7 text-zinc-300'>{post.excerpt}</p>

        <div className='text-sm text-zinc-500'>
          {post.author} · {post.date} · {post.readTime}
        </div>
      </div>
    </Link>
  );
}
