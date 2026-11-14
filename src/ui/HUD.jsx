import React from 'react';
import { TopBar } from './TopBar.jsx';
import { Resources } from './Resources.jsx';
import { Prompt } from './Prompt.jsx';
import { useHud } from './hooks.js';
import { StationPanel, SignoffModal } from './Panels.jsx';
import { TutorialCard } from './Tutorial.jsx';
import { TasksCard, Pointer, LaunchOverlay } from './Guide.jsx';
import { stepOf } from '../state/tutorial.js';
import { Picker } from './Picker.jsx';
import { LockedStation } from './Locked.jsx';
import { isTouch, goFullscreen } from './TouchControls.jsx';
import { stationById, STAGE_NAMES, isPickerStation, money } from '../engine/index.js';
import { MiniMap, FullMap, WarpOverlay } from './Map.jsx';
import { A } from '../state/actions.js';
import { Sound } from '../audio/sound.js';
import { partById, isFree } from '../engine/index.js';

function objectiveText(s) {
  if (s.carrying) return 'Carry the part to the Assembly Cradle, then hold E to install it.';
  if (isFree(s)) return 'Every station is open. Launch from the Go/No-Go console when you are ready.';
  return ({
    1: 'Walk to Mission Control and read the briefing.',
    2: 'Pick instruments at the Payload Bay and install them. Confirm the payload when ready.',
    3: 'Fit a solar array, antenna, battery and shielding from the Systems Rack.',
    4: 'Choose a rocket at the Launch Vehicle Board.',
    5: 'Fill the tank at the Fueling Station. Aim for the target line.',
    6: 'Run the pre-launch checks at the cradle, then hold the Go/No-Go review at the console.',
  })[s.stage] || '';
}

const GOOD_UP = k => k === 'power supply' || k === 'downlink' || k === 'budget' || k.startsWith('capacity');

function LogPanel({ s }) {
  if (!s.showLog) return null;
  return (
    <section className="logp glass" aria-label="Decision log">
      <h3><span>Decision log</span><span className="tag">L to hide</span></h3>
      {s.log.length === 0 && <div className="tag">Your decisions will appear here, with their effect on each resource.</div>}
      {s.log.slice().reverse().map((e, i) => {
        const n = s.log.length - i;
        return (
          <div className="entry" key={n}><span className="n">{n}</span>{e.text}
            {(e.effects || e.fee) ? (
              <div className="fx">
                {Object.entries(e.effects || {}).map(([k, v]) => (
                  <span key={k} className={GOOD_UP(k) ? (v > 0 ? 'neg' : 'pos') : (v > 0 ? 'pos' : 'neg')}>{k === 'cost' || k === 'budget' ? `${v > 0 ? '+' : '−'}${money(Math.abs(v))} ${k}` : `${v > 0 ? '+' : ''}${v} ${k}`}</span>
                ))}
                {e.fee ? <span className="pos">change request {money(e.fee)}</span> : null}
              </div>
            ) : null}
          </div>
        );
      })}
    </section>
  );
}

const TOAST_ICON = { info: '✦', good: '✓', warn: '!' };
export function Toasts({ s }) {
  return (
    <div className="toasts" aria-live="polite">
      {s.toasts.map(t => (
        <div key={t.id} className={'toast ' + t.kind + (t.leaving ? ' leaving' : '')} role="status" onClick={() => A.dismissToast(t.id)}>
          <span className="toast-icon" aria-hidden="true">{TOAST_ICON[t.kind] || '✦'}</span>
          <span className="toast-text">{t.text}</span>
          <i className="toast-timer" style={{ animationDuration: t.life + 'ms' }}></i>
        </div>
      ))}
    </div>
  );
}

