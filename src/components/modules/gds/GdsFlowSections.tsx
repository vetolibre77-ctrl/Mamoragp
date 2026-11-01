/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * MAMORA GP — GDS : flux opérationnels.
 *  - Entrées MP (intégrées au module Service Approvisionnement)
 *  - Sorties MP vers l'atelier, retours et rapprochement avec la consommation réelle
 *  - Réception des produits finis depuis la production
 *  - Sorties de produits finis (préparation, contrôle, validation)
 */

import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Factory,
  FileText,
  PackageCheck,
  PackageMinus,
  RotateCcw,
  Send,
  ShieldCheck,
  Truck,
  XCircle,
} from 'lucide-react';
import { storage } from '../../../services/storage';
import {
  FINISHED_GOODS_ISSUE_MOTIVE_LABELS,
  FINISHED_GOODS_ISSUE_STATUS_LABELS,
  FinishedGoodsIssue,
  FinishedGoodsIssueMotive,
  PURCHASE_ORDER_STATUS_LABELS,
  PurchaseReceipt,
  RECEIPT_QUALITY_STATUS_LABELS,
  StockTransfer,
  TRANSFER_STATUS_LABELS,
  User,
  WorkOrder,
} from '../../../types';
import { Modal } from '../../common/Modal';
import {
  EmptyState,
  GdsCard,
  Kpi,
  Pill,
  QualityPill,
  btnDanger,
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

// ===========================================================================
// 1. Entrées de matières premières (réceptions d'achat)
// ===========================================================================

export const MpReceiptsSection: React.FC<{
  currentUser: User;
  onOpenProcurementReceptions: () => void;
}> = ({ currentUser, onOpenProcurementReceptions }) => {
  const [expanded, setExpanded] = useState<string | null>(null);
  const receipts: PurchaseReceipt[] = storage.getPurchaseReceipts();
  const orders = storage.getPurchaseOrders();

  const totals = receipts.reduce(
    (acc, receipt) => {
      receipt.lines.forEach(line => {
        acc.received += line.quantityReceived;
        acc.accepted += line.quantityAccepted;
        acc.rejected += line.quantityRejected;
      });
      if (receipt.qualityStatus === 'EN_ATTENTE') acc.pending += 1;
      return acc;
    },
    { received: 0, accepted: 0, rejected: 0, pending: 0 }
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <Kpi label="Réceptions enregistrées" value={String(receipts.length)} icon={PackageCheck} tone="text-blue-600" />
        <Kpi label="Quantités reçues" value={fmtQty(totals.received)} icon={Truck} tone="text-slate-600" />
        <Kpi label="Quantités acceptées" value={fmtQty(totals.accepted)} icon={CheckCircle2} tone="text-emerald-600" />
        <Kpi label="En attente de contrôle" value={String(totals.pending)} icon={AlertTriangle} tone="text-amber-600" />
      </div>

      <GdsCard
        title="Réceptions de matières premières"
        subtitle="Chaque réception provient d'un bon de commande du module Service Approvisionnement et génère un mouvement d'entrée traçable."
        actions={
          <button type="button" className={btnPrimary} onClick={onOpenProcurementReceptions}>
            <FileText className="w-3.5 h-3.5" />
            Ouvrir les réceptions achats
          </button>
        }
        bodyClassName="p-0"
      >
        {receipts.length === 0 ? (
          <EmptyState
            icon={PackageCheck}
            title="Aucune réception enregistrée"
            hint="Les réceptions se saisissent dans Service Approvisionnement → Réceptions achats. Elles alimentent automatiquement le stock GDS, en quarantaine jusqu'à la décision qualité."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/60">
                <tr>
                  <th className={thCls}>Réception</th>
                  <th className={thCls}>Date</th>
                  <th className={thCls}>Fournisseur</th>
                  <th className={thCls}>Commande</th>
                  <th className={thCls}>Magasin</th>
                  <th className={thCls}>BL</th>
                  <th className={`${thCls} text-right`}>Lignes</th>
                  <th className={thCls}>Contrôle qualité</th>
                  <th className={thCls} />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {receipts.map(receipt => {
                  const order = orders.find(o => o.id === receipt.orderId);
                  const warehouse = storage.getWarehouse(receipt.warehouseId);
                  const isOpen = expanded === receipt.id;
                  return (
                    <React.Fragment key={receipt.id}>
                      <tr className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                        <td className={`${tdCls} font-mono text-[10.5px] font-semibold`}>
                          {receipt.receiptNumber}
                        </td>
                        <td className={tdCls}>{fmtDateTime(receipt.receivedAt)}</td>
                        <td className={tdCls}>{receipt.supplierName}</td>
                        <td className={`${tdCls} font-mono text-[10px] text-slate-500`}>
                          {receipt.orderNumber}
                          {order && (
                            <span className="block text-[9.5px]">
                              {PURCHASE_ORDER_STATUS_LABELS[order.status]}
                            </span>
                          )}
                        </td>
                        <td className={`${tdCls} text-slate-500`}>{warehouse?.code || '—'}</td>
                        <td className={`${tdCls} text-slate-500`}>{receipt.deliveryNoteNumber || '—'}</td>
                        <td className={`${tdCls} text-right font-mono`}>{receipt.lines.length}</td>
                        <td className={tdCls}>
                          <Pill
                            tone={
                              receipt.qualityStatus === 'ACCEPTEE'
                                ? 'emerald'
                                : receipt.qualityStatus === 'REFUSEE'
                                  ? 'red'
                                  : receipt.qualityStatus === 'ACCEPTEE_PARTIELLE'
                                    ? 'orange'
                                    : 'amber'
                            }
                          >
                            {RECEIPT_QUALITY_STATUS_LABELS[receipt.qualityStatus]}
                          </Pill>
                        </td>
                        <td className={`${tdCls} text-right`}>
                          <button
                            type="button"
                            onClick={() => setExpanded(isOpen ? null : receipt.id)}
                            className="text-[10px] font-semibold text-blue-600 hover:underline cursor-pointer"
                          >
                            {isOpen ? 'Réduire' : 'Détail'}
                          </button>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="bg-slate-50 dark:bg-slate-800/40">
                          <td colSpan={9} className="px-4 py-3">
                            <table className="w-full text-left">
                              <thead>
                                <tr className="text-[10px] uppercase text-slate-500">
                                  <th className="py-1">Article</th>
                                  <th className="py-1">Lot</th>
                                  <th className="py-1">Péremption</th>
                                  <th className="py-1 text-right">Commandé</th>
                                  <th className="py-1 text-right">Reçu</th>
                                  <th className="py-1 text-right">Accepté</th>
                                  <th className="py-1 text-right">Refusé</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200/70 dark:divide-slate-700/60">
                                {receipt.lines.map(line => (
                                  <tr key={line.orderLineId}>
                                    <td className="py-1 text-[11px]">
                                      <span className="font-mono text-[10px] text-slate-500">
                                        {line.itemCode}
                                      </span>{' '}
                                      {line.designation}
                                    </td>
                                    <td className="py-1 font-mono text-[10.5px]">{line.lotNumber}</td>
                                    <td className="py-1 text-[10.5px] text-slate-500">
                                      {fmtDate(line.expiryDate)}
                                    </td>
                                    <td className="py-1 text-right font-mono text-[10.5px]">
                                      {fmtQty(line.quantityOrdered)}
                                    </td>
                                    <td className="py-1 text-right font-mono text-[10.5px]">
                                      {fmtQty(line.quantityReceived)}
                                    </td>
                                    <td className="py-1 text-right font-mono text-[10.5px] text-emerald-700 dark:text-emerald-400">
                                      {fmtQty(line.quantityAccepted)}
                                    </td>
                                    <td className="py-1 text-right font-mono text-[10.5px] text-red-600">
                                      {fmtQty(line.quantityRejected)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            {receipt.qualityNotes && (
                              <p className="mt-2 text-[10.5px] text-slate-500">
                                Contrôle : {receipt.qualityNotes} — {receipt.qualityControlledBy}
                              </p>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </GdsCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GdsCard title="Réceptions MP avec agréage (module historique)">
          {(() => {
            const receptions = storage.getReceptions();
            if (receptions.length === 0) {
              return <p className="text-[11px] text-slate-400">Aucune réception agréée.</p>;
            }
            return (
              <ul className="space-y-1.5">
                {receptions.slice(0, 8).map(reception => (
                  <li key={reception.id} className="flex items-center gap-2 text-[11px]">
                    <span className="font-mono text-[10px] text-slate-500">
                      {reception.receptionNumber}
                    </span>
                    <span className="flex-1 truncate">{reception.supplier}</span>
                    <span className="font-mono">{fmtQty(reception.acceptedQtyKg)} kg</span>
                    <Pill
                      tone={
                        reception.decision === 'ACCEPTE'
                          ? 'emerald'
                          : reception.decision === 'REFUSE'
                            ? 'red'
                            : 'amber'
                      }
                    >
                      {reception.decision}
                    </Pill>
                  </li>
                ))}
              </ul>
            );
          })()}
        </GdsCard>

        <GdsCard title="Règles appliquées à la réception">
          <ul className="space-y-1.5 text-[11px] text-slate-600 dark:text-slate-300">
            <li className="flex gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
              Sélection du bon de commande, des articles commandés et saisie des quantités réellement reçues.
            </li>
            <li className="flex gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
              Identification des lots fournisseurs, dates de fabrication et de péremption, magasin et emplacement.
            </li>
            <li className="flex gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
              Réceptions complètes et partielles : le reliquat est recalculé automatiquement sur la commande.
            </li>
            <li className="flex gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
              Une matière en attente de contrôle ou en quarantaine n'est jamais disponible pour la production.
            </li>
            <li className="flex gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
              Chaque réception produit des mouvements de stock traçables (document, lot, magasin, utilisateur).
            </li>
          </ul>
          <p className="mt-2 text-[10.5px] text-slate-500">
            Profil connecté : {currentUser.name} ({currentUser.role})
          </p>
        </GdsCard>
      </div>
    </div>
  );
};

// ===========================================================================
// 2. Sorties MP vers l'atelier, retours et rapprochement
// ===========================================================================

const transferTone = (transfer: StockTransfer) => {
  switch (transfer.status) {
    case 'RECEPTIONNE':
      return 'emerald';
    case 'ANNULE':
    case 'REFUSE':
      return 'red';
    case 'EXPEDIE':
    case 'PARTIELLEMENT_RECEPTIONNE':
      return 'violet';
    case 'VALIDE':
    case 'EN_PREPARATION':
      return 'blue';
    default:
      return 'slate';
  }
};

const ShipModal: React.FC<{
  transfer: StockTransfer;
  onClose: () => void;
  onDone: (message: string) => void;
  onError: (message: string) => void;
}> = ({ transfer, onClose, onDone, onError }) => {
  const [quantities, setQuantities] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      transfer.lines.map(line => [
        line.id,
        String(line.preparedQty ?? line.shippedQty ?? line.requestedQty),
      ])
    )
  );

  const submit = () => {
    try {
      storage.shipTransfer(
        transfer.id,
        transfer.lines.map(line => ({
          lineId: line.id,
          preparedQty: Number(quantities[line.id]) || 0,
          shippedQty: Number(quantities[line.id]) || 0,
        }))
      );
      onDone(`Transfert ${transfer.transferNumber} expédié.`);
      onClose();
    } catch (error) {
      onError(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={`Expédition ${transfer.transferNumber}`}
      subtitle="Les quantités expédiées peuvent être partielles : le reliquat reste traçable."
      maxWidth="lg"
    >
      <div className="space-y-3">
        <table className="w-full text-left">
          <thead>
            <tr className="text-[10px] uppercase text-slate-500">
              <th className="py-1">Article / lot</th>
              <th className="py-1 text-right">Demandé</th>
              <th className="py-1 text-right w-28">Expédié</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {transfer.lines.map(line => (
              <tr key={line.id}>
                <td className="py-1.5 text-[11px]">
                  <span className="font-mono text-[10px] text-slate-500">{line.itemCode}</span>{' '}
                  {line.designation}
                  <span className="block font-mono text-[10px] text-slate-400">{line.lotNumber}</span>
                </td>
                <td className="py-1.5 text-right font-mono text-[11px]">
                  {fmtQtyUnit(line.requestedQty, line.unit)}
                </td>
                <td className="py-1.5">
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={quantities[line.id]}
                    onChange={event =>
                      setQuantities(prev => ({ ...prev, [line.id]: event.target.value }))
                    }
                    className={`${inputCls} w-full text-right`}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex justify-end gap-2">
          <button type="button" className={btnGhost} onClick={onClose}>
            Annuler
          </button>
          <button type="button" className={btnPrimary} onClick={submit}>
            <Truck className="w-3.5 h-3.5" />
            Confirmer l'expédition
          </button>
        </div>
      </div>
    </Modal>
  );
};

const TransferActionList: React.FC<{
  transfers: StockTransfer[];
  currentUser: User;
  onRefresh: () => void;
  onNotice: (message: string) => void;
  onError: (message: string) => void;
}> = ({ transfers, currentUser, onRefresh, onNotice, onError }) => {
  const [shipTarget, setShipTarget] = useState<StockTransfer | null>(null);
  const [cancelTarget, setCancelTarget] = useState<StockTransfer | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const act = (label: string, fn: () => void) => {
    try {
      fn();
      onNotice(label);
      onRefresh();
    } catch (error) {
      onError(error instanceof Error ? error.message : String(error));
    }
  };

  const receive = (transfer: StockTransfer) => {
    const destination = storage.getWarehouse(transfer.destinationWarehouseId);
    const location = destination ? storage.getWarehouseLocations(destination.id)[0] : undefined;
    if (!location) {
      onError(`Aucun emplacement actif dans le magasin de destination (${destination?.code || '—'}).`);
      return;
    }
    act(
      `Transfert ${transfer.transferNumber} réceptionné.`,
      () =>
        storage.receiveTransfer(
          transfer.id,
          transfer.lines
            .filter(line => (line.shippedQty || 0) > 0 || (line.preparedQty || 0) > 0)
            .map(line => ({
              lineId: line.id,
              receivedQty: line.shippedQty ?? line.preparedQty ?? 0,
              damagedQty: 0,
              destinationLocationId: line.destinationLocationId || location.id,
            }))
        )
    );
  };

  if (transfers.length === 0) {
    return <EmptyState title="Aucun mouvement" hint="Créez une dotation ou un retour pour démarrer le flux." />;
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50 dark:bg-slate-800/60">
            <tr>
              <th className={thCls}>N°</th>
              <th className={thCls}>Date</th>
              <th className={thCls}>OF</th>
              <th className={thCls}>Trajet</th>
              <th className={thCls}>Statut</th>
              <th className={`${thCls} text-right`}>Lignes</th>
              <th className={`${thCls} text-right`}>Expédié</th>
              <th className={thCls} />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {transfers.map(transfer => {
              const source = storage.getWarehouse(transfer.sourceWarehouseId);
              const destination = storage.getWarehouse(transfer.destinationWarehouseId);
              const shipped = transfer.lines.reduce((sum, line) => sum + (line.shippedQty || 0), 0);
              const requested = transfer.lines.reduce((sum, line) => sum + line.requestedQty, 0);
              return (
                <tr key={transfer.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                  <td className={`${tdCls} font-mono text-[10.5px] font-semibold`}>
                    {transfer.transferNumber}
                    <span className="block text-[9.5px] font-normal text-slate-400">
                      {transfer.type}
                    </span>
                  </td>
                  <td className={`${tdCls} text-slate-500`}>{fmtDate(transfer.requestDate)}</td>
                  <td className={`${tdCls} font-mono text-[10px] text-slate-500`}>
                    {transfer.workOrderId
                      ? storage.getWorkOrders().find(w => w.id === transfer.workOrderId)?.orderNumber ||
                        transfer.workOrderId
                      : '—'}
                  </td>
                  <td className={`${tdCls} text-[10.5px]`}>
                    {source?.code || '—'} <ArrowRight className="inline w-3 h-3 mx-0.5" />{' '}
                    {destination?.code || '—'}
                  </td>
                  <td className={tdCls}>
                    <Pill tone={transferTone(transfer)}>{TRANSFER_STATUS_LABELS[transfer.status]}</Pill>
                  </td>
                  <td className={`${tdCls} text-right font-mono`}>{transfer.lines.length}</td>
                  <td className={`${tdCls} text-right font-mono`}>
                    {fmtQty(shipped)} / {fmtQty(requested)}
                  </td>
                  <td className={`${tdCls} text-right whitespace-nowrap`}>
                    {transfer.status === 'BROUILLON' && (
                      <button
                        type="button"
                        className="text-[10px] font-semibold text-blue-600 hover:underline cursor-pointer"
                        onClick={() =>
                          act(`Transfert ${transfer.transferNumber} soumis.`, () =>
                            storage.submitTransfer(transfer.id)
                          )
                        }
                      >
                        Soumettre
                      </button>
                    )}
                    {transfer.status === 'EN_ATTENTE_VALIDATION' && (
                      <button
                        type="button"
                        className="text-[10px] font-semibold text-emerald-600 hover:underline cursor-pointer"
                        onClick={() =>
                          act(`Transfert ${transfer.transferNumber} validé.`, () =>
                            storage.validateTransfer(transfer.id)
                          )
                        }
                      >
                        Valider
                      </button>
                    )}
                    {(transfer.status === 'VALIDE' || transfer.status === 'EN_PREPARATION') && (
                      <button
                        type="button"
                        className="text-[10px] font-semibold text-violet-600 hover:underline cursor-pointer"
                        onClick={() => setShipTarget(transfer)}
                      >
                        Expédier
                      </button>
                    )}
                    {(transfer.status === 'EXPEDIE' || transfer.status === 'PARTIELLEMENT_RECEPTIONNE') && (
                      <button
                        type="button"
                        className="text-[10px] font-semibold text-emerald-600 hover:underline cursor-pointer"
                        onClick={() => receive(transfer)}
                      >
                        Réceptionner
                      </button>
                    )}
                    {['BROUILLON', 'EN_ATTENTE_VALIDATION', 'VALIDE'].includes(transfer.status) && (
                      <button
                        type="button"
                        className="ml-2 text-[10px] font-semibold text-red-600 hover:underline cursor-pointer"
                        onClick={() => {
                          setCancelTarget(transfer);
                          setCancelReason('');
                        }}
                      >
                        Annuler
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {shipTarget && (
        <ShipModal
          transfer={shipTarget}
          onClose={() => setShipTarget(null)}
          onDone={message => {
            onNotice(message);
            onRefresh();
          }}
          onError={onError}
        />
      )}

      {cancelTarget && (
        <Modal
          isOpen
          onClose={() => setCancelTarget(null)}
          title={`Annuler le transfert ${cancelTarget.transferNumber}`}
          maxWidth="md"
        >
          <div className="space-y-3">
            <label className={labelCls}>Motif d'annulation *</label>
            <textarea
              className={`${inputCls} w-full h-20`}
              value={cancelReason}
              onChange={event => setCancelReason(event.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button type="button" className={btnGhost} onClick={() => setCancelTarget(null)}>
                Retour
              </button>
              <button
                type="button"
                className={btnDanger}
                disabled={!cancelReason.trim()}
                onClick={() => {
                  act(`Transfert ${cancelTarget.transferNumber} annulé.`, () =>
                    storage.cancelTransfer(cancelTarget.id, cancelReason)
                  );
                  setCancelTarget(null);
                }}
              >
                <XCircle className="w-3.5 h-3.5" />
                Confirmer l'annulation
              </button>
            </div>
          </div>
        </Modal>
      )}

      <p className="px-3 py-2 text-[10px] text-slate-500">
        Opérations réalisées sous le profil {currentUser.name}. Les mouvements déjà expédiés ne sont
        jamais supprimés : ils sont compensés par un retour ou une régularisation.
      </p>
    </>
  );
};

export const MpIssueSection: React.FC<{
  currentUser: User;
  mode: 'ISSUES' | 'RETURNS';
  onNotice: (message: string) => void;
  onError: (message: string) => void;
}> = ({ currentUser, mode, onNotice, onError }) => {
  const [revision, setRevision] = useState(0);
  // Un OF déjà mouvementé est sélectionné d'emblée : le rapprochement est
  // immédiatement lisible au lieu d'afficher un panneau vide.
  const [workOrderId, setWorkOrderId] = useState(() => {
    const withTransfer = storage.getTransfers().find(transfer => transfer.workOrderId);
    return withTransfer?.workOrderId || '';
  });
  const [returnOpen, setReturnOpen] = useState(false);
  const [returnWorkOrderId, setReturnWorkOrderId] = useState('');
  const [returnLines, setReturnLines] = useState<Record<string, string>>({});

  const workOrders: WorkOrder[] = storage.getWorkOrders();
  const productionWarehouse = storage.getWarehouses().find(w => w.type === 'PRODUCTION');
  const refresh = () => setRevision(value => value + 1);

  const transfers = useMemo(() => {
    const all = storage.getTransfers();
    if (mode === 'RETURNS') return all.filter(t => t.type === 'RETOUR_MAGASIN');
    return all.filter(
      t =>
        t.type === 'INTER_MAGASIN' &&
        (!productionWarehouse || t.destinationWarehouseId === productionWarehouse.id)
    );
  }, [mode, revision, productionWarehouse?.id]);

  const requirements = useMemo(
    () => (workOrderId ? storage.getWorkOrderMaterialRequirements(workOrderId) : []),
    [workOrderId, revision]
  );

  const reconciliation = useMemo(
    () => (workOrderId ? storage.getWorkOrderIssueReconciliation(workOrderId) : []),
    [workOrderId, revision]
  );

  const createDotation = () => {
    if (!workOrderId) return;
    try {
      const created = storage.createTransferFromWorkOrder(workOrderId);
      onNotice(
        `${created.length} dotation(s) créée(s) en brouillon : ${created
          .map(t => t.transferNumber)
          .join(', ')}.`
      );
      refresh();
    } catch (error) {
      onError(error instanceof Error ? error.message : String(error));
    }
  };

  const returnableTransfers = useMemo(
    () =>
      storage
        .getTransfers()
        .filter(
          t =>
            t.type === 'INTER_MAGASIN' &&
            t.workOrderId === returnWorkOrderId &&
            productionWarehouse &&
            t.destinationWarehouseId === productionWarehouse.id &&
            ['RECEPTIONNE', 'PARTIELLEMENT_RECEPTIONNE'].includes(t.status)
        ),
    [returnWorkOrderId, revision, productionWarehouse?.id]
  );

  const createReturn = () => {
    if (!returnWorkOrderId || !productionWarehouse) return;
    const sourceWarehouseId = productionWarehouse.id;
    const sourceLocation = storage.getWarehouseLocations(sourceWarehouseId)[0];
    const mpWarehouse = storage.getWarehouses().find(w => w.type === 'MATIERES_PREMIERES');
    const destinationLocation = mpWarehouse
      ? storage.getWarehouseLocations(mpWarehouse.id)[0]
      : undefined;
    if (!mpWarehouse || !sourceLocation || !destinationLocation) {
      onError('Magasin de production ou de matières premières incomplet.');
      return;
    }
    const lines = Object.entries(returnLines)
      .filter(([, value]) => Number(value) > 0)
      .map(([key, value]) => {
        const [transferId, lineId] = key.split('::');
        const transfer = storage.getTransfer(transferId);
        const line = transfer?.lines.find(l => l.id === lineId);
        return {
          itemId: line?.itemId || '',
          lotId: line?.lotId,
          lotNumber: line?.lotNumber,
          requestedQty: Number(value),
          sourceLocationId: line?.destinationLocationId || sourceLocation.id,
          destinationLocationId: destinationLocation.id,
        };
      })
      .filter(line => line.itemId);
    if (lines.length === 0) {
      onError('Sélectionnez au moins une quantité à retourner.');
      return;
    }
    try {
      const created = storage.createReturn({
        sourceWarehouseId,
        destinationWarehouseId: mpWarehouse.id,
        reason: `Retour de matières non consommées — OF ${
          workOrders.find(w => w.id === returnWorkOrderId)?.orderNumber || returnWorkOrderId
        }`,
        workOrderId: returnWorkOrderId,
        lines,
      });
      onNotice(`Retour ${created.transferNumber} créé en brouillon.`);
      setReturnOpen(false);
      setReturnLines({});
      refresh();
    } catch (error) {
      onError(error instanceof Error ? error.message : String(error));
    }
  };

  const isReturns = mode === 'RETURNS';

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <GdsCard
          title={isReturns ? 'Retour de matières' : 'Nouvelle dotation atelier'}
          subtitle={
            isReturns
              ? 'Retour au magasin des matières sorties mais non consommées.'
              : 'Génère les transferts vers le magasin de production à partir des besoins réels de l\'OF.'
          }
          className="lg:col-span-1"
        >
          <label className={labelCls}>Ordre de fabrication</label>
          <select
            className={`${inputCls} w-full`}
            value={workOrderId}
            onChange={event => setWorkOrderId(event.target.value)}
          >
            <option value="">Sélectionner un OF…</option>
            {workOrders
              .filter(wo => wo.status !== 'ANNULE')
              .map(wo => (
                <option key={wo.id} value={wo.id}>
                  {wo.orderNumber} — {wo.productName}
                </option>
              ))}
          </select>

          {isReturns ? (
            <button
              type="button"
              className={`${btnPrimary} mt-3 w-full justify-center`}
              disabled={!workOrderId}
              onClick={() => {
                setReturnWorkOrderId(workOrderId);
                setReturnOpen(true);
                setReturnLines({});
              }}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Enregistrer un retour
            </button>
          ) : (
            <button
              type="button"
              className={`${btnPrimary} mt-3 w-full justify-center`}
              disabled={!workOrderId}
              onClick={createDotation}
            >
              <Factory className="w-3.5 h-3.5" />
              Créer la dotation
            </button>
          )}

          {!isReturns && requirements.length > 0 && (
            <div className="mt-3">
              <p className="text-[10px] uppercase font-semibold text-slate-500 mb-1">
                Besoins de l'OF confrontés au stock
              </p>
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[9.5px] uppercase text-slate-500">
                    <th className="py-1">Article</th>
                    <th className="py-1 text-right">Besoin</th>
                    <th className="py-1 text-right">Dispo</th>
                    <th className="py-1 text-right">Manque</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {requirements.map(requirement => (
                    <tr key={requirement.itemId}>
                      <td className="py-1 text-[10.5px]">
                        <span className="font-mono text-[9.5px] text-slate-500">
                          {requirement.itemCode}
                        </span>{' '}
                        {requirement.designation}
                      </td>
                      <td className="py-1 text-right font-mono text-[10.5px]">
                        {fmtQty(requirement.requiredQty)}
                      </td>
                      <td className="py-1 text-right font-mono text-[10.5px] text-emerald-700 dark:text-emerald-400">
                        {fmtQty(requirement.availableQty)}
                      </td>
                      <td
                        className={`py-1 text-right font-mono text-[10.5px] ${
                          requirement.shortageQty > 0 ? 'text-red-600 font-semibold' : 'text-slate-400'
                        }`}
                      >
                        {fmtQty(requirement.shortageQty)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="mt-3 text-[10px] text-slate-500">
            Une sortie vers l'atelier n'est jamais une consommation : la consommation réelle reste
            enregistrée dans le module de production et rapprochée ci-dessous.
          </p>
        </GdsCard>

        <GdsCard
          title="Rapprochement sorties / consommation / retours"
          subtitle={
            workOrderId
              ? 'Écart = quantité sortie − consommation réelle − retours acceptés.'
              : 'Sélectionnez un ordre de fabrication.'
          }
          className="lg:col-span-2"
          bodyClassName="p-0"
        >
          {reconciliation.length === 0 ? (
            <EmptyState
              icon={PackageMinus}
              title={workOrderId ? 'Aucun mouvement pour cet OF' : 'Aucun OF sélectionné'}
              hint="Les quantités sorties proviennent des dotations expédiées ; les consommations proviennent des fiches validées en production."
            />
          ) : (
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/60">
                <tr>
                  <th className={thCls}>Article</th>
                  <th className={`${thCls} text-right`}>Sorti</th>
                  <th className={`${thCls} text-right`}>Consommé</th>
                  <th className={`${thCls} text-right`}>Retourné</th>
                  <th className={`${thCls} text-right`}>Écart</th>
                  <th className={thCls}>Fiches</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {reconciliation.map(entry => (
                  <tr key={entry.itemId}>
                    <td className={tdCls}>
                      <span className="font-mono text-[10px] text-slate-500">{entry.itemCode}</span>{' '}
                      {entry.designation}
                    </td>
                    <td className={`${tdCls} text-right font-mono`}>
                      {fmtQtyUnit(entry.issuedQty, entry.unit)}
                    </td>
                    <td className={`${tdCls} text-right font-mono text-emerald-700 dark:text-emerald-400`}>
                      {fmtQtyUnit(entry.consumedQty, entry.unit)}
                    </td>
                    <td className={`${tdCls} text-right font-mono text-violet-700 dark:text-violet-400`}>
                      {fmtQtyUnit(entry.returnedQty, entry.unit)}
                    </td>
                    <td
                      className={`${tdCls} text-right font-mono font-semibold ${
                        Math.abs(entry.outstandingQty) > 0.001 ? 'text-red-600' : 'text-emerald-600'
                      }`}
                    >
                      {fmtQtyUnit(entry.outstandingQty, entry.unit)}
                    </td>
                    <td className={`${tdCls} text-[10px] text-slate-500`}>
                      {entry.consumptionNumbers.length === 0
                        ? '—'
                        : entry.consumptionNumbers.join(', ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </GdsCard>
      </div>

      <GdsCard
        title={isReturns ? 'Retours de production' : 'Sorties vers la production'}
        subtitle={`${transfers.length} mouvement(s) — workflow : brouillon → validation → expédition → réception`}
        bodyClassName="p-0"
      >
        <TransferActionList
          transfers={transfers}
          currentUser={currentUser}
          onRefresh={refresh}
          onNotice={onNotice}
          onError={onError}
        />
      </GdsCard>

      {returnOpen && (
        <Modal
          isOpen
          onClose={() => setReturnOpen(false)}
          title="Retour de matières non consommées"
          subtitle="Les quantités proposées correspondent aux dotations déjà réceptionnées en atelier."
          maxWidth="2xl"
        >
          <div className="space-y-3">
            {returnableTransfers.length === 0 ? (
              <EmptyState
                icon={RotateCcw}
                title="Aucune dotation réceptionnée pour cet OF"
                hint="Le retour n'est possible qu'après réception effective de la dotation en atelier."
              />
            ) : (
              <>
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] uppercase text-slate-500">
                      <th className="py-1">Dotation / lot</th>
                      <th className="py-1 text-right">Reçu en atelier</th>
                      <th className="py-1 text-right w-28">À retourner</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {returnableTransfers.flatMap(transfer =>
                      transfer.lines.map(line => {
                        const key = `${transfer.id}::${line.id}`;
                        return (
                          <tr key={key}>
                            <td className="py-1.5 text-[11px]">
                              <span className="font-mono text-[10px] text-slate-500">
                                {transfer.transferNumber}
                              </span>{' '}
                              {line.designation}
                              <span className="block font-mono text-[10px] text-slate-400">
                                {line.lotNumber}
                              </span>
                            </td>
                            <td className="py-1.5 text-right font-mono text-[11px]">
                              {fmtQtyUnit(line.receivedQty || line.shippedQty || 0, line.unit)}
                            </td>
                            <td className="py-1.5">
                              <input
                                type="number"
                                min={0}
                                step="any"
                                value={returnLines[key] || ''}
                                onChange={event =>
                                  setReturnLines(prev => ({ ...prev, [key]: event.target.value }))
                                }
                                className={`${inputCls} w-full text-right`}
                                placeholder="0"
                              />
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
                <div className="flex justify-end gap-2">
                  <button type="button" className={btnGhost} onClick={() => setReturnOpen(false)}>
                    Annuler
                  </button>
                  <button type="button" className={btnPrimary} onClick={createReturn}>
                    <RotateCcw className="w-3.5 h-3.5" />
                    Créer le retour
                  </button>
                </div>
              </>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};

// ===========================================================================
// 3. Réception des produits finis depuis la production
// ===========================================================================

export const PfProductionReceiptSection: React.FC<{
  currentUser: User;
  onNotice: (message: string) => void;
  onError: (message: string) => void;
}> = ({ currentUser, onNotice, onError }) => {
  const [revision, setRevision] = useState(0);
  const [target, setTarget] = useState<string>('');
  const [form, setForm] = useState({
    quantityCans: '',
    cartons: '',
    pallets: '',
    batchNumber: '',
    warehouseId: '',
    locationId: '',
    productionDate: new Date().toISOString().slice(0, 10),
    bestBeforeDate: '',
    notes: '',
  });

  const candidates = useMemo(() => storage.getProductionReceiptCandidates(), [revision]);
  const batches = useMemo(() => storage.getFinishedBatches(), [revision]);
  const finishedWarehouses = storage.getWarehouses().filter(
    w => w.type === 'PRODUITS_FINIS' || w.type === 'QUARANTAINE' || w.type === 'STOCKAGE_TEMPORAIRE'
  );
  const locations = form.warehouseId ? storage.getWarehouseLocations(form.warehouseId) : [];

  const openReceipt = (workOrderId: string) => {
    const candidate = candidates.find(c => c.workOrderId === workOrderId);
    setTarget(workOrderId);
    setForm({
      quantityCans: String(candidate?.remainingCans || ''),
      cartons: '',
      pallets: '',
      batchNumber: '',
      warehouseId: finishedWarehouses.find(w => w.type === 'PRODUITS_FINIS')?.id || '',
      locationId: '',
      productionDate: new Date().toISOString().slice(0, 10),
      bestBeforeDate: '',
      notes: '',
    });
  };

  const submit = () => {
    const candidate = candidates.find(c => c.workOrderId === target);
    if (!candidate) return;
    try {
      const batch = storage.createFinishedGoodsReceipt({
        workOrderId: candidate.workOrderId,
        itemId: candidate.itemId,
        batchNumber: form.batchNumber || undefined,
        quantityCans: Number(form.quantityCans),
        cartons: form.cartons ? Number(form.cartons) : undefined,
        pallets: form.pallets ? Number(form.pallets) : undefined,
        warehouseId: form.warehouseId,
        locationId: form.locationId || undefined,
        productionDate: form.productionDate,
        bestBeforeDate: form.bestBeforeDate || undefined,
        notes: form.notes,
      });
      onNotice(
        `Réception ${batch.batchNumber} enregistrée : ${fmtQty(batch.conformingCans)} boîtes — ${
          batch.releaseStatus === 'LIBERE' ? 'libérée' : 'en attente de libération qualité'
        }.`
      );
      setTarget('');
      setRevision(value => value + 1);
    } catch (error) {
      onError(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <div className="space-y-4">
      <GdsCard
        title="Ordres de fabrication à réceptionner"
        subtitle="Production partielle et réceptions successives autorisées. Une double réception du même lot est refusée."
        bodyClassName="p-0"
      >
        {candidates.length === 0 ? (
          <EmptyState
            icon={Factory}
            title="Aucune production en attente de réception"
            hint="Les ordres de fabrication en cours, en contrôle ou clôturés dont la production n'est pas encore entièrement réceptionnée apparaissent ici."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/60">
                <tr>
                  <th className={thCls}>OF</th>
                  <th className={thCls}>Produit</th>
                  <th className={thCls}>Statut OF</th>
                  <th className={`${thCls} text-right`}>Prévu</th>
                  <th className={`${thCls} text-right`}>Produit</th>
                  <th className={`${thCls} text-right`}>Déjà reçu</th>
                  <th className={`${thCls} text-right`}>Reste</th>
                  <th className={`${thCls} whitespace-nowrap`}>Lots existants</th>
                  <th className={`${thCls} whitespace-nowrap`} />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {candidates.map(candidate => (
                  <tr key={candidate.workOrderId} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className={`${tdCls} font-mono text-[10.5px] font-semibold`}>
                      {candidate.orderNumber}
                    </td>
                    <td className={tdCls}>
                      <span className="font-mono text-[10px] text-slate-500">{candidate.itemCode}</span>
                      <span className="block">{candidate.productName}</span>
                    </td>
                    <td className={tdCls}>
                      <Pill tone="blue">{candidate.status}</Pill>
                    </td>
                    <td className={`${tdCls} text-right font-mono`}>{fmtQty(candidate.plannedCans)}</td>
                    <td className={`${tdCls} text-right font-mono`}>{fmtQty(candidate.producedCans)}</td>
                    <td className={`${tdCls} text-right font-mono text-slate-500`}>
                      {fmtQty(candidate.alreadyReceivedCans)}
                    </td>
                    <td className={`${tdCls} text-right font-mono font-semibold text-blue-700 dark:text-blue-400`}>
                      {fmtQty(candidate.remainingCans)}
                    </td>
                    <td className={`${tdCls} font-mono text-[10px] text-slate-500 max-w-[180px] truncate`}>
                      {candidate.finishedBatchNumbers.length === 0
                        ? '—'
                        : candidate.finishedBatchNumbers.join(', ')}
                    </td>
                    <td className={`${tdCls} text-right`}>
                      <button
                        type="button"
                        className="text-[10px] font-semibold text-blue-600 hover:underline cursor-pointer"
                        onClick={() => openReceipt(candidate.workOrderId)}
                      >
                        Réceptionner
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GdsCard>

      <GdsCard
        title="Lots de fabrication réceptionnés"
        subtitle={`${batches.length} lot(s) — le stock entre en attente de libération qualité`}
        bodyClassName="p-0"
      >
        {batches.length === 0 ? (
          <EmptyState icon={PackageCheck} title="Aucun lot de fabrication réceptionné" />
        ) : (
          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/60 sticky top-0">
                <tr>
                  <th className={thCls}>Lot</th>
                  <th className={thCls}>OF</th>
                  <th className={thCls}>Produit</th>
                  <th className={`${thCls} text-right`}>Boîtes conformes</th>
                  <th className={`${thCls} text-right`}>Cartons</th>
                  <th className={thCls}>Fabrication</th>
                  <th className={thCls}>Péremption</th>
                  <th className={thCls}>Libération</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {batches.map(batch => {
                  const workOrder = storage
                    .getWorkOrders()
                    .find(w => w.id === batch.workOrderId || w.orderNumber === batch.workOrderId);
                  return (
                    <tr key={batch.id}>
                      <td className={`${tdCls} font-mono text-[10.5px] font-semibold`}>
                        {batch.batchNumber}
                      </td>
                      <td className={`${tdCls} font-mono text-[10px] text-slate-500`}>
                        {workOrder?.orderNumber || batch.workOrderId}
                      </td>
                      <td className={tdCls}>{batch.productName}</td>
                      <td className={`${tdCls} text-right font-mono`}>{fmtQty(batch.conformingCans)}</td>
                      <td className={`${tdCls} text-right font-mono`}>{fmtQty(batch.totalCartons)}</td>
                      <td className={`${tdCls} text-slate-500`}>{fmtDate(batch.productionDate)}</td>
                      <td className={`${tdCls} text-slate-500`}>{fmtDate(batch.bestBeforeDate)}</td>
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
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </GdsCard>

      {target && (
        <Modal
          isOpen
          onClose={() => setTarget('')}
          title="Réception d'un produit fini"
          subtitle="Le lot est rattaché à l'ordre de fabrication et entre dans le statut qualité prévu."
          maxWidth="2xl"
        >
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Quantité produite (boîtes) *</label>
                <input
                  type="number"
                  min={1}
                  className={`${inputCls} w-full`}
                  value={form.quantityCans}
                  onChange={event => setForm({ ...form, quantityCans: event.target.value })}
                />
              </div>
              <div>
                <label className={labelCls}>Numéro de lot (auto si vide)</label>
                <input
                  className={`${inputCls} w-full`}
                  value={form.batchNumber}
                  onChange={event => setForm({ ...form, batchNumber: event.target.value })}
                  placeholder="LOT-PF-20261031-01"
                />
              </div>
              <div>
                <label className={labelCls}>Cartons</label>
                <input
                  type="number"
                  min={0}
                  className={`${inputCls} w-full`}
                  value={form.cartons}
                  onChange={event => setForm({ ...form, cartons: event.target.value })}
                />
              </div>
              <div>
                <label className={labelCls}>Palettes</label>
                <input
                  type="number"
                  min={0}
                  className={`${inputCls} w-full`}
                  value={form.pallets}
                  onChange={event => setForm({ ...form, pallets: event.target.value })}
                />
              </div>
              <div>
                <label className={labelCls}>Date de fabrication</label>
                <input
                  type="date"
                  className={`${inputCls} w-full`}
                  value={form.productionDate}
                  onChange={event => setForm({ ...form, productionDate: event.target.value })}
                />
              </div>
              <div>
                <label className={labelCls}>Date de péremption (auto si vide)</label>
                <input
                  type="date"
                  className={`${inputCls} w-full`}
                  value={form.bestBeforeDate}
                  onChange={event => setForm({ ...form, bestBeforeDate: event.target.value })}
                />
              </div>
              <div>
                <label className={labelCls}>Magasin de destination *</label>
                <select
                  className={`${inputCls} w-full`}
                  value={form.warehouseId}
                  onChange={event =>
                    setForm({ ...form, warehouseId: event.target.value, locationId: '' })
                  }
                >
                  <option value="">Sélectionner…</option>
                  {finishedWarehouses.map(warehouse => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.code} — {warehouse.designation}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Emplacement</label>
                <select
                  className={`${inputCls} w-full`}
                  value={form.locationId}
                  onChange={event => setForm({ ...form, locationId: event.target.value })}
                >
                  <option value="">Emplacement par défaut</option>
                  {locations.map(location => (
                    <option key={location.id} value={location.id}>
                      {location.code} — {location.designation}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className={labelCls}>Observations</label>
              <textarea
                className={`${inputCls} w-full h-16`}
                value={form.notes}
                onChange={event => setForm({ ...form, notes: event.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" className={btnGhost} onClick={() => setTarget('')}>
                Annuler
              </button>
              <button
                type="button"
                className={btnPrimary}
                onClick={submit}
                disabled={!form.quantityCans || !form.warehouseId}
              >
                <PackageCheck className="w-3.5 h-3.5" />
                Enregistrer la réception
              </button>
            </div>
            <p className="text-[10px] text-slate-500">
              Profil : {currentUser.name}. La réception crée un mouvement RECEPTION_PRODUCTION et un
              lot fini ; elle ne modifie jamais une production déjà réceptionnée.
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ===========================================================================
// 4. Sorties de produits finis
// ===========================================================================

export const PfIssueSection: React.FC<{
  currentUser: User;
  onNotice: (message: string) => void;
  onError: (message: string) => void;
  /** Restreint la vue aux sorties en cours de préparation / contrôle. */
  focusPreparation?: boolean;
}> = ({ currentUser, onNotice, onError, focusPreparation = false }) => {
  const [revision, setRevision] = useState(0);
  const [statusFilter, setStatusFilter] = useState<'ALL' | FinishedGoodsIssue['status']>('ALL');
  const [createOpen, setCreateOpen] = useState(false);
  const [detail, setDetail] = useState<FinishedGoodsIssue | null>(null);
  const [prepareTarget, setPrepareTarget] = useState<FinishedGoodsIssue | null>(null);
  const [prepareLines, setPrepareLines] = useState<Record<string, string>>({});
  const [cancelTarget, setCancelTarget] = useState<FinishedGoodsIssue | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const destinationTypes = storage.getGdsSettings().issueDestinationTypes;
  const [form, setForm] = useState({
    motive: 'LIVRAISON_CLIENT' as FinishedGoodsIssueMotive,
    destinationType: storage.getGdsSettings().issueDestinationTypes[0] || '',
    destination: '',
    recipient: '',
    documentRef: '',
    observations: '',
    itemId: '',
    lotId: '',
    quantity: '',
    cartons: '',
    pallets: '',
  });
  const [draftLines, setDraftLines] = useState<
    Array<{ itemId: string; lotId: string; quantity: number; cartons?: number; pallets?: number }>
  >([]);

  const issues = useMemo(() => storage.getFinishedGoodsIssues(), [revision]);
  const filtered = issues
    .filter(issue => statusFilter === 'ALL' || issue.status === statusFilter)
    .filter(issue =>
      !focusPreparation || ['BROUILLON', 'EN_PREPARATION', 'CONTROLE'].includes(issue.status)
    );
  const releasedLots = useMemo(
    () => storage.getGdsLots('PRODUITS_FINIS', { qualityStatus: 'LIBERE' }).filter(l => l.remainingQty > 0),
    [revision]
  );
  const customers = storage.getCustomers();

  const addLine = () => {
    const lot = releasedLots.find(l => l.lotId === form.lotId);
    if (!lot) {
      onError('Sélectionnez un lot libéré.');
      return;
    }
    const quantity = Number(form.quantity);
    if (!quantity || quantity <= 0) {
      onError('Saisissez une quantité positive.');
      return;
    }
    if (quantity > lot.remainingQty) {
      onError(`Quantité supérieure au stock du lot (${fmtQty(lot.remainingQty)}).`);
      return;
    }
    setDraftLines(prev => [
      ...prev,
      {
        itemId: lot.itemId,
        lotId: lot.lotId,
        quantity,
        cartons: form.cartons ? Number(form.cartons) : undefined,
        pallets: form.pallets ? Number(form.pallets) : undefined,
      },
    ]);
    setForm({ ...form, lotId: '', quantity: '', cartons: '', pallets: '' });
  };

  const submit = () => {
    try {
      const issue = storage.createFinishedGoodsIssue({
        motive: form.motive,
        destination: form.destination,
        destinationType: form.destinationType || undefined,
        recipient: form.recipient || undefined,
        documentRef: form.documentRef || undefined,
        observations: form.observations || undefined,
        lines: draftLines,
      });
      onNotice(`Sortie ${issue.issueNumber} créée en brouillon.`);
      setCreateOpen(false);
      setDraftLines([]);
      setForm({
        motive: 'LIVRAISON_CLIENT',
        destinationType: destinationTypes[0] || '',
        destination: '',
        recipient: '',
        documentRef: '',
        observations: '',
        itemId: '',
        lotId: '',
        quantity: '',
        cartons: '',
        pallets: '',
      });
      setRevision(value => value + 1);
    } catch (error) {
      onError(error instanceof Error ? error.message : String(error));
    }
  };

  const run = (label: string, fn: () => void) => {
    try {
      fn();
      onNotice(label);
      setRevision(value => value + 1);
    } catch (error) {
      onError(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <div className="space-y-4">
      <GdsCard
        title={focusPreparation ? 'Préparation des sorties' : 'Sorties de produits finis'}
        subtitle={
          focusPreparation
            ? 'Sorties en attente de préparation, de contrôle ou de validation.'
            : 'Brouillon → préparation → contrôle → validation. Les sorties partielles sont autorisées.'
        }
        actions={
          <>
            <select
              className={inputCls}
              value={statusFilter}
              onChange={event =>
                setStatusFilter(event.target.value as 'ALL' | FinishedGoodsIssue['status'])
              }
              aria-label="Filtrer par statut"
            >
              <option value="ALL">Tous les statuts</option>
              {(Object.keys(FINISHED_GOODS_ISSUE_STATUS_LABELS) as FinishedGoodsIssue['status'][]).map(
                status => (
                  <option key={status} value={status}>
                    {FINISHED_GOODS_ISSUE_STATUS_LABELS[status]}
                  </option>
                )
              )}
            </select>
            <button type="button" className={btnPrimary} onClick={() => setCreateOpen(true)}>
              <PackageMinus className="w-3.5 h-3.5" />
              Nouvelle sortie
            </button>
          </>
        }
        bodyClassName="p-0"
      >
        {filtered.length === 0 ? (
          <EmptyState
            icon={PackageMinus}
            title="Aucune sortie de produit fini"
            hint="Seuls les lots libérés par la qualité peuvent être sortis. Chaque sortie génère un mouvement traçable."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/60">
                <tr>
                  <th className={thCls}>N°</th>
                  <th className={thCls}>Date</th>
                  <th className={thCls}>Motif</th>
                  <th className={thCls}>Destination</th>
                  <th className={thCls}>Lignes</th>
                  <th className={`${thCls} text-right`}>Quantité</th>
                  <th className={thCls}>Statut</th>
                  <th className={thCls} />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map(issue => {
                  const total = issue.lines.reduce(
                    (sum, line) => sum + (line.shippedQty ?? line.preparedQty ?? line.quantity),
                    0
                  );
                  return (
                    <tr key={issue.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className={`${tdCls} font-mono text-[10.5px] font-semibold`}>
                        {issue.issueNumber}
                      </td>
                      <td className={`${tdCls} text-slate-500`}>{fmtDate(issue.date)}</td>
                      <td className={tdCls}>{FINISHED_GOODS_ISSUE_MOTIVE_LABELS[issue.motive]}</td>
                      <td className={`${tdCls} max-w-48 truncate`} title={issue.destination}>
                        {issue.destination}
                      </td>
                      <td className={`${tdCls} font-mono`}>{issue.lines.length}</td>
                      <td className={`${tdCls} text-right font-mono`}>{fmtQty(total)}</td>
                      <td className={tdCls}>
                        <Pill
                          tone={
                            issue.status === 'VALIDE'
                              ? 'emerald'
                              : issue.status === 'ANNULE'
                                ? 'red'
                                : issue.status === 'CONTROLE'
                                  ? 'violet'
                                  : 'amber'
                          }
                        >
                          {FINISHED_GOODS_ISSUE_STATUS_LABELS[issue.status]}
                        </Pill>
                      </td>
                      <td className={`${tdCls} text-right whitespace-nowrap`}>
                        <button
                          type="button"
                          className="text-[10px] font-semibold text-blue-600 hover:underline cursor-pointer"
                          onClick={() => setDetail(issue)}
                        >
                          Détail
                        </button>
                        {issue.status === 'BROUILLON' && (
                          <button
                            type="button"
                            className="ml-2 text-[10px] font-semibold text-violet-600 hover:underline cursor-pointer"
                            onClick={() => {
                              setPrepareTarget(issue);
                              setPrepareLines(
                                Object.fromEntries(
                                  issue.lines.map(line => [line.id, String(line.quantity)])
                                )
                              );
                            }}
                          >
                            Préparer
                          </button>
                        )}
                        {issue.status === 'EN_PREPARATION' && (
                          <button
                            type="button"
                            className="ml-2 text-[10px] font-semibold text-indigo-600 hover:underline cursor-pointer"
                            onClick={() =>
                              run(`Sortie ${issue.issueNumber} contrôlée.`, () =>
                                storage.controlFinishedGoodsIssue(issue.id)
                              )
                            }
                          >
                            Contrôler
                          </button>
                        )}
                        {(issue.status === 'CONTROLE' || issue.status === 'EN_PREPARATION') && (
                          <button
                            type="button"
                            className="ml-2 text-[10px] font-semibold text-emerald-600 hover:underline cursor-pointer"
                            onClick={() =>
                              run(`Sortie ${issue.issueNumber} validée : stock mis à jour.`, () =>
                                storage.validateFinishedGoodsIssue(issue.id)
                              )
                            }
                          >
                            Valider
                          </button>
                        )}
                        {issue.status !== 'VALIDE' && issue.status !== 'ANNULE' && (
                          <button
                            type="button"
                            className="ml-2 text-[10px] font-semibold text-red-600 hover:underline cursor-pointer"
                            onClick={() => {
                              setCancelTarget(issue);
                              setCancelReason('');
                            }}
                          >
                            Annuler
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

      <GdsCard title="Règles de sortie appliquées">
        <ul className="grid grid-cols-1 lg:grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-slate-300">
          <li className="flex gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
            Seuls les lots au statut « Libéré / Disponible » peuvent être sortis.
          </li>
          <li className="flex gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
            Sélection explicite du lot, du motif, de la destination et du document justificatif.
          </li>
          <li className="flex gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
            Préparation et contrôle des quantités avant validation ; sorties partielles autorisées.
          </li>
          <li className="flex gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
            Une sortie validée n'est jamais annulable : elle se corrige par retour ou inventaire.
          </li>
        </ul>
        <p className="mt-2 text-[10px] text-slate-500">
          Profil connecté : {currentUser.name}. Aucun circuit de vente ou de facturation n'est
          dupliqué ici : le module Commercial reste l'unique source des BL facturés.
        </p>
      </GdsCard>

      {createOpen && (
        <Modal
          isOpen
          onClose={() => setCreateOpen(false)}
          title="Nouvelle sortie de produits finis"
          subtitle="Uniquement des lots libérés par la qualité."
          maxWidth="3xl"
        >
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Motif *</label>
                <select
                  className={`${inputCls} w-full`}
                  value={form.motive}
                  onChange={event =>
                    setForm({ ...form, motive: event.target.value as FinishedGoodsIssueMotive })
                  }
                >
                  {(Object.keys(FINISHED_GOODS_ISSUE_MOTIVE_LABELS) as FinishedGoodsIssueMotive[]).map(
                    motive => (
                      <option key={motive} value={motive}>
                        {FINISHED_GOODS_ISSUE_MOTIVE_LABELS[motive]}
                      </option>
                    )
                  )}
                </select>
              </div>
              <div>
                <label className={labelCls}>Type de destination *</label>
                <select
                  className={`${inputCls} w-full`}
                  value={form.destinationType}
                  onChange={event => setForm({ ...form, destinationType: event.target.value })}
                >
                  {destinationTypes.map(type => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Destination précise *</label>
                <input
                  className={`${inputCls} w-full`}
                  value={form.destination}
                  onChange={event => setForm({ ...form, destination: event.target.value })}
                  placeholder="Atelier, site, partenaire, laboratoire…"
                />
              </div>
              <div>
                <label className={labelCls}>Tiers destinataire (optionnel)</label>
                <input
                  className={`${inputCls} w-full`}
                  value={form.recipient}
                  onChange={event => setForm({ ...form, recipient: event.target.value })}
                  placeholder="Nom du tiers, sans lien commercial"
                />
              </div>
              <div>
                <label className={labelCls}>Document justificatif</label>
                <input
                  className={`${inputCls} w-full`}
                  value={form.documentRef}
                  onChange={event => setForm({ ...form, documentRef: event.target.value })}
                  placeholder="BL, autorisation, bon de sortie…"
                />
              </div>
            </div>

            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-700">
              <p className="text-[10px] uppercase font-semibold text-slate-500 mb-2">
                Ajouter une ligne
              </p>
              <div className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-5">
                  <label className={labelCls}>Lot libéré</label>
                  <select
                    className={`${inputCls} w-full`}
                    value={form.lotId}
                    onChange={event => setForm({ ...form, lotId: event.target.value })}
                  >
                    <option value="">Sélectionner un lot…</option>
                    {releasedLots.map(lot => (
                      <option key={lot.lotId} value={lot.lotId}>
                        {lot.lotNumber} — {lot.itemCode} ({fmtQty(lot.remainingQty)} {lot.unit})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Quantité</label>
                  <input
                    type="number"
                    min={1}
                    className={`${inputCls} w-full text-right`}
                    value={form.quantity}
                    onChange={event => setForm({ ...form, quantity: event.target.value })}
                  />
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Cartons</label>
                  <input
                    type="number"
                    min={0}
                    className={`${inputCls} w-full text-right`}
                    value={form.cartons}
                    onChange={event => setForm({ ...form, cartons: event.target.value })}
                  />
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Palettes</label>
                  <input
                    type="number"
                    min={0}
                    className={`${inputCls} w-full text-right`}
                    value={form.pallets}
                    onChange={event => setForm({ ...form, pallets: event.target.value })}
                  />
                </div>
                <div className="col-span-1">
                  <button type="button" className={`${btnGhost} w-full justify-center`} onClick={addLine}>
                    +
                  </button>
                </div>
              </div>
            </div>

            {draftLines.length > 0 && (
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] uppercase text-slate-500">
                    <th className="py-1">Lot</th>
                    <th className="py-1 text-right">Quantité</th>
                    <th className="py-1 text-right">Cartons</th>
                    <th className="py-1" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {draftLines.map((line, index) => {
                    const lot = releasedLots.find(l => l.lotId === line.lotId);
                    return (
                      <tr key={`${line.lotId}-${index}`}>
                        <td className="py-1 text-[11px] font-mono">{lot?.lotNumber || line.lotId}</td>
                        <td className="py-1 text-right font-mono text-[11px]">{fmtQty(line.quantity)}</td>
                        <td className="py-1 text-right font-mono text-[11px]">
                          {line.cartons ? fmtQty(line.cartons) : '—'}
                        </td>
                        <td className="py-1 text-right">
                          <button
                            type="button"
                            className="text-[10px] text-red-600 font-semibold cursor-pointer"
                            onClick={() =>
                              setDraftLines(prev => prev.filter((_, i) => i !== index))
                            }
                          >
                            Retirer
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            <div>
              <label className={labelCls}>Observations</label>
              <textarea
                className={`${inputCls} w-full h-16`}
                value={form.observations}
                onChange={event => setForm({ ...form, observations: event.target.value })}
              />
            </div>

            <div className="flex justify-end gap-2">
              <button type="button" className={btnGhost} onClick={() => setCreateOpen(false)}>
                Annuler
              </button>
              <button
                type="button"
                className={btnPrimary}
                onClick={submit}
                disabled={!form.destination.trim() || draftLines.length === 0}
              >
                <Send className="w-3.5 h-3.5" />
                Créer la sortie
              </button>
            </div>
          </div>
        </Modal>
      )}

      {prepareTarget && (
        <Modal
          isOpen
          onClose={() => setPrepareTarget(null)}
          title={`Préparation ${prepareTarget.issueNumber}`}
          subtitle="Les quantités préparées deviennent les quantités réellement sorties."
          maxWidth="lg"
        >
          <div className="space-y-3">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] uppercase text-slate-500">
                  <th className="py-1">Lot</th>
                  <th className="py-1 text-right">Demandé</th>
                  <th className="py-1 text-right w-28">Préparé</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {prepareTarget.lines.map(line => (
                  <tr key={line.id}>
                    <td className="py-1.5 text-[11px] font-mono">{line.lotNumber}</td>
                    <td className="py-1.5 text-right font-mono text-[11px]">
                      {fmtQty(line.quantity)}
                    </td>
                    <td className="py-1.5">
                      <input
                        type="number"
                        min={0}
                        max={line.quantity}
                        className={`${inputCls} w-full text-right`}
                        value={prepareLines[line.id] || ''}
                        onChange={event =>
                          setPrepareLines(prev => ({ ...prev, [line.id]: event.target.value }))
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-end gap-2">
              <button type="button" className={btnGhost} onClick={() => setPrepareTarget(null)}>
                Annuler
              </button>
              <button
                type="button"
                className={btnPrimary}
                onClick={() => {
                  run(`Sortie ${prepareTarget.issueNumber} en préparation.`, () =>
                    storage.prepareFinishedGoodsIssue(
                      prepareTarget.id,
                      prepareTarget.lines.map(line => ({
                        lineId: line.id,
                        preparedQty: Number(prepareLines[line.id]) || 0,
                      }))
                    )
                  );
                  setPrepareTarget(null);
                }}
              >
                Enregistrer la préparation
              </button>
            </div>
          </div>
        </Modal>
      )}

      {detail && (
        <Modal
          isOpen
          onClose={() => setDetail(null)}
          title={`Sortie ${detail.issueNumber}`}
          subtitle={`${FINISHED_GOODS_ISSUE_MOTIVE_LABELS[detail.motive]} — ${detail.destination}`}
          maxWidth="2xl"
        >
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-slate-500">Statut : </span>
                <Pill tone={detail.status === 'VALIDE' ? 'emerald' : 'amber'}>
                  {FINISHED_GOODS_ISSUE_STATUS_LABELS[detail.status]}
                </Pill>
              </div>
              <div>
                <span className="text-slate-500">Date : </span>
                {fmtDate(detail.date)}
              </div>
              <div>
                <span className="text-slate-500">Créée par : </span>
                {detail.createdBy}
              </div>
              <div>
                <span className="text-slate-500">Document : </span>
                {detail.documentRef || '—'}
              </div>
              <div>
                <span className="text-slate-500">Préparée par : </span>
                {detail.preparedBy || '—'}
              </div>
              <div>
                <span className="text-slate-500">Validée par : </span>
                {detail.validatedBy || '—'}
              </div>
            </div>
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] uppercase text-slate-500">
                  <th className="py-1">Lot</th>
                  <th className="py-1">Article</th>
                  <th className="py-1 text-right">Demandé</th>
                  <th className="py-1 text-right">Préparé</th>
                  <th className="py-1 text-right">Sorti</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {detail.lines.map(line => (
                  <tr key={line.id}>
                    <td className="py-1 font-mono text-[10.5px]">{line.lotNumber}</td>
                    <td className="py-1 text-[11px]">{line.designation}</td>
                    <td className="py-1 text-right font-mono text-[11px]">{fmtQty(line.quantity)}</td>
                    <td className="py-1 text-right font-mono text-[11px]">
                      {line.preparedQty !== undefined ? fmtQty(line.preparedQty) : '—'}
                    </td>
                    <td className="py-1 text-right font-mono text-[11px]">
                      {line.shippedQty !== undefined ? fmtQty(line.shippedQty) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {detail.observations && (
              <p className="text-[11px] text-slate-500 whitespace-pre-line">{detail.observations}</p>
            )}
            {detail.cancelReason && (
              <p className="text-[11px] text-red-600">Annulation : {detail.cancelReason}</p>
            )}
            <div className="flex justify-end">
              <button type="button" className={btnGhost} onClick={() => setDetail(null)}>
                Fermer
              </button>
            </div>
          </div>
        </Modal>
      )}

      {cancelTarget && (
        <Modal
          isOpen
          onClose={() => setCancelTarget(null)}
          title={`Annuler la sortie ${cancelTarget.issueNumber}`}
          maxWidth="md"
        >
          <div className="space-y-3">
            <label className={labelCls}>Motif d'annulation *</label>
            <textarea
              className={`${inputCls} w-full h-20`}
              value={cancelReason}
              onChange={event => setCancelReason(event.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button type="button" className={btnGhost} onClick={() => setCancelTarget(null)}>
                Retour
              </button>
              <button
                type="button"
                className={btnDanger}
                disabled={!cancelReason.trim()}
                onClick={() => {
                  run(`Sortie ${cancelTarget.issueNumber} annulée.`, () =>
                    storage.cancelFinishedGoodsIssue(cancelTarget.id, cancelReason)
                  );
                  setCancelTarget(null);
                }}
              >
                <XCircle className="w-3.5 h-3.5" />
                Confirmer
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export const FlowHelpers = { transferTone };
