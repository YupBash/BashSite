/* BASH — design v3: the home page orchestration (window.BashHome).
   Starts the chrome sculpture once the visitor has "entered", feeds it the pointer, and runs the hero details:
   wordmark specular, the character easter egg and the magnetic buttons. */
(function () {
  "use strict";

  var site = window.BashSite || { reduced: false, fine: false, on: function () {} };
  var home = { chrome: null, section: function () { return "home"; }, position: function () { return { from: "home", to: "home", t: 0 }; } };
  window.BashHome = home;

  /* ---------- chrome sculpture ---------- */
  function initChrome() {
    var canvas = document.getElementById("chrome");
    if (!canvas || !window.BashChrome || home.chrome) return;
    home.chrome = window.BashChrome.init(canvas, { mobile: !site.fine || window.innerWidth < 760 });
    if (home.chrome) home.chrome.setState("home");
    journey.sync(true);
  }

  /* ---------- Socials: one chrome bubble above each button, in order Discord, TikTok, Instagram ---------- */
  function socialTargets() {
    var btns = Array.prototype.slice.call(document.querySelectorAll(".social-big"), 0, 3);
    var orbs = document.querySelector(".socials-orbs");
    if (btns.length < 3 || !orbs) return [];
    var o = orbs.getBoundingClientRect(), y = o.top + o.height / 2;
    var rects = btns.map(function (b) { return b.getBoundingClientRect(); });
    var row = Math.abs(rects[0].top - rects[2].top) < 8;
    return rects.map(function (r, i) {
      return { x: row ? r.left + r.width / 2 : o.left + o.width * [.18, .5, .82][i], y: y };
    });
  }
  home.socialTargets = socialTargets;

  /* ---------- scroll journey: section indicator, chrome states and the evolving backdrop ---------- */
  var journey = (function () {
    var html = document.documentElement;
    if (!(window.gsap && window.ScrollTrigger)) html.classList.add("no-gsap");
    var IDS = ["home", "videos", "about", "socials", "gamble", "outro"];
    var NAMES = ["HOME", "VIDEOS", "ABOUT", "SOCIALS", "GAMBLE", "GAMBLE"];
    var nodes = IDS.map(function (id) { return document.getElementById(id); });
    var none = { sync: function () {} };
    if (nodes.some(function (n) { return !n; })) return none;
    var backdrop = document.querySelector(".backdrop"), hero = nodes[0];

    /* Backdrop moods (spec §5 "Fond évolutif"): haze x/y/w/h %, colours c0-c2, second glow, horizon, swoosh lines. */
    function mood(x, y, w, h, c0, c1, c2, gx, gy, gw, gh, gc, ga, hzY, hzA, swA) {
      return { x: x, y: y, w: w, h: h, c0: c0, c1: c1, c2: c2, gx: gx, gy: gy, gw: gw, gh: gh, gc: gc, ga: ga, hzY: hzY, hzA: hzA, swA: swA };
    }
    var MOODS = [
      mood(66, 40, 55, 65, [43, 20, 82], [20, 10, 41], [7, 5, 12], 50, 100, 40, 35, [107, 33, 168], 0, 71, .9, 1),
      mood(50, 30, 70, 60, [27, 26, 92], [12, 10, 38], [5, 5, 14], 50, 78, 60, 30, [127, 156, 214], .18, 62, 1, .8),
      mood(50, 18, 60, 45, [36, 22, 66], [14, 9, 28], [6, 5, 11], 50, 100, 40, 35, [107, 33, 168], 0, 88, .35, .45),
      mood(50, 55, 75, 60, [52, 22, 96], [18, 9, 40], [7, 5, 12], 50, 60, 70, 40, [88, 101, 242], .14, 74, .8, .9),
      mood(64, 52, 60, 70, [74, 16, 72], [26, 8, 30], [8, 4, 10], 50, 105, 70, 40, [228, 174, 57], .16, 80, .6, .7),
      mood(50, 100, 50, 40, [30, 14, 56], [10, 6, 20], [5, 4, 8], 50, 100, 40, 35, [107, 33, 168], 0, 96, .25, .3)
    ];

    var tops = [], heights = [], vh = window.innerHeight || 1;
    function measure() {
      vh = window.innerHeight || 1;
      nodes.forEach(function (n, i) {
        var r = n.getBoundingClientRect();
        tops[i] = r.top + window.scrollY;
        heights[i] = Math.max(1, r.height);
      });
    }
    function ease(t) { return t * t * (3 - 2 * t); }
    /* Where the middle of the screen is: inside one section, or in the hand-over zone between two
       (from 60 % of section i to 20 % of section i + 1). */
    function locate(y) {
      var c = y + vh / 2;
      for (var j = 0; j < nodes.length - 1; j++) {
        var s = tops[j] + .6 * heights[j], e = tops[j + 1] + .2 * heights[j + 1];
        if (c >= s && c <= e) return { from: j, to: j + 1, t: (c - s) / Math.max(1, e - s), c: c };
      }
      var idx = 0;
      for (var k = 0; k < nodes.length; k++) if (c >= tops[k]) idx = k;
      return { from: idx, to: idx, t: 0, c: c };
    }

    var current = -1, smoothY = window.scrollY, raf = 0, last = 0, lastPos = { from: "home", to: "home", t: 0 };
    function lerp(a, b, t) { return a + (b - a) * t; }
    function rgb(a, b, t) { return [0, 1, 2].map(function (i) { return Math.round(lerp(a[i], b[i], t)); }).join(" "); }
    function paintBackdrop(p) {
      if (!backdrop) return;
      var A = MOODS[p.from], B = MOODS[p.to], t = ease(p.t), st = backdrop.style;
      st.setProperty("--bd-x", lerp(A.x, B.x, t).toFixed(2) + "%");
      st.setProperty("--bd-y", lerp(A.y, B.y, t).toFixed(2) + "%");
      st.setProperty("--bd-w", lerp(A.w, B.w, t).toFixed(2) + "%");
      st.setProperty("--bd-h", lerp(A.h, B.h, t).toFixed(2) + "%");
      st.setProperty("--bd-c0", rgb(A.c0, B.c0, t));
      st.setProperty("--bd-c1", rgb(A.c1, B.c1, t));
      st.setProperty("--bd-c2", rgb(A.c2, B.c2, t));
      st.setProperty("--bd-g2x", lerp(A.gx, B.gx, t).toFixed(2) + "%");
      st.setProperty("--bd-g2y", lerp(A.gy, B.gy, t).toFixed(2) + "%");
      st.setProperty("--bd-g2w", lerp(A.gw, B.gw, t).toFixed(2) + "%");
      st.setProperty("--bd-g2h", lerp(A.gh, B.gh, t).toFixed(2) + "%");
      st.setProperty("--bd-g2c", rgb(A.gc, B.gc, t));
      st.setProperty("--bd-g2a", lerp(A.ga, B.ga, t).toFixed(3));
      st.setProperty("--bd-hz-y", lerp(A.hzY, B.hzY, t).toFixed(2) + "%");
      st.setProperty("--bd-hz-a", lerp(A.hzA, B.hzA, t).toFixed(3));
      st.setProperty("--bd-sw-a", lerp(A.swA, B.swA, t).toFixed(3));
    }
    function applySmooth() {
      var p = locate(smoothY);
      lastPos = { from: IDS[p.from], to: IDS[p.to], t: ease(p.t) };
      if (home.chrome) {
        home.chrome.setTargets(socialTargets());
        if (p.from === p.to || p.t <= 0) home.chrome.setState(IDS[p.from]);
        else home.chrome.blend(IDS[p.from], IDS[p.to], ease(p.t));
      }
      paintBackdrop(p);
      if (hero) hero.style.setProperty("--hp", site.reduced ? "0" : Math.min(1, Math.max(0, smoothY / (vh * .9))).toFixed(4));
    }
    function applyIndicator() {
      var p = locate(window.scrollY), d = p.t < .5 ? p.from : p.to;
      var progress = Math.min(1, Math.max(0, (p.c - tops[d]) / heights[d]));
      if (d === nodes.length - 1) progress = 1;
      if (site.hud) site.hud.setSection(Math.min(d + 1, 5), NAMES[d], progress);
      if (d !== current) {
        if (current !== -1 && window.BashAudio && window.BashAudio.play) window.BashAudio.play("whoosh");
        current = d;
        html.dataset.section = IDS[d];
      }
    }
    function frame(now) {
      raf = 0;
      var target = window.scrollY, dt = last ? Math.min(100, now - last) : 16;
      last = now;
      smoothY = site.reduced ? target : smoothY + (target - smoothY) * (1 - Math.exp(-dt / 110));
      if (Math.abs(target - smoothY) < .5) smoothY = target;
      applySmooth();
      if (smoothY !== target) raf = requestAnimationFrame(frame);
      else last = 0;
    }
    function onScroll() {
      applyIndicator();
      if (!raf) raf = requestAnimationFrame(frame);
    }
    function sync(jump) {
      measure();
      if (jump) smoothY = window.scrollY;
      applyIndicator();
      applySmooth();
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", function () { sync(false); onScroll(); });
    window.addEventListener("load", function () { sync(false); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { sync(false); });
    sync(true);
    home.position = function () { return lastPos; };
    return { sync: sync };
  })();
  home.section = function () { return document.documentElement.dataset.section || "home"; };

  var fpsEl = document.getElementById("hudFps");
  setInterval(function () {
    if (!fpsEl || !home.chrome) return;
    var fps = home.chrome.stats().fps;
    fpsEl.textContent = fps ? String(fps) : "--";
  }, 500);

  /* ---------- pointer: chrome arm + wordmark specular ---------- */
  var word = document.getElementById("word");
  if (site.fine) {
    window.addEventListener("pointermove", function (e) {
      if (e.pointerType && e.pointerType !== "mouse" && e.pointerType !== "pen") return;
      if (home.chrome) home.chrome.setPointer(e.clientX / (window.innerWidth || 1), e.clientY / (window.innerHeight || 1));
      if (word) {
        var r = word.getBoundingClientRect();
        if (r.width && r.height) {
          word.style.setProperty("--mx", ((e.clientX - r.left) / r.width * 100).toFixed(1) + "%");
          word.style.setProperty("--my", ((e.clientY - r.top) / r.height * 100).toFixed(1) + "%");
        }
      }
    }, { passive: true });
  }

  /* ---------- character easter egg: 5 quick clicks on the drawing itself ---------- */
  (function () {
    var box = document.querySelector(".character");
    var img = box && box.querySelector("img");
    if (!img) return;
    var messages = ["Stop that.", "Bro, stop.", "Alright, Don't do that.", "Hey!"];
    var clicks = [], busy = false, ctx = null, sw = 0, sh = 0;

    function buildSampler() {
      if (!img.naturalWidth) return;
      try {
        var c = document.createElement("canvas");
        sw = c.width = img.naturalWidth; sh = c.height = img.naturalHeight;
        ctx = c.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(img, 0, 0);
      } catch (err) { ctx = null; }
    }
    if (img.complete && img.naturalWidth) buildSampler();
    else img.addEventListener("load", buildSampler, { once: true });

    function onDrawing(x, y) {
      var r = img.getBoundingClientRect();
      var fx = (x - r.left) / r.width, fy = (y - r.top) / r.height;
      if (fx < 0 || fx > 1 || fy < 0 || fy > 1) return false;
      if (!ctx) return true;
      try {
        var px = Math.min(sw - 1, Math.floor(fx * sw)), py = Math.min(sh - 1, Math.floor(fy * sh));
        return ctx.getImageData(px, py, 1, 1).data[3] > 10;
      } catch (err) { return true; }
    }

    box.addEventListener("click", function (e) {
      if (!onDrawing(e.clientX, e.clientY)) return;
      var now = Date.now();
      clicks.push(now);
      clicks = clicks.filter(function (t) { return now - t < 2500; });
      if (clicks.length < 5 || busy) return;
      busy = true; clicks = [];
      if (!site.reduced) {
        box.classList.add("poke");
        setTimeout(function () { box.classList.remove("poke"); }, 600);
      }
      var bubble = document.createElement("div");
      bubble.className = "character-bubble";
      bubble.textContent = messages[Math.floor(Math.random() * messages.length)];
      box.appendChild(bubble);
      requestAnimationFrame(function () { bubble.classList.add("show"); });
      setTimeout(function () {
        bubble.classList.remove("show");
        setTimeout(function () { bubble.remove(); busy = false; }, 300);
      }, 1600);
    });
  })();

  /* ---------- magnetic buttons: lean up to 6 px toward a pointer closer than 80 px ---------- */
  (function () {
    if (!site.fine || site.reduced) return;
    var items = Array.prototype.map.call(document.querySelectorAll("[data-magnet]"), function (el) {
      return { el: el, x: 0, y: 0 };
    });
    if (!items.length) return;
    var px = -1e4, py = -1e4, raf = 0;
    function frame() {
      raf = 0;
      var moving = false;
      items.forEach(function (it) {
        var r = it.el.getBoundingClientRect();
        var left = r.left - it.x, top = r.top - it.y;
        var dx = Math.max(left - px, 0, px - (left + r.width));
        var dy = Math.max(top - py, 0, py - (top + r.height));
        var dist = Math.sqrt(dx * dx + dy * dy), tx = 0, ty = 0;
        if (dist < 80) {
          var s = 1 - dist / 80;
          var vx = px - (left + r.width / 2), vy = py - (top + r.height / 2), len = Math.sqrt(vx * vx + vy * vy) || 1;
          tx = vx / len * 6 * s; ty = vy / len * 6 * s;
        }
        it.x += (tx - it.x) * .2; it.y += (ty - it.y) * .2;
        if (Math.abs(tx - it.x) > .05 || Math.abs(ty - it.y) > .05) moving = true;
        it.el.style.transform = Math.abs(it.x) < .05 && Math.abs(it.y) < .05 ? "" :
          "translate3d(" + it.x.toFixed(2) + "px," + it.y.toFixed(2) + "px,0)";
      });
      if (moving) raf = requestAnimationFrame(frame);
    }
    window.addEventListener("pointermove", function (e) {
      if (e.pointerType && e.pointerType !== "mouse" && e.pointerType !== "pen") return;
      px = e.clientX; py = e.clientY;
      if (!raf) raf = requestAnimationFrame(frame);
    }, { passive: true });
  })();

  site.on("entered", initChrome);
})();
