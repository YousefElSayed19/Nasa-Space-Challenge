import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { initScene } from './scene/Scene.js';
import { App } from './App.jsx';

initScene(document.getElementById('scene'));
createRoot(document.getElementById('ui')).render(<App />);
