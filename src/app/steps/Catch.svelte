<script lang="ts">
  import { untrack } from 'svelte';
  import { EXCHANGES, UI, VERSATILE, catchLines, nearIds } from '../../content/index.ts';
  import type { Exchange, Line } from '../../content/types.ts';
  import { closest, quizCandidates } from '../../learn/contrast.ts';
  import type { Step } from '../../learn/session.ts';
  import { play } from '../audio.svelte.ts';
  import { audioPath } from '../clips.ts';
  import Blocks from '../components/Blocks.svelte';
  import Bubble from '../components/Bubble.svelte';
  import SorryButton from '../components/SorryButton.svelte';
  import SpeakerCard from '../components/SpeakerCard.svelte';
  import StepLayout from '../components/StepLayout.svelte';
  import UiWord from '../components/UiWord.svelte';
  import { act, calm, partnerOnStage, pick, shuffle } from '../scene.ts';
  import { lifetime } from '../script.svelte.ts';
  import { sfx } from '../sfx.ts';
  import { stage } from '../stage.ts';
  import { app } from '../state.svelte.ts';
  import type { StepResult } from '../screens/Lesson.svelte';

  /**
   * Catch: she hears a line with no text, and only then do the choices appear (REVIEW 2.4). Either "what does it
   * mean?" (Japanese choices) or, for an exchange with a reply, "what would you answer?" (reply choices she can play).
   * A miss gets a worried Chiikawa, the key part again, and another try. Passed = right on the first try. The choices
   * are light buttons in a thin line, so the sound card stays the main thing on the page (2026-11-17). Once answered,
   * the choices go and the page returns to its top (StepLayout). Right the first time, it goes on to the next step by
   * itself after a moment (2026-11-17; a setting turns that off): 次へ after every right answer was one tap too many.
   * After a miss it waits for 次へ, since that is when she needs to look.
   */
  let {
    ex: exProp,
    step: stepProp,
    onDone,
    onBack,
    intro = false,
  }: {
    ex: Exchange;
    step: Extract<Step, { kind: 'catch' }>;
    onDone: (r: StepResult) => void;
    onBack: (() => void) | null;
    /** The step before was another stage: Hachiware names this one first, and leaves a moment to read it. */
    intro?: boolean;
  } = $props();
  const ex = untrack(() => exProp);
  const step = untrack(() => stepProp);
  let naming = untrack(() => intro);

  const life = lifetime();
  const cast = ex.cast;
  const ask = ex.kind === 'reply' ? (step.ask ?? 'meaning') : 'meaning';
  // A new phrase is checked with another way of saying it, when there is one, so it is not just remembered.
  const pool = catchLines(ex);
  const line: Line = !step.review && pool.length > 1 ? pick(pool.slice(1)) : pick(pool);

  // Exchanges too close in meaning are never each other's wrong answers.
  const near = nearIds(ex);
  // Wrong answers at her level: phrases she has learned, then the next few coming up in her path (src/learn/contrast.ts).
  const others = (filter: (e: Exchange) => boolean) =>
    quizCandidates(EXCHANGES.filter((e) => !near.has(e.id) && filter(e)), (e) => !!app.progress.ex[e.id]);

  interface Option {
    key: string;
    right: boolean;
    ja?: string;
    reply?: Line;
  }

  function meaningOptions(): Option[] {
    const out: Option[] = [{ key: line.ja, right: true, ja: line.ja }];
    const add = (ja: string) => {
      if (out.length < 3 && !out.some((o) => o.key === ja)) out.push({ key: ja, right: false, ja });
    };
    const candidates = others((e) => catchLines(e).length > 0);
    // One wrong choice sounds like what she heard (REVIEW 2.4), only from what she has learned: a sound-alike she has
    // never met (on day 1, "Hello! Nice to meet you!" against "Hello!") only confuses.
    const lines = (es: Exchange[]) => es.flatMap((e) => catchLines(e).map((l) => ({ line: l })));
    const twin = closest(line, lines(candidates.filter((e) => app.progress.ex[e.id])));
    if (twin) add(twin.line.ja);
    for (const e of candidates) {
      if (out.length === 3) break;
      add(pick(catchLines(e)).ja);
    }
    return shuffle(out);
  }

  function replyOptions(): Option[] {
    const right = pick(ex.short);
    // Never offer as "wrong" a reply that would also be fine here, one that fits almost anything ("OK!", "Yes."), or
    // a repair phrase ("Sorry, what?" is never wrong): wrong choices come only from ordinary replies to other questions.
    const mine = new Set(ex.short.map((l) => l.en).concat(ex.fits ?? [], [...VERSATILE]));
    const out: Option[] = [{ key: right.en, right: true, reply: right }];
    for (const e of others((e) => e.kind === 'reply' && e.short.some((l) => !mine.has(l.en)))) {
      const l = pick(e.short.filter((l) => !mine.has(l.en)));
      if (!out.some((o) => o.key === l.en)) out.push({ key: l.en, right: false, reply: l });
      if (out.length === 3) break;
    }
    return shuffle(out);
  }

  const options = ask === 'reply' ? replyOptions() : meaningOptions();
  const praise = [UI.good, UI.great, UI.goodJob];

  let heard = $state(false);
  let failed = $state(false);
  let busy = $state(true);
  let wrong = $state<number[]>([]);
  let solved = $state(false);
  let cheer = $state(praise[0]);
  let say = $state('「相手」の英語だよ');

  /** Plays the question. Choices appear only once it was really heard: a clip that fails is never graded. */
  function listen() {
    failed = false;
    busy = true;
    const lead = naming ? 1400 : 400;
    say = naming ? '次は聞き取りクイズ。「相手」の英語だよ' : '「相手」の英語だよ';
    naming = false;
    life.run(async (s) => {
      calm(cast);
      void stage.play(ex.host, 'listen');
      await s.wait(lead);
      const r = await s.play(audioPath(line.en), 'other');
      stage.stop(ex.host);
      busy = false;
      if (r === 'failed') {
        failed = true;
        say = '音が出なかったみたい。もう一度ためすか、このステップをとばしてね';
        return;
      }
      heard = true;
      say = ask === 'reply' ? 'こう聞かれたら、何て答える？' : '何て言ってる？';
    });
  }
  listen();

  let finished = false;
  /** On to the next step (her tap on 次へ, or by itself after a right first answer): once. */
  function finish() {
    if (finished) return;
    finished = true;
    onDone({ grade: wrong.length ? 'again' : 'good', missedLine: wrong.length ? line.en : undefined });
  }

  function choose(i: number) {
    if (solved || busy || wrong.includes(i)) return;
    const o = options[i];
    if (o.right) {
      solved = true;
      sfx.chime();
      cheer = pick(praise);
      act([
        { who: ex.host, gesture: 'cheer', face: 'happy' },
        { who: 'chiikawa', face: 'happy', mark: 'heart' },
      ]);
      const first = wrong.length === 0;
      life.run(async (s) => {
        // The right reply is heard; then, right the first time, a moment to see the English, and on.
        if (o.reply) await s.play(audioPath(o.reply.en), 'model');
        if (!first || !app.progress.settings.autoNext) return;
        await s.wait(o.reply ? 600 : 1300);
        finish();
      });
      return;
    }
    wrong = [...wrong, i];
    sfx.boing();
    busy = true;
    // Her partner worries with her (each in character: src/app/scene.ts).
    act([{ who: 'chiikawa', face: 'worried', mark: 'question' }]);
    const key = line.parts.length > 1 ? line.parts.filter((p) => p.hi) : [];
    life.run(async (s) => {
      if (key.length) {
        say = 'おしい！ 大事なところだけ聞いてみよう';
        await s.wait(1400);
        for (const p of key) {
          await s.play(audioPath(p.text), 'other');
          await s.wait(450);
        }
        say = '今度は全部通して聞いてみよう';
        await s.wait(900);
      } else {
        say = 'おしい！ もう一回、よく聞いてみよう';
        await s.wait(1400);
      }
      await s.play(audioPath(line.en), 'other');
      stage.setFace(partnerOnStage(), null);
      say = 'どれかな？';
      busy = false;
    });
  }
