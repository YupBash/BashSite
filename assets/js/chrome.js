/* BASH — design v3: the liquid chrome sculpture.
   Hand-written raymarched WebGL (no library). One controller per canvas:
     var c = BashChrome.init(canvas, { mobile: false });   // null without WebGL (adds html.no-gl)
     c.setState("home"); c.blend("home", "videos", 0.4); c.setPointer(nx, ny); c.setTargets([{x, y}, ...]);
   States follow the home sections: home, videos, about, socials, gamble, outro. */
(function () {
  "use strict";

  var reduced = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  var HALF_H = 1.25;          // half height of the z = 0 plane seen by the camera (z = 4, focal 1.6)
  var MOUSE_PLANE = 1.19;     // half height of the plane the pointer arm reaches into
  var BUBBLE_GAP = .40;       // min surface gap between Socials bubbles (object units): smooth-min k .5 blends below .25, ripple adds .056

  /* fx/fy: centre in fractions of the half-width/half-height (+ = up); s: scale.
     m: overrides for portrait screens (aspect < 1.1). blobs: [x, y, z, radius] in local units. */
  var STATES = {
    home: { fx: .32, fy: .18, s: .64, m: { fx: 0, fy: .40, s: .50 }, wob: 1, ring: [1.12, .075, .95, 1], arm: 1, chip: 0,
      blobs: [[0, 0, 0, .66], [0, 0, 0, .46], [0, 0, 0, .40], [0, 0, .1, .26], [0, -.75, .2, .30]] },
    videos: { fx: 0, fy: .30, s: .45, m: { fx: 0, fy: .45, s: .38 }, wob: .5, ring: [1.9, .05, .28, 1], arm: .5, chip: 0,
      blobs: [[0, 0, 0, .50], [0, 0, 0, .35], [0, 0, 0, .30], [0, 0, 0, .20], [0, 0, 0, .20]] },
    about: { fx: 0, fy: 0, s: .50, wob: .35, ring: [1.12, .075, .95, 0], arm: 0, chip: 0,
      m: { fx: 0, fy: .75, s: .40, blobs: [[-1.4, 0, 0, .30], [1.4, .1, 0, .26], [0, .3, 0, .20], [0, 0, 0, 0], [0, 0, 0, 0]] },
      blobs: [[-2.7, .9, 0, .30], [-2.5, -.8, 0, .22], [2.7, .6, 0, .28], [2.6, -1, 0, .20], [0, 0, 0, 0]] },
    socials: { fx: 0, fy: 0, s: .50, m: { fx: 0, fy: 0, s: .24 }, wob: 0, ring: [1.12, .075, .95, 0], arm: 0, chip: 0, logo: 1, targets: true,
      blobs: [[-1.6, 0, 0, .42], [0, 0, 0, .42], [1.6, 0, 0, .42], [0, 0, 0, 0], [0, 0, 0, 0]] },
    gamble: { fx: .5, fy: .10, s: .56, m: { fx: 0, fy: .45, s: .50 }, wob: .2, ring: [1.12, .075, .95, 0], arm: .3, chip: 1,
      blobs: [[0, 0, 0, .55], [0, 0, 0, .40], [0, 0, 0, .35], [0, 0, 0, .20], [0, 0, 0, .20]] },
    outro: { fx: 0, fy: -.35, s: .35, wob: .3, ring: [1.12, .075, .95, 0], arm: 0, chip: 0,
      blobs: [[0, 0, 0, .45], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]] }
  };

  /* Per-blob drift (from the validated prototype), scaled by the state's wob. */
  function motion(i, t) {
    switch (i) {
      case 0: return [Math.sin(t * 1.1) * .5, Math.cos(t * .9) * .3, Math.sin(t * .7) * .3];
      case 1: return [Math.cos(t * .8 + 1) * .75, Math.sin(t * 1.3) * .45, Math.cos(t) * .25];
      case 2: return [Math.sin(t * .6 + 2) * .45, Math.cos(t * .7 + .5) * .75, Math.sin(t * 1.2) * .2];
      case 3: return [Math.cos(t * 1.4 + 3) * .95, Math.sin(t * .5 + 1) * .3, 0];
      default: return [Math.sin(t * .9 + 4) * .3, Math.cos(t * 1.1) * .15, 0];
    }
  }

  var VS = "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";
  var FS = [
    "precision highp float;",
    "uniform vec2 uRes;uniform float uTime;uniform vec2 uMouse;uniform vec3 uCenter;uniform float uRot;uniform float uPx;",
    "uniform vec4 uB[5];uniform vec4 uRing;uniform float uArm;uniform float uChip;uniform float uBound;uniform sampler2D uLogo;uniform float uLogoOn;",
    "const vec3 SKY_TOP=vec3(.10,.05,.24);const vec3 SKY_HOR=vec3(.86,.93,1.);const vec3 GROUND=vec3(.015,.01,.03);",
    "const vec3 RIM1=vec3(.58,.30,1.);const vec3 RIM2=vec3(.55,.75,1.);const vec3 TINT=vec3(.94,.91,1.);",
    "float smin(float a,float b,float k){float h=clamp(.5+.5*(b-a)/k,0.,1.);return mix(b,a,h)-k*h*(1.-h);}",
    "mat2 rot(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}",
    "float sdChip(vec3 p){",
    "  p.xz=rot(uTime*.6)*p.xz;p.yz=rot(1.2208)*p.yz;",
    "  float r=length(p.xz);float notch=step(.5,fract(atan(p.z,p.x)*16./6.2831853))*.035;",
    "  vec2 d=vec2(r-(.95-notch),abs(p.y)-.11);",
    "  float disc=min(max(d.x,d.y),0.)+length(max(d,0.))-.04;",
    "  float ridge=length(vec2(r-.6,abs(p.y)-.13))-.035;",
    "  return min(disc,ridge);}",
    "float map(vec3 p){",
    "  float s=uCenter.z;vec3 q=(p-vec3(uCenter.xy,0.))/s;float d=1e3;",
    "  for(int i=0;i<5;i++){vec4 b=uB[i];if(b.w>.01)d=smin(d,length(q-b.xyz)-b.w,.5);}",
    "  if(uRing.w>.01){float t=uTime*.32;vec3 tp=q;tp.yz=rot(uRing.z+.18*sin(t*.8))*tp.yz;tp.xz=rot(t*.45)*tp.xz;",
    "    tp+=.07*sin(3.*tp.zxy+uTime*.9);",
    "    float tor=length(vec2(length(tp.xz)-uRing.x,tp.y))-uRing.y*uRing.w;d=smin(d,tor,.28*uRing.w+.001);}",
    "  if(uArm>.01){vec2 m=(uMouse-uCenter.xy)/s;float ml=length(m);vec2 md=m/max(ml,1e-3)*min(ml,1.6)*uArm;",
    "    d=smin(d,length(q-vec3(md*.55,.15))-.24*uArm,.5);d=smin(d,length(q-vec3(md,.25))-.21*uArm,.45);}",
    "  d+=.028*sin(5.*q.x+uTime*1.3)*sin(5.*q.y+uTime*.9)*sin(5.*q.z+uTime*1.1);",
    "  if(uChip>.001)d=mix(d,sdChip(q),uChip);",
    "  return d*s;}",
    "vec3 nrm(vec3 p){vec2 k=vec2(1.,-1.)*.0015;return normalize(k.xyy*map(p+k.xyy)+k.yyx*map(p+k.yyx)+k.yxy*map(p+k.yxy)+k.xxx*map(p+k.xxx));}",
    "vec3 env(vec3 r){",
    "  float y=r.y;vec3 col=mix(SKY_HOR,SKY_TOP,smoothstep(0.,.75,y));",
    "  vec3 g=mix(SKY_HOR*.5+GROUND*.5,GROUND,smoothstep(0.,-.4,y));col=y>0.?col:g;",
    "  col+=SKY_HOR*.9*exp(-abs(y)*30.);",
    "  float sb1=smoothstep(.32,.26,abs(r.x-.5))*smoothstep(.22,.16,abs(r.y-.52));",
    "  float sb2=smoothstep(.1,.06,abs(r.x+.62))*smoothstep(.42,.36,abs(r.y-.18));",
    "  float sb3=smoothstep(.5,.4,length(r.xy-vec2(-.1,.85)));",
    "  col+=vec3(1.)*(sb1*1.5+sb2*1.1+sb3*.6);",
    "  col+=RIM1*pow(max(0.,r.x),5.)*1.3+RIM2*pow(max(0.,-r.x),5.)*1.1;",
    "  return col;}",
    "void main(){",
    "  vec2 uv=(gl_FragCoord.xy-.5*uRes)/uRes.y;vec3 ro=vec3(0.,0.,4.);vec3 rd=normalize(vec3(uv,-1.6));",
    "  vec3 c=vec3(uCenter.xy,0.);float R=uBound;vec3 oc=ro-c;float b=dot(oc,rd);float h=b*b-(dot(oc,oc)-R*R);",
    "  if(h<0.||R<.001){gl_FragColor=vec4(0.);return;}h=sqrt(h);",
    "  float t=max(-b-h,0.);float tEnd=-b+h;float minA=1e9;float tA=t;bool hit=false;",
    "  for(int i=0;i<STEPS;i++){vec3 p=ro+rd*t;float d=map(p);float a=d/t;if(a<minA){minA=a;tA=t;}",
    "    if(d<.0008*t){hit=true;break;}t+=d*.92;if(t>tEnd)break;}",
    "  float alpha=hit?1.:1.-smoothstep(0.,1.6*uPx,minA);",
    "  if(alpha<=.002){gl_FragColor=vec4(0.);return;}",
    "  vec3 p=ro+rd*(hit?t:tA);vec3 n=nrm(p);vec3 r=reflect(rd,n);r.xz=rot(uRot)*r.xz;",
    "  float ndv=clamp(dot(n,-rd),0.,1.);vec3 col=env(r)*TINT;",
    "  col+=pow(1.-ndv,3.)*mix(RIM2,RIM1,.5+.5*n.x)*.55;",
    "  col*=.55+.45*clamp(map(p+n*.18)/.18,0.,1.);",
    "  col=col/(1.+col*.22);",
    "  if(uLogoOn>.01){",
    "    vec3 lq=(p-vec3(uCenter.xy,0.))/uCenter.z;float best=1e9;float bi=0.;vec4 bb=uB[0];",
    "    for(int i=0;i<3;i++){vec4 b=uB[i];float dd=length(lq.xy-b.xy)/max(b.w,1e-3);if(b.w>.01&&dd<best){best=dd;bi=float(i);bb=b;}}",
    "    vec2 luv=(lq.xy-bb.xy)/(bb.w*.62);",
    "    if(abs(luv.x)<1.&&abs(luv.y)<1.){",
    "      float la=texture2D(uLogo,vec2((bi+.5+luv.x*.5)/3.,.5-luv.y*.5)).a*uLogoOn*smoothstep(.2,.45,n.z);",
    "      vec3 brand=bi<.5?vec3(.345,.396,.949):(bi<1.5?vec3(.145,.957,.933):vec3(.882,.188,.424));",
    "      col=mix(col,brand*1.15+.12,la*.92);",
    "    }",
    "  }",
    "  gl_FragColor=vec4(col*alpha,alpha);}"
  ].join("\n");

  var UNIFORMS = ["uRes", "uTime", "uMouse", "uCenter", "uRot", "uPx", "uB", "uRing", "uArm", "uChip", "uBound", "uLogo", "uLogoOn"];

  /* Brand emblems for the Socials bubbles, in order: Discord, TikTok, Instagram (24-unit icons). */
  var DISCORD = "M20.3 4.5a19.8 19.8 0 0 0-4.9-1.5l-.6 1.2a18.4 18.4 0 0 0-5.5 0L8.7 3a19.7 19.7 0 0 0-4.9 1.5C.6 9.1-.3 13.6.1 18a20 20 0 0 0 6 3l1.3-2c-.7-.2-1.3-.5-1.9-.9l.4-.3a14.2 14.2 0 0 0 12.1 0l.4.3c-.6.4-1.2.7-1.9.9l1.3 2a20 20 0 0 0 6-3c.5-5.1-.8-9.5-3.5-13.5ZM8 15.3c-1.2 0-2.2-1.1-2.2-2.4s1-2.4 2.2-2.4 2.2 1.1 2.2 2.4-1 2.4-2.2 2.4Zm8 0c-1.2 0-2.2-1.1-2.2-2.4s1-2.4 2.2-2.4 2.2 1.1 2.2 2.4-1 2.4-2.2 2.4Z";
  var TIKTOK = "M14 3v10.6a2.9 2.9 0 1 1-2.4-2.85V8.2A5.4 5.4 0 1 0 16.4 13.5V9.8a6.8 6.8 0 0 0 4.1 1.4V8.6a4.1 4.1 0 0 1-2.5-.9A4.3 4.3 0 0 1 16.4 4.2V3H14Z";
  function logoAtlas() {
    if (typeof Path2D !== "function") return null;
    var c = document.createElement("canvas");
    c.width = 768; c.height = 256;
    var g = c.getContext("2d");
    if (!g) return null;
    var k = 200 / 24;
    g.fillStyle = "#fff"; g.strokeStyle = "#fff";
    g.setTransform(k, 0, 0, k, 28, 28); g.fill(new Path2D(DISCORD));
    g.setTransform(k, 0, 0, k, 256 + 28, 28); g.fill(new Path2D(TIKTOK));
    g.setTransform(k, 0, 0, k, 512 + 28, 28);
    g.lineWidth = 2.4;
    g.beginPath(); g.moveTo(8, 3); g.arcTo(21, 3, 21, 21, 5); g.arcTo(21, 21, 3, 21, 5); g.arcTo(3, 21, 3, 3, 5); g.arcTo(3, 3, 21, 3, 5); g.closePath(); g.stroke();
    g.beginPath(); g.arc(12, 12, 4, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.arc(17.2, 6.8, 1.4, 0, Math.PI * 2); g.fill();
    return c;
  }
  function logoTexture(gl) {
    var atlas = logoAtlas();
    if (!atlas) return false;
    var tex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlas);
    return true;
  }

  function build(gl, steps) {
    function shader(type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || "shader compile failed");
      return s;
    }
    var prog = gl.createProgram();
    gl.attachShader(prog, shader(gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, "#define STEPS " + steps + "\n" + FS));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) || "link failed");
    gl.useProgram(prog);
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    var U = {};
    UNIFORMS.forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });
    return U;
  }

  function lerp(a, b, t) {
    if (typeof a === "number") return a + (b - a) * t;
    var out = [];
    for (var i = 0; i < a.length; i++) out.push(lerp(a[i], b[i], t));
    return out;
  }

  var instances = typeof WeakMap === "function" ? new WeakMap() : null;

  function init(canvas, opts) {
    if (!canvas) return null;
    if (instances && instances.has(canvas)) return instances.get(canvas);
    opts = opts || {};
    var gl = null, U = null;
    try {
      gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: false, powerPreference: "high-performance" });
      if (gl) U = build(gl, opts.mobile ? 48 : 80);
    } catch (err) {
      if (window.console) console.warn("BashChrome: WebGL unavailable,", err && err.message);
      gl = null;
    }
    if (!gl || !U) {
      document.documentElement.classList.add("no-gl");
      return null;
    }

    var hasLogos = false;
    try { hasLogos = logoTexture(gl); gl.uniform1i(U.uLogo, 0); } catch (err) { hasLogos = false; }
    var mobile = !!opts.mobile;
    var scale = mobile ? .5 : .72, maxScale = mobile ? .6 : .95, minScale = .34;
    var W = 0, H = 0, cssW = 1, cssH = 1, dirty = true;
    var from = "home", to = "home", mixT = 0, intro = 1, targets = [];
    var target = { x: .62, y: .42 }, smooth = { x: .62, y: .42 }, lastPointer = -1e9;
    var t0 = performance.now(), last = t0, frames = 0, fps = 0, acc = 0, cnt = 0, slowRun = 0;
    var running = false, paused = false, raf = 0, lost = false;
    var blobBuf = new Float32Array(20);

    function resize() {
      cssW = canvas.clientWidth || window.innerWidth || 1;
      cssH = canvas.clientHeight || window.innerHeight || 1;
      var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      var w = Math.max(2, Math.round(cssW * dpr * scale)), h = Math.max(2, Math.round(cssH * dpr * scale));
      if (w !== W || h !== H) {
        W = canvas.width = w; H = canvas.height = h;
        gl.viewport(0, 0, W, H);
        dirty = true;
      }
    }

    function resolve(name, aspect) {
      var st = STATES[name], m = (aspect < 1.1 && st.m) || {};
      var fx = m.fx != null ? m.fx : st.fx, fy = m.fy != null ? m.fy : st.fy, s = m.s != null ? m.s : st.s;
      var cx = fx * HALF_H * aspect, cy = fy * HALF_H;
      var blobs = (m.blobs || st.blobs).map(function (b) { return b.slice(); });
      if (st.targets && targets.length) {
        var n = Math.min(3, targets.length), i, j;
        for (i = 0; i < n; i++) {
          var px = (targets[i].x / cssW * 2 - 1) * HALF_H * aspect, py = -(targets[i].y / cssH * 2 - 1) * HALF_H;
          blobs[i][0] = (px - cx) / s; blobs[i][1] = (py - cy) / s; blobs[i][2] = 0;
        }
        // Three separate droplets, never one capsule: shrink a bubble until its neighbours sit outside the blend zone.
        for (i = 0; i < n; i++) {
          var near = 1e9;
          for (j = 0; j < n; j++) {
            if (j === i) continue;
            var dx = blobs[i][0] - blobs[j][0], dy = blobs[i][1] - blobs[j][1];
            near = Math.min(near, Math.sqrt(dx * dx + dy * dy));
          }
          if (near < 1e9) blobs[i][3] = Math.max(.12, Math.min(blobs[i][3], (near - BUBBLE_GAP) / 2));
        }
      }
      return { cx: cx, cy: cy, s: s, wob: st.wob, ring: st.ring, arm: st.arm, chip: st.chip, logo: st.logo || 0, blobs: blobs };
    }

    function params(aspect) {
      var a = resolve(from, aspect);
      if (from === to || mixT <= 0) return a;
      var b = resolve(to, aspect);
      if (mixT >= 1) return b;
      var out = {};
      for (var k in a) out[k] = lerp(a[k], b[k], mixT);
      return out;
    }

    function render(now, fromLoop) {
      var raw = Math.max(0, now - last);   // real frame interval (slow-device detection)
      var dt = Math.min(64, raw);          // clamped interval (smooth animation)
      last = now;
      resize();
      var aspect = cssW / cssH;

      if (!reduced) {
        if (now - lastPointer > 2500) {
          var it = now / 1000;
          target.x = .62 + Math.sin(it * .35) * .16;
          target.y = .42 + Math.cos(it * .27) * .14;
        }
        var ease = 1 - Math.pow(1 - (now - lastPointer > 2500 ? .02 : .075), dt / 16.667);
        smooth.x += (target.x - smooth.x) * ease;
        smooth.y += (target.y - smooth.y) * ease;
      }

      var P = params(aspect);
      var s = P.s * intro;
      var time = reduced ? 6 : (now - t0) / 1000, tt = time * .32;
      var bound = 0;
      for (var i = 0; i < 5; i++) {
        var b = P.blobs[i], mo = motion(i, tt);
        var x = b[0] + P.wob * mo[0], y = b[1] + P.wob * mo[1], z = b[2] + P.wob * mo[2];
        blobBuf[i * 4] = x; blobBuf[i * 4 + 1] = y; blobBuf[i * 4 + 2] = z; blobBuf[i * 4 + 3] = b[3];
        if (b[3] > .01) bound = Math.max(bound, Math.sqrt(x * x + y * y + z * z) + b[3]);
      }
      if (P.ring[3] > .01) bound = Math.max(bound, P.ring[0] + P.ring[1] + .25);
      if (P.arm > .01) bound = Math.max(bound, 1.6 * P.arm + .35);
      if (P.chip > .001) bound = Math.max(bound, 1.1);
      bound = (bound + .3) * s;

      var mx = reduced ? P.cx : (smooth.x * 2 - 1) * aspect * MOUSE_PLANE;
      var my = reduced ? P.cy : -(smooth.y * 2 - 1) * MOUSE_PLANE;
      gl.uniform2f(U.uRes, W, H);
      gl.uniform1f(U.uTime, time);
      gl.uniform2f(U.uMouse, mx, my);
      gl.uniform3f(U.uCenter, P.cx, P.cy, Math.max(s, 1e-4));
      gl.uniform1f(U.uRot, reduced ? 0 : (smooth.x - .5) * .9);
      gl.uniform1f(U.uPx, 1 / H / 1.6);
      gl.uniform4fv(U.uB, blobBuf);
      gl.uniform4f(U.uRing, P.ring[0], P.ring[1], P.ring[2], P.ring[3]);
      gl.uniform1f(U.uArm, P.arm);
      gl.uniform1f(U.uChip, P.chip);
      gl.uniform1f(U.uLogoOn, hasLogos ? P.logo : 0);
      gl.uniform1f(U.uBound, s > 1e-4 ? bound : 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      frames++;
      dirty = false;

      if (fromLoop) {
        acc += dt; cnt++;
        // Very slow device (software rendering, weak GPU): drop to the lowest resolution right away.
        slowRun = raw > 80 ? slowRun + 1 : 0;
        if (slowRun >= 3 && scale > minScale) { scale = minScale; acc = 0; cnt = 0; slowRun = 0; }
        if (cnt >= 40) {
          var avg = acc / cnt;
          fps = Math.round(1000 / Math.max(avg, 1));
          if (avg > 24 && scale > minScale) scale = Math.max(minScale, scale - .08);
          else if (avg < 13 && scale < maxScale) scale = Math.min(maxScale, scale + .04);
          acc = 0; cnt = 0;
        }
      }
    }

    function loop(now) {
      if (!running) return;
      if (!reduced || dirty) render(now, true);
      else resize();
      raf = requestAnimationFrame(loop);
    }
    function start() {
      if (running || paused || lost || document.hidden) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(loop);
    }
    function stop() {
      running = false;
      cancelAnimationFrame(raf);
    }

    document.addEventListener("visibilitychange", function () { if (document.hidden) stop(); else start(); });
    canvas.addEventListener("webglcontextlost", function (e) {
      e.preventDefault();
      lost = true;
      stop();
      document.documentElement.classList.add("no-gl");
    });

    var ctl = {
      setPointer: function (nx, ny) {
        target.x = nx; target.y = ny; lastPointer = performance.now(); dirty = true;
      },
      setState: function (name) {
        if (!STATES[name]) return;
        from = to = name; mixT = 0; dirty = true;
      },
      blend: function (a, b, t) {
        if (!STATES[a] || !STATES[b]) return;
        from = a; to = b; mixT = Math.min(1, Math.max(0, t)); dirty = true;
      },
      setTargets: function (points) {
        targets = (points || []).slice(0, 3); dirty = true;
      },
      setIntro: function (k) {
        intro = Math.min(1.3, Math.max(0, k)); dirty = true;
      },
      pause: function (p) {
        paused = !!p;
        if (paused) stop(); else start();
      },
      stats: function () {
        var label = mixT <= 0 || from === to ? from : mixT >= 1 ? to : from + ">" + to;
        return { frames: frames, fps: fps, scale: scale, state: label };
      },
      debugSample: function (nx, ny) {
        // One render, then one or many pixel reads: debugSample(x, y) or debugSample([[x, y], ...]).
        render(performance.now(), false);
        var list = Array.isArray(nx) ? nx : [[nx, ny]], out = [], px = new Uint8Array(4);
        list.forEach(function (pt) {
          var x = Math.min(W - 1, Math.max(0, Math.floor(pt[0] * W)));
          var y = Math.min(H - 1, Math.max(0, Math.floor((1 - pt[1]) * H)));
          gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
          out.push([px[0], px[1], px[2], px[3]]);
        });
        return Array.isArray(nx) ? out : out[0];
      }
    };
    if (instances) instances.set(canvas, ctl);
    resize();
    start();
    return ctl;
  }

  window.BashChrome = { init: init, states: Object.keys(STATES) };
})();
