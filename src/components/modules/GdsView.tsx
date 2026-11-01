/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * MAMORA GP — GDS : Gestion des Stocks (matières premières & produits finis).
 * Module central : il orchestre les entrées, sorties, lots, transferts,
 * inventaires et la traçabilité en s'appuyant sur le moteur de stock unique.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeftRight,
  Boxes,
  ClipboardList,
  Factory,
  FileText,
  GitBranch,
  History,
  Layers,
  LayoutDashboard,
  PackageCheck,
  PackageMinus,
  PackageSearch,
  RotateCcw,
  Scale,
  Settings2,
  ShieldCheck,
  Warehouse as WarehouseIcon,
} from 'lucide-react';
import { storage } from '../../services/storage';
import {
  BatchReleaseStatus,
  FinishedBatch,
  GdsScope,
  STOCK_QUALITY_LABELS,
  StockQualityStatus,
  User,
} from '../../types';
import { Modal } from '../common/Modal';
import { MagasinsView } from './MagasinsView';
import { TransfertsView } from './TransfertsView';
import {
  EmptyState,
  GdsCard,
  Notice,
  Pill,
  QualityPill,
  btnGhost,
  btnPrimary,
  fmtDate,
  fmtQty,
  inputCls,
  labelCls,
  tdCls,
  thCls,
} from './gds/GdsShared';
import { GdsStockSection } from './gds/GdsStockSection';
import { GdsInventorySection } from './gds/GdsInventorySection';
import { GdsLotsSection, GdsTracePanel, GdsTraceSearchSection } from './gds/GdsLotsSection';
import { GdsHistorySection } from './gds/GdsHistorySection';
import {
  MpReceiptsSection,
  PfIssueSection,
  PfProductionReceiptSection,
} from './gds/GdsFlowSections';
import { MpConsumptionSection, MpReturnsSection } from './gds/GdsConsumptionSection';
import {
  GdsAlertsSection,
  GdsDashboardSection,
  GdsReportsSection,
  GdsSettingsSection,
} from './gds/GdsTransverseSections';

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

// ---------------------------------------------------------------------------
// Libération qualité des lots finis
// ---------------------------------------------------------------------------

