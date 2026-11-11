import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { initScene } from './scene/Scene.js';
import { store } from './state/store.js';
import { setMission } from './engine/index.js';
import { bus } from './state/bus.js';
import { App } from './App.jsx';
import './state/tutorial.js';

setMission(store.get().missionId);
initScene(document.getElementById('scene'));
bus.emit('mission', store.get().missionId);
createRoot(document.getElementById('ui')).render(<App />);
