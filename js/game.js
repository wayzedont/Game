// =====================================================================
//  ЛОМБАРД — основная логика
// =====================================================================

const SHOP = {
  scale: { name: 'Ювелирные весы', icon: '⚖️', price: 150, desc: 'Точный вес предмета. Подделки часто легче оригинала.', tool: true },
  magnet: { name: 'Магнит', icon: '🧲', price: 120, desc: 'Золото не магнитится. Дешёвые сплавы — да.', tool: true },
  uv: { name: 'УФ-фонарик', icon: '🔦', price: 300, desc: 'Скрытые метки, люминофор, свежая краска и новая глазурь.', tool: true },
  pricer: { name: 'Прайс-база', icon: '💻', price: 350, desc: 'Показывает рыночную цену оригинала в таком состоянии.', tool: true },
  coffee: { name: 'Кофемашина', icon: '☕', price: 200, desc: 'Клиенты терпеливее при торге (+1 попытка).' },
  sign: { name: 'Неоновая вывеска', icon: '🏮', price: 450, desc: '+1 клиент в день, покупатели заходят чаще.' },
  safe: { name: 'Адвокат', icon: '💼', price: 500, desc: 'Штрафы полиции за краденое — вдвое меньше.' },
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
    stats: { earned: 0, deals: 0, caught: 0, fakesSpotted: 0, repairs: 0, fakesBought: 0, best: 0 },
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

// ---------------------------------------------------------------------
//  HUD / UI helpers
// ---------------------------------------------------------------------
function hud() {
  $('#hDay').textContent = 'День ' + S.day;
  $('#hMoney').textContent = money(S.money);
  $('#hRep').textContent = Math.round(S.rep);
  $('#hRep').parentElement.classList.toggle('low', S.rep < 25);
  const left = Math.max(0, S.queue.length - S.qi);
  $('#hLeft').textContent = left;
  $('#hInv').textContent = S.inventory.length;
}
function toast(t, kind = '') {
  const box = $('#toasts');
  if ([...box.children].some((x) => x.innerHTML === t && !x.classList.contains('out'))) return;
  while (box.children.length >= 3) box.firstChild.remove();
  const d = el('div', { class: 'toast ' + kind }, t);
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
  if (v) toast((v > 0 ? '⭐ Репутация +' : '💢 Репутация ') + v, v > 0 ? 'good' : 'bad');
}

let currentCustomer = null;
function say(name, text, mood) {
  $('#spName').textContent = name;
  const p = $('#spText');
  p.classList.remove('pop'); void p.offsetWidth; p.classList.add('pop');
  p.innerHTML = text;
  if (mood && currentCustomer) setMood(mood);
}
function setMood(m) {
  const c = currentCustomer; if (!c) return;
  c.mood = m;
  $('#person').innerHTML = personSvg(c.person, m);
  if (m === 'angry') { $('#person').classList.remove('shake'); void $('#person').offsetWidth; $('#person').classList.add('shake'); }
}
function actions(list) {
  const box = $('#actions');
  box.innerHTML = '';
  const main = el('div', { class: 'act-main' }), sub = el('div', { class: 'act-sub' });
  list.forEach((a) => {
    if (!a) return;
    const b = el('button', { class: 'btn ' + (a.cls || '') + (a.small ? ' small' : '') }, a.t);
    if (a.disabled) b.disabled = true;
    b.onclick = () => { Sfx.click(); a.fn(); };
    (a.small ? sub : main).appendChild(b);
  });
  box.appendChild(main);
  if (sub.children.length) box.appendChild(sub);
}
function showCounterItem(it) {
  const c = $('#counterItem');
  if (!it) { c.innerHTML = ''; c.classList.remove('show'); return; }
  c.innerHTML = itemSvg(it, 0) + '<span class="tap">🔍</span>';
  c.classList.add('show');
  c.onclick = () => openInspect(it);
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
  // краденое: первая ориентировка появляется почти наверняка
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
  showNews();
}

function updateTicker() {
  const t = S.wanted.map((w) => '🚨 РАЗЫСКИВАЕТСЯ: ' + w.text).join('   •   ');
  $('#ticker').innerHTML = `<span>${t}   •   ${t}</span>`;
}

function showNews() {
  modal(`
    <div class="news">
      <div class="news-tv">
        <div class="news-badge">📺 УТРЕННИЕ НОВОСТИ · ДЕНЬ ${S.day}</div>
        <h2>Полиция просит ломбарды быть бдительными</h2>
        <p>В городе участились кражи. Если вам принесут одну из этих вещей — звоните в полицию:</p>
        <ul class="wanted-list">${S.wanted.map((w) => `<li><span>${ITEM_TYPES[w.type].icon}</span>${w.text}</li>`).join('')}</ul>
      </div>
      <div class="news-rent">Аренда сегодня вечером: <b>${money(rent(S.day))}</b> · В кассе: <b>${money(S.money)}</b></div>
      ${S.day === 3 ? '<div class="news-tip">Новое: в город привезли антиквариат — фарфоровые вазы.</div>' : ''}
      ${S.day === 2 ? '<div class="news-tip">Новое: теперь приносят сумки Monaro и картины Мореля. Загляните в каталог!</div>' : ''}
    </div>`, [{ t: '🔓 Открыть ломбард', cls: 'primary', fn: () => { closeModal(); nextCustomer(); } }]);
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
    if (kind === 'repair') {
      it.condition = R.f(0.15, 0.3);
      c.repairKind = 'clean';
    }
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
    c.role = 'client';
    c.person = makePerson('any');
  } else {
    c.role = 'buyer';
    c.person = makePerson('any');
    const cats = [...new Set(S.inventory.map((e) => e.item.type))];
    c.wantType = R.chance(0.75) ? R.pick(cats) : (R.chance(0.5) ? R.pick(types) : null);
    c.offers = {};
  }
  if (kind === 'repair') c.role = slot.wanted ? 'thief' : 'client';

  // настроение / «нервы»
  c.baseMood = 'neutral';
  if (c.role === 'thief') c.baseMood = R.chance(0.8) ? 'nervous' : 'sly';
  else if (c.role === 'scam') c.baseMood = R.pick(['sly', 'nervous', 'happy', 'neutral']);
  else if (c.role === 'old') c.baseMood = R.pick(['sad', 'neutral', 'happy']);
  else if (R.chance(0.12)) c.baseMood = 'nervous';
  else c.baseMood = R.pick(['neutral', 'happy', 'neutral']);

  // цены
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
  Sfx.bell();
  const p = $('#person');
  p.className = 'person';
  p.innerHTML = personSvg(c.person, c.baseMood);
  void p.offsetWidth;
  p.classList.add('enter');
  showCounterItem(null);
  $('#panel').classList.remove('hidden');
  say('', '...', null);
  actions([]);
  await wait(450);
  if (c.item) { showCounterItem(c.item); Sfx.thud(); }
  if (c.kind === 'sell') sellFlow(c);
  else if (c.kind === 'repair') repairFlow(c);
  else buyFlow(c);
}

