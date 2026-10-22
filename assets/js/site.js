/* BASH — shared behaviour for vitrine pages (home, faq, socials, 404).
   Loaded with `defer`: runs after the DOM is parsed, before DOMContentLoaded. */
(function(){
  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* --- real viewport height (mobile browser bars) --- */
  function setVH(){
    var h = (window.visualViewport && window.visualViewport.height) || window.innerHeight;
    document.documentElement.style.setProperty("--vh", (h * 0.01) + "px");
  }
  setVH();
  window.addEventListener("resize", setVH);
  window.addEventListener("orientationchange", setVH);
  window.addEventListener("pageshow", setVH);
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", setVH);
  }

  /* --- page fade in / fade out between internal links --- */
  function reveal(){
    requestAnimationFrame(function(){
      requestAnimationFrame(function(){
        document.body.classList.add("page-loaded");
      });
    });
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", reveal);
  } else {
    reveal();
  }
  window.addEventListener("pageshow", function(e){ if (e.persisted) reveal(); });

  document.addEventListener("click", function(e){
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest("a");
    if (!a || a.hasAttribute("download") || a.target === "_blank") return;
    var href = a.getAttribute("href");
    if (!href || href.charAt(0) === "#") return;
    var url;
    try { url = new URL(href, location.href); } catch(err) { return; }
    if (url.origin !== location.origin) return;
    if (url.href === location.href) return;
    e.preventDefault();
    document.body.classList.remove("page-loaded");
    setTimeout(function(){ location.href = url.href; }, reduced ? 0 : 320);
  });

  /* --- side menu --- */
  var stage = document.querySelector(".stage");
  var menuBtn = document.getElementById("menuBtn");
  var sideMenu = document.getElementById("sideMenu");
  var backdrop = document.getElementById("menuBackdrop");

  if (stage && menuBtn && sideMenu && backdrop) {
    var seen = true;
    try { seen = localStorage.getItem("bashMenuIntroSeen"); } catch(e){}
    if (!seen) {
      var markSeen = function(){ try { localStorage.setItem("bashMenuIntroSeen", "1"); } catch(e){} };
      if (reduced) {
        markSeen();
      } else {
        menuBtn.classList.add("intro-pulse");
        var stop = function(){
          menuBtn.classList.remove("intro-pulse");
          markSeen();
        };
        menuBtn.addEventListener("click", stop, { once: true });
        setTimeout(stop, 4300);
      }
    }

    var setMenu = function(open){
      stage.classList.toggle("menu-open", open);
      menuBtn.classList.toggle("is-open", open);
      menuBtn.setAttribute("aria-expanded", String(open));
      menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      sideMenu.setAttribute("aria-hidden", String(!open));
    };
    menuBtn.addEventListener("click", function(){
      setMenu(!stage.classList.contains("menu-open"));
    });
    backdrop.addEventListener("click", function(){ setMenu(false); });
    document.addEventListener("keydown", function(e){
      if (e.key === "Escape") setMenu(false);
    });

    // Clicks on transparent parts of the menu artwork fall through to what's underneath.
    var sideMenuBg = sideMenu.querySelector(".side-menu-bg");
    var artCanvas = null, artCtx = null;
    var buildArtSampler = function(){
      artCanvas = document.createElement("canvas");
      artCanvas.width = sideMenuBg.naturalWidth;
      artCanvas.height = sideMenuBg.naturalHeight;
      artCtx = artCanvas.getContext("2d", { willReadFrequently: true });
      artCtx.drawImage(sideMenuBg, 0, 0);
    };
    var isArtOpaqueAt = function(x, y){
      if (!artCtx) return true;
      var rect = sideMenuBg.getBoundingClientRect();
      var xf = (x - rect.left) / rect.width;
      var yf = (y - rect.top) / rect.height;
      if (xf < 0 || xf > 1 || yf < 0 || yf > 1) return false;
      var px = Math.min(artCanvas.width - 1, Math.max(0, Math.floor(xf * artCanvas.width)));
      var py = Math.min(artCanvas.height - 1, Math.max(0, Math.floor(yf * artCanvas.height)));
      return artCtx.getImageData(px, py, 1, 1).data[3] > 10;
    };
    if (sideMenuBg) {
      if (sideMenuBg.complete && sideMenuBg.naturalWidth) buildArtSampler();
      else sideMenuBg.addEventListener("load", buildArtSampler, { once: true });
      sideMenu.addEventListener("click", function(e){
        if (isArtOpaqueAt(e.clientX, e.clientY)) return;
        e.preventDefault();
        e.stopPropagation();
        var prevPE = sideMenu.style.pointerEvents;
        var prevBackdropPE = backdrop.style.pointerEvents;
        sideMenu.style.pointerEvents = "none";
        backdrop.style.pointerEvents = "none";
        var target = document.elementFromPoint(e.clientX, e.clientY);
        sideMenu.style.pointerEvents = prevPE;
        backdrop.style.pointerEvents = prevBackdropPE;
        if (target) target.click();
      }, true);
    }
  }

  /* --- neon wordmark: letters light up one by one (CSS does the animation) --- */
  document.querySelectorAll("[data-neon]").forEach(function(el){
    var text = el.textContent;
    el.setAttribute("aria-label", text);
    el.textContent = "";
    Array.prototype.forEach.call(text, function(ch, i){
      var s = document.createElement("span");
      s.className = "neon-letter";
      s.setAttribute("aria-hidden", "true");
      s.style.setProperty("--i", i);
      s.textContent = ch;
      el.appendChild(s);
    });
  });

  /* --- staggered entrance: children of [data-reveal] get an index for their delay --- */
  document.querySelectorAll("[data-reveal]").forEach(function(group){
    Array.prototype.forEach.call(group.children, function(child, i){
      child.style.setProperty("--reveal-i", i);
    });
  });

  /* --- parallax: [data-parallax] drifts slightly toward the pointer (mouse only) --- */
  var layers = document.querySelectorAll("[data-parallax]");
  if (layers.length && !reduced && window.matchMedia("(pointer: fine)").matches) {
    var tx = 0, ty = 0, cx = 0, cy = 0, ticking = false;
    var step = function(){
      cx += (tx - cx) * 0.08;
      cy += (ty - cy) * 0.08;
      layers.forEach(function(el){
        el.style.setProperty("--px", cx.toFixed(3));
        el.style.setProperty("--py", cy.toFixed(3));
      });
      if (Math.abs(tx - cx) > 0.001 || Math.abs(ty - cy) > 0.001) requestAnimationFrame(step);
      else ticking = false;
    };
    window.addEventListener("pointermove", function(e){
      tx = (e.clientX / window.innerWidth) * 2 - 1;
      ty = (e.clientY / window.innerHeight) * 2 - 1;
      if (!ticking) { ticking = true; requestAnimationFrame(step); }
    }, { passive: true });
  }

  console.log("%cBASH", "font-family:'Permanent Marker',cursive;font-size:48px;color:#c98bff;text-shadow:0 0 12px rgba(107,33,168,.8);");
  console.log("%cYou opened the console. Curious one, huh.", "font-size:13px;color:#9b8aad;");
  console.log("%cyupbash.vip", "font-size:12px;color:#6b21a8;");
})();
