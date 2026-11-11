// One-way events from game logic to the 3D scene, so actions never import the scene.
const handlers = {};
export const bus = {
  on(ev, f) { if (!handlers[ev]) handlers[ev] = []; handlers[ev].push(f); },
  emit(ev, ...a) { (handlers[ev] || []).forEach(f => f(...a)); },
};
