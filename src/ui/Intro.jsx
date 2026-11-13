import React, { useEffect, useRef, useState } from 'react';
import { A } from '../state/actions.js';
import { MISSION } from '../engine/index.js';

/**
 * Opening video. If the team has recorded a real gameplay video at public/intro.mp4 it plays that.
 * Otherwise it plays a cinematic made live from the game's own scenes: the camera flies through the real rooms
 * while captions and an optional narrator explain the game.
 */
const SHOTS = () => [
  { t: 7, title: 'MissionForge', sub: 'Design a real space mission, from the first idea to the last byte of data.',
    say: `Welcome to MissionForge. In this game you design a real space mission, the way NASA engineers do: from a science question to a spacecraft that flies.` },
  { t: 7, title: 'Your mission', sub: `${MISSION.name}: ${MISSION.goal}`,
    say: `Every mission starts with a question. Today: ${MISSION.goal} It is inspired by NASA's ${MISSION.inspired}.` },
  { t: 7, title: 'Choose your instruments', sub: 'Four labs hold real NASA instruments, with their real mass and power.', overlay: 'labs',
    say: 'Walk into the labs and choose your instruments. Each card shows the real mass and power from NASA, the price, and what it is good and bad at.' },
  { t: 7, title: 'Power, communications, protection', sub: 'Solar arrays, antennas, batteries and shields keep the science alive.',
    say: 'Then give the spacecraft power, a way to talk to Earth, and protection from the space around it.' },
  { t: 9, title: 'Every choice makes a difference', sub: 'A better camera needs more power. More power means bigger arrays. Bigger arrays mean more mass, more fuel, a bigger rocket, and more money.', overlay: 'chain',
    say: 'Here is the most important lesson. Every component you select makes a difference. A better camera needs more power, more power needs bigger arrays, and every kilogram needs fuel and a bigger rocket. Watch your budget and your margins.' },
  { t: 7, title: 'Choose a rocket and fuel up', sub: 'Pick the cheapest rocket that still leaves margin, then load just enough propellant.',
    say: 'Choose a rocket that can lift your design with room to spare, and load the propellant the rocket equation says you need.' },
  { t: 7, title: 'Go or No-Go', sub: 'Four roles review the design. Then launch, and watch what really happens on the way.',
    say: 'Your team of four roles reviews everything. If it is go, you launch and fly the whole journey, past the planets on the way.' },
  { t: 9, title: 'Learn from every flight', sub: 'If something fails, the debrief shows exactly which decision caused it.', overlay: 'learn',
    say: 'After the flight, the debrief traces every success and every failure back to your decisions. That is how you learn: margins, trade-offs, and why late changes cost more. Now it is your turn. Good luck, engineer.' },
];

function Overlay({ kind }) {
  if (kind === 'chain') {
    const steps = ['Better camera', 'More power', 'Bigger arrays', 'More mass', 'More fuel', 'Bigger rocket', 'Higher cost'];
    return <div className="vi-chain">{steps.map((x, i) => <React.Fragment key={x}><span style={{ animationDelay: i * 0.6 + 's' }}>{x}</span>{i < steps.length - 1 && <b style={{ animationDelay: i * 0.6 + 0.3 + 's' }}>→</b>}</React.Fragment>)}</div>;
  }
  if (kind === 'labs') {
    const bars = [['Mass', 72], ['Power', 58], ['Data', 44], ['Budget', 66]];
    return <div className="vi-bars">{bars.map(([k, v], i) => <div key={k}><span>{k}</span><i><em style={{ '--w': v + '%', animationDelay: i * 0.4 + 's' }}></em></i></div>)}<p>Every part changes these bars live.</p></div>;
  }
  if (kind === 'learn') {
    return <ul className="vi-learn">{['Keep about 25% margin, like NASA designs do', 'Every component changes mass, power, data and cost', 'Late changes cost more than early ones', 'Data that never reaches Earth is not science'].map((x, i) => <li key={x} style={{ animationDelay: 0.5 + i * 0.7 + 's' }}>✓ {x}</li>)}</ul>;
  }
  return null;
}

