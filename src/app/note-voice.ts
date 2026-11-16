import { NO_ENGLISH_VOICE, play, speak, speechInfo } from './audio.svelte.ts';
import { heartPath } from './clips.ts';

/** What to tell her when the phone has no English voice to read her notes with, and how to add one. */
export const NO_VOICE_HELP =
  'このiPhoneには英語の読み上げ用の声がありません。iPhoneの「設定」→「アクセシビリティ」→「読み上げコンテンツ」→「声」→「英語」で追加できます。';

/**
 * Plays a note's English: in Heart when a clip exists (a lesson line, or one you voiced), otherwise in the phone's
 * own voice. Resolves '' when it played (or was cut short), or a Japanese line saying why it could not.
 */
export async function hearNote(en: string): Promise<string> {
  const path = heartPath(en);
  const r = path ? await play(path, 'model') : await speak(en, 'model');
  if (r !== 'failed') return '';
  if (path) return '音が出ませんでした。もう一度ためしてください。';
  return speechInfo.lastProblem === NO_ENGLISH_VOICE ? NO_VOICE_HELP : 'うまく読み上げられませんでした。もう一度ためしてください。';
}