export function Settings({ s }) {
  return (
    <div className="settings">
      <button className="btn" aria-pressed={s.muted} onClick={() => { Sound.hum(false); A.setPrefs({ muted: !s.muted }); }}>{s.muted ? 'Sound off' : 'Sound on'}</button>
      {s.screen === 'game' && <button className="btn" onClick={A.cycleView} title="V: third person, first person, hands view">👁 {{ third: '3rd person', first: '1st person', hands: 'Hands view' }[s.view || 'third']}</button>}
      {s.screen === 'game' && <button key={s.camMode} className={'btn cam-btn flash ' + s.camMode} onClick={A.toggleCamera} title="C: switch between a camera that follows behind you and a free camera">🎥 {s.camMode === 'auto' ? 'Auto camera' : 'Free camera'}</button>}
      <button className="btn" onClick={() => A.setPrefs({ graphics: s.graphics === 'low' ? 'high' : 'low' })}>{s.graphics === 'low' ? 'Low graphics' : 'High graphics'}</button>
      <FullscreenBtn />
      <button className="btn" onClick={A.toggleGlossary}>Help</button>
      {s.screen === 'game' && <button className="btn" onClick={A.backToMenu}>Menu</button>}
    </div>
  );
}

function ReopenModal({ s }) {
  if (s.reopen == null) return null;
  const n = s.reopen, fee = A.reopenFee(n);
  return (
    <div className="lock-ov" onClick={A.cancelReopen}>
      <section className="lock-card glass" onClick={e => e.stopPropagation()} role="dialog" aria-label="Go back to an earlier stage">
        <div className="lock-icon" aria-hidden="true" style={{ fontSize: 40 }}>↩</div>
        <h2>Go back to {STAGE_NAMES[n - 1]}?</h2>
        <p className="lock-sub">Change only this step, like adding a forgotten battery. Everything else you confirmed stays as it is. Like a real change request, it costs money, and the later you are, the more it costs. Afterwards the pre-launch checks run again, and you top up propellant if the change needs it.</p>
        <div className="lock-todo"><div className="label">Change request fee</div><b style={{ fontSize: 24, color: 'var(--amber)' }}>{money(fee)}</b>
          <p className="tag" style={{ margin: '4px 0 0' }}>NASA studies show late design changes cost far more than early ones (NTRS 20150008247).</p></div>
        <div className="lock-foot"><button className="btn" onClick={A.cancelReopen}>Stay here</button><button className="btn primary" onClick={() => A.reopenStage(n)}>Open change request: {money(fee)}</button></div>
      </section>
    </div>
  );
}

function ChangeBanner({ s }) {
  if (!s.changeMode && !s.topUp) return null;
  if (s.topUp) return <div className="change-banner glass"><b>⛽ Top up propellant</b><span>Your design changed. Go to the Fueling Station and fill to the green band.</span><button className="btn small" onClick={() => A.travel('propulsion')}>Take me there</button></div>;
  const n = s.changeMode.stage, room = { 2: 'imaging', 3: 'power', 4: 'launch', 5: 'propulsion' }[n];
  return (
    <div className="change-banner glass">
      <b>✎ Change request: {STAGE_NAMES[n - 1]}</b>
      <span>Change what you need. Nothing else has to be redone.</span>
      <button className="btn small" onClick={() => A.travel(room)}>Take me there</button>
      <button className="btn small primary" onClick={A.finishChange}>Done ✓</button>
    </div>
  );
}

function FullscreenBtn() {
  const [fs, setFs] = React.useState(!!document.fullscreenElement);
  React.useEffect(() => { const on = () => setFs(!!document.fullscreenElement); document.addEventListener('fullscreenchange', on); return () => document.removeEventListener('fullscreenchange', on); }, []);
  if (!document.documentElement.requestFullscreen) return null;
  return <button className="btn" onClick={goFullscreen} title="Full screen (F11 also works)">{fs ? '⤡ Exit full screen' : '⤢ Full screen'}</button>;
}

