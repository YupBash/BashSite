/* BASH — design v3: "Mercure", the liquid-chrome cursor.
   A full-screen WebGL overlay (2D distance field with fake bevel lighting) draws a chrome droplet on the
   pointer, a comet tail when it moves fast, a liquid ring around the hovered or keyboard-focused element,
   and a ripple on click. Fine pointers + WebGL only; otherwise the system cursor stays.
     var m = BashMercure.init();   // null when not applicable; idempotent */
(function () {
  "use strict";

  var SELECTOR = 'a[href], button, summary, [role="button"], [data-magnet]';
  var instance = null;

  var VS = "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";
  var FS = [
    "precision highp float;",
    "uniform vec2 uRes;uniform float uDpr;uniform vec2 uHead;uniform vec2 uT1;uniform vec2 uT2;uniform vec2 uT3;uniform vec2 uT4;",
    "uniform float uR;uniform float uHeadOn;uniform vec4 uRect;uniform float uWrap;uniform vec2 uReach;uniform float uPress;uniform vec2 uRip;uniform float uRipT;",
    "const vec3 SKY_TOP=vec3(.10,.05,.24);const vec3 SKY_HOR=vec3(.86,.93,1.);const vec3 GROUND=vec3(.015,.01,.03);",
    "const vec3 RIM1=vec3(.58,.30,1.);const vec3 RIM2=vec3(.55,.75,1.);",
    "float smin(float a,float b,float k){float h=clamp(.5+.5*(b-a)/k,0.,1.);return mix(b,a,h)-k*h*(1.-h);}",
    "float sdRB(vec2 p,vec2 b,float r){vec2 q=abs(p)-b+r;return length(max(q,0.))+min(max(q.x,q.y),0.)-r;}",
    "float seg(vec2 p,vec2 a,vec2 b,float ra,float rb){vec2 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/max(dot(ba,ba),1e-3),0.,1.);return length(pa-ba*h)-mix(ra,rb,h);}",
    "float field(vec2 p){",
    "  float d=1e5;",
    "  if(uHeadOn>.5){float r=uR*(1.-.24*uPress);",
    "    d=length(p-uHead)-r;",
    "    d=smin(d,seg(p,uHead,uT1,r*.9,r*.72),r*.6);",
    "    d=smin(d,seg(p,uT1,uT2,r*.72,r*.54),r*.5);",
    "    d=smin(d,seg(p,uT2,uT3,r*.54,r*.38),r*.45);",
    "    d=smin(d,seg(p,uT3,uT4,r*.38,r*.2),r*.4);}",
    "  if(uRipT<1.){float rr=mix(uR*.9,uR*4.8,uRipT);float th=mix(2.4,.15,uRipT)*uDpr;d=min(d,abs(length(p-uRip)-rr)-th);}",
    "  if(uWrap>.002){",
    "    vec2 hs=uRect.zw+6.*uDpr;float rr=min(hs.y,26.*uDpr);",
    "    float ring=abs(sdRB(p-uRect.xy,hs,rr))-1.7*uDpr*(.35+.65*uWrap);",
    "    float reach=length(p-uReach)-uWrap*uWrap*(length(hs)*2.3+24.*uDpr);",
    "    ring=max(ring,reach);",
    "    d=uHeadOn>.5?smin(d,ring,9.*uDpr):min(d,ring);",
    "  }",
    "  return d;}",
    "vec3 env(vec3 r){",
    "  float y=r.y*.85+r.z*.25-.2;",
    "  vec3 col=mix(SKY_HOR,SKY_TOP,smoothstep(0.,.8,y));",
    "  vec3 g=mix(SKY_HOR*.55+GROUND*.45,GROUND+vec3(.1,.08,.18),smoothstep(0.,-.45,y));col=y>0.?col:g;",
    "  col+=SKY_HOR*exp(-abs(y)*22.);",
    "  col+=vec3(1.)*smoothstep(.26,.1,length(r.xy-vec2(-.45,.55)))*1.6;",
    "  col+=RIM1*pow(max(0.,r.x),4.)*1.2+RIM2*pow(max(0.,-r.x),4.);",
    "  return col;}",
    "void main(){",
    "  vec2 p=gl_FragCoord.xy;float d=field(p);float aa=uDpr;",
    "  float alpha=1.-smoothstep(-aa,aa*.5,d);",
    "  if(alpha<.003){gl_FragColor=vec4(0.);return;}",
    "  vec2 gr=vec2(field(p+vec2(1.,0.))-field(p-vec2(1.,0.)),field(p+vec2(0.,1.))-field(p-vec2(0.,1.)));",
    "  float inner=clamp(-d/(6.*uDpr),0.,1.);float tilt=1.-inner;tilt=tilt*tilt;",
    "  vec2 dir=gr/max(length(gr),1e-4);vec3 n=normalize(vec3(dir*tilt*1.8,1.));",
    "  vec3 r=reflect(vec3(0.,0.,-1.),n);vec3 col=env(r);",
    "  col+=pow(1.-n.z,2.)*mix(RIM2,RIM1,.5+.5*n.x)*.5;",
    "  col=col/(1.+col*.25);",
    "  col=mix(col,vec3(.04,.02,.09),smoothstep(-2.2*aa,0.,d)*.75);",
    "  gl_FragColor=vec4(col*alpha,alpha);}"
  ].join("\n");
  var UNIFORMS = ["uRes", "uDpr", "uHead", "uT1", "uT2", "uT3", "uT4", "uR", "uHeadOn", "uRect", "uWrap", "uReach", "uPress", "uRip", "uRipT"];

  function k(base, dt) { return 1 - Math.pow(1 - base, dt / 16.667); }

  function init(opts) {
    if (instance) return instance;
    opts = opts || {};
    var fine = window.matchMedia && window.matchMedia("(pointer: fine)").matches;
    if (!fine) return null;
    var reduced = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    var selector = opts.selector || SELECTOR;

    var cv = document.createElement("canvas");
    cv.className = "mercure-canvas";
    cv.setAttribute("aria-hidden", "true");
    var gl = null, U = {};
    try {
      gl = cv.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: false });
      if (gl) {
        var sh = function (type, src) {
          var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
          if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || "compile failed");
          return s;
        };
        var prog = gl.createProgram();
        gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS));
        gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
        gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) || "link failed");
        gl.useProgram(prog);
        var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
        var loc = gl.getAttribLocation(prog, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
        UNIFORMS.forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });
        gl.enable(gl.SCISSOR_TEST);
      }
    } catch (err) {
      if (window.console) console.warn("BashMercure: WebGL unavailable,", err && err.message);
      gl = null;
    }
    if (!gl) return null;

    document.body.appendChild(cv);
    document.documentElement.classList.add("has-mercure");

    var cd = Math.min(window.devicePixelRatio || 1, 2), CW = 0, CH = 0;
    var P = { x: -100, y: -100 }, seen = false, hiddenByTouch = false;
    var tails = [0, 1, 2, 3].map(function () { return { x: P.x, y: P.y }; });
    var hoverEl = null, focusEl = null, wrap = 0, rect = { x: 0, y: 0, w: 0, h: 0 }, reachFrom = "head";
    var press = 0, pressed = 0, rip = { x: 0, y: 0, t: 1 };
    var last = performance.now(), raf = 0, running = false;

    function onMove(e) {
      if (e.pointerType && e.pointerType !== "mouse" && e.pointerType !== "pen") return;
      P.x = e.clientX; P.y = e.clientY;
      if (!seen || hiddenByTouch) { tails.forEach(function (t) { t.x = P.x; t.y = P.y; }); }
      seen = true; hiddenByTouch = false;
    }
    function onOver(e) {
      if (e.pointerType && e.pointerType !== "mouse" && e.pointerType !== "pen") return;
      hoverEl = (e.target && e.target.closest) ? e.target.closest(selector) : null;
    }
    function onDown(e) {
      if (e.pointerType === "touch") { hiddenByTouch = true; hoverEl = null; return; }
      pressed = 1;
      if (!reduced) { rip.x = P.x; rip.y = P.y; rip.t = 0; }
    }
    function onUp() { pressed = 0; }
    function onFocusIn(e) {
      var el = e.target;
      var visible = false;
      try { visible = el.matches(":focus-visible"); } catch (err) { visible = false; }
      focusEl = (visible && el.matches && el.matches(selector)) ? el : null;
    }
    function onFocusOut() { focusEl = null; }
    function onLeave() { seen = false; hoverEl = null; }
    function onVisibility() { if (document.hidden) stop(); else start(); }

    document.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerover", onOver, { passive: true });
    document.addEventListener("pointerdown", onDown, { passive: true, capture: true });
    document.addEventListener("pointerup", onUp, { passive: true });
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    document.documentElement.addEventListener("mouseleave", onLeave);
    document.addEventListener("visibilitychange", onVisibility);

    function headVisible() { return seen && !hiddenByTouch; }
    function currentTarget() {
      if (hoverEl && !hoverEl.isConnected) hoverEl = null;
      if (focusEl && !focusEl.isConnected) focusEl = null;
      return (headVisible() && hoverEl) || focusEl || null;
    }

    function frame(now) {
      if (!running) return;
      var dt = Math.max(0, Math.min(64, now - last)); last = now;
      var w = Math.round(window.innerWidth * cd), h = Math.round(window.innerHeight * cd);
      if (w !== CW || h !== CH) { CW = cv.width = w; CH = cv.height = h; gl.viewport(0, 0, CW, CH); }

      var ks = [.42, .36, .3, .26], lead = P;
      for (var i = 0; i < 4; i++) {
        if (reduced) { tails[i].x = P.x; tails[i].y = P.y; continue; }
        var kk = k(ks[i], dt);
        tails[i].x += (lead.x - tails[i].x) * kk; tails[i].y += (lead.y - tails[i].y) * kk;
        if (!isFinite(tails[i].x) || !isFinite(tails[i].y)) { tails[i].x = P.x; tails[i].y = P.y; }
        lead = tails[i];
      }

      var active = currentTarget();
      if (active) {
        reachFrom = active === focusEl && active !== hoverEl ? "center" : "head";
        var r = active.getBoundingClientRect();
        rect = { x: r.left, y: r.top, w: r.width, h: r.height };
      }
      var goal = active ? 1 : 0;
      wrap = reduced ? goal : wrap + (goal - wrap) * k(.13, dt);
      press += (pressed - press) * k(.35, dt);
      if (rip.t < 1) rip.t = Math.min(1, rip.t + dt / 450);

      function X(x) { return x * cd; }
      function Y(y) { return CH - y * cd; }
      var on = headVisible();
      var cx = rect.x + rect.w / 2, cy = rect.y + rect.h / 2;
      gl.uniform2f(U.uRes, CW, CH); gl.uniform1f(U.uDpr, cd);
      gl.uniform2f(U.uHead, X(P.x), Y(P.y));
      gl.uniform2f(U.uT1, X(tails[0].x), Y(tails[0].y)); gl.uniform2f(U.uT2, X(tails[1].x), Y(tails[1].y));
      gl.uniform2f(U.uT3, X(tails[2].x), Y(tails[2].y)); gl.uniform2f(U.uT4, X(tails[3].x), Y(tails[3].y));
      gl.uniform1f(U.uR, (9.5 - 3.5 * wrap) * cd);
      gl.uniform1f(U.uHeadOn, on ? 1 : 0);
      gl.uniform4f(U.uRect, X(cx), Y(cy), rect.w / 2 * cd, rect.h / 2 * cd);
      gl.uniform1f(U.uWrap, wrap);
      gl.uniform2f(U.uReach, reachFrom === "center" ? X(cx) : X(P.x), reachFrom === "center" ? Y(cy) : Y(P.y));
      gl.uniform1f(U.uPress, press);
      gl.uniform2f(U.uRip, X(rip.x), Y(rip.y)); gl.uniform1f(U.uRipT, rip.t);

      gl.scissor(0, 0, CW, CH); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      var x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      function grow(ax, ay, bx, by) { x0 = Math.min(x0, ax); y0 = Math.min(y0, ay); x1 = Math.max(x1, bx); y1 = Math.max(y1, by); }
      if (on) {
        grow(P.x - 40, P.y - 40, P.x + 40, P.y + 40);
        tails.forEach(function (t) { grow(t.x - 40, t.y - 40, t.x + 40, t.y + 40); });
      }
      if (wrap > .01) grow(rect.x - 30, rect.y - 30, rect.x + rect.w + 30, rect.y + rect.h + 30);
      if (rip.t < 1) grow(rip.x - 60, rip.y - 60, rip.x + 60, rip.y + 60);
      if (x1 > x0) {
        gl.scissor(Math.max(0, Math.floor(x0 * cd)), Math.max(0, Math.floor(CH - y1 * cd)), Math.ceil((x1 - x0) * cd), Math.ceil((y1 - y0) * cd));
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
      raf = requestAnimationFrame(frame);
    }
    function start() {
      if (running || document.hidden) return;
      running = true; last = performance.now();
      raf = requestAnimationFrame(frame);
    }
    function stop() { running = false; cancelAnimationFrame(raf); }
    start();

    instance = {
      state: function () {
        return { visible: headVisible(), wrap: wrap, target: currentTarget(), ripple: rip.t };
      },
      destroy: function () {
        stop();
        document.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerover", onOver);
        document.removeEventListener("pointerdown", onDown, true);
        document.removeEventListener("pointerup", onUp);
        document.removeEventListener("focusin", onFocusIn);
        document.removeEventListener("focusout", onFocusOut);
        document.documentElement.removeEventListener("mouseleave", onLeave);
        document.removeEventListener("visibilitychange", onVisibility);
        document.documentElement.classList.remove("has-mercure");
        if (cv.parentNode) cv.parentNode.removeChild(cv);
        instance = null;
      }
    };
    return instance;
  }

  window.BashMercure = { init: init };
})();
