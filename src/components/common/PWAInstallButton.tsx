/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * MAMORA GP — Bouton d'Installation PWA Windows (Edge/Chrome)
 */

import React, { useState } from 'react';
import { Download, Monitor, CheckCircle, Info } from 'lucide-react';
import { usePWAInstall } from './usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return (
      <span className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-300 rounded border border-emerald-200 dark:border-emerald-800">
        <CheckCircle className="w-3.5 h-3.5" />
        <span>Installé (Windows PWA)</span>
      </span>
    );
  }

  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        title="Installer MAMORA GP sur ce PC Windows"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Installer sur Windows</span>
      </button>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowGuide(true)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        title="Guide d'installation Windows multi-postes"
      >
        <Monitor className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
        <span className="hidden sm:inline">Déploiement Windows</span>
      </button>

      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md p-6 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2 mb-3 text-blue-600 dark:text-blue-400">
              <Info className="w-5 h-5" />
              <h4 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Installation sur PC Windows d'usine
              </h4>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
              Pour faire fonctionner MAMORA GP en application bureau indépendante sous Windows 10/11 sans barre de navigation :
            </p>
            <ol className="text-xs text-slate-700 dark:text-slate-300 space-y-2 list-decimal list-inside bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
              <li>Ouvrez l'application dans <strong>Microsoft Edge</strong> ou <strong>Google Chrome</strong>.</li>
              <li>Cliquez sur l'icône <strong>"Installer l'application"</strong> dans la barre d'adresse (ou Menu ⋯ &gt; Applications &gt; Installer MAMORA GP).</li>
              <li>Cochez <em>"Créer un raccourci sur le bureau"</em> et <em>"Épingler à la barre des tâches"</em>.</li>
              <li>L'application s'exécute désormais comme un logiciel Windows autonome avec persistance locale et synchronisation LAN.</li>
            </ol>
            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setShowGuide(false)}
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 rounded-lg hover:bg-slate-800"
              >
                Compris
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
