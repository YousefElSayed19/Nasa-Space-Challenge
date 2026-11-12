import React, { useEffect } from 'react';
import { TUTORIAL, isStepDone, nextStep, prevStep, finishTutorial } from '../state/tutorial.js';
import { useHud } from './hooks.js';

export function TutorialCard({ s }) {
  const i = s.tutorial;
  const h = useHud();
  useEffect(() => {
    const onKey = e => { if (e.key === 'Enter' && document.activeElement?.tagName !== 'INPUT') nextStep(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  if (i == null) return null;
  const step = TUTORIAL[i];
  const done = isStepDone(s);
  const action = !!step.done;
  const last = i === TUTORIAL.length - 1;
  return (
    <section className={'tutorial glass' + (action && done ? ' ready' : '')} aria-live="polite" key={i}>
      <div className="tut-top">
        <span className="label">Tour {i + 1} of {TUTORIAL.length}</span>
        <button className="linkbtn" onClick={finishTutorial}>Skip tour</button>
      </div>
      <div className="tut-body">
        {step.icon && <div className="tut-icon" aria-hidden="true">{step.icon}</div>}
        <div>
          <h3>{step.title}</h3>
          <p>{step.text}</p>
          {step.keys && <div className="tut-keys">{step.keys.map(k => <span key={k} className="key">{k}</span>)}</div>}
        </div>
      </div>
      {action && (
        <div className={'tut-status ' + (done ? 'ok' : 'wait')}>
          {done ? <><b>✓</b> Done. Press Next when you are ready.</> : <><span className="tut-spin" aria-hidden="true"></span>Try it: {step.wait}{step.target && h.ptr && h.near !== step.target ? ` (${h.ptr.label} is ${h.ptr.dist} m away; walk until the E prompt appears)` : ''}</>}
        </div>
      )}
      <div className="tut-foot">
        <div className="tut-dots">{TUTORIAL.map((_, k) => <i key={k} className={k < i ? 'on' : k === i ? 'cur' : ''}></i>)}</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {i > 0 && <button className="btn small" onClick={prevStep}>Back</button>}
          <button className="btn small primary" disabled={!done} onClick={nextStep}>{last ? 'Start playing' : 'Next'}</button>
        </div>
      </div>
    </section>
  );
}