/** Speech bubbles over the review board: each reviewer says GO or NO-GO and why. */
function ReviewBubbles() {
  const h = useHud();
  const list = (h.reviewBubbles || []).slice().sort((a, b) => a.x - b.x);
  if (!list.length) return null;
  // lay the bubbles out side by side above the reviewers, so they never overlap; a line joins each to its reviewer
  const W = window.innerWidth, gap = 8;
  // stay inside the free middle column, under the task card
  const c = document.querySelector('.hud-center'), t = document.querySelector('.hud-center .tasks');
  const cr = c ? c.getBoundingClientRect() : { left: 20, right: W - 20, top: 90 };
  const bw = Math.max(120, Math.min(210, (cr.right - cr.left - gap * (list.length - 1)) / list.length));
  const total = list.length * bw + (list.length - 1) * gap;
  const mid = list.reduce((a, b) => a + b.x, 0) / list.length;
  const left = Math.max(cr.left, Math.min(cr.right - total, mid - total / 2));
  const top = (t ? t.getBoundingClientRect().bottom : cr.top) + 10;
  return (
    <div className="rv-bubbles passthru">
      <svg className="rv-lines" width={W} height={window.innerHeight}>
        {list.map((b, k) => { const cx = left + k * (bw + gap) + bw / 2; return <line key={b.i} x1={cx} y1={top + 40} x2={b.x} y2={b.y} className={b.go ? 'go' : 'nogo'} />; })}
      </svg>
      {list.map((b, k) => (
        <div key={b.i} className={'rv-bubble ' + (b.go ? 'go' : 'nogo')} style={{ left: left + k * (bw + gap), top, width: bw, animationDelay: k * 0.12 + 's' }}>
          <div className="rv-top"><b>{b.go ? 'GO' : 'NO-GO'}</b><span>{b.role}</span>{b.risk && <em>{b.risk} risk</em>}</div>
          <p>{b.text}</p>
        </div>
      ))}
    </div>
  );
}

function FlightBadge() {
  const h = useHud();
  if (!h.flying) return null;
  return <div className="flight-badge glass" role="status"><span className="fb-dot"></span><b>Flight mode</b><span>Space up · Q down · F to land</span></div>;
}

function PickerHost({ s }) {
  const id = s.panel;
  if (!id) return null;
  const st = stationById(id);
  if (!isPickerStation(id)) return !isFree(s) && st.stage > s.stage ? <LockedStation s={s} station={st} key={'lock' + id} /> : null;
  if (!isFree(s) && st.stage > s.stage) return <LockedStation s={s} station={st} key={'lock' + id} />;
  return <Picker s={s} station={id} key={id} />;
}

export function HUD({ s }) {
  const step = stepOf(s);
  const focus = step && step.focus;
  if (s.screen === 'launching') return <LaunchOverlay />; // nothing else on screen during the launch
  const game = s.screen === 'game';
  // Layout regions never overlap: top bar, three columns, bottom bar. Each column scrolls inside itself.
  return (
    <div className={'hud' + (focus === 'info' ? ' tut-info' : '') + (isTouch ? ' is-touch' : '')}>
      <TopBar s={s} />
      <div className="hud-grid">
        <div className="hud-left">
          <Resources s={s} focus={focus === 'res'} />
        </div>
        <div className="hud-center">
          {game && <TasksCard s={s} focus={focus === 'tasks'} />}
          {game && <TutorialCard s={s} />}
        </div>
        <div className="hud-right">
          {game && <MiniMap s={s} />}
          {game && <StationPanel s={s} />}
          <LogPanel s={s} />
        </div>
      </div>
      <div className="hud-bottom">
        <div className="hb-left">
          {s.tutorial == null && !isTouch && <div className="controls glass">
            {s.camMode === 'auto' ? <><span><b>W/S</b> forward · back</span><span><b>A/D</b> turn</span></> : <span><b>WASD</b> move</span>}<span><b>Drag</b> look</span><span><b>Shift</b> run</span><span><b>Space</b> jump{s.firstPerson ? '' : ' · hold to fly'}</span>{!s.firstPerson && <span><b>F</b> flight mode</span>}<span><b>E</b> interact</span><span><b>V</b> view (3rd · 1st · hands)</span><span><b>C</b> auto/free camera</span><span><b>M</b> map</span><span><b>L</b> log</span>
          </div>}
        </div>
        <div className="hb-center">{game && <FlightBadge />}{game && <Prompt />}</div>
        <div className="hb-right"><Settings s={s} /></div>
      </div>
      {game && <Pointer />}
      {game && <ReviewBubbles />}
      <Toasts s={s} />
      <ReopenModal s={s} />
      {game && <ChangeBanner s={s} />}
      <SignoffModal s={s} />
      {game && <PickerHost s={s} />}
      {game && s.showMap && <FullMap s={s} />}
      <WarpOverlay />
    </div>
  );
}
