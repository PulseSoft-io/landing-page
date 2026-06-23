import { useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { caseStudyFiles } from '../data/caseStudyFiles';

export default function CaseStudy() {
  const { slug } = useParams();

  const markdown = caseStudyFiles[slug];

  if (!markdown) {
    return (
      <div className='min-h-screen bg-black text-white p-20'>
        <h1>Case Study Not Found</h1>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-black text-zinc-100'>
      <div className='mx-auto max-w-4xl px-8 py-20'>
        <article className='prose prose-invert max-w-none'>
          <ReactMarkdown>{markdown}</ReactMarkdown>
        </article>
      </div>
    </div>
  );
}
