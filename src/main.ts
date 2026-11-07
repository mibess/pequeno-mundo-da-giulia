import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/500.css';
import '@fontsource/dm-sans/600.css';
import '@fontsource/dm-sans/700.css';
import '@fontsource/fraunces/400.css';
import '@fontsource/fraunces/400-italic.css';
import '@fontsource/fraunces/500.css';
import './style.css';
import { creature, landscape, type World } from './art';
import { SoundGarden } from './audio';

const icons = {
  lock: '<rect x="6" y="10" width="12" height="10" rx="3"/><path d="M9 10V7a3 3 0 0 1 6 0v3"/><path d="M12 14v2"/>',
  sound: '<path d="m11 5-6 4H2v6h3l6 4Z"/><path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  muted: '<path d="m11 5-6 4H2v6h3l6 4Z"/><path d="m16 9 6 6m0-6-6 6"/>',
  flower: '<path d="M12 8c-6-9-11 0-5 4-9 6 0 11 5 5 6 9 11 0 5-5 9-6 0-11-5-4Z"/><circle cx="12" cy="12" r="3"/>',
  wave: '<path d="M2 12c4 0 4-7 9-7a5 5 0 0 1 5 5c-3-2-5 1-3 3 2 3 6 3 9 1M2 19c4-3 6 3 10 0s6 3 10 0"/>',
  sky: '<path d="M7 18a5 5 0 1 1 1-10 6 6 0 0 1 11 3 3.5 3.5 0 0 1 0 7Z"/>',
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  heart: '<path d="M20 5c-3-3-6-1-8 1-2-2-5-4-8-1-4 4 1 9 8 14 7-5 12-10 8-14Z"/>',
};
const icon = (name: keyof typeof icons) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;
const worlds: Record<World, { label: string; subtitle: string; icon: keyof typeof icons; caption: string }> = {
  garden: { label: 'Jardim', subtitle: 'Vamos fazer o jardim florescer?', icon: 'flower', caption: 'Um jardim de pequenas surpresas' },
  ocean: { label: 'Oceano', subtitle: 'Vamos mergulhar em novas descobertas?', icon: 'wave', caption: 'Um mergulho em cores e sons' },
  sky: { label: 'Céu', subtitle: 'Vamos brincar lá nas nuvens?', icon: 'sky', caption: 'Onde a imaginação ganha asas' },
};
type Preferences = { world: World; muted: boolean; volume: number; calm: boolean };
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const preferences: Preferences = { world: 'garden', muted: false, volume: 0.4, calm: reducedMotion.matches };
try {
  const stored = JSON.parse(localStorage.getItem('giulia-preferences') || '{}');
  if (Object.hasOwn(worlds, stored.world)) preferences.world = stored.world;
  if (typeof stored.muted === 'boolean') preferences.muted = stored.muted;
  if (typeof stored.calm === 'boolean') preferences.calm = stored.calm;
  if (typeof stored.volume === 'number' && Number.isFinite(stored.volume)) preferences.volume = Math.min(0.65, Math.max(0, stored.volume));
} catch { /* Storage is optional; play always works offline. */ }
const save = () => { try { localStorage.setItem('giulia-preferences', JSON.stringify(preferences)); } catch { /* Keep in-memory settings. */ } };
const audio = new SoundGarden();
audio.setMuted(preferences.muted);
audio.setVolume(preferences.volume);
const desktop = window.giulia;
const protectedMode = desktop && !desktop.preview;
const isMac = desktop?.platform === 'darwin' || (!desktop && /Mac/.test(navigator.platform));
const exitKeys = isMac ? ['control', 'option', 'shift', 'Q'] : ['Ctrl', 'Alt', 'Shift', 'Q'];
const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <header class="topbar">
    <a class="brand" aria-label="Pequeno Mundo da Giulia"><img src="./flower.svg" alt="" /><span>pequeno mundo<span class="brand-name">da Giulia<span class="brand-dot">.</span></span></span></a>
    <div class="topbar-right">
      <span class="mode-badge ${protectedMode ? 'protected' : ''}"><span class="status-dot"></span>${protectedMode ? 'Modo protegido' : 'Modo de prévia'}</span>
      <button class="parents-button" id="parents" aria-label="Área dos pais: segure por 2 segundos" title="Segure por 2 segundos">${icon('lock')}<span>Área dos pais</span><span class="hold-fill"></span></button>
    </div>
  </header>
  <main>
    <section class="playground" id="playground" aria-label="Mundo interativo. Pressione qualquer tecla para brincar.">
      <div id="landscape"></div>
      <div class="little-spark spark-one">✧</div><div class="little-spark spark-two">✧</div>
      <div class="intro" id="intro">
        <span class="eyebrow"><span></span> OLÁ, PEQUENA EXPLORADORA</span>
        <h1>O mundo floresce<br/>com o seu <em>toque.</em><svg class="title-spark" viewBox="0 0 44 48" aria-hidden="true"><path d="m20 5-2 12M36 18l-10 6M37 35l-12-3" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg></h1>
        <p id="world-subtitle"></p>
        <div class="key-invitation"><span class="mini-key">A</span><span>Aperte qualquer tecla e veja a magia</span>${icon('arrow')}</div>
      </div>
      <div class="creations" id="creations" aria-hidden="true"></div>
      <div class="scene-caption"><span></span><span id="scene-caption"></span><span></span></div>
      <div class="live-hint" id="live-hint">Cada toque, uma nova surpresa.</div>
    </section>
    <section class="play-controls" aria-label="Escolha um mundo">
      <div class="world-label"><span class="small-label">VAMOS EXPLORAR</span><p>Um mundo de cada vez.</p></div>
      <div class="world-switcher" role="group" aria-label="Mundos">
        ${Object.entries(worlds).map(([key, world]) => `<button class="world-button" data-world="${key}" aria-pressed="false">${icon(world.icon)}<span>${world.label}</span><span class="selected-dot"></span></button>`).join('')}
      </div>
      <button class="sound-button" id="sound" aria-pressed="true">${icon('sound')}<span>Sons suaves</span><span class="sound-wave"><i></i><i></i><i></i></span></button>
    </section>
  </main>
  <footer><span>${icon('heart')} Feito para brincar. Sem pressa de crescer.</span><span class="exit-hint">${protectedMode ? 'Para sair' : 'No app, saia com'} ${exitKeys.map(key => `<kbd>${key}</kbd>`).join('<span class="plus">+</span>')}</span></footer>
  <dialog id="parent-dialog" aria-labelledby="parent-title">
    <button class="dialog-close" id="close-dialog" aria-label="Voltar à brincadeira">${icon('close')}</button>
    <span class="dialog-icon">${icon('lock')}</span>
    <span class="small-label">UM CANTINHO PARA OS ADULTOS</span>
    <h2 id="parent-title">Do jeitinho dela.</h2>
    <p class="dialog-description">Pequenos ajustes para uma brincadeira tranquila.</p>
    <div class="setting-row"><label for="volume">Volume dos sons<span>Comece baixinho e ajuste no computador.</span></label><output id="volume-value"></output></div>
    <input type="range" min="0" max="65" value="40" id="volume" aria-label="Volume dos sons" />
    <div class="setting-row divider"><label for="calm">Movimentos tranquilos<span>Menos movimento, as mesmas descobertas.</span></label><input id="calm" type="checkbox" role="switch" /></div>
    ${desktop?.updates ? `<section class="update-settings" aria-labelledby="update-title">
      <div class="update-heading"><h3 id="update-title">Atualizações</h3><span id="installed-version"></span></div>
      <p id="update-status" aria-live="polite">Consultando a versão instalada…</p>
      <div class="update-progress" hidden><progress id="update-progress" max="100" aria-label="Download da atualização"></progress><span id="update-percent" aria-hidden="true"></span></div>
      <button id="update-action" type="button" hidden>Verificar atualização</button>
    </section>` : ''}
    <div class="parent-note">${icon('lock')}<div><strong>${protectedMode ? 'A brincadeira está em tela cheia' : 'Você está em uma prévia'}</strong><p>${protectedMode ? 'As teclas viram brincadeira e o fechamento comum fica bloqueado.' : 'A proteção em tela cheia funciona no aplicativo para Mac e Windows.'} Atalhos de emergência e algumas teclas do sistema continuam disponíveis.</p></div></div>
    <div class="exit-instructions"><span>Para fechar o aplicativo, pressione juntas:</span><div>${exitKeys.map(key => `<kbd>${key}</kbd>`).join('<span class="plus">+</span>')}</div></div>
    <button class="resume-button" id="resume">Voltar à brincadeira ${icon('arrow')}</button>
    <span class="offline-note">A brincadeira funciona sem internet.</span>
  </dialog>
  <div class="toast" id="toast" role="status" aria-live="polite"></div>
