import React from 'react';
import { motion } from 'framer-motion';
import heroProduct from '../assets/hero_product.png';

const Hero: React.FC = () => {
  return (
    <section id="hero-section" style={{
      height: '100vh',
      width: '100%',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
    }}>
      {/* Background image */}
      <motion.div 
        initial={{ scale: 1.1 }}
        animate={{ scale: 1 }}
        transition={{ duration: 1.5, ease: 'easeOut' }}
        style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundImage: `url(${heroProduct})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          zIndex: 0,
          filter: 'brightness(0.5) contrast(1.2)'
        }}
      />

      {/* Two-column layout: Left = text, Right = reserved for 3D bottle */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        width: '100%',
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '0 60px',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        alignItems: 'center',
        height: '100%',
      }}>
        {/* Left column: headline and CTA */}
        <div>
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            style={{
              fontSize: '0.9rem',
              letterSpacing: '4px',
              textTransform: 'uppercase',
              color: '#888',
              marginBottom: '20px',
              fontWeight: 600,
            }}
          >
            Introducing Chullan
          </motion.p>
          <motion.h1
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            style={{ 
              fontSize: 'clamp(3.5rem, 8vw, 7rem)', 
              fontWeight: 900, 
              marginBottom: '24px', 
              lineHeight: 0.9,
              color: '#fff',
              textTransform: 'uppercase',
              letterSpacing: '-2px',
            }}
          >
            PURE.<br/>IMPACT.
          </motion.h1>
          <motion.p
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            style={{ 
              fontSize: '1.2rem', 
              color: '#bbb', 
              marginBottom: '40px',
              fontWeight: 400,
              maxWidth: '420px',
              lineHeight: 1.6,
            }}
          >
            Premium cosmetics engineered for the modern man. Bold, subtle, flawless.
          </motion.p>
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.7 }}
          >
            <button style={{
              backgroundColor: '#ffffff',
              color: '#000000',
              padding: '18px 48px',
              fontSize: '1rem',
              fontWeight: 900,
              letterSpacing: '2px',
              textTransform: 'uppercase',
              border: 'none',
              cursor: 'pointer',
              transition: 'transform 0.3s, box-shadow 0.3s',
              boxShadow: '0 8px 30px rgba(255,255,255,0.15)',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-3px)';
              e.currentTarget.style.boxShadow = '0 12px 40px rgba(255,255,255,0.25)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 8px 30px rgba(255,255,255,0.15)';
            }}
            >
              Shop Now
            </button>
          </motion.div>
        </div>

        {/* Right column: intentionally empty — the 3D bottle floats here */}
        <div />
      </div>

      {/* Scroll indicator */}
      <motion.div
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
        style={{
          position: 'absolute',
          bottom: '40px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
          color: '#666',
          fontSize: '0.75rem',
          letterSpacing: '3px',
          textTransform: 'uppercase',
        }}
      >
        <span>Scroll</span>
        <div style={{ width: '1px', height: '30px', background: 'linear-gradient(to bottom, #666, transparent)' }} />
      </motion.div>
    </section>
  );
};

export default Hero;
