/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * MAMORA GP — Menu Latéral Industriel Rétractable
 * Organisé par catégories opérationnelles avec flèche rétractable/dépliable
 */

import React, { useState } from 'react';
import {
  LayoutDashboard,
  Layers,
  Anchor,
  Factory,
  CheckSquare,
  ShieldCheck,
  Flame,
  AlertTriangle,
  FileCheck2,
  ShoppingCart,
  GitBranch,
  Boxes,
  Wrench,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Fish,
  Users,
  LogOut,
  Scale,
  TrendingUp,
  PieChart,
  Warehouse,
  ArrowLeftRight,
  PackageSearch,
  Sparkles,
} from 'lucide-react';
import { User, getRoleLabel } from '../../types';

export type ActiveModule =
  | 'DASHBOARD'
  | 'REFERENTIELS'
  | 'MATIERES_PREMIERES'
  | 'RECEPTIONS'
  | 'PLANIFICATION'
  | 'CONSOMMATION_REELLE'
  | 'ANALYSE_ECARTS'
  | 'RENDEMENT_PERTES'
  | 'SUIVI_FABRICATION'
  | 'HACCP_QUALITE'
  | 'SERTISSAGE_AUTOCLAVES'
  | 'NON_CONFORMITES'
  | 'DOSSIERS_LOTS'
  | 'COMMERCIAL'
  | 'TRACABILITE'
  | 'STOCKS'
  | 'MAGASINS'
  | 'TRANSFERTS'
  | 'MAINTENANCE'
  | 'AUDIT_ADMIN'
  | 'USER_MANAGER'
  | 'APPROVISIONNEMENT'
  | 'GDS'
  | 'MAMORA_BI';

/** Sous-menus du Service Approvisionnement (15 rubriques — Phase 1 du cahier des charges) */
export const PROCUREMENT_SUBMENUS: Array<{ id: string; label: string }> = [
  { id: 'DASHBOARD', label: 'Tableau de bord' },
  { id: 'REQUESTS', label: 'Demandes d\'achat' },
  { id: 'AUTO', label: 'Réappro. automatique' },
  { id: 'VALIDATION', label: 'Circuit de validation' },
  { id: 'BUDGETS', label: 'Budgets par service' },
  { id: 'CONSULTATIONS', label: 'Consultations fournisseurs' },
  { id: 'COMPARISON', label: 'Comparatif des offres' },
  { id: 'ORDERS', label: 'Commandes d\'achat' },
  { id: 'TRACKING', label: 'Suivi & relances' },
  { id: 'RECEPTIONS', label: 'Réceptions achats' },
  { id: 'EVALUATION', label: 'Évaluation fournisseurs' },
  { id: 'CONTRACTS', label: 'Contrats & tarifs' },
  { id: 'REPORTS', label: 'Rapports & analyses' },
  { id: 'SUPPLIERS', label: 'Fichier fournisseurs' },
  { id: 'SETTINGS', label: 'Paramètres appro.' },
];

/**
 * Sous-menus du module GDS — GESTION DES STOCKS (Phase 1 du cahier des charges).
 * Section A : matières premières — Section B : produits finis — puis le transversal.
 * Les identifiants correspondent exactement à l'union `GdsSection` de GdsView.
 */
