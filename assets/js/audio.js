/* BASH — design v3: UI sounds, all synthesized with the Web Audio API (no audio files).
   Exposes window.BashAudio = { unlock(), setEnabled(on), enabled, context, play(name) }.
   Off by default; the choice is stored in localStorage "bash_v3_sfx" ("on" / "off"). */
(function () {
  "use strict";

  function store() { return (window.BashSite && window.BashSite.store) || null; }
  function readPref() {
    var s = store();
    if (s) return s.get("bash_v3_sfx") === "on";
    try { return window.localStorage.getItem("bash_v3_sfx") === "on"; } catch (e) { return false; }
  }
  function writePref(on) {
    var s = store();
    if (s) { s.set("bash_v3_sfx", on ? "on" : "off"); return; }
    try { window.localStorage.setItem("bash_v3_sfx", on ? "on" : "off"); } catch (e) { /* unavailable */ }
  }

  var AC = window.AudioContext || window.webkitAudioContext;
  var api = { enabled: readPref(), context: null };
  var master = null, noiseBuf = null, lastTick = 0;

  function ensure() {
    if (api.context || !AC) return api.context;
    try {
      api.context = new AC();
      master = api.context.createGain();
      master.gain.value = 0.6;
      master.connect(api.context.destination);
    } catch (e) { api.context = null; }
    return api.context;
  }

  /* Call inside a user gesture: creates or resumes the AudioContext. */
  api.unlock = function () {
    var ctx = ensure();
    if (!ctx) return Promise.resolve();
    try {
      // A silent blip primes iOS Safari.
      var o = ctx.createOscillator(), g = ctx.createGain();
      g.gain.value = 0; o.connect(g); g.connect(master); o.start(); o.stop(ctx.currentTime + 0.01);
      if (ctx.state !== "running" && ctx.resume) return ctx.resume().catch(function () {});
    } catch (e) { /* ignore */ }
    return Promise.resolve();
  };

  api.setEnabled = function (on) {
    api.enabled = !!on;
    writePref(api.enabled);
    syncButton();
  };

  /* ---------- tiny synth helpers ---------- */
  function env(g, t, peak, attack, decay) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  }
  function osc(ctx, type, freq, t, dur, out) {
    var o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    o.connect(out);
    o.start(t);
    o.stop(t + dur + 0.05);
    return o;
  }
  function noise(ctx) {
    if (!noiseBuf) {
      noiseBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.5), ctx.sampleRate);
      var d = noiseBuf.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    var s = ctx.createBufferSource();
    s.buffer = noiseBuf;
    return s;
  }

  var SOUNDS = {
    "tick": function (ctx, t) {
      var g = ctx.createGain(); g.connect(master);
      env(g, t, 0.035, 0.002, 0.03);
      osc(ctx, "triangle", 2200, t, 0.04, g);
    },
    "bloop": function (ctx, t) {
      var g = ctx.createGain(); g.connect(master);
      env(g, t, 0.07, 0.005, 0.14);
      var o = osc(ctx, "sine", 420, t, 0.15, g);
      o.frequency.exponentialRampToValueAtTime(150, t + 0.14);
    },
    "whoosh": function (ctx, t) {
      var src = noise(ctx), f = ctx.createBiquadFilter(), g = ctx.createGain();
      f.type = "bandpass"; f.Q.value = 1.2;
      f.frequency.setValueAtTime(400, t);
      f.frequency.exponentialRampToValueAtTime(1800, t + 0.32);
      src.connect(f); f.connect(g); g.connect(master);
      env(g, t, 0.045, 0.08, 0.24);
      src.start(t); src.stop(t + 0.36);
    },
    "boot-tick": function (ctx, t) {
      var g = ctx.createGain(); g.connect(master);
      env(g, t, 0.025, 0.002, 0.016);
      osc(ctx, "square", 1600, t, 0.02, g);
    },
    "boot-rise": function (ctx, t) {
      var f = ctx.createBiquadFilter(), g = ctx.createGain();
      f.type = "lowpass";
      f.frequency.setValueAtTime(300, t);
      f.frequency.exponentialRampToValueAtTime(2400, t + 0.6);
      f.connect(g); g.connect(master);
      env(g, t, 0.04, 0.05, 0.55);
      osc(ctx, "sawtooth", 220, t, 0.6, f);
      osc(ctx, "sawtooth", 222, t, 0.6, f);
    },
    "boot-drop": function (ctx, t) {
      var g = ctx.createGain(); g.connect(master);
      env(g, t, 0.08, 0.005, 0.22);
      var o = osc(ctx, "sine", 320, t, 0.22, g);
      o.frequency.exponentialRampToValueAtTime(90, t + 0.22);
    },
    "boot-bass": function (ctx, t) {
      var g = ctx.createGain(), h = ctx.createGain();
      g.connect(master);
      env(g, t, 0.12, 0.02, 0.7);
      h.gain.value = 0.5; h.connect(g);
      osc(ctx, "sine", 55, t, 0.72, g);
      osc(ctx, "sine", 110, t, 0.72, h);
    }
  };

  /* No effect when sounds are off, the context is not running, or the name is unknown. */
  api.play = function (name) {
    var ctx = api.context, fn = SOUNDS[name];
    if (!api.enabled || !ctx || ctx.state !== "running" || !fn) return;
    if (name === "tick") {
      var now = performance.now();
      if (now - lastTick < 60) return;
      lastTick = now;
    }
    try { fn(ctx, ctx.currentTime + 0.005); } catch (e) { /* never break the page for a sound */ }
  };

  /* ---------- HUD toggle + UI sounds (hover tick on interactive targets, bloop on click) ---------- */
  var btn = null;
  function syncButton() {
    if (!btn) return;
    btn.setAttribute("aria-pressed", api.enabled ? "true" : "false");
    btn.textContent = api.enabled ? "SFX ON" : "SFX OFF";
  }
  var TARGETS = "a[href], button, summary, [role='button'], select";
  function init() {
    btn = document.getElementById("sfxBtn");
    syncButton();
    if (btn) {
      btn.addEventListener("click", function () {
        var on = !api.enabled;
        if (on) api.unlock();
        api.setEnabled(on);
        if (on) api.play("bloop");
      });
    }
    var lastEl = null;
    document.addEventListener("pointerover", function (e) {
      if (e.pointerType && e.pointerType !== "mouse") return;
      var el = e.target && e.target.closest ? e.target.closest(TARGETS) : null;
      if (el && el !== lastEl) api.play("tick");
      lastEl = el;
    }, { passive: true });
    document.addEventListener("click", function (e) {
      var el = e.target && e.target.closest ? e.target.closest(TARGETS) : null;
      if (el && el !== btn) api.play("bloop");
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  window.BashAudio = api;
})();
