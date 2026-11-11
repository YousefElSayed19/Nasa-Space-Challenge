import React from 'react';
import { TopBar } from './TopBar.jsx';
import { Resources } from './Resources.jsx';
import { Prompt } from './Prompt.jsx';
import { StationPanel } from './Panels.jsx';
import { A } from '../state/actions.js';
import { Sound } from '../audio/sound.js';
import { partById } from '../engine/index.js';

function objectiveText(s) {
  if (s.carrying) return 'Carry the part to the Assembly Cradle, then hold E to install it.';
  return ({
    1: 'Walk to Mission Control and read the briefing.',
    2: 'Pick instruments at the Payload Bay and install them. Confirm the payload when ready.',
    3: 'Fit a solar array, antenna, battery and shielding from the Systems Rack.',
    4: 'Choose a rocket at the Launch Vehicle Board.',
    5: 'Fill the tank at the Fueling Station. Aim for the target line.',
    6: 'Hold the Go/No-Go review at the console.',
  })[s.stage] || '';
}

const GOOD_UP = new Set(['power supply', 'downlink', 'capacity to Mars']);

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
                  <span key={k} className={GOOD_UP.has(k) ? (v > 0 ? 'neg' : 'pos') : (v > 0 ? 'pos' : 'neg')}>{v > 0 ? '+' : ''}{v} {k}</span>
                ))}
                {e.fee ? <span className="pos">change request {e.fee}</span> : null}
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
    </div>
  );
}

export function HUD({ s }) {
  return (
    <>
      <TopBar s={s} />
      <Resources s={s} />
      {s.screen === 'game' && <div className="objective glass passthru" key={s.stage + (s.carrying || '')}>{objectiveText(s)}</div>}
      <Toasts s={s} />
      {s.screen === 'game' && <Prompt />}
      {s.carrying && <div className="carry glass passthru">Carrying {partById(s.carrying).name}. Press X to put it back.</div>}
      <div className="side">
        {s.screen === 'game' && <StationPanel s={s} />}
        <LogPanel s={s} />
      </div>
      <div className="controls glass passthru">
        <span><b>WASD</b> move</span><span><b>Drag</b> look</span><span><b>Shift</b> run</span><span><b>E</b> interact</span><span><b>V</b> camera</span><span><b>L</b> log</span>
      </div>
    </>
  );
}
