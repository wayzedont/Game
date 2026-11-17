// =====================================================================
//  ЛОМБАРД «ПОСЛЕДНИЙ ШАНС» — основная логика
// =====================================================================

const SHOP = {
  scale: { name: 'Ювелирные весы', icon: 'scale', price: 150, desc: 'Точный вес предмета. Подделки часто легче оригинала.', tool: true },
  magnet: { name: 'Магнит', icon: 'magnet', price: 120, desc: 'Золото не магнитится. Дешёвые сплавы — да.', tool: true },
  uv: { name: 'УФ-фонарик', icon: 'uv', price: 300, desc: 'Скрытые метки, люминофор, свежая краска и новая глазурь.', tool: true },
  pricer: { name: 'Прайс-база', icon: 'pricer', price: 350, desc: 'Рыночная цена оригинала в таком состоянии.', tool: true },
  coffee: { name: 'Кофемашина', icon: 'coffee', price: 200, desc: 'Клиенты терпеливее при торге (+1 попытка).' },
  sign: { name: 'Неоновая вывеска', icon: 'sign', price: 450, desc: '+1 клиент в день, покупатели заходят чаще.' },
  safe: { name: 'Адвокат', icon: 'case', price: 500, desc: 'Штрафы полиции за краденое вдвое меньше.' },
};

const SAVE_KEY = 'lombard_save_v1';
function getBest() { try { return +(localStorage.getItem('lombard_best') || 0); } catch (e) { return 0; } }
let S = null;

function newState() {
  return {
    day: 1, money: 1200, rep: 50,
    owned: {},
    inventory: [],
    wanted: [],
    queue: [], qi: 0,
    stats: { earned: 0, deals: 0, caught: 0, fakesSpotted: 0, repairs: 0, fakesBought: 0 },
    log: null,
    night: { soldFakes: 0, soldStolen: 0 },
    seenIntro: false,
  };
}
function save() { try { const c = Object.assign({}, S, { queue: [], qi: 0 }); localStorage.setItem(SAVE_KEY, JSON.stringify(c)); } catch (e) { /* без сохранения */ } }
function load() { try { const d = localStorage.getItem(SAVE_KEY); return d ? JSON.parse(d) : null; } catch (e) { return null; } }
function wipe() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ok */ } }

const rent = (d) => 200 + (d - 1) * 110;
const typesForDay = (d) => { const t = ['watch', 'ring', 'phone', 'coin']; if (d >= 2) t.push('bag', 'painting'); if (d >= 3) t.push('vase'); return t; };
const has = (k) => !!S.owned[k];
const round5 = (v) => Math.max(5, Math.round(v / 5) * 5);
const roundNice = (v) => v >= 1000 ? Math.round(v / 50) * 50 : v >= 200 ? Math.round(v / 10) * 10 : round5(v);
const repFactor = () => 0.85 + S.rep / 100 * 0.3;
const pad2 = (n) => String(n).padStart(2, '0');

// ---------------------------------------------------------------------
//  HUD
// ---------------------------------------------------------------------
function hud() {
  if (!S) return;
  $('#hDay').textContent = pad2(S.day);
  $('#hMoney').textContent = money(S.money);
  $('#hMoney').classList.toggle('neg', S.money < rent(S.day));
  const stars = Math.round(S.rep / 20 * 2) / 2;
  let st = '';
  for (let i = 1; i <= 5; i++) st += `<i class="${stars >= i ? 'on' : stars >= i - 0.5 ? 'half' : ''}">★</i>`;
  $('#hRep').innerHTML = st;
  $('#hRepN').textContent = Math.round(S.rep);
  $('#hud').classList.toggle('rep-low', S.rep < 25);
  $('#hLeft').textContent = Math.max(0, S.queue.length - S.qi);
  $('#hInv').textContent = S.inventory.length;
}
function toast(t, kind = '') {
  const box = $('#toasts');
  if ([...box.children].some((x) => x.dataset.t === t && !x.classList.contains('out'))) return;
  while (box.children.length >= 3) box.firstChild.remove();
  const d = el('div', { class: 'toast ' + kind }, `<span>${t}</span>`);
  d.dataset.t = t;
  box.appendChild(d);
  setTimeout(() => d.classList.add('out'), 2300);
  setTimeout(() => d.remove(), 2800);
}
function floatMoney(v) {
  const d = el('div', { class: 'float-money ' + (v >= 0 ? 'plus' : 'minus') }, (v >= 0 ? '+' : '−') + money(Math.abs(v)));
  $('#hMoneyBox').appendChild(d);
  setTimeout(() => d.remove(), 1400);
}
function addMoney(v, why) {
  S.money += v;
  if (S.log) { if (v >= 0) S.log.income += v; else S.log.spent += -v; if (why) S.log.events.push([why, v]); }
  if (v > 0) S.stats.earned += v;
  floatMoney(v); hud();
}
function addRep(v) {
  S.rep = clamp(S.rep + v, 0, 100); hud();
  if (v) toast(v > 0 ? `РЕПУТАЦИЯ +${v}` : `РЕПУТАЦИЯ ${v}`, v > 0 ? 'good' : 'bad');
}

// ---------------------------------------------------------------------
//  Субтитры и меню действий
// ---------------------------------------------------------------------
let currentCustomer = null;
function say(name, text, mood) {
  const sub = $('#subs');
  sub.classList.toggle('empty', !text);
  $('#spName').textContent = name;
  const p = $('#spText');
  p.classList.remove('pop'); void p.offsetWidth; p.classList.add('pop');
  p.innerHTML = text;
  if (mood && currentCustomer) Scene3D.setMood(mood);
  if (name && currentCustomer && name === currentCustomer.person.name) Scene3D.talk(Math.min(3500, 300 + text.replace(/<[^>]+>/g, '').length * 45));
}
function setMood(m) { if (currentCustomer) Scene3D.setMood(m); }
function actions(list, title) {
  const box = $('#actions');
  box.innerHTML = '';
  if (!list || !list.length) { box.classList.add('empty'); return; }
  box.classList.remove('empty');
  if (title) box.appendChild(el('div', { class: 'menu-h' }, title));
  box.appendChild(menuList(list));
}
function showCounterItem(it) {
  Scene3D.setItem(it);
  $('#itemHint').classList.toggle('show', !!it);
  if (!Scene3D.ok) {
    const c = $('#counterItem');
    c.innerHTML = it ? itemPix(it, 0) : '';
    c.classList.toggle('show', !!it);
  }
}

// ---------------------------------------------------------------------
//  День
// ---------------------------------------------------------------------
function genWanted() {
  const types = typesForDay(S.day).filter((t) => ITEM_TYPES[t].makeStolen);
  const n = S.day === 1 ? 2 : R.i(2, 3);
  const list = [];
  R.shuffle(types).slice(0, n).forEach((type) => {
    const it = makeItem(type, { fake: false });
    const w = { type, id: uid('w') };
    ITEM_TYPES[type].makeStolen(it, w);
    w.text = ITEM_TYPES[type].wantedText(w);
    list.push(w);
  });
  return list;
}

