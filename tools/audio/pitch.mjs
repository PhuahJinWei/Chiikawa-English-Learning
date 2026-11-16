// Pitch measuring for the audio script (make-audio.mjs): the manifest keeps each clip's pitch (start, lowest, end),
// shown on review.html. Plain JavaScript with no packages, so the app's tests can check it too (tests/pitch.test.ts).
//
// It is how we know the Heart voice never rises at the end of a question (measured 2026-11-16: "Sorry?", "Really?",
// "OK?" all fall, whatever the punctuation or stress). So nothing taught may depend on a rise: the phrase for not
// catching something is "Sorry, what?", not "Sorry?" (the user's choice, 2026-11-16).

/** Pitch in Hz for frames `hop` samples apart and `win` samples long (frame k starts at k * hop); 0 = no clear pitch. */
export function pitchTrack(x, rate, { min = 80, max = 450, voicing = 0.5, quiet = 0.01 } = {}) {
  const win = Math.round(rate * 0.04);
  const hop = Math.round(rate * 0.01);
  const minLag = Math.floor(rate / max);
  const maxLag = Math.ceil(rate / min);
  const f0 = [];
  for (let s = 0; s + win + maxLag < x.length; s += hop) {
    let e = 0;
    for (let i = s; i < s + win; i++) e += x[i] * x[i];
    if (Math.sqrt(e / win) < quiet) {
      f0.push(0);
      continue;
    }
    const r = new Float64Array(maxLag + 2);
    let best = 0;
    for (let lag = minLag; lag <= maxLag + 1; lag++) {
      let c = 0;
      let n1 = 0;
      let n2 = 0;
      for (let i = s; i < s + win; i++) {
        c += x[i] * x[i + lag];
        n1 += x[i] * x[i];
        n2 += x[i + lag] * x[i + lag];
      }
      r[lag] = c / Math.sqrt(n1 * n2 + 1e-12);
      if (r[lag] > best) best = r[lag];
    }
    // The shortest lag that is a peak nearly as strong as the best: avoids octave errors (a period counted twice).
    let pick = 0;
    for (let lag = minLag + 1; lag <= maxLag; lag++) {
      if (r[lag] >= 0.9 * best && r[lag] >= r[lag - 1] && r[lag] >= r[lag + 1]) {
        pick = lag;
        break;
      }
    }
    f0.push(best >= voicing && pick ? rate / pick : 0);
  }
  return { hop, win, f0 };
}
