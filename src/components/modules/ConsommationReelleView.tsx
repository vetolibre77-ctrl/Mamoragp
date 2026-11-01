/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * MAMORA GP — Module Consommation Réelle, Analyse des Écarts & Rendements
 * Suivi rigoureux des matières premières, ingrédients et emballages (ISO 22000:2018 & GPAO)
 */

import React, { useState, useMemo } from 'react';
import {
  ConsumptionRecord,
  ConsumptionLine,
  ConsumptionLotDetail,
  WorkOrder,
  Recipe,
  Item,
  User,
  UserRole,
  UnitOfMeasure,
} from '../../types';
import { AppDatabase, storage } from '../../services/storage';
import { StatusBadge } from '../common/StatusBadge';
import { Modal } from '../common/Modal';
import {
  Scale,
  TrendingUp,
  PieChart,
  Search,
  Filter,
  Plus,
  CheckCircle,
  AlertTriangle,
  AlertOctagon,
  Clock,
  FileText,
  RotateCcw,
  Layers,
  Factory,
  ChevronRight,
  ShieldCheck,
  Download,
  Printer,
  X,
  Boxes,
  HelpCircle,
  Calendar,
  Hash,
  Eye,
  Edit,
  ArrowRight,
  BarChart3,
  Check,
  ShieldAlert,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  ReferenceLine,
} from 'recharts';

interface ConsommationReelleViewProps {
  db: AppDatabase;
  currentUser: User;
  initialTab?: 'SAISIE' | 'ECARTS' | 'RENDEMENT';
}

