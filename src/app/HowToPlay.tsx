import { useEffect, useRef } from 'react';

export const ONBOARDING_KEY = 'zoo-rumble:onboarding-v1';

export function HowToPlay({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [onClose, open]);
  if (!open) return null;
  return (
    <div className="guide-backdrop" role="presentation">
      <section
        className="guide-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="guide-title"
      >
        <div className="guide-heading">
          <div>
            <span>FIELD GUIDE</span>
            <h2 id="guide-title">Build a squad. Watch it rumble.</h2>
          </div>
          <button
            ref={closeRef}
            aria-label="Close field guide"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <div className="guide-steps">
          <article>
            <b>1</b>
            <h3>Recruit</h3>
            <p>Buy animals from the shop. Gold carries into the next round.</p>
          </article>
          <article>
            <b>2</b>
            <h3>Combine</h3>
            <p>Three matching copies automatically become a stronger star.</p>
          </article>
          <article>
            <b>3</b>
            <h3>Position</h3>
            <p>
              Drag or select animals to arrange tanks, hunters, and supports.
            </p>
          </article>
          <article>
            <b>4</b>
            <h3>Adapt</h3>
            <p>
              Different species activate traits. Lose three battles and the run
              ends.
            </p>
          </article>
        </div>
        <div className="guide-tip">
          <strong>Quick controls</strong>
          <span>
            Hold Tab for placement tiles · Space pauses combat · ? opens this
            guide
          </span>
        </div>
        <button className="guide-start" onClick={onClose}>
          Enter the wild
        </button>
      </section>
    </div>
  );
}
