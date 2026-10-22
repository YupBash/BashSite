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
│   ├── favicon-anim.js   Favicon animé (frames PNG en base64)
│   ├── *.webp / *.png    Personnages, fond de menu, icônes, image OpenGraph
├── site.webmanifest      PWA (thème #3a0e5c, fond #08070a)
├── sitemap.xml, robots.txt
└── CNAME
```

### Conventions de code
- **Chaque page est autonome** : CSS dans un `<style>` et JS dans des `<script>` inline. Pas de fichier CSS/JS partagé (hors `favicon-anim.js`) → le header, le menu latéral et les liens sociaux sont **dupliqués** dans `index`, `faq`, `socials`.
- Pas de build, pas de npm, pas de framework.
- Données structurées SEO en `application/ld+json` sur chaque page.

## Technologies & connecteurs

| Élément | Détail |
|---|---|
| Polices | Google Fonts : **Chakra Petch** (400–700), **Permanent Marker** |
| Images des skins | CDN Steam (`community.akamai.steamstatic.com`) |
| JS | Vanilla, aucune librairie |
| Thème | Sombre / violet (`#08070a`, `#3a0e5c`) |

## Case Simulator (`/cases/`)

Onglets : **Cases**, **Battle**, **Trade-Up**, **Mines**, **Inventory** + un **clicker/wallet** (modal, avec bâtiments) et un bouton Reset dans son footer.
Systèmes transverses : solde, inventaire, stats, succès (achievements + toasts), récompense quotidienne (streak), effets sonores.

Clés `localStorage` (constantes en haut du script) : `BAL_KEY`, `INV_KEY`, `STATS_KEY`, `ACH_KEY`, `DAILY_KEY`, `CK_KEY`, `SFX_KEY`. Les pages principales utilisent `bashMenuIntroSeen`.
Les anciennes sauvegardes sont compatibles : les valeurs par défaut sont fusionnées via `Object.assign`.

## Déploiement

1. Modifier les fichiers, tester localement : `python3 -m http.server 8000` puis http://localhost:8000 (nécessaire pour que `fetch()` des JSON fonctionne).
2. `git push origin main` → GitHub Pages publie automatiquement.

## Règles de collaboration

- Les commits sont signés **uniquement par YupBash** (`mortiez.be@gmail.com`), sans ligne `Co-Authored-By`.
- Valider chaque phase avant de passer à la suivante.

## Historique des corrections / Sécurité

_(à compléter — Phase 2)_
