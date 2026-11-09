# Refonte « Nocturne Chrome » — Plan d'implémentation (phase 1 : vitrine)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** remplacer la vitrine de yupbash.vip par l'expérience « Nocturne Chrome » (une seule page au scroll, chrome liquide WebGL, curseur Mercure, écran ENTER sonore), sans toucher au Case Simulator.

**Architecture :** site statique GitHub Pages, JS vanilla en IIFE qui exposent chacune un espace de noms sur `window` (`BashSite`, `BashChrome`, `BashMercure`, `BashAudio`, `BashHome`, `BashMines`). La sculpture et le curseur sont deux shaders WebGL faits main (repris du prototype validé) ; GSAP ScrollTrigger pilote le parcours ; tout le contenu est dans le HTML.

**Tech Stack :** HTML/CSS/JS vanilla, WebGL 1 (GLSL ES 1.0), Web Audio, GSAP 3.12.5 + ScrollTrigger (cdnjs, SRI), Google Fonts. Tests : Python 3.12 `unittest` + Playwright (déjà installés), Chromium SwiftShader.

**Spec :** `docs/superpowers/specs/2026-11-09-y2k-nocturne-chrome-design.md`

**Prototype de référence (versionné) :** `docs/superpowers/prototypes/nocturne-chrome-hero.html` — shader de sculpture lignes 337–400 (`var FS`), curseur Mercure lignes 403–499 (`var FSC` + module), hero/HUD/CSS au début du fichier. Ignorer les parties Orbite/Étoile/Three.js.

## Global Constraints

- Pas de build, pas de npm, pas de framework ; scripts classiques `defer`, chaque module en IIFE `(function(){ "use strict"; … })();`.
- Seules ressources externes autorisées : GSAP 3.12.5 + ScrollTrigger (balises cdnjs actuelles de `index.html`, mêmes hash SRI) et Google Fonts. La balise CSP de chaque page reste **identique** à l'actuelle.
- Polices : `Anybody` (ital, wdth 50..150, wght 100..900), `Martian Mono` (wdth 75..112.5, wght 300..700), `Chakra Petch` (400, 600, 500i, 600i), `Permanent Marker` (signature uniquement), `display=swap`.
- Couleurs (spec §4.1) : fond `#2b1452` → `#140a29` → `#07050c` ; texte `#f1ecff` ; HUD `rgba(210,196,255,.74)` ; lignes `rgba(196,174,255,.5)` ; gel `#d7c8ff` / `#8a5cff` / `#4b1db8` / `#9a6dff`, ombre `rgba(124,58,237,.55)` ; accent `#cfe2ff`, bord `#7f9cd6`, lueur `rgba(140,185,255,.75)`.
- Palette du chrome (spec §4.2) : ciel `[.10,.05,.24]`, horizon `[.86,.93,1.0]`, sol `[.015,.01,.03]`, contour 1 `[.58,.30,1.0]`, contour 2 `[.55,.75,1.0]`, teinte `[.94,.91,1.0]`.
- Textes du site en anglais, exactement ceux de la spec (§5, §12). Documentation (README) en français.
- Mobile = `max-width: 720px` ; cibles tactiles ≥ 44 px.
- Qualité du chrome : facteur de résolution 0,34 → 0,95 (départ 0,72 ordi / 0,5 mobile), densité de pixels plafonnée à 1,5, 80 pas de raymarching (48 sur mobile), pause si onglet caché.
- Budget : < 700 Ko au premier chargement de `/`.
- `localStorage` : uniquement `bash_v3_entered`, `bash_v3_sfx`, `bash_v3_tilt`, toujours via `BashSite.store` (jamais d'exception).
- « Réduire les animations » : pas d'intro animée, chrome figé (temps = 6,0), pas de traînée/onde du curseur, pas de boutons magnétiques, transitions instantanées.
- Aucun son tant que le visiteur n'a pas choisi ENTER ou activé `SFX`.
- Ne pas modifier `cases/*`, `assets/favicon-anim.js`, `assets/videos/videos.json`, `tools/add-video.py` ; ne supprimer aucune variable existante de `tokens.css`.
- Git : branche `design-v3` ; commits signés `YupBash <mortiez.be@gmail.com>`, **sans** ligne `Co-Authored-By` ; jamais de `push` ni de fusion dans `main` sans accord explicite de YupBash.
- Si le skill `frontend-design` est disponible, le charger avant les tâches de style (2, 6, 8, 9, 10, 12, 14).

## Review Focus

1. **Appareil hybride tactile + souris** (portable tactile, iPad + trackpad) : après un toucher, la goutte Mercure doit disparaître et revenir au prochain mouvement de souris → `test_touch_hides_droplet` (Tâche 4).
2. **Redimensionnement / rotation en cours de scroll** : le canvas suit la nouvelle taille et l'indicateur de section reste juste → `test_resize_updates_canvas` (Tâche 3), `test_resize_mid_scroll` (Tâche 7).
3. **Arrivée directe sur une section** (`/#socials`, anciens liens, retour arrière) : on atterrit sur la bonne section avec le bon état du chrome, sans écran ENTER si déjà vu → `test_deep_link_hash` (Tâche 7), tests de la Tâche 11.
4. **`videos.json` imparfait** (mélange vraies vidéos / provisoires, entrée invalide, titre contenant du HTML, fichier introuvable) : vraies cartes affichées, provisoires en « NO SIGNAL », invalides ignorées, titres en texte brut, section jamais masquée → tests de la Tâche 8.
5. **Stockage local bloqué** (navigation privée) : l'écran ENTER s'affiche à chaque visite, SFX coupés, aucune erreur → `test_store_never_throws` (Tâche 5), `test_storage_blocked` (Tâche 12).

---

## Structure des fichiers

| Fichier | Responsabilité |
|---|---|
| `_config.yml` | Exclut `docs/`, `tests/`, `tools/` du site publié par GitHub Pages |
| `.gitignore` | `tests/_shots/`, `__pycache__/` |
| `tests/harness.py` | Serveur local + Chromium + aides (`open`, `assert_clean`, `shot`) |
| `tests/test_*.py` | Un module de tests par tâche |
| `assets/css/tokens.css` | Variables existantes + nouvelles variables `--nc-*` |
| `assets/css/base.css` | Base vitrine : typo, HUD, boutons, menu, écran ENTER, utilitaires |
| `assets/css/home.css` | Sections de l'accueil (+ démineur restylé) |
| `assets/js/site.js` | `BashSite` : stockage sûr, HUD, menu, écran ENTER + intro, évènement `entered` |
| `assets/js/chrome.js` | `BashChrome` : sculpture (shader), états, qualité adaptative |
| `assets/js/mercure.js` | `BashMercure` : curseur goutte de chrome |
| `assets/js/audio.js` | `BashAudio` : sons synthétisés, bouton SFX |
| `assets/js/minesweeper.js` | `BashMines` : démineur porté depuis `faq/index.html` |
| `assets/js/home.js` | `BashHome` : orchestration de l'accueil (chrome, scroll, vidéos, about, socials, inclinaison) |
| `tools/render-assets.py`, `tools/og.html` | Génération de `assets/chrome-fallback.webp` et `assets/og-image.jpg` |

Ordre des scripts dans `index.html` (tous `defer`, ajoutés au fil des tâches) : `favicon-anim.js`, `site.js`, `gsap.min.js`, `ScrollTrigger.min.js`, `chrome.js`, `mercure.js`, `audio.js`, `minesweeper.js`, `home.js`.

Identifiants partagés (utilisés par les tests) : HUD `#hud`, `#menuBtn`, `#hudClock`, `#hudCoords`, `#hudFps`, `#hudSection`, `#hudProgress`, `#sfxBtn` ; `#chrome` (canvas), `.chrome-fallback` ; sections `#home`, `#videos`, `#about`, `#socials`, `#gamble`, `footer#outro` ; menu `#menu`, `.menu-link` ; écran `#gate`, `#enterBtn`, `#enterSilent`, `#bootLines`.

---

## Phase 1 — Fondations + HOME

### Task 1 : Filet de sécurité et banc de test

**Files :**
- Create : `_config.yml`, `.gitignore`, `tests/__init__.py` (vide), `tests/harness.py`, `tests/test_harness.py`

**Interfaces :**
- Produces (`tests/harness.py`) :
  - `class SiteTestCase(unittest.TestCase)` : `setUpClass` démarre `http.server.ThreadingHTTPServer(("127.0.0.1", 0), …)` servant la racine du repo dans un thread (logs muets ; `extensions_map` forcé : `.js` → `text/javascript`, `.webp` → `image/webp`, `.json` → `application/json`, `.css` → `text/css`) et lance Chromium avec `--use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist` ; `tearDownClass` ferme tout. Attribut `cls.base` (`"http://127.0.0.1:<port>"`).
  - `self.open(path="/", *, mobile=False, reduced_motion=False, entered=True, webgl=True, block=(), storage=True, init_script=None) -> Page` : ordi 1440×900 ; mobile 390×844, `has_touch`, `is_mobile`, `device_scale_factor=3` ; `entered=True` injecte `bash_v3_entered="1"` et `bash_v3_sfx="off"` ; `webgl=False` utilise un second navigateur lancé avec `--disable-3d-apis` ; `block` = sous-chaînes d'URL interrompues (`route.abort()`) ; `storage=False` remplace `localStorage` par un objet dont toutes les méthodes lèvent une exception ; injecte un écouteur `securitypolicyviolation` qui remplit `window.__csp` ; collecte erreurs console et `pageerror` ; attend `load`.
  - `self.assert_clean(page, allow=())` : échoue s'il y a une erreur console, une `pageerror` ou une entrée dans `window.__csp`, sauf messages contenant une sous-chaîne de `allow`.
  - `self.shot(page, name)` : capture dans `tests/_shots/<name>.png`.

- [ ] **Step 1 : Écrire le test de référence** — `tests/test_harness.py::HarnessTest::test_current_home_loads_clean` : `page = self.open("/")` ; `self.assertIn("BASH", page.title())` ; `self.assert_clean(page)`.
- [ ] **Step 2 : Lancer** `python -m unittest tests.test_harness -v` → attendu : ÉCHEC (`ModuleNotFoundError: tests.harness`).
- [ ] **Step 3 : Implémenter `tests/harness.py`** selon l'interface ci-dessus ; créer `_config.yml` (`exclude: [docs, tests, tools]`) et `.gitignore`.
- [ ] **Step 4 : Relancer** → attendu : OK (le site actuel se charge proprement).
- [ ] **Step 5 : Tag de sauvegarde local** `git tag design-v2 4eb7a5d` (ne pas pousser).
- [ ] **Step 6 : Commit** `git add _config.yml .gitignore tests && git commit -m "Add Playwright test harness and exclude dev folders from Pages"`

### Task 2 : Tokens, polices, base CSS et squelette de l'accueil

**Files :**
- Modify : `assets/css/tokens.css` (ajout à la fin), `index.html` (réécrit)
- Create : `assets/css/home.css` ; Rewrite : `assets/css/base.css`
- Delete : `assets/css/videos.css`, `assets/js/videos.js`
- Test : `tests/test_foundation.py`

**Interfaces :**
- Produces : variables CSS `--nc-bg-0:#2b1452; --nc-bg-1:#140a29; --nc-bg-2:#07050c; --nc-ink:#f1ecff; --nc-hud:rgba(210,196,255,.74); --nc-line:rgba(196,174,255,.5); --nc-swoosh:rgba(170,140,255,.32); --nc-accent:#cfe2ff; --nc-accent-edge:#7f9cd6; --nc-accent-glow:rgba(140,185,255,.75); --nc-gel-1:#d7c8ff; --nc-gel-2:#8a5cff; --nc-gel-3:#4b1db8; --nc-gel-4:#9a6dff; --nc-gel-shadow:rgba(124,58,237,.55); --nc-tabfill:rgba(24,12,48,.45); --nc-font-display:"Anybody",system-ui,sans-serif; --nc-font-mono:"Martian Mono",ui-monospace,monospace; --nc-font-body:"Chakra Petch",system-ui,sans-serif; --nc-font-tag:"Permanent Marker",cursive; --nc-ease:cubic-bezier(.2,.8,.2,1);`
- Produces : le DOM de l'accueil avec **tous les textes définitifs** de la spec §5 — HUD (`#hud`, `#menuBtn[aria-controls=menu][aria-expanded=false]`, `#hudClock`, `#hudCoords`, `#hudFps`, `#hudSection`, `#hudProgress > span`, `#sfxBtn[aria-pressed=false]`, réseaux), `<canvas id="chrome" aria-hidden="true">`, les 5 sections et `footer#outro` (le menu `#menu` arrive en Tâche 5, l'écran `#gate` en Tâche 12) ; le hero reprend la structure du prototype (onglet `.tab` « welcome.. », `h1#word.word[aria-label="BASH"]` avec `::` en SVG et couches décoratives `aria-hidden`, `.tagline`, `.meta`, `a.gel[data-magnet][href="#videos"]` « Latest videos » + `>>>`, `a.brk[data-magnet][href="#gamble"]` « Click to gamble », `img.character` = `/assets/character.webp`).
- `index.html` garde : la balise CSP actuelle mot pour mot, referrer, description, canonical, Open Graph/Twitter, icônes, manifest, JSON-LD `Person`, les 2 balises GSAP. Scripts de cette tâche : `favicon-anim.js`, `site.js` (ancien, inoffensif), GSAP.

