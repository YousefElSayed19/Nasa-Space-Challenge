import React from 'react';
import { A, unlockedMissions } from '../state/actions.js';
import { MISSIONS } from '../engine/index.js';
import { topScores } from '../state/leaderboard.js';
import { net, onNet, hostRoom, joinRoom, leaveRoom, startGame, inviteLink } from '../state/net.js';
import { ROLES } from '../engine/index.js';
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

const MODES = [
  { id: 'campaign', name: 'Campaign', note: 'Four missions that unlock in order. Stages lock as you go.' },
  { id: 'sandbox', name: 'Sandbox', note: 'Any mission, no budget limit, no locks. Experiment freely.' },
  { id: 'replay', name: 'Replay a real mission', note: 'Start from the real NASA design, change it, and compare.' },
];

/** Play solo, host an online room (code + invite link), or join one. */
function OnlinePanel({ s, ok }) {
  const [, force] = React.useState(0);
  React.useEffect(() => onNet(() => force(x => x + 1)), []);
  const urlRoom = new URLSearchParams(location.search).get('room') || '';
  const [tab, setTab] = React.useState(urlRoom ? 'join' : net.role === 'host' ? 'host' : 'solo');
  const [code, setCode] = React.useState(urlRoom.toUpperCase());
  const [busy, setBusy] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const name = s.profile.nick.trim();
  const doHost = async () => { setBusy(true); try { await hostRoom(name, s.profile); } catch (e) {} setBusy(false); };
  const doJoin = async () => { setBusy(true); try { await joinRoom(code, name, s.profile); } catch (e) {} setBusy(false); };
  const startOnline = () => {
    const byRole = [...net.players].sort((a, b) => a.role - b.role);
    const team = byRole.filter(p => p.role !== 0).map(p => p.name);
    A.setTeamNames(team);
    startGame({ missionId: s.missionId, mode: s.mode, team });
    A.start(); A.watchIntroThenPlay();
  };
  const choose = t => { if (t === 'solo' && net.role !== 'solo') leaveRoom(); setTab(t); };
  return (
    <div className="online">
      <div className="label">How do you want to play?</div>
      <div className="seg online-tabs">
        <button className={tab === 'solo' ? 'on' : ''} onClick={() => choose('solo')}>🧑‍🚀 Solo or same screen</button>
        <button className={tab === 'host' ? 'on' : ''} onClick={() => choose('host')}>📡 Host online</button>
        <button className={tab === 'join' ? 'on' : ''} onClick={() => choose('join')}>🔗 Join online</button>
      </div>
      {tab === 'host' && (
        net.role !== 'host' ? (
          <div className="online-box">
            <p className="tag">Create a room. Friends join with the code or the invite link. Each player takes one of the four roles.</p>
            <button className="btn primary" disabled={!ok || busy} onClick={doHost}>{busy ? 'Creating…' : 'Create room'}</button>
            {!ok && <span className="tag"> Enter your name first.</span>}
          </div>
        ) : (
          <div className="online-box">
            <div className="room-code">Room code <b>{net.code}</b></div>
            <div className="invite">
              <input readOnly value={inviteLink(net.code)} onFocus={e => e.target.select()} />
              <button className="btn small" onClick={() => { navigator.clipboard && navigator.clipboard.writeText(inviteLink(net.code)); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>{copied ? 'Copied ✓' : 'Copy link'}</button>
            </div>
            <PlayerList />
            <button className="btn primary wide" disabled={!ok} onClick={startOnline}>Start the mission for everyone ({net.players.length} player{net.players.length > 1 ? 's' : ''})</button>
          </div>
        )
      )}
      {tab === 'join' && (
        net.role !== 'guest' ? (
          <div className="online-box">
            <div className="join-row">
              <input className="code-input" maxLength={4} placeholder="CODE" value={code} onChange={e => setCode(e.target.value.toUpperCase())} />
              <button className="btn primary" disabled={!ok || code.length !== 4 || busy} onClick={doJoin}>{busy ? 'Joining…' : 'Join'}</button>
            </div>
            {!ok && <span className="tag">Enter your name first.</span>}
          </div>
        ) : (
          <div className="online-box"><div className="room-code">Joined room <b>{net.code}</b></div><PlayerList /><p className="tag">Waiting for the host to start the mission…</p></div>
        )
      )}
      {net.status && tab !== 'solo' && <p className="net-status">{net.status}</p>}
    </div>
  );
}
function PlayerList() {
  return (
    <ul className="players-list">
      {[0, 1, 2, 3].map(r => { const p = net.players.find(x => x.role === r); return <li key={r} className={p ? 'on' : ''}><span>{ROLES[r]}</span><b>{p ? p.name + (p.id === net.myId ? ' (you)' : '') : r === 0 ? '' : 'open: the host signs'}</b></li>; })}
    </ul>
  );
}

function NameStep({ s }) {
  const p = s.profile;
  const ok = p.nick.trim().length >= 2;
  const best = +loadJSON('mf-best', 0) || 0;
  const unlocked = unlockedMissions();
  const players = 1 + s.teamNames.length;
  const isLocked = m => s.mode === 'campaign' && !unlocked.includes(m.id);
  const missionOk = !isLocked(MISSIONS.find(m => m.id === s.missionId));
  const setPlayers = n => A.setTeamNames(Array.from({ length: n - 1 }, (_, i) => s.teamNames[i] || ''));
  const setName = (i, v) => { const t = [...s.teamNames]; t[i] = v; A.setTeamNames(t); };
  return (
    <div className="start">
      <div className="start-card glass">
        <h1 className="title">MissionForge</h1>
        <p className="tagline">Build a spacecraft with your hands. Fuel it, launch it, and find out exactly which of your decisions made it fly or fail.</p>
        <label className="field"><span className="label">Your nickname</span>
          <input value={p.nick} maxLength={18} placeholder="A nickname, not your real name" autoFocus
            onChange={e => A.setProfile({ nick: e.target.value })}
            onKeyDown={e => { if (e.key === 'Enter' && ok && missionOk) A.setStartStep('look'); }} />
        </label>
        <div className="opt">
          <span className="label">Players on this screen</span>
          <div className="seg">{[1, 2, 3, 4].map(n => <button key={n} className={players === n ? 'on' : ''} onClick={() => setPlayers(n)}>{n === 1 ? 'Solo' : n}</button>)}</div>
          {players > 1 && (
            <div className="teamnames">
              {s.teamNames.map((t, i) => <input key={i} value={t} maxLength={18} placeholder={`Player ${i + 2} nickname`} onChange={e => setName(i, e.target.value)} />)}
              <span className="tag">The four roles are shared between players. Every stage needs all four roles to approve before it locks.</span>
            </div>
          )}
        </div>
        <div className="opt">
          <span className="label">Mode</span>
          <div className="seg">{MODES.map(m => <button key={m.id} className={s.mode === m.id ? 'on' : ''} onClick={() => A.setMode(m.id)}>{m.name}</button>)}</div>
          <span className="tag">{MODES.find(m => m.id === s.mode).note}</span>
        </div>
        <div className="label" style={{ marginBottom: 6 }}>Mission</div>
        <div className="modes">
          {MISSIONS.map(m => {
            const locked = isLocked(m);
            return (
              <button key={m.id} className={'mode' + (s.missionId === m.id ? ' sel' : '')} disabled={locked} onClick={() => A.setMissionId(m.id)}>
                <span>{m.order}. {m.name}<small>{locked ? `Finish the ${MISSIONS.find(x => x.id === m.unlockAfter).name} to unlock` : `Inspired by ${m.inspired}. ${m.trip}.`}</small></span>
                <span className="tag">{['Easier', 'Medium', 'Medium-hard', 'Hard'][m.order - 1]}{topScores(m.id, 1)[0] ? ` · best ${topScores(m.id, 1)[0].score}` : ''}</span>
              </button>
            );
          })}
        </div>
        <OnlinePanel s={s} ok={ok} />
        {net.role !== 'guest' && <button className="btn primary wide" disabled={!ok || !missionOk} onClick={() => A.setStartStep('look')}>{net.role === 'host' ? 'Design your engineer first (optional)' : 'Design your engineer'}</button>}
        <p className="fine">{best ? `Your best score: ${best}. ` : ''}Profiles and saved designs stay in this browser. Built for NASA Space Apps Cairo 2026; not reviewed or endorsed by NASA. Numbers are simplified game units; each “?” shows the real value and its source.</p>
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
          <button className="btn primary" onClick={A.enter}>{s.mode === 'campaign' ? '▶ Watch the intro and begin' : 'Enter the facility'}</button>
        </div>
      </section>
      <div className="nameplate glass passthru">{p.nick}</div>
    </div>
  );
}

export function StartScreen({ s }) {
  return s.startStep === 'look' ? <LookStep s={s} /> : <NameStep s={s} />;
}
