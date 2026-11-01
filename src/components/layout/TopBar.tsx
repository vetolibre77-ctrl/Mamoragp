/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * MAMORA GP — Barre Supérieure Contractuelle
 * Zone 1: Fil d'Ariane & Contexte Usine — Zone 2: Indicateurs Usine & Équipe — Zone 3: Profil & PWA Windows
 */

import React from 'react';
import { User } from '../../types';
import { PWAInstallButton } from '../common/PWAInstallButton';
import { ShieldAlert, Server, Clock } from 'lucide-react';

interface TopBarProps {
  currentModuleName: string;
  currentUser: User;
  onOpenAudit: () => void;
  blockedCount: number;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentModuleName,
  currentUser,
  onOpenAudit,
  blockedCount,
}) => {
  return (
    <header className="flex items-center justify-between gap-4 px-6 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0">
      {/* Zone 1 : Fil d'ariane & Titre de vue */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="font-semibold text-slate-800 dark:text-slate-200">MAMORA GP</span>
          <span>/</span>
          <span className="text-slate-600 dark:text-slate-300 truncate">{currentModuleName}</span>
        </div>
      </div>

      {/* Zone 2 : État opérationnel usine & Réseau local */}
      <div className="hidden md:flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5 px-2.5 py-1 text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
          <Server className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span className="font-medium">Serveur LAN :</span>
          <span className="font-mono text-slate-600 dark:text-slate-300">192.168.1.100 (PostgreSQL)</span>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
          <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Poste Matin (06:00 - 14:00)</span>
        </div>

        {blockedCount > 0 && (
          <button
            onClick={onOpenAudit}
            className="flex items-center gap-1.5 px-2.5 py-1 text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/60 rounded border border-red-200 dark:border-red-800 hover:bg-red-100 cursor-pointer transition-colors"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
            <span className="font-semibold">{blockedCount} lot(s) bloqué(s)</span>
          </button>
        )}
      </div>

      {/* Zone 3 : PWA install & Profil utilisateur */}
      <div className="flex items-center gap-3 shrink-0">
        <PWAInstallButton />

        <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-xs border border-blue-200 dark:border-blue-800">
            {currentUser.name.charAt(0)}
          </div>
          <div className="hidden sm:block text-left">
            <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate max-w-36">
              {currentUser.name}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
              {currentUser.badgeNumber} · {currentUser.role}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
