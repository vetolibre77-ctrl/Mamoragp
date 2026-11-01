/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * MAMORA GP — Suivi du Sertissage & Cycles Stérilisation Autoclaves
 * Points critiques métrologiques et CCP-1 de la norme ISO 22000
 */

import React, { useState } from 'react';
import { SeamingInspection, AutoclaveCycle, WorkOrder } from '../../types';
import { storage } from '../../services/storage';
import { StatusBadge } from '../common/StatusBadge';
import { Modal } from '../common/Modal';
import { Flame, ShieldCheck, Plus, CheckCircle, AlertOctagon, Activity, FileText, Thermometer } from 'lucide-react';

interface SertissageAutoclavesViewProps {
  seamingInspections: SeamingInspection[];
  autoclaveCycles: AutoclaveCycle[];
  workOrders: WorkOrder[];
  currentUserName: string;
  currentUserRole: string;
}

export const SertissageAutoclavesView: React.FC<SertissageAutoclavesViewProps> = ({
  seamingInspections,
  autoclaveCycles,
  workOrders,
  currentUserName,
  currentUserRole,
}) => {
  const [activeTab, setActiveTab] = useState<'AUTOCLAVES' | 'SERTISSAGE'>('AUTOCLAVES');

  // Modales
  const [isNewCycleModalOpen, setIsNewCycleModalOpen] = useState(false);
  const [isNewSeamModalOpen, setIsNewSeamModalOpen] = useState(false);

  // Formulaire Autoclave
  const [selectedAutoclave, setSelectedAutoclave] = useState('Autoclave Horizontal Barriquand N° 1');
  const [scheduleRef, setScheduleRef] = useState('BAR-TH-14-121C-50M (ISO/FDA 21 CFR 113)');
  const [targetTempC, setTargetTempC] = useState('121.1');
  const [actualTempC, setActualTempC] = useState('');
  const [holdingDurationMin, setHoldingDurationMin] = useState('');
  const [targetPressureBar, setTargetPressureBar] = useState('2.2');
  const [actualPressureBar, setActualPressureBar] = useState('');
  const [coolingChlorinePpm, setCoolingChlorinePpm] = useState('');
  const [calculatedF0, setCalculatedF0] = useState('');
  const [basketCount, setBasketCount] = useState('');
  const [totalCansLoaded, setTotalCansLoaded] = useState('');

  // Formulaire Sertissage
  const [selectedSeamWo, setSelectedSeamWo] = useState(workOrders[0]?.id || '');
  const [headNumber, setHeadNumber] = useState('1');
  const [seamThickness, setSeamThickness] = useState('');
  const [seamHeight, setSeamHeight] = useState('');
  const [countersink, setCountersink] = useState('');
  const [overlapPct, setOverlapPct] = useState('');
  const [tightnessPct, setTightnessPct] = useState('');

  const handleCreateCycle = (e: React.FormEvent) => {
    e.preventDefault();
    storage.addAutoclaveCycle({
      autoclaveId: selectedAutoclave.includes('1') ? 'EQP-AUTO-01' : 'EQP-AUTO-02',
      autoclaveName: selectedAutoclave,
      workOrderIds: [workOrders[0]?.id || 'WO-2026-104'],
      loadedBatches: ['LOT-PF-NOUVEAU'],
      basketCount: Number(basketCount),
      totalCansLoaded: Number(totalCansLoaded),
      scheduleReference: scheduleRef,
      date: new Date().toISOString().slice(0, 10),
      ventingStartTime: '11:00:00',
      ventingEndTime: '11:12:00',
      ventingTempC: 102.0,
      holdingStartTime: '11:22:00',
      holdingEndTime: '12:12:00',
      targetTempC: Number(targetTempC),
      actualTempMeanC: Number(actualTempC),
      targetHoldingDurationMin: Number(holdingDurationMin),
      actualHoldingDurationMin: Number(holdingDurationMin),
      targetPressureBar: Number(targetPressureBar),
      actualPressureBar: Number(actualPressureBar),
      coolingStartTime: '12:12:00',
      coolingEndTime: '12:35:00',
      coolingWaterChlorinePpm: Number(coolingChlorinePpm),
      waterExitTempC: 36.0,
      calculatedF0: Number(calculatedF0),
      operatorName: `${currentUserName} (Chef de ligne)`,
      isApprovedByQuality: false,
      cycleStatus: 'EN_COURS',
      temperatureCurvePoints: [
        { timeMinute: 0, temperatureC: 25, pressureBar: 0.1 },
        { timeMinute: 15, temperatureC: 115, pressureBar: 1.8 },
        { timeMinute: 30, temperatureC: Number(actualTempC), pressureBar: Number(actualPressureBar) },
        { timeMinute: 45, temperatureC: Number(actualTempC), pressureBar: Number(actualPressureBar) },
        { timeMinute: 60, temperatureC: 45, pressureBar: 0.4 },
      ],
    });
    setIsNewCycleModalOpen(false);
  };

  const handleApproveCycle = (cycleId: string) => {
    storage.approveAutoclaveCycle(cycleId, currentUserName);
  };

  const handleCreateSeamInspection = (e: React.FormEvent) => {
    e.preventDefault();
    const ov = Number(overlapPct);
    const tg = Number(tightnessPct);
    const isConf = ov >= 50.0 && tg >= 70.0;

    storage.addSeamingInspection({
      workOrderId: selectedSeamWo,
      timestamp: new Date().toISOString(),
      lineId: 'LIGNE-THON-01',
      seamerId: 'SERTI-01',
      headNumber: Number(headNumber),
      canReference: 'EMB-BOITE-14CLUB',
      lidBatchNumber: 'LOT-COUV-ALU-091',
      seamThicknessMm: Number(seamThickness),
      seamHeightMm: Number(seamHeight),
      countersinkDepthMm: Number(countersink),
      bodyHookMm: 1.6,
      coverHookMm: 1.62,
      overlapPercent: ov,
      tightnessPercent: tg,
      visualAspectCompliant: isConf,
      wrinkleRating: isConf ? 'CONFORME' : 'DEFAUT',
      inspectorName: currentUserName,
      isConforming: isConf,
    });
    setIsNewSeamModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Flame className="w-5 h-5 text-amber-600" />
            <span>Sertissage &amp; Traitement Thermique (CCP-1)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Surveillance continue des barèmes de stérilisation, validation F0 et contrôle micrométrique du serti
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
            <button
              onClick={() => setActiveTab('AUTOCLAVES')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                activeTab === 'AUTOCLAVES'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              Cycles Autoclaves ({autoclaveCycles.length})
            </button>
            <button
              onClick={() => setActiveTab('SERTISSAGE')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                activeTab === 'SERTISSAGE'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              Contrôles Sertissage ({seamingInspections.length})
            </button>
          </div>

          {activeTab === 'AUTOCLAVES' ? (
            <button
              onClick={() => setIsNewCycleModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nouveau Cycle Autoclave</span>
            </button>
          ) : (
            <button
              onClick={() => setIsNewSeamModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Contrôle Sertissage</span>
            </button>
          )}
        </div>
      </div>

      {activeTab === 'AUTOCLAVES' ? (
        /* VUE CYCLES AUTOCLAVES */
        <div className="space-y-6">
          {autoclaveCycles.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-400">
              <Thermometer className="w-10 h-10 mx-auto mb-2 opacity-30 text-slate-400" />
              <p className="font-semibold text-slate-700 dark:text-slate-300">Aucun cycle d'autoclave enregistré</p>
              <p className="text-xs text-slate-400 mt-1">Lancez un nouveau cycle thermique en cliquant sur « Nouveau Cycle Autoclave ».</p>
            </div>
          ) : (
            autoclaveCycles.map(cycle => (
            <div
              key={cycle.id}
              className="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between pb-4 border-b border-slate-200 dark:border-slate-800 gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-amber-600 dark:text-amber-400">
                      {cycle.cycleNumber}
                    </span>
                    <StatusBadge status={cycle.cycleStatus} size="sm" />
                    <span className="text-xs text-slate-400">·</span>
                    <span className="text-xs text-slate-500 font-medium">Date : {cycle.date}</span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    {cycle.autoclaveName}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Barème officiel appliqué : <strong>{cycle.scheduleReference}</strong> · Charge :{' '}
                    <strong>{cycle.basketCount} paniers</strong> ({cycle.totalCansLoaded.toLocaleString()} boîtes)
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {!cycle.isApprovedByQuality ? (
                    <button
                      onClick={() => handleApproveCycle(cycle.id)}
                      className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors cursor-pointer"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>Valider Cycle (Visa Qualité ISO 22000)</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
                      <CheckCircle className="w-4 h-4" />
                      <span>Approuvé par {cycle.qualityApproverName}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Métriques critiques du barème */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs font-mono">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-400 font-sans block font-semibold uppercase">
                    Température Palier
                  </span>
                  <div className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">
                    {cycle.actualTempMeanC} °C
                  </div>
                  <span className="text-[10px] text-slate-500 font-sans">Cible : {cycle.targetTempC} °C</span>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-400 font-sans block font-semibold uppercase">
                    Durée de Palier
                  </span>
                  <div className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">
                    {cycle.actualHoldingDurationMin} min
                  </div>
                  <span className="text-[10px] text-slate-500 font-sans">Cible : {cycle.targetHoldingDurationMin} min</span>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-400 font-sans block font-semibold uppercase">
                    Valeur Stérilisatrice F0
                  </span>
                  <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                    {cycle.calculatedF0} min
                  </div>
                  <span className="text-[10px] text-emerald-600 font-sans font-semibold">✓ Conforme (F0 ≥ 14.5)</span>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-400 font-sans block font-semibold uppercase">
                    Pression Autoclave
                  </span>
                  <div className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">
                    {cycle.actualPressureBar} bar
                  </div>
                  <span className="text-[10px] text-slate-500 font-sans">Contre-pression air</span>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-400 font-sans block font-semibold uppercase">
                    Chlore Eau Refroid.
                  </span>
                  <div className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">
                    {cycle.coolingWaterChlorinePpm} ppm
                  </div>
                  <span className="text-[10px] text-slate-500 font-sans">PRPo-2 (0.5 - 2.0 ppm)</span>
                </div>
              </div>

              {/* Simulation visuelle de la courbe de stérilisation thermo-manométrique */}
              <div className="p-4 bg-slate-950 text-slate-200 rounded-xl space-y-2 font-mono text-xs">
                <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-800 pb-2">
                  <span className="flex items-center gap-1.5 text-blue-400 font-semibold">
                    <Activity className="w-3.5 h-3.5" />
                    Profil Thermo-Manométrique Enregistré (Purge ➔ Montée ➔ Palier 121.4°C ➔ Refroidissement)
                  </span>
                  <span>Sonde sonde à cœur N° 12</span>
                </div>

                <div className="h-28 flex items-end gap-2 pt-4 px-2">
                  {cycle.temperatureCurvePoints.map((pt, idx) => {
                    const heightPercent = Math.min(100, Math.round((pt.temperatureC / 130) * 100));
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-1 group relative">
                        <div
                          className="w-full bg-blue-500 hover:bg-amber-400 rounded-t transition-all"
                          style={{ height: `${heightPercent}%` }}
                        />
                        <span className="text-[9px] text-slate-500">{pt.timeMinute}m</span>

                        {/* Tooltip */}
                        <div className="absolute -top-10 hidden group-hover:block bg-slate-800 text-white p-1 rounded text-[10px] whitespace-nowrap z-10">
                          {pt.temperatureC}°C · {pt.pressureBar} bar
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )))}
        </div>
      ) : (
        /* VUE CONTRÔLES DE SERTISSAGE */
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-slate-500 font-semibold">
                  <tr>
                    <th className="py-3 px-4">N° Rapport</th>
                    <th className="py-3 px-4">Heure</th>
                    <th className="py-3 px-4">Tête Sertisseuse</th>
                    <th className="py-3 px-4">Épaisseur Serti (mm)</th>
                    <th className="py-3 px-4">Hauteur (mm)</th>
                    <th className="py-3 px-4">Profondeur Cuvette</th>
                    <th className="py-3 px-4">Croisure (%)</th>
                    <th className="py-3 px-4">Serrage (%)</th>
                    <th className="py-3 px-4">Résultat</th>
                    <th className="py-3 px-4">Contrôleur</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {seamingInspections.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-400">
                        <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p className="font-semibold text-slate-700 dark:text-slate-300">Aucun contrôle de sertissage enregistré</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Enregistrez un contrôle métrologique en cliquant sur « Contrôle Sertissage ».</p>
                      </td>
                    </tr>
                  ) : (
                    seamingInspections.map(insp => (
                    <tr key={insp.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                      <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                        {insp.inspectionNumber}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500">
                        {new Date(insp.timestamp).toLocaleTimeString('fr-FR')}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                        Tête N° {insp.headNumber} ({insp.seamerId})
                      </td>
                      <td className="py-3 px-4 font-mono">
                        {insp.seamThicknessMm} mm <span className="text-slate-400 text-[10px]">(1.15±0.05)</span>
                      </td>
                      <td className="py-3 px-4 font-mono">
                        {insp.seamHeightMm} mm
                      </td>
                      <td className="py-3 px-4 font-mono">
                        {insp.countersinkDepthMm} mm
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {insp.overlapPercent} %
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {insp.tightnessPercent} %
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={insp.isConforming ? 'VALIDE' : 'NON_CONFORME'} size="sm" />
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                        {insp.inspectorName}
                      </td>
                    </tr>
                  )))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nouveau Cycle Autoclave */}
      <Modal
        isOpen={isNewCycleModalOpen}
        onClose={() => setIsNewCycleModalOpen(false)}
        title="Enregistrement d'un Nouveau Cycle d'Autoclave"
        subtitle="Saisie des paramètres thermiques réels et affectation des paniers de boîtes"
      >
        <form onSubmit={handleCreateCycle} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Autoclave Sélectionné *
              </label>
              <select
                value={selectedAutoclave}
                onChange={e => setSelectedAutoclave(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden"
              >
                <option value="Autoclave Horizontal Barriquand N° 1">Autoclave Horizontal Barriquand N° 1</option>
                <option value="Autoclave Horizontal Barriquand N° 2">Autoclave Horizontal Barriquand N° 2</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Barème Validé de Référence *
              </label>
              <input
                type="text"
                value={scheduleRef}
                onChange={e => setScheduleRef(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Température Réelle (°C) *
              </label>
              <input
                type="number"
                step="0.1"
                value={actualTempC}
                onChange={e => setActualTempC(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Durée Palier (min) *
              </label>
              <input
                type="number"
                value={holdingDurationMin}
                onChange={e => setHoldingDurationMin(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Valeur F0 Atteinte *
              </label>
              <input
                type="number"
                step="0.1"
                value={calculatedF0}
                onChange={e => setCalculatedF0(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono font-bold text-emerald-600 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Pression (bar)
              </label>
              <input
                type="number"
                step="0.05"
                value={actualPressureBar}
                onChange={e => setActualPressureBar(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Paniers Chargés
              </label>
              <input
                type="number"
                value={basketCount}
                onChange={e => setBasketCount(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Boîtes Chargées
              </label>
              <input
                type="number"
                value={totalCansLoaded}
                onChange={e => setTotalCansLoaded(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono focus:outline-hidden"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsNewCycleModalOpen(false)}
              className="px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg cursor-pointer"
            >
              Enregistrer le Cycle
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Nouveau Contrôle de Sertissage */}
      <Modal
        isOpen={isNewSeamModalOpen}
        onClose={() => setIsNewSeamModalOpen(false)}
        title="Fiche de Contrôle Micrométrique du Sertissage"
        subtitle="Mesures de sertissage selon la méthode approuvée ISO 22000"
      >
        <form onSubmit={handleCreateSeamInspection} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Ordre de Fabrication en cours *
              </label>
              <select
                value={selectedSeamWo}
                onChange={e => setSelectedSeamWo(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden"
              >
                {workOrders.map(wo => (
                  <option key={wo.id} value={wo.id}>
                    {wo.orderNumber} — {wo.productName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Tête de Sertisseuse *
              </label>
              <select
                value={headNumber}
                onChange={e => setHeadNumber(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden"
              >
                <option value="1">Tête N° 1</option>
                <option value="2">Tête N° 2</option>
                <option value="3">Tête N° 3</option>
                <option value="4">Tête N° 4</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Épaisseur Serti (mm) *
              </label>
              <input
                type="number"
                step="0.01"
                value={seamThickness}
                onChange={e => setSeamThickness(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono focus:outline-hidden"
              />
              <span className="text-[10px] text-slate-400">Cible : 1.15 ± 0.05 mm</span>
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Hauteur du Serti (mm) *
              </label>
              <input
                type="number"
                step="0.01"
                value={seamHeight}
                onChange={e => setSeamHeight(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono focus:outline-hidden"
              />
              <span className="text-[10px] text-slate-400">Cible : 2.80 ± 0.10 mm</span>
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Cuvette (mm)
              </label>
              <input
                type="number"
                step="0.01"
                value={countersink}
                onChange={e => setCountersink(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono focus:outline-hidden"
              />
              <span className="text-[10px] text-slate-400">Cible : 3.00 ± 0.15 mm</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-700">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Taux de Croisure (%) *
              </label>
              <input
                type="number"
                step="0.1"
                value={overlapPct}
                onChange={e => setOverlapPct(e.target.value)}
                className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-mono font-bold text-emerald-600 focus:outline-hidden"
              />
              <span className="text-[10px] text-slate-400">Critère : doit être ≥ 50 %</span>
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Taux de Serrage (%) *
              </label>
              <input
                type="number"
                step="0.1"
                value={tightnessPct}
                onChange={e => setTightnessPct(e.target.value)}
                className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-mono font-bold text-emerald-600 focus:outline-hidden"
              />
              <span className="text-[10px] text-slate-400">Critère : doit être ≥ 70 %</span>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsNewSeamModalOpen(false)}
              className="px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer"
            >
              Enregistrer le Contrôle
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