export const GDS_SUBMENUS: Array<{
  group: string;
  items: Array<{ id: string; label: string }>;
}> = [
  {
    group: 'A. Matières premières',
    items: [
      { id: 'MP_DASHBOARD', label: 'Tableau de bord MP' },
      { id: 'MP_STOCK', label: 'État des stocks MP' },
      { id: 'MP_RECEIPTS', label: 'Entrées & réceptions' },
      { id: 'MP_ISSUES', label: 'Consommations de production' },
      { id: 'MP_RETURNS', label: 'Retours de production' },
      { id: 'MP_TRANSFERS', label: 'Transferts MP' },
      { id: 'MP_LOTS', label: 'Lots matières premières' },
      { id: 'MP_INVENTORY', label: 'Inventaires MP' },
      { id: 'MP_TRACE', label: 'Traçabilité MP' },
      { id: 'MP_HISTORY', label: 'Historique MP' },
    ],
  },
  {
    group: 'B. Produits finis',
    items: [
      { id: 'PF_DASHBOARD', label: 'Tableau de bord PF' },
      { id: 'PF_RECEIPTS', label: 'Réceptions de production' },
      { id: 'PF_STOCK', label: 'État des stocks PF' },
      { id: 'PF_LOTS', label: 'Lots de fabrication' },
      { id: 'PF_RELEASE', label: 'Contrôle & libération' },
      { id: 'PF_TRANSFERS', label: 'Transferts PF' },
      { id: 'PF_PREPARE', label: 'Préparation des sorties' },
      { id: 'PF_ISSUES', label: 'Sorties PF' },
      { id: 'PF_INVENTORY', label: 'Inventaires PF' },
      { id: 'PF_TRACE', label: 'Traçabilité PF' },
      { id: 'PF_HISTORY', label: 'Historique PF' },
    ],
  },
  {
    group: 'Transversal',
    items: [
      { id: 'WAREHOUSES', label: 'Magasins & emplacements' },
      { id: 'ALERTS', label: 'Alertes' },
      { id: 'REPORTS', label: 'Rapports & statistiques' },
      { id: 'SETTINGS', label: 'Paramètres GDS' },
    ],
  },
];

interface SidebarProps {
  activeModule: ActiveModule;
  onSelectModule: (module: ActiveModule, section?: string) => void;
  currentUser: User;
  onLogout: () => void;
  procurementSection?: string;
  gdsSection?: string;
  badgeCounts: {
    activeWorkOrders: number;
    pendingReceptions: number;
    blockedBatches: number;
    pendingReleases: number;
    pendingOrders: number;
    activeIncidents: number;
    pendingConsumptions?: number;
    pendingPurchaseRequests?: number;
    gdsAlerts?: number;
  };
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeModule,
  onSelectModule,
  currentUser,
  onLogout,
  procurementSection = 'DASHBOARD',
  gdsSection = 'MP_DASHBOARD',
  badgeCounts,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  // Les 15 sous-menus Approvisionnement sont repliés par défaut pour préserver la lisibilité du menu
  const [procurementOpen, setProcurementOpen] = useState(false);
  // Les 25 sous-menus GDS sont également repliés par défaut
  const [gdsOpen, setGdsOpen] = useState(false);

  const toggleCategory = (cat: string) => {
    setCollapsedCategories(prev => ({
      ...prev,
      [cat]: !prev[cat],
    }));
  };

  // Groupes de navigation (Conforme Rubrique « Gestion de production » Section 2)
  interface NavItem {
    id: ActiveModule;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
    badgeColor?: string;
  }

