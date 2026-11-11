import React from 'react';
import { useGame } from './ui/hooks.js';
import { HUD, Settings } from './ui/HUD.jsx';
import { StartScreen } from './ui/StartScreen.jsx';
import { MissionScreen } from './ui/MissionScreen.jsx';
import { ReportScreen } from './ui/ReportScreen.jsx';
import { Glossary } from './ui/Glossary.jsx';

export function App() {
  const s = useGame();
  return (
    <>
      {s.screen === 'start' && <StartScreen s={s} />}
      {(s.screen === 'game' || s.screen === 'launching') && <HUD s={s} />}
      {s.screen === 'mission' && <MissionScreen s={s} />}
      {s.screen === 'report' && <ReportScreen s={s} />}
      <Settings s={s} />
      {s.showGlossary && <Glossary />}
    </>
  );
}
