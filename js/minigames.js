const MG_BRUSH = '<svg viewBox="0 0 40 40" width="44" height="44"><rect x="6" y="20" width="22" height="8" fill="#d8d8d8" stroke="#333"/><path d="M8 28v6M12 28v6M16 28v6M20 28v6M24 28v6" stroke="#f4e9c0" stroke-width="2"/><rect x="26" y="21" width="12" height="5" fill="#b5332e" stroke="#333"/></svg>';
const MG_CLOTH = '<svg viewBox="0 0 40 40" width="46" height="46"><path d="M6 10 L30 6 L34 28 L12 34 Z" fill="#e9e4d4" stroke="#555"/><path d="M10 16 L30 12 M11 22 L31 18 M12 28 L32 24" stroke="#c9c2ad"/></svg>';

// =====================================================================
//  Мини-игры ремонта: чистка, замена детали (винты), склейка
// =====================================================================

const Minigame = {
  open(title) {
    const ov = $('#mg');
    ov.innerHTML = `<div class="mg-head"><div class="mg-title"><small>МАСТЕРСКАЯ</small>${title}</div><div class="mg-hint" id="mgHint"></div><div class="bar"><i id="mgBar"></i></div></div><div class="mg-stage" id="mgStage"></div><div class="mg-foot" id="mgFoot"></div>`;
    ov.classList.add('show');
    return $('#mgStage');
  },
  close() { $('#mg').classList.remove('show'); $('#mg').innerHTML = ''; },
  hint(t) { const h = $('#mgHint'); if (h) h.innerHTML = t; },
  bar(v) { const b = $('#mgBar'); if (b) b.style.width = Math.round(clamp(v, 0, 1) * 100) + '%'; },

  async finish(stage, t0, par) {
    this.bar(1);
    Sfx.good();
    const sp = el('div', { class: 'sparkles' });
    for (let i = 0; i < 14; i++) {
      const d = el('i'); d.textContent = '+';
      d.style.left = R.i(10, 90) + '%'; d.style.top = R.i(10, 90) + '%';
      d.style.animationDelay = (i * 0.05) + 's';
      sp.appendChild(d);
    }
    stage.appendChild(sp);
    this.hint('<b>РАБОТА ВЫПОЛНЕНА</b>');
    await wait(1100);
    this.close();
    const time = (performance.now() - t0) / 1000;
    return { time, fast: time < par };
  },

  run(item, kind) {
    if (kind === 'clean') return this.clean(item);
    if (kind === 'battery' || kind === 'screen') return this.parts(item, kind);
    if (kind === 'glue') return this.glue(item);
    return this.clean(item);
  },

  // --------------------------- ЧИСТКА ---------------------------
  clean(item) {
    return new Promise((resolve) => {
      const stage = this.open('Чистка: ' + item.title);
      const view = item.type === 'ring' ? 0 : 0;
      stage.innerHTML = `<div class="mg-item">${itemPix(item, view, { res: 256, noDirt: true })}</div><canvas id="cDirt"></canvas><canvas id="cFoam"></canvas><div class="tool-cursor" id="tCur">${MG_BRUSH}</div>`;
      const cd = $('#cDirt'), cf = $('#cFoam'), cur = $('#tCur');
      const rect = stage.getBoundingClientRect();
      const W = rect.width, H = rect.height, dpr = 0.5;
      [cd, cf].forEach((c) => { c.width = W * dpr; c.height = H * dpr; c.style.width = W + 'px'; c.style.height = H + 'px'; });
      const xd = cd.getContext('2d', { willReadFrequently: true }), xf = cf.getContext('2d', { willReadFrequently: true });
      xd.scale(dpr, dpr); xf.scale(dpr, dpr);
      const sc = Math.min(W, H) / 200, ox = (W - 200 * sc) / 2, oy = (H - 200 * sc) / 2;
      const dr = ITEM_TYPES[item.type].dirtRegion;
      // рисуем грязь
      for (let i = 0; i < 260; i++) {
        const a = Math.random() * Math.PI * 2, rr = Math.sqrt(Math.random());
        const x = ox + (dr.cx + Math.cos(a) * dr.rx * rr) * sc, y = oy + (dr.cy + Math.sin(a) * dr.ry * rr) * sc;
        xd.fillStyle = R.pick(['rgba(92,66,38,.55)', 'rgba(110,84,52,.5)', 'rgba(70,56,40,.6)', 'rgba(130,100,60,.45)']);
        xd.beginPath(); xd.arc(x, y, R.f(6, 16) * sc, 0, 7); xd.fill();
      }
      for (let i = 0; i < 40; i++) {
        const a = Math.random() * Math.PI * 2, rr = Math.sqrt(Math.random());
        xd.fillStyle = 'rgba(40,30,20,.5)';
        xd.beginPath(); xd.arc(ox + (dr.cx + Math.cos(a) * dr.rx * rr) * sc, oy + (dr.cy + Math.sin(a) * dr.ry * rr) * sc, R.f(1, 3) * sc, 0, 7); xd.fill();
      }
      const count = (ctx, c) => {
        const step = 6 * dpr;
        const d = ctx.getImageData(0, 0, c.width, c.height).data;
        let n = 0;
        for (let y = 0; y < c.height; y += step) for (let x = 0; x < c.width; x += step) if (d[(y * c.width + x) * 4 + 3] > 30) n++;
        return n;
      };
      const dirt0 = count(xd, cd);
      let phase = 1, foam0 = 1, moves = 0, last = 0;
      const t0 = performance.now();
      this.hint('Шаг 1/2 — <b>оттирайте щёткой</b> грязь');
      const brushR = 20;
      const pos = (e) => { const r = stage.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
      let down = false;
      const act = (x, y) => {
        if (phase === 1) {
          const a = xd.getImageData(Math.floor(x * dpr), Math.floor(y * dpr), 1, 1).data[3];
          xd.save(); xd.globalCompositeOperation = 'destination-out'; xd.fillStyle = '#000';
          xd.beginPath(); xd.arc(x, y, brushR, 0, 7); xd.fill(); xd.restore();
          if (a < 20) { if (++moves % 8 === 0) check(); return; }
          xf.fillStyle = 'rgba(255,255,255,.95)';
          for (let k = 0; k < 3; k++) { xf.beginPath(); xf.arc(x + R.f(-14, 14), y + R.f(-14, 14), R.f(8, 15), 0, 7); xf.fill(); }
          xf.fillStyle = 'rgba(210,225,240,.9)';
          xf.beginPath(); xf.arc(x + R.f(-10, 10), y + R.f(-10, 10), R.f(4, 8), 0, 7); xf.fill();
        } else {
          xf.save(); xf.globalCompositeOperation = 'destination-out'; xf.fillStyle = '#000';
          xf.beginPath(); xf.arc(x, y, brushR + 8, 0, 7); xf.fill(); xf.restore();
        }
        if (performance.now() - last > 90) { Sfx.scrub(); last = performance.now(); }
        if (++moves % 8 === 0) check();
      };
      const check = async () => {
        if (phase === 1) {
          const left = count(xd, cd) / Math.max(1, dirt0);
          this.bar((1 - left) * 0.6);
          if (left < 0.06) {
            xd.clearRect(0, 0, W, H);
            phase = 2; foam0 = Math.max(1, count(xf, cf));
            cur.innerHTML = MG_CLOTH;
            this.hint('Шаг 2/2 — <b>протрите тряпкой</b> пену');
            Sfx.pop();
          }
        } else if (phase === 2) {
          const left = count(xf, cf) / foam0;
          this.bar(0.6 + (1 - left) * 0.4);
          if (left < 0.08) {
            phase = 3; xf.clearRect(0, 0, W, H); cur.style.display = 'none';
            stage.onpointerdown = stage.onpointermove = null;
            resolve(await this.finish(stage, t0, 14));
          }
        }
      };
      stage.onpointerdown = (e) => { down = true; stage.setPointerCapture(e.pointerId); const [x, y] = pos(e); cur.style.transform = `translate(${x}px,${y}px)`; act(x, y); };
      stage.onpointermove = (e) => { const [x, y] = pos(e); cur.style.transform = `translate(${x}px,${y}px)`; if (down) act(x, y); };
      stage.onpointerup = stage.onpointercancel = () => { down = false; check(); };
    });
  },

  // --------------------------- ЗАМЕНА ДЕТАЛИ ---------------------------
  parts(item, kind) {
    return new Promise((resolve) => {
      const isPhone = kind === 'screen';
      const stage = this.open(isPhone ? 'Замена экрана' : 'Замена батарейки');
      const t0 = performance.now();
      const screws = isPhone ? [[35, 10], [65, 10], [35, 68], [65, 68]] : [[50, 7.5], [79, 36], [50, 64.5], [21, 36]];
      // вёрстка: всё в процентах от квадратной сцены
      stage.innerHTML = `
        <div class="pt-dev ${isPhone ? 'phone' : 'round'}"><div class="pt-slot" id="ptSlot"></div></div>
        <div class="pt-part old ${isPhone ? 'phone' : 'round'}" id="ptOld"></div>
        <div class="pt-bin" id="ptBin">${icon('box')}<small>В УТИЛЬ</small></div>
        <div class="pt-tray"><div class="pt-part new ${isPhone ? 'phone' : 'round'}" id="ptNew"></div></div>
        ${screws.map((s, i) => `<div class="pt-screw" data-i="${i}" style="left:${s[0]}%;top:${s[1]}%"><i></i></div>`).join('')}`;
      const old = $('#ptOld'), nw = $('#ptNew'), slot = $('#ptSlot'), bin = $('#ptBin');
      const sEls = $$('.pt-screw', stage);
      let phase = 'unscrew', turns = sEls.map(() => 0), progress = 0;
      const total = 4 * 3 * 2 + 2;
      const upd = () => this.bar(progress / total);
      this.hint('Шаг 1/4 — <b>открутите 4 винта</b> (нажимайте на каждый)');
      sEls.forEach((s, i) => {
        s.onclick = () => {
          if (phase !== 'unscrew' && phase !== 'screw') return;
          if (phase === 'unscrew' && turns[i] >= 3) return;
          if (phase === 'screw' && turns[i] <= 0) return;
          turns[i] += phase === 'unscrew' ? 1 : -1;
          progress++; upd(); Sfx.screw();
          s.querySelector('i').style.transform = `rotate(${turns[i] * (phase === 'unscrew' ? -120 : 120) + (phase === 'screw' ? 720 : 0)}deg)`;
          s.classList.toggle('loose', turns[i] > 0);
          if (phase === 'unscrew' && turns[i] === 3) { s.classList.add('out'); Sfx.pop(); }
          if (phase === 'unscrew' && turns.every((t) => t >= 3)) {
            phase = 'remove'; old.classList.add('draggable');
            this.hint('Шаг 2/4 — <b>перетащите старую деталь</b> в корзину');
          }
          if (phase === 'screw' && turns.every((t) => t <= 0)) {
            phase = 'done';
            this.finish(stage, t0, 16).then(resolve);
          }
        };
      });
      const drag = (elm, target, onDrop) => {
        let sx, sy, dx = 0, dy = 0, active = false;
        elm.onpointerdown = (e) => {
          if (!elm.classList.contains('draggable')) return;
          active = true; sx = e.clientX; sy = e.clientY; elm.setPointerCapture(e.pointerId); elm.classList.add('dragging');
        };
        elm.onpointermove = (e) => { if (!active) return; dx = e.clientX - sx; dy = e.clientY - sy; elm.style.transform = `translate(${dx}px,${dy}px)`; };
        elm.onpointerup = () => {
          if (!active) return; active = false; elm.classList.remove('dragging');
          const a = elm.getBoundingClientRect(), b = target.getBoundingClientRect();
          const ax = a.left + a.width / 2, ay = a.top + a.height / 2;
          const hit = ax > b.left - 20 && ax < b.right + 20 && ay > b.top - 20 && ay < b.bottom + 20;
          if (hit) onDrop(); else { elm.style.transform = ''; Sfx.click(); }
        };
      };
      drag(old, bin, () => {
        old.style.display = 'none'; Sfx.thud(); progress++; upd();
        phase = 'insert'; nw.classList.add('draggable');
        this.hint('Шаг 3/4 — <b>вставьте новую деталь</b> в корпус');
      });
      drag(nw, slot, () => {
        nw.classList.remove('draggable'); nw.style.transform = '';
        slot.appendChild(nw); nw.classList.add('placed'); Sfx.pop(); progress++; upd();
        phase = 'screw';
        sEls.forEach((s) => s.classList.remove('out'));
        this.hint('Шаг 4/4 — <b>закрутите винты</b> обратно');
      });
    });
  },

  // --------------------------- СКЛЕЙКА ---------------------------
  glue(item) {
    return new Promise((resolve) => {
      const stage = this.open('Склейка вазы');
      const t0 = performance.now();
      const holes = [
        [[62, 72], [80, 60], [98, 66], [101, 84], [88, 98], [66, 96]],
        [[108, 104], [130, 96], [148, 108], [146, 128], [126, 140], [111, 126]],
        [[70, 140], [92, 131], [109, 142], [106, 162], [86, 171], [72, 158]],
      ];
      const fixedItem = Object.assign({}, item, { museum: false });
      const vaseInner = ITEM_TYPES.vase.svg(fixedItem, 0, uid('gv'));
      let html = `<div class="mg-item">${itemPix(fixedItem, 0, { res: 256, noDirt: true })}</div><svg class="glue-holes" viewBox="0 0 200 200">`;
      holes.forEach((h, i) => { html += `<polygon id="gh${i}" points="${h.map((p) => p.join(',')).join(' ')}" fill="#14171f" stroke="#8a97ab" stroke-dasharray="3 2"/>`; });
      html += '</svg>';
      stage.innerHTML = html;
      const rect = stage.getBoundingClientRect();
      const sc = Math.min(rect.width, rect.height) / 200;
      const ox = (rect.width - 200 * sc) / 2, oy = (rect.height - 200 * sc) / 2;
      let placed = 0;
      this.hint('Перетащите <b>осколки</b> на их места');
      holes.forEach((h, i) => {
        const xs = h.map((p) => p[0]), ys = h.map((p) => p[1]);
        const minX = Math.min(...xs), minY = Math.min(...ys), w = Math.max(...xs) - minX, hh = Math.max(...ys) - minY;
        const cid = uid('sc');
        const shard = el('div', { class: 'shard' }, `<svg viewBox="${minX} ${minY} ${w} ${hh}" width="${w * sc}" height="${hh * sc}"><defs><clipPath id="${cid}"><polygon points="${h.map((q) => q.join(',')).join(' ')}"/></clipPath></defs><g clip-path="url(#${cid})"><rect x="0" y="0" width="200" height="200" fill="#eef2f7"/>${vaseInner}</g><polygon points="${h.map((q) => q.join(',')).join(' ')}" fill="none" stroke="#5a6a85" stroke-width="1"/></svg>`);
        const tx = ox + minX * sc, ty = oy + minY * sc;
        const startX = 10 + i * (rect.width - 20) / 3, startY = rect.height - hh * sc - 12;
        const rot = R.i(-50, 50);
        shard.style.left = startX + 'px'; shard.style.top = startY + 'px'; shard.style.transform = `rotate(${rot}deg)`;
        stage.appendChild(shard);
        let sx, sy, bx, by, active = false;
        shard.onpointerdown = (e) => { if (shard.classList.contains('done')) return; active = true; sx = e.clientX; sy = e.clientY; bx = parseFloat(shard.style.left); by = parseFloat(shard.style.top); shard.setPointerCapture(e.pointerId); shard.style.transform = 'rotate(0deg) scale(1.05)'; shard.style.zIndex = 5; };
        shard.onpointermove = (e) => { if (!active) return; shard.style.left = (bx + e.clientX - sx) + 'px'; shard.style.top = (by + e.clientY - sy) + 'px'; };
        shard.onpointerup = async () => {
          if (!active) return; active = false;
          const a = shard.getBoundingClientRect(), hb = $('#gh' + i, stage).getBoundingClientRect();
          if (Math.hypot(a.left + a.width / 2 - hb.left - hb.width / 2, a.top + a.height / 2 - hb.top - hb.height / 2) < 34) {
            shard.style.left = tx + 'px'; shard.style.top = ty + 'px'; shard.style.transform = 'none';
            shard.classList.add('done'); $('#gh' + i, stage).style.display = 'none';
            Sfx.pop(); placed++; this.bar(placed / 3);
            if (placed === 3) resolve(await this.finish(stage, t0, 12));
          } else { shard.style.transform = `rotate(${rot}deg)`; Sfx.click(); }
        };
      });
    });
  },
};