  const navigationGroups: Array<{ category: string; items: NavItem[] }> = [
    {
      category: 'PILOTAGE & TABLEAU DE BORD',
      items: [
        {
          id: 'DASHBOARD' as ActiveModule,
          label: 'Tableau de Bord',
          icon: LayoutDashboard,
        },
      ],
    },
    {
      category: 'BUSINESS INTELLIGENCE',
      items: [
        {
          id: 'MAMORA_BI' as ActiveModule,
          label: 'MAMORA BI & AI Analyst',
          icon: Sparkles,
        },
      ],
    },
    {
      category: 'GESTION DE PRODUCTION',
      items: [
        {
          id: 'REFERENTIELS' as ActiveModule,
          label: 'Nomenclature des Produits Finis',
          icon: Layers,
        },
        {
          id: 'MATIERES_PREMIERES' as ActiveModule,
          label: 'Matières Premières & Composants',
          icon: PackageSearch,
        },
        {
          id: 'PLANIFICATION' as ActiveModule,
          label: 'Ordres de Fabrication',
          icon: Factory,
          badge: badgeCounts.activeWorkOrders > 0 ? badgeCounts.activeWorkOrders : undefined,
          badgeColor: 'bg-blue-600',
        },
        {
          id: 'CONSOMMATION_REELLE' as ActiveModule,
          label: 'Consommation Réelle',
          icon: Scale,
          badge: badgeCounts.pendingConsumptions && badgeCounts.pendingConsumptions > 0 ? badgeCounts.pendingConsumptions : undefined,
          badgeColor: 'bg-amber-600',
        },
        {
          id: 'ANALYSE_ECARTS' as ActiveModule,
          label: 'Analyse des Écarts',
          icon: TrendingUp,
        },
        {
          id: 'RENDEMENT_PERTES' as ActiveModule,
          label: 'Rendement et Pertes de Production',
          icon: PieChart,
        },
        {
          id: 'SUIVI_FABRICATION' as ActiveModule,
          label: 'Suivi des 17 Étapes',
          icon: CheckSquare,
        },
        {
          id: 'RECEPTIONS' as ActiveModule,
          label: 'Réceptions & Agréage MP',
          icon: Anchor,
          badge: badgeCounts.pendingReceptions > 0 ? badgeCounts.pendingReceptions : undefined,
          badgeColor: 'bg-purple-600',
        },
        {
          id: 'STOCKS' as ActiveModule,
          label: 'Gestion des Stocks',
          icon: Boxes,
        },
        {
          id: 'MAGASINS' as ActiveModule,
          label: 'Magasins & Emplacements',
          icon: Warehouse,
        },
        {
          id: 'TRANSFERTS' as ActiveModule,
          label: 'Transferts & Mouvements',
          icon: ArrowLeftRight,
        },
      ],
    },
    {
      category: 'SERVICE APPROVISIONNEMENT',
      items: [
        {
          id: 'APPROVISIONNEMENT' as ActiveModule,
          label: 'Service Approvisionnement',
          icon: ShoppingCart,
          badge:
            badgeCounts.pendingPurchaseRequests && badgeCounts.pendingPurchaseRequests > 0
              ? badgeCounts.pendingPurchaseRequests
              : undefined,
          badgeColor: 'bg-indigo-600',
        },
      ],
    },
    {
      category: 'GDS — GESTION DES STOCKS',
      items: [
        {
          id: 'GDS' as ActiveModule,
          label: 'Gestion des Stocks MP & PF',
          icon: Boxes,
          badge: badgeCounts.gdsAlerts && badgeCounts.gdsAlerts > 0 ? badgeCounts.gdsAlerts : undefined,
          badgeColor: 'bg-red-600',
        },
      ],
    },
    {
      category: 'QUALITÉ & SÉCURITÉ ISO 22000',
      items: [
        {
          id: 'HACCP_QUALITE' as ActiveModule,
          label: 'Surveillance CCP & PRPo',
          icon: ShieldCheck,
        },
        {
          id: 'SERTISSAGE_AUTOCLAVES' as ActiveModule,
          label: 'Sertissage & Autoclaves',
          icon: Flame,
        },
        {
          id: 'NON_CONFORMITES' as ActiveModule,
          label: 'Non-Conformités (5M)',
          icon: AlertTriangle,
          badge: badgeCounts.blockedBatches > 0 ? badgeCounts.blockedBatches : undefined,
          badgeColor: 'bg-red-600',
        },
        {
          id: 'DOSSIERS_LOTS' as ActiveModule,
          label: 'Dossiers & Libération Lots',
          icon: FileCheck2,
          badge: badgeCounts.pendingReleases > 0 ? badgeCounts.pendingReleases : undefined,
          badgeColor: 'bg-amber-600',
        },
      ],
    },
    {
      category: 'COMMERCE & TRAÇABILITÉ',
      items: [
        {
          id: 'COMMERCIAL' as ActiveModule,
          label: 'Module Commercial & BL',
          icon: ShoppingCart,
          badge: badgeCounts.pendingOrders > 0 ? badgeCounts.pendingOrders : undefined,
          badgeColor: 'bg-emerald-600',
        },
        {
          id: 'TRACABILITE' as ActiveModule,
          label: 'Traçabilité & Rappel',
          icon: GitBranch,
        },
      ],
    },
    {
      category: 'SUPPORT & GOUVERNANCE',
      items: [
        {
          id: 'MAINTENANCE' as ActiveModule,
          label: 'Maintenance Équipements',
          icon: Wrench,
        },
        {
          id: 'AUDIT_ADMIN' as ActiveModule,
          label: 'Journal d\'Audit & Sauvegardes',
          icon: FileSpreadsheet,
        },
        {
          id: 'USER_MANAGER' as ActiveModule,
          label: 'Gestion des Utilisateurs',
          icon: Users,
        },
      ],
    },
  ];