- [ ] **Step 1 : Écrire les tests** (`tests/test_foundation.py`) :
  - `test_tokens_keep_legacy_variables` : le texte de `tokens.css` contient `--bg:#08070a`, `--purple:#6b21a8`, `--neon:#c98bff`, `--brand-discord:#5865f2` et `--nc-accent:#cfe2ff`.
  - `test_sections_in_order` : `[s.id for s in document.querySelectorAll("#home, #videos, #about, #socials, #gamble, #outro")]` == `["home","videos","about","socials","gamble","outro"]`.
  - `test_copy_is_exact` : `.tagline` == `I can't get myself out of gambling.` ; `.meta` == `Content creator — TikTok / Instagram / Discord` ; `#outro .outro-title` == `Don't miss the next one.` ; `#outro .signature` == `BASH · 2024–2026` ; `#gamble` contient `BASH ADDICTION` et `fake money, real addiction.` et un lien `Open a case` vers `/cases/`.
  - `test_csp_meta_unchanged` : le `content` de la CSP == la chaîne actuelle de `index.html` (à copier telle quelle dans le test).
  - `test_fonts_requested` : l'URL Google Fonts contient `Anybody:ital,wdth,wght`, `Martian+Mono`, `Chakra+Petch`, `Permanent+Marker`.
  - `test_clean_desktop_and_mobile` : `assert_clean` sur `/` en ordi et en mobile.
  - `test_cases_page_still_clean` : `/cases/` se charge sans erreur.
