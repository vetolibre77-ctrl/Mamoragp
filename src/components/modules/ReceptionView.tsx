/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * MAMORA GP — Réception & Agréage Matières Premières
 * Conforme ISO 22000 § 8.5.2.2 (Température, Histamine, Traçabilité Fournisseur)
 */

import React, { useState } from 'react';
import { RawBatchReception, QualityDecision, isFreshSpecies } from '../../types';
import { storage } from '../../services/storage';
import { StatusBadge } from '../common/StatusBadge';
import { Modal } from '../common/Modal';
import { Anchor, Plus, Search, Filter, ShieldCheck, AlertTriangle, Thermometer, FileText, CheckCircle } from 'lucide-react';

interface ReceptionViewProps {
  receptions: RawBatchReception[];
  currentUserName: string;
}

export const ReceptionView: React.FC<ReceptionViewProps> = ({ receptions, currentUserName }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDecision, setFilterDecision] = useState<string>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Formulaire nouvelle réception
  const [supplier, setSupplier] = useState('');
  const [vesselOrOrigin, setVesselOrOrigin] = useState('');
  const [supplierBatchNumber, setSupplierBatchNumber] = useState('');
  const [species, setSpecies] = useState('Thon Albacore (Thunnus albacares)');
  const [orderedQtyKg, setOrderedQtyKg] = useState('');
  const [receivedQtyKg, setReceivedQtyKg] = useState('');
  const [acceptedQtyKg, setAcceptedQtyKg] = useState('');
  const [temperatureAtIntakeC, setTemperatureAtIntakeC] = useState('');
  const [histaminePpm, setHistaminePpm] = useState('');
  const [storageLocation, setStorageLocation] = useState('Chambre Froide N° 1');
  const [decision, setDecision] = useState<QualityDecision>('ACCEPTE');
  const [decisionReason, setDecisionReason] = useState('');

  // Modal dérogation / changement de décision
  const [selectedRecForDecision, setSelectedRecForDecision] = useState<RawBatchReception | null>(null);
  const [newDecision, setNewDecision] = useState<QualityDecision>('ACCEPTE_DEROGATION');
  const [derogationReason, setDerogationReason] = useState('');

  const filteredReceptions = receptions.filter(rec => {
    const matchesSearch =
      rec.receptionNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.internalBatchNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.species.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDecision = filterDecision === 'ALL' || rec.decision === filterDecision;
    return matchesSearch && matchesDecision;
  });

  const handleCreateReception = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplier || !supplierBatchNumber) return;

    storage.addReception({
      supplier: supplier.trim(),
      vesselOrOrigin: vesselOrOrigin.trim() || 'Origine certifiée',
      supplierBatchNumber: supplierBatchNumber.trim(),
      species,
      receptionDate: new Date().toISOString(),
      orderedQtyKg: Number(orderedQtyKg) || 0,
      receivedQtyKg: Number(receivedQtyKg) || 0,
      acceptedQtyKg: Number(acceptedQtyKg) || 0,
      rejectedQtyKg: Math.max(0, Number(receivedQtyKg) - Number(acceptedQtyKg)),
      temperatureAtIntakeC: Number(temperatureAtIntakeC),
      histaminePpm: Number(histaminePpm),
      vehicleCleanlinessCompliant: true,
      documentsAttached: ['Bon_Livraison_Fournisseur.pdf', 'Certificat_Sanitaire_Origine.pdf'],
      intakeOperator: currentUserName,
      qualityInspector: currentUserName,
      storageLocation,
      decision,
      decisionReason: decisionReason || undefined,
      notes: `Réception enregistrée par ${currentUserName} avec contrôle thermo-hygiénique ISO 22000.`,
    });

    setIsModalOpen(false);
    setSupplier('');
    setSupplierBatchNumber('');
    setDecisionReason('');
  };

  const handleUpdateDecisionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecForDecision) return;

    storage.updateReceptionDecision(
      selectedRecForDecision.id,
      newDecision,
      derogationReason,
      newDecision === 'ACCEPTE_DEROGATION' ? currentUserName : undefined
    );

    setSelectedRecForDecision(null);
    setDerogationReason('');
  };

  return (
    <div className="space-y-6">
      {/* Barre d'en-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Anchor className="w-5 h-5 text-blue-600" />
            <span>Réceptions &amp; Agréage Matières Premières</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Contrôles réglementaires à réception (Températures, Histamines, Intégrité véhicule) et génération des lots internes
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Nouvel Arrivage Poisson</span>
        </button>
      </div>

      {/* Filtres & Recherche */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher par n° lot interne, n° lot fournisseur, espèce..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden focus:border-blue-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={filterDecision}
            onChange={e => setFilterDecision(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden cursor-pointer"
          >
            <option value="ALL">Toutes les décisions</option>
            <option value="ACCEPTE">Accepté</option>
            <option value="EN_ATTENTE">En attente contrôle</option>
            <option value="ACCEPTE_DEROGATION">Accepté sous dérogation</option>
            <option value="REFUSE">Refusé</option>
          </select>
        </div>
      </div>

      {/* Grille des réceptions détaillées */}
      <div className="space-y-4">
        {filteredReceptions.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-400">
            <Anchor className="w-10 h-10 mx-auto mb-2 opacity-30 text-slate-400" />
            <p className="font-semibold text-slate-700 dark:text-slate-300">Aucun arrivage de matière première enregistré</p>
            <p className="text-xs text-slate-400 mt-1">Enregistrez un premier arrivage en cliquant sur « Nouvel Arrivage Poisson ».</p>
          </div>
        ) : (
          filteredReceptions.map(rec => {
          const freshIntake = isFreshSpecies(rec.species);
          const isTempConforming = freshIntake
            ? rec.temperatureAtIntakeC <= 2.0
            : rec.temperatureAtIntakeC <= -18.0;
          const isHistamineConforming = rec.histaminePpm < 50.0;

          return (
            <div
              key={rec.id}
              className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-blue-600 dark:text-blue-400">
                      {rec.internalBatchNumber}
                    </span>
                    <StatusBadge status={rec.decision} size="sm" />
                    <span className="text-xs text-slate-400">·</span>
                    <span className="text-xs font-mono text-slate-500">{rec.receptionNumber}</span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    {rec.species}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Fournisseur : <strong>{rec.supplier}</strong> · Lot Bateau/Fournisseur :{' '}
                    <strong className="font-mono">{rec.supplierBatchNumber}</strong> · Provenance :{' '}
                    {rec.vesselOrOrigin}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setSelectedRecForDecision(rec);
                      setNewDecision(rec.decision);
                    }}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                  >
                    Modifier Décision / Dérogation
                  </button>
                </div>
              </div>

              {/* Indicateurs clés métrologiques & sanitaires ISO 22000 */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700/60">
                  <div className="flex items-center justify-between text-slate-400 mb-1">
                    <span className="text-[10px] uppercase font-semibold">Température Réception</span>
                    <Thermometer className="w-3.5 h-3.5" />
                  </div>
                  <div className="font-mono text-base font-bold text-slate-900 dark:text-slate-100">
                    {rec.temperatureAtIntakeC} °C
                  </div>
                  <div
                    className={`text-[10px] font-medium mt-0.5 ${
                      isTempConforming ? 'text-emerald-600' : 'text-red-600'
                    }`}
                  >
                    {isTempConforming
                      ? `✓ Conforme spécification (≤ ${freshIntake ? '+2,0 °C frais' : '-18,0 °C congelé'})`
                      : `⚠ Dérive de température (seuil ≤ ${freshIntake ? '+2,0 °C frais' : '-18,0 °C congelé'})`}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700/60">
                  <div className="flex items-center justify-between text-slate-400 mb-1">
                    <span className="text-[10px] uppercase font-semibold">Histamine (HPLC)</span>
                    <ShieldCheck className="w-3.5 h-3.5" />
                  </div>
                  <div className="font-mono text-base font-bold text-slate-900 dark:text-slate-100">
                    {rec.histaminePpm} ppm
                  </div>
                  <div
                    className={`text-[10px] font-medium mt-0.5 ${
                      isHistamineConforming ? 'text-emerald-600' : 'text-amber-600'
                    }`}
                  >
                    {isHistamineConforming ? '✓ Conforme (< 50 ppm)' : '⚠ Seuil d\'alerte atteint'}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700/60">
                  <div className="text-[10px] uppercase font-semibold text-slate-400 mb-1">
                    Quantité Acceptée
                  </div>
                  <div className="font-mono text-base font-bold text-slate-900 dark:text-slate-100">
                    {rec.acceptedQtyKg.toLocaleString()} kg
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Reçue : {rec.receivedQtyKg.toLocaleString()} kg
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700/60">
                  <div className="text-[10px] uppercase font-semibold text-slate-400 mb-1">
                    Emplacement Stock
                  </div>
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {rec.storageLocation}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Contrôleur : {rec.qualityInspector}
                  </div>
                </div>
              </div>

              {rec.notes && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/30 rounded-lg text-xs text-slate-600 dark:text-slate-400">
                  <strong>Observations agréage :</strong> {rec.notes}
                  {rec.decisionReason && (
                    <div className="mt-1 text-red-600 font-medium">
                      Motif décision : {rec.decisionReason}
                    </div>
                  )}
                  {rec.derogationAuthorizedBy && (
                    <div className="mt-1 text-amber-600 font-medium">
                      Dérogation autorisée par : {rec.derogationAuthorizedBy}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        }))}
      </div>

      {/* Modal Nouvel Arrivage */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Enregistrement d'un Arrivage de Poisson (Matière Première)"
        subtitle="Contrôles réglementaires à réception et attribution de lot interne"
      >
        <form onSubmit={handleCreateReception} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Fournisseur / Armement *
              </label>
              <input
                type="text"
                required
                placeholder="ex: Armement Pêche Océane"
                value={supplier}
                onChange={e => setSupplier(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Lot Fournisseur / Bateau *
              </label>
              <input
                type="text"
                required
                placeholder="ex: SF-ALB-8845"
                value={supplierBatchNumber}
                onChange={e => setSupplierBatchNumber(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Espèce de Poisson *
              </label>
              <select
                value={species}
                onChange={e => setSpecies(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden"
              >
                <option value="Thon Albacore (Thunnus albacares)">Thon Albacore (Thunnus albacares)</option>
                <option value="Thon Listao (Katsuwonus pelamis)">Thon Listao (Katsuwonus pelamis)</option>
                <option value="Sardina pilchardus (Fraîche)">Sardina pilchardus (Fraîche)</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Provenance / Bateau
              </label>
              <input
                type="text"
                placeholder="Zone FAO 37.1 / Chalutier..."
                value={vesselOrOrigin}
                onChange={e => setVesselOrOrigin(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Poids Commandé (kg)
              </label>
              <input
                type="number"
                value={orderedQtyKg}
                onChange={e => setOrderedQtyKg(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Poids Reçu Brut (kg)
              </label>
              <input
                type="number"
                value={receivedQtyKg}
                onChange={e => setReceivedQtyKg(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Poids Accepté Net (kg)
              </label>
              <input
                type="number"
                value={acceptedQtyKg}
                onChange={e => setAcceptedQtyKg(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Température à Réception (°C) *
              </label>
              <input
                type="number"
                step="0.1"
                required
                value={temperatureAtIntakeC}
                onChange={e => setTemperatureAtIntakeC(e.target.value)}
                className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-mono focus:outline-hidden"
              />
              <span className="text-[10px] text-slate-500">Norme : ≤ -18.0°C (congelé) ou ≤ +2.0°C (frais)</span>
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Histamine (ppm) *
              </label>
              <input
                type="number"
                step="0.1"
                required
                value={histaminePpm}
                onChange={e => setHistaminePpm(e.target.value)}
                className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-mono focus:outline-hidden"
              />
              <span className="text-[10px] text-slate-500">Critique si &gt; 50 ppm (Règlement CE/Algérien)</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Emplacement de Stockage *
              </label>
              <input
                type="text"
                required
                value={storageLocation}
                onChange={e => setStorageLocation(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Décision Qualité Initiale *
              </label>
              <select
                value={decision}
                onChange={e => setDecision(e.target.value as QualityDecision)}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden"
              >
                <option value="ACCEPTE">Accepté (Conforme)</option>
                <option value="EN_ATTENTE">En attente contrôle / analyses</option>
                <option value="ACCEPTE_DEROGATION">Accepté sous Dérogation</option>
                <option value="REFUSE">Refusé (Non conforme)</option>
              </select>
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
              Créer Réception &amp; Générer Lot
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Modification de Décision / Dérogation Qualité */}
      <Modal
        isOpen={!!selectedRecForDecision}
        onClose={() => setSelectedRecForDecision(null)}
        title="Statut d'Agréage &amp; Dérogation Qualité (ISO 22000 § 8.9)"
        subtitle={`Lot interne : ${selectedRecForDecision?.internalBatchNumber}`}
      >
        <form onSubmit={handleUpdateDecisionSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
              Nouvelle Décision *
            </label>
            <select
              value={newDecision}
              onChange={e => setNewDecision(e.target.value as QualityDecision)}
              className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden"
            >
              <option value="ACCEPTE">Accepter (Conforme)</option>
              <option value="ACCEPTE_DEROGATION">Accepter sous Dérogation Autorisée</option>
              <option value="EN_ATTENTE">Mettre en Quarantaine / Attente</option>
              <option value="REFUSE">Refuser Définitivement (Rejet)</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
              Motif Détaillé &amp; Justification Technique *
            </label>
            <textarea
              required
              rows={3}
              placeholder="Justifiez la décision prise, résultats de contre-analyses, avis vétérinaire..."
              value={derogationReason}
              onChange={e => setDerogationReason(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setSelectedRecForDecision(null)}
              className="px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer"
            >
              Enregistrer la Décision
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
