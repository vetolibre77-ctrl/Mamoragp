/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * MAMORA GP — Module Multi-Magasins
 * Référentiel magasins/emplacements, stocks par lot, tableau de bord et historique.
 * Aucune quantité de magasins différents n'est fusionnée sans identification de l'origine.
 */

import React, { useMemo, useState } from 'react';
import {
  Warehouse as WarehouseIcon,
  MapPin,
  Boxes,
  LayoutDashboard,
  History,
  Plus,
  Pencil,
  Search,
  Filter,
  Download,
  AlertTriangle,
  ShieldCheck,
  Clock,
  Truck,
  Layers,
  Lock,
  CheckCircle2,
  ArrowRight,
  X,
  PackageSearch,
} from 'lucide-react';
import { storage } from '../../services/storage';
import { Modal } from '../common/Modal';
import { StatusBadge } from '../common/StatusBadge';
import {
  User,
  Warehouse,
  WarehouseLocation,
  WarehouseType,
  WAREHOUSE_TYPE_LABELS,
  StockQualityStatus,
  STOCK_QUALITY_LABELS,
  StockLot,
  UnitOfMeasure,
  WarehouseStock,
} from '../../types';

interface MagasinsViewProps {
  currentUser: User;
}

type MagasinsTab = 'DASHBOARD' | 'WAREHOUSES' | 'LOCATIONS' | 'STOCKS' | 'LOTS' | 'HISTORY';

const TABS: Array<{ id: MagasinsTab; label: string; icon: React.ElementType }> = [
  { id: 'DASHBOARD', label: 'Tableau de bord', icon: LayoutDashboard },
  { id: 'WAREHOUSES', label: 'Magasins', icon: WarehouseIcon },
  { id: 'LOCATIONS', label: 'Emplacements', icon: MapPin },
  { id: 'STOCKS', label: 'Stocks par magasin', icon: Boxes },
  { id: 'LOTS', label: 'Lots & traçabilité', icon: Layers },
  { id: 'HISTORY', label: 'Historique', icon: History },
];

const QUALITY_STATUSES: StockQualityStatus[] = [
  'LIBERE',
  'EN_ATTENTE_CONTROLE',
  'QUARANTAINE',
  'BLOQUE',
  'REJETE',
];

const WAREHOUSE_TYPES = Object.keys(WAREHOUSE_TYPE_LABELS) as WarehouseType[];

const numberFormat = (value: number): string =>
  new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(value);

const formatDate = (value?: string): string => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('fr-FR');
};