function genQueue() {
  const n = 5 + (S.day >= 3 ? 1 : 0) + (has('sign') ? 1 : 0);
  const q = [];
  for (let i = 0; i < n; i++) {
    const kind = i === 0 && S.day === 1 ? 'sell' : R.weighted([['sell', 0.55], ['repair', 0.25], ['buy', has('sign') ? 0.26 : 0.2]]);
    q.push({ kind });
  }
  S.wanted.forEach((w, k) => {
    if (R.chance(k === 0 ? 0.8 : 0.3)) {
      const slot = R.i(1, n - 1);
      q[slot] = { kind: R.chance(0.6) ? 'sell' : 'repair', wanted: w };
    }
  });
  return q;
}

function startDay() {
  S.log = { income: 0, spent: 0, events: [] };
  S.night = { soldFakes: 0, soldStolen: 0 };
  if (!S.wanted.length) S.wanted = genWanted();
  S.queue = genQueue(); S.qi = 0;
  save();
  hud();
  updateTicker();
  say('', '', null);
  actions([]);
  showNews();
}

function updateTicker() {
  const t = S.wanted.map((w) => 'РАЗЫСКИВАЕТСЯ: ' + w.text).join('  ///  ');
  $('#ticker').innerHTML = `<b>СРОЧНО</b><div><span>${t}  ///  ${t}  ///  </span></div>`;
  Scene3D.setNews(S.wanted.map((w) => w.text).join(' * '));
}

function wantedHtml() {
  return `<ul class="wanted-list">${S.wanted.map((w) => `<li><div class="wl-ic">${itemPix(referenceItem(w.type), 0, { res: 64, noDirt: true })}</div><span>${w.text}</span></li>`).join('')}</ul>`;
}

function showNews() {
  modal(`
    <div class="news">
      <div class="news-screen">
        <div class="news-top"><span class="live">● ЭФИР</span><span>НОВОСТИ 24 · ДЕНЬ ${pad2(S.day)}</span></div>
        <h2>Полиция просит ломбарды быть бдительными</h2>
        <p>В городе участились кражи. Если вам принесут одну из этих вещей — звоните в полицию.</p>
        ${wantedHtml()}
      </div>
      <table class="kv"><tr><td>Аренда сегодня вечером</td><td class="bad">${money(rent(S.day))}</td></tr><tr><td>В кассе</td><td class="money">${money(S.money)}</td></tr></table>
      ${S.day === 2 ? '<p class="note">Новое: теперь приносят сумки Monaro и картины Мореля. Загляните в каталог.</p>' : ''}
      ${S.day === 3 ? '<p class="note">Новое: в город привезли антиквариат — фарфоровые вазы.</p>' : ''}
    </div>`, [{ t: 'Открыть ломбард', g: 'x', fn: () => { closeModal(); nextCustomer(); } }], { title: `ДЕНЬ ${pad2(S.day)} · УТРО` });
}

// ---------------------------------------------------------------------
//  Клиенты
// ---------------------------------------------------------------------
function fakeChance() { return Math.min(0.5, 0.28 + S.day * 0.025); }

function buildCustomer(slot) {
  const types = typesForDay(S.day);
  let kind = slot.kind;
  if (kind === 'buy' && !S.inventory.length) kind = 'sell';
  const c = { kind, patience: 3 + (has('coffee') ? 1 : 0), inspected: 0 };

  if (slot.wanted) {
    const w = slot.wanted;
    const it = makeItem(w.type, { fake: false });
    applyWanted(it, w);
    c.item = it; c.role = 'thief';
    c.person = makePerson('young');
    if (kind === 'repair') { it.condition = R.f(0.15, 0.3); c.repairKind = 'clean'; }
  } else if (kind === 'sell') {
    const type = R.pick(types);
    const fake = R.chance(fakeChance());
    c.item = makeItem(type, { fake, extraVisual: S.day >= 4 });
    if (fake) c.role = R.chance(0.75) ? 'scam' : 'honest';
    else c.role = R.weighted([['honest', 0.55], ['old', 0.17], ['greedy', 0.28]]);
    c.person = makePerson(c.role === 'old' ? 'old' : 'any');
    if (c.person.old && c.role === 'honest') c.role = 'old';
  } else if (kind === 'repair') {
    const type = R.pick(types);
    c.item = makeItem(type, { fake: R.chance(0.15) });
    c.repairKind = R.pick(ITEM_TYPES[type].repairs);
    if (c.repairKind === 'clean') c.item.condition = R.f(0.2, 0.45);
    if (c.repairKind === 'screen') { c.item.cracked = true; c.item.crackX = R.i(80, 125); c.item.crackY = R.i(50, 150); }
    c.person = makePerson('any');
  } else {
    c.person = makePerson('any');
    const cats = [...new Set(S.inventory.map((e) => e.item.type))];
    c.wantType = R.chance(0.75) ? R.pick(cats) : (R.chance(0.5) ? R.pick(types) : null);
    c.offers = {};
  }
  if (kind === 'repair') c.role = slot.wanted ? 'thief' : 'client';
  if (kind === 'buy') c.role = 'buyer';

  c.baseMood = 'neutral';
  if (c.role === 'thief') c.baseMood = R.chance(0.8) ? 'nervous' : 'sly';
  else if (c.role === 'scam') c.baseMood = R.pick(['sly', 'nervous', 'happy', 'neutral']);
  else if (c.role === 'old') c.baseMood = R.pick(['sad', 'neutral', 'happy']);
  else if (R.chance(0.12)) c.baseMood = 'nervous';
  else c.baseMood = R.pick(['neutral', 'happy', 'neutral']);

  if (c.kind === 'sell') {
    const pv = itemPretendValue(c.item);
    const k = { honest: [0.55, 0.8], old: [0.12, 0.35], greedy: [0.9, 1.15], scam: [0.5, 0.78], thief: [0.22, 0.42] }[c.role];
    c.ask = roundNice(pv * R.f(k[0], k[1]));
    const m = { honest: [0.6, 0.8], old: [0.5, 0.8], greedy: [0.72, 0.85], scam: [0.25, 0.45], thief: [0.45, 0.7] }[c.role];
    c.min = round5(c.ask * R.f(m[0], m[1]));
    c.cur = c.ask;
  }
  if (c.kind === 'repair') {
    const base = { clean: [40, 110], battery: [60, 120], screen: [120, 240], glue: [150, 280] }[c.repairKind];
    c.fee = round5(R.f(base[0], base[1]) * (c.role === 'thief' ? 1.6 : 1));
  }
  return c;
}

