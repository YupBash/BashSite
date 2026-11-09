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
  /* Boot intro (site.js): the chrome sculpture drops in, k from 0 to 1. */
  home.introChrome = function (k) {
    initChrome();
    if (home.chrome) home.chrome.setIntro(k);
  };

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

  /* ---------- 02 · Latest videos: cards from videos.json on a 3D carousel that rides the chrome ring ---------- */
  var videos = (function () {
    var section = document.getElementById("videos"), ring = document.getElementById("vidsRing");
    var stage = section && section.querySelector(".vids");
    var api = { frame: function () { return null; }, front: function () { return -1; } };
    if (!section || !ring || !stage) return api;
    var PROFILE = "https://www.tiktok.com/@yupbash", MIN = 6, MAX = 8;
    var three = !!(window.gsap && window.ScrollTrigger) && !site.reduced;
    if (three) { document.documentElement.classList.add("vids-3d"); section.setAttribute("data-pin", ""); }
    else stage.classList.add("is-grid");

    /* Real entry = not a placeholder, a TikTok link and a thumbnail (at most 8). Placeholders become NO SIGNAL
       screens, anything else is skipped, and the ring always gets at least 6 cards. */
    function entries(list) {
      var out = [], real = 0;
      (Array.isArray(list) ? list : []).forEach(function (v) {
        if (!v || typeof v !== "object" || out.length >= MAX) return;
        if (v.placeholder === true) { out.push(null); return; }
        if (real < MAX && typeof v.url === "string" && v.url.indexOf("https://www.tiktok.com/") === 0 &&
            typeof v.thumb === "string" && v.thumb.trim()) { out.push(v); real++; }
      });
      while (out.length < MIN) out.push(null);
      return out;
    }
    function el(tag, cls, text) {
      var e = document.createElement(tag);
      if (cls) e.className = cls;
      if (text != null) e.textContent = text;   // titles come from a data file: text only, never HTML
      return e;
    }
    function deco(cls, text) {
      var e = el("span", cls, text);
      e.setAttribute("aria-hidden", "true");
      return e;
    }
    function card(v, i) {
      var a = el("a", v ? "vid-card" : "vid-card is-nosignal");
      a.href = v ? v.url : PROFILE;
      a.target = "_blank";
      a.rel = "noopener";
      a.style.setProperty("--i", i);
      if (v) {
        var img = el("img");
        img.src = v.thumb; img.alt = ""; img.loading = "lazy";
        a.appendChild(img);
      } else a.appendChild(deco("vid-snow"));
      a.appendChild(deco("vid-ch", "CH." + (i < 9 ? "0" : "") + (i + 1)));
      if (v) a.appendChild(deco("vid-play"));
      var info = el("span", "vid-info");
      info.appendChild(el("span", "vid-title", v ? String(v.title || "New video") : "NO SIGNAL — first drop soon"));
      info.appendChild(el("span", "vid-cta", v ? "Watch on TikTok →" : "Follow on TikTok"));
      a.appendChild(info);
      return a;
    }

    var cards = [], n = 0, step = 60, rot = 0, front = -1, frame = null, tilt = 0, inView = null;
    function layout() {
      var cv = document.getElementById("chrome");
      var w = (cv && cv.clientWidth) || window.innerWidth || 1, h = (cv && cv.clientHeight) || window.innerHeight || 1;
      frame = window.BashChrome && window.BashChrome.ringFrame ? window.BashChrome.ringFrame("videos", w, h)
        : { x: w / 2, y: h * .7, r: Math.min(w * .42, h * .3), tilt: .28, camera: h * 1.6 };
      var st = stage.style;
      st.setProperty("--persp", frame.camera.toFixed(1) + "px");
      st.setProperty("--ring-x", frame.x.toFixed(1) + "px");
      st.setProperty("--ring-y", frame.y.toFixed(1) + "px");
      st.setProperty("--radius", frame.r.toFixed(1) + "px");
      st.setProperty("--card-w", Math.round(Math.min(frame.r * (h > w ? .75 : .62), 220)) + "px");   // wider cards on portrait screens
      st.setProperty("--step", step + "deg");
    }
    function apply() {
      ring.style.setProperty("--rot", rot.toFixed(3) + "deg");
      var idx = n ? ((Math.round(-rot / step) % n) + n) % n : -1;
      if (idx !== front) {
        front = idx;
        cards.forEach(function (c, i) { c.classList.toggle("is-front", i === idx); });
      }
      if (home.chrome && home.chrome.setSpin) home.chrome.setSpin(-rot * Math.PI / 180);   // the chrome track turns with the cards
    }
    function tick() {   // follow the chrome ring's slow tilt wobble while the section is on screen
      if (!inView || !inView.isActive || !frame) return;
      var a = frame.tilt + (home.chrome && home.chrome.ringWobble ? home.chrome.ringWobble() : 0);
      if (Math.abs(a - tilt) > 1e-4) { tilt = a; ring.style.setProperty("--tilt", a.toFixed(4) + "rad"); }
    }
    function goTo(i) {   // scroll to where card i faces the front
      var top = section.getBoundingClientRect().top + window.scrollY, span = section.offsetHeight - window.innerHeight;
      window.scrollTo({ top: top + span * i / Math.max(1, n - 1), behavior: "smooth" });
    }
    function init3D() {
      var gsap = window.gsap, ST = window.ScrollTrigger;
      gsap.registerPlugin(ST);
      step = 360 / n;
      layout();
      tilt = frame.tilt;
      ring.style.setProperty("--tilt", tilt.toFixed(4) + "rad");
      var state = { rot: 0 };
      gsap.to(state, {
        rot: -(n - 1) * step, ease: "none",
        scrollTrigger: { trigger: section, start: "top top", end: "bottom bottom", scrub: .8 },
        onUpdate: function () { rot = state.rot; apply(); }
      });
      inView = ST.create({ trigger: section, start: "top bottom", end: "bottom top" });
      gsap.ticker.add(tick);
      window.addEventListener("resize", layout);
      ring.addEventListener("focusin", function (e) {
        var c = e.target.closest ? e.target.closest(".vid-card") : null, i = cards.indexOf(c), kb = true;
        try { kb = !!c && c.matches(":focus-visible"); } catch (err) { kb = true; }
        if (i >= 0 && kb) setTimeout(function () { goTo(i); }, 0);   // after the browser's own scroll-into-view
      });
      apply();
    }
    function build(list) {
      var items = entries(list), frag = document.createDocumentFragment();
      n = items.length;
      cards = items.map(card);
      cards.forEach(function (c) { frag.appendChild(c); });
      ring.textContent = "";
      ring.appendChild(frag);
      if (three) init3D();
    }
    fetch("/assets/videos/videos.json", { cache: "no-cache" })
      .then(function (r) { if (!r.ok) throw new Error("videos.json " + r.status); return r.json(); })
      .then(build, function () { build([]); });   // no data: the section stays, with NO SIGNAL screens

    api.frame = function () { return frame ? { x: frame.x, y: frame.y, r: frame.r, tilt: tilt, camera: frame.camera } : null; };
    api.front = function () { return front; };
    return api;
  })();
  home.videos = videos;

  /* ---------- 03 · About: the spec values decode when the sheet shows up, the portrait gets a scan line ---------- */
  (function () {
    var sheet = document.querySelector(".spec-sheet"), card = document.querySelector(".profile-card");
    if (!sheet || site.reduced || !("IntersectionObserver" in window)) return;
    var GLYPHS = "#%&@$*+=<>/\\|01░▒▓";
    function decode(el, delay) {
      var text = el.textContent, start = 0, dur = 700;
      el.classList.add("is-decoding");
      function frame(now) {
        if (!start) start = now + delay;
        var t = Math.max(0, (now - start) / dur), keep = Math.floor(Math.min(1, t) * text.length), out = text.slice(0, keep);
        for (var i = keep; i < text.length; i++) out += text.charAt(i) === " " ? " " : GLYPHS.charAt((Math.random() * GLYPHS.length) | 0);
        el.setAttribute("data-scramble", out);
        if (t < 1) { requestAnimationFrame(frame); return; }
        el.classList.remove("is-decoding");
        el.removeAttribute("data-scramble");
      }
      requestAnimationFrame(frame);
    }
    var io = new IntersectionObserver(function (entries) {
      if (!entries.some(function (e) { return e.isIntersecting; })) return;
      io.disconnect();
      Array.prototype.forEach.call(sheet.querySelectorAll(".spec-value"), function (el, i) { decode(el, i * 110); });
      if (card) card.classList.add("is-scanning");
    }, { threshold: .3 });
    io.observe(sheet);
  })();

  /* ---------- 04 · Contact: copy the e-mail (HUD toast); if the clipboard is refused, select it for a manual copy ---------- */
  (function () {
    var btn = document.getElementById("copyEmail"), email = document.getElementById("emailText"), toast = document.getElementById("toast");
    if (!btn || !email) return;
    var timer = 0;
    function show(text) {
      if (!toast) return;
      toast.textContent = text;
      toast.classList.add("show");
      clearTimeout(timer);
      timer = setTimeout(function () { toast.classList.remove("show"); }, 2000);
    }
    function selectEmail() {
      try {
        var range = document.createRange(), sel = window.getSelection();
        range.selectNodeContents(email);
        sel.removeAllRanges();
        sel.addRange(range);
      } catch (err) { /* nothing selectable: the toast still shows the address */ }
    }
    btn.addEventListener("click", function () {
      var text = email.textContent.trim();
      function fallback() { selectEmail(); show(text); }
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(function () { show("COPIED ✓"); }, fallback);
        } else fallback();
      } catch (err) { fallback(); }
    });
  })();

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

    var tops = [], heights = [], pinned = [], vh = window.innerHeight || 1, docH = vh;
    function measure() {
      vh = window.innerHeight || 1;
      docH = document.documentElement.scrollHeight || vh;
      nodes.forEach(function (n, i) {
        var r = n.getBoundingClientRect();
        tops[i] = r.top + window.scrollY;
        heights[i] = Math.max(1, r.height);
        pinned[i] = n.hasAttribute("data-pin");
      });
    }
    function ease(t) { return t * t * (3 - 2 * t); }
    /* Where the middle of the screen is: inside one section, or in the hand-over zone between two
       (from 60 % of section i to 20 % of section i + 1). A pinned section (sticky stage: the videos carousel)
       keeps its state for its whole pinned range: hand-overs end when its stage pins and start when it unpins. */
    function enterAt(k) { return tops[k] + (pinned[k] ? .5 * vh : .2 * heights[k]); }
    function leaveAt(k) { return tops[k] + (pinned[k] ? heights[k] - .5 * vh : .6 * heights[k]); }
    /* Enter points are clamped to the lowest the middle of the screen can go, so a short last section (the outro)
       still reaches its own state at the very bottom of the page. */
    function locate(y) {
      var c = y + vh / 2, maxC = Math.max(vh / 2, docH - vh / 2), last = nodes.length - 1;
      for (var j = 0; j < last; j++) {
        var e = Math.min(enterAt(j + 1), maxC), s = Math.min(leaveAt(j), e - 1);
        if (c >= s && c < e) return { from: j, to: j + 1, t: (c - s) / Math.max(1, e - s), c: c };
      }
      var idx = 0;
      for (var k = 1; k <= last; k++) if (c >= Math.min(enterAt(k), maxC)) idx = k;
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
