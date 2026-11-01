/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * MAMORA GP — Service Worker hors ligne (mode atelier).
 *
 * CE FICHIER EST UN GABARIT : `build/sw.js` est généré au build par le plugin
 * `mamora-offline-service-worker` défini dans vite.config.ts, qui injecte la
 * version de cache, la coquille HTML et la liste des fichiers à précacher.
 *
 * Stratégie : précache intégral du build (coquille HTML + tous les chunks, y
 * compris les modules métier chargés à la demande). Une fois l'application
 * ouverte une première fois, elle démarre et fonctionne sans aucun réseau.
 */

const CACHE_VERSION = '__CACHE_VERSION__';
const CACHE_NAME = `mamora-gp-${CACHE_VERSION}`;
const APP_SHELL = '__APP_SHELL__';
const PRECACHE_URLS = __PRECACHE_URLS__;

// --- Installation : téléchargement et mise en cache de l'application entière.
self.addEventListener('install', event => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(PRECACHE_URLS);
      // Volontairement sans skipWaiting() : une nouvelle version prend la main
      // au prochain démarrage complet, pour ne jamais invalider les chunks
      // d'un onglet déjà ouvert.
    })(),
  );
});

// --- Activation : purge des versions précédentes puis prise de contrôle.
self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)));
      await self.clients.claim();
    })(),
  );
});

// Permet à l'application de forcer une mise à jour immédiate si nécessaire.
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

async function respondFromShell(cache) {
  // `ignoreVary` : Vite Preview répond avec `Vary: Origin`, or les requêtes de
  // modules portent un en-tête `Origin` que le précache n'avait pas. Sans cette
  // option, le cache manque et la requête part sur le réseau (échec hors ligne).
  const shell =
    (await cache.match(APP_SHELL, { ignoreVary: true })) ||
    (await cache.match('/', { ignoreVary: true })) ||
    (await cache.match('./', { ignoreVary: true }));
  if (shell) return shell;
  return Response.error();
}

async function handleRequest(request) {
  const cache = await caches.open(CACHE_NAME);

  // Navigation : l'application est une SPA, toute URL sert la coquille HTML.
  if (request.mode === 'navigate') {
    const cached = await respondFromShell(cache);
    if (cached) return cached;
    try {
      return await fetch(request);
    } catch {
      return cached;
    }
  }

  // Ressources statiques : le cache d'abord (fichiers à empreinte, immuables).
  // `ignoreVary` est indispensable : le serveur envoie `Vary: Origin` alors que
  // les requêtes de modules et celles du précache ne portent pas les mêmes
  // en-têtes. Sans cela, tous les chunks manqueraient hors ligne.
  const cached = await cache.match(request, { ignoreVary: true });
  if (cached) return cached;

  try {
    const response = await fetch(request);
    // Mise en cache opportuniste des fichiers non précachés (ex. nouvel icône).
    if (response && response.ok && response.type === 'basic') {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    // Dernier recours hors ligne : une navigation déguisée reçoit la coquille.
    if (request.destination === 'document') {
      return respondFromShell(cache);
    }
    throw error;
  }
}

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(handleRequest(request));
});
