# MAMORA GP — GPAO Conserverie Thon & Sardines

Application web de gestion de production (GPAO), de stock et de pilotage analytique
pour la conserverie MAMORA GP. Certification ISO 22000.

React 19 · TypeScript · Vite 8 · Tailwind CSS 4 · base locale (localStorage JSON).

---

## Démarrage

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production -> dist/
npm run preview  # prévisualisation du build
```

**Première connexion.** Chaque profil est livré sans code PIN. À la première
connexion, l'écran « Connexion au poste de travail » demande de définir un code
PIN de 4 à 8 chiffres (empreinte salée, jamais stockée en clair). Un administrateur
peut réinitialiser un PIN oublié depuis la page de connexion.

Aucune variable d'environnement n'est nécessaire : la base vit dans le navigateur
du poste et l'application n'effectue aucun appel réseau (voir `.env.example`).

---

## Modules

| Module | Contenu |
|---|---|
| **Pilotage** | Tableau de bord global, indicateurs de production et de stock. |
| **MAMORA BI & AI Analyst** | Business Intelligence en lecture seule : 7 sections, moteur de requêtes, KPI, alertes, assistant analytique local et export PowerPoint natif. |
| **Gestion de production** | Nomenclature PF, matières premières & composants, ordres de fabrication, consommation réelle, analyse des écarts, rendement et pertes, suivi des 17 étapes. |
| **GDS — Gestion des stocks** | 21 écrans : MP et PF, magasins, emplacements, transferts, inventaires, consommations, retours magasin, sorties PF, qualité à 7 statuts. |
| **Service Approvisionnement** | Demandes d'achat manuelles et automatiques, budgets par service et catégorie, réception, litiges. |
| **Qualité & Sécurité ISO 22000** | Surveillance CCP & PRPo, sertissage & autoclaves, non-conformités 5M, dossiers et libération de lots. |
| **Commerce & Traçabilité** | Module commercial & BL, traçabilité et rappel. |
| **Support & Gouvernance** | Maintenance des équipements, journal d'audit et sauvegardes. |
| **Gestion des Utilisateurs** | 7 écrans : tableau de bord, liste des comptes, fiche utilisateur, rôles, matrice de permissions, sessions, journal de sécurité. |

---

## Architecture

```
src/
  types/index.ts        Types métier (2 700+ lignes), interface AppDatabase
  services/
    storage.ts          StorageService — façade unique sur la base (≈ 9 900 lignes)
    bi/
      catalog.ts        Catalogue des mesures analytiques autorisées
      engine.ts         Moteur de formules sécurisé, périodes, anomalies
      analyst.ts        Assistant analytique local (aucun appel externe requis)
      pptx-plan.ts      Plan de présentation (contenu, ton, sources)
      pptx-render.ts    Rendu .pptx natif (PptxGenJS chargé dynamiquement)
  components/
    layout/             Sidebar, Header, LoginView
    modules/            Un dossier par module métier
      bi/               Écrans MAMORA BI + assistant d'export PPTX
      gds/              Écrans GDS et briques partagées (GdsShared)
  pwa/
    sw-template.js      Gabarit du Service Worker (rempli au build)
    registerServiceWorker.ts  Enregistrement en production uniquement
  data/initialData.ts   Jeu de données initial (users, articles, ordres, lots…)
