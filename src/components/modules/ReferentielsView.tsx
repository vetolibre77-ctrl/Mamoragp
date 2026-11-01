/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * MAMORA GP — Référentiels Articles, Emballages & Recettes Versionnées
 * Conforme ISO 22000 & Spécifications Techniques d'Usine
 */

import React, { useState } from 'react';
import {
  Item,
  Recipe,
  RecipeIngredient,
  ItemCategory,
  UnitOfMeasure,
  isManufacturedCategory,
} from '../../types';
import { storage } from '../../services/storage';
import { StatusBadge } from '../common/StatusBadge';
import {
  Layers,
  Plus,
  Search,
  Filter,
  ShieldCheck,
  ScrollText,
  Pencil,
  ChevronDown,
  ChevronRight,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { Modal } from '../common/Modal';

/** Nomenclature en cours de saisie, pas encore rattachée à un produit fini enregistré. */
type RecipeDraft = Omit<Recipe, 'id' | 'finishedItemId'>;

/** Champs communs à une nomenclature enregistrée et à une nomenclature en cours de saisie. */
type NomenclatureCard = Pick<
  Recipe,
  | 'code'
  | 'name'
  | 'version'
  | 'status'
  | 'ingredients'
  | 'referenceProductionQty'
  | 'referenceUnit'
  | 'comments'
  | 'approvedBy'
  | 'approvedAt'
>;

interface DraftIngredientRow {
  key: string;
  itemId: string;
  quantity: string;
  unit: UnitOfMeasure;
  lossPercent: string;
  tolerancePercent: string;
}

const PENDING_RECIPE_VALUE = '__PENDING__';

const UNIT_OPTIONS: UnitOfMeasure[] = ['KG', 'G', 'LITRE', 'BOITE', 'CARTON', 'PALETTE'];

const emptyRow = (): DraftIngredientRow => ({
  key: `ROW-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
  itemId: '',
  quantity: '',
  unit: 'KG',
  lossPercent: '0',
  tolerancePercent: '2',
});

/** Version suivante au format du référentiel existant : REV-<année>-<lettre>. */
const nextVersionLabel = (existingVersions: string[]): string => {
  const year = new Date().getFullYear();
  const used = existingVersions
    .map(v => /^REV-\d{4}-([A-Z])$/.exec(v)?.[1])
    .filter((letter): letter is string => Boolean(letter));
  const next = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    .split('')
    .find(letter => !used.includes(letter));
  return `REV-${year}-${next || 'A'}`;
};

/** Tableau de composition réutilisé pour la consultation d'une nomenclature. */
const NomenclatureComposition: React.FC<{ nomenclature: NomenclatureCard }> = ({ nomenclature }) => {
  const refQty = nomenclature.referenceProductionQty ?? 1000;
  const refUnit = nomenclature.referenceUnit ?? 'BOITE';

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
      <table className="w-full text-left text-[11px]">
        <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-slate-500 font-semibold">
          <tr>
            <th className="py-1.5 px-2">Code</th>
            <th className="py-1.5 px-2">Composant</th>
            <th className="py-1.5 px-2 text-right">Qté théorique</th>
            <th className="py-1.5 px-2 text-right">Perte théo.</th>
            <th className="py-1.5 px-2 text-right">Tolérance</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {nomenclature.ingredients.map((ing, idx) => (
            <tr key={`${ing.itemId}-${idx}`}>
              <td className="py-1.5 px-2 font-mono text-blue-600 dark:text-blue-400">{ing.itemCode}</td>
              <td className="py-1.5 px-2 text-slate-700 dark:text-slate-300">{ing.designation}</td>
              <td className="py-1.5 px-2 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                {ing.theoreticalQuantityPer1000Cans} {ing.unit}
              </td>
              <td className="py-1.5 px-2 text-right font-mono text-slate-500">
                {ing.theoreticalLossPercent ? `${ing.theoreticalLossPercent} %` : '—'}
              </td>
              <td className="py-1.5 px-2 text-right font-mono text-slate-500">
                ± {ing.tolerancePercent} %
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="px-2 py-1 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-700 text-[10px] text-slate-500">
        Quantités théoriques rapportées à {refQty.toLocaleString()} {refUnit}.
      </div>
    </div>
  );
};

interface ReferentielsViewProps {
  items: Item[];
  recipes: Recipe[];
}

export const ReferentielsView: React.FC<ReferentielsViewProps> = ({ items, recipes }) => {
  const [activeTab, setActiveTab] = useState<'ITEMS' | 'RECIPES'>('ITEMS');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Modal article (création et modification)
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [newItemCode, setNewItemCode] = useState('');
  const [newItemDesignation, setNewItemDesignation] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<ItemCategory>('PRODUIT_FINI_THON');
  const [newItemUnit, setNewItemUnit] = useState<UnitOfMeasure>('BOITE');
  const [newItemFormat, setNewItemFormat] = useState('1/4 club');
  const [newItemMinStock, setNewItemMinStock] = useState('5000');
  const [newItemNetWeight, setNewItemNetWeight] = useState('125');
  const [newItemDrainedWeight, setNewItemDrainedWeight] = useState('85');
  const [newItemStorage, setNewItemStorage] = useState('Tempéré ambiant 10-25°C');
  const [selectedRecipeId, setSelectedRecipeId] = useState('');
  const [pendingRecipe, setPendingRecipe] = useState<RecipeDraft | null>(null);
  const [expandedNomenclature, setExpandedNomenclature] = useState<string | null>(null);
  const [itemFormError, setItemFormError] = useState('');

  // Modal nomenclature
  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false);
  const [recipeCode, setRecipeCode] = useState('');
  const [recipeName, setRecipeName] = useState('');
  const [recipeVersion, setRecipeVersion] = useState('');
  const [recipeRefQty, setRecipeRefQty] = useState('1000');
  const [recipeRefUnit, setRecipeRefUnit] = useState<UnitOfMeasure>('BOITE');
  const [recipeComments, setRecipeComments] = useState('');
  const [recipeRows, setRecipeRows] = useState<DraftIngredientRow[]>([]);
  const [recipeScheduleRef, setRecipeScheduleRef] = useState('');
  const [recipeTempC, setRecipeTempC] = useState('');
  const [recipeHoldMin, setRecipeHoldMin] = useState('');
  const [recipeF0, setRecipeF0] = useState('');
  const [recipePressure, setRecipePressure] = useState('');
  const [recipeSeamingRef, setRecipeSeamingRef] = useState('');
  const [recipeFormError, setRecipeFormError] = useState('');

  // Onglet Recettes & Barèmes
  const [expandedRecipeCard, setExpandedRecipeCard] = useState<string | null>(null);
  const [recipesTabError, setRecipesTabError] = useState('');

  const canManageNomenclature = storage.canManageNomenclature();
  const currentUserName = storage.getCurrentUser().name;

  // Filtrage articles
  const filteredItems = items.filter(item => {
    const matchesSearch =
      item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.designation.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = selectedCategory === 'ALL' || item.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  // --- Nomenclature de fabrication (produits finis uniquement) ---
  const isFinishedProduct = isManufacturedCategory(newItemCategory);

  /** Nomenclatures existantes non rattachées à un produit fini : seules associables depuis ce formulaire. */
  const unlinkedRecipes = recipes.filter(recipe => !recipe.finishedItemId);

  /** Versions successives de nomenclature du produit fini en cours de modification. */
  const itemRecipes = editingItem ? recipes.filter(r => r.finishedItemId === editingItem.id) : [];

  const selectedNomenclature: NomenclatureCard | null =
    selectedRecipeId === PENDING_RECIPE_VALUE
      ? pendingRecipe
      : selectedRecipeId
        ? recipes.find(r => r.id === selectedRecipeId) || null
        : null;

  const applicableRecipe = editingItem ? storage.getApplicableRecipe(editingItem.id) : undefined;

  const openCreateItemModal = () => {
    setEditingItem(null);
    setNewItemCode('');
    setNewItemDesignation('');
    setNewItemCategory('PRODUIT_FINI_THON');
    setNewItemUnit('BOITE');
    setNewItemFormat('1/4 club');
    setNewItemMinStock('5000');
    setNewItemNetWeight('125');
    setNewItemDrainedWeight('85');
    setNewItemStorage('Tempéré ambiant 10-25°C');
    setSelectedRecipeId('');
    setPendingRecipe(null);
    setExpandedNomenclature(null);
    setItemFormError('');
    setIsItemModalOpen(true);
  };

  const openEditItemModal = (item: Item) => {
    setEditingItem(item);
    setNewItemCode(item.code);
    setNewItemDesignation(item.designation);
    setNewItemCategory(item.category);
    setNewItemUnit(item.unit);
    setNewItemFormat(item.format || '');
    setNewItemMinStock(String(item.minStockLevel));
    setNewItemNetWeight(item.netWeightGrams !== undefined ? String(item.netWeightGrams) : '');
    setNewItemDrainedWeight(item.drainedWeightGrams !== undefined ? String(item.drainedWeightGrams) : '');
    setNewItemStorage(item.storageCondition);
    setSelectedRecipeId('');
    setPendingRecipe(null);
    setExpandedNomenclature(null);
    setItemFormError('');
    setIsItemModalOpen(true);
  };

  const closeItemModal = () => {
    // La touche Échap est écoutée par chaque modal ouverte : on ne ferme pas la fiche
    // article tant que le formulaire de nomenclature est au premier plan.
    if (isRecipeModalOpen) return;
    setIsItemModalOpen(false);
    setEditingItem(null);
    setItemFormError('');
  };

  /** Rattache une nomenclature existante encore libre au produit fini enregistré. */
  const bindRecipeToItem = (itemId: string, format?: string) => {
    if (pendingRecipe) {
      storage.addRecipe({ ...pendingRecipe, finishedItemId: itemId, targetCanFormat: format });
      return;
    }
    if (selectedRecipeId && selectedRecipeId !== PENDING_RECIPE_VALUE) {
      const recipe = storage.getRecipeById(selectedRecipeId);
      if (recipe && !recipe.finishedItemId) {
        storage.updateRecipe(recipe.id, { finishedItemId: itemId, targetCanFormat: format });
      }
    }
  };

  const handleSubmitItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemCode.trim() || !newItemDesignation.trim()) return;

    // Champs communs : en modification, les stocks, la fiche technique et la DLC ne sont pas écrasés.
    const payload = {
      code: newItemCode.trim(),
      designation: newItemDesignation.trim(),
      category: newItemCategory,
      unit: newItemUnit,
      format: newItemFormat,
      minStockLevel: Number(newItemMinStock) || 0,
      netWeightGrams: Number(newItemNetWeight) || undefined,
      drainedWeightGrams: Number(newItemDrainedWeight) || undefined,
      storageCondition: newItemStorage,
    };

    try {
      if (editingItem) {
        storage.updateItem(editingItem.id, payload);
        if (isFinishedProduct) bindRecipeToItem(editingItem.id, newItemFormat);
      } else {
        const created = storage.addItem({
          ...payload,
          currentStock: 0,
          quarantineStock: 0,
          allocatedStock: 0,
          technicalSheetVersion: 'FT-NEW-v1',
        });
        if (isManufacturedCategory(created.category)) bindRecipeToItem(created.id, created.format);
      }
    } catch (err) {
      setItemFormError(err instanceof Error ? err.message : String(err));
      return;
    }

    closeItemModal();
  };

  // --- Création d'une nomenclature ---
  const openRecipeModal = () => {
    setRecipeFormError('');
    setRecipeCode('');
    setRecipeName(newItemDesignation.trim() ? `Nomenclature ${newItemDesignation.trim()}` : '');
    setRecipeVersion(nextVersionLabel(editingItem ? itemRecipes.map(r => r.version) : []));
    setRecipeRefQty('1000');
    setRecipeRefUnit(newItemUnit);
    setRecipeComments('');
    setRecipeRows([emptyRow()]);
    setRecipeScheduleRef('');
    setRecipeTempC('');
    setRecipeHoldMin('');
    setRecipeF0('');
    setRecipePressure('');
    setRecipeSeamingRef('');
    setIsRecipeModalOpen(true);
  };

  const updateRecipeRow = (key: string, updates: Partial<DraftIngredientRow>) => {
    setRecipeRows(prev => prev.map(row => (row.key === key ? { ...row, ...updates } : row)));
  };

  const handleRowItemChange = (key: string, itemId: string) => {
    const article = items.find(i => i.id === itemId);
    updateRecipeRow(key, { itemId, unit: article ? article.unit : 'KG' });
  };

  const handleCreateRecipe = (e: React.FormEvent) => {
    e.preventDefault();

    if (!recipeCode.trim() || !recipeName.trim() || !recipeVersion.trim()) {
      setRecipeFormError('Le code, la désignation et la version de la nomenclature sont obligatoires.');
      return;
    }

    const ingredients: RecipeIngredient[] = [];
    for (const row of recipeRows) {
      const article = items.find(i => i.id === row.itemId);
      if (!article || !(Number(row.quantity) > 0)) continue;
      ingredients.push({
        itemId: article.id,
        itemCode: article.code,
        designation: article.designation,
        theoreticalQuantityPer1000Cans: Number(row.quantity),
        unit: row.unit,
        tolerancePercent: Number(row.tolerancePercent) || 0,
        theoreticalLossPercent: Number(row.lossPercent) || 0,
      });
    }

    if (!ingredients.length) {
      setRecipeFormError('Ajoutez au moins un composant avec une quantité théorique supérieure à zéro.');
      return;
    }

    const draft: RecipeDraft = {
      code: recipeCode.trim(),
      name: recipeName.trim(),
      version: recipeVersion.trim(),
      ingredients,
      referenceProductionQty: Number(recipeRefQty) > 0 ? Number(recipeRefQty) : 1000,
      referenceUnit: recipeRefUnit,
      comments: recipeComments.trim() || undefined,
      status: 'BROUILLON',
      isActive: false,
      sterilizationScheduleRef: recipeScheduleRef.trim() || undefined,
      targetTemperatureC: recipeTempC ? Number(recipeTempC) : undefined,
      targetHoldingTimeMinutes: recipeHoldMin ? Number(recipeHoldMin) : undefined,
      targetF0Value: recipeF0 ? Number(recipeF0) : undefined,
      targetPressureBar: recipePressure ? Number(recipePressure) : undefined,
      seamingSpecRef: recipeSeamingRef.trim() || undefined,
    };

    if (editingItem) {
      try {
        const created = storage.addRecipe({
          ...draft,
          finishedItemId: editingItem.id,
          targetCanFormat: newItemFormat || editingItem.format,
        });
        setSelectedRecipeId(created.id);
        setPendingRecipe(null);
      } catch (err) {
        setRecipeFormError(err instanceof Error ? err.message : String(err));
        return;
      }
    } else {
      setPendingRecipe(draft);
      setSelectedRecipeId(PENDING_RECIPE_VALUE);
    }

    setItemFormError('');
    setIsRecipeModalOpen(false);
  };

  const handleValidateRecipe = (recipeId: string, errorSink: 'item' | 'tab') => {
    try {
      storage.validateRecipe(recipeId);
      setItemFormError('');
      setRecipesTabError('');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (errorSink === 'item') setItemFormError(message);
      else setRecipesTabError(message);
    }
  };

  const getCategoryLabel = (cat: ItemCategory) => {
    switch (cat) {
      case 'POISSON_CONGELE': return 'Poisson Congelé (-18°C)';
      case 'POISSON_FRAIS': return 'Poisson Frais (0-2°C)';
      case 'HUILE': return 'Huile Alimentaire';
      case 'SAUCE_EPICES': return 'Sauces & Épices';
      case 'BOITE_METALLIQUE': return 'Boîte Métallique';
      case 'COUVERCLE': return 'Couvercle Easy-Open';
      case 'CARTON_EMBALLAGE': return 'Carton d\'Emballage';
      case 'PRODUIT_FINI_THON': return 'Produit Fini Thon';
      case 'PRODUIT_FINI_SARDINE': return 'Produit Fini Sardine';
      default: return cat;
    }
  };

  /** État de la nomenclature d'un article : non concerné, validée, en brouillon ou absente. */
  const renderNomenclatureCell = (item: Item) => {
    if (!isManufacturedCategory(item.category)) {
      return <span className="text-slate-300 dark:text-slate-600">—</span>;
    }
    const applicable = storage.getApplicableRecipe(item.id);
    if (applicable) {
      return (
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300">
            {applicable.code} · {applicable.version}
          </span>
          <StatusBadge status="VALIDEE" size="sm" />
        </div>
      );
    }
    const drafts = recipes.filter(r => r.finishedItemId === item.id);
    if (drafts.length) {
      return (
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[11px] text-slate-500">
            {drafts[0].code} · {drafts[0].version}
          </span>
          <StatusBadge status="BROUILLON" size="sm" />
        </div>
      );
    }
    return (
      <span className="text-[11px] font-medium text-red-600 dark:text-red-400">
        Aucune nomenclature
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Barre d'actions supérieure */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-600" />
            <span>Référentiels Produits &amp; Nomenclatures</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Catalogue des articles, conditionnements, spécifications techniques et recettes validées ISO 22000
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Onglets Articles vs Recettes */}
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
            <button
              onClick={() => setActiveTab('ITEMS')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                activeTab === 'ITEMS'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              Articles &amp; Emballages ({items.length})
            </button>
            <button
              onClick={() => setActiveTab('RECIPES')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                activeTab === 'RECIPES'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              Recettes &amp; Barèmes ({recipes.length})
            </button>
          </div>

          {activeTab === 'ITEMS' && (
            <button
              onClick={openCreateItemModal}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Créer Article</span>
            </button>
          )}
        </div>
      </div>

      {activeTab === 'ITEMS' ? (
        /* VUE ARTICLES & EMBALLAGES */
        <div className="space-y-4">
          {/* Filtres de recherche */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher par code article ou désignation..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden focus:border-blue-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden focus:border-blue-500 cursor-pointer"
              >
                <option value="ALL">Toutes les catégories</option>
                <option value="POISSON_CONGELE">Poissons Congelés</option>
                <option value="POISSON_FRAIS">Poissons Frais</option>
                <option value="HUILE">Huiles</option>
                <option value="SAUCE_EPICES">Sauces &amp; Épices</option>
                <option value="BOITE_METALLIQUE">Boîtes Métalliques</option>
                <option value="COUVERCLE">Couvercles Easy-Open</option>
                <option value="PRODUIT_FINI_THON">Produits Finis Thon</option>
                <option value="PRODUIT_FINI_SARDINE">Produits Finis Sardine</option>
              </select>
            </div>
          </div>

          {/* Tableau des articles */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-slate-500 font-semibold">
                  <tr>
                    <th className="py-3 px-4">Code</th>
                    <th className="py-3 px-4">Désignation</th>
                    <th className="py-3 px-4">Catégorie</th>
                    <th className="py-3 px-4">Format / Poids</th>
                    <th className="py-3 px-4 text-right">Stock Disponible</th>
                    <th className="py-3 px-4 text-right">Stock Mini</th>
                    <th className="py-3 px-4">Stockage</th>
                    <th className="py-3 px-4">Fiche Technique</th>
                    <th className="py-3 px-4">Nomenclature</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {filteredItems.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                        {item.code}
                      </td>
                      <td className="py-3 px-4 text-slate-900 dark:text-slate-100">
                        {item.designation}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                        {getCategoryLabel(item.category)}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {item.format || '-'}
                        {item.netWeightGrams && ` · ${item.netWeightGrams}g`}
                        {item.drainedWeightGrams && ` (${item.drainedWeightGrams}g ég.)`}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                        {item.currentStock.toLocaleString()} {item.unit}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-500">
                        {item.minStockLevel.toLocaleString()} {item.unit}
                      </td>
                      <td className="py-3 px-4 text-slate-500 truncate max-w-48">
                        {item.storageCondition}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                        {item.technicalSheetVersion}
                      </td>
                      <td className="py-3 px-4">{renderNomenclatureCell(item)}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => openEditItemModal(item)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                        >
                          <Pencil className="w-3 h-3" aria-hidden="true" />
                          <span>Modifier</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* VUE RECETTES & NOMENCLATURES */
        <div className="space-y-6">
          {recipesTabError && (
            <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950/40 rounded-xl border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs">
              <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{recipesTabError}</span>
            </div>
          )}

          {recipes.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-400">
              <ScrollText className="w-10 h-10 mx-auto mb-2 opacity-30 text-slate-400" aria-hidden="true" />
              <p className="font-semibold text-slate-700 dark:text-slate-300">Aucune nomenclature enregistrée</p>
              <p className="text-xs text-slate-400 mt-1">
                Créez une nomenclature depuis la fiche d'un produit fini, onglet « Articles &amp; Emballages ».
              </p>
            </div>
          ) : (
            recipes.map(recipe => {
              const linkedItem = items.find(i => i.id === recipe.finishedItemId);
              const status = recipe.status ?? 'BROUILLON';
              const refQty = recipe.referenceProductionQty ?? 1000;
              const refUnit = recipe.referenceUnit ?? 'BOITE';
              const hasSchedule =
                recipe.targetTemperatureC !== undefined || recipe.targetF0Value !== undefined;

              return (
                <div
                  key={recipe.id}
                  className="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between pb-4 border-b border-slate-200 dark:border-slate-800 gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                          {recipe.code}
                        </span>
                        <span className="font-mono text-xs font-medium text-slate-500">
                          Version : {recipe.version}
                        </span>
                        <StatusBadge status={status} size="sm" />
                      </div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1">
                        {recipe.name}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Produit fini lié :{' '}
                        <strong>
                          {linkedItem ? `${linkedItem.code} — ${linkedItem.designation}` : 'Non rattaché'}
                        </strong>
                        {recipe.targetCanFormat && (
                          <>
                            {' '}· Format cible : <strong>{recipe.targetCanFormat}</strong>
                          </>
                        )}
                        {recipe.approvedBy && recipe.approvedAt && (
                          <>
                            {' '}· Approuvé par : <strong>{recipe.approvedBy}</strong> (
                            {new Date(recipe.approvedAt).toLocaleDateString('fr-FR')})
                          </>
                        )}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Base de calcul :{' '}
                        <strong className="font-mono">
                          {refQty.toLocaleString()} {refUnit}
                        </strong>
                        {recipe.comments && <> · {recipe.comments}</>}
                      </p>
                    </div>

                    <div className="flex flex-col items-start sm:items-end gap-2 shrink-0">
                      {hasSchedule && (
                        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-mono space-y-1">
                          <div className="text-[10px] text-slate-400 uppercase font-sans font-semibold">
                            Barème Stérilisation Validé (CCP-1)
                          </div>
                          <div className="flex items-center gap-4 text-slate-800 dark:text-slate-200">
                            <span>Température : <strong>{recipe.targetTemperatureC ?? '—'}°C</strong></span>
                            <span>Palier : <strong>{recipe.targetHoldingTimeMinutes ?? '—'} min</strong></span>
                            <span>$F_0$ cible : <strong className="text-emerald-600">{recipe.targetF0Value ?? '—'}</strong></span>
                          </div>
                        </div>
                      )}
                      {status === 'BROUILLON' && canManageNomenclature && (
                        <button
                          onClick={() => handleValidateRecipe(recipe.id, 'tab')}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 rounded-lg border border-emerald-200 dark:border-emerald-800 transition-colors cursor-pointer"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Valider la nomenclature</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Nomenclature : composants et ratios théoriques */}
                  <div>
                    <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                      Composition &amp; Ratios Théoriques (Base {refQty.toLocaleString()} {refUnit})
                    </h4>
                    <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-slate-500 font-semibold">
                          <tr>
                            <th className="py-2 px-3">Code Article</th>
                            <th className="py-2 px-3">Composant</th>
                            <th className="py-2 px-3 text-right">Quantité Théorique</th>
                            <th className="py-2 px-3 text-right">Perte Théo.</th>
                            <th className="py-2 px-3 text-right">Tolérance (±%)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {recipe.ingredients.map((ing, idx) => (
                            <tr
                              key={`${ing.itemId}-${idx}`}
                              className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50"
                            >
                              <td className="py-2 px-3 font-mono text-blue-600 dark:text-blue-400 font-medium">
                                {ing.itemCode}
                              </td>
                              <td className="py-2 px-3 text-slate-800 dark:text-slate-200">
                                {ing.designation}
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                                {ing.theoreticalQuantityPer1000Cans} {ing.unit}
                              </td>
                              <td className="py-2 px-3 text-right font-mono text-slate-500">
                                {ing.theoreticalLossPercent ? `${ing.theoreticalLossPercent} %` : '—'}
                              </td>
                              <td className="py-2 px-3 text-right font-mono text-slate-500">
                                ± {ing.tolerancePercent} %
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Modal Création / Modification d'Article */}
      <Modal
        isOpen={isItemModalOpen}
        onClose={closeItemModal}
        maxWidth="3xl"
        title={
          editingItem
            ? `Modification de l'article ${editingItem.code}`
            : "Création d'un Nouvel Article / Référentiel"
        }
        subtitle={
          editingItem
            ? "Les stocks, la fiche technique et les informations déjà enregistrées de l'article sont préservés"
            : 'Renseignez le code unique, la désignation et les spécifications techniques'
        }
      >
        <form onSubmit={handleSubmitItem} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Code Article *
              </label>
              <input
                type="text"
                required
                placeholder="ex: PF-THON-NATUR-44"
                value={newItemCode}
                onChange={e => setNewItemCode(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono focus:border-blue-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Catégorie *
              </label>
              <select
                value={newItemCategory}
                onChange={e => setNewItemCategory(e.target.value as ItemCategory)}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:border-blue-500 focus:outline-hidden"
              >
                <option value="PRODUIT_FINI_THON">Produit Fini Thon</option>
                <option value="PRODUIT_FINI_SARDINE">Produit Fini Sardine</option>
                <option value="POISSON_CONGELE">Poisson Congelé (-18°C)</option>
                <option value="POISSON_FRAIS">Poisson Frais (0-2°C)</option>
                <option value="HUILE">Huile</option>
                <option value="SAUCE_EPICES">Sauces &amp; Épices</option>
                <option value="BOITE_METALLIQUE">Boîte Métallique</option>
                <option value="COUVERCLE">Couvercle Easy-Open</option>
                <option value="CARTON_EMBALLAGE">Carton</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
              Désignation Complète *
            </label>
            <input
              type="text"
              required
              placeholder="ex: Thon entier au naturel format 4/4 (1kg)"
              value={newItemDesignation}
              onChange={e => setNewItemDesignation(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:border-blue-500 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Unité</label>
              <select
                value={newItemUnit}
                onChange={e => setNewItemUnit(e.target.value as UnitOfMeasure)}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden"
              >
                <option value="BOITE">Boîte</option>
                <option value="KG">Kilogramme (KG)</option>
                <option value="LITRE">Litre</option>
                <option value="CARTON">Carton</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Format</label>
              <input
                type="text"
                placeholder="1/4 club, 4/4..."
                value={newItemFormat}
                onChange={e => setNewItemFormat(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Stock Mini</label>
              <input
                type="number"
                value={newItemMinStock}
                onChange={e => setNewItemMinStock(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Poids Net (g)</label>
              <input
                type="number"
                value={newItemNetWeight}
                onChange={e => setNewItemNetWeight(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Poids Égoutté (g)</label>
              <input
                type="number"
                value={newItemDrainedWeight}
                onChange={e => setNewItemDrainedWeight(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Conditions de Stockage</label>
            <input
              type="text"
              value={newItemStorage}
              onChange={e => setNewItemStorage(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden"
            />
          </div>

          {/* Section Nomenclature de fabrication — produits finis fabriqués uniquement */}
          {isFinishedProduct && (
            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
                  <ScrollText className="w-4 h-4 text-blue-600" aria-hidden="true" />
                  <span>Nomenclature de fabrication</span>
                </div>
                {canManageNomenclature ? (
                  <button
                    type="button"
                    onClick={openRecipeModal}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Créer une nomenclature</span>
                  </button>
                ) : (
                  <span className="text-[11px] text-slate-500">
                    Profil non habilité à créer ou valider une nomenclature.
                  </span>
                )}
              </div>

              {/* Association à une nomenclature existante */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                  Associer une nomenclature existante
                </label>
                <select
                  value={selectedRecipeId}
                  onChange={e => setSelectedRecipeId(e.target.value)}
                  disabled={!canManageNomenclature}
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:border-blue-500 focus:outline-hidden disabled:opacity-60 cursor-pointer"
                >
                  <option value="">
                    {applicableRecipe
                      ? `— Conserver ${applicableRecipe.code} (${applicableRecipe.version}) —`
                      : '— Aucune (produit fini conservé sans nomenclature applicable) —'}
                  </option>
                  {pendingRecipe && (
                    <option value={PENDING_RECIPE_VALUE}>
                      Nouvelle nomenclature {pendingRecipe.code} ({pendingRecipe.version}) — à enregistrer
                    </option>
                  )}
                  {unlinkedRecipes.map(recipe => (
                    <option key={recipe.id} value={recipe.id}>
                      {recipe.code} — {recipe.name} ({recipe.version})
                    </option>
                  ))}
                </select>
                {editingItem && unlinkedRecipes.length === 0 && !pendingRecipe && (
                  <p className="text-[10px] text-slate-500 mt-1">
                    Aucune nomenclature libre n'est disponible : les nomenclatures déjà rattachées à un autre
                    produit fini ne peuvent pas être réaffectées.
                  </p>
                )}
              </div>

              {/* Consultation de la nomenclature retenue dans ce formulaire */}
              {selectedNomenclature && (
                <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-blue-700 dark:text-blue-300">
                      {selectedNomenclature.code}
                    </span>
                    <span className="font-mono text-[11px] text-slate-500">
                      {selectedNomenclature.version}
                    </span>
                    <StatusBadge status={selectedNomenclature.status ?? 'BROUILLON'} size="sm" />
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedNomenclature(expandedNomenclature === PENDING_RECIPE_VALUE ? null : PENDING_RECIPE_VALUE)
                      }
                      className="ml-auto inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:text-blue-600 transition-colors cursor-pointer"
                    >
                      {expandedNomenclature === PENDING_RECIPE_VALUE ? (
                        <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                      )}
                      <span>Consulter la composition</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300">{selectedNomenclature.name}</p>
                  {expandedNomenclature === PENDING_RECIPE_VALUE && (
                    <NomenclatureComposition nomenclature={selectedNomenclature} />
                  )}
                </div>
              )}

              {/* Versions successives déjà enregistrées pour ce produit fini */}
              {editingItem && itemRecipes.length > 0 && (
                <div className="space-y-1.5">
                  <span className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                    Versions de nomenclature de ce produit fini ({itemRecipes.length})
                  </span>
                  {itemRecipes.map(recipe => {
                    const status = recipe.status ?? 'BROUILLON';
                    const isExpanded = expandedNomenclature === recipe.id;
                    return (
                      <div
                        key={recipe.id}
                        className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 space-y-2"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-[11px] font-bold text-blue-700 dark:text-blue-300">
                            {recipe.code}
                          </span>
                          <span className="font-mono text-[11px] text-slate-500">{recipe.version}</span>
                          <StatusBadge status={status} size="sm" />
                          {applicableRecipe?.id === recipe.id && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              Applicable
                            </span>
                          )}
                          <div className="ml-auto flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setExpandedNomenclature(isExpanded ? null : recipe.id)}
                              className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                            >
                              {isExpanded ? (
                                <ChevronDown className="w-3 h-3" aria-hidden="true" />
                              ) : (
                                <ChevronRight className="w-3 h-3" aria-hidden="true" />
                              )}
                              <span>Composition</span>
                            </button>
                            {status === 'BROUILLON' && canManageNomenclature && (
                              <button
                                type="button"
                                onClick={() => handleValidateRecipe(recipe.id, 'item')}
                                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 rounded-lg border border-emerald-200 dark:border-emerald-800 transition-colors cursor-pointer"
                              >
                                <ShieldCheck className="w-3 h-3" aria-hidden="true" />
                                <span>Valider</span>
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-300">{recipe.name}</p>
                        {isExpanded && <NomenclatureComposition nomenclature={recipe} />}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Produit fini sans nomenclature valide : aucun OF ne pourra être lancé */}
              {editingItem && !applicableRecipe && (
                <div className="flex items-start gap-2 p-2.5 bg-amber-50 dark:bg-amber-950/40 rounded-lg border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-[11px]">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>
                    Ce produit fini ne dispose d'aucune nomenclature validée. Il reste utilisable comme fiche
                    article, mais aucun ordre de fabrication ne pourra être lancé ni démarré tant qu'une
                    nomenclature n'aura pas été validée.
                  </span>
                </div>
              )}
              {!editingItem && pendingRecipe && (
                <p className="text-[11px] text-slate-500">
                  Le produit fini est enregistré avec sa nomenclature au statut <strong>brouillon</strong>. La
                  validation se fait ensuite depuis cette fiche ou depuis l'onglet « Recettes &amp; Barèmes ».
                </p>
              )}
              {!editingItem && !pendingRecipe && selectedRecipeId !== PENDING_RECIPE_VALUE && (
                <p className="text-[11px] text-amber-700 dark:text-amber-400">
                  Aucune nomenclature associée : le produit fini sera créé sans nomenclature applicable. Aucun
                  ordre de fabrication ne pourra être lancé tant qu'une nomenclature validée n'aura pas été
                  rattachée à cette fiche.
                </p>
              )}
            </div>
          )}

          {itemFormError && (
            <div className="flex items-start gap-2 p-2.5 bg-red-50 dark:bg-red-950/40 rounded-lg border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{itemFormError}</span>
            </div>
          )}

          <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
            <button
              type="button"
              onClick={closeItemModal}
              className="px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
            >
              {editingItem ? "Enregistrer les Modifications" : "Enregistrer l'Article"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Création d'une Nomenclature de Fabrication */}
      <Modal
        isOpen={isRecipeModalOpen}
        onClose={() => setIsRecipeModalOpen(false)}
        maxWidth="4xl"
        title="Création d'une Nomenclature de Fabrication"
        subtitle={
          editingItem
            ? `Rattachée au produit fini ${editingItem.code} — enregistrée au statut brouillon, à valider avant tout lancement d'OF`
            : "Enregistrée avec le produit fini en cours de création — statut brouillon"
        }
      >
        <form onSubmit={handleCreateRecipe} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Code de nomenclature *
              </label>
              <input
                type="text"
                required
                placeholder="ex : REC-TH-NATUR-14"
                value={recipeCode}
                onChange={e => setRecipeCode(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono focus:border-blue-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Version *</label>
              <input
                type="text"
                required
                placeholder="ex : REV-2026-A"
                value={recipeVersion}
                onChange={e => setRecipeVersion(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono focus:border-blue-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
              Désignation de la nomenclature *
            </label>
            <input
              type="text"
              required
              placeholder="ex : Nomenclature Thon entier au naturel 1/4 club"
              value={recipeName}
              onChange={e => setRecipeName(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:border-blue-500 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Quantité de référence de fabrication *
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={recipeRefQty}
                onChange={e => setRecipeRefQty(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono focus:border-blue-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Unité de référence *
              </label>
              <select
                value={recipeRefUnit}
                onChange={e => setRecipeRefUnit(e.target.value as UnitOfMeasure)}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden cursor-pointer"
              >
                {UNIT_OPTIONS.map(unit => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Composants issus du référentiel des articles */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-slate-700 dark:text-slate-300 font-medium">
                Liste des composants *
              </label>
              <button
                type="button"
                onClick={() => setRecipeRows(prev => [...prev, emptyRow()])}
                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded-lg border border-blue-200 dark:border-blue-800 transition-colors cursor-pointer"
              >
                <Plus className="w-3 h-3" aria-hidden="true" />
                <span>Ajouter un composant</span>
              </button>
            </div>
            <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-slate-500 font-semibold">
                  <tr>
                    <th className="py-1.5 px-2">Article composant</th>
                    <th className="py-1.5 px-2 text-right">Qté théorique</th>
                    <th className="py-1.5 px-2">Unité</th>
                    <th className="py-1.5 px-2 text-right">Perte théo. (%)</th>
                    <th className="py-1.5 px-2 text-right">Tolérance (±%)</th>
                    <th className="py-1.5 px-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {recipeRows.map(row => (
                    <tr key={row.key}>
                      <td className="py-1.5 px-2">
                        <select
                          value={row.itemId}
                          onChange={e => handleRowItemChange(row.key, e.target.value)}
                          className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded focus:border-blue-500 focus:outline-hidden cursor-pointer"
                        >
                          <option value="">— Sélectionner un article —</option>
                          {items
                            .filter(
                              i =>
                                i.isActive !== false &&
                                i.id !== editingItem?.id &&
                                i.code !== newItemCode.trim()
                            )
                            .map(i => (
                              <option key={i.id} value={i.id}>
                                {i.code} — {i.designation}
                              </option>
                            ))}
                        </select>
                      </td>
                      <td className="py-1.5 px-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={row.quantity}
                          onChange={e => updateRecipeRow(row.key, { quantity: e.target.value })}
                          className="w-full px-2 py-1 text-right font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded focus:border-blue-500 focus:outline-hidden"
                        />
                      </td>
                      <td className="py-1.5 px-2">
                        <select
                          value={row.unit}
                          onChange={e => updateRecipeRow(row.key, { unit: e.target.value as UnitOfMeasure })}
                          className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded focus:outline-hidden cursor-pointer"
                        >
                          {UNIT_OPTIONS.map(unit => (
                            <option key={unit} value={unit}>
                              {unit}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-1.5 px-2">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={row.lossPercent}
                          onChange={e => updateRecipeRow(row.key, { lossPercent: e.target.value })}
                          className="w-full px-2 py-1 text-right font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded focus:border-blue-500 focus:outline-hidden"
                        />
                      </td>
                      <td className="py-1.5 px-2">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={row.tolerancePercent}
                          onChange={e => updateRecipeRow(row.key, { tolerancePercent: e.target.value })}
                          className="w-full px-2 py-1 text-right font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded focus:border-blue-500 focus:outline-hidden"
                        />
                      </td>
                      <td className="py-1.5 px-2 text-right">
                        <button
                          type="button"
                          onClick={() => setRecipeRows(prev => prev.filter(r => r.key !== row.key))}
                          disabled={recipeRows.length === 1}
                          aria-label="Retirer le composant"
                          className="p-1 text-slate-400 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              Quantités théoriques exprimées pour{' '}
              <strong className="font-mono">
                {(Number(recipeRefQty) > 0 ? Number(recipeRefQty) : 0).toLocaleString()} {recipeRefUnit}
              </strong>{' '}
              fabriqués. Les composants sont sélectionnés depuis le référentiel des articles existants.
            </p>
          </div>

          {/* Paramètres CCP-1 : renseignés par la Qualité, facultatifs au stade brouillon */}
          <details className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40">
            <summary className="px-3 py-2 text-[11px] font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
              Paramètres de stérilisation &amp; sertissage (CCP-1) — facultatifs au stade brouillon
            </summary>
            <div className="px-3 pb-3 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                    Référence barème de stérilisation
                  </label>
                  <input
                    type="text"
                    placeholder="ex : BAR-TH-14-121C-50M"
                    value={recipeScheduleRef}
                    onChange={e => setRecipeScheduleRef(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-mono focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                    Référence spécification de sertissage
                  </label>
                  <input
                    type="text"
                    placeholder="ex : SPEC-SERTI-ALU-14C-v3"
                    value={recipeSeamingRef}
                    onChange={e => setRecipeSeamingRef(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-mono focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                    Température (°C)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={recipeTempC}
                    onChange={e => setRecipeTempC(e.target.value)}
                    className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-mono focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                    Palier (min)
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={recipeHoldMin}
                    onChange={e => setRecipeHoldMin(e.target.value)}
                    className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-mono focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                    $F_0$ cible
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={recipeF0}
                    onChange={e => setRecipeF0(e.target.value)}
                    className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-mono focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                    Pression (bar)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={recipePressure}
                    onChange={e => setRecipePressure(e.target.value)}
                    className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-mono focus:outline-hidden"
                  />
                </div>
              </div>
            </div>
          </details>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Commentaires</label>
            <textarea
              rows={2}
              placeholder="Observations de formulation, contraintes de ligne, motifs de révision..."
              value={recipeComments}
              onChange={e => setRecipeComments(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:border-blue-500 focus:outline-hidden resize-none"
            />
          </div>

          {recipeFormError && (
            <div className="flex items-start gap-2 p-2.5 bg-red-50 dark:bg-red-950/40 rounded-lg border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{recipeFormError}</span>
            </div>
          )}

          <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsRecipeModalOpen(false)}
              className="px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer"
            >
              Enregistrer la Nomenclature
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
