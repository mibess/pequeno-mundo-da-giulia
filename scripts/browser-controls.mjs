// Embedded in the portable HTML after the playground has initialized.
export function setupBrowserControls() {
  const badge = document.querySelector('.mode-badge');
  const hint = document.querySelector('.exit-hint');
  const parents = document.querySelector('#parents');
  const fullscreenButton = document.createElement('button');
  fullscreenButton.className = 'parents-button';
  fullscreenButton.type = 'button';
  fullscreenButton.id = 'browser-fullscreen';
  parents.before(fullscreenButton);
  badge.textContent = 'No navegador';
  hint.classList.add('browser-hint');

  document.querySelector('.parent-note strong').textContent = 'Brincando no navegador';
  document.querySelector('.parent-note p').textContent = 'Em tela cheia, Esc volta à janela. Os atalhos do navegador e do sistema continuam disponíveis.';
  document.querySelector('.exit-instructions').textContent = 'Para encerrar a brincadeira, feche a aba do navegador.';

  function updateFullscreen() {
    const active = Boolean(document.fullscreenElement);
    fullscreenButton.textContent = active ? 'Sair da tela cheia' : 'Tela cheia';
    fullscreenButton.setAttribute('aria-pressed', String(active));
    hint.textContent = active ? 'Esc para sair da tela cheia.' : 'Para encerrar, feche a aba do navegador.';
  }
  async function switchFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      hint.textContent = 'O navegador não permitiu alterar a tela cheia. Você pode continuar brincando nesta janela.';
    }
    fullscreenButton.blur();
  }
  fullscreenButton.hidden = !document.fullscreenEnabled;
  fullscreenButton.addEventListener('click', switchFullscreen);
  document.addEventListener('fullscreenchange', updateFullscreen);
  window.addEventListener('keydown', event => {
    if (event.key === 'Escape' && document.fullscreenElement) {
      event.stopImmediatePropagation();
      void switchFullscreen();
    }
    if (event.ctrlKey && event.altKey && event.shiftKey && event.code === 'KeyQ') {
      // The desktop exit shortcut does not apply to a browser tab.
      event.stopImmediatePropagation();
      hint.textContent = 'Para encerrar, feche a aba do navegador.';
    }
  }, true);
  updateFullscreen();
}
