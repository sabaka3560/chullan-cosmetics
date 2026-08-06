import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import ThreeScene from './components/ThreeScene';
import './index.css';

const App: React.FC = () => {
  return (
    <Router>
      {/* 3D Scene floats in front of everything */}
      <ThreeScene />

      {/* Website Content in normal flow */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <Routes>
          <Route path="/" element={<Home />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
