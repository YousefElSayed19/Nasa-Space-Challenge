import React from 'react';
import { TUTORIAL, finishTutorial } from '../state/tutorial.js';

export function TutorialCard({ s }) {
  if (s.tutorial == null) return null;
  const step = TUTORIAL[s.tutorial];
  const last = s.tutorial === TUTORIAL.length - 1;
  return (
    <section className="tutorial glass" aria-live="polite" key={s.tutorial}>
      <div className="tut-top">
        <span className="label">Tutorial {s.tutorial + 1} of {TUTORIAL.length}</span>
        <button className="btn small" onClick={finishTutorial}>{last ? 'Got it' : 'Skip tutorial'}</button>
      </div>
      <h3>{step.title}</h3>
      <p>{step.text}</p>
      <div className="tut-dots">{TUTORIAL.map((_, i) => <i key={i} className={i <= s.tutorial ? 'on' : ''}></i>)}</div>
    </section>
  );
}
