/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * MAMORA GP — Fiche article (matières premières & composants)
 * Formulaire à 7 onglets : création, modification et consultation.
 * Toutes les écritures passent par le référentiel central (services/storage).
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Info,
  Layers,
  Scale,
  Warehouse as WarehouseIcon,
  ShieldCheck,
  Truck,
  History,
  ImagePlus,
  Trash2,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  X,
  Plus,
  Lock,
} from 'lucide-react';
import { Modal } from '../../common/Modal';
import { storage } from '../../../services/storage';
import {
  Item,
  ItemCategory,
  ItemCategoryGroup,
  ItemSupplierRef,
  UnitOfMeasure,
  ITEM_CATEGORY_LABELS,
  ITEM_CATEGORY_GROUP_LABELS,
  ITEM_CATEGORY_GROUPS,
  UNIT_LABELS,
  groupForCategory,
} from '../../../types';

export type ItemFormMode = 'create' | 'edit' | 'view';

export type ItemFormTab =
  | 'GENERAL'
  | 'CLASSIFICATION'
  | 'UNITS'
  | 'STORAGE'
  | 'QUALITY'
  | 'SUPPLIERS'
  | 'HISTORY';

interface ItemFormModalProps {
  isOpen: boolean;
  mode: ItemFormMode;
  item: Item | null;
  initialTab?: ItemFormTab;
  onClose: () => void;
  onSaved?: (item: Item) => void;
}

const CATEGORY_OPTIONS = Object.keys(ITEM_CATEGORY_LABELS) as ItemCategory[];
const UNIT_OPTIONS = Object.keys(UNIT_LABELS) as UnitOfMeasure[];

const TABS: Array<{ id: ItemFormTab; label: string; icon: React.ElementType }> = [
  { id: 'GENERAL', label: 'Informations générales', icon: Info },
  { id: 'CLASSIFICATION', label: 'Classification', icon: Layers },
  { id: 'UNITS', label: 'Unités & conditionnements', icon: Scale },
  { id: 'STORAGE', label: 'Stockage', icon: WarehouseIcon },
  { id: 'QUALITY', label: 'Qualité & spécifications', icon: ShieldCheck },
  { id: 'SUPPLIERS', label: 'Fournisseurs', icon: Truck },
  { id: 'HISTORY', label: 'Historique', icon: History },
];

const inputCls =
  'w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:border-blue-500 focus:outline-hidden disabled:opacity-60 disabled:cursor-not-allowed';
const labelCls = 'block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1';
const helpCls = 'mt-1 text-[10px] text-slate-500 dark:text-slate-400';

interface SupplierRowState {
  supplierId: string;
  supplierReference: string;
  leadTimeDays: string;
}

interface ItemFormState {
  code: string;
  designation: string;
  secondaryDesignation: string;
  category: ItemCategory;
  group: ItemCategoryGroup;
  subCategoryId: string;
  description: string;
  photoDataUrl: string;
  unit: UnitOfMeasure;
  secondaryUnit: string;
  conversionCoefficient: string;
  packaging: string;
  quantityPerPackaging: string;
  defaultWarehouseId: string;
  defaultLocationId: string;
  minStockLevel: string;
  maxStockLevel: string;
  storageCondition: string;
  minTemperatureC: string;
  maxTemperatureC: string;
  technicalSpecifications: string;
  allergens: string;
  receiptControlRequirements: string;
  mandatoryDocuments: string[];
  shelfLifeMonths: string;
  technicalSheetVersion: string;
  primarySupplierId: string;
  supplierRefs: SupplierRowState[];
  format: string;
  netWeightGrams: string;
  drainedWeightGrams: string;
}

const emptyForm = (): ItemFormState => ({
  code: '',
  designation: '',
  secondaryDesignation: '',
  category: 'POISSON_CONGELE',
  group: groupForCategory('POISSON_CONGELE'),
  subCategoryId: '',
  description: '',
  photoDataUrl: '',
  unit: 'KG',
  secondaryUnit: '',
  conversionCoefficient: '',
  packaging: '',
  quantityPerPackaging: '',
  defaultWarehouseId: '',
  defaultLocationId: '',
  minStockLevel: '0',
  maxStockLevel: '',
  storageCondition: '',
  minTemperatureC: '',
  maxTemperatureC: '',
  technicalSpecifications: '',
  allergens: '',
  receiptControlRequirements: '',
  mandatoryDocuments: [],
  shelfLifeMonths: '',
  technicalSheetVersion: 'FT-v1',
  primarySupplierId: '',
  supplierRefs: [],
  format: '',
  netWeightGrams: '',
  drainedWeightGrams: '',
});

