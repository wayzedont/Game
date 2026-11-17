// =====================================================================
//  Предметы: генерация, подделки, краденое, отрисовка (SVG)
// =====================================================================

const NAMES_LATIN = ['EMILY', 'ANNA', 'VICTOR', 'SOFIA', 'MARK', 'LUCY', 'OSCAR', 'NORA', 'LEON', 'IRIS', 'MAX', 'VERA'];
const NAMES_RU_ENGR = ['Навсегда твой, А.', 'Любимой Лене', 'Марине от Д.', 'С юбилеем, Ник!', 'Моей Кате', 'Зое — 25 лет', 'От всего сердца, В.', 'Ты — моё всё. О.'];

function metalGrad(id, kind) {
  const g = kind === 'steel'
    ? ['#ffffff', '#c3cad3', '#5c6670']
    : kind === 'rose'
      ? ['#ffe5d6', '#d9967a', '#7c4433']
      : ['#fff6c4', '#e2b33f', '#8c6215'];
  return `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${g[0]}"/><stop offset=".45" stop-color="${g[1]}"/><stop offset="1" stop-color="${g[2]}"/></linearGradient>`;
}
function metalStroke(kind) { return kind === 'steel' ? '#4a525b' : kind === 'rose' ? '#6b3a2b' : '#7a5410'; }