async function nextCustomer() {
  hud();
  if (S.qi >= S.queue.length) return endDay();
  const c = buildCustomer(S.queue[S.qi]);
  currentCustomer = c;
  showCounterItem(null);
  say('', '', null);
  actions([]);
  Sfx.bell();
  await Scene3D.setCustomer(c.person);
  Scene3D.setMood(c.baseMood);
  if (c.item) { showCounterItem(c.item); Sfx.thud(); }
  if (c.kind === 'sell') sellFlow(c);
  else if (c.kind === 'repair') repairFlow(c);
  else buyFlow(c);
}

async function customerLeaves(delay = 1100) {
  actions([]);
  await wait(delay);
  showCounterItem(null);
  say('', '', null);
  await Scene3D.leave();
  currentCustomer = null;
  S.qi++;
  hud();
  await wait(200);
  nextCustomer();
}

const ROLE_TAG = { sell: 'ПРОДАЁТ', repair: 'РЕМОНТ', buy: 'ПОКУПАЕТ' };

// ----------------------------- ПРОДАВЕЦ -----------------------------
function sellFlow(c, again = false) {
  if (!again) say(c.person.name, line('sell.' + c.role, { item: `<b>${c.item.title}</b>`, ask: `<b class="m">${money(c.ask)}</b>` }), c.baseMood);
  actions([
    { t: 'Торговаться', g: 'x', fn: () => haggleSell(c) },
    { t: 'Осмотреть предмет', g: 's', fn: () => openInspect(c.item, c) },
    { t: 'Это подделка!', g: 't', fn: () => accuseFake(c) },
    { t: 'Вызвать полицию', g: 't', cls: 'danger', fn: () => callPolice(c) },
    { t: 'Отказать', g: 'o', fn: () => refuse(c) },
  ], `${ROLE_TAG.sell} · ${c.item.title}`);
}

function haggleUI({ head, current, min, max, start, onOffer, onAccept, acceptLabel, offerLabel, onBack, limit }) {
  const step = max > 3000 ? 50 : max > 600 ? 10 : 5;
  let v = clamp(Math.round(start / step) * step, min, max);
  const box = $('#actions');
  box.classList.remove('empty');
  box.innerHTML = `
    <div class="menu-h">${head} <b class="m">${money(current)}</b></div>
    <div class="haggle">
      <div class="hg-row">
        <button class="hg-b" data-d="-10">◀◀</button><button class="hg-b" data-d="-1">◀</button>
        <div class="hg-val" id="hgVal"></div>
        <button class="hg-b" data-d="1">▶</button><button class="hg-b" data-d="10">▶▶</button>
      </div>
      <div class="gauge"><input type="range" id="hgRange" min="${min}" max="${max}" step="${step}" value="${v}" aria-label="Цена"><div class="gauge-fill" id="hgFill"></div></div>
    </div>`;
  const val = $('#hgVal'), rng = $('#hgRange'), fillB = $('#hgFill');
  const upd = () => {
    val.textContent = money(v);
    val.classList.toggle('over', limit != null && v > limit);
    fillB.style.width = ((v - min) / Math.max(1, max - min) * 100) + '%';
  };
  upd();
  rng.oninput = () => { v = +rng.value; upd(); };
  $$('.hg-b', box).forEach((b) => {
    let iv = null, to = null;
    const stepIt = () => { v = clamp(v + +b.dataset.d * step, min, max); rng.value = v; upd(); Sfx.tick(); };
    const stop = () => { clearTimeout(to); clearInterval(iv); };
    b.onpointerdown = (e) => { e.preventDefault(); stepIt(); to = setTimeout(() => { iv = setInterval(stepIt, 70); }, 350); };
    b.onpointerup = b.onpointerleave = b.onpointercancel = stop;
  });
  box.appendChild(menuList([
    { t: offerLabel, g: 'x', fn: () => { if (limit != null && v > limit) { toast('НЕ ХВАТАЕТ ДЕНЕГ В КАССЕ', 'bad'); return; } onOffer(v); } },
    { t: acceptLabel, g: 't', icon: 'hand', fn: () => { if (limit != null && current > limit) { toast('НЕ ХВАТАЕТ ДЕНЕГ В КАССЕ', 'bad'); return; } onAccept(); } },
    { t: 'Назад', g: 'o', fn: onBack },
  ]));
}

function haggleSell(c) {
  const name = c.person.name;
  haggleUI({
    head: `${name.toUpperCase()} ПРОСИТ`,
    current: c.cur,
    min: 0, max: Math.max(5, Math.min(Math.max(c.ask * 1.3, 100), S.money)),
    start: c.lastOffer != null ? c.lastOffer : c.cur * 0.6,
    limit: S.money,
    offerLabel: 'Предложить эту цену',
    acceptLabel: `Согласиться на ${money(c.cur)}`,
    onBack: () => sellFlow(c, true),
    onAccept: () => buyFromSeller(c, c.cur),
    onOffer: (o) => {
      c.lastOffer = o;
      if (o >= c.cur) return buyFromSeller(c, o);
      if (o < c.min * 0.45) {
        c.patience -= 2;
        say(name, line('insult'), 'angry');
      } else if (o >= c.min && Math.random() < 0.3 + 0.7 * (o - c.min) / Math.max(1, c.cur - c.min)) {
        return buyFromSeller(c, o);
      } else {
        c.patience--;
        const na = Math.max(c.min, roundNice(c.cur - (c.cur - o) * R.f(0.25, 0.5)));
        if (na <= o) return buyFromSeller(c, o);
        c.cur = na;
        say(name, line('counter', { c: `<b class="m">${money(c.cur)}</b>` }), c.patience <= 1 ? 'angry' : c.baseMood === 'happy' ? 'neutral' : c.baseMood);
      }
      if (c.patience <= 0) { say(name, line('leave'), 'angry'); return customerLeaves(); }
      haggleSell(c);
    },
  });
}

function buyFromSeller(c, price) {
  if (price > S.money) { toast('НЕ ХВАТАЕТ ДЕНЕГ В КАССЕ', 'bad'); return; }
  say(c.person.name, line('accept'), 'happy');
  addMoney(-price, `Купил: ${c.item.title}`);
  Sfx.cash();
  S.inventory.push({ item: c.item, paid: price, day: S.day });
  S.stats.deals++;
  if (c.item.fake) S.stats.fakesBought++;
  toast('ПРЕДМЕТ ДОБАВЛЕН НА СКЛАД');
  hud();
  customerLeaves();
}

function refuse(c) {
  say(c.person.name, line(c.role === 'thief' ? 'refuseThief' : 'refuse'), c.role === 'thief' ? 'angry' : 'sad');
  customerLeaves();
}

function accuseFake(c) {
  if (c.item.fake) {
    say(c.person.name, line('fakeCaught'), R.pick(['nervous', 'sly', 'sad']));
    S.stats.fakesSpotted++;
    toast('ВЕРНО! ЭТО ПОДДЕЛКА', 'good');
    addRep(2);
    Sfx.good();
  } else {
    say(c.person.name, line('fakeAccused'), 'angry');
    toast('ОШИБКА: ВЕЩЬ БЫЛА ПОДЛИННОЙ', 'bad');
    addRep(-3);
    Sfx.bad();
  }
  customerLeaves(1500);
}

