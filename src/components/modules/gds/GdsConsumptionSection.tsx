/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * MAMORA GP — GDS : consommations de production (sortie directe du stock).
 *
 * Modèle retenu : la sortie de stock a lieu AU MOMENT DE LA CONSOMMATION RÉELLE.
 * Aucun transfert vers un magasin atelier n'est imposé. La fiche de consommation
 * est créée puis validée ; la validation déduit directement le stock du magasin
 * d'origine, enregistre le mouvement et le lien avec l'ordre de fabrication.
 */

import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  PackageMinus,
  RotateCcw,
  Scale,
  XCircle,
} from 'lucide-react';
import { storage } from '../../../services/storage';
import {
  ConsumptionLine,
  ConsumptionRecord,
  Item,
  ItemCategory,
  UnitOfMeasure,
  User,
  WorkOrder,
} from '../../../types';
import { Modal } from '../../common/Modal';
import {
  EmptyState,
  GdsCard,
  Pill,
  btnGhost,
  btnPrimary,
  fmtDate,
  fmtQty,
  fmtQtyUnit,
  inputCls,
  labelCls,
  tdCls,
  thCls,
} from './GdsShared';

const CATEGORY_TO_LINE: Record<string, ConsumptionLine['category']> = {
  POISSON_FRAIS: 'MATIERE_PREMIERE',
  POISSON_CONGELE: 'MATIERE_PREMIERE',
  HUILE: 'INGREDIENT',
  SAUCE_EPICES: 'INGREDIENT',
  BOITE_METALLIQUE: 'EMBALLAGE',
  COUVERCLE: 'EMBALLAGE',
  CARTON_EMBALLAGE: 'EMBALLAGE',
  ETIQUETTE: 'EMBALLAGE',
  CONSOMMABLE: 'CONSOMMABLE',
  PRODUIT_CHIMIQUE: 'CONSOMMABLE',
};

const lineCategoryFor = (item: Item): ConsumptionLine['category'] =>
  CATEGORY_TO_LINE[item.category as ItemCategory] || 'MATIERE_PREMIERE';

const STATUS_LABELS: Record<ConsumptionRecord['status'], string> = {
  BROUILLON: 'Brouillon',
  EN_COURS: 'En cours',
  EN_ATTENTE_VALIDATION: 'En attente de validation',
  VALIDEE: 'Validée',
  ANNULEE: 'Annulée',
};

const statusTone = (status: ConsumptionRecord['status']) =>
  status === 'VALIDEE'
    ? 'emerald'
    : status === 'ANNULEE'
      ? 'red'
      : status === 'EN_ATTENTE_VALIDATION'
        ? 'amber'
        : 'slate';

// ---------------------------------------------------------------------------
// Saisie et validation des consommations réelles
// ---------------------------------------------------------------------------

