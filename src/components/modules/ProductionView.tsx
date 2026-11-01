/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * MAMORA GP — Planification & Ordres de Fabrication (OF)
 * Calcul automatique des besoins théoriques et vérification stricte des stocks
 */

import React, { useState, useEffect } from 'react';
import {
  WorkOrder,
  Recipe,
  Item,
  RawBatchReception,
  WorkOrderStatus,
  UnitOfMeasure,
  isManufacturedCategory,
  isSpeciesCompatibleWithCategory,
} from '../../types';
import { storage } from '../../services/storage';
import { StatusBadge } from '../common/StatusBadge';
import { Modal } from '../common/Modal';
import { Factory, Plus, Search, Filter, AlertTriangle, CheckCircle, Calculator, Layers, ArrowRight, ScrollText } from 'lucide-react';

interface ProductionViewProps {
  workOrders: WorkOrder[];
  recipes: Recipe[];
  items: Item[];
  receptions: RawBatchReception[];
  currentUserName: string;
  onNavigateToSteps: (workOrderId: string) => void;
}

export const ProductionView: React.FC<ProductionViewProps> = ({
  workOrders,
  recipes,
  items,
  receptions,
  currentUserName,
  onNavigateToSteps,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [orderError, setOrderError] = useState('');

  // Produits finis fabriqués par l'usine : seuls articles pilotés par une nomenclature
  const finishedProducts = items.filter(i => isManufacturedCategory(i.category));

  // Formulaire nouvel OF
  const [selectedFinishedItemId, setSelectedFinishedItemId] = useState(
    () =>
      finishedProducts.find(i => storage.getApplicableRecipe(i.id))?.id ||
      finishedProducts[0]?.id ||
      ''
  );
  const [plannedCans, setPlannedCans] = useState('');
  const [selectedLine, setSelectedLine] = useState('LIGNE-THON-01');
  const [teamLeader, setTeamLeader] = useState(currentUserName || '');
  const [shift, setShift] = useState<WorkOrder['shift']>('EQUIPE_MATIN');
  const [priority, setPriority] = useState<WorkOrder['priority']>('NORMALE');
  const [selectedRawBatchId, setSelectedRawBatchId] = useState('');

  // Nomenclature applicable au produit fini sélectionné : dernière version validée
  const selectedProduct = items.find(i => i.id === selectedFinishedItemId);
  const currentRecipe: Recipe | undefined = selectedFinishedItemId
    ? storage.getApplicableRecipe(selectedFinishedItemId)
    : undefined;
  const nomenclatureVersions = selectedFinishedItemId
    ? recipes.filter(r => r.finishedItemId === selectedFinishedItemId)
    : [];

  // Réceptions acceptées disponibles pour le lancement
  const acceptedReceptions = receptions.filter(r => r.decision === 'ACCEPTE' || r.decision === 'ACCEPTE_DEROGATION');

  // Un lot de poisson n'est affectable qu'à un OF fabriquant l'espèce correspondante
  const compatibleReceptions = selectedProduct
    ? acceptedReceptions.filter(r => isSpeciesCompatibleWithCategory(r.species, selectedProduct.category))
    : [];
  const compatibleBatchNumbers = compatibleReceptions.map(r => r.internalBatchNumber).join('|');

  useEffect(() => {
    if (selectedRawBatchId && !compatibleBatchNumbers.split('|').includes(selectedRawBatchId)) {
      setSelectedRawBatchId('');
    }
  }, [compatibleBatchNumbers, selectedRawBatchId]);

  // Calcul dynamique des besoins théoriques depuis la nomenclature applicable
  const plannedCansNum = Number(plannedCans) || 0;
  const referenceQty = currentRecipe?.referenceProductionQty ?? 1000;
  const ratioFactor = referenceQty > 0 ? plannedCansNum / referenceQty : 0;

  const theoreticalNeeds = (currentRecipe?.ingredients || []).map(ing => {
    const article = items.find(i => i.id === ing.itemId);
    const lossPercent = ing.theoreticalLossPercent ?? 0;
    const need = ing.theoreticalQuantityPer1000Cans * ratioFactor * (1 + lossPercent / 100);
    return {
      ingredient: ing,
      article,
      lossPercent,
      need: Number(need.toFixed(2)),
      stock: article?.currentStock ?? 0,
      isSufficient: article ? article.currentStock >= need : false,
    };
  });

  const sumNeeds = (categories: Item['category'][], unit?: UnitOfMeasure) =>
    theoreticalNeeds
      .filter(
        n =>
          n.article &&
          categories.includes(n.article.category) &&
          (!unit || n.ingredient.unit === unit)
      )
      .reduce((total, n) => total + n.need, 0);

  const filterNeeds = (categories: Item['category'][]) =>
    theoreticalNeeds.filter(n => n.article && categories.includes(n.article.category));

  const theoreticalFishKg = Math.round(sumNeeds(['POISSON_CONGELE', 'POISSON_FRAIS'], 'KG'));
  // Le sel et les sauces peuvent être servis au kilo : on ne mélange pas les unités dans le total.
  const theoreticalOilL = Math.round(sumNeeds(['HUILE', 'SAUCE_EPICES'], 'LITRE'));
  const theoreticalSauceKg = Math.round(sumNeeds(['SAUCE_EPICES'], 'KG'));
  const canNeeds = filterNeeds(['BOITE_METALLIQUE']);
  const lidNeeds = filterNeeds(['COUVERCLE']);

  // Vérification de disponibilité des matières
  const fishItem = items.find(i => i.category === 'POISSON_CONGELE' || i.category === 'POISSON_FRAIS');
  const canItem = items.find(i => i.category === 'BOITE_METALLIQUE');
  const lidItem = items.find(i => i.category === 'COUVERCLE');

  const fishNeeds = filterNeeds(['POISSON_CONGELE', 'POISSON_FRAIS']);
  const isFishStockSufficient = fishNeeds.length
    ? fishNeeds.every(n => n.isSufficient)
    : fishItem
      ? fishItem.currentStock >= theoreticalFishKg
      : false;
  const isCansStockSufficient = canNeeds.length
    ? canNeeds.every(n => n.isSufficient)
    : canItem
      ? canItem.currentStock >= plannedCansNum
      : false;
  const isLidsStockSufficient = lidNeeds.length
    ? lidNeeds.every(n => n.isSufficient)
    : lidItem
      ? lidItem.currentStock >= plannedCansNum
      : false;
  const canLaunchOrder = isFishStockSufficient && isCansStockSufficient && isLidsStockSufficient;

  // Règle de gestion : aucune nomenclature validée = aucun lancement d'OF possible
  const hasValidNomenclature = Boolean(currentRecipe);

  const filteredOrders = workOrders.filter(wo => {
    const matchesSearch =
      wo.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      wo.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      wo.lineId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || wo.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProduct) {
      setOrderError('Sélectionnez un produit fini à fabriquer.');
      return;
    }
    if (!currentRecipe) {
      setOrderError(
        `Lancement refusé : le produit fini ${selectedProduct.code} ne dispose d'aucune nomenclature validée. Validez une nomenclature depuis le module Référentiels avant de planifier un OF.`
      );
      return;
    }
    if (plannedCansNum <= 0) {
      setOrderError('La quantité prévue doit être supérieure à zéro.');
      return;
    }

    if (!selectedRawBatchId && compatibleReceptions.length > 1) {
      setOrderError(
        `Sélectionnez le lot de matière première à affecter : ${compatibleReceptions.length} lots acceptés sont compatibles avec ${selectedProduct.code}.`
      );
      return;
    }
    const rawBatch =
      compatibleReceptions.find(r => r.internalBatchNumber === selectedRawBatchId) ||
      (compatibleReceptions.length === 1 ? compatibleReceptions[0] : undefined);

    try {
      storage.addWorkOrder({
        recipeId: currentRecipe.id,
        recipeVersion: currentRecipe.version,
        finishedItemId: selectedProduct.id,
        productName: selectedProduct.designation,
        plannedCansQty: plannedCansNum,
        plannedCartonsQty: Math.ceil(plannedCansNum / 50),
        actualCansQty: 0,
        lineId: selectedLine,
        teamLeader: teamLeader || currentUserName,
        shift,
        startDatePlanned: new Date().toISOString(),
        endDatePlanned: new Date(Date.now() + 8 * 3600 * 1000).toISOString(),
        assignedRawBatchId: rawBatch ? rawBatch.internalBatchNumber : 'N/A',
        assignedCanBatchId: canNeeds[0]?.article?.code || canItem?.code || 'N/A',
        assignedLidBatchId: lidNeeds[0]?.article?.code || lidItem?.code || 'N/A',
        priority,
        status: 'PLANIFIE',
        theoreticalFishKgNeeded: theoreticalFishKg,
        actualFishKgConsumed: 0,
        rejectedCansQty: 0,
        validatedBy: currentUserName,
        notes: `OF ordonnancé par ${currentUserName}. Nomenclature ${currentRecipe.code} ${currentRecipe.version}. Lot matière : ${rawBatch ? `${rawBatch.internalBatchNumber} (${rawBatch.species})` : 'aucun lot réceptionné affecté'}. Besoins calculés : ${theoreticalFishKg}kg poisson, ${theoreticalOilL}L huile/sauce, ${plannedCansNum} boîtes.`,
      });
    } catch (err) {
      setOrderError(err instanceof Error ? err.message : String(err));
      return;
    }

    setOrderError('');
    setIsNewOrderModalOpen(false);
  };

  const handleUpdateStatus = (id: string, newStatus: WorkOrderStatus) => {
    try {
      storage.updateWorkOrderStatus(id, newStatus);
      setOrderError('');
    } catch (err) {
      setOrderError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Factory className="w-5 h-5 text-blue-600" />
            <span>Planification &amp; Ordres de Fabrication (OF)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Ordonnancement d'atelier, calcul automatique des besoins matières et vérification avant lancement
          </p>
        </div>

        <button
          onClick={() => setIsNewOrderModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Planifier un Ordre (OF)</span>
        </button>
      </div>

      {orderError && (
        <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950/40 rounded-xl border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
          <span>{orderError}</span>
        </div>
      )}

      {/* Barre de recherche et filtres */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher par numéro d'OF, produit, ligne..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden focus:border-blue-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden cursor-pointer"
          >
            <option value="ALL">Tous les statuts</option>
            <option value="PLANIFIE">Planifié</option>
            <option value="EN_COURS">En cours</option>
            <option value="EN_CONTROLE">En attente de contrôle</option>
            <option value="CLOTURE">Clôturé</option>
          </select>
        </div>
      </div>

      {/* Liste des OF sous forme de cartes d'atelier */}
      <div className="space-y-4">
        {filteredOrders.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-400">
            <Factory className="w-10 h-10 mx-auto mb-2 opacity-30 text-slate-400" />
            <p className="font-semibold text-slate-700 dark:text-slate-300">Aucun ordre de fabrication planifié</p>
            <p className="text-xs text-slate-400 mt-1">Créez votre premier ordre de fabrication en cliquant sur « Planifier un Ordre (OF) ».</p>
          </div>
        ) : (
          filteredOrders.map(wo => {
          const woRecipe = recipes.find(r => r.id === wo.recipeId);
          const progressPercent =
            wo.plannedCansQty > 0
              ? Math.min(100, Math.round((wo.actualCansQty / wo.plannedCansQty) * 100))
              : 0;

          return (
            <div
              key={wo.id}
              className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-blue-600 dark:text-blue-400">
                      {wo.orderNumber}
                    </span>
                    <StatusBadge status={wo.status} size="sm" />
                    <span className="text-xs text-slate-400">·</span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {wo.lineId}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">({wo.shift})</span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    {wo.productName}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Chef de Ligne : <strong>{wo.teamLeader}</strong> · Lot Poisson Affecté :{' '}
                    <strong className="font-mono">{wo.assignedRawBatchId}</strong> · Boîtes :{' '}
                    <strong className="font-mono">{wo.assignedCanBatchId}</strong>
                  </p>
                  <p className="text-xs text-slate-500">
                    <ScrollText className="w-3 h-3 inline-block mr-1 text-blue-500" aria-hidden="true" />
                    Nomenclature figée à l'ordonnancement :{' '}
                    <strong className="font-mono">
                      {woRecipe ? woRecipe.code : 'nomenclature supprimée'} ·{' '}
                      {wo.recipeVersion || woRecipe?.version || 'version inconnue'}
                    </strong>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {wo.status === 'PLANIFIE' && (
                    <button
                      onClick={() => handleUpdateStatus(wo.id, 'EN_COURS')}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors cursor-pointer"
                    >
                      Démarrer Fabrication
                    </button>
                  )}
                  {wo.status === 'EN_COURS' && (
                    <button
                      onClick={() => handleUpdateStatus(wo.id, 'EN_CONTROLE')}
                      className="px-3 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 rounded-lg border border-amber-200 dark:border-amber-800 transition-colors cursor-pointer"
                    >
                      Transmettre au Contrôle
                    </button>
                  )}
                  <button
                    onClick={() => onNavigateToSteps(wo.id)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                  >
                    <span>Suivi des 17 Étapes</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Indicateurs d'avancement de production */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-700/60">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                    Quantité Réalisée
                  </span>
                  <div className="font-mono text-base font-bold text-slate-900 dark:text-slate-100 mt-1">
                    {wo.actualCansQty.toLocaleString()} / {wo.plannedCansQty.toLocaleString()}
                  </div>
                  <span className="text-[10px] text-slate-500">boîtes ({progressPercent}%)</span>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-700/60">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                    Rendement Matière Net
                  </span>
                  <div className="font-mono text-base font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                    {wo.rawMaterialYieldPercent ? `${wo.rawMaterialYieldPercent}%` : 'En cours'}
                  </div>
                  <span className="text-[10px] text-slate-500">
                    Poisson consommé : {wo.actualFishKgConsumed} kg
                  </span>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-700/60">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                    Conditionnement Prévu
                  </span>
                  <div className="font-mono text-base font-bold text-slate-900 dark:text-slate-100 mt-1">
                    {wo.plannedCartonsQty} cartons
                  </div>
                  <span className="text-[10px] text-slate-500">50 boîtes / carton</span>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-700/60">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                    Rebuts / Boîtes Éjectées
                  </span>
                  <div className="font-mono text-base font-bold text-slate-700 dark:text-slate-300 mt-1">
                    {wo.rejectedCansQty} boîtes
                  </div>
                  <span className="text-[10px] text-slate-500">Arrêt / défauts de serti</span>
                </div>
              </div>

              {/* Barre de progression */}
              <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          );
        }))}
      </div>

      {/* Modal Création d'un Ordre de Fabrication avec Calculateur */}
      <Modal
        isOpen={isNewOrderModalOpen}
        onClose={() => setIsNewOrderModalOpen(false)}
        title="Planification d'un Ordre de Fabrication (OF)"
        subtitle="Vérification préalable de disponibilité des matières premières et emballages"
      >
        <form onSubmit={handleCreateOrder} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Produit Fini à Fabriquer *
              </label>
              <select
                value={selectedFinishedItemId}
                onChange={e => setSelectedFinishedItemId(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden cursor-pointer"
              >
                {finishedProducts.length === 0 && <option value="">— Aucun produit fini au référentiel —</option>}
                {finishedProducts.map(item => {
                  const applicable = storage.getApplicableRecipe(item.id);
                  return (
                    <option key={item.id} value={item.id}>
                      {item.code} — {item.designation}
                      {applicable ? ` [${applicable.code} · ${applicable.version}]` : ' [sans nomenclature validée]'}
                    </option>
                  );
                })}
              </select>
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Quantité Prévue (Boîtes) *
              </label>
              <input
                type="number"
                step="500"
                required
                value={plannedCans}
                onChange={e => setPlannedCans(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Ligne de Production *
              </label>
              <select
                value={selectedLine}
                onChange={e => setSelectedLine(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden"
              >
                <option value="LIGNE-THON-01">Ligne Thon Automatique 1</option>
                <option value="LIGNE-SARD-01">Ligne Sardines Semi-auto 1</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Chef de Ligne Responsable
              </label>
              <input
                type="text"
                value={teamLeader}
                onChange={e => setTeamLeader(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Poste / Équipe
              </label>
              <select
                value={shift}
                onChange={e => setShift(e.target.value as WorkOrder['shift'])}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden"
              >
                <option value="EQUIPE_MATIN">Équipe du Matin (06h - 14h)</option>
                <option value="EQUIPE_SOIR">Équipe du Soir (14h - 22h)</option>
                <option value="EQUIPE_NUIT">Équipe de Nuit (22h - 06h)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
              Lot de Poisson Alloué (Matière Première Réceptionnée) *
            </label>
            <select
              value={selectedRawBatchId}
              onChange={e => setSelectedRawBatchId(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono focus:outline-hidden"
            >
              <option value="">
                {compatibleReceptions.length === 0
                  ? '— Aucun lot réceptionné compatible avec ce produit fini —'
                  : compatibleReceptions.length === 1
                    ? '— Lot unique compatible (affecté automatiquement) —'
                    : '— Sélectionner un lot compatible —'}
              </option>
              {compatibleReceptions.map(r => (
                <option key={r.id} value={r.internalBatchNumber}>
                  {r.internalBatchNumber} — {r.species} ({r.acceptedQtyKg} kg acceptés)
                </option>
              ))}
            </select>
            {compatibleReceptions.length === 0 && (
              <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-1">
                Aucun lot accepté de l'espèce requise n'est disponible. L'OF sera ordonnancé sans lot
                matière affecté : enregistrez d'abord la réception correspondante au module « Réceptions
                &amp; Agréage MP ».
              </p>
            )}
          </div>

          {/* Nomenclature applicable au produit fini sélectionné */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
              <ScrollText className="w-4 h-4 text-blue-600" aria-hidden="true" />
              <span>Nomenclature Applicable</span>
            </div>

            {currentRecipe ? (
              <>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-mono font-bold text-blue-700 dark:text-blue-300">
                    {currentRecipe.code}
                  </span>
                  <span className="font-mono text-slate-500">{currentRecipe.version}</span>
                  <StatusBadge status="VALIDEE" size="sm" />
                  <span className="text-slate-600 dark:text-slate-300">{currentRecipe.name}</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Récupérée automatiquement depuis la fiche du produit fini. Base de calcul :{' '}
                  <strong className="font-mono">
                    {referenceQty.toLocaleString()} {currentRecipe.referenceUnit || 'BOITE'}
                  </strong>
                  {nomenclatureVersions.length > 1 &&
                    ` · ${nomenclatureVersions.length} versions enregistrées pour ce produit fini`}
                </p>
              </>
            ) : (
              <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950/40 rounded-lg border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                <div className="space-y-1">
                  <p className="font-semibold">Lancement impossible : aucune nomenclature valide</p>
                  <p>
                    {selectedProduct
                      ? `Le produit fini ${selectedProduct.code} ne dispose d'aucune nomenclature au statut « validée ».`
                      : "Aucun produit fini n'est sélectionné."}
                    {nomenclatureVersions.length > 0
                      ? ' Des versions en brouillon existent : validez-les depuis le module Référentiels.'
                      : ' Créez puis validez une nomenclature depuis la fiche article du produit fini.'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Panneau de calcul & vérification des disponibilités (Section 7) */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
              <Calculator className="w-4 h-4 text-blue-600" />
              <span>Calcul des Besoins Théoriques &amp; Contrôle Disponibilité Stock</span>
            </div>

            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block">Poisson Requis</span>
                <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                  {theoreticalFishKg.toLocaleString()} kg
                </span>
                <div
                  className={`text-[10px] font-semibold mt-1 ${
                    isFishStockSufficient ? 'text-emerald-600' : 'text-red-600'
                  }`}
                >
                  {isFishStockSufficient ? '✓ Stock suffisant' : '✕ Stock insuffisant'}
                </div>
              </div>

              <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block">Huile / Sauce Requise</span>
                <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                  {theoreticalOilL.toLocaleString()} Litres
                  {theoreticalSauceKg > 0 && ` + ${theoreticalSauceKg.toLocaleString()} kg`}
                </span>
                <div className="text-[10px] font-semibold text-emerald-600 mt-1">✓ Cuves prêtes</div>
              </div>

              <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block">Boîtes &amp; Couvercles</span>
                <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                  {plannedCansNum.toLocaleString()} unités
                </span>
                <div
                  className={`text-[10px] font-semibold mt-1 ${
                    isCansStockSufficient ? 'text-emerald-600' : 'text-red-600'
                  }`}
                >
                  {isCansStockSufficient ? '✓ Emballages dispo' : '✕ Rupture boîtes'}
                </div>
              </div>
            </div>

            {currentRecipe && plannedCansNum > 0 && (
              <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-slate-500 font-semibold">
                    <tr>
                      <th className="py-1.5 px-2">Composant de la nomenclature</th>
                      <th className="py-1.5 px-2 text-right">Besoin théorique</th>
                      <th className="py-1.5 px-2 text-right">Perte théo.</th>
                      <th className="py-1.5 px-2 text-right">Stock disponible</th>
                      <th className="py-1.5 px-2 text-right">Couverture</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {theoreticalNeeds.map((need, idx) => (
                      <tr key={`${need.ingredient.itemId}-${idx}`} className="bg-white dark:bg-slate-900">
                        <td className="py-1.5 px-2">
                          <span className="font-mono text-blue-600 dark:text-blue-400">
                            {need.ingredient.itemCode}
                          </span>
                          <span className="text-slate-500"> · {need.ingredient.designation}</span>
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                          {need.need.toLocaleString()} {need.ingredient.unit}
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono text-slate-500">
                          {need.lossPercent ? `${need.lossPercent} %` : '—'}
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono text-slate-600 dark:text-slate-300">
                          {need.stock.toLocaleString()} {need.ingredient.unit}
                        </td>
                        <td
                          className={`py-1.5 px-2 text-right font-semibold ${
                            need.isSufficient ? 'text-emerald-600' : 'text-red-600'
                          }`}
                        >
                          {need.isSufficient ? '✓' : '✕'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {!canLaunchOrder && hasValidNomenclature && (
              <div className="flex items-center gap-2 p-2.5 bg-red-50 dark:bg-red-950/40 rounded-lg border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  Attention : Les stocks disponibles ne couvrent pas l'intégralité du besoin théorique. L'OF sera créé au statut "Planifié" en attente de réapprovisionnement.
                </span>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsNewOrderModalOpen(false)}
              className="px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={!hasValidNomenclature}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-blue-600"
            >
              Créer &amp; Ordonnancer l'OF
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
