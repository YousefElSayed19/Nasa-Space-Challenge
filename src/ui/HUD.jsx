import React from 'react';
import { TopBar } from './TopBar.jsx';
import { Resources } from './Resources.jsx';
import { Prompt } from './Prompt.jsx';
import { StationPanel, SignoffModal } from './Panels.jsx';
import { TutorialCard } from './Tutorial.jsx';
import { TasksCard, Pointer, LaunchOverlay } from './Guide.jsx';
import { stepOf } from '../state/tutorial.js';
import { Picker } from './Picker.jsx';
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

export function Toasts({ s }) {
  return <div className="toasts passthru" aria-live="polite">{s.toasts.map(t => <div key={t.id} className={'toast glass ' + t.kind}>{t.text}</div>)}</div>;
}

export function Settings({ s }) {
  return (
    <div className="settings">
      <button className="btn" aria-pressed={s.muted} onClick={() => { Sound.hum(false); A.setPrefs({ muted: !s.muted }); }}>{s.muted ? 'Sound off' : 'Sound on'}</button>
      <button className="btn" onClick={() => A.setPrefs({ graphics: s.graphics === 'low' ? 'high' : 'low' })}>{s.graphics === 'low' ? 'Low graphics' : 'High graphics'}</button>
      <button className="btn" onClick={A.toggleGlossary}>Help</button>
      {s.screen === 'game' && <button className="btn" onClick={A.backToMenu}>Menu</button>}
    </div>
  );
}

function PickerHost({ s }) {
  const id = s.panel;
  if (!['payload', 'systems', 'board'].includes(id)) return null;
  const st = stationById(id);
  if (!isFree(s) && st.stage > s.stage) {
    return (
      <div className="picker-ov" onClick={A.close}><section className="picker small glass" onClick={e => e.stopPropagation()}>
        <h2>{st.label}</h2><p className="sub">This station opens at stage {st.stage}, {STAGE_NAMES[st.stage - 1]}. Finish {STAGE_NAMES[s.stage - 1].toLowerCase()} first.</p>
        <div className="foot"><span></span><button className="btn" onClick={A.close}>OK</button></div>
      </section></div>
    );
  }
  return <Picker s={s} station={id} key={id} />;
}

export function HUD({ s }) {
  const step = stepOf(s);
  const focus = step && step.focus;
  if (s.screen === 'launching') return <LaunchOverlay />; // nothing else on screen during the launch
  return (
    <div className={focus === 'info' ? 'tut-info' : ''}>
      <TopBar s={s} />
      <Resources s={s} focus={focus === 'res'} />
      {s.screen === 'game' && <TasksCard s={s} focus={focus === 'tasks'} />}
      {s.screen === 'game' && <Pointer />}
      <Toasts s={s} />
      {s.screen === 'game' && <Prompt />}
      {s.screen === 'game' && <TutorialCard s={s} />}
      <SignoffModal s={s} />
      <div className="side">
        {s.screen === 'game' && <StationPanel s={s} />}
        <LogPanel s={s} />
      </div>
      {s.screen === 'game' && <PickerHost s={s} />}
      {s.tutorial == null && <div className="controls glass passthru">
        <span><b>WASD</b> move</span><span><b>Drag</b> look</span><span><b>Shift</b> run</span><span><b>Space</b> jump</span><span><b>E</b> interact</span><span><b>V</b> camera</span><span><b>L</b> log</span>
      </div>}
    </div>
  );
}