async function callPolice(c) {
  actions([]);
  Sfx.siren();
  $('#app').classList.add('police');
  Scene3D.police(true);
  say('ДИСПЕТЧЕР', 'Наряд выехал. Задержите клиента...', null);
  await wait(1300);
  const name = c.person.name;
  if (c.item && c.item.stolen) {
    say(name, line('policeThief'), 'shock');
    await wait(1200);
    const reward = round5(100 + itemValue(c.item) * 0.1);
    S.stats.caught++;
    addMoney(reward, 'Награда полиции');
    addRep(8);
    toast('ВОР ЗАДЕРЖАН. ВЕЩЬ ВЕРНУТ ВЛАДЕЛЬЦУ', 'good');
    Sfx.good();
  } else if (c.item && c.item.fake && c.kind === 'sell') {
    say(name, line('fakeCaught'), 'shock');
    await wait(1000);
    S.stats.fakesSpotted++;
    addMoney(50, 'Сдал мошенника');
    addRep(3);
    toast('МОШЕННИК С ПОДДЕЛКОЙ ЗАДЕРЖАН', 'good');
  } else {
    say(name, line('policeInnocent'), 'angry');
    await wait(900);
    addRep(-10);
    toast('ЛОЖНЫЙ ВЫЗОВ: ВЕЩЬ ЧИСТАЯ', 'bad');
    Sfx.bad();
  }
  $('#app').classList.remove('police');
  Scene3D.police(false);
  customerLeaves(900);
}

// ----------------------------- РЕМОНТ -----------------------------
const REPAIR_NAMES = { clean: 'чистка', battery: 'замена батарейки', screen: 'замена экрана', glue: 'склейка' };
function repairFlow(c, again = false) {
  if (!again) {
    const key = c.role === 'thief' ? 'repair.thief' : 'repair.' + c.repairKind;
    say(c.person.name, line(key, { item: `<b>${c.item.title}</b>`, fee: `<b class="m">${money(c.fee)}</b>` }), c.baseMood);
  }
  actions([
    { t: 'Взяться за работу', note: REPAIR_NAMES[c.repairKind], g: 'x', fn: () => doRepair(c) },
    { t: 'Осмотреть предмет', g: 's', fn: () => openInspect(c.item, c) },
    { t: 'Вызвать полицию', g: 't', cls: 'danger', fn: () => callPolice(c) },
    { t: 'Отказать', g: 'o', fn: () => refuse(c) },
  ], `${ROLE_TAG.repair} · ${money(c.fee)}`);
}

async function doRepair(c) {
  const r = await Minigame.run(c.item, c.repairKind);
  if (c.repairKind === 'clean') c.item.condition = 1;
  if (c.repairKind === 'screen') c.item.cracked = false;
  showCounterItem(c.item);
  c.fast = r.fast;
  say(c.person.name, 'Ну что, готово? Давайте сюда.', c.role === 'thief' ? 'nervous' : 'happy');
  actions([
    { t: `Отдать и получить ${money(c.fee)}`, g: 'x', fn: () => finishRepair(c) },
    { t: 'Осмотреть ещё раз', g: 's', fn: () => openInspect(c.item, c) },
    { t: 'Вызвать полицию', g: 't', cls: 'danger', fn: () => callPolice(c) },
  ], 'РАБОТА ВЫПОЛНЕНА');
}

function finishRepair(c) {
  const tip = c.fast && c.role !== 'thief' ? round5(c.fee * 0.25) : 0;
  say(c.person.name, line('thanks') + (tip ? ` Вот ещё <b class="m">${money(tip)}</b> на чай!` : ''), 'happy');
  addMoney(c.fee + tip, 'Ремонт: ' + c.item.title);
  Sfx.cash();
  S.stats.repairs++;
  if (c.role !== 'thief') addRep(1);
  customerLeaves(1300);
}

// ----------------------------- ПОКУПАТЕЛЬ -----------------------------
function buyFlow(c, again = false) {
  if (!again) say(c.person.name, c.wantType ? line('buy', { cat: ITEM_TYPES[c.wantType].cat }) : line('buyAny'), c.baseMood);
  actions([
    { t: 'Показать товар со склада', g: 'x', fn: () => openInventory((e) => { closeModal(); haggleBuy(c, e); }, c.wantType) },
    { t: 'Нечего предложить', g: 'o', fn: () => refuse(c) },
  ], ROLE_TAG.buy + (c.wantType ? ' · ' + ITEM_TYPES[c.wantType].cat : ''));
}

function buyerMax(c, e) {
  if (c.offers[e.item.id]) return c.offers[e.item.id];
  const it = e.item;
  const match = !c.wantType || c.wantType === it.type;
  const m = roundNice(itemPretendValue(it) * R.f(1.0, 1.4) * repFactor() * (match ? 1 : 0.75));
  const o = { max: m, bid: roundNice(m * R.f(0.55, 0.75)) };
  o.cur = o.bid;
  c.offers[it.id] = o;
  return o;
}

function haggleBuy(c, e) {
  const o = buyerMax(c, e);
  const name = c.person.name;
  say(name, `${e.item.title}? Хм... Дам <b class="m">${money(o.cur)}</b>.`, c.baseMood);
  showCounterItem(e.item);
  const loop = () => haggleUI({
    head: `${name.toUpperCase()} ДАЁТ`,
    current: o.cur,
    min: 0, max: Math.max(100, o.max * 2),
    start: c.lastAsk != null ? c.lastAsk : o.cur * 1.5,
    offerLabel: 'Назвать эту цену',
    acceptLabel: `Продать за ${money(o.cur)}`,
    onBack: () => { showCounterItem(null); buyFlow(c, true); },
    onAccept: () => sellToBuyer(c, e, o.cur),
    onOffer: (p) => {
      c.lastAsk = p;
      if (p <= o.cur) return sellToBuyer(c, e, p);
      if (p > o.max * 1.7) { c.patience -= 2; say(name, line('insult'), 'angry'); }
      else if (p <= o.max && Math.random() < 0.3 + 0.7 * (o.max - p) / Math.max(1, o.max - o.cur)) return sellToBuyer(c, e, p);
      else {
        c.patience--;
        const nb = Math.min(o.max, roundNice(o.cur + (p - o.cur) * R.f(0.25, 0.5)));
        if (nb >= p) return sellToBuyer(c, e, p);
        o.cur = Math.max(o.cur, nb);
        say(name, line('counterBuy', { c: `<b class="m">${money(o.cur)}</b>` }), c.patience <= 1 ? 'angry' : 'neutral');
      }
      if (c.patience <= 0) { say(name, line('leave'), 'angry'); showCounterItem(null); return customerLeaves(); }
      loop();
    },
  });
  loop();
}

