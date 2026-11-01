/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * MAMORA GP — Transferts Inter-Magasins, Production, Retours & Écarts
 * Workflow complet, traçabilité des lots et régularisation formelle des écarts.
 */

import React, { useMemo, useState } from 'react';
import {
  ArrowLeftRight,
  Plus,
  Search,
  Filter,
  Truck,
  PackageCheck,
  Factory,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  X,
  Eye,
  Send,
  ShieldCheck,
  Play,
  Ban,
  Lock,
  ArrowRight,
  ClipboardList,
  Layers,
} from 'lucide-react';
import { storage } from '../../services/storage';
import { Modal } from '../common/Modal';
import { StatusBadge } from '../common/StatusBadge';
import {
  User,
  StockTransfer,
  TransferStatus,
  TransferType,
  TRANSFER_STATUS_LABELS,
  TRANSFER_TYPE_LABELS,
  DISCREPANCY_TYPE_LABELS,
  Warehouse,
  WarehouseLocation,
  StockQualityStatus,
  STOCK_QUALITY_LABELS,
  WorkOrder,
  StockTransit,
} from '../../types';

interface TransfertsViewProps {
  currentUser: User;
}

type TransfertsTab = 'TRANSFERTS' | 'PRODUCTION' | 'RETOURS' | 'ECARTS';

const TABS: Array<{ id: TransfertsTab; label: string; icon: React.ElementType }> = [
  { id: 'TRANSFERTS', label: 'Transferts', icon: ArrowLeftRight },
  { id: 'PRODUCTION', label: 'Dotations production', icon: Factory },
  { id: 'RETOURS', label: 'Retours magasin', icon: RotateCcw },
  { id: 'ECARTS', label: 'Écarts & régularisations', icon: AlertTriangle },
];

const STATUSES = Object.keys(TRANSFER_STATUS_LABELS) as TransferStatus[];
const TYPES = Object.keys(TRANSFER_TYPE_LABELS) as TransferType[];

const numberFormat = (value: number): string =>
  new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(value);

const formatDate = (value?: string): string => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('fr-FR');
};

interface LineDraft {
  rowId: string;
  requestedQty: string;
  destinationLocationId: string;
}

const emptyCreateForm = {
  type: 'INTER_MAGASIN' as TransferType,
  sourceWarehouseId: '',
  destinationWarehouseId: '',
  reason: '',
  notes: '',
  workOrderId: '',
};

