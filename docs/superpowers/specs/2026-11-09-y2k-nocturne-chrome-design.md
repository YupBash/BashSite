# Refonte « Nocturne Chrome » (Y2K futurism) — yupbash.vip

- **Date** : 2026-11-09
- **Statut** : design validé en brainstorming (section par section), spec à relire par YupBash
- **Branche** : `design-v3` (partie de `main` @ `4eb7a5d`)
- **Périmètre** : phase 1 = vitrine (accueil, redirections `/socials/` et `/faq/`, 404). Le Case Simulator est la phase 2 (spec séparée, plus tard).

---

## 1. Objectif

Refaire la vitrine de BASH dans un style **Y2K futurism** qui fasse « fait main » et premium, **pas « site généré par IA »**, et **très interactif**, tout en restant fluide sur téléphone.

- **Pour qui** : les gens qui arrivent depuis TikTok / Instagram / Discord, majoritairement sur téléphone.
- **C'est réussi si** :
  1. un visiteur se dit « c'est fait main » dans les 3 premières secondes (chrome liquide vivant, typo, HUD) ;
  2. rien n'est statique : chaque section a sa transformation du chrome et ses transitions ;
  3. le site reste fluide (≈ 60 FPS sur un ordi récent, sans saccade sur un téléphone récent) et léger (< 700 Ko au premier chargement) ;
  4. tout le contenu actuel (réseaux, FAQ, setup, easter eggs, accès au Case Simulator) est conservé.

Ce qu'on retient des références TikTok (@ugoki.ai, @kxjouanim) d'après YupBash : chrome liquide 3D qui réagit à la souris/au scroll, transitions ultra-fluides entre sections, interface HUD (lignes fines, détails techniques) mélangée à une grosse typo italique très stylisée.

## 2. Décisions validées

| Sujet | Décision | Écarté |
|---|---|---|
| Base de code | Version GitHub `main` (le clone local était obsolète ; ancien état gardé sur la branche locale `backup/local-avant-sync-2026-11-09`, jamais poussée) | — |
| Périmètre | Phase 1 vitrine, phase 2 Case Simulator | Tout d'un coup |
| Direction visuelle | **Nocturne Chrome** : noir + violet (couleurs du perso), chrome liquide | « Ice 2000 » (clair, bleu glacé), « Holo Signal » (irisé) |
| Couleur d'accent | **Silver bleu** `#cfe2ff` | Jaune-vert (rejeté), silver neutre (trop effacé), cyan glacé, rose chrome |
| Structure | **Une seule grande expérience au scroll** sur l'accueil | Pages séparées, hybride |
| Curseur | **Mercure** : goutte de chrome liquide | Viseur (rejeté : « x10000 plus stylé » demandé), Orbite, Étoile |
| Intro | Écran **« PRESS START »** : ENTER = intro **avec son** | Intro muette |
| Extras | Sons (choix au ENTER, bouton SFX), inclinaison téléphone, boutons magnétiques | — |
| Technique | **Shaders WebGL faits main + GSAP**, vanilla, sans build | Three.js (comparé en direct : 692 Ko / 138 Ko compressés, +≈450 ms au démarrage), animations pré-calculées |

## 3. Périmètre

**Dans la phase 1**
- `index.html` : nouvelle expérience au scroll (écran ENTER + intro + 5 sections + fin).
- `/socials/` et `/faq/` : redirections vers les sections correspondantes.
- `404.html` : refaite dans le nouveau style.
- Nouvelle image de partage (Open Graph) générée depuis le nouveau hero.
- Mise à jour de `README.md`, `sitemap.xml`, `site.webmanifest`.

**Hors périmètre**
- Le Case Simulator (`/cases/`) : inchangé en phase 1 ; il doit continuer à fonctionner (il charge `tokens.css`).
- Le favicon animé (`assets/favicon-anim.js`) : conservé tel quel.
- Aucun back-end, aucun compte, aucune donnée envoyée à un serveur.

## 4. Identité visuelle

### 4.1 Couleurs (règle 60 / 30 / 10 : noir 60 %, violet 30 %, accent 10 %)