function sellToBuyer(c, e, price) {
  const it = e.item;
  if (it.fake && R.chance(0.45)) {
    say(c.person.name, 'Погодите-ка... Да это же <b>подделка</b>! Вы меня за дурака держите?!', 'angry');
    addRep(-8);
    Sfx.bad();
    showCounterItem(null);
    return customerLeaves(1600);
  }
  say(c.person.name, line('accept'), 'happy');
  S.inventory = S.inventory.filter((x) => x !== e);
  addMoney(price, `Продал: ${it.title}`);
  Sfx.cash();
  const profit = price - e.paid;
  toast(`ПРИБЫЛЬ ${profit >= 0 ? '+' : '−'}${money(Math.abs(profit))}`, profit >= 0 ? 'good' : 'bad');
  if (it.fake) S.night.soldFakes++;
  if (it.stolen) S.night.soldStolen++;
  S.stats.deals++;
  showCounterItem(null);
  customerLeaves();
}

// ---------------------------------------------------------------------
//  Осмотр предмета
// ---------------------------------------------------------------------
let insState = null;
function condText(c) { return c >= 0.9 ? 'отличное' : c >= 0.75 ? 'хорошее' : c >= 0.5 ? 'потёртое' : 'очень грязное'; }
function openInspect(it, c) {
  if (c) c.inspected++;
  const T = ITEM_TYPES[it.type];
  insState = { it, view: 0, uv: false };
  const ov = $('#inspect');
  ov.innerHTML = `
    <div class="ins-head">
      <div class="ins-title"><small>ОСМОТР · ${T.cat.toUpperCase()}</small><b>${it.title}</b></div>
      <div class="ins-cond">СОСТОЯНИЕ<b>${condText(it.condition).toUpperCase()}</b></div>
    </div>
    <div class="ins-views"><button class="lr" id="insPrev" aria-label="Предыдущая сторона">‹</button><div id="insViewName"></div><button class="lr" id="insNext" aria-label="Следующая сторона">›</button></div>
    <div class="ins-stage" id="insStage"><div class="ins-item" id="insItem"></div><div class="fx" id="insFx"></div></div>
    <div class="ins-read" id="insRead">Зажмите и водите по предмету — <b>лупа</b> покажет мелкие детали.</div>
    <div class="ins-tools" id="insTools"></div>
    <div class="ins-foot"><button class="mi back wide" id="insClose">${icon('back')}<span class="mi-t">Вернуться</span></button></div>`;
  ov.classList.add('show');
  const close = () => { Sfx.click(); ov.classList.remove('show'); ov.innerHTML = ''; insState = null; };
  $('#insClose').onclick = close;
  const setView = (v) => { insState.view = (v + T.views.length) % T.views.length; renderIns(); Sfx.tick(); };
  $('#insPrev').onclick = () => setView(insState.view - 1);
  $('#insNext').onclick = () => setView(insState.view + 1);
  renderIns();
  attachLens($('#insStage'), () => itemSvg(insState.it, insState.view, { uv: insState.uv }));
  const tools = [
    { k: 'flip', icon: 'flip', name: 'Поворот', fn: () => setView(insState.view + 1) },
    { k: 'scale', icon: 'scale', name: 'Весы', fn: toolScale },
    { k: 'magnet', icon: 'magnet', name: 'Магнит', fn: toolMagnet },
    { k: 'uv', icon: 'uv', name: 'УФ', fn: toolUV },
    { k: 'pricer', icon: 'pricer', name: 'Прайс', fn: toolPricer },
    { k: 'cat', icon: 'book', name: 'Каталог', fn: () => openCatalog(it.type) },
    { k: 'wanted', icon: 'wanted', name: 'Розыск', fn: openWanted },
  ];
  const box = $('#insTools');
  tools.forEach((t) => {
    const owned = !SHOP[t.k] || has(t.k);
    const b = el('button', { class: 'tool' + (owned ? '' : ' locked') }, `${owned ? icon(t.icon) : icon('lock')}<small>${t.name}</small>`);
    b.onclick = () => { Sfx.click(); if (!owned) { toast(`${SHOP[t.k].name.toUpperCase()}: КУПИТЕ В МАГАЗИНЕ`); return; } t.fn(b); };
    box.appendChild(b);
  });
}
function renderIns() {
  const s = insState;
  const T = ITEM_TYPES[s.it.type];
  $('#insItem').innerHTML = itemPix(s.it, s.view, { res: 256, uv: s.uv });
  $('#insViewName').textContent = T.views[s.view].toUpperCase() + `  ${s.view + 1}/${T.views.length}`;
  $('#insStage').classList.toggle('uv', s.uv);
}
function readout(html) { const r = $('#insRead'); if (!r) return; r.innerHTML = html; r.classList.remove('flash'); void r.offsetWidth; r.classList.add('flash'); }
async function toolScale() {
  const fx = $('#insFx');
  fx.innerHTML = '<div class="scale-fx"><div class="scale-disp">0</div><div class="scale-plate"></div></div>';
  $('#insItem').classList.add('on-scale');
  const disp = $('.scale-disp', fx);
  const it = insState.it, W = ITEM_TYPES[it.type].weight;
  for (let i = 0; i <= 12; i++) { disp.textContent = (it.weight * i / 12 * (1 + (12 - i) * 0.03)).toFixed(W.dec).replace('.', ','); await wait(45); }
  disp.textContent = itemWeightText(it);
  Sfx.click();
  readout(`ВЕС: <b>${itemWeightText(it)}</b> <span class="muted">— эталон смотрите в каталоге</span>`);
  await wait(1400);
  if (!insState) return;
  $('#insItem').classList.remove('on-scale');
  fx.innerHTML = '';
}
async function toolMagnet() {
  const fx = $('#insFx');
  fx.innerHTML = `<div class="magnet-fx">${icon('magnet')}</div>`;
  const it = insState.it;
  await wait(700);
  if (!insState) return;
  if (it.magnetic) { $('#insItem').classList.add('pulled'); Sfx.zap(); readout('МАГНИТ: <b class="bad">ПРИТЯГИВАЕТСЯ!</b> Внутри дешёвый сплав.'); }
  else readout('МАГНИТ: не реагирует.');
  await wait(1200);
  if (!insState) return;
  $('#insItem').classList.remove('pulled');
  fx.innerHTML = '';
}
function toolUV(b) {
  insState.uv = !insState.uv;
  b.classList.toggle('on', insState.uv);
  Sfx.zap();
  renderIns();
  readout(insState.uv ? 'УФ-СВЕТ ВКЛЮЧЁН. Ищите свечение, скрытые метки и пятна.' : 'УФ-свет выключен.');
}
function toolPricer() {
  const v = itemPretendValue(insState.it);
  readout(`ПРАЙС-БАЗА: оригинал в таком состоянии — <b class="m">${money(roundNice(v * 0.9))} – ${money(roundNice(v * 1.1))}</b>. Подделка — копейки.`);
}