```

Le build produit en plus `dist/sw.js` : le Service Worker généré par le plugin
`mamora-offline-service-worker` de `vite.config.ts`, avec la liste exacte des
fichiers de l'application (voir « Mode hors ligne »).

### Conventions

- **Une seule porte d'entrée sur la base** : `storage` (singleton). Aucun accès
  direct à `localStorage` depuis les composants.
- **Aucune dépendance réseau** : l'assistant IA est un moteur déterministe local.
- **Lecture seule en BI** : la couche analytique ne modifie jamais les collections
  métier (vérifié par le harnais de test).
- **Permissions centralisées** : `hasPermission(user, code)` et
  `requirePermission(user, code)` ; chaque opération sensible appelle une
  assertion (`assertGds`, `assertWarehousePermission`, `assertProcurement`…).
- **Journal d'audit systématique** : création, modification, suppression et
  actions de sécurité sont tracées avec l'auteur, la date et les valeurs avant/après.
- **Migrations non destructives** : `migrateDatabase()` fait évoluer le schéma au
  chargement (ex. `User.isActive: boolean` → `User.status`).
- **Chargement à la demande** : chaque module métier est un chunk séparé
  (`React.lazy`) chargé à la première ouverture. Le démarrage ne télécharge que
  le socle (connexion, navigation, tableau de bord) ; `vite.config.ts` regroupe
  les dépendances lourdes (React, icônes, Recharts) dans des chunks dédiés.

---

## Sécurité

| Mesure | Mise en œuvre |
|---|---|
| Authentification | Code PIN (4–8 chiffres) haché avec sel, 12 000 itérations. |
| Anti-force brutale | 5 tentatives échouées → verrouillage du compte 15 minutes. |
| Session | Expiration après 30 minutes d'inactivité (configurable), révocation manuelle. |
| Statuts de compte | `ACTIF` · `INACTIF` · `SUSPENDU`. |
| Rôles | 11 rôles techniques, administrables depuis l'interface ; `ADMIN` est irrévocable (le dernier administrateur actif est protégé). |
| Matrice de permissions | 4 modules × actions ; les droits réels sont stockés dans `db.roles` et priment sur les matrices figées. |
| Journal de sécurité | Actions `LOGIN`, `LOGOUT`, `FAILED_LOGIN`, `PASSWORD_RESET`, `SESSION_EXPIRED`, `SESSION_REVOKED`, `USER_*`, `ROLE_*`, `PERMISSION_CHANGED`. |

---

## Tests

Sept harnais fonctionnels s'exécutent hors navigateur, sur le service réel, avec
un stockage local simulé.

```bash
npm run test:items         # 77 vérifications — articles, MP et composants
npm run test:procurement   # 100 vérifications — service approvisionnement
npm run test:gds           # 89 vérifications — module GDS
npm run test:gds:demo      # 51 vérifications — jeu de démonstration GDS
npm run test:user-manager  # 25 vérifications — comptes, rôles, sessions
npm run test:bi            # 97 vérifications — moteur analytique BI
npm run test:bi:pptx       # 36 vérifications — export PowerPoint
```

Total : **475 assertions, 0 échec**.

```bash
npm run lint               # vérification de types (tsc --noEmit)
```

---

## Export PowerPoint

L'assistant d'export (4 étapes : sélection du contenu, configuration, organisation,
exportation) produit un `.pptx` **natif et modifiable** : graphiques PowerPoint
avec classeur Excel embarqué, tableaux natifs, aucun screenshot. Les graphiques
sans donnée sur la période sont exclus et listés explicitement — aucun chiffre
n'est inventé.

Accessible depuis l'en-tête de MAMORA BI et depuis chaque section (tableaux de
bord, explorateur, KPI, rapports, AI Analyst).

---

## Mode hors ligne (atelier)

L'application est utilisable **sans aucun réseau** après une première ouverture.
Aucune donnée ne transite par un serveur : la base vit dans le `localStorage` du
poste, ce qui rend le mode atelier réellement autonome.

**Fonctionnement.** `npm run build` génère `dist/sw.js`, un Service Worker qui
précache **tout** le contenu du build : `index.html`, feuille de style, socle
React, les 20 écrans métier chargés à la demande, Recharts, l'icône et le
manifeste. Le Service Worker n'est enregistré qu'en production
(`src/pwa/registerServiceWorker.ts`) : en développement, aucun cache ne masque
les fichiers sources.

**Stratégies.**

| Requête | Réponse |
|---|---|
| Navigation (SPA) | Coquille `index.html` depuis le cache. |
| Fichiers du build | Cache d'abord (noms à empreinte, immuables). |
| Ressource inconnue | Réseau, puis mise en cache opportuniste. |
| Hors ligne et inconnue | Échec explicite (sauf document → coquille). |

**Mise à jour.** La version du cache est l'empreinte du contenu du build et du
code du Service Worker. Une nouvelle version est téléchargée en arrière-plan puis
activée au **prochain démarrage complet** de l'application : un onglet déjà
ouvert n'est jamais privé de ses chunks pendant la session.

**Conditions.** Un Service Worker exige un contexte sécurisé : `https://` ou
`http://localhost`. En déploiement LAN sur une adresse IP en `http://`, l'app
fonctionne mais le navigateur refuse le Service Worker ; servir le site en HTTPS
pour activer le mode hors ligne sur les postes de l'atelier.

**Vérifier sur un poste.**

1. `npm run build` puis `npm run preview`.
2. Ouvrir `http://localhost:4173`, se connecter (le PIN est demandé à la
   première connexion), puis laisser la page se charger complètement.
3. Arrêter le serveur (`Ctrl+C`) puis recharger l'onglet : l'application démarre
   et tous les modules restent accessibles. Le cache se contrôle dans les
   outils de développement, onglet *Application → Cache Storage*
   (`mamora-gp-<version>`).

---

## Déploiement

`npm run build` génère le dossier `dist/`, servi en statique. L'application est
une SPA sans état serveur : la base vit dans le `localStorage` du poste.

Pour un poste Windows, l'application dispose d'un déploiement de bureau (bouton
« Déploiement Windows » dans l'en-tête).
