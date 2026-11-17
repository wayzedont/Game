// =====================================================================
//  Персонажи: внешность (SVG) и реплики
// =====================================================================

const SKIN = ['#f6d2b8', '#eebf9b', '#d9a07a', '#b97a52', '#8a5636', '#f3c9a8'];
const HAIR = ['#1d1a19', '#4a2e1c', '#7a4a24', '#c46a2b', '#e2c27a', '#9a9a9a', '#d9d9d9'];
const CLOTH = ['#b5332e', '#2f5d8c', '#3d7a4a', '#7a3d8c', '#d98c2b', '#333a44', '#8c6a3d', '#c94f7c', '#2e8c8c'];

const NAMES_M = ['Борис', 'Аркадий', 'Геннадий', 'Тимур', 'Эдик', 'Степан', 'Олег', 'Жорик', 'Вован', 'Семён', 'Рустам', 'Игнат', 'Фёдор', 'Лёха', 'Артур', 'Михалыч'];
const NAMES_F = ['Марина', 'Кира', 'Нина', 'Алла', 'Зарина', 'Вика', 'Люся', 'Ольга', 'Даша', 'Ангелина'];
const NAMES_OLD = ['Зинаида Петровна', 'Баба Валя', 'Галина Ивановна', 'Дед Матвей', 'Пётр Ильич'];

function makePerson(kind = 'any') {
  const old = kind === 'old' || (kind === 'any' && R.chance(0.15));
  const female = old ? R.chance(0.6) : R.chance(0.4);
  let name;
  if (old) name = female ? R.pick(NAMES_OLD.filter((n) => !n.startsWith('Дед') && n !== 'Пётр Ильич')) : R.pick(['Дед Матвей', 'Пётр Ильич', 'Михалыч']);
  else name = female ? R.pick(NAMES_F) : R.pick(NAMES_M);
  const hairStyles = female ? (old ? ['bun'] : ['long', 'bob', 'bun', 'ponytail']) : (old ? ['bald', 'thin'] : ['short', 'mohawk', 'bald', 'curly', 'cap', 'slick']);
  return {
    name, female, old,
    skin: R.pick(SKIN),
    hair: old ? R.pick(['#9a9a9a', '#d9d9d9', '#c8c8c8']) : R.pick(HAIR.slice(0, 5)),
    hairStyle: R.pick(hairStyles),
    cloth: R.pick(CLOTH),
    cloth2: R.pick(['#f1e9da', '#2a2a2a', '#d9d9d9', '#e8d9b0', '#555']),
    headW: R.f(0.9, 1.15), headH: R.f(0.92, 1.1), body: R.f(0.9, 1.25),
    nose: R.pick(['round', 'round', 'long', 'small']),
    noseC: R.chance(0.5) ? '#e8857a' : null,
    beard: !female && R.chance(0.3) ? R.pick(['full', 'stubble', 'goatee']) : null,
    mustache: !female && R.chance(0.3),
    glasses: old ? R.chance(0.7) : R.chance(0.2),
    earring: female && R.chance(0.5),
    jacket: R.pick(['jacket', 'hoodie', 'tee', 'coat']),
  };
}

