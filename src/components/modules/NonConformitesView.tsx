/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * MAMORA GP — Fiches de Non-Conformités & Actions Correctives
 * Conforme ISO 22000 § 8.9 (Maîtrise des Produits et Processus Non Conformes & 5M)
 */

import React, { useState } from 'react';
import { NonConformity, NonConformitySeverity } from '../../types';
import { storage } from '../../services/storage';
import { StatusBadge } from '../common/StatusBadge';
import { Modal } from '../common/Modal';
import { AlertOctagon, Plus, Search, Filter, ShieldAlert, CheckCircle, Lock, Unlock, FileText } from 'lucide-react';

interface NonConformitesViewProps {
  nonConformities: NonConformity[];
  currentUserName: string;
}

export const NonConformitesView: React.FC<NonConformitesViewProps> = ({ nonConformities, currentUserName }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Clôture NC
  const [selectedNcForResolution, setSelectedNcForResolution] = useState<NonConformity | null>(null);
  const [finalDisposition, setFinalDisposition] = useState<NonConformity['finalDisposition']>('DECLASSEMENT');
  const [resolutionMotive, setResolutionMotive] = useState('');

  // Nouvelle NC
  const [origin, setOrigin] = useState<NonConformity['origin']>('FABRICATION');
  const [severity, setSeverity] = useState<NonConformitySeverity>('MAJEURE');
  const [affectedBatchId, setAffectedBatchId] = useState('');
  const [affectedQuantity, setAffectedQuantity] = useState('');
  const [unit, setUnit] = useState<NonConformity['unit']>('KG');
  const [description, setDescription] = useState('');
  const [immediateAction, setImmediateAction] = useState('');
  const [quarantineLocation, setQuarantineLocation] = useState('');
  const [responsiblePerson, setResponsiblePerson] = useState('');
  const [deadlineDate, setDeadlineDate] = useState('');

  // Analyse 5M
  const [m1Matiere, setM1Matiere] = useState('');
  const [m2Materiel, setM2Materiel] = useState('');
  const [m3Methode, setM3Methode] = useState('');
  const [m4Milieu, setM4Milieu] = useState('');
  const [m5MainDoeuvre, setM5MainDoeuvre] = useState('');

  const filteredNcs = nonConformities.filter(nc => {
    const matchesSearch =
      nc.ncNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      nc.affectedBatchId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      nc.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSev = filterSeverity === 'ALL' || nc.severity === filterSeverity;
    return matchesSearch && matchesSev;
  });

  const handleCreateNc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !affectedBatchId) return;

    storage.addNonConformity({
      date: new Date().toISOString(),
      origin,
      severity,
      affectedBatchId: affectedBatchId.trim(),
      batchType: 'MATIERE_PREMIERE',
      affectedQuantity: Number(affectedQuantity) || 0,
      unit,
      description: description.trim(),
      causeAnalysis5M: {
        matiere: m1Matiere || undefined,
        materiel: m2Materiel || undefined,
        methode: m3Methode || undefined,
        milieu: m4Milieu || undefined,
        mainDoeuvre: m5MainDoeuvre || undefined,
      },
      immediateAction,
      isQuarantined: true,
      quarantineLocation,
      correctiveActionPlan: 'Analyse des causes racines et plan d\'action préventif engagé.',
      responsiblePerson,
      deadlineDate,
      isResolved: false,
      finalDisposition: 'RETRAITEMENT',
    });

    setIsModalOpen(false);
    setDescription('');
    setM1Matiere('');
    setM2Materiel('');
  };

  const handleResolveNc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNcForResolution) return;

    storage.resolveNonConformity(
      selectedNcForResolution.id,
      currentUserName,
      finalDisposition,
      resolutionMotive
    );

    setSelectedNcForResolution(null);
    setResolutionMotive('');
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <AlertOctagon className="w-5 h-5 text-red-600" />
            <span>Gestion des Non-Conformités &amp; Quarantaines (ISO 22000 § 8.9)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Blocage automatique des lots suspects, méthode d'analyse des causes 5M et levée formelle tracée
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Déclarer une Non-Conformité</span>
        </button>
      </div>

      {/* Recherche & Filtre de gravité */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher par n° fiche NC, lot concerné, description..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden focus:border-blue-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={filterSeverity}
            onChange={e => setFilterSeverity(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden cursor-pointer"
          >
            <option value="ALL">Toutes les gravités</option>
            <option value="CRITIQUE">Critique (Blocage immédiat)</option>
            <option value="MAJEURE">Majeure</option>
            <option value="MINEURE">Mineure</option>
          </select>
        </div>
      </div>

      {/* Cartes détaillées des fiches NC */}
      <div className="space-y-4">
        {filteredNcs.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-400">
            <AlertOctagon className="w-10 h-10 mx-auto mb-2 opacity-30 text-slate-400" />
            <p className="font-semibold text-slate-700 dark:text-slate-300">Aucune non-conformité enregistrée</p>
            <p className="text-xs text-slate-400 mt-1">L'atelier ne présente aucun blocage ou dérive qualité active.</p>
          </div>
        ) : (
          filteredNcs.map(nc => (
            <div
              key={nc.id}
              className={`p-5 rounded-xl border shadow-xs space-y-4 ${
                !nc.isResolved
                  ? 'bg-red-50/20 dark:bg-red-950/20 border-red-300 dark:border-red-900'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-red-600 dark:text-red-400">
                    {nc.ncNumber}
                  </span>
                  <span
                    className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded ${
                      nc.severity === 'CRITIQUE'
                        ? 'bg-red-600 text-white'
                        : nc.severity === 'MAJEURE'
                        ? 'bg-amber-600 text-white'
                        : 'bg-slate-600 text-white'
                    }`}
                  >
                    Gravité : {nc.severity}
                  </span>
                  <span className="text-xs text-slate-400">·</span>
                  <span className="text-xs text-slate-500 font-medium">Origine : {nc.origin}</span>
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Lot concerné : <span className="font-mono">{nc.affectedBatchId}</span> (
                  {nc.affectedQuantity.toLocaleString()} {nc.unit})
                </h3>
              </div>

              <div className="flex items-center gap-2">
                {!nc.isResolved ? (
                  <button
                    onClick={() => {
                      setSelectedNcForResolution(nc);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 rounded-lg shadow-xs transition-colors cursor-pointer"
                  >
                    <Unlock className="w-3.5 h-3.5" />
                    <span>Statuer sur la Disposition / Levée</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Clôturé : {nc.finalDisposition}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Description du problème */}
            <div className="text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
              <strong className="text-slate-900 dark:text-slate-100">Constat &amp; Preuves :</strong>{' '}
              {nc.description}
            </div>

            {/* Quarantaine & Action immédiate */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-red-50 dark:bg-red-950/40 rounded-lg border border-red-200 dark:border-red-900 text-red-800 dark:text-red-300 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <Lock className="w-3.5 h-3.5 text-red-600" />
                  <span>Action Immédiate de Quarantaine</span>
                </div>
                <div>{nc.immediateAction}</div>
                <div className="text-[11px] font-mono text-red-700 dark:text-red-400">
                  Localisation : {nc.quarantineLocation}
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-700 space-y-1 text-slate-700 dark:text-slate-300">
                <span className="font-semibold text-slate-900 dark:text-slate-100 block">
                  Responsable &amp; Échéance de Traitement
                </span>
                <div>Responsable : <strong>{nc.responsiblePerson}</strong></div>
                <div className="text-[11px] text-slate-500 font-mono">
                  Échéance : {nc.deadlineDate}
                </div>
              </div>
            </div>

            {/* Méthode des 5M */}
            {(nc.causeAnalysis5M.matiere || nc.causeAnalysis5M.materiel || nc.causeAnalysis5M.methode) && (
              <div className="p-3 bg-slate-50 dark:bg-slate-800/30 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1 text-xs">
                <span className="font-semibold text-slate-900 dark:text-slate-100 block text-[10px] uppercase">
                  Analyse des Causes Racines (Méthode des 5M)
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-slate-600 dark:text-slate-400">
                  {nc.causeAnalysis5M.matiere && <div><strong>Matière :</strong> {nc.causeAnalysis5M.matiere}</div>}
                  {nc.causeAnalysis5M.materiel && <div><strong>Matériel :</strong> {nc.causeAnalysis5M.materiel}</div>}
                  {nc.causeAnalysis5M.methode && <div><strong>Méthode :</strong> {nc.causeAnalysis5M.methode}</div>}
                  {nc.causeAnalysis5M.milieu && <div><strong>Milieu :</strong> {nc.causeAnalysis5M.milieu}</div>}
                  {nc.causeAnalysis5M.mainDoeuvre && <div><strong>Main-d'œuvre :</strong> {nc.causeAnalysis5M.mainDoeuvre}</div>}
                </div>
              </div>
            )}
          </div>
        )))}
      </div>

      {/* Modal Déclaration de Non-Conformité */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Ouverture d'une Fiche de Non-Conformité ISO 22000 § 8.9"
        subtitle="Blocage automatique du lot, mise en quarantaine et analyse 5M"
      >
        <form onSubmit={handleCreateNc} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Niveau de Gravité *
              </label>
              <select
                value={severity}
                onChange={e => setSeverity(e.target.value as NonConformitySeverity)}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden font-bold"
              >
                <option value="CRITIQUE">CRITIQUE (Arrêt ligne / Blocage sanitaire)</option>
                <option value="MAJEURE">MAJEURE (Écart spécification)</option>
                <option value="MINEURE">MINEURE (Observation d'atelier)</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Origine de l'Incident *
              </label>
              <select
                value={origin}
                onChange={e => setOrigin(e.target.value as NonConformity['origin'])}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden"
              >
                <option value="RECEPTION">Réception Matières Premières</option>
                <option value="FABRICATION">Atelier de Fabrication</option>
                <option value="SERTISSAGE">Sertissage Boîtes</option>
                <option value="STERILISATION">Autoclaves / Stérilisation</option>
                <option value="LABORATOIRE">Laboratoire d'Analyses</option>
                <option value="CLIENT">Réclamation Client</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Lot Bloqué Concerné *
              </label>
              <input
                type="text"
                required
                value={affectedBatchId}
                onChange={e => setAffectedBatchId(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Quantité Bloquée
              </label>
              <input
                type="number"
                value={affectedQuantity}
                onChange={e => setAffectedQuantity(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Unité</label>
              <select
                value={unit}
                onChange={e => setUnit(e.target.value as NonConformity['unit'])}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden"
              >
                <option value="KG">KG</option>
                <option value="BOITE">Boîtes</option>
                <option value="CARTON">Cartons</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
              Description Détaillée du Problème / Écart Constaté *
            </label>
            <textarea
              required
              rows={2}
              placeholder="Décrivez précisément les faits, les valeurs mesurées, la référence du contrôle..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Action Immédiate de Quarantaine
              </label>
              <input
                type="text"
                value={immediateAction}
                onChange={e => setImmediateAction(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Zone / Emplacement Quarantaine
              </label>
              <input
                type="text"
                value={quarantineLocation}
                onChange={e => setQuarantineLocation(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden"
              />
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 space-y-2">
            <span className="text-[10px] font-bold uppercase text-slate-500 block">
              Analyse des Causes (Méthode des 5M)
            </span>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Matière..."
                value={m1Matiere}
                onChange={e => setM1Matiere(e.target.value)}
                className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded"
              />
              <input
                type="text"
                placeholder="Matériel / Équipement..."
                value={m2Materiel}
                onChange={e => setM2Materiel(e.target.value)}
                className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded"
              />
              <input
                type="text"
                placeholder="Méthode / Procédure..."
                value={m3Methode}
                onChange={e => setM3Methode(e.target.value)}
                className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded"
              />
              <input
                type="text"
                placeholder="Main-d'œuvre..."
                value={m5MainDoeuvre}
                onChange={e => setM5MainDoeuvre(e.target.value)}
                className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded"
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
              className="px-4 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg cursor-pointer"
            >
              Créer Fiche NC &amp; Bloquer le Lot
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Résolution & Levée de Non-Conformité */}
      <Modal
        isOpen={!!selectedNcForResolution}
        onClose={() => setSelectedNcForResolution(null)}
        title="Décision de Traitement &amp; Levée de Quarantaine (ISO 22000)"
        subtitle={`Fiche ${selectedNcForResolution?.ncNumber} · Lot : ${selectedNcForResolution?.affectedBatchId}`}
      >
        <form onSubmit={handleResolveNc} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
              Disposition Finale du Lot *
            </label>
            <select
              value={finalDisposition}
              onChange={e => setFinalDisposition(e.target.value as NonConformity['finalDisposition'])}
              className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden font-bold"
            >
              <option value="RETRAITEMENT">Retraitement selon procédure validée</option>
              <option value="DECLASSEMENT">Déclassement (ex: orientation vers alimentation animale)</option>
              <option value="DESTRUCTION">Destruction physique sous procès-verbal</option>
              <option value="LIBERATION_DEROGATION">Libération sous Dérogation Autorisée (Contre-analyses OK)</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
              Justification &amp; Mesures Préventives Appliquées *
            </label>
            <textarea
              required
              rows={3}
              placeholder="Indiquez les preuves de conformité, résultats de recalibration ou référence du PV de destruction..."
              value={resolutionMotive}
              onChange={e => setResolutionMotive(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setSelectedNcForResolution(null)}
              className="px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer"
            >
              Enregistrer la Clôture Formelle
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
