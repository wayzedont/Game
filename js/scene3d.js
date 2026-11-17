// =====================================================================
//  3D-сцена в духе игр начала 2000-х: низкое разрешение, вершинный свет,
//  пиксельные текстуры, туман. Требует three.js (r128).
// =====================================================================

const Scene3D = {
  ok: false,
  customer: null,
  itemMesh: null,
  onItemClick: null,
  mode: 'shop',
  t: 0,

  // ---------- текстуры ----------
  tex(w, h, draw, rep) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const x = c.getContext('2d');
    x.imageSmoothingEnabled = false;
    draw(x, w, h);
    const t = new THREE.CanvasTexture(c);
    t.magFilter = THREE.NearestFilter;
    t.minFilter = THREE.NearestFilter;
    t.generateMipmaps = false;
    if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); }
    t._canvas = c;
    return t;
  },
  noise(x, w, h, amt, a = 0.12) {
    for (let i = 0; i < amt; i++) { x.fillStyle = `rgba(${Math.random() < 0.5 ? '0,0,0' : '255,255,255'},${Math.random() * a})`; x.fillRect(R.i(0, w), R.i(0, h), R.i(1, 2), R.i(1, 2)); }
  },
  mat(color, opts = {}) { return new THREE.MeshLambertMaterial(Object.assign({ color }, opts)); },
  box(w, h, d, mat, x = 0, y = 0, z = 0, parent) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    (parent || this.scene).add(m);
    return m;
  },
  textTex(w, h, lines, opts = {}) {
    return this.tex(w, h, (x) => {
      x.fillStyle = opts.bg || '#e9e1c8'; x.fillRect(0, 0, w, h);
      if (opts.border) { x.strokeStyle = opts.border; x.lineWidth = 2; x.strokeRect(2, 2, w - 4, h - 4); }
      lines.forEach(([t, size, col, y, font]) => {
        x.fillStyle = col; x.font = `${font || '700'} ${size}px Arial`; x.textAlign = 'center'; x.textBaseline = 'middle';
        x.fillText(t, w / 2, y);
      });
      this.noise(x, w, h, w * h / 6, 0.1);
    });
  },

  // ---------- инициализация ----------
  init(host) {
    if (!window.THREE) return;
    try {
      this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'low-power' });
    } catch (e) { return; }
    this.ok = true;
    this.host = host;
    const r = this.renderer;
    r.setPixelRatio(1);
    r.domElement.className = 'gl';
    host.prepend(r.domElement);
    const sc = this.scene = new THREE.Scene();
    sc.background = new THREE.Color(0x0e0a12);
    sc.fog = new THREE.Fog(0x0e0a12, 4.5, 11);
    this.cam = new THREE.PerspectiveCamera(55, 1, 0.05, 40);
    this.buildRoom();
    this.buildLights();
    this.resize();
    window.addEventListener('resize', () => this.resize());
    if (window.ResizeObserver) new ResizeObserver(() => this.resize()).observe(host);
    r.domElement.addEventListener('pointerdown', (e) => this.pick(e));
    this.last = performance.now();
    const loop = (now) => {
      requestAnimationFrame(loop);
      if (now - this.last < 33) return; // ~30 кадров, как в старых играх
      const dt = Math.min(0.1, (now - this.last) / 1000);
      this.last = now;
      this.update(dt);
      r.render(sc, this.cam);
    };
    requestAnimationFrame(loop);
  },

  resize() {
    if (!this.ok) return;
    const w = this.host.clientWidth, h = this.host.clientHeight;
    if (!w || !h) return;
    const H = Math.min(360, Math.round(h * 0.6));
    const W = Math.round(H * w / h);
    this.renderer.setSize(W, H, false);
    this.cam.aspect = w / h;
    this.cam.fov = w / h < 0.75 ? 60 : w / h < 1.1 ? 52 : 44;
    this.cam.updateProjectionMatrix();
  },

  buildRoom() {
    const S = this.scene;
    // пол
    const floorT = this.tex(64, 64, (x) => {
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { x.fillStyle = (i + j) % 2 ? '#2b2a2e' : '#7d7464'; x.fillRect(i * 16, j * 16, 16, 16); }
      this.noise(x, 64, 64, 900, 0.18);
    }, [8, 8]);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), this.mat(0xffffff, { map: floorT }));
    floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, -0.5); S.add(floor);
    // потолок
    const ceilT = this.tex(32, 32, (x) => { x.fillStyle = '#4a4440'; x.fillRect(0, 0, 32, 32); x.strokeStyle = '#2a2622'; x.strokeRect(0.5, 0.5, 31, 31); this.noise(x, 32, 32, 200); }, [8, 8]);
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), this.mat(0xffffff, { map: ceilT }));
    ceil.rotation.x = Math.PI / 2; ceil.position.set(0, 3, -0.5); S.add(ceil);
    // обои + деревянные панели
    const wallT = this.tex(32, 64, (x) => {
      x.fillStyle = '#4a1e24'; x.fillRect(0, 0, 32, 64);
      x.fillStyle = '#5c2830'; x.fillRect(0, 0, 8, 64); x.fillRect(16, 0, 8, 64);
      x.fillStyle = '#8a6a3a'; for (let y = 6; y < 64; y += 16) { x.fillRect(11, y, 2, 2); x.fillRect(27, y + 8, 2, 2); }
      this.noise(x, 32, 64, 500, 0.15);
    }, [10, 3]);
    const panelT = this.tex(64, 32, (x) => {
      x.fillStyle = '#4a2f1c'; x.fillRect(0, 0, 64, 32);
      x.strokeStyle = '#2d1b0f'; x.lineWidth = 2; x.strokeRect(3, 4, 26, 24); x.strokeRect(35, 4, 26, 24);
      x.fillStyle = '#6a4428'; x.fillRect(0, 0, 64, 2);
      this.noise(x, 64, 32, 400, 0.15);
    }, [5, 1]);
    const wallMat = this.mat(0xffffff, { map: wallT });
    const panelMat = this.mat(0xffffff, { map: panelT });
    const wall = (w, x, z, ry) => {
      const g = new THREE.Group();
      const up = new THREE.Mesh(new THREE.PlaneGeometry(w, 2.1), wallMat); up.position.y = 1.95; g.add(up);
      const lo = new THREE.Mesh(new THREE.PlaneGeometry(w, 0.9), panelMat); lo.position.y = 0.45; g.add(lo);
      g.position.set(x, 0, z); g.rotation.y = ry; S.add(g);
      return g;
    };
    wall(8, 0, -3, 0);
    wall(8, -3.2, -0.5, Math.PI / 2);
    wall(8, 3.2, -0.5, -Math.PI / 2);

    // окно с ночным городом
    const cityT = this.tex(128, 96, (x) => {
      const g = x.createLinearGradient(0, 0, 0, 96); g.addColorStop(0, '#0b0b2a'); g.addColorStop(0.7, '#3a1f55'); g.addColorStop(1, '#a8445a');
      x.fillStyle = g; x.fillRect(0, 0, 128, 96);
      x.fillStyle = '#fff'; for (let i = 0; i < 30; i++) x.fillRect(R.i(0, 127), R.i(0, 40), 1, 1);
      x.fillStyle = '#e8e2c4'; x.beginPath(); x.arc(100, 18, 7, 0, 7); x.fill();
      for (let b = 0; b < 14; b++) {
        const bw = R.i(8, 16), bh = R.i(25, 70), bx = b * 9.5 - 4;
        x.fillStyle = ['#120f22', '#181430', '#0f0c1c'][b % 3]; x.fillRect(bx, 96 - bh, bw, bh);
        for (let wy = 96 - bh + 3; wy < 94; wy += 5) for (let wx = bx + 2; wx < bx + bw - 2; wx += 4) if (Math.random() < 0.35) { x.fillStyle = R.pick(['#ffcf6b', '#ffe9a8', '#7af0ff', '#ff9f6b']); x.fillRect(wx, wy, 2, 2); }
      }
    });
    this.box(2.6, 1.5, 0.02, new THREE.MeshBasicMaterial({ map: cityT, fog: false }), 0, 1.75, -2.98);
    const frameMat = this.mat(0x1a1210);
    this.box(2.8, 0.1, 0.12, frameMat, 0, 2.53, -2.94); this.box(2.8, 0.1, 0.12, frameMat, 0, 0.97, -2.94);
    this.box(0.1, 1.62, 0.12, frameMat, -1.35, 1.75, -2.94); this.box(0.1, 1.62, 0.12, frameMat, 1.35, 1.75, -2.94);
    this.box(0.06, 1.5, 0.08, frameMat, 0, 1.75, -2.94); this.box(2.6, 0.06, 0.08, frameMat, 0, 1.95, -2.94);
    // решётка на окне
    for (let i = -5; i <= 5; i++) this.box(0.02, 1.5, 0.02, this.mat(0x2a2a2a), i * 0.24, 1.75, -2.9);

    // неоновая вывеска
    const neonT = this.tex(256, 64, (x) => {
      x.clearRect(0, 0, 256, 64);
      x.font = '900 40px Arial Black, Arial'; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.shadowColor = '#ff2b6b'; x.shadowBlur = 10; x.fillStyle = '#ff5c8a'; x.fillText('ЛОМБАРД', 128, 34);
      x.shadowBlur = 0; x.fillStyle = '#ffd6e2'; x.fillText('ЛОМБАРД', 128, 34);
    });
    this.neon = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.42), new THREE.MeshBasicMaterial({ map: neonT, transparent: true, fog: false }));
    this.neon.position.set(0, 2.25, -2.86); S.add(this.neon);
    const glowT = this.tex(64, 64, (x) => { const g = x.createRadialGradient(32, 32, 2, 32, 32, 32); g.addColorStop(0, 'rgba(255,60,120,.55)'); g.addColorStop(1, 'rgba(255,60,120,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); });
    glowT.magFilter = THREE.LinearFilter; glowT.minFilter = THREE.LinearFilter;
    this.glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowT, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: false }));
    this.glow.scale.set(3.2, 1.3, 1); this.glow.position.set(0, 2.25, -2.8); S.add(this.glow);

    // плакаты
    const p1 = this.textTex(64, 80, [['СКУПКА', 13, '#b31b1b', 16], ['ЗОЛОТА', 13, '#b31b1b', 32], ['ЧАСЫ', 9, '#222', 50], ['ТЕХНИКА', 9, '#222', 61], ['АНТИКВАРИАТ', 7, '#222', 71]], { bg: '#f1d36a', border: '#222' });
    const m1 = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.7), this.mat(0xffffff, { map: p1 })); m1.position.set(-2.0, 1.9, -2.98); S.add(m1);
    const p2 = this.textTex(64, 48, [['КРАДЕНОЕ', 10, '#fff', 14], ['НЕ', 10, '#fff', 26], ['ПРИНИМАЕМ', 10, '#fff', 38]], { bg: '#7a1414', border: '#fff' });
    const m2 = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.38), this.mat(0xffffff, { map: p2 })); m2.position.set(2.0, 2.05, -2.98); S.add(m2);

    // дверь слева
    const doorT = this.tex(32, 64, (x) => {
      x.fillStyle = '#3d2a1c'; x.fillRect(0, 0, 32, 64);
      x.fillStyle = '#6fa0b8'; x.fillRect(6, 6, 20, 22);
      x.fillStyle = '#9ccbe0'; x.fillRect(8, 8, 6, 4);
      x.strokeStyle = '#24170e'; x.strokeRect(5.5, 33.5, 21, 25);
      x.fillStyle = '#d4b04a'; x.fillRect(25, 36, 3, 3);
      x.fillStyle = '#fff'; x.font = '700 5px Arial'; x.fillText('ОТКРЫТО', 6, 31);
      this.noise(x, 32, 64, 300);
    });
    const door = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 2.1), this.mat(0xffffff, { map: doorT }));
    door.position.set(-3.18, 1.05, -1.9); door.rotation.y = Math.PI / 2; S.add(door);
    this.box(0.08, 2.25, 1.15, frameMat, -3.16, 1.1, -1.9);
    this.doorMesh = door;

    // полки справа и слева
    const wood = this.mat(0x5a3a22);
    const shelf = (x, z, ry) => {
      const g = new THREE.Group();
      [0.9, 1.45, 2.0].forEach((y) => this.box(1.6, 0.05, 0.38, wood, 0, y, 0, g));
      this.box(0.05, 1.5, 0.38, wood, -0.78, 1.45, 0, g); this.box(0.05, 1.5, 0.38, wood, 0.78, 1.45, 0, g);
      g.position.set(x, 0, z); g.rotation.y = ry; S.add(g);
      return g;
    };
    const sR = shelf(2.95, -1.4, -Math.PI / 2);
    const sL = shelf(-2.95, 0.2, Math.PI / 2);
    // вещи на полках
    const lathe = (pts, col, segs = 7) => new THREE.Mesh(new THREE.LatheGeometry(pts.map(([a, b]) => new THREE.Vector2(a, b)), segs), this.mat(col));
    const v1 = lathe([[0, 0], [0.08, 0], [0.11, 0.08], [0.09, 0.18], [0.04, 0.24], [0.05, 0.3], [0, 0.3]], 0xdfe7f2); v1.position.set(-0.5, 0.93, 0); sR.add(v1);
    const v2 = lathe([[0, 0], [0.06, 0], [0.09, 0.12], [0.03, 0.22], [0, 0.22]], 0x2b4c9b); v2.position.set(-0.25, 0.93, 0); sR.add(v2);
    // телевизор с новостями
    const tv = new THREE.Group();
    this.box(0.5, 0.4, 0.36, this.mat(0x2a2a2e), 0, 0, 0, tv);
    this.tvT = this.tex(64, 48, () => {});
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.38, 0.29), new THREE.MeshBasicMaterial({ map: this.tvT, fog: false }));
    scr.position.z = 0.185; tv.add(scr);
    tv.position.set(0.35, 1.68, 0.02); sR.add(tv);
    this.box(0.3, 0.22, 0.2, this.mat(0x7a3d8c), 0.4, 1.06, 0, sR);
    this.box(0.12, 0.3, 0.12, this.mat(0xc9a03a), 0.1, 1.1, 0, sR);
    // гитара
    const gt = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), this.mat(0xb5332e)); body.scale.set(1, 1.2, 0.3); gt.add(body);
    const body2 = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), this.mat(0xb5332e)); body2.scale.set(1, 1.1, 0.3); body2.position.y = 0.2; gt.add(body2);
    this.box(0.05, 0.55, 0.03, this.mat(0x3a2414), 0, 0.5, 0, gt);
    gt.position.set(-0.4, 1.7, 0); gt.rotation.z = 0.2; sL.add(gt);
    this.box(0.4, 0.3, 0.3, this.mat(0x6c6c70), 0.3, 1.1, 0, sL);
    const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.02, 8), this.mat(0xd4b04a)); dial.rotation.x = Math.PI / 2; dial.position.set(0.3, 1.1, 0.16); sL.add(dial);
    const tr = lathe([[0, 0], [0.07, 0], [0.03, 0.04], [0.02, 0.12], [0.08, 0.2], [0.07, 0.28], [0, 0.26]], 0xd9b440); tr.position.set(0.3, 1.48, 0); sL.add(tr);

    // лампа под потолком
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.22, 8, 1, true), this.mat(0x1e3a2a, { side: THREE.DoubleSide }));
    shade.position.set(0, 2.55, 0.1); S.add(shade);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 4), new THREE.MeshBasicMaterial({ color: 0xfff1c0 }));
    bulb.position.set(0, 2.45, 0.1); S.add(bulb);
    this.box(0.01, 0.45, 0.01, this.mat(0x111111), 0, 2.85, 0.1);

    // прилавок (на нашей стороне)
    const ctT = this.tex(64, 16, (x) => { x.fillStyle = '#6a4024'; x.fillRect(0, 0, 64, 16); x.fillStyle = '#7d4d2c'; for (let i = 0; i < 64; i += 16) x.fillRect(i, 0, 14, 16); x.fillStyle = '#4a2c18'; for (let i = 0; i < 6; i++) x.fillRect(R.i(0, 60), R.i(0, 15), R.i(4, 10), 1); this.noise(x, 64, 16, 200); }, [4, 1]);
    const ctMat = this.mat(0xffffff, { map: ctT });
    this.box(3.6, 0.06, 0.8, ctMat, 0, 1.0, 0.8);
    this.box(3.6, 1.0, 0.04, this.mat(0x3a2414), 0, 0.5, 0.42);
    const matT = this.tex(64, 48, (x) => {
      x.fillStyle = '#21615e'; x.fillRect(0, 0, 64, 48);
      x.fillStyle = '#2d7a76'; for (let i = 0; i < 64; i += 8) x.fillRect(i, 0, 1, 48); for (let j = 0; j < 48; j += 8) x.fillRect(0, j, 64, 1);
      x.fillStyle = '#9fd8d2'; x.font = '700 5px Arial'; x.fillText('ПОСЛЕДНИЙ ШАНС', 3, 7);
      this.noise(x, 64, 48, 300);
    });
    const mt = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 0.6), this.mat(0xffffff, { map: matT }));
    mt.rotation.x = -Math.PI / 2; mt.position.set(0, 1.035, 0.82); S.add(mt);
    // касса
    const reg = new THREE.Group();
    this.box(0.42, 0.18, 0.34, this.mat(0x3c4048), 0, 0.09, 0, reg);
    const rt = this.box(0.36, 0.14, 0.2, this.mat(0x2c3038), 0, 0.22, -0.02, reg); rt.rotation.x = -0.4;
    const rdT = this.tex(32, 8, (x) => { x.fillStyle = '#071a07'; x.fillRect(0, 0, 32, 8); x.fillStyle = '#5dff6a'; x.font = '700 7px monospace'; x.fillText('0000.00', 2, 7); });
    const rd = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.06), new THREE.MeshBasicMaterial({ map: rdT }));
    rd.position.set(0, 0.36, -0.1); reg.add(rd);
    reg.position.set(1.15, 1.03, 0.9); reg.rotation.y = -0.5; S.add(reg);
    // настольная лампа
    const dl = new THREE.Group();
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.03, 8), this.mat(0x1e3a2a)); dl.add(base);
    const arm = this.box(0.02, 0.38, 0.02, this.mat(0x222222), 0, 0.2, 0, dl); arm.rotation.z = 0.3;
    const hd = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.14, 8, 1, true), this.mat(0x1e3a2a, { side: THREE.DoubleSide }));
    hd.position.set(-0.08, 0.38, 0.02); hd.rotation.z = 0.9; dl.add(hd);
    dl.position.set(-1.2, 1.03, 0.85); S.add(dl);
  },

  buildLights() {
    const S = this.scene;
    S.add(new THREE.AmbientLight(0x3a2e48, 0.9));
    S.add(new THREE.HemisphereLight(0x8c7aa8, 0x2a1810, 0.35));
    this.lamp = new THREE.PointLight(0xffd9a0, 1.35, 6, 1.4); this.lamp.position.set(0, 2.4, 0.2); S.add(this.lamp);
    this.neonL = new THREE.PointLight(0xff3b7b, 0.9, 5, 1.5); this.neonL.position.set(0, 2.2, -2.4); S.add(this.neonL);
    this.deskL = new THREE.PointLight(0xffc070, 0.6, 2.2, 2); this.deskL.position.set(-1.1, 1.4, 0.9); S.add(this.deskL);
    const win = new THREE.DirectionalLight(0x6a7ad8, 0.3); win.position.set(0, 2, -3); S.add(win);
  },

  // ---------- ТВ с новостями ----------
  setNews(text) { this.newsText = '  СРОЧНО: ' + text + '  '; this.newsX = 64; },
  drawTV() {
    if (!this.tvT) return;
    const c = this.tvT._canvas, x = c.getContext('2d');
    x.fillStyle = '#1b2a4a'; x.fillRect(0, 0, 64, 48);
    x.fillStyle = '#c9d6f0'; x.fillRect(0, 0, 64, 9);
    x.fillStyle = '#1b2a4a'; x.font = '700 7px Arial'; x.fillText('НОВОСТИ 24', 4, 7);
    x.fillStyle = '#e8b48f'; x.fillRect(22, 14, 18, 18); x.fillStyle = '#2a3a5a'; x.fillRect(18, 30, 26, 10);
    x.fillStyle = '#b00'; x.fillRect(0, 38, 64, 10);
    x.fillStyle = '#fff'; x.font = '700 7px Arial';
    const tw = x.measureText(this.newsText || '').width;
    this.newsX = (this.newsX || 64) - 1.5; if (this.newsX < -tw) this.newsX = 64;
    x.fillText(this.newsText || '', this.newsX, 46);
    for (let y = 0; y < 48; y += 2) { x.fillStyle = 'rgba(0,0,0,.18)'; x.fillRect(0, y, 64, 1); }
    this.tvT.needsUpdate = true;
  },

  // ---------- клиент ----------
  faceTex(P, mood, mouth, blink) {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const x = c.getContext('2d');
    x.clearRect(0, 0, 64, 64);
    const ex = [21, 43], ey = 27;
    const look = mood === 'nervous' ? 2 : mood === 'sly' ? 2 : 0;
    // румянец
    x.fillStyle = mood === 'angry' || mood === 'shock' ? 'rgba(230,60,60,.55)' : 'rgba(230,90,90,.25)';
    x.fillRect(11, 36, 8, 4); x.fillRect(45, 36, 8, 4);
    // глаза
    ex.forEach((cx) => {
      if (blink || mood === 'happy') {
        x.fillStyle = '#2a1a12'; x.fillRect(cx - 5, ey, 10, 2);
        if (mood === 'happy') { x.fillRect(cx - 5, ey - 1, 2, 2); x.fillRect(cx + 3, ey - 1, 2, 2); }
      } else {
        const h = mood === 'shock' ? 9 : mood === 'sly' ? 4 : 7;
        x.fillStyle = '#f4f0e6'; x.fillRect(cx - 5, ey - h / 2, 10, h);
        x.fillStyle = '#2a1a12'; x.fillRect(cx - 2 + look, ey - 2, mood === 'shock' ? 3 : 4, 4);
        x.fillStyle = '#fff'; x.fillRect(cx - 1 + look, ey - 2, 1, 1);
        x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(cx - 5, ey - h / 2, 10, 1);
      }
    });
    // брови
    const bc = P.old ? '#cfcfcf' : P.hair;
    const by = ey - 8;
    const tilt = { angry: 3, nervous: -2, sad: -3, shock: -2, sly: 1, happy: 0, neutral: 0 }[mood] || 0;
    ex.forEach((cx, i) => {
      x.fillStyle = bc;
      for (let k = 0; k < 10; k++) {
        const px = i === 0 ? cx - 5 + k : cx + 4 - k; // k=0 внешний край, k=9 у переносицы
        const yy = by + Math.round((k / 9) * tilt) - (mood === 'shock' ? 2 : 0);
        x.fillRect(px, yy, 1, 2);
      }
    });
    // рот
    const my = 48;
    x.fillStyle = '#5a1e18';
    if (mouth || mood === 'shock') { x.fillRect(27, my - 2, 10, mood === 'shock' ? 7 : 5); x.fillStyle = '#c4545c'; x.fillRect(29, my + 1, 6, 2); }
    else if (mood === 'happy') { x.fillRect(24, my - 1, 16, 2); x.fillRect(26, my + 1, 12, 2); x.fillStyle = '#fff'; x.fillRect(27, my - 1, 10, 1); }
    else if (mood === 'angry') { x.fillRect(25, my + 1, 14, 2); x.fillRect(24, my + 2, 2, 2); x.fillRect(38, my + 2, 2, 2); }
    else if (mood === 'sad') { x.fillRect(26, my, 12, 2); x.fillRect(25, my + 2, 2, 1); x.fillRect(37, my + 2, 2, 1); }
    else if (mood === 'nervous') { for (let k = 0; k < 14; k += 2) x.fillRect(25 + k, my + (k % 4 ? 1 : 0), 2, 2); }
    else if (mood === 'sly') { x.fillRect(26, my + 1, 10, 2); x.fillRect(36, my - 1, 3, 2); }
    else x.fillRect(26, my, 12, 2);
    // усы
    if (P.mustache) { x.fillStyle = P.hair; x.fillRect(23, my - 6, 18, 3); x.fillRect(21, my - 4, 4, 2); x.fillRect(39, my - 4, 4, 2); }
    // пот
    if (mood === 'nervous' || mood === 'shock') {
      x.fillStyle = '#9fe0ff'; x.fillRect(52, 12, 3, 5); x.fillRect(53, 17, 1, 1); x.fillRect(8, 18, 2, 4);
    }
    if (mood === 'angry') { x.fillStyle = '#d02020'; x.fillRect(50, 8, 6, 2); x.fillRect(52, 6, 2, 6); }
    const t = new THREE.CanvasTexture(c);
    t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
    return t;
  },

  buildPerson(P) {
    const g = new THREE.Group();
    const skin = this.mat(new THREE.Color(P.skin));
    const cloth = this.mat(new THREE.Color(P.cloth));
    const cloth2 = this.mat(new THREE.Color(P.cloth2));
    const hairM = this.mat(new THREE.Color(P.hair));
    const pants = this.mat(0x24242c);
    const b = P.body;
    // ноги
    const legs = [];
    [-0.11, 0.11].forEach((x) => {
      const piv = new THREE.Group(); piv.position.set(x * b, 0.9, 0);
      const l = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.065, 0.86, 6), pants); l.position.y = -0.43; piv.add(l);
      const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.07, 0.2), this.mat(0x1a1410)); shoe.position.set(0, -0.86, 0.04); piv.add(shoe);
      g.add(piv); legs.push(piv);
    });
    // торс
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.23 * b, 0.2 * b, 0.62, 8), cloth);
    torso.position.y = 1.2; torso.scale.z = 0.72; g.add(torso);
    const sh = new THREE.Mesh(new THREE.SphereGeometry(0.23 * b, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), cloth);
    sh.position.y = 1.5; sh.scale.set(1, 0.38, 0.72); g.add(sh);
    if (P.jacket === 'jacket' || P.jacket === 'coat') {
      const shirt = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.32, 3), cloth2); shirt.rotation.x = Math.PI; shirt.rotation.y = Math.PI; shirt.position.set(0, 1.38, 0.17 * b); shirt.scale.z = 0.25; g.add(shirt);
    } else if (P.jacket === 'hoodie') {
      const hood = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.05, 4, 8), cloth); hood.rotation.x = Math.PI / 2 - 0.3; hood.position.set(0, 1.56, -0.04); g.add(hood);
    }
    // руки
    const arms = [];
    [-1, 1].forEach((s) => {
      const piv = new THREE.Group(); piv.position.set(s * 0.27 * b, 1.46, 0);
      const up = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.06, 0.32, 6), cloth); up.position.y = -0.16; piv.add(up);
      const el = new THREE.Group(); el.position.y = -0.32; piv.add(el);
      const fo = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.05, 0.3, 6), cloth); fo.position.y = -0.15; el.add(fo);
      const hand = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.05), skin); hand.position.y = -0.33; el.add(hand);
      piv.rotation.x = -0.35; piv.rotation.z = s * 0.12; el.rotation.x = -1.0;
      g.add(piv); arms.push({ piv, el, s });
    });
    // шея и голова
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.14, 6), skin); neck.position.y = 1.58; g.add(neck);
    const head = new THREE.Group(); head.position.y = 1.78; g.add(head);
    const R0 = 0.17, sx = P.headW, sy = P.headH * 1.12, sz = 1.0;
    const skull = new THREE.Mesh(new THREE.SphereGeometry(R0, 10, 8), skin); skull.scale.set(sx, sy, sz); head.add(skull);
    const jaw = new THREE.Mesh(new THREE.SphereGeometry(R0 * 0.85, 8, 6), skin); jaw.scale.set(sx * 0.95, sy * 0.7, 0.9); jaw.position.set(0, -0.07, 0.01); head.add(jaw);
    [-1, 1].forEach((s) => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.04, 5, 4), skin); e.scale.set(0.6, 1, 0.8); e.position.set(s * R0 * sx * 0.98, 0, -0.01); head.add(e); });
    const faceMat = new THREE.MeshLambertMaterial({ map: this.faceTex(P, 'neutral'), transparent: true, alphaTest: 0.1 });
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.3 * sx, 0.3 * sy), faceMat); face.position.set(0, -0.005, R0 * sz + 0.004); head.add(face);
    // нос
    const nC = new THREE.Color(P.noseC || P.skin).multiplyScalar(P.noseC ? 1 : 0.93);
    let nose;
    if (P.nose === 'long') { nose = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.09, 5), this.mat(nC)); nose.rotation.x = Math.PI / 2 + 0.4; nose.position.set(0, -0.02, R0 * sz + 0.03); }
    else { nose = new THREE.Mesh(new THREE.SphereGeometry(P.nose === 'small' ? 0.025 : 0.04, 6, 5), this.mat(nC)); nose.position.set(0, -0.025, R0 * sz + 0.005); }
    head.add(nose);
    // борода
    if (P.beard === 'full') { const bd = new THREE.Mesh(new THREE.SphereGeometry(R0 * 0.9, 8, 5, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), hairM); bd.scale.set(sx, sy * 0.9, 1); bd.position.set(0, -0.05, 0.02); head.add(bd); }
    if (P.beard === 'goatee') { const bd = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.08, 5), hairM); bd.rotation.x = Math.PI; bd.position.set(0, -0.17 * sy, R0 * 0.8); head.add(bd); }
    // очки
    if (P.glasses) {
      const gm = this.mat(0x111111);
      [-1, 1].forEach((s) => { const r = new THREE.Mesh(new THREE.TorusGeometry(0.038, 0.007, 4, 10), gm); r.position.set(s * 0.055 * sx, 0.04, R0 * sz * 0.98); head.add(r); });
      const br = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.008, 0.008), gm); br.position.set(0, 0.045, R0 * sz); head.add(br);
    }
    // волосы
    const cap = (scale = 1.06, thetaLen = Math.PI * 0.48, y = 0.0, m = hairM) => {
      const c = new THREE.Mesh(new THREE.SphereGeometry(R0 * scale, 10, 6, 0, Math.PI * 2, 0, thetaLen), m);
      c.scale.set(sx, sy, sz); c.position.y = y; c.rotation.x = -0.25; head.add(c); return c;
    };
    switch (P.hairStyle) {
      case 'short': cap(1.07, Math.PI * 0.42); break;
      case 'slick': cap(1.08, Math.PI * 0.45, 0.01); break;
      case 'mohawk': { const m = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.1, 0.3), hairM); m.position.set(0, R0 * sy + 0.01, -0.02); head.add(m); break; }
      case 'curly': for (let k = 0; k < 9; k++) { const a = k / 9 * Math.PI * 2; const s = new THREE.Mesh(new THREE.SphereGeometry(0.07, 5, 4), hairM); s.position.set(Math.cos(a) * 0.12 * sx, 0.1 * sy + Math.sin(k) * 0.02, Math.sin(a) * 0.1 - 0.02); head.add(s); } cap(1.08, Math.PI * 0.4); break;
      case 'cap': { const c = cap(1.1, Math.PI * 0.38, 0.01, cloth); c.rotation.x = -0.1; const brim = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.015, 0.14), cloth); brim.position.set(0, 0.1 * sy, R0 + 0.04); brim.rotation.x = 0.15; head.add(brim); break; }
      case 'thin': [-1, 1].forEach((s) => { const h = new THREE.Mesh(new THREE.SphereGeometry(0.06, 5, 4), hairM); h.scale.set(0.5, 1, 1.2); h.position.set(s * R0 * sx * 0.95, 0.03, -0.04); head.add(h); }); break;
      case 'bald': break;
      case 'bun': { cap(1.08, Math.PI * 0.5); const bn = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 5), hairM); bn.position.set(0, R0 * sy + 0.02, -0.08); head.add(bn); break; }
      case 'ponytail': { cap(1.08, Math.PI * 0.5); const pt = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.02, 0.28, 5), hairM); pt.position.set(0, -0.02, -0.2); pt.rotation.x = 0.4; head.add(pt); break; }
      case 'bob': { cap(1.1, Math.PI * 0.62); break; }
      case 'long': { cap(1.1, Math.PI * 0.55); const bk = new THREE.Mesh(new THREE.BoxGeometry(0.34 * sx, 0.42, 0.08), hairM); bk.position.set(0, -0.12, -0.12); head.add(bk); break; }
    }
    if (P.earring) [-1, 1].forEach((s) => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.015, 4, 3), this.mat(0xf2c94c)); e.position.set(s * R0 * sx, -0.05, 0); head.add(e); });

    return { g, head, faceMat, P, arms, legs, torso, mood: 'neutral', talkT: 0, blinkT: 2, state: 'idle', anim: null, shake: 0, hop: 0 };
  },

  setCustomer(P) {
    if (!this.ok) return Promise.resolve();
    if (this.customer) { this.scene.remove(this.customer.g); this.customer = null; }
    const c = this.buildPerson(P);
    this.customer = c;
    c.g.position.set(-2.6, 0, -1.9);
    c.g.rotation.y = Math.PI / 2;
    this.scene.add(c.g);
    return this.walk(c, [[-1.6, -1.4], [0, -0.05]], 0);
  },
  leave() {
    const c = this.customer;
    if (!this.ok || !c) return Promise.resolve();
    return this.walk(c, [[-1.2, -1.0], [-2.7, -1.9]], null).then(() => { this.scene.remove(c.g); if (this.customer === c) this.customer = null; });
  },
  walk(c, pts, endRot) {
    return new Promise((res) => { c.state = 'walk'; c.path = pts.slice(); c.endRot = endRot; c.onArrive = res; });
  },
  setMood(m) {
    const c = this.customer; if (!c || !this.ok) return;
    if (c.mood !== m) { c.mood = m; this.refreshFace(c); }
    if (m === 'angry') c.shake = 0.6;
    if (m === 'happy') c.hop = 0.5;
    if (m === 'shock') c.hop = 0.35;
  },
  refreshFace(c) {
    const old = c.faceMat.map;
    c.faceMat.map = this.faceTex(c.P, c.mood, c.mouthOpen, c.blinking);
    c.faceMat.needsUpdate = true;
    if (old) old.dispose();
  },
  talk(ms) { if (this.customer) this.customer.talkT = ms / 1000; },

  // ---------- предмет на прилавке ----------
  setItem(it) {
    if (!this.ok) return;
    if (this.itemMesh) { this.scene.remove(this.itemMesh); this.itemMesh = null; }
    if (!it) return;
    const mat = new THREE.MeshLambertMaterial({ transparent: true, alphaTest: 0.05, side: THREE.DoubleSide });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.34), mat);
    m.position.set(0, 1.6, 0.92);
    m.rotation.x = -Math.PI / 2 + 0.85;
    m.userData.it = it; m.userData.vy = 0;
    this.itemMesh = m;
    this.scene.add(m);
    itemCanvas(it, 0, { res: 128 }).then((cv) => {
      if (!cv || this.itemMesh !== m) return;
      const t = new THREE.CanvasTexture(cv);
      t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
      mat.map = t; mat.needsUpdate = true;
    });
  },
  refreshItem() { if (!this.itemMesh) return; const it = this.itemMesh.userData.it; this.setItem(it); this.itemMesh.position.y = 1.13; },

  pick(e) {
    if (!this.itemMesh || !this.onItemClick) return;
    const r = this.renderer.domElement.getBoundingClientRect();
    const v = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    const rc = new THREE.Raycaster(); rc.setFromCamera(v, this.cam);
    const hit = rc.intersectObject(this.itemMesh);
    // щедрая зона нажатия: попадание или клик в нижней трети рядом с предметом
    const p = this.itemMesh.position.clone().project(this.cam);
    const near = Math.abs(p.x - v.x) < 0.3 && Math.abs(p.y - v.y) < 0.22;
    if (hit.length || near) this.onItemClick(this.itemMesh.userData.it);
  },
  itemScreenPos() {
    if (!this.ok || !this.itemMesh) return null;
    const p = this.itemMesh.position.clone(); p.y = 1.13;
    p.project(this.cam);
    return { x: (p.x + 1) / 2, y: (1 - p.y) / 2 };
  },

  police(on) { this.policeOn = on; },
  titleMode(on) { this.mode = on ? 'title' : 'shop'; },

  // ---------- кадр ----------
  update(dt) {
    this.t += dt;
    const t = this.t;
    // камера
    if (this.mode === 'title') {
      const a = Math.sin(t * 0.15) * 0.5;
      this.cam.position.set(Math.sin(a) * 2.2, 1.7 + Math.sin(t * 0.3) * 0.05, 0.6 + Math.cos(a) * 1.6);
      this.cam.lookAt(0, 1.6, -2.2);
    } else {
      this.cam.position.set(Math.sin(t * 0.4) * 0.025, 1.78 + Math.sin(t * 0.7) * 0.012, 2.55);
      this.cam.lookAt(0, 1.48, 0);
    }
    // неон мерцает
    const fl = (Math.sin(t * 23) > 0.96 || (t % 7 > 6.85)) ? 0.35 : 1;
    this.neon.material.opacity = fl; this.glow.material.opacity = fl; this.neonL.intensity = 0.9 * fl;
    if (this.policeOn) {
      const ph = Math.floor(t * 4) % 2;
      this.neonL.color.setHex(ph ? 0xff2020 : 0x2040ff); this.neonL.intensity = 2.2;
      this.lamp.intensity = 0.6;
    } else { this.neonL.color.setHex(0xff3b7b); this.lamp.intensity = 1.35; }
    // ТВ
    this.tvAcc = (this.tvAcc || 0) + dt;
    if (this.tvAcc > 0.1) { this.tvAcc = 0; this.drawTV(); }
    // предмет падает на коврик
    const m = this.itemMesh;
    if (m && m.position.y > 1.13) {
      m.userData.vy -= 9 * dt; m.position.y += m.userData.vy * dt;
      if (m.position.y <= 1.13) { m.position.y = 1.13; if (m.userData.vy < -1) { m.userData.vy = -m.userData.vy * 0.25; m.position.y = 1.131; } else m.userData.vy = 0; }
    }
    const c = this.customer;
    if (!c) return;
    if (c.state === 'walk') {
      const tgt = c.path[0];
      const dx = tgt[0] - c.g.position.x, dz = tgt[1] - c.g.position.z;
      const d = Math.hypot(dx, dz);
      const sp = 1.9 * dt;
      const ang = Math.atan2(dx, dz);
      c.g.rotation.y += (ang - c.g.rotation.y) * Math.min(1, dt * 10);
      if (d <= sp) { c.g.position.x = tgt[0]; c.g.position.z = tgt[1]; c.path.shift(); }
      else { c.g.position.x += dx / d * sp; c.g.position.z += dz / d * sp; }
      c.walkPh = (c.walkPh || 0) + dt * 9;
      c.legs[0].rotation.x = Math.sin(c.walkPh) * 0.5; c.legs[1].rotation.x = -Math.sin(c.walkPh) * 0.5;
      c.arms.forEach((a, i) => { a.piv.rotation.x = (i ? -1 : 1) * Math.sin(c.walkPh) * 0.4; a.el.rotation.x = -0.3; });
      c.g.position.y = Math.abs(Math.sin(c.walkPh)) * 0.03;
      if (!c.path.length) {
        if (c.endRot == null) c.endRot = c.g.rotation.y;
        c.state = 'turn'; c.legs.forEach((l) => l.rotation.x = 0); c.g.position.y = 0;
      }
    } else if (c.state === 'turn') {
      c.g.rotation.y += (c.endRot - c.g.rotation.y) * Math.min(1, dt * 8);
      if (Math.abs(c.endRot - c.g.rotation.y) < 0.03) { c.g.rotation.y = c.endRot; c.state = 'idle'; const f = c.onArrive; c.onArrive = null; if (f) f(); }
    } else {
      // дыхание, руки на прилавке
      const br = Math.sin(t * 2.2) * 0.012;
      c.torso.scale.x = 1 + br; c.head.position.y = 1.78 + br * 0.8;
      c.arms.forEach((a) => { a.piv.rotation.x += (-0.35 - a.piv.rotation.x) * dt * 5; a.el.rotation.x += (-1.0 - a.el.rotation.x) * dt * 5; });
      if (c.mood === 'angry') c.arms.forEach((a) => { a.el.rotation.x = -1.2 + Math.sin(t * 12 + a.s) * 0.3; });
      if (c.mood === 'nervous') { c.head.rotation.y = Math.sin(t * 3.1) * 0.15; }
      else c.head.rotation.y += (Math.sin(t * 0.6) * 0.06 - c.head.rotation.y) * dt * 3;
      c.head.rotation.x = c.talkT > 0 ? Math.sin(t * 9) * 0.04 : 0.05;
    }
    if (c.shake > 0) { c.shake -= dt; c.g.position.x = Math.sin(t * 60) * 0.03 * (c.shake > 0 ? 1 : 0); }
    if (c.hop > 0) { c.hop -= dt; c.g.position.y = Math.max(0, Math.sin((0.5 - c.hop) * Math.PI * 2)) * 0.06; }
    // рот и моргание
    let dirty = false;
    if (c.talkT > 0) {
      c.talkT -= dt;
      const open = Math.floor(t * 9) % 2 === 0 && c.talkT > 0;
      if (open !== c.mouthOpen) { c.mouthOpen = open; dirty = true; }
    } else if (c.mouthOpen) { c.mouthOpen = false; dirty = true; }
    c.blinkT -= dt;
    if (c.blinkT < 0 && !c.blinking) { c.blinking = true; dirty = true; }
    if (c.blinkT < -0.12) { c.blinking = false; c.blinkT = R.f(2, 5); dirty = true; }
    if (dirty) this.refreshFace(c);
  },
};
