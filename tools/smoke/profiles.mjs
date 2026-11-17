// Saved progress for the smoke test's screens, made by the app's own lesson code (Node runs the TypeScript sources
// directly): a learner who did the daily lesson every day, getting most answers right. So the Today screen is checked
// with what a real day holds: reviews, new phrases, practice, a conversation, the level and a week of stamps.
import { ORDERED, TALKS, exchangeById } from '../../src/content/index.ts';
import { emptyProgress } from '../../src/learn/progress.ts';
import { finishStep, fromSaved, move } from '../../src/learn/run.ts';
import { dayNumber } from '../../src/learn/schedule.ts';
import { buildSession, newSaved } from '../../src/learn/session.ts';

/** The same grades every run: mostly right, now and then hard, sometimes missed. */
function grades() {
  let i = 0;
  return () => {
    i++;
    return i % 10 === 0 ? 'again' : i % 7 === 0 ? 'hard' : 'good';
  };
}

/**
 * Her progress after a daily lesson on each of the last `days` days (the tour seen). `doneToday`: today's lesson is
 * done as well. `backedUp`: days since her last backup (a week or more brings the reminder once today's lesson is done).
 */
export function afterDays(days, { doneToday = false, backedUp = 2 } = {}) {
  const today = dayNumber();
  const p = emptyProgress();
  p.settings.toured = true;
  const grade = grades();
  for (let d = 0; d < days + (doneToday ? 1 : 0); d++) {
    const day = today - days + d;
    const run = fromSaved(newSaved(buildSession(p, ORDERED, day, TALKS), day));
    let now = Date.now() - (days - d) * 86_400_000;
    while (run.index < run.steps.length) {
      const s = run.steps[run.index];
      finishStep(run, p, exchangeById, s.kind === 'catch' || s.kind === 'answer' ? { grade: grade() } : {}, now++);
      move(run, p, 1);
    }
  }
  p.backedUp = today - backedUp;
  return p;
}