export const ConsommationReelleView: React.FC<ConsommationReelleViewProps> = ({
  db,
  currentUser,
  initialTab = 'SAISIE',
}) => {
  const [activeTab, setActiveTab] = useState<'SAISIE' | 'ECARTS' | 'RENDEMENT'>(initialTab);

  // Filtres de recherche
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [lineFilter, setLineFilter] = useState<string>('ALL');
  const [shiftFilter, setShiftFilter] = useState<string>('ALL');
  const [onlyOutOfTolerance, setOnlyOutOfTolerance] = useState<boolean>(false);

  // Modals & Drawers
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedRecordForDetail, setSelectedRecordForDetail] = useState<ConsumptionRecord | null>(null);
  const [selectedRecordForRegularize, setSelectedRecordForRegularize] = useState<ConsumptionRecord | null>(null);
  const [selectedLineForRegularize, setSelectedLineForRegularize] = useState<ConsumptionLine | null>(null);
  const [regularizeQtyInput, setRegularizeQtyInput] = useState<number>(0);
  const [regularizeReasonInput, setRegularizeReasonInput] = useState('');

  // Modal d'annulation
  const [recordToCancel, setRecordToCancel] = useState<ConsumptionRecord | null>(null);
  const [cancelReasonInput, setCancelReasonInput] = useState('');

  // Modal de validation
  const [recordToValidate, setRecordToValidate] = useState<ConsumptionRecord | null>(null);
  const [validationNotesInput, setValidationNotesInput] = useState('');

  // Notifications d'alerte / succès
  const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showAlert = (type: 'success' | 'error', text: string) => {
    setAlertMessage({ type, text });
    setTimeout(() => setAlertMessage(null), 5000);
  };

  // Droits de l'utilisateur
  const canValidate = useMemo(() => {
    const authorized: UserRole[] = ['RESPONSABLE_PRODUCTION', 'RESPONSABLE_QUALITE', 'DIRECTEUR_USINE', 'ADMIN'];
    return authorized.includes(currentUser.role);
  }, [currentUser.role]);

  const canEdit = useMemo(() => {
    const authorized: UserRole[] = ['CHEF_DE_LIGNE', 'RESPONSABLE_PRODUCTION', 'ADMIN'];
    return authorized.includes(currentUser.role);
  }, [currentUser.role]);

  // Nombre de fiches présentant au moins un composant hors tolérance
  const toleranceAlertCount = useMemo(() => {
    const records = db.consumptions || [];
    return records.filter(c =>
      c.lines.some(l => Math.abs(l.percentageVariance) > (l.tolerancePercent ?? 2))
    ).length;
  }, [db.consumptions]);

  // Consommations filtrées
  const filteredConsumptions = useMemo(() => {
    const records = db.consumptions || [];
    return records.filter(c => {
      // Recherche globale texte
      const q = searchTerm.toLowerCase();
      const matchSearch =
        !q ||
        c.consumptionNumber.toLowerCase().includes(q) ||
        c.workOrderNumber.toLowerCase().includes(q) ||
        c.finishedItemName.toLowerCase().includes(q) ||
        c.finishedBatchNumber.toLowerCase().includes(q) ||
        c.recordedBy.toLowerCase().includes(q) ||
        c.lines.some(l => l.designation.toLowerCase().includes(q) || l.itemCode.toLowerCase().includes(q));

      const matchStatus = statusFilter === 'ALL' || c.status === statusFilter;
      const matchLine = lineFilter === 'ALL' || c.lineId === lineFilter;
      const matchShift = shiftFilter === 'ALL' || c.shift === shiftFilter;
      const matchAlert =
        !onlyOutOfTolerance ||
        c.lines.some(l => Math.abs(l.percentageVariance) > (l.tolerancePercent ?? 2));

      return matchSearch && matchStatus && matchLine && matchShift && matchAlert;
    });
  }, [db.consumptions, searchTerm, statusFilter, lineFilter, shiftFilter, onlyOutOfTolerance]);

  // Synthèse des écarts par article (pour Onglet 2)
  const articleVariances = useMemo(() => {
    const map = new Map<
      string,
      {
        itemId: string;
        itemCode: string;
        designation: string;
        category: string;
        unit: string;
        initialTheoreticalTotal: number;
        adjustedTheoreticalTotal: number;
        actualConsumedTotal: number;
        withdrawnTotal: number;
        returnedTotal: number;
        wasteTotal: number;
        count: number;
        causes: string[];
      }
    >();

    (db.consumptions || []).forEach(record => {
      if (record.status === 'ANNULEE') return;
      record.lines.forEach(line => {
        const existing = map.get(line.itemCode);
        if (!existing) {
          map.set(line.itemCode, {
            itemId: line.itemId,
            itemCode: line.itemCode,
            designation: line.designation,
            category: line.category,
            unit: line.unit,
            initialTheoreticalTotal: line.initialTheoreticalQuantity || 0,
            adjustedTheoreticalTotal: line.adjustedTheoreticalQuantity || 0,
            actualConsumedTotal: line.actualConsumedQuantity || 0,
            withdrawnTotal: line.withdrawnQuantity || 0,
            returnedTotal: line.returnedQuantity || 0,
            wasteTotal: line.wasteQuantity || 0,
            count: 1,
            causes: line.varianceReason ? [line.varianceReason] : [],
          });
        } else {
          existing.initialTheoreticalTotal += line.initialTheoreticalQuantity || 0;
          existing.adjustedTheoreticalTotal += line.adjustedTheoreticalQuantity || 0;
          existing.actualConsumedTotal += line.actualConsumedQuantity || 0;
          existing.withdrawnTotal += line.withdrawnQuantity || 0;
          existing.returnedTotal += line.returnedQuantity || 0;
          existing.wasteTotal += line.wasteQuantity || 0;
          existing.count += 1;
          if (line.varianceReason && !existing.causes.includes(line.varianceReason)) {
            existing.causes.push(line.varianceReason);
          }
        }
      });
    });

    return Array.from(map.values()).map(row => {
      const deltaQty = Number((row.actualConsumedTotal - row.adjustedTheoreticalTotal).toFixed(2));
      const deltaPercent =
        row.adjustedTheoreticalTotal > 0
          ? Number(((deltaQty / row.adjustedTheoreticalTotal) * 100).toFixed(2))
          : 0;
      return {
        ...row,
        deltaQty,
        deltaPercent,
      };
    });
  }, [db.consumptions]);

  // Données de rendement global (pour Onglet 3)
  const yieldSummary = useMemo(() => {
    let totalRawFishEngaged = 0;
    let totalDressedFishObtained = 0;
    let totalFishLostWaste = 0;
    let totalFishByProductMeal = 0;

    let totalOilTheoretical = 0;
    let totalOilConsumed = 0;
    let totalOilWaste = 0;

    let totalCansEngaged = 0;
    let totalCansRejects = 0;
    let totalCansFinished = 0;

    (db.consumptions || []).forEach(record => {
      if (record.status === 'ANNULEE' || !record.yieldLossSummary) return;
      const y = record.yieldLossSummary;
      totalRawFishEngaged += y.rawFishEngagedKg || 0;
      totalDressedFishObtained += y.dressedFishObtainedKg || 0;
      totalFishLostWaste += y.fishLostWasteKg || 0;
      totalFishByProductMeal += y.fishRecoverableByProductKg || 0;

      totalOilTheoretical += y.oilTheoreticalLitres || 0;
      totalOilConsumed += y.oilActualLitres || 0;
      totalOilWaste += y.oilLossLitres || 0;

      totalCansEngaged += y.cansInitialEngaged || 0;
      totalCansRejects += y.cansSeamingRejects || 0;
      totalCansFinished += record.actualProducedQuantityCans || 0;
    });

    const globalFishCleaningYield =
      totalRawFishEngaged > 0
        ? Number(((totalDressedFishObtained / totalRawFishEngaged) * 100).toFixed(2))
        : 0;

    const globalOilLossRate =
      totalOilTheoretical > 0
        ? Number(((totalOilWaste / totalOilTheoretical) * 100).toFixed(2))
        : 0;

    const globalCanSeamingRejectRate =
      totalCansEngaged > 0
        ? Number(((totalCansRejects / totalCansEngaged) * 100).toFixed(2))
        : 0;

    return {
      totalRawFishEngaged,
      totalDressedFishObtained,
      globalFishCleaningYield,
      totalFishLostWaste,
      totalFishByProductMeal,
      totalOilTheoretical,
      totalOilConsumed,
      totalOilWaste,
      globalOilLossRate,
      totalCansEngaged,
      totalCansRejects,
      globalCanSeamingRejectRate,
      totalCansFinished,
    };
  }, [db.consumptions]);

  // Export CSV
  const handleExportCsv = () => {
    const headers = [
      'Numéro Consommation',
      'Ordre Fabrication',
      'Produit Fini',
      'Lot Fabrication',
      'Code Article',
      'Désignation',
      'Catégorie',
      'Lot Consommé',
      'Emplacement',
      'Besoin Théo Initial',
      'Besoin Théo Ajusté',
      'Consommé Réel',
      'Sortie Magasin',
      'Retour Stock',
      'Rebut/Perte',
      'Unité',
      'Écart Qté',
      'Écart %',
      'Motif Écart',
      'Statut',
      'Date Heure',
    ];

    const rows: string[][] = [];
    (db.consumptions || []).forEach(record => {
      record.lines.forEach(line => {
        rows.push([
          record.consumptionNumber,
          record.workOrderNumber,
          record.finishedItemName,
          record.finishedBatchNumber,
          line.itemCode,
          `"${line.designation}"`,
          line.category,
          `"${line.batchNumber}"`,
          `"${line.storageLocation}"`,
          line.initialTheoreticalQuantity.toString(),
          line.adjustedTheoreticalQuantity.toString(),
          line.actualConsumedQuantity.toString(),
          line.withdrawnQuantity.toString(),
          line.returnedQuantity.toString(),
          line.wasteQuantity.toString(),
          line.unit,
          line.quantityVariance.toString(),
          `${line.percentageVariance}%`,
          `"${line.varianceReason || ''}"`,
          record.status,
          record.consumptionDateTime,
        ]);
      });
    });

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `MAMORA_GP_Consommations_Reelles_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showAlert('success', 'Export CSV des consommations généré avec succès.');
  };

  // Traitement de la validation d'une fiche
  const handleConfirmValidation = () => {
    if (!recordToValidate) return;
    try {
      storage.validateConsumption(recordToValidate.id, currentUser, validationNotesInput);
      showAlert('success', `La consommation ${recordToValidate.consumptionNumber} a été validée avec succès et les stocks ont été mis à jour.`);
      setRecordToValidate(null);
      setValidationNotesInput('');
    } catch (err: any) {
      showAlert('error', err.message || 'Erreur lors de la validation.');
    }
  };

  // Traitement de l'annulation d'une fiche
  const handleConfirmCancellation = () => {
    if (!recordToCancel) return;
    if (!cancelReasonInput.trim()) {
      showAlert('error', 'Le motif d\'annulation circonstancié est obligatoire.');
      return;
    }
    try {
      storage.cancelConsumption(recordToCancel.id, currentUser, cancelReasonInput);
      showAlert('success', `La consommation ${recordToCancel.consumptionNumber} a été annulée.`);
      setRecordToCancel(null);
      setCancelReasonInput('');
    } catch (err: any) {
      showAlert('error', err.message || 'Erreur lors de l\'annulation.');
    }
  };

  // Traitement de la régularisation
  const handleConfirmRegularization = () => {
    if (!selectedRecordForRegularize || !selectedLineForRegularize) return;
    if (!regularizeReasonInput.trim()) {
      showAlert('error', 'Le motif de régularisation formelle est obligatoire.');
      return;
    }
    try {
      storage.regularizeConsumption(
        selectedRecordForRegularize.id,
        currentUser,
        selectedLineForRegularize.id,
        regularizeQtyInput,
        regularizeReasonInput
      );
      showAlert(
        'success',
        `Régularisation effectuée sur ${selectedLineForRegularize.itemCode}. Mouvement d'ajustement tracé généré.`
      );
      setSelectedRecordForRegularize(null);
      setSelectedLineForRegularize(null);
      setRegularizeReasonInput('');
    } catch (err: any) {
      showAlert('error', err.message || 'Erreur lors de la régularisation.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Bannière de notification */}
      {alertMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-xs font-semibold ${
            alertMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
              : 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {alertMessage.type === 'success' ? (
              <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertOctagon className="w-4 h-4 shrink-0 text-red-600" />
            )}
            <span>{alertMessage.text}</span>
          </div>
          <button
            onClick={() => setAlertMessage(null)}
            className="p-1 hover:bg-black/5 rounded transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* En-tête principal & Navigation par onglets (Section 2) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 uppercase">
              GESTION DE PRODUCTION · ISO 22000
            </span>
            <span className="text-xs text-slate-500 font-mono">GPAO Conserverie Thon &amp; Sardines</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mt-1 flex items-center gap-2">
            <Scale className="w-5 h-5 text-blue-600" />
            <span>Suivi des Consommations Réelles, Écarts &amp; Rendements</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Enregistrement des composants réels, comparaison aux besoins théoriques validés et réconciliation des stocks
          </p>
        </div>

        {/* Boutons d'actions rapides */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 rounded-lg border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exporter CSV</span>
          </button>

          {canEdit && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Nouvelle Saisie Réelle</span>
            </button>
          )}
        </div>
      </div>

      {/* Onglets de navigation : Consommation Réelle / Analyse des Écarts / Rendement & Pertes */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('SAISIE')}
          className={`flex items-center gap-2 pb-3 px-3 text-xs font-semibold transition-colors cursor-pointer border-b-2 ${
            activeTab === 'SAISIE'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Scale className="w-4 h-4" />
          <span>Fiches de Consommation Réelle</span>
          <span className="ml-1 px-1.5 py-0.5 text-[10px] font-mono rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            {(db.consumptions || []).length}
          </span>
          {toleranceAlertCount > 0 && (
            <span
              className="flex items-center gap-1 ml-1 px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
              title={`${toleranceAlertCount} fiche(s) avec composants hors tolérance`}
            >
              <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
              <span>{toleranceAlertCount}</span>
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('ECARTS')}
          className={`flex items-center gap-2 pb-3 px-3 text-xs font-semibold transition-colors cursor-pointer border-b-2 ${
            activeTab === 'ECARTS'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Analyse des Écarts Théorique / Réel</span>
          <span className="ml-1 px-1.5 py-0.5 text-[10px] font-mono rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            {articleVariances.length} composants
          </span>
        </button>

        <button
          onClick={() => setActiveTab('RENDEMENT')}
          className={`flex items-center gap-2 pb-3 px-3 text-xs font-semibold transition-colors cursor-pointer border-b-2 ${
            activeTab === 'RENDEMENT'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <PieChart className="w-4 h-4" />
          <span>Rendement Matière &amp; Pertes de Production</span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* ONGLET 1 : FICHES DE CONSOMMATION RÉELLE                   */}
      {/* ========================================================= */}
      {activeTab === 'SAISIE' && (
        <div className="space-y-4">
          {/* Barre de filtres et recherche */}
          <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex-1 min-w-[240px] relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher par N° conso, OF, lot, produit ou article..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Filtre rapide alertes tolérance */}
              <button
                type="button"
                onClick={() => setOnlyOutOfTolerance(prev => !prev)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                  onlyOutOfTolerance
                    ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                    : toleranceAlertCount > 0
                    ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                    : 'bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400'
                }`}
                title="Afficher uniquement les fiches avec des écarts hors tolérance"
              >
                <AlertTriangle className={`w-3.5 h-3.5 ${onlyOutOfTolerance ? 'text-white' : 'text-amber-600'}`} />
                <span>Hors tolérance</span>
                <span
                  className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
                    onlyOutOfTolerance
                      ? 'bg-amber-700 text-white'
                      : 'bg-amber-200 dark:bg-amber-900 text-amber-950 dark:text-amber-100'
                  }`}
                >
                  {toleranceAlertCount}
                </span>
              </button>

              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Filter className="w-3.5 h-3.5" />
                <span>Statut :</span>
              </div>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              >
                <option value="ALL">Tous les statuts</option>
                <option value="BROUILLON">Brouillon</option>
                <option value="EN_COURS">En cours de saisie</option>
                <option value="EN_ATTENTE_VALIDATION">En attente de validation</option>
                <option value="VALIDEE">Validée</option>
                <option value="ANNULEE">Annulée</option>
              </select>

              <select
                value={lineFilter}
                onChange={e => setLineFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              >
                <option value="ALL">Toutes les lignes</option>
                <option value="LIGNE-THON-01">Ligne Thon N°1</option>
                <option value="LIGNE-SARDINE-02">Ligne Sardine N°2</option>
              </select>

              <select
                value={shiftFilter}
                onChange={e => setShiftFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              >
                <option value="ALL">Toutes les équipes</option>
                <option value="EQUIPE_MATIN">Équipe Matin</option>
                <option value="EQUIPE_SOIR">Équipe Soir</option>
                <option value="EQUIPE_NUIT">Équipe Nuit</option>
              </select>
            </div>
          </div>

          {/* Tableau des consommations réelles (Section 3) avec alertes visuelles de tolérance */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">N° Consommation</th>
                    <th className="py-3 px-4">Ordre Fab. (OF)</th>
                    <th className="py-3 px-4">Produit Fini &amp; Lot</th>
                    <th className="py-3 px-4">Ligne &amp; Équipe</th>
                    <th className="py-3 px-4">Date / Heure</th>
                    <th className="py-3 px-4">Responsable</th>
                    <th className="py-3 px-4 text-right">Production</th>
                    <th className="py-3 px-4 text-center">Contrôle Tolérance</th>
                    <th className="py-3 px-4 text-center">Statut</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredConsumptions.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-400">
                        <Scale className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p className="font-medium">Aucune fiche de consommation trouvée</p>
                        <p className="text-[11px] mt-0.5">
                          {onlyOutOfTolerance
                            ? 'Aucun enregistrement ne présente de dépassement de tolérance pour ces filtres'
                            : 'Modifiez vos critères de recherche ou créez une nouvelle fiche'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredConsumptions.map(record => {
                      const outOfToleranceLines = record.lines.filter(
                        l => Math.abs(l.percentageVariance) > (l.tolerancePercent ?? 2)
                      );
                      const hasSevere = outOfToleranceLines.some(
                        l => Math.abs(l.percentageVariance) > Math.max(5, (l.tolerancePercent ?? 2) * 1.5)
                      );

                      return (
                        <tr
                          key={record.id}
                          className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                            outOfToleranceLines.length > 0 ? 'bg-amber-50/20 dark:bg-amber-950/10' : ''
                          }`}
                        >
                          <td className="py-3.5 px-4 font-mono font-bold text-blue-600">
                            <div className="flex items-center gap-1.5">
                              <span>{record.consumptionNumber}</span>
                              {outOfToleranceLines.length > 0 && (
                                <span
                                  title={`${outOfToleranceLines.length} composant(s) hors seuil de tolérance`}
                                  className="inline-flex items-center"
                                >
                                  {hasSevere ? (
                                    <AlertOctagon className="w-3.5 h-3.5 text-red-600 shrink-0" />
                                  ) : (
                                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                  )}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-mono font-semibold text-slate-800 dark:text-slate-200">
                            {record.workOrderNumber}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-900 dark:text-slate-100">
                              {record.finishedItemName}
                            </div>
                            <div className="text-[11px] font-mono text-slate-500 flex items-center gap-1.5 mt-0.5">
                              <span>{record.finishedItemCode}</span>
                              <span>·</span>
                              <span className="text-slate-700 dark:text-slate-300 font-bold">{record.finishedBatchNumber}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-medium text-slate-800 dark:text-slate-200">
                              {record.lineId}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {record.shift === 'EQUIPE_MATIN'
                                ? 'Matin (06h-14h)'
                                : record.shift === 'EQUIPE_SOIR'
                                ? 'Soir (14h-22h)'
                                : 'Nuit (22h-06h)'}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                            {new Date(record.consumptionDateTime).toLocaleString('fr-FR', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })}
                          </td>
                          <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 font-medium">
                            {record.recordedBy}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono">
                            <div className="font-bold text-slate-900 dark:text-slate-100">
                              {record.actualProducedQuantityCans.toLocaleString()} btes
                            </div>
                            <div className="text-[10px] text-slate-500">
                              Prévu : {record.plannedQuantityCans.toLocaleString()}
                            </div>
                          </td>

                          {/* Indicateur visuel d'alertes tolérance (Section 6 & Demande utilisateur) */}
                          <td className="py-3.5 px-4 text-center">
                            {outOfToleranceLines.length === 0 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                <CheckCircle className="w-3 h-3 text-emerald-600" />
                                <span>Conforme (≤ seuils)</span>
                              </span>
                            ) : (
                              <div className="flex flex-col items-center gap-1">
                                <span
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-bold border ${
                                    hasSevere
                                      ? 'bg-red-50 text-red-700 border-red-300 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800'
                                      : 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                                  }`}
                                  title={outOfToleranceLines
                                    .map(
                                      l =>
                                        `${l.designation} (${l.itemCode}) : ${l.percentageVariance > 0 ? '+' : ''}${l.percentageVariance}% (Tolérance max : ±${l.tolerancePercent}%)`
                                    )
                                    .join('\n')}
                                >
                                  {hasSevere ? (
                                    <AlertOctagon className="w-3.5 h-3.5 text-red-600 shrink-0" />
                                  ) : (
                                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                  )}
                                  <span>
                                    {outOfToleranceLines.length} hors tolérance
                                  </span>
                                </span>
                                <div
                                  className="text-[9px] font-mono text-slate-500 dark:text-slate-400 max-w-[130px] truncate"
                                  title={outOfToleranceLines
                                    .map(
                                      l =>
                                        `${l.itemCode} ${l.percentageVariance > 0 ? '+' : ''}${l.percentageVariance}% (seuil ±${l.tolerancePercent}%)`
                                    )
                                    .join(', ')}
                                >
                                  {outOfToleranceLines
                                    .map(l => `${l.itemCode} ${l.percentageVariance > 0 ? '+' : ''}${l.percentageVariance}%`)
                                    .join(', ')}
                                </div>
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <StatusBadge status={record.status} size="sm" />
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Bouton Détail */}
                              <button
                                onClick={() => setSelectedRecordForDetail(record)}
                                title="Consulter le détail des 12 colonnes et alertes"
                                className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 dark:text-slate-400 dark:hover:text-blue-400 dark:hover:bg-blue-950/50 rounded-md transition-colors cursor-pointer"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              {/* Validation (si autorisé et statut en attente) */}
                              {canValidate && record.status === 'EN_ATTENTE_VALIDATION' && (
                                <button
                                  onClick={() => setRecordToValidate(record)}
                                  title="Valider définitivement la consommation et les stocks"
                                  className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-md transition-colors cursor-pointer"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </button>
                              )}

                              {/* Régularisation (si validée et autorisé) */}
                              {canValidate && record.status === 'VALIDEE' && (
                                <button
                                  onClick={() => {
                                    setSelectedRecordForRegularize(record);
                                    setSelectedLineForRegularize(record.lines[0]);
                                    setRegularizeQtyInput(record.lines[0]?.actualConsumedQuantity || 0);
                                  }}
                                  title="Régulariser une quantité avec mouvement de stock tracé"
                                  className="p-1.5 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/50 rounded-md transition-colors cursor-pointer"
                                >
                                  <RotateCcw className="w-4 h-4" />
                                </button>
                              )}

                              {/* Annulation (si non encore validée) */}
                              {canEdit && record.status !== 'VALIDEE' && record.status !== 'ANNULEE' && (
                                <button
                                  onClick={() => setRecordToCancel(record)}
                                  title="Annuler la fiche avec motif circonstancié"
                                  className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-md transition-colors cursor-pointer"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* ONGLET 2 : ANALYSE DES ÉCARTS THÉORIQUE / RÉEL             */}
      {/* ========================================================= */}
      {activeTab === 'ECARTS' && (
        <div className="space-y-6">
          {/* Synthèse graphique Recharts des écarts par composant */}
          <div className="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 gap-2">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <BarChart3 className="w-4.5 h-4.5 text-blue-600" />
                  <span>Dispersion des Écarts (%) par Composant (Réel vs Théorique Ajusté)</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Formule : Écart % = ((Réel − Théorique Ajusté) / Théorique Ajusté) × 100. Repère seuil tolérance ±2%
                </p>
              </div>
              <div className="text-xs text-slate-500 font-mono">
                {articleVariances.length} composants suivis
              </div>
            </div>

            <div className="w-full h-64 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={articleVariances} margin={{ top: 15, right: 20, left: 10, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" opacity={0.25} />
                  <XAxis
                    dataKey="itemCode"
                    tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }}
                    angle={-20}
                    textAnchor="end"
                  />
                  <YAxis
                    tickFormatter={val => `${val}%`}
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    width={45}
                  />
                  <Tooltip
                    formatter={(val: any, name: any, item: any) => [
                      `${val}% (${item.payload.deltaQty > 0 ? '+' : ''}${item.payload.deltaQty} ${item.payload.unit})`,
                      'Écart Relatif',
                    ]}
                    labelFormatter={(label: any) => `Composant : ${label}`}
                  />
                  <ReferenceLine y={0} stroke="#64748b" strokeWidth={1} />
                  <ReferenceLine
                    y={2}
                    stroke="#f59e0b"
                    strokeDasharray="3 3"
                    label={{ value: '+2% Tolérance', fill: '#f59e0b', fontSize: 10, position: 'insideTopRight' }}
                  />
                  <Bar dataKey="deltaPercent" name="Écart %" radius={[4, 4, 0, 0]}>
                    {articleVariances.map((entry, index) => {
                      let fill = '#10b981'; // Conforme
                      if (entry.deltaPercent > 2) fill = '#f59e0b'; // Surconsommation modérée
                      if (entry.deltaPercent > 5) fill = '#ef4444'; // Dérive critique
                      if (entry.deltaPercent < -5) fill = '#6366f1';
                      return <Cell key={`cell-${index}`} fill={fill} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tableau comparatif complet Théorique initial / Théorique ajusté / Réel (Section 11) */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Tableau Synthétique des Consommations &amp; Écarts Cumulés
                </h3>
                <p className="text-[11px] text-slate-500">
                  Rapprochement des besoins initiaux planifiés, ajustés à la production réelle et consommations effectives
                </p>
              </div>
              <button
                onClick={handleExportCsv}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 dark:bg-slate-800 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Exporter Rapport</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Code Article</th>
                    <th className="py-3 px-4">Désignation</th>
                    <th className="py-3 px-4">Catégorie</th>
                    <th className="py-3 px-4 text-right">Besoin Initial (Prévu)</th>
                    <th className="py-3 px-4 text-right">Besoin Ajusté (Réel)</th>
                    <th className="py-3 px-4 text-right">Consommé Réel</th>
                    <th className="py-3 px-4 text-right">Écart Quantité</th>
                    <th className="py-3 px-4 text-right">Écart %</th>
                    <th className="py-3 px-4">Interprétation &amp; Causes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {articleVariances.map(row => {
                    const isOver = row.deltaQty > 0;
                    const isUnder = row.deltaQty < 0;
                    const isZero = row.deltaQty === 0;

                    return (
                      <tr
                        key={row.itemCode}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-3 px-4 font-mono font-bold text-blue-600">
                          {row.itemCode}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100">
                          {row.designation}
                        </td>
                        <td className="py-3 px-4 text-slate-500 text-[11px]">
                          {row.category}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-600 dark:text-slate-400">
                          {row.initialTheoreticalTotal.toLocaleString()} {row.unit}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold text-slate-800 dark:text-slate-200">
                          {row.adjustedTheoreticalTotal.toLocaleString()} {row.unit}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                          {row.actualConsumedTotal.toLocaleString()} {row.unit}
                        </td>
                        <td
                          className={`py-3 px-4 text-right font-mono font-bold ${
                            isOver ? 'text-amber-600 dark:text-amber-400' : isUnder ? 'text-indigo-600' : 'text-slate-500'
                          }`}
                        >
                          {isOver ? `+${row.deltaQty}` : row.deltaQty} {row.unit}
                        </td>
                        <td className="py-3 px-4 text-right font-mono">
                          <div className="flex items-center justify-end gap-1.5">
                            {Math.abs(row.deltaPercent) > 2 && (
                              <span title={`Dépassement du seuil de tolérance (écart ${row.deltaPercent > 0 ? '+' : ''}${row.deltaPercent}%)`}>
                                {Math.abs(row.deltaPercent) > 5 ? (
                                  <AlertOctagon className="w-3.5 h-3.5 text-red-600 shrink-0" />
                                ) : (
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                )}
                              </span>
                            )}
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                isZero
                                  ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                  : Math.abs(row.deltaPercent) <= 2
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300'
                                  : row.deltaPercent > 2 && row.deltaPercent <= 5
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300'
                                  : 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/60 dark:text-red-300'
                              }`}
                            >
                              {row.deltaPercent > 0 ? `+${row.deltaPercent}%` : `${row.deltaPercent}%`}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400 text-[11px]">
                          {Math.abs(row.deltaPercent) > 2 ? (
                            <div className="flex items-start gap-1.5">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                              <span title={row.causes.join(' | ')}>
                                {row.causes[0] || 'Dépassement du seuil de tolérance standard (analyse requise)'}
                                {row.causes.length > 1 && ` (+${row.causes.length - 1} autre)`}
                              </span>
                            </div>
                          ) : row.causes.length > 0 ? (
                            <span title={row.causes.join(' | ')}>
                              {row.causes[0]}
                              {row.causes.length > 1 && ` (+${row.causes.length - 1} autre)`}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Conforme au théorique</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* ONGLET 3 : RENDEMENT MATIÈRE & PERTES DE PRODUCTION        */}
      {/* ========================================================= */}
      {activeTab === 'RENDEMENT' && (
        <div className="space-y-6">
          {/* Cartes d'indicateurs de rendement et pertes (Section 10) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. Rendement Poisson Brut vs Utile */}
            <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[10px] font-bold uppercase tracking-wider">Rendement Étêtage Poisson</span>
                <Scale className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  {yieldSummary.globalFishCleaningYield}%
                </span>
                <span className="text-xs text-slate-500 font-semibold">net utile</span>
              </div>
              <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex justify-between font-mono">
                  <span>Poisson brut engagé :</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{yieldSummary.totalRawFishEngaged.toLocaleString()} kg</span>
                </div>
                <div className="flex justify-between font-mono">
                  <span>Poisson étêté obtenu :</span>
                  <span className="font-bold text-emerald-600">{yieldSummary.totalDressedFishObtained.toLocaleString()} kg</span>
                </div>
                <div className="flex justify-between font-mono text-[11px] text-slate-500">
                  <span>Valorisation farine :</span>
                  <span>{yieldSummary.totalFishByProductMeal.toLocaleString()} kg</span>
                </div>
              </div>
            </div>

            {/* 2. Pertes d'Huile & Jusquage */}
            <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[10px] font-bold uppercase tracking-wider">Pertes de Jusquage &amp; Huile</span>
                <TrendingUp className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold font-mono text-blue-600 dark:text-blue-400">
                  {yieldSummary.globalOilLossRate}%
                </span>
                <span className="text-xs text-slate-500 font-semibold">taux de déperdition</span>
              </div>
              <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex justify-between font-mono">
                  <span>Huile théorique :</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{yieldSummary.totalOilTheoretical.toLocaleString()} L</span>
                </div>
                <div className="flex justify-between font-mono">
                  <span>Huile consommée :</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">{yieldSummary.totalOilConsumed.toLocaleString()} L</span>
                </div>
                <div className="flex justify-between font-mono text-[11px] text-amber-600">
                  <span>Pertes dosage / calage :</span>
                  <span>{yieldSummary.totalOilWaste.toLocaleString()} L</span>
                </div>
              </div>
            </div>

            {/* 3. Rebuts de Sertissage Boîtes & Couvercles */}
            <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[10px] font-bold uppercase tracking-wider">Taux Rebut Sertissage</span>
                <AlertTriangle className="w-4 h-4 text-amber-600" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold font-mono text-slate-900 dark:text-slate-100">
                  {yieldSummary.globalCanSeamingRejectRate}%
                </span>
                <span className="text-xs text-slate-500 font-semibold">rebuts boîtes</span>
              </div>
              <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex justify-between font-mono">
                  <span>Boîtes engagées :</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{yieldSummary.totalCansEngaged.toLocaleString()} btes</span>
                </div>
                <div className="flex justify-between font-mono">
                  <span>Boîtes produites conformes :</span>
                  <span className="font-bold text-emerald-600">{yieldSummary.totalCansFinished.toLocaleString()} btes</span>
                </div>
                <div className="flex justify-between font-mono text-[11px] text-red-600">
                  <span>Rebuts calage / contrôle :</span>
                  <span>{yieldSummary.totalCansRejects.toLocaleString()} btes</span>
                </div>
              </div>
            </div>
          </div>

          {/* Analyse comparative par Ordre de Fabrication */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Bilan Matière Détaillé par Ordre de Fabrication (OF)
            </h3>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {(db.consumptions || [])
                .filter(c => c.status !== 'ANNULEE')
                .map(rec => {
                  const y = rec.yieldLossSummary;
                  return (
                    <div key={rec.id} className="py-4 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-blue-600">{rec.workOrderNumber}</span>
                            <span className="text-slate-500">·</span>
                            <span className="font-semibold text-slate-900 dark:text-slate-100">{rec.finishedItemName}</span>
                            <StatusBadge status={rec.status} size="sm" />
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                            Lot : {rec.finishedBatchNumber} · Ligne : {rec.lineId} · {rec.actualProducedQuantityCans.toLocaleString()} boîtes réalisées
                          </div>
                        </div>

                        <div className="text-right font-mono text-xs">
                          <span className="text-slate-500">Rendement étêtage : </span>
                          <span className="font-bold text-emerald-600">
                            {y ? `${y.cleaningYieldPercent}%` : 'N/A'}
                          </span>
                        </div>
                      </div>

                      {/* Éléments de synthèse matière */}
                      {y && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg text-xs font-mono">
                          <div>
                            <span className="text-slate-500 block text-[10px]">POISSON BRUT ENGAGÉ</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">{y.rawFishEngagedKg.toLocaleString()} kg</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[10px]">POISSON ÉTÊTÉ ÉVISCÉRÉ</span>
                            <span className="font-bold text-emerald-600">{y.dressedFishObtainedKg.toLocaleString()} kg</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[10px]">SOUS-PRODUITS FARINE</span>
                            <span className="font-bold text-slate-700 dark:text-slate-300">{y.fishRecoverableByProductKg.toLocaleString()} kg</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[10px]">POISSON / 1000 BOÎTES</span>
                            <span className="font-bold text-blue-600">{y.fishIncorporatedPer1000CansKg} kg</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 1 : DÉTAIL COMPLET D'UNE FICHE DE CONSOMMATION       */}
      {/* ========================================================= */}
      {selectedRecordForDetail && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedRecordForDetail(null)}
          title={`Fiche de Consommation Réelle — ${selectedRecordForDetail.consumptionNumber}`}
          maxWidth="4xl"
        >
          <div className="space-y-6 text-xs">
            {/* Entête de synthèse */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase">Ordre de Fabrication</span>
                <span className="font-mono font-bold text-blue-600 text-sm">
                  {selectedRecordForDetail.workOrderNumber}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase">Produit Fini</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {selectedRecordForDetail.finishedItemName}
                </span>
                <span className="text-[10px] font-mono text-slate-500 block">
                  Lot: {selectedRecordForDetail.finishedBatchNumber}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase">Ligne &amp; Équipe</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {selectedRecordForDetail.lineId}
                </span>
                <span className="text-[10px] text-slate-500 block">
                  {selectedRecordForDetail.shift}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase">Statut</span>
                <div className="mt-0.5">
                  <StatusBadge status={selectedRecordForDetail.status} size="sm" />
                </div>
              </div>
            </div>

            {/* Bannière d'alerte si dépassement de tolérance sur au moins un article */}
            {selectedRecordForDetail.lines.some(l => Math.abs(l.percentageVariance) > (l.tolerancePercent ?? 2)) && (
              <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-300 dark:border-amber-800 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold text-amber-900 dark:text-amber-200 text-xs flex items-center gap-2">
                    <span>Alerte Dépassement Seuil de Tolérance (ISO 22000 &amp; HACCP)</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-amber-200 dark:bg-amber-900 text-amber-950 dark:text-amber-100 font-mono font-bold">
                      {selectedRecordForDetail.lines.filter(l => Math.abs(l.percentageVariance) > (l.tolerancePercent ?? 2)).length} composant(s) hors seuil
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-800 dark:text-amber-300">
                    Les articles signalés par une icône d'avertissement présentent une dérive supérieure à la tolérance maximale admissible de la nomenclature. Un motif circonstancié est obligatoire pour chaque dépassement avant validation définitive.
                  </p>
                </div>
              </div>
            )}

            {/* Tableau des 12 colonnes requises (Section 4) */}
            <div className="space-y-2">
              <h4 className="font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between">
                <span>Composants Réellement Consommés vs Besoins Théoriques</span>
                <span className="text-[11px] font-mono text-slate-500">
                  Nomenclature : {selectedRecordForDetail.recipeCode} ({selectedRecordForDetail.recipeVersion})
                </span>
              </h4>

              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 font-semibold text-slate-600 dark:text-slate-400 uppercase text-[10px]">
                      <th className="py-2.5 px-3">1. Code</th>
                      <th className="py-2.5 px-3">2. Désignation</th>
                      <th className="py-2.5 px-3">3. Catégorie</th>
                      <th className="py-2.5 px-3">4. Lot Consommé</th>
                      <th className="py-2.5 px-3">5. Emplacement</th>
                      <th className="py-2.5 px-3 text-right">6. Théo Ajusté</th>
                      <th className="py-2.5 px-3 text-right">7. Réel Net</th>
                      <th className="py-2.5 px-3 text-center">8. Unité</th>
                      <th className="py-2.5 px-3 text-right">9. Écart Qté</th>
                      <th className="py-2.5 px-3 text-right">10. Écart %</th>
                      <th className="py-2.5 px-3">11. Motif Écart</th>
                      <th className="py-2.5 px-3">12. Opérateur</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                    {selectedRecordForDetail.lines.map(line => {
                      const isOver = line.quantityVariance > 0;
                      const isOutOfTolerance = Math.abs(line.percentageVariance) > (line.tolerancePercent ?? 2);
                      const isSevere = Math.abs(line.percentageVariance) > Math.max(5, (line.tolerancePercent ?? 2) * 1.5);

                      return (
                        <tr
                          key={line.id}
                          className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/20 ${
                            isOutOfTolerance ? 'bg-amber-50/20 dark:bg-amber-950/10' : ''
                          }`}
                        >
                          <td className="py-2 px-3 font-bold text-blue-600">{line.itemCode}</td>
                          <td className="py-2 px-3 font-sans font-medium text-slate-800 dark:text-slate-200">
                            {line.designation}
                            {line.isExtraComponent && (
                              <span className="ml-1 text-[9px] px-1 py-0.2 bg-amber-100 text-amber-800 rounded">
                                Extra
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 font-sans text-slate-500 text-[10px]">{line.category}</td>
                          <td className="py-2 px-3 text-[10px] text-slate-700 dark:text-slate-300">
                            {line.batchNumber}
                          </td>
                          <td className="py-2 px-3 font-sans text-slate-500 text-[10px]">{line.storageLocation}</td>
                          <td className="py-2 px-3 text-right text-slate-600 dark:text-slate-400">
                            {line.adjustedTheoreticalQuantity}
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-slate-900 dark:text-slate-100">
                            {line.actualConsumedQuantity}
                          </td>
                          <td className="py-2 px-3 text-center font-sans font-semibold text-slate-500">{line.unit}</td>
                          <td className={`py-2 px-3 text-right font-bold ${isOver ? 'text-amber-600' : 'text-slate-600'}`}>
                            {isOver ? `+${line.quantityVariance}` : line.quantityVariance}
                          </td>
                          <td className="py-2 px-3 text-right">
                            <div className="flex flex-col items-end gap-0.5">
                              <span
                                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                                  !isOutOfTolerance
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                                    : isSevere
                                    ? 'bg-red-50 text-red-700 border-red-300 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800 shadow-2xs'
                                    : 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800 shadow-2xs'
                                }`}
                                title={
                                  isOutOfTolerance
                                    ? `Alerte : Déviation de ${line.percentageVariance > 0 ? '+' : ''}${line.percentageVariance}% dépasse le seuil contractuel (±${line.tolerancePercent}%)`
                                    : `Conforme : écart dans la tolérance admise (±${line.tolerancePercent}%)`
                                }
                              >
                                {isOutOfTolerance ? (
                                  isSevere ? (
                                    <AlertOctagon className="w-3 h-3 text-red-600 shrink-0" />
                                  ) : (
                                    <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                                  )
                                ) : (
                                  <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                                )}
                                <span>{line.percentageVariance > 0 ? `+${line.percentageVariance}%` : `${line.percentageVariance}%`}</span>
                              </span>
                              <span
                                className={`text-[9px] font-sans ${
                                  isOutOfTolerance ? 'text-amber-700 dark:text-amber-400 font-bold' : 'text-slate-400'
                                }`}
                              >
                                Seuil : ±{line.tolerancePercent}%
                              </span>
                            </div>
                          </td>
                          <td className="py-2 px-3 font-sans text-[10px]">
                            {isOutOfTolerance ? (
                              line.varianceReason ? (
                                <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                                  <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200 shrink-0">
                                    <AlertTriangle className="w-2.5 h-2.5" /> Justifié
                                  </span>
                                  <span className="truncate max-w-[140px]" title={line.varianceReason}>
                                    {line.varianceReason}
                                  </span>
                                </div>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-red-700 bg-red-50 dark:bg-red-950/60 px-1.5 py-0.5 rounded border border-red-200 dark:border-red-800">
                                  <AlertOctagon className="w-3 h-3 text-red-600" />
                                  <span>Justification requise</span>
                                </span>
                              )
                            ) : (
                              <span className="text-slate-500">{line.varianceReason || '—'}</span>
                            )}
                          </td>
                          <td className="py-2 px-3 font-sans text-[10px] text-slate-700 dark:text-slate-300">
                            {line.responsibleOperator}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Suivi des sorties vs retours vs rebuts (Section 8) */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
              <h4 className="font-bold text-slate-900 dark:text-slate-100">
                Réconciliation Magasin : Sorties, Utilisations et Restitutions
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {selectedRecordForDetail.lines.map(l => (
                  <div key={l.id} className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                    <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">{l.designation}</div>
                    <div className="text-[11px] font-mono text-slate-500 mt-1 space-y-0.5">
                      <div className="flex justify-between">
                        <span>Sortie Magasin :</span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">{l.withdrawnQuantity} {l.unit}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Utilisé en boîte :</span>
                        <span className="text-emerald-600 font-semibold">{l.actualConsumedQuantity} {l.unit}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Retour Stock :</span>
                        <span className="text-blue-600">{l.returnedQuantity} {l.unit}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Rebut / Perte :</span>
                        <span className="text-amber-600">{l.wasteQuantity} {l.unit}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Historique de régularisation si existant */}
            {selectedRecordForDetail.regularizationHistory &&
              selectedRecordForDetail.regularizationHistory.length > 0 && (
                <div className="p-4 bg-amber-50/50 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-900 space-y-2">
                  <h4 className="font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                    <RotateCcw className="w-4 h-4 text-amber-600" />
                    <span>Historique des Régularisations Formelles Post-Validation</span>
                  </h4>
                  <div className="divide-y divide-amber-200/60 dark:divide-amber-900/40 text-[11px]">
                    {selectedRecordForDetail.regularizationHistory.map((reg, idx) => (
                      <div key={idx} className="py-2 flex justify-between items-baseline">
                        <div>
                          <span className="font-mono font-bold text-amber-800 dark:text-amber-300">{reg.itemCode}</span>
                          <span className="text-slate-600 dark:text-slate-400 ml-2">
                            Ajustement de {reg.oldQty} à {reg.newQty} (Delta: {reg.deltaQty > 0 ? `+${reg.deltaQty}` : reg.deltaQty})
                          </span>
                          <div className="text-slate-500 text-[10px] italic mt-0.5">Motif: {reg.reason}</div>
                        </div>
                        <div className="text-right text-[10px] font-mono text-slate-400">
                          {new Date(reg.date).toLocaleString('fr-FR')} · {reg.user}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {/* Pied de page modal */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
              <div className="text-[11px] text-slate-500">
                {selectedRecordForDetail.validatedBy ? (
                  <span className="text-emerald-600 font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-4 h-4 inline" /> Validé le{' '}
                    {new Date(selectedRecordForDetail.validatedAt!).toLocaleDateString('fr-FR')} par{' '}
                    {selectedRecordForDetail.validatedBy}
                  </span>
                ) : (
                  <span>Enregistré par {selectedRecordForDetail.recordedBy}</span>
                )}
              </div>

              <button
                onClick={() => setSelectedRecordForDetail(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 rounded-lg transition-colors cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================= */}
      {/* MODAL 2 : NOUVELLE SAISIE DE CONSOMMATION RÉELLE           */}
      {/* ========================================================= */}
      {isCreateModalOpen && (
        <CreateConsumptionModal
          db={db}
          currentUser={currentUser}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={msg => {
            setIsCreateModalOpen(false);
            showAlert('success', msg);
          }}
          onError={err => showAlert('error', err)}
        />
      )}

      {/* ========================================================= */}
      {/* MODAL 3 : VALIDATION DE LA CONSOMMATION (RESPONSABLE)     */}
      {/* ========================================================= */}
      {recordToValidate && (
        <Modal
          isOpen={true}
          onClose={() => setRecordToValidate(null)}
          title={`Validation Formelle — ${recordToValidate.consumptionNumber}`}
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-lg border border-blue-200 dark:border-blue-900 text-blue-900 dark:text-blue-300">
              <p className="font-semibold">Engagement et Verrouillage Sanitaire ISO 22000 :</p>
              <p className="mt-1 text-[11px]">
                En validant cette fiche, vous attestez de l'exactitude des quantités réelles consommées pour l'OF{' '}
                <strong>{recordToValidate.workOrderNumber}</strong>. Les sorties et retours de stock seront
                enregistrés dans le Grand Livre des Stocks.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 dark:text-slate-300 block">
                Observations / Visa Qualité (Optionnel) :
              </label>
              <textarea
                rows={3}
                placeholder="Ex: Rapprochement matière vérifié, tolérances conformes à la nomenclature..."
                value={validationNotesInput}
                onChange={e => setValidationNotesInput(e.target.value)}
                className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setRecordToValidate(null)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmValidation}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors cursor-pointer shadow-xs"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Confirmer la Validation Définitive</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================= */}
      {/* MODAL 4 : ANNULATION D'UNE FICHE AVEC MOTIF OBLIGATOIRE   */}
      {/* ========================================================= */}
      {recordToCancel && (
        <Modal
          isOpen={true}
          onClose={() => setRecordToCancel(null)}
          title={`Annulation de la Consommation — ${recordToCancel.consumptionNumber}`}
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-red-50 dark:bg-red-950/40 rounded-lg border border-red-200 dark:border-red-900 text-red-900 dark:text-red-300">
              <p className="font-semibold">Procédure d'annulation tracée :</p>
              <p className="mt-1 text-[11px]">
                L'annulation d'une consommation invalide la saisie d'atelier. Un motif circonstancié est requis pour
                le journal d'audit légal ISO 22000.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 dark:text-slate-300 block">
                Motif obligatoire de l'annulation : <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                required
                placeholder="Préciser la raison (erreur d'OF, double saisie, rejet complet de la fabrication...)"
                value={cancelReasonInput}
                onChange={e => setCancelReasonInput(e.target.value)}
                className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-red-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setRecordToCancel(null)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                Retour
              </button>
              <button
                onClick={handleConfirmCancellation}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors cursor-pointer shadow-xs"
              >
                <AlertOctagon className="w-4 h-4" />
                <span>Confirmer l'Annulation Tracée</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================= */}
      {/* MODAL 5 : RÉGULARISATION TRACÉE SUR CONSOMMATION VALIDÉE  */}
      {/* ========================================================= */}
      {selectedRecordForRegularize && (
        <Modal
          isOpen={true}
          onClose={() => {
            setSelectedRecordForRegularize(null);
            setSelectedLineForRegularize(null);
          }}
          title={`Régularisation de Consommation — ${selectedRecordForRegularize.consumptionNumber}`}
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-lg border border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-300">
              <p className="font-semibold">Procédure de Régularisation ISO 22000 :</p>
              <p className="mt-1 text-[11px]">
                Cette consommation est déjà validée et verrouillée. Toute modification génère un mouvement de stock
                d'ajustement (AJUSTEMENT_INVENTAIRE) et consigne la valeur initiale dans l'historique d'audit.
              </p>
            </div>

            <div className="space-y-2">
              <label className="font-semibold text-slate-700 dark:text-slate-300 block">
                Composant à régulariser :
              </label>
              <select
                value={selectedLineForRegularize?.id}
                onChange={e => {
                  const line = selectedRecordForRegularize.lines.find(l => l.id === e.target.value);
                  setSelectedLineForRegularize(line || null);
                  setRegularizeQtyInput(line?.actualConsumedQuantity || 0);
                }}
                className="w-full p-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              >
                {selectedRecordForRegularize.lines.map(line => (
                  <option key={line.id} value={line.id}>
                    {line.itemCode} — {line.designation} (Actuel: {line.actualConsumedQuantity} {line.unit})
                  </option>
                ))}
              </select>
            </div>

            {selectedLineForRegularize && (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-800 rounded-lg font-mono">
                  <div>
                    <span className="text-slate-500 block text-[10px]">VALEUR INITIALE</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {selectedLineForRegularize.actualConsumedQuantity} {selectedLineForRegularize.unit}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">THÉORIQUE AJUSTÉ</span>
                    <span className="font-bold text-slate-600 dark:text-slate-400">
                      {selectedLineForRegularize.adjustedTheoreticalQuantity} {selectedLineForRegularize.unit}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block">
                    Nouvelle Quantité Réelle Consommée ({selectedLineForRegularize.unit}) :
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={regularizeQtyInput}
                    onChange={e => setRegularizeQtyInput(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 text-xs font-mono font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                  <div className="text-[11px] font-mono text-slate-500">
                    Écart de régularisation :{' '}
                    <span className="font-bold text-amber-600">
                      {regularizeQtyInput - selectedLineForRegularize.actualConsumedQuantity > 0 ? '+' : ''}
                      {(regularizeQtyInput - selectedLineForRegularize.actualConsumedQuantity).toFixed(2)}{' '}
                      {selectedLineForRegularize.unit}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block">
                    Motif formel de la régularisation : <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    required
                    placeholder="Ex: Rectification suite à inventaire physique de fin de fabrication..."
                    value={regularizeReasonInput}
                    onChange={e => setRegularizeReasonInput(e.target.value)}
                    className="w-full p-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => {
                  setSelectedRecordForRegularize(null);
                  setSelectedLineForRegularize(null);
                }}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmRegularization}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 rounded-lg transition-colors cursor-pointer shadow-xs"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Enregistrer la Régularisation</span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

// =====================================================================
// COMPOSANT MODAL DE CRÉATION D'UNE FICHE DE CONSOMMATION RÉELLE
// Auto-charge l'OF, la recette, les besoins théoriques et les stocks
// =====================================================================

interface CreateConsumptionModalProps {
  db: AppDatabase;
  currentUser: User;
  onClose: () => void;
  onSuccess: (msg: string) => void;
  onError: (err: string) => void;
}

const CreateConsumptionModal: React.FC<CreateConsumptionModalProps> = ({
  db,
  currentUser,
  onClose,
  onSuccess,
  onError,
}) => {
  // Sélection de l'OF
  const activeWorkOrders = useMemo(() => {
    return db.workOrders.filter(w => w.status === 'EN_COURS' || w.status === 'PLANIFIE' || w.status === 'EN_CONTROLE');
  }, [db.workOrders]);

  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState<string>(
    activeWorkOrders[0]?.id || ''
  );

  const selectedWorkOrder = useMemo(() => {
    return db.workOrders.find(w => w.id === selectedWorkOrderId);
  }, [db.workOrders, selectedWorkOrderId]);

  const selectedRecipe = useMemo(() => {
    if (!selectedWorkOrder) return undefined;
    return db.recipes.find(r => r.id === selectedWorkOrder.recipeId);
  }, [db.recipes, selectedWorkOrder]);

  const finishedItem = useMemo(() => {
    if (!selectedWorkOrder) return undefined;
    return db.items.find(i => i.id === selectedWorkOrder.finishedItemId);
  }, [db.items, selectedWorkOrder]);

  // Quantité de production retenue (Section 5)
  const [actualProducedQty, setActualProducedQty] = useState<number>(
    selectedWorkOrder?.actualCansQty || selectedWorkOrder?.plannedCansQty || 0
  );
  const [finishedBatchInput, setFinishedBatchInput] = useState<string>(
    selectedWorkOrder ? `LOT-PF-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-01` : ''
  );
  const [shiftInput, setShiftInput] = useState<'EQUIPE_MATIN' | 'EQUIPE_SOIR' | 'EQUIPE_NUIT'>('EQUIPE_MATIN');
  const [lineInput, setLineInput] = useState<string>(selectedWorkOrder?.lineId || 'LIGNE-THON-01');

  // Lignes de consommation éditables (Tableau 12 colonnes)
  const [lines, setLines] = useState<ConsumptionLine[]>([]);

  // Génération automatique des lignes à partir de la nomenclature lors du changement d'OF
  React.useEffect(() => {
    if (!selectedWorkOrder || !selectedRecipe) {
      setLines([]);
      return;
    }

    const plannedCans = selectedWorkOrder.plannedCansQty || 0;
    const actualCans = actualProducedQty;
    // Base de calcul de la nomenclature : 1 000 boîtes pour le référentiel historique
    const referenceQty =
      selectedRecipe.referenceProductionQty && selectedRecipe.referenceProductionQty > 0
        ? selectedRecipe.referenceProductionQty
        : 1000;

    const generatedLines: ConsumptionLine[] = selectedRecipe.ingredients.map((ing, idx) => {
      // Besoins théoriques calculés depuis la quantité de référence de la nomenclature
      const initialTh = plannedCans > 0 ? (ing.theoreticalQuantityPer1000Cans * plannedCans) / referenceQty : 0;
      const adjustedTh = actualCans > 0 ? (ing.theoreticalQuantityPer1000Cans * actualCans) / referenceQty : 0;
      const nominalActual = adjustedTh; // valeur pré-remplie par défaut

      const itm = db.items.find(i => i.id === ing.itemId);
      const category =
        itm?.category === 'POISSON_CONGELE' || itm?.category === 'POISSON_FRAIS'
          ? 'MATIERE_PREMIERE'
          : itm?.category === 'BOITE_METALLIQUE' || itm?.category === 'COUVERCLE'
          ? 'EMBALLAGE'
          : 'INGREDIENT';

      // Trouver un lot disponible réellement en stock ou assigné à l'OF
      let defaultLot = '';
      if (category === 'MATIERE_PREMIERE' && selectedWorkOrder.assignedRawBatchId) {
        defaultLot = selectedWorkOrder.assignedRawBatchId;
      } else {
        const foundRec = db.receptions.find(r => r.decision === 'ACCEPTE');
        if (foundRec) {
          defaultLot = foundRec.internalBatchNumber;
        }
      }
      const location = category === 'MATIERE_PREMIERE' ? 'Chambre Froide' : category === 'INGREDIENT' ? 'Magasin Ingrédients' : 'Magasin Emballages';

      return {
        id: `CL-NEW-${idx}`,
        itemId: ing.itemId,
        itemCode: ing.itemCode,
        designation: ing.designation,
        category,
        stepName:
          category === 'MATIERE_PREMIERE'
            ? 'Éviscération & Parage'
            : category === 'INGREDIENT'
            ? 'Jusquage Huile'
            : 'Emboîtage & Sertissage',
        lots: [
          {
            lotId: `LOT-${idx}-1`,
            lotNumber: defaultLot,
            withdrawnQty: nominalActual,
            usedQty: nominalActual,
            returnedQty: 0,
            wasteQty: 0,
            unit: (ing.unit as UnitOfMeasure) || 'KG',
            storageLocation: location,
            lotStatus: 'LIBERE',
          },
        ],
        batchNumber: defaultLot,
        storageLocation: location,
        initialTheoreticalQuantity: Number(initialTh.toFixed(2)),
        adjustedTheoreticalQuantity: Number(adjustedTh.toFixed(2)),
        actualConsumedQuantity: Number(nominalActual.toFixed(2)),
        withdrawnQuantity: Number(nominalActual.toFixed(2)),
        returnedQuantity: 0,
        wasteQuantity: 0,
        unit: (ing.unit as UnitOfMeasure) || 'KG',
        tolerancePercent: ing.tolerancePercent || 2,
        quantityVariance: 0,
        percentageVariance: 0,
        varianceReason: '',
        responsibleOperator: currentUser.name,
      };
    });

    setLines(generatedLines);
  }, [selectedWorkOrderId, selectedRecipe, actualProducedQty]);

  // Recalcul des écarts lorsqu'une ligne est modifiée
  const handleUpdateLine = (id: string, updates: Partial<ConsumptionLine>) => {
    setLines(prev =>
      prev.map(line => {
        if (line.id !== id) return line;
        const merged = { ...line, ...updates };

        // Recalcul des écarts
        const deltaQty = Number((merged.actualConsumedQuantity - merged.adjustedTheoreticalQuantity).toFixed(2));
        const deltaPercent =
          merged.adjustedTheoreticalQuantity > 0
            ? Number(((deltaQty / merged.adjustedTheoreticalQuantity) * 100).toFixed(2))
            : 0;

        return {
          ...merged,
          quantityVariance: deltaQty,
          percentageVariance: deltaPercent,
        };
      })
    );
  };

  // Soumission
  const handleSubmit = (statusToSave: 'BROUILLON' | 'EN_ATTENTE_VALIDATION') => {
    if (!selectedWorkOrder || !selectedRecipe) {
      onError('Veuillez sélectionner un ordre de fabrication valide.');
      return;
    }

    // Contrôles de cohérence : Sortie = Utilisé + Retourné + Rebut (Section 8)
    for (const l of lines) {
      const calcTotal = Number((l.actualConsumedQuantity + l.returnedQuantity + l.wasteQuantity).toFixed(2));
      if (l.withdrawnQuantity > 0 && Math.abs(l.withdrawnQuantity - calcTotal) > 0.05) {
        onError(
          `Incohérence sur ${l.designation} : Quantité sortie (${l.withdrawnQuantity}) ≠ Utilisé (${l.actualConsumedQuantity}) + Retourné (${l.returnedQuantity}) + Rebuté (${l.wasteQuantity})`
        );
        return;
      }
    }

    try {
      const rawFishLine = lines.find(l => l.category === 'MATIERE_PREMIERE');
      const rawFishKg = rawFishLine?.actualConsumedQuantity || 0;
      const dressedFishKg = rawFishKg > 0 ? Number((rawFishKg * 0.65).toFixed(2)) : 0;
      const cleanYield = rawFishKg > 0 ? Number(((dressedFishKg / rawFishKg) * 100).toFixed(1)) : 0;
      const oilLine = lines.find(l => l.category === 'INGREDIENT' && (l.unit === 'LITRE' || l.itemCode.includes('HUILE')));
      const oilKg = oilLine?.actualConsumedQuantity || 0;
      const oilTheo = oilLine?.adjustedTheoreticalQuantity || 0;
      const oilLoss = Math.max(0, Number((oilKg - oilTheo).toFixed(2)));
      const cansLine = lines.find(l => l.itemCode.includes('BOITE') || l.category === 'EMBALLAGE');
      const cansEngaged = cansLine?.withdrawnQuantity || actualProducedQty;
      const seamingRejects = cansLine?.wasteQuantity || 0;

      const newRecord = storage.addConsumption({
        workOrderId: selectedWorkOrder.id,
        workOrderNumber: selectedWorkOrder.orderNumber,
        recipeId: selectedRecipe.id,
        recipeCode: selectedRecipe.code,
        recipeVersion: selectedRecipe.version,
        finishedItemId: selectedWorkOrder.finishedItemId,
        finishedItemCode: finishedItem?.code || 'PF-THON-01',
        finishedItemName: selectedWorkOrder.productName,
        finishedBatchNumber: finishedBatchInput,
        lineId: lineInput,
        shift: shiftInput,
        consumptionDateTime: new Date().toISOString(),
        recordedBy: currentUser.name,
        status: statusToSave,
        plannedQuantityCans: selectedWorkOrder.plannedCansQty,
        actualProducedQuantityCans: actualProducedQty,
        conformQuantityCans: actualProducedQty,
        lines,
        yieldLossSummary: {
          rawFishEngagedKg: rawFishKg,
          dressedFishObtainedKg: dressedFishKg,
          cleaningYieldPercent: cleanYield,
          fishLostWasteKg: Number((rawFishKg - dressedFishKg).toFixed(2)),
          fishRecoverableByProductKg: Number(((rawFishKg - dressedFishKg) * 0.7).toFixed(2)),
          oilTheoreticalLitres: oilTheo,
          oilActualLitres: oilKg,
          oilLossLitres: oilLoss,
          oilLossPercent: oilTheo > 0 ? Number(((oilLoss / oilTheo) * 100).toFixed(2)) : 0,
          cansInitialEngaged: cansEngaged,
          cansSeamingRejects: seamingRejects,
          cansFinishedGoodYieldRate: cansEngaged > 0 ? Number((((cansEngaged - seamingRejects) / cansEngaged) * 100).toFixed(1)) : 0,
          fishIncorporatedPer1000CansKg: actualProducedQty > 0 ? Number(((dressedFishKg / actualProducedQty) * 1000).toFixed(1)) : 0,
        },
      });

      onSuccess(
        `Fiche de consommation ${newRecord.consumptionNumber} enregistrée avec succès (Statut : ${statusToSave}).`
      );
    } catch (err: any) {
      onError(err.message || 'Erreur lors de l\'enregistrement de la fiche.');
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Saisie d'une Nouvelle Consommation Réelle de Production"
      maxWidth="4xl"
    >
      <div className="space-y-6 text-xs max-h-[75vh] overflow-y-auto pr-1">
        {/* Étape 1 : Paramètres de l'Ordre de Fabrication (Section 4) */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
          <h4 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
            <Factory className="w-4 h-4 text-blue-600" />
            <span>Sélection de l'Ordre de Fabrication (OF) &amp; Référence Produit</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Ordre de Fabrication (OF) :
              </label>
              <select
                value={selectedWorkOrderId}
                onChange={e => setSelectedWorkOrderId(e.target.value)}
                className="w-full p-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-mono font-bold"
              >
                {activeWorkOrders.length === 0 ? (
                  <option value="">Aucun OF actif disponible — Créez d'abord un OF</option>
                ) : (
                  activeWorkOrders.map(wo => (
                    <option key={wo.id} value={wo.id}>
                      {wo.orderNumber} — {wo.productName} ({wo.plannedCansQty.toLocaleString()} btes)
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Nomenclature Applicable :
              </label>
              <input
                type="text"
                disabled
                value={selectedRecipe ? `${selectedRecipe.code} (${selectedRecipe.version})` : 'N/A'}
                className="w-full p-2 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 font-mono"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Lot de Fabrication (Produit Fini) :
              </label>
              <input
                type="text"
                value={finishedBatchInput}
                onChange={e => setFinishedBatchInput(e.target.value)}
                className="w-full p-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-mono font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Ligne de Production :
              </label>
              <select
                value={lineInput}
                onChange={e => setLineInput(e.target.value)}
                className="w-full p-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              >
                <option value="LIGNE-THON-01">LIGNE-THON-01 (Thon Albacore &amp; Listao)</option>
                <option value="LIGNE-SARDINE-02">LIGNE-SARDINE-02 (Sardines Club)</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Équipe de Production :
              </label>
              <select
                value={shiftInput}
                onChange={e => setShiftInput(e.target.value as any)}
                className="w-full p-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              >
                <option value="EQUIPE_MATIN">Équipe Matin (06h - 14h)</option>
                <option value="EQUIPE_SOIR">Équipe Soir (14h - 22h)</option>
                <option value="EQUIPE_NUIT">Équipe Nuit (22h - 06h)</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Quantité Réellement Produite (Boîtes) :
              </label>
              <input
                type="number"
                value={actualProducedQty}
                onChange={e => setActualProducedQty(parseInt(e.target.value) || 0)}
                className="w-full p-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-mono font-bold"
              />
              <span className="text-[10px] text-slate-500 font-mono">
                Prévu initialement : {selectedWorkOrder?.plannedCansQty.toLocaleString()} boîtes
              </span>
            </div>
          </div>
        </div>

        {/* Étape 2 : Tableau des 12 colonnes de saisie réelle (Section 4 & 6) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <Scale className="w-4 h-4 text-emerald-600" />
              <span>Tableau des 12 Colonnes de Consommation Réelle &amp; Écarts</span>
            </h4>
            <span className="text-[11px] text-slate-500">
              Ajustement automatique au réel ({actualProducedQty.toLocaleString()} boîtes)
            </span>
          </div>

          {/* Bannière temps réel des alertes de tolérance */}
          {lines.some(l => Math.abs(l.percentageVariance) > (l.tolerancePercent ?? 2)) && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-300 dark:border-amber-800 flex items-center justify-between text-xs text-amber-900 dark:text-amber-200">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  <strong>
                    {lines.filter(l => Math.abs(l.percentageVariance) > (l.tolerancePercent ?? 2)).length} composant(s)
                  </strong>{' '}
                  dépassent le seuil contractuel de tolérance. Renseignez obligatoirement le motif de l'écart dans la colonne 11.
                </span>
              </div>
            </div>
          )}

          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 font-semibold text-slate-600 dark:text-slate-400 uppercase text-[10px]">
                  <th className="py-2 px-2.5">1. Code</th>
                  <th className="py-2 px-2.5">2. Désignation</th>
                  <th className="py-2 px-2.5">3. Catégorie</th>
                  <th className="py-2 px-2.5">4. Lot Consommé</th>
                  <th className="py-2 px-2.5">5. Emplacement</th>
                  <th className="py-2 px-2.5 text-right">6. Théo Ajusté</th>
                  <th className="py-2 px-2.5 text-right">7. Réel Net Consommé</th>
                  <th className="py-2 px-2.5 text-center">8. Unité</th>
                  <th className="py-2 px-2.5 text-right">9. Écart Qté</th>
                  <th className="py-2 px-2.5 text-right">10. Écart %</th>
                  <th className="py-2 px-2.5">11. Motif Écart</th>
                  <th className="py-2 px-2.5">12. Opérateur</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                {lines.map(line => {
                  const isOverTolerance = Math.abs(line.percentageVariance) > (line.tolerancePercent ?? 2);
                  const isSevere = Math.abs(line.percentageVariance) > Math.max(5, (line.tolerancePercent ?? 2) * 1.5);
                  return (
                    <tr
                      key={line.id}
                      className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/20 ${
                        isOverTolerance ? 'bg-amber-50/20 dark:bg-amber-950/10' : ''
                      }`}
                    >
                      <td className="py-2 px-2.5 font-bold text-blue-600">{line.itemCode}</td>
                      <td className="py-2 px-2.5 font-sans font-medium text-slate-800 dark:text-slate-200">
                        {line.designation}
                      </td>
                      <td className="py-2 px-2.5 font-sans text-slate-500 text-[10px]">{line.category}</td>
                      <td className="py-2 px-2.5">
                        <input
                          type="text"
                          value={line.batchNumber}
                          onChange={e => handleUpdateLine(line.id, { batchNumber: e.target.value })}
                          className="w-28 p-1 text-[11px] bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded font-mono"
                        />
                      </td>
                      <td className="py-2 px-2.5">
                        <input
                          type="text"
                          value={line.storageLocation}
                          onChange={e => handleUpdateLine(line.id, { storageLocation: e.target.value })}
                          className="w-24 p-1 text-[11px] bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded font-sans"
                        />
                      </td>
                      <td className="py-2 px-2.5 text-right text-slate-500">
                        {line.adjustedTheoreticalQuantity}
                      </td>
                      <td className="py-2 px-2.5 text-right">
                        <input
                          type="number"
                          step="0.1"
                          value={line.actualConsumedQuantity}
                          onChange={e => {
                            const val = parseFloat(e.target.value) || 0;
                            handleUpdateLine(line.id, {
                              actualConsumedQuantity: val,
                              withdrawnQuantity: val + line.returnedQuantity + line.wasteQuantity,
                            });
                          }}
                          className="w-20 p-1 text-[11px] font-mono font-bold text-right bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded"
                        />
                      </td>
                      <td className="py-2 px-2.5 text-center font-sans font-semibold text-slate-500">{line.unit}</td>
                      <td className="py-2 px-2.5 text-right font-bold">
                        <span className={line.quantityVariance > 0 ? 'text-amber-600' : 'text-slate-700 dark:text-slate-300'}>
                          {line.quantityVariance > 0 ? `+${line.quantityVariance}` : line.quantityVariance}
                        </span>
                      </td>
                      <td className="py-2 px-2.5 text-right">
                        <div className="flex flex-col items-end gap-0.5">
                          <span
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                              !isOverTolerance
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                                : isSevere
                                ? 'bg-red-50 text-red-700 border-red-300 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800 shadow-2xs'
                                : 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800 shadow-2xs'
                            }`}
                          >
                            {isOverTolerance ? (
                              isSevere ? (
                                <AlertOctagon className="w-3 h-3 text-red-600 shrink-0 animate-pulse" />
                              ) : (
                                <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                              )
                            ) : (
                              <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                            )}
                            <span>{line.percentageVariance > 0 ? `+${line.percentageVariance}%` : `${line.percentageVariance}%`}</span>
                          </span>
                          <span
                            className={`text-[9px] font-sans ${
                              isOverTolerance ? 'text-amber-700 dark:text-amber-400 font-bold' : 'text-slate-400'
                            }`}
                          >
                            Seuil : ±{line.tolerancePercent}%
                          </span>
                        </div>
                      </td>
                      <td className="py-2 px-2.5">
                        <div className="relative">
                          <input
                            type="text"
                            placeholder={isOverTolerance ? 'Motif requis (seuil dépassé)' : 'Motif optionnel'}
                            value={line.varianceReason || ''}
                            onChange={e => handleUpdateLine(line.id, { varianceReason: e.target.value })}
                            className={`w-36 p-1 pr-6 text-[11px] font-sans border rounded transition-all ${
                              isOverTolerance && !line.varianceReason
                                ? 'border-red-400 bg-red-50/70 dark:bg-red-950/40 text-red-900 dark:text-red-100 placeholder-red-400 ring-1 ring-red-400'
                                : isOverTolerance
                                ? 'border-amber-400 bg-amber-50/50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-100 ring-1 ring-amber-300'
                                : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900'
                            }`}
                          />
                          {isOverTolerance && (
                            <span
                              className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none"
                              title="Motif obligatoire car seuil dépassé"
                            >
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-2.5">
                        <input
                          type="text"
                          value={line.responsibleOperator}
                          onChange={e => handleUpdateLine(line.id, { responsibleOperator: e.target.value })}
                          className="w-24 p-1 text-[11px] font-sans border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-900"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Étape 3 : Rapprochement Magasin : Sortie = Utilisé + Retourné + Rebut (Section 8) */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
          <h4 className="font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Boxes className="w-4 h-4 text-purple-600" />
              <span>Contrôle de Cohérence des Sorties de Stock &amp; Retours Magasin</span>
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              Règle : Sortie = Utilisé + Retourné + Rebut
            </span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {lines.map(l => (
              <div key={l.id} className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">{l.designation}</div>
                <div className="grid grid-cols-3 gap-1.5 text-[10px]">
                  <div>
                    <label className="text-slate-500 block">Sortie Mag.</label>
                    <input
                      type="number"
                      step="0.1"
                      value={l.withdrawnQuantity}
                      onChange={e => handleUpdateLine(l.id, { withdrawnQuantity: parseFloat(e.target.value) || 0 })}
                      className="w-full p-1 font-mono text-xs border border-slate-300 dark:border-slate-700 rounded text-right font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-slate-500 block">Retourné</label>
                    <input
                      type="number"
                      step="0.1"
                      value={l.returnedQuantity}
                      onChange={e => handleUpdateLine(l.id, { returnedQuantity: parseFloat(e.target.value) || 0 })}
                      className="w-full p-1 font-mono text-xs border border-slate-300 dark:border-slate-700 rounded text-right text-blue-600"
                    />
                  </div>
                  <div>
                    <label className="text-slate-500 block">Rebut/Perte</label>
                    <input
                      type="number"
                      step="0.1"
                      value={l.wasteQuantity}
                      onChange={e => handleUpdateLine(l.id, { wasteQuantity: parseFloat(e.target.value) || 0 })}
                      className="w-full p-1 font-mono text-xs border border-slate-300 dark:border-slate-700 rounded text-right text-amber-600"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Boutons d'action */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            Annuler
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSubmit('BROUILLON')}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Enregistrer en Brouillon
            </button>
            <button
              onClick={() => handleSubmit('EN_ATTENTE_VALIDATION')}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors cursor-pointer shadow-xs"
            >
              <Check className="w-4 h-4" />
              <span>Soumettre à Validation Qualité</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
