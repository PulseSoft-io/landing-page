import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import CaseStudy from './pages/CaseStudy';

function App() {
  return (
    <Routes>
      <Route path='/' element={<HomePage />} />

      <Route path='/case-study/:slug' element={<CaseStudy />} />
    </Routes>
  );
}

export default App;
