import React, { useState } from 'react';
import { A } from '../state/actions.js';
import { MISSION, ROLES } from '../engine/index.js';

/** Opening story: short, interactive and educational. The camera flies to a station for each beat. */
function Chain() {
  const steps = ['Better camera', 'More power', 'Bigger arrays', 'More mass', 'More propellant', 'Bigger rocket', 'Higher cost'];
  return <div className="chain">{steps.map((x, i) => <React.Fragment key={x}><span className="chip-s" style={{ animationDelay: i * 0.35 + 's' }}>{x}</span>{i < steps.length - 1 && <span className="arr" style={{ animationDelay: i * 0.35 + 0.2 + 's' }}>→</span>}</React.Fragment>)}</div>;
}
function MarginBar() {
  return (
    <div className="mbar">
      <div className="mtrack"><div className="mfill"></div><div className="mtick"></div><div className="mstorm">⚡ storm</div></div>
      <div className="mlabels"><span>used</span><span>25% margin</span></div>
    </div>
  );
}
function Quiz({ q, options, answer, why }) {
  const [pick, setPick] = useState(null);
  return (
    <div className="quiz">
      <b>{q}</b>
      <div className="seg">{options.map((o, i) => <button key={o} className={pick === i ? (i === answer ? 'on right' : 'on wrong') : ''} onClick={() => setPick(i)}>{o}</button>)}</div>
      {pick != null && <p className={pick === answer ? 'ok' : 'no'}>{pick === answer ? 'Right. ' : 'Not quite. '}{why}</p>}
    </div>
  );
}

export function Intro({ s }) {
  const nick = s.profile.nick || 'engineer';
  const beats = [
    { tag: 'Cairo Mission Design Lab', title: `Welcome aboard, ${nick}`, body: 'This hangar turns science questions into spacecraft. You are the newest flight engineer, and your first mission is waiting.', who: 'Mission Director' },
    { tag: 'The question', title: MISSION.name, body: `${MISSION.goal} The design is inspired by NASA’s ${MISSION.inspired}. Trip time: ${MISSION.trip.toLowerCase()}. Sunlight there: ${MISSION.sunlight.toLowerCase()}.`, who: 'Mission Director' },
    { tag: 'Lesson 1: nothing is free', title: 'Every choice pushes on everything else', body: 'A better instrument needs more power, power needs bigger arrays, arrays add mass, and every kilogram needs propellant to carry it. Engineers call it the snowball.', extra: <><Chain /><Quiz q="You add a heavier camera. What happens to the propellant you need?" options={['More', 'Less', 'Same']} answer={0} why="More mass needs more propellant, and that propellant is mass too." /></> },
    { tag: 'Lesson 2: keep a margin', title: 'Spare capacity saves missions', body: 'Estimates grow and space is unpredictable. NASA concept designs keep about 25 to 30% spare on power and mass. In this game a white tick marks that line.', extra: <><MarginBar /><Quiz q="How much spare power do NASA concept designs keep?" options={['About 5%', 'About 25 to 30%', 'About 80%']} answer={1} why="NASA guidance in concept design is roughly 25 to 30% contingency." /></> },
    { tag: 'Lesson 3: one team', title: 'Four roles decide together', body: 'Each stage is checked by four roles before it locks. Changing a locked decision later costs more, just as it does at NASA.', extra: <div className="roles4">{ROLES.map((r, i) => <span key={r} style={{ animationDelay: i * 0.15 + 's' }}>{r}</span>)}</div> },
    { tag: 'Your first task', title: 'Walk to Mission Control', body: 'A gold arrow will float over each place you need to go, and the task list at the top tracks what is left. A short tour will show you the controls.', who: 'Mission Director' },
  ];
  const i = Math.min(s.introBeat || 0, beats.length - 1), b = beats[i], last = i === beats.length - 1;
  return (
    <div className="intro">
      <section className="intro-card glass" key={i}>
        <div className="tut-top"><span className="label">{b.tag}</span><button className="linkbtn" onClick={A.finishIntro}>Skip story</button></div>
        <h2>{b.title}</h2>
        {b.who && <div className="who-line">{b.who}</div>}
        <p>{b.body}</p>
        {b.extra}
        <div className="tut-foot">
          <div className="tut-dots">{beats.map((_, k) => <i key={k} className={k < i ? 'on' : k === i ? 'cur' : ''}></i>)}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {i > 0 && <button className="btn small" onClick={() => A.setIntroBeat(i - 1)}>Back</button>}
            <button className="btn small primary" onClick={() => (last ? A.finishIntro() : A.setIntroBeat(i + 1))}>{last ? 'Enter the hangar' : 'Next'}</button>
          </div>
        </div>
      </section>
      <p className="intro-note passthru">The Mission Director and the lab are fictional. Mission figures come from NASA sources.</p>
    </div>
  );
}

export function ReplayNotice({ s }) {
  if (!s.replayNotice) return null;
  return (
    <div className="overlay">
      <section className="signoff glass">
        <div className="label">Replay a real mission</div>
        <h2 style={{ margin: '2px 0 6px' }}>The real {MISSION.inspired} design is loaded</h2>
        <p className="sub">Replay starts from the instruments, power, antenna, rocket and propellant the real mission used, so you can see how it performs and change it. Prefer to decide everything yourself?</p>
        <div className="foot">
          <button className="btn" onClick={A.clearDesign}>Start empty instead</button>
          <button className="btn primary" onClick={A.dismissReplay}>Keep the real design</button>
        </div>
      </section>
    </div>
  );
}
