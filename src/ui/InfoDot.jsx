import React, { useState } from 'react';

/** The small "?" beside every element (GDD 6.4): what it is, why it matters, real value. */
export function InfoDot({ info, title, left }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="info-wrap">
      <button className="info" aria-label={'About ' + title} aria-expanded={open} onClick={e => { e.stopPropagation(); setOpen(o => !o); }}>?</button>
      {open && (
        <div className={'pop glass' + (left ? ' left' : '')} role="dialog" onClick={() => setOpen(false)}>
          <div className="pop-t">{title}</div>
          {info.what && <p><b>What it is.</b> {info.what}</p>}
          {info.why && <p><b>Why it matters.</b> {info.why}</p>}
          {info.real && <p><b>Real value.</b> {info.real}</p>}
        </div>
      )}
    </span>
  );
}

export function Stars({ n }) {
  return <span className="stars" aria-label={n + ' of 5 science value'}>{'★'.repeat(n)}<span className="dim">{'★'.repeat(5 - n)}</span></span>;
}
