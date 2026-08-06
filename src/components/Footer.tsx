const COLUMNS = [
  { title: 'Shop', links: ['Foundation', 'Concealer', 'Blur Balm', 'The Set', 'Gift Cards'] },
  { title: 'Support', links: ['Shade Finder', 'Shipping', 'Returns', 'Contact'] },
  { title: 'Company', links: ['Our Story', 'Ingredients', 'Sustainability', 'Stockists'] },
];

export function Footer() {
  return (
    <footer className="footer on-dark">
      <div className="shell">
        <div className="footer__grid">
          <div>
            <p className="h3" style={{ color: 'var(--void-ink)' }}>
              Engineered, not decorated.
            </p>
            <p className="footer__blurb">
              Premium matte cosmetics for the modern man. Made in India, shipped
              worldwide.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <nav className="footer__col" key={col.title} aria-label={col.title}>
              <h4>{col.title}</h4>
              <ul>
                {col.links.map((link) => (
                  <li key={link}>
                    <a href="#">{link}</a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="footer__bar">
          <span>© {new Date().getFullYear()} Chullan. All rights reserved.</span>
          <nav>
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
            <a href="#">Instagram</a>
          </nav>
        </div>
      </div>

      {/* Oversized wordmark, bottom-cropped by the page edge. Full opacity —
          a ghosted version reads as timid. */}
      <div className="footer__mark" aria-hidden="true">
        <span>Chullan</span>
      </div>
    </footer>
  );
}
