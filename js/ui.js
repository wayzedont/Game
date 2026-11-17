// =====================================================================
//  Элементы интерфейса: иконки и кнопки действий (сенсорный интерфейс)
// =====================================================================

const ICON_PATHS = {
  flip: '<path d="M5 9a7 7 0 0 1 12-3l2 2M19 15a7 7 0 0 1-12 3l-2-2"/><path d="M19 4v4h-4M5 20v-4h4"/>',
  scale: '<path d="M12 4v15M6 19h12M5 8h14"/><path d="M5 8l-3 6h6zM19 8l-3 6h6z"/>',
  magnet: '<path d="M6 4v8a6 6 0 0 0 12 0V4h-4v8a2 2 0 0 1-4 0V4z"/><path d="M6 7h4M14 7h4"/>',
  uv: '<path d="M9 3h6v6l-2 3v8h-2v-8L9 9z"/><path d="M4 13l-2 1M4 17H2M5 21l-1 1M20 13l2 1M20 17h2M19 21l1 1"/>',
  pricer: '<rect x="3" y="4" width="18" height="12"/><path d="M8 20h8M12 16v4M7 12l3-3 2 2 4-4"/>',
  book: '<path d="M4 4h7a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H4zM20 4h-5a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h5z"/>',
  wanted: '<path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z"/><path d="M12 8v5M12 16v.5"/>',
  box: '<path d="M3 8l9-4 9 4v9l-9 4-9-4z"/><path d="M3 8l9 4 9-4M12 12v9"/>',
  coffee: '<path d="M5 9h11v6a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4z"/><path d="M16 11h2a2 2 0 0 1 0 4h-2M8 3v3M12 3v3"/>',
  sign: '<rect x="3" y="7" width="18" height="9"/><path d="M8 7l4-4 4 4M7 11h10"/>',
  case: '<rect x="3" y="8" width="18" height="12"/><path d="M9 8V5h6v3M3 13h18"/>',
  lock: '<rect x="5" y="11" width="14" height="9"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  lens: '<circle cx="10" cy="10" r="6"/><path d="M15 15l6 6"/>',
  alert: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.5"/>',
  siren: '<path d="M6 18v-6a6 6 0 0 1 12 0v6"/><path d="M4 18h16v3H4zM12 2v2M4 6l1.5 1.5M20 6l-1.5 1.5"/>',
  back: '<path d="M10 6l-6 6 6 6M4 12h16"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  coin: '<circle cx="12" cy="12" r="8"/><path d="M12 7v10M9.5 9.5h4a1.5 1.5 0 0 1 0 3h-3a1.5 1.5 0 0 0 0 3h4"/>',
  wrench: '<path d="M14 6a4 4 0 0 0 5 5l-9 9a2 2 0 0 1-3-3l9-9a4 4 0 0 1-2-2z"/>',
  hand: '<path d="M7 12V6a1.5 1.5 0 0 1 3 0v5M10 11V4a1.5 1.5 0 0 1 3 0v7M13 11V5a1.5 1.5 0 0 1 3 0v7M16 12V8a1.5 1.5 0 0 1 3 0v6a7 7 0 0 1-7 7h-1a6 6 0 0 1-5-3l-2-4a1.5 1.5 0 0 1 2.5-1.5L7 15"/>',
  tag: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.5"/>',
  sparkle: '<path d="M12 3v6M12 15v6M3 12h6M15 12h6M6 6l3 3M15 15l3 3M18 6l-3 3M9 15l-3 3"/>',
};
function icon(k) { return `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">${ICON_PATHS[k] || ''}</svg>`; }

// Кнопки действий.
// items: [{t, g, icon, fn, cls, note, disabled}]
//   g: 'x' — главное действие, 'o' — назад/отказ, 's' — осмотр, 't' — особое
function menuList(items, opts = {}) {
  const list = items.filter(Boolean);
  const box = el('div', { class: 'menu' + (opts.cls ? ' ' + opts.cls : '') });
  let primaryUsed = false;
  list.forEach((a, i) => {
    let kind = '';
    if (a.g === 'x' && !primaryUsed) { kind = 'primary'; primaryUsed = true; }
    else if (a.g === 'o') kind = 'back';
    if (a.cls && a.cls.includes('danger')) kind = 'danger';
    const ic = a.icon || { s: 'lens', t: a.cls && a.cls.includes('danger') ? 'siren' : 'alert', o: 'back' }[a.g] || '';
    const b = el('button', { class: `mi ${kind} ${a.cls || ''}` }, `${ic ? icon(ic) : ''}<span class="mi-t">${a.t}</span>${a.note ? `<span class="mi-n">${a.note}</span>` : ''}`);
    if (a.disabled) b.disabled = true;
    b.onclick = () => { if (b.disabled) return; Sfx.click(); a.fn(); };
    box.appendChild(b);
  });
  // нечётное число второстепенных кнопок — последняя на всю ширину
  const rest = $$('.mi:not(.primary)', box);
  if (rest.length % 2 === 1) rest[rest.length - 1].classList.add('wide');
  if (list.length === 1) box.firstChild.classList.add('wide');
  return box;
}
