import COLOUR_DATA from './colours.json';

/**
 * The colours seen in the game, kept in world/colours.json: tuned by eye in the testing ground (dev/Dev.ts, its Tune:
 * colours) and saved there. A colour as it is seen is hex (sRGB); a tint the light is multiplied by is three numbers, as
 * the renderer works in them (linear). Each of the sky's looks has its light's strengths too, and how much night it
 * is (0 to 1: the stars, the moon).
 *
 * The very object tuned (changed in place, never replaced): what reads it every frame follows it at once (the sky, the
 * moon, the stars and the clouds, the pen, a puff's body); what is made with it once (the meadow's things, a puff's
 * horns and eyes, the nuts, the emotes' marks) takes it again when told to (Meadow, Hunt, EmoteSystem: recolour).
 * (Not here: the cast's and the weapons' own colours, and the painted faces, which are their models' and pictures'.)
 */
export const COLOURS = COLOUR_DATA;
export type Colours = typeof COLOUR_DATA;
