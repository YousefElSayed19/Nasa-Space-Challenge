import React, { useEffect, useRef } from 'react';
import { useHud } from './hooks.js';
import { A } from '../state/actions.js';
import { FACILITY, ROOMS, roomById } from '../engine/index.js';

const VB = { x: -28.5, z: -24.5, w: 57, h: 48.5 };

function Plan({ me, guideRoom, big, onRoom }) {
  return (
    <svg viewBox={`${VB.x} ${VB.z} ${VB.w} ${VB.h}`} className={'plan' + (big ? ' big' : '')} aria-label="Facility map">
      {ROOMS.map(r => {
        const next = r.id === guideRoom && (!me || me.room !== r.id), here = me && me.room === r.id;
        return (
          <g key={r.id} className={'room' + (next ? ' next' : '') + (here ? ' here' : '') + (onRoom ? ' click' : '')} onClick={onRoom ? () => onRoom(r.id) : undefined}>
            <rect x={r.x0 + 0.3} y={r.z0 + 0.3} width={r.x1 - r.x0 - 0.6} height={r.z1 - r.z0 - 0.6} rx="1.2" style={{ '--c': r.color }} />
            {next && <rect className="pulse" x={r.x0 + 0.3} y={r.z0 + 0.3} width={r.x1 - r.x0 - 0.6} height={r.z1 - r.z0 - 0.6} rx="1.2" />}
            <text x={(r.x0 + r.x1) / 2} y={(r.z0 + r.z1) / 2 - (big ? 0.6 : 0)} className="ico">{r.icon}</text>
            {big && <text x={(r.x0 + r.x1) / 2} y={(r.z0 + r.z1) / 2 + 2.2} className="lbl">{r.label}</text>}
            {next && <text x={(r.x0 + r.x1) / 2} y={r.z0 + (big ? 2.2 : 3)} className="tag">NEXT</text>}
          </g>
        );
      })}
      {FACILITY.rooms.map(r => <rect key={'d' + r.id} className="door" x={r.door[0] - 1.4} y={r.door[1] - 1.4} width="2.8" height="2.8" rx="0.6" />)}
      {me && (
        <g transform={`translate(${me.x} ${me.z}) rotate(${-me.f * 180 / Math.PI})`} className="me">
          <circle r="2.6" className="halo" /><circle r="1.1" /><path d="M0 2.4 L1 0.6 L-1 0.6 Z" />
        </g>
      )}
    </svg>
  );
}

/** Corner minimap: your dot, the room you are in, and the room of the next task (pulsing). Click to open the full map. */
export function MiniMap({ s }) {
  const h = useHud();
  const last = useRef(null);
  useEffect(() => {
    // alert when the next task moves to another room
    if (h.guideRoom && h.guideRoom !== last.current && h.me && h.me.room !== h.guideRoom && last.current !== null) {
      const r = roomById(h.guideRoom);
      if (r) A.toast(`Next task: ${r.icon} ${r.label}. Follow the arrows, or press M to travel there.`);
    }
    last.current = h.guideRoom;
  }, [h.guideRoom]);
  const here = h.me ? roomById(h.me.room) : null;
  const next = h.guideRoom && h.me && h.me.room !== h.guideRoom ? roomById(h.guideRoom) : null;
  if (s.mapHidden) {
    return (
      <button className="minimap-chip glass" onClick={A.toggleMiniMap} title="Show the minimap">
        🗺 {here ? here.label : 'Map'}{next && <span className="mm-next"> · next: {next.icon}</span>}
      </button>
    );
  }
  return (
    <section className="minimap glass">
      <div className="mm-head">
        <b>{here ? `${here.icon} ${here.label}` : 'Map'}</b>
        <span className="mm-btns">
          <button onClick={A.toggleMap} title="Full map (M)">⤢</button>
          <button onClick={A.toggleMiniMap} title="Hide the minimap">–</button>
        </span>
      </div>
      <div className="mm-plan" onClick={A.toggleMap} title="Open the full map (M)"><Plan me={h.me} guideRoom={h.guideRoom} /></div>
      {next && <div className="mm-next-line">Next: {next.icon} {next.label}</div>}
    </section>
  );
}

/** Full map: a clean plan with wrapped room names, plus a room list. Click a room to travel there through a portal. */
export function FullMap({ s }) {
  const h = useHud();
  const next = h.guideRoom ? roomById(h.guideRoom) : null;
  const here = h.me ? h.me.room : null;
  const go = id => (here === id ? A.toggleMap() : A.travel(id));
  const P = (x, w) => ((x - VB.x) / VB.w) * 100, Q = (z, d) => ((z - VB.z) / VB.h) * 100;
  return (
    <div className="picker-ov" onClick={A.toggleMap}>
      <section className="fullmap glass" onClick={e => e.stopPropagation()} role="dialog" aria-label="Facility map">
        <div className="pk-head"><div className="pk-title"><div className="label">Facility map</div><b>Click a room to travel there</b></div>
          <button className="x" aria-label="Close" onClick={A.toggleMap}>✕</button></div>
        <div className="fm-body">
          <div className="fm-plan" style={{ aspectRatio: `${VB.w} / ${VB.h}` }}>
            {ROOMS.map(r => {
              const isNext = next && r.id === next.id && here !== r.id, isHere = here === r.id;
              return (
                <button key={r.id} className={'fm-room' + (isNext ? ' next' : '') + (isHere ? ' here' : '') + (r.id === 'hall' ? ' hall' : '')}
                  style={{ left: P(r.x0) + 0.4 + '%', top: Q(r.z0) + 0.5 + '%', width: (r.x1 - r.x0) / VB.w * 100 - 0.8 + '%', height: (r.z1 - r.z0) / VB.h * 100 - 1 + '%', '--c': r.color }}
                  onClick={() => go(r.id)} title={isHere ? 'You are here' : 'Travel here'}>
                  {isNext && <span className="fm-tag">NEXT</span>}
                  {isHere && <span className="fm-tag here">YOU</span>}
                  <span className="fm-ico">{r.icon}</span>
                  <span className="fm-name">{r.label}</span>
                </button>
              );
            })}
            {FACILITY.rooms.map(r => <span key={'d' + r.id} className="fm-door" style={{ left: P(r.door[0]) + '%', top: Q(r.door[1]) + '%' }}></span>)}
            {h.me && <span className="fm-me" style={{ left: P(h.me.x) + '%', top: Q(h.me.z) + '%', transform: `translate(-50%,-50%) rotate(${-h.me.f * 180 / Math.PI}deg)` }}><i></i></span>}
          </div>
          <ul className="fm-list">
            {ROOMS.map(r => (
              <li key={r.id}><button className={(next && r.id === next.id ? 'next ' : '') + (here === r.id ? 'here' : '')} onClick={() => go(r.id)} style={{ '--c': r.color }}>
                <span>{r.icon}</span>{r.label}{here === r.id ? <em>you are here</em> : next && r.id === next.id ? <em className="n">next task</em> : null}
              </button></li>
            ))}
          </ul>
        </div>
        <div className="fm-foot">
          {next && here !== next.id && <button className="btn primary" onClick={() => A.travel(next.id)}>Travel to the next task: {next.icon} {next.label}</button>}
          <span className="tag">Or walk: follow the gold arrows from door to door.</span>
        </div>
      </section>
    </div>
  );
}

export function WarpOverlay() {
  const h = useHud();
  return <div className={'warp' + (h.warp ? ' on' : '')} aria-hidden="true"></div>;
}
