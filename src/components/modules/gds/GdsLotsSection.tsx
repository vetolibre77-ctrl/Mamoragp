/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * MAMORA GP — GDS : lots, statuts qualité et traçabilité bidirectionnelle.
 */

import React, { useMemo, useState } from 'react';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  GitBranch,
  Layers,
  Lock,
  Search,
  ShieldCheck,
  Truck,
} from 'lucide-react';
import { storage } from '../../../services/storage';
import {
  GdsScope,
  LotTraceability,
  STOCK_QUALITY_LABELS,
  StockQualityStatus,
  User,
} from '../../../types';
import { Modal } from '../../common/Modal';
import {
  EmptyState,
  GdsCard,
  Pill,
  QualityPill,
  SearchField,
  btnGhost,
  btnPrimary,
  fmtDate,
  fmtDateTime,
  fmtQty,
  fmtQtyUnit,
  inputCls,
  labelCls,
  tdCls,
  thCls,
} from './GdsShared';

// ---------------------------------------------------------------------------
// Panneau de traçabilité bidirectionnelle
// ---------------------------------------------------------------------------

export const GdsTracePanel: React.FC<{ lotNumber: string; onClose: () => void }> = ({
  lotNumber,
  onClose,
}) => {
  const trace: LotTraceability | undefined = useMemo(
    () => storage.getLotTraceability(lotNumber),
    [lotNumber]
  );

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={`Traçabilité du lot ${lotNumber}`}
      subtitle="Chaîne amont / aval reconstituée à partir des mouvements et consommations réels"
      maxWidth="4xl"
    >
      {!trace ? (
        <EmptyState
          icon={GitBranch}
          title="Lot introuvable"
          hint="Vérifiez le numéro de lot. La traçabilité ne s'appuie que sur les liens réellement enregistrés dans les mouvements, réceptions et consommations."
        />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
              <p className="text-[10px] uppercase font-semibold text-slate-500">Article</p>
              <p className="text-[12px] font-semibold">{trace.itemCode}</p>
              <p className="text-[11px] text-slate-500 truncate">{trace.designation}</p>
            </div>
            <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
              <p className="text-[10px] uppercase font-semibold text-slate-500">Statut qualité</p>
              <div className="mt-1">
                <QualityPill status={trace.qualityStatus} />
              </div>
            </div>
            <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
              <p className="text-[10px] uppercase font-semibold text-slate-500">Quantité restante</p>
              <p className="text-[12px] font-semibold font-mono">
                {fmtQtyUnit(trace.remainingQty, trace.unit)}
              </p>
            </div>
            <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
              <p className="text-[10px] uppercase font-semibold text-slate-500">Péremption</p>
              <p className="text-[12px] font-semibold">{fmtDate(trace.expiryDate)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <GdsCard title="Amont — origine du lot" bodyClassName="p-3">
              <dl className="space-y-1 text-[11px]">
                {trace.upstream.supplierName && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">Fournisseur</dt>
                    <dd className="font-medium text-right">{trace.upstream.supplierName}</dd>
                  </div>
                )}
                {trace.upstream.receptionNumber && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">Réception</dt>
                    <dd className="font-mono">{trace.upstream.receptionNumber}</dd>
                  </div>
                )}
                {trace.upstream.receptionDate && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">Date de réception</dt>
                    <dd>{fmtDate(trace.upstream.receptionDate)}</dd>
                  </div>
                )}
                {trace.upstream.supplierLotNumber && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">Lot fournisseur</dt>
                    <dd className="font-mono">{trace.upstream.supplierLotNumber}</dd>
                  </div>
                )}
                {trace.upstream.workOrderNumber && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">Ordre de fabrication</dt>
                    <dd className="font-mono">{trace.upstream.workOrderNumber}</dd>
                  </div>
                )}
                {trace.upstream.productionDate && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">Date de fabrication</dt>
                    <dd>{fmtDate(trace.upstream.productionDate)}</dd>
                  </div>
                )}
                {Object.keys(trace.upstream).length === 0 && (
                  <p className="text-slate-400">
                    Aucun document d'origine rattaché à ce lot (entrée manuelle ou reprise de stock).
                  </p>
                )}
              </dl>
              <div className="mt-3">
                <p className="text-[10px] uppercase font-semibold text-slate-500 mb-1">
                  Magasins détenteurs
                </p>
                {trace.warehouses.length === 0 ? (
                  <p className="text-[11px] text-slate-400">Aucun stock restant.</p>
                ) : (
                  <ul className="space-y-1">
                    {trace.warehouses.map((warehouse, index) => (
                      <li key={`${warehouse.code}-${index}`} className="flex items-center gap-2 text-[11px]">
                        <span className="font-mono text-[10px] text-slate-500">{warehouse.code}</span>
                        <span className="flex-1 truncate">{warehouse.designation}</span>
                        <span className="font-mono">{fmtQty(warehouse.quantity)}</span>
                        <QualityPill status={warehouse.qualityStatus} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </GdsCard>

            <GdsCard title="Aval — destinations réelles" bodyClassName="p-3">
              {trace.scope === 'MATIERES_PREMIERES' ? (
                trace.workOrders.length === 0 ? (
                  <p className="text-[11px] text-slate-400">
                    Aucun ordre de fabrication n'a consommé ce lot.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {trace.workOrders.map(workOrder => (
                      <div
                        key={workOrder.workOrderId}
                        className="rounded-lg border border-slate-200 dark:border-slate-700 p-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-[11px] font-semibold">
                            {workOrder.orderNumber}
                          </span>
                          <span className="text-[11px] font-mono text-slate-500">
                            {fmtQtyUnit(workOrder.quantityUsed, workOrder.unit)} utilisés
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate">{workOrder.productName}</p>
                        {workOrder.finishedBatches.length > 0 && (
                          <ul className="mt-1 space-y-0.5">
                            {workOrder.finishedBatches.map(batch => (
                              <li
                                key={batch.batchNumber}
                                className="flex items-center justify-between gap-2 text-[10.5px]"
                              >
                                <span className="font-mono text-slate-600 dark:text-slate-300">
                                  {batch.batchNumber}
                                </span>
                                <span className="text-slate-500">
                                  {fmtQty(batch.conformingCans)} boîtes
                                </span>
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
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                )
              ) : trace.deliveries.length === 0 ? (
                <p className="text-[11px] text-slate-400">
                  Aucun bon de livraison n'a servi ce lot fini.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {trace.deliveries.map(delivery => (
                    <li
                      key={delivery.deliveryNumber}
                      className="flex items-center justify-between gap-2 text-[11px]"
                    >
                      <span className="font-mono">{delivery.deliveryNumber}</span>
                      <span className="flex-1 truncate text-slate-500">{delivery.customerName}</span>
                      <span className="text-slate-500">{fmtDate(delivery.date)}</span>
                      <span className="font-mono">{fmtQty(delivery.cans)} bt</span>
                    </li>
                  ))}
                </ul>
              )}

              {trace.scope === 'PRODUITS_FINIS' && (
                <div className="mt-3">
                  <p className="text-[10px] uppercase font-semibold text-slate-500 mb-1 flex items-center gap-1">
                    <ArrowUpFromLine className="w-3 h-3" />
                    Matières réellement consommées
                  </p>
                  {trace.consumedMaterials.length === 0 ? (
                    <p className="text-[11px] text-slate-400">
                      Aucune fiche de consommation rattachée à cet ordre de fabrication.
                    </p>
                  ) : (
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-[10px] uppercase text-slate-500">
                          <th className="py-1">Article</th>
                          <th className="py-1">Lot</th>
                          <th className="py-1 text-right">Quantité</th>
                          <th className="py-1">Fiche</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {trace.consumedMaterials.map((material, index) => (
                          <tr key={`${material.lotNumber}-${index}`}>
                            <td className="py-1 text-[10.5px]">
                              <span className="font-mono text-slate-500">{material.itemCode}</span>{' '}
                              {material.designation}
                            </td>
                            <td className="py-1 font-mono text-[10.5px]">{material.lotNumber}</td>
                            <td className="py-1 text-right font-mono text-[10.5px]">
                              {fmtQtyUnit(material.quantity, material.unit)}
                            </td>
                            <td className="py-1 font-mono text-[10px] text-slate-500">
                              {material.consumptionNumber}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </GdsCard>
          </div>

          <GdsCard
            title={`Mouvements du lot (${trace.movements.length})`}
            bodyClassName="p-0"
          >
            {trace.movements.length === 0 ? (
              <EmptyState title="Aucun mouvement enregistré" />
            ) : (
              <div className="max-h-64 overflow-y-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 sticky top-0">
                    <tr>
                      <th className={thCls}>Date</th>
                      <th className={thCls}>Type</th>
                      <th className={thCls}>Document</th>
                      <th className={thCls}>Magasin source → destination</th>
                      <th className={`${thCls} text-right`}>Quantité</th>
                      <th className={`${thCls} text-right`}>Effet</th>
                      <th className={thCls}>Utilisateur</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {trace.movements.map(movement => (
                      <tr key={movement.id}>
                        <td className={tdCls}>{fmtDateTime(movement.timestamp)}</td>
                        <td className={tdCls}>
                          <Pill tone={movement.type === 'ENTREE_RECEPTION' || movement.type === 'RECEPTION_PRODUCTION' ? 'emerald' : movement.type.includes('SORTIE') || movement.type === 'CONSOMMATION_OF' ? 'orange' : 'slate'}>
                            {movement.type}
                          </Pill>
                        </td>
                        <td className={`${tdCls} font-mono text-[10px]`}>
                          {movement.documentNumber || '—'}
                        </td>
                        <td className={`${tdCls} text-slate-500`}>
                          {movement.sourceWarehouseId ? movement.sourceWarehouseId : '—'} →{' '}
                          {movement.destinationWarehouseId ? movement.destinationWarehouseId : '—'}
                        </td>
                        <td className={`${tdCls} text-right font-mono`}>{fmtQty(movement.quantity)}</td>
                        <td className={`${tdCls} text-right font-mono`}>
                          {(movement.stockDelta || 0) > 0 ? '+' : ''}
                          {fmtQty(movement.stockDelta || 0)}
                        </td>
                        <td className={`${tdCls} text-slate-500`}>{movement.userName || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </GdsCard>

          <div className="flex justify-end">
            <button type="button" className={btnGhost} onClick={onClose}>
              Fermer
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};

// ---------------------------------------------------------------------------
// Liste des lots + décision qualité
// ---------------------------------------------------------------------------

interface GdsLotsSectionProps {
  scope: GdsScope;
  currentUser: User;
  onOpenTrace: (lotNumber: string) => void;
}

export const GdsLotsSection: React.FC<GdsLotsSectionProps> = ({
  scope,
  currentUser,
  onOpenTrace,
}) => {
  const [search, setSearch] = useState('');
  const [quality, setQuality] = useState<'ALL' | StockQualityStatus>('ALL');
  const [decisionLot, setDecisionLot] = useState<{ lotId: string; lotNumber: string; status: StockQualityStatus } | null>(null);
  const [decisionStatus, setDecisionStatus] = useState<StockQualityStatus>('LIBERE');
  const [decisionReason, setDecisionReason] = useState('');
  const [decisionWarehouse, setDecisionWarehouse] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const lots = useMemo(
    () =>
      storage.getGdsLots(scope, {
        search,
        qualityStatus: quality === 'ALL' ? undefined : quality,
      }),
    [scope, search, quality]
  );

  const canDecide = storage.canWarehouse('STOCK_REGULARIZE', currentUser);

  const submitDecision = () => {
    if (!decisionLot) return;
    try {
      storage.changeLotQualityStatus(
        decisionLot.lotId,
        decisionStatus,
        decisionReason,
        decisionWarehouse || undefined
      );
      setNotice(`Statut du lot ${decisionLot.lotNumber} mis à jour : ${STOCK_QUALITY_LABELS[decisionStatus]}.`);
      setError('');
      setDecisionLot(null);
      setDecisionReason('');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="space-y-4">
      {(error || notice) && (
        <div
          className={`px-4 py-2.5 rounded-lg border text-xs ${
            error
              ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-950/40 dark:border-red-800 dark:text-red-300'
              : 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <span>{error || notice}</span>
            <button
              type="button"
              onClick={() => {
                setError('');
                setNotice('');
              }}
              className="cursor-pointer text-[11px] font-semibold"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      <GdsCard bodyClassName="p-0">
        <div className="flex flex-wrap items-center gap-2 p-3 border-b border-slate-100 dark:border-slate-800">
          <SearchField
            value={search}
            onChange={setSearch}
            placeholder="N° de lot, code article, lot fournisseur…"
            className="w-72"
          />
          <select
            className={inputCls}
            value={quality}
            onChange={event => setQuality(event.target.value as 'ALL' | StockQualityStatus)}
            aria-label="Filtrer par statut qualité"
          >
            <option value="ALL">Tous les statuts</option>
            {(Object.keys(STOCK_QUALITY_LABELS) as StockQualityStatus[]).map(status => (
              <option key={status} value={status}>
                {STOCK_QUALITY_LABELS[status]}
              </option>
            ))}
          </select>
          <span className="ml-auto text-[11px] text-slate-500">{lots.length} lot(s)</span>
        </div>

        {lots.length === 0 ? (
          <EmptyState
            icon={Layers}
            title="Aucun lot pour ce périmètre"
            hint="Les lots sont créés automatiquement à chaque réception, dotation ou réception de production."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/60">
                <tr>
                  <th className={thCls}>Lot</th>
                  <th className={thCls}>Article</th>
                  <th className={thCls}>Statut</th>
                  <th className={thCls}>Réception</th>
                  <th className={thCls}>Péremption</th>
                  <th className={`${thCls} text-right`}>Initial</th>
                  <th className={`${thCls} text-right`}>Restant</th>
                  <th className={thCls}>Magasins</th>
                  <th className={thCls}>OF liés</th>
                  <th className={thCls} />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {lots.map(lot => (
                  <tr key={lot.lotId} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className={`${tdCls} font-mono text-[10.5px] font-semibold`}>
                      {lot.lotNumber}
                      {lot.supplierLotNumber && (
                        <span className="block text-[9.5px] text-slate-400 font-normal">
                          frn. {lot.supplierLotNumber}
                        </span>
                      )}
                    </td>
                    <td className={`${tdCls} max-w-[200px]`}>
                      <span className="font-mono text-[10px] text-slate-500">{lot.itemCode}</span>
                      <span className="block text-[11px] truncate" title={lot.designation}>
                        {lot.designation}
                      </span>
                    </td>
                    <td className={tdCls}>
                      <QualityPill status={lot.qualityStatus} />
                    </td>
                    <td className={`${tdCls} text-slate-500`}>{fmtDate(lot.receptionDate)}</td>
                    <td className={tdCls}>
                      {lot.expiryDate ? (
                        <span className="flex flex-col">
                          <span>{fmtDate(lot.expiryDate)}</span>
                          {lot.isExpired ? (
                            <Pill tone="red">périmé</Pill>
                          ) : lot.daysToExpiry !== undefined && lot.daysToExpiry <= 45 ? (
                            <Pill tone={lot.daysToExpiry <= 7 ? 'red' : 'amber'}>
                              J-{lot.daysToExpiry}
                            </Pill>
                          ) : (
                            <span className="text-[9.5px] text-slate-400">J-{lot.daysToExpiry}</span>
                          )}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className={`${tdCls} text-right font-mono text-slate-500`}>
                      {fmtQty(lot.initialQty)}
                    </td>
                    <td className={`${tdCls} text-right font-mono font-semibold`}>
                      {fmtQtyUnit(lot.remainingQty, lot.unit)}
                    </td>
                    <td className={`${tdCls} text-slate-500 max-w-32 truncate`}>
                      {lot.warehouses.length === 0
                        ? '—'
                        : Array.from(new Set(lot.warehouses.map(w => w.code))).join(', ')}
                    </td>
                    <td className={`${tdCls} text-[10px] text-slate-500 max-w-24 truncate`}>
                      {lot.workOrderNumbers.length === 0 ? '—' : lot.workOrderNumbers.join(', ')}
                    </td>
                    <td className={`${tdCls} text-right whitespace-nowrap`}>
                      <button
                        type="button"
                        onClick={() => onOpenTrace(lot.lotNumber)}
                        className="text-[10px] font-semibold text-blue-600 hover:underline cursor-pointer"
                      >
                        Traçabilité
                      </button>
                      {canDecide && (
                        <button
                          type="button"
                          onClick={() => {
                            setDecisionLot({
                              lotId: lot.lotId,
                              lotNumber: lot.lotNumber,
                              status: lot.qualityStatus,
                            });
                            setDecisionStatus(
                              lot.qualityStatus === 'LIBERE' ? 'BLOQUE' : 'LIBERE'
                            );
                            setDecisionReason('');
                            setDecisionWarehouse('');
                            setError('');
                          }}
                          className="ml-2 text-[10px] font-semibold text-slate-600 dark:text-slate-300 hover:underline cursor-pointer"
                        >
                          Statuer
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GdsCard>

      {decisionLot && (
        <Modal
          isOpen
          onClose={() => setDecisionLot(null)}
          title={`Décision qualité — lot ${decisionLot.lotNumber}`}
          maxWidth="lg"
        >
          <div className="space-y-3">
            <div className="p-2.5 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-2">
              <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              Toute décision qualité est historisée (statut, motif, auteur, date) et déplace
              physiquement le stock entre zones si nécessaire. Un lot non libéré n'est jamais
              disponible pour la production ni pour une sortie.
            </div>
            <div>
              <label className={labelCls}>Statut actuel</label>
              <div>
                <QualityPill status={decisionLot.status} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Nouveau statut *</label>
              <select
                className={`${inputCls} w-full`}
                value={decisionStatus}
                onChange={event => setDecisionStatus(event.target.value as StockQualityStatus)}
              >
                {(Object.keys(STOCK_QUALITY_LABELS) as StockQualityStatus[]).map(status => (
                  <option key={status} value={status}>
                    {STOCK_QUALITY_LABELS[status]}
                  </option>
                ))}
              </select>
            </div>
            {(decisionStatus === 'QUARANTAINE' ||
              decisionStatus === 'BLOQUE' ||
              decisionStatus === 'REJETE' ||
              decisionStatus === 'NON_CONFORME' ||
              decisionStatus === 'EN_ATTENTE_CONTROLE') && (
              <div>
                <label className={labelCls}>Magasin de destination (optionnel)</label>
                <select
                  className={`${inputCls} w-full`}
                  value={decisionWarehouse}
                  onChange={event => setDecisionWarehouse(event.target.value)}
                >
                  <option value="">Zone par défaut du statut</option>
                  {storage
                    .getAccessibleWarehouses(currentUser)
                    .filter(w => ['QUARANTAINE', 'NON_CONFORMES'].includes(w.type))
                    .map(warehouse => (
                      <option key={warehouse.id} value={warehouse.id}>
                        {warehouse.code} — {warehouse.designation}
                      </option>
                    ))}
                </select>
              </div>
            )}
            <div>
              <label className={labelCls}>Motif de la décision *</label>
              <textarea
                className={`${inputCls} w-full h-20`}
                value={decisionReason}
                onChange={event => setDecisionReason(event.target.value)}
                placeholder="Ex : contrôle réception conforme, certificat sanitaire et histamine < 50 ppm…"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" className={btnGhost} onClick={() => setDecisionLot(null)}>
                Annuler
              </button>
              <button
                type="button"
                className={btnPrimary}
                onClick={submitDecision}
                disabled={!decisionReason.trim()}
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

/** Section « traçabilité » autonome : recherche d'un lot par numéro. */
export const GdsTraceSearchSection: React.FC<{
  scope: GdsScope;
  initialLot?: string;
  onConsumed?: (lot: string) => void;
}> = ({ scope, initialLot }) => {
  const [query, setQuery] = useState(initialLot || '');
  const [openLot, setOpenLot] = useState<string | null>(initialLot || null);
  const lots = useMemo(() => storage.getGdsLots(scope), [scope]);

  return (
    <div className="space-y-4">
      <GdsCard
        title="Recherche de traçabilité"
        subtitle="Traçabilité amont et aval d'un lot, construite uniquement sur les liens réellement enregistrés."
      >
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex-1 min-w-64">
            <label className={labelCls}>Numéro de lot (MP ou PF)</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  value={query}
                  onChange={event => setQuery(event.target.value)}
                  placeholder="Ex : LOT-MP-20260101-001"
                  className={`${inputCls} w-full pl-7`}
                />
                <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
              <button
                type="button"
                className={btnPrimary}
                onClick={() => setOpenLot(query.trim())}
                disabled={!query.trim()}
              >
                <GitBranch className="w-3.5 h-3.5" />
                Ouvrir
              </button>
            </div>
          </div>
        </div>
        <p className="mt-2 text-[10.5px] text-slate-500">
          La recherche couvre les {lots.length} lots du périmètre {scope === 'MATIERES_PREMIERES' ? 'matières premières' : 'produits finis'}.
        </p>
      </GdsCard>

      <GdsCard title="Lots disponibles pour investigation" bodyClassName="p-0">
        {lots.length === 0 ? (
          <EmptyState icon={GitBranch} title="Aucun lot enregistré" />
        ) : (
          <div className="max-h-96 overflow-auto">
            <table className="w-full text-left min-w-[760px]">
              <thead className="bg-slate-50 dark:bg-slate-800/60 sticky top-0">
                <tr>
                  <th className={`${thCls} whitespace-nowrap`}>Lot</th>
                  <th className={thCls}>Article</th>
                  <th className={`${thCls} whitespace-nowrap`}>Statut</th>
                  <th className={`${thCls} whitespace-nowrap`}>Péremption</th>
                  <th className={`${thCls} text-right whitespace-nowrap`}>Restant</th>
                  <th className={`${thCls} text-right`} />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {lots.slice(0, 200).map(lot => (
                  <tr key={lot.lotId}>
                    <td className={`${tdCls} font-mono text-[10.5px]`}>{lot.lotNumber}</td>
                    <td className={tdCls}>
                      <span className="font-mono text-[10px] text-slate-500">{lot.itemCode}</span>{' '}
                      {lot.designation}
                    </td>
                    <td className={tdCls}>
                      <QualityPill status={lot.qualityStatus} />
                    </td>
                    <td className={`${tdCls} text-slate-500`}>{fmtDate(lot.expiryDate)}</td>
                    <td className={`${tdCls} text-right font-mono`}>
                      {fmtQtyUnit(lot.remainingQty, lot.unit)}
                    </td>
                    <td className={`${tdCls} text-right whitespace-nowrap`}>
                      <button
                        type="button"
                        onClick={() => setOpenLot(lot.lotNumber)}
                        className="text-[10px] font-semibold text-blue-600 hover:underline cursor-pointer"
                      >
                        Ouvrir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GdsCard>

      {openLot && <GdsTracePanel lotNumber={openLot} onClose={() => setOpenLot(null)} />}
    </div>
  );
};

export const TraceIcons = { ArrowDownToLine, Truck };