export const TransfertsView: React.FC<TransfertsViewProps> = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState<TransfertsTab>('TRANSFERTS');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const warehouses = storage.getAccessibleWarehouses(currentUser);
  const allWarehouses = storage.getWarehouses(true);
  const locations = storage.getWarehouseLocations();
  const workOrders = storage.getWorkOrders();

  const warehouseById = useMemo(() => {
    const map = new Map<string, Warehouse>();
    allWarehouses.forEach(w => map.set(w.id, w));
    return map;
  }, [allWarehouses]);

  const locationById = useMemo(() => {
    const map = new Map<string, WarehouseLocation>();
    locations.forEach(l => map.set(l.id, l));
    return map;
  }, [locations]);

  const [statusFilter, setStatusFilter] = useState<'ALL' | TransferStatus>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | TransferType>('ALL');
  const [warehouseFilter, setWarehouseFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const transfers = storage
    .getTransfers({
      status: statusFilter === 'ALL' ? undefined : statusFilter,
      type: typeFilter === 'ALL' ? undefined : typeFilter,
      warehouseId: warehouseFilter === 'ALL' ? undefined : warehouseFilter,
    })
    .filter(transfer => {
      if (!search) return true;
      const haystack = `${transfer.transferNumber} ${transfer.reason} ${transfer.requester} ${transfer.lines.map(l => `${l.itemCode} ${l.lotNumber}`).join(' ')}`.toLowerCase();
      return haystack.includes(search.toLowerCase());
    });

  const returns = storage.getReturns();
  const discrepancies = storage.getTransfers().flatMap(transfer =>
    transfer.discrepancies.map(discrepancy => ({
      transfer,
      discrepancy,
      line: transfer.lines.find(line => line.id === discrepancy.lineId),
    }))
  );
  const [discrepancyFilter, setDiscrepancyFilter] = useState<'ALL' | 'CONSTATEE' | 'REGULARISEE'>('ALL');
  const filteredDiscrepancies = discrepancies.filter(
    row => discrepancyFilter === 'ALL' || row.discrepancy.regularizationStatus === discrepancyFilter
  );

  const canRequest = storage.canWarehouse('TRANSFER_REQUEST', currentUser);
  const canValidate = storage.canWarehouse('TRANSFER_VALIDATE', currentUser);
  const canPrepare = storage.canWarehouse('TRANSFER_PREPARE', currentUser);
  const canShip = storage.canWarehouse('TRANSFER_SHIP', currentUser);
  const canReceive = storage.canWarehouse('TRANSFER_RECEIVE', currentUser);
  const canClose = storage.canWarehouse('TRANSFER_DISCREPANCY_VALIDATE', currentUser);
  const canRegularize = storage.canWarehouse('STOCK_REGULARIZE', currentUser);

  const run = (action: () => void, successMessage: string) => {
    try {
      action();
      setNotice(successMessage);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue');
      setNotice('');
    }
  };

  // ================= CRÉATION =================
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ ...emptyCreateForm });
  const [lineDrafts, setLineDrafts] = useState<LineDraft[]>([]);

  const openCreate = (type: TransferType = 'INTER_MAGASIN') => {
    setError('');
    setNotice('');
    const source = warehouses[0]?.id || '';
    const destination = warehouses.find(w => w.id !== source)?.id || warehouses[1]?.id || '';
    setCreateForm({
      ...emptyCreateForm,
      type,
      sourceWarehouseId: source,
      destinationWarehouseId: destination,
      reason: type === 'RETOUR_MAGASIN' ? 'Retour magasin' : '',
    });
    setLineDrafts([{ rowId: '', requestedQty: '', destinationLocationId: '' }]);
    setCreateOpen(true);
  };

  const sourceRows = createForm.sourceWarehouseId
    ? storage
        .getWarehouseStocks({ warehouseId: createForm.sourceWarehouseId })
        .filter(row => row.quantity - row.reservedQty > 0.0001)
    : [];

  const destinationLocations = createForm.destinationWarehouseId
    ? storage.getWarehouseLocations(createForm.destinationWarehouseId).filter(l => l.isActive)
    : [];

  const updateLine = (index: number, updates: Partial<LineDraft>) => {
    setLineDrafts(drafts => drafts.map((draft, i) => (i === index ? { ...draft, ...updates } : draft)));
  };

  const addLine = () => {
    setLineDrafts(drafts => [...drafts, { rowId: '', requestedQty: '', destinationLocationId: '' }]);
  };

  const removeLine = (index: number) => {
    setLineDrafts(drafts => drafts.filter((_, i) => i !== index));
  };

  const submitCreate = () => {
    try {
      if (!createForm.sourceWarehouseId || !createForm.destinationWarehouseId) {
        throw new Error('Sélectionnez un magasin source et un magasin destination.');
      }
      if (!createForm.reason.trim()) throw new Error('Le motif du transfert est obligatoire.');
      const lines = lineDrafts
        .filter(draft => draft.rowId)
        .map(draft => {
          const row = sourceRows.find(r => r.id === draft.rowId);
          if (!row) throw new Error('La ligne sélectionnée n\'est plus disponible dans le magasin source.');
          const qty = Number(draft.requestedQty);
          if (!(qty > 0)) throw new Error(`Quantité invalide pour ${row.itemCode} lot ${row.lotNumber}.`);
          const available =
            row.qualityStatus === 'LIBERE'
              ? row.quantity - row.reservedQty
              : row.quantity;
          if (qty > available + 0.0001) {
            throw new Error(`Stock insuffisant pour ${row.itemCode} lot ${row.lotNumber} : disponible ${numberFormat(available)} ${row.unit}.`);
          }
          return {
            itemId: row.itemId,
            lotId: row.lotId,
            lotNumber: row.lotNumber,
            requestedQty: qty,
            sourceLocationId: row.locationId,
            destinationLocationId: draft.destinationLocationId || undefined,
          };
        });
      if (lines.length === 0) throw new Error('Ajoutez au moins une ligne de stock à transférer.');
      const transfer = storage.createTransfer({
        type: createForm.type,
        sourceWarehouseId: createForm.sourceWarehouseId,
        destinationWarehouseId: createForm.destinationWarehouseId,
        reason: createForm.reason,
        notes: createForm.notes || undefined,
        workOrderId: createForm.workOrderId || undefined,
        lines,
      });
      setCreateOpen(false);
      setNotice(`Transfert ${transfer.transferNumber} créé en brouillon.`);
      setError('');
      setSelectedTransferId(transfer.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue');
    }
  };

  // ================= DÉTAIL & ACTIONS =================
  const [selectedTransferId, setSelectedTransferId] = useState<string | null>(null);
  const selectedTransfer = selectedTransferId ? storage.getTransfer(selectedTransferId) : undefined;

  const [reasonModal, setReasonModal] = useState<{
    transferId: string;
    kind: 'REFUSE' | 'CANCEL' | 'CLOSE';
  } | null>(null);
  const [reasonText, setReasonText] = useState('');

  const openReasonModal = (transferId: string, kind: 'REFUSE' | 'CANCEL' | 'CLOSE') => {
    setError('');
    setReasonText('');
    setReasonModal({ transferId, kind });
  };

  const submitReason = () => {
    if (!reasonModal) return;
    try {
      if (!reasonText.trim()) throw new Error('Un motif est obligatoire.');
      if (reasonModal.kind === 'REFUSE') {
        storage.refuseTransfer(reasonModal.transferId, reasonText);
      } else if (reasonModal.kind === 'CANCEL') {
        storage.cancelTransfer(reasonModal.transferId, reasonText);
      } else {
        storage.closePartialTransfer(reasonModal.transferId, reasonText);
      }
      setReasonModal(null);
      setNotice(
        reasonModal.kind === 'REFUSE'
          ? 'Transfert refusé.'
          : reasonModal.kind === 'CANCEL'
            ? 'Transfert annulé.'
            : 'Transfert clôturé partiellement. Les écarts restent à régulariser explicitement.'
      );
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue');
    }
  };

  // ================= EXPÉDITION =================
  const [shipTransferId, setShipTransferId] = useState<string | null>(null);
  const [shipLines, setShipLines] = useState<Record<string, { preparedQty: string; shippedQty: string }>>({});
  const shipTransfer = shipTransferId ? storage.getTransfer(shipTransferId) : undefined;

  const openShip = (transfer: StockTransfer) => {
    setError('');
    const draft: Record<string, { preparedQty: string; shippedQty: string }> = {};
    transfer.lines.forEach(line => {
      draft[line.id] = {
        preparedQty: String(line.preparedQty ?? line.requestedQty),
        shippedQty: String(line.requestedQty),
      };
    });
    setShipLines(draft);
    setShipTransferId(transfer.id);
  };

  const submitShip = () => {
    if (!shipTransfer) return;
    try {
      const lines = Object.entries(shipLines).map(([lineId, value]) => ({
        lineId,
        preparedQty: Number(value.preparedQty) || 0,
        shippedQty: Number(value.shippedQty) || 0,
      }));
      storage.shipTransfer(shipTransfer.id, lines);
      setShipTransferId(null);
      setNotice(`Transfert ${shipTransfer.transferNumber} expédié. Les quantités sont en transit et ne sont plus disponibles.`);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue');
    }
  };

  // ================= RÉCEPTION =================
  const [receiveTransferId, setReceiveTransferId] = useState<string | null>(null);
  const [receiveLines, setReceiveLines] = useState<
    Record<string, { receivedQty: string; damagedQty: string; destinationLocationId: string; observations: string }>
  >({});
  const receiveTransfer = receiveTransferId ? storage.getTransfer(receiveTransferId) : undefined;

  const openReceive = (transfer: StockTransfer) => {
    setError('');
    const transits = storage.getStockTransits({ transferId: transfer.id });
    const draft: Record<string, { receivedQty: string; damagedQty: string; destinationLocationId: string; observations: string }> = {};
    transfer.lines.forEach(line => {
      const transit = transits.find(t => t.lineId === line.id && t.status === 'EN_TRANSIT');
      const remaining = transit ? transit.quantity - transit.receivedQty : 0;
      draft[line.id] = {
        receivedQty: String(Math.max(0, remaining)),
        damagedQty: '0',
        destinationLocationId: line.destinationLocationId || '',
        observations: '',
      };
    });
    setReceiveLines(draft);
    setReceiveTransferId(transfer.id);
  };

  const submitReceive = () => {
    if (!receiveTransfer) return;
    try {
      const lines = Object.entries(receiveLines)
        .filter(([, value]) => Number(value.receivedQty) > 0 || Number(value.damagedQty) > 0)
        .map(([lineId, value]) => ({
          lineId,
          receivedQty: Number(value.receivedQty) || 0,
          damagedQty: Number(value.damagedQty) || 0,
          destinationLocationId: value.destinationLocationId,
          observations: value.observations || undefined,
        }));
      if (lines.length === 0) throw new Error('Déclarez au moins une quantité réceptionnée ou endommagée.');
      storage.receiveTransfer(receiveTransfer.id, lines);
      setReceiveTransferId(null);
      setNotice(`Réception enregistrée pour ${receiveTransfer.transferNumber}. Les écarts éventuels restent à régulariser.`);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue');
    }
  };

  // ================= RÉGULARISATION D'ÉCART =================
  const [discrepancyModal, setDiscrepancyModal] = useState<{
    transferId: string;
    discrepancyId: string;
    label: string;
  } | null>(null);
  const [discrepancyAction, setDiscrepancyAction] = useState<'AJOUT_STOCK' | 'PERTE_DEFINITIVE'>('PERTE_DEFINITIVE');
  const [discrepancyNotes, setDiscrepancyNotes] = useState('');

  const openDiscrepancyModal = (transferId: string, discrepancyId: string, label: string) => {
    setError('');
    setDiscrepancyAction('PERTE_DEFINITIVE');
    setDiscrepancyNotes('');
    setDiscrepancyModal({ transferId, discrepancyId, label });
  };

  const submitDiscrepancy = () => {
    if (!discrepancyModal) return;
    try {
      storage.regularizeDiscrepancy(
        discrepancyModal.transferId,
        discrepancyModal.discrepancyId,
        discrepancyAction,
        discrepancyNotes
      );
      setDiscrepancyModal(null);
      setNotice(
        discrepancyAction === 'AJOUT_STOCK'
          ? 'Écart régularisé par ajout explicite de stock, avec historique.'
          : 'Écart régularisé en perte définitive, sans ajout de stock.'
      );
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue');
    }
  };

  // ================= PRODUCTION =================
  const [expandedWorkOrder, setExpandedWorkOrder] = useState<string | null>(null);

  const requirementsFor = (workOrderId: string) => {
    try {
      return storage.getWorkOrderMaterialRequirements(workOrderId);
    } catch {
      return [];
    }
  };

  const createWorkOrderSupply = (workOrder: WorkOrder) => {
    run(() => {
      const transfers = storage.createTransferFromWorkOrder(workOrder.id);
      setNotice(
        `${transfers.length} demande(s) de dotation créée(s) en brouillon pour l'OF ${workOrder.orderNumber}.`
      );
      if (transfers[0]) setSelectedTransferId(transfers[0].id);
    }, `Dotation préparée pour l'OF ${workOrder.orderNumber}.`);
  };

  const renderTransferTable = (rows: StockTransfer[], emptyLabel: string) => (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th className="py-3 px-4">N° transfert</th>
              <th className="py-3 px-4">Type</th>
              <th className="py-3 px-4">Flux</th>
              <th className="py-3 px-4">Motif</th>
              <th className="py-3 px-4 text-right">Lignes</th>
              <th className="py-3 px-4 text-right">Quantité</th>
              <th className="py-3 px-4">Demandeur</th>
              <th className="py-3 px-4">Statut</th>
              <th className="py-3 px-4">Date</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {rows.map(transfer => (
              <tr key={transfer.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                <td className="py-2.5 px-4 font-mono font-bold text-blue-600">{transfer.transferNumber}</td>
                <td className="py-2.5 px-4 text-slate-500 text-[11px]">{TRANSFER_TYPE_LABELS[transfer.type]}</td>
                <td className="py-2.5 px-4 text-[10px] whitespace-nowrap">
                  <span className="font-mono font-semibold">{warehouseById.get(transfer.sourceWarehouseId)?.code || '—'}</span>
                  <ArrowRight className="w-3 h-3 inline mx-1 text-slate-300" />
                  <span className="font-mono font-semibold">{warehouseById.get(transfer.destinationWarehouseId)?.code || '—'}</span>
                </td>
                <td className="py-2.5 px-4 text-slate-600 dark:text-slate-300 max-w-56 truncate" title={transfer.reason}>{transfer.reason}</td>
                <td className="py-2.5 px-4 text-right font-mono text-slate-500">{transfer.lines.length}</td>
                <td className="py-2.5 px-4 text-right font-mono font-semibold">
                  {numberFormat(transfer.lines.reduce((total, line) => total + line.requestedQty, 0))}
                </td>
                <td className="py-2.5 px-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">{transfer.requester}</td>
                <td className="py-2.5 px-4"><StatusBadge status={transfer.status} size="sm" /></td>
                <td className="py-2.5 px-4 text-[10px] text-slate-400 whitespace-nowrap">{formatDate(transfer.createdAt)}</td>
                <td className="py-2.5 px-4 text-right">
                  <button
                    type="button"
                    onClick={() => setSelectedTransferId(transfer.id)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <Eye className="w-3 h-3" /> Ouvrir
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={10} className="py-12 text-center text-slate-400">
                  <ArrowLeftRight className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="font-semibold text-slate-600 dark:text-slate-300">{emptyLabel}</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-blue-600" />
            <span>Transferts Inter-Magasins, Production &amp; Retours</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Workflow validé, lots préservés, quantités en transit identifiées et écarts jamais ajoutés automatiquement.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canRequest && (
            <button type="button" onClick={() => openCreate('INTER_MAGASIN')} className={primaryButton}>
              <Plus className="w-3.5 h-3.5" /> Nouveau transfert
            </button>
          )}
          {storage.canWarehouse('RETURN_REQUEST', currentUser) && (
            <button type="button" onClick={() => openCreate('RETOUR_MAGASIN')} className={secondaryButton}>
              <RotateCcw className="w-3.5 h-3.5" /> Retour magasin
            </button>
          )}
        </div>
      </div>

      {(error || notice) && (
        <div
          className={`flex items-start justify-between gap-3 px-4 py-3 rounded-lg border text-xs ${
            error
              ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-950/40 dark:border-red-800 dark:text-red-300'
              : 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300'
          }`}
        >
          <span className="flex items-start gap-2">
            {error ? <AlertTriangle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
            <span>{error || notice}</span>
          </span>
          <button
            type="button"
            onClick={() => {
              setError('');
              setNotice('');
            }}
            className="p-0.5 rounded hover:bg-black/5"
            aria-label="Fermer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs w-fit">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id);
                setError('');
                setNotice('');
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 font-semibold rounded-md transition-colors cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ================= TRANSFERTS ================= */}
      {activeTab === 'TRANSFERTS' && (
        <div className="space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher un transfert, un article, un lot..."
                className={inputClass + ' pl-9'}
              />
            </div>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as 'ALL' | TransferStatus)} className={selectClass}>
              <option value="ALL">Tous les statuts</option>
              {STATUSES.map(status => (
                <option key={status} value={status}>{TRANSFER_STATUS_LABELS[status]}</option>
              ))}
            </select>
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as 'ALL' | TransferType)} className={selectClass}>
              <option value="ALL">Tous les types</option>
              {TYPES.map(type => (
                <option key={type} value={type}>{TRANSFER_TYPE_LABELS[type]}</option>
              ))}
            </select>
            <select value={warehouseFilter} onChange={e => setWarehouseFilter(e.target.value)} className={selectClass}>
              <option value="ALL">Tous les magasins</option>
              {warehouses.map(w => (
                <option key={w.id} value={w.id}>{w.code}</option>
              ))}
            </select>
          </div>
          {renderTransferTable(transfers, 'Aucun transfert ne correspond aux filtres')}
        </div>
      )}

      {/* ================= PRODUCTION ================= */}
      {activeTab === 'PRODUCTION' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/60 dark:bg-blue-950/30 dark:border-blue-900 text-xs text-blue-800 dark:text-blue-300 flex items-start gap-2">
            <Factory className="w-4 h-4 shrink-0 mt-0.5" />
            <p>
              Une dotation vers l'atelier est un <strong>transfert de stock</strong>, pas une consommation.
              La consommation réelle est enregistrée séparément ; le reliquat non utilisé peut être retourné au magasin.
            </p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-3 px-4">OF</th>
                    <th className="py-3 px-4">Produit</th>
                    <th className="py-3 px-4">Statut OF</th>
                    <th className="py-3 px-4 text-right">Boîtes prévues</th>
                    <th className="py-3 px-4 text-right">Composants</th>
                    <th className="py-3 px-4 text-right">Dotations</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {workOrders.map(workOrder => {
                    const requirements = expandedWorkOrder === workOrder.id ? requirementsFor(workOrder.id) : [];
                    const deliveries = storage.getWorkOrderDeliveries(workOrder.id);
                    const canSupply = ['PLANIFIE', 'EN_COURS'].includes(workOrder.status);
                    return (
                      <React.Fragment key={workOrder.id}>
                        <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                          <td className="py-2.5 px-4 font-mono font-bold text-blue-600">{workOrder.orderNumber}</td>
                          <td className="py-2.5 px-4 text-slate-800 dark:text-slate-200">{workOrder.productName}</td>
                          <td className="py-2.5 px-4"><StatusBadge status={workOrder.status} size="sm" /></td>
                          <td className="py-2.5 px-4 text-right font-mono">{numberFormat(workOrder.plannedCansQty)}</td>
                          <td className="py-2.5 px-4 text-right font-mono text-slate-500">
                            {requirementsFor(workOrder.id).length}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono text-slate-500">{deliveries.length}</td>
                          <td className="py-2.5 px-4 text-right">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => setExpandedWorkOrder(expandedWorkOrder === workOrder.id ? null : workOrder.id)}
                                className="px-2 py-1 rounded text-[10px] font-semibold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                              >
                                {expandedWorkOrder === workOrder.id ? 'Masquer' : 'Besoins'}
                              </button>
                              {canRequest && canSupply && (
                                <button
                                  type="button"
                                  onClick={() => createWorkOrderSupply(workOrder)}
                                  className="px-2 py-1 rounded text-[10px] font-semibold text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 cursor-pointer"
                                >
                                  Créer dotation
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                        {expandedWorkOrder === workOrder.id && (
                          <tr>
                            <td colSpan={7} className="px-4 py-3 bg-slate-50/70 dark:bg-slate-800/30">
                              {requirements.length === 0 ? (
                                <p className="text-[11px] text-slate-400">Aucune nomenclature exploitable pour cet OF.</p>
                              ) : (
                                <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                                  <table className="w-full text-left text-[11px]">
                                    <thead className="bg-white dark:bg-slate-900 text-slate-500">
                                      <tr>
                                        <th className="py-2 px-3">Composant</th>
                                        <th className="py-2 px-3 text-right">Besoin</th>
                                        <th className="py-2 px-3 text-right">Disponible</th>
                                        <th className="py-2 px-3 text-right">Manquant</th>
                                        <th className="py-2 px-3">Lots disponibles</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                                      {requirements.map(requirement => (
                                        <tr key={requirement.itemId}>
                                          <td className="py-2 px-3">
                                            <div className="font-mono font-semibold text-blue-600">{requirement.itemCode}</div>
                                            <div className="text-slate-500">{requirement.designation}</div>
                                          </td>
                                          <td className="py-2 px-3 text-right font-mono">{numberFormat(requirement.requiredQty)} {requirement.unit}</td>
                                          <td className="py-2 px-3 text-right font-mono text-emerald-600">{numberFormat(requirement.availableQty)}</td>
                                          <td className={`py-2 px-3 text-right font-mono font-semibold ${requirement.shortageQty > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                                            {requirement.shortageQty > 0 ? numberFormat(requirement.shortageQty) : '—'}
                                          </td>
                                          <td className="py-2 px-3">
                                            <div className="flex flex-wrap gap-1">
                                              {requirement.availableLots.slice(0, 4).map(lot => (
                                                <span key={lot.lotId} className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono text-[10px]">
                                                  {lot.lotNumber} · {numberFormat(lot.quantity)}
                                                </span>
                                              ))}
                                              {requirement.availableLots.length === 0 && <span className="text-slate-400">Aucun lot</span>}
                                            </div>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                  {workOrders.length === 0 && (
                    <tr><td colSpan={7} className="py-10 text-center text-slate-400">Aucun ordre de fabrication.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= RETOURS ================= */}
      {activeTab === 'RETOURS' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/60 dark:bg-emerald-950/30 dark:border-emerald-900 text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2">
            <RotateCcw className="w-4 h-4 shrink-0 mt-0.5" />
            <p>
              Les retours magasin suivent le même workflow que les transferts : validation, préparation, expédition et réception.
              Le lot d'origine et son statut qualité sont conservés.
            </p>
          </div>
          {renderTransferTable(returns, 'Aucun retour magasin enregistré')}
        </div>
      )}

      {/* ================= ÉCARTS ================= */}
      {activeTab === 'ECARTS' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2 text-xs">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select value={discrepancyFilter} onChange={e => setDiscrepancyFilter(e.target.value as 'ALL' | 'CONSTATEE' | 'REGULARISEE')} className={selectClass}>
                <option value="ALL">Tous les écarts</option>
                <option value="CONSTATEE">À régulariser</option>
                <option value="REGULARISEE">Régularisés</option>
              </select>
            </div>
            <div className="text-[11px] text-slate-500">
              {filteredDiscrepancies.filter(row => row.discrepancy.regularizationStatus === 'CONSTATEE').length} écart(s) ouvert(s)
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-3 px-4">Transfert</th>
                    <th className="py-3 px-4">Type d'écart</th>
                    <th className="py-3 px-4">Article / lot</th>
                    <th className="py-3 px-4 text-right">Quantité</th>
                    <th className="py-3 px-4">Motif</th>
                    <th className="py-3 px-4">Constaté par</th>
                    <th className="py-3 px-4">Statut</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredDiscrepancies.map(row => (
                    <tr key={row.discrepancy.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-4 font-mono font-bold text-blue-600">{row.transfer.transferNumber}</td>
                      <td className="py-2.5 px-4 text-slate-700 dark:text-slate-300">{DISCREPANCY_TYPE_LABELS[row.discrepancy.type]}</td>
                      <td className="py-2.5 px-4">
                        <div className="font-mono text-[11px] font-semibold">{row.line?.itemCode || '—'}</div>
                        <div className="font-mono text-[10px] text-indigo-600">{row.line?.lotNumber || '—'}</div>
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-red-600">
                        {numberFormat(row.discrepancy.quantity)} {row.discrepancy.unit}
                      </td>
                      <td className="py-2.5 px-4 text-slate-500 max-w-56 truncate" title={row.discrepancy.reason}>{row.discrepancy.reason}</td>
                      <td className="py-2.5 px-4 text-slate-500 text-[10px] whitespace-nowrap">{row.discrepancy.recordedBy}</td>
                      <td className="py-2.5 px-4">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${row.discrepancy.regularizationStatus === 'CONSTATEE' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                          {row.discrepancy.regularizationStatus === 'CONSTATEE' ? 'À régulariser' : 'Régularisé'}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        {row.discrepancy.regularizationStatus === 'CONSTATEE' && canRegularize ? (
                          <button
                            type="button"
                            onClick={() =>
                              openDiscrepancyModal(
                                row.transfer.id,
                                row.discrepancy.id,
                                `${row.transfer.transferNumber} — ${DISCREPANCY_TYPE_LABELS[row.discrepancy.type]}`
                              )
                            }
                            className="px-2 py-1 rounded text-[10px] font-semibold text-amber-700 hover:bg-amber-50 dark:hover:bg-slate-800 cursor-pointer"
                          >
                            Régulariser
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setSelectedTransferId(row.transfer.id)}
                            className="px-2 py-1 rounded text-[10px] font-semibold text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 cursor-pointer"
                          >
                            Voir
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredDiscrepancies.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <ShieldCheck className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p className="font-semibold text-slate-600 dark:text-slate-300">Aucun écart constaté</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL CRÉATION ================= */}
      <Modal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        title={createForm.type === 'RETOUR_MAGASIN' ? 'Nouveau retour magasin' : 'Nouveau transfert inter-magasins'}
        subtitle="Chaque ligne est rattachée à un lot précis : aucune quantité de lots différents n'est fusionnée."
        maxWidth="4xl"
      >
        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Type *">
              <select value={createForm.type} onChange={e => setCreateForm(f => ({ ...f, type: e.target.value as TransferType }))} className={inputClass}>
                {TYPES.map(type => (
                  <option key={type} value={type}>{TRANSFER_TYPE_LABELS[type]}</option>
                ))}
              </select>
            </Field>
            <Field label="Magasin source *">
              <select
                value={createForm.sourceWarehouseId}
                onChange={e => {
                  setCreateForm(f => ({ ...f, sourceWarehouseId: e.target.value }));
                  setLineDrafts([{ rowId: '', requestedQty: '', destinationLocationId: '' }]);
                }}
                className={inputClass}
              >
                <option value="">Sélectionner…</option>
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.code} — {w.designation}</option>
                ))}
              </select>
            </Field>
            <Field label="Magasin destination *">
              <select
                value={createForm.destinationWarehouseId}
                onChange={e => {
                  setCreateForm(f => ({ ...f, destinationWarehouseId: e.target.value }));
                  setLineDrafts(drafts => drafts.map(d => ({ ...d, destinationLocationId: '' })));
                }}
                className={inputClass}
              >
                <option value="">Sélectionner…</option>
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.code} — {w.designation}</option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Motif *">
            <input value={createForm.reason} onChange={e => setCreateForm(f => ({ ...f, reason: e.target.value }))} className={inputClass} placeholder="Réapprovisionnement atelier, retour de production…" />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Ordre de fabrication associé (optionnel)">
              <select value={createForm.workOrderId} onChange={e => setCreateForm(f => ({ ...f, workOrderId: e.target.value }))} className={inputClass}>
                <option value="">Aucun</option>
                {workOrders.map(wo => (
                  <option key={wo.id} value={wo.id}>{wo.orderNumber} — {wo.productName}</option>
                ))}
              </select>
            </Field>
            <Field label="Notes">
              <input value={createForm.notes} onChange={e => setCreateForm(f => ({ ...f, notes: e.target.value }))} className={inputClass} />
            </Field>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-800 dark:text-slate-200">Lignes de transfert</h4>
              <button type="button" onClick={addLine} className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:underline cursor-pointer">
                <Plus className="w-3 h-3" /> Ajouter une ligne
              </button>
            </div>
            {sourceRows.length === 0 && (
              <p className="text-[11px] text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                Aucun stock disponible dans le magasin source sélectionné.
              </p>
            )}
            <div className="space-y-2">
              {lineDrafts.map((draft, index) => {
                const row = sourceRows.find(r => r.id === draft.rowId);
                return (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/30">
                    <div className="md:col-span-5">
                      <Field label="Stock / lot à transférer">
                        <select
                          value={draft.rowId}
                          onChange={e => updateLine(index, { rowId: e.target.value })}
                          className={inputClass}
                        >
                          <option value="">Sélectionner un lot…</option>
                          {sourceRows.map(candidate => (
                            <option key={candidate.id} value={candidate.id}>
                              {candidate.itemCode} — lot {candidate.lotNumber} — {STOCK_QUALITY_LABELS[candidate.qualityStatus]} — dispo {numberFormat(candidate.quantity - candidate.reservedQty)} {candidate.unit} — {locationById.get(candidate.locationId)?.code}
                            </option>
                          ))}
                        </select>
                      </Field>
                    </div>
                    <div className="md:col-span-2">
                      <Field label="Quantité">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={draft.requestedQty}
                          onChange={e => updateLine(index, { requestedQty: e.target.value })}
                          className={inputClass}
                          placeholder={row ? String(Math.max(0, row.quantity - row.reservedQty)) : '0'}
                        />
                      </Field>
                    </div>
                    <div className="md:col-span-3">
                      <Field label="Emplacement destination">
                        <select
                          value={draft.destinationLocationId}
                          onChange={e => updateLine(index, { destinationLocationId: e.target.value })}
                          className={inputClass}
                        >
                          <option value="">Emplacement par défaut</option>
                          {destinationLocations.map(location => (
                            <option key={location.id} value={location.id}>{location.code} — {location.designation}</option>
                          ))}
                        </select>
                      </Field>
                    </div>
                    <div className="md:col-span-1 text-[10px] text-slate-500 pb-2">
                      {row ? `${STOCK_QUALITY_LABELS[row.qualityStatus]}` : ''}
                    </div>
                    <div className="md:col-span-1 text-right pb-1">
                      <button
                        type="button"
                        onClick={() => removeLine(index)}
                        className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-800 cursor-pointer"
                        title="Supprimer la ligne"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {error && <p className="text-red-600 text-[11px]">{error}</p>}
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button type="button" onClick={() => setCreateOpen(false)} className={secondaryButton}>Annuler</button>
            <button type="button" onClick={submitCreate} className={primaryButton}>Créer le brouillon</button>
          </div>
        </div>
      </Modal>

      {/* ================= MODAL DÉTAIL ================= */}
      <Modal
        isOpen={Boolean(selectedTransfer)}
        onClose={() => setSelectedTransferId(null)}
        title={selectedTransfer ? `Transfert ${selectedTransfer.transferNumber}` : 'Transfert'}
        subtitle={selectedTransfer ? `${TRANSFER_TYPE_LABELS[selectedTransfer.type]} — ${selectedTransfer.reason}` : undefined}
        maxWidth="4xl"
      >
        {selectedTransfer && (
          <div className="space-y-5 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Info label="Statut" value={TRANSFER_STATUS_LABELS[selectedTransfer.status]} />
              <Info label="Source" value={warehouseById.get(selectedTransfer.sourceWarehouseId)?.code || '—'} />
              <Info label="Destination" value={warehouseById.get(selectedTransfer.destinationWarehouseId)?.code || '—'} />
              <Info label="Demandeur" value={selectedTransfer.requester} />
              <Info label="Créé le" value={formatDate(selectedTransfer.createdAt)} />
              <Info label="Validé par" value={selectedTransfer.validatedBy || '—'} />
              <Info label="Expédié par" value={selectedTransfer.shippedBy || '—'} />
              <Info label="Réceptionné par" value={selectedTransfer.receivedBy || '—'} />
            </div>

            <div className="flex flex-wrap gap-2">
              {selectedTransfer.status === 'BROUILLON' && (
                <>
                  <button type="button" onClick={() => run(() => storage.submitTransfer(selectedTransfer.id), 'Transfert soumis pour validation.')} className={primaryButton}>
                    <Send className="w-3.5 h-3.5" /> Soumettre
                  </button>
                  <button type="button" onClick={() => openReasonModal(selectedTransfer.id, 'CANCEL')} className={dangerButton}>
                    <Ban className="w-3.5 h-3.5" /> Annuler
                  </button>
                </>
              )}
              {selectedTransfer.status === 'EN_ATTENTE_VALIDATION' && canValidate && (
                <>
                  <button type="button" onClick={() => run(() => storage.validateTransfer(selectedTransfer.id), 'Transfert validé, quantités réservées.')} className={primaryButton}>
                    <ShieldCheck className="w-3.5 h-3.5" /> Valider
                  </button>
                  <button type="button" onClick={() => openReasonModal(selectedTransfer.id, 'REFUSE')} className={dangerButton}>
                    <Ban className="w-3.5 h-3.5" /> Refuser
                  </button>
                </>
              )}
              {selectedTransfer.status === 'VALIDE' && canPrepare && (
                <button type="button" onClick={() => run(() => storage.prepareTransfer(selectedTransfer.id), 'Transfert en préparation.')} className={primaryButton}>
                  <Play className="w-3.5 h-3.5" /> Préparer
                </button>
              )}
              {['VALIDE', 'EN_PREPARATION'].includes(selectedTransfer.status) && canShip && (
                <button type="button" onClick={() => openShip(selectedTransfer)} className={primaryButton}>
                  <Truck className="w-3.5 h-3.5" /> Expédier
                </button>
              )}
              {['EXPEDIE', 'PARTIELLEMENT_RECEPTIONNE'].includes(selectedTransfer.status) && canReceive && (
                <button type="button" onClick={() => openReceive(selectedTransfer)} className={primaryButton}>
                  <PackageCheck className="w-3.5 h-3.5" /> Réceptionner
                </button>
              )}
              {['EXPEDIE', 'PARTIELLEMENT_RECEPTIONNE'].includes(selectedTransfer.status) && canClose && (
                <button type="button" onClick={() => openReasonModal(selectedTransfer.id, 'CLOSE')} className={secondaryButton}>
                  <Lock className="w-3.5 h-3.5" /> Clôture partielle
                </button>
              )}
              {['BROUILLON', 'EN_ATTENTE_VALIDATION', 'VALIDE', 'EN_PREPARATION'].includes(selectedTransfer.status) && (
                <button type="button" onClick={() => openReasonModal(selectedTransfer.id, 'CANCEL')} className={dangerButton}>
                  <Ban className="w-3.5 h-3.5" /> Annuler
                </button>
              )}
            </div>

            <div>
              <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-2">Lignes</h4>
              <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500">
                    <tr>
                      <th className="py-2 px-3">Article</th>
                      <th className="py-2 px-3">Lot</th>
                      <th className="py-2 px-3">Statut lot</th>
                      <th className="py-2 px-3">Emplacement</th>
                      <th className="py-2 px-3 text-right">Demandé</th>
                      <th className="py-2 px-3 text-right">Expédié</th>
                      <th className="py-2 px-3 text-right">Reçu</th>
                      <th className="py-2 px-3 text-right">Endommagé</th>
                      <th className="py-2 px-3">Ligne</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {selectedTransfer.lines.map(line => (
                      <tr key={line.id}>
                        <td className="py-2 px-3">
                          <div className="font-mono font-semibold text-blue-600">{line.itemCode}</div>
                          <div className="text-slate-500">{line.designation}</div>
                        </td>
                        <td className="py-2 px-3 font-mono text-indigo-600">{line.lotNumber}</td>
                        <td className="py-2 px-3">{line.qualityStatus ? <StatusBadge status={line.qualityStatus} size="sm" /> : '—'}</td>
                        <td className="py-2 px-3 font-mono text-[10px] text-slate-500">
                          {locationById.get(line.sourceLocationId)?.code || '—'}
                          <ArrowRight className="w-3 h-3 inline mx-1 text-slate-300" />
                          {line.destinationLocationId ? locationById.get(line.destinationLocationId)?.code || '—' : 'défaut'}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-semibold">{numberFormat(line.requestedQty)} {line.unit}</td>
                        <td className="py-2 px-3 text-right font-mono">{line.shippedQty !== undefined ? numberFormat(line.shippedQty) : '—'}</td>
                        <td className="py-2 px-3 text-right font-mono text-emerald-600">{line.receivedQty !== undefined ? numberFormat(line.receivedQty) : '—'}</td>
                        <td className="py-2 px-3 text-right font-mono text-red-600">{line.damagedQty ? numberFormat(line.damagedQty) : '—'}</td>
                        <td className="py-2 px-3"><StatusBadge status={line.status} size="sm" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {selectedTransfer.discrepancies.length > 0 && (
              <div>
                <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-2">Écarts constatés</h4>
                <div className="space-y-1.5">
                  {selectedTransfer.discrepancies.map(discrepancy => (
                    <div key={discrepancy.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-3 py-2 rounded-lg border border-amber-200 bg-amber-50/60 dark:bg-amber-950/20 dark:border-amber-900">
                      <div>
                        <span className="font-semibold text-amber-800 dark:text-amber-300">{DISCREPANCY_TYPE_LABELS[discrepancy.type]}</span>
                        <span className="font-mono font-bold text-red-600 ml-2">{numberFormat(discrepancy.quantity)} {discrepancy.unit}</span>
                        <span className="text-slate-500 ml-2">— {discrepancy.reason}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-500">{discrepancy.regularizationStatus}</span>
                        {discrepancy.regularizationStatus === 'CONSTATEE' && canRegularize && (
                          <button
                            type="button"
                            onClick={() =>
                              openDiscrepancyModal(
                                selectedTransfer.id,
                                discrepancy.id,
                                `${selectedTransfer.transferNumber} — ${DISCREPANCY_TYPE_LABELS[discrepancy.type]}`
                              )
                            }
                            className="px-2 py-1 rounded text-[10px] font-semibold text-amber-700 hover:bg-amber-100 dark:hover:bg-slate-800 cursor-pointer"
                          >
                            Régulariser
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-2">Historique du workflow</h4>
              <ol className="space-y-2 border-l-2 border-blue-200 dark:border-blue-900 ml-2 pl-4">
                {selectedTransfer.statusHistory.map((entry, index) => (
                  <li key={index} className="relative">
                    <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-blue-500 border-2 border-white dark:border-slate-900" />
                    <div className="font-semibold text-slate-800 dark:text-slate-200">{TRANSFER_STATUS_LABELS[entry.status]}</div>
                    <div className="text-[10px] text-slate-500">{formatDate(entry.timestamp)} — {entry.user}</div>
                    {entry.comment && <div className="text-[11px] text-slate-500">{entry.comment}</div>}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}
      </Modal>

      {/* ================= MODAL MOTIF ================= */}
      <Modal
        isOpen={Boolean(reasonModal)}
        onClose={() => setReasonModal(null)}
        title={
          reasonModal?.kind === 'REFUSE'
            ? 'Refuser le transfert'
            : reasonModal?.kind === 'CANCEL'
              ? 'Annuler le transfert'
              : 'Clôturer partiellement le transfert'
        }
        subtitle="Un motif circonstancié est obligatoire et sera journalisé."
        maxWidth="lg"
      >
        <div className="space-y-3 text-xs">
          <Field label="Motif *">
            <textarea value={reasonText} onChange={e => setReasonText(e.target.value)} className={`${inputClass} min-h-24`} />
          </Field>
          {reasonModal?.kind === 'CLOSE' && (
            <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Les quantités non réceptionnées seront enregistrées comme écarts. Aucun stock ne sera ajouté automatiquement.
            </p>
          )}
          {error && <p className="text-red-600 text-[11px]">{error}</p>}
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button type="button" onClick={() => setReasonModal(null)} className={secondaryButton}>Annuler</button>
            <button type="button" onClick={submitReason} className={primaryButton}>Confirmer</button>
          </div>
        </div>
      </Modal>

      {/* ================= MODAL EXPÉDITION ================= */}
      <Modal
        isOpen={Boolean(shipTransfer)}
        onClose={() => setShipTransferId(null)}
        title={shipTransfer ? `Expédition ${shipTransfer.transferNumber}` : 'Expédition'}
        subtitle="La sortie physique place les quantités en transit : elles ne sont plus disponibles à la source."
        maxWidth="3xl"
      >
        {shipTransfer && (
          <div className="space-y-3 text-xs">
            <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500">
                  <tr>
                    <th className="py-2 px-3">Article / lot</th>
                    <th className="py-2 px-3 text-right">Demandé</th>
                    <th className="py-2 px-3 text-right">Préparé</th>
                    <th className="py-2 px-3 text-right">Expédié</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {shipTransfer.lines.map(line => (
                    <tr key={line.id}>
                      <td className="py-2 px-3">
                        <div className="font-mono font-semibold text-blue-600">{line.itemCode}</div>
                        <div className="font-mono text-[10px] text-indigo-600">{line.lotNumber}</div>
                      </td>
                      <td className="py-2 px-3 text-right font-mono">{numberFormat(line.requestedQty)} {line.unit}</td>
                      <td className="py-2 px-3 text-right">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={shipLines[line.id]?.preparedQty || ''}
                          onChange={e =>
                            setShipLines(lines => ({
                              ...lines,
                              [line.id]: { ...lines[line.id], preparedQty: e.target.value },
                            }))
                          }
                          className={`${inputClass} text-right`}
                        />
                      </td>
                      <td className="py-2 px-3 text-right">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={shipLines[line.id]?.shippedQty || ''}
                          onChange={e =>
                            setShipLines(lines => ({
                              ...lines,
                              [line.id]: { ...lines[line.id], shippedQty: e.target.value },
                            }))
                          }
                          className={`${inputClass} text-right`}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {error && <p className="text-red-600 text-[11px]">{error}</p>}
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button type="button" onClick={() => setShipTransferId(null)} className={secondaryButton}>Annuler</button>
              <button type="button" onClick={submitShip} className={primaryButton}>Confirmer l'expédition</button>
            </div>
          </div>
        )}
      </Modal>

      {/* ================= MODAL RÉCEPTION ================= */}
      <Modal
        isOpen={Boolean(receiveTransfer)}
        onClose={() => setReceiveTransferId(null)}
        title={receiveTransfer ? `Réception ${receiveTransfer.transferNumber}` : 'Réception'}
        subtitle="Les quantités réceptionnées entrent dans le magasin de destination en conservant leur lot et leur statut qualité."
        maxWidth="4xl"
      >
        {receiveTransfer && (
          <div className="space-y-3 text-xs">
            <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500">
                  <tr>
                    <th className="py-2 px-3">Article / lot</th>
                    <th className="py-2 px-3 text-right">Expédié</th>
                    <th className="py-2 px-3 text-right">Reçu</th>
                    <th className="py-2 px-3 text-right">Endommagé</th>
                    <th className="py-2 px-3">Emplacement</th>
                    <th className="py-2 px-3">Observations</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {receiveTransfer.lines.map(line => {
                    const transit: StockTransit | undefined = storage
                      .getStockTransits({ transferId: receiveTransfer.id })
                      .find(t => t.lineId === line.id && t.status === 'EN_TRANSIT');
                    const remaining = transit ? transit.quantity - transit.receivedQty : 0;
                    return (
                      <tr key={line.id}>
                        <td className="py-2 px-3">
                          <div className="font-mono font-semibold text-blue-600">{line.itemCode}</div>
                          <div className="font-mono text-[10px] text-indigo-600">{line.lotNumber}</div>
                          {line.qualityStatus && <StatusBadge status={line.qualityStatus} size="sm" />}
                        </td>
                        <td className="py-2 px-3 text-right font-mono">{numberFormat(remaining)} {line.unit}</td>
                        <td className="py-2 px-3 text-right">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={receiveLines[line.id]?.receivedQty || ''}
                            onChange={e =>
                              setReceiveLines(lines => ({
                                ...lines,
                                [line.id]: { ...lines[line.id], receivedQty: e.target.value },
                              }))
                            }
                            className={`${inputClass} text-right`}
                          />
                        </td>
                        <td className="py-2 px-3 text-right">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={receiveLines[line.id]?.damagedQty || ''}
                            onChange={e =>
                              setReceiveLines(lines => ({
                                ...lines,
                                [line.id]: { ...lines[line.id], damagedQty: e.target.value },
                              }))
                            }
                            className={`${inputClass} text-right`}
                          />
                        </td>
                        <td className="py-2 px-3">
                          <select
                            value={receiveLines[line.id]?.destinationLocationId || ''}
                            onChange={e =>
                              setReceiveLines(lines => ({
                                ...lines,
                                [line.id]: { ...lines[line.id], destinationLocationId: e.target.value },
                              }))
                            }
                            className={inputClass}
                          >
                            <option value="">Défaut</option>
                            {storage.getWarehouseLocations(receiveTransfer.destinationWarehouseId).map(location => (
                              <option key={location.id} value={location.id}>{location.code}</option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2 px-3">
                          <input
                            value={receiveLines[line.id]?.observations || ''}
                            onChange={e =>
                              setReceiveLines(lines => ({
                                ...lines,
                                [line.id]: { ...lines[line.id], observations: e.target.value },
                              }))
                            }
                            className={inputClass}
                            placeholder="Écart, emballage…"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {error && <p className="text-red-600 text-[11px]">{error}</p>}
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button type="button" onClick={() => setReceiveTransferId(null)} className={secondaryButton}>Annuler</button>
              <button type="button" onClick={submitReceive} className={primaryButton}>Confirmer la réception</button>
            </div>
          </div>
        )}
      </Modal>

      {/* ================= MODAL RÉGULARISATION ================= */}
      <Modal
        isOpen={Boolean(discrepancyModal)}
        onClose={() => setDiscrepancyModal(null)}
        title="Régularisation d'écart"
        subtitle={discrepancyModal?.label}
        maxWidth="lg"
      >
        <div className="space-y-3 text-xs">
          <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/70 dark:bg-amber-950/20 dark:border-amber-900 text-[11px] text-amber-800 dark:text-amber-300">
            Une quantité manquante n'est jamais ajoutée automatiquement. Choisissez explicitement l'action et justifiez-la.
          </div>
          <Field label="Décision *">
            <select value={discrepancyAction} onChange={e => setDiscrepancyAction(e.target.value as 'AJOUT_STOCK' | 'PERTE_DEFINITIVE')} className={inputClass}>
              <option value="PERTE_DEFINITIVE">Perte définitive — aucun ajout de stock</option>
              <option value="AJOUT_STOCK">Ajout de stock — régularisation autorisée</option>
            </select>
          </Field>
          <Field label="Justification *">
            <textarea value={discrepancyNotes} onChange={e => setDiscrepancyNotes(e.target.value)} className={`${inputClass} min-h-24`} />
          </Field>
          {error && <p className="text-red-600 text-[11px]">{error}</p>}
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button type="button" onClick={() => setDiscrepancyModal(null)} className={secondaryButton}>Annuler</button>
            <button type="button" onClick={submitDiscrepancy} className={primaryButton}>Régulariser</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

const inputClass =
  'w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500/30';
const selectClass =
  'px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer';
const primaryButton =
  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-500 cursor-pointer';
const secondaryButton =
  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer';
const dangerButton =
  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-800 text-xs font-semibold text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer';

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="block">
    <span className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">{label}</span>
    {children}
  </label>
);

const Info: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60">
    <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">{label}</div>
    <div className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 mt-0.5 break-words">{value}</div>
  </div>
);