const downloadCsv = (filename: string, rows: Array<Array<string | number>>) => {
  const csv = rows
    .map(row =>
      row
        .map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`)
        .join(';')
    )
    .join('\r\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const emptyWarehouseForm = {
  code: '',
  designation: '',
  type: 'MATIERES_PREMIERES' as WarehouseType,
  description: '',
  manager: '',
  location: '',
  addressZone: '',
  requiresQualityRelease: false,
  allowsProductionSupply: false,
  allowsProductionOutput: false,
  isActive: true,
};

const emptyLocationForm = {
  code: '',
  designation: '',
  warehouseId: '',
  zoneType: '',
  capacity: '',
  capacityUnit: 'KG' as UnitOfMeasure,
  storageConditions: '',
  isActive: true,
};

export const MagasinsView: React.FC<MagasinsViewProps> = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState<MagasinsTab>('DASHBOARD');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const warehouses = storage.getAccessibleWarehouses(currentUser);
  const allWarehouses = storage.getWarehouses(true);
  const locations = storage.getWarehouseLocations();
  const accessibleIds = useMemo(() => new Set(warehouses.map(w => w.id)), [warehouses]);

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

  // --- Dashboard ---
  const dashboard = storage.getWarehouseDashboard();

  // --- Filtres stocks ---
  const [stockSearch, setStockSearch] = useState('');
  const [stockWarehouse, setStockWarehouse] = useState('ALL');
  const [stockQuality, setStockQuality] = useState<'ALL' | StockQualityStatus>('ALL');
  const [stockView, setStockView] = useState<'ROWS' | 'CONSOLIDATED'>('ROWS');

  const stockRows = storage.getWarehouseStocks({
    warehouseId: stockWarehouse === 'ALL' ? undefined : stockWarehouse,
    qualityStatus: stockQuality === 'ALL' ? undefined : stockQuality,
    search: stockSearch,
  });

  const consolidated = storage.getConsolidatedStockView().filter(row => {
    const matchesSearch =
      !stockSearch ||
      `${row.itemCode} ${row.designation}`.toLowerCase().includes(stockSearch.toLowerCase());
    if (!matchesSearch) return false;
    if (stockWarehouse === 'ALL') return true;
    return row.byWarehouse.some(w => w.warehouseId === stockWarehouse && w.physical > 0);
  });

  // --- Magasins : modal création / édition ---
  const [warehouseModal, setWarehouseModal] = useState<{ mode: 'create' | 'edit'; id?: string } | null>(null);
  const [warehouseForm, setWarehouseForm] = useState({ ...emptyWarehouseForm });

  const openCreateWarehouse = () => {
    setError('');
    setWarehouseForm({ ...emptyWarehouseForm });
    setWarehouseModal({ mode: 'create' });
  };

  const openEditWarehouse = (warehouse: Warehouse) => {
    setError('');
    setWarehouseForm({
      code: warehouse.code,
      designation: warehouse.designation,
      type: warehouse.type,
      description: warehouse.description,
      manager: warehouse.manager,
      location: warehouse.location,
      addressZone: warehouse.addressZone,
      requiresQualityRelease: warehouse.requiresQualityRelease,
      allowsProductionSupply: warehouse.allowsProductionSupply,
      allowsProductionOutput: warehouse.allowsProductionOutput,
      isActive: warehouse.isActive,
    });
    setWarehouseModal({ mode: 'edit', id: warehouse.id });
  };

  const submitWarehouse = () => {
    try {
      if (warehouseModal?.mode === 'edit' && warehouseModal.id) {
        storage.updateWarehouse(warehouseModal.id, warehouseForm);
        setNotice('Magasin mis à jour.');
      } else {
        storage.addWarehouse(warehouseForm);
        setNotice('Magasin créé.');
      }
      setWarehouseModal(null);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue');
    }
  };

  // --- Emplacements : modal ---
  const [locationModal, setLocationModal] = useState<{ mode: 'create' | 'edit'; id?: string } | null>(null);
  const [locationForm, setLocationForm] = useState({ ...emptyLocationForm });
  const [locationWarehouseFilter, setLocationWarehouseFilter] = useState('ALL');

  const openCreateLocation = () => {
    setError('');
    setLocationForm({
      ...emptyLocationForm,
      warehouseId: warehouses[0]?.id || allWarehouses[0]?.id || '',
    });
    setLocationModal({ mode: 'create' });
  };

  const openEditLocation = (location: WarehouseLocation) => {
    setError('');
    setLocationForm({
      code: location.code,
      designation: location.designation,
      warehouseId: location.warehouseId,
      zoneType: location.zoneType,
      capacity: location.capacity !== undefined ? String(location.capacity) : '',
      capacityUnit: location.capacityUnit || 'KG',
      storageConditions: location.storageConditions,
      isActive: location.isActive,
    });
    setLocationModal({ mode: 'edit', id: location.id });
  };

  const submitLocation = () => {
    try {
      const payload = {
        code: locationForm.code,
        designation: locationForm.designation,
        warehouseId: locationForm.warehouseId,
        zoneType: locationForm.zoneType,
        capacity: locationForm.capacity ? Number(locationForm.capacity) : undefined,
        capacityUnit: locationForm.capacityUnit,
        storageConditions: locationForm.storageConditions,
        isActive: locationForm.isActive,
      };
      if (locationModal?.mode === 'edit' && locationModal.id) {
        storage.updateWarehouseLocation(locationModal.id, payload);
        setNotice('Emplacement mis à jour.');
      } else {
        storage.addWarehouseLocation(payload);
        setNotice('Emplacement créé.');
      }
      setLocationModal(null);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue');
    }
  };

  // --- Lots & qualité ---
  const [lotSearch, setLotSearch] = useState('');
  const [lotQuality, setLotQuality] = useState<'ALL' | StockQualityStatus>('ALL');
  const [selectedLotId, setSelectedLotId] = useState<string | null>(null);
  const [qualityModalLot, setQualityModalLot] = useState<StockLot | null>(null);
  const [qualityForm, setQualityForm] = useState({
    status: 'LIBERE' as StockQualityStatus,
    reason: '',
    warehouseId: '',
  });

  const lots = storage
    .getStockLots({
      qualityStatus: lotQuality === 'ALL' ? undefined : lotQuality,
      lotNumber: lotSearch,
    })
    .filter(lot => {
      const rows = storage.getWarehouseStocks({ lotId: lot.id });
      return rows.length > 0 || lot.warehouseTrail.length > 0;
    });

  const selectedLot = selectedLotId ? storage.getStockLot(selectedLotId) : undefined;
  const selectedLotRows = selectedLotId ? storage.getWarehouseStocks({ lotId: selectedLotId }) : [];

  const openQualityModal = (lot: StockLot) => {
    setError('');
    setQualityForm({ status: lot.qualityStatus, reason: '', warehouseId: '' });
    setQualityModalLot(lot);
  };

  const submitQuality = () => {
    if (!qualityModalLot) return;
    try {
      storage.changeLotQualityStatus(
        qualityModalLot.id,
        qualityForm.status,
        qualityForm.reason,
        qualityForm.warehouseId || undefined
      );
      setNotice('Statut qualité du lot mis à jour et historisé.');
      setQualityModalLot(null);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue');
    }
  };

  // --- Historique ---
  const [historySearch, setHistorySearch] = useState('');
  const [historyType, setHistoryType] = useState('ALL');
  const [historyWarehouse, setHistoryWarehouse] = useState('ALL');

  const movements = storage.getStockMovements().filter(movement => {
    const source = movement.sourceWarehouseId;
    const destination = movement.destinationWarehouseId;
    if (source && !accessibleIds.has(source)) return false;
    if (destination && !accessibleIds.has(destination)) return false;
    if (historyWarehouse !== 'ALL') {
      if (source !== historyWarehouse && destination !== historyWarehouse) return false;
    }
    if (historyType !== 'ALL' && movement.type !== historyType) return false;
    if (historySearch) {
      const haystack = `${movement.itemCode} ${movement.batchNumber} ${movement.documentNumber || ''} ${movement.reason || ''} ${movement.userName}`.toLowerCase();
      if (!haystack.includes(historySearch.toLowerCase())) return false;
    }
    return true;
  });

  const exportMovements = () => {
    if (!storage.canWarehouse('REPORTS_EXPORT', currentUser)) {
      setError('Habilitation insuffisante pour exporter les rapports.');
      return;
    }
    downloadCsv(`MAMORA_GP_historique_stocks_${new Date().toISOString().slice(0, 10)}.csv`, [
      ['Date', 'Type', 'Article', 'Lot', 'Document', 'Quantité', 'Unité', 'Effet stock', 'Magasin source', 'Magasin destination', 'Opérateur', 'Motif'],
      ...movements.map(m => [
        formatDate(m.timestamp),
        m.type,
        m.itemCode,
        m.batchNumber,
        m.documentNumber || '',
        m.quantity,
        m.unit,
        m.stockDelta ?? '',
        m.sourceWarehouseId ? warehouseById.get(m.sourceWarehouseId)?.code || m.sourceWarehouseId : '',
        m.destinationWarehouseId ? warehouseById.get(m.destinationWarehouseId)?.code || m.destinationWarehouseId : '',
        m.userName,
        m.reason || '',
      ]),
    ]);
  };

  const exportStock = () => {
    if (!storage.canWarehouse('REPORTS_EXPORT', currentUser)) {
      setError('Habilitation insuffisante pour exporter les rapports.');
      return;
    }
    downloadCsv(`MAMORA_GP_stocks_${new Date().toISOString().slice(0, 10)}.csv`, [
      ['Magasin', 'Emplacement', 'Article', 'Désignation', 'Lot', 'Statut qualité', 'Quantité', 'Réservé', 'Disponible', 'Unité'],
      ...stockRows.map(row => [
        warehouseById.get(row.warehouseId)?.code || row.warehouseId,
        locationById.get(row.locationId)?.code || row.locationId,
        row.itemCode,
        storage.getItems().find(i => i.id === row.itemId)?.designation || '',
        row.lotNumber,
        row.qualityStatus,
        row.quantity,
        row.reservedQty,
        row.qualityStatus === 'LIBERE' ? Math.max(0, row.quantity - row.reservedQty) : 0,
        row.unit,
      ]),
    ]);
  };

  const canCreateWarehouse = storage.canWarehouse('WAREHOUSE_CREATE', currentUser);
  const canEditWarehouse = storage.canWarehouse('WAREHOUSE_EDIT', currentUser);
  const canRegularize = storage.canWarehouse('STOCK_REGULARIZE', currentUser);

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <WarehouseIcon className="w-5 h-5 text-blue-600" />
            <span>Magasins, Emplacements &amp; Stocks Multi-Magasins</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Stock physique par magasin, emplacement et lot — traçabilité ISO 22000 et périmètre d'accès par profil.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Périmètre : {warehouses.length} magasin(s) accessible(s)
          </span>
          {currentUser.assignedWarehouseIds && currentUser.assignedWarehouseIds.length > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded border border-amber-200 bg-amber-50 text-amber-700">
              <Lock className="w-3.5 h-3.5" />
              Accès restreint
            </span>
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
            aria-label="Fermer le message"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Onglets */}
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

      {/* ================= TABLEAU DE BORD ================= */}
      {activeTab === 'DASHBOARD' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            {[
              { label: 'Stock physique', value: dashboard.physicalStock, icon: Boxes, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/40' },
              { label: 'Disponible', value: dashboard.availableStock, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/40' },
              { label: 'Réservé', value: dashboard.reservedStock, icon: Lock, color: 'text-slate-600', bg: 'bg-slate-100 dark:bg-slate-800' },
              { label: 'Attente contrôle', value: dashboard.pendingControl, icon: Clock, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950/40' },
              { label: 'Quarantaine', value: dashboard.quarantine, icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/40' },
              { label: 'Bloqué / rejeté', value: dashboard.blocked, icon: ShieldCheck, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950/40' },
            ].map(kpi => {
              const Icon = kpi.icon;
              return (
                <div key={kpi.label} className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
                  <div className={`inline-flex p-2 rounded-lg ${kpi.bg} ${kpi.color} mb-2`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="text-lg font-bold font-mono text-slate-900 dark:text-slate-100">
                    {numberFormat(kpi.value)}
                  </div>
                  <div className="text-[11px] text-slate-500">{kpi.label}</div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Magasins actifs</div>
              <div className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                {dashboard.activeWarehouseCount} / {dashboard.warehouseCount}
              </div>
            </div>
            <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Emplacements</div>
              <div className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">{dashboard.locationCount}</div>
            </div>
            <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Transferts en cours</div>
              <div className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">{dashboard.activeTransfers}</div>
              <div className="text-[11px] text-amber-600 mt-0.5">{dashboard.pendingValidation} en attente de validation</div>
            </div>
            <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Écarts ouverts</div>
              <div className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">{dashboard.openDiscrepancies}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Aucun ajout automatique de stock</div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            <div className="xl:col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Stock par magasin</h3>
                <span className="text-[11px] text-slate-400">{dashboard.byWarehouse.length} magasin(s)</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="py-2.5 px-4">Magasin</th>
                      <th className="py-2.5 px-4 text-right">Physique</th>
                      <th className="py-2.5 px-4 text-right">Disponible</th>
                      <th className="py-2.5 px-4 text-right">Quarantaine</th>
                      <th className="py-2.5 px-4 text-right">Attente</th>
                      <th className="py-2.5 px-4 text-right">Bloqué</th>
                      <th className="py-2.5 px-4 text-right">Lots</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {dashboard.byWarehouse.map(row => (
                      <tr key={row.warehouseId} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 px-4">
                          <div className="font-semibold text-slate-900 dark:text-slate-100">{row.code}</div>
                          <div className="text-[11px] text-slate-500">{row.designation}</div>
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-semibold">{numberFormat(row.physical)}</td>
                        <td className="py-2.5 px-4 text-right font-mono text-emerald-600 font-semibold">{numberFormat(row.available)}</td>
                        <td className="py-2.5 px-4 text-right font-mono text-amber-600">{numberFormat(row.quarantine)}</td>
                        <td className="py-2.5 px-4 text-right font-mono text-purple-600">{numberFormat(row.pendingControl)}</td>
                        <td className="py-2.5 px-4 text-right font-mono text-red-600">{numberFormat(row.blocked)}</td>
                        <td className="py-2.5 px-4 text-right font-mono text-slate-500">{row.lotCount}</td>
                      </tr>
                    ))}
                    {dashboard.byWarehouse.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-10 text-center text-slate-400">Aucun magasin accessible.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  Alertes de réapprovisionnement
                </h3>
                <span className="text-[11px] text-slate-400">{dashboard.lowStockItems.length}</span>
              </div>
              <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                {dashboard.lowStockItems.map(item => (
                  <div key={item.itemId} className="px-4 py-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-mono text-[11px] font-bold text-blue-600">{item.itemCode}</div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-300 truncate">{item.designation}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono text-[11px] font-bold text-red-600">
                        {numberFormat(item.available)} / {numberFormat(item.minStockLevel)}
                      </div>
                      <div className="text-[10px] text-slate-400">{item.unit}</div>
                    </div>
                  </div>
                ))}
                {dashboard.lowStockItems.length === 0 && (
                  <div className="px-4 py-10 text-center text-[11px] text-slate-400">
                    Aucun article sous le seuil minimum.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/60 dark:bg-indigo-950/30 dark:border-indigo-900 text-xs">
              <div className="flex items-center gap-2 font-semibold text-indigo-800 dark:text-indigo-300 mb-1">
                <Truck className="w-4 h-4" /> En transit
              </div>
              <p className="text-indigo-700 dark:text-indigo-300">
                {numberFormat(dashboard.transit)} unité(s) expédiée(s) mais non réceptionnée(s). Jamais comptées dans le disponible.
              </p>
            </div>
            <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/60 dark:bg-amber-950/30 dark:border-amber-900 text-xs">
              <div className="flex items-center gap-2 font-semibold text-amber-800 dark:text-amber-300 mb-1">
                <Clock className="w-4 h-4" /> Contrôle qualité
              </div>
              <p className="text-amber-700 dark:text-amber-300">
                {numberFormat(dashboard.pendingControl)} unité(s) en attente de libération. Aucune sortie possible avant décision.
              </p>
            </div>
            <div className="p-4 rounded-xl border border-red-200 bg-red-50/60 dark:bg-red-950/30 dark:border-red-900 text-xs">
              <div className="flex items-center gap-2 font-semibold text-red-800 dark:text-red-300 mb-1">
                <ShieldCheck className="w-4 h-4" /> Ségrégation sanitaire
              </div>
              <p className="text-red-700 dark:text-red-300">
                {numberFormat(dashboard.quarantine + dashboard.blocked)} unité(s) isolée(s) en quarantaine ou bloquée(s).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ================= MAGASINS ================= */}
      {activeTab === 'WAREHOUSES' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-slate-500">
              Référentiel des {allWarehouses.length} magasins de l'usine. Votre périmètre : {warehouses.length}.
            </div>
            {canCreateWarehouse && (
              <button
                type="button"
                onClick={openCreateWarehouse}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-500 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Nouveau magasin
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {allWarehouses.map(warehouse => {
              const summary = storage.getWarehouseStockSummary(warehouse.id);
              const isAccessible = accessibleIds.has(warehouse.id);
              return (
                <div
                  key={warehouse.id}
                  className={`bg-white dark:bg-slate-900 rounded-xl border shadow-xs p-4 ${
                    warehouse.isActive
                      ? 'border-slate-200 dark:border-slate-800'
                      : 'border-dashed border-slate-300 dark:border-slate-700 opacity-75'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[11px] font-bold text-blue-600">{warehouse.code}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {WAREHOUSE_TYPE_LABELS[warehouse.type]}
                        </span>
                        {!warehouse.isActive && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-600">Inactif</span>
                        )}
                        {!isAccessible && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700 inline-flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5" /> Hors périmètre
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-1 truncate">{warehouse.designation}</h3>
                      <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{warehouse.description}</p>
                    </div>
                    {canEditWarehouse && (
                      <button
                        type="button"
                        onClick={() => openEditWarehouse(warehouse)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 cursor-pointer"
                        title="Modifier le magasin"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
                    <div>
                      <div className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100">{numberFormat(summary.physical)}</div>
                      <div className="text-[10px] text-slate-400">Physique</div>
                    </div>
                    <div>
                      <div className="font-mono text-xs font-bold text-emerald-600">{numberFormat(summary.available)}</div>
                      <div className="text-[10px] text-slate-400">Disponible</div>
                    </div>
                    <div>
                      <div className="font-mono text-xs font-bold text-amber-600">{numberFormat(summary.quarantine)}</div>
                      <div className="text-[10px] text-slate-400">Quarantaine</div>
                    </div>
                  </div>

                  <div className="mt-3 space-y-1 text-[11px] text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      <span className="truncate">{warehouse.location}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <UserIcon />
                      <span className="truncate">{warehouse.manager}</span>
                    </div>
                    <div className="flex flex-wrap gap-1 pt-1">
                      {warehouse.requiresQualityRelease && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">Libération qualité requise</span>
                      )}
                      {warehouse.allowsProductionSupply && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">Alimente atelier</span>
                      )}
                      {warehouse.allowsProductionOutput && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">Reçoit production</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= EMPLACEMENTS ================= */}
      {activeTab === 'LOCATIONS' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2 text-xs">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={locationWarehouseFilter}
                onChange={e => setLocationWarehouseFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer"
              >
                <option value="ALL">Tous les magasins</option>
                {allWarehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.code} — {w.designation}</option>
                ))}
              </select>
            </div>
            {canEditWarehouse && (
              <button
                type="button"
                onClick={openCreateLocation}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-500 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Nouvel emplacement
              </button>
            )}
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-3 px-4">Code</th>
                    <th className="py-3 px-4">Désignation</th>
                    <th className="py-3 px-4">Magasin</th>
                    <th className="py-3 px-4">Zone</th>
                    <th className="py-3 px-4">Conditions</th>
                    <th className="py-3 px-4 text-right">Capacité</th>
                    <th className="py-3 px-4 text-right">Stock</th>
                    <th className="py-3 px-4">État</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {locations
                    .filter(l => locationWarehouseFilter === 'ALL' || l.warehouseId === locationWarehouseFilter)
                    .map(location => {
                      const rows = storage.getWarehouseStocks({ locationId: location.id });
                      const qty = rows.reduce((total, row) => total + row.quantity, 0);
                      return (
                        <tr key={location.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                          <td className="py-2.5 px-4 font-mono font-bold text-blue-600">{location.code}</td>
                          <td className="py-2.5 px-4 font-semibold text-slate-800 dark:text-slate-200">{location.designation}</td>
                          <td className="py-2.5 px-4 text-slate-600 dark:text-slate-300">{warehouseById.get(location.warehouseId)?.code || '—'}</td>
                          <td className="py-2.5 px-4 text-slate-500">{location.zoneType}</td>
                          <td className="py-2.5 px-4 text-slate-500 max-w-56 truncate">{location.storageConditions}</td>
                          <td className="py-2.5 px-4 text-right font-mono text-slate-500">
                            {location.capacity !== undefined ? `${numberFormat(location.capacity)} ${location.capacityUnit || ''}` : '—'}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono font-semibold text-slate-800 dark:text-slate-200">{numberFormat(qty)}</td>
                          <td className="py-2.5 px-4">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${location.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                              {location.isActive ? 'Actif' : 'Inactif'}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            {canEditWarehouse && (
                              <button
                                type="button"
                                onClick={() => openEditLocation(location)}
                                className="p-1.5 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 cursor-pointer"
                                title="Modifier"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= STOCKS ================= */}
      {activeTab === 'STOCKS' && (
        <div className="space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="relative flex-1 min-w-48">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher article, lot, magasin ou emplacement..."
                value={stockSearch}
                onChange={e => setStockSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden"
              />
            </div>
            <select
              value={stockWarehouse}
              onChange={e => setStockWarehouse(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer"
            >
              <option value="ALL">Tous les magasins</option>
              {warehouses.map(w => (
                <option key={w.id} value={w.id}>{w.code} — {w.designation}</option>
              ))}
            </select>
            <select
              value={stockQuality}
              onChange={e => setStockQuality(e.target.value as 'ALL' | StockQualityStatus)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer"
            >
              <option value="ALL">Tous les statuts</option>
              {QUALITY_STATUSES.map(status => (
                <option key={status} value={status}>{STOCK_QUALITY_LABELS[status]}</option>
              ))}
            </select>
            <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-[11px]">
              <button
                type="button"
                onClick={() => setStockView('ROWS')}
                className={`px-2.5 py-1 rounded font-semibold cursor-pointer ${stockView === 'ROWS' ? 'bg-white dark:bg-slate-700 shadow-xs' : 'text-slate-500'}`}
              >
                Par magasin
              </button>
              <button
                type="button"
                onClick={() => setStockView('CONSOLIDATED')}
                className={`px-2.5 py-1 rounded font-semibold cursor-pointer ${stockView === 'CONSOLIDATED' ? 'bg-white dark:bg-slate-700 shadow-xs' : 'text-slate-500'}`}
              >
                Consolidé
              </button>
            </div>
            {storage.canWarehouse('REPORTS_EXPORT', currentUser) && (
              <button
                type="button"
                onClick={exportStock}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> CSV
              </button>
            )}
          </div>

          {stockView === 'ROWS' ? (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="py-3 px-4">Magasin</th>
                      <th className="py-3 px-4">Emplacement</th>
                      <th className="py-3 px-4">Article</th>
                      <th className="py-3 px-4">Lot</th>
                      <th className="py-3 px-4">Statut qualité</th>
                      <th className="py-3 px-4 text-right">Quantité</th>
                      <th className="py-3 px-4 text-right">Réservé</th>
                      <th className="py-3 px-4 text-right">Disponible</th>
                      <th className="py-3 px-4">Unité</th>
                      <th className="py-3 px-4">Mise à jour</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {stockRows.map(row => {
                      const item = storage.getItems().find(i => i.id === row.itemId);
                      return (
                        <tr key={row.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                          <td className="py-2.5 px-4">
                            <div className="font-mono font-bold text-blue-600">{warehouseById.get(row.warehouseId)?.code || row.warehouseId}</div>
                            <div className="text-[10px] text-slate-400">{warehouseById.get(row.warehouseId)?.designation}</div>
                          </td>
                          <td className="py-2.5 px-4 font-mono text-slate-600 dark:text-slate-300">{locationById.get(row.locationId)?.code || row.locationId}</td>
                          <td className="py-2.5 px-4">
                            <div className="font-mono text-[11px] font-bold text-slate-800 dark:text-slate-200">{row.itemCode}</div>
                            <div className="text-[10px] text-slate-500 max-w-56 truncate">{item?.designation}</div>
                          </td>
                          <td className="py-2.5 px-4 font-mono text-[11px] font-semibold text-indigo-600">{row.lotNumber}</td>
                          <td className="py-2.5 px-4"><StatusBadge status={row.qualityStatus} size="sm" /></td>
                          <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-slate-100">{numberFormat(row.quantity)}</td>
                          <td className="py-2.5 px-4 text-right font-mono text-slate-500">{row.reservedQty > 0 ? numberFormat(row.reservedQty) : '—'}</td>
                          <td className="py-2.5 px-4 text-right font-mono font-semibold text-emerald-600">
                            {row.qualityStatus === 'LIBERE' ? numberFormat(Math.max(0, row.quantity - row.reservedQty)) : '—'}
                          </td>
                          <td className="py-2.5 px-4 text-slate-500">{row.unit}</td>
                          <td className="py-2.5 px-4 text-[10px] text-slate-400">{formatDate(row.updatedAt)}</td>
                        </tr>
                      );
                    })}
                    {stockRows.length === 0 && (
                      <tr>
                        <td colSpan={10} className="py-12 text-center text-slate-400">
                          <PackageSearch className="w-8 h-8 mx-auto mb-2 opacity-30" />
                          <p className="font-semibold text-slate-600 dark:text-slate-300">Aucun stock magasin ne correspond aux filtres</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="py-3 px-4">Article</th>
                      <th className="py-3 px-4">Désignation</th>
                      <th className="py-3 px-4 text-right">Physique</th>
                      <th className="py-3 px-4 text-right">Disponible</th>
                      <th className="py-3 px-4 text-right">Réservé</th>
                      <th className="py-3 px-4 text-right">Attente</th>
                      <th className="py-3 px-4 text-right">Quarantaine</th>
                      <th className="py-3 px-4 text-right">Bloqué</th>
                      <th className="py-3 px-4 text-right">Transit</th>
                      <th className="py-3 px-4 text-right">Seuil</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {consolidated.map(row => (
                      <tr key={row.itemId} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 px-4 font-mono font-bold text-blue-600">{row.itemCode}</td>
                        <td className="py-2.5 px-4 text-slate-800 dark:text-slate-200 max-w-64 truncate">{row.designation}</td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold">{numberFormat(row.physical)}</td>
                        <td className={`py-2.5 px-4 text-right font-mono font-bold ${row.available <= row.minStockLevel && row.minStockLevel > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{numberFormat(row.available)}</td>
                        <td className="py-2.5 px-4 text-right font-mono text-slate-500">{row.reserved > 0 ? numberFormat(row.reserved) : '—'}</td>
                        <td className="py-2.5 px-4 text-right font-mono text-purple-600">{row.pendingControl > 0 ? numberFormat(row.pendingControl) : '—'}</td>
                        <td className="py-2.5 px-4 text-right font-mono text-amber-600">{row.quarantine > 0 ? numberFormat(row.quarantine) : '—'}</td>
                        <td className="py-2.5 px-4 text-right font-mono text-red-600">{row.blocked > 0 ? numberFormat(row.blocked) : '—'}</td>
                        <td className="py-2.5 px-4 text-right font-mono text-indigo-600">{row.transit > 0 ? numberFormat(row.transit) : '—'}</td>
                        <td className="py-2.5 px-4 text-right font-mono text-slate-400">{numberFormat(row.minStockLevel)}</td>
                      </tr>
                    ))}
                    {consolidated.length === 0 && (
                      <tr>
                        <td colSpan={10} className="py-12 text-center text-slate-400">Aucun article ne correspond aux filtres.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= LOTS ================= */}
      {activeTab === 'LOTS' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher un numéro de lot..."
                value={lotSearch}
                onChange={e => setLotSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden"
              />
            </div>
            <select
              value={lotQuality}
              onChange={e => setLotQuality(e.target.value as 'ALL' | StockQualityStatus)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer"
            >
              <option value="ALL">Tous les statuts</option>
              {QUALITY_STATUSES.map(status => (
                <option key={status} value={status}>{STOCK_QUALITY_LABELS[status]}</option>
              ))}
            </select>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-3 px-4">Lot interne</th>
                    <th className="py-3 px-4">Lot fournisseur</th>
                    <th className="py-3 px-4">Article</th>
                    <th className="py-3 px-4">Réception</th>
                    <th className="py-3 px-4">Durabilité</th>
                    <th className="py-3 px-4">Origine</th>
                    <th className="py-3 px-4">Statut qualité</th>
                    <th className="py-3 px-4 text-right">Magasins</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {lots.map(lot => (
                    <tr key={lot.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-4 font-mono font-bold text-indigo-600">{lot.lotNumber}</td>
                      <td className="py-2.5 px-4 font-mono text-slate-500">{lot.supplierLotNumber || '—'}</td>
                      <td className="py-2.5 px-4 font-mono text-[11px] text-slate-700 dark:text-slate-300">{lot.itemCode}</td>
                      <td className="py-2.5 px-4 text-slate-500">{lot.receptionDate || '—'}</td>
                      <td className="py-2.5 px-4 text-slate-500">{lot.expiryDate || '—'}</td>
                      <td className="py-2.5 px-4 text-slate-500 max-w-48 truncate">{lot.origin || '—'}</td>
                      <td className="py-2.5 px-4"><StatusBadge status={lot.qualityStatus} size="sm" /></td>
                      <td className="py-2.5 px-4 text-right font-mono text-slate-500">{lot.warehouseTrail.length}</td>
                      <td className="py-2.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setSelectedLotId(lot.id)}
                            className="px-2 py-1 rounded text-[10px] font-semibold text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 cursor-pointer"
                          >
                            Traçabilité
                          </button>
                          {canRegularize && (
                            <button
                              type="button"
                              onClick={() => openQualityModal(lot)}
                              className="px-2 py-1 rounded text-[10px] font-semibold text-amber-700 hover:bg-amber-50 dark:hover:bg-slate-800 cursor-pointer"
                            >
                              Qualité
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {lots.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        <Layers className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p className="font-semibold text-slate-600 dark:text-slate-300">Aucun lot enregistré</p>
                        <p className="text-[11px] mt-0.5">Les lots sont créés par les réceptions, la production et les reprises de stock.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= HISTORIQUE ================= */}
      {activeTab === 'HISTORY' && (
        <div className="space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher article, lot, document, opérateur..."
                value={historySearch}
                onChange={e => setHistorySearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden"
              />
            </div>
            <select
              value={historyType}
              onChange={e => setHistoryType(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer"
            >
              <option value="ALL">Tous les types</option>
              {[
                'ENTREE_RECEPTION', 'CONSOMMATION_OF', 'SORTIE_VENTE', 'REBUT_DEFECTUEUX',
                'RETOUR_STOCK', 'AJUSTEMENT_INVENTAIRE', 'TRANSFERT_SORTIE', 'TRANSFERT_ENTREE',
                'RETOUR_MAGASIN', 'RECEPTION_PRODUCTION', 'MISE_EN_QUARANTAINE',
                'CHANGEMENT_STATUT_QUALITE', 'REGULARISATION_TRANSFERT',
              ].map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            <select
              value={historyWarehouse}
              onChange={e => setHistoryWarehouse(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer"
            >
              <option value="ALL">Tous les magasins</option>
              {warehouses.map(w => (
                <option key={w.id} value={w.id}>{w.code}</option>
              ))}
            </select>
            {storage.canWarehouse('REPORTS_EXPORT', currentUser) && (
              <button
                type="button"
                onClick={exportMovements}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> Export CSV
              </button>
            )}
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Article</th>
                    <th className="py-3 px-4">Lot</th>
                    <th className="py-3 px-4">Document</th>
                    <th className="py-3 px-4 text-right">Quantité</th>
                    <th className="py-3 px-4 text-right">Effet</th>
                    <th className="py-3 px-4">Flux</th>
                    <th className="py-3 px-4">Opérateur</th>
                    <th className="py-3 px-4">Motif</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {movements.slice(0, 300).map(movement => (
                    <tr key={movement.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-4 text-slate-500 whitespace-nowrap">{formatDate(movement.timestamp)}</td>
                      <td className="py-2.5 px-4">
                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {movement.type}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-mono font-semibold text-slate-800 dark:text-slate-200">{movement.itemCode}</td>
                      <td className="py-2.5 px-4 font-mono text-indigo-600">{movement.batchNumber}</td>
                      <td className="py-2.5 px-4 font-mono text-[11px] text-slate-500">{movement.documentNumber || '—'}</td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold">{numberFormat(movement.quantity)} {movement.unit}</td>
                      <td className={`py-2.5 px-4 text-right font-mono font-bold ${(movement.stockDelta || 0) > 0 ? 'text-emerald-600' : (movement.stockDelta || 0) < 0 ? 'text-red-600' : 'text-slate-400'}`}>
                        {movement.stockDelta === undefined ? '—' : `${movement.stockDelta > 0 ? '+' : ''}${numberFormat(movement.stockDelta)}`}
                      </td>
                      <td className="py-2.5 px-4 text-[10px] text-slate-500 whitespace-nowrap">
                        {movement.sourceWarehouseId ? warehouseById.get(movement.sourceWarehouseId)?.code || movement.sourceWarehouseId : '—'}
                        <ArrowRight className="w-3 h-3 inline mx-1 text-slate-300" />
                        {movement.destinationWarehouseId ? warehouseById.get(movement.destinationWarehouseId)?.code || movement.destinationWarehouseId : '—'}
                      </td>
                      <td className="py-2.5 px-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">{movement.userName}</td>
                      <td className="py-2.5 px-4 text-slate-500 text-[11px] max-w-64 truncate" title={movement.reason}>{movement.reason || '—'}</td>
                    </tr>
                  ))}
                  {movements.length === 0 && (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-400">
                        <History className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p className="font-semibold text-slate-600 dark:text-slate-300">Aucun mouvement ne correspond aux filtres</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {movements.length > 300 && (
              <div className="px-4 py-2 text-[11px] text-slate-400 border-t border-slate-100 dark:border-slate-800">
                Affichage des 300 mouvements les plus récents sur {movements.length}. Affinez les filtres ou exportez en CSV.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= MODAL MAGASIN ================= */}
      <Modal
        isOpen={Boolean(warehouseModal)}
        onClose={() => setWarehouseModal(null)}
        title={warehouseModal?.mode === 'edit' ? 'Modifier un magasin' : 'Créer un magasin'}
        subtitle="Référentiel logistique — les magasins inactifs ne peuvent plus recevoir de transfert."
        maxWidth="2xl"
      >
        <div className="space-y-3 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Code magasin *">
              <input value={warehouseForm.code} onChange={e => setWarehouseForm(f => ({ ...f, code: e.target.value }))} className={inputClass} placeholder="MAG-XX-01" />
            </Field>
            <Field label="Type de magasin *">
              <select value={warehouseForm.type} onChange={e => setWarehouseForm(f => ({ ...f, type: e.target.value as WarehouseType }))} className={inputClass}>
                {WAREHOUSE_TYPES.map(type => (
                  <option key={type} value={type}>{WAREHOUSE_TYPE_LABELS[type]}</option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Désignation *">
            <input value={warehouseForm.designation} onChange={e => setWarehouseForm(f => ({ ...f, designation: e.target.value }))} className={inputClass} />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Responsable">
              <input value={warehouseForm.manager} onChange={e => setWarehouseForm(f => ({ ...f, manager: e.target.value }))} className={inputClass} />
            </Field>
            <Field label="Localisation dans l'usine">
              <input value={warehouseForm.location} onChange={e => setWarehouseForm(f => ({ ...f, location: e.target.value }))} className={inputClass} />
            </Field>
          </div>
          <Field label="Zone / adresse détaillée">
            <input value={warehouseForm.addressZone} onChange={e => setWarehouseForm(f => ({ ...f, addressZone: e.target.value }))} className={inputClass} />
          </Field>
          <Field label="Description">
            <textarea value={warehouseForm.description} onChange={e => setWarehouseForm(f => ({ ...f, description: e.target.value }))} className={`${inputClass} min-h-20`} />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            <Checkbox label="Libération qualité requise avant disponibilité" checked={warehouseForm.requiresQualityRelease} onChange={v => setWarehouseForm(f => ({ ...f, requiresQualityRelease: v }))} />
            <Checkbox label="Peut alimenter les ateliers de production" checked={warehouseForm.allowsProductionSupply} onChange={v => setWarehouseForm(f => ({ ...f, allowsProductionSupply: v }))} />
            <Checkbox label="Peut recevoir les produits finis de production" checked={warehouseForm.allowsProductionOutput} onChange={v => setWarehouseForm(f => ({ ...f, allowsProductionOutput: v }))} />
            <Checkbox label="Magasin actif" checked={warehouseForm.isActive} onChange={v => setWarehouseForm(f => ({ ...f, isActive: v }))} />
          </div>
          {error && <p className="text-red-600 text-[11px]">{error}</p>}
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button type="button" onClick={() => setWarehouseModal(null)} className={secondaryButton}>Annuler</button>
            <button type="button" onClick={submitWarehouse} className={primaryButton}>Enregistrer</button>
          </div>
        </div>
      </Modal>

      {/* ================= MODAL EMPLACEMENT ================= */}
      <Modal
        isOpen={Boolean(locationModal)}
        onClose={() => setLocationModal(null)}
        title={locationModal?.mode === 'edit' ? 'Modifier un emplacement' : 'Créer un emplacement'}
        subtitle="Une zone physique identifiée dans un magasin."
        maxWidth="2xl"
      >
        <div className="space-y-3 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Code emplacement *">
              <input value={locationForm.code} onChange={e => setLocationForm(f => ({ ...f, code: e.target.value }))} className={inputClass} placeholder="MP-CONG-01" />
            </Field>
            <Field label="Magasin *">
              <select value={locationForm.warehouseId} onChange={e => setLocationForm(f => ({ ...f, warehouseId: e.target.value }))} className={inputClass}>
                <option value="">Sélectionner…</option>
                {allWarehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.code} — {w.designation}</option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Désignation *">
            <input value={locationForm.designation} onChange={e => setLocationForm(f => ({ ...f, designation: e.target.value }))} className={inputClass} />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Type de zone">
              <input value={locationForm.zoneType} onChange={e => setLocationForm(f => ({ ...f, zoneType: e.target.value }))} className={inputClass} placeholder="Poisson congelé…" />
            </Field>
            <Field label="Capacité">
              <input type="number" min="0" value={locationForm.capacity} onChange={e => setLocationForm(f => ({ ...f, capacity: e.target.value }))} className={inputClass} />
            </Field>
            <Field label="Unité capacité">
              <select value={locationForm.capacityUnit} onChange={e => setLocationForm(f => ({ ...f, capacityUnit: e.target.value as UnitOfMeasure }))} className={inputClass}>
                {['KG', 'G', 'LITRE', 'BOITE', 'CARTON', 'PALETTE'].map(unit => (
                  <option key={unit} value={unit}>{unit}</option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Conditions de stockage">
            <input value={locationForm.storageConditions} onChange={e => setLocationForm(f => ({ ...f, storageConditions: e.target.value }))} className={inputClass} />
          </Field>
          <Checkbox label="Emplacement actif" checked={locationForm.isActive} onChange={v => setLocationForm(f => ({ ...f, isActive: v }))} />
          {error && <p className="text-red-600 text-[11px]">{error}</p>}
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button type="button" onClick={() => setLocationModal(null)} className={secondaryButton}>Annuler</button>
            <button type="button" onClick={submitLocation} className={primaryButton}>Enregistrer</button>
          </div>
        </div>
      </Modal>

      {/* ================= MODAL TRAÇABILITÉ LOT ================= */}
      <Modal
        isOpen={Boolean(selectedLot)}
        onClose={() => setSelectedLotId(null)}
        title={selectedLot ? `Traçabilité du lot ${selectedLot.lotNumber}` : 'Traçabilité du lot'}
        subtitle="Identité conservée, magasins traversés et décisions qualité."
        maxWidth="3xl"
      >
        {selectedLot && (
          <div className="space-y-5 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Info label="Article" value={selectedLot.itemCode} />
              <Info label="Lot fournisseur" value={selectedLot.supplierLotNumber || '—'} />
              <Info label="Réception" value={selectedLot.receptionDate || '—'} />
              <Info label="Durabilité" value={selectedLot.expiryDate || '—'} />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-2">Stock actuel par magasin</h4>
              <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500">
                    <tr>
                      <th className="py-2 px-3">Magasin</th>
                      <th className="py-2 px-3">Emplacement</th>
                      <th className="py-2 px-3">Statut</th>
                      <th className="py-2 px-3 text-right">Quantité</th>
                      <th className="py-2 px-3 text-right">Réservé</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {selectedLotRows.map(row => (
                      <tr key={row.id}>
                        <td className="py-2 px-3 font-mono font-semibold text-blue-600">{warehouseById.get(row.warehouseId)?.code}</td>
                        <td className="py-2 px-3 font-mono text-slate-500">{locationById.get(row.locationId)?.code}</td>
                        <td className="py-2 px-3"><StatusBadge status={row.qualityStatus} size="sm" /></td>
                        <td className="py-2 px-3 text-right font-mono font-bold">{numberFormat(row.quantity)} {row.unit}</td>
                        <td className="py-2 px-3 text-right font-mono text-slate-500">{numberFormat(row.reservedQty)}</td>
                      </tr>
                    ))}
                    {selectedLotRows.length === 0 && (
                      <tr><td colSpan={5} className="py-4 text-center text-slate-400">Aucun stock physique restant pour ce lot.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div>
              <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-2">Parcours magasins</h4>
              <ol className="space-y-2 border-l-2 border-blue-200 dark:border-blue-900 ml-2 pl-4">
                {selectedLot.warehouseTrail.map((entry, index) => (
                  <li key={`${entry.warehouseId}-${index}`} className="relative">
                    <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-blue-500 border-2 border-white dark:border-slate-900" />
                    <div className="font-semibold text-slate-800 dark:text-slate-200">
                      {entry.warehouseCode}
                      {entry.locationCode ? ` · ${entry.locationCode}` : ''}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Entrée : {formatDate(entry.enteredAt)} {entry.exitedAt ? `— Sortie : ${formatDate(entry.exitedAt)}` : '— Présent'}
                      {entry.transferNumber ? ` · ${entry.transferNumber}` : ''}
                    </div>
                  </li>
                ))}
                {selectedLot.warehouseTrail.length === 0 && <li className="text-slate-400">Aucun parcours enregistré.</li>}
              </ol>
            </div>
            <div>
              <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-2">Historique des décisions qualité</h4>
              <div className="space-y-1.5">
                {(selectedLot.qualityHistory || []).map((entry, index) => (
                  <div key={index} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                    <div>
                      <span className="font-semibold">{entry.from}</span>
                      <ArrowRight className="w-3 h-3 inline mx-1.5 text-slate-400" />
                      <span className="font-semibold text-blue-600">{entry.to}</span>
                      <span className="text-slate-500 ml-2">— {entry.reason}</span>
                    </div>
                    <div className="text-[10px] text-slate-400">{entry.user} · {formatDate(entry.timestamp)}</div>
                  </div>
                ))}
                {(selectedLot.qualityHistory || []).length === 0 && (
                  <p className="text-slate-400">Aucun changement de statut qualité enregistré.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ================= MODAL DÉCISION QUALITÉ ================= */}
      <Modal
        isOpen={Boolean(qualityModalLot)}
        onClose={() => setQualityModalLot(null)}
        title={qualityModalLot ? `Décision qualité — lot ${qualityModalLot.lotNumber}` : 'Décision qualité'}
        subtitle="Toute décision est tracée et historisée. Le statut qualité ne peut changer que par un profil habilité."
        maxWidth="lg"
      >
        {qualityModalLot && (
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <Info label="Statut actuel" value={STOCK_QUALITY_LABELS[qualityModalLot.qualityStatus]} />
              <Info label="Article" value={qualityModalLot.itemCode} />
            </div>
            <Field label="Nouveau statut *">
              <select value={qualityForm.status} onChange={e => setQualityForm(f => ({ ...f, status: e.target.value as StockQualityStatus }))} className={inputClass}>
                {QUALITY_STATUSES.map(status => (
                  <option key={status} value={status}>{STOCK_QUALITY_LABELS[status]}</option>
                ))}
              </select>
            </Field>
            <Field label="Magasin de destination (optionnel)">
              <select value={qualityForm.warehouseId} onChange={e => setQualityForm(f => ({ ...f, warehouseId: e.target.value }))} className={inputClass}>
                <option value="">Automatique selon le statut</option>
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.code} — {w.designation}</option>
                ))}
              </select>
            </Field>
            <Field label="Motif formel *">
              <textarea value={qualityForm.reason} onChange={e => setQualityForm(f => ({ ...f, reason: e.target.value }))} className={`${inputClass} min-h-20`} placeholder="Décision du laboratoire, dérogation, résultat d'analyse…" />
            </Field>
            {error && <p className="text-red-600 text-[11px]">{error}</p>}
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button type="button" onClick={() => setQualityModalLot(null)} className={secondaryButton}>Annuler</button>
              <button type="button" onClick={submitQuality} className={primaryButton}>Enregistrer la décision</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

const inputClass =
  'w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500/30';
const primaryButton =
  'px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-500 cursor-pointer';
const secondaryButton =
  'px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer';

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="block">
    <span className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">{label}</span>
    {children}
  </label>
);

const Checkbox: React.FC<{ label: string; checked: boolean; onChange: (value: boolean) => void }> = ({
  label,
  checked,
  onChange,
}) => (
  <label className="flex items-start gap-2 cursor-pointer text-[11px] text-slate-600 dark:text-slate-300">
    <input
      type="checkbox"
      checked={checked}
      onChange={e => onChange(e.target.checked)}
      className="mt-0.5 w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
    />
    <span>{label}</span>
  </label>
);

const Info: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60">
    <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">{label}</div>
    <div className="font-mono text-[11px] font-semibold text-slate-800 dark:text-slate-200 mt-0.5 break-words">{value}</div>
  </div>
);

const UserIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3 text-slate-400">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);
