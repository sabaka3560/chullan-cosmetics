export default function NotFound() {
  return (
    <div className="notfound on-dark">
      <div>
        <p className="eyebrow">Error 404</p>
        <h1 className="display-l" style={{ marginBlock: '20px 18px' }}>Nothing here</h1>
        <p className="deck" style={{ marginInline: 'auto', marginBottom: 34 }}>
          That page has moved, or it never existed.
        </p>
        <a className="btn btn--primary" href="/">Back to the shop</a>
      </div>
    </div>
  );
}
