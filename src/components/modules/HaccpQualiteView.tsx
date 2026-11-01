/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * MAMORA GP — Surveillance des Points Critiques HACCP & PRPo
 * Système de Management de la Sécurité des Denrées Alimentaires ISO 22000:2018
 */

import React, { useState } from 'react';
import { HaccpMonitoringRecord } from '../../types';
import { storage } from '../../services/storage';
import { StatusBadge } from '../common/StatusBadge';
import { Modal } from '../common/Modal';
import { ShieldCheck, Plus, AlertTriangle, CheckCircle, Clock, Thermometer, Droplet, Search } from 'lucide-react';

interface HaccpQualiteViewProps {
  haccpRecords: HaccpMonitoringRecord[];
  currentUserName: string;
}

export const HaccpQualiteView: React.FC<HaccpQualiteViewProps> = ({ haccpRecords, currentUserName }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'CCP' | 'PRPO'>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Formulaire nouveau relevé
  const [pointRef, setPointRef] = useState('CCP-1');
  const [pointName, setPointName] = useState('Stérilisation Autoclave (Valeur F0)');
  const [stepName, setStepName] = useState('Traitement thermique des conserves');
  const [parameterName, setParameterName] = useState('Valeur F0 atteinte');
  const [measuredValue, setMeasuredValue] = useState('');
  const [unit, setUnit] = useState('min');
  const [critMin, setCritMin] = useState('14.5');
  const [critMax, setCritMax] = useState('');
  const [correctiveAction, setCorrectiveAction] = useState('');

  const filteredRecords = haccpRecords.filter(r => {
    const matchesSearch =
      r.referenceId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.pointName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.parameterName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'ALL' || r.type === filterType;
    return matchesSearch && matchesType;
  });

  const handlePointChange = (val: string) => {
    setPointRef(val);
    setMeasuredValue('');
    if (val === 'CCP-1') {
      setPointName('Stérilisation Autoclave (Valeur F0)');
      setStepName('Traitement thermique des conserves');
      setParameterName('Valeur F0');
      setUnit('min');
      setCritMin('14.5');
      setCritMax('');
    } else if (val === 'CCP-2') {
      setPointName('Contrôle Croisure Sertissage');
      setStepName('Sertissage des boîtes');
      setParameterName('Croisure');
      setUnit('%');
      setCritMin('50.0');
      setCritMax('');
    } else if (val === 'PRPo-1') {
      setPointName('Délai d\'Attente Emboîtage-Sertissage');
      setStepName('Remplissage & Jusage');
      setParameterName('Temps d\'attente');
      setUnit('min');
      setCritMin('');
      setCritMax('45.0');
    } else if (val === 'PRPo-2') {
      setPointName('Chlore Libre Eau Refroidissement Autoclave');
      setStepName('Refroidissement post-stérilisation');
      setParameterName('Concentration chlore libre');
      setUnit('ppm');
      setCritMin('0.5');
      setCritMax('2.0');
    }
  };

  const handleCreateRecord = (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(measuredValue);
    const min = critMin ? Number(critMin) : undefined;
    const max = critMax ? Number(critMax) : undefined;

    let isComp = true;
    if (min !== undefined && val < min) isComp = false;
    if (max !== undefined && val > max) isComp = false;

    storage.addHaccpRecord({
      referenceId: pointRef,
      type: pointRef.startsWith('CCP') ? 'CCP' : 'PRPO',
      pointName,
      stepName,
      timestamp: new Date().toISOString(),
      parameterName,
      measuredValue: val,
      unit,
      criticalLimitMin: min,
      criticalLimitMax: max,
      isCompliant: isComp,
      operatorName: currentUserName,
      reviewedByQuality: true,
      correctiveAction: correctiveAction || undefined,
    });

    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            <span>Plan HACCP &amp; Surveillance des CCP / PRPo (ISO 22000)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Suivi des limites critiques validées, détection des dérives et déclenchement automatique des alertes sanitaires
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Saisir un Relevé CCP / PRPo</span>
        </button>
      </div>

      {/* Cartes récapitulatives des CCP & PRPo d'usine */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-red-200 dark:border-red-900 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300">
              CCP-1
            </span>
            <span className="text-[10px] text-slate-400 font-semibold uppercase">Stérilisation</span>
          </div>
          <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 mt-2">
            Valeur Stérilisatrice $F_0$
          </h4>
          <p className="text-xs text-slate-500">
            Limite critique : <strong>$F_0 \ge 14.5$ min</strong> à cœur (Clostridium botulinum).
          </p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-red-200 dark:border-red-900 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300">
              CCP-2
            </span>
            <span className="text-[10px] text-slate-400 font-semibold uppercase">Sertissage</span>
          </div>
          <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 mt-2">
            Étanchéité &amp; Croisure Serti
          </h4>
          <p className="text-xs text-slate-500">
            Limite critique : <strong>Croisure $\ge 50\%$</strong> et <strong>Serrage $\ge 70\%$</strong>.
          </p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-amber-200 dark:border-amber-900 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
              PRPo-1
            </span>
            <span className="text-[10px] text-slate-400 font-semibold uppercase">Atelier</span>
          </div>
          <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 mt-2">
            Temps d'Attente Avant Serti
          </h4>
          <p className="text-xs text-slate-500">
            Limite opérationnelle : <strong>Délai maximal $\le 45$ min</strong> post-emboîtage.
          </p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-amber-200 dark:border-amber-900 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
              PRPo-2
            </span>
            <span className="text-[10px] text-slate-400 font-semibold uppercase">Eau Autoclave</span>
          </div>
          <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 mt-2">
            Chlore Libre Résiduel
          </h4>
          <p className="text-xs text-slate-500">
            Limite opérationnelle : <strong>0.5 à 2.0 ppm</strong> chlore libre actif.
          </p>
        </div>
      </div>

      {/* Tableau des relevés */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-slate-500 font-semibold">
              <tr>
                <th className="py-3 px-4">Point de Maîtrise</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Paramètre Surveillé</th>
                <th className="py-3 px-4">Date &amp; Heure</th>
                <th className="py-3 px-4 text-right">Valeur Mesurée</th>
                <th className="py-3 px-4">Limites Applicables</th>
                <th className="py-3 px-4">Conformité</th>
                <th className="py-3 px-4">Opérateur / Visa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <ShieldCheck className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="font-semibold text-slate-700 dark:text-slate-300">Aucun relevé HACCP enregistré</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Enregistrez une mesure en cliquant sur « Enregistrer Relevé HACCP ».</p>
                  </td>
                </tr>
              ) : (
                filteredRecords.map(rec => (
                <tr key={rec.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                  <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                    {rec.referenceId} — {rec.pointName}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        rec.type === 'CCP'
                          ? 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300'
                          : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                      }`}
                    >
                      {rec.type}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                    {rec.parameterName}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-500">
                    {new Date(rec.timestamp).toLocaleTimeString('fr-FR')}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                    {rec.measuredValue} {rec.unit}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                    {rec.criticalLimitMin !== undefined && `≥ ${rec.criticalLimitMin} `}
                    {rec.criticalLimitMax !== undefined && `≤ ${rec.criticalLimitMax} `}
                    {rec.unit}
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={rec.isCompliant ? 'VALIDE' : 'NON_CONFORME'} size="sm" />
                  </td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                    {rec.operatorName} {rec.reviewedByQuality && '✓'}
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Saisie Relevé HACCP */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Saisie d'un Relevé de Surveillance HACCP / PRPo"
        subtitle="Enregistrement officiel horodaté conforme ISO 22000 § 8.5"
      >
        <form onSubmit={handleCreateRecord} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
              Point de Maîtrise *
            </label>
            <select
              value={pointRef}
              onChange={e => handlePointChange(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden"
            >
              <option value="CCP-1">CCP-1 : Stérilisation Autoclave (Valeur F0 &gt; 14.5 min)</option>
              <option value="CCP-2">CCP-2 : Sertissage (Croisure &gt; 50%, Serrage &gt; 70%)</option>
              <option value="PRPo-1">PRPo-1 : Délai d'attente avant sertissage (&lt; 45 min)</option>
              <option value="PRPo-2">PRPo-2 : Chlore libre eau refroidissement (0.5 - 2.0 ppm)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Paramètre Surveillé
              </label>
              <input
                type="text"
                value={parameterName}
                onChange={e => setParameterName(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Valeur Mesurée *
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.1"
                  required
                  value={measuredValue}
                  onChange={e => setMeasuredValue(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono font-bold focus:outline-hidden"
                />
                <span className="text-slate-500 font-mono">{unit}</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
              Action Corrective Immédiate (si dérive)
            </label>
            <input
              type="text"
              placeholder="ex: Ajustement vanne de régulation chlore / Mise en attente panier..."
              value={correctiveAction}
              onChange={e => setCorrectiveAction(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden"
            />
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
              Valider le Relevé
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
