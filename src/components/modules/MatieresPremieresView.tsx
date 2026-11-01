/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * MAMORA GP — Module Matières Premières & Composants
 * Référentiel central unique des articles : liste, création, modification,
 * consultation, désactivation et historique des modifications.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  PackageSearch,
  Plus,
  Search,
  Pencil,
  Eye,
  Power,
  PowerOff,
  History,
  Settings2,
  Download,
  AlertTriangle,
  CheckCircle2,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Layers,
  Truck,
  ShieldCheck,
  Lock,
  Boxes,
} from 'lucide-react';
import { storage } from '../../services/storage';
import { Modal } from '../common/Modal';
import {
  Item,
  ItemCategory,
  ItemCategoryGroup,
  ItemChangeLog,
  ItemSubCategory,
  Supplier,
  ITEM_CATEGORY_LABELS,
  ITEM_CATEGORY_GROUP_LABELS,
  ITEM_CATEGORY_GROUPS,
  ITEM_PERMISSION_LABELS,
  ITEM_ROLE_PERMISSIONS,
  ITEM_FIELD_LABELS,
  UNIT_LABELS,
  User,
  UserRole,
  getRoleLabel,
} from '../../types';
import { ItemFormModal, ItemFormMode, ItemFormTab } from './items/ItemFormModal';

interface MatieresPremieresViewProps {
  currentUser: User;
}

type ModuleTab = 'LISTE' | 'HISTORIQUE' | 'PARAMETRAGE';
type SortKey = 'code' | 'designation' | 'group' | 'stock';
type StatusFilter = 'ALL' | 'ACTIF' | 'INACTIF';

const TABS: Array<{ id: ModuleTab; label: string; icon: React.ElementType }> = [
  { id: 'LISTE', label: 'Liste des articles', icon: Boxes },
  { id: 'HISTORIQUE', label: 'Historique des modifications', icon: History },
  { id: 'PARAMETRAGE', label: 'Paramétrage', icon: Settings2 },
];

const inputCls =
  'px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:border-blue-500 focus:outline-hidden';

const formatQty = (value: number): string =>
  new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(value);

const formatDateTime = (value?: string): string => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('fr-FR');
};

const downloadCsv = (filename: string, rows: Array<Array<string | number>>) => {
  const csv = rows
    .map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(';'))
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

const CHANGE_ACTION_LABELS: Record<ItemChangeLog['action'], string> = {
  CREATE: 'Création',
  UPDATE: 'Modification',
  DEACTIVATE: 'Désactivation',
  REACTIVATE: 'Réactivation',
};

