import React from 'react';
import { A } from '../state/actions.js';
import GLOSSARY from '../data/glossary.json';

export function Glossary() {
  return (
    <div className="overlay" onClick={A.toggleGlossary}>
      <section className="glossary glass" aria-label="Glossary" onClick={e => e.stopPropagation()}>
        <div className="panel-head"><div><h2>Glossary</h2><p className="sub">The engineering ideas this game teaches, and where each comes from.</p></div>
          <button className="x" aria-label="Close glossary" onClick={A.toggleGlossary}>✕</button></div>
        <dl>
          {GLOSSARY.map(g => (
            <div key={g.term} className="gterm"><dt>{g.term}</dt><dd>{g.def}<span className="tag"> Source: {g.source}.</span></dd></div>
          ))}
        </dl>
      </section>
    </div>
  );
}