  return (
    <aside
      className={`relative flex flex-col h-screen bg-slate-900 text-slate-100 border-r border-slate-800 transition-all duration-200 select-none ${
        isCollapsed ? 'w-18' : 'w-72'
      }`}
    >
      {/* Bouton Flèche de rétractation / déploiement (Conforme Exigence Section 3) */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3.5 top-6 z-30 flex items-center justify-center w-7 h-7 bg-blue-600 text-white rounded-full shadow-md border-2 border-slate-900 hover:bg-blue-500 transition-transform cursor-pointer"
        title={isCollapsed ? 'Déployer le menu latéral' : 'Rétracter le menu latéral'}
        aria-label={isCollapsed ? 'Déployer le menu' : 'Rétracter le menu'}
      >
        {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>

      {/* Header Marque */}
      <div className="flex items-center gap-3 px-4 py-4.5 border-b border-slate-800 shrink-0">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-600 text-white shrink-0 shadow-xs">
          <Fish className="w-6 h-6" />
        </div>
        {!isCollapsed && (
          <div className="overflow-hidden">
            <h1 className="text-sm font-bold tracking-tight text-white uppercase whitespace-nowrap">
              MAMORA GP
            </h1>
            <p className="text-[11px] text-slate-400 font-medium truncate">
              GPAO Thon &amp; Sardines · ISO 22000
            </p>
          </div>
        )}
      </div>

      {/* Navigation par catégories */}
      <nav className="flex-1 px-2.5 py-4 overflow-y-auto space-y-6">
        {navigationGroups.map(group => (
          <div key={group.category} className="space-y-1">
            {!isCollapsed && (
              <button
                type="button"
                onClick={() => toggleCategory(group.category)}
                className="w-full flex items-center justify-between px-2 mb-1.5 text-[10px] font-bold tracking-wider text-slate-400 hover:text-slate-200 uppercase transition-colors cursor-pointer text-left"
              >
                <span>{group.category}</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-500 transition-transform ${
                    collapsedCategories[group.category] ? '-rotate-90' : ''
                  }`}
                />
              </button>
            )}
            {(!collapsedCategories[group.category] || isCollapsed) &&
              group.items.map(item => {
              const Icon = item.icon;
              const isActive = activeModule === item.id;

              /* ── Rubrique Approvisionnement : entrée parente + 15 sous-menus repliables ── */
              if (item.id === 'APPROVISIONNEMENT') {
                const submenuVisible = procurementOpen && !isCollapsed;
                return (
                  <div key={item.id} className="space-y-0.5">
                    <button
                      onClick={() => {
                        onSelectModule('APPROVISIONNEMENT', procurementSection);
                        setProcurementOpen(prev => !prev);
                      }}
                      title={isCollapsed ? item.label : undefined}
                      aria-expanded={submenuVisible}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                      }`}
                    >
                      <Icon className="w-4.5 h-4.5 shrink-0" />
                      {!isCollapsed && (
                        <>
                          <span className="flex-1 text-left truncate">{item.label}</span>
                          {item.badge !== undefined && (
                            <span className={`px-1.5 py-0.2 text-[10px] font-bold text-white rounded-full ${item.badgeColor}`}>
                              {item.badge}
                            </span>
                          )}
                          <ChevronDown
                            className={`w-3.5 h-3.5 shrink-0 text-slate-400 transition-transform ${
                              submenuVisible ? '' : '-rotate-90'
                            }`}
                          />
                        </>
                      )}
                    </button>

                    {submenuVisible && (
                      <div className="ml-4 pl-2.5 border-l border-slate-700/70 space-y-0.5 py-0.5">
                        {PROCUREMENT_SUBMENUS.map(sub => {
                          const subActive = isActive && procurementSection === sub.id;
                          return (
                            <button
                              key={sub.id}
                              onClick={() => onSelectModule('APPROVISIONNEMENT', sub.id)}
                              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                                subActive
                                  ? 'bg-blue-600/25 text-blue-200 border-l-2 border-blue-400 -ml-[11px] pl-[13px]'
                                  : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-100'
                              }`}
                            >
                              <span className="flex-1 text-left truncate">{sub.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              /* ── Rubrique GDS : entrée parente + 25 sous-menus repliables ── */
              if (item.id === 'GDS') {
                const submenuVisible = gdsOpen && !isCollapsed;
                return (
                  <div key={item.id} className="space-y-0.5">
                    <button
                      onClick={() => {
                        onSelectModule('GDS', gdsSection);
                        setGdsOpen(prev => !prev);
                      }}
                      title={isCollapsed ? item.label : undefined}
                      aria-expanded={submenuVisible}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                      }`}
                    >
                      <Icon className="w-4.5 h-4.5 shrink-0" />
                      {!isCollapsed && (
                        <>
                          <span className="flex-1 text-left truncate">{item.label}</span>
                          {item.badge !== undefined && (
                            <span className={`px-1.5 py-0.2 text-[10px] font-bold text-white rounded-full ${item.badgeColor}`}>
                              {item.badge}
                            </span>
                          )}
                          <ChevronDown
                            className={`w-3.5 h-3.5 shrink-0 text-slate-400 transition-transform ${
                              submenuVisible ? '' : '-rotate-90'
                            }`}
                          />
                        </>
                      )}
                    </button>

                    {submenuVisible && (
                      <div className="ml-4 pl-2.5 border-l border-slate-700/70 py-0.5 space-y-1">
                        {GDS_SUBMENUS.map(group => (
                          <div key={group.group} className="space-y-0.5">
                            <p className="px-2.5 pt-1 pb-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                              {group.group}
                            </p>
                            {group.items.map(sub => {
                              const subActive = isActive && gdsSection === sub.id;
                              return (
                                <button
                                  key={sub.id}
                                  onClick={() => onSelectModule('GDS', sub.id)}
                                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                                    subActive
                                      ? 'bg-blue-600/25 text-blue-200 border-l-2 border-blue-400 -ml-[11px] pl-[13px]'
                                      : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-100'
                                  }`}
                                >
                                  <span className="flex-1 text-left truncate">{sub.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <button
                  key={item.id}
                  onClick={() => onSelectModule(item.id)}
                  title={isCollapsed ? item.label : undefined}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  <Icon className="w-4.5 h-4.5 shrink-0" />
                  {!isCollapsed && (
                    <span className="flex-1 text-left truncate">{item.label}</span>
                  )}
                  {item.badge !== undefined && (
                    <span
                      className={`px-1.5 py-0.2 text-[10px] font-bold text-white rounded-full ${item.badgeColor} ${
                        isCollapsed ? 'absolute top-1 right-1' : ''
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
              })}
          </div>
        ))}
      </nav>

      {/* Session authentifiée */}
      <div className="p-3 border-t border-slate-800 shrink-0 bg-slate-950/60">
        {!isCollapsed ? (
          <div>
            <div className="flex items-center gap-2 mb-2 text-xs text-slate-400">
              <Users className="w-3.5 h-3.5 text-blue-400" />
              <span className="font-semibold uppercase tracking-wider text-[10px]">
                Poste Actif (Session Authentifiée)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 shrink-0 rounded-full bg-blue-600/30 border border-blue-400 flex items-center justify-center text-xs font-bold text-blue-300">
                {currentUser.name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-slate-200 truncate">{currentUser.name}</div>
                <div className="text-[11px] text-slate-400 truncate">
                  {getRoleLabel(currentUser.role)}
                </div>
              </div>
            </div>
            <div className="mt-1.5 text-[11px] text-slate-400 truncate">
              {currentUser.department}
            </div>
            <button
              type="button"
              onClick={onLogout}
              className="mt-2 w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md bg-slate-800 border border-slate-700 text-[11px] font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-colors cursor-pointer"
              title="Fermer la session et revenir à l'écran de connexion"
            >
              <LogOut className="w-3.5 h-3.5" />
              Changer d'utilisateur
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex justify-center" title={`${currentUser.name} (${getRoleLabel(currentUser.role)})`}>
              <div className="w-8 h-8 rounded-full bg-blue-600/30 border border-blue-400 flex items-center justify-center text-xs font-bold text-blue-300">
                {currentUser.name.charAt(0)}
              </div>
            </div>
            <button
              type="button"
              onClick={onLogout}
              className="w-full flex justify-center py-1.5 rounded-md text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
              title="Changer d'utilisateur"
              aria-label="Changer d'utilisateur"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
