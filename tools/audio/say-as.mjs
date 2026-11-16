/**
 * Words the voice's pronunciation dictionary gets wrong in these lines, respelled for the voice only: the text on
 * screen and the clip's name stay as written. "Excuse me" uses the verb, with a z sound; the dictionary gives the
 * noun's s. Used by make-audio.mjs (what the voice says) and phonemes.mjs (what the readings are checked against).
 */
export const SAY_AS = [[/\b([Ee])xcuse\b/g, '$1xcuze']];

export const spoken = (text) => SAY_AS.reduce((t, [re, to]) => t.replace(re, to), text);