function glowFilter(id, sd = 1.6) {
  return `<filter id="${id}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${sd}" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
}

// ---------------------------------------------------------------------
const ITEM_TYPES = {

  // ===================== ЧАСЫ =====================
  watch: {
    name: 'Часы Aurex', cat: 'Часы', icon: '⌚',
    value: [2000, 6500], fakeValue: 70,
    weight: { real: [145, 185], fake: [80, 112], unit: 'г', dec: 0 },
    views: ['Циферблат', 'Задняя крышка'],
    dirtRegion: { cx: 100, cy: 100, rx: 56, ry: 90 },
    visualFlaws: ['crown', 'text', 'serial'],
    toolFlaws: ['light', 'magnetic', 'uv'],
    repairs: ['clean', 'battery'],
    catalog: [
      'Корона-логотип с <b>5 зубцами</b> над надписью AUREX.',
      'Надписи: <b>AUREX</b>, <b>GENEVE</b>, внизу <b>SWISS MADE</b>.',
      'Серийный номер на крышке: <b>AX-</b> и <b>6 цифр</b>.',
      'Вес <b>145–185 г</b>. Корпус <b>не магнитится</b>.',
      'Под УФ светятся метки и стрелки (люминофор).',
    ],
    gen(it) {
      it.metal = R.pick(['gold', 'gold', 'steel', 'rose']);
      it.dial = R.pick(['cream', 'black', 'blue', 'cream']);
      it.diamonds = R.chance(0.45);
      it.serial = 'AX-' + R.digits(6);
      it.engraving = R.chance(0.35) ? R.pick(NAMES_LATIN) : '';
      it.hh = R.i(0, 11); it.mm = R.i(0, 59);
      it.title = `Часы Aurex ${it.diamonds ? 'Royal' : 'Classic'}`;
      if (it.diamonds) it.valueMul = 1.3;
      if (it.metal === 'steel') it.valueMul = (it.valueMul || 1) * 0.75;
    },
    applyFlaw(it, f) {
      if (f === 'crown') it.crownPoints = 4;
      if (f === 'text') it.misspell = R.pick(['AUREK', 'AUERX', 'SWISS MAED', 'GENEVA']);
      if (f === 'serial') it.serial = R.pick(['AX-' + R.digits(5), 'XA-' + R.digits(6), 'AK-' + R.digits(6)]);
    },
    makeStolen(it, w) { w.kind = R.chance(0.6) ? 'engraving' : 'serial'; if (w.kind === 'engraving') { it.engraving = R.pick(NAMES_LATIN); w.field = 'engraving'; } else { w.field = 'serial'; } w.key = it[w.field]; },
    wantedText(w) { return w.kind === 'engraving' ? `Часы Aurex с гравировкой «${w.key}» на крышке` : `Часы Aurex, серийный № ${w.key}`; },
    svg(it, view, p) {
      const m = it.metal, st = metalStroke(m);
      const dialCols = { cream: ['#fffef8', '#e9dfc4', '#2a2a2a'], black: ['#3b3f46', '#111316', '#f1e6c8'], blue: ['#3a63b8', '#152a5c', '#f4f0e0'] }[it.dial];
      let s = `<defs>${metalGrad(p + 'g', m)}
        <radialGradient id="${p}d" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="${dialCols[0]}"/><stop offset="1" stop-color="${dialCols[1]}"/></radialGradient></defs>`;
      // браслет
      const links = (y0, y1) => {
        let r = '';
        for (let y = y0; y < y1; y += 11) {
          r += `<rect x="74" y="${y}" width="13" height="10" rx="2" fill="url(#${p}g)" stroke="${st}" stroke-width=".6"/>`;
          r += `<rect x="87.5" y="${y}" width="25" height="10" rx="2" fill="url(#${p}g)" stroke="${st}" stroke-width=".6"/>`;
          r += `<rect x="113" y="${y}" width="13" height="10" rx="2" fill="url(#${p}g)" stroke="${st}" stroke-width=".6"/>`;
        }
        return r;
      };
      s += links(-6, 46) + links(155, 205);
      s += `<rect x="70" y="40" width="60" height="16" rx="4" fill="url(#${p}g)" stroke="${st}"/>`;
      s += `<rect x="70" y="144" width="60" height="16" rx="4" fill="url(#${p}g)" stroke="${st}"/>`;
      // заводная головка
      s += `<rect x="151" y="93" width="9" height="14" rx="2.5" fill="url(#${p}g)" stroke="${st}"/>`;
      for (let i = 0; i < 4; i++) s += `<line x1="${152.5 + i * 2}" y1="94" x2="${152.5 + i * 2}" y2="106" stroke="${st}" stroke-width=".4"/>`;
      s += `<circle cx="100" cy="100" r="54" fill="url(#${p}g)" stroke="${st}" stroke-width="1.2"/>`;

      if (view === 0) {
        if (it.diamonds) {
          for (let i = 0; i < 32; i++) {
            const a = i / 32 * Math.PI * 2;
            s += `<circle cx="${100 + Math.cos(a) * 48}" cy="${100 + Math.sin(a) * 48}" r="2.9" fill="#fff" stroke="#b8c2cc" stroke-width=".5"/><circle cx="${99.3 + Math.cos(a) * 48}" cy="${99.3 + Math.sin(a) * 48}" r=".9" fill="#e8f6ff"/>`;
          }
        } else {
          s += `<circle cx="100" cy="100" r="48" fill="none" stroke="${st}" stroke-width=".5"/>`;
          for (let i = 0; i < 60; i++) {
            const a = i / 60 * Math.PI * 2, r1 = i % 5 ? 49 : 47.5;
            s += `<line x1="${100 + Math.cos(a) * r1}" y1="${100 + Math.sin(a) * r1}" x2="${100 + Math.cos(a) * 52}" y2="${100 + Math.sin(a) * 52}" stroke="${st}" stroke-width=".6"/>`;
          }
        }
        s += `<circle cx="100" cy="100" r="43" fill="url(#${p}d)" stroke="${st}" stroke-width=".8"/>`;
        const ink = dialCols[2];
        for (let i = 0; i < 12; i++) {
          const w = i % 3 === 0 ? 3.2 : 2.2, h = i % 3 === 0 ? 9 : 6.5;
          s += `<rect x="${100 - w / 2}" y="${61}" width="${w}" height="${h}" rx=".6" fill="url(#${p}g)" stroke="${st}" stroke-width=".3" transform="rotate(${i * 30} 100 100)"/>`;
        }
        // корона-логотип
        const n = it.crownPoints || 5;
        let d = 'M94.5 81 L94.5 74.5';
        const tips = [];
        for (let k = 0; k < n; k++) {
          const x = 94.5 + k * 11 / (n - 1);
          tips.push(x);
          if (k > 0) d += ` L${x - 11 / (n - 1) / 2} 77.8`;
          d += ` L${x} ${k === 0 || k === n - 1 ? 74.5 : 73.2}`;
        }
        d += ' L105.5 81 Z';
        s += `<path d="${d}" fill="url(#${p}g)" stroke="${st}" stroke-width=".35"/>`;
        tips.forEach((x, k) => { s += `<circle cx="${x}" cy="${k === 0 || k === n - 1 ? 74.2 : 72.8}" r=".75" fill="url(#${p}g)" stroke="${st}" stroke-width=".2"/>`; });
        const brand = ['AUREK', 'AUERX'].includes(it.misspell) ? it.misspell : 'AUREX';
        const city = it.misspell === 'GENEVA' ? 'GENEVA' : 'GENEVE';
        const sw = it.misspell === 'SWISS MAED' ? 'SWISS MAED' : 'SWISS MADE';
        s += `<text x="100" y="87.6" font-size="4.6" font-weight="700" text-anchor="middle" letter-spacing=".7" fill="${ink}" font-family="Georgia,serif">${brand}</text>`;
        s += `<text x="100" y="91.4" font-size="2.1" text-anchor="middle" letter-spacing=".5" fill="${ink}" font-family="Arial">${city}</text>`;
        s += `<text x="100" y="129" font-size="2.1" text-anchor="middle" letter-spacing=".4" fill="${ink}" font-family="Arial">${sw}</text>`;
        // стрелки
        const ha = it.hh * 30 + it.mm * 0.5, ma = it.mm * 6;
        s += `<g transform="rotate(${ha} 100 100)"><path d="M98.3 100 L99 78 L100 75 L101 78 L101.7 100 Z" fill="url(#${p}g)" stroke="${st}" stroke-width=".4"/></g>`;
        s += `<g transform="rotate(${ma} 100 100)"><path d="M98.8 100 L99.4 66 L100 63 L100.6 66 L101.2 100 Z" fill="url(#${p}g)" stroke="${st}" stroke-width=".4"/></g>`;
        s += `<g class="sec-hand"><line x1="100" y1="108" x2="100" y2="62" stroke="#c0262d" stroke-width=".7"/></g>`;
        s += `<circle cx="100" cy="100" r="2.4" fill="url(#${p}g)" stroke="${st}" stroke-width=".4"/>`;
        // блик
        s += `<path d="M70 75 Q90 58 118 62 Q92 66 74 86 Z" fill="#fff" opacity=".18"/>`;
      } else {
        s += `<circle cx="100" cy="100" r="46" fill="url(#${p}g)" stroke="${st}" stroke-width=".8"/>`;
        for (let r = 8; r < 46; r += 2.2) s += `<circle cx="100" cy="100" r="${r}" fill="none" stroke="#000" stroke-opacity=".05" stroke-width=".5"/>`;
        for (let i = 0; i < 6; i++) s += `<rect x="97" y="45.5" width="6" height="3.5" rx=".8" fill="${st}" opacity=".7" transform="rotate(${i * 60} 100 100)"/>`;
        s += `<text x="100" y="69" font-size="4.2" text-anchor="middle" letter-spacing=".9" fill="${st}" font-family="Arial" font-weight="700">AUREX · GENEVE</text>`;
        s += `<text x="100" y="75" font-size="2.3" text-anchor="middle" fill="${st}" font-family="Arial">WATER RESISTANT 100M</text>`;
        if (it.engraving) s += `<text x="100" y="104" font-size="10" text-anchor="middle" fill="${st}" font-family="Georgia,serif" font-style="italic" stroke="#fff" stroke-opacity=".35" stroke-width=".3">${it.engraving}</text>`;
        s += `<text x="100" y="${it.engraving ? 117 : 106}" font-size="4.3" text-anchor="middle" fill="${st}" font-family="Courier New,monospace" font-weight="700">${it.serial}</text>`;
        s += `<rect x="92" y="125" width="16" height="7" rx="3.5" fill="none" stroke="${st}" stroke-width=".5"/>`;
        s += `<text x="100" y="130.3" font-size="3.6" text-anchor="middle" fill="${st}" font-family="Arial" font-weight="700">${m === 'steel' ? '316L' : '750'}</text>`;
      }
      return s;
    },
    uv(it, view, p) {
      if (view !== 0 || it.flaws.includes('uv')) return '';
      let s = `<defs>${glowFilter(p + 'f')}</defs><g filter="url(#${p}f)" fill="#7dffb0">`;
      for (let i = 0; i < 12; i++) {
        const w = i % 3 === 0 ? 2.2 : 1.6, h = i % 3 === 0 ? 7 : 5;
        s += `<rect x="${100 - w / 2}" y="${62}" width="${w}" height="${h}" transform="rotate(${i * 30} 100 100)"/>`;
      }
      const ha = it.hh * 30 + it.mm * 0.5, ma = it.mm * 6;
      s += `<rect x="99.3" y="80" width="1.4" height="16" transform="rotate(${ha} 100 100)"/><rect x="99.5" y="68" width="1" height="26" transform="rotate(${ma} 100 100)"/></g>`;
      return s;
    },
  },

  // ===================== КОЛЬЦО =====================
  ring: {
    name: 'Кольцо', cat: 'Ювелирка', icon: '💍',
    value: [450, 2600], fakeValue: 20,
    weight: { real: [3.6, 7.5], fake: [1.6, 2.9], unit: 'г', dec: 1 },
    views: ['Вид сверху', 'Внутренняя сторона'],
    dirtRegion: { cx: 100, cy: 105, rx: 60, ry: 70 },
    visualFlaws: ['hallmark'],
    toolFlaws: ['light', 'magnetic', 'uv'],
    repairs: ['clean'],
    catalog: [
      'Проба внутри: <b>585</b> или <b>750</b> в <b>овальном</b> клейме со <b>звёздочкой</b>.',
      '«GP», «18KGP» и квадратные клейма — это напыление, не золото.',
      'Вес <b>3,6–7,5 г</b>. Золото <b>не магнитится</b>.',
      'Под УФ натуральный камень светится: бриллиант — голубым, рубин — красным.',
    ],
    gen(it) {
      it.metal = R.pick(['gold', 'gold', 'rose', 'steel']);
      if (it.metal === 'steel') it.metal = 'gold';
      it.stone = R.pick(['diamond', 'ruby', 'diamond', 'emerald']);
      it.proba = R.pick(['585', '750']);
      it.engraving = R.chance(0.3) ? R.pick(NAMES_RU_ENGR) : '';
      it.title = { diamond: 'Кольцо с бриллиантом', ruby: 'Кольцо с рубином', emerald: 'Кольцо с изумрудом' }[it.stone];
      if (it.proba === '750') it.valueMul = 1.25;
    },
    applyFlaw(it, f) { if (f === 'hallmark') it.badMark = R.pick(['GP', '18KGP', 'square']); },
    makeStolen(it, w) { it.engraving = R.pick(NAMES_RU_ENGR); w.field = 'engraving'; w.key = it.engraving; },
    wantedText(w) { return `Кольцо с гравировкой «${w.key}»`; },
    svg(it, view, p) {
      const st = metalStroke(it.metal);
      const gem = { diamond: ['#ffffff', '#cfe8ff', '#7fa6c9'], ruby: ['#ff7a8a', '#c3112c', '#5a0010'], emerald: ['#8af2b5', '#109a52', '#04381e'] }[it.stone];
      let s = `<defs>${metalGrad(p + 'g', it.metal)}
        <linearGradient id="${p}s" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${gem[0]}"/><stop offset=".5" stop-color="${gem[1]}"/><stop offset="1" stop-color="${gem[2]}"/></linearGradient>
        <linearGradient id="${p}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7a5410"/><stop offset=".25" stop-color="#ffe9a0"/><stop offset=".5" stop-color="#d9a53a"/><stop offset="1" stop-color="#6d4a0e"/></linearGradient></defs>`;
      if (view === 0) {
        s += `<path fill-rule="evenodd" d="M100 52 a52 60 0 1 0 0.01 0 Z M100 66 a39 46 0 1 1 -0.01 0 Z" fill="url(#${p}g)" stroke="${st}" stroke-width="1"/>`;
        s += `<path d="M66 90 Q70 70 88 62" stroke="#fff" stroke-width="3" fill="none" opacity=".35" stroke-linecap="round"/>`;
        // крапаны и камень
        s += `<path d="M84 60 L80 46 L120 46 L116 60 Z" fill="url(#${p}g)" stroke="${st}" stroke-width=".8"/>`;
        s += `<polygon points="82,36 118,36 126,44 100,66 74,44" fill="url(#${p}s)" stroke="${gem[2]}" stroke-width=".8"/>`;
        s += `<polyline points="74,44 126,44" stroke="${gem[2]}" stroke-width=".5" fill="none"/>`;
        s += `<path d="M82 36 L90 44 L100 36 L110 44 L118 36 M90 44 L100 66 L110 44" stroke="${gem[2]}" stroke-width=".4" fill="none" opacity=".8"/>`;
        s += `<polygon points="86,38 96,38 90,43" fill="#fff" opacity=".7"/>`;
        [[76, 40], [124, 40], [84, 34], [116, 34]].forEach(([x, y]) => { s += `<circle cx="${x}" cy="${y}" r="2.6" fill="url(#${p}g)" stroke="${st}" stroke-width=".5"/>`; });
      } else {
        s += `<rect x="12" y="74" width="176" height="56" rx="10" fill="url(#${p}b)" stroke="${st}"/>`;
        s += `<rect x="12" y="74" width="176" height="56" rx="10" fill="none" stroke="#000" stroke-opacity=".25" stroke-width="3"/>`;
        // проба
        if (it.badMark === 'GP' || it.badMark === '18KGP') {
          s += `<text x="44" y="104.5" font-size="5" text-anchor="middle" fill="#4b3205" font-family="Arial" font-weight="700">${it.badMark}</text>`;
        } else if (it.badMark === 'square') {
          s += `<rect x="33" y="97" width="22" height="10" fill="none" stroke="#4b3205" stroke-width=".6"/><text x="44" y="104" font-size="5" text-anchor="middle" fill="#4b3205" font-family="Arial" font-weight="700">${it.proba}</text>`;
        } else {
          s += `<ellipse cx="44" cy="102" rx="13" ry="6" fill="none" stroke="#4b3205" stroke-width=".6"/><text x="46.5" y="104" font-size="5" text-anchor="middle" fill="#4b3205" font-family="Arial" font-weight="700">${it.proba}</text>`;
          s += `<path d="M36.2 100.2 l.7 1.4 1.5.2 -1.1 1 .3 1.5 -1.4 -.7 -1.4 .7 .3 -1.5 -1.1 -1 1.5 -.2 Z" fill="#4b3205"/>`;
        }
        if (it.engraving) s += `<text x="118" y="105" font-size="6.5" text-anchor="middle" fill="#4b3205" font-family="Georgia,serif" font-style="italic">${it.engraving}</text>`;
        s += `<text x="100" y="146" font-size="7" text-anchor="middle" fill="#9fb0c4" font-family="Arial">внутренняя сторона шинки</text>`;
      }
      return s;
    },
    uv(it, view, p) {
      if (view !== 0 || it.flaws.includes('uv') || it.stone === 'emerald') return '';
      const c = it.stone === 'ruby' ? '#ff4d5e' : '#69c8ff';
      return `<defs>${glowFilter(p + 'f', 3)}</defs><polygon filter="url(#${p}f)" points="82,36 118,36 126,44 100,66 74,44" fill="${c}" opacity=".9"/>`;
    },
  },

  // ===================== КАРТИНА =====================
  painting: {
    name: 'Картина В. Мореля', cat: 'Искусство', icon: '🖼️',
    value: [1800, 9500], fakeValue: 50,
    weight: { real: [2.1, 3.6], fake: [2.0, 3.6], unit: 'кг', dec: 1 },
    views: ['Полотно', 'Оборот'],
    dirtRegion: { cx: 100, cy: 100, rx: 90, ry: 70 },
    visualFlaws: ['signature', 'staples'],
    toolFlaws: ['uv'],
    repairs: ['clean'],
    catalog: [
      'Подпись <b>«V. Morel»</b> и год. Морель писал в <b>1870–1895</b> гг. (умер в 1895-м).',
      'На обороте — деревянный подрамник с <b>клиньями</b> в углах и штамп галереи.',
      '<b>Металлические скобы</b> на обороте — признак современной работы.',
      'Под УФ старый лак светится <b>ровно и тускло</b>. Яркие пятна — свежая краска.',
    ],
    gen(it) {
      it.year = R.i(1870, 1895);
      it.sky = R.i(0, 3);
      it.sunX = R.i(45, 155); it.sunY = R.i(58, 85);
      it.hills = [0, 1, 2].map((k) => ({ y: 100 + k * 18 + R.i(-6, 6), a: R.i(5, 14), f: R.f(0.02, 0.05), ph: R.f(0, 6) }));
      it.trees = Array.from({ length: R.i(3, 7) }, () => ({ x: R.i(26, 174), y: R.i(118, 150), s: R.f(0.7, 1.4) }));
      it.inv = 'Inv. № ' + R.i(1000, 9999);
      it.title = R.pick(['Пейзаж В. Мореля', 'Морель — «Холмы»', 'Морель — «Вечер в долине»']);
    },
    applyFlaw(it, f) {
      if (f === 'signature') { if (R.chance(0.6)) it.year = R.i(1897, 1924); else it.sigName = 'V. Morrel'; }
      if (f === 'staples') it.staples = true;
    },
    makeStolen(it, w) { w.field = 'inv'; w.key = it.inv; },
    wantedText(w) { return `Картина Мореля из галереи «Люмьер», ${w.key}`; },
    svg(it, view, p) {
      const skies = [['#ffcf8a', '#f2795a'], ['#9fd3f0', '#eaf7ff'], ['#1c2b4f', '#5d6f9e'], ['#c9a3e8', '#ffd7b0']][it.sky];
      const hillC = it.sky === 2 ? ['#2a3b52', '#1e2c3e', '#142030'] : ['#7aa35a', '#5a8a45', '#3e6a33'];
      let s = `<defs>${metalGrad(p + 'g', 'gold')}<linearGradient id="${p}k" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${skies[0]}"/><stop offset="1" stop-color="${skies[1]}"/></linearGradient>
        <pattern id="${p}c" width="3" height="3" patternUnits="userSpaceOnUse"><rect width="3" height="3" fill="#dccba3"/><path d="M0 1.5H3M1.5 0V3" stroke="#c4b086" stroke-width=".5"/></pattern></defs>`;
      if (view === 0) {
        s += `<rect x="6" y="28" width="188" height="144" fill="url(#${p}g)" stroke="#6d4a0e" stroke-width="1.5"/>`;
        s += `<rect x="14" y="36" width="172" height="128" fill="none" stroke="#6d4a0e" stroke-width="1"/>`;
        s += `<rect x="18" y="40" width="164" height="120" fill="url(#${p}k)"/>`;
        s += `<circle cx="${it.sunX}" cy="${it.sunY}" r="11" fill="${it.sky === 2 ? '#f4f1d8' : '#fff3c4'}" opacity=".95"/>`;
        s += `<path d="M18 112 L48 80 L70 98 L98 70 L128 100 L150 84 L182 108 L182 160 L18 160 Z" fill="${it.sky === 2 ? '#3b4a6b' : '#9aa8c4'}" opacity=".8"/>`;
        it.hills.forEach((h, k) => {
          let d = `M18 ${h.y}`;
          for (let x = 18; x <= 182; x += 6) d += ` L${x} ${h.y + Math.sin(x * h.f + h.ph) * h.a}`;
          d += ' L182 160 L18 160 Z';
          s += `<path d="${d}" fill="${hillC[k]}"/>`;
        });
        it.trees.forEach((t) => {
          s += `<rect x="${t.x - 0.8 * t.s}" y="${t.y - 4 * t.s}" width="${1.6 * t.s}" height="${7 * t.s}" fill="#4a3220"/>`;
          s += `<ellipse cx="${t.x}" cy="${t.y - 8 * t.s}" rx="${5 * t.s}" ry="${7 * t.s}" fill="${it.sky === 2 ? '#0f1a26' : '#2f5a2a'}"/>`;
        });
        // мазки
        for (let i = 0; i < 14; i++) s += `<path d="M${24 + i * 11} ${46 + (i % 3) * 7} q4 -2 8 0" stroke="#fff" stroke-opacity=".18" stroke-width="1.2" fill="none"/>`;
        s += `<text x="176" y="155.5" font-size="3.3" text-anchor="end" fill="#2a1a0a" font-family="Georgia,serif" font-style="italic">${it.sigName || 'V. Morel'} ${it.year}</text>`;
      } else {
        s += `<rect x="18" y="40" width="164" height="120" fill="url(#${p}c)"/>`;
        s += `<g fill="#9a6b3c" stroke="#5b3a1a" stroke-width=".6"><rect x="18" y="40" width="164" height="10"/><rect x="18" y="150" width="164" height="10"/><rect x="18" y="40" width="10" height="120"/><rect x="172" y="40" width="10" height="120"/><rect x="95" y="50" width="10" height="100"/></g>`;
        for (let i = 0; i < 9; i++) s += `<path d="M${22 + i * 18} 42 q6 3 12 0" stroke="#5b3a1a" stroke-width=".3" fill="none"/>`;
        if (it.staples) {
          for (let x = 26; x < 178; x += 13) { s += `<rect x="${x}" y="43.5" width="6" height="1.6" fill="#b9c0c8" stroke="#555" stroke-width=".3"/><rect x="${x}" y="155" width="6" height="1.6" fill="#b9c0c8" stroke="#555" stroke-width=".3"/>`; }
          for (let y = 52; y < 150; y += 13) { s += `<rect x="21.5" y="${y}" width="1.6" height="6" fill="#b9c0c8" stroke="#555" stroke-width=".3"/><rect x="176.8" y="${y}" width="1.6" height="6" fill="#b9c0c8" stroke="#555" stroke-width=".3"/>`; }
        } else {
          [[28, 50, 0], [172, 50, 90], [172, 150, 180], [28, 150, 270]].forEach(([x, y, r]) => { s += `<polygon points="0,0 9,0 0,9" transform="translate(${x} ${y}) rotate(${r})" fill="#c69a63" stroke="#5b3a1a" stroke-width=".5"/>`; });
        }
        s += `<g transform="translate(58 92) rotate(-12)"><circle r="17" fill="none" stroke="#2b4c9b" stroke-width="1.2" opacity=".75"/><circle r="13" fill="none" stroke="#2b4c9b" stroke-width=".6" opacity=".75"/><text y="-2" font-size="3.4" text-anchor="middle" fill="#2b4c9b" font-family="Georgia,serif" opacity=".85">GALERIE</text><text y="3" font-size="3.4" text-anchor="middle" fill="#2b4c9b" font-family="Georgia,serif" opacity=".85">LUMIÈRE</text></g>`;
        s += `<rect x="116" y="104" width="44" height="18" fill="#f6f0dc" stroke="#9c8f6a" stroke-width=".5" transform="rotate(3 138 113)"/>`;
        s += `<text x="138" y="115" font-size="4.4" text-anchor="middle" fill="#222" font-family="Courier New,monospace" transform="rotate(3 138 113)">${it.inv}</text>`;
      }
      return s;
    },
    uv(it, view, p) {
      if (view !== 0) return '';
      let s = `<defs>${glowFilter(p + 'f', 2.5)}</defs><rect x="18" y="40" width="164" height="120" fill="#5df2a0" opacity=".12"/>`;
      if (it.flaws.includes('uv')) {
        s += `<g filter="url(#${p}f)" fill="#e9ffe0" opacity=".85">`;
        if (!it.uvPatches) it.uvPatches = Array.from({ length: 5 }, () => [R.i(35, 165), R.i(55, 145), R.i(8, 18), R.i(5, 12)]);
        it.uvPatches.forEach(([x, y, rx, ry]) => { s += `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}"/>`; });
        s += '</g>';
      }
      return s;
    },
  },

  // ===================== СУМКА =====================
  bag: {
    name: 'Сумка Monaro', cat: 'Аксессуары', icon: '👜',
    value: [800, 2800], fakeValue: 40,
    weight: { real: [720, 1150], fake: [360, 560], unit: 'г', dec: 0 },
    views: ['Сумка', 'Бирка внутри'],
    dirtRegion: { cx: 100, cy: 120, rx: 72, ry: 60 },
    visualFlaws: ['stitch', 'tag', 'logo'],
    toolFlaws: ['light', 'uv'],
    repairs: ['clean'],
    catalog: [
      'Строчка <b>ровная</b>: стежки одинаковой длины.',
      'Логотип на пластине: <b>MONARO</b>.',
      'Бирка: MONARO · MILANO · <b>MADE IN ITALY</b>, номер <b>MN-0000-00</b>.',
      'Вес <b>720–1150 г</b> (натуральная кожа).',
      'Под УФ на бирке проступает скрытая буква <b>«M»</b>.',
    ],
    gen(it) {
      it.color = R.pick(['#7b4a2a', '#1f1f24', '#8e1c2c', '#c9a27a', '#2f4f6f']);
      it.serial = `MN-${R.digits(4)}-${R.digits(2)}`;
      it.title = R.pick(['Сумка Monaro Bella', 'Сумка Monaro Classica', 'Сумка Monaro Mini']);
    },
    applyFlaw(it, f) {
      if (f === 'stitch') it.badStitch = true;
      if (f === 'tag') it.badTag = R.pick(['MADE IN ITALI', 'MADE IN ITAIY', 'MADE IN CHINA']);
      if (f === 'logo') it.badLogo = R.pick(['MOANRO', 'MONAKO', 'MONRAO']);
    },
    makeStolen(it, w) { w.field = 'serial'; w.key = it.serial; },
    wantedText(w) { return `Сумка Monaro, серийный № ${w.key}`; },
    svg(it, view, p) {
      const c = it.color;
      const dash = it.badStitch ? '2.6 1 1.1 2.6 3.6 1.3 1.6 2.2 2.9 .8' : '2.4 1.6';
      const thread = c === '#c9a27a' ? '#6b4a2a' : '#ecdcb6';
      let s = `<defs>${metalGrad(p + 'g', 'gold')}<linearGradient id="${p}l" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".25"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".35"/></linearGradient></defs>`;
      if (view === 0) {
        s += `<path d="M66 82 Q66 28 100 28 Q134 28 134 82" fill="none" stroke="${c}" stroke-width="9" stroke-linecap="round"/>`;
        s += `<path d="M66 82 Q66 28 100 28 Q134 28 134 82" fill="none" stroke="#000" stroke-opacity=".25" stroke-width="9" stroke-linecap="round" stroke-dasharray="0 0"/>`;
        s += `<path d="M66 82 Q66 28 100 28 Q134 28 134 82" fill="none" stroke="${thread}" stroke-width=".7" stroke-dasharray="${dash}"/>`;
        [66, 134].forEach((x) => { s += `<rect x="${x - 5}" y="76" width="10" height="9" rx="2" fill="url(#${p}g)" stroke="#7a5410" stroke-width=".5"/>`; });
        const body = 'M38 82 L162 82 L174 172 Q174 182 164 182 L36 182 Q26 182 26 172 Z';
        s += `<path d="${body}" fill="${c}"/><path d="${body}" fill="url(#${p}l)"/>`;
        s += `<path d="M41 86 L159 86 L170 171 Q170 178 163 178 L37 178 Q30 178 30 171 Z" fill="none" stroke="${thread}" stroke-width=".7" stroke-dasharray="${dash}"/>`;
        const flap = 'M38 82 L162 82 L160 128 Q100 146 40 128 Z';
        s += `<path d="${flap}" fill="${c}"/><path d="${flap}" fill="#000" opacity=".18"/>`;
        s += `<path d="M42 86 L158 86 L156.5 125 Q100 142 43.5 125 Z" fill="none" stroke="${thread}" stroke-width=".7" stroke-dasharray="${dash}"/>`;
        s += `<rect x="80" y="122" width="40" height="13" rx="2" fill="url(#${p}g)" stroke="#7a5410" stroke-width=".6"/>`;
        s += `<text x="100" y="130.6" font-size="5" font-weight="700" text-anchor="middle" letter-spacing=".9" fill="#5a3d08" font-family="Georgia,serif">${it.badLogo || 'MONARO'}</text>`;
        s += `<circle cx="100" cy="141" r="3.2" fill="url(#${p}g)" stroke="#7a5410" stroke-width=".5"/>`;
      } else {
        s += `<rect x="30" y="20" width="140" height="160" rx="6" fill="${c}" opacity=".55"/><rect x="30" y="20" width="140" height="160" rx="6" fill="#000" opacity=".35"/>`;
        s += `<rect x="52" y="52" width="96" height="96" rx="6" fill="#e8d6b5" stroke="#8c7350"/>`;
        s += `<rect x="56" y="56" width="88" height="88" rx="4" fill="none" stroke="#8c7350" stroke-width=".6" stroke-dasharray="${dash}"/>`;
        s += `<text x="100" y="82" font-size="9" font-weight="700" text-anchor="middle" letter-spacing="1.2" fill="#3a2a14" font-family="Georgia,serif">MONARO</text>`;
        s += `<text x="100" y="90" font-size="3.6" text-anchor="middle" letter-spacing="1" fill="#3a2a14" font-family="Arial">MILANO</text>`;
        s += `<text x="100" y="108" font-size="3.8" text-anchor="middle" fill="#3a2a14" font-family="Arial">${it.badTag || 'MADE IN ITALY'}</text>`;
        s += `<text x="100" y="124" font-size="4.2" text-anchor="middle" fill="#3a2a14" font-family="Courier New,monospace" font-weight="700">${it.serial}</text>`;
      }
      return s;
    },
    uv(it, view, p) {
      if (view !== 1 || it.flaws.includes('uv')) return '';
      return `<defs>${glowFilter(p + 'f', 1.5)}</defs><text filter="url(#${p}f)" x="100" y="140" font-size="16" text-anchor="middle" fill="#7af0ff" font-family="Georgia,serif" font-weight="700" opacity=".9">M</text>`;
    },
  },

  // ===================== МОНЕТА =====================
  coin: {
    name: 'Золотой дукат', cat: 'Монеты', icon: '🪙',
    value: [280, 1300], fakeValue: 5,
    weight: { real: [8.5, 8.7], fake: [6.6, 7.8], unit: 'г', dec: 2 },
    views: ['Аверс', 'Реверс'],
    dirtRegion: { cx: 100, cy: 100, rx: 72, ry: 72 },
    visualFlaws: ['year'],
    toolFlaws: ['light', 'magnetic'],
    repairs: ['clean'],
    catalog: [
      'Годы чеканки: <b>1886–1911</b>. В <b>1901</b> и <b>1907</b> монеты <b>не чеканились</b>.',
      'Надпись на аверсе: <b>REX · AURELIUS</b>.',
      'Вес строго <b>8,5–8,7 г</b>. Золото <b>не магнитится</b>.',
    ],
    gen(it) {
      it.year = R.pick([...Array.from({ length: 26 }, (_, k) => 1886 + k)].filter((y) => y !== 1901 && y !== 1907));
      it.title = `Золотой дукат ${it.year} г.`;
      if (it.year < 1890) it.valueMul = 1.4;
    },
    applyFlaw(it, f) { if (f === 'year') { it.year = R.pick([1901, 1907, 1912, 1913, 1884, 1915]); it.title = `Золотой дукат ${it.year} г.`; } },
    makeStolen: null,
    svg(it, view, p) {
      let s = `<defs><radialGradient id="${p}g" cx=".38" cy=".35" r=".75"><stop offset="0" stop-color="#fff2b8"/><stop offset=".55" stop-color="#e0ae3c"/><stop offset="1" stop-color="#94680f"/></radialGradient>
        <path id="${p}a" d="M42 100 A58 58 0 0 1 158 100"/></defs>`;
      s += `<circle cx="100" cy="100" r="74" fill="url(#${p}g)" stroke="#7a5410" stroke-width="1.5"/>`;
      s += `<circle cx="100" cy="100" r="66" fill="none" stroke="#7a5410" stroke-width="1"/>`;
      for (let i = 0; i < 72; i++) { const a = i / 72 * Math.PI * 2; s += `<circle cx="${100 + Math.cos(a) * 70}" cy="${100 + Math.sin(a) * 70}" r="1" fill="#a87a1c"/>`; }
      if (view === 0) {
        s += `<text font-size="8" font-family="Georgia,serif" fill="#6a4a0c" letter-spacing="1.5"><textPath href="#${p}a" startOffset="50%" text-anchor="middle">REX · AURELIUS · II</textPath></text>`;
        s += `<path d="M118 70 C104 58 82 64 80 82 C78 92 70 96 72 102 C74 106 79 104 80 108 C78 112 82 116 86 116 C86 124 92 128 100 126 L104 140 L126 140 C120 128 128 112 126 98 C130 86 128 76 118 70 Z" fill="#c8942a" stroke="#7a5410" stroke-width="1"/>`;
        s += `<path d="M112 70 C118 74 124 82 122 92 M104 76 C108 82 110 88 108 96" stroke="#7a5410" stroke-width=".8" fill="none"/>`;
        s += `<text x="100" y="160" font-size="10" text-anchor="middle" font-family="Georgia,serif" fill="#6a4a0c" font-weight="700">${it.year}</text>`;
      } else {
        for (let side = -1; side <= 1; side += 2) {
          for (let k = 0; k < 9; k++) {
            const deg = 112 + k * 15, a = deg * Math.PI / 180;
            let x = 100 + Math.cos(a) * 54; const y = 100 + Math.sin(a) * 54;
            let rot = deg + 90 + 25;
            if (side > 0) { x = 200 - x; rot = 180 - rot; }
            s += `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="6" ry="2.6" fill="#c8942a" stroke="#7a5410" stroke-width=".6" transform="rotate(${rot} ${x.toFixed(1)} ${y.toFixed(1)})"/>`;
          }
        }
        s += `<text x="100" y="108" font-size="30" text-anchor="middle" font-family="Georgia,serif" fill="#6a4a0c" font-weight="700">10</text>`;
        s += `<text x="100" y="124" font-size="8" text-anchor="middle" letter-spacing="2" font-family="Georgia,serif" fill="#6a4a0c">DUCAT</text>`;
        s += `<text x="100" y="138" font-size="3.5" text-anchor="middle" font-family="Georgia,serif" fill="#6a4a0c">· A ·</text>`;
      }
      return s;
    },
    uv() { return ''; },
  },

  // ===================== ТЕЛЕФОН =====================
  phone: {
    name: 'Смартфон Pear', cat: 'Техника', icon: '📱',
    value: [350, 1150], fakeValue: 60,
    weight: { real: [172, 212], fake: [118, 150], unit: 'г', dec: 0 },
    views: ['Экран', 'Задняя панель'],
    dirtRegion: { cx: 100, cy: 100, rx: 48, ry: 90 },
    visualFlaws: ['logo', 'text'],
    toolFlaws: ['light'],
    repairs: ['screen', 'clean'],
    catalog: [
      'Логотип-груша: <b>листик справа</b>.',
      'Надпись: <b>Designed by Pear in California</b>.',
      'Вес <b>172–212 г</b>.',
      'Проверяйте IMEI по ориентировкам — телефоны часто крадут.',
    ],
    gen(it) {
      it.color = R.pick(['#d9dde2', '#3a3d44', '#e9d3b4', '#3d5a80', '#7b2d3b']);
      it.model = R.i(11, 16);
      it.time = `${R.i(8, 23)}:${String(R.i(0, 59)).padStart(2, '0')}`;
      it.imei = `35 ${R.digits(6)} ${R.digits(6)} ${R.digits(1)}`;
      it.wall = R.pick([['#ff8a65', '#7e57c2'], ['#4fc3f7', '#1a237e'], ['#81c784', '#00695c'], ['#f06292', '#ffb74d']]);
      it.title = `Смартфон Pear ${it.model}${R.chance(0.4) ? ' Pro' : ''}`;
      it.valueMul = 0.7 + (it.model - 11) * 0.12;
    },
    applyFlaw(it, f) {
      if (f === 'logo') it.leafLeft = true;
      if (f === 'text') it.badText = R.pick(['Desinged by Pear in California', 'Designed by Pear in Califronia', 'Designed by Peer in California']);
    },
    makeStolen(it, w) { w.field = 'imei'; w.key = it.imei; },
    wantedText(w) { return `Смартфон Pear, IMEI ${w.key}`; },
    svg(it, view, p) {
      let s = `<defs><linearGradient id="${p}w" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${it.wall[0]}"/><stop offset="1" stop-color="${it.wall[1]}"/></linearGradient>
        <linearGradient id="${p}b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset=".4" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".25"/></linearGradient></defs>`;
      if (view === 0) {
        s += `<rect x="53" y="8" width="94" height="184" rx="15" fill="#15171b" stroke="${it.color}" stroke-width="2.5"/>`;
        s += `<rect x="58" y="13" width="84" height="174" rx="11" fill="url(#${p}w)"/>`;
        s += `<rect x="86" y="17" width="28" height="7" rx="3.5" fill="#000"/>`;
        s += `<text x="100" y="44" font-size="13" text-anchor="middle" fill="#fff" font-family="Arial" font-weight="300">${it.time}</text>`;
        const cols = ['#ff5252', '#ffd740', '#69f0ae', '#40c4ff', '#e040fb', '#fff', '#ff9100', '#18ffff'];
        for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) s += `<rect x="${64 + c * 19}" y="${62 + r * 22}" width="13" height="13" rx="3.5" fill="${cols[(r * 4 + c * 3) % cols.length]}" opacity=".9"/>`;
        s += `<rect x="62" y="160" width="76" height="20" rx="8" fill="#fff" opacity=".25"/>`;
        if (it.cracked) {
          const cx = it.crackX || 112, cy = it.crackY || 70;
          s += `<clipPath id="${p}cc"><rect x="58" y="13" width="84" height="174" rx="11"/></clipPath><g clip-path="url(#${p}cc)" stroke="#fff" stroke-width=".8" opacity=".9" fill="none">`;
          for (let k = 0; k < 9; k++) { const a = k / 9 * Math.PI * 2 + 0.3; s += `<path d="M${cx} ${cy} l${Math.cos(a) * 18} ${Math.sin(a) * 18} l${Math.cos(a + 0.4) * 22} ${Math.sin(a + 0.4) * 22} l${Math.cos(a - 0.3) * 30} ${Math.sin(a - 0.3) * 30}"/>`; }
          s += `<circle cx="${cx}" cy="${cy}" r="6"/><circle cx="${cx}" cy="${cy}" r="14"/></g>`;
        }
      } else {
        s += `<rect x="53" y="8" width="94" height="184" rx="15" fill="${it.color}" stroke="#555" stroke-width=".8"/>`;
        s += `<rect x="53" y="8" width="94" height="184" rx="15" fill="url(#${p}b)"/>`;
        s += `<rect x="60" y="15" width="36" height="38" rx="9" fill="#000" opacity=".2"/>`;
        [[70, 25], [86, 25], [70, 42]].forEach(([x, y]) => { s += `<circle cx="${x}" cy="${y}" r="6.2" fill="#1b1d22" stroke="#999" stroke-width=".8"/><circle cx="${x}" cy="${y}" r="3" fill="#24365a"/><circle cx="${x - 1}" cy="${y - 1}" r=".9" fill="#fff" opacity=".6"/>`; });
        s += `<circle cx="86" cy="42" r="2.5" fill="#fff6d0" opacity=".85"/>`;
        // груша
        const dark = it.color === '#d9dde2' || it.color === '#e9d3b4' ? '#9aa0a8' : '#d8d8d8';
        s += `<path d="M100 84 C91 84 92 92 90 98 C86 106 84 112 88 118 C92 124 108 124 112 118 C116 112 114 106 110 98 C108 92 109 84 100 84 Z" fill="${dark}"/>`;
        const lx = it.leafLeft ? -1 : 1;
        s += `<path d="M100 85 Q${100 + lx * 2} 78 ${100 + lx * 8} 76 Q${100 + lx * 6} 83 100 85 Z" fill="${dark}"/>`;
        s += `<text x="100" y="156" font-size="6.5" text-anchor="middle" fill="${dark}" font-family="Arial" font-weight="700">Pear</text>`;
        s += `<text x="100" y="163" font-size="2.4" text-anchor="middle" fill="${dark}" font-family="Arial">${it.badText || 'Designed by Pear in California'}</text>`;
        s += `<text x="100" y="167.5" font-size="2.4" text-anchor="middle" fill="${dark}" font-family="Courier New,monospace">IMEI ${it.imei}</text>`;
      }
      return s;
    },
    uv() { return ''; },
  },

  // ===================== ВАЗА =====================
  vase: {
    name: 'Фарфоровая ваза', cat: 'Антиквариат', icon: '🏺',
    value: [1200, 6500], fakeValue: 30,
    weight: { real: [1.6, 2.6], fake: [0.8, 1.2], unit: 'кг', dec: 2 },
    views: ['Ваза', 'Донышко'],
    dirtRegion: { cx: 100, cy: 100, rx: 55, ry: 85 },
    visualFlaws: ['mark'],
    toolFlaws: ['light', 'uv'],
    repairs: ['glue', 'clean'],
    catalog: [
      'Синее клеймо на донышке: рамка и <b>6 знаков</b> (2 столбца по 3).',
      'Вес <b>1,6–2,6 кг</b>.',
      'Под УФ старая глазурь <b>не светится</b>. Ровное яркое свечение — новодел.',
      'Музейные вещи имеют наклейку с инвентарным номером.',
    ],
    gen(it) {
      it.glyphs = Array.from({ length: 6 }, () => glyph());
      it.pat = R.i(0, 2);
      it.inv = 'Инв. ' + R.digits(4);
      it.museum = R.chance(0.2);
      it.title = R.pick(['Ваза «Облака»', 'Ваза «Пионы»', 'Ваза эпохи Мин (?)', 'Ваза «Драконы»']);
    },
    applyFlaw(it, f) { if (f === 'mark') it.glyphs = it.glyphs.slice(0, 4); },
    makeStolen(it, w) { it.museum = true; w.field = 'inv'; w.key = it.inv; },
    wantedText(w) { return `Ваза из городского музея, ${w.key}`; },
    svg(it, view, p) {
      const shape = 'M86 18 L114 18 L112 40 Q152 58 154 108 Q152 160 126 182 L74 182 Q48 160 46 108 Q48 58 88 40 Z';
      let s = `<defs><radialGradient id="${p}w" cx=".35" cy=".35" r=".8"><stop offset="0" stop-color="#ffffff"/><stop offset=".7" stop-color="#e8eef5"/><stop offset="1" stop-color="#b9c4d2"/></radialGradient>
        <clipPath id="${p}c"><path d="${shape}"/></clipPath></defs>`;
      if (view === 0) {
        s += `<path d="${shape}" fill="url(#${p}w)" stroke="#5a6a85" stroke-width="1"/>`;
        s += `<g clip-path="url(#${p}c)" stroke="#1f3f9a" fill="none" stroke-width="1.6">`;
        s += `<path d="M80 30 l4 6 l4 -6 l4 6 l4 -6 l4 6 l4 -6 l4 6 l4 -6"/><line x1="40" y1="52" x2="160" y2="52" stroke-width="2.5"/><line x1="40" y1="166" x2="160" y2="166" stroke-width="2.5"/>`;
        for (let x = 50; x < 160; x += 10) s += `<path d="M${x} 172 q5 -6 10 0"/>`;
        if (it.pat === 0) {
          [[78, 92], [118, 84], [100, 128], [70, 136], [132, 130]].forEach(([x, y]) => { s += `<path d="M${x - 12} ${y} q6 -10 12 0 q6 -10 12 0 q-2 8 -12 6 q-10 2 -12 -6 Z" fill="#2c55c4" fill-opacity=".35"/>`; });
        } else if (it.pat === 1) {
          [[82, 98], [122, 118], [96, 142]].forEach(([x, y]) => { for (let k = 0; k < 6; k++) { const a = k * 60; s += `<ellipse cx="${x}" cy="${y - 9}" rx="5" ry="9" transform="rotate(${a} ${x} ${y})" fill="#2c55c4" fill-opacity=".45"/>`; } s += `<circle cx="${x}" cy="${y}" r="4" fill="#1f3f9a"/>`; });
          s += `<path d="M60 150 Q80 120 100 110 Q120 100 140 70" stroke-width="1.2"/>`;
        } else {
          s += `<path d="M52 120 Q70 80 96 96 Q120 112 140 84 Q152 74 150 96 Q140 110 126 106" stroke-width="3" fill="none"/>`;
          for (let k = 0; k < 9; k++) s += `<path d="M${60 + k * 9} ${112 - Math.sin(k) * 12} l3 -4 l3 4" stroke-width="1"/>`;
          s += `<circle cx="140" cy="84" r="3" fill="#1f3f9a"/>`;
        }
        s += `</g><path d="M62 78 Q58 110 66 140" stroke="#fff" stroke-width="5" fill="none" opacity=".5" stroke-linecap="round"/>`;
        if (it.museum) s += `<rect x="112" y="150" width="24" height="9" fill="#fffbe8" stroke="#a99" stroke-width=".4"/><text x="124" y="156.2" font-size="3" text-anchor="middle" font-family="Courier New,monospace" fill="#222">${it.inv}</text>`;
      } else {
        s += `<circle cx="100" cy="100" r="74" fill="#e9eef4" stroke="#8a97ab" stroke-width="1"/>`;
        s += `<circle cx="100" cy="100" r="62" fill="#d9c7a6" stroke="#b39d77" stroke-width="1"/>`;
        s += `<circle cx="100" cy="100" r="54" fill="url(#${p}w)" stroke="#b39d77" stroke-width=".8"/>`;
        const n = it.glyphs.length, rows = n / 2;
        const h = rows * 13 + 6;
        s += `<rect x="84" y="${100 - h / 2}" width="32" height="${h}" fill="none" stroke="#2343a8" stroke-width="1.4" opacity=".85"/>`;
        it.glyphs.forEach((g, k) => {
          const col = k < rows ? 1 : 0, row = k % rows;
          s += `<path d="${g}" transform="translate(${88 + col * 14} ${100 - h / 2 + 4 + row * 13})" stroke="#2343a8" stroke-width="1.1" fill="none" stroke-linecap="round" opacity=".9"/>`;
        });
        if (it.museum) s += `<rect x="120" y="130" width="34" height="12" fill="#fffbe8" stroke="#a99" stroke-width=".4"/><text x="137" y="138" font-size="4" text-anchor="middle" font-family="Courier New,monospace" fill="#222">${it.inv}</text>`;
      }
      return s;
    },
    uv(it, view, p) {
      if (!it.flaws.includes('uv')) return '';
      const shape = 'M86 18 L114 18 L112 40 Q152 58 154 108 Q152 160 126 182 L74 182 Q48 160 46 108 Q48 58 88 40 Z';
      return view === 0
        ? `<defs>${glowFilter(p + 'f', 2.5)}</defs><path filter="url(#${p}f)" d="${shape}" fill="#e6fff0" opacity=".55"/>`
        : `<defs>${glowFilter(p + 'f', 2.5)}</defs><circle filter="url(#${p}f)" cx="100" cy="100" r="54" fill="#e6fff0" opacity=".5"/>`;
    },
  },
};

