// Bloom for glowing screens and accents (GDD 6.7). Returns null if unavailable, and the game renders directly.
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { GammaCorrectionShader } from 'three/examples/jsm/shaders/GammaCorrectionShader.js';

export function createPostFX(renderer, scene, camera) {
  try {
    if (!EffectComposer || !UnrealBloomPass) return null;
    const size = renderer.getDrawingBufferSize(new THREE.Vector2());
    let rt;
    if (renderer.capabilities.isWebGL2 && THREE.WebGLMultisampleRenderTarget) {
      rt = new THREE.WebGLMultisampleRenderTarget(size.x, size.y, { format: THREE.RGBAFormat });
      rt.samples = 4; // keep edges smooth with post-processing
    }
    const composer = new EffectComposer(renderer, rt);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.6, 0.55, 0.78);
    composer.addPass(bloom);
    composer.addPass(new ShaderPass(GammaCorrectionShader));
    return {
      render: () => composer.render(),
      setSize: (w, h) => { composer.setSize(w, h); bloom.setSize(w, h); },
      setPixelRatio: pr => { if (composer.setPixelRatio) composer.setPixelRatio(pr); },
    };
  } catch (e) {
    console.warn('Post-processing unavailable, rendering directly.', e);
    return null;
  }
}