const PfReleaseSection: React.FC<{
  currentUser: User;
  onNotice: (message: string) => void;
  onError: (message: string) => void;
}> = ({ currentUser, onNotice, onError }) => {
  const [revision, setRevision] = useState(0);
  const [filter, setFilter] = useState<'ALL' | BatchReleaseStatus>('ALL');
  const [target, setTarget] = useState<FinishedBatch | null>(null);
  const [decision, setDecision] = useState<Exclude<BatchReleaseStatus, 'EN_ATTENTE'>>('LIBERE');
  const [notes, setNotes] = useState('');

  const batches = useMemo(() => storage.getFinishedBatches(), [revision]);
  const filtered = batches.filter(batch => filter === 'ALL' || batch.releaseStatus === filter);
  const canRelease = storage.canGds('GDS_RELEASE_FP', currentUser);

  const pending = batches.filter(batch => batch.releaseStatus === 'EN_ATTENTE').length;

  const submit = () => {
    if (!target) return;
    try {
      storage.releaseFinishedBatch(target.id, currentUser.name, decision, notes);
      onNotice(
        `Lot ${target.batchNumber} : décision ${decision} enregistrée. Le stock a été repositionné dans la zone correspondante.`
      );
      setTarget(null);
      setNotes('');
      setRevision(value => value + 1);
    } catch (error) {
      onError(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          <p className="text-[10px] uppercase font-semibold text-slate-500">Lots fabriqués</p>
          <p className="text-lg font-bold">{batches.length}</p>
        </div>
        <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          <p className="text-[10px] uppercase font-semibold text-slate-500">En attente</p>
          <p className="text-lg font-bold text-amber-600">{pending}</p>
        </div>
        <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          <p className="text-[10px] uppercase font-semibold text-slate-500">Libérés</p>
          <p className="text-lg font-bold text-emerald-600">
            {batches.filter(b => b.releaseStatus === 'LIBERE').length}
          </p>
        </div>
        <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          <p className="text-[10px] uppercase font-semibold text-slate-500">Bloqués / rejetés</p>
          <p className="text-lg font-bold text-red-600">
            {batches.filter(b => b.releaseStatus === 'BLOQUE' || b.releaseStatus === 'REJETE').length}
          </p>
        </div>
      </div>

      <GdsCard
        title="Contrôle et libération des lots finis"
        subtitle="La libération déplace physiquement le stock entre la zone d'attente, la zone libérée et la quarantaine."
        actions={
          <select
            className={inputCls}
            value={filter}
            onChange={event => setFilter(event.target.value as 'ALL' | BatchReleaseStatus)}
            aria-label="Filtrer par statut de libération"
          >
            <option value="ALL">Tous les statuts</option>
            <option value="EN_ATTENTE">En attente</option>
            <option value="LIBERE">Libéré</option>
            <option value="BLOQUE">Bloqué</option>
            <option value="REJETE">Rejeté</option>
          </select>
        }
        bodyClassName="p-0"
      >
        {filtered.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="Aucun lot de fabrication"
            hint="Les lots apparaissent dès la réception des produits finis depuis la production."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/60">
                <tr>
                  <th className={thCls}>Lot</th>
                  <th className={thCls}>OF</th>
                  <th className={thCls}>Produit</th>
                  <th className={`${thCls} text-right`}>Boîtes</th>
                  <th className={thCls}>Fabrication</th>
                  <th className={thCls}>Péremption</th>
                  <th className={thCls}>Statut lot</th>
                  <th className={thCls}>Libération</th>
                  <th className={thCls}>Décision</th>
                  <th className={thCls} />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map(batch => {
                  const lot = storage.getStockLots({ lotNumber: batch.batchNumber })[0];
                  const workOrder = storage
                    .getWorkOrders()
                    .find(w => w.id === batch.workOrderId || w.orderNumber === batch.workOrderId);
                  return (
                    <tr key={batch.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className={`${tdCls} font-mono text-[10.5px] font-semibold`}>
                        {batch.batchNumber}
                      </td>
                      <td className={`${tdCls} font-mono text-[10px] text-slate-500`}>
                        {workOrder?.orderNumber || batch.workOrderId}
                      </td>
                      <td className={tdCls}>{batch.productName}</td>
                      <td className={`${tdCls} text-right font-mono`}>
                        {fmtQty(batch.conformingCans)}
                      </td>
                      <td className={`${tdCls} text-slate-500`}>{fmtDate(batch.productionDate)}</td>
                      <td className={`${tdCls} text-slate-500`}>{fmtDate(batch.bestBeforeDate)}</td>
                      <td className={tdCls}>
                        {lot ? (
                          <QualityPill status={lot.qualityStatus} />
                        ) : (
                          <Pill tone="slate">hors stock</Pill>
                        )}
                      </td>
                      <td className={tdCls}>
                        <Pill
                          tone={
                            batch.releaseStatus === 'LIBERE'
                              ? 'emerald'
                              : batch.releaseStatus === 'EN_ATTENTE'
                                ? 'amber'
                                : 'red'
                          }
                        >
                          {batch.releaseStatus}
                        </Pill>
                      </td>
                      <td className={`${tdCls} text-[10px] text-slate-500`}>
                        {batch.releasedBy ? (
                          <>
                            {batch.releasedBy}
                            <span className="block">{fmtDate(batch.releaseDate)}</span>
                          </>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className={`${tdCls} text-right`}>
                        {canRelease && (
                          <button
                            type="button"
                            className="text-[10px] font-semibold text-blue-600 hover:underline cursor-pointer"
                            onClick={() => {
                              setTarget(batch);
                              setDecision('LIBERE');
                              setNotes('');
                            }}
                          >
                            Statuer
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </GdsCard>

      {!canRelease && (
        <p className="text-[10.5px] text-amber-600 px-1">
          Votre profil ({currentUser.role}) ne dispose pas de l'habilitation « Libérer les produits
          finis » : la décision reste possible depuis le module Dossiers & Libération Lots.
        </p>
      )}

      {target && (
        <Modal
          isOpen
          onClose={() => setTarget(null)}
          title={`Décision de libération — ${target.batchNumber}`}
          subtitle={`${target.productName} — ${fmtQty(target.conformingCans)} boîtes conformes`}
          maxWidth="lg"
        >
          <div className="space-y-3">
            <div>
              <label className={labelCls}>Décision *</label>
              <select
                className={`${inputCls} w-full`}
                value={decision}
                onChange={event =>
                  setDecision(event.target.value as Exclude<BatchReleaseStatus, 'EN_ATTENTE'>)
                }
              >
                <option value="LIBERE">Libérer (stock disponible)</option>
                <option value="BLOQUE">Bloquer (quarantaine)</option>
                <option value="REJETE">Rejeter (non conforme)</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Motif / conclusions du contrôle *</label>
              <textarea
                className={`${inputCls} w-full h-24`}
                value={notes}
                onChange={event => setNotes(event.target.value)}
                placeholder="Ex : autoclavage conforme (F0), épreuve d'étuve 7 j négative, sertissage conforme…"
              />
            </div>
            <p className="text-[10px] text-slate-500">
              Décision enregistrée sous le profil {currentUser.name}. Le stock est déplacé vers la
              zone correspondante et l'opération est inscrite au journal d'audit.
            </p>
            <div className="flex justify-end gap-2">
              <button type="button" className={btnGhost} onClick={() => setTarget(null)}>
                Annuler
              </button>
              <button
                type="button"
                className={btnPrimary}
                onClick={submit}
                disabled={!notes.trim()}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Enregistrer la décision
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Vue principale
// ---------------------------------------------------------------------------

interface GdsViewProps {
  currentUser: User;
  section: GdsSection;
  onNavigate: (section: GdsSection) => void;
  onOpenProcurementReceptions: () => void;
}

export const GdsView: React.FC<GdsViewProps> = ({
  currentUser,
  section,
  onNavigate,
  onOpenProcurementReceptions,
}) => {
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [traceLot, setTraceLot] = useState<string | null>(null);

  useEffect(() => storage.subscribe(() => setRevision(value => value + 1)), []);

  const alerts = useMemo(() => storage.getGdsAlerts(), [revision]);
  const criticalAlerts = alerts.filter(alert => alert.severity === 'CRITIQUE').length;
  const pendingTransfers = useMemo(
    () =>
      storage
        .getTransfers()
        .filter(t =>
          ['EN_ATTENTE_VALIDATION', 'VALIDE', 'EN_PREPARATION', 'EXPEDIE'].includes(t.status)
        ).length,
    [revision]
  );
  const pendingReleases = useMemo(
    () => storage.getFinishedBatches().filter(batch => batch.releaseStatus === 'EN_ATTENTE').length,
    [revision]
  );

  const scope: GdsScope = section.startsWith('PF_') ? 'PRODUITS_FINIS' : 'MATIERES_PREMIERES';

  const notify = (message: string) => {
    setNotice(message);
    setError('');
  };
  const fail = (message: string) => {
    setError(message);
    setNotice('');
  };

  const header = (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Boxes className="w-5 h-5 text-blue-600" />
          <span>GDS — Gestion des Stocks</span>
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">{GDS_SECTION_LABELS[section]}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
          <WarehouseIcon className="w-3.5 h-3.5" />
          {storage.getAccessibleWarehouses(currentUser).length} magasin(s) accessibles
        </span>
        <button
          type="button"
          onClick={() => onNavigate('ALERTS')}
          className={`inline-flex items-center gap-1 px-2 py-1 rounded border ${
            criticalAlerts > 0
              ? 'border-red-200 bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800'
              : 'border-slate-200 bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          {criticalAlerts} alerte(s) critique(s)
        </button>
        <button
          type="button"
          onClick={() => onNavigate('MP_TRANSFERS')}
          className="inline-flex items-center gap-1 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
        >
          <ArrowLeftRight className="w-3.5 h-3.5" />
          {pendingTransfers} transfert(s) en cours
        </button>
        <button
          type="button"
          onClick={() => onNavigate('PF_RELEASE')}
          className="inline-flex items-center gap-1 px-2 py-1 rounded border border-amber-200 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          {pendingReleases} lot(s) à libérer
        </button>
      </div>
    </div>
  );

  const banner = (error || notice) && (
    <Notice
      tone={error ? 'error' : 'success'}
      message={error || notice}
      onClose={() => {
        setError('');
        setNotice('');
      }}
    />
  );

  const body = (() => {
    switch (section) {
      case 'MP_DASHBOARD':
        return <GdsDashboardSection scope="MATIERES_PREMIERES" onNavigate={key => onNavigate(key as GdsSection)} />;
      case 'PF_DASHBOARD':
        return <GdsDashboardSection scope="PRODUITS_FINIS" onNavigate={key => onNavigate(key as GdsSection)} />;

      case 'MP_STOCK':
        return <GdsStockSection scope="MATIERES_PREMIERES" currentUser={currentUser} onOpenTrace={setTraceLot} />;
      case 'PF_STOCK':
        return <GdsStockSection scope="PRODUITS_FINIS" currentUser={currentUser} onOpenTrace={setTraceLot} />;

      case 'MP_RECEIPTS':
        return (
          <MpReceiptsSection
            currentUser={currentUser}
            onOpenProcurementReceptions={onOpenProcurementReceptions}
          />
        );

      case 'MP_ISSUES':
        // Sortie directe : la déduction n'a lieu qu'à la validation de la consommation réelle.
        return (
          <MpConsumptionSection currentUser={currentUser} onNotice={notify} onError={fail} />
        );
      case 'MP_RETURNS':
        return <MpReturnsSection currentUser={currentUser} onNotice={notify} onError={fail} />;

      case 'MP_LOTS':
        return <GdsLotsSection scope="MATIERES_PREMIERES" currentUser={currentUser} onOpenTrace={setTraceLot} />;
      case 'PF_LOTS':
        return <GdsLotsSection scope="PRODUITS_FINIS" currentUser={currentUser} onOpenTrace={setTraceLot} />;

      case 'MP_INVENTORY':
        return (
          <GdsInventorySection
            scope="MATIERES_PREMIERES"
            currentUser={currentUser}
            onNotice={notify}
            onError={fail}
          />
        );
      case 'PF_INVENTORY':
        return (
          <GdsInventorySection
            scope="PRODUITS_FINIS"
            currentUser={currentUser}
            onNotice={notify}
            onError={fail}
          />
        );

      case 'MP_TRACE':
        return <GdsTraceSearchSection scope="MATIERES_PREMIERES" />;
      case 'PF_TRACE':
        return <GdsTraceSearchSection scope="PRODUITS_FINIS" />;

      case 'MP_HISTORY':
        return <GdsHistorySection scope="MATIERES_PREMIERES" currentUser={currentUser} />;
      case 'PF_HISTORY':
        return <GdsHistorySection scope="PRODUITS_FINIS" currentUser={currentUser} />;

      case 'PF_RECEIPTS':
        return (
          <PfProductionReceiptSection currentUser={currentUser} onNotice={notify} onError={fail} />
        );

      case 'PF_RELEASE':
        return <PfReleaseSection currentUser={currentUser} onNotice={notify} onError={fail} />;

      case 'PF_PREPARE':
        return (
          <PfIssueSection
            currentUser={currentUser}
            onNotice={notify}
            onError={fail}
            focusPreparation
          />
        );
      case 'PF_ISSUES':
        return (
          <PfIssueSection currentUser={currentUser} onNotice={notify} onError={fail} />
        );

      case 'MP_TRANSFERS':
      case 'PF_TRANSFERS':
        return (
          <div className="space-y-3">
            <div className="px-3 py-2 rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800 text-[11px] text-blue-800 dark:text-blue-300">
              Le workflow complet des transferts (validation, mise en transit, réception, écarts,
              clôtures partielles) est mutualisé dans un module unique. Le stock en transit n'est
              jamais compté deux fois.
            </div>
            <TransfertsView currentUser={currentUser} />
          </div>
        );

      case 'WAREHOUSES':
        return <MagasinsView currentUser={currentUser} />;

      case 'ALERTS':
        return <GdsAlertsSection />;

      case 'REPORTS':
        return <GdsReportsSection />;

      case 'SETTINGS':
        return <GdsSettingsSection currentUser={currentUser} />;

      default:
        return null;
    }
  })();

  return (
    <div className="space-y-4">
      {header}
      {banner}
      {body}
      {traceLot && <GdsTracePanel lotNumber={traceLot} onClose={() => setTraceLot(null)} />}
    </div>
  );
};

export const GdsIcons = {
  LayoutDashboard,
  ClipboardList,
  PackageSearch,
  FileText,
  Factory,
  RotateCcw,
  ArrowLeftRight,
  Layers,
  Scale,
  GitBranch,
  History,
  PackageCheck,
  PackageMinus,
  Settings2,
  STOCK_QUALITY_LABELS,
};

export type { StockQualityStatus };
