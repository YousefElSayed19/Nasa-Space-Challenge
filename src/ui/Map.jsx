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
  return (
    <section className="minimap glass" onClick={A.toggleMap} title="Open the map (M)">
      <div className="mm-head"><b>{here ? `${here.icon} ${here.label}` : 'Map'}</b><span className="tag">M</span></div>
      <Plan me={h.me} guideRoom={h.guideRoom} />
    </section>
  );
}

/** Full map: click a room to travel there through a portal. */
export function FullMap({ s }) {
  const h = useHud();
  const next = h.guideRoom ? roomById(h.guideRoom) : null;
  return (
    <div className="picker-ov" onClick={A.toggleMap}>
      <section className="fullmap glass" onClick={e => e.stopPropagation()} role="dialog" aria-label="Facility map">
        <div className="pk-head"><div className="pk-title"><div className="label">Facility map</div><b>Click a room to travel there</b></div>
          <button className="x" aria-label="Close" onClick={A.toggleMap}>✕</button></div>
        <Plan me={h.me} guideRoom={h.guideRoom} big onRoom={id => (h.me && h.me.room === id ? A.toggleMap() : A.travel(id))} />
        <div className="fm-foot">
          {next && <button className="btn primary" onClick={() => A.travel(next.id)}>Travel to the next task: {next.icon} {next.label}</button>}
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
