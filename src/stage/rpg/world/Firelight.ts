import type * as THREE from 'three';

/**
 * eigo-friends shim for the RPG's world/Firelight.ts (campfires and lamps after dark): the stage has no fire, so
 * characters get the shader's firelight slots with nothing in them (FrameContext.firelight is left out), and held
 * things are never lit by fire.
 */

/** How many firelights a character's shader has room for (kept as the RPG has it; all stay dark). */
export const CHARACTER_LIGHTS = 4;

/** Would add the firelight to a held thing's shader; there is no fire on the stage. */
export function fireLights(_shader: THREE.WebGLProgramParametersWithUniforms): void {}
