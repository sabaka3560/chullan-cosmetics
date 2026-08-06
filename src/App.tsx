import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Home from './pages/Home';
import NotFound from './pages/NotFound';

/**
 * `basename` is taken from Vite's BASE_URL so the router keeps working when the
 * build is served from a sub-path (GitHub Pages, a /shop mount) rather than the
 * domain root. The catch-all keeps a deep link from rendering a blank document.
 */
export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