function speak(text, on) {
  try { window.speechSynthesis.cancel(); if (!on || !text) return; const u = new SpeechSynthesisUtterance(text); u.rate = 1; u.pitch = 1; u.lang = 'en-US'; window.speechSynthesis.speak(u); } catch (e) { /* no speech on this browser */ }
}

export function Intro({ s }) {
  const [mp4, setMp4] = useState(null);
  useEffect(() => { fetch('intro.mp4', { method: 'HEAD' }).then(r => setMp4(r.ok && (r.headers.get('content-type') || '').includes('video'))).catch(() => setMp4(false)); }, []);
  if (mp4 === null) return <div className="vi"><div className="vi-bars-top"></div></div>;
  return mp4 ? <RecordedVideo /> : <Cinematic s={s} />;
}

function RecordedVideo() {
  return (
    <div className="vi recorded">
      <video src="intro.mp4" autoPlay controls playsInline onEnded={A.finishIntro} className="vi-video" />
      <button className="btn vi-skip" onClick={A.finishIntro}>Skip ⏭</button>
    </div>
  );
}

function Cinematic({ s }) {
  const shots = SHOTS();
  const total = shots.reduce((a, x) => a + x.t, 0);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [voice, setVoice] = useState(true);
  const last = useRef(-1);
  // which shot is on screen
  let acc = 0, idx = 0;
  for (let i = 0; i < shots.length; i++) { if (time >= acc && time < acc + shots[i].t) { idx = i; break; } acc += shots[i].t; idx = i; }
  const shotStart = shots.slice(0, idx).reduce((a, x) => a + x.t, 0);
  useEffect(() => {
    if (!playing) return;
    let raf, prev = performance.now();
    const tick = now => { setTime(t => { const n = t + (now - prev) / 1000; prev = now; if (n >= total) { A.finishIntro(); return total; } return n; }); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);
  useEffect(() => {
    if (idx !== last.current) { last.current = idx; A.setIntroBeat(idx); speak(shots[idx].say, voice && playing); }
  }, [idx]);
  useEffect(() => { if (!playing) { try { window.speechSynthesis.pause(); } catch (e) {} } else { try { window.speechSynthesis.resume(); } catch (e) {} } }, [playing]);
  useEffect(() => () => speak('', false), []);
  const jump = i => { setTime(shots.slice(0, i).reduce((a, x) => a + x.t, 0) + 0.01); };
  const sh = shots[idx];
  return (
    <div className="vi" onClick={() => setPlaying(p => !p)}>
      <div className="vi-bars-top"></div><div className="vi-bars-bottom"></div>
      <div className="vi-caption" key={idx}>
        <div className="vi-kicker">{idx + 1} / {shots.length}</div>
        <h1>{sh.title}</h1>
        <p>{sh.sub}</p>
        <Overlay kind={sh.overlay} />
      </div>
      {!playing && <div className="vi-paused">❚❚ Paused · click to play</div>}
      <div className="vi-controls" onClick={e => e.stopPropagation()}>
        <button onClick={() => setPlaying(p => !p)} aria-label={playing ? 'Pause' : 'Play'}>{playing ? '❚❚' : '▶'}</button>
        <button onClick={() => { jump(0); setPlaying(true); }} aria-label="Restart">⟲</button>
        <button onClick={() => { const v = !voice; setVoice(v); speak(v ? sh.say : '', v); }} aria-label="Narration">{voice ? '🔊' : '🔈'}</button>
        <div className="vi-progress">
          {shots.map((x, i) => (
            <button key={i} className="vi-seg" style={{ flex: x.t }} onClick={() => jump(i)} aria-label={x.title}>
              <i style={{ width: (i < idx ? 100 : i > idx ? 0 : Math.min(100, (time - shotStart) / x.t * 100)) + '%' }}></i>
            </button>
          ))}
        </div>
        <button className="vi-skip-btn" onClick={A.finishIntro}>Skip intro ⏭</button>
      </div>
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