function glyph() {
  const parts = [];
  const n = R.i(3, 5);
  for (let i = 0; i < n; i++) {
    const t = R.i(0, 3);
    if (t === 0) parts.push(`M${R.i(0, 3)} ${R.i(0, 9)} H${R.i(6, 10)}`);
    else if (t === 1) parts.push(`M${R.i(2, 8)} ${R.i(0, 2)} V${R.i(7, 10)}`);
    else if (t === 2) parts.push(`M${R.i(0, 4)} ${R.i(0, 4)} L${R.i(6, 10)} ${R.i(6, 10)}`);
    else parts.push(`M${R.i(1, 4)} ${R.i(5, 9)} Q5 ${R.i(0, 4)} ${R.i(6, 9)} ${R.i(5, 9)}`);
  }
  return parts.join(' ');
}

// ---------------------------------------------------------------------
//  Создание предмета
// ---------------------------------------------------------------------
function makeItem(type, opts = {}) {
  const T = ITEM_TYPES[type];
  const it = { id: uid('it'), type, flaws: [], fake: !!opts.fake, stolen: false, valueMul: 1 };
  T.gen(it);
  it.condition = opts.condition != null ? opts.condition : (R.chance(0.45) ? R.f(0.25, 0.65) : R.f(0.75, 1));
  // базовая «как у оригинала» стоимость
  const base = R.f(T.value[0], T.value[1]) * (it.valueMul || 1);
  it.baseValue = Math.round(base / 10) * 10;
  if (it.fake) {
    const vf = R.pick(T.visualFlaws);
    it.flaws.push(vf);
    T.applyFlaw(it, vf);
    const tf = R.shuffle(T.toolFlaws).slice(0, R.i(1, Math.min(2, T.toolFlaws.length)));
    it.flaws.push(...tf);
    if (opts.extraVisual && T.visualFlaws.length > 1 && R.chance(0.5)) {
      const v2 = R.pick(T.visualFlaws.filter((x) => x !== vf));
      it.flaws.push(v2); T.applyFlaw(it, v2);
    }
  }
  const W = T.weight;
  const wr = it.flaws.includes('light') ? W.fake : W.real;
  it.weight = +R.f(wr[0], wr[1]).toFixed(W.dec);
  it.magnetic = it.flaws.includes('magnetic');
  // грязь
  const dr = T.dirtRegion;
  it.dirt = Array.from({ length: 22 }, () => {
    const a = Math.random() * Math.PI * 2, rr = Math.sqrt(Math.random());
    return { x: dr.cx + Math.cos(a) * dr.rx * rr, y: dr.cy + Math.sin(a) * dr.ry * rr, r: R.f(6, 18), c: R.pick(['#5b4024', '#6e5233', '#4a3a28', '#7a6040']) };
  });
  return it;
}