// Лупа: векторная картинка, увеличенная в 3,2 раза
function attachLens(stage, getHtml) {
  const lens = el('div', { class: 'lens' }, '<div class="lens-in"></div><div class="lens-cross"></div>');
  stage.appendChild(lens);
  const inner = lens.firstChild;
  const Z = 3.2, LS = 150;
  let active = false;
  const show = (e) => {
    const itemBox = stage.querySelector('.ins-item, .cat-item') || stage;
    const r = itemBox.getBoundingClientRect(), sr = stage.getBoundingClientRect();
    const px = e.clientX - r.left, py = e.clientY - r.top;
    const touch = e.pointerType === 'touch' || e.pointerType === 'pen';
    const lx = e.clientX - sr.left, ly = e.clientY - sr.top - (touch ? 95 : 0);
    const html = getHtml();
    if (inner._html !== html) { inner.innerHTML = html; inner._html = html; }
    inner.style.width = r.width * Z + 'px';
    inner.style.height = r.height * Z + 'px';
    inner.style.left = (LS / 2 - px * Z) + 'px';
    inner.style.top = (LS / 2 - py * Z) + 'px';
    lens.style.transform = `translate(${lx - LS / 2}px, ${ly - LS / 2}px)`;
    lens.classList.add('show');
  };
  stage.addEventListener('pointerdown', (e) => { active = true; try { stage.setPointerCapture(e.pointerId); } catch (_) { /* */ } show(e); });
  stage.addEventListener('pointermove', (e) => { if (active || e.pointerType === 'mouse') show(e); });
  const hide = () => { active = false; lens.classList.remove('show'); };
  stage.addEventListener('pointerup', (e) => { if (e.pointerType !== 'mouse') hide(); else active = false; });
  stage.addEventListener('pointercancel', hide);
  stage.addEventListener('pointerleave', hide);
}

// ---------------------------------------------------------------------
//  Окна
// ---------------------------------------------------------------------
function modal(html, buttons = [], opts = {}) {
  const m = $('#modal');
  m.className = 'overlay show';
  m.innerHTML = `<div class="win ${opts.cls || ''}"><div class="win-h">${opts.title || ''}</div><div class="win-b">${html}</div><div class="win-f"></div></div>`;
  if (buttons.length) $('.win-f', m).appendChild(menuList(buttons));
  else $('.win-f', m).remove();
  return m;
}
function closeModal() { const m = $('#modal'); m.className = 'overlay'; m.innerHTML = ''; }
function modal2(html, buttons, title, cls = '') {
  const m = $('#modal2');
  m.className = 'overlay show';
  m.innerHTML = `<div class="win ${cls}"><div class="win-h">${title}</div><div class="win-b">${html}</div><div class="win-f"></div></div>`;
  $('.win-f', m).appendChild(menuList(buttons));
  return m;
}
function closeModal2() { const m = $('#modal2'); m.className = 'overlay'; m.innerHTML = ''; }

function openCatalog(type) {
  const types = typesForDay(S.day);
  if (!types.includes(type)) type = types[0];
  const render = (t) => {
    const T = ITEM_TYPES[t];
    const ref = referenceItem(t);
    const m = modal2(`
      <div class="cat-tabs">${types.map((x) => `<button data-t="${x}" class="${x === t ? 'on' : ''}" title="${ITEM_TYPES[x].name}">${itemPix(referenceItem(x), 0, { res: 48, noDirt: true })}</button>`).join('')}</div>
      <div class="cat-name">${T.name.toUpperCase()} <small>эталон оригинала</small></div>
      <div class="cat-refs">${T.views.map((v, i) => `<div class="cat-ref" data-v="${i}"><div class="cat-item">${itemPix(ref, i, { res: 192, noDirt: true })}</div><small>${v}</small></div>`).join('')}</div>
      <p class="muted center">Зажмите на эталоне — работает лупа</p>
      <ul class="cat-list">${T.catalog.map((l) => `<li>${l}</li>`).join('')}</ul>
      <table class="kv"><tr><td>Оригинал, отличное состояние</td><td class="m">${money(T.value[0])} – ${money(T.value[1])}</td></tr><tr><td>Подделка</td><td>≈ ${money(T.fakeValue)}</td></tr></table>
      <p class="muted">Грязь и износ снижают цену до 55%.</p>`,
    [{ t: 'Закрыть', g: 'o', fn: closeModal2 }], 'КАТАЛОГ ОЦЕНЩИКА', 'wide');
    $$('.cat-tabs button', m).forEach((b) => b.onclick = () => { Sfx.tick(); render(b.dataset.t); });
    $$('.cat-ref', m).forEach((box) => { const v = +box.dataset.v; attachLens(box, () => itemSvg(ref, v, { noDirt: true })); });
  };
  render(type);
}

function openWanted() {
  modal2(`${wantedHtml()}<p class="muted">Сверяйте гравировки, серийные номера, IMEI и инвентарные номера. Ложный вызов полиции бьёт по репутации.</p>`,
    [{ t: 'Понятно', g: 'o', fn: closeModal2 }], 'ОРИЕНТИРОВКИ ПОЛИЦИИ');
}

function openInventory(onPick, wantType) {
  const items = S.inventory;
  const render = () => {
    const list = items.length ? items.map((e, i) => {
      const it = e.item;
      const canClean = it.condition < 0.75 && ITEM_TYPES[it.type].repairs.includes('clean') && !onPick;
      const match = wantType && it.type === wantType;
      return `<div class="inv-row ${match ? 'match' : ''}">
        <div class="inv-thumb">${itemPix(it, 0, { res: 64 })}</div>
        <div class="inv-info"><b>${it.title}</b><small>куплено за ${money(e.paid)} · ${condText(it.condition)}</small>${match ? '<small class="ok">то, что ищет клиент</small>' : ''}</div>
        <div class="inv-btns">
          ${onPick ? `<button class="sbtn hot" data-pick="${i}">${icon('tag')}Предложить</button>` : ''}
          ${canClean ? `<button class="sbtn" data-clean="${i}">${icon('sparkle')}Почистить</button>` : ''}
          <button class="sbtn" data-look="${i}">${icon('lens')}Осмотр</button>
        </div></div>`;
    }).join('') : '<p class="muted center">Склад пуст. Купите что-нибудь у клиентов.</p>';
    const m = modal(`${!onPick ? '<p class="muted">Почищенные вещи стоят дороже. Продавайте покупателям или на вечернем аукционе.</p>' : ''}<div class="inv-list">${list}</div>`,
      [{ t: onPick ? 'Назад' : 'Закрыть', g: 'o', fn: () => closeModal() }], { title: `СКЛАД · ${items.length} ШТ.` });
    $$('[data-pick]', m).forEach((b) => b.onclick = () => { Sfx.click(); onPick(items[+b.dataset.pick]); });
    $$('[data-look]', m).forEach((b) => b.onclick = () => { Sfx.click(); openInspect(items[+b.dataset.look].item); });
    $$('[data-clean]', m).forEach((b) => b.onclick = async () => {
      Sfx.click();
      const e = items[+b.dataset.clean];
      closeModal();
      await Minigame.run(e.item, 'clean');
      e.item.condition = 1;
      toast('ВЕЩЬ КАК НОВАЯ — СТОИТ ДОРОЖЕ', 'good');
      render();
    });
  };
  render();
}

