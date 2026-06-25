import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { caseStudyFiles } from '../data/caseStudyFiles';

function ImageLightbox({ src, alt, ...rest }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    const onKey = e => {
      if (e.key === 'Escape') setOpen(false);
    };

    window.addEventListener('keydown', onKey);

    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';

    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <>
      <img
        src={src}
        alt={alt}
        {...rest}
        onClick={() => setOpen(true)}
        style={{
          cursor: 'zoom-in',
          maxWidth: '100%',
          display: 'block',
          borderRadius: '6px',
        }}
      />

      {open && (
        <div
          role='dialog'
          aria-modal='true'
          aria-label={alt ? `Enlarged: ${alt}` : 'Enlarged diagram'}
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0, 0, 0, 0.88)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            cursor: 'zoom-out',
          }}
        >
          <img
            src={src}
            alt={alt}
            onClick={e => e.stopPropagation()}
            style={{
              maxWidth: '90vw',
              maxHeight: '90vh',
              objectFit: 'contain',
              borderRadius: '8px',
              boxShadow: '0 24px 64px rgba(0, 0, 0, 0.6)',
              cursor: 'default',
            }}
          />

          <button
            onClick={() => setOpen(false)}
            aria-label='Close enlarged image'
            style={{
              position: 'absolute',
              top: '1rem',
              right: '1rem',
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              border: 'none',
              background: 'rgba(255, 255, 255, 0.15)',
              color: '#fff',
              fontSize: '18px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
}

export default function CaseStudy() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const markdown = caseStudyFiles[slug];

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  if (!markdown) {
    return (
      <div className='min-h-screen bg-black text-white p-20'>
        <h1>Case Study Not Found</h1>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-black text-zinc-100'>
      <div className='sticky top-0 z-50 border-b border-zinc-800 bg-black/80 backdrop-blur'>
        <div className='mx-auto max-w-4xl px-8 py-4'>
          <button
            onClick={handleBack}
            className='text-sm text-zinc-400 transition-colors hover:text-white'
          >
            ← Back
          </button>
        </div>
      </div>

      <div className='mx-auto max-w-4xl px-8 py-20'>
        <article className='prose prose-invert max-w-none'>
          <ReactMarkdown
            components={{
              // eslint-disable-next-line no-unused-vars
              img: ({ node: _node, ...props }) => <ImageLightbox {...props} />,
            }}
          >
            {markdown}
          </ReactMarkdown>
        </article>
      </div>
    </div>
  );
}