| Rôle | Valeur |
|---|---|
| Fond (dégradé radial) | `#2b1452` (centre) → `#140a29` → `#07050c` (bords) |
| Texte principal | `#f1ecff` |
| Texte HUD | `rgba(210,196,255,.74)` |
| Lignes HUD | `rgba(196,174,255,.5)` |
| Violet de marque (bouton « gel ») | dégradé `#d7c8ff` → `#8a5cff` → `#4b1db8` → `#9a6dff`, ombre `rgba(124,58,237,.55)` |
| **Accent silver bleu** | `#cfe2ff` ; bord métal `#7f9cd6` ; lueur `rgba(140,185,255,.75)` |

L'accent est utilisé avec parcimonie : reflet bas des lettres chromées, reflets du chrome liquide (lumière de contour), contour de l'onglet et des boutons, « ONLINE », chevrons `>>>`, points `::`, curseur.

### 4.2 Chrome liquide (palette d'environnement du shader)

Valeurs RVB linéaires 0–1 : ciel haut `[.10,.05,.24]`, horizon `[.86,.93,1.0]` (silver bleu), sol `[.015,.01,.03]`, lumière de contour 1 `[.58,.30,1.0]` (violet), lumière de contour 2 `[.55,.75,1.0]` (silver bleu), teinte `[.94,.91,1.0]`. Plus 3 « boîtes à lumière » blanches pour les reflets de studio.

### 4.3 Typographie (Google Fonts)

| Usage | Police | Réglages |
|---|---|---|
| Mot-symbole BASH, grands titres de section | **Anybody** | italique, largeur 150 %, graisse 900, interlettrage −0,02 em, remplissage dégradé chrome (texte détouré) |
| Onglets, boutons | Anybody | italique, largeur 125–130 %, graisse 500–800 |
| HUD, étiquettes, chiffres | **Martian Mono** | 10–11 px, majuscules, interlettrage 0,14–0,18 em |
| Texte courant, accroche | **Chakra Petch** | 400 / 600, accroche en italique 600 |
| Signature de fin uniquement | Permanent Marker | clin d'œil à l'ancien site |

### 4.4 Motifs et composants
- `::` : 4 points chromés (dégradé avec bande sombre) devant BASH.
- `>>>` : chevrons animés en cascade.
- Onglet « welcome.. » : bord gauche biseauté + ligne qui file vers la droite (repris de la référence).
- Cadre HUD : 4 coins, barre haute (menu, `::yupbash.vip`, ONLINE, horloge, réseaux), texte vertical à gauche, règle verticale à droite qui suit le pointeur, barre basse (coordonnées, FPS, `SCROLL >>>`, indicateur de section).
- Fond : lignes courbes fines (« swoosh ») en pointillés animés, ligne d'horizon, grain.
- Bouton **gel** (principal) : pilule brillante façon années 2000, reflet haut, anneau silver bleu.
- Bouton **crochets** (secondaire) : texte mono encadré de 4 coins.
- Menu plein écran : titres des pages en **chrome clair** (blanc → lavande, contraste ≥ 4,5:1 sur le violet du menu) — demandé par YupBash au checkpoint de la phase 1, les titres d'origine manquaient de lisibilité.

### 4.5 Prototype de référence

Le rendu validé (hero, shader, curseur Mercure) existe en prototype local, non versionné :
`.superpowers/brainstorm/1822-1794225593/content/tech-1-vs-2.html` (mode « Shaders »). Le code du shader de sculpture et du curseur y sert de point de départ ; les valeurs importantes sont reprises dans cette spec pour qu'elle se suffise à elle-même.

## 5. Le parcours (accueil)

Le HUD reste fixe pendant tout le scroll : menu, indicateur `0X / 05 — NOM` + barre de progression, bouton `SFX ON/OFF`, réseaux.

### 0 · Écran ENTER + intro (1re visite uniquement)
- Écran noir, coins du HUD, onglet « welcome.. », bouton chromé pulsant **« ENTER ▸ »**, lien discret *enter silently*.
- **ENTER** : débloque l'audio, active les SFX, puis lance l'intro (≈ 2 s) **avec son** : lignes « système » qui s'écrivent avec un tic chacune (ton humoristique, ex. `vibes: questionable ✓`), note montante quand les coins se tracent, « bloop » liquide quand la goutte de chrome tombe, basse sourde quand la page s'ouvre.
- **enter silently** : même intro, sans son ; SFX coupés.
- Sur iPhone, ce même tap demande l'autorisation d'inclinaison.
- Clavier : Entrée = ENTER, Échap = *enter silently*. Choix mémorisé : aux visites suivantes, pas d'écran ENTER.
- Le contenu est déjà dans le HTML sous l'écran (indexable par Google).