function openPause() {
  if ($('#modal').classList.contains('show') || $('#title').classList.contains('show')) return;
  modal2(`<table class="kv"><tr><td>День</td><td>${pad2(S.day)}</td></tr><tr><td>Касса</td><td class="money">${money(S.money)}</td></tr><tr><td>Репутация</td><td>${Math.round(S.rep)} / 100</td></tr><tr><td>Аренда сегодня</td><td class="bad">${money(rent(S.day))}</td></tr><tr><td>Воров поймано</td><td>${S.stats.caught}</td></tr></table>`, [
    { t: 'Продолжить', g: 'x', fn: closeModal2 },
    { t: 'Каталог', g: 't', icon: 'book', fn: () => { closeModal2(); openCatalog(currentCustomer && currentCustomer.item ? currentCustomer.item.type : 'watch'); } },
    { t: 'Ориентировки', g: 't', icon: 'wanted', fn: () => { closeModal2(); openWanted(); } },
    { t: `Склад (${S.inventory.length})`, g: 't', icon: 'box', fn: () => { closeModal2(); openInventory(null); } },
    { t: Sfx.muted ? 'Звук: выкл' : 'Звук: вкл', g: 't', icon: 'sign', fn: () => { Sfx.muted = !Sfx.muted; closeModal2(); openPause(); } },
  ], 'МЕНЮ');
}

// ---------------------------------------------------------------------
//  Конец дня
// ---------------------------------------------------------------------
function endDay() {
  showCounterItem(null);
  say('', '', null);
  actions([]);
  const items = S.inventory;
  const sel = new Set();
  const render = () => {
    const rows = items.length ? items.map((e, i) => `<label class="inv-row auc ${sel.has(i) ? 'sel' : ''}"><input type="checkbox" data-i="${i}" ${sel.has(i) ? 'checked' : ''}><span class="chk"></span>
        <div class="inv-thumb">${itemPix(e.item, 0, { res: 64 })}</div>
        <div class="inv-info"><b>${e.item.title}</b><small>куплено за ${money(e.paid)} · ${condText(e.item.condition)}</small></div></label>`).join('')
      : '<p class="muted center">На складе пусто.</p>';
    const ev = S.log.events.slice(-8).map(([t, v]) => `<tr><td>${t}</td><td class="${v >= 0 ? 'ok' : 'bad'}">${v >= 0 ? '+' : '−'}${money(Math.abs(v))}</td></tr>`).join('');
    const m = modal(`
      <table class="kv big"><tr><td>Доход</td><td class="ok">+${money(S.log.income)}</td></tr><tr><td>Расходы</td><td class="bad">−${money(S.log.spent)}</td></tr><tr><td>Касса</td><td class="money">${money(S.money)}</td></tr></table>
      ${ev ? `<div class="sub-h">ЖУРНАЛ</div><table class="kv">${ev}</table>` : ''}
      <div class="sub-h">ВЕЧЕРНИЙ АУКЦИОН</div>
      <p class="muted">Отметьте вещи. Эксперты аукциона заплатят 70–95% цены оригинала, но подделки и краденое они распознают.</p>
      <div class="inv-list">${rows}</div>`,
      [{ t: sel.size ? `Продать отмеченное (${sel.size})` : 'Пропустить аукцион', g: 'x', fn: () => runAuction([...sel].map((i) => items[i])) }],
      { title: `ДЕНЬ ${pad2(S.day)} · СМЕНА ОКОНЧЕНА` });
    $$('input[type=checkbox]', m).forEach((cb) => cb.onchange = () => { const i = +cb.dataset.i; if (cb.checked) sel.add(i); else sel.delete(i); Sfx.tick(); render(); });
  };
  render();
}

function runAuction(list) {
  const results = [];
  let total = 0;
  for (const e of list) {
    const it = e.item;
    S.inventory = S.inventory.filter((x) => x !== e);
    if (it.fake) {
      results.push(`<tr><td>${it.title}</td><td class="bad">ПОДДЕЛКА · $0</td></tr>`);
      S.rep = clamp(S.rep - 3, 0, 100);
    } else if (it.stolen && R.chance(0.5)) {
      const fine = has('safe') ? 150 : 300;
      results.push(`<tr><td>${it.title}</td><td class="bad">КРАДЕНОЕ · штраф ${money(fine)}</td></tr>`);
      S.money -= fine; S.rep = clamp(S.rep - 10, 0, 100);
    } else {
      const p = roundNice(itemValue(it) * R.f(0.7, 0.95));
      total += p;
      const pr = p - e.paid;
      results.push(`<tr><td>${it.title}</td><td class="${pr >= 0 ? 'ok' : 'bad'}">${money(p)} (${pr >= 0 ? '+' : '−'}${money(Math.abs(pr))})</td></tr>`);
    }
  }
  if (total) { S.money += total; S.stats.earned += total; Sfx.cash(); }
  hud();
  nightEvents(results);
}

function nightEvents(auction) {
  const ev = [];
  for (let i = 0; i < S.night.soldFakes; i++) { ev.push('Покупатель понёс вещь к эксперту и узнал, что это подделка. Плохой отзыв: −5 репутации.'); S.rep = clamp(S.rep - 5, 0, 100); }
  for (let i = 0; i < S.night.soldStolen; i++) {
    if (R.chance(0.4)) { const f = has('safe') ? 125 : 250; ev.push(`Проданная вами вещь оказалась краденой. Штраф ${money(f)}, −8 репутации.`); S.money -= f; S.rep = clamp(S.rep - 8, 0, 100); }
  }
  S.inventory.filter((e) => e.item.stolen).forEach((e) => {
    if (R.chance(0.4)) {
      const f = has('safe') ? 150 : 300;
      ev.push(`Ночью полиция проверила склад и нашла краденое: «${e.item.title}». Изъято, штраф ${money(f)}, −10 репутации.`);
      S.inventory = S.inventory.filter((x) => x !== e);
      S.money -= f; S.rep = clamp(S.rep - 10, 0, 100);
    }
  });
  const r = rent(S.day);
  S.money -= r;
  hud();
  const over = S.money < 0 || S.rep <= 0;
  modal(`
    ${auction.length ? `<div class="sub-h">ИТОГИ АУКЦИОНА</div><table class="kv">${auction.join('')}</table>` : ''}
    ${ev.length ? `<div class="sub-h">ПРОИСШЕСТВИЯ</div><ul class="night-list">${ev.map((x) => `<li>${x}</li>`).join('')}</ul>` : '<p class="muted">Ночь прошла спокойно.</p>'}
    <table class="kv big"><tr><td>Аренда</td><td class="bad">−${money(r)}</td></tr><tr><td>В кассе</td><td class="${S.money < 0 ? 'bad' : 'money'}">${money(S.money)}</td></tr><tr><td>Репутация</td><td>${Math.round(S.rep)}</td></tr></table>`,
  [{ t: over ? 'Что же дальше…' : 'В магазин инструментов', g: 'x', fn: () => (over ? gameOver() : openShop()) }], { title: 'НОЧЬ' });
}

