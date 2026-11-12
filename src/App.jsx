import React from 'react';
import { useGame } from './ui/hooks.js';
import { HUD, Settings } from './ui/HUD.jsx';
import { StartScreen } from './ui/StartScreen.jsx';
import { MissionScreen } from './ui/MissionScreen.jsx';
import { ReportScreen } from './ui/ReportScreen.jsx';
import { Glossary } from './ui/Glossary.jsx';
import { Intro, ReplayNotice } from './ui/Intro.jsx';

export function App() {
  const s = useGame();
  return (
    <>
      {s.screen === 'start' && <StartScreen s={s} />}
      {s.screen === 'intro' && <Intro s={s} />}
      {s.screen === 'game' && <ReplayNotice s={s} />}
      {(s.screen === 'game' || s.screen === 'launching') && <HUD s={s} />}
      {s.screen === 'mission' && <MissionScreen s={s} />}
      {s.screen === 'report' && <ReportScreen s={s} />}
      {s.screen !== 'launching' && <Settings s={s} />}
      {s.showGlossary && <Glossary />}
    </>
  );
}
