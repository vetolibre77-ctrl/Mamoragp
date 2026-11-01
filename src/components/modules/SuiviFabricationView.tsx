/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * MAMORA GP — Suivi de Fabrication par Étapes (1 à 17)
 * Rapprochement automatique des entrées/sorties, rendements et pertes
 */

import React, { useState } from 'react';
import { WorkOrder, ManufacturingStepLog } from '../../types';
import { storage } from '../../services/storage';
import { CANNING_17_STEPS_REFERENCE } from '../../data/initialData';
import { StatusBadge } from '../common/StatusBadge';
import { Modal } from '../common/Modal';
import { CheckSquare, Plus, ArrowRight, Clock, AlertTriangle, Layers, Play, CheckCircle } from 'lucide-react';

interface SuiviFabricationViewProps {
  workOrders: WorkOrder[];
  stepLogs: ManufacturingStepLog[];
  currentUserName: string;
  selectedWorkOrderId?: string;
}

export const SuiviFabricationView: React.FC<SuiviFabricationViewProps> = ({
  workOrders,
  stepLogs,
  currentUserName,
  selectedWorkOrderId,
}) => {
  const [activeOrderId, setActiveOrderId] = useState<string>(
    selectedWorkOrderId || workOrders[0]?.id || ''
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStepNumber, setSelectedStepNumber] = useState(1);

  // Formulaire nouvelle saisie d'étape
  const [operatorName, setOperatorName] = useState(currentUserName);
  const [inputQuantityKg, setInputQuantityKg] = useState('');
  const [outputQuantityKg, setOutputQuantityKg] = useState('');
  const [wasteKg, setWasteKg] = useState('');
  const [stopTimeMinutes, setStopTimeMinutes] = useState('0');
  const [stopReason, setStopReason] = useState('');
  const [measuredParamKey, setMeasuredParamKey] = useState('Température (°C)');
  const [measuredParamVal, setMeasuredParamVal] = useState('');
  const [stepStatus, setStepStatus] = useState<ManufacturingStepLog['status']>('TERMINE');

  const activeOrder = workOrders.find(wo => wo.id === activeOrderId);
  const activeOrderLogs = stepLogs.filter(log => log.workOrderId === activeOrderId);

  const handleCreateStepLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrder) return;

    const stepRef = CANNING_17_STEPS_REFERENCE.find(s => s.stepNumber === selectedStepNumber);
    const inQty = Number(inputQuantityKg) || 0;
    const outQty = Number(outputQuantityKg) || 0;
    const yieldPct = inQty > 0 ? Number(((outQty / inQty) * 100).toFixed(1)) : 100;

    storage.addStepLog({
      workOrderId: activeOrder.id,
      stepNumber: selectedStepNumber,
      stepName: stepRef?.stepName || `Étape ${selectedStepNumber}`,
      startTime: new Date(Date.now() - 3600 * 1000).toISOString(),
      endTime: new Date().toISOString(),
      operator: operatorName,
      lineOrEquipment: activeOrder.lineId,
      inputQuantityKg: inQty,
      outputQuantityKg: outQty,
      yieldPercent: yieldPct,
      wasteKg: Number(wasteKg) || 0,
      stopTimeMinutes: Number(stopTimeMinutes) || 0,
      stopReason: stopReason || undefined,
      measuredParameters: { [measuredParamKey]: measuredParamVal },
      isControlled: true,
      controllerName: currentUserName,
      status: stepStatus,
    });

    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Sélecteur de l'Ordre de Fabrication actif */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-blue-600" />
            <span>Suivi d'Atelier — 17 Étapes de Transformation</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Journalisation des flux matières, rendements, temps d'arrêts et réconciliation entrées/sorties
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
            Sélection de l'OF :
          </label>
          <select
            value={activeOrderId}
            onChange={e => setActiveOrderId(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono font-bold text-blue-600 dark:text-blue-400 cursor-pointer"
          >
            {workOrders.length === 0 ? (
              <option value="">Aucun OF actif disponible</option>
            ) : (
              workOrders.map(wo => (
                <option key={wo.id} value={wo.id}>
                  {wo.orderNumber} — {wo.productName} ({wo.status})
                </option>
              ))
            )}
          </select>
          <button
            onClick={() => setIsModalOpen(true)}
            disabled={workOrders.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Valider une Étape</span>
          </button>
        </div>
      </div>

      {/* État vide si aucun OF */}
      {!activeOrder && (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-400">
          <Layers className="w-10 h-10 mx-auto mb-2 opacity-30 text-slate-400" />
          <p className="font-semibold text-slate-700 dark:text-slate-300">Aucun ordre de fabrication actif</p>
          <p className="text-xs text-slate-400 mt-1">Créez d'abord un ordre de fabrication pour consigner les 17 étapes de production et leurs rendements.</p>
        </div>
      )}

      {/* Synthèse de l'OF sélectionné */}
      {activeOrder && (
        <div className="p-5 bg-slate-900 text-white rounded-xl shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div>
              <span className="text-[11px] font-mono text-blue-400 font-bold">
                {activeOrder.orderNumber} · {activeOrder.lineId}
              </span>
              <h3 className="text-base font-bold text-white mt-0.5">{activeOrder.productName}</h3>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={activeOrder.status} size="sm" />
              <span className="text-xs text-slate-400">Chef : {activeOrder.teamLeader}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
            <div>
              <span className="text-[10px] text-slate-400 block font-sans">Quantité Prévue</span>
              <strong className="text-sm text-slate-100">{activeOrder.plannedCansQty.toLocaleString()} boîtes</strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-sans">Quantité Réalisée</span>
              <strong className="text-sm text-blue-400">{activeOrder.actualCansQty.toLocaleString()} boîtes</strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-sans">Lot Poisson Traité</span>
              <strong className="text-sm text-slate-100">{activeOrder.assignedRawBatchId}</strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-sans">Rendement Matière Net</span>
              <strong className="text-sm text-emerald-400">
                {activeOrder.rawMaterialYieldPercent ? `${activeOrder.rawMaterialYieldPercent}%` : 'En cours'}
              </strong>
            </div>
          </div>
        </div>
      )}

      {/* Visualisation des 17 Étapes Industrielles */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 space-y-6">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-600" />
          <span>Diagramme de Suivi des 17 Étapes (Conserverie Appertisée)</span>
        </h3>

        <div className="space-y-3">
          {CANNING_17_STEPS_REFERENCE.map(step => {
            const matchedLog = activeOrderLogs.find(l => l.stepNumber === step.stepNumber);
            const isFinished = matchedLog && matchedLog.status === 'TERMINE';
            const isRunning = matchedLog && matchedLog.status === 'EN_COURS';

            return (
              <div
                key={step.stepNumber}
                className={`p-4 rounded-xl border transition-all ${
                  isFinished
                    ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-950/20'
                    : isRunning
                    ? 'border-blue-300 dark:border-blue-700 bg-blue-50/40 dark:bg-blue-950/30 ring-1 ring-blue-500'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/30 opacity-75'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold font-mono shrink-0 ${
                        isFinished
                          ? 'bg-emerald-600 text-white'
                          : isRunning
                          ? 'bg-blue-600 text-white animate-pulse'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {step.stepNumber}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          {step.stepName}
                        </h4>
                        {step.stepNumber === 11 && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                            Point Critique Métrologique
                          </span>
                        )}
                        {step.stepNumber === 13 && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300">
                            CCP-1 (Stérilisation)
                          </span>
                        )}
                        {step.stepNumber === 14 && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                            PRPo-2 (Eau Chlorée)
                          </span>
                        )}
                      </div>
                      {matchedLog && (
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Opérateur : <strong>{matchedLog.operator}</strong> · Équipement :{' '}
                          {matchedLog.lineOrEquipment}
                        </p>
                      )}
                    </div>
                  </div>

                  {matchedLog ? (
                    <div className="flex items-center gap-4 text-xs font-mono">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 font-sans block">Entrée / Sortie</span>
                        <strong className="text-slate-800 dark:text-slate-200">
                          {matchedLog.inputQuantityKg} / {matchedLog.outputQuantityKg}
                        </strong>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 font-sans block">Rendement</span>
                        <strong className="text-emerald-600 dark:text-emerald-400 font-bold">
                          {matchedLog.yieldPercent}%
                        </strong>
                      </div>
                      {matchedLog.wasteKg > 0 && (
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 font-sans block">Déchets / Rebuts</span>
                          <span className="text-amber-600">{matchedLog.wasteKg} kg</span>
                        </div>
                      )}
                      <StatusBadge status={matchedLog.status} size="sm" />
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400 italic">En attente d'exécution</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal Validation d'Étape */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Validation d'une Étape de Fabrication"
        subtitle={`OF concerné : ${activeOrder?.orderNumber} — ${activeOrder?.productName}`}
      >
        <form onSubmit={handleCreateStepLog} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
              Étape à Enregistrer *
            </label>
            <select
              value={selectedStepNumber}
              onChange={e => setSelectedStepNumber(Number(e.target.value))}
              className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden"
            >
              {CANNING_17_STEPS_REFERENCE.map(s => (
                <option key={s.stepNumber} value={s.stepNumber}>
                  Étape {s.stepNumber} : {s.stepName}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Opérateur / Équipe Responsable *
              </label>
              <input
                type="text"
                required
                value={operatorName}
                onChange={e => setOperatorName(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Statut de l'Étape *
              </label>
              <select
                value={stepStatus}
                onChange={e => setStepStatus(e.target.value as ManufacturingStepLog['status'])}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden"
              >
                <option value="TERMINE">Terminé (Validé)</option>
                <option value="EN_COURS">En cours d'exécution</option>
                <option value="ALERTE">Alerte / Dérive signalée</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Quantité Entrante (kg ou boîtes)
              </label>
              <input
                type="number"
                value={inputQuantityKg}
                onChange={e => setInputQuantityKg(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Quantité Sortante Conforme
              </label>
              <input
                type="number"
                value={outputQuantityKg}
                onChange={e => setOutputQuantityKg(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Pertes / Rebuts (kg)
              </label>
              <input
                type="number"
                value={wasteKg}
                onChange={e => setWasteKg(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-700">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Paramètre Métrologique Relevé
              </label>
              <input
                type="text"
                value={measuredParamKey}
                onChange={e => setMeasuredParamKey(e.target.value)}
                className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Valeur Mesurée
              </label>
              <input
                type="text"
                value={measuredParamVal}
                onChange={e => setMeasuredParamVal(e.target.value)}
                className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-mono focus:outline-hidden"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer"
            >
              Enregistrer l'Étape &amp; Calculer Rendement
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
