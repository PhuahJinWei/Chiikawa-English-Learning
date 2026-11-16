import * as THREE from 'three';

/**
 * eigo-friends shim for the RPG's world/Look.ts (1,500 lines of island rendering): only what the copied
 * character code reads. The stage draws the RPG's plain toon look, so the film look stays off.
 */

/** The film look's passes are not run here: the plain toon look, with the pen on everything. */
export const FILM: boolean = false;

/** The film look's alpha marks (unused while FILM is false, but read by the shaders' defines). */
export const FIRE_MARK = 0.4;
export const PEN_MARK = 0.6;

/** The pen's ink brown, the app's text colour too. */
export const INK = '#66432F';

/** The calm water's mirror layer (no water here). */
export const MIRROR_LAYER = 2;

/** The trees' shade colour (no trees here: characters stay in full light). */
export const CANOPY_SHADE = new THREE.Color('#8A8E74');

let ramp: THREE.DataTexture | null = null;

/** The film's soft light ramp (core/toon.ts asks for it only when FILM is on). */
export function paintedRamp(): THREE.DataTexture {
  if (!ramp) {
    const n = 64;
    const data = new Uint8Array(n);
    for (let i = 0; i < n; i++) data[i] = Math.round(255 * THREE.MathUtils.smoothstep(i / (n - 1), 0.44, 0.68));
    ramp = new THREE.DataTexture(data, n, 1, THREE.RedFormat);
    ramp.minFilter = THREE.LinearFilter;
    ramp.magFilter = THREE.LinearFilter;
    ramp.generateMipmaps = false;
    ramp.needsUpdate = true;
  }
  return ramp;
}
