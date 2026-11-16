/**
 * Words the voice's pronunciation dictionary gets wrong in these lines, respelled for the voice only: the text on
 * screen and the clip's name stay as written. "Excuse me" uses the verb, with a z sound; the dictionary gives the
 * noun's s. "live" on its own (the word block) is read as in "live music"; she needs the verb. Used by make-audio.mjs (what the voice says) and phonemes.mjs (what the readings are checked against).
 */
export const SAY_AS = [
  [/\b([Ee])xcuse\b/g, '$1xcuze'],
  [/\b([Ll])ive\b/g, '$1iv'],
];

export const spoken = (text) => SAY_AS.reduce((t, [re, to]) => t.replace(re, to), text);
