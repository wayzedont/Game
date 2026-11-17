// =====================================================================
//  Элементы интерфейса: глифы кнопок геймпада, иконки, меню
// =====================================================================

const GLYPH = {
  x: '<path d="M6 6 L14 14 M14 6 L6 14" stroke="#86a8ff" stroke-width="2.2" stroke-linecap="round"/>',
  o: '<circle cx="10" cy="10" r="4.6" fill="none" stroke="#ff6d6d" stroke-width="2.2"/>',
  t: '<path d="M10 5 L15 14 L5 14 Z" fill="none" stroke="#5fe0a0" stroke-width="2" stroke-linejoin="round"/>',
  s: '<rect x="5.5" y="5.5" width="9" height="9" fill="none" stroke="#ff8ad8" stroke-width="2"/>',
};
function gp(k) {
  return `<svg class="glyph" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="9.3" fill="#141418" stroke="#6b6b78" stroke-width="1"/><circle cx="10" cy="8" r="7" fill="#fff" opacity=".06"/>${GLYPH[k] || ''}</svg>`;
}

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
  sound: '<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 9a4 4 0 0 1 0 6M18 6a8 8 0 0 1 0 12"/>',
  mute: '<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 9l5 6M21 9l-5 6"/>',
  lock: '<rect x="5" y="11" width="14" height="9"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
};
function icon(k) { return `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">${ICON_PATHS[k] || ''}</svg>`; }

// ---------- меню-список (как в играх тех лет) ----------
// items: [{t, g:'x'|'o'|'t'|'s', fn, cls, note, disabled}]
function menuList(items, opts = {}) {
  const box = el('div', { class: 'menu' + (opts.cls ? ' ' + opts.cls : '') });
  items.filter(Boolean).forEach((a, i) => {
    const b = el('button', { class: 'mi' + (a.cls ? ' ' + a.cls : '') + (i === 0 ? ' sel' : '') }, `${gp(a.g || 'x')}<span class="mi-t">${a.t}</span>${a.note ? `<span class="mi-n">${a.note}</span>` : ''}`);
    if (a.disabled) b.disabled = true;
    b.onclick = () => { if (b.disabled) return; Sfx.click(); a.fn(); };
    b.onpointerenter = (e) => { if (e.pointerType === 'mouse') selectMi(box, b); };
    b._g = a.g;
    box.appendChild(b);
  });
  return box;
}
function selectMi(box, b) { $$('.mi', box).forEach((x) => x.classList.toggle('sel', x === b)); }

// Клавиатура: стрелки — выбор, Enter/Пробел — ✕, Esc/Backspace — ○
function activeMenu() {
  const layers = ['#title', '#mg', '#modal2', '#inspect', '#modal'];
  for (const s of layers) { const l = $(s); if (l && l.classList.contains('show')) return $('.menu', l); }
  return $('#actions .menu');
}
window.addEventListener('keydown', (e) => {
  const m = activeMenu();
  if (!m) return;
  const items = $$('.mi', m).filter((b) => !b.disabled);
  if (!items.length) return;
  let i = items.findIndex((b) => b.classList.contains('sel'));
  if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { i = (i + 1) % items.length; selectMi(m, items[i]); Sfx.tick(); e.preventDefault(); }
  else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { i = (i - 1 + items.length) % items.length; selectMi(m, items[i]); Sfx.tick(); e.preventDefault(); }
  else if (e.key === 'Enter' || e.key === ' ') { (items[i] || items[0]).click(); e.preventDefault(); }
  else if (e.key === 'Escape' || e.key === 'Backspace') { const o = items.find((b) => b._g === 'o'); if (o) { o.click(); e.preventDefault(); } }
});
