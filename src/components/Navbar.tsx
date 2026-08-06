import React, { useState, useEffect } from 'react';
import { ShoppingBag, Menu, X } from 'lucide-react';
import { motion } from 'framer-motion';

const Navbar: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <motion.nav 
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6 }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '80px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 40px',
        backgroundColor: scrolled ? 'rgba(0,0,0,0.9)' : 'transparent',
        backdropFilter: scrolled ? 'blur(10px)' : 'none',
        zIndex: 1000,
        borderBottom: scrolled ? '1px solid var(--border-color)' : 'none',
        transition: 'background-color 0.3s ease, border-bottom 0.3s ease'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <button 
          style={{ display: 'none' }} // Desktop hide
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        <div style={{ display: 'flex', gap: '30px' }} className="nav-links">
          <a href="#" style={{ fontWeight: 600, fontSize: '0.9rem', letterSpacing: '1px' }}>SHOP</a>
          <a href="#" style={{ fontWeight: 600, fontSize: '0.9rem', letterSpacing: '1px' }}>ABOUT</a>
        </div>
      </div>

      <a href="/" style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '2px' }}>
        CHULLAN
      </a>

      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <a href="#" style={{ fontWeight: 600, fontSize: '0.9rem', letterSpacing: '1px' }} className="nav-links">ACCOUNT</a>
        <button style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShoppingBag size={20} />
          <span style={{ fontWeight: 600 }}>0</span>
        </button>
      </div>
    </motion.nav>
  );
};

export default Navbar;
