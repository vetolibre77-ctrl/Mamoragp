/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * MAMORA GP — Indicateur de chargement des briques chargées à la demande.
 */

import React from 'react';

interface ModuleLoaderProps {
  /** Texte affiché sous l'indicateur. */
  label?: string;
  /** Version réduite, pour une brique interne (graphique, panneau). */
  compact?: boolean;
}

/**
 * Affiché le temps du téléchargement d'un module métier ou d'un graphique
 * découpé en chunk séparé (React.lazy + Suspense).
 */
export const ModuleLoader: React.FC<ModuleLoaderProps> = ({
  label = 'Chargement du module…',
  compact = false,
}) => (
  <div
    role="status"
    aria-live="polite"
    className={
      compact
        ? 'flex items-center justify-center gap-2 py-10 text-slate-400 dark:text-slate-500'
        : 'flex flex-col items-center justify-center gap-3 py-24 text-slate-400 dark:text-slate-500'
    }
  >
    <span
      aria-hidden="true"
      className="w-5 h-5 rounded-full border-2 border-slate-200 border-t-blue-600 animate-spin dark:border-slate-700 dark:border-t-blue-400"
    />
    <span className="text-xs font-medium">{label}</span>
  </div>
);
