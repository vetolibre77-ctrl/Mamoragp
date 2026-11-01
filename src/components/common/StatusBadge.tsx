/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * MAMORA GP — Badge de Statut Normalisé ISO / GPAO
 * Zéro-Pill Discipline : typographie nette, icône sémantique explicite
 */

import React from 'react';
import {
  FileText,
  Calendar,
  Settings,
  Microscope,
  AlertOctagon,
  Clock,
  ShieldCheck,
  CheckCircle,
  Archive,
  Truck,
  CreditCard,
} from 'lucide-react';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const getStatusConfig = (st: string) => {
    switch (st) {
      case 'BROUILLON':
        return {
          label: 'Brouillon',
          icon: FileText,
          classes: 'text-slate-600 bg-slate-100 border-slate-300 dark:bg-slate-800 dark:text-slate-300',
        };
      case 'PLANIFIE':
      case 'CONFIRME':
        return {
          label: st === 'CONFIRME' ? 'Confirmé' : 'Planifié',
          icon: Calendar,
          classes: 'text-blue-700 bg-blue-50 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800',
        };
      case 'EN_COURS':
      case 'EN_PREPARATION':
        return {
          label: st === 'EN_PREPARATION' ? 'En préparation' : 'En cours',
          icon: Settings,
          classes: 'text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
        };
      case 'EN_CONTROLE':
      case 'EN_ATTENTE':
      case 'EN_ATTENTE_VALIDATION':
      case 'EN_ATTENTE_CONTROLE':
        return {
          label: st === 'EN_ATTENTE_VALIDATION'
            ? 'En attente validation'
            : st === 'EN_ATTENTE_CONTROLE'
              ? 'En attente contrôle'
              : 'En attente contrôle',
          icon: Clock,
          classes: 'text-purple-700 bg-purple-50 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800',
        };
      case 'QUARANTAINE':
        return {
          label: 'Quarantaine',
          icon: Clock,
          classes: 'text-amber-800 bg-amber-50 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
        };
      case 'REJETE':
        return {
          label: 'Rejeté',
          icon: AlertOctagon,
          classes: 'text-red-700 bg-red-50 border-red-300 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800',
        };
      case 'BLOQUE':
      case 'REFUSE':
      case 'NON_CONFORME':
      case 'ANNULEE':
        return {
          label: st === 'REFUSE' ? 'Refusé' : st === 'ANNULEE' ? 'Annulée' : st === 'NON_CONFORME' ? 'Non conforme' : 'Bloqué',
          icon: AlertOctagon,
          classes: 'text-red-700 bg-red-50 border-red-300 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800',
        };
      case 'ACCEPTE_DEROGATION':
      case 'LIBERATION_DEROGATION':
        return {
          label: 'Accepté / Dérogation',
          icon: Clock,
          classes: 'text-amber-800 bg-amber-100 border-amber-300 dark:bg-amber-900/60 dark:text-amber-200',
        };
      case 'ACCEPTE':
      case 'VALIDE':
      case 'VALIDEE':
      case 'LIBERE':
        return {
          label: st === 'LIBERE' ? 'Libéré (ISO 22000)' : st === 'VALIDEE' || st === 'VALIDE' ? 'Validée' : 'Accepté',
          icon: ShieldCheck,
          classes: 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
        };
      case 'EXPEDIE':
      case 'LIVRE':
      case 'PARTIELLEMENT_RECEPTIONNE':
        return {
          label: st === 'LIVRE'
            ? 'Livré'
            : st === 'PARTIELLEMENT_RECEPTIONNE'
              ? 'Partiellement réceptionné'
              : 'Expédié',
          icon: Truck,
          classes: 'text-cyan-700 bg-cyan-50 border-cyan-200 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-800',
        };
      case 'RECEPTIONNE':
        return {
          label: 'Réceptionné',
          icon: ShieldCheck,
          classes: 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
        };
      case 'CLOTURE_PARTIELLE':
        return {
          label: 'Clôturé partiellement',
          icon: Archive,
          classes: 'text-slate-700 bg-slate-100 border-slate-300 dark:bg-slate-800 dark:text-slate-300',
        };
      case 'EN_TRANSIT':
        return {
          label: 'En transit',
          icon: Truck,
          classes: 'text-indigo-700 bg-indigo-50 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800',
        };
      case 'ECART':
        return {
          label: 'Écart constaté',
          icon: AlertOctagon,
          classes: 'text-red-700 bg-red-50 border-red-300 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800',
        };
      case 'PRET':
        return {
          label: 'Prêt',
          icon: CheckCircle,
          classes: 'text-blue-700 bg-blue-50 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800',
        };
      case 'FACTURE':
      case 'REGLEE':
        return {
          label: st === 'REGLEE' ? 'Réglée' : 'Facturé',
          icon: CreditCard,
          classes: 'text-teal-700 bg-teal-50 border-teal-200 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800',
        };
      case 'CLOTURE':
        return {
          label: 'Clôturé',
          icon: Archive,
          classes: 'text-slate-700 bg-slate-100 border-slate-300 dark:bg-slate-800 dark:text-slate-300',
        };
      case 'ANNULE':
        return {
          label: 'Annulé',
          icon: AlertOctagon,
          classes: 'text-slate-500 bg-slate-100 border-slate-200 line-through',
        };
      case 'OBSOLETE':
        return {
          label: 'Obsolète',
          icon: Archive,
          classes: 'text-slate-500 bg-slate-100 border-slate-200 dark:bg-slate-800 dark:text-slate-400 line-through',
        };
      default:
        return {
          label: status,
          icon: CheckCircle,
          classes: 'text-slate-700 bg-slate-50 border-slate-200',
        };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;
  const sizeClasses = size === 'sm' ? 'text-xs py-0.5 px-2 gap-1' : 'text-xs py-1 px-2.5 gap-1.5';

  return (
    <span
      className={`inline-flex items-center font-medium border rounded whitespace-nowrap shrink-0 ${sizeClasses} ${config.classes}`}
    >
      <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} aria-hidden="true" />
      <span>{config.label}</span>
    </span>
  );
};
