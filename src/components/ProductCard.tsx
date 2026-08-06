import React from 'react';
import { motion } from 'framer-motion';

interface ProductCardProps {
  id: string;
  name: string;
  price: number;
  image: string;
}

const ProductCard: React.FC<ProductCardProps> = ({ name, price, image }) => {
  return (
    <motion.div 
      whileHover={{ y: -10 }}
      transition={{ duration: 0.3 }}
      style={{ 
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        width: '100%'
      }}
    >
      <div style={{
        aspectRatio: '3/4',
        backgroundColor: '#111',
        overflow: 'hidden',
        position: 'relative'
      }}>
        <img 
          src={image} 
          alt={name} 
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transition: 'transform 0.7s ease'
          }} 
          onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.08)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
        />
      </div>
      <div>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, letterSpacing: '0.5px' }}>{name}</h3>
        <p style={{ color: 'var(--sub-text)', fontSize: '0.9rem', marginTop: '4px' }}>${price.toFixed(2)}</p>
      </div>
    </motion.div>
  );
};

export default ProductCard;
