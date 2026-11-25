/* BASH — fake Y2K "desktop" windows playing live ASCII art (home hero).
   Each window can be dragged by its title bar, rolled up (_) or closed (×).
   Everything is drawn on <canvas> by hand: no library, no image.
   Mount point: <div class="ascii-layer" data-ascii-windows></div> inside #home (.sec-home).
   The windows pop in once the visitor has passed the START gate (BashSite "entered" event).
   Scenes: bloom (3D flower), eye (follows the pointer), stars (starfield + pulsing sphere). */
(function(){
  var layer = document.querySelector("[data-ascii-windows]");
  if (!layer || !window.HTMLCanvasElement) return;

  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var RAMP = " .'`^\",:;Il!i><~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$";
  var NOISE = "abcdefghijklmnopqrstuvwxyz{}[]()/\\|;:._=+-*0123456789";
  var MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, "Courier New", monospace';
  var HAS_FILTER = "filter" in CanvasRenderingContext2D.prototype;

  function clamp(v, a, b){ return v < a ? a : v > b ? b : v; }
  function mix(a, b, t){ return a + (b - a) * t; }
  function smooth(t){ t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }

  /* Global pointer (the eye looks at it). */
  var pointer = { x: -1, y: -1, moved: 0 };
  window.addEventListener("pointermove", function(e){
    pointer.x = e.clientX; pointer.y = e.clientY; pointer.moved = performance.now();
  }, { passive: true });

  /* ------------------------------------------------------------------ grid */
  function Grid(){ this.cols = 0; this.rows = 0; }
  Grid.prototype.resize = function(cols, rows){
    this.cols = cols; this.rows = rows;
    var n = cols * rows;
    this.ch = new Uint16Array(n); this.r = new Uint8Array(n); this.g = new Uint8Array(n); this.b = new Uint8Array(n);
    this.z = new Float32Array(n);
  };
  Grid.prototype.clear = function(){ this.ch.fill(32); this.z.fill(1e9); };
  Grid.prototype.put = function(i, code, r, g, b){
    this.ch[i] = code; this.r[i] = r; this.g[i] = g; this.b[i] = b;
  };
  /* luminance 0..1 → ramp character, colour scaled by brightness */
  Grid.prototype.shade = function(i, lum, r, g, b){
    lum = clamp(lum, 0, 1);
    var k = 0.3 + 0.8 * lum;
    this.put(i, RAMP.charCodeAt(Math.max(1, Math.round(lum * (RAMP.length - 1)))),
      Math.min(255, r * k), Math.min(255, g * k), Math.min(255, b * k));
  };

  /* --------------------------------------------------------- scene: bloom */
  /* A 3D flower: three layers of curved petals that open and close while it spins.
     Each petal is a parametric surface sampled densely, projected with a z-buffer. */
  function bloomScene(){
    var LAYERS = [
      { n: 6, len: 1.00, wid: 0.46, off: 0.00, closed: 1.30, open: 0.10, curl: -0.9, col: [255, 150, 205] },
      { n: 5, len: 0.80, wid: 0.40, off: 0.55, closed: 1.40, open: 0.55, curl: -0.6, col: [245, 95, 175] },
      { n: 4, len: 0.55, wid: 0.34, off: 0.20, closed: 1.50, open: 1.00, curl: -0.3, col: [220, 50, 140] }
    ];
    var NU = 44, NV = 28, CUP = 0.16;
    var cu = new Float32Array((NU + 1) * 9); // per-u basis: centre xyz, in-plane normal xyz, width, (pad)

    return function(grid, t, aspect){
      var cols = grid.cols, rows = grid.rows;
      var bloom = smooth(0.5 - 0.5 * Math.cos(t * 0.45)); // 0 = bud, 1 = wide open
      bloom = 0.15 + 0.85 * bloom;
      var ry = t * 0.55, rx = -0.62 + 0.12 * Math.sin(t * 0.37);
      var cy = Math.cos(ry), sy = Math.sin(ry), cx = Math.cos(rx), sx = Math.sin(rx);
      var K = rows * 0.5, KX = K / aspect, ox = cols / 2, oy = rows * 0.54;
      var LX = -0.45, LY = 0.75, LZ = -0.5, ll = Math.hypot(LX, LY, LZ); LX /= ll; LY /= ll; LZ /= ll;

      function plot(px, py, pz, nx, ny, nz, cr, cg, cb, back){
        // rotate around Y then X, push away from the camera
        var x1 = px * cy + pz * sy, z1 = -px * sy + pz * cy;
        var y2 = py * cx - z1 * sx, z2 = py * sx + z1 * cx + 3.1;
        var f = 3.5 / z2;
        var col = Math.round(ox + x1 * f * KX), row = Math.round(oy - (y2 - 0.25) * f * K);
        if (col < 0 || row < 0 || col >= cols || row >= rows) return;
        var i = row * cols + col;
        if (z2 >= grid.z[i]) return;
        grid.z[i] = z2;
        var nx1 = nx * cy + nz * sy, nz1 = -nx * sy + nz * cy;
        var ny2 = ny * cx - nz1 * sx, nz2 = ny * sx + nz1 * cx;
        var nl = Math.hypot(nx1, ny2, nz2) || 1;
        var d = (nx1 * LX + ny2 * LY + nz2 * LZ) / nl;
        var facing = nz2 / nl; // < 0: surface faces the camera
        var lum = 0.18 + 0.72 * Math.abs(d) + 0.25 * Math.pow(Math.max(0, -facing), 6);
        if (back && facing > 0) lum *= 0.62;
        grid.shade(i, lum, cr, cg, cb);
      }

      for (var L = 0; L < LAYERS.length; L++) {
        var ly = LAYERS[L];
        var th0 = mix(ly.closed, ly.open, bloom);
        var kap = ly.curl * (0.35 + 0.65 * bloom);
        for (var p = 0; p < ly.n; p++) {
          var phi = (p / ly.n) * Math.PI * 2 + ly.off + 0.05 * Math.sin(t + p);
          var rdx = Math.cos(phi), rdz = Math.sin(phi), tx = -rdz, tz = rdx;
          for (var a = 0; a <= NU; a++) {
            var u = a / NU, s = u * ly.len, th = th0 + kap * s, R, H;
            if (Math.abs(kap) < 1e-4) { R = s * Math.cos(th0); H = s * Math.sin(th0); }
            else { R = (Math.sin(th) - Math.sin(th0)) / kap; H = (Math.cos(th0) - Math.cos(th)) / kap; }
            R += 0.07;
            var nr = -Math.sin(th), nh = Math.cos(th);
            var o = a * 9;
            cu[o] = rdx * R; cu[o + 1] = H; cu[o + 2] = rdz * R;
            cu[o + 3] = rdx * nr; cu[o + 4] = nh; cu[o + 5] = rdz * nr;
            cu[o + 6] = ly.wid * Math.pow(Math.sin(Math.PI * Math.pow(u, 0.72)), 0.8);
          }
          for (var a2 = 0; a2 < NU; a2++) {
            var o0 = a2 * 9, o1 = o0 + 9, uu = a2 / NU;
            var cr = mix(ly.col[0], 255, uu * 0.35), cg = mix(ly.col[1], 215, uu * 0.35), cb = mix(ly.col[2], 235, uu * 0.35);
            for (var b = 0; b <= NV; b++) {
              var v = b / NV * 2 - 1, cup = CUP * v * v, w0 = cu[o0 + 6] * v, w1 = cu[o1 + 6] * v;
              var px = cu[o0] + cu[o0 + 3] * cup + tx * w0, py = cu[o0 + 1] + cu[o0 + 4] * cup, pz = cu[o0 + 2] + cu[o0 + 5] * cup + tz * w0;
              var qx = cu[o1] + cu[o1 + 3] * cup + tx * w1 - px, qy = cu[o1 + 1] + cu[o1 + 4] * cup - py, qz = cu[o1 + 2] + cu[o1 + 5] * cup + tz * w1 - pz;
              var vx = tx * cu[o0 + 6] + cu[o0 + 3] * 2 * CUP * v, vy = cu[o0 + 4] * 2 * CUP * v, vz = tz * cu[o0 + 6] + cu[o0 + 5] * 2 * CUP * v;
              plot(px, py, pz, qy * vz - qz * vy, qz * vx - qx * vz, qx * vy - qy * vx, cr, cg, cb, true);
            }
          }
        }
      }
      // golden heart of the flower
      for (var i2 = 0; i2 < 420; i2++) {
        var gu = (i2 * 0.618034) % 1, gv = i2 / 420;
        var ga = gu * Math.PI * 2, gb = Math.acos(1 - 2 * gv);
        var nx = Math.sin(gb) * Math.cos(ga), ny = Math.cos(gb), nz = Math.sin(gb) * Math.sin(ga);
        plot(nx * 0.11, 0.05 + ny * 0.07, nz * 0.11, nx, ny, nz, 255, 205, 90, false);
      }
    };
  }

  /* ----------------------------------------------------------- scene: eye */
  /* An almond eye surrounded by flickering letters. It blinks and follows the pointer. */
  function eyeScene(win){
    var gx = 0, gy = 0, tgx = 0, tgy = 0, nextSacc = 0, nextBlink = 2.5, noise = null, noiseN = 0;
    return function(grid, t, aspect){
      var cols = grid.cols, rows = grid.rows, n = cols * rows;
      if (noiseN !== n) {
        noise = new Uint16Array(n); noiseN = n;
        for (var k = 0; k < n; k++) noise[k] = NOISE.charCodeAt((Math.random() * NOISE.length) | 0);
      }
      for (var k2 = 0; k2 < n * 0.04; k2++) noise[(Math.random() * n) | 0] = NOISE.charCodeAt((Math.random() * NOISE.length) | 0);

      // gaze: the pointer if it moved recently, otherwise small random saccades
      var rect = win.getBoundingClientRect();
      if (pointer.moved && performance.now() - pointer.moved < 4000) {
        tgx = clamp((pointer.x - (rect.left + rect.width / 2)) / (window.innerWidth * 0.35), -1, 1);
        tgy = clamp((pointer.y - (rect.top + rect.height / 2)) / (window.innerHeight * 0.35), -1, 1);
      } else if (t > nextSacc) {
        tgx = Math.random() * 1.6 - 0.8; tgy = Math.random() * 0.8 - 0.4; nextSacc = t + 1.2 + Math.random() * 2;
      }
      gx += (tgx - gx) * 0.18; gy += (tgy - gy) * 0.18;

      // blink
      if (t > nextBlink + 0.32) nextBlink = t + 2.2 + Math.random() * 3.5;
      var bt = t - nextBlink, open = bt > 0 && bt < 0.32 ? Math.abs(bt / 0.16 - 1) : 1;
      open = smooth(open);

      var halfW = cols * aspect / rows; // horizontal extent in vertical units (±)
      var W = Math.min(2.1, halfW * 0.92), Hm = 0.8 * open;
      var IR = 0.6, PR = 0.2 + 0.035 * Math.sin(t * 0.9) + 0.02 * Math.sin(t * 2.3);
      var ix = gx * W * 0.36, iy = gy * 0.16;
      for (var row = 0; row < rows; row++) {
        var y = (row + 0.5 - rows / 2) / (rows / 2);
        for (var col = 0; col < cols; col++) {
          var i = row * cols + col;
          var x = (col + 0.5 - cols / 2) / (rows / 2) * aspect;
          var xw = x / W, h = xw * xw < 1 ? Hm * (1 - xw * xw) * (1 + 0.12 * xw) : -1;
          var ay = Math.abs(y + 0.02 * xw);
          if (ay < h) {
            var dx = x - ix, dy = y - iy, d = Math.hypot(dx, dy);
            var lidShade = smooth((h - ay) / 0.22); // darker under the lids
            if (d < PR) {
              var hx = dx + PR * 0.42, hy = dy + PR * 0.42;
              if (Math.hypot(hx, hy * 1.2) < 0.085) grid.put(i, 64, 255, 250, 255);
              else if ((i + row) % 3 === 0) grid.put(i, 46, 70, 40, 60);
            } else if (d < IR) {
              var q = (d - PR) / (IR - PR), ang = Math.atan2(dy, dx);
              var fib = 0.5 + 0.5 * Math.sin(ang * 23 + 3 * Math.sin(ang * 7 + t * 0.2) + d * 9);
              var lum = (0.42 + 0.5 * fib) * (q > 0.86 ? 0.45 : 1) * (1.05 - 0.35 * q) * (0.55 + 0.45 * lidShade);
              grid.shade(i, lum, mix(255, 235, q), mix(205, 105, q), mix(80, 25, q));
            } else {
              var sl = (0.52 - 0.3 * xw * xw) * (0.35 + 0.65 * lidShade);
              grid.shade(i, sl, 236, 226, 244);
            }
          } else if (h > 0 && ay < h + 0.07) {
            grid.put(i, y < 0 ? 61 : 45, 230, 200, 255); // lash line
          } else {
            var vig = Math.max(0, 1 - Math.hypot(x / (W * 1.25), y / 1.05));
            var wave = 0.5 + 0.5 * Math.sin(y * 7 - t * 2.2);
            var bl = 0.1 + 0.45 * vig + 0.08 * wave;
            var c = Math.round(55 + 120 * bl);
            grid.put(i, noise[i], c * 0.95, c * 0.88, c);
          }
        }
      }
    };
  }

  /* --------------------------------------------------------- scene: stars */
  /* Twinkling cross-shaped stars drifting past a pulsing, banded pink sphere. */
  function starsScene(){
    var stars = [], forN = 0;
    function seed(cols, rows){
      stars = [];
      var count = Math.round(cols * rows / 38);
      for (var k = 0; k < count; k++) stars.push({
        x: Math.random() * cols, y: Math.random() * rows,
        ph: Math.random() * 6.28, sp: 0.8 + Math.random() * 2.4,
        big: Math.random() < 0.22, v: 0.4 + Math.random() * 1.4
      });
    }
    var lastT = 0;
    return function(grid, t, aspect){
      var cols = grid.cols, rows = grid.rows;
      if (forN !== cols * rows) { forN = cols * rows; seed(cols, rows); }
      var dt = Math.min(0.1, Math.max(0, t - lastT)); lastT = t;

      function star(c, r, code, lum){
        if (c < 0 || r < 0 || c >= cols || r >= rows) return;
        var v = Math.round(255 * lum);
        grid.put(r * cols + c, code, v * 0.92, v * 0.9, v);
      }
      for (var s = 0; s < stars.length; s++) {
        var st = stars[s];
        st.x -= st.v * dt; if (st.x < -2) { st.x = cols + 2; st.y = Math.random() * rows; }
        var b = 0.5 + 0.5 * Math.sin(t * st.sp + st.ph), c = Math.round(st.x), r = Math.round(st.y);
        if (st.big && b > 0.55) {
          star(c, r, 43, 1);
          star(c - 1, r, 45, b * 0.85); star(c + 1, r, 45, b * 0.85);
          star(c, r - 1, 124, b * 0.7); star(c, r + 1, 124, b * 0.7);
          if (b > 0.85) { star(c - 2, r, 45, b * 0.45); star(c + 2, r, 45, b * 0.45); }
        } else {
          star(c, r, b > 0.75 ? 42 : 46, 0.35 + 0.6 * b);
        }
      }

      // heartbeat-ish pulse: two quick beats then rest
      var ph = (t * 0.9) % 1;
      var beat = Math.exp(-Math.pow((ph - 0.1) / 0.05, 2)) + 0.6 * Math.exp(-Math.pow((ph - 0.3) / 0.05, 2));
      var R = 0.66 * (1 + 0.08 * beat);
      var LX = -0.5, LY = 0.55, LZ = 0.67;
      var spin = t * 0.7;
      for (var row = 0; row < rows; row++) {
        var y = (row + 0.5 - rows / 2) / (rows / 2);
        for (var col = 0; col < cols; col++) {
          var x = (col + 0.5 - cols / 2) / (rows / 2) * aspect;
          var d = Math.hypot(x, y) / R, i = row * cols + col;
          if (d < 1) {
            var nx = x / R, ny = -y / R, nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
            var lat = Math.asin(ny), lon = Math.atan2(nx, nz) + spin;
            var band = 0.5 + 0.5 * Math.sin(lat * 15 + Math.sin(lon * 2) * 0.8);
            var diff = Math.max(0, nx * LX + ny * LY + nz * LZ);
            var spec = Math.pow(diff, 18);
            var lum = 0.1 + 0.75 * diff * (0.6 + 0.4 * band) + 0.5 * spec + 0.25 * beat * diff;
            grid.shade(i, lum, mix(235, 255, spec), mix(55, 210, spec), mix(120, 235, spec));
          } else if (d < 1.4) {
            var g = (1.4 - d) / 0.4 * (0.6 + 0.4 * beat);
            if (Math.random() < g * 0.8) grid.put(i, g > 0.55 ? 58 : 46, 255 * g, 90 * g, 160 * g);
          }
        }
      }
    };
  }

  /* ------------------------------------------------------- window chrome */
  var SCENES = {
    bloom: { title: "bloom.exe", icon: "✿", make: bloomScene, fs: 10 },
    eye:   { title: "eye.exe",   icon: "◉", make: eyeScene,   fs: 9 },
    stars: { title: "stars.exe", icon: "✦", make: starsScene, fs: 10 }
  };
  var ORDER = ["bloom", "stars", "eye"];
  var zTop = 1;
  var wins = [];

  function focusWin(w){
    w.el.style.zIndex = ++zTop;
    wins.forEach(function(o){ o.el.classList.toggle("is-active", o === w); });
  }

  function build(key, idx){
    var cfg = SCENES[key];
    var el = document.createElement("section");
    el.className = "awin awin--" + key;
    el.setAttribute("aria-label", cfg.title + " (ASCII animation)");
    el.style.setProperty("--open-i", idx);
    el.innerHTML =
      '<div class="awin-bar">' +
        '<span class="awin-icon" aria-hidden="true"></span><span class="awin-title"></span>' +
        '<span class="awin-btns">' +
          '<button type="button" class="awin-btn awin-min"><span aria-hidden="true">_</span></button>' +
          '<button type="button" class="awin-btn awin-close"><span aria-hidden="true">×</span></button>' +
        '</span>' +
      '</div>' +
      '<div class="awin-body"><canvas aria-hidden="true"></canvas></div>' +
      '<div class="awin-status" aria-hidden="true"><span>C:\\BASH\\' + cfg.title + '</span><span class="awin-fps">--</span></div>';
    el.querySelector(".awin-icon").textContent = cfg.icon;
    el.querySelector(".awin-title").textContent = cfg.title;
    el.querySelector(".awin-min").setAttribute("aria-label", "Minimize " + cfg.title);
    el.querySelector(".awin-close").setAttribute("aria-label", "Close " + cfg.title);
    layer.appendChild(el);

    var canvas = el.querySelector("canvas");
    var w = {
      key: key, el: el, canvas: canvas, ctx: canvas.getContext("2d", { alpha: false }),
      grid: new Grid(), fs: cfg.fs, cw: 6, chh: 10, padX: 0, padY: 0,
      visible: true, closed: false, rolled: false, last: 0, t0: performance.now() + Math.random() * 4000,
      fpsEl: el.querySelector(".awin-fps"), frames: 0, fpsT: 0, colorCache: {}
    };
    w.render = cfg.make(el);
    wins.push(w);

    // drag by the title bar (mouse, pen or touch)
    var bar = el.querySelector(".awin-bar"), drag = null;
    bar.addEventListener("pointerdown", function(e){
      if (e.button !== 0 || e.target.closest("button")) return;
      focusWin(w);
      var lr = layer.getBoundingClientRect(), r = el.getBoundingClientRect();
      drag = { id: e.pointerId, dx: e.clientX - r.left, dy: e.clientY - r.top, lr: lr };
      bar.setPointerCapture(e.pointerId);
      el.classList.add("is-dragging");
      e.preventDefault();
    });
    bar.addEventListener("pointermove", function(e){
      if (!drag || e.pointerId !== drag.id) return;
      place(w, e.clientX - drag.lr.left - drag.dx, e.clientY - drag.lr.top - drag.dy);
    });
    function endDrag(e){
      if (!drag || e.pointerId !== drag.id) return;
      drag = null; el.classList.remove("is-dragging");
    }
    bar.addEventListener("pointerup", endDrag);
    bar.addEventListener("pointercancel", endDrag);
    el.addEventListener("pointerdown", function(){ focusWin(w); });

    function toggleRoll(){
      w.rolled = !w.rolled;
      el.classList.toggle("is-rolled", w.rolled);
      el.querySelector(".awin-min").setAttribute("aria-label", (w.rolled ? "Restore " : "Minimize ") + cfg.title);
    }
    el.querySelector(".awin-min").addEventListener("click", toggleRoll);
    bar.addEventListener("dblclick", function(e){ if (!e.target.closest("button")) toggleRoll(); });
    el.querySelector(".awin-close").addEventListener("click", function(){
      w.closed = true;
      el.classList.add("is-closing");
      setTimeout(function(){ el.hidden = true; }, reduced ? 0 : 220);
    });
    return w;
  }

  /* Keep at least the title bar grabbable inside the hero. */
  function place(w, x, y){
    var lw = layer.clientWidth, lh = layer.clientHeight, ew = w.el.offsetWidth;
    x = clamp(x, 60 - ew, lw - 60);
    y = clamp(y, 0, lh - 34);
    w.el.style.left = x + "px"; w.el.style.top = y + "px";
    w.el.style.right = "auto"; w.el.style.bottom = "auto";
    w.placed = true;
  }
  window.addEventListener("resize", function(){
    wins.forEach(function(w){ if (w.placed) place(w, w.el.offsetLeft, w.el.offsetTop); });
  });

  function fit(w){
    var cw = w.canvas.clientWidth, ch = w.canvas.clientHeight;
    if (!cw || !ch) return false;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (w.cssW === cw && w.cssH === ch && w.dpr === dpr) return true;
    w.cssW = cw; w.cssH = ch; w.dpr = dpr;
    w.canvas.width = Math.round(cw * dpr); w.canvas.height = Math.round(ch * dpr);
    var ctx = w.ctx;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.font = "600 " + w.fs + "px " + MONO;
    w.cw = ctx.measureText("M").width; w.chh = w.fs * 1.02;
    var cols = Math.floor(cw / w.cw), rows = Math.floor(ch / w.chh);
    w.padX = (cw - cols * w.cw) / 2; w.padY = (ch - rows * w.chh) / 2;
    w.grid.resize(cols, rows);
    return true;
  }

  function color(w, r, g, b){
    var key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
    var c = w.colorCache[key];
    if (!c) c = w.colorCache[key] = "rgb(" + ((r >> 3) << 3) + "," + ((g >> 3) << 3) + "," + ((b >> 3) << 3) + ")";
    return c;
  }

  function draw(w, now){
    if (!fit(w)) return;
    var g = w.grid, ctx = w.ctx, t = (now - w.t0) / 1000;
    g.clear();
    w.render(g, t, w.cw / w.chh);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1; ctx.filter = "none";
    ctx.setTransform(w.dpr, 0, 0, w.dpr, 0, 0);
    ctx.fillStyle = "#06040a";
    ctx.fillRect(0, 0, w.cssW, w.cssH);
    ctx.font = "600 " + w.fs + "px " + MONO;
    ctx.textBaseline = "top";
    var cols = g.cols, n = cols * g.rows, last = "";
    for (var i = 0; i < n; i++) {
      var code = g.ch[i];
      if (code === 32) continue;
      var st = color(w, g.r[i], g.g[i], g.b[i]);
      if (st !== last) { ctx.fillStyle = st; last = st; }
      ctx.fillText(String.fromCharCode(code), w.padX + (i % cols) * w.cw, w.padY + ((i / cols) | 0) * w.chh);
    }
    if (HAS_FILTER) { // soft glow: a blurred copy of itself added on top
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.5;
      ctx.filter = "blur(" + (3 * w.dpr) + "px)";
      ctx.drawImage(w.canvas, 0, 0);
    }
  }

  /* -------------------------------------------------------------- start */
  var small = window.matchMedia("(max-width: 720px)").matches;
  var FRAME = 1000 / (small ? 24 : 30);
  var html = document.documentElement;
  ORDER.forEach(function(key, i){ build(key, i); });
  focusWin(wins[0]);

  function start(){
    layer.classList.add("is-on");
    if (reduced) requestAnimationFrame(still); else requestAnimationFrame(loop);
  }

  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(en){
        wins.forEach(function(w){ if (w.el === en.target) w.visible = en.isIntersecting; });
      });
    });
    wins.forEach(function(w){ io.observe(w.el); });
  }

  function still(){ // reduced motion: one frame each, no animation loop
    wins.forEach(function(w){ w.t0 = performance.now() - 6000; draw(w, performance.now()); w.fpsEl.textContent = "paused"; });
  }
  if (reduced) window.addEventListener("resize", function(){ if (layer.classList.contains("is-on")) still(); });

  function loop(now){
    requestAnimationFrame(loop);
    if (document.hidden) return;
    var menuOpen = html.classList.contains("menu-open");
    for (var k = 0; k < wins.length; k++) {
      var w = wins[k];
      if (w.closed || w.rolled || !w.visible || menuOpen || now - w.last < FRAME) continue;
      w.last = now - ((now - w.last) % FRAME);
      draw(w, now);
      w.frames++;
      if (now - w.fpsT > 1000) {
        w.fpsEl.textContent = Math.round(w.frames * 1000 / (now - w.fpsT)) + " fps";
        w.frames = 0; w.fpsT = now;
      }
    }
  }

  if (window.BashSite && typeof window.BashSite.on === "function") window.BashSite.on("entered", start);
  else start();
})();
