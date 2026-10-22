# BASH — yupbash.vip

Site personnel / vitrine de **BASH** (YupBash) avec un mini-jeu « Case Simulator » façon CS:GO.
Ce fichier est la **mémoire centrale** du projet : à lire en premier avant toute modification.

## Contexte

- **Domaine** : https://yupbash.vip (fichier `CNAME`)
- **Hébergement** : GitHub Pages (dépôt `YupBash/BashSite`, branche `main`) — déploiement automatique à chaque push.
- **Type** : site **100 % statique** (HTML + CSS + JS vanilla). **Aucun back-end, aucun PHP, aucune base de données.**
- **Persistance** : uniquement `localStorage` côté navigateur (rien n'est envoyé à un serveur).

## Architecture

```
/
├── index.html            Accueil (personnage, liens sociaux, menu latéral)
├── 404.html              Page d'erreur personnalisée
├── faq/index.html        FAQ (+ easter egg : démineur caché derrière l'emoji 💣)
├── socials/index.html    Boutons Discord / TikTok / Instagram
├── cases/
│   ├── index.html        Case Simulator (≈2 900 lignes, tout le jeu est dans ce fichier)
│   ├── cases-data.json   Caisses CS:GO + contenu (images servies par le CDN Steam)
│   └── prices-data.json  Prix des caisses / skins
├── assets/
│   ├── css/tokens.css    Variables (couleurs, marques, easing) + grain — chargé par TOUTES les pages
│   ├── css/base.css      Mise en page commune des pages vitrine + effets design v2
│   ├── css/videos.css    Accueil : sortie du hero au scroll, carrousel 3D « Latest videos », outro
│   ├── js/site.js        JS commun vitrine : hauteur d'écran, menu, transitions, néon, parallax, reveal
│   ├── js/videos.js      Accueil : scroll (GSAP ScrollTrigger), cartes vidéo depuis videos.json
│   ├── videos/           videos.json (liste des vidéos) + miniatures <id>.jpg
│   ├── favicon-anim.js   Favicon animé (frames PNG en base64)
│   ├── *.webp / *.png    Personnages, fond de menu, icônes, image OpenGraph
├── tools/add-video.py    Ajoute une vidéo TikTok à la section « Latest videos »
├── site.webmanifest      PWA (thème #3a0e5c, fond #08070a)
├── sitemap.xml, robots.txt
└── CNAME
```

### Conventions de code
- **Commun** dans `assets/css` + `assets/js/site.js` ; **spécifique** dans le `<style>`/`<script>` inline de chaque page (chargé après, donc prioritaire).
- Le **HTML** du menu latéral et des icônes sociales reste écrit dans chaque page (`index`, `faq`, `socials`) : le modifier aux 3 endroits.
- Le Case Simulator ne charge que `tokens.css` (il a sa propre mise en page).
- Pas de build, pas de npm, pas de framework.
- Données structurées SEO en `application/ld+json` sur chaque page.

## Technologies & connecteurs

| Élément | Détail |
|---|---|
| Polices | Google Fonts : **Chakra Petch** (400–700), **Permanent Marker** |
| Images des skins | CDN Steam (`community.akamai.steamstatic.com`) |
| JS | Vanilla, aucune librairie (`assets/js/site.js` + scripts inline) |
| Thème | Sombre / violet — variables dans `assets/css/tokens.css` (`--bg`, `--purple`, `--neon`, `--brand-*`…) |
| Effets visuels | 100 % CSS/JS maison (grain SVG en `data:` URI, aucune image ni lib ajoutée) |

| Animations au scroll | **GSAP 3.12.5 + ScrollTrigger** (cdnjs, avec hash SRI) — accueil uniquement |
| Proxy d'images | **wsrv.nl** — sert les images Steam avec CORS pour l'image de partage (Case Simulator uniquement) |

CSP par page : l'accueil autorise en plus `https://cdnjs.cloudflare.com` (scripts), le Case Simulator `https://wsrv.nl` (images).

## Case Simulator (`/cases/`)

Onglets : **Cases**, **Battle**, **Trade-Up**, **Mines**, **Inventory** + un **clicker/wallet** (modal, avec bâtiments) et un bouton Reset dans son footer.
Systèmes transverses : solde, inventaire, stats, succès (achievements + toasts), récompense quotidienne (streak), effets sonores.

Clés `localStorage` (constantes en haut du script) : `BAL_KEY`, `INV_KEY`, `STATS_KEY`, `ACH_KEY`, `DAILY_KEY`, `CK_KEY`, `SFX_KEY`. Les pages principales utilisent `bashMenuIntroSeen`.
Les anciennes sauvegardes sont compatibles : les valeurs par défaut sont fusionnées via `Object.assign`.

## Design v2 (Phase 3 — 2026-10-22)

Identité conservée (noir/violet, personnage, Permanent Marker + Chakra Petch). Sauvegarde de l'ancien design : tag et branche **`design-v1`**.

Hooks HTML à connaître :

| Attribut | Effet (site.js + base.css) |
|---|---|
| `data-neon` | Le texte s'allume lettre par lettre façon néon, grésillement périodique, glitch au survol |
| `data-parallax` | L'image enfant suit légèrement la souris (souris uniquement) |
| `data-reveal` | Les enfants apparaissent en cascade au chargement |

Autres effets : grain (tokens.css), brume violette (`.stage::after`), aura du personnage, menu en cascade, icônes sociales aux couleurs des marques, `<details>` animés, glitch du 404, wallet qui flashe vert/rouge (cases), cartes de caisses lumineuses, 2 colonnes et onglets à bord fondu sur mobile.
Tous les effets sont coupés si `prefers-reduced-motion`. **Aucune librairie externe ajoutée.**

**Revenir à l'ancien design** : `git revert <commits design v2>` ou redéployer la branche `design-v1`.

### Nouvelles classes / sélecteurs
- `.neon-letter`, `.sr-only` (texte lu par les lecteurs d'écran derrière le néon) — `base.css`
- `.stage::after` (brume), `.character::before` (aura), `body::before` (grain, `tokens.css`)
- Case Simulator : `.wallet-btn.bump-up` / `.bump-down` + fonction `bumpWallet()` (appelée par `updateWalletUI`)

## Accueil : section « Latest videos » (2026-10-23)

L'accueil défile désormais : **hero** (sticky, « BASH » grossit et se dissout, le perso glisse et s'estompe — variable CSS `--hp` 0→1) → **carrousel 3D** des vidéos qui tourne avec le scroll (section sticky, GSAP) → **outro** (boutons TikTok / Instagram / Discord).
Sans GSAP (CDN bloqué) ou en « réduire les animations » : les vidéos s'affichent en simple grille.

**Ajouter une vidéo** (lien complet `…/video/123…`) :
```bash
python3 tools/add-video.py https://www.tiktok.com/@yupbash/video/1234567890
git add -A && git commit -m "Add video" && git push
```
Le script récupère titre + miniature (oEmbed TikTok), garde les 8 plus récentes et supprime les vidéos provisoires (`"placeholder": true`).

## Case Simulator : drop légendaire & partage (2026-10-23)
- **Drop légendaire** (`showLegendary`, `legendTier`) : ★ couteaux/gants = version complète (or), Covert = version courte (rouge). Flash, secousse, rayons, particules canvas, son `playLegendary`. Une seule fois par ouverture multiple (meilleur drop).
- **Partage** (`buildShareCanvas`, `shareItemImage`) : image story 1080×1920 avec le vrai skin (via wsrv.nl, repli sur un médaillon), float, prix, URL. Mobile → feuille de partage native ; ordinateur → téléchargement PNG.

## Déploiement

1. **Tester en local** (obligatoire pour que les `fetch()` JSON fonctionnent) :
   ```bash
   cd BashSite && python3 -m http.server 8000   # puis http://localhost:8000
   ```
2. **Vérifier** : ordinateur + mobile (outils dev du navigateur), console sans erreur ni violation CSP, menu, une ouverture de caisse.
3. **Publier** : `git push origin main` → GitHub Pages met le site à jour en 1–2 min sur https://yupbash.vip.
4. **Annuler** : `git revert <commit>` puis push (jamais de `push --force` sur `main` sans sauvegarde).

Authentification Git sur ce Mac : `gh auth login` (déjà fait, compte YupBash).

### Ajouter une nouvelle page vitrine
1. Copier `socials/index.html` dans `nouvelle-page/index.html` (garder les `<meta>` CSP/referrer en tête).
2. Garder les liens `tokens.css`, `base.css` et `site.js` ; mettre le style propre à la page dans son `<style>`.
3. Ajouter le lien dans le menu latéral des 3 pages (`index`, `faq`, `socials`) et l'URL dans `sitemap.xml`.
4. Toute ressource externe → l'ajouter à la CSP de **chaque** page.

## Règles de collaboration

- Les commits sont signés **uniquement par YupBash** (`mortiez.be@gmail.com`), sans ligne `Co-Authored-By`.
- Valider chaque phase avant de passer à la suivante.

## Historique des corrections / Sécurité

### 2026-10-22 — Audit de sécurité (Phase 2)

Pas de serveur ni de PHP → aucune injection SQL ou faille serveur possible. Les risques sont côté navigateur.

**1. XSS via `innerHTML` (Case Simulator) — corrigé**
- *Faille* : les noms, images, usures et caisses d'origine des items (issus de `cases-data.json` et de la sauvegarde `localStorage`) étaient insérés tels quels dans `innerHTML`. Une sauvegarde ou un JSON piégé (ex. nom = `<img src=x onerror=...>`) exécutait du JavaScript.
- *Correction* : fonction `esc()` dans `cases/index.html` (à côté de `rareBadgeHtml`), appliquée à toutes les données d'items insérées en HTML. **Règle : toute donnée non codée en dur passe par `esc()` ou `textContent`.**
- *Vérifié* : payload injecté dans `cs2sim_inventory` → exécuté avant, affiché comme texte après.

**2. Content-Security-Policy + Referrer-Policy — ajoutés sur toutes les pages**
GitHub Pages ne permet pas d'en-têtes HTTP personnalisés → balises `<meta>` juste après `<meta charset>` :
```
default-src 'self'; script-src 'self' 'unsafe-inline';
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://*.steamstatic.com;
connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'
```
⚠️ **Tout nouveau connecteur externe (CDN, police, API) doit être ajouté à cette CSP sur chaque page**, sinon il sera bloqué. `'unsafe-inline'` reste nécessaire tant que les scripts sont inline.

**Points connus, non traités** : `frame-ancestors` (anti-clickjacking) impossible en `<meta>` sur GitHub Pages ; le solde du jeu est modifiable via la console (sans enjeu : aucun serveur, aucune vraie monnaie).

### 2026-10-22 — Revue finale (Phase 4)
- Intégration vérifiée : la CSP n'a rien bloqué après la refonte (0 violation sur les 5 pages), les 15 liens et ressources internes répondent 200, le jeu fonctionne (ouverture de caisse, inventaire, solde).
- **Corrigé** : après un retour arrière du navigateur, la page pouvait rester invisible (fondu de sortie restauré depuis le cache) → `site.js` ré-affiche la page sur `pageshow`.
- **Corrigé** : le mot « BASH » découpé en lettres pour le néon restait lisible par les lecteurs d'écran grâce à un texte `.sr-only`.
- Vérifié : menu au clavier (Entrée / Échap), mode « réduire les animations » (tout est figé et visible).
