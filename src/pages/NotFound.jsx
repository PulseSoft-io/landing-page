import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className='flex min-h-screen items-center justify-center bg-black px-6 text-white'>
      <div className='max-w-lg text-center'>
        <h1 className='mb-4 text-7xl font-bold'>404</h1>

        <h2 className='mb-4 text-3xl font-semibold'>Page Not Found</h2>

        <p className='mb-8 text-zinc-400'>
          The page you're looking for doesn't exist or may have been moved.
        </p>

        <Link
          to='/'
          className='rounded-lg border border-zinc-700 px-6 py-3 transition hover:border-blue-400 hover:text-blue-300'
        >
          Return Home
        </Link>
      </div>
    </div>
  );
}