const formFromItem = (item: Item): ItemFormState => ({
  code: item.code,
  designation: item.designation,
  secondaryDesignation: item.secondaryDesignation || '',
  category: item.category,
  group: item.group || groupForCategory(item.category),
  subCategoryId: item.subCategoryId || '',
  description: item.description || '',
  photoDataUrl: item.photoDataUrl || '',
  unit: item.unit,
  secondaryUnit: item.secondaryUnit || '',
  conversionCoefficient:
    item.conversionCoefficient !== undefined ? String(item.conversionCoefficient) : '',
  packaging: item.packaging || '',
  quantityPerPackaging:
    item.quantityPerPackaging !== undefined ? String(item.quantityPerPackaging) : '',
  defaultWarehouseId: item.defaultWarehouseId || '',
  defaultLocationId: item.defaultLocationId || '',
  minStockLevel: String(item.minStockLevel ?? 0),
  maxStockLevel: item.maxStockLevel !== undefined ? String(item.maxStockLevel) : '',
  storageCondition: item.storageCondition || '',
  minTemperatureC: item.minTemperatureC !== undefined ? String(item.minTemperatureC) : '',
  maxTemperatureC: item.maxTemperatureC !== undefined ? String(item.maxTemperatureC) : '',
  technicalSpecifications: item.technicalSpecifications || '',
  allergens: item.allergens || '',
  receiptControlRequirements: item.receiptControlRequirements || '',
  mandatoryDocuments: item.mandatoryDocuments || [],
  shelfLifeMonths: item.shelfLifeMonths !== undefined ? String(item.shelfLifeMonths) : '',
  technicalSheetVersion: item.technicalSheetVersion || 'FT-v1',
  primarySupplierId: item.primarySupplierId || '',
  supplierRefs: (item.supplierRefs || []).map(ref => ({
    supplierId: ref.supplierId,
    supplierReference: ref.supplierReference || '',
    leadTimeDays: ref.leadTimeDays !== undefined ? String(ref.leadTimeDays) : '',
  })),
  format: item.format || '',
  netWeightGrams: item.netWeightGrams !== undefined ? String(item.netWeightGrams) : '',
  drainedWeightGrams: item.drainedWeightGrams !== undefined ? String(item.drainedWeightGrams) : '',
});

const numberOrUndefined = (value: string): number | undefined => {
  if (value.trim() === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const formatDateTime = (value?: string): string => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('fr-FR');
};

const formatQty = (value: number): string =>
  new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 3 }).format(value);

