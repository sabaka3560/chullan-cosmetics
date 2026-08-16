import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="notfound on-dark">
      <div>
        <p className="eyebrow">Error 404</p>
        <h1 className="display-l" style={{ marginBlock: '20px 18px' }}>Nothing here</h1>
        <p className="deck" style={{ marginInline: 'auto', marginBottom: 34 }}>
          That page has moved, or it never existed.
        </p>
        {/* A router Link, not an anchor — an `href="/"` on a client-side route
            forces a full document reload and throws away the bag's in-memory
            state on the way. */}
        <Link className="btn btn--primary" to="/shop">Back to the shop</Link>
      </div>
    </div>
  );
}
