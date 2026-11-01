/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * MAMORA GP — Enregistrement du Service Worker (mode hors ligne).
 *
 * Le fichier `sw.js` est généré au build avec la liste complète des fichiers de
 * l'application (voir vite.config.ts). En développement, aucun Service Worker
 * n'est enregistré pour ne pas mettre en cache les fichiers sources.
 */

export function registerServiceWorker(): void {
  if (!import.meta.env.PROD) return;
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    const base = import.meta.env.BASE_URL;
    navigator.serviceWorker
      .register(`${base}sw.js`, { scope: base, updateViaCache: 'none' })
      .then(registration => {
        // Une nouvelle version attend son activation : elle prendra la main au
        // prochain démarrage complet de l'application.
        registration.addEventListener('updatefound', () => {
          const installing = registration.installing;
          if (!installing) return;
          installing.addEventListener('statechange', () => {
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              console.info(
                '[MAMORA GP] Nouvelle version téléchargée : elle sera active au prochain démarrage.',
              );
            }
          });
        });
      })
      .catch(error => {
        console.error('[MAMORA GP] Service Worker non enregistré :', error);
      });
  });
}
