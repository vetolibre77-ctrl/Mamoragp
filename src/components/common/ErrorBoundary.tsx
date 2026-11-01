/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * MAMORA GP — Barrière d'erreur de rendu
 * Sans elle, React 19 démonte toute l'application au premier composant défaillant.
 */

import React from 'react';
import { AlertOctagon, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  moduleName?: string;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`MAMORA GP — erreur de rendu du module ${this.props.moduleName || 'inconnu'}`, error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="rounded-xl border border-red-300 bg-red-50 dark:bg-red-950/40 dark:border-red-800 p-8 max-w-3xl mx-auto space-y-4">
        <div className="flex items-start gap-4">
          <AlertOctagon className="w-10 h-10 text-red-600 dark:text-red-400 shrink-0" aria-hidden="true" />
          <div className="space-y-1 min-w-0">
            <h2 className="text-lg font-bold text-red-800 dark:text-red-200">
              Le module « {this.props.moduleName || 'courant'} » a rencontré une erreur d'affichage
            </h2>
            <p className="text-sm text-red-700 dark:text-red-300">
              Les autres modules restent accessibles via le menu latéral. Les données déjà enregistrées ne sont pas perdues.
            </p>
          </div>
        </div>

        <pre className="text-xs font-mono bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900 rounded-lg p-3 overflow-x-auto text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
          {error.message}
        </pre>

        <details className="text-xs text-red-700 dark:text-red-300">
          <summary className="cursor-pointer font-medium select-none">Détail technique de l'erreur</summary>
          <pre className="mt-2 font-mono bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap text-slate-600 dark:text-slate-400">
            {error.stack || 'Aucune pile d\'appel disponible.'}
          </pre>
        </details>

        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors"
        >
          <RefreshCw className="w-4 h-4" aria-hidden="true" />
          Recharger l'application
        </button>
      </div>
    );
  }
}
