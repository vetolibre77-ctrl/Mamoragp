/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * MAMORA GP — Dossiers de Lots & Libération Sanitaire Officielle
 * Conforme ISO 22000 § 8.9 (Libération sous Autorité Exclusive du Responsable Qualité)
 */

import React, { useState } from 'react';
import { FinishedBatch, BatchReleaseStatus } from '../../types';
import { storage } from '../../services/storage';
import { StatusBadge } from '../common/StatusBadge';
import { Modal } from '../common/Modal';
import { FileCheck2, ShieldCheck, Search, Filter, AlertOctagon, CheckCircle, Lock, Calendar, Box } from 'lucide-react';

interface DossiersLotsViewProps {
  finishedBatches: FinishedBatch[];
  currentUserName: string;
  currentUserRole: string;
}

export const DossiersLotsView: React.FC<DossiersLotsViewProps> = ({
  finishedBatches,
  currentUserName,
  currentUserRole,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modal Libération
  const [selectedBatchForRelease, setSelectedBatchForRelease] = useState<FinishedBatch | null>(null);
  const [newReleaseStatus, setNewReleaseStatus] = useState<BatchReleaseStatus>('LIBERE');
  const [releaseNotes, setReleaseNotes] = useState('');

  const isQualityAuthorized =
    currentUserRole === 'RESPONSABLE_QUALITE' ||
    currentUserRole === 'ADMIN' ||
    currentUserRole === 'DIRECTEUR_USINE';

  const filteredBatches = finishedBatches.filter(b => {
    const matchesSearch =
      b.batchNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.warehouseLocation.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || b.releaseStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleReleaseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatchForRelease) return;

    storage.releaseFinishedBatch(
      selectedBatchForRelease.id,
      `${currentUserName} (${currentUserRole})`,
      newReleaseStatus,
      releaseNotes
    );

    setSelectedBatchForRelease(null);
    setReleaseNotes('');
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-blue-600" />
            <span>Dossiers de Fabrication &amp; Libération des Lots (ISO 22000)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Revue collégiale des preuves de conformité (Sertissage, Autoclaves, Étuve) avant autorisation de vente
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500">Habilitation Libération :</span>
          {isQualityAuthorized ? (
            <span className="px-2.5 py-1 font-semibold rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Autorisé (Profil {currentUserRole})</span>
            </span>
          ) : (
            <span className="px-2.5 py-1 font-medium rounded bg-slate-100 text-slate-500 border border-slate-200 flex items-center gap-1">
              <Lock className="w-3.5 h-3.5" />
              <span>Lecture seule (Rôle Qualité requis)</span>
            </span>
          )}
        </div>
      </div>

      {/* Barre de recherche et filtres */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher par numéro de lot fini, produit, emplacement..."
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
            <option value="ALL">Tous les états de libération</option>
            <option value="LIBERE">Libéré pour Vente (ISO 22000)</option>
            <option value="EN_ATTENTE">En attente d'étuvage</option>
            <option value="BLOQUE">Bloqué / Quarantaine</option>
            <option value="REJETE">Rejeté</option>
          </select>
        </div>
      </div>

      {/* Liste des dossiers de lots finis */}
      <div className="space-y-4">
        {filteredBatches.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-400">
            <FileCheck2 className="w-10 h-10 mx-auto mb-2 opacity-30 text-slate-400" />
            <p className="font-semibold text-slate-700 dark:text-slate-300">Aucun dossier de lot fini enregistré</p>
            <p className="text-xs text-slate-400 mt-1">Les dossiers de lots sont créés à l'issue de la mise en incubation et du contrôle des conserves fabriquées.</p>
          </div>
        ) : (
          filteredBatches.map(batch => {
          const allChecksPass =
            batch.seamingChecked &&
            batch.autoclaveCycleConforming &&
            batch.incubationTestPassed &&
            batch.chemicalAndHistaminePassed;

          return (
            <div
              key={batch.id}
              className="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between pb-4 border-b border-slate-200 dark:border-slate-800 gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-blue-600 dark:text-blue-400">
                      {batch.batchNumber}
                    </span>
                    <StatusBadge status={batch.releaseStatus} size="sm" />
                    <span className="text-xs text-slate-400">·</span>
                    <span className="text-xs text-slate-500 font-mono">OF : {batch.workOrderId}</span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    {batch.productName} ({batch.format})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Date Fab : <strong>{batch.productionDate}</strong> · DDM / DLUO :{' '}
                    <strong>{batch.bestBeforeDate}</strong> · Emplacement :{' '}
                    <strong>{batch.warehouseLocation}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {isQualityAuthorized && (
                    <button
                      onClick={() => {
                        setSelectedBatchForRelease(batch);
                        setNewReleaseStatus(batch.releaseStatus);
                      }}
                      className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors cursor-pointer"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>Statuer sur la Libération</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Rapprochement des quantités */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-400 font-sans block font-semibold uppercase">
                    Boîtes Conformes
                  </span>
                  <div className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1">
                    {batch.conformingCans.toLocaleString()} boîtes
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-400 font-sans block font-semibold uppercase">
                    Cartons / Palettes
                  </span>
                  <div className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1">
                    {batch.totalCartons} cartons ({batch.totalPallets} pal.)
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-400 font-sans block font-semibold uppercase">
                    Rebuts d'Atelier
                  </span>
                  <div className="text-base font-bold text-slate-700 dark:text-slate-300 mt-1">
                    {batch.rejectedCans} boîtes
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-400 font-sans block font-semibold uppercase">
                    État Dossier Sanitaire
                  </span>
                  <div
                    className={`text-base font-bold mt-1 ${
                      allChecksPass ? 'text-emerald-600' : 'text-amber-600'
                    }`}
                  >
                    {allChecksPass ? '100% Complet' : 'En attente épreuves'}
                  </div>
                </div>
              </div>

              {/* Grille de conformité documentaire préalable à la libération */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                <span className="font-semibold text-slate-900 dark:text-slate-100 block text-[10px] uppercase tracking-wider">
                  Contrôles Requis pour la Libération Commerciale (ISO 22000 § 8.9)
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div
                    className={`p-2 rounded border flex items-center gap-1.5 ${
                      batch.seamingChecked
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 text-emerald-800 dark:text-emerald-300'
                        : 'bg-red-50 dark:bg-red-950/40 border-red-200 text-red-800'
                    }`}
                  >
                    <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>Contrôle Sertissage : {batch.seamingChecked ? 'Conforme' : 'Non validé'}</span>
                  </div>

                  <div
                    className={`p-2 rounded border flex items-center gap-1.5 ${
                      batch.autoclaveCycleConforming
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 text-emerald-800 dark:text-emerald-300'
                        : 'bg-red-50 dark:bg-red-950/40 border-red-200 text-red-800'
                    }`}
                  >
                    <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>Barème Autoclave ($F_0$) : {batch.autoclaveCycleConforming ? 'Conforme' : 'Dérive'}</span>
                  </div>

                  <div
                    className={`p-2 rounded border flex items-center gap-1.5 ${
                      batch.incubationTestPassed
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 text-emerald-800 dark:text-emerald-300'
                        : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 text-amber-800 dark:text-amber-300'
                    }`}
                  >
                    <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>Épreuve Étuve 7j (Stabilité) : {batch.incubationTestPassed ? 'Conforme' : 'En cours'}</span>
                  </div>

                  <div
                    className={`p-2 rounded border flex items-center gap-1.5 ${
                      batch.chemicalAndHistaminePassed
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 text-emerald-800 dark:text-emerald-300'
                        : 'bg-red-50 dark:bg-red-950/40 border-red-200 text-red-800'
                    }`}
                  >
                    <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>Histamine &amp; Chlorures : {batch.chemicalAndHistaminePassed ? 'Conforme' : 'Hors limites'}</span>
                  </div>
                </div>
              </div>

              {batch.releaseNotes && (
                <div className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/30 p-2.5 rounded border border-slate-200 dark:border-slate-800">
                  <strong>Visa Qualité :</strong> {batch.releaseNotes}
                  {batch.releasedBy && (
                    <span className="block text-[11px] text-slate-500 mt-0.5">
                      Par : <strong>{batch.releasedBy}</strong> le{' '}
                      {batch.releaseDate && new Date(batch.releaseDate).toLocaleString('fr-FR')}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        }))}
      </div>

      {/* Modal Décision de Libération Sanitaire Officielle */}
      <Modal
        isOpen={!!selectedBatchForRelease}
        onClose={() => setSelectedBatchForRelease(null)}
        title="Décision de Libération Sanitaire de Lot Fini"
        subtitle={`Lot : ${selectedBatchForRelease?.batchNumber} · Produit : ${selectedBatchForRelease?.productName}`}
      >
        <form onSubmit={handleReleaseSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
              Décision de Libération *
            </label>
            <select
              value={newReleaseStatus}
              onChange={e => setNewReleaseStatus(e.target.value as BatchReleaseStatus)}
              className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden font-bold"
            >
              <option value="LIBERE">LIBÉRÉ (Conforme pour expédition et commercialisation)</option>
              <option value="EN_ATTENTE">EN ATTENTE (Maintien en observation / incubation)</option>
              <option value="BLOQUE">BLOQUÉ (Suspicion de non-conformité sanitaire)</option>
              <option value="REJETE">REJETÉ (Destruction / Non appertisé)</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
              Visa Qualité, Références d'Analyses &amp; Observations *
            </label>
            <textarea
              required
              rows={3}
              placeholder="Renseignez le numéro du rapport de laboratoire, la validation du diagramme d'autoclave et l'avis du Responsable Qualité..."
              value={releaseNotes}
              onChange={e => setReleaseNotes(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden"
            />
          </div>

          <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-lg border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300 text-xs">
            <strong>Règle d'intégrité ISO 22000 :</strong> Cette décision engage la responsabilité de la direction qualité. Dès qu'un lot est libéré, il devient immédiatement allouable dans le module Commercial pour la préparation des Bons de Livraison.
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setSelectedBatchForRelease(null)}
              className="px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer"
            >
              Signer Électroniquement &amp; Enregistrer
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
