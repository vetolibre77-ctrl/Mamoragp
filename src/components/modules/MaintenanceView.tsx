/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * MAMORA GP — Maintenance & Métrologie des Équipements
 * Fiches de remise en service hygiénique post-intervention (ISO 22000)
 */

import React, { useState } from 'react';
import { Equipment } from '../../types';
import { storage } from '../../services/storage';
import { Wrench, CheckCircle, AlertTriangle, ShieldCheck, Calendar, Thermometer } from 'lucide-react';
import { StatusBadge } from '../common/StatusBadge';

interface MaintenanceViewProps {
  equipments: Equipment[];
  currentUserName: string;
}

export const MaintenanceView: React.FC<MaintenanceViewProps> = ({ equipments, currentUserName }) => {
  const handleToggleStatus = (eq: Equipment) => {
    const newStatus = eq.status === 'OPERATIONNEL' ? 'EN_MAINTENANCE' : 'OPERATIONNEL';
    const clearance = newStatus === 'OPERATIONNEL';
    storage.updateEquipmentStatus(eq.id, newStatus, clearance);
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Wrench className="w-5 h-5 text-blue-600" />
            <span>Maintenance Préventive, Corrective &amp; Métrologie</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Suivi des sertisseuses, autoclaves, étalonnage des sondes et fiches de remise en service hygiénique ISO 22000
          </p>
        </div>
      </div>

      {/* Cartes d'équipements */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {equipments.map(eq => (
          <div
            key={eq.id}
            className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">{eq.code}</span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  eq.status === 'OPERATIONNEL'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                }`}
              >
                {eq.status}
              </span>
            </div>

            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{eq.name}</h3>
            <p className="text-xs text-slate-500">Zone : <strong>{eq.line}</strong></p>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-700/60 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Dernière Maintenance :</span>
                <span className="font-mono font-medium">{eq.lastPreventiveMaintenanceDate}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Prochaine Échéance :</span>
                <span className="font-mono font-bold text-blue-600">{eq.nextPreventiveMaintenanceDate}</span>
              </div>
              {eq.lastCalibrationDate && (
                <div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500">Étalonnage Métrologique :</span>
                  <span className="font-mono text-emerald-600 font-semibold">{eq.lastCalibrationDate}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 text-xs">
              <div className="flex items-center gap-1.5 text-emerald-600 font-semibold text-[11px]">
                <ShieldCheck className="w-4 h-4" />
                <span>Remise en service hygiénique validée</span>
              </div>
            </div>

            <button
              onClick={() => handleToggleStatus(eq)}
              className="w-full py-1.5 text-xs font-semibold text-center text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
            >
              {eq.status === 'OPERATIONNEL' ? 'Déclarer Arrêt / Intervention' : 'Valider Remise en Service'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