function itemValue(it) {
  if (it.fake) return ITEM_TYPES[it.type].fakeValue;
  return Math.round(it.baseValue * (0.45 + 0.55 * it.condition) / 5) * 5;
}
// сколько бы стоил предмет, если бы был оригиналом (так думает продавец-жулик)
function itemPretendValue(it) { return Math.round(it.baseValue * (0.45 + 0.55 * it.condition) / 5) * 5; }

function itemWeightText(it) {
  const W = ITEM_TYPES[it.type].weight;
  return it.weight.toFixed(W.dec).replace('.', ',') + ' ' + W.unit;
}

function dirtSvg(it, p) {
  if (it.condition >= 0.75) return '';
  const k = 1 - it.condition; // 0.25 .. 0.75
  const n = Math.round(it.dirt.length * Math.min(1, k * 1.4));
  let s = `<defs><filter id="${p}dz" x="-20%" y="-20%" width="140%" height="140%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="9" result="d"/><feGaussianBlur in="d" stdDeviation="1.8"/></filter></defs><g class="dirt" filter="url(#${p}dz)" opacity="${(0.35 + k * 0.6).toFixed(2)}">`;
  for (let i = 0; i < n; i++) { const d = it.dirt[i]; s += `<circle cx="${d.x.toFixed(1)}" cy="${d.y.toFixed(1)}" r="${(d.r * 0.85).toFixed(1)}" fill="${d.c}" opacity=".75"/>`; }
  return s + '</g>';
}

// Полный SVG предмета
function itemSvg(it, view = 0, opts = {}) {
  const T = ITEM_TYPES[it.type];
  const p = uid('s');
  const dirt = opts.noDirt ? '' : dirtSvg(it, p);
  return `<svg class="item-svg" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><g class="base">${T.svg(it, view, p)}${dirt}</g><rect class="uvdim" x="-50" y="-50" width="300" height="300" fill="#12042e" opacity=".78"/><g class="uvl">${T.uv ? T.uv(it, view, p + 'u') : ''}</g></svg>`;
}

// Эталон для каталога: «чистый» оригинал
function referenceItem(type) {
  const it = makeItem(type, { fake: false, condition: 1 });
  if (it.engraving) it.engraving = '';
  if (type === 'vase') it.museum = false;
  if (type === 'phone') it.cracked = false;
  return it;
}

// Применить ориентировку к предмету (сделать его краденым)
function applyWanted(it, w) {
  it[w.field] = w.key;
  if (it.type === 'vase') it.museum = true;
  it.stolen = true;
  it.fake = false;
  it.flaws = [];
}
function matchesWanted(it, w) { return it.type === w.type && it[w.field] === w.key && (it.type !== 'vase' || it.museum); }