// mood: neutral | happy | angry | nervous | sad | shock | sly
function personSvg(P, mood = 'neutral', look = 0) {
  const sk = P.skin, hc = P.hair;
  const hw = 56 * P.headW, hh = 64 * P.headH;
  const cx = 120, cy = 112;
  const shade = '#00000022';
  let s = '<svg viewBox="0 0 240 280" xmlns="http://www.w3.org/2000/svg" class="person-svg">';
  // ---- тело
  const bw = 92 * P.body;
  s += `<path d="M${cx - bw} 280 Q${cx - bw} 205 ${cx - 30} 190 L${cx + 30} 190 Q${cx + bw} 205 ${cx + bw} 280 Z" fill="${P.cloth}"/>`;
  if (P.jacket === 'jacket' || P.jacket === 'coat') {
    s += `<path d="M${cx - 28} 190 L${cx} 240 L${cx + 28} 190 Z" fill="${P.cloth2}"/>`;
    s += `<path d="M${cx - 30} 190 L${cx - 14} 236 L${cx - 40} 212 Z M${cx + 30} 190 L${cx + 14} 236 L${cx + 40} 212 Z" fill="${shade}"/>`;
    s += `<path d="M${cx - 30} 190 L${cx - 46} 200 L${cx - 22} 238 Z M${cx + 30} 190 L${cx + 46} 200 L${cx + 22} 238 Z" fill="${P.cloth}" stroke="#00000033" stroke-width="1.5"/>`;
  } else if (P.jacket === 'hoodie') {
    s += `<path d="M${cx - 50} 196 Q${cx} 236 ${cx + 50} 196 Q${cx} 214 ${cx - 50} 196 Z" fill="${shade}"/>`;
    s += `<line x1="${cx - 10}" y1="214" x2="${cx - 12}" y2="246" stroke="#fff" stroke-width="2"/><line x1="${cx + 10}" y1="214" x2="${cx + 12}" y2="246" stroke="#fff" stroke-width="2"/>`;
  } else {
    s += `<path d="M${cx - 26} 190 Q${cx} 214 ${cx + 26} 190" fill="${sk}" stroke="#00000022"/>`;
  }
  // ---- шея
  s += `<rect x="${cx - 20}" y="160" width="40" height="36" rx="10" fill="${sk}"/><rect x="${cx - 20}" y="160" width="40" height="18" fill="${shade}"/>`;
  // ---- волосы сзади
  if (P.hairStyle === 'long') s += `<path d="M${cx - hw - 6} ${cy} Q${cx - hw - 10} ${cy + 80} ${cx - hw + 10} ${cy + 90} L${cx + hw - 10} ${cy + 90} Q${cx + hw + 10} ${cy + 80} ${cx + hw + 6} ${cy} Z" fill="${hc}"/>`;
  if (P.hairStyle === 'bob') s += `<path d="M${cx - hw - 8} ${cy - 10} Q${cx - hw - 10} ${cy + 50} ${cx - hw + 4} ${cy + 52} L${cx + hw - 4} ${cy + 52} Q${cx + hw + 10} ${cy + 50} ${cx + hw + 8} ${cy - 10} Z" fill="${hc}"/>`;
  if (P.hairStyle === 'bun') s += `<circle cx="${cx}" cy="${cy - hh - 6}" r="20" fill="${hc}"/>`;
  if (P.hairStyle === 'ponytail') s += `<path d="M${cx + hw - 6} ${cy - 30} Q${cx + hw + 34} ${cy} ${cx + hw + 14} ${cy + 60} Q${cx + hw + 4} ${cy + 20} ${cx + hw - 14} ${cy - 10} Z" fill="${hc}"/>`;
  // ---- уши
  s += `<ellipse cx="${cx - hw + 2}" cy="${cy + 6}" rx="10" ry="14" fill="${sk}"/><ellipse cx="${cx + hw - 2}" cy="${cy + 6}" rx="10" ry="14" fill="${sk}"/>`;
  s += `<ellipse cx="${cx - hw + 2}" cy="${cy + 6}" rx="5" ry="8" fill="${shade}"/><ellipse cx="${cx + hw - 2}" cy="${cy + 6}" rx="5" ry="8" fill="${shade}"/>`;
  if (P.earring) s += `<circle cx="${cx - hw + 2}" cy="${cy + 22}" r="3.5" fill="#f2c94c"/><circle cx="${cx + hw - 2}" cy="${cy + 22}" r="3.5" fill="#f2c94c"/>`;
  // ---- голова
  s += `<path d="M${cx} ${cy - hh} C${cx + hw * 1.05} ${cy - hh} ${cx + hw} ${cy + hh * 0.35} ${cx + hw * 0.8} ${cy + hh * 0.7} C${cx + hw * 0.55} ${cy + hh * 1.02} ${cx - hw * 0.55} ${cy + hh * 1.02} ${cx - hw * 0.8} ${cy + hh * 0.7} C${cx - hw} ${cy + hh * 0.35} ${cx - hw * 1.05} ${cy - hh} ${cx} ${cy - hh} Z" fill="${sk}"/>`;
  s += `<path d="M${cx + hw * 0.6} ${cy - hh * 0.6} C${cx + hw} ${cy} ${cx + hw * 0.8} ${cy + hh * 0.7} ${cx + hw * 0.4} ${cy + hh * 0.9} C${cx + hw * 0.75} ${cy + hh * 0.4} ${cx + hw * 0.8} ${cy} ${cx + hw * 0.6} ${cy - hh * 0.6} Z" fill="${shade}"/>`;
  // щетина / борода
  if (P.beard === 'stubble') s += `<path d="M${cx - hw * 0.78} ${cy + hh * 0.35} C${cx - hw * 0.6} ${cy + hh * 1.0} ${cx + hw * 0.6} ${cy + hh * 1.0} ${cx + hw * 0.78} ${cy + hh * 0.35} C${cx + hw * 0.4} ${cy + hh * 0.7} ${cx - hw * 0.4} ${cy + hh * 0.7} ${cx - hw * 0.78} ${cy + hh * 0.35} Z" fill="${hc}" opacity=".25"/>`;
  if (P.beard === 'full') s += `<path d="M${cx - hw * 0.85} ${cy + hh * 0.2} C${cx - hw * 0.8} ${cy + hh * 1.25} ${cx + hw * 0.8} ${cy + hh * 1.25} ${cx + hw * 0.85} ${cy + hh * 0.2} C${cx + hw * 0.5} ${cy + hh * 0.75} ${cx - hw * 0.5} ${cy + hh * 0.75} ${cx - hw * 0.85} ${cy + hh * 0.2} Z" fill="${hc}"/>`;
  if (P.beard === 'goatee') s += `<path d="M${cx - 12} ${cy + hh * 0.72} Q${cx} ${cy + hh * 1.15} ${cx + 12} ${cy + hh * 0.72} Z" fill="${hc}"/>`;
  // румянец
  s += `<ellipse cx="${cx - 32}" cy="${cy + 26}" rx="10" ry="6" fill="#ff7a7a" opacity="${mood === 'angry' || mood === 'shock' ? 0.45 : 0.18}"/><ellipse cx="${cx + 32}" cy="${cy + 26}" rx="10" ry="6" fill="#ff7a7a" opacity="${mood === 'angry' || mood === 'shock' ? 0.45 : 0.18}"/>`;
  // ---- глаза
  const ey = cy - 2, ex = 24;
  const eyeOpen = mood === 'shock' ? 15 : mood === 'happy' ? 8 : mood === 'sly' ? 7 : 12;
  const gx = mood === 'nervous' ? (look || 4) : mood === 'sly' ? 3 : look;
  for (const sx of [-1, 1]) {
    const x = cx + sx * ex;
    if (mood === 'happy') {
      s += `<path d="M${x - 10} ${ey + 2} Q${x} ${ey - 10} ${x + 10} ${ey + 2}" stroke="#2a1d16" stroke-width="3.5" fill="none" stroke-linecap="round"/>`;
    } else {
      s += `<ellipse cx="${x}" cy="${ey}" rx="11" ry="${eyeOpen}" fill="#fff" stroke="#2a1d16" stroke-width="1.5"/>`;
      s += `<circle cx="${x + gx}" cy="${ey + 1}" r="${mood === 'shock' ? 4 : 5.5}" fill="#2a1d16"/><circle cx="${x + gx + 1.8}" cy="${ey - 1.5}" r="1.6" fill="#fff"/>`;
      if (mood === 'sly') s += `<rect x="${x - 12}" y="${ey - 14}" width="24" height="9" fill="${sk}"/>`;
    }
  }
  // брови
  const bw2 = 13;
  const bDy = { angry: [8, -4], nervous: [-6, 3], sad: [-7, 4], shock: [-8, -8], sly: [3, -4], happy: [-2, -2], neutral: [0, 0] }[mood] || [0, 0];
  for (const sx of [-1, 1]) {
    const x = cx + sx * ex;
    const inner = x - sx * bw2, outer = x + sx * bw2;
    const by = ey - 19;
    s += `<path d="M${inner} ${by + bDy[0] * 0.6} Q${x} ${by - 4 + (bDy[0] + bDy[1]) * 0.3} ${outer} ${by + bDy[1] * 0.6}" stroke="${P.old ? '#bbb' : hc}" stroke-width="5" fill="none" stroke-linecap="round"/>`;
  }
  // очки
  if (P.glasses) s += `<g fill="none" stroke="#2a2a2a" stroke-width="2.5"><circle cx="${cx - ex}" cy="${ey}" r="16"/><circle cx="${cx + ex}" cy="${ey}" r="16"/><path d="M${cx - 8} ${ey} Q${cx} ${ey - 5} ${cx + 8} ${ey}"/></g><g fill="#fff" opacity=".15"><circle cx="${cx - ex}" cy="${ey}" r="15"/><circle cx="${cx + ex}" cy="${ey}" r="15"/></g>`;
  // нос
  const nc = P.noseC || sk;
  if (P.nose === 'round') s += `<ellipse cx="${cx}" cy="${cy + 20}" rx="13" ry="11" fill="${nc}" stroke="#00000033" stroke-width="1"/><ellipse cx="${cx - 4}" cy="${cy + 16}" rx="4" ry="3" fill="#fff" opacity=".4"/>`;
  else if (P.nose === 'long') s += `<path d="M${cx - 3} ${cy + 2} Q${cx + 12} ${cy + 22} ${cx + 4} ${cy + 30} Q${cx - 6} ${cy + 32} ${cx - 9} ${cy + 26}" fill="${nc}" stroke="#00000033" stroke-width="1.2"/>`;
  else s += `<path d="M${cx - 6} ${cy + 24} Q${cx} ${cy + 30} ${cx + 6} ${cy + 24}" stroke="#00000055" stroke-width="2" fill="none" stroke-linecap="round"/>`;
  // усы
  if (P.mustache) s += `<path d="M${cx - 22} ${cy + 38} Q${cx - 10} ${cy + 26} ${cx} ${cy + 33} Q${cx + 10} ${cy + 26} ${cx + 22} ${cy + 38} Q${cx} ${cy + 36} ${cx - 22} ${cy + 38} Z" fill="${hc}"/>`;
  // рот
  const my = cy + 42;
  const mouths = {
    neutral: `<path d="M${cx - 12} ${my} Q${cx} ${my + 3} ${cx + 12} ${my}" stroke="#5a2a20" stroke-width="3" fill="none" stroke-linecap="round"/>`,
    happy: `<path d="M${cx - 18} ${my - 3} Q${cx} ${my + 20} ${cx + 18} ${my - 3} Z" fill="#7a2a22"/><path d="M${cx - 14} ${my - 1} Q${cx} ${my + 4} ${cx + 14} ${my - 1}" fill="#fff"/>`,
    angry: `<path d="M${cx - 16} ${my + 6} Q${cx} ${my - 8} ${cx + 16} ${my + 6} Z" fill="#7a2a22"/><rect x="${cx - 11}" y="${my - 1}" width="22" height="4" fill="#fff"/>`,
    nervous: `<path d="M${cx - 16} ${my} L${cx - 8} ${my - 3} L${cx} ${my + 1} L${cx + 8} ${my - 3} L${cx + 16} ${my}" stroke="#5a2a20" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
    sad: `<path d="M${cx - 13} ${my + 5} Q${cx} ${my - 6} ${cx + 13} ${my + 5}" stroke="#5a2a20" stroke-width="3" fill="none" stroke-linecap="round"/>`,
    shock: `<ellipse cx="${cx}" cy="${my + 3}" rx="10" ry="13" fill="#7a2a22"/><ellipse cx="${cx}" cy="${my + 8}" rx="6" ry="5" fill="#d9636b"/>`,
    sly: `<path d="M${cx - 14} ${my + 2} Q${cx + 4} ${my + 8} ${cx + 16} ${my - 6}" stroke="#5a2a20" stroke-width="3" fill="none" stroke-linecap="round"/>`,
  };
  s += mouths[mood] || mouths.neutral;
  // ---- волосы спереди
  const top = cy - hh;
  switch (P.hairStyle) {
    case 'short': s += `<path d="M${cx - hw * 0.95} ${cy - 10} C${cx - hw} ${top - 12} ${cx + hw} ${top - 12} ${cx + hw * 0.95} ${cy - 10} C${cx + hw * 0.7} ${top + 18} ${cx - hw * 0.4} ${top + 10} ${cx - hw * 0.95} ${cy - 10} Z" fill="${hc}"/>`; break;
    case 'mohawk': s += `<path d="M${cx - 12} ${top + 14} L${cx - 16} ${top - 18} L${cx - 6} ${top - 6} L${cx - 2} ${top - 26} L${cx + 6} ${top - 8} L${cx + 14} ${top - 22} L${cx + 14} ${top + 14} Z" fill="${hc}"/>`; break;
    case 'curly': for (let k = 0; k < 9; k++) { const a = Math.PI + k / 8 * Math.PI; s += `<circle cx="${cx + Math.cos(a) * hw * 0.9}" cy="${cy - 18 + Math.sin(a) * hh * 0.9}" r="17" fill="${hc}"/>`; } break;
    case 'cap': s += `<path d="M${cx - hw - 2} ${cy - 18} C${cx - hw} ${top - 16} ${cx + hw} ${top - 16} ${cx + hw + 2} ${cy - 18} Z" fill="${P.cloth}"/><path d="M${cx - hw - 4} ${cy - 18} L${cx + hw + 34} ${cy - 22} Q${cx + hw + 30} ${cy - 10} ${cx + hw} ${cy - 12} L${cx - hw - 4} ${cy - 12} Z" fill="${P.cloth}" stroke="#00000033"/>`; break;
    case 'slick': s += `<path d="M${cx - hw * 0.95} ${cy - 6} C${cx - hw * 1.1} ${top - 14} ${cx + hw * 1.1} ${top - 20} ${cx + hw * 0.95} ${cy - 6} C${cx + hw * 0.9} ${top + 6} ${cx - hw * 0.2} ${top} ${cx - hw * 0.95} ${cy - 6} Z" fill="${hc}"/><path d="M${cx - 20} ${top + 2} Q${cx + 10} ${top - 6} ${cx + 40} ${top + 8}" stroke="#fff" stroke-opacity=".25" stroke-width="3" fill="none"/>`; break;
    case 'thin': s += `<path d="M${cx - hw * 0.98} ${cy - 2} C${cx - hw} ${cy - 30} ${cx - hw * 0.7} ${cy - 40} ${cx - hw * 0.5} ${cy - 38} M${cx + hw * 0.98} ${cy - 2} C${cx + hw} ${cy - 30} ${cx + hw * 0.7} ${cy - 40} ${cx + hw * 0.5} ${cy - 38}" stroke="${hc}" stroke-width="10" fill="none" stroke-linecap="round"/>`; break;
    case 'bald': s += `<ellipse cx="${cx - 18}" cy="${top + 18}" rx="14" ry="7" fill="#fff" opacity=".25"/>`; break;
    case 'long': case 'bob': case 'ponytail': case 'bun':
      s += `<path d="M${cx - hw * 1.02} ${cy + 4} C${cx - hw * 1.1} ${top - 14} ${cx + hw * 1.1} ${top - 14} ${cx + hw * 1.02} ${cy + 4} C${cx + hw * 0.9} ${top + 20} ${cx + 10} ${top + 22} ${cx - 4} ${top + 12} C${cx - 16} ${top + 26} ${cx - hw * 0.8} ${top + 26} ${cx - hw * 1.02} ${cy + 4} Z" fill="${hc}"/>`; break;
  }
  // пот
  if (mood === 'nervous' || mood === 'shock') {
    s += `<path d="M${cx + hw * 0.62} ${top + 30} q-5 9 0 12 q5 -3 0 -12 Z" fill="#8fd3ff" stroke="#3c8fc4" stroke-width=".8"/>`;
    s += `<path d="M${cx - hw * 0.7} ${top + 44} q-4 7 0 9 q4 -2 0 -9 Z" fill="#8fd3ff" stroke="#3c8fc4" stroke-width=".8"/>`;
  }
  if (mood === 'angry') s += `<path d="M${cx + hw * 0.5} ${top + 10} l8 -2 -2 8 M${cx + hw * 0.5 + 10} ${top + 4} l6 6" stroke="#d33" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  s += '</svg>';
  return s;
}

// ---------------------------------------------------------------------
//  Реплики
// ---------------------------------------------------------------------
const LINES = {
  sell: {
    honest: [
      'Здравствуйте! Хочу продать {item}. Думаю, {ask} — честная цена.',
      'Добрый вечер. {item} — достались от отца. Дадите {ask}?',
      'Переезжаю, распродаю вещи. {item}, прошу {ask}.',
      'Нужны деньги на ремонт машины... {item}. Как насчёт {ask}?',
    ],
    old: [
      'Сынок, разбирала антресоли — вот, {item}. Может, {ask} дашь? Мне на лекарства.',
      'Это ещё от покойного мужа... {item}. Я не разбираюсь, {ask} хватит?',
      'Внук сказал, это барахло. {item}. Возьмёте за {ask}?',
    ],
    greedy: [
      '{item}, состояние — огонь. Меньше {ask} даже не предлагайте.',
      'Я знаю, сколько это стоит. {item} — {ask}, и точка.',
      'Коллекционная вещь! {item}. {ask}, торг уместен, но небольшой.',
    ],
    scam: [
      'Оригинал, клянусь мамой! Из Европы привёз. {item} — {ask} и разошлись.',
      'Брат, {item}, сто процентов оригинал. Документы потерял. {ask}.',
      'Мне в бутике сказали, это лимитка. {item}. Отдам за {ask}, быстро.',
      'Вещь подлинная, можете не проверять. {item}, {ask}.',
    ],
    thief: [
      'Мне бы побыстрее... {item}. {ask} наличными — и я ушёл.',
      'Это... подарок. Мой. Давайте {ask}, только без вопросов.',
      'Слышь, не разглядывай долго. {item}, {ask}. Быстрее.',
      'Нашёл... то есть купил. {item}. {ask}, и я пошёл.',
    ],
  },
  repair: {
    clean: ['Можете почистить {item}? Совсем потускнело. Заплачу {fee}.', 'Привет! {item} — грязь въелась, приведёте в порядок? {fee}.', 'Хочу подарить, а вид неказистый. Почистите {item} за {fee}?'],
    battery: ['Часы встали. Наверное, батарейка. Поменяете за {fee}?', 'Мои {item} не идут. Посмотрите? Плачу {fee}.'],
    screen: ['Уронил телефон, экран вдребезги. Замените? {fee}.', 'Разбил экран... Сделаете сегодня? {fee}.'],
    glue: ['Кот уронил вазу... Склеите? Даю {fee}.', 'Ваза треснула и развалилась. Сможете собрать? {fee}.'],
    thief: ['Почистить надо. Быстро. {fee}. И без вопросов.', 'Сделай, чтоб блестело. {fee}. Тороплюсь.'],
  },
  buy: [
    'Ищу что-нибудь в категории «{cat}». Есть?',
    'Хочу подарок. Что-нибудь из раздела «{cat}» найдётся?',
    'Я коллекционер. Интересует «{cat}». Покажете?',
  ],
  buyAny: ['Ищу что-нибудь интересное. Что у вас есть?', 'Хочу потратить деньги. Удивите меня!'],
  accept: ['По рукам!', 'Договорились.', 'Эх, ладно, забирайте.', 'Идёт!', 'Годится.'],
  counter: ['Нет, давайте хотя бы {c}.', 'Маловато. {c} — и по рукам.', 'Хм... {c}, не меньше.', 'Ну нет. {c}.'],
  counterBuy: ['Дорого. Дам {c}.', 'Многовато. {c}?', 'За такие деньги? Максимум {c}.'],
  insult: ['Вы издеваетесь?!', 'Да это грабёж!', 'Серьёзно?! Смешно.'],
  leave: ['Всё, пойду в другой ломбард.', 'Ну и ладно! До свидания.', 'Тратить время не буду.'],
  refuse: ['Жаль...', 'Ну как хотите.', 'Эх. Ладно.'],
  refuseThief: ['Ну и ладно. Найду, кому сдать.', 'Тц. Пожалеешь.'],
  thanks: ['Спасибо! Как новенькое!', 'Ого! Вы волшебник!', 'Отличная работа, спасибо!'],
  policeThief: ['Эй! Я ничего не сделал!', 'Чёрт! Сдал меня?!', 'Не-не-не, это не моё!'],
  policeInnocent: ['Да вы что?! Это моя вещь!', 'Полиция? За что?! Я честный человек!', 'Позор! Больше ни ногой!'],
  fakeCaught: ['Ой... ну, может и не совсем оригинал...', 'Да ладно, кто заметит-то?', 'Ну, это... реплика. Высокого качества!'],
  fakeAccused: ['Что?! Это оригинал! Сами вы подделка!', 'Я вам не мошенник!'],
};
function line(path, vars = {}) {
  let node = LINES;
  for (const k of path.split('.')) node = node[k];
  return fill(R.pick(node), vars);
}
