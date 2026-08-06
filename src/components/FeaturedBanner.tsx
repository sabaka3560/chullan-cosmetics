import React from 'react';
import { motion } from 'framer-motion';

interface FeaturedBannerProps {
  title: string;
  description: string;
  image: string;
  reverse?: boolean;
}

const FeaturedBanner: React.FC<FeaturedBannerProps> = ({ title, description, image, reverse = false }) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: reverse ? 'row-reverse' : 'row',
      flexWrap: 'wrap',
      minHeight: '600px',
      backgroundColor: '#111'
    }}>
      <div style={{
        flex: '1 1 50%',
        backgroundImage: `url(${image})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        minHeight: '400px'
      }} />
      <div style={{
        flex: '1 1 50%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '60px 40px',
        textAlign: 'center'
      }}>
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          style={{ fontSize: 'clamp(2rem, 5vw, 4rem)', fontWeight: 800, marginBottom: '20px' }}
        >
          {title}
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          style={{ fontSize: '1.1rem', color: 'var(--sub-text)', marginBottom: '40px', maxWidth: '400px' }}
        >
          {description}
        </motion.p>
        <motion.button
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          style={{
            backgroundColor: 'transparent',
            color: 'var(--accent-color)',
            padding: '12px 32px',
            fontSize: '0.9rem',
            fontWeight: 800,
            letterSpacing: '1px',
            textTransform: 'uppercase',
            border: '2px solid var(--accent-color)',
            cursor: 'pointer',
            transition: 'background-color 0.3s, color 0.3s'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--accent-color)';
            e.currentTarget.style.color = 'var(--bg-color)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'var(--accent-color)';
          }}
        >
          Shop Now
        </motion.button>
      </div>
    </div>
  );
};

export default FeaturedBanner;
