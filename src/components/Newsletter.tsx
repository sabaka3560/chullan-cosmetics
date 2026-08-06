import { useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowRight } from 'lucide-react';
import { Reveal } from './Reveal';

/**
 * `--bone-2` gives the capture block its own plate without spending a whole
 * dark section on it.
 */
export function Newsletter() {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setDone(true);
  };

  return (
    <section className="section section--bone-2 cv-auto">
      <div className="shell newsletter">
        <Reveal>
          <p className="eyebrow eyebrow--rule">Stay in the loop</p>
          <h2 className="h2 section-head__title">Join the club</h2>
        </Reveal>

        <Reveal delay={0.08}>
          <p className="deck">
            Ten percent off your first order, plus first access to restocks and new
            drops. No more than one email a month.
          </p>

          {done ? (
            <p className="deck" style={{ marginTop: 30 }}>You&rsquo;re on the list.</p>
          ) : (
            <form className="field" onSubmit={onSubmit} noValidate={false}>
              {/* A persistent label, never placeholder-as-label — the
                  placeholder colour is 2.31:1 and can't legally carry meaning. */}
              <label className="eyebrow" htmlFor="newsletter-email">Email address</label>
              <div className="field__row">
                <input
                  id="newsletter-email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <button className="btn btn--sm btn--primary" type="submit">
                  Subscribe
                  <ArrowRight size={14} strokeWidth={2} />
                </button>
              </div>
            </form>
          )}

          <p className="newsletter__note">Unsubscribe any time.</p>
        </Reveal>
      </div>
    </section>
  );
}