`;

const playground = document.querySelector<HTMLElement>('#playground')!;
const creations = document.querySelector<HTMLElement>('#creations')!;
const dialog = document.querySelector<HTMLDialogElement>('#parent-dialog')!;
const parents = document.querySelector<HTMLButtonElement>('#parents')!;
const refreshUpdateState = desktop?.updates ? setupUpdates(desktop.updates) : undefined;
const soundButton = document.querySelector<HTMLButtonElement>('#sound')!;
const volume = document.querySelector<HTMLInputElement>('#volume')!;
const calm = document.querySelector<HTMLInputElement>('#calm')!;
let idleTimer: ReturnType<typeof setTimeout>;
let toastTimer: ReturnType<typeof setTimeout>;
let lastPlayAt = -Infinity;
let sequence = 0;
let holdTimer: ReturnType<typeof setTimeout> | undefined;
let holdActive = false;
const creationTimers = new Map<HTMLElement, ReturnType<typeof setTimeout>>();
const colors = ['#e8a0ae', '#eac773', '#9fbeb0', '#b7a6d0', '#eda586', '#a8c6d2'];
const toast = (message: string) => {
  const element = document.querySelector<HTMLElement>('#toast')!;
  element.textContent = message;
  element.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => element.classList.remove('visible'), 2700);
};

function setupUpdates(updates: GiuliaUpdates) {
  const installedVersion = document.querySelector<HTMLElement>('#installed-version')!;
  const statusText = document.querySelector<HTMLElement>('#update-status')!;
  const progressRow = document.querySelector<HTMLElement>('.update-progress')!;
  const progressBar = document.querySelector<HTMLProgressElement>('#update-progress')!;
  const percent = document.querySelector<HTMLElement>('#update-percent')!;
  const action = document.querySelector<HTMLButtonElement>('#update-action')!;
  let state: UpdateState = { status: 'idle', version: '' };
  let pending = false;
  let revision = 0;

  function render(next: UpdateState) {
    state = next;
    const available = state.status === 'available';
    parents.classList.toggle('update-available', available);
    parents.title = available ? 'Nova versão disponível. Segure por 2 segundos para abrir.' : 'Segure por 2 segundos';
    if (available) parents.setAttribute('aria-description', 'Nova versão disponível');
    else parents.removeAttribute('aria-description');
    installedVersion.textContent = state.version ? `Versão instalada ${state.version}` : '';

    const messages: Record<UpdateState['status'], string> = {
      idle: 'O app verifica automaticamente se há novas versões.',
      checking: 'Verificando se há uma nova versão…',
      current: 'Você já está na versão mais recente.',
      available: `${state.latest ? `A versão ${state.latest}` : 'Uma nova versão'} está disponível. Ao atualizar, o app vai baixar a versão e reiniciar.`,
      downloading: 'Baixando a atualização…',
      restarting: 'Reiniciando o app para concluir a atualização…',
      error: state.message || 'Não foi possível concluir a atualização. Tente novamente.',
      unsupported: state.message || 'As atualizações automáticas estão indisponíveis nesta instalação.',
    };
    statusText.textContent = messages[state.status];
    progressRow.hidden = state.status !== 'downloading';
    const value = state.progress;
    if (typeof value === 'number' && Number.isFinite(value)) {
      progressBar.value = Math.round(Math.max(0, Math.min(100, value)));
      percent.textContent = `${progressBar.value}%`;
    } else {
      progressBar.removeAttribute('value');
      percent.textContent = '';
    }
    action.hidden = !['idle', 'current', 'available', 'error'].includes(state.status);
    action.disabled = pending;
    action.textContent = available ? 'Atualizar agora' : state.status === 'error' ? 'Tentar novamente' : 'Verificar atualização';
  }

  // The main process may finish checking before the renderer opens, or send a
  // newer event while an older snapshot is on its way back over IPC.
  const unsubscribe = updates.onChange(next => { revision++; render(next); });
  async function refresh() {
    const requestedAt = ++revision;
    try {
      const snapshot = await updates.getState();
      if (revision === requestedAt) render(snapshot);
    } catch {
      if (revision === requestedAt) render({ status: 'error', version: state.version });
    }
  }
  action.addEventListener('click', async () => {
    if (!dialog.open || pending || action.hidden) return;
    pending = true;
    const installing = state.status === 'available';
    const requestedAt = ++revision;
    render({ ...state, status: installing ? 'downloading' : 'checking', progress: undefined });
    try {
      const result = installing ? await updates.install() : await updates.check();
      if (revision === requestedAt) render(result);
      else await refresh();
    } catch {
      if (revision === requestedAt) render({ status: 'error', version: state.version });
      else await refresh();
    } finally {
      pending = false;
      action.disabled = false;
    }
  });
  window.addEventListener('beforeunload', unsubscribe, { once: true });
  void refresh();
  return refresh;
}

function updateSound() {
  soundButton.innerHTML = `${icon(preferences.muted ? 'muted' : 'sound')}<span>${preferences.muted ? 'Som desligado' : 'Sons suaves'}</span><span class="sound-wave"><i></i><i></i><i></i></span>`;
  soundButton.classList.toggle('muted', preferences.muted);
  soundButton.setAttribute('aria-pressed', String(!preferences.muted));
  soundButton.setAttribute('aria-label', preferences.muted ? 'Ativar sons suaves' : 'Desativar sons');
  audio.setMuted(preferences.muted);
}
function clearCreations() {
  for (const timer of creationTimers.values()) clearTimeout(timer);
  creationTimers.clear();
  creations.replaceChildren();
}
function setWorld(world: World, announce = false) {
  preferences.world = world;
  document.body.dataset.world = world;
  document.querySelector('#landscape')!.innerHTML = landscape(world);
  document.querySelector('#world-subtitle')!.textContent = worlds[world].subtitle;
  document.querySelector('#scene-caption')!.textContent = worlds[world].caption;
  document.querySelectorAll<HTMLButtonElement>('[data-world]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.world === world)));
  document.querySelector('h1')!.innerHTML = world === 'garden'
    ? 'O mundo floresce<br/>com o seu <em>toque.</em>'
    : world === 'ocean' ? 'Um mar todinho<br/>para <em>descobrir.</em>' : 'A imaginação<br/>ganha <em>asas.</em>';
  clearCreations();
  playground.classList.remove('has-played');
  save();
  if (announce) { audio.play(4, world); toast(`${worlds[world].label}: um novo mundo para explorar`); }
}
function removeCreation(element: HTMLElement) {
  clearTimeout(creationTimers.get(element));
  creationTimers.delete(element);
  element.remove();
}
function play(key: string, point?: { x: number; y: number }) {
  if (dialog.open || document.hidden) return;
  const now = performance.now();
  if (now - lastPlayAt < 85) return;
  lastPlayAt = now;
  sequence++;
  const seed = Array.from(key).reduce((sum, char) => sum + char.codePointAt(0)!, 0);
  const variant = (seed + sequence) % 6;
  audio.play(seed + sequence % 3, preferences.world);
  playground.classList.add('has-played');
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => playground.classList.remove('has-played'), 6500);
  // A fixed cap plus key-repeat filtering keeps enthusiastic key mashing light.
  if (creations.childElementCount >= 12) removeCreation(creations.firstElementChild as HTMLElement);
  const rect = playground.getBoundingClientRect();
  const x = point ? Math.min(89, Math.max(11, point.x / rect.width * 100)) : 17 + ((sequence * 37 + seed * 7) % 67);
  const y = point ? Math.min(74, Math.max(20, point.y / rect.height * 100)) : 28 + ((sequence * 23 + seed * 3) % 43);
  const element = document.createElement('div');
  element.className = 'creation';
  element.style.left = `${x}%`;
  element.style.top = `${y}%`;
  element.style.setProperty('--tilt', `${(sequence % 2 ? 1 : -1) * (4 + seed % 9)}deg`);
  element.style.setProperty('--color', colors[seed % colors.length]);
  const label = key.length === 1 && key.trim() ? key.toLocaleUpperCase('pt-BR') : '✦';
  element.innerHTML = `<span class="creation-halo"></span><span class="creation-art">${creature(preferences.world, variant, colors[seed % colors.length])}</span><span class="creation-key"></span><span class="confetti one">✧</span><span class="confetti two">•</span><span class="confetti three">✦</span>`;
  element.querySelector('.creation-key')!.textContent = label;
  creations.append(element);
  creationTimers.set(element, setTimeout(() => removeCreation(element), 4700));
}
function handleKey(event: GiuliaKey | KeyboardEvent) {
  if (event.type !== 'keydown' || event.repeat) return;
  if (event.ctrlKey && event.altKey && event.shiftKey && (event.code === 'KeyQ' || event.key.toLowerCase() === 'q')) {
    if (!desktop) toast('Na prévia, feche a aba. Este atalho fecha o aplicativo para computador.');
    return;
  }
  if (dialog.open) { if (event.key === 'Escape') dialog.close(); return; }
  play(event.key);
}
let removeNativeListener: (() => void) | undefined;
if (desktop) {
  removeNativeListener = desktop.onKey(handleKey);
} else {
  window.addEventListener('keydown', event => {
    if (!dialog.open) event.preventDefault();
    handleKey(event);
  });
}
playground.addEventListener('pointerdown', event => {
  if (event.button !== 0) return;
  const rect = playground.getBoundingClientRect();
  play('✦', { x: event.clientX - rect.left, y: event.clientY - rect.top });
});
document.addEventListener('contextmenu', event => event.preventDefault());
document.addEventListener('dragstart', event => event.preventDefault());
document.querySelectorAll<HTMLButtonElement>('[data-world]').forEach(button => button.addEventListener('click', () => {
  if (preferences.world !== button.dataset.world) setWorld(button.dataset.world as World, true);
  button.blur();
}));
soundButton.addEventListener('click', () => {
  preferences.muted = !preferences.muted;
  updateSound();
  save();
  if (!preferences.muted) audio.play(0, preferences.world);
  soundButton.blur();
});
function cancelHold() {
  clearTimeout(holdTimer);
  if (holdActive) parents.classList.remove('holding');
  holdActive = false;
}
parents.addEventListener('pointerdown', event => {
  if (event.button !== 0) return;
  cancelHold();
  holdActive = true;
  parents.classList.add('holding');
  holdTimer = setTimeout(() => {
    cancelHold();
    clearCreations();
    audio.setMuted(true);
    volume.value = String(Math.round(preferences.volume * 100));
    document.querySelector('#volume-value')!.textContent = `${volume.value}%`;
    calm.checked = preferences.calm;
    dialog.showModal();
    void refreshUpdateState?.();
  }, 2000);
});
for (const event of ['pointerup', 'pointerleave', 'pointercancel', 'lostpointercapture']) parents.addEventListener(event, cancelHold);
parents.addEventListener('click', () => { if (!dialog.open) toast('Segure “Área dos pais” por 2 segundos para abrir.'); });
window.addEventListener('blur', cancelHold);
document.querySelector('#close-dialog')!.addEventListener('click', () => dialog.close());
document.querySelector('#resume')!.addEventListener('click', () => dialog.close());
dialog.addEventListener('close', () => { audio.setMuted(preferences.muted); parents.blur(); });
volume.addEventListener('input', () => {
  preferences.volume = Number(volume.value) / 100;
  document.querySelector('#volume-value')!.textContent = `${volume.value}%`;
  audio.setVolume(preferences.volume);
  save();
});
calm.addEventListener('change', () => {
  preferences.calm = calm.checked;
  document.body.classList.toggle('calm', preferences.calm);
  save();
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { cancelHold(); clearCreations(); audio.setMuted(true); }
  else audio.setMuted(preferences.muted || dialog.open);
});
window.addEventListener('beforeunload', () => { audio.dispose(); removeNativeListener?.(); });
document.body.classList.toggle('calm', preferences.calm);
setWorld(preferences.world);
updateSound();
desktop?.ready?.();