export const MatieresPremieresView: React.FC<MatieresPremieresViewProps> = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState<ModuleTab>('LISTE');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // Les collections du service sont mutées sur place : une révision explicite
  // invalide les vues dérivées (stocks consolidés, historiques, référentiels).
  const [revision, setRevision] = useState(0);
  useEffect(() => storage.subscribe(() => setRevision(value => value + 1)), []);

  // --- Habilitations ---
  const canView = storage.canItem('ITEM_VIEW', currentUser);
  const canCreate = storage.canItem('ITEM_CREATE', currentUser);
  const canEdit = storage.canItem('ITEM_EDIT', currentUser);
  const canDeactivate = storage.canItem('ITEM_DEACTIVATE', currentUser);
  const canManageCategories = storage.canItem('ITEM_CATEGORY_MANAGE', currentUser);
  const canManageSuppliers = storage.canItem('ITEM_SUPPLIER_MANAGE', currentUser);
  const canHistory = storage.canItem('ITEM_HISTORY_VIEW', currentUser);

  const items = storage.getItems();
  const warehouses = storage.getWarehouses(true);
  const suppliers = storage.getSuppliers(true);
  const subCategories = storage.getItemSubCategories({ includeInactive: true });

  const stockByItem = useMemo(() => {
    const map = new Map<string, { physical: number; available: number; min: number }>();
    storage.getConsolidatedStockView().forEach(row => {
      map.set(row.itemId, {
        physical: row.physical,
        available: row.available,
        min: row.minStockLevel,
      });
    });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, revision]);

  const supplierById = useMemo(() => {
    const map = new Map<string, Supplier>();
    suppliers.forEach(supplier => map.set(supplier.id, supplier));
    return map;
  }, [suppliers, revision]);

  const subCategoryById = useMemo(() => {
    const map = new Map<string, ItemSubCategory>();
    subCategories.forEach(sub => map.set(sub.id, sub));
    return map;
  }, [subCategories, revision]);

  const warehouseById = useMemo(() => {
    const map = new Map<string, string>();
    warehouses.forEach(warehouse => map.set(warehouse.id, `${warehouse.code}`));
    return map;
  }, [warehouses, revision]);

  // --- Liste : filtres, tri, pagination ---
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState<'ALL' | ItemCategoryGroup>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | ItemCategory>('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [sortKey, setSortKey] = useState<SortKey>('code');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const filteredItems = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const rows = items.filter(item => {
      const group = item.group || 'AUTRES_COMPOSANTS';
      if (groupFilter !== 'ALL' && group !== groupFilter) return false;
      if (categoryFilter !== 'ALL' && item.category !== categoryFilter) return false;
      const isActive = item.isActive !== false;
      if (statusFilter === 'ACTIF' && !isActive) return false;
      if (statusFilter === 'INACTIF' && isActive) return false;
      if (!needle) return true;
      const sub = item.subCategoryId ? subCategoryById.get(item.subCategoryId) : undefined;
      return `${item.code} ${item.designation} ${item.secondaryDesignation || ''} ${sub?.designation || ''}`
        .toLowerCase()
        .includes(needle);
    });

    const direction = sortDir === 'asc' ? 1 : -1;
    return rows.sort((a, b) => {
      switch (sortKey) {
        case 'designation':
          return direction * a.designation.localeCompare(b.designation);
        case 'group':
          return (
            direction *
            (a.group || '').localeCompare(b.group || '') ||
            a.designation.localeCompare(b.designation)
          );
        case 'stock': {
          const stockA = stockByItem.get(a.id)?.available ?? 0;
          const stockB = stockByItem.get(b.id)?.available ?? 0;
          return direction * (stockA - stockB);
        }
        case 'code':
        default:
          return direction * a.code.localeCompare(b.code);
      }
    });
  }, [
    items,
    search,
    groupFilter,
    categoryFilter,
    statusFilter,
    sortKey,
    sortDir,
    stockByItem,
    subCategoryById,
    revision,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedItems = filteredItems.slice((safePage - 1) * pageSize, safePage * pageSize);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setPage(1);
  };

  const sortIcon = (key: SortKey) => {
    if (sortKey !== key) return <ArrowUpDown className="w-3 h-3 opacity-40" />;
    return sortDir === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-blue-600" />
    ) : (
      <ArrowDown className="w-3 h-3 text-blue-600" />
    );
  };

  // --- Fiche article (création / modification / consultation) ---
  const [formModal, setFormModal] = useState<{
    mode: ItemFormMode;
    item: Item | null;
    tab: ItemFormTab;
  } | null>(null);

  const openCreate = () => {
    if (!canCreate) {
      setError('Votre profil n\'est pas habilité à créer un article.');
      return;
    }
    setError('');
    setFormModal({ mode: 'create', item: null, tab: 'GENERAL' });
  };

  const openForm = (item: Item, mode: ItemFormMode, tab: ItemFormTab = 'GENERAL') => {
    setError('');
    setFormModal({ mode, item, tab });
  };

  // --- Désactivation / réactivation ---
  const [statusModal, setStatusModal] = useState<{ item: Item; activate: boolean } | null>(null);
  const [statusReason, setStatusReason] = useState('');

  const openStatusModal = (item: Item) => {
    setError('');
    setStatusReason('');
    setStatusModal({ item, activate: item.isActive === false });
  };

  const submitStatusChange = () => {
    if (!statusModal) return;
    try {
      storage.setItemActive(statusModal.item.id, statusModal.activate, statusReason);
      setNotice(
        statusModal.activate
          ? `Article ${statusModal.item.code} réactivé.`
          : `Article ${statusModal.item.code} désactivé : il n'est plus proposé dans les nouvelles opérations.`
      );
      setStatusModal(null);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  // --- Historique global ---
  const [historySearch, setHistorySearch] = useState('');
  const [historyAction, setHistoryAction] = useState<'ALL' | ItemChangeLog['action']>('ALL');
  const [historyField, setHistoryField] = useState('ALL');

  const historyRows = useMemo(
    () =>
      canHistory
        ? storage.getItemChangeLogs({
            search: historySearch,
            action: historyAction === 'ALL' ? undefined : historyAction,
            limit: 500,
          }).filter(log => historyField === 'ALL' || log.field === historyField)
        : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [historySearch, historyAction, historyField, canHistory, items, revision]
  );

  // --- Paramétrage : sous-catégories ---
  const [subGroup, setSubGroup] = useState<ItemCategoryGroup>('MATIERES_PREMIERES_PRINCIPALES');
  const [newSubCode, setNewSubCode] = useState('');
  const [newSubLabel, setNewSubLabel] = useState('');

  const visibleSubCategories = subCategories.filter(sub => sub.group === subGroup);

  const submitSubCategory = () => {
    try {
      storage.addItemSubCategory({
        group: subGroup,
        code: newSubCode,
        designation: newSubLabel,
      });
      setNewSubCode('');
      setNewSubLabel('');
      setNotice('Sous-catégorie créée.');
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  // --- Paramétrage : fournisseurs ---
  const [newSupplier, setNewSupplier] = useState({
    name: '',
    contactName: '',
    email: '',
    phone: '',
    country: 'Algérie',
  });

  const submitSupplier = () => {
    try {
      storage.addSupplier(newSupplier);
      setNewSupplier({ name: '', contactName: '', email: '', phone: '', country: 'Algérie' });
      setNotice('Fournisseur enregistré dans le référentiel.');
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  // --- Statistiques ---
  const activeCount = items.filter(item => item.isActive !== false).length;
  const inactiveCount = items.length - activeCount;
  const lowStockCount = items.filter(item => {
    if (item.isActive === false) return false;
    const stock = stockByItem.get(item.id);
    if (!stock || item.minStockLevel <= 0) return false;
    return stock.available < item.minStockLevel;
  }).length;

  const exportList = () => {
    const rows: Array<Array<string | number>> = [
      [
        'Code',
        'Désignation',
        'Désignation secondaire',
        'Groupe',
        'Catégorie',
        'Sous-catégorie',
        'Unité',
        'Unité secondaire',
        'Coefficient',
        'Conditionnement',
        'Magasin par défaut',
        'Stock minimum',
        'Stock disponible',
        'Fournisseur principal',
        'Statut',
        'Dernière modification',
      ],
    ];
    filteredItems.forEach(item => {
      const stock = stockByItem.get(item.id);
      rows.push([
        item.code,
        item.designation,
        item.secondaryDesignation || '',
        ITEM_CATEGORY_GROUP_LABELS[item.group || 'AUTRES_COMPOSANTS'],
        ITEM_CATEGORY_LABELS[item.category],
        item.subCategoryId ? subCategoryById.get(item.subCategoryId)?.designation || '' : '',
        item.unit,
        item.secondaryUnit || '',
        item.conversionCoefficient ?? '',
        item.packaging || '',
        item.defaultWarehouseId ? warehouseById.get(item.defaultWarehouseId) || '' : storage.getItemDefaultWarehouse(item)?.code || '',
        item.minStockLevel,
        stock?.available ?? 0,
        item.primarySupplierId ? supplierById.get(item.primarySupplierId)?.name || '' : '',
        item.isActive === false ? 'Inactif' : 'Actif',
        item.updatedAt || '',
      ]);
    });
    downloadCsv(
      `mamora-articles-${new Date().toISOString().slice(0, 10)}.csv`,
      rows
    );
  };

  if (!canView) {
    return (
      <div className="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-start gap-2 text-amber-800 dark:text-amber-200 text-xs">
          <Lock className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            Votre profil ({getRoleLabel(currentUser.role)}) n'est pas habilité à consulter le référentiel des
            matières premières et composants.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* En-tête */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <PackageSearch className="w-5 h-5 text-blue-600" />
            <span>Matières Premières &amp; Composants</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Référentiel central des articles de la conserverie — classification, unités, stockage, qualité et
            fournisseurs.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded border border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {activeCount} actif(s)
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            <PowerOff className="w-3.5 h-3.5" />
            {inactiveCount} inactif(s)
          </span>
          {lowStockCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded border border-amber-200 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
              <AlertTriangle className="w-3.5 h-3.5" />
              {lowStockCount} sous le stock minimum
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
            {error ? (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            )}
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
        {TABS.filter(tab => tab.id !== 'HISTORIQUE' || canHistory).map(tab => {
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

      {/* ================= LISTE ================= */}
      {activeTab === 'LISTE' && (
        <div className="space-y-4">
          {/* Barre d'outils */}
          <div className="flex flex-col xl:flex-row xl:items-center gap-2">
            <div className="relative flex-1 min-w-48">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={e => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Rechercher par code, désignation, sous-catégorie…"
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:border-blue-500 focus:outline-hidden"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={groupFilter}
                onChange={e => {
                  setGroupFilter(e.target.value as 'ALL' | ItemCategoryGroup);
                  setPage(1);
                }}
                className={`${inputCls} cursor-pointer`}
                aria-label="Filtrer par groupe fonctionnel"
              >
                <option value="ALL">Tous les groupes</option>
                {ITEM_CATEGORY_GROUPS.map(group => (
                  <option key={group} value={group}>
                    {ITEM_CATEGORY_GROUP_LABELS[group]}
                  </option>
                ))}
              </select>
              <select
                value={categoryFilter}
                onChange={e => {
                  setCategoryFilter(e.target.value as 'ALL' | ItemCategory);
                  setPage(1);
                }}
                className={`${inputCls} cursor-pointer`}
                aria-label="Filtrer par catégorie"
              >
                <option value="ALL">Toutes les catégories</option>
                {(Object.keys(ITEM_CATEGORY_LABELS) as ItemCategory[]).map(category => (
                  <option key={category} value={category}>
                    {ITEM_CATEGORY_LABELS[category]}
                  </option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={e => {
                  setStatusFilter(e.target.value as StatusFilter);
                  setPage(1);
                }}
                className={`${inputCls} cursor-pointer`}
                aria-label="Filtrer par statut"
              >
                <option value="ALL">Tous les statuts</option>
                <option value="ACTIF">Actifs</option>
                <option value="INACTIF">Inactifs</option>
              </select>
              <button
                type="button"
                onClick={exportList}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Exporter
              </button>
              <button
                type="button"
                onClick={openCreate}
                disabled={!canCreate}
                title={canCreate ? 'Créer un nouvel article' : 'Habilitation « Créer des articles » requise'}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Nouveau
              </button>
            </div>
          </div>

          {/* Tableau */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-2.5 px-2.5">
                      <button
                        type="button"
                        onClick={() => toggleSort('code')}
                        className="inline-flex items-center gap-1 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                      >
                        Code {sortIcon('code')}
                      </button>
                    </th>
                    <th className="py-2.5 px-2.5">
                      <button
                        type="button"
                        onClick={() => toggleSort('designation')}
                        className="inline-flex items-center gap-1 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                      >
                        Désignation {sortIcon('designation')}
                      </button>
                    </th>
                    <th className="py-2.5 px-2.5">
                      <button
                        type="button"
                        onClick={() => toggleSort('group')}
                        className="inline-flex items-center gap-1 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                      >
                        Classification {sortIcon('group')}
                      </button>
                    </th>
                    <th className="py-2.5 px-2.5">Unité / conditionnement</th>
                    <th className="py-2.5 px-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => toggleSort('stock')}
                        className="inline-flex items-center gap-1 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                      >
                        Stock dispo. {sortIcon('stock')}
                      </button>
                    </th>
                    <th className="py-2.5 px-2.5">Magasin déf.</th>
                    <th className="py-2.5 px-2.5">Fournisseur princ.</th>
                    <th className="py-2.5 px-2.5">Statut</th>
                    <th className="py-2.5 px-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginatedItems.map(item => {
                    const stock = stockByItem.get(item.id);
                    const isActive = item.isActive !== false;
                    const isLow =
                      isActive && item.minStockLevel > 0 && (stock?.available ?? 0) < item.minStockLevel;
                    const sub = item.subCategoryId ? subCategoryById.get(item.subCategoryId) : undefined;
                    const defaultWarehouse = storage.getItemDefaultWarehouse(item);
                    return (
                      <tr
                        key={item.id}
                        className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/40 ${
                          isActive ? '' : 'opacity-70'
                        }`}
                      >
                        <td className="py-2 px-2.5 font-mono font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                          {item.code}
                        </td>
                        <td className="py-2 px-2.5 max-w-56">
                          <div className="font-semibold text-slate-800 dark:text-slate-100 truncate">
                            {item.designation}
                          </div>
                          {item.secondaryDesignation && (
                            <div className="text-[10px] text-slate-500 truncate">
                              {item.secondaryDesignation}
                            </div>
                          )}
                        </td>
                        <td className="py-2 px-2.5">
                          <div className="text-[11px] text-slate-700 dark:text-slate-200 truncate max-w-44">
                            {ITEM_CATEGORY_GROUP_LABELS[item.group || 'AUTRES_COMPOSANTS']}
                          </div>
                          <div className="text-[10px] text-slate-500 truncate max-w-44">
                            {ITEM_CATEGORY_LABELS[item.category]}
                            {sub ? ` · ${sub.designation}` : ''}
                          </div>
                        </td>
                        <td className="py-2 px-2.5 whitespace-nowrap">
                          <div className="font-mono text-[11px] text-slate-700 dark:text-slate-200">
                            {item.unit}
                            {item.secondaryUnit && item.conversionCoefficient
                              ? ` · 1 ${item.secondaryUnit} = ${formatQty(item.conversionCoefficient)} ${item.unit}`
                              : ''}
                          </div>
                          {item.packaging && (
                            <div className="text-[10px] text-slate-500 truncate max-w-44">{item.packaging}</div>
                          )}
                        </td>
                        <td className="py-2 px-2.5 text-right whitespace-nowrap">
                          <div
                            className={`font-mono font-semibold ${
                              isLow ? 'text-amber-600 dark:text-amber-400' : 'text-slate-800 dark:text-slate-100'
                            }`}
                          >
                            {formatQty(stock?.available ?? 0)} {item.unit}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            min {formatQty(item.minStockLevel)}
                          </div>
                        </td>
                        <td className="py-2 px-2.5 text-[11px] text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          <span title={defaultWarehouse ? `${defaultWarehouse.code} — ${defaultWarehouse.designation}` : undefined}>
                            {defaultWarehouse?.code || '—'}
                          </span>
                          {defaultWarehouse && !item.defaultWarehouseId && (
                            <span className="ml-1 text-[9px] text-slate-400">(déduit)</span>
                          )}
                        </td>
                        <td className="py-2 px-2.5 text-[11px] text-slate-600 dark:text-slate-300 max-w-40 truncate">
                          {item.primarySupplierId
                            ? supplierById.get(item.primarySupplierId)?.name || '—'
                            : '—'}
                        </td>
                        <td className="py-2 px-2.5">
                          <span
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-semibold ${
                              isActive
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
                                : 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                            }`}
                          >
                            {isActive ? 'Actif' : 'Inactif'}
                          </span>
                        </td>
                        <td className="py-2 px-2.5 text-right">
                          <div className="inline-flex items-center gap-0.5">
                            <button
                              type="button"
                              onClick={() => openForm(item, 'view')}
                              title="Consulter la fiche"
                              className="p-1 rounded text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            {canEdit && (
                              <button
                                type="button"
                                onClick={() => openForm(item, 'edit')}
                                title="Modifier la fiche"
                                className="p-1 rounded text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 cursor-pointer"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {canDeactivate && (
                              <button
                                type="button"
                                onClick={() => openStatusModal(item)}
                                title={isActive ? 'Désactiver l\'article' : 'Réactiver l\'article'}
                                className={`p-1 rounded cursor-pointer ${
                                  isActive
                                    ? 'text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-800'
                                    : 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-800'
                                }`}
                              >
                                {isActive ? (
                                  <PowerOff className="w-3.5 h-3.5" />
                                ) : (
                                  <Power className="w-3.5 h-3.5" />
                                )}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {paginatedItems.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        <PackageSearch className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p className="font-semibold text-slate-600 dark:text-slate-300">
                          Aucun article ne correspond aux critères
                        </p>
                        <p className="text-[11px] mt-0.5">
                          Ajustez la recherche ou les filtres, ou créez un nouvel article.
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3 py-2 border-t border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 text-[11px] text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-2">
                <span>
                  {filteredItems.length === 0
                    ? '0 article'
                    : `${(safePage - 1) * pageSize + 1}–${Math.min(
                        safePage * pageSize,
                        filteredItems.length
                      )} sur ${filteredItems.length}`}
                </span>
                <select
                  value={pageSize}
                  onChange={e => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="px-1.5 py-1 text-[11px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded cursor-pointer"
                  aria-label="Nombre de lignes par page"
                >
                  {[10, 15, 25, 50, 100].map(size => (
                    <option key={size} value={size}>
                      {size} / page
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPage(1)}
                  disabled={safePage === 1}
                  className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 disabled:opacity-40 cursor-pointer"
                >
                  «
                </button>
                <button
                  type="button"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 disabled:opacity-40 cursor-pointer"
                >
                  Précédent
                </button>
                <span className="px-2">
                  Page {safePage} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 disabled:opacity-40 cursor-pointer"
                >
                  Suivant
                </button>
                <button
                  type="button"
                  onClick={() => setPage(totalPages)}
                  disabled={safePage === totalPages}
                  className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 disabled:opacity-40 cursor-pointer"
                >
                  »
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= HISTORIQUE ================= */}
      {activeTab === 'HISTORIQUE' && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center gap-2">
            <div className="relative flex-1 min-w-48">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                value={historySearch}
                onChange={e => setHistorySearch(e.target.value)}
                placeholder="Rechercher par article, champ, utilisateur ou motif…"
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:border-blue-500 focus:outline-hidden"
              />
            </div>
            <select
              value={historyAction}
              onChange={e => setHistoryAction(e.target.value as 'ALL' | ItemChangeLog['action'])}
              className={`${inputCls} cursor-pointer`}
              aria-label="Filtrer par type d'opération"
            >
              <option value="ALL">Toutes les opérations</option>
              {(Object.keys(CHANGE_ACTION_LABELS) as Array<ItemChangeLog['action']>).map(action => (
                <option key={action} value={action}>
                  {CHANGE_ACTION_LABELS[action]}
                </option>
              ))}
            </select>
            <select
              value={historyField}
              onChange={e => setHistoryField(e.target.value)}
              className={`${inputCls} cursor-pointer`}
              aria-label="Filtrer par champ"
            >
              <option value="ALL">Tous les champs</option>
              {Object.entries(ITEM_FIELD_LABELS).map(([field, label]) => (
                <option key={field} value={field}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="overflow-x-auto max-h-[32rem] overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-700 sticky top-0">
                  <tr>
                    <th className="py-2.5 px-2.5">Date &amp; heure</th>
                    <th className="py-2.5 px-2.5">Article</th>
                    <th className="py-2.5 px-2.5">Opération</th>
                    <th className="py-2.5 px-2.5">Champ modifié</th>
                    <th className="py-2.5 px-2.5">Ancienne valeur</th>
                    <th className="py-2.5 px-2.5">Nouvelle valeur</th>
                    <th className="py-2.5 px-2.5">Utilisateur</th>
                    <th className="py-2.5 px-2.5">Motif</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {historyRows.map(log => (
                    <tr key={log.id} className="align-top hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="py-2 px-2.5 text-[10px] text-slate-500 whitespace-nowrap">
                        {formatDateTime(log.timestamp)}
                      </td>
                      <td className="py-2 px-2.5">
                        <div className="font-mono text-[11px] font-bold text-blue-600 dark:text-blue-400">
                          {log.itemCode}
                        </div>
                        <div className="text-[10px] text-slate-500 max-w-40 truncate">
                          {log.itemDesignation}
                        </div>
                      </td>
                      <td className="py-2 px-2.5">
                        <span
                          className={`inline-flex px-1.5 py-0.5 rounded border text-[10px] font-semibold ${
                            log.action === 'CREATE'
                              ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800'
                              : log.action === 'DEACTIVATE'
                                ? 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                                : log.action === 'REACTIVATE'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
                                  : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800'
                          }`}
                        >
                          {CHANGE_ACTION_LABELS[log.action]}
                        </span>
                      </td>
                      <td className="py-2 px-2.5 text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                        {log.fieldLabel}
                      </td>
                      <td className="py-2 px-2.5 text-[11px] text-slate-500 max-w-48 break-words">
                        {log.oldValue}
                      </td>
                      <td className="py-2 px-2.5 text-[11px] text-slate-800 dark:text-slate-100 max-w-48 break-words">
                        {log.newValue}
                      </td>
                      <td className="py-2 px-2.5 text-[11px] text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {log.userName}
                        <div className="text-[10px] text-slate-400">{getRoleLabel(log.userRole)}</div>
                      </td>
                      <td className="py-2 px-2.5 text-[11px] text-slate-500 max-w-48 break-words">
                        {log.motive || '—'}
                      </td>
                    </tr>
                  ))}
                  {historyRows.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <History className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p className="font-semibold text-slate-600 dark:text-slate-300">
                          Aucune modification enregistrée
                        </p>
                        <p className="text-[11px] mt-0.5">
                          Chaque création, modification ou désactivation d'article est historisée ici.
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {historyRows.length >= 500 && (
              <div className="px-3 py-2 border-t border-slate-200 dark:border-slate-700 text-[10px] text-slate-500">
                500 lignes les plus récentes affichées — affinez la recherche pour retrouver une modification
                plus ancienne.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= PARAMÉTRAGE ================= */}
      {activeTab === 'PARAMETRAGE' && (
        <div className="space-y-5">
          {/* Sous-catégories */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-600" />
                  Sous-catégories configurables
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Rattachées à un groupe fonctionnel : elles structurent la classification des articles.
                  Le sélecteur ci-dessous définit le groupe affiché et le groupe de création.
                </p>
              </div>
              {!canManageCategories && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-amber-200 bg-amber-50 text-amber-700 text-[10px]">
                  <Lock className="w-3 h-3" />
                  Lecture seule
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={subGroup}
                onChange={e => setSubGroup(e.target.value as ItemCategoryGroup)}
                className={`${inputCls} cursor-pointer`}
                aria-label="Groupe de la sous-catégorie"
              >
                {ITEM_CATEGORY_GROUPS.map(group => (
                  <option key={group} value={group}>
                    {ITEM_CATEGORY_GROUP_LABELS[group]}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={newSubCode}
                onChange={e => setNewSubCode(e.target.value.toUpperCase())}
                placeholder="Code (ex. MP-POISSON)"
                disabled={!canManageCategories}
                className={`${inputCls} font-mono w-40`}
              />
              <input
                type="text"
                value={newSubLabel}
                onChange={e => setNewSubLabel(e.target.value)}
                placeholder="Désignation de la sous-catégorie"
                disabled={!canManageCategories}
                className={`${inputCls} flex-1 min-w-48`}
              />
              <button
                type="button"
                onClick={submitSubCategory}
                disabled={!canManageCategories}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Ajouter
              </button>
            </div>

            <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden max-h-72 overflow-y-auto">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold sticky top-0">
                  <tr>
                    <th className="py-1.5 px-3">Groupe</th>
                    <th className="py-1.5 px-3">Code</th>
                    <th className="py-1.5 px-3">Désignation</th>
                    <th className="py-1.5 px-3 text-right">Articles</th>
                    <th className="py-1.5 px-3 text-right">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {visibleSubCategories.map(sub => {
                    const count = items.filter(item => item.subCategoryId === sub.id).length;
                    return (
                      <tr key={sub.id}>
                        <td className="py-1.5 px-3 text-slate-500">
                          {ITEM_CATEGORY_GROUP_LABELS[sub.group]}
                        </td>
                        <td className="py-1.5 px-3 font-mono text-blue-600 dark:text-blue-400">{sub.code}</td>
                        <td className="py-1.5 px-3 text-slate-700 dark:text-slate-200">{sub.designation}</td>
                        <td className="py-1.5 px-3 text-right font-mono text-slate-500">{count}</td>
                        <td className="py-1.5 px-3 text-right">
                          {canManageCategories ? (
                            <button
                              type="button"
                              onClick={() => {
                                try {
                                  storage.updateItemSubCategory(sub.id, { isActive: !sub.isActive });
                                } catch (e) {
                                  setError(e instanceof Error ? e.message : String(e));
                                }
                              }}
                              className={`px-1.5 py-0.5 rounded border text-[10px] font-semibold cursor-pointer ${
                                sub.isActive
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
                                  : 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                              }`}
                            >
                              {sub.isActive ? 'Active' : 'Inactive'}
                            </button>
                          ) : (
                            <span className="text-slate-500">{sub.isActive ? 'Active' : 'Inactive'}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Fournisseurs */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Truck className="w-4 h-4 text-blue-600" />
                  Référentiel fournisseurs
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Liste unique : fournisseurs repris des réceptions et fournisseurs saisis ici.
                </p>
              </div>
              <span className="text-[11px] text-slate-500">{suppliers.length} fournisseur(s)</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={newSupplier.name}
                onChange={e => setNewSupplier(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Raison sociale *"
                disabled={!canManageSuppliers}
                className={`${inputCls} flex-1 min-w-48`}
              />
              <input
                type="text"
                value={newSupplier.contactName}
                onChange={e => setNewSupplier(prev => ({ ...prev, contactName: e.target.value }))}
                placeholder="Contact"
                disabled={!canManageSuppliers}
                className={`${inputCls} w-40`}
              />
              <input
                type="text"
                value={newSupplier.phone}
                onChange={e => setNewSupplier(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="Téléphone"
                disabled={!canManageSuppliers}
                className={`${inputCls} w-36`}
              />
              <input
                type="text"
                value={newSupplier.country}
                onChange={e => setNewSupplier(prev => ({ ...prev, country: e.target.value }))}
                placeholder="Pays"
                disabled={!canManageSuppliers}
                className={`${inputCls} w-28`}
              />
              <button
                type="button"
                onClick={submitSupplier}
                disabled={!canManageSuppliers}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Ajouter
              </button>
            </div>

            <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden max-h-72 overflow-y-auto">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold sticky top-0">
                  <tr>
                    <th className="py-1.5 px-3">Code</th>
                    <th className="py-1.5 px-3">Fournisseur</th>
                    <th className="py-1.5 px-3">Contact</th>
                    <th className="py-1.5 px-3">Origine</th>
                    <th className="py-1.5 px-3 text-right">Articles liés</th>
                    <th className="py-1.5 px-3 text-right">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {suppliers.map(supplier => {
                    const linked = items.filter(
                      item =>
                        item.primarySupplierId === supplier.id ||
                        (item.supplierRefs || []).some(ref => ref.supplierId === supplier.id)
                    ).length;
                    return (
                      <tr key={supplier.id}>
                        <td className="py-1.5 px-3 font-mono text-slate-500">{supplier.code}</td>
                        <td className="py-1.5 px-3 text-slate-700 dark:text-slate-200 font-semibold">
                          {supplier.name}
                        </td>
                        <td className="py-1.5 px-3 text-slate-500">
                          {supplier.contactName || '—'}
                          {supplier.phone ? ` · ${supplier.phone}` : ''}
                        </td>
                        <td className="py-1.5 px-3 text-slate-500">
                          {supplier.origin === 'RECEPTIONS' ? 'Réceptions' : 'Saisie manuelle'}
                        </td>
                        <td className="py-1.5 px-3 text-right font-mono text-slate-500">{linked}</td>
                        <td className="py-1.5 px-3 text-right">
                          {canManageSuppliers ? (
                            <button
                              type="button"
                              onClick={() => {
                                try {
                                  storage.updateSupplier(supplier.id, { isActive: !supplier.isActive });
                                } catch (e) {
                                  setError(e instanceof Error ? e.message : String(e));
                                }
                              }}
                              className={`px-1.5 py-0.5 rounded border text-[10px] font-semibold cursor-pointer ${
                                supplier.isActive
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
                                  : 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                              }`}
                            >
                              {supplier.isActive ? 'Actif' : 'Inactif'}
                            </button>
                          ) : (
                            <span className="text-slate-500">{supplier.isActive ? 'Actif' : 'Inactif'}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {suppliers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-400">
                        Aucun fournisseur : ils sont créés automatiquement à la première réception ou saisis ici.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Unités */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              Unités de mesure disponibles
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5 mb-2">
              Le coefficient de conversion reste propre à chaque article : aucune conversion globale n'est
              appliquée.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(UNIT_LABELS) as Array<keyof typeof UNIT_LABELS>).map(unit => (
                <span
                  key={unit}
                  className="px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[11px] text-slate-600 dark:text-slate-300"
                >
                  {UNIT_LABELS[unit]}
                </span>
              ))}
            </div>
          </div>

          {/* Permissions */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Lock className="w-4 h-4 text-blue-600" />
              Habilitations du référentiel
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5 mb-2">
              Matrice appliquée par le système de permissions existant. Votre profil :
              <strong className="ml-1">{getRoleLabel(currentUser.role)}</strong>.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold">
                  <tr>
                    <th className="py-1.5 px-3">Profil</th>
                    {(Object.keys(ITEM_PERMISSION_LABELS) as Array<keyof typeof ITEM_PERMISSION_LABELS>).map(
                      permission => (
                        <th key={permission} className="py-1.5 px-2 text-center whitespace-nowrap">
                          {ITEM_PERMISSION_LABELS[permission]}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {(Object.keys(ITEM_ROLE_PERMISSIONS) as UserRole[]).map(role => (
                    <tr key={role} className={role === currentUser.role ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''}>
                      <td className="py-1.5 px-3 font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">
                        {getRoleLabel(role)}
                      </td>
                      {(Object.keys(ITEM_PERMISSION_LABELS) as Array<keyof typeof ITEM_PERMISSION_LABELS>).map(
                        permission => (
                          <td key={permission} className="py-1.5 px-2 text-center">
                            {ITEM_ROLE_PERMISSIONS[role].includes(permission) ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 inline" />
                            ) : (
                              <span className="text-slate-300 dark:text-slate-600">—</span>
                            )}
                          </td>
                        )
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal fiche article */}
      <ItemFormModal
        isOpen={!!formModal}
        mode={formModal?.mode || 'view'}
        item={formModal?.item || null}
        initialTab={formModal?.tab || 'GENERAL'}
        onClose={() => setFormModal(null)}
        onSaved={saved =>
          setNotice(
            formModal?.mode === 'create'
              ? `Article ${saved.code} créé et disponible dans les nomenclatures.`
              : `Article ${saved.code} mis à jour — modification historisée.`
          )
        }
      />

      {/* Modal désactivation / réactivation */}
      <Modal
        isOpen={!!statusModal}
        onClose={() => setStatusModal(null)}
        title={
          statusModal?.activate
            ? `Réactiver l'article ${statusModal?.item.code}`
            : `Désactiver l'article ${statusModal?.item.code}`
        }
        subtitle={statusModal?.item.designation}
        maxWidth="lg"
      >
        {statusModal && (
          <div className="space-y-3">
            <div
              className={`flex items-start gap-2 p-2.5 rounded-lg border text-[11px] ${
                statusModal.activate
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-200'
                  : 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-200'
              }`}
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                {statusModal.activate
                  ? 'L\'article redeviendra sélectionnable dans les nouvelles nomenclatures et opérations.'
                  : 'L\'article restera consultable et conservé dans l\'historique, les nomenclatures validées et les mouvements de stock, mais ne sera plus proposé dans les nouvelles opérations. Aucune suppression physique n\'est effectuée.'}
              </span>
            </div>

            <div className="text-[11px] text-slate-600 dark:text-slate-300 space-y-0.5">
              <p>
                Mouvements de stock : <strong>{storage.getItemUsage(statusModal.item.id).movementCount}</strong>
              </p>
              <p>
                Nomenclatures liées : <strong>{storage.getItemUsage(statusModal.item.id).recipeCount}</strong>
              </p>
              <p>
                Stock actuel :{' '}
                <strong>
                  {formatQty(storage.getItemUsage(statusModal.item.id).stockQuantity)} {statusModal.item.unit}
                </strong>
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Motif {statusModal.activate ? 'de la réactivation' : 'de la désactivation'} *
              </label>
              <textarea
                rows={3}
                value={statusReason}
                onChange={e => setStatusReason(e.target.value)}
                placeholder={
                  statusModal.activate
                    ? 'Ex. reprise de l\'approvisionnement, article de nouveau référencé…'
                    : 'Ex. article remplacé par une nouvelle référence, fin de contrat fournisseur…'
                }
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:border-blue-500 focus:outline-hidden"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setStatusModal(null)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={submitStatusChange}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg text-white cursor-pointer ${
                  statusModal.activate
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                {statusModal.activate ? 'Réactiver' : 'Désactiver'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
