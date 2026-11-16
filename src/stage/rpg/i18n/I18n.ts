/**
 * eigo-friends shim for the RPG's i18n (its Japanese game text). The friends never say the RPG's lines here: the
 * stage hushes every speech bubble (EmoteSystem.hush), and the app shows its own HTML bubbles instead.
 */
export type StringKey = string;

export function t(key: StringKey): string {
  return key;
}

export function has(_key: string): _key is StringKey {
  return false;
}
