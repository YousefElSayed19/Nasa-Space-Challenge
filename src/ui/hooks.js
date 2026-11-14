import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { store, hud } from '../state/store.js';

export const useGame = () => useSyncExternalStore(store.sub, store.get);
export const useHud = () => useSyncExternalStore(hud.sub, hud.get);

/** Smoothly counts a number toward its new value, so cause and effect are visible (GDD 7.1). */
export function useAnimatedNumber(target, ms = 380) {
  const [v, setV] = useState(target);
  const r = useRef({ cur: target, raf: 0 });
  useEffect(() => {
    const st = r.current, from = st.cur, t0 = performance.now();
    cancelAnimationFrame(st.raf);
    const step = now => {
      const k = Math.max(0, Math.min(1, (now - t0) / ms)), e = 1 - Math.pow(1 - k, 3); // frame time can be a little before t0
      st.cur = from + (target - from) * e; setV(st.cur);
      if (k < 1) st.raf = requestAnimationFrame(step);
    };
    st.raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(st.raf);
  }, [target, ms]);
  return v;
}
