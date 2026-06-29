import { Routes, Route } from 'react-router-dom';
import ScrollToTop from './components/common/ScrollToTop';
import HomePage from './pages/HomePage';
import CaseStudy from './pages/CaseStudy';
import BlogIndex from './pages/BlogIndex';
import BlogPost from './pages/BlogPost';
import NotFound from './pages/NotFound';

function App() {
  return (
    <>
      <ScrollToTop />

      <Routes>
        <Route path='/' element={<HomePage />} />

        <Route path='/case-study/:slug' element={<CaseStudy />} />

        <Route path='/blog' element={<BlogIndex />} />

        <Route path='/blog/page/:page' element={<BlogIndex />} />

        <Route path='/blog/page/:page/:id' element={<BlogPost />} />

        {/* Always last */}
        <Route path='*' element={<NotFound />} />
      </Routes>
    </>
  );
}

export default App;
