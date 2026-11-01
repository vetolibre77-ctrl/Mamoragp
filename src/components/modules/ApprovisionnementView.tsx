/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * MAMORA GP — Service Approvisionnement
 * Cycle des achats : demandes, réapprovisionnement automatique, validation
 * multi-niveaux, budgets, fournisseurs et paramétrage du circuit.
 * Toutes les données proviennent du référentiel central (articles, fournisseurs,
 * magasins, stocks, utilisateurs) — aucun second référentiel n'est créé.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  LayoutDashboard,
  FileText,
  Zap,
  CheckSquare,
  Wallet,
  Users,
  Settings2,
  Plus,
  Search,
  Eye,
  Pencil,
  Send,
  XCircle,
  CheckCircle2,
  AlertTriangle,
  X,
  Truck,
  ArrowRight,
  Lock,
  PackageSearch,
  ClipboardList,
  BarChart3,
  FileSignature,
  Star,
  Scale,
  ShoppingCart,
  PackageCheck,
  Gauge,
} from 'lucide-react';
import { storage } from '../../services/storage';
import { Modal } from '../common/Modal';
import { ProcurementCycleSections } from './approvisionnement/CycleSections';
import {
  Item,
  ItemCategoryGroup,
  PurchasePriority,
  PurchaseRequest,
  PurchaseRequestLine,
  PurchaseRequestStatus,
  PurchaseRequestType,
  ProcurementDepartment,
  ProcurementPermission,
  ProcurementBudgetStatus,
  ApprovalDecisionKind,
  ApprovalStep,
  User,
  UserRole,
  UnitOfMeasure,
  UNIT_LABELS,
  ITEM_CATEGORY_GROUP_LABELS,
  ITEM_CATEGORY_GROUPS,
  PURCHASE_PRIORITY_LABELS,
  PURCHASE_REQUEST_STATUS_LABELS,
  PURCHASE_REQUEST_TYPE_LABELS,
  PROCUREMENT_DEPARTMENT_LABELS,
  PROCUREMENT_PERMISSION_LABELS,
  PROCUREMENT_ROLE_PERMISSIONS,
  APPROVAL_DECISION_LABELS,
  getRoleLabel,
} from '../../types';

export type ProcurementSection =
  | 'DASHBOARD'
  | 'REQUESTS'
  | 'AUTO'
  | 'VALIDATION'
  | 'BUDGETS'
  | 'SUPPLIERS'
  | 'SETTINGS'
  | 'CONSULTATIONS'
  | 'COMPARISON'
  | 'ORDERS'
  | 'TRACKING'
  | 'RECEPTIONS'
  | 'EVALUATION'
  | 'CONTRACTS'
  | 'REPORTS';

/** Sections implémentées par le composant du cycle aval. */
const CYCLE_SECTIONS: ProcurementSection[] = [
  'CONSULTATIONS',
  'COMPARISON',
  'ORDERS',
  'TRACKING',
  'RECEPTIONS',
  'EVALUATION',
  'CONTRACTS',
  'REPORTS',
];

interface ApprovisionnementViewProps {
  currentUser: User;
  section: ProcurementSection;
  onNavigate: (section: ProcurementSection) => void;
}

const inputCls =
  'px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:border-blue-500 focus:outline-hidden';
const labelCls = 'block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1';
const helpCls = 'mt-1 text-[10px] text-slate-500 dark:text-slate-400';

const DEPARTMENTS = Object.keys(PROCUREMENT_DEPARTMENT_LABELS) as ProcurementDepartment[];
const PRIORITIES = Object.keys(PURCHASE_PRIORITY_LABELS) as PurchasePriority[];
const REQUEST_TYPES = Object.keys(PURCHASE_REQUEST_TYPE_LABELS) as PurchaseRequestType[];

const numberFormat = (value: number): string =>
  new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(value);

const money = (value: number): string =>
  `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(value)} DZD`;

const formatDate = (value?: string): string => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('fr-FR');
};

const formatDateTime = (value?: string): string => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('fr-FR');
};

const statusTone = (status: PurchaseRequestStatus): string => {
  switch (status) {
    case 'BROUILLON':
      return 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
    case 'EN_VALIDATION':
      return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800';
    case 'VALIDEE':
    case 'COMMANDEE':
    case 'CLOTUREE':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800';
    case 'REFUSEE':
    case 'ANNULEE':
      return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800';
    case 'RETOURNEE':
      return 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-800';
    default:
      return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800';
  }
};

const priorityTone = (priority: PurchasePriority): string => {
  switch (priority) {
    case 'TRES_URGENTE':
      return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800';
    case 'URGENTE':
      return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800';
    default:
      return 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
  }
};