async function customerLeaves(delay = 1100) {
  actions([]);
  await wait(delay);
  showCounterItem(null);
  $('#person').classList.add('leave');
  await wait(550);
  $('#person').innerHTML = '';
  currentCustomer = null;
  S.qi++;
  hud();
  await wait(250);
  nextCustomer();
}

// ----------------------------- ПРОДАВЕЦ -----------------------------
function sellFlow(c, again = false) {
  const name = c.person.name;
  if (!again) {
    const text = line('sell.' + c.role, { item: `<b>${c.item.title}</b>`, ask: `<b class="m">${money(c.ask)}</b>` });
    say(name, text, c.baseMood);
  }
  actions([
    { t: '🔍 Осмотреть', fn: () => openInspect(c.item, c) },
    { t: '💰 Торговаться', cls: 'primary', fn: () => haggleSell(c) },
    { t: '🙅 Отказать', fn: () => refuse(c) },
    { t: '⚠️ Это подделка!', small: true, fn: () => accuseFake(c) },
    { t: '🚓 Вызвать полицию', small: true, cls: 'danger', fn: () => callPolice(c) },
  ]);
}

function haggleUI({ title, current, currentLabel, min, max, start, onOffer, onAccept, acceptLabel, onBack, limit }) {
  const step = max > 3000 ? 50 : max > 600 ? 10 : 5;
  let v = clamp(Math.round(start / step) * step, min, max);
  const box = $('#actions');
  box.innerHTML = `
    <div class="haggle">
      <div class="hg-row"><span>${currentLabel}</span><b class="m">${money(current)}</b></div>
      <div class="hg-val" id="hgVal"></div>
      <input type="range" id="hgRange" min="${min}" max="${max}" step="${step}" value="${v}">
      <div class="hg-steps">
        <button data-d="-${step * 10}">−${step * 10}</button><button data-d="-${step}">−${step}</button>
        <button data-d="${step}">+${step}</button><button data-d="${step * 10}">+${step * 10}</button>
      </div>
      <div class="act-main">
        <button class="btn" id="hgBack">↩ Назад</button>
        <button class="btn primary" id="hgOffer">${title}</button>
      </div>
      <div class="act-sub"><button class="btn small ok" id="hgAccept">${acceptLabel}</button></div>
    </div>`;
  const val = $('#hgVal'), rng = $('#hgRange');
  const upd = () => { val.textContent = money(v); val.classList.toggle('over', limit != null && v > limit); };
  upd();
  rng.oninput = () => { v = +rng.value; upd(); };
  $$('.hg-steps button', box).forEach((b) => b.onclick = () => { Sfx.click(); v = clamp(v + +b.dataset.d, min, max); rng.value = v; upd(); });
  $('#hgBack').onclick = () => { Sfx.click(); onBack(); };
  $('#hgOffer').onclick = () => {
    Sfx.click();
    if (limit != null && v > limit) { toast('Не хватает денег в кассе', 'bad'); return; }
    onOffer(v);
  };
  $('#hgAccept').onclick = () => {
    Sfx.click();
    if (limit != null && current > limit) { toast('Не хватает денег в кассе', 'bad'); return; }
    onAccept();
  };
}

