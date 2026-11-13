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

const canSpeak = () => { try { return 'speechSynthesis' in window && window.speechSynthesis.getVoices().length > 0; } catch (e) { return false; } };
function speak(text, on, onWord, onEnd) {
  try {
    window.speechSynthesis.cancel(); if (!on || !text) return false;
    const u = new SpeechSynthesisUtterance(text); u.rate = 1; u.pitch = 1; u.lang = 'en-US';
    if (onWord) u.onboundary = e => {
      if (e.name && e.name !== 'word') return;
      const start = e.charIndex || 0;
      let end = e.charLength ? start + e.charLength : start;
      if (!e.charLength) { const m = /^\S+/.exec(text.slice(start)); end = start + (m ? m[0].length : 0); }
      onWord(end);
    };
    u.onend = () => { if (onWord) onWord(text.length); if (onEnd) onEnd(); };
    window.speechSynthesis.speak(u); return true;
  } catch (e) { return false; }
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
  // with the narrator on, a shot ends as soon as the narration ends; with it off, after reading time
  const shots = SHOTS().map(x => ({ ...x, t: Math.max(4, x.say.split(/\s+/).length / 2.6 + 1.5) }));
  const [idx, setIdx] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [voice, setVoice] = useState(true);
  const [word, setWord] = useState(0);
  const spokeRef = useRef(false), endedRef = useRef(false);
  const go = i => { if (i >= shots.length) { A.finishIntro(); return; } endedRef.current = false; setIdx(i); setElapsed(0); setWord(0); };
  // start the narration for each shot
  useEffect(() => {
    A.setIntroBeat(idx, shots[idx].t);
    spokeRef.current = playing && voice && speak(shots[idx].say, true, ci => setWord(ci), () => { endedRef.current = true; });
  }, [idx, voice]);
  // clock: move on when the narration has ended (plus a short beat), or after reading time without narration
  useEffect(() => {
    if (!playing) return;
    let raf, prev = performance.now(), endAt = null;
    const tick = now => {
      const dt = (now - prev) / 1000; prev = now;
      setElapsed(e => {
        const n = e + dt;
        if (spokeRef.current) {
          if (endedRef.current && endAt === null) endAt = n + 0.6;
          if (endAt !== null && n >= endAt) { endAt = null; setTimeout(() => go(idx + 1), 0); }
          if (!endedRef.current && n > shots[idx].t * 2.2) { endedRef.current = true; } // safety if a voice never reports its end
        } else if (n >= shots[idx].t) setTimeout(() => go(idx + 1), 0);
        return n;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, idx]);
  useEffect(() => { try { playing ? window.speechSynthesis.resume() : window.speechSynthesis.pause(); } catch (e) {} }, [playing]);
  useEffect(() => () => speak('', false), []);
  const sh = shots[idx];
  const est = spokeRef.current ? Math.max(shots[idx].t, elapsed + 0.01) : shots[idx].t;
  const pctNow = Math.min(100, (elapsed / est) * 100);
  // subtitle: the words already spoken are bright, the rest dim
  const said = sh.say.slice(0, word), rest = sh.say.slice(word);
  return (
    <div className="vi" onClick={() => setPlaying(p => !p)}>
      <div className="vi-bars-top"></div><div className="vi-bars-bottom"></div>
      <div className="vi-caption" key={idx}>
        <div className="vi-kicker">{idx + 1} / {shots.length}</div>
        <h1>{sh.title}</h1>
        <p>{sh.sub}</p>
        <Overlay kind={sh.overlay} />
      </div>
      <div className="vi-subtitle" aria-live="polite" key={'sub' + idx}>
        {voice && spokeRef.current ? <><span className="said">{said}</span><span className="rest">{rest}</span></> : sh.say}
      </div>
      {!playing && <div className="vi-paused">❚❚ Paused · click to play</div>}
      <div className="vi-controls" onClick={e => e.stopPropagation()}>
        <button onClick={() => setPlaying(p => !p)} aria-label={playing ? 'Pause' : 'Play'}>{playing ? '❚❚' : '▶'}</button>
        <button onClick={() => { go(0); setPlaying(true); }} aria-label="Restart">⟲</button>
        <button onClick={() => { const v = !voice; setVoice(v); if (!v) speak('', false); }} aria-label="Narration">{voice ? '🔊' : '🔈'}</button>
        <button onClick={() => go(idx + 1)} aria-label="Next shot">⏭</button>
        <div className="vi-progress">
          {shots.map((x, i) => (
            <button key={i} className="vi-seg" style={{ flex: x.t }} onClick={() => go(i)} aria-label={x.title}>
              <i style={{ width: (i < idx ? 100 : i > idx ? 0 : pctNow) + '%' }}></i>
            </button>
          ))}
        </div>
        <button className="vi-skip-btn" onClick={A.finishIntro}>Skip intro</button>
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
