import React, { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import ProductCard from './ProductCard';

interface CarouselProps {
  products: any[];
}

const Carousel: React.FC<CarouselProps> = ({ products }) => {
  const carouselRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (carouselRef.current) {
      setWidth(carouselRef.current.scrollWidth - carouselRef.current.offsetWidth);
    }
  }, [products]);

  return (
    <div style={{ padding: '0 20px', overflow: 'hidden' }}>
      <motion.div ref={carouselRef} style={{ cursor: 'grab', overflow: 'hidden' }} whileTap={{ cursor: 'grabbing' }}>
        <motion.div 
          drag="x" 
          dragConstraints={{ right: 0, left: -width }} 
          style={{ display: 'flex', gap: '30px' }}
        >
          {products.map(product => (
            <motion.div key={product.id} style={{ minWidth: '280px' }}>
              <ProductCard {...product} />
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Carousel;