- [ ] **Step 2 : Lancer** `python -m unittest tests.test_foundation -v` → attendu : ÉCHECS (variables absentes, sections manquantes).
- [ ] **Step 3 : Implémenter** tokens, `base.css` (reset, fond dégradé + grain + lignes « swoosh » + horizon, typo, HUD et ses coins/règle/texte vertical, boutons `.gel`/`.brk`, `.sr-only`, réductions d'animation), `home.css` (mise en page des sections, sans animation), `index.html` ; supprimer `videos.css`/`videos.js` et leurs références.
- [ ] **Step 4 : Relancer** → attendu : OK.
- [ ] **Step 5 : Commit** `git commit -am "Rebuild home skeleton with Nocturne Chrome tokens, fonts and base styles"` (+ `git add` des nouveaux fichiers).

### Task 3 : Sculpture de chrome (`chrome.js`)

**Files :** Create `assets/js/chrome.js` ; Modify `index.html` (script `chrome.js`) ; Test `tests/test_chrome.py`

**Interfaces :**
- Produces :
  - `BashChrome.init(canvas: HTMLCanvasElement, opts?: { mobile?: boolean }) -> ChromeController | null` ; sans WebGL : renvoie `null` et ajoute la classe `no-gl` sur `<html>` ; idempotent par canvas (un 2e appel sur le même canvas renvoie le même contrôleur).
  - `ChromeController.setPointer(nx: number, ny: number): void` (0–1 de la fenêtre ; dérive automatique après 2 500 ms sans appel, comme le prototype)
  - `.setState(name: StateName): void` ; `.blend(from: StateName, to: StateName, t: number): void` (t 0–1)
  - `.setTargets(points: Array<{x: number, y: number}>): void` (px fenêtre ; utilisé par l'état `socials`, 3 points)
  - `.setIntro(k: number): void` (0 → 1 : la sculpture grandit depuis une goutte ; 1 = normal)
  - `.pause(paused: boolean): void`
  - `.stats(): { frames: number, fps: number, scale: number, state: string }` — `state` vaut le nom de l'état, ou `"a>b"` pendant un `blend` avec 0 < t < 1
  - `.debugSample(nx: number, ny: number): [number, number, number, number]` (rend une image puis lit le pixel RGBA 0–255)
  - `StateName = "home" | "videos" | "about" | "socials" | "gamble" | "outro"`

**Algorithme (repris du prototype, à étendre) :**
- Shader de sculpture du prototype avec : `uniform vec4 uB[5]` (xyz + rayon, unités locales ; rayon < 0,01 = goutte ignorée), `uniform vec4 uRing` (rayon, épaisseur, inclinaison, visibilité), `uniform float uArm` (0–1, longueur du bras vers le pointeur), `uniform float uChip` (0–1), `uniform vec3 uCenter` (x, y, échelle), palette fixe ; `#define STEPS 80` (48 si `opts.mobile`).
- Mouvement des gouttes (JS, à chaque image) : `pos_i = base_i + wob × (expression de mouvement de la goutte i du prototype)`, temps `t = uTime × 0,32` comme le prototype.
- Jeton de casino (morph `d = mix(dGouttes, dJeton, uChip)`) :

```glsl
float sdChip(vec3 p){                 // p en unités locales
  p.xz = rot(uTime*.6) * p.xz;        // pièce qui tourne sur l'axe vertical
  p.yz = rot(1.5708) * p.yz;          // face vers la caméra
  float notch = step(.5, fract(atan(p.z, p.x) * 12. / 6.2831853)) * .06;
  vec2 d = vec2(length(p.xz) - (.95 - notch), abs(p.y) - .12);
  return min(max(d.x, d.y), 0.) + length(max(d, 0.)) - .04;
}
```

- Table des états (position en fraction de la demi-largeur `fx` et de la demi-hauteur `fy`, +haut ; demi-hauteur de scène = 1,25 ; `cx = fx × 1,25 × aspect`, `cy = fy × 1,25`). `wob` = amplitude du mouvement. Les valeurs « mobile » s'appliquent quand `aspect < 1,1`. Valeurs de départ, à ajuster visuellement en respectant l'intention de la spec §5.

| État | fx, fy, échelle (mobile) | Gouttes : base (x,y,z) rayon | wob | Anneau (r, ép., incl., vis.) | Bras | Jeton |
|---|---|---|---|---|---|---|
| home | .32, .18, .64 (0, .40, .50) | (0,0,0) .66 · (0,0,0) .46 · (0,0,0) .40 · (0,0,.1) .26 · (0,−.75,.2) .30 | 1 | 1.12, .075, .95, 1 | 1 | 0 |
| videos | 0, .30, .45 (0, .45, .38) | toutes (0,0,0) : .50 · .35 · .30 · .20 · .20 | .5 | 1.9, .05, 1.35, 1 | .5 | 0 |
| about | 0, 0, .50 (0, .75, .40) | (−2.7,.9,0) .30 · (−2.5,−.8,0) .22 · (2.7,.6,0) .28 · (2.6,−1,0) .20 · (0,0,0) 0 — mobile : (−1.4,0,0) .30 · (1.4,.1,0) .26 · (0,.3,0) .20 · deux à 0 | .35 | 0 | 0 | 0 |
| socials | 0, 0, .50 | 3 gouttes rayon .42 aux points de `setTargets` (convertis en unités locales), deux à 0 | .15 | 0 | 0 | 0 |
| gamble | .35, .10, .62 (0, .45, .50) | toutes (0,0,0) : .55 · .40 · .35 · .20 · .20 | .2 | 0 | .3 | 1 |
| outro | 0, −.35, .35 | (0,0,0) .45, les autres 0 | .3 | 0 | 0 | 0 |

- `blend` interpole linéairement chaque nombre (bases, rayons, anneau, bras, jeton, centre, échelle).
- Qualité adaptative, pause et réduction d'animation : comme le prototype + Global Constraints.

- [ ] **Step 1 : Écrire les tests** (`tests/test_chrome.py` ; chaque test crée son propre `<canvas>` plein écran via `page.evaluate` et appelle `BashChrome.init`) :
  - `test_home_draws_behind_character` : état `home` → `debugSample(0.66, 0.40)[3] > 200` et `debugSample(0.05, 0.95)[3] < 10`.
  - `test_about_keeps_reading_column_clear` : état `about` → `debugSample(0.5, 0.5)[3] < 10`.
  - `test_socials_follows_targets` : `setTargets([{x:360,y:450},{x:720,y:450},{x:1080,y:450}])`, état `socials` → alpha > 200 aux 3 points.
  - `test_gamble_shows_chip` : état `gamble` → alpha > 200 en (0.675, 0.45).
  - `test_blend_midpoint_differs` : `blend("home","gamble",0.5)` → `stats().state` == `"home>gamble"` et l'échantillon en (0.66, 0.40) diffère de ceux des deux états purs.
  - `test_no_webgl_returns_null` (`webgl=False`) : `BashChrome.init(c) === null` et `<html>` a la classe `no-gl`.
  - `test_reduced_motion_is_frozen` : deux `debugSample(0.66, 0.40)` à 500 ms d'écart sont identiques.
  - `test_resize_updates_canvas` : après passage de 1440×900 à 390×844, `canvas.width` == `round(390 × min(dpr, 1.5) × stats().scale)` à ±2 près.
  - `test_scale_within_bounds` : `0.34 <= stats().scale <= 0.95`.
- [ ] **Step 2 : Lancer** `python -m unittest tests.test_chrome -v` → attendu : ÉCHEC (`BashChrome` non défini).
- [ ] **Step 3 : Implémenter `chrome.js`** (interface + algorithme ci-dessus) ; ajouter la balise script dans `index.html`.
- [ ] **Step 4 : Relancer** → attendu : OK.
- [ ] **Step 5 : Commit** `git commit -m "Add hand-written liquid chrome sculpture with section states"`

### Task 4 : Curseur Mercure (`mercure.js`)

**Files :** Create `assets/js/mercure.js` ; Modify `base.css` (`html.has-mercure, html.has-mercure * { cursor: none !important }`), `index.html` (script) ; Test `tests/test_mercure.py`

**Interfaces :**
- Produces : `BashMercure.init(opts?: { selector?: string }) -> MercureController | null` (idempotent : un 2e appel renvoie le même contrôleur) ; sélecteur par défaut `a[href], button, summary, [role="button"], [data-magnet]`. Renvoie `null` (et ne masque pas le curseur système) si `(pointer: fine)` est faux ou sans WebGL ; sinon ajoute `has-mercure` sur `<html>`.
- `MercureController.state(): { visible: boolean, wrap: number, target: Element | null, ripple: number }` (`ripple` : 0 → 1 pendant l'onde, 1 au repos) ; `.destroy(): void`.
- Comportement (spec §6.1, code du prototype) : rayon 9,5 px ; traînée 0,42 / 0,36 / 0,30 / 0,26 ; anneau autour de la cible avec 6 px de marge ; onde 450 ms ; liseré sombre ; scissor. Ajouts : **focus clavier** (`focusin` sur une cible qui matche `:focus-visible` → anneau autour de `document.activeElement`) ; **toucher** (`pointerdown` avec `pointerType === "touch"` → `visible = false` jusqu'au prochain `pointermove` souris) ; **réduction d'animation** (pas de traînée, pas d'onde, anneau instantané).
- Initialisation sur le site : appelée par `site.js` (Tâche 5) ; ici, les tests l'appellent directement.

- [ ] **Step 1 : Écrire les tests** (`tests/test_mercure.py`) :
  - `test_activates_on_fine_pointer` : ordi → `init()` non nul, `<html>` a `has-mercure`.
  - `test_inactive_on_touch_device` : mobile → `init()` est `null`, pas de `has-mercure`.
  - `test_hover_wraps_then_unwraps` : souris au centre de `.gel` → après 700 ms `wrap > 0.9` et `target` est `.gel` ; souris à (760, 760) → après 900 ms `wrap < 0.1`.
  - `test_click_ripple` : `mouse.down()` → `ripple < 1` ; 600 ms plus tard `ripple == 1`.
  - `test_keyboard_focus_wraps` : `Tab` jusqu'au premier lien du hero → `target` est `document.activeElement`.
  - `test_touch_hides_droplet` : `pointerdown` synthétique `pointerType: "touch"` → `visible == false` ; puis `mouse.move` → `visible == true`.
  - `test_no_webgl_no_mercure` (`webgl=False`) : `init()` est `null`, pas de `has-mercure`.
- [ ] **Step 2 : Lancer** `python -m unittest tests.test_mercure -v` → attendu : ÉCHEC.
- [ ] **Step 3 : Implémenter `mercure.js`.**
- [ ] **Step 4 : Relancer** → attendu : OK.
- [ ] **Step 5 : Commit** `git commit -m "Add Mercure liquid-chrome cursor with keyboard and touch handling"`

### Task 5 : Coquille commune (`site.js` réécrit) : stockage, HUD, menu

**Files :** Rewrite `assets/js/site.js` ; Modify `index.html` (overlay `#menu[role=dialog][aria-modal=true][aria-label=Menu]` avec 5 `.menu-link` « 01 HOME » … « 05 GAMBLE » vers `#home` … `#gamble` + un lien « Case simulator ↗ » vers `/cases/`), `base.css` (menu plein écran, balayage de chrome à l'ouverture) ; Test `tests/test_shell.py`

**Interfaces :**
- Produces :
  - `BashSite.reduced: boolean`, `BashSite.fine: boolean`
  - `BashSite.store.get(key: string): string | null` et `.set(key: string, value: string): void` — ne lèvent jamais d'exception.
  - `BashSite.hud.setSection(index: number, name: string, progress: number): void` → `#hudSection` = `"0" + index + " / 05 — " + name`, `#hudProgress > span` en `transform: scaleX(progress)`.
  - `BashSite.menu.open()`, `.close()`, `.isOpen(): boolean`
  - `BashSite.on(event: "entered", fn: (detail: { sound: boolean }) => void): void` — déclenché une seule fois ; si déjà passé, appel asynchrone immédiat. Tant que `#gate` n'existe pas (avant la Tâche 12), « entered » se déclenche au chargement avec `sound: false`.
  - `BashSite._enter(sound: boolean): void` (interne, utilisé par la Tâche 12).
- Aussi : variable `--vh`, horloge `HH:MM:SS` (1 s), coordonnées `X 0000 · Y 0000`, initialisation de `BashMercure` s'il existe, message console restylé.
- Menu : ouvert → `html.menu-open`, focus sur le 1er lien, focus piégé dans le menu ; Échap ou second clic → fermé, focus rendu à `#menuBtn` ; clic sur un lien → fermeture puis défilement vers la section (doux, sauf réduction d'animation).

- [ ] **Step 1 : Écrire les tests** (`tests/test_shell.py`) :
  - `test_store_never_throws` (`storage=False`) : `BashSite.store.set("a","1")` ne lève rien ; `get("a")` est `null`.
  - `test_menu_open_close_escape` : clic `#menuBtn` → `aria-expanded == "true"`, `html.menu-open`, focus dans `#menu` ; `Escape` → fermé, focus sur `#menuBtn`.
  - `test_menu_link_scrolls` : ouvrir, cliquer « 03 ABOUT » → 1,5 s plus tard `|#about.getBoundingClientRect().top| < 80`.
  - `test_hud_clock_format` : `#hudClock` correspond à `^\d\d:\d\d:\d\d$`.
  - `test_hud_set_section` : `BashSite.hud.setSection(3, "ABOUT", 0.5)` → `#hudSection` == `03 / 05 — ABOUT`, transform de `#hudProgress > span` == `matrix(0.5, 0, 0, 1, 0, 0)`.
  - `test_entered_fires_without_gate` : une promesse sur `BashSite.on("entered")` se résout avec `{sound: false}` en moins de 500 ms.
- [ ] **Step 2 : Lancer** `python -m unittest tests.test_shell -v` → attendu : ÉCHEC.
- [ ] **Step 3 : Implémenter.**
- [ ] **Step 4 : Relancer** `tests.test_shell` puis `tests.test_mercure` → attendu : OK.
- [ ] **Step 5 : Commit** `git commit -m "Rewrite shared shell: safe storage, live HUD and HUD menu"`

### Task 6 : Hero HOME complet (`home.js`, 1re version)

**Files :** Create `assets/js/home.js` ; Modify `home.css` (hero : perso devant le mot, chrome derrière, mot BASH chromé du prototype avec l'accent à 86 %), `index.html` (script) ; Test `tests/test_hero.py`

**Interfaces :**
- Consumes : `BashChrome.init`, `BashSite.on("entered")`, `BashSite.reduced`, `BashSite.fine`.
- Produces : `BashHome.chrome: ChromeController | null` ; `BashHome.section(): string` (id de la section courante, `"home"` pour l'instant).
- Comportement : à `entered`, init du chrome sur `#chrome` (état `home`) ; le pointeur alimente `setPointer` ; reflet du mot via `--mx/--my` sur `#word` ; easter egg du perso (5 clics en 2,5 s sur un pixel opaque → bulle `.character-bubble` avec l'un de : `Stop that.`, `Bro, stop.`, `Alright, Don't do that.`, `Hey!`) ; boutons magnétiques `[data-magnet]` : décalage max 6 px quand le pointeur est à moins de 80 px du bord, désactivé sur pointeur grossier et en réduction d'animation.

- [ ] **Step 1 : Écrire les tests** (`tests/test_hero.py`) :
  - `test_wordmark_accessible_name` : `get_by_role("heading", name="BASH")` visible.
  - `test_hero_chrome_running` : après 1 s, `BashHome.chrome.stats().frames > 10` et `.state == "home"`.
  - `test_character_poke_bubble` : 5 clics au centre du torse de `.character` → `.character-bubble` contient l'un des 4 messages.
  - `test_magnetic_button_moves` : souris 40 px à gauche de `.gel` → translation X de `.gel` entre −6 et −1 px ; en `reduced_motion` → 0.
  - `test_specular_follows_pointer` : deux positions de souris → deux valeurs différentes de `--mx` sur `#word`.
  - `test_hero_screenshots` : captures `hero-desktop`, `hero-mobile` + `assert_clean`.
- [ ] **Step 2 : Lancer** `python -m unittest tests.test_hero -v` → attendu : ÉCHEC.
- [ ] **Step 3 : Implémenter.**
- [ ] **Step 4 : Relancer** → attendu : OK.
- [ ] **Step 5 : Commit** `git commit -m "Complete the HOME hero: chrome, wordmark, character easter egg, magnetic buttons"`

> **Checkpoint phase 1 :** montrer `tests/_shots/hero-desktop.png` et `hero-mobile.png` à YupBash (+ test local `python -m http.server 8000`) ; attendre son accord avant la phase 2.

---

## Phase 2 — Le parcours au scroll

### Task 7 : Chorégraphie au scroll + indicateur de section

**Files :** Modify `assets/js/home.js` (module scroll), `home.css` ; Test `tests/test_scroll.py`

**Interfaces :**
- Consumes : `ChromeController.blend/setState`, `BashSite.hud.setSection`, `BashAudio.play` s'il existe (`"whoosh"` au changement de section).
- Produces : `html[data-section]` = id courant ; `BashHome.section()` à jour. Noms HUD : `HOME`, `VIDEOS`, `ABOUT`, `SOCIALS`, `GAMBLE` (le pied de page garde `05 / 05 — GAMBLE`, progression 1).
- Avec GSAP : une ScrollTrigger par section (section courante = celle qui contient le milieu de l'écran) ; `blend(état_i, état_i+1, t)` avec `scrub` entre 60 % de la section i et 20 % de la section i+1 ; sortie du hero (`--hp` 0 → 1 : mot qui grossit/floute/s'efface, perso qui glisse, comme `videos.css` actuel). Sans GSAP : classe `no-gsap` sur `<html>`, IntersectionObserver → `setSection` + `setState(id)`. Ancre dans l'URL au chargement (`/#socials`) : défilement vers la section après `entered`.

- **Fond évolutif (ajout du 2026-11-09, spec §5 « Fond évolutif »)** : `.backdrop` est piloté par des variables CSS mises à jour avec la même position lissée que le chrome : `--bd-x`, `--bd-y`, `--bd-w`, `--bd-h` (%), `--bd-c0`, `--bd-c1`, `--bd-c2` (triplets « r g b »), halo secondaire `--bd-g2x`, `--bd-g2y`, `--bd-g2w`, `--bd-g2h`, `--bd-g2c`, `--bd-g2a`, horizon `--bd-hz-y` (%), `--bd-hz-a`, lignes `--bd-sw-a`. Ambiances (valeurs de départ, ajustables à l'œil) :

| id | x, y, w, h | c0 · c1 · c2 | halo x, y, w, h · couleur · alpha | horizon y · alpha | lignes |
|---|---|---|---|---|---|
| home | 66, 40, 55, 65 | 43 20 82 · 20 10 41 · 7 5 12 | 50, 100, 40, 35 · 107 33 168 · 0 | 71 · .9 | 1 |
| videos | 50, 30, 70, 60 | 27 26 92 · 12 10 38 · 5 5 14 | 50, 78, 60, 30 · 127 156 214 · .18 | 62 · 1 | .8 |
| about | 50, 18, 60, 45 | 36 22 66 · 14 9 28 · 6 5 11 | 50, 100, 40, 35 · 107 33 168 · 0 | 88 · .35 | .45 |
| socials | 50, 55, 75, 60 | 52 22 96 · 18 9 40 · 7 5 12 | 50, 60, 70, 40 · 88 101 242 · .14 | 74 · .8 | .9 |
| gamble | 64, 52, 60, 70 | 74 16 72 · 26 8 30 · 8 4 10 | 50, 105, 70, 40 · 228 174 57 · .16 | 80 · .6 | .7 |
| outro | 50, 100, 50, 40 | 30 14 56 · 10 6 20 · 5 4 8 | 50, 100, 40, 35 · 107 33 168 · 0 | 96 · .25 | .3 |

- Produces aussi : `BashHome.position(): { from: string, to: string, t: number }` (position lissée utilisée par le chrome et le fond).

- [ ] **Step 1 : Écrire les tests** (`tests/test_scroll.py`) :
  - `test_backdrop_follows_sections` : au centre de `#about` puis de `#gamble`, `--bd-c0` de `.backdrop` == `36 22 66` puis `74 16 72`.
  - `test_backdrop_blends_between_sections` : au milieu d'une zone de transition HOME → VIDEOS, la composante rouge de `--bd-c0` est strictement entre 27 et 43.
  - `test_indicator_follows_scroll` : pour chaque section i, `scrollIntoView` puis 600 ms → `#hudSection` == `0i / 05 — NOM`, `html[data-section]` == id, et `BashHome.chrome.stats().state` == id (défilement arrêté au centre de la section).
  - `test_no_gsap_fallback` (`block=("cdnjs.cloudflare.com",)`) : `html.no-gsap` ; défilement jusqu'à `#socials` → `04 / 05 — SOCIALS` ; `assert_clean(page, allow=("cdnjs",))`.
  - `test_resize_mid_scroll` : sur `#about` en 1440×900, passage en 390×844 → indicateur toujours `03 / 05 — ABOUT`.
  - `test_deep_link_hash` : ouverture de `/#socials` → `04 / 05 — SOCIALS` en moins de 1,5 s.
- [ ] **Step 2 : Lancer** `python -m unittest tests.test_scroll -v` → attendu : ÉCHEC.
- [ ] **Step 3 : Implémenter.**
- [ ] **Step 4 : Relancer** → attendu : OK.
- [ ] **Step 5 : Commit** `git commit -m "Add scroll choreography driving chrome states and HUD section indicator"`

### Task 8 : LATEST VIDEOS

**Files :** Modify `home.js` (module vidéos), `home.css`, `index.html` (`#videos` : `.vids` > `#vidsRing`) ; Test `tests/test_videos.py`

**Interfaces :**
- Lit `/assets/videos/videos.json` (format inchangé). Entrée **réelle** = objet sans `placeholder: true`, avec `url` commençant par `https://www.tiktok.com/` et `thumb` non vide ; au plus 8. Entrée `placeholder: true` → carte NO SIGNAL. Toute autre entrée est ignorée. Complément jusqu'à 6 cartes minimum avec des cartes NO SIGNAL. Échec du fetch → 6 cartes NO SIGNAL (la section reste visible).
- Carte réelle : `a.vid-card[href=url][target=_blank][rel=noopener]` > `img[src=thumb][alt=""][loading=lazy]` + `.vid-title` (via `textContent`) + `.vid-cta` « Watch on TikTok → ».
- Carte NO SIGNAL : `a.vid-card.is-nosignal[href="https://www.tiktok.com/@yupbash"]`, sans image, `.vid-title` « NO SIGNAL — first drop soon », `.vid-cta` « Follow on TikTok », lignes de balayage + neige légère en CSS.
- Carrousel 3D : logique de l'ancien `videos.js` (`init3D`, à reprendre depuis `git show 4eb7a5d:assets/js/videos.js`), rotation pilotée par la ScrollTrigger de la section, anneau CSS incliné `rotateX(-10deg)` pour faire écho à l'anneau de chrome. Réduction d'animation ou `no-gsap` → `.vids.is-grid`.

- [ ] **Step 1 : Écrire les tests** (`tests/test_videos.py`) :
  - `test_placeholders_render_as_nosignal` : avec le `videos.json` actuel → 6 `.vid-card.is-nosignal`, texte `NO SIGNAL — first drop soon`, `href` `https://www.tiktok.com/@yupbash`, aucune `img`.
  - `test_real_entries_render_thumbnails` : `page.route` sert `[{"url":"https://www.tiktok.com/@yupbash/video/1","thumb":"/assets/character.webp","title":"First"},{"url":"https://www.tiktok.com/@yupbash/video/2","thumb":"/assets/character.webp","title":"Second"},{"placeholder":true,"url":"https://www.tiktok.com/@yupbash","thumb":"/assets/og-image.jpg","title":"New video"},{"title":"broken"}]` → 2 cartes réelles (img, titres `First`, `Second`) puis 4 NO SIGNAL (6 au total).
  - `test_titles_are_text` : titre `<img src=x onerror=alert(1)>` → affiché en texte ; aucune `img[src="x"]` dans la page.
  - `test_fetch_failure_keeps_section` : `videos.json` interrompu → `#videos` visible, 6 cartes NO SIGNAL ; `assert_clean(page, allow=("videos.json",))`.
  - `test_reduced_motion_grid` : `reduced_motion=True` → `.vids` a la classe `is-grid`.
- [ ] **Step 2 : Lancer** `python -m unittest tests.test_videos -v` → attendu : ÉCHEC.
- [ ] **Step 3 : Implémenter.**
- [ ] **Step 4 : Relancer** → attendu : OK.
- [ ] **Step 5 : Commit** `git commit -m "Add Latest videos carousel on the chrome ring with NO SIGNAL cards"`

### Task 9 : ABOUT & SETUP, FAQ et démineur

**Files :** Create `assets/js/minesweeper.js` ; Modify `index.html` (`#about` : `.profile-card` avec `/assets/faq-character.webp`, `.spec-sheet`, `.faq` à 6 `details.faq-item`, déclencheur `#bombTrigger`, overlay `#msOverlay` repris de `faq/index.html` lignes 419–441 ; JSON-LD `FAQPage` dans le `<head>` ; script `minesweeper.js`), `home.css` (styles + démineur restylé HUD), `home.js` (valeurs de la fiche qui défilent à l'entrée, ligne de scan sur la fiche perso) ; Test `tests/test_about.py`

**Interfaces :**
- Produces : `BashMines.open(): void`, `BashMines.close(): void` — comportement identique au script de `faq/index.html` lignes 462–645 (taille de grille, drapeaux, reset, statut) ; `#bombTrigger` (`role=button`, `tabindex=0`) ouvre au clic, à Entrée et à Espace ; Échap et `#msClose` ferment.
- Textes exacts :
  - Fiche : `BASH · 21 · Belgium` et `Some random dude, idk.`
  - Fiche technique (libellé → valeur) : `Processor` → `Ryzen 7 5800X` ; `Memory` → `32 GB RAM` ; `Graphics Card` → `RX 9070 XT` ; `Mouse` → `WLMOUSE Beast X` ; `Keyboard` → `Gravastar Mercury V60 Pro`.
  - FAQ (question → réponse) : `Who are you?` → `Some random dude, idk. 💣` ; `Where can I follow you?` → `Discord, TikTok and Instagram are up in the top right, and in the Socials section below.` (seul changement de texte : il n'y a plus de page Socials) ; `How often do you post?` → `Im too lazy to start :p` ; `About me` → `I'm 21 and I'm from Belgium.` ; `How can I contact you?` → `yupbash@gmail.com` (lien `mailto:`) ; `What gear do you use?` → la liste des 5 composants ci-dessus.

- [ ] **Step 1 : Écrire les tests** (`tests/test_about.py`) :
  - `test_faq_questions_exact` : les 6 `summary`, dans l'ordre, == la liste ci-dessus.
  - `test_faq_answers_exact` : texte normalisé de chaque réponse == la liste ci-dessus (le 💣 compris pour la 1re).
  - `test_faq_jsonld` : un JSON-LD `@type: "FAQPage"` avec 6 `mainEntity` dont les `name` == les 6 questions et un `acceptedAnswer.text` non vide.
  - `test_spec_sheet_values` : les 5 paires libellé/valeur exactes.
  - `test_profile_card_copy` : `.profile-card` contient les deux textes.
  - `test_minesweeper_opens_and_plays` : clic sur 💣 → `#msOverlay.open` ; clic sur une case → au moins une `.ms-cell.revealed` ; `Escape` → fermé.
  - `test_bomb_keyboard` : focus sur `#bombTrigger` + `Enter` → `#msOverlay.open`.
- [ ] **Step 2 : Lancer** `python -m unittest tests.test_about -v` → attendu : ÉCHEC.
- [ ] **Step 3 : Implémenter.**
- [ ] **Step 4 : Relancer** → attendu : OK.
- [ ] **Step 5 : Commit** `git commit -m "Add About and Setup section with FAQ, spec sheet and minesweeper"`

### Task 10 : SOCIALS & CONTACT, CLICK TO GAMBLE, fin

**Files :** Modify `index.html`, `home.css`, `home.js` ; Test `tests/test_socials_gamble.py`

**Interfaces :**
- Consumes : `ChromeController.setTargets` (centres des 3 boutons, recalculés au resize et au scroll).
- `#socials` : 3 `a.social-big[data-brand][target=_blank][rel=noopener][data-magnet]` — Discord `https://discordapp.com/users/852685497108267019`, TikTok `https://www.tiktok.com/@yupbash`, Instagram `https://www.instagram.com/yupbash` ; reflet de marque au survol (`--brand-discord`, `--brand-tiktok`/`--brand-tiktok-2`, `--brand-instagram`). Contact : `#emailText` `yupbash@gmail.com` + bouton `#copyEmail` ; succès → toast `#toast` « COPIED ✓ » (2 s) ; presse-papiers refusé → sélection du texte de `#emailText` + toast « yupbash@gmail.com », sans exception.
- `#gamble` : titre `BASH ADDICTION`, sous-titre `fake money, real addiction.`, `a.gel[href="/cases/"]` « Open a case » + `>>>`.
- `#outro` : `.outro-title` `Don't miss the next one.`, les 3 réseaux, `.signature` `BASH · 2024–2026` en `--nc-font-tag`.

- [ ] **Step 1 : Écrire les tests** (`tests/test_socials_gamble.py`) :
  - `test_social_links_exact` : 3 `.social-big` avec les `href` exacts, `target=_blank`, `rel` contenant `noopener`.
  - `test_copy_email` (permissions `clipboard-read`, `clipboard-write`) : clic `#copyEmail` → `navigator.clipboard.readText()` == `yupbash@gmail.com` et `#toast` contient `COPIED ✓`.
  - `test_copy_email_denied` : `navigator.clipboard.writeText` remplacé par une promesse rejetée → aucune `pageerror`, `#toast` contient `yupbash@gmail.com`.
  - `test_chrome_follows_social_buttons` : défilement sur `#socials`, 1,2 s → `BashHome.chrome.debugSample` au centre de chaque `.social-big` (en fraction de fenêtre) a un alpha > 200.
  - `test_gamble_teaser` : textes exacts + lien `/cases/`.
  - `test_outro_signature` : textes exacts ; `getComputedStyle(.signature).fontFamily` contient `Permanent Marker`.
- [ ] **Step 2 : Lancer** `python -m unittest tests.test_socials_gamble -v` → attendu : ÉCHEC.
- [ ] **Step 3 : Implémenter.**
- [ ] **Step 4 : Relancer** → attendu : OK.
- [ ] **Step 5 : Commit** `git commit -m "Add Socials and Contact, Click to gamble teaser and outro"`

### Task 11 : Redirections `/socials/` et `/faq/` + sitemap

**Files :** Rewrite `socials/index.html`, `faq/index.html`, `sitemap.xml` ; Test `tests/test_redirects.py`

**Interfaces :**
- Chaque page : `<!DOCTYPE html>`, `lang="en"`, `charset`, **la même balise CSP que la page actuelle**, `<meta name="robots" content="noindex">`, `<link rel="canonical" href="https://yupbash.vip/">`, `<meta http-equiv="refresh" content="0; url=/#socials">` (resp. `/#about`), `<title>BASH</title>`, script en ligne `location.replace("/#socials")`, et un lien visible « Continue to BASH → ».
- `sitemap.xml` : une seule entrée `https://yupbash.vip/`.

- [ ] **Step 1 : Écrire les tests** (`tests/test_redirects.py`) :
  - `test_socials_redirects` : `/socials/` → URL finale se terminant par `/#socials` ; `#hudSection` == `04 / 05 — SOCIALS`.
  - `test_faq_redirects` : `/faq/` → `/#about` ; `03 / 05 — ABOUT`.
  - `test_redirect_pages_noindex` : le HTML brut des deux pages contient `noindex` et le canonical.
  - `test_sitemap_only_home` : exactement une `<loc>` == `https://yupbash.vip/`.
- [ ] **Step 2 : Lancer** `python -m unittest tests.test_redirects -v` → attendu : ÉCHEC.
- [ ] **Step 3 : Implémenter.**
- [ ] **Step 4 : Relancer** puis toute la suite `python -m unittest discover -s tests -v` → attendu : OK.
- [ ] **Step 5 : Commit** `git commit -m "Turn /socials/ and /faq/ into redirects to their home sections"`

> **Checkpoint phase 2 :** captures de chaque section (ordi + mobile) à YupBash ; attendre son accord.

---

## Phase 3 — Extras

### Task 12 : Écran ENTER, intro sonore et `audio.js`

**Files :** Create `assets/js/audio.js` ; Modify `index.html` (`#gate` : onglet « welcome.. », `button#enterBtn` « ENTER ▸ », `button#enterSilent` « enter silently », `#bootLines` ; script `audio.js` ; bouton `#sfxBtn` actif), `base.css` (écran + intro), `site.js` (déroulé), `home.js` (à `entered`, `chrome.setIntro`) ; Test `tests/test_gate_audio.py`

**Interfaces :**
- Produces : `BashAudio.unlock(): Promise<void>` (crée/relance l'`AudioContext`, à appeler dans un geste) ; `.setEnabled(on: boolean): void` (enregistre `bash_v3_sfx` = `"on"`/`"off"`) ; `.enabled: boolean` ; `.context: AudioContext | null` ; `.play(name): void` (sans effet si coupé ou contexte inactif).
- Sons (gain maître 0,6) :

| nom | recette |
|---|---|
| `tick` | triangle 2 200 Hz, attaque 2 ms, déclin 30 ms, gain 0,035 (max 1 toutes les 60 ms, au survol des cibles Mercure) |
| `bloop` | sinus 420 → 150 Hz (exponentiel, 140 ms), gain 0,07 (au clic) |
| `whoosh` | bruit blanc → passe-bande Q 1,2 balayé 400 → 1 800 Hz sur 320 ms, gain 0,045 (changement de section) |
| `boot-tick` | carré 1 600 Hz, 18 ms, gain 0,025 |
| `boot-rise` | 2 dents de scie 220 et 222 Hz → passe-bas 300 → 2 400 Hz sur 600 ms, gain 0,04 |
| `boot-drop` | sinus 320 → 90 Hz sur 220 ms, gain 0,08 |
| `boot-bass` | sinus 55 Hz + 110 Hz (×0,5), attaque 20 ms, déclin 700 ms, gain 0,12 |

- Déroulé (dans `site.js`) : si `bash_v3_entered == "1"` → `#gate` retiré tout de suite, `entered` avec `sound = (bash_v3_sfx == "on")`. Sinon : `#gate` visible, contenu principal `inert`, focus sur `#enterBtn` ; Entrée = ENTER, Échap = silencieux. ENTER : `unlock()` → `setEnabled(true)` → `BashHome.requestTilt()` s'il existe → intro → `bash_v3_entered = "1"` → `entered {sound: true}`. Silencieux : même intro sans son, `setEnabled(false)`. Intro (≈ 2 s) : 0–400 ms coins tracés + `boot-rise` ; 300–1 300 ms les 5 lignes de la spec §12 (une toutes les 200 ms, `boot-tick` chacune) ; 1 300–1 700 ms `chrome.setIntro` 0 → 1 (ease-out-back) + `boot-drop` ; 1 700–2 000 ms l'écran s'efface + `boot-bass`. Un clic ou une touche pendant l'intro → fin immédiate. Réduction d'animation : écran statique, pas d'intro, révélation immédiate.
- `#sfxBtn` : bascule `setEnabled`, `aria-pressed`, libellé `SFX ON`/`SFX OFF`.

- [ ] **Step 1 : Écrire les tests** (`tests/test_gate_audio.py`, `entered=False` sauf mention) :
  - `test_first_visit_shows_gate` : `#gate` visible, focus sur `#enterBtn`, `main` a l'attribut `inert`.
  - `test_enter_with_sound` : clic `#enterBtn` → `#gate` absent en moins de 3,5 s ; `bash_v3_entered == "1"`, `bash_v3_sfx == "on"` ; `BashAudio.enabled === true` ; `BashAudio.context.state == "running"` ; `#bootLines` contient les 5 lignes exactes.
  - `test_enter_silently` : clic `#enterSilent` → `bash_v3_sfx == "off"`, `BashAudio.enabled === false`.
  - `test_escape_is_silent` : `Escape` → identique au silencieux.
  - `test_second_visit_skips_gate` : après ENTER, rechargement → pas de `#gate` après 300 ms.
  - `test_skip_intro_on_click` : ENTER puis clic 300 ms après → `#gate` absent en moins de 600 ms.
  - `test_storage_blocked` (`storage=False`) : écran visible ; silencieux → aucune erreur ; rechargement → écran de nouveau visible.
  - `test_sfx_toggle_persists` (`entered=True`) : clic `#sfxBtn` → `aria-pressed == "true"`, `bash_v3_sfx == "on"` ; rechargement → `aria-pressed == "true"`.
  - `test_reduced_motion_gate_static` (`reduced_motion=True`) : écran visible ; ENTER → `#gate` absent en moins de 300 ms.
- [ ] **Step 2 : Lancer** `python -m unittest tests.test_gate_audio -v` → attendu : ÉCHEC.
- [ ] **Step 3 : Implémenter.**
- [ ] **Step 4 : Relancer** `tests.test_gate_audio` puis `tests.test_shell` → attendu : OK.
- [ ] **Step 5 : Commit** `git commit -m "Add PRESS START gate with sound-designed boot intro and SFX toggle"`

### Task 13 : Inclinaison du téléphone

**Files :** Modify `home.js` ; Test `tests/test_tilt.py`

**Interfaces :**
- Produces : `BashHome.requestTilt(): Promise<"granted" | "denied" | "unsupported">` (appelle `DeviceOrientationEvent.requestPermission` s'il existe, enregistre `bash_v3_tilt`) ; `BashHome.tilt(): { nx: number, ny: number } | null` (dernière valeur appliquée).
- Seulement si `!BashSite.fine`. `deviceorientation` → `nx = clamp(0.5 + gamma / 90, 0, 1)`, `ny = clamp(0.5 + (beta − 45) / 90, 0, 1)` → `chrome.setPointer(nx, ny)` + parallaxe du perso. Visites suivantes sur iPhone : au premier `touchend`, si `bash_v3_tilt == "granted"` et `requestPermission` existe → nouvel appel (silencieux) puis écoute.

- [ ] **Step 1 : Écrire les tests** (`tests/test_tilt.py`) :
  - `test_tilt_moves_pointer` (mobile) : évènement `deviceorientation` `beta: 45, gamma: 30` → `BashHome.tilt()` ≈ `{nx: 0.833, ny: 0.5}` (±0,01).
  - `test_ios_permission_on_enter` (mobile, `entered=False`, `init_script` définissant `DeviceOrientationEvent.requestPermission = () => { window.__asked = (window.__asked || 0) + 1; return Promise.resolve("granted"); }`) : tap sur `#enterBtn` → `window.__asked == 1`, `bash_v3_tilt == "granted"`.
  - `test_denied_is_silent` : la permission renvoie `"denied"` → aucune erreur, `bash_v3_tilt == "denied"`, `BashHome.tilt()` reste `null` après un évènement.
  - `test_desktop_ignores_tilt` : ordi + évènement → `BashHome.tilt()` est `null`.
- [ ] **Step 2 : Lancer** `python -m unittest tests.test_tilt -v` → attendu : ÉCHEC.
- [ ] **Step 3 : Implémenter.**
- [ ] **Step 4 : Relancer** → attendu : OK.
- [ ] **Step 5 : Commit** `git commit -m "Add gyroscope tilt with iOS permission on ENTER"`

### Task 14 : 404, image de secours du chrome, image de partage

**Files :** Rewrite `404.html` ; Create `tools/render-assets.py`, `tools/og.html`, `assets/chrome-fallback.webp`, nouveau `assets/og-image.jpg` ; Modify `index.html` (`img.chrome-fallback[src="/assets/chrome-fallback.webp"][alt=""][aria-hidden=true]`, affichée seulement sous `html.no-gl` ; `theme-color` `#1a0d3d`), `site.webmanifest` (`background_color` `#07050c`, `theme_color` `#1a0d3d`) ; Delete `assets/menu-bg.webp` ; Test `tests/test_404_assets.py`

**Interfaces :**
- `404.html` : même CSP que l'actuelle, `noindex`, `tokens.css` + `base.css` + `site.js` + `mercure.js` ; « 404 » en chrome CSS (dégradé du mot BASH, sans WebGL), perso, texte actuel `Yeah, this page doesn't exist. Probably my fault, not yours.`, lien « Back home » vers `/`.
- `tools/render-assets.py` (Playwright, lancé à la main : `python tools/render-assets.py`) : rend `BashChrome` en état `home` sur un canvas transparent 1200×1200 puis l'exporte via `canvas.toDataURL("image/webp", 0.9)` → `assets/chrome-fallback.webp` ; ouvre `tools/og.html` (hero composé en 1200×630 : BASH chromé, perso, sculpture) → `page.screenshot(type="jpeg", quality=88)` → `assets/og-image.jpg`.

- [ ] **Step 1 : Écrire les tests** (`tests/test_404_assets.py`) :
  - `test_404_page` : `/404.html` → titre de niveau 1 « 404 », lien « Back home » vers `/`, `assert_clean`.
  - `test_fallback_without_webgl` (`webgl=False`) : `.chrome-fallback` visible avec `naturalWidth > 0` ; `#chrome` masqué.
  - `test_og_image_size` : `/assets/og-image.jpg` chargé dans la page → 1200 × 630.
  - `test_menu_bg_gone` : le fichier n'existe plus et aucune occurrence de `menu-bg.webp` dans `index.html`, `404.html`, `assets/css`, `assets/js`.
  - `test_manifest_colors` : `background_color == "#07050c"`, `theme_color == "#1a0d3d"`.
- [ ] **Step 2 : Lancer** `python -m unittest tests.test_404_assets -v` → attendu : ÉCHEC.
- [ ] **Step 3 : Implémenter** puis exécuter `python tools/render-assets.py`.
- [ ] **Step 4 : Relancer** → attendu : OK.
- [ ] **Step 5 : Commit** `git commit -m "Restyle 404 and add chrome fallback and new share image"`

> **Checkpoint phase 3 :** YupBash teste l'écran ENTER, les sons et l'inclinaison (sur son téléphone via le réseau local, `python -m http.server 8000 --bind 0.0.0.0`) ; attendre son accord.

---

## Phase 4 — Contrôle final

### Task 15 : Qualité globale + README

**Files :** Create `tests/test_quality.py` ; Modify `README.md` (en français : arborescence, section « Design v3 — Nocturne Chrome » qui remplace « Design v2 » — modules et espaces de noms, états du chrome, clés `localStorage`, plans B, tests `python -m unittest discover -s tests -v`, `tools/render-assets.py`, retour arrière via le tag `design-v2`) ; corrections éventuelles.

- [ ] **Step 1 : Écrire les tests** (`tests/test_quality.py`) :
  - `test_keyboard_journey` : `Tab` depuis le haut atteint, dans l'ordre du document, `#menuBtn`, `.gel` du hero, les `summary` de la FAQ, les 3 `.social-big`, `#copyEmail`, le lien `/cases/` ; pour chacun, `BashMercure.state().target === document.activeElement` ou contour de focus de largeur > 0.
  - `test_text_contrast` : pour `body`, `.tagline`, `.meta`, `#hudSection`, `.faq-answer`, `.vid-cta`, contraste calculé (luminance relative WCAG) contre `#2b1452` ≥ 4,5.
  - `test_first_load_weight` : nouveau contexte, somme des `request.sizes()["responseBodySize"]` (tailles transférées) jusqu'au réseau inactif sur `/` < 700 × 1 024 octets.
  - `test_internal_links_ok` : sur `/` et `/404.html`, chaque `a[href^="/"]` (sans le fragment), `img[src^="/"]`, `link[href^="/"]`, `script[src^="/"]` répond 200 (`page.request.get`).
  - `test_reduced_motion_all_visible` : `reduced_motion=True` → chaque section a une opacité calculée de 1 une fois affichée.
  - `test_no_webgl_full_site` (`webgl=False`) : les 5 sections atteignables, `assert_clean`.
  - `test_no_gsap_full_site` : `block=("cdnjs.cloudflare.com",)` → contenu de toutes les sections visible.
  - `test_cases_simulator_unaffected` : `/cases/` propre, titre contenant `Case Simulator`, et au moins une caisse affichée (sélecteur de la grille des caisses relevé dans `cases/index.html`).
- [ ] **Step 2 : Lancer** `python -m unittest tests.test_quality -v` → corriger jusqu'à OK.
- [ ] **Step 3 : Mettre à jour `README.md`.**
- [ ] **Step 4 : Suite complète** `python -m unittest discover -s tests -v` → attendu : OK ; captures finales ordi + mobile.
- [ ] **Step 5 : Commit** `git commit -am "Final quality pass and README for design v3"`

> **Checkpoint phase 4 :** résumé des tests + captures finales à YupBash ; demander explicitement l'accord pour la mise en ligne.

### Task 16 : Mise en ligne — uniquement après accord explicite de YupBash

- [ ] **Step 1 :** confirmer l'accord écrit de YupBash dans la conversation (sinon : s'arrêter).
- [ ] **Step 2 :** `git push origin design-v2` (sauvegarde de l'ancien site sur GitHub).
- [ ] **Step 3 :** `git switch main && git merge --no-ff design-v3 -m "Design v3: Nocturne Chrome"` puis `git push origin main`.
- [ ] **Step 4 :** après 2 minutes, vérifier en ligne avec Playwright sur `https://yupbash.vip/` : titre contenant `BASH`, `#home` présent, aucune erreur console ; `https://yupbash.vip/socials/` se termine par `/#socials`.
- [ ] **Step 5 :** donner à YupBash la commande de retour arrière : `git revert -m 1 <commit de fusion> && git push origin main`.