</script>

<StepLayout {onBack}>
  {#snippet top()}
    {#if solved}
      <Bubble who={ex.host} named={false}><span class="cheer"><UiWord t={cheer} size="bubble" /></span></Bubble>
    {:else}
      <Bubble who={ex.host} text={say} named={false}>
        {#snippet before()}
          {#if !heard}<span class="lead"><UiWord t={UI.listen} size="bubble" /></span>{/if}
        {/snippet}
      </Bubble>
    {/if}
  {/snippet}
  {#snippet body()}
    <!-- In a "what would you answer?" quiz the sound card is one slim row, so the three replies fit under it; once
         answered, the question is one row too, so the right answer shows whole under it, as the model does in 答えてみよう (2026-11-17: on a small iPhone it stayed half hidden). -->
    <SpeakerCard kind="other" {line} reveal={solved} compact={ask === 'reply'} />
    {#if !failed && !solved}
      <!-- Asking again sits by the sound it replays; it reads "Sorry, what?" once she has learned that phrase. -->
      <SorryButton {line} channel="other" disabled={!heard || busy} />
    {/if}
    {#if heard && !solved}
      <div class="options">
        {#each options as o, i (o.key)}
          {#if o.reply}
            <div class="reply-row">
              <button class="btn light option" class:oops={wrong.includes(i)} disabled={busy || wrong.includes(i)} onclick={() => choose(i)}>
                <Blocks line={o.reply} size="sm" />
              </button>
              <button class="play" onclick={() => o.reply && play(audioPath(o.reply.en), 'model')} aria-label="この答えを聞く">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z" /></svg>
              </button>
            </div>
          {:else}
            <button class="btn light option" class:oops={wrong.includes(i)} disabled={busy || wrong.includes(i)} onclick={() => choose(i)}>
              {o.ja}
            </button>
          {/if}
        {/each}
      </div>
    {/if}
    {#if solved && ask === 'reply'}
      <SpeakerCard kind="model" line={options.find((o) => o.right)?.reply ?? null} badge="答え" compact />
    {/if}
  {/snippet}
  {#snippet extra()}
    {#if failed}
      <div class="row">
        <button class="btn soft" onclick={listen}>もう一度ためす</button>
        <button class="btn soft keep" onclick={() => onDone({})}>このステップを<wbr />とばす</button>
      </div>
    {/if}
  {/snippet}
  {#snippet primary()}
    <button
      class="btn primary"
      disabled={!solved}
      onclick={finish}
    >
      <UiWord t={UI.next} />
    </button>
  {/snippet}
</StepLayout>

<style>
  .lead {
    display: block;
    font-size: 20px;
    margin-bottom: 2px;
  }
  .options {
    display: grid;
    gap: 10px;
  }
  .option {
    min-height: 52px;
    font-size: 17px;
    justify-content: flex-start;
    text-align: left;
    padding-left: 16px;
  }
  .option.oops {
    animation: nudge 0.35s ease-out;
  }
  @keyframes nudge {
    25% {
      transform: translateX(-5px);
    }
    75% {
      transform: translateX(5px);
    }
  }
  .reply-row {
    display: flex;
    gap: 8px;
    align-items: center;
  }
  .reply-row .option {
    flex: 1;
    padding: 6px 12px;
  }
  .play {
    flex: none;
    width: 46px;
    height: 46px;
    border-radius: 50%;
    border: var(--line) solid var(--ink);
    border-image: var(--frame-ring);
    background: var(--blush);
    display: grid;
    place-items: center;
    padding: 0;
  }
  .play svg {
    width: 20px;
    height: 20px;
    fill: var(--ink);
    margin-left: 2px;
  }
  .cheer {
    display: block;
    font-size: 24px;
    padding: 2px 0;
  }
</style>
