import React from 'react';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import ProductCard from '../components/ProductCard';
import { motion } from 'framer-motion';

import bottleImg from '../assets/bottle.png';
import stickImg from '../assets/stick.png';
import tubeImg from '../assets/tube.png';
import featuredProduct from '../assets/featured_product.png';
import lifestyle2 from '../assets/lifestyle_2.png';

const products = [
  { id: '1', name: 'Foundation Bottle', price: 29.99, image: bottleImg },
  { id: '2', name: 'Concealer Stick', price: 19.99, image: stickImg },
  { id: '3', name: 'Blur Balm Tube', price: 24.99, image: tubeImg },
  { id: '4', name: 'Matte Finish Set', price: 49.99, image: bottleImg },
  { id: '5', name: 'The Starter Kit', price: 69.99, image: stickImg },
  { id: '6', name: 'Everyday Essentials', price: 54.99, image: tubeImg },
];

const sectionStyle: React.CSSProperties = {
  maxWidth: '1400px',
  margin: '0 auto',
  padding: '0 60px',
};

const Home: React.FC = () => {
  return (
    <div>
      <Navbar />
      <Hero />
      
      {/* ──────────────────────────────────────────────
          SECTION 2: BEST SELLERS
          Layout: 3-column grid on the left, empty right gutter for 3D bottle
      ────────────────────────────────────────────── */}
      <section id="bestsellers-section" style={{ padding: '120px 0', backgroundColor: '#050505' }}>
        <div style={sectionStyle}>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '60px' }}>
              <div>
                <p style={{ fontSize: '0.85rem', letterSpacing: '4px', textTransform: 'uppercase', color: '#666', marginBottom: '12px', fontWeight: 600 }}>Shop the range</p>
                <h2 style={{ fontSize: '3rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-1px' }}>Best Sellers</h2>
              </div>
              <a href="#" style={{ borderBottom: '2px solid #fff', paddingBottom: '4px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.85rem' }}>Shop All</a>
            </div>
          </motion.div>
          
          {/* Products: 3 columns on the left ~70%, right ~30% is the bottle's space */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr) 0.6fr',
            gap: '30px',
            alignItems: 'start',
          }}>
            {products.slice(0, 3).map((product, i) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <ProductCard {...product} />
              </motion.div>
            ))}
            {/* Empty column: the 3D bottle occupies this visual space */}
            <div />
          </div>

          {/* Second row of products */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr) 0.6fr',
            gap: '30px',
            marginTop: '60px',
            alignItems: 'start',
          }}>
            {products.slice(3, 6).map((product, i) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <ProductCard {...product} />
              </motion.div>
            ))}
            {/* Empty column: bottle's space */}
            <div />
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────
          SECTION 3: THE ESSENTIALS SPLIT BANNER
          Layout: Left = lifestyle image, Center = bottle's space, Right = text
      ────────────────────────────────────────────── */}
      <section id="essentials-section" style={{ backgroundColor: '#0a0a0a' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 0.5fr 1fr',
          minHeight: '700px',
          maxWidth: '1600px',
          margin: '0 auto',
        }}>
          {/* Left: Lifestyle image */}
          <div style={{
            backgroundImage: `url(${featuredProduct})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            minHeight: '500px',
          }} />
          
          {/* Center: empty, reserved for the 3D bottle rotating between the two halves */}
          <div />

          {/* Right: Text content */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '80px 60px',
          }}>
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              style={{ fontSize: '0.85rem', letterSpacing: '4px', textTransform: 'uppercase', color: '#666', marginBottom: '16px', fontWeight: 600 }}
            >
              The Collection
            </motion.p>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 900, marginBottom: '24px', lineHeight: 1 }}
            >
              THE<br/>ESSENTIALS
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              style={{ fontSize: '1.1rem', color: '#999', marginBottom: '40px', lineHeight: 1.7, maxWidth: '380px' }}
            >
              A minimalist approach to maximum impact. Get the flawless, natural look with our premium matte foundation, concealer, and blur balm.
            </motion.p>
            <motion.button
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
              style={{
                backgroundColor: 'transparent',
                color: '#fff',
                padding: '14px 36px',
                fontSize: '0.9rem',
                fontWeight: 800,
                letterSpacing: '2px',
                textTransform: 'uppercase',
                border: '2px solid #fff',
                cursor: 'pointer',
                transition: 'all 0.3s',
                alignSelf: 'flex-start',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#fff';
                e.currentTarget.style.color = '#000';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = '#fff';
              }}
            >
              Shop Now
            </motion.button>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────
          SECTION 4: LIFESTYLE / ABOUT STRIP
          Full-bleed image with overlaid text
      ────────────────────────────────────────────── */}
      <section style={{
        position: 'relative',
        height: '50vh',
        minHeight: '400px',
        backgroundImage: `url(${lifestyle2})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
        }} />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          style={{
            position: 'relative',
            zIndex: 1,
            textAlign: 'center',
            maxWidth: '600px',
            padding: '0 20px',
          }}
        >
          <h2 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: '16px' }}>BUILT FOR MEN</h2>
          <p style={{ fontSize: '1.1rem', color: '#bbb', lineHeight: 1.7 }}>
            Formulated with precision. Designed without compromise. Every Chullan product is rigorously tested to deliver invisible, confidence-boosting results.
          </p>
        </motion.div>
      </section>

      {/* ──────────────────────────────────────────────
          SECTION 5: NEWSLETTER / FOOTER
          Centered content with bottle space on the left
      ────────────────────────────────────────────── */}
      <section id="footer-section" style={{ padding: '120px 0', backgroundColor: '#000', borderTop: '1px solid #1a1a1a' }}>
        <div style={{
          ...sectionStyle,
          display: 'grid',
          gridTemplateColumns: '0.4fr 1fr',
          alignItems: 'center',
          gap: '40px',
        }}>
          {/* Left: bottle's landing spot */}
          <div />

          {/* Right: newsletter form */}
          <div style={{ textAlign: 'center' }}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <p style={{ fontSize: '0.85rem', letterSpacing: '4px', textTransform: 'uppercase', color: '#666', marginBottom: '12px', fontWeight: 600 }}>Stay in the loop</p>
              <h2 style={{ fontSize: '2.5rem', marginBottom: '16px', fontWeight: 900 }}>JOIN THE CLUB</h2>
              <p style={{ color: '#888', marginBottom: '40px', fontSize: '1.05rem', maxWidth: '400px', margin: '0 auto 40px auto' }}>Get 10% off your first order and exclusive updates on new drops.</p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '0px', maxWidth: '480px', margin: '0 auto' }}>
                <input type="email" placeholder="Your email address" style={{ 
                  flex: 1, 
                  padding: '16px 20px', 
                  backgroundColor: '#111', 
                  border: '1px solid #333', 
                  borderRight: 'none',
                  color: '#fff', 
                  outline: 'none', 
                  fontSize: '0.95rem',
                  fontFamily: 'inherit',
                }} />
                <button style={{ 
                  padding: '16px 36px', 
                  backgroundColor: '#fff', 
                  color: '#000', 
                  fontWeight: 900, 
                  letterSpacing: '1px', 
                  border: '1px solid #fff', 
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  transition: 'all 0.3s',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#ddd';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#fff';
                }}
                >SUBSCRIBE</button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Minimal footer bar */}
      <footer style={{
        padding: '30px 60px',
        borderTop: '1px solid #1a1a1a',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '0.8rem',
        color: '#555',
      }}>
        <span>© 2026 Chullan. All rights reserved.</span>
        <div style={{ display: 'flex', gap: '24px' }}>
          <a href="#" style={{ color: '#555', transition: 'color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.color = '#fff'} onMouseOut={(e) => e.currentTarget.style.color = '#555'}>Privacy</a>
          <a href="#" style={{ color: '#555', transition: 'color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.color = '#fff'} onMouseOut={(e) => e.currentTarget.style.color = '#555'}>Terms</a>
          <a href="#" style={{ color: '#555', transition: 'color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.color = '#fff'} onMouseOut={(e) => e.currentTarget.style.color = '#555'}>Contact</a>
        </div>
      </footer>
    </div>
  );
};

export default Home;
