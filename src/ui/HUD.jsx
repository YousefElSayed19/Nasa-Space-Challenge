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
import { stationById, STAGE_NAMES } from '../engine/index.js';
import { A } from '../state/actions.js';
import { Sound } from '../audio/sound.js';
import { partById, isFree, money } from '../engine/index.js';

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
      {s.screen === 'game' && <button key={s.camMode} className={'btn cam-btn flash ' + s.camMode} onClick={A.toggleCamera} title="C: switch between a camera that follows behind you and a free camera">🎥 {s.camMode === 'auto' ? 'Auto camera' : 'Free camera'}</button>}
      <button className="btn" onClick={() => A.setPrefs({ graphics: s.graphics === 'low' ? 'high' : 'low' })}>{s.graphics === 'low' ? 'Low graphics' : 'High graphics'}</button>
      {isTouch && <button className="btn" onClick={goFullscreen}>Fullscreen</button>}
      <button className="btn" onClick={A.toggleGlossary}>Help</button>
      {s.screen === 'game' && <button className="btn" onClick={A.backToMenu}>Menu</button>}
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
  if (!['payload', 'systems', 'board'].includes(id)) return !isFree(s) && st.stage > s.stage ? <LockedStation s={s} station={st} key={'lock' + id} /> : null;
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
          {game && <TutorialCard s={s} />}
        </div>
        <div className="hud-center">
          {game && <TasksCard s={s} focus={focus === 'tasks'} />}
          <Toasts s={s} />
        </div>
        <div className="hud-right">
          {game && <StationPanel s={s} />}
          <LogPanel s={s} />
        </div>
      </div>
      <div className="hud-bottom">
        <div className="hb-left">
          {s.tutorial == null && !isTouch && <div className="controls glass">
            <span><b>WASD</b> move</span><span><b>Drag</b> look</span><span><b>Shift</b> run</span><span><b>Space</b> jump · hold to fly</span><span><b>F</b> flight mode</span><span><b>E</b> interact</span><span><b>V</b> 1st person</span><span><b>C</b> auto/free camera</span><span><b>L</b> log</span>
          </div>}
        </div>
        <div className="hb-center">{game && <FlightBadge />}{game && <Prompt />}</div>
        <div className="hb-right"><Settings s={s} /></div>
      </div>
      {game && <Pointer />}
      <SignoffModal s={s} />
      {game && <PickerHost s={s} />}
    </div>
  );
}
