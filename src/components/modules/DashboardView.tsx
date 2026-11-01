/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * MAMORA GP — Tableau de Bord Central de Production & Qualité
 * Indicateurs réels calculés en temps réel à partir de la base de données
 */

import {
  Factory,
  CheckCircle,
  AlertOctagon,
  ShieldAlert,
  Boxes,
  TrendingUp,
  Flame,
  Scale,
  ShoppingCart,
  Truck,
  ArrowUpRight,
  Fish,
  CreditCard,
  Clock,
  AlertTriangle,
  Building2,
  Calendar,
} from 'lucide-react';
import { Suspense, lazy } from 'react';
import { AppDatabase } from '../../services/storage';
import { StatusBadge } from '../common/StatusBadge';

// Recharts et le graphique représentent une part importante du bundle : le
// graphique est donc chargé après le reste du tableau de bord, en parallèle.
const MonthlyRevenueChart = lazy(() =>
  import('./MonthlyRevenueChart').then(m => ({ default: m.MonthlyRevenueChart })),
);

interface DashboardViewProps {
  db: AppDatabase;
  onNavigate: (module: any) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ db, onNavigate }) => {
  // Calculs réels à partir de la base
  const totalPlannedCans = db.workOrders.reduce((acc, wo) => acc + wo.plannedCansQty, 0);
  const totalActualCans = db.workOrders.reduce((acc, wo) => acc + wo.actualCansQty, 0);
  const productionRate = totalPlannedCans > 0 ? ((totalActualCans / totalPlannedCans) * 100).toFixed(1) : '0';

  const activeWorkOrders = db.workOrders.filter(w => w.status === 'EN_COURS');
  const pendingOrders = db.salesOrders.filter(o => o.status === 'CONFIRME' || o.status === 'EN_PREPARATION');
  const blockedBatches = db.nonConformities.filter(n => !n.isResolved);
  const pendingReleases = db.finishedBatches.filter(b => b.releaseStatus === 'EN_ATTENTE');

  const totalRawFishStockKg = db.items
    .filter(i => i.category === 'POISSON_CONGELE' || i.category === 'POISSON_FRAIS')
    .reduce((acc, i) => acc + i.currentStock, 0);

  const totalFinishedStockCans = db.items
    .filter(i => i.category === 'PRODUIT_FINI_THON' || i.category === 'PRODUIT_FINI_SARDINE')
    .reduce((acc, i) => acc + i.currentStock, 0);

  // --- Indicateurs Commerciaux Réels ---
  const todayStr = new Date().toISOString().slice(0, 10);
  
  // CA du jour : total des factures ou BL émis aujourd'hui
  const todayInvoices = db.invoices.filter(inv => inv.invoiceDate === todayStr);
  const todayRevenueDzd = todayInvoices.reduce((acc, inv) => acc + inv.totalAmountDzd, 0);
  const totalRevenueDzd = db.invoices.reduce((acc, inv) => acc + inv.totalAmountDzd, 0);

  // Commandes en attente de livraison
  const pendingDeliveryOrders = db.salesOrders.filter(
    so => so.status === 'CONFIRME' || so.status === 'EN_PREPARATION'
  );
  const pendingDeliveryCans = pendingDeliveryOrders.reduce(
    (acc, so) => acc + so.items.reduce((sum, item) => sum + item.orderedCansQty, 0),
    0
  );
  const pendingDeliveryAmountDzd = pendingDeliveryOrders.reduce((acc, so) => acc + so.totalAmountDzd, 0);

  // Alertes sur les délais de paiement & créances
  const now = new Date();
  const unpaidInvoices = db.invoices.filter(inv => inv.paymentStatus !== 'REGLEE');
  const overdueInvoices = unpaidInvoices.filter(inv => {
    const due = new Date(inv.dueDate);
    return due < now || inv.paymentStatus === 'EN_RETARD';
  });
  const totalUnpaidDzd = unpaidInvoices.reduce(
    (acc, inv) => acc + (inv.totalAmountDzd - inv.paidAmountDzd),
    0
  );
  const totalOverdueDzd = overdueInvoices.reduce(
    (acc, inv) => acc + (inv.totalAmountDzd - inv.paidAmountDzd),
    0
  );

  // Rendements matière moyens
  const completedStepsWithYield = db.stepLogs.filter(s => s.yieldPercent > 0 && s.stepNumber === 4);
  const avgCleaningYield =
    completedStepsWithYield.length > 0
      ? (
          completedStepsWithYield.reduce((acc, s) => acc + s.yieldPercent, 0) /
          completedStepsWithYield.length
        ).toFixed(1)
      : '0.0';

  return (
    <div className="space-y-6">
      {/* En-tête de bienvenue & indicateurs clés de synthèse */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-slate-900 text-white rounded-xl shadow-xs">
        <div>
          <span className="text-xs font-semibold tracking-wider text-blue-400 uppercase">
            SUPERVISION INDUSTRIELLE &amp; SMSDA ISO 22000
          </span>
          <h2 className="text-2xl font-bold tracking-tight mt-1">
            Usine MAMORA Fish — Conserverie Thon &amp; Sardines
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            Suivi temps réel des réceptions, lignes de sertissage, autoclaves et expéditions commerciales
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('PLANIFICATION')}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Factory className="w-4 h-4" />
            <span>Nouvel Ordre (OF)</span>
          </button>
          <button
            onClick={() => onNavigate('COMMERCIAL')}
            className="px-3.5 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Ventes &amp; BL</span>
          </button>
        </div>
      </div>

      {/* Grille des 4 indicateurs majeurs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 : Production Réalisée */}
        <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium">Production du Jour</span>
            <Factory className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-slate-100">
              {totalActualCans.toLocaleString()}
            </span>
            <span className="text-xs text-slate-500">boîtes</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>Prévu : {totalPlannedCans.toLocaleString()}</span>
            <span className="font-semibold text-blue-600 font-mono">{productionRate}%</span>
          </div>
          <div className="mt-2 w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full"
              style={{ width: `${Math.min(100, Number(productionRate))}%` }}
            />
          </div>
        </div>

        {/* KPI 2 : Rendement Matière & Poissons */}
        <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium">Rendement Étêtage/Évisc.</span>
            <Scale className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tracking-tight text-emerald-600 dark:text-emerald-400">
              {avgCleaningYield}%
            </span>
            <span className="text-xs text-slate-500">net matière</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>Stock Poisson Brut :</span>
            <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
              {totalRawFishStockKg.toLocaleString()} kg
            </span>
          </div>
        </div>

        {/* KPI 3 : Sécurité Sanitaire & Lots Bloqués */}
        <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium">Conformité ISO 22000</span>
            <ShieldAlert className="w-4 h-4 text-red-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold font-mono tracking-tight ${
                blockedBatches.length > 0 ? 'text-red-600' : 'text-emerald-600'
              }`}
            >
              {blockedBatches.length}
            </span>
            <span className="text-xs text-slate-500">non-conformité(s)</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>En attente libération :</span>
            <span className="font-mono font-semibold text-amber-600">{pendingReleases.length} lot(s)</span>
          </div>
        </div>

        {/* KPI 4 : Activité Commerciale */}
        <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium">Commandes en Cours</span>
            <Truck className="w-4 h-4 text-cyan-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-slate-100">
              {pendingOrders.length}
            </span>
            <span className="text-xs text-slate-500">bons de commande</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>Stock PF disponible :</span>
            <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
              {totalFinishedStockCans.toLocaleString()} btes
            </span>
          </div>
        </div>
      </div>

      {/* WIDGET : INDICATEURS CLÉS DU MODULE COMMERCIAL (CA DU JOUR, ATTENTE LIVRAISON & DÉLAIS DE PAIEMENT) */}
      <div className="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300 uppercase">
                PILOTAGE COMMERCIAL &amp; TRÉSORERIE
              </span>
              <span className="text-xs font-semibold text-slate-500">·</span>
              <span className="text-xs text-slate-500 font-mono">Date : {new Date().toLocaleDateString('fr-FR')}</span>
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1 flex items-center gap-2">
              <ShoppingCart className="w-4.5 h-4.5 text-cyan-600" />
              <span>Indicateurs Clés Commerciaux &amp; Suivi des Ventes</span>
            </h3>
          </div>

          <button
            onClick={() => onNavigate('COMMERCIAL')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-cyan-700 bg-cyan-50 dark:bg-cyan-950/60 hover:bg-cyan-100 dark:hover:bg-cyan-900/60 rounded-lg border border-cyan-200 dark:border-cyan-800 transition-colors cursor-pointer"
          >
            <span>Ouvrir Module Commercial</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 3 Cartes d'indicateurs commerciaux clés */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 1. CA du Jour */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/70 space-y-2">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold uppercase tracking-wider text-[10px]">Chiffre d'Affaires du Jour</span>
              <CreditCard className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {todayRevenueDzd.toLocaleString()}
              </span>
              <span className="text-xs font-semibold text-slate-500">DZD TTC</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200 dark:border-slate-700">
              <span>{todayInvoices.length > 0 ? `${todayInvoices.length} facture(s) émise(s)` : 'Aucune facture émise ce jour'}</span>
              <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
                Cumul : {totalRevenueDzd.toLocaleString()} DZD
              </span>
            </div>
          </div>

          {/* 2. Commandes en Attente de Livraison */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/70 space-y-2">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold uppercase tracking-wider text-[10px]">Commandes en Attente Livraison</span>
              <Truck className="w-4 h-4 text-cyan-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
                {pendingDeliveryOrders.length}
              </span>
              <span className="text-xs text-slate-500">commandes ({pendingDeliveryCans.toLocaleString()} boîtes)</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200 dark:border-slate-700">
              <span>Valeur en portefeuille :</span>
              <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400">
                {pendingDeliveryAmountDzd.toLocaleString()} DZD
              </span>
            </div>
          </div>

          {/* 3. Alertes Délais de Paiement */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/70 space-y-2">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold uppercase tracking-wider text-[10px]">Alertes Délais de Paiement</span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-bold font-mono ${overdueInvoices.length > 0 ? 'text-red-600' : 'text-slate-900 dark:text-slate-100'}`}>
                {unpaidInvoices.length}
              </span>
              <span className="text-xs text-slate-500">facture(s) en cours ({overdueInvoices.length} échue(s))</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200 dark:border-slate-700">
              <span>Créances à recouvrer :</span>
              <span className={`font-mono font-bold ${overdueInvoices.length > 0 ? 'text-red-600' : 'text-amber-600'}`}>
                {totalUnpaidDzd.toLocaleString()} DZD
              </span>
            </div>
          </div>
        </div>

        {/* Graphique en Barres Recharts : Chiffre d'Affaires Mensuel (6 Derniers Mois) */}
        <Suspense
          fallback={
            <div
              aria-hidden="true"
              className="h-[28rem] rounded-xl bg-slate-100 dark:bg-slate-800/40 animate-pulse"
            />
          }
        >
          <MonthlyRevenueChart
            invoices={db.invoices}
            onOpenCommercial={() => onNavigate('COMMERCIAL')}
          />
        </Suspense>

        {/* Détails opérationnels : Commandes à expédier & Échéancier de règlement */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
          {/* Liste des commandes en attente de livraison */}
          <div className="p-4 bg-slate-50/60 dark:bg-slate-800/30 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider text-[11px]">
                Commandes Clients à Préparer / Livrer
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                {pendingDeliveryOrders.length} BC en file
              </span>
            </div>

            <div className="space-y-2">
              {pendingDeliveryOrders.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs italic bg-white dark:bg-slate-900 rounded-lg border border-dashed border-slate-200 dark:border-slate-800">
                  <Truck className="w-6 h-6 mx-auto mb-1.5 opacity-30" />
                  <span>Aucune commande en attente de livraison</span>
                </div>
              ) : (
                pendingDeliveryOrders.map(order => {
                  const totalCans = order.items.reduce((sum, itm) => sum + itm.orderedCansQty, 0);
                  return (
                    <div
                      key={order.id}
                      className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-blue-600">{order.orderNumber}</span>
                          <StatusBadge status={order.status} size="sm" />
                        </div>
                        <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                          {order.customerName}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>Date livraison souhaitée : <strong>{order.requestedDeliveryDate}</strong></span>
                        </div>
                      </div>

                      <div className="text-right font-mono">
                        <div className="font-bold text-slate-900 dark:text-slate-100">
                          {order.totalAmountDzd.toLocaleString()} DZD
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {totalCans.toLocaleString()} boîtes
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Liste des factures & surveillance des échéances */}
          <div className="p-4 bg-slate-50/60 dark:bg-slate-800/30 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider text-[11px]">
                Surveillance des Échéances &amp; Délais de Paiement
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                {unpaidInvoices.length} factures ouvertes
              </span>
            </div>

            <div className="space-y-2">
              {unpaidInvoices.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs italic bg-white dark:bg-slate-900 rounded-lg border border-dashed border-slate-200 dark:border-slate-800">
                  <CreditCard className="w-6 h-6 mx-auto mb-1.5 opacity-30" />
                  <span>Aucune facture impayée ou en attente d'échéance</span>
                </div>
              ) : (
                unpaidInvoices.map(inv => {
                  const dueDate = new Date(inv.dueDate);
                  const isPast = dueDate < now;
                  const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 3600 * 24));

                  return (
                    <div
                      key={inv.id}
                      className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-cyan-600">{inv.invoiceNumber}</span>
                          <StatusBadge status={inv.paymentStatus} size="sm" />
                        </div>
                        <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                          {inv.customerName}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>Échéance : <strong>{inv.dueDate}</strong></span>
                          {isPast ? (
                            <span className="text-red-600 font-bold ml-1">(En retard de {Math.abs(diffDays)}j)</span>
                          ) : (
                            <span className="text-slate-500 ml-1">(Dans {diffDays}j)</span>
                          )}
                        </div>
                      </div>

                      <div className="text-right font-mono">
                        <div className="font-bold text-slate-900 dark:text-slate-100">
                          {inv.totalAmountDzd.toLocaleString()} DZD
                        </div>
                        <div className="text-[11px] text-amber-600 font-semibold">
                          Reste : {(inv.totalAmountDzd - inv.paidAmountDzd).toLocaleString()} DZD
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Grille centrale : Lignes de fabrication actives & Autoclaves */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne 1 & 2 : Ordres de fabrication en atelier */}
        <div className="lg:col-span-2 p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Ordres de Fabrication Actifs (Atelier)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Suivi de production, rendements réels et avancement des 17 étapes
              </p>
            </div>
            <button
              onClick={() => onNavigate('PLANIFICATION')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
            >
              <span>Voir tout</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {db.workOrders.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <Factory className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="font-medium text-xs">Aucun ordre de fabrication actif en atelier</p>
                <p className="text-[11px] mt-0.5">Créez un nouvel OF pour lancer la fabrication</p>
              </div>
            ) : (
              db.workOrders.map(wo => {
                const progressPercent =
                  wo.plannedCansQty > 0
                    ? Math.min(100, Math.round((wo.actualCansQty / wo.plannedCansQty) * 100))
                    : 0;
                return (
                  <div key={wo.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-blue-600">{wo.orderNumber}</span>
                        <StatusBadge status={wo.status} size="sm" />
                        <span className="text-xs text-slate-400">·</span>
                        <span className="text-xs text-slate-500 font-medium">{wo.lineId}</span>
                      </div>
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {wo.productName}
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-3">
                        <span>Chef : <strong>{wo.teamLeader}</strong></span>
                        <span>·</span>
                        <span>Lot MP : <strong className="font-mono">{wo.assignedRawBatchId}</strong></span>
                      </div>
                    </div>

                    <div className="sm:text-right min-w-40">
                      <div className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                        {wo.actualCansQty.toLocaleString()} / {wo.plannedCansQty.toLocaleString()} boîtes
                      </div>
                      <div className="text-xs text-slate-500">
                        {wo.plannedCartonsQty} cartons ({progressPercent}%)
                      </div>
                      <div className="mt-1.5 w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Colonne 3 : Cycles Stérilisation Autoclaves & Contrôles CCP-1 */}
        <div className="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Autoclaves &amp; Stérilisation
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Surveillance CCP-1 (Barème &amp; $F_0$)</p>
            </div>
            <Flame className="w-4 h-4 text-amber-600" />
          </div>

          <div className="mt-4 space-y-4 flex-1">
            {db.autoclaveCycles.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <Flame className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="font-medium text-xs">Aucun cycle d'autoclave enregistré</p>
                <p className="text-[11px] mt-0.5">Les cycles apparaîtront lors des opérations de stérilisation</p>
              </div>
            ) : (
              db.autoclaveCycles.map(cycle => (
                <div
                  key={cycle.id}
                  className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100">
                      {cycle.cycleNumber}
                    </span>
                    <StatusBadge status={cycle.cycleStatus} size="sm" />
                  </div>
                  <div className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                    {cycle.autoclaveName}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400 font-mono bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-800">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Température :</span>
                      <strong className="text-slate-800 dark:text-slate-200">{cycle.actualTempMeanC}°C</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Valeur F0 :</span>
                      <strong className="text-emerald-600 dark:text-emerald-400">{cycle.calculatedF0} min</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Durée Palier :</span>
                      <strong className="text-slate-800 dark:text-slate-200">{cycle.actualHoldingDurationMin} min</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Pression :</span>
                      <strong className="text-slate-800 dark:text-slate-200">{cycle.actualPressureBar} bar</strong>
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center justify-between">
                    <span>Opérateur : {cycle.operatorName}</span>
                    {cycle.isApprovedByQuality ? (
                      <span className="text-emerald-600 font-semibold flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Validé Qualité
                      </span>
                    ) : (
                      <span className="text-amber-600 font-medium">En attente revue</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 mt-4">
            <button
              onClick={() => onNavigate('SERTISSAGE_AUTOCLAVES')}
              className="w-full py-2 text-xs font-semibold text-center text-blue-600 hover:text-blue-700 bg-blue-50 dark:bg-blue-950/40 rounded-lg transition-colors cursor-pointer"
            >
              Accéder aux courbes &amp; fiches de sertissage →
            </button>
          </div>
        </div>
      </div>

      {/* Rangée inférieure : Dernières réceptions matières & Commandes clients récentes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Réceptions Récentes */}
        <div className="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Derniers Arrivages de Poissons (Agréage ISO 22000)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Contrôles température et histamines à réception</p>
            </div>
            <Fish className="w-4 h-4 text-blue-600" />
          </div>

          <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
            {db.receptions.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <Fish className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="font-medium text-xs">Aucun arrivage de poisson enregistré</p>
                <p className="text-[11px] mt-0.5">Enregistrez un bon de réception à quai pour alimenter le stock</p>
              </div>
            ) : (
              db.receptions.map(rec => (
                <div key={rec.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100">
                        {rec.internalBatchNumber}
                      </span>
                      <StatusBadge status={rec.decision} size="sm" />
                    </div>
                    <div className="text-xs font-medium text-slate-800 dark:text-slate-200">
                      {rec.species} · {rec.supplier}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Temp : <strong className="font-mono">{rec.temperatureAtIntakeC}°C</strong> · Histamine :{' '}
                      <strong className="font-mono">{rec.histaminePpm} ppm</strong>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100">
                      {rec.acceptedQtyKg.toLocaleString()} kg
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {new Date(rec.receptionDate).toLocaleDateString('fr-FR')}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Commandes Clients Récentes */}
        <div className="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Commandes Clients &amp; Expéditions (GMS &amp; Export)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Vérification de libération sanitaire des lots expédiés</p>
            </div>
            <ShoppingCart className="w-4 h-4 text-emerald-600" />
          </div>

          <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
            {db.salesOrders.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="font-medium text-xs">Aucune commande client enregistrée</p>
                <p className="text-[11px] mt-0.5">Créez un bon de commande dans le module commercial</p>
              </div>
            ) : (
              db.salesOrders.map(so => (
                <div key={so.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100">
                        {so.orderNumber}
                      </span>
                      <StatusBadge status={so.status} size="sm" />
                    </div>
                    <div className="text-xs font-medium text-slate-800 dark:text-slate-200">
                      {so.customerName}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Livraison souhaitée : <strong>{so.requestedDeliveryDate}</strong>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      {so.totalAmountDzd.toLocaleString()} DZD
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {so.items.reduce((acc, i) => acc + i.orderedCansQty, 0).toLocaleString()} boîtes
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
