/* BASH — home page scroll experience (hero exit + 3D "Latest videos" ring + outro).
   Needs GSAP + ScrollTrigger (loaded before this file). If they are missing, or the
   visitor prefers reduced motion, the videos stay a plain grid. Data: /assets/videos/videos.json */
(function(){
  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hasGsap = !!(window.gsap && window.ScrollTrigger);
  var section = document.getElementById("videos");
  var ring = document.getElementById("vidsRing");
  if (!section || !ring) return;

  /* --- hero exit: --hp goes 0 → 1 while the sticky hero scrolls away --- */
  var heroTrack = document.querySelector(".hero-track");
  var stage = heroTrack && heroTrack.querySelector(".stage");
  if (heroTrack && stage && !reduced) {
    var ticking = false;
    var updateHero = function(){
      ticking = false;
      var range = heroTrack.offsetHeight - window.innerHeight;
      var p = range > 0 ? Math.min(1, Math.max(0, window.scrollY / range)) : 0;
      stage.style.setProperty("--hp", p.toFixed(4));
    };
    window.addEventListener("scroll", function(){
      if (!ticking) { ticking = true; requestAnimationFrame(updateHero); }
    }, { passive: true });
    updateHero();
  }

  /* --- video cards (built with textContent: titles come from a data file) --- */
  function card(v, i){
    var a = document.createElement("a");
    a.className = "vid-card";
    a.href = v.url;
    a.target = "_blank";
    a.rel = "noopener";
    a.style.setProperty("--i", i);
    var img = document.createElement("img");
    img.src = v.thumb;
    img.alt = "";
    img.loading = "lazy";
    var play = document.createElement("span");
    play.className = "vid-play";
    play.setAttribute("aria-hidden", "true");
    play.textContent = "▶";
    var info = document.createElement("span");
    info.className = "vid-info";
    var title = document.createElement("span");
    title.className = "vid-title";
    title.textContent = v.title || "New video";
    var cta = document.createElement("span");
    cta.className = "vid-cta";
    cta.textContent = "Watch on TikTok →";
    info.appendChild(title);
    info.appendChild(cta);
    a.appendChild(img);
    a.appendChild(play);
    a.appendChild(info);
    return a;
  }

  function splitTitle(el){
    var text = el.textContent;
    el.setAttribute("aria-label", text);
    el.textContent = "";
    var chars = [];
    Array.prototype.forEach.call(text, function(c){
      var s = document.createElement("span");
      s.className = "ch";
      s.setAttribute("aria-hidden", "true");
      s.textContent = c;
      el.appendChild(s);
      chars.push(s);
    });
    return chars;
  }

  function init3D(cards){
    var gsap = window.gsap;
    gsap.registerPlugin(window.ScrollTrigger);
    document.documentElement.classList.add("vids-3d");

    var n = cards.length;
    var step = 360 / n;
    function layout(){
      var vw = window.innerWidth, vh = window.innerHeight;
      var w = Math.min(vw < 720 ? vw * 0.44 : vw * 0.17, vh * 0.3, 250);
      w = Math.max(w, 130);
      var radius = (w / 2) / Math.tan(Math.PI / n) + w * 0.3;
      ring.style.setProperty("--card-w", w + "px");
      ring.style.setProperty("--radius", radius + "px");
      ring.style.setProperty("--step", step + "deg");
    }
    layout();
    window.addEventListener("resize", layout);

    var front = -1;
    function markFront(rot){
      var idx = ((Math.round(-rot / step) % n) + n) % n;
      if (idx === front) return;
      front = idx;
      cards.forEach(function(c, i){
        c.classList.toggle("is-front", i === idx);
        c.tabIndex = i === idx ? 0 : -1;
      });
    }
    markFront(0);

    var chars = splitTitle(section.querySelector(".vids-title"));

    // entrance: title letters + ring swing in as the section arrives
    gsap.timeline({
      scrollTrigger: { trigger: section, start: "top 85%", end: "top top", scrub: 0.6 }
    })
      .from(section.querySelector(".vids-kicker"), { opacity: 0, y: 20, duration: 0.3 })
      .from(chars, { yPercent: 120, rotate: 12, opacity: 0, stagger: 0.04, duration: 0.5 }, 0)
      .from(section.querySelector(".vids-stage"), { opacity: 0, scale: 0.55, rotateX: 35, y: 80, duration: 0.8 }, 0.1);

    // while pinned: spin the ring so each video comes to the front in turn
    var state = { rot: 0 };
    gsap.timeline({
      scrollTrigger: { trigger: section, start: "top top", end: "bottom bottom", scrub: 0.8 }
    })
      .to(state, {
        rot: -(n - 1) * step, ease: "none", duration: 1,
        onUpdate: function(){
          ring.style.setProperty("--rot", state.rot + "deg");
          markFront(state.rot);
        }
      })
      .to(section.querySelector(".vids-progress span"), { scaleX: 1, ease: "none", duration: 1 }, 0);

    // outro: elements rise in one after another
    gsap.from(".outro-title, .outro-links a, .outro .signature", {
      scrollTrigger: { trigger: ".outro", start: "top 80%" },
      y: 50, opacity: 0, duration: 0.7, stagger: 0.08, ease: "power3.out"
    });
  }

  fetch("/assets/videos/videos.json")
    .then(function(r){ if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function(list){
      list = (list || []).filter(function(v){ return v && v.url && v.thumb; }).slice(0, 8);
      if (!list.length) { section.hidden = true; return; }
      var cards = list.map(card);
      cards.forEach(function(c){ ring.appendChild(c); });
      if (hasGsap && !reduced && cards.length >= 3) init3D(cards);
    })
    .catch(function(){ section.hidden = true; });
})();