function openShop() {
  const render = () => {
    const rows = Object.entries(SHOP).map(([k, s]) => {
      const own = has(k);
      return `<div class="shop-row ${own ? 'own' : ''}"><div class="shop-ic">${icon(s.icon)}</div><div class="inv-info"><b>${s.name}</b><small>${s.desc}</small></div>
        ${own ? '<span class="owned">КУПЛЕНО</span>' : `<button class="sbtn hot" data-buy="${k}" ${S.money < s.price ? 'disabled' : ''}>${icon('coin')}${money(s.price)}</button>`}</div>`;
    }).join('');
    const m = modal(`<table class="kv"><tr><td>В кассе</td><td class="money">${money(S.money)}</td></tr><tr><td>Завтра аренда</td><td class="bad">${money(rent(S.day + 1))}</td></tr></table><div class="inv-list">${rows}</div>`,
      [{ t: 'Следующий день', g: 'x', fn: () => { closeModal(); S.day++; S.wanted = []; saveMsg(); startDay(); } }], { title: 'МАГАЗИН ИНСТРУМЕНТОВ' });
    $$('[data-buy]', m).forEach((b) => b.onclick = () => {
      const k = b.dataset.buy;
      if (S.money < SHOP[k].price) return;
      S.money -= SHOP[k].price; S.owned[k] = true; Sfx.cash(); hud(); render();
    });
  };
  render();
}

function saveMsg() {
  const d = $('#saving');
  if (!d) return;
  d.classList.add('show');
  setTimeout(() => d.classList.remove('show'), 1600);
}

function gameOver() {
  const why = S.rep <= 0 ? 'Репутация упала до нуля — клиенты обходят ваш ломбард стороной.' : 'Нечем платить аренду. Хозяин помещения сменил замки.';
  const best = Math.max(S.day, getBest());
  try { localStorage.setItem('lombard_best', best); } catch (e) { /* */ }
  wipe();
  modal(`<div class="center go"><div class="go-t">ЛОМБАРД ЗАКРЫТ</div><p>${why}</p></div>
    <table class="kv"><tr><td>Продержались</td><td>${S.day} дн.</td></tr><tr><td>Заработано</td><td class="money">${money(S.stats.earned)}</td></tr><tr><td>Воров поймано</td><td>${S.stats.caught}</td></tr><tr><td>Подделок раскрыто</td><td>${S.stats.fakesSpotted}</td></tr><tr><td>Купили подделок</td><td>${S.stats.fakesBought}</td></tr><tr><td>Ремонтов</td><td>${S.stats.repairs}</td></tr><tr><td>Рекорд</td><td>${best} дн.</td></tr></table>`,
  [{ t: 'Начать заново', g: 'x', fn: () => { closeModal(); S = newState(); S.seenIntro = true; startDay(); } }], { title: 'ИГРА ОКОНЧЕНА' });
}

// ---------------------------------------------------------------------
//  Старт
// ---------------------------------------------------------------------
function showIntro(after) {
  modal(`<div class="intro">
    <div class="intro-row">${icon('coin')}<p><b>Скупайте</b> вещи дешевле их реальной цены и <b>перепродавайте</b> покупателям или на вечернем аукционе.</p></div>
    <div class="intro-row">${icon('lens')}<p><b>Осматривайте</b> всё. Сверяйтесь с <b>каталогом</b>: подделки выдают опечатки, клейма, вес, магнит и УФ-свечение.</p></div>
    <div class="intro-row">${icon('siren')}<p>Следите за <b>ориентировками</b>: гравировки, серийники и IMEI краденых вещей. Нашли — <b>вызывайте полицию</b>.</p></div>
    <div class="intro-row">${icon('wrench')}<p><b>Ремонтируйте</b> вещи клиентов: чистка, замена экрана и батареек, склейка.</p></div>
    <div class="intro-row">${icon('alert')}<p>Каждый вечер — <b>аренда</b>. Не уйдите в минус и берегите <b>репутацию</b>.</p></div>
  </div>`, [{ t: 'Понятно, открываемся', g: 'x', fn: () => { closeModal(); after(); } }], { title: 'КАК ИГРАТЬ' });
}

function boot() {
  Scene3D.init($('#scene'));
  if (!Scene3D.ok) $('#app').classList.add('no3d');
  Scene3D.onItemClick = (it) => { if (!$('#inspect').classList.contains('show') && currentCustomer && currentCustomer.item) openInspect(it, currentCustomer); else if (!$('#inspect').classList.contains('show')) openInspect(it); };
  Scene3D.titleMode(true);
  $('#itemHint').innerHTML = icon('lens') + 'ОСМОТРЕТЬ ПРЕДМЕТ';
  $('#itemHint').onclick = () => { const it = currentCustomer && currentCustomer.item; if (it) openInspect(it, currentCustomer); };
  $('#bPause').onclick = () => { Sfx.click(); openPause(); };
  $('#bInv').onclick = () => { Sfx.click(); if (!$('#modal').classList.contains('show')) openInventory(null); };

  const saved = load();
  const best = getBest();
  const T = $('#title');
  T.classList.add('show');
  $('#app').classList.add('at-title');
  T.innerHTML = `
    <div class="t-logo"><div class="t-main">ЛОМБАРД</div><div class="t-sub">ПОСЛЕДНИЙ ШАНС</div></div>
    <div class="t-menu" id="tMenu"></div>
    <div class="t-foot">${best ? `Рекорд: ${best} дн.` : ''}</div>`;
  const go = (st) => {
    Sfx.init();
    S = st;
    T.classList.remove('show');
    $('#app').classList.remove('at-title');
    Scene3D.titleMode(false);
    hud();
    if (!S.seenIntro) { S.seenIntro = true; showIntro(startDay); } else startDay();
  };
  const mm = $('#tMenu');
  mm.appendChild(menuList([
    saved ? { t: `Продолжить · день ${pad2(saved.day)}`, g: 'x', fn: () => go(Object.assign(newState(), saved)) } : null,
    { t: 'Новая игра', g: saved ? 't' : 'x', icon: 'flip', fn: () => go(newState()) },
  ]));
}

window.addEventListener('load', boot);
