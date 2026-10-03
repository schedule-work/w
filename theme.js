(() => {
  const button = document.getElementById('themeToggle');
  const label = document.getElementById('themeState');
  button.addEventListener('click', () => {
    const enabled = document.documentElement.classList.toggle('outer-dark');
    button.setAttribute('aria-pressed', String(enabled));
    label.textContent = enabled ? 'ON' : 'OFF';
  });
  // Let the focused button handle keyboard activation without sending a jump.
  for (const name of ['keydown', 'keyup']) {
    button.addEventListener(name, event => event.stopPropagation());
  }
})();