function haggleSell(c) {
  const name = c.person.name;
  haggleUI({
    title: '💵 Предложить',
    currentLabel: `${name} просит:`,
    current: c.cur,
    min: 0, max: Math.max(5, Math.min(Math.max(c.ask * 1.3, 100), S.money)),
    start: c.lastOffer != null ? c.lastOffer : c.cur * 0.6,
    limit: S.money,
    acceptLabel: `🤝 Согласиться на ${money(c.cur)}`,
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
      if (c.patience <= 0) {
        say(name, line('leave'), 'angry');
        return customerLeaves();
      }
      haggleSell(c);
    },
  });
}

function buyFromSeller(c, price) {
  if (price > S.money) { toast('Не хватает денег в кассе', 'bad'); return; }
  say(c.person.name, line('accept'), 'happy');
  addMoney(-price, `Купил: ${c.item.title}`);
  Sfx.cash();
  S.inventory.push({ item: c.item, paid: price, day: S.day });
  S.stats.deals++;
  if (c.item.fake) S.stats.fakesBought++;
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
    toast('✅ Верно! Это подделка.', 'good');
    addRep(2);
    Sfx.good();
  } else {
    say(c.person.name, line('fakeAccused'), 'angry');
    toast('❌ Ошибка: вещь была подлинной', 'bad');
    addRep(-3);
    Sfx.bad();
  }
  customerLeaves(1500);
}

async function callPolice(c) {
  actions([]);
  Sfx.siren();
  $('#app').classList.add('police');
  say('📞 Диспетчер', 'Наряд выехал. Задержите клиента...', null);
  await wait(1300);
  const name = c.person.name;
  if (c.item && c.item.stolen) {
    setMood('shock');
    say(name, line('policeThief'), 'shock');
    await wait(1200);
    const reward = round5(100 + itemValue(c.item) * 0.1);
    S.stats.caught++;
    addMoney(reward, 'Награда полиции');
    addRep(8);
    toast('🚓 Вор задержан! Вещь вернут владельцу.', 'good');
    Sfx.good();
  } else if (c.item && c.item.fake && c.kind === 'sell') {
    say(name, line('fakeCaught'), 'shock');
    await wait(1000);
    S.stats.fakesSpotted++;
    addMoney(50, 'Сдал мошенника');
    addRep(3);
    toast('🚓 Мошенник с подделкой задержан', 'good');
  } else {
    say(name, line('policeInnocent'), 'angry');
    await wait(900);
    addRep(-10);
    toast('🚓 Ложный вызов: вещь чистая', 'bad');
    Sfx.bad();
  }
  $('#app').classList.remove('police');
  customerLeaves(900);
}

// ----------------------------- РЕМОНТ -----------------------------
const REPAIR_NAMES = { clean: 'чистка', battery: 'замена батарейки', screen: 'замена экрана', glue: 'склейка' };
function repairFlow(c, again = false) {
  const name = c.person.name;
  if (!again) {
    const key = c.role === 'thief' ? 'repair.thief' : 'repair.' + c.repairKind;
    say(name, line(key, { item: `<b>${c.item.title}</b>`, fee: `<b class="m">${money(c.fee)}</b>` }), c.baseMood);
  }
  actions([
    { t: '🔍 Осмотреть', fn: () => openInspect(c.item, c) },
    { t: `🔧 Взяться (${REPAIR_NAMES[c.repairKind]})`, cls: 'primary', fn: () => doRepair(c) },
    { t: '🙅 Отказать', fn: () => refuse(c) },
    { t: '🚓 Вызвать полицию', small: true, cls: 'danger', fn: () => callPolice(c) },
  ]);
}

async function doRepair(c) {
  $('#panel').classList.add('hidden');
  const r = await Minigame.run(c.item, c.repairKind);
  $('#panel').classList.remove('hidden');
  if (c.repairKind === 'clean') c.item.condition = 1;
  if (c.repairKind === 'screen') c.item.cracked = false;
  showCounterItem(c.item);
  c.fast = r.fast;
  c.repaired = true;
  say(c.person.name, 'Ну что, готово? Давайте сюда.', c.role === 'thief' ? 'nervous' : 'happy');
  actions([
    { t: `🤝 Отдать и получить ${money(c.fee)}`, cls: 'primary', fn: () => finishRepair(c) },
    { t: '🔍 Осмотреть ещё раз', fn: () => openInspect(c.item, c) },
    { t: '🚓 Вызвать полицию', small: true, cls: 'danger', fn: () => callPolice(c) },
  ]);
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
  const name = c.person.name;
  if (!again) {
    const text = c.wantType ? line('buy', { cat: ITEM_TYPES[c.wantType].cat }) : line('buyAny');
    say(name, text, c.baseMood);
  }
  actions([
    { t: '📦 Показать товар', cls: 'primary', fn: () => pickForBuyer(c) },
    { t: '🙅 Нечего предложить', fn: () => refuse(c) },
  ]);
}

