import { mount } from 'svelte';
import './app/styles.css';
import App from './app/App.svelte';
import { errorText, noteError } from './app/errors.ts';
import { app } from './app/state.svelte.ts';
import { registerServiceWorker } from './app/updates.ts';

// After start-up, a stray error is noted and a small notice appears; the lesson stays on screen (REVIEW 4.8).
window.addEventListener('error', (ev) => {
  if (noteError(ev.error ?? ev.message)) app.glitch = true;
});
window.addEventListener('unhandledrejection', (ev) => {
  if (noteError(ev.reason)) app.glitch = true;
});

try {
  mount(App, { target: document.getElementById('app')! });
  window.__booted = true;
  document.getElementById('boot')?.remove();
} catch (e) {
  noteError(e);
  // The app could not start: the start-up panel in index.html says so, with a reload button (REVIEW 4.9).
  window.__bootFailed?.(errorText(e));
}

if (import.meta.env.PROD) registerServiceWorker();