export const ItemFormModal: React.FC<ItemFormModalProps> = ({
  isOpen,
  mode,
  item,
  initialTab = 'GENERAL',
  onClose,
  onSaved,
}) => {
  const [activeTab, setActiveTab] = useState<ItemFormTab>(initialTab);
  const [form, setForm] = useState<ItemFormState>(emptyForm());
  const [motive, setMotive] = useState('');
  const [error, setError] = useState('');
  const [documentDraft, setDocumentDraft] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isView = mode === 'view';
  const isCreate = mode === 'create';

  const canEdit = storage.canItem('ITEM_EDIT');
  const canCreate = storage.canItem('ITEM_CREATE');
  const canUnit = storage.canItem('ITEM_UNIT_MANAGE');
  const canSupplier = storage.canItem('ITEM_SUPPLIER_MANAGE');
  const canHistory = storage.canItem('ITEM_HISTORY_VIEW');

  const warehouses = useMemo(
    () => storage.getAccessibleWarehouses().filter(warehouse => warehouse.isActive),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isOpen, item?.id]
  );
  const allWarehouses = useMemo(
    () => storage.getWarehouses(false),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isOpen, item?.id]
  );
  const suppliers = useMemo(
    () => storage.getSuppliers(false),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isOpen, item?.id]
  );
  const subCategories = useMemo(
    () => storage.getItemSubCategories({ group: form.group, includeInactive: false }),
    [form.group, isOpen, item?.id]
  );

  // Réinitialisation à chaque ouverture : la fiche repart toujours de la base.
  useEffect(() => {
    if (!isOpen) return;
    setActiveTab(initialTab);
    setForm(item ? formFromItem(item) : emptyForm());
    setMotive('');
    setError('');
    setDocumentDraft('');
  }, [isOpen, item, initialTab]);

  // Création : proposition automatique d'un code libre dès l'ouverture.
  useEffect(() => {
    if (!isOpen || !isCreate) return;
    setForm(prev => (prev.code ? prev : { ...prev, code: storage.nextItemCode(prev.group) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isCreate]);

  const locations = useMemo(() => {
    if (!form.defaultWarehouseId) return [];
    return storage.getWarehouseLocations(form.defaultWarehouseId).filter(l => l.isActive);
  }, [form.defaultWarehouseId]);

  const history = useMemo(
    () => (item && canHistory ? storage.getItemChangeLogs({ itemId: item.id, limit: 200 }) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [item?.id, isOpen, activeTab, canHistory]
  );

  const stockDetail = useMemo(
    () => (item ? storage.getConsolidatedStockForItem(item.id) : undefined),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [item?.id, isOpen, activeTab]
  );

  const usage = useMemo(
    () => (item ? storage.getItemUsage(item.id) : undefined),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [item?.id, isOpen]
  );

  const update = <K extends keyof ItemFormState>(key: K, value: ItemFormState[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const handleCategoryChange = (category: ItemCategory) => {
    const nextGroup = groupForCategory(category);
    setForm(prev => ({
      ...prev,
      category,
      group: nextGroup,
      subCategoryId: nextGroup === prev.group ? prev.subCategoryId : '',
    }));
  };

  const handleGroupChange = (group: ItemCategoryGroup) => {
    setForm(prev => ({ ...prev, group, subCategoryId: '' }));
  };

  const handlePhoto = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Le fichier sélectionné n\'est pas une image.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('La photo ne doit pas dépasser 2 Mo (stockage local du poste).');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      update('photoDataUrl', String(reader.result || ''));
      setError('');
    };
    reader.onerror = () => setError('Lecture de la photo impossible.');
    reader.readAsDataURL(file);
  };

  const addDocument = () => {
    const value = documentDraft.trim();
    if (!value) return;
    if (form.mandatoryDocuments.some(doc => doc.toLowerCase() === value.toLowerCase())) {
      setDocumentDraft('');
      return;
    }
    update('mandatoryDocuments', [...form.mandatoryDocuments, value]);
    setDocumentDraft('');
  };

  const addSupplierRow = () => {
    update('supplierRefs', [
      ...form.supplierRefs,
      { supplierId: '', supplierReference: '', leadTimeDays: '' },
    ]);
  };

  const updateSupplierRow = (index: number, patch: Partial<SupplierRowState>) => {
    update(
      'supplierRefs',
      form.supplierRefs.map((row, i) => (i === index ? { ...row, ...patch } : row))
    );
  };

  const removeSupplierRow = (index: number) => {
    update(
      'supplierRefs',
      form.supplierRefs.filter((_, i) => i !== index)
    );
  };

  const buildPayload = (): Partial<Item> => {
    const supplierRefs: ItemSupplierRef[] = form.supplierRefs
      .filter(row => row.supplierId)
      .map(row => {
        const supplier = suppliers.find(s => s.id === row.supplierId);
        return {
          supplierId: row.supplierId,
          supplierName: supplier?.name || row.supplierId,
          supplierReference: row.supplierReference.trim() || undefined,
          leadTimeDays: numberOrUndefined(row.leadTimeDays),
        };
      });

    return {
      code: form.code,
      designation: form.designation,
      secondaryDesignation: form.secondaryDesignation,
      category: form.category,
      group: form.group,
      subCategoryId: form.subCategoryId || undefined,
      description: form.description,
      photoDataUrl: form.photoDataUrl,
      unit: form.unit,
      secondaryUnit: form.secondaryUnit ? (form.secondaryUnit as UnitOfMeasure) : undefined,
      conversionCoefficient: form.secondaryUnit
        ? numberOrUndefined(form.conversionCoefficient)
        : undefined,
      packaging: form.packaging,
      quantityPerPackaging: numberOrUndefined(form.quantityPerPackaging),
      defaultWarehouseId: form.defaultWarehouseId || undefined,
      defaultLocationId: form.defaultLocationId || undefined,
      minStockLevel: numberOrUndefined(form.minStockLevel) ?? 0,
      maxStockLevel: numberOrUndefined(form.maxStockLevel),
      storageCondition: form.storageCondition,
      minTemperatureC: numberOrUndefined(form.minTemperatureC),
      maxTemperatureC: numberOrUndefined(form.maxTemperatureC),
      technicalSpecifications: form.technicalSpecifications,
      allergens: form.allergens,
      receiptControlRequirements: form.receiptControlRequirements,
      mandatoryDocuments: form.mandatoryDocuments,
      shelfLifeMonths: numberOrUndefined(form.shelfLifeMonths),
      technicalSheetVersion: form.technicalSheetVersion,
      primarySupplierId: form.primarySupplierId || undefined,
      supplierRefs,
      format: form.format,
      netWeightGrams: numberOrUndefined(form.netWeightGrams),
      drainedWeightGrams: numberOrUndefined(form.drainedWeightGrams),
    };
  };

  const handleSubmit = () => {
    setError('');
    try {
      if (isCreate && !canCreate) {
        throw new Error('Votre profil n\'est pas habilité à créer un article.');
      }
      if (!isCreate && !canEdit) {
        throw new Error('Votre profil n\'est pas habilité à modifier un article.');
      }
      const payload = buildPayload();
      const saved = isCreate
        ? storage.createItemProfile(payload, { motive })
        : storage.updateItemProfile(item!.id, payload, { motive });
      onSaved?.(saved);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const codeConflict = useMemo(() => {
    const code = form.code.trim().toUpperCase();
    if (!code) return '';
    const existing = storage.getItems().find(i => i.code.toUpperCase() === code);
    if (existing && existing.id !== item?.id) return `Code déjà utilisé par ${existing.designation}.`;
    return '';
  }, [form.code, item?.id]);

  const equivalence = useMemo(() => {
    if (!form.secondaryUnit) return '';
    const coefficient = Number(form.conversionCoefficient);
    if (!Number.isFinite(coefficient) || coefficient <= 0) return '';
    const label = form.packaging.trim() || `1 ${form.secondaryUnit}`;
    return `${label} = ${formatQty(coefficient)} ${form.unit}`;
  }, [form.secondaryUnit, form.conversionCoefficient, form.packaging, form.unit]);

  const editableGeneral = !isView && (isCreate ? canCreate : canEdit);
  const editableUnits = editableGeneral && canUnit;
  const editableSuppliers = editableGeneral && canSupplier;

  const title = isCreate
    ? 'Nouvel article — matière première ou composant'
    : isView
      ? `Fiche article ${item?.code || ''}`
      : `Modifier l'article ${item?.code || ''}`;

  const subtitle = isCreate
    ? 'La fiche est enregistrée dans le référentiel central et disponible immédiatement dans les nomenclatures.'
    : item
      ? `${item.designation} · Dernière modification : ${formatDateTime(item.updatedAt)}${item.updatedBy ? ` par ${item.updatedBy}` : ''}`
      : undefined;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} subtitle={subtitle} maxWidth="4xl">
      <div className="space-y-4">
        {/* Bandeau statut / verrous */}
        {item && (
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border font-semibold ${
                item.isActive === false
                  ? 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
              }`}
            >
              {item.isActive === false ? 'Inactif' : 'Actif'}
            </span>
            {item.createdAt && (
              <span className="text-slate-500">Créé le {formatDateTime(item.createdAt)}</span>
            )}
            {usage?.isUsed && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-amber-200 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
                <Lock className="w-3 h-3" />
                Code verrouillé (article utilisé)
              </span>
            )}
          </div>
        )}

        {/* Onglets */}
        <div className="flex flex-wrap gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-[11px]">
          {TABS.filter(tab => tab.id !== 'HISTORY' || !isCreate).map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 font-semibold rounded-md transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ================= 1. INFORMATIONS GÉNÉRALES ================= */}
        {activeTab === 'GENERAL' && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className={labelCls} htmlFor="item-code">
                  Code article *
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    id="item-code"
                    type="text"
                    value={form.code}
                    disabled={!editableGeneral || (!!item && !!usage?.isUsed)}
                    onChange={e => update('code', e.target.value.toUpperCase())}
                    placeholder="MP-0001"
                    className={`${inputCls} font-mono uppercase`}
                  />
                  {isCreate && (
                    <button
                      type="button"
                      onClick={() => update('code', storage.nextItemCode(form.group))}
                      title="Générer automatiquement un code libre"
                      className="shrink-0 p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                {codeConflict ? (
                  <p className="mt-1 text-[10px] text-red-600 dark:text-red-400">{codeConflict}</p>
                ) : (
                  <p className={helpCls}>Unique, 2 à 30 caractères (A-Z, 0-9, -, ., _).</p>
                )}
              </div>
              <div className="md:col-span-2">
                <label className={labelCls} htmlFor="item-designation">
                  Désignation *
                </label>
                <input
                  id="item-designation"
                  type="text"
                  value={form.designation}
                  disabled={!editableGeneral}
                  onChange={e => update('designation', e.target.value)}
                  placeholder="Ex. Thon albacore congelé entier (Thunnus albacares)"
                  className={inputCls}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className={labelCls} htmlFor="item-secondary-designation">
                  Désignation secondaire (facultative)
                </label>
                <input
                  id="item-secondary-designation"
                  type="text"
                  value={form.secondaryDesignation}
                  disabled={!editableGeneral}
                  onChange={e => update('secondaryDesignation', e.target.value)}
                  placeholder="Appellation commerciale, nom fournisseur…"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls} htmlFor="item-format">
                  Format / gabarit (facultatif)
                </label>
                <input
                  id="item-format"
                  type="text"
                  value={form.format}
                  disabled={!editableGeneral}
                  onChange={e => update('format', e.target.value)}
                  placeholder="1/4 club, 4/4…"
                  className={inputCls}
                />
              </div>
            </div>

            <div>
              <label className={labelCls} htmlFor="item-description">
                Description
              </label>
              <textarea
                id="item-description"
                rows={3}
                value={form.description}
                disabled={!editableGeneral}
                onChange={e => update('description', e.target.value)}
                placeholder="Description technique, usage en fabrication, précautions particulières…"
                className={inputCls}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <label className={labelCls}>Photo de l'article (facultative)</label>
                <div className="flex items-start gap-3">
                  <div className="w-20 h-20 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 flex items-center justify-center overflow-hidden shrink-0">
                    {form.photoDataUrl ? (
                      <img
                        src={form.photoDataUrl}
                        alt="Aperçu de l'article"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ImagePlus className="w-6 h-6 text-slate-400" />
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => handlePhoto(e.target.files?.[0])}
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={!editableGeneral}
                        onClick={() => fileInputRef.current?.click()}
                        className="px-2.5 py-1.5 text-[11px] font-semibold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
                      >
                        Choisir une image
                      </button>
                      {form.photoDataUrl && (
                        <button
                          type="button"
                          disabled={!editableGeneral}
                          onClick={() => update('photoDataUrl', '')}
                          className="inline-flex items-center gap-1 px-2 py-1.5 text-[11px] font-semibold rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          Retirer
                        </button>
                      )}
                    </div>
                    <p className={helpCls}>JPG ou PNG, 2 Mo maximum, stockée avec la fiche.</p>
                  </div>
                </div>
              </div>
              <div>
                <label className={labelCls}>Statut</label>
                <div className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs">
                  {item?.isActive === false ? 'Inactif' : 'Actif'}
                </div>
                <p className={helpCls}>
                  {item?.isActive === false
                    ? 'Article désactivé : non sélectionnable dans les nouvelles opérations.'
                    : 'Le statut se change via l\'action « Désactiver » de la liste.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ================= 2. CLASSIFICATION ================= */}
        {activeTab === 'CLASSIFICATION' && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className={labelCls} htmlFor="item-group">
                  Groupe fonctionnel *
                </label>
                <select
                  id="item-group"
                  value={form.group}
                  disabled={!editableGeneral}
                  onChange={e => handleGroupChange(e.target.value as ItemCategoryGroup)}
                  className={`${inputCls} cursor-pointer`}
                >
                  {ITEM_CATEGORY_GROUPS.map(group => (
                    <option key={group} value={group}>
                      {ITEM_CATEGORY_GROUP_LABELS[group]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls} htmlFor="item-category">
                  Catégorie technique *
                </label>
                <select
                  id="item-category"
                  value={form.category}
                  disabled={!editableGeneral}
                  onChange={e => handleCategoryChange(e.target.value as ItemCategory)}
                  className={`${inputCls} cursor-pointer`}
                >
                  {CATEGORY_OPTIONS.map(category => (
                    <option key={category} value={category}>
                      {ITEM_CATEGORY_LABELS[category]}
                    </option>
                  ))}
                </select>
                <p className={helpCls}>
                  Pilote le magasin par défaut et les règles de stock de l'article.
                </p>
              </div>
              <div>
                <label className={labelCls} htmlFor="item-subcategory">
                  Sous-catégorie
                </label>
                <select
                  id="item-subcategory"
                  value={form.subCategoryId}
                  disabled={!editableGeneral}
                  onChange={e => update('subCategoryId', e.target.value)}
                  className={`${inputCls} cursor-pointer`}
                >
                  <option value="">— Aucune —</option>
                  {subCategories.map(sub => (
                    <option key={sub.id} value={sub.id}>
                      {sub.code} — {sub.designation}
                    </option>
                  ))}
                </select>
                <p className={helpCls}>
                  Sous-catégories configurables dans l'onglet « Paramétrage » du module.
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-3 text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
              <p className="font-semibold text-slate-700 dark:text-slate-200">Effets de la classification</p>
              <p>· Le groupe fonctionnel organise la liste et les filtres du module.</p>
              <p>· La catégorie technique détermine le magasin proposé par défaut et les contrôles de stock.</p>
              <p>
                · Un article actif est immédiatement sélectionnable dans les nomenclatures de produits finis ;
                un article inactif n'y est plus proposé.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className={labelCls} htmlFor="item-net-weight">
                  Poids net (g) — emballages &amp; produits
                </label>
                <input
                  id="item-net-weight"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.netWeightGrams}
                  disabled={!editableGeneral}
                  onChange={e => update('netWeightGrams', e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls} htmlFor="item-drained-weight">
                  Poids égoutté (g)
                </label>
                <input
                  id="item-drained-weight"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.drainedWeightGrams}
                  disabled={!editableGeneral}
                  onChange={e => update('drainedWeightGrams', e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>
          </div>
        )}

        {/* ================= 3. UNITÉS & CONDITIONNEMENTS ================= */}
        {activeTab === 'UNITS' && (
          <div className="space-y-3">
            {!canUnit && (
              <div className="flex items-start gap-2 p-2.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-200 text-[11px]">
                <Lock className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Votre profil peut modifier la fiche mais pas les unités ni les conversions : ces champs sont
                  en lecture seule.
                </span>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className={labelCls} htmlFor="item-unit">
                  Unité principale *
                </label>
                <select
                  id="item-unit"
                  value={form.unit}
                  disabled={!editableUnits}
                  onChange={e => update('unit', e.target.value as UnitOfMeasure)}
                  className={`${inputCls} cursor-pointer`}
                >
                  {UNIT_OPTIONS.map(unit => (
                    <option key={unit} value={unit}>
                      {UNIT_LABELS[unit]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls} htmlFor="item-secondary-unit">
                  Unité secondaire (facultative)
                </label>
                <select
                  id="item-secondary-unit"
                  value={form.secondaryUnit}
                  disabled={!editableUnits}
                  onChange={e => {
                    const value = e.target.value;
                    setForm(prev => ({
                      ...prev,
                      secondaryUnit: value,
                      conversionCoefficient: value ? prev.conversionCoefficient : '',
                    }));
                  }}
                  className={`${inputCls} cursor-pointer`}
                >
                  <option value="">— Aucune —</option>
                  {UNIT_OPTIONS.filter(unit => unit !== form.unit).map(unit => (
                    <option key={unit} value={unit}>
                      {UNIT_LABELS[unit]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls} htmlFor="item-coefficient">
                  Coefficient de conversion *
                </label>
                <input
                  id="item-coefficient"
                  type="number"
                  min="0.0001"
                  step="0.0001"
                  value={form.conversionCoefficient}
                  disabled={!editableUnits || !form.secondaryUnit}
                  onChange={e => update('conversionCoefficient', e.target.value)}
                  placeholder="Ex. 240"
                  className={inputCls}
                />
                <p className={helpCls}>Nombre d'unités principales par unité secondaire.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className={labelCls} htmlFor="item-packaging">
                  Conditionnement
                </label>
                <input
                  id="item-packaging"
                  type="text"
                  value={form.packaging}
                  disabled={!editableUnits}
                  onChange={e => update('packaging', e.target.value)}
                  placeholder="Fût aseptique 240 kg, carton de 50 boîtes…"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls} htmlFor="item-qty-packaging">
                  Quantité par conditionnement (unité principale)
                </label>
                <input
                  id="item-qty-packaging"
                  type="number"
                  min="0.0001"
                  step="0.0001"
                  value={form.quantityPerPackaging}
                  disabled={!editableUnits}
                  onChange={e => update('quantityPerPackaging', e.target.value)}
                  placeholder="Ex. 240"
                  className={inputCls}
                />
              </div>
            </div>

            <div className="rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/40 p-3 text-[11px] text-blue-800 dark:text-blue-200">
              <p className="font-semibold mb-0.5">Conversion appliquée à cet article uniquement</p>
              <p>
                {equivalence ||
                  'Renseignez une unité secondaire et son coefficient pour afficher l\'équivalence (ex. 1 fût = 240 kg).'}
              </p>
              <p className="mt-1 text-blue-700/80 dark:text-blue-300/80">
                Les quantités de stock restent exprimées dans l'unité principale de l'article.
              </p>
            </div>
          </div>
        )}

        {/* ================= 4. STOCKAGE ================= */}
        {activeTab === 'STORAGE' && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className={labelCls} htmlFor="item-default-warehouse">
                  Magasin par défaut
                </label>
                <select
                  id="item-default-warehouse"
                  value={form.defaultWarehouseId}
                  disabled={!editableGeneral}
                  onChange={e =>
                    setForm(prev => ({
                      ...prev,
                      defaultWarehouseId: e.target.value,
                      defaultLocationId: '',
                    }))
                  }
                  className={`${inputCls} cursor-pointer`}
                >
                  <option value="">— Déduit de la catégorie —</option>
                  {warehouses.map(warehouse => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.code} — {warehouse.designation}
                    </option>
                  ))}
                </select>
                <p className={helpCls}>Indicatif : n'empêche aucun transfert vers un autre magasin autorisé.</p>
              </div>
              <div>
                <label className={labelCls} htmlFor="item-default-location">
                  Emplacement
                </label>
                <select
                  id="item-default-location"
                  value={form.defaultLocationId}
                  disabled={!editableGeneral || !form.defaultWarehouseId}
                  onChange={e => update('defaultLocationId', e.target.value)}
                  className={`${inputCls} cursor-pointer`}
                >
                  <option value="">— Non précisé —</option>
                  {locations.map(location => (
                    <option key={location.id} value={location.id}>
                      {location.code} — {location.designation}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className={labelCls} htmlFor="item-min-stock">
                  Stock minimum ({form.unit})
                </label>
                <input
                  id="item-min-stock"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.minStockLevel}
                  disabled={!editableGeneral}
                  onChange={e => update('minStockLevel', e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls} htmlFor="item-max-stock">
                  Stock maximum ({form.unit}, facultatif)
                </label>
                <input
                  id="item-max-stock"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.maxStockLevel}
                  disabled={!editableGeneral}
                  onChange={e => update('maxStockLevel', e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>

            <div>
              <label className={labelCls} htmlFor="item-storage-condition">
                Conditions de conservation
              </label>
              <input
                id="item-storage-condition"
                type="text"
                value={form.storageCondition}
                disabled={!editableGeneral}
                onChange={e => update('storageCondition', e.target.value)}
                placeholder="Chambre froide négative ≤ -18°C, magasin sec ventilé…"
                className={inputCls}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className={labelCls} htmlFor="item-min-temp">
                  Température minimale (°C)
                </label>
                <input
                  id="item-min-temp"
                  type="number"
                  step="0.1"
                  value={form.minTemperatureC}
                  disabled={!editableGeneral}
                  onChange={e => update('minTemperatureC', e.target.value)}
                  placeholder="Ex. -20"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls} htmlFor="item-max-temp">
                  Température maximale (°C)
                </label>
                <input
                  id="item-max-temp"
                  type="number"
                  step="0.1"
                  value={form.maxTemperatureC}
                  disabled={!editableGeneral}
                  onChange={e => update('maxTemperatureC', e.target.value)}
                  placeholder="Ex. -18"
                  className={inputCls}
                />
              </div>
            </div>

            {/* Stocks par magasin — lecture seule */}
            {item ? (
              <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                    Stocks par magasin et emplacement
                  </span>
                  <span className="text-[10px] text-slate-500">Lecture seule — gérés par les modules de stock</span>
                </div>
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-50/60 dark:bg-slate-800/40 text-slate-500 font-semibold">
                    <tr>
                      <th className="py-1.5 px-3">Magasin</th>
                      <th className="py-1.5 px-3 text-right">Physique</th>
                      <th className="py-1.5 px-3 text-right">Disponible</th>
                      <th className="py-1.5 px-3 text-right">Réservé</th>
                      <th className="py-1.5 px-3 text-right">Quarantaine</th>
                      <th className="py-1.5 px-3 text-right">Bloqué</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {(stockDetail?.byWarehouse || [])
                      .filter(row => row.physical > 0 || row.reserved > 0 || row.quarantine > 0 || row.blocked > 0)
                      .map(row => {
                        const warehouse = allWarehouses.find(w => w.id === row.warehouseId);
                        return (
                          <tr key={row.warehouseId}>
                            <td className="py-1.5 px-3 text-slate-700 dark:text-slate-300">
                              {warehouse ? `${warehouse.code} — ${warehouse.designation}` : row.warehouseId}
                            </td>
                            <td className="py-1.5 px-3 text-right font-mono">{formatQty(row.physical)}</td>
                            <td className="py-1.5 px-3 text-right font-mono font-semibold text-emerald-700 dark:text-emerald-400">
                              {formatQty(row.available)}
                            </td>
                            <td className="py-1.5 px-3 text-right font-mono text-slate-500">{formatQty(row.reserved)}</td>
                            <td className="py-1.5 px-3 text-right font-mono text-amber-700 dark:text-amber-400">
                              {formatQty(row.quarantine)}
                            </td>
                            <td className="py-1.5 px-3 text-right font-mono text-red-600 dark:text-red-400">
                              {formatQty(row.blocked)}
                            </td>
                          </tr>
                        );
                      })}
                    {(!stockDetail?.byWarehouse ||
                      stockDetail.byWarehouse.every(
                        row => row.physical === 0 && row.reserved === 0 && row.quarantine === 0 && row.blocked === 0
                      )) && (
                      <tr>
                        <td colSpan={6} className="py-4 text-center text-slate-400">
                          Aucun stock enregistré pour cet article.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-[11px] text-slate-500">
                Les stocks par magasin seront visibles dès l'enregistrement de la fiche.
              </p>
            )}

            <p className="text-[10px] text-slate-500">
              La fiche article ne modifie jamais les quantités de stock : les entrées, sorties et transferts
              restent gérés par les modules Réceptions, Stocks et Transferts.
            </p>
          </div>
        )}

        {/* ================= 5. QUALITÉ & SPÉCIFICATIONS ================= */}
        {activeTab === 'QUALITY' && (
          <div className="space-y-3">
            <div>
              <label className={labelCls} htmlFor="item-specs">
                Spécifications techniques
              </label>
              <textarea
                id="item-specs"
                rows={3}
                value={form.technicalSpecifications}
                disabled={!editableGeneral}
                onChange={e => update('technicalSpecifications', e.target.value)}
                placeholder="Température, calibre, histamine, Brix, grammage, revêtement intérieur…"
                className={inputCls}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className={labelCls} htmlFor="item-allergens">
                  Allergènes éventuels
                </label>
                <input
                  id="item-allergens"
                  type="text"
                  value={form.allergens}
                  disabled={!editableGeneral}
                  onChange={e => update('allergens', e.target.value)}
                  placeholder="Poisson, crustacés, soja, sulfites…"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls} htmlFor="item-shelf-life">
                  Durée de conservation (mois)
                </label>
                <input
                  id="item-shelf-life"
                  type="number"
                  min="0"
                  step="1"
                  value={form.shelfLifeMonths}
                  disabled={!editableGeneral}
                  onChange={e => update('shelfLifeMonths', e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>

            <div>
              <label className={labelCls} htmlFor="item-control">
                Exigences de contrôle à la réception
              </label>
              <textarea
                id="item-control"
                rows={3}
                value={form.receiptControlRequirements}
                disabled={!editableGeneral}
                onChange={e => update('receiptControlRequirements', e.target.value)}
                placeholder="Contrôle température, histamine < 50 ppm, étanchéité, certificat sanitaire…"
                className={inputCls}
              />
            </div>

            <div>
              <label className={labelCls}>Documents obligatoires</label>
              <div className="flex flex-wrap gap-1.5 mb-1.5">
                {form.mandatoryDocuments.map(doc => (
                  <span
                    key={doc}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[11px] text-slate-700 dark:text-slate-200"
                  >
                    {doc}
                    {editableGeneral && (
                      <button
                        type="button"
                        onClick={() =>
                          update(
                            'mandatoryDocuments',
                            form.mandatoryDocuments.filter(d => d !== doc)
                          )
                        }
                        aria-label={`Retirer ${doc}`}
                        className="text-slate-400 hover:text-red-600 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </span>
                ))}
                {form.mandatoryDocuments.length === 0 && (
                  <span className="text-[11px] text-slate-400">Aucun document exigé.</span>
                )}
              </div>
              {editableGeneral && (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={documentDraft}
                    onChange={e => setDocumentDraft(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addDocument();
                      }
                    }}
                    placeholder="Certificat sanitaire, fiche technique fournisseur…"
                    className={inputCls}
                  />
                  <button
                    type="button"
                    onClick={addDocument}
                    className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    Ajouter
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className={labelCls} htmlFor="item-sheet-version">
                Version de la fiche technique
              </label>
              <input
                id="item-sheet-version"
                type="text"
                value={form.technicalSheetVersion}
                disabled={!editableGeneral}
                onChange={e => update('technicalSheetVersion', e.target.value)}
                placeholder="FT-MP-01-v3"
                className={`${inputCls} font-mono`}
              />
            </div>
          </div>
        )}

        {/* ================= 6. FOURNISSEURS ================= */}
        {activeTab === 'SUPPLIERS' && (
          <div className="space-y-3">
            {!canSupplier && (
              <div className="flex items-start gap-2 p-2.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-200 text-[11px]">
                <Lock className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Habilitation « Gérer les fournisseurs associés » requise pour modifier ces informations.
                </span>
              </div>
            )}
            <div>
              <label className={labelCls} htmlFor="item-primary-supplier">
                Fournisseur principal
              </label>
              <select
                id="item-primary-supplier"
                value={form.primarySupplierId}
                disabled={!editableSuppliers}
                onChange={e => update('primarySupplierId', e.target.value)}
                className={`${inputCls} cursor-pointer`}
              >
                <option value="">— Aucun —</option>
                {suppliers.map(supplier => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.code} — {supplier.name}
                  </option>
                ))}
              </select>
              <p className={helpCls}>
                Référentiel fournisseurs commun, alimenté par les réceptions et le paramétrage du module.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className={`${labelCls} mb-0`}>Autres fournisseurs associés</label>
                {editableSuppliers && (
                  <button
                    type="button"
                    onClick={addSupplierRow}
                    className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    Ajouter
                  </button>
                )}
              </div>
              <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold">
                    <tr>
                      <th className="py-1.5 px-2">Fournisseur</th>
                      <th className="py-1.5 px-2">Référence fournisseur</th>
                      <th className="py-1.5 px-2 w-28">Délai (jours)</th>
                      <th className="py-1.5 px-2 w-10" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {form.supplierRefs.map((row, index) => (
                      <tr key={`supplier-row-${index}`}>
                        <td className="py-1.5 px-2">
                          <select
                            value={row.supplierId}
                            disabled={!editableSuppliers}
                            onChange={e => updateSupplierRow(index, { supplierId: e.target.value })}
                            className={`${inputCls} cursor-pointer`}
                          >
                            <option value="">— Sélectionner —</option>
                            {suppliers.map(supplier => (
                              <option key={supplier.id} value={supplier.id}>
                                {supplier.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-1.5 px-2">
                          <input
                            type="text"
                            value={row.supplierReference}
                            disabled={!editableSuppliers}
                            onChange={e =>
                              updateSupplierRow(index, { supplierReference: e.target.value })
                            }
                            placeholder="Réf. article chez le fournisseur"
                            className={inputCls}
                          />
                        </td>
                        <td className="py-1.5 px-2">
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={row.leadTimeDays}
                            disabled={!editableSuppliers}
                            onChange={e => updateSupplierRow(index, { leadTimeDays: e.target.value })}
                            className={inputCls}
                          />
                        </td>
                        <td className="py-1.5 px-2 text-right">
                          {editableSuppliers && (
                            <button
                              type="button"
                              onClick={() => removeSupplierRow(index)}
                              aria-label="Retirer ce fournisseur"
                              className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-800 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {form.supplierRefs.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-4 text-center text-slate-400">
                          Aucun fournisseur secondaire associé.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-start gap-2 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-[11px] text-slate-600 dark:text-slate-300">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
              <span>
                Le fournisseur principal est une information de référence : les réceptions restent saisies
                librement dans le module Réceptions &amp; Agréage.
              </span>
            </div>
          </div>
        )}

        {/* ================= 7. HISTORIQUE ================= */}
        {activeTab === 'HISTORY' && (
          <div className="space-y-3">
            {!canHistory ? (
              <div className="flex items-start gap-2 p-2.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-200 text-[11px]">
                <Lock className="w-4 h-4 shrink-0 mt-0.5" />
                <span>Votre profil n'est pas habilité à consulter l'historique des modifications.</span>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-slate-500">
                    Journal appendice : aucune écriture antérieure n'est modifiée rétroactivement.
                  </p>
                  <span className="text-[11px] text-slate-500">{history.length} ligne(s)</span>
                </div>
                <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden max-h-96 overflow-y-auto">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold sticky top-0">
                      <tr>
                        <th className="py-1.5 px-2">Date</th>
                        <th className="py-1.5 px-2">Champ</th>
                        <th className="py-1.5 px-2">Ancienne valeur</th>
                        <th className="py-1.5 px-2">Nouvelle valeur</th>
                        <th className="py-1.5 px-2">Utilisateur</th>
                        <th className="py-1.5 px-2">Motif</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {history.map(log => (
                        <tr key={log.id} className="align-top">
                          <td className="py-1.5 px-2 text-slate-500 whitespace-nowrap">
                            {formatDateTime(log.timestamp)}
                          </td>
                          <td className="py-1.5 px-2 font-semibold text-slate-700 dark:text-slate-200">
                            {log.fieldLabel}
                          </td>
                          <td className="py-1.5 px-2 text-slate-500 max-w-40 break-words">{log.oldValue}</td>
                          <td className="py-1.5 px-2 text-slate-800 dark:text-slate-100 max-w-40 break-words">
                            {log.newValue}
                          </td>
                          <td className="py-1.5 px-2 text-slate-600 dark:text-slate-300">{log.userName}</td>
                          <td className="py-1.5 px-2 text-slate-500 max-w-40 break-words">{log.motive || '—'}</td>
                        </tr>
                      ))}
                      {history.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-6 text-center text-slate-400">
                            Aucune modification enregistrée pour cet article.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {/* Erreur */}
        {error && (
          <div className="flex items-start gap-2 p-2.5 bg-red-50 dark:bg-red-950/40 rounded-lg border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Pied de fiche */}
        <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex flex-col md:flex-row md:items-end justify-between gap-3">
          {!isView && !isCreate ? (
            <div className="flex-1">
              <label className={labelCls} htmlFor="item-motive">
                Motif de la modification (facultatif)
              </label>
              <input
                id="item-motive"
                type="text"
                value={motive}
                onChange={e => setMotive(e.target.value)}
                placeholder="Ex. révision de la spécification fournisseur, changement de conditionnement…"
                className={inputCls}
              />
            </div>
          ) : (
            <div className="text-[10px] text-slate-500 max-w-md">
              {isCreate
                ? 'Le code et la désignation sont obligatoires. Le code doit être unique dans le référentiel.'
                : 'Consultation seule : les champs sont en lecture seule.'}
            </div>
          )}

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
            >
              {isView ? 'Fermer' : 'Annuler'}
            </button>
            {!isView && (
              <button
                type="button"
                onClick={handleSubmit}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {isCreate ? 'Créer l\'article' : 'Enregistrer'}
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
