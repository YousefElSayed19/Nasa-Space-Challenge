import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/** The small "?" beside every element (GDD 6.4): what it is, why it matters, real value.
 * The card opens in a layer above every panel, so a scrolling panel can never cut it off. */
export function InfoDot({ info, title, left }) {
  const [pos, setPos] = useState(null);
  const btn = useRef(null), card = useRef(null);
  const open = !!pos;
  const toggle = e => {
    e.stopPropagation();
    if (open) { setPos(null); return; }
    const r = btn.current.getBoundingClientRect();
    setPos({ x: r.left + r.width / 2, y: r.bottom, top: r.top });
  };
  // keep the card on screen once its size is known; close on outside click, Escape, scroll or resize
  useEffect(() => {
    if (!open) return;
    const el = card.current;
    if (el) {
      const W = window.innerWidth, H = window.innerHeight, w = el.offsetWidth, h = el.offsetHeight;
      let x = left ? pos.x - w + 16 : pos.x - 16; x = Math.max(8, Math.min(W - w - 8, x));
      let y = pos.y + 8; if (y + h > H - 8) y = Math.max(8, pos.top - h - 8);
      el.style.left = x + 'px'; el.style.top = y + 'px'; el.style.visibility = 'visible';
    }
    const close = e => { if (e.type === 'keydown' && e.key !== 'Escape') return; if (e.type === 'pointerdown' && (btn.current.contains(e.target) || (card.current && card.current.contains(e.target)))) return; setPos(null); };
    window.addEventListener('pointerdown', close, true); window.addEventListener('keydown', close); window.addEventListener('resize', close);
    window.addEventListener('scroll', close, true);
    return () => { window.removeEventListener('pointerdown', close, true); window.removeEventListener('keydown', close); window.removeEventListener('resize', close); window.removeEventListener('scroll', close, true); };
  }, [open]);
  const host = typeof document !== 'undefined' ? (document.getElementById('ui') || document.body) : null;
  return (
    <span className="info-wrap">
      <button ref={btn} className={'info' + (open ? ' on' : '')} aria-label={'About ' + title} aria-expanded={open} onClick={toggle}>?</button>
      {open && host && createPortal(
        <div ref={card} className="pop glass pop-float" role="dialog" aria-label={title} style={{ visibility: 'hidden' }} onClick={() => setPos(null)}>
          <div className="pop-t">{title}</div>
          {info.what && <p><b>What it is.</b> {info.what}</p>}
          {info.why && <p><b>Why it matters.</b> {info.why}</p>}
          {info.real && <p><b>Real value.</b> {info.real}</p>}
          <span className="pop-close">Click anywhere to close</span>
        </div>, host)}
    </span>
  );
}

export function Stars({ n }) {
  return <span className="stars" aria-label={n + ' of 5 science value'}>{'★'.repeat(n)}<span className="dim">{'★'.repeat(5 - n)}</span></span>;
}
