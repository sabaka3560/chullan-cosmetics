import { Layout } from '../components/Layout';
import { m } from 'framer-motion';

export default function Placeholder({ title }: { title: string }) {
  return (
    <Layout>
      <div className="shell" style={{ paddingTop: '200px', paddingBottom: '100px', minHeight: '60vh' }}>
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <h1 className="display-l">{title}</h1>
          <p className="deck" style={{ marginTop: '24px' }}>
            This page is currently under construction. Please check back soon.
          </p>
        </m.div>
      </div>
    </Layout>
  );
}
