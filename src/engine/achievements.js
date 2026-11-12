// Badges earned on a flight (a suggested extra in the challenge: competitive and replay value).
import { MISSION, skippedChecks } from './model.js';

export function badgesFor(s, r) {
  const R = r.R, ok = r.outcome !== 'fail';
  const list = [
    { id: 'margin-master', icon: '🛡️', title: 'Margin master', desc: 'Kept 25% headroom on mass, power and data.', earned: ok && R.mass.h >= 0.25 && R.power.h >= 0.25 && R.data.h >= 0.25 },
    { id: 'by-the-book', icon: '🔧', title: 'By the book', desc: 'Ran every pre-launch check.', earned: skippedChecks(s).length === 0 },
    { id: 'listened', icon: '🎧', title: 'Listened to the team', desc: 'Launched with all four roles at GO.', earned: s.overruled === 0 },
    { id: 'frozen-design', icon: '📐', title: 'Right first time', desc: 'No change requests in a campaign.', earned: s.mode === 'campaign' && s.changeCount === 0 && ok },
    { id: 'team-voice', icon: '🗣️', title: 'Team voice', desc: 'Raised an objection at a team sign-off.', earned: (s.objections || 0) > 0 },
    { id: 'featherweight', icon: '🪶', title: 'Featherweight', desc: 'Launched with 30% or more mass headroom.', earned: ok && R.mass.h >= 0.3 },
    { id: 'flawless', icon: '⭐', title: 'Flawless', desc: 'Scored 95 or more.', earned: r.score >= 95 },
    { id: 'jupiter', icon: '🪐', title: 'Survived Jupiter', desc: 'Completed the Europa mission.', earned: MISSION.id === 'europa' && r.outcome === 'ok' },
  ];
  return list;
}