function buyerMax(c, e) {
  if (c.offers[e.item.id]) return c.offers[e.item.id];
  const it = e.item;
  const match = !c.wantType || c.wantType === it.type;
  const base = itemPretendValue(it);
  const m = roundNice(base * R.f(1.0, 1.4) * repFactor() * (match ? 1 : 0.75));
  const o = { max: m, bid: roundNice(m * R.f(0.55, 0.75)), cur: 0 };
  o.cur = o.bid;
  c.offers[it.id] = o;
  return o;
}

function pickForBuyer(c) {
  openInventory((e) => { closeModal(); haggleBuy(c, e); }, c.wantType);
}

function haggleBuy(c, e) {
  const o = buyerMax(c, e);
  const name = c.person.name;
  say(name, `${e.item.title}? Хм... Дам <b class="m">${money(o.cur)}</b>.`, c.baseMood);
  showCounterItem(e.item);
  const loop = () => haggleUI({
    title: '🏷️ Назвать цену',
    currentLabel: `${name} даёт:`,
    current: o.cur,
    min: 0, max: Math.max(100, o.max * 2),
    start: c.lastAsk != null ? c.lastAsk : o.cur * 1.5,
    acceptLabel: `🤝 Продать за ${money(o.cur)}`,
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
  toast(`Прибыль: ${profit >= 0 ? '+' : '−'}${money(Math.abs(profit))}`, profit >= 0 ? 'good' : 'bad');
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
function openInspect(it, c) {
  if (c) c.inspected++;
  const T = ITEM_TYPES[it.type];
  insState = { it, view: 0, uv: false };
  const ov = $('#inspect');
  ov.innerHTML = `
    <div class="ins-head"><div><b>${it.title}</b><small>${T.cat} · состояние: ${condText(it.condition)}</small></div><button class="x" id="insClose">✕</button></div>
    <div class="ins-views">${T.views.map((v, i) => `<button data-v="${i}" class="${i === 0 ? 'on' : ''}">${v}</button>`).join('')}</div>
    <div class="ins-stage" id="insStage"><div class="ins-item" id="insItem"></div><div class="fx" id="insFx"></div></div>
    <div class="ins-read" id="insRead">🔍 Зажмите и водите по предмету — <b>лупа</b> покажет мелкие детали.</div>
    <div class="ins-tools" id="insTools"></div>`;
  ov.classList.add('show');
  $('#insClose').onclick = () => { Sfx.click(); ov.classList.remove('show'); ov.innerHTML = ''; insState = null; };
  $$('.ins-views button', ov).forEach((b) => b.onclick = () => { Sfx.click(); insState.view = +b.dataset.v; $$('.ins-views button', ov).forEach((x) => x.classList.toggle('on', x === b)); renderIns(); });
  renderIns();
  attachLens($('#insStage'), () => itemSvg(insState.it, insState.view), () => insState && insState.uv);
  const tools = [
    { k: 'flip', icon: '🔄', name: 'Перевернуть', fn: () => { insState.view = (insState.view + 1) % T.views.length; $$('.ins-views button', ov).forEach((x) => x.classList.toggle('on', +x.dataset.v === insState.view)); renderIns(); } },
    { k: 'scale', icon: '⚖️', name: 'Весы', fn: toolScale },
    { k: 'magnet', icon: '🧲', name: 'Магнит', fn: toolMagnet },
    { k: 'uv', icon: '🔦', name: 'УФ', fn: toolUV },
    { k: 'pricer', icon: '💻', name: 'Прайс', fn: toolPricer },
    { k: 'cat', icon: '📖', name: 'Каталог', fn: () => openCatalog(it.type) },
    { k: 'wanted', icon: '🚨', name: 'Розыск', fn: openWanted },
  ];
  const box = $('#insTools');
  tools.forEach((t) => {
    const owned = !SHOP[t.k] || has(t.k);
    const b = el('button', { class: 'tool' + (owned ? '' : ' locked') }, `<span>${t.icon}</span><small>${t.name}</small>`);
    b.onclick = () => { Sfx.click(); if (!owned) { toast(`🔒 ${SHOP[t.k].name} — купите в магазине после смены`); return; } t.fn(b); };
    box.appendChild(b);
  });
}
function condText(c) { return c >= 0.9 ? 'отличное' : c >= 0.75 ? 'хорошее' : c >= 0.5 ? 'потёртое, грязное' : 'очень грязное'; }
function renderIns() {
  const s = insState;
  $('#insItem').innerHTML = itemSvg(s.it, s.view);
  $('#insStage').classList.toggle('uv', s.uv);
}
function readout(html) { const r = $('#insRead'); r.innerHTML = html; r.classList.remove('flash'); void r.offsetWidth; r.classList.add('flash'); }
async function toolScale() {
  const fx = $('#insFx');
  fx.innerHTML = '<div class="scale-fx"><div class="scale-disp">0</div><div class="scale-plate"></div></div>';
  $('#insItem').classList.add('on-scale');
  const disp = $('.scale-disp', fx);
  const it = insState.it, W = ITEM_TYPES[it.type].weight;
  for (let i = 0; i <= 12; i++) { disp.textContent = (it.weight * i / 12 * (1 + (12 - i) * 0.03)).toFixed(W.dec).replace('.', ','); await wait(45); }
  disp.textContent = itemWeightText(it);
  Sfx.click();
  readout(`⚖️ Вес: <b>${itemWeightText(it)}</b> <span class="muted">(эталон — в каталоге)</span>`);
  await wait(1400);
  $('#insItem').classList.remove('on-scale');
  fx.innerHTML = '';
}
async function toolMagnet() {
  const fx = $('#insFx');
  fx.innerHTML = '<div class="magnet-fx">🧲</div>';
  const it = insState.it;
  await wait(700);
  if (it.magnetic) {
    $('#insItem').classList.add('pulled'); Sfx.zap();
    readout('🧲 <b class="bad">Притягивается к магниту!</b> Внутри дешёвый сплав.');
  } else {
    readout('🧲 Не реагирует на магнит.');
  }
  await wait(1200);
  $('#insItem').classList.remove('pulled');
  fx.innerHTML = '';
}
function toolUV(b) {
  insState.uv = !insState.uv;
  b.classList.toggle('on', insState.uv);
  Sfx.zap();
  renderIns();
  readout(insState.uv ? '🔦 УФ-свет включён. Ищите свечение, скрытые метки и пятна.' : 'УФ-свет выключен.');
}
function toolPricer() {
  const it = insState.it, v = itemPretendValue(it);
  readout(`💻 Оригинал в таком состоянии стоит <b>${money(roundNice(v * 0.9))} – ${money(roundNice(v * 1.1))}</b>. Подделка — копейки.`);
}

// Лупа: работает на любом контейнере с SVG предмета
function attachLens(stage, getHtml, isUV) {
  const lens = el('div', { class: 'lens' }, '<div class="lens-in"></div>');
  stage.appendChild(lens);
  const inner = lens.firstChild;
  const Z = 3.2, LS = 150;
  let active = false, lastHtmlKey = null;
  const show = (e) => {
    const itemBox = stage.querySelector('.ins-item, .cat-item') || stage;
    const r = itemBox.getBoundingClientRect(), sr = stage.getBoundingClientRect();
    const px = e.clientX - r.left, py = e.clientY - r.top;
    const touch = e.pointerType === 'touch' || e.pointerType === 'pen';
    const lx = e.clientX - sr.left, ly = e.clientY - sr.top - (touch ? 95 : 0);
    const key = getHtml.toString() + (isUV && isUV());
    const html = getHtml();
    if (inner._html !== html) { inner.innerHTML = html; inner._html = html; }
    lens.classList.toggle('uv', !!(isUV && isUV()));
    inner.style.width = r.width * Z + 'px';
    inner.style.height = r.height * Z + 'px';
    inner.style.left = (LS / 2 - px * Z) + 'px';
    inner.style.top = (LS / 2 - py * Z) + 'px';
    lens.style.transform = `translate(${lx - LS / 2}px, ${ly - LS / 2}px)`;
    lens.classList.add('show');
    lastHtmlKey = key;
  };
  stage.addEventListener('pointerdown', (e) => { active = true; try { stage.setPointerCapture(e.pointerId); } catch (_) { /* */ } show(e); });
  stage.addEventListener('pointermove', (e) => { if (active || e.pointerType === 'mouse') show(e); });
  const hide = () => { active = false; lens.classList.remove('show'); };
  stage.addEventListener('pointerup', (e) => { if (e.pointerType !== 'mouse') hide(); else active = false; });
  stage.addEventListener('pointercancel', hide);
  stage.addEventListener('pointerleave', hide);
}

// ---------------------------------------------------------------------
//  Модальные окна: каталог, розыск, склад, магазин
// ---------------------------------------------------------------------
function modal(html, buttons = [], cls = '') {
  const m = $('#modal');
  m.className = 'overlay show ' + cls;
  m.innerHTML = `<div class="modal-box"><div class="modal-body">${html}</div><div class="modal-btns"></div></div>`;
  const bb = $('.modal-btns', m);
  buttons.forEach((b) => { const x = el('button', { class: 'btn ' + (b.cls || '') }, b.t); x.onclick = () => { Sfx.click(); b.fn(); }; bb.appendChild(x); });
  return m;
}
function closeModal() { const m = $('#modal'); m.className = 'overlay'; m.innerHTML = ''; }

function openCatalog(type) {
  const types = typesForDay(S.day);
  if (!types.includes(type)) type = types[0];
  const m = $('#modal2');
  const render = (t) => {
    const T = ITEM_TYPES[t];
    const ref = referenceItem(t);
    m.innerHTML = `<div class="modal-box wide"><div class="modal-body">
      <div class="cat-tabs">${types.map((x) => `<button data-t="${x}" class="${x === t ? 'on' : ''}">${ITEM_TYPES[x].icon}</button>`).join('')}</div>
      <h3>${T.icon} ${T.name} <small>эталон оригинала</small></h3>
      <div class="cat-refs">${T.views.map((v, i) => `<div class="cat-ref" data-v="${i}"><div class="cat-item">${itemSvg(ref, i, { noDirt: true })}</div><small>${v}</small></div>`).join('')}</div>
      <p class="muted center">Зажмите на эталоне — работает лупа</p>
      <ul class="cat-list">${T.catalog.map((l) => `<li>${l}</li>`).join('')}</ul>
      <div class="cat-price">Цена оригинала в отличном состоянии: <b>${money(T.value[0])} – ${money(T.value[1])}</b><br><span class="muted">Грязь и износ снижают цену до 55%. Подделка стоит ≈ ${money(T.fakeValue)}.</span></div>
    </div><div class="modal-btns"><button class="btn primary" id="catClose">Закрыть</button></div></div>`;
    $$('.cat-tabs button', m).forEach((b) => b.onclick = () => { Sfx.click(); render(b.dataset.t); });
    $$('.cat-ref', m).forEach((box) => { const v = +box.dataset.v; attachLens(box, () => itemSvg(ref, v, { noDirt: true }), () => false); });
    $('#catClose').onclick = () => { Sfx.click(); m.className = 'overlay'; m.innerHTML = ''; };
  };
  m.className = 'overlay show top';
  render(type);
}

function openWanted() {
  const m = $('#modal2');
  m.className = 'overlay show top';
  m.innerHTML = `<div class="modal-box"><div class="modal-body"><h3>🚨 Ориентировки полиции</h3>
    <ul class="wanted-list">${S.wanted.map((w) => `<li><span>${ITEM_TYPES[w.type].icon}</span>${w.text}</li>`).join('')}</ul>
    <p class="muted">Сверяйте гравировки, серийные номера, IMEI и инвентарные номера. Ложный вызов полиции бьёт по репутации.</p></div>
    <div class="modal-btns"><button class="btn primary" id="wClose">Понятно</button></div></div>`;
  $('#wClose').onclick = () => { Sfx.click(); m.className = 'overlay'; m.innerHTML = ''; };
}

function openInventory(onPick, wantType) {
  const items = S.inventory;
  const render = () => {
    const list = items.length ? items.map((e, i) => {
      const it = e.item;
      const canClean = it.condition < 0.75 && ITEM_TYPES[it.type].repairs.includes('clean') && !onPick;
      const match = wantType && it.type === wantType;
      return `<div class="inv-row ${match ? 'match' : ''}">
        <div class="inv-thumb" data-i="${i}">${itemSvg(it, 0)}</div>
        <div class="inv-info"><b>${it.title}</b><small>куплено за ${money(e.paid)} · ${condText(it.condition)}</small>${match ? '<small class="ok">✓ то, что ищет клиент</small>' : ''}</div>
        <div class="inv-btns">
          ${onPick ? `<button class="btn small primary" data-pick="${i}">Предложить</button>` : ''}
          ${canClean ? `<button class="btn small" data-clean="${i}">🧽 Почистить</button>` : ''}
          <button class="btn small" data-look="${i}">🔍</button>
        </div></div>`;
    }).join('') : '<p class="muted center">Склад пуст. Купите что-нибудь у клиентов.</p>';
    const m = modal(`<h3>📦 Склад <small>${items.length} шт.</small></h3>${!onPick ? '<p class="muted">Почищенные вещи стоят дороже. Продавайте покупателям или на вечернем аукционе.</p>' : ''}<div class="inv-list">${list}</div>`,
      [{ t: onPick ? '↩ Назад' : 'Закрыть', fn: () => closeModal() }]);
    $$('[data-pick]', m).forEach((b) => b.onclick = () => { Sfx.click(); onPick(items[+b.dataset.pick]); });
    $$('[data-look]', m).forEach((b) => b.onclick = () => { Sfx.click(); openInspect(items[+b.dataset.look].item); });
    $$('[data-clean]', m).forEach((b) => b.onclick = async () => {
      Sfx.click();
      const e = items[+b.dataset.clean];
      closeModal();
      await Minigame.run(e.item, 'clean');
      e.item.condition = 1;
      toast('✨ Вещь как новая — стоит дороже', 'good');
      render();
    });
  };
  render();
}

// ---------------------------------------------------------------------
//  Конец дня
// ---------------------------------------------------------------------
function endDay() {
  showCounterItem(null);
  $('#panel').classList.add('hidden');
  const items = S.inventory;
  const sel = new Set();
  const render = () => {
    const rows = items.length ? items.map((e, i) => `<label class="inv-row auc ${sel.has(i) ? 'sel' : ''}"><input type="checkbox" data-i="${i}" ${sel.has(i) ? 'checked' : ''}>
        <div class="inv-thumb">${itemSvg(e.item, 0)}</div>
        <div class="inv-info"><b>${e.item.title}</b><small>куплено за ${money(e.paid)} · ${condText(e.item.condition)}</small></div></label>`).join('')
      : '<p class="muted center">На складе пусто.</p>';
    const ev = S.log.events.slice(-8).map(([t, v]) => `<li><span>${t}</span><b class="${v >= 0 ? 'ok' : 'bad'}">${v >= 0 ? '+' : '−'}${money(Math.abs(v))}</b></li>`).join('');
    const m = modal(`
      <h3>🌙 Смена окончена · День ${S.day}</h3>
      <div class="sum-grid"><div><small>Доход</small><b class="ok">+${money(S.log.income)}</b></div><div><small>Расходы</small><b class="bad">−${money(S.log.spent)}</b></div><div><small>Касса</small><b>${money(S.money)}</b></div></div>
      ${ev ? `<ul class="ev-list">${ev}</ul>` : ''}
      <h4>🔨 Вечерний аукцион</h4>
      <p class="muted">Отметьте вещи для продажи. Эксперты аукциона заплатят 70–95% рыночной цены оригинала… но подделки и краденое они распознают.</p>
      <div class="inv-list">${rows}</div>`,
      [{ t: sel.size ? `🔨 Продать отмеченное (${sel.size})` : 'Пропустить аукцион ➜', cls: 'primary', fn: () => runAuction([...sel].map((i) => items[i])) }]);
    $$('input[type=checkbox]', m).forEach((cb) => cb.onchange = () => { const i = +cb.dataset.i; if (cb.checked) sel.add(i); else sel.delete(i); render(); });
  };
  render();
}

async function runAuction(list) {
  const results = [];
  let total = 0;
  for (const e of list) {
    const it = e.item;
    S.inventory = S.inventory.filter((x) => x !== e);
    if (it.fake) {
      results.push(`<li><span>${it.title}</span><b class="bad">ПОДДЕЛКА · $0</b></li>`);
      S.rep = clamp(S.rep - 3, 0, 100);
    } else if (it.stolen && R.chance(0.5)) {
      const fine = has('safe') ? 150 : 300;
      results.push(`<li><span>${it.title}</span><b class="bad">КРАДЕНОЕ! изъято, штраф ${money(fine)}</b></li>`);
      S.money -= fine; S.rep = clamp(S.rep - 10, 0, 100);
    } else {
      const p = roundNice(itemValue(it) * R.f(0.7, 0.95));
      total += p;
      const pr = p - e.paid;
      results.push(`<li><span>${it.title}</span><b class="${pr >= 0 ? 'ok' : 'bad'}">${money(p)} (${pr >= 0 ? '+' : '−'}${money(Math.abs(pr))})</b></li>`);
    }
  }
  if (total) { S.money += total; S.stats.earned += total; Sfx.cash(); }
  hud();
  nightEvents(results);
}

function nightEvents(auction) {
  const ev = [];
  // проданные подделки всплывают
  for (let i = 0; i < S.night.soldFakes; i++) { ev.push('😡 Покупатель понёс вещь к эксперту и узнал, что это подделка. Отзыв в сети: −5 репутации.'); S.rep = clamp(S.rep - 5, 0, 100); }
  for (let i = 0; i < S.night.soldStolen; i++) {
    if (R.chance(0.4)) { const f = has('safe') ? 125 : 250; ev.push(`🚓 Проданная вами вещь оказалась краденой. Штраф ${money(f)}, −8 репутации.`); S.money -= f; S.rep = clamp(S.rep - 8, 0, 100); }
  }
  // обыск
  const stolen = S.inventory.filter((e) => e.item.stolen);
  stolen.forEach((e) => {
    if (R.chance(0.4)) {
      const f = has('safe') ? 150 : 300;
      ev.push(`🚔 Ночью полиция проверила склад и нашла краденое: «${e.item.title}». Изъято, штраф ${money(f)}, −10 репутации.`);
      S.inventory = S.inventory.filter((x) => x !== e);
      S.money -= f; S.rep = clamp(S.rep - 10, 0, 100);
    }
  });
  const r = rent(S.day);
  S.money -= r;
  hud();
  const over = S.money < 0 || S.rep <= 0;
  modal(`
    <h3>🌃 Ночь</h3>
    ${auction.length ? `<h4>Итоги аукциона</h4><ul class="ev-list">${auction.join('')}</ul>` : ''}
    ${ev.length ? `<ul class="night-list">${ev.map((x) => `<li>${x}</li>`).join('')}</ul>` : '<p class="muted">Ночь прошла спокойно.</p>'}
    <div class="rent-line">🏠 Аренда: <b class="bad">−${money(r)}</b></div>
    <div class="rent-line">💰 В кассе: <b class="${S.money < 0 ? 'bad' : 'ok'}">${money(S.money)}</b> · ⭐ ${Math.round(S.rep)}</div>`,
    [{ t: over ? 'Что же дальше…' : '🛒 В магазин', cls: 'primary', fn: () => (over ? gameOver() : openShop()) }]);
}

function openShop() {
  const render = () => {
    const rows = Object.entries(SHOP).map(([k, s]) => {
      const own = has(k);
      return `<div class="shop-row ${own ? 'own' : ''}"><div class="shop-ic">${s.icon}</div><div class="inv-info"><b>${s.name}</b><small>${s.desc}</small></div>
        ${own ? '<span class="ok">✓ есть</span>' : `<button class="btn small primary" data-buy="${k}" ${S.money < s.price ? 'disabled' : ''}>${money(s.price)}</button>`}</div>`;
    }).join('');
    const m = modal(`<h3>🛒 Магазин инструментов</h3><p class="muted">В кассе: <b>${money(S.money)}</b> · Завтра аренда: <b>${money(rent(S.day + 1))}</b></p><div class="inv-list">${rows}</div>`,
      [{ t: '☀️ Следующий день', cls: 'primary', fn: () => { closeModal(); S.day++; S.wanted = []; startDay(); } }]);
    $$('[data-buy]', m).forEach((b) => b.onclick = () => {
      const k = b.dataset.buy;
      if (S.money < SHOP[k].price) return;
      S.money -= SHOP[k].price; S.owned[k] = true; Sfx.cash(); hud(); render();
    });
  };
  render();
}

function gameOver() {
  const why = S.rep <= 0 ? 'Репутация упала до нуля — клиенты обходят ваш ломбард стороной.' : 'Нечем платить аренду. Хозяин помещения сменил замки.';
  const best = Math.max(S.day, getBest());
  try { localStorage.setItem('lombard_best', best); } catch (e) { /* */ }
  wipe();
  modal(`<div class="center"><div class="big-ic">🔒</div><h2>Ломбард закрыт</h2><p>${why}</p>
    <div class="sum-grid"><div><small>Продержались</small><b>${S.day} дн.</b></div><div><small>Заработано</small><b>${money(S.stats.earned)}</b></div><div><small>Воров поймано</small><b>${S.stats.caught}</b></div></div>
    <div class="sum-grid"><div><small>Подделок раскрыто</small><b>${S.stats.fakesSpotted}</b></div><div><small>Купили подделок</small><b>${S.stats.fakesBought}</b></div><div><small>Ремонтов</small><b>${S.stats.repairs}</b></div></div>
    <p class="muted">Рекорд: ${best} дн.</p></div>`,
    [{ t: '🔁 Начать заново', cls: 'primary', fn: () => { closeModal(); S = newState(); S.seenIntro = true; startDay(); } }]);
}

// ---------------------------------------------------------------------
//  Старт
// ---------------------------------------------------------------------
function showIntro(after) {
  modal(`<div class="intro">
    <h2>Как играть</h2>
    <div class="intro-row"><span>💰</span><p><b>Скупайте</b> вещи дешевле их реальной цены и <b>перепродавайте</b> покупателям или на вечернем аукционе.</p></div>
    <div class="intro-row"><span>🔍</span><p><b>Осматривайте</b> всё! Сверяйтесь с <b>каталогом</b>: подделки выдают опечатки, неправильные клейма, вес, магнит и УФ-свечение.</p></div>
    <div class="intro-row"><span>🚨</span><p>Следите за <b>ориентировками</b>: гравировки, серийники и IMEI краденых вещей. Нашли — <b>вызывайте полицию</b>.</p></div>
    <div class="intro-row"><span>🔧</span><p><b>Ремонтируйте</b> вещи клиентов — чистка, замена экрана и батареек, склейка.</p></div>
    <div class="intro-row"><span>🏠</span><p>Каждый вечер — <b>аренда</b>. Не уйдите в минус и берегите <b>репутацию</b> ⭐.</p></div>
  </div>`, [{ t: 'Понятно, открываемся!', cls: 'primary', fn: () => { closeModal(); after(); } }]);
}

function boot() {
  const saved = load();
  const best = getBest();
  $('#title').innerHTML = `
    <div class="title-card">
      <div class="logo-sign">ЛОМБАРД</div>
      <div class="logo-sub">«Последний шанс»</div>
      <p class="tagline">Подделка или сокровище? Краденое или наследство?<br>Решать вам.</p>
      <div class="title-items">${['watch', 'ring', 'coin'].map((t) => `<div>${itemSvg(referenceItem(t), 0, { noDirt: true })}</div>`).join('')}</div>
      <button class="btn primary big" id="bNew">Новая игра</button>
      ${saved ? `<button class="btn big" id="bCont">Продолжить · день ${saved.day}</button>` : ''}
      ${best ? `<p class="muted">Рекорд: ${best} дн.</p>` : ''}
    </div>`;
  $('#title').classList.add('show');
  const go = (st) => {
    Sfx.init();
    S = st;
    $('#title').classList.remove('show');
    hud();
    if (!S.seenIntro) { S.seenIntro = true; showIntro(startDay); } else startDay();
  };
  $('#bNew').onclick = () => go(newState());
  if (saved) $('#bCont').onclick = () => go(Object.assign(newState(), saved));

  $('#bCat').onclick = () => { Sfx.click(); openCatalog(currentCustomer && currentCustomer.item ? currentCustomer.item.type : 'watch'); };
  $('#bWanted').onclick = () => { Sfx.click(); openWanted(); };
  $('#bInv').onclick = () => { Sfx.click(); if ($('#modal').classList.contains('show')) return; openInventory(null); };
  $('#bSnd').onclick = () => { Sfx.muted = !Sfx.muted; $('#bSnd').textContent = Sfx.muted ? '🔇' : '🔊'; };
}

window.addEventListener('load', boot);
