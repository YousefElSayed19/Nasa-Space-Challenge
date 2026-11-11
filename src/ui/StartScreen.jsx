import React from 'react';
import { A } from '../state/actions.js';
import { loadJSON } from '../state/store.js';
import OPTIONS from '../data/character.json';

function Swatches({ label, list, value, onPick }) {
  return (
    <div className="opt">
      <span className="label">{label}</span>
      <div className="swatches">
        {list.map(c => <button key={c} className={'sw' + (value === c ? ' sel' : '')} style={{ background: c }} aria-label={`${label} ${c}`} aria-pressed={value === c} onClick={() => onPick(c)}></button>)}
      </div>
    </div>
  );
}
function Segmented({ label, list, value, onPick, colors }) {
  return (
    <div className="opt">
      <span className="label">{label}</span>
      <div className="seg" role="radiogroup" aria-label={label}>
        {list.map(o => (
          <button key={o.id} role="radio" aria-checked={value === o.id} className={value === o.id ? 'on' : ''} onClick={() => onPick(o.id)}>
            {colors && <i style={{ background: o.color }}></i>}{o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

const pick = arr => arr[Math.floor(Math.random() * arr.length)];
function randomLook() {
  return {
    suit: pick(OPTIONS.suit), accent: pick(OPTIONS.accent), visor: pick(OPTIONS.visor).id, helmet: pick(OPTIONS.helmet).id,
    body: pick(OPTIONS.body).id, height: pick(OPTIONS.height).id, pack: pick(OPTIONS.pack).id, patch: pick(OPTIONS.patch).id, gloves: pick(OPTIONS.gloves).id,
  };
}

function NameStep({ s }) {
  const p = s.profile;
  const ok = p.nick.trim().length >= 2;
  const best = +loadJSON('mf-best', 0) || 0;
  return (
    <div className="start">
      <div className="start-card glass">
        <h1 className="title">MissionForge</h1>
        <p className="tagline">Build a spacecraft with your hands. Fuel it, launch it, and find out exactly which of your decisions made it fly or fail.</p>
        <label className="field"><span className="label">Nickname</span>
          <input value={p.nick} maxLength={18} placeholder="A nickname, not your real name" autoFocus
            onChange={e => A.setProfile({ nick: e.target.value })}
            onKeyDown={e => { if (e.key === 'Enter' && ok) A.setStartStep('look'); }} />
        </label>
        <div className="label" style={{ marginBottom: 6 }}>Campaign</div>
        <div className="modes">
          <button className="mode" disabled><span>Lunar Orbiter<small>Mission 1, next build</small></span></button>
          <button className="mode sel"><span>Mars Orbiter<small>Mission 2, playable in this build</small></span><span className="tag">Solo, 4 roles</span></button>
          <button className="mode" disabled><span>Europa Flyby Explorer<small>Mission 3, next build</small></span></button>
        </div>
        <button className="btn primary wide" disabled={!ok} onClick={() => A.setStartStep('look')}>Design your engineer</button>
        <p className="fine">{best ? `Your best score: ${best}. ` : ''}Your profile is stored only in this browser. Built for NASA Space Apps Cairo 2026; not reviewed or endorsed by NASA. Numbers are simplified game units; each “?” shows the real value and its source.</p>
      </div>
    </div>
  );
}

function LookStep({ s }) {
  const p = s.profile;
  const set = patch => A.setProfile(patch);
  return (
    <div className="creator">
      <section className="creator-panel glass" aria-label="Character creator">
        <div className="creator-head">
          <div><h2>Your engineer</h2><p className="sub">Drag the character to turn it around.</p></div>
          <button className="btn small" onClick={() => set(randomLook())}>Randomize</button>
        </div>
        <div className="creator-scroll">
          <div className="group-title">Suit</div>
          <Swatches label="Suit color" list={OPTIONS.suit} value={p.suit} onPick={c => set({ suit: c })} />
          <Swatches label="Accent color" list={OPTIONS.accent} value={p.accent} onPick={c => set({ accent: c })} />
          <Segmented label="Gloves and boots" list={OPTIONS.gloves} value={p.gloves} onPick={v => set({ gloves: v })} />
          <Segmented label="Chest patch" list={OPTIONS.patch} value={p.patch} onPick={v => set({ patch: v })} />
          <div className="group-title">Helmet</div>
          <Segmented label="Helmet style" list={OPTIONS.helmet} value={p.helmet} onPick={v => set({ helmet: v })} />
          <Segmented label="Visor tint" list={OPTIONS.visor} value={p.visor} onPick={v => set({ visor: v })} colors />
          <div className="group-title">Build and gear</div>
          <Segmented label="Body" list={OPTIONS.body} value={p.body} onPick={v => set({ body: v })} />
          <Segmented label="Height" list={OPTIONS.height} value={p.height} onPick={v => set({ height: v })} />
          <Segmented label="Backpack" list={OPTIONS.pack} value={p.pack} onPick={v => set({ pack: v })} />
        </div>
        <div className="foot">
          <button className="btn" onClick={() => A.setStartStep('name')}>Back</button>
          <button className="btn primary" onClick={A.start}>Enter the hangar</button>
        </div>
      </section>
      <div className="nameplate glass passthru">{p.nick}</div>
    </div>
  );
}

export function StartScreen({ s }) {
  return s.startStep === 'look' ? <LookStep s={s} /> : <NameStep s={s} />;
}
