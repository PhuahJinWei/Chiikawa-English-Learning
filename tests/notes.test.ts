// Her notes (src/learn/notes.ts, REVIEW section 7): pasted English is tidied, notes are kept safely, the Heart voice
// is found whenever it exists, and what she sends you lists the English that still needs it.
import { describe, expect, it } from 'vitest';
import { heartPath } from '../src/app/clips.ts';
import { NOTE_CLIPS } from '../src/content/notes.ts';
import { makeBackup, readBackup } from '../src/learn/backup.ts';
import { looseEnglish, mergeNotes, newNote, noteFor, notesMessage, putNote, removeNote, tidyEnglish } from '../src/learn/notes.ts';
import { emptyProgress, normalize, NOTES_MAX } from '../src/learn/progress.ts';

describe('notes', () => {
  it('tidy pasted English: one line, straight quotes, no quote marks around it', () => {
    expect(tidyEnglish('  “Can I have\n some   water?” ')).toBe('Can I have some water?');
    expect(tidyEnglish('「Thank you!」')).toBe('Thank you!');
    expect(tidyEnglish("It’s OK.")).toBe("It's OK.");
    expect(tidyEnglish('a'.repeat(400))).toHaveLength(300);
    // Only a real pair of marks is taken off.
    expect(tidyEnglish('"Hi," she said, "bye"')).toBe('"Hi," she said, "bye"');
    expect(tidyEnglish('"It\'s OK')).toBe('"It\'s OK');
  });

  it('are kept newest first, changed in place, never empty, and limited in number', () => {
    const p = emptyProgress();
    const a = newNote('Thank you!', 'ありがとう', 1);
    const b = newNote('', 'トイレはどこ？って何て言う？', 2);
    expect(putNote(p, a)).toBe(true);
    expect(putNote(p, b)).toBe(true);
    expect(p.notes.map((n) => n.id)).toEqual([b.id, a.id]);
    expect(putNote(p, { ...a, ja: 'お礼', updated: 3 })).toBe(true);
    expect(p.notes[1]).toMatchObject({ id: a.id, ja: 'お礼' });
    expect(putNote(p, newNote('  ', ' ', 4))).toBe(false);
    removeNote(p, b.id);
    expect(p.notes.map((n) => n.id)).toEqual([a.id]);
    for (let i = 0; p.notes.length < NOTES_MAX; i++) putNote(p, newNote(`Note ${i}`, '', 10 + i));
    expect(putNote(p, newNote('One too many', '', 9999))).toBe(false);
  });

  it('find the note that already holds some English, however it is written', () => {
    const p = emptyProgress();
    putNote(p, newNote('Thank you!', '', 1));
    expect(noteFor(p, 'thank you')?.en).toBe('Thank you!');
    expect(noteFor(p, 'Thank you so much!')).toBeUndefined();
    expect(looseEnglish("Don't  know?")).toBe("don't know");
  });

  it('play in Heart whenever a clip exists: a lesson line, a block, or one voiced for her', () => {
    expect(heartPath('Thank you!')).toBe('audio/thank-you-x.mp3');
    expect(heartPath('thank you')).toMatch(/^audio\/thank-you(-x)?\.mp3$/);
    expect(heartPath('THANK YOU!!')).toMatch(/^audio\/thank-you(-x)?\.mp3$/);
    expect(heartPath('sorry, what?')).toBe('audio/sorry-what-q.mp3');
    expect(heartPath('Could you pass me the durian, please?')).toBeNull();
    expect(heartPath('  ')).toBeNull();
    // A question stays a question: "Ready." plays the statement "ready!", never the question "Ready?".
    expect(heartPath('Ready?')).toBe('audio/ready-q.mp3');
    expect(heartPath('Ready.')).toBe('audio/ready-x.mp3');
    expect(heartPath('Thank you?')).toBeNull();
    for (const text of NOTE_CLIPS) expect(heartPath(text), text).not.toBeNull();
  });

  it('are sent to you questions first, with the English that has no Heart voice yet', () => {
    const notes = [
      newNote('Thank you!', 'お礼', 1),
      newNote('Can I have some water?', 'お水\nのどが渇いたとき', 2),
      newNote('', 'トイレはどこ？\n急いでいるとき', 3),
    ];
    const text = notesMessage(notes, (en) => en === 'Thank you!');
    expect(text.split('\n')).toEqual([
      '【えいごフレンズ】メモ（3件）',
      '',
      '・（英語で何て言う？）トイレはどこ？',
      '　急いでいるとき',
      '・Thank you!',
      '　お礼',
      '・Can I have some water?',
      '　お水',
      '　のどが渇いたとき',
      '',
      '--- for the app: no Heart voice yet ---',
      'Can I have some water?',
    ]);
  });

  it('are never lost to an older backup: both sets are kept, the later change wins', () => {
    const a = newNote('Hi!', 'old', 1);
    const b = newNote('Bye!', 'written after the backup', 5);
    const restored = [{ ...a, ja: 'from the backup', updated: 2 }];
    const kept = [b, { ...a, ja: 'changed on the phone', updated: 9 }];
    const merged = mergeNotes(kept, restored);
    expect(merged.map((n) => n.ja)).toEqual(['written after the backup', 'changed on the phone']);
  });

  it('survive old saves, broken entries and a backup round trip', async () => {
    expect(normalize({ v: 1 }).notes).toEqual([]);
    const notes = normalize({
      v: 1,
      notes: [
        { id: 'a', en: 'Hi!', ja: 'あいさつ', created: 5, from: 'hi' },
        { id: 'a', en: 'duplicate id', ja: '', created: 6 },
        { id: 'b', en: '', ja: '' },
        { en: 'no id' },
        'nonsense',
      ],
    }).notes;
    expect(notes).toEqual([{ id: 'a', en: 'Hi!', ja: 'あいさつ', created: 5, updated: 5, from: 'hi' }]);
    const p = emptyProgress();
    putNote(p, newNote('Can I have some water?', 'お水がほしいとき', 1));
    const r = await readBackup(await makeBackup(p, 10));
    expect(r.ok && r.progress.notes).toEqual(p.notes);
  });
});
