/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * MAMORA GP — Référentiel des écrans GDS.
 *
 * Ce module ne contient que des constantes et des types : il est importé par
 * l'application (barre latérale, fil d'Ariane) sans charger l'écran GDS complet,
 * qui est chargé à la demande.
 */

export type GdsSection =
  | 'MP_DASHBOARD'
  | 'MP_STOCK'
  | 'MP_RECEIPTS'
  | 'MP_ISSUES'
  | 'MP_RETURNS'
  | 'MP_TRANSFERS'
  | 'MP_LOTS'
  | 'MP_INVENTORY'
  | 'MP_TRACE'
  | 'MP_HISTORY'
  | 'PF_DASHBOARD'
  | 'PF_RECEIPTS'
  | 'PF_STOCK'
  | 'PF_LOTS'
  | 'PF_RELEASE'
  | 'PF_TRANSFERS'
  | 'PF_PREPARE'
  | 'PF_ISSUES'
  | 'PF_INVENTORY'
  | 'PF_TRACE'
  | 'PF_HISTORY'
  | 'WAREHOUSES'
  | 'ALERTS'
  | 'REPORTS'
  | 'SETTINGS';

export const GDS_SECTION_LABELS: Record<GdsSection, string> = {
  MP_DASHBOARD: 'Tableau de bord matières premières',
  MP_STOCK: 'État des stocks matières premières',
  MP_RECEIPTS: 'Entrées et réceptions MP',
  MP_ISSUES: 'Consommations de production',
  MP_RETURNS: 'Retours de production',
  MP_TRANSFERS: 'Transferts entre magasins (MP)',
  MP_LOTS: 'Gestion des lots MP',
  MP_INVENTORY: 'Inventaires matières premières',
  MP_TRACE: 'Traçabilité matières premières',
  MP_HISTORY: 'Historique des mouvements MP',
  PF_DASHBOARD: 'Tableau de bord produits finis',
  PF_RECEIPTS: 'Réceptions de production',
  PF_STOCK: 'État des stocks produits finis',
  PF_LOTS: 'Lots de fabrication',
  PF_RELEASE: 'Contrôle et libération qualité',
  PF_TRANSFERS: 'Transferts entre magasins (PF)',
  PF_PREPARE: 'Préparation des sorties',
  PF_ISSUES: 'Sorties de produits finis',
  PF_INVENTORY: 'Inventaires produits finis',
  PF_TRACE: 'Traçabilité produits finis',
  PF_HISTORY: 'Historique des mouvements PF',
  WAREHOUSES: 'Magasins et emplacements',
  ALERTS: 'Alertes',
  REPORTS: 'Rapports et statistiques',
  SETTINGS: 'Paramètres GDS',
};