const downloadCsv = (filename: string, rows: Array<Array<string | number>>) => {
  const csv = rows
    .map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(';'))
    .join('\r\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// ============================================================================
// FICHE DEMANDE D'ACHAT
// ============================================================================

interface DraftLine {
  key: string;
  itemId: string;
  quantity: string;
  unit: UnitOfMeasure;
  reason: string;
  desiredDate: string;
  estimatedUnitPriceDzd: string;
}

interface RequestFormState {
  department: ProcurementDepartment;
  serviceManager: string;
  type: PurchaseRequestType;
  priority: PurchasePriority;
  justification: string;
  desiredDate: string;
  destinationWarehouseId: string;
  costCenter: string;
  project: string;
  observations: string;
  lines: DraftLine[];
}

const emptyLine = (): DraftLine => ({
  key: `L-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
  itemId: '',
  quantity: '',
  unit: 'KG',
  reason: '',
  desiredDate: '',
  estimatedUnitPriceDzd: '',
});

interface RequestModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit' | 'view';
  request: PurchaseRequest | null;
  onClose: () => void;
  onSaved: (request: PurchaseRequest) => void;
}

const RequestModal: React.FC<RequestModalProps> = ({ isOpen, mode, request, onClose, onSaved }) => {
  const [tab, setTab] = useState<'INFOS' | 'LIGNES' | 'CIRCUIT'>('INFOS');
  const [error, setError] = useState('');
  const [form, setForm] = useState<RequestFormState>({
    department: 'PRODUCTION',
    serviceManager: '',
    type: 'BESOIN_PONCTUEL',
    priority: 'NORMALE',
    justification: '',
    desiredDate: '',
    destinationWarehouseId: '',
    costCenter: '',
    project: '',
    observations: '',
    lines: [emptyLine()],
  });

  const readOnly = mode === 'view';
  const items = storage.getActiveItems();
  const warehouses = storage.getAccessibleWarehouses();

  useEffect(() => {
    if (!isOpen) return;
    setTab('INFOS');
    setError('');
    if (request) {
      setForm({
        department: request.department,
        serviceManager: request.serviceManager || '',
        type: request.type,
        priority: request.priority,
        justification: request.justification,
        desiredDate: request.desiredDate || '',
        destinationWarehouseId: request.destinationWarehouseId || '',
        costCenter: request.costCenter || '',
        project: request.project || '',
        observations: request.observations || '',
        lines: request.lines.map(line => ({
          key: line.id,
          itemId: line.itemId,
          quantity: String(line.quantity),
          unit: line.unit,
          reason: line.reason || '',
          desiredDate: line.desiredDate || '',
          estimatedUnitPriceDzd:
            line.estimatedUnitPriceDzd !== undefined ? String(line.estimatedUnitPriceDzd) : '',
        })),
      });
    } else {
      setForm({
        department: 'PRODUCTION',
        serviceManager: '',
        type: 'BESOIN_PONCTUEL',
        priority: 'NORMALE',
        justification: '',
        desiredDate: '',
        destinationWarehouseId: warehouses[0]?.id || '',
        costCenter: '',
        project: '',
        observations: '',
        lines: [emptyLine()],
      });
    }
  }, [isOpen, request]);

  const update = <K extends keyof RequestFormState>(key: K, value: RequestFormState[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const updateLine = (key: string, patch: Partial<DraftLine>) =>
    setForm(prev => ({
      ...prev,
      lines: prev.lines.map(line => (line.key === key ? { ...line, ...patch } : line)),
    }));

  const total = form.lines.reduce((sum, line) => {
    const qty = Number(line.quantity);
    const price = Number(line.estimatedUnitPriceDzd);
    if (!Number.isFinite(qty) || qty <= 0 || !Number.isFinite(price) || price <= 0) return sum;
    return sum + qty * price;
  }, 0);

  const handleSubmit = () => {
    setError('');
    try {
      const lines: PurchaseRequestLine[] = form.lines
        .filter(line => line.itemId && Number(line.quantity) > 0)
        .map(line => {
          const item = items.find(i => i.id === line.itemId)!;
          return {
            id: line.key.startsWith('L-') ? '' : line.key,
            itemId: item.id,
            itemCode: item.code,
            designation: item.designation,
            category: item.category,
            quantity: Number(line.quantity),
            unit: line.unit,
            reason: line.reason,
            desiredDate: line.desiredDate || undefined,
            estimatedUnitPriceDzd:
              Number(line.estimatedUnitPriceDzd) > 0 ? Number(line.estimatedUnitPriceDzd) : undefined,
          };
        });
      if (lines.length === 0) {
        throw new Error('Ajoutez au moins une ligne avec un article et une quantité positive.');
      }
      const payload = {
        department: form.department,
        serviceManager: form.serviceManager,
        type: form.type,
        priority: form.priority,
        justification: form.justification,
        desiredDate: form.desiredDate || undefined,
        destinationWarehouseId: form.destinationWarehouseId || undefined,
        costCenter: form.costCenter,
        project: form.project,
        observations: form.observations,
        lines,
      };
      const saved =
        mode === 'edit' && request
          ? storage.updatePurchaseRequest(request.id, payload)
          : storage.createPurchaseRequest(payload);
      onSaved(saved);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        mode === 'create'
          ? 'Nouvelle demande d\'achat'
          : mode === 'edit'
            ? `Modifier la demande ${request?.requestNumber || ''}`
            : `Demande d'achat ${request?.requestNumber || ''}`
      }
      subtitle={
        request
          ? `${PURCHASE_REQUEST_STATUS_LABELS[request.status]} · ${money(request.estimatedTotalDzd)} estimés`
          : 'Le stock n\'est jamais modifié par une demande d\'achat.'
      }
      maxWidth="4xl"
    >
      <div className="space-y-4">
        <div className="flex flex-wrap gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-[11px]">
          {([
            { id: 'INFOS', label: 'Informations générales' },
            { id: 'LIGNES', label: `Articles (${form.lines.length})` },
            { id: 'CIRCUIT', label: 'Circuit & historique' },
          ] as const).map(entry => (
            <button
              key={entry.id}
              type="button"
              onClick={() => setTab(entry.id)}
              className={`px-2.5 py-1.5 font-semibold rounded-md transition-colors cursor-pointer ${
                tab === entry.id
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              {entry.label}
            </button>
          ))}
        </div>

        {tab === 'INFOS' && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>Service demandeur *</label>
                <select
                  value={form.department}
                  disabled={readOnly}
                  onChange={e => update('department', e.target.value as ProcurementDepartment)}
                  className={`${inputCls} w-full cursor-pointer`}
                >
                  {DEPARTMENTS.map(department => (
                    <option key={department} value={department}>
                      {PROCUREMENT_DEPARTMENT_LABELS[department]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Type de demande</label>
                <select
                  value={form.type}
                  disabled={readOnly}
                  onChange={e => update('type', e.target.value as PurchaseRequestType)}
                  className={`${inputCls} w-full cursor-pointer`}
                >
                  {REQUEST_TYPES.map(type => (
                    <option key={type} value={type}>
                      {PURCHASE_REQUEST_TYPE_LABELS[type]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Priorité *</label>
                <select
                  value={form.priority}
                  disabled={readOnly}
                  onChange={e => update('priority', e.target.value as PurchasePriority)}
                  className={`${inputCls} w-full cursor-pointer`}
                >
                  {PRIORITIES.map(priority => (
                    <option key={priority} value={priority}>
                      {PURCHASE_PRIORITY_LABELS[priority]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>Responsable du service</label>
                <input
                  type="text"
                  value={form.serviceManager}
                  disabled={readOnly}
                  onChange={e => update('serviceManager', e.target.value)}
                  placeholder="Nom du responsable"
                  className={`${inputCls} w-full`}
                />
              </div>
              <div>
                <label className={labelCls}>Date souhaitée</label>
                <input
                  type="date"
                  value={form.desiredDate}
                  disabled={readOnly}
                  onChange={e => update('desiredDate', e.target.value)}
                  className={`${inputCls} w-full`}
                />
              </div>
              <div>
                <label className={labelCls}>Magasin de destination</label>
                <select
                  value={form.destinationWarehouseId}
                  disabled={readOnly}
                  onChange={e => update('destinationWarehouseId', e.target.value)}
                  className={`${inputCls} w-full cursor-pointer`}
                >
                  <option value="">— Non précisé —</option>
                  {warehouses.map(warehouse => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.code} — {warehouse.designation}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Centre de coût</label>
                <input
                  type="text"
                  value={form.costCenter}
                  disabled={readOnly}
                  onChange={e => update('costCenter', e.target.value)}
                  placeholder="Ex. CC-PROD-01"
                  className={`${inputCls} w-full`}
                />
              </div>
              <div>
                <label className={labelCls}>Projet (facultatif)</label>
                <input
                  type="text"
                  value={form.project}
                  disabled={readOnly}
                  onChange={e => update('project', e.target.value)}
                  placeholder="Ex. extension ligne 2"
                  className={`${inputCls} w-full`}
                />
              </div>
            </div>

            <div>
              <label className={labelCls}>Justification *</label>
              <textarea
                rows={3}
                value={form.justification}
                disabled={readOnly}
                onChange={e => update('justification', e.target.value)}
                placeholder="Motif du besoin, contexte de production, rupture constatée…"
                className={`${inputCls} w-full`}
              />
            </div>

            <div>
              <label className={labelCls}>Observations</label>
              <textarea
                rows={2}
                value={form.observations}
                disabled={readOnly}
                onChange={e => update('observations', e.target.value)}
                className={`${inputCls} w-full`}
              />
            </div>
          </div>
        )}

        {tab === 'LIGNES' && (
          <div className="space-y-2">
            <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-x-auto">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold">
                  <tr>
                    <th className="py-1.5 px-2 min-w-56">Article</th>
                    <th className="py-1.5 px-2 w-24">Quantité</th>
                    <th className="py-1.5 px-2 w-24">Unité</th>
                    <th className="py-1.5 px-2 w-32">Prix est. (DZD)</th>
                    <th className="py-1.5 px-2">Motif</th>
                    <th className="py-1.5 px-2 w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {form.lines.map(line => {
                    const item = items.find(i => i.id === line.itemId);
                    const stock = item ? storage.getConsolidatedStockForItem(item.id) : undefined;
                    return (
                      <tr key={line.key} className="align-top">
                        <td className="py-1.5 px-2">
                          <select
                            value={line.itemId}
                            disabled={readOnly}
                            onChange={e => {
                              const selected = items.find(i => i.id === e.target.value);
                              updateLine(line.key, {
                                itemId: e.target.value,
                                unit: selected?.unit || 'KG',
                              });
                            }}
                            className={`${inputCls} w-full cursor-pointer`}
                          >
                            <option value="">— Sélectionner un article —</option>
                            {items.map(i => (
                              <option key={i.id} value={i.id}>
                                {i.code} — {i.designation}
                              </option>
                            ))}
                          </select>
                          {item && (
                            <p className="mt-0.5 text-[10px] text-slate-500">
                              Stock dispo. : {numberFormat(stock?.available ?? 0)} {item.unit} · seuil{' '}
                              {numberFormat(item.minStockLevel)}
                            </p>
                          )}
                        </td>
                        <td className="py-1.5 px-2">
                          <input
                            type="number"
                            min="0"
                            step="0.001"
                            value={line.quantity}
                            disabled={readOnly}
                            onChange={e => updateLine(line.key, { quantity: e.target.value })}
                            className={`${inputCls} w-full text-right font-mono`}
                          />
                        </td>
                        <td className="py-1.5 px-2">
                          <select
                            value={line.unit}
                            disabled={readOnly}
                            onChange={e =>
                              updateLine(line.key, { unit: e.target.value as UnitOfMeasure })
                            }
                            className={`${inputCls} w-full cursor-pointer`}
                          >
                            {(Object.keys(UNIT_LABELS) as UnitOfMeasure[]).map(unit => (
                              <option key={unit} value={unit}>
                                {unit}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-1.5 px-2">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={line.estimatedUnitPriceDzd}
                            disabled={readOnly}
                            onChange={e =>
                              updateLine(line.key, { estimatedUnitPriceDzd: e.target.value })
                            }
                            className={`${inputCls} w-full text-right font-mono`}
                          />
                        </td>
                        <td className="py-1.5 px-2">
                          <input
                            type="text"
                            value={line.reason}
                            disabled={readOnly}
                            onChange={e => updateLine(line.key, { reason: e.target.value })}
                            placeholder="Motif du besoin"
                            className={`${inputCls} w-full`}
                          />
                        </td>
                        <td className="py-1.5 px-2 text-right">
                          {!readOnly && form.lines.length > 1 && (
                            <button
                              type="button"
                              onClick={() =>
                                setForm(prev => ({
                                  ...prev,
                                  lines: prev.lines.filter(l => l.key !== line.key),
                                }))
                              }
                              aria-label="Retirer la ligne"
                              className="p-1 rounded text-slate-400 hover:text-red-600 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between">
              {!readOnly ? (
                <button
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, lines: [...prev.lines, emptyLine()] }))}
                  className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  Ajouter une ligne
                </button>
              ) : (
                <span />
              )}
              <span className="text-[11px] text-slate-600 dark:text-slate-300">
                Montant estimé : <strong>{money(total)}</strong>
              </span>
            </div>
            <p className="text-[10px] text-slate-500">
              Le prix estimé sert uniquement au calcul du montant et à l'application des seuils de
              validation. Aucune écriture de stock n'est générée par la demande.
            </p>
          </div>
        )}

        {tab === 'CIRCUIT' && (
          <div className="space-y-3">
            {!request ? (
              <p className="text-[11px] text-slate-500">
                Le circuit de validation sera figé à la soumission, selon le montant estimé
                ({money(total)}) et les seuils configurés.
              </p>
            ) : (
              <>
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
                  <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                    Circuit appliqué
                  </p>
                  {request.approvalCircuit.length === 0 ? (
                    <p className="text-[11px] text-slate-500">
                      Circuit non encore figé (demande non soumise).
                    </p>
                  ) : (
                    <ol className="space-y-1">
                      {request.approvalCircuit.map((step, index) => {
                        const decision = request.approvalHistory.find(d => d.stepIndex === index);
                        const isCurrent =
                          request.status === 'EN_VALIDATION' && request.currentStepIndex === index;
                        return (
                          <li key={step.id} className="flex items-start gap-2 text-[11px]">
                            <span
                              className={`mt-0.5 inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-bold ${
                                decision
                                  ? decision.decision === 'APPROUVE'
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-red-600 text-white'
                                  : isCurrent
                                    ? 'bg-amber-500 text-white'
                                    : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                              }`}
                            >
                              {index + 1}
                            </span>
                            <div>
                              <span className="font-semibold text-slate-700 dark:text-slate-200">
                                {step.label}
                              </span>
                              <span className="text-slate-500"> · {getRoleLabel(step.role)}</span>
                              {decision && (
                                <div className="text-[10px] text-slate-500">
                                  {APPROVAL_DECISION_LABELS[decision.decision]} par{' '}
                                  {decision.userName} le {formatDateTime(decision.timestamp)}
                                  {decision.comment ? ` — ${decision.comment}` : ''}
                                </div>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ol>
                  )}
                </div>

                <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold">
                      <tr>
                        <th className="py-1.5 px-2">Date</th>
                        <th className="py-1.5 px-2">Étape</th>
                        <th className="py-1.5 px-2">Décision</th>
                        <th className="py-1.5 px-2">Utilisateur</th>
                        <th className="py-1.5 px-2">Commentaire</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {request.approvalHistory.map(entry => (
                        <tr key={entry.id}>
                          <td className="py-1.5 px-2 text-slate-500">
                            {formatDateTime(entry.timestamp)}
                          </td>
                          <td className="py-1.5 px-2">{entry.stepLabel}</td>
                          <td className="py-1.5 px-2 font-semibold">
                            {APPROVAL_DECISION_LABELS[entry.decision]}
                          </td>
                          <td className="py-1.5 px-2">
                            {entry.userName}
                            <div className="text-[10px] text-slate-400">
                              {getRoleLabel(entry.userRole)}
                            </div>
                          </td>
                          <td className="py-1.5 px-2 text-slate-500">{entry.comment || '—'}</td>
                        </tr>
                      ))}
                      {request.approvalHistory.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-4 text-center text-slate-400">
                            Aucune décision enregistrée.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 p-2.5 bg-red-50 dark:bg-red-950/40 rounded-lg border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
          >
            {readOnly ? 'Fermer' : 'Annuler'}
          </button>
          {!readOnly && (
            <button
              type="button"
              onClick={handleSubmit}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {mode === 'edit' ? 'Enregistrer' : 'Créer le brouillon'}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
};

// ============================================================================
// VUE PRINCIPALE
// ============================================================================

export const ApprovisionnementView: React.FC<ApprovisionnementViewProps> = ({
  currentUser,
  section,
  onNavigate,
}) => {
  const [revision, setRevision] = useState(0);
  useEffect(() => storage.subscribe(() => setRevision(value => value + 1)), []);

  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const can = (permission: ProcurementPermission) => storage.canProcurement(permission, currentUser);

  // Filtres de la liste des demandes
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | PurchaseRequestStatus>('ALL');
  const [departmentFilter, setDepartmentFilter] = useState<'ALL' | ProcurementDepartment>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | PurchasePriority>('ALL');
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const [requestModal, setRequestModal] = useState<{
    mode: 'create' | 'edit' | 'view';
    request: PurchaseRequest | null;
  } | null>(null);

  // Décision de validation
  const [decisionModal, setDecisionModal] = useState<{
    request: PurchaseRequest;
    decision: ApprovalDecisionKind;
  } | null>(null);
  const [decisionComment, setDecisionComment] = useState('');

  // Annulation
  const [cancelModal, setCancelModal] = useState<PurchaseRequest | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  // Réapprovisionnement
  const [selectedProposals, setSelectedProposals] = useState<Record<string, string>>({});
  const [replenishmentDepartment, setReplenishmentDepartment] =
    useState<ProcurementDepartment>('MAGASIN_MP');

  // Budgets
  const [budgetYear, setBudgetYear] = useState(new Date().getFullYear());
  const [budgetModal, setBudgetModal] = useState(false);
  const [budgetForm, setBudgetForm] = useState({
    department: 'PRODUCTION' as ProcurementDepartment,
    categoryGroup: '' as '' | ItemCategoryGroup,
    amountDzd: '',
    notes: '',
  });

  // Fournisseurs
  const [supplierSearch, setSupplierSearch] = useState('');

  // Paramètres
  const [stepsDraft, setStepsDraft] = useState<ApprovalStep[]>(
    storage.getProcurementSettings().approvalSteps
  );
  const [settingsDraft, setSettingsDraft] = useState(() => {
    const settings = storage.getProcurementSettings();
    return {
      targetStockMultiplier: String(settings.targetStockMultiplier),
      defaultLeadTimeDays: String(settings.defaultLeadTimeDays),
      defaultPaymentTermsDays: String(settings.defaultPaymentTermsDays),
      maxOverReceptionPercent: String(settings.maxOverReceptionPercent),
      qualityHoldByDefault: settings.qualityHoldByDefault,
    };
  });

  useEffect(() => {
    if (section !== 'SETTINGS') return;
    const settings = storage.getProcurementSettings();
    setStepsDraft(settings.approvalSteps.map(step => ({ ...step })));
    setSettingsDraft({
      targetStockMultiplier: String(settings.targetStockMultiplier),
      defaultLeadTimeDays: String(settings.defaultLeadTimeDays),
      defaultPaymentTermsDays: String(settings.defaultPaymentTermsDays),
      maxOverReceptionPercent: String(settings.maxOverReceptionPercent),
      qualityHoldByDefault: settings.qualityHoldByDefault,
    });
  }, [section]);

  const dashboard = storage.getProcurementDashboard();
  const proposals = storage.getReplenishmentProposals();
  const budgets = storage.getBudgetOverview(budgetYear);
  const suppliers = storage.getSuppliers(true);
  const settings = storage.getProcurementSettings();

  const requests = useMemo(
    () =>
      storage.getPurchaseRequests({
        search,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        department: departmentFilter === 'ALL' ? undefined : departmentFilter,
        priority: priorityFilter === 'ALL' ? undefined : priorityFilter,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [search, statusFilter, departmentFilter, priorityFilter, revision]
  );

  const validationQueue = requests.filter(
    request =>
      request.status === 'EN_VALIDATION' &&
      (currentUser.role === 'ADMIN' ||
        request.approvalCircuit[request.currentStepIndex]?.role === currentUser.role)
  );

  const totalPages = Math.max(1, Math.ceil(requests.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedRequests = requests.slice((safePage - 1) * pageSize, safePage * pageSize);

  const showError = (e: unknown) => setError(e instanceof Error ? e.message : String(e));

  const submitRequest = (request: PurchaseRequest) => {
    try {
      storage.submitPurchaseRequest(request.id);
      setNotice(`Demande ${request.requestNumber} soumise au circuit de validation.`);
      setError('');
    } catch (e) {
      showError(e);
    }
  };

  const confirmDecision = () => {
    if (!decisionModal) return;
    try {
      storage.decidePurchaseRequest(
        decisionModal.request.id,
        decisionModal.decision,
        decisionComment
      );
      setNotice(
        `Décision enregistrée sur la demande ${decisionModal.request.requestNumber} : ${APPROVAL_DECISION_LABELS[decisionModal.decision]}.`
      );
      setDecisionModal(null);
      setDecisionComment('');
      setError('');
    } catch (e) {
      showError(e);
    }
  };

  const confirmCancel = () => {
    if (!cancelModal) return;
    try {
      storage.cancelPurchaseRequest(cancelModal.id, cancelReason);
      setNotice(`Demande ${cancelModal.requestNumber} annulée.`);
      setCancelModal(null);
      setCancelReason('');
      setError('');
    } catch (e) {
      showError(e);
    }
  };

  const createReplenishment = () => {
    try {
      const selection = Object.entries(selectedProposals)
        .filter(([, qty]) => Number(qty) > 0)
        .map(([itemId, qty]) => ({ itemId, quantity: Number(qty) }));
      if (selection.length === 0) {
        throw new Error('Sélectionnez au moins un article avec une quantité proposée.');
      }
      const created = storage.createReplenishmentRequest({
        department: replenishmentDepartment,
        items: selection,
        warehouseId: proposals.find(p => p.itemId === selection[0].itemId)?.suggestedWarehouseId,
      });
      setSelectedProposals({});
      setNotice(
        `Demande ${created.requestNumber} créée (${selection.length} article(s)) — à soumettre à validation.`
      );
      setError('');
    } catch (e) {
      showError(e);
    }
  };

  const createBudget = () => {
    try {
      storage.addProcurementBudget({
        fiscalYear: budgetYear,
        department: budgetForm.department,
        categoryGroup: budgetForm.categoryGroup || undefined,
        amountDzd: Number(budgetForm.amountDzd),
        notes: budgetForm.notes,
      });
      setBudgetModal(false);
      setBudgetForm({ department: 'PRODUCTION', categoryGroup: '', amountDzd: '', notes: '' });
      setNotice('Budget enregistré.');
      setError('');
    } catch (e) {
      showError(e);
    }
  };

  const saveSettings = () => {
    try {
      storage.updateProcurementSettings({
        approvalSteps: stepsDraft,
        targetStockMultiplier: Number(settingsDraft.targetStockMultiplier),
        defaultLeadTimeDays: Number(settingsDraft.defaultLeadTimeDays),
        defaultPaymentTermsDays: Number(settingsDraft.defaultPaymentTermsDays),
        maxOverReceptionPercent: Number(settingsDraft.maxOverReceptionPercent),
        qualityHoldByDefault: settingsDraft.qualityHoldByDefault,
      });
      setNotice('Paramètres du module enregistrés.');
      setError('');
    } catch (e) {
      showError(e);
    }
  };

  const exportRequests = () => {
    const rows: Array<Array<string | number>> = [
      ['Numéro', 'Date', 'Service', 'Demandeur', 'Type', 'Priorité', 'Statut', 'Montant estimé', 'Lignes', 'Justification'],
    ];
    requests.forEach(request => {
      rows.push([
        request.requestNumber,
        formatDate(request.createdAt),
        PROCUREMENT_DEPARTMENT_LABELS[request.department],
        request.createdBy,
        PURCHASE_REQUEST_TYPE_LABELS[request.type],
        PURCHASE_PRIORITY_LABELS[request.priority],
        PURCHASE_REQUEST_STATUS_LABELS[request.status],
        request.estimatedTotalDzd,
        request.lines.length,
        request.justification,
      ]);
    });
    downloadCsv(`mamora-demandes-achat-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };

  const header = (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-blue-600" />
          <span>Service Approvisionnement</span>
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Cycle des achats : besoin → validation multi-niveaux → consultation → commande → réception.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
          Exercice {new Date().getFullYear()}
        </span>
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded border border-amber-200 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
          <ClipboardList className="w-3.5 h-3.5" />
          {dashboard.pendingRequests} en validation
        </span>
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded border border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
          <Wallet className="w-3.5 h-3.5" />
          {money(dashboard.budgetAvailableDzd)} disponibles
        </span>
      </div>
    </div>
  );

  const banner = (error || notice) && (
    <div
      className={`flex items-start justify-between gap-3 px-4 py-3 rounded-lg border text-xs ${
        error
          ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-950/40 dark:border-red-800 dark:text-red-300'
          : 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300'
      }`}
    >
      <span className="flex items-start gap-2">
        {error ? <AlertTriangle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
        <span>{error || notice}</span>
      </span>
      <button
        type="button"
        onClick={() => {
          setError('');
          setNotice('');
        }}
        aria-label="Fermer le message"
        className="p-0.5 rounded hover:bg-black/5 cursor-pointer"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );

  // ======================= TABLEAU DE BORD =======================
  if (section === 'DASHBOARD') {
    const kpis = [
      { label: 'Demandes en validation', value: String(dashboard.pendingRequests), icon: ClipboardList, tone: 'text-amber-600' },
      { label: 'Demandes urgentes', value: String(dashboard.urgentRequests), icon: AlertTriangle, tone: 'text-red-600' },
      { label: 'Validées non commandées', value: String(dashboard.validatedNotOrdered), icon: CheckCircle2, tone: 'text-emerald-600' },
      { label: 'Articles sous seuil', value: String(dashboard.lowStockItems), icon: PackageSearch, tone: 'text-orange-600' },
      { label: 'Propositions de réappro.', value: String(dashboard.replenishmentProposals), icon: Zap, tone: 'text-blue-600' },
      { label: 'Budget engagé', value: money(dashboard.budgetEngagedDzd), icon: Wallet, tone: 'text-slate-700' },
    ];

    return (
      <div className="space-y-5">
        {header}
        {banner}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {kpis.map(kpi => {
            const Icon = kpi.icon;
            return (
              <div
                key={kpi.label}
                className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800"
              >
                <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                  <Icon className={`w-3.5 h-3.5 ${kpi.tone}`} />
                  {kpi.label}
                </div>
                <div className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">
                  {kpi.value}
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-2">
              Demandes par statut
            </h3>
            {dashboard.byStatus.length === 0 ? (
              <p className="text-[11px] text-slate-400 py-6 text-center">
                Aucune demande enregistrée pour cet exercice.
              </p>
            ) : (
              <div className="space-y-1.5">
                {dashboard.byStatus.map(entry => (
                  <div key={entry.status} className="flex items-center gap-2 text-[11px]">
                    <span className={`px-1.5 py-0.5 rounded border font-semibold ${statusTone(entry.status)}`}>
                      {PURCHASE_REQUEST_STATUS_LABELS[entry.status]}
                    </span>
                    <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded">
                      <div
                        className="h-2 bg-blue-500 rounded"
                        style={{
                          width: `${Math.min(100, (entry.count / Math.max(1, dashboard.totalRequests)) * 100)}%`,
                        }}
                      />
                    </div>
                    <span className="font-mono text-slate-600 dark:text-slate-300 w-6 text-right">
                      {entry.count}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-2">
              Demandes par service
            </h3>
            {dashboard.byDepartment.length === 0 ? (
              <p className="text-[11px] text-slate-400 py-6 text-center">Aucune donnée.</p>
            ) : (
              <table className="w-full text-left text-[11px]">
                <thead className="text-slate-500 font-semibold">
                  <tr>
                    <th className="py-1">Service</th>
                    <th className="py-1 text-right">Demandes</th>
                    <th className="py-1 text-right">Montant estimé</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {dashboard.byDepartment.map(entry => (
                    <tr key={entry.department}>
                      <td className="py-1 text-slate-700 dark:text-slate-200">
                        {PROCUREMENT_DEPARTMENT_LABELS[entry.department]}
                      </td>
                      <td className="py-1 text-right font-mono">{entry.count}</td>
                      <td className="py-1 text-right font-mono">{money(entry.amountDzd)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {[
            { label: 'Nouvelle demande d\'achat', section: 'REQUESTS' as ProcurementSection, icon: Plus, hint: `${dashboard.totalRequests} demande(s) cette année` },
            { label: 'Besoins de réapprovisionnement', section: 'AUTO' as ProcurementSection, icon: Zap, hint: `${dashboard.replenishmentProposals} proposition(s)` },
            { label: 'Demandes à valider', section: 'VALIDATION' as ProcurementSection, icon: CheckSquare, hint: `${validationQueue.length} en attente de votre décision` },
          ].map(card => {
            const Icon = card.icon;
            return (
              <button
                key={card.label}
                type="button"
                onClick={() => onNavigate(card.section)}
                className="flex items-center gap-3 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-300 hover:bg-blue-50/40 dark:hover:bg-slate-800/60 transition-colors cursor-pointer text-left"
              >
                <span className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600">
                  <Icon className="w-4 h-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-semibold text-slate-800 dark:text-slate-100">
                    {card.label}
                  </span>
                  <span className="block text-[10px] text-slate-500">{card.hint}</span>
                </span>
                <ArrowRight className="w-3.5 h-3.5 ml-auto text-slate-400" />
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ======================= DEMANDES D'ACHAT =======================
  if (section === 'REQUESTS') {
    return (
      <div className="space-y-4">
        {header}
        {banner}
        <div className="flex flex-col xl:flex-row xl:items-center gap-2">
          <div className="relative flex-1 min-w-48">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Rechercher un numéro, un article, un demandeur…"
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:border-blue-500 focus:outline-hidden"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={statusFilter}
              onChange={e => {
                setStatusFilter(e.target.value as 'ALL' | PurchaseRequestStatus);
                setPage(1);
              }}
              className={`${inputCls} cursor-pointer`}
              aria-label="Filtrer par statut"
            >
              <option value="ALL">Tous les statuts</option>
              {(Object.keys(PURCHASE_REQUEST_STATUS_LABELS) as PurchaseRequestStatus[]).map(status => (
                <option key={status} value={status}>
                  {PURCHASE_REQUEST_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
            <select
              value={departmentFilter}
              onChange={e => {
                setDepartmentFilter(e.target.value as 'ALL' | ProcurementDepartment);
                setPage(1);
              }}
              className={`${inputCls} cursor-pointer`}
              aria-label="Filtrer par service"
            >
              <option value="ALL">Tous les services</option>
              {DEPARTMENTS.map(department => (
                <option key={department} value={department}>
                  {PROCUREMENT_DEPARTMENT_LABELS[department]}
                </option>
              ))}
            </select>
            <select
              value={priorityFilter}
              onChange={e => {
                setPriorityFilter(e.target.value as 'ALL' | PurchasePriority);
                setPage(1);
              }}
              className={`${inputCls} cursor-pointer`}
              aria-label="Filtrer par priorité"
            >
              <option value="ALL">Toutes priorités</option>
              {PRIORITIES.map(priority => (
                <option key={priority} value={priority}>
                  {PURCHASE_PRIORITY_LABELS[priority]}
                </option>
              ))}
            </select>
            {can('PROCUREMENT_EXPORT') && (
              <button
                type="button"
                onClick={exportRequests}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                <BarChart3 className="w-3.5 h-3.5" />
                Exporter
              </button>
            )}
            <button
              type="button"
              onClick={() => setRequestModal({ mode: 'create', request: null })}
              disabled={!can('PR_CREATE')}
              title={can('PR_CREATE') ? 'Créer une demande' : 'Habilitation requise'}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Nouvelle demande
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-2.5 px-3">Numéro</th>
                  <th className="py-2.5 px-3">Service / demandeur</th>
                  <th className="py-2.5 px-3">Articles</th>
                  <th className="py-2.5 px-3 text-right">Montant estimé</th>
                  <th className="py-2.5 px-3">Priorité</th>
                  <th className="py-2.5 px-3">Statut</th>
                  <th className="py-2.5 px-3">Étape en cours</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {pagedRequests.map(request => {
                  const step = request.approvalCircuit[request.currentStepIndex];
                  const editable = ['BROUILLON', 'RETOURNEE'].includes(request.status);
                  return (
                    <tr key={request.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="py-2 px-3">
                        <div className="font-mono font-bold text-blue-600 dark:text-blue-400">
                          {request.requestNumber}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {formatDate(request.createdAt)}
                          {request.source === 'AUTOMATIQUE' && (
                            <span className="ml-1 text-[9px] font-semibold text-indigo-600">AUTO</span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <div className="text-[11px] text-slate-700 dark:text-slate-200">
                          {PROCUREMENT_DEPARTMENT_LABELS[request.department]}
                        </div>
                        <div className="text-[10px] text-slate-500">{request.createdBy}</div>
                      </td>
                      <td className="py-2 px-3">
                        <div className="text-[11px] text-slate-700 dark:text-slate-200">
                          {request.lines.length} ligne(s)
                        </div>
                        <div className="text-[10px] text-slate-500 truncate max-w-48">
                          {request.lines.map(line => line.itemCode).join(', ')}
                        </div>
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-[11px]">
                        {request.estimatedTotalDzd > 0 ? money(request.estimatedTotalDzd) : '—'}
                      </td>
                      <td className="py-2 px-3">
                        <span className={`px-1.5 py-0.5 rounded border text-[10px] font-semibold ${priorityTone(request.priority)}`}>
                          {PURCHASE_PRIORITY_LABELS[request.priority]}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <span className={`px-1.5 py-0.5 rounded border text-[10px] font-semibold ${statusTone(request.status)}`}>
                          {PURCHASE_REQUEST_STATUS_LABELS[request.status]}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-[10px] text-slate-500">
                        {request.status === 'EN_VALIDATION' && step ? (
                          <>
                            {step.label}
                            <div className="text-[9px]">
                              étape {request.currentStepIndex + 1}/{request.approvalCircuit.length}
                            </div>
                          </>
                        ) : request.status === 'RETOURNEE' ? (
                          request.approvalHistory[request.approvalHistory.length - 1]?.comment || '—'
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <div className="inline-flex items-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => setRequestModal({ mode: 'view', request })}
                            title="Consulter"
                            className="p-1 rounded text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {editable && can('PR_EDIT') && (
                            <button
                              type="button"
                              onClick={() => setRequestModal({ mode: 'edit', request })}
                              title="Modifier"
                              className="p-1 rounded text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 cursor-pointer"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {editable && can('PR_SUBMIT') && (
                            <button
                              type="button"
                              onClick={() => submitRequest(request)}
                              title="Soumettre à validation"
                              className="p-1 rounded text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-800 cursor-pointer"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {['BROUILLON', 'EN_VALIDATION', 'VALIDEE', 'RETOURNEE', 'REFUSEE'].includes(request.status) &&
                            can('PR_CANCEL') && (
                              <button
                                type="button"
                                onClick={() => {
                                  setCancelModal(request);
                                  setCancelReason('');
                                }}
                                title="Annuler la demande"
                                className="p-1 rounded text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-800 cursor-pointer"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                              </button>
                            )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {pagedRequests.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="font-semibold text-slate-600 dark:text-slate-300">
                        Aucune demande d'achat
                      </p>
                      <p className="text-[11px] mt-0.5">
                        Créez une demande manuelle ou générez-la depuis les seuils de stock.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between px-3 py-2 border-t border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 text-[11px] text-slate-600 dark:text-slate-300">
            <span>
              {requests.length === 0
                ? '0 demande'
                : `${(safePage - 1) * pageSize + 1}–${Math.min(safePage * pageSize, requests.length)} sur ${requests.length}`}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 disabled:opacity-40 cursor-pointer"
              >
                Précédent
              </button>
              <span className="px-2">
                Page {safePage} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 disabled:opacity-40 cursor-pointer"
              >
                Suivant
              </button>
            </div>
          </div>
        </div>

        <RequestModal
          isOpen={!!requestModal}
          mode={requestModal?.mode || 'view'}
          request={requestModal?.request || null}
          onClose={() => setRequestModal(null)}
          onSaved={saved =>
            setNotice(
              requestModal?.mode === 'edit'
                ? `Demande ${saved.requestNumber} mise à jour.`
                : `Demande ${saved.requestNumber} enregistrée en brouillon.`
            )
          }
        />

        <Modal
          isOpen={!!cancelModal}
          onClose={() => setCancelModal(null)}
          title={`Annuler la demande ${cancelModal?.requestNumber || ''}`}
          maxWidth="lg"
        >
          <div className="space-y-3">
            <p className="text-[11px] text-slate-600 dark:text-slate-300">
              L'annulation est définitive et historisée. Une demande déjà engagée dans une commande ne
              peut plus être annulée.
            </p>
            <div>
              <label className={labelCls}>Motif d'annulation *</label>
              <textarea
                rows={3}
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                className={`${inputCls} w-full`}
                placeholder="Ex. besoin couvert par un stock existant, erreur de saisie…"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setCancelModal(null)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"
              >
                Retour
              </button>
              <button
                type="button"
                onClick={confirmCancel}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 cursor-pointer"
              >
                Annuler la demande
              </button>
            </div>
          </div>
        </Modal>
      </div>
    );
  }

  // ======================= DEMANDES AUTOMATIQUES =======================
  if (section === 'AUTO') {
    return (
      <div className="space-y-4">
        {header}
        {banner}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Zap className="w-4 h-4 text-blue-600" />
              Besoins de réapprovisionnement calculés sur les stocks réels
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Quantité proposée = stock cible − disponible − déjà engagé (jamais négative). Le stock
              disponible tient compte des réservations, quarantaines et blocages qualité.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={replenishmentDepartment}
              onChange={e => setReplenishmentDepartment(e.target.value as ProcurementDepartment)}
              className={`${inputCls} cursor-pointer`}
              aria-label="Service demandeur de la demande générée"
            >
              {DEPARTMENTS.map(department => (
                <option key={department} value={department}>
                  {PROCUREMENT_DEPARTMENT_LABELS[department]}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={createReplenishment}
              disabled={!can('PR_CREATE')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Générer la demande
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-2.5 px-3 w-8" />
                  <th className="py-2.5 px-3">Article</th>
                  <th className="py-2.5 px-3 text-right">Disponible</th>
                  <th className="py-2.5 px-3 text-right">Seuil min.</th>
                  <th className="py-2.5 px-3 text-right">Stock cible</th>
                  <th className="py-2.5 px-3 text-right">Déjà engagé</th>
                  <th className="py-2.5 px-3 text-right">Qté proposée</th>
                  <th className="py-2.5 px-3">Fournisseur suggéré</th>
                  <th className="py-2.5 px-3">Magasin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {proposals.map(proposal => {
                  const selected = selectedProposals[proposal.itemId] !== undefined;
                  return (
                    <tr key={proposal.itemId} className={selected ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''}>
                      <td className="py-2 px-3">
                        <input
                          type="checkbox"
                          checked={selected}
                          disabled={proposal.proposedQty <= 0}
                          onChange={e => {
                            setSelectedProposals(prev => {
                              const next = { ...prev };
                              if (e.target.checked) next[proposal.itemId] = String(proposal.proposedQty);
                              else delete next[proposal.itemId];
                              return next;
                            });
                          }}
                          aria-label={`Sélectionner ${proposal.itemCode}`}
                          className="cursor-pointer"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <div className="font-mono font-bold text-blue-600 dark:text-blue-400">
                          {proposal.itemCode}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate max-w-64">
                          {proposal.designation}
                        </div>
                      </td>
                      <td className="py-2 px-3 text-right font-mono">
                        <span className={proposal.available <= 0 ? 'text-red-600 font-bold' : ''}>
                          {numberFormat(proposal.available)}
                        </span>
                        <span className="text-[10px] text-slate-500"> {proposal.unit}</span>
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-500">
                        {numberFormat(proposal.minStockLevel)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-500">
                        {numberFormat(proposal.targetStock)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-500">
                        {proposal.onOrderQty > 0 ? numberFormat(proposal.onOrderQty) : '—'}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <input
                          type="number"
                          min="0"
                          step="0.001"
                          value={selectedProposals[proposal.itemId] ?? String(proposal.proposedQty)}
                          onChange={e =>
                            setSelectedProposals(prev => ({ ...prev, [proposal.itemId]: e.target.value }))
                          }
                          className="w-24 px-1.5 py-1 text-right font-mono text-[11px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded"
                        />
                      </td>
                      <td className="py-2 px-3 text-[11px] text-slate-600 dark:text-slate-300">
                        {proposal.suggestedSupplierName || '—'}
                      </td>
                      <td className="py-2 px-3 text-[11px] text-slate-500">
                        {proposal.suggestedWarehouseCode || '—'}
                        {proposal.coveredByRequest && (
                          <div className="text-[9px] text-emerald-600">
                            couvert par {proposal.coveredByRequest}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {proposals.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      <PackageSearch className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="font-semibold text-slate-600 dark:text-slate-300">
                        Aucun besoin détecté
                      </p>
                      <p className="text-[11px] mt-0.5">
                        Tous les articles actifs disposent d'un stock supérieur à leur seuil minimum.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ======================= VALIDATION =======================
  if (section === 'VALIDATION') {
    return (
      <div className="space-y-4">
        {header}
        {banner}
        <div className="flex items-start gap-2 p-2.5 rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/40 dark:border-blue-900 text-[11px] text-blue-800 dark:text-blue-200">
          <Lock className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            Circuit : service demandeur → responsable Approvisionnement → Direction. Vous ne voyez ici que
            les demandes dont l'étape en cours relève de votre profil ({getRoleLabel(currentUser.role)}).
          </span>
        </div>

        <div className="space-y-3">
          {validationQueue.map(request => {
            const step = request.approvalCircuit[request.currentStepIndex];
            return (
              <div
                key={request.id}
                className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3"
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                        {request.requestNumber}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded border text-[10px] font-semibold ${priorityTone(request.priority)}`}>
                        {PURCHASE_PRIORITY_LABELS[request.priority]}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {PROCUREMENT_DEPARTMENT_LABELS[request.department]} · {request.createdBy} ·{' '}
                        {formatDate(request.createdAt)}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 max-w-3xl">
                      {request.justification}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {money(request.estimatedTotalDzd)}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      étape {request.currentStepIndex + 1}/{request.approvalCircuit.length}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                  {request.approvalCircuit.map((circuitStep, index) => {
                    const decision = request.approvalHistory.find(d => d.stepIndex === index);
                    return (
                      <span
                        key={circuitStep.id}
                        className={`px-1.5 py-0.5 rounded border font-semibold ${
                          decision
                            ? decision.decision === 'APPROUVE'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-red-50 text-red-700 border-red-200'
                            : index === request.currentStepIndex
                              ? 'bg-amber-50 text-amber-700 border-amber-300'
                              : 'bg-slate-50 text-slate-500 border-slate-200'
                        }`}
                      >
                        {circuitStep.label}
                      </span>
                    );
                  })}
                </div>

                <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold">
                      <tr>
                        <th className="py-1 px-2">Article</th>
                        <th className="py-1 px-2 text-right">Quantité</th>
                        <th className="py-1 px-2 text-right">Stock dispo.</th>
                        <th className="py-1 px-2">Motif</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {request.lines.map(line => (
                        <tr key={line.id}>
                          <td className="py-1 px-2">
                            <span className="font-mono text-blue-600">{line.itemCode}</span>{' '}
                            <span className="text-slate-600 dark:text-slate-300">{line.designation}</span>
                          </td>
                          <td className="py-1 px-2 text-right font-mono">
                            {numberFormat(line.quantity)} {line.unit}
                          </td>
                          <td className="py-1 px-2 text-right font-mono text-slate-500">
                            {numberFormat(line.availableQtyAtCreation ?? 0)}
                          </td>
                          <td className="py-1 px-2 text-slate-500">{line.reason || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDecisionModal({ request, decision: 'RETOURNE' });
                      setDecisionComment('');
                    }}
                    disabled={!can('PR_REFUSE')}
                    className="px-2.5 py-1.5 text-[11px] font-semibold rounded-lg border border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100 disabled:opacity-50 cursor-pointer"
                  >
                    Retourner pour correction
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDecisionModal({ request, decision: 'REFUSE' });
                      setDecisionComment('');
                    }}
                    disabled={!can('PR_REFUSE')}
                    className="px-2.5 py-1.5 text-[11px] font-semibold rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50 cursor-pointer"
                  >
                    Refuser
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDecisionModal({ request, decision: 'APPROUVE' });
                      setDecisionComment('');
                    }}
                    disabled={!can('PR_VALIDATE')}
                    className="px-2.5 py-1.5 text-[11px] font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
                  >
                    Approuver l'étape
                  </button>
                </div>
                {step && (
                  <p className="text-[10px] text-slate-500 text-right">
                    Étape en cours : <strong>{step.label}</strong> ({getRoleLabel(step.role)})
                  </p>
                )}
              </div>
            );
          })}

          {validationQueue.length === 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 py-12 text-center text-slate-400">
              <CheckSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="font-semibold text-slate-600 dark:text-slate-300">
                Aucune demande en attente de votre décision
              </p>
              <p className="text-[11px] mt-0.5">
                Les demandes dont l'étape courante relève d'un autre profil sont visibles dans « Demandes
                d'achat ».
              </p>
            </div>
          )}
        </div>

        <Modal
          isOpen={!!decisionModal}
          onClose={() => setDecisionModal(null)}
          title={
            decisionModal
              ? `${APPROVAL_DECISION_LABELS[decisionModal.decision]} — ${decisionModal.request.requestNumber}`
              : ''
          }
          maxWidth="lg"
        >
          <div className="space-y-3">
            <div className="text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
              <p>
                Service : <strong>{PROCUREMENT_DEPARTMENT_LABELS[decisionModal?.request.department || 'AUTRE']}</strong>
              </p>
              <p>
                Montant estimé : <strong>{money(decisionModal?.request.estimatedTotalDzd || 0)}</strong>
              </p>
              <p>
                Étape :{' '}
                <strong>
                  {decisionModal?.request.approvalCircuit[decisionModal.request.currentStepIndex]?.label}
                </strong>
              </p>
            </div>
            <div>
              <label className={labelCls}>
                Commentaire {decisionModal?.decision !== 'APPROUVE' ? '*' : '(facultatif)'}
              </label>
              <textarea
                rows={3}
                value={decisionComment}
                onChange={e => setDecisionComment(e.target.value)}
                className={`${inputCls} w-full`}
                placeholder={
                  decisionModal?.decision === 'APPROUVE'
                    ? 'Observation éventuelle…'
                    : 'Motif circonstancié obligatoire'
                }
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setDecisionModal(null)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmDecision}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg text-white cursor-pointer ${
                  decisionModal?.decision === 'APPROUVE'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : decisionModal?.decision === 'REFUSE'
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-orange-600 hover:bg-orange-700'
                }`}
              >
                Confirmer
              </button>
            </div>
          </div>
        </Modal>
      </div>
    );
  }

  // ======================= BUDGETS =======================
  if (section === 'BUDGETS') {
    return (
      <div className="space-y-4">
        {header}
        {banner}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <select
              value={budgetYear}
              onChange={e => setBudgetYear(Number(e.target.value))}
              className={`${inputCls} cursor-pointer`}
              aria-label="Exercice budgétaire"
            >
              {[budgetYear - 1, budgetYear, budgetYear + 1].map(year => (
                <option key={year} value={year}>
                  Exercice {year}
                </option>
              ))}
            </select>
            <span className="text-[11px] text-slate-500">
              {budgets.length} budget(s) — engagé {money(dashboard.budgetEngagedDzd)}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setBudgetModal(true)}
            disabled={!can('BUDGET_MANAGE')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Nouveau budget
          </button>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-2.5 px-3">Service</th>
                <th className="py-2.5 px-3">Catégorie d'achat</th>
                <th className="py-2.5 px-3 text-right">Montant alloué</th>
                <th className="py-2.5 px-3 text-right">Engagé</th>
                <th className="py-2.5 px-3 text-right">Disponible</th>
                <th className="py-2.5 px-3 w-40">Consommation</th>
                <th className="py-2.5 px-3 text-right">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {budgets.map((status: ProcurementBudgetStatus) => (
                <tr key={status.budget.id}>
                  <td className="py-2 px-3 text-slate-700 dark:text-slate-200">
                    {PROCUREMENT_DEPARTMENT_LABELS[status.budget.department]}
                  </td>
                  <td className="py-2 px-3 text-[11px] text-slate-500">
                    {status.budget.categoryGroup
                      ? ITEM_CATEGORY_GROUP_LABELS[status.budget.categoryGroup]
                      : 'Toutes catégories'}
                  </td>
                  <td className="py-2 px-3 text-right font-mono">{money(status.budget.amountDzd)}</td>
                  <td className="py-2 px-3 text-right font-mono text-amber-700 dark:text-amber-400">
                    {money(status.engagedDzd)}
                  </td>
                  <td
                    className={`py-2 px-3 text-right font-mono font-semibold ${
                      status.availableDzd < 0 ? 'text-red-600' : 'text-emerald-700 dark:text-emerald-400'
                    }`}
                  >
                    {money(status.availableDzd)}
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded">
                        <div
                          className={`h-2 rounded ${
                            status.isExceeded ? 'bg-red-500' : status.usagePercent > 80 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(100, status.usagePercent)}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 w-10 text-right">
                        {status.usagePercent}%
                      </span>
                    </div>
                  </td>
                  <td className="py-2 px-3 text-right">
                    <span
                      className={`px-1.5 py-0.5 rounded border text-[10px] font-semibold ${
                        status.isExceeded
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}
                    >
                      {status.isExceeded ? 'Dépassé' : 'Disponible'}
                    </span>
                  </td>
                </tr>
              ))}
              {budgets.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Wallet className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="font-semibold text-slate-600 dark:text-slate-300">
                      Aucun budget défini pour {budgetYear}
                    </p>
                    <p className="text-[11px] mt-0.5">
                      Sans budget, les demandes ne sont pas bloquées : le contrôle budgétaire s'active dès
                      qu'un budget existe pour le service.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Modal
          isOpen={budgetModal}
          onClose={() => setBudgetModal(false)}
          title={`Nouveau budget — exercice ${budgetYear}`}
          maxWidth="lg"
        >
          <div className="space-y-3">
            <div>
              <label className={labelCls}>Service *</label>
              <select
                value={budgetForm.department}
                onChange={e =>
                  setBudgetForm(prev => ({ ...prev, department: e.target.value as ProcurementDepartment }))
                }
                className={`${inputCls} w-full cursor-pointer`}
              >
                {DEPARTMENTS.map(department => (
                  <option key={department} value={department}>
                    {PROCUREMENT_DEPARTMENT_LABELS[department]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Catégorie d'achat</label>
              <select
                value={budgetForm.categoryGroup}
                onChange={e =>
                  setBudgetForm(prev => ({ ...prev, categoryGroup: e.target.value as '' | ItemCategoryGroup }))
                }
                className={`${inputCls} w-full cursor-pointer`}
              >
                <option value="">Toutes catégories</option>
                {ITEM_CATEGORY_GROUPS.map(group => (
                  <option key={group} value={group}>
                    {ITEM_CATEGORY_GROUP_LABELS[group]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Montant alloué (DZD) *</label>
              <input
                type="number"
                min="0"
                step="1000"
                value={budgetForm.amountDzd}
                onChange={e => setBudgetForm(prev => ({ ...prev, amountDzd: e.target.value }))}
                className={`${inputCls} w-full text-right font-mono`}
              />
            </div>
            <div>
              <label className={labelCls}>Notes</label>
              <input
                type="text"
                value={budgetForm.notes}
                onChange={e => setBudgetForm(prev => ({ ...prev, notes: e.target.value }))}
                className={`${inputCls} w-full`}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setBudgetModal(false)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={createBudget}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </Modal>
      </div>
    );
  }

  // ======================= FOURNISSEURS =======================
  if (section === 'SUPPLIERS') {
    const filtered = suppliers.filter(supplier => {
      const needle = supplierSearch.trim().toLowerCase();
      if (!needle) return true;
      return `${supplier.code} ${supplier.name} ${supplier.city || ''} ${supplier.wilaya || ''} ${supplier.email || ''}`
        .toLowerCase()
        .includes(needle);
    });

    return (
      <div className="space-y-4">
        {header}
        {banner}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              value={supplierSearch}
              onChange={e => setSupplierSearch(e.target.value)}
              placeholder="Rechercher un fournisseur…"
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
            />
          </div>
          <span className="text-[11px] text-slate-500">
            Référentiel unique partagé avec les matières premières : {suppliers.length} fournisseur(s)
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-2.5 px-3">Code</th>
                  <th className="py-2.5 px-3">Fournisseur</th>
                  <th className="py-2.5 px-3">Localisation</th>
                  <th className="py-2.5 px-3">Catégories fournies</th>
                  <th className="py-2.5 px-3 text-right">Paiement</th>
                  <th className="py-2.5 px-3 text-right">Délai</th>
                  <th className="py-2.5 px-3">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map(supplier => (
                  <tr key={supplier.id}>
                    <td className="py-2 px-3 font-mono text-slate-500">{supplier.code}</td>
                    <td className="py-2 px-3">
                      <div className="font-semibold text-slate-800 dark:text-slate-100">{supplier.name}</div>
                      <div className="text-[10px] text-slate-500">
                        {supplier.contactName || supplier.email || '—'}
                      </div>
                    </td>
                    <td className="py-2 px-3 text-[11px] text-slate-600 dark:text-slate-300">
                      {[supplier.city, supplier.wilaya, supplier.country].filter(Boolean).join(' · ') || '—'}
                    </td>
                    <td className="py-2 px-3 text-[10px] text-slate-500">
                      {(supplier.categoryGroups || [])
                        .map(group => ITEM_CATEGORY_GROUP_LABELS[group])
                        .join(', ') || '—'}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-[11px]">
                      {supplier.paymentTermsDays !== undefined ? `${supplier.paymentTermsDays} j` : '—'}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-[11px]">
                      {supplier.defaultLeadTimeDays !== undefined ? `${supplier.defaultLeadTimeDays} j` : '—'}
                    </td>
                    <td className="py-2 px-3">
                      <span
                        className={`px-1.5 py-0.5 rounded border text-[10px] font-semibold ${
                          (supplier.status || (supplier.isActive ? 'ACTIF' : 'INACTIF')) === 'ACTIF'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : (supplier.status || '') === 'SUSPENDU'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-slate-100 text-slate-600 border-slate-300'
                        }`}
                      >
                        {supplier.status || (supplier.isActive ? 'ACTIF' : 'INACTIF')}
                      </span>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <Truck className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="font-semibold text-slate-600 dark:text-slate-300">
                        Aucun fournisseur
                      </p>
                      <p className="text-[11px] mt-0.5">
                        Le référentiel se remplit depuis le module Matières premières &amp; Composants ou à la
                        première réception.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ======================= PARAMÈTRES =======================
  if (section === 'SETTINGS') {
    const canManageSettings = ['ADMIN', 'DIRECTEUR_USINE'].includes(currentUser.role);
    return (
      <div className="space-y-4">
        {header}
        {banner}
        {!canManageSettings && (
          <div className="flex items-start gap-2 p-2.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-200 text-[11px]">
            <Lock className="w-4 h-4 shrink-0 mt-0.5" />
            <span>Seuls l'Administrateur et la Direction peuvent modifier ces paramètres.</span>
          </div>
        )}

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-blue-600" />
              Circuit de validation multi-niveaux
            </h3>
            {canManageSettings && (
              <button
                type="button"
                onClick={() =>
                  setStepsDraft(prev => [
                    ...prev,
                    {
                      id: `APR-STEP-${Date.now()}`,
                      order: prev.length + 1,
                      label: '',
                      role: 'RESPONSABLE_QUALITE' as UserRole,
                    },
                  ])
                }
                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                Ajouter une étape
              </button>
            )}
          </div>
          <p className="text-[11px] text-slate-500">
            Les étapes s'appliquent dans l'ordre. Laisser les seuils vides applique l'étape à tous les
            montants.
          </p>

          <div className="space-y-2">
            {stepsDraft.map((step, index) => (
              <div
                key={step.id}
                className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40"
              >
                <div className="md:col-span-1 text-[11px] font-bold text-slate-500">#{index + 1}</div>
                <div className="md:col-span-4">
                  <label className={labelCls}>Libellé</label>
                  <input
                    type="text"
                    value={step.label}
                    disabled={!canManageSettings}
                    onChange={e =>
                      setStepsDraft(prev =>
                        prev.map((s, i) => (i === index ? { ...s, label: e.target.value } : s))
                      )
                    }
                    className={`${inputCls} w-full`}
                  />
                </div>
                <div className="md:col-span-3">
                  <label className={labelCls}>Profil validateur</label>
                  <select
                    value={step.role}
                    disabled={!canManageSettings}
                    onChange={e =>
                      setStepsDraft(prev =>
                        prev.map((s, i) =>
                          i === index ? { ...s, role: e.target.value as UserRole } : s
                        )
                      )
                    }
                    className={`${inputCls} w-full cursor-pointer`}
                  >
                    {(Object.keys(PROCUREMENT_ROLE_PERMISSIONS) as UserRole[]).map(role => (
                      <option key={role} value={role}>
                        {getRoleLabel(role)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className={labelCls}>Seuil min (DZD)</label>
                  <input
                    type="number"
                    min="0"
                    value={step.minAmountDzd ?? ''}
                    disabled={!canManageSettings}
                    onChange={e =>
                      setStepsDraft(prev =>
                        prev.map((s, i) =>
                          i === index
                            ? { ...s, minAmountDzd: e.target.value === '' ? undefined : Number(e.target.value) }
                            : s
                        )
                      )
                    }
                    className={`${inputCls} w-full text-right font-mono`}
                  />
                </div>
                <div className="md:col-span-2 flex items-end gap-1">
                  <div className="flex-1">
                    <label className={labelCls}>Seuil max</label>
                    <input
                      type="number"
                      min="0"
                      value={step.maxAmountDzd ?? ''}
                      disabled={!canManageSettings}
                      onChange={e =>
                        setStepsDraft(prev =>
                          prev.map((s, i) =>
                            i === index
                              ? { ...s, maxAmountDzd: e.target.value === '' ? undefined : Number(e.target.value) }
                              : s
                          )
                        )
                      }
                      className={`${inputCls} w-full text-right font-mono`}
                    />
                  </div>
                  {canManageSettings && stepsDraft.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setStepsDraft(prev => prev.filter((_, i) => i !== index))}
                      aria-label="Supprimer l'étape"
                      className="p-1.5 rounded text-slate-400 hover:text-red-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
            Règles de calcul et valeurs par défaut
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className={labelCls}>Multiplicateur stock cible</label>
              <input
                type="number"
                min="1.1"
                step="0.1"
                value={settingsDraft.targetStockMultiplier}
                disabled={!canManageSettings}
                onChange={e =>
                  setSettingsDraft(prev => ({ ...prev, targetStockMultiplier: e.target.value }))
                }
                className={`${inputCls} w-full text-right font-mono`}
              />
              <p className={helpCls}>Cible = seuil min × multiplicateur (sans stock max défini).</p>
            </div>
            <div>
              <label className={labelCls}>Délai de livraison par défaut (j)</label>
              <input
                type="number"
                min="0"
                value={settingsDraft.defaultLeadTimeDays}
                disabled={!canManageSettings}
                onChange={e =>
                  setSettingsDraft(prev => ({ ...prev, defaultLeadTimeDays: e.target.value }))
                }
                className={`${inputCls} w-full text-right font-mono`}
              />
            </div>
            <div>
              <label className={labelCls}>Paiement par défaut (j)</label>
              <input
                type="number"
                min="0"
                value={settingsDraft.defaultPaymentTermsDays}
                disabled={!canManageSettings}
                onChange={e =>
                  setSettingsDraft(prev => ({ ...prev, defaultPaymentTermsDays: e.target.value }))
                }
                className={`${inputCls} w-full text-right font-mono`}
              />
            </div>
            <div>
              <label className={labelCls}>Tolérance excédent réception (%)</label>
              <input
                type="number"
                min="0"
                value={settingsDraft.maxOverReceptionPercent}
                disabled={!canManageSettings}
                onChange={e =>
                  setSettingsDraft(prev => ({ ...prev, maxOverReceptionPercent: e.target.value }))
                }
                className={`${inputCls} w-full text-right font-mono`}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={settingsDraft.qualityHoldByDefault}
              disabled={!canManageSettings}
              onChange={e =>
                setSettingsDraft(prev => ({ ...prev, qualityHoldByDefault: e.target.checked }))
              }
              className="cursor-pointer"
            />
            Placer les réceptions en attente de contrôle qualité par défaut (jamais disponibles avant
            libération).
          </label>
          <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
            <span className="text-[10px] text-slate-500">
              Dernière mise à jour : {formatDateTime(settings.updatedAt)}
              {settings.updatedBy ? ` par ${settings.updatedBy}` : ''}
            </span>
            <button
              type="button"
              onClick={saveSettings}
              disabled={!canManageSettings}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
            >
              Enregistrer les paramètres
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-2">
            <Lock className="w-4 h-4 text-blue-600" />
            Habilitations du module
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px]">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold">
                <tr>
                  <th className="py-1.5 px-2">Profil</th>
                  {(Object.keys(PROCUREMENT_PERMISSION_LABELS) as ProcurementPermission[]).map(permission => (
                    <th key={permission} className="py-1.5 px-1 text-center whitespace-nowrap">
                      {PROCUREMENT_PERMISSION_LABELS[permission]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {(Object.keys(PROCUREMENT_ROLE_PERMISSIONS) as UserRole[]).map(role => (
                  <tr key={role} className={role === currentUser.role ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''}>
                    <td className="py-1.5 px-2 font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">
                      {getRoleLabel(role)}
                    </td>
                    {(Object.keys(PROCUREMENT_PERMISSION_LABELS) as ProcurementPermission[]).map(permission => (
                      <td key={permission} className="py-1.5 px-1 text-center">
                        {PROCUREMENT_ROLE_PERMISSIONS[role].includes(permission) ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 inline" />
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600">—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ======================= SECTIONS EN COURS DE DÉPLOIEMENT =======================
  // Sections du cycle aval : consultation → commande → réception → évaluation → contrats → rapports
  if (CYCLE_SECTIONS.includes(section)) {
    return (
      <div className="space-y-4">
        {header}
        <ProcurementCycleSections
          section={section}
          currentUser={currentUser}
          onNavigate={onNavigate}
        />
      </div>
    );
  }

  return null;
};