### 01 · HOME
- Hero validé : onglet « welcome.. », `::` + **BASH** chromé (le reflet suit le pointeur), accroche « I can't get myself out of gambling. », ligne mono « Content creator — TikTok / Instagram / Discord », boutons « Latest videos >>> » (gel) et « Click to gamble » (crochets), perso debout **devant** le mot, sculpture de chrome (gouttes + anneau en orbite) derrière, au niveau de sa tête et de ses épaules.
- Au scroll : BASH s'étire et se dissout, le perso glisse et s'estompe, la sculpture « coule » vers la section suivante.
- Easter egg conservé : 5 clics rapides sur le perso → bulle (« Stop that. », « Bro, stop. », « Alright, Don't do that. », « Hey! »), détection sur la silhouette.

### 02 · LATEST VIDEOS
- L'anneau de chrome grandit, s'incline et devient la **piste d'un carrousel 3D** : les cartes vidéo (format 9:16) tournent sur une ellipse alignée sur l'anneau (même inclinaison, même rotation), pilotée par le scroll.
- Carte : miniature, cadre HUD, titre, « Watch on TikTok → ».
- Entrées `"placeholder": true` de `videos.json` (situation actuelle) : écrans HUD **« NO SIGNAL — first drop soon »** (lignes de balayage, neige légère) + bouton « Follow on TikTok ». Les miniatures provisoires ne sont pas affichées.
- Sans GSAP ou en « réduire les animations » : grille simple.

### 03 · ABOUT & SETUP
- **Fiche perso** : « BASH · 21 · Belgium · *Some random dude, idk.* », avec le perso assis (`faq-character.webp`). Une ligne de scan passe sur la fiche quand elle entre à l'écran.
- **Fiche technique du setup** (valeurs qui s'affichent en défilant) : Processor Ryzen 7 5800X · Memory 32 GB RAM · Graphics Card RX 9070 XT · Mouse WLMOUSE Beast X · Keyboard Gravastar Mercury V60 Pro.
- **FAQ en accordéon** avec les 6 questions actuelles et leurs réponses telles quelles (humour conservé) : Who are you? · Where can I follow you? · How often do you post? · About me · How can I contact you? · What gear do you use?
- **Démineur caché** derrière l'emoji 💣 de « Who are you? » : conservé (même fonctionnement : sélecteur de taille, drapeaux, reset), restylé.
- Chrome : la sculpture se divise en 3–4 petites gouttes qui se rangent dans les marges pour laisser le texte lisible.

### 04 · SOCIALS & CONTACT
- Chrome : la sculpture éclate en **3 bulles** qui flottent chacune **au-dessus de son bouton**, dans l'ordre Discord, TikTok, Instagram ; chaque bulle porte le **logo** de son réseau aux couleurs de la marque (`#5865f2`, `#25f4ee`, `#e1306c`) — demandé par YupBash au checkpoint de la phase 1. Sur téléphone, les 3 bulles sont côte à côte au-dessus des boutons empilés et restent toujours **séparées** (leur rayon diminue si l'écran est trop étroit, elles ne fusionnent jamais en capsule).
- 3 gros boutons Discord, TikTok, Instagram sous les bulles.
- Contact : `yupbash@gmail.com` + bouton « copier » (toast HUD « COPIED ✓ »).
- Liens : Discord `https://discordapp.com/users/852685497108267019`, TikTok `https://www.tiktok.com/@yupbash`, Instagram `https://www.instagram.com/yupbash`.

### 05 · CLICK TO GAMBLE
- Chrome : les gouttes fusionnent en un **jeton de casino** (disque à bord cranté) qui tourne lentement.
- Texte : « BASH ADDICTION — fake money, real addiction. » + bouton « Open a case >>> » → `/cases/`.

### Fin
- « Don't miss the next one. » + les 3 réseaux + signature **« BASH · 2024–2026 »** en Permanent Marker.
- Chrome : une seule goutte qui se résorbe.

### Fond évolutif (ajout demandé par YupBash au checkpoint de la phase 1)
Le fond (brume, couleurs, halo secondaire, ligne d'horizon, lignes « swoosh ») change **progressivement avec le scroll**, sans coupure, dans les mêmes zones de transition que le chrome. Une ambiance par section, toutes tirées de la palette Nocturne :

| Section | Ambiance |
|---|---|
| HOME | nuit violette, brume derrière le perso (fond actuel) |
| VIDEOS | indigo « écran » : brume centrée, halo silver bleu sous le carrousel, horizon remonté |
| ABOUT | studio calme : lumière lilas en haut, lignes atténuées pour la lecture |
| SOCIALS | violet plus vif + halo bleuté |
| GAMBLE | magenta profond + reflet doré en bas (table de casino) |
| Fin | presque noir, une dernière lueur en bas |

## 6. Interactions

### 6.1 Curseur « Mercure » (pointeur fin uniquement : souris / trackpad)
- Goutte de chrome liquide (rayon ≈ 9,5 px) centrée exactement sur le pointeur (aucun retard sur la tête, pour la précision).
- **Traînée en comète** : 4 points qui suivent avec amortissement (0,42 / 0,36 / 0,30 / 0,26 par image à 60 FPS), reliés par des segments effilés fusionnés (forme continue).
- **Survol d'un élément cliquable** (liens, boutons) : **crochets de verrouillage** (4 coins silver bleu, marge 7 px) qui partent de la position du pointeur et se referment autour de l'élément, avec une **étiquette** mono `◢ NOM` au-dessus (en dessous si l'élément touche le haut de l'écran) ; ils s'effacent au départ. Remplace l'anneau liquide de la première version, à la demande de YupBash (checkpoint de la phase 1 : il préférait l'encadré de la première maquette).
- **Clic** : la goutte s'écrase légèrement + **onde de chrome** circulaire (≈ 450 ms).
- **Focus clavier** : les crochets entourent aussi l'élément focalisé (servent d'indicateur de focus).
- Liseré sombre autour de la goutte pour rester visible sur fond clair (lettres chromées).
- Rendu : un calque WebGL plein écran au-dessus de la page (`pointer-events: none`), dessiné uniquement dans un rectangle autour du curseur / de l'élément survolé (scissor) pour rester léger.
- Le curseur système est masqué uniquement quand le curseur Mercure fonctionne (pointeur fin + WebGL OK).

### 6.2 Sculpture de chrome
- Rendu par raymarching (≈ 6 Ko de code) : 5 gouttes fusionnées (union lisse) + 1 anneau tore en orbite + ondulation de surface.
- Suit le pointeur : un « bras » liquide (2 gouttes) s'étire vers lui, portée limitée ; les reflets tournent légèrement avec la position horizontale.
- Au repos (pas de mouvement depuis 2,5 s) : la cible dérive doucement (la sculpture « respire »).
- **États par section** (voir §5) : chaque section définit un état cible (position et échelle de la sculpture, positions/rayons des gouttes, rayon/inclinaison/visibilité de l'anneau, facteur « jeton ») ; le scroll interpole entre deux états (GSAP ScrollTrigger, `scrub`). Les positions qui dépendent de la page (boutons des réseaux) sont lues dans le DOM et converties en coordonnées de la scène.

### 6.3 Autres interactions
- **Boutons magnétiques** : les boutons principaux se décalent de quelques pixels vers le pointeur à l'approche (souris uniquement, désactivé en « réduire les animations »).
- **Menu** : écran plein façon HUD, 5 entrées numérotées 01–05 en grosse typo italique chromée + lien discret « Click to gamble » ; ouverture en balayage de chrome ; Échap ferme ; navigation clavier complète ; le clic sur une entrée fait défiler jusqu'à la section.
- **Sons** (Web Audio, synthétisés en direct, aucun fichier) : tic au survol des boutons, « bloop » liquide au clic, « whoosh » au changement de section, sons de l'intro (§5.0). Volume discret. Bouton `SFX ON/OFF` dans le HUD, choix mémorisé.
- **Inclinaison téléphone** (DeviceOrientation) : décale les reflets du chrome et le perso (parallaxe). Android : direct ; iPhone : autorisation demandée lors du tap sur ENTER.
- **Console** : message « BASH » restylé (Anybody / silver bleu).

## 7. Téléphone, performances, accessibilité, SEO

### 7.1 Téléphone (≤ 720 px)
- Mise en page empilée : sculpture en haut, texte en dessous, perso plus petit ; boutons ≥ 44 px ; pas de curseur Mercure (inclinaison à la place).
- Le chrome calcule moins de détails (résolution réduite, 48 pas de raymarching au lieu de 80).

### 7.2 Performances
- Résolution du chrome **adaptative** selon les FPS mesurés (facteur 0,34 → 0,95 de la taille d'affichage, densité de pixels plafonnée à 1,5) ; pause quand l'onglet est caché.
- Budget : **< 700 Ko** au premier chargement de l'accueil (images + polices + code), miniatures vidéo en chargement différé.
- Dépendances externes inchangées : GSAP 3.12.5 + ScrollTrigger (cdnjs, avec hash SRI, déjà utilisés) et Google Fonts. **La CSP actuelle ne change pas.**

### 7.3 Plans B
| Situation | Comportement |
|---|---|
| Pas de WebGL | Image pré-rendue du chrome (`assets/chrome-fallback.webp`, générée depuis le shader) à la place de la sculpture ; curseur système normal ; tout le reste fonctionne |
| GSAP bloqué / non chargé | Sections affichées sans animations de scroll, carrousel en grille, tout reste lisible et cliquable |
| « Réduire les animations » | Écran ENTER sans animation, pas d'intro animée, chrome figé (une image), pas de traînée ni d'onde du curseur, transitions instantanées, pas de boutons magnétiques |
| Stockage local indisponible | L'écran ENTER s'affiche à chaque visite, SFX coupés par défaut, aucune erreur |

### 7.4 Accessibilité
- Navigation complète au clavier (Tab, Entrée, Échap) avec focus visible (crochets de verrouillage + contour de secours).
- Contraste du texte ≥ 4,5:1.
- Texte découpé en lettres : version lisible par les lecteurs d'écran (`.sr-only`) ; canvas décoratifs en `aria-hidden` ; icônes avec `aria-label`.
- Sons coupés tant que le visiteur ne les a pas choisis.

### 7.5 SEO
- Conservés : `<title>`, description, Open Graph / Twitter (nouvelle image), `canonical`, JSON-LD `Person`.
- Ajouté : JSON-LD `FAQPage` reprenant les 6 questions sur l'accueil.
- `sitemap.xml` : ne garde que `/` ; `/socials/` et `/faq/` (listées aujourd'hui) en sont retirées et deviennent des redirections `noindex`.

## 8. Architecture technique

### 8.1 Fichiers
| Fichier | Action | Rôle |
|---|---|---|
| `index.html` | réécrit | Écran ENTER, HUD, 5 sections + fin, JSON-LD |
| `404.html` | réécrit | « 404 » chromé + perso + « Back home » |
| `socials/index.html`, `faq/index.html` | remplacés | Redirection immédiate vers `/#socials` et `/#about` (meta refresh + `location.replace` + lien visible), `noindex`, canonical vers `/` |
| `assets/css/tokens.css` | complété | Nouvelles variables (couleurs, polices) **ajoutées** ; variables existantes conservées pour le Case Simulator |
| `assets/css/base.css` | réécrit | Base commune vitrine : typo, HUD, boutons, menu, écran ENTER, utilitaires, réduction des animations |
| `assets/css/home.css` | nouveau | Les sections de l'accueil |
| `assets/css/videos.css` | supprimé | Remplacé par `home.css` |
| `assets/js/site.js` | réécrit | Commun : hauteur d'écran réelle, écran ENTER + intro, menu, HUD en direct (horloge, coordonnées, section), transitions, message console |
| `assets/js/chrome.js` | nouveau | Sculpture de chrome : shader, qualité adaptative, états de morphing, pointeur, image de secours |
| `assets/js/mercure.js` | nouveau | Curseur Mercure (calque WebGL 2D), survols, focus clavier, onde |
| `assets/js/home.js` | nouveau | Chorégraphie au scroll (GSAP), carrousel vidéo (lit `videos.json`), fiche setup, FAQ + démineur, copie du mail, boutons magnétiques, inclinaison |
| `assets/js/audio.js` | nouveau | Sons synthétisés, bouton SFX, déblocage audio au ENTER |
| `assets/js/videos.js` | supprimé | Repris dans `home.js` |
| `assets/menu-bg.webp` | supprimé | Fond de l'ancien menu |
| `assets/chrome-fallback.webp` | nouveau | Image de secours sans WebGL |
| `assets/og-image.jpg` | remplacé | Nouvelle image de partage (1200×630) |
| `sitemap.xml`, `site.webmanifest`, `README.md` | mis à jour | Pages, couleurs (`#07050c` / `#1a0d3d`), documentation design v3 |
| `assets/videos/videos.json`, `tools/add-video.py` | inchangés | Même format |
| `cases/*`, `assets/favicon-anim.js`, `CNAME`, `robots.txt` | inchangés | — |

### 8.2 Données locales (localStorage, rien n'est envoyé)
- `bash_v3_entered` (`"1"`) : écran ENTER déjà passé.
- `bash_v3_sfx` (`"on"` / `"off"`) : choix du son.
- `bash_v3_tilt` (`"granted"` / `"denied"`) : autorisation d'inclinaison (iPhone).
- L'ancienne clé `bashMenuIntroSeen` n'est plus utilisée. Les clés du Case Simulator ne sont pas touchées.
- Tout accès au stockage est protégé (`try/catch`).

### 8.3 Git
- Tag `design-v2` sur `4eb7a5d` (retour arrière possible : redéployer ce tag).
- Travail sur `design-v3` ; commits signés **YupBash** (`mortiez.be@gmail.com`), **sans ligne `Co-Authored-By`**.
- Fusion dans `main` et `git push` uniquement avec l'accord explicite de YupBash.

## 9. Tests et critères d'acceptation

Outil : Playwright (Python, déjà installé) avec Chromium, sur un serveur local (`python -m http.server 8000`, nécessaire pour les `fetch()` de JSON).

**À chaque phase**
- Captures ordi (1440×900) et téléphone (390×844, émulation tactile) de chaque section.
- 0 erreur console, 0 violation CSP (écoute de `securitypolicyviolation`).
- Tous les liens internes répondent 200 ; `/socials/` → `/#socials`, `/faq/` → `/#about`.
- Curseur testé à la vraie souris : déplacement rapide (traînée), survol (crochets + étiquette), clic (onde), départ (résorption).

**Contrôle final (phase 4)**
- Plans B : lancement sans WebGL (image de secours visible), sans GSAP (sections statiques), en « réduire les animations ».
- Poids de l'accueil mesuré < 700 Ko au premier chargement.
- Navigation complète au clavier ; contraste vérifié.
- Le Case Simulator s'ouvre et fonctionne comme avant.

## 10. Phases de livraison (validation de YupBash entre chaque phase)

1. **Fondations + HOME** : tokens, polices, base CSS, HUD, sculpture (`chrome.js`), curseur Mercure, menu → hero complet.
2. **Parcours au scroll** : Latest videos, About & Setup (FAQ, démineur), Socials & Contact, Click to gamble, fin, redirections `/socials/` et `/faq/`.
3. **Extras** : écran ENTER + intro sonore, sons (`audio.js`), inclinaison, 404, image de partage, image de secours.
4. **Contrôle final** : téléphone, perfs, accessibilité, plans B, `README.md` → fusion dans `main` + mise en ligne **avec l'accord de YupBash**.
5. **Phase 2 (plus tard, spec séparée)** : Case Simulator dans le même style.

## 11. Risques

| Risque | Parade |
|---|---|
| Téléphones peu puissants (raymarching) | Résolution adaptative, 48 pas sur mobile, image de secours |
| Un tap de plus à la 1re visite (écran ENTER) | Uniquement à la 1re visite ; intro courte et passable |
| Fenêtre d'autorisation d'inclinaison sur iPhone | Demandée au moment du tap sur ENTER, une seule fois ; refus = aucun effet, aucun message |
| Pas encore de vraies vidéos | Cartes « NO SIGNAL — first drop soon » ; `add-video.py` les remplace automatiquement |
| Poids des polices variables | Sous-ensemble latin, `display=swap`, seulement les axes utilisés |
| Dépendance au CDN de GSAP | Plan B statique (§7.3) |

## 12. Textes par défaut de l'intro

En anglais comme le reste du site ; modifiables par YupBash lors de la validation de la phase 3.

```
BASH.SYS v3.0 — booting…
chrome: liquid ✓
vibes: questionable ✓
gambling addiction: detected ✓
welcome..
```
