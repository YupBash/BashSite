/* BASH — design v3: shared shell for the vitrine pages (home, 404).
   Exposes window.BashSite: safe storage, live HUD, HUD menu and the one-time "entered" event.
   Loaded with `defer`, before the other modules; anything that needs them waits for DOMContentLoaded. */
(function () {
  "use strict";

  var html = document.documentElement;
  var mq = function (q) { return !!(window.matchMedia && window.matchMedia(q).matches); };
  var reduced = mq("(prefers-reduced-motion: reduce)");
  var fine = mq("(pointer: fine)");

  /* ---------- storage that never throws (private mode, blocked cookies) ---------- */
  var store = {
    get: function (key) {
      try { return window.localStorage.getItem(key); } catch (e) { return null; }
    },
    set: function (key, value) {
      try { window.localStorage.setItem(key, value); } catch (e) { /* storage unavailable: ignore */ }
    }
  };

  /* ---------- real viewport height for mobile browser bars ---------- */
  function setVH() {
    var h = (window.visualViewport && window.visualViewport.height) || window.innerHeight;
    html.style.setProperty("--vh", (h * 0.01) + "px");
  }
  setVH();
  window.addEventListener("resize", setVH);
  if (window.visualViewport) window.visualViewport.addEventListener("resize", setVH);

  /* ---------- HUD ---------- */
  var $ = function (id) { return document.getElementById(id); };
  function pad(n, w) { n = Math.max(0, Math.round(n)); var s = String(n); while (s.length < w) s = "0" + s; return s; }

  var clock = $("hudClock");
  function tick() {
    if (!clock) return;
    var d = new Date();
    clock.textContent = pad(d.getHours(), 2) + ":" + pad(d.getMinutes(), 2) + ":" + pad(d.getSeconds(), 2);
  }
  tick();
  setInterval(tick, 1000);

  var coords = $("hudCoords"), mark = document.querySelector(".hud-mark"), markY = $("hudMarkY");
  if (fine && (coords || mark)) {
    window.addEventListener("pointermove", function (e) {
      if (coords) coords.textContent = "X " + pad(e.clientX, 4) + " · Y " + pad(e.clientY, 4);
      var ny = Math.min(1, Math.max(0, e.clientY / (window.innerHeight || 1)));
      if (mark) mark.style.top = (ny * 100).toFixed(2) + "%";
      if (markY) markY.textContent = "Y." + pad(ny * 1000, 3);
    }, { passive: true });
  }

  var hud = {
    setSection: function (index, name, progress) {
      var label = $("hudSection"), bar = document.querySelector("#hudProgress > span");
      if (label) label.textContent = pad(index, 2) + " / 05 — " + name;
      if (bar) bar.style.transform = "scaleX(" + Math.min(1, Math.max(0, progress || 0)) + ")";
    }
  };

  /* ---------- HUD menu ---------- */
  var menuBtn = $("menuBtn"), menuEl = $("menu");
  function focusables() {
    if (!menuEl) return [];
    return [menuBtn].concat(Array.prototype.slice.call(menuEl.querySelectorAll("a[href]")));
  }
  function setMenu(open, opts) {
    if (!menuBtn || !menuEl) return;
    html.classList.toggle("menu-open", open);
    menuBtn.setAttribute("aria-expanded", String(open));
    menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    menuEl.inert = !open;
    menuEl.setAttribute("aria-hidden", String(!open));
    if (open) {
      var first = menuEl.querySelector("a[href]");
      if (first) first.focus({ preventScroll: true });
    } else if (!(opts && opts.keepFocus)) {
      menuBtn.focus({ preventScroll: true });
    }
  }
  var menu = {
    open: function () { setMenu(true); },
    close: function () { setMenu(false); },
    isOpen: function () { return html.classList.contains("menu-open"); }
  };
  if (menuBtn && menuEl) {
    setMenu(false, { keepFocus: true });
    menuBtn.addEventListener("click", function () { setMenu(!menu.isOpen()); });
    document.addEventListener("keydown", function (e) {
      if (!menu.isOpen()) return;
      if (e.key === "Escape") { e.preventDefault(); setMenu(false); return; }
      if (e.key === "Tab") {
        var list = focusables(), i = list.indexOf(document.activeElement);
        if (!list.length) return;
        e.preventDefault();
        var next = e.shiftKey ? (i <= 0 ? list.length - 1 : i - 1) : (i === -1 || i === list.length - 1 ? 0 : i + 1);
        list[next].focus();
      }
    });
    menuEl.addEventListener("click", function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#"]');
      if (!a) return;
      var target = document.querySelector(a.getAttribute("href"));
      if (!target) return;
      e.preventDefault();
      setMenu(false, { keepFocus: true });
      target.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
      try { history.replaceState(null, "", a.getAttribute("href")); } catch (err) { /* file:// or sandboxed */ }
    });
  }

  /* ---------- "entered": fired once, after the ENTER gate (or at load when there is none) ---------- */
  var entered = null, waiting = [];
  function fireEntered(sound) {
    if (entered) return;
    entered = { sound: !!sound };
    html.classList.add("entered");
    waiting.splice(0).forEach(function (fn) {
      try { fn(entered); } catch (err) { setTimeout(function () { throw err; }); }
    });
  }
  function on(event, fn) {
    if (event !== "entered" || typeof fn !== "function") return;
    if (entered) { var d = entered; setTimeout(function () { fn(d); }, 0); }
    else waiting.push(fn);
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (window.BashMercure) window.BashMercure.init();
    if (!$("gate")) fireEntered(store.get("bash_v3_sfx") === "on");
  });

  console.log("%cBASH", "font-family:Anybody,system-ui,sans-serif;font-style:italic;font-weight:900;font-size:46px;color:#cfe2ff;text-shadow:0 0 14px rgba(140,185,255,.8)");
  console.log("%cYou opened the console. Curious one, huh.", "font-size:13px;color:#d2c4ff");
  console.log("%cyupbash.vip", "font-size:12px;color:#8a5cff");

  window.BashSite = {
    reduced: reduced,
    fine: fine,
    store: store,
    hud: hud,
    menu: menu,
    on: on,
    _enter: fireEntered
  };
})();