export const MpConsumptionSection: React.FC<{
  currentUser: User;
  onNotice: (message: string) => void;
  onError: (message: string) => void;
}> = ({ currentUser, onNotice, onError }) => {
  const [revision, setRevision] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [workOrderId, setWorkOrderId] = useState('');
  const [detail, setDetail] = useState<ConsumptionRecord | null>(null);
  const [form, setForm] = useState<
    Record<string, { lotId: string; qty: string; waste: string; withdrawn: string }>
  >({});
  const [varianceReasons, setVarianceReasons] = useState<Record<string, string>>({});

  const workOrders: WorkOrder[] = useMemo(() => storage.getWorkOrders(), [revision]);
  const eligibleOrders = workOrders.filter(wo =>
    ['EN_COURS', 'EN_CONTROLE', 'CLOTURE'].includes(wo.status)
  );
  const consumptions = useMemo(() => storage.getConsumptions(), [revision]);
  const requirements = useMemo(
    () => (workOrderId ? storage.getWorkOrderMaterialRequirements(workOrderId) : []),
    [workOrderId, revision]
  );

  const selectedOrder = workOrders.find(wo => wo.id === workOrderId);
  const canValidate = ['RESPONSABLE_PRODUCTION', 'RESPONSABLE_QUALITE', 'DIRECTEUR_USINE', 'ADMIN'].includes(
    currentUser.role
  );

  const openCreate = (orderId = '') => {
    setWorkOrderId(orderId);
    setForm({});
    setVarianceReasons({});
    setCreateOpen(true);
  };

  const updateForm = (
    itemId: string,
    patch: Partial<{ lotId: string; qty: string; waste: string; withdrawn: string }>
  ) => {
    setForm(previous => {
      const current = previous[itemId] || { lotId: '', qty: '', waste: '', withdrawn: '' };
      return { ...previous, [itemId]: { ...current, ...patch } };
    });
  };

  /** Quantité physiquement prélevée : saisie explicite, sinon consommé + pertes. */
  const withdrawnOf = (entry?: { qty?: string; waste?: string; withdrawn?: string }) => {
    const qty = Number(entry?.qty || 0);
    const waste = Number(entry?.waste || 0);
    const declared = entry?.withdrawn;
    if (declared === undefined || declared === '') return qty + waste;
    return Number(declared) || 0;
  };

  const lotOf = (requirementIndex: number) => {
    const requirement = requirements[requirementIndex];
    if (!requirement) return undefined;
    const entry = form[requirement.itemId];
    const lotId = entry?.lotId || requirement.availableLots[0]?.lotId;
    return requirement.availableLots.find(lot => lot.lotId === lotId) || requirement.availableLots[0];
  };

  /** Contrôle de disponibilité réel avant toute écriture. */
  const availabilityIssues = requirements
    .map(requirement => {
      const entry = form[requirement.itemId];
      const qty = Number(entry?.qty || 0);
      const waste = Number(entry?.waste || 0);
      if (qty + waste <= 0) return null;
      const lot = lotOf(requirements.indexOf(requirement));
      const available = lot?.quantity || 0;
      const withdrawn = withdrawnOf(entry);
      if (!lot) {
        return `${requirement.itemCode} : aucun lot libéré disponible.`;
      }
      if (withdrawn + 0.001 < qty + waste) {
        return `${requirement.itemCode} : la quantité prélevée (${fmtQty(withdrawn)} ${requirement.unit}) ne peut pas être inférieure au consommé + pertes (${fmtQty(qty + waste)} ${requirement.unit}).`;
      }
      if (withdrawn > available + 0.001) {
        return `${requirement.itemCode} lot ${lot.lotNumber} : ${fmtQty(available)} ${requirement.unit} disponibles, ${fmtQty(withdrawn)} prélevés.`;
      }
      return null;
    })
    .filter((issue): issue is string => Boolean(issue));

  const submit = () => {
    if (!selectedOrder) {
      onError('Sélectionnez un ordre de fabrication.');
      return;
    }
    try {
      const lines: ConsumptionLine[] = [];
      for (const requirement of requirements) {
        const entry = form[requirement.itemId];
        const qty = Number(entry?.qty || 0);
        const waste = Number(entry?.waste || 0);
        if (qty + waste <= 0) continue;
        const lot = lotOf(requirements.indexOf(requirement));
        if (!lot) throw new Error(`Aucun lot disponible pour ${requirement.itemCode}.`);
        const item = storage.getItems().find(i => i.id === requirement.itemId);
        if (!item) continue;
        const variance = qty - requirement.requiredQty;
        const withdrawn = withdrawnOf(entry);

        lines.push({
          id: `CL-${requirement.itemId}`,
          itemId: requirement.itemId,
          itemCode: requirement.itemCode,
          designation: requirement.designation,
          category: lineCategoryFor(item),
          lots: [
            {
              lotId: lot.lotId,
              lotNumber: lot.lotNumber,
              withdrawnQty: withdrawn,
              usedQty: qty,
              returnedQty: 0,
              wasteQty: waste,
              unit: requirement.unit,
              storageLocation: '',
              lotStatus: 'LIBERE',
            },
          ],
          batchNumber: lot.lotNumber,
          storageLocation: '',
          initialTheoreticalQuantity: requirement.requiredQty,
          adjustedTheoreticalQuantity: requirement.requiredQty,
          actualConsumedQuantity: qty,
          withdrawnQuantity: withdrawn,
          returnedQuantity: 0,
          wasteQuantity: waste,
          unit: requirement.unit,
          tolerancePercent: 2,
          quantityVariance: variance,
          percentageVariance:
            requirement.requiredQty > 0 ? (variance / requirement.requiredQty) * 100 : 0,
          varianceReason: varianceReasons[requirement.itemId] || undefined,
          responsibleOperator: currentUser.name,
        });
      }

      if (lines.length === 0) {
        onError('Aucune quantité saisie : la consommation ne peut pas être vide.');
        return;
      }

      const recipe = storage.getRecipes().find(r => r.id === selectedOrder.recipeId);
      const finishedItem = storage.getItems().find(i => i.id === selectedOrder.finishedItemId);

      const record = storage.addConsumption({
        workOrderId: selectedOrder.id,
        workOrderNumber: selectedOrder.orderNumber,
        recipeId: selectedOrder.recipeId,
        recipeCode: recipe?.code || selectedOrder.recipeId,
        recipeVersion: selectedOrder.recipeVersion || recipe?.version || '1.0',
        finishedItemId: selectedOrder.finishedItemId,
        finishedItemCode: finishedItem?.code || '',
        finishedItemName: selectedOrder.productName,
        finishedBatchNumber: '',
        lineId: selectedOrder.lineId,
        shift: selectedOrder.shift,
        consumptionDateTime: new Date().toISOString(),
        recordedBy: currentUser.name,
        status: 'EN_ATTENTE_VALIDATION',
        plannedQuantityCans: selectedOrder.plannedCansQty,
        actualProducedQuantityCans: selectedOrder.actualCansQty,
        conformQuantityCans: selectedOrder.actualCansQty,
        lines,
        notes: 'Consommation réelle saisie depuis le module GDS (sortie directe du stock).',
      });

      onNotice(
        `Consommation ${record.consumptionNumber} créée. Le stock sera déduit à sa validation.`
      );
      setCreateOpen(false);
      setRevision(value => value + 1);
    } catch (error) {
      onError(error instanceof Error ? error.message : String(error));
    }
  };

  const validate = (record: ConsumptionRecord) => {
    try {
      storage.validateConsumption(record.id, currentUser);
      onNotice(
        `Consommation ${record.consumptionNumber} validée : le stock a été déduit directement du magasin d'origine.`
      );
      setRevision(value => value + 1);
    } catch (error) {
      onError(error instanceof Error ? error.message : String(error));
    }
  };

  const cancel = (record: ConsumptionRecord) => {
    try {
      storage.cancelConsumption(record.id, currentUser, 'Annulation depuis le module GDS');
      onNotice(`Consommation ${record.consumptionNumber} annulée.`);
      setRevision(value => value + 1);
    } catch (error) {
      onError(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        {[
          { label: 'Fiches de consommation', value: consumptions.length, tone: 'text-slate-700' },
          {
            label: 'En attente de validation',
            value: consumptions.filter(c => c.status === 'EN_ATTENTE_VALIDATION').length,
            tone: 'text-amber-600',
          },
          {
            label: 'Validées',
            value: consumptions.filter(c => c.status === 'VALIDEE').length,
            tone: 'text-emerald-600',
          },
          {
            label: 'OF éligibles',
            value: eligibleOrders.length,
            tone: 'text-blue-600',
          },
        ].map(kpi => (
          <div
            key={kpi.label}
            className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800"
          >
            <p className="text-[10px] uppercase font-semibold text-slate-500">{kpi.label}</p>
            <p className={`text-lg font-bold ${kpi.tone}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      <GdsCard
        title="Consommations de production"
        subtitle="La sortie de stock intervient à la validation de la consommation réelle, jamais avant."
        actions={
          <button type="button" className={btnPrimary} onClick={() => openCreate()}>
            <PackageMinus className="w-3.5 h-3.5" />
            Nouvelle consommation
          </button>
        }
        bodyClassName="p-0"
      >
        {consumptions.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="Aucune consommation enregistrée"
            hint="Créez une fiche depuis un ordre de fabrication : les quantités théoriques sont issues de la nomenclature."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/60">
                <tr>
                  <th className={thCls}>N°</th>
                  <th className={thCls}>OF</th>
                  <th className={thCls}>Produit</th>
                  <th className={thCls}>Date</th>
                  <th className={`${thCls} text-right`}>Lignes</th>
                  <th className={thCls}>Statut</th>
                  <th className={`${thCls} text-right`}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {consumptions.map(record => (
                  <tr key={record.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className={`${tdCls} font-mono text-[10.5px] font-semibold whitespace-nowrap`}>
                      {record.consumptionNumber}
                    </td>
                    <td className={`${tdCls} font-mono text-[10.5px] whitespace-nowrap`}>
                      {record.workOrderNumber}
                    </td>
                    <td className={`${tdCls} max-w-[220px] truncate`} title={record.finishedItemName}>
                      {record.finishedItemName}
                    </td>
                    <td className={`${tdCls} whitespace-nowrap`}>{fmtDate(record.consumptionDateTime)}</td>
                    <td className={`${tdCls} text-right font-mono`}>{record.lines.length}</td>
                    <td className={tdCls}>
                      <Pill tone={statusTone(record.status)}>{STATUS_LABELS[record.status]}</Pill>
                    </td>
                    <td className={`${tdCls} text-right whitespace-nowrap space-x-2`}>
                      <button
                        type="button"
                        className="text-[10px] font-semibold text-blue-600 hover:underline cursor-pointer"
                        onClick={() => setDetail(record)}
                      >
                        Détail
                      </button>
                      {record.status === 'EN_ATTENTE_VALIDATION' && (
                        <button
                          type="button"
                          disabled={!canValidate}
                          title={
                            canValidate
                              ? 'Valider et déduire le stock'
                              : 'Validation réservée à la production, la qualité ou la direction'
                          }
                          className="text-[10px] font-semibold text-emerald-600 hover:underline cursor-pointer disabled:text-slate-300 disabled:cursor-not-allowed"
                          onClick={() => validate(record)}
                        >
                          Valider
                        </button>
                      )}
                      {record.status !== 'VALIDEE' && record.status !== 'ANNULEE' && (
                        <button
                          type="button"
                          className="text-[10px] font-semibold text-red-600 hover:underline cursor-pointer"
                          onClick={() => cancel(record)}
                        >
                          Annuler
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GdsCard>

      {/* --- Création --- */}
      <Modal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Nouvelle consommation réelle"
        subtitle="Les quantités théoriques proviennent de la nomenclature validée de l'OF."
        maxWidth="4xl"
      >
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Ordre de fabrication *</label>
            <select
              className={`${inputCls} w-full`}
              value={workOrderId}
              onChange={event => {
                setWorkOrderId(event.target.value);
                setForm({});
              }}
            >
              <option value="">— Sélectionner un OF —</option>
              {eligibleOrders.map(order => (
                <option key={order.id} value={order.id}>
                  {order.orderNumber} — {order.productName} ({order.status})
                </option>
              ))}
            </select>
          </div>

          {!selectedOrder ? (
            <EmptyState
              icon={ClipboardList}
              title="Aucun ordre de fabrication sélectionné"
              hint="Choisissez un OF en cours, en contrôle ou clôturé pour saisir la consommation réelle."
            />
          ) : requirements.length === 0 ? (
            <EmptyState
              icon={AlertTriangle}
              title="Nomenclature sans composant"
              hint="Cet OF ne comporte aucune ligne de nomenclature exploitable."
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[840px]">
                  <thead className="bg-slate-50 dark:bg-slate-800/60">
                    <tr>
                      <th className={thCls}>Article</th>
                      <th className={`${thCls} text-right whitespace-nowrap`}>Théorique</th>
                      <th className={thCls}>Lot consommé</th>
                      <th className={`${thCls} text-right whitespace-nowrap`}>Prélevé</th>
                      <th className={`${thCls} text-right whitespace-nowrap`}>Consommé</th>
                      <th className={`${thCls} text-right whitespace-nowrap`}>Pertes</th>
                      <th className={`${thCls} text-right whitespace-nowrap`}>Reliquat</th>
                      <th className={`${thCls} text-right whitespace-nowrap`}>Écart</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {requirements.map((requirement, index) => {
                      const entry = form[requirement.itemId];
                      const lot = lotOf(index);
                      const qty = Number(entry?.qty || 0);
                      const waste = Number(entry?.waste || 0);
                      const variance = qty - requirement.requiredQty;
                      const withdrawn = withdrawnOf(entry);
                      const surplus = Math.max(0, withdrawn - qty - waste);
                      return (
                        <tr key={requirement.itemId}>
                          <td className={`${tdCls} max-w-[230px]`}>
                            <span className="font-mono text-[10px] text-slate-500">
                              {requirement.itemCode}
                            </span>
                            <span className="block text-[11px] truncate" title={requirement.designation}>
                              {requirement.designation}
                            </span>
                          </td>
                          <td className={`${tdCls} text-right font-mono whitespace-nowrap`}>
                            {fmtQtyUnit(requirement.requiredQty, requirement.unit)}
                          </td>
                          <td className={tdCls}>
                            {requirement.availableLots.length === 0 ? (
                              <span className="text-[10px] text-red-600 font-semibold">
                                Aucun lot libéré
                              </span>
                            ) : (
                              <select
                                className={`${inputCls} w-full text-[11px]`}
                                value={lot?.lotId || ''}
                                onChange={event =>
                                  updateForm(requirement.itemId, { lotId: event.target.value })
                                }
                              >
                                {requirement.availableLots.map(availableLot => (
                                  <option key={availableLot.lotId} value={availableLot.lotId}>
                                    {availableLot.lotNumber} — {fmtQty(availableLot.quantity)}{' '}
                                    {requirement.unit}
                                  </option>
                                ))}
                              </select>
                            )}
                            {lot && (
                              <span className="block mt-0.5 text-[9.5px] text-slate-400 whitespace-nowrap">
                                Dispo. {fmtQtyUnit(lot.quantity, requirement.unit)}
                              </span>
                            )}
                          </td>
                          <td className={`${tdCls} text-right`}>
                            <input
                              type="number"
                              min={0}
                              step="any"
                              className={`${inputCls} w-20 text-right`}
                              placeholder={String(qty + waste || '')}
                              value={entry?.withdrawn || ''}
                              onChange={event =>
                                updateForm(requirement.itemId, { withdrawn: event.target.value })
                              }
                            />
                          </td>
                          <td className={`${tdCls} text-right`}>
                            <input
                              type="number"
                              min={0}
                              step="any"
                              className={`${inputCls} w-20 text-right`}
                              value={entry?.qty || ''}
                              onChange={event =>
                                updateForm(requirement.itemId, { qty: event.target.value })
                              }
                            />
                          </td>
                          <td className={`${tdCls} text-right`}>
                            <input
                              type="number"
                              min={0}
                              step="any"
                              className={`${inputCls} w-20 text-right`}
                              value={entry?.waste || ''}
                              onChange={event =>
                                updateForm(requirement.itemId, { waste: event.target.value })
                              }
                            />
                          </td>
                          <td
                            className={`${tdCls} text-right font-mono whitespace-nowrap ${
                              surplus > 0 ? 'text-amber-600 font-semibold' : 'text-slate-400'
                            }`}
                          >
                            {surplus > 0 ? fmtQtyUnit(surplus, requirement.unit) : '—'}
                          </td>
                          <td
                            className={`${tdCls} text-right font-mono whitespace-nowrap ${
                              Math.abs(variance) > 0.001
                                ? variance > 0
                                  ? 'text-orange-600 font-semibold'
                                  : 'text-emerald-600 font-semibold'
                                : 'text-slate-400'
                            }`}
                          >
                            {qty === 0 && waste === 0 ? '—' : `${variance > 0 ? '+' : ''}${fmtQty(variance)}`}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {availabilityIssues.length > 0 && (
                <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-[11px] text-red-700 dark:bg-red-950/40 dark:border-red-800 dark:text-red-300 space-y-1">
                  {availabilityIssues.map(issue => (
                    <p key={issue} className="flex items-start gap-1.5">
                      <XCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      {issue}
                    </p>
                  ))}
                </div>
              )}

              <p className="text-[10.5px] text-slate-500">
                Le stock n'est déduit qu'à la validation de la fiche : le « prélevé » sort du magasin
                d'origine, la part non consommée devient un reliquat à retourner depuis « Retours de
                production » (mouvement distinct). Aucun transfert vers un magasin atelier n'est
                imposé.
              </p>

              <div className="flex items-center justify-end gap-2">
                <button type="button" className={btnGhost} onClick={() => setCreateOpen(false)}>
                  Annuler
                </button>
                <button
                  type="button"
                  className={btnPrimary}
                  onClick={submit}
                  disabled={availabilityIssues.length > 0}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Créer la fiche
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* --- Détail --- */}
      <Modal
        isOpen={Boolean(detail)}
        onClose={() => setDetail(null)}
        title={detail ? `Consommation ${detail.consumptionNumber}` : ''}
        subtitle={detail ? `${detail.workOrderNumber} — ${detail.finishedItemName}` : undefined}
        maxWidth="3xl"
      >
        {detail && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 text-[11px]">
              <div className="p-2 rounded border border-slate-200 dark:border-slate-700">
                <p className="text-[9.5px] uppercase text-slate-500">Statut</p>
                <Pill tone={statusTone(detail.status)}>{STATUS_LABELS[detail.status]}</Pill>
              </div>
              <div className="p-2 rounded border border-slate-200 dark:border-slate-700">
                <p className="text-[9.5px] uppercase text-slate-500">Enregistrée par</p>
                <p className="font-semibold">{detail.recordedBy}</p>
              </div>
              <div className="p-2 rounded border border-slate-200 dark:border-slate-700">
                <p className="text-[9.5px] uppercase text-slate-500">Validée par</p>
                <p className="font-semibold">{detail.validatedBy || '—'}</p>
              </div>
              <div className="p-2 rounded border border-slate-200 dark:border-slate-700">
                <p className="text-[9.5px] uppercase text-slate-500">Date</p>
                <p className="font-semibold">{fmtDate(detail.consumptionDateTime)}</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/60">
                  <tr>
                    <th className={thCls}>Article</th>
                    <th className={thCls}>Lot</th>
                    <th className={`${thCls} text-right`}>Théorique</th>
                    <th className={`${thCls} text-right`}>Consommé</th>
                    <th className={`${thCls} text-right`}>Pertes</th>
                    <th className={`${thCls} text-right`}>Écart</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {detail.lines.map(line => (
                    <tr key={line.id}>
                      <td className={`${tdCls} max-w-[220px] truncate`}>{line.designation}</td>
                      <td className={`${tdCls} font-mono text-[10px]`}>{line.batchNumber}</td>
                      <td className={`${tdCls} text-right font-mono`}>
                        {fmtQtyUnit(line.adjustedTheoreticalQuantity, line.unit)}
                      </td>
                      <td className={`${tdCls} text-right font-mono font-semibold`}>
                        {fmtQtyUnit(line.actualConsumedQuantity, line.unit)}
                      </td>
                      <td className={`${tdCls} text-right font-mono`}>
                        {fmtQtyUnit(line.wasteQuantity, line.unit)}
                      </td>
                      <td className={`${tdCls} text-right font-mono`}>
                        {line.quantityVariance > 0 ? '+' : ''}
                        {fmtQty(line.quantityVariance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Retours de production (mouvement distinct, lot d'origine conservé)
// ---------------------------------------------------------------------------

type ReturnCandidate = {
  key: string;
  workOrderId: string;
  orderNumber: string;
  itemId: string;
  itemCode: string;
  designation: string;
  lotId: string;
  lotNumber: string;
  unit: UnitOfMeasure;
  withdrawnQty: number;
  consumedQty: number;
  returnedQty: number;
  returnableQty: number;
};

/**
 * Reliquats réellement retournables sur un OF.
 *
 * En sortie directe, le stock n'est déduit que des quantités réellement
 * consommées : un retour ne peut donc porter que sur le surplus physiquement
 * sorti mais non consommé (sorti − consommé − déjà retourné). Retourner une
 * quantité déjà consommée gonflerait artificiellement le stock (double comptage).
 */
const collectReturnCandidates = (): ReturnCandidate[] => {
  const consumptions = storage.getConsumptions().filter(c => c.status === 'VALIDEE');
  const returnedMovements = storage.getStockMovements().filter(m => m.type === 'RETOUR_MAGASIN');
  const round = (value: number) => Number(value.toFixed(3));
  const candidates: ReturnCandidate[] = [];

  for (const record of consumptions) {
    for (const line of record.lines) {
      for (const lot of line.lots) {
        const alreadyReturned = returnedMovements
          .filter(
            m =>
              m.workOrderId === record.workOrderId &&
              m.itemId === line.itemId &&
              (m.lotId === lot.lotId || m.batchNumber === lot.lotNumber)
          )
          .reduce((sum, m) => sum + Math.abs(m.stockDelta || m.quantity || 0), 0);

        const withdrawn = lot.withdrawnQty ?? line.withdrawnQuantity ?? 0;
        const consumed = lot.usedQty ?? line.actualConsumedQuantity ?? 0;
        const declared = lot.returnedQty ?? line.returnedQuantity ?? 0;
        const returnableQty = round(withdrawn - consumed - declared - alreadyReturned);
        if (returnableQty <= 0.001) continue;

        candidates.push({
          key: `${record.workOrderId}:${line.itemId}:${lot.lotId || lot.lotNumber}`,
          workOrderId: record.workOrderId,
          orderNumber: record.workOrderNumber,
          itemId: line.itemId,
          itemCode: line.itemCode,
          designation: line.designation,
          lotId: lot.lotId,
          lotNumber: lot.lotNumber,
          unit: lot.unit || line.unit,
          withdrawnQty: withdrawn,
          consumedQty: consumed,
          returnedQty: round(declared + alreadyReturned),
          returnableQty,
        });
      }
    }
  }
  return candidates;
};

export const MpReturnsSection: React.FC<{
  currentUser: User;
  onNotice: (message: string) => void;
  onError: (message: string) => void;
}> = ({ currentUser, onNotice, onError }) => {
  const [revision, setRevision] = useState(0);
  const [workOrderId, setWorkOrderId] = useState(() => collectReturnCandidates()[0]?.workOrderId || '');
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [reason, setReason] = useState('');

  const candidates = useMemo(() => collectReturnCandidates(), [revision]);
  const workOrders = useMemo(() => storage.getWorkOrders(), [revision]);
  const selectedOrder = workOrders.find(wo => wo.id === workOrderId);
  const lines = candidates.filter(line => line.workOrderId === workOrderId);

  const submit = () => {
    if (!selectedOrder) {
      onError('Sélectionnez un ordre de fabrication.');
      return;
    }
    if (!reason.trim()) {
      onError('Le motif du retour est obligatoire.');
      return;
    }
    try {
      let count = 0;
      for (const line of lines) {
        const qty = Number(quantities[line.key] || 0);
        if (qty <= 0) continue;
        if (qty > line.returnableQty + 0.001) {
          throw new Error(
            `${line.itemCode} lot ${line.lotNumber} : retour supérieur au reliquat réellement sorti et non consommé (${line.returnableQty} ${line.unit}).`
          );
        }
        const item = storage.getItems().find(i => i.id === line.itemId);
        const target = item ? storage.getDefaultWarehouseForCategory(item.category) : undefined;
        if (!target) throw new Error(`Aucun magasin de destination pour ${line.itemCode}.`);
        const location = storage.getWarehouseLocations(target.id)[0];
        if (!location) throw new Error(`Aucun emplacement actif dans ${target.code}.`);

        storage.addStockMovement({
          type: 'RETOUR_MAGASIN',
          itemId: line.itemId,
          itemCode: line.itemCode,
          batchNumber: line.lotNumber,
          lotId: line.lotId,
          quantity: qty,
          unit: item!.unit,
          destinationWarehouseId: target.id,
          destinationLocationId: location.id,
          documentNumber: selectedOrder.id,
          workOrderId: selectedOrder.id,
          userId: currentUser.id,
          userName: currentUser.name,
          reason: `Retour de production — ${reason.trim()}`,
        });
        count += 1;
      }
      if (count === 0) {
        onError('Aucune quantité de retour saisie.');
        return;
      }
      onNotice(`${count} retour(s) enregistré(s) : mouvement distinct rattaché à ${selectedOrder.orderNumber}.`);
      setQuantities({});
      setReason('');
      setRevision(value => value + 1);
    } catch (error) {
      onError(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <div className="space-y-4">
      <GdsCard
        title="Retours de matières non consommées"
        subtitle="Chaque retour est un mouvement distinct, rattaché à l'OF d'origine et au lot consommé : le reliquat prélevé mais non consommé réintègre son magasin d'origine."
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div>
            <label className={labelCls}>Ordre de fabrication *</label>
            <select
              className={`${inputCls} w-full`}
              value={workOrderId}
              onChange={event => {
                setWorkOrderId(event.target.value);
                setQuantities({});
              }}
            >
              <option value="">— Sélectionner un OF —</option>
              {Array.from(new Set(candidates.map(line => line.workOrderId))).map(id => {
                const order = workOrders.find(wo => wo.id === id);
                return (
                  <option key={id} value={id}>
                    {order?.orderNumber || id} — {order?.productName || ''}
                  </option>
                );
              })}
            </select>
          </div>
          <div className="lg:col-span-2">
            <label className={labelCls}>Motif du retour *</label>
            <input
              className={`${inputCls} w-full`}
              value={reason}
              onChange={event => setReason(event.target.value)}
              placeholder="Reliquat non incorporé, fin de série, erreur de dotation…"
            />
          </div>
        </div>
      </GdsCard>

      <GdsCard title="Reliquats sortis non consommés" bodyClassName="p-0">
        {!workOrderId ? (
          <EmptyState
            icon={RotateCcw}
            title="Aucun ordre sélectionné"
            hint="Les retours s'appuient sur les consommations validées de l'ordre de fabrication."
          />
        ) : lines.length === 0 ? (
          <EmptyState
            icon={Scale}
            title="Aucun reliquat à retourner"
            hint="Le stock n'est déduit que des quantités réellement consommées : rien n'est sorti en trop pour cet ordre."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[860px]">
                <thead className="bg-slate-50 dark:bg-slate-800/60">
                  <tr>
                    <th className={thCls}>Article</th>
                    <th className={thCls}>Lot</th>
                    <th className={`${thCls} text-right whitespace-nowrap`}>Sorti</th>
                    <th className={`${thCls} text-right whitespace-nowrap`}>Consommé</th>
                    <th className={`${thCls} text-right whitespace-nowrap`}>Déjà retourné</th>
                    <th className={`${thCls} text-right whitespace-nowrap`}>Reliquat</th>
                    <th className={`${thCls} text-right`}>Retour</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {lines.map(line => (
                    <tr key={line.key}>
                      <td className={`${tdCls} max-w-[240px] truncate`} title={line.designation}>
                        <span className="font-mono text-[10px] text-slate-500">{line.itemCode}</span>{' '}
                        {line.designation}
                      </td>
                      <td className={`${tdCls} font-mono text-[10px] whitespace-nowrap`}>
                        {line.lotNumber}
                      </td>
                      <td className={`${tdCls} text-right font-mono whitespace-nowrap`}>
                        {fmtQtyUnit(line.withdrawnQty, line.unit)}
                      </td>
                      <td className={`${tdCls} text-right font-mono whitespace-nowrap`}>
                        {fmtQtyUnit(line.consumedQty, line.unit)}
                      </td>
                      <td className={`${tdCls} text-right font-mono text-slate-500 whitespace-nowrap`}>
                        {fmtQtyUnit(line.returnedQty, line.unit)}
                      </td>
                      <td
                        className={`${tdCls} text-right font-mono font-semibold whitespace-nowrap ${
                          line.returnableQty > 0 ? 'text-amber-600' : 'text-slate-400'
                        }`}
                      >
                        {fmtQtyUnit(line.returnableQty, line.unit)}
                      </td>
                      <td className={`${tdCls} text-right`}>
                        <input
                          type="number"
                          min={0}
                          max={line.returnableQty}
                          step="any"
                          className={`${inputCls} w-24 text-right`}
                          value={quantities[line.key] || ''}
                          onChange={event =>
                            setQuantities({ ...quantities, [line.key]: event.target.value })
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-end gap-2 px-3 py-2">
              <button type="button" className={btnPrimary} onClick={submit}>
                <RotateCcw className="w-3.5 h-3.5" />
                Enregistrer les retours
              </button>
            </div>
          </>
        )}
      </GdsCard>
    </div>
  );
};
