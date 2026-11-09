/* BASH — design v3: the home page orchestration (window.BashHome).
   Starts the chrome sculpture once the visitor has "entered", feeds it the pointer, and runs the hero details:
   wordmark specular, the character easter egg and the magnetic buttons. */
(function () {
  "use strict";

  var site = window.BashSite || { reduced: false, fine: false, on: function () {} };
  var current = "home";
  var home = {
    chrome: null,
    section: function () { return current; }
  };
  window.BashHome = home;

  /* ---------- chrome sculpture ---------- */
  function initChrome() {
    var canvas = document.getElementById("chrome");
    if (!canvas || !window.BashChrome || home.chrome) return;
    home.chrome = window.BashChrome.init(canvas, { mobile: !site.fine || window.innerWidth < 760 });
    if (home.chrome) home.chrome.setState("home");
  }

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
