/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * MAMORA GP — Service Approvisionnement : cycle aval de l'achat
 * Consultation fournisseurs → comparatif → commande → suivi → réception →
 * évaluation → contrats → rapports.
 *
 * Toutes les données proviennent du service de stockage : aucun état local ne
 * fait autorité, chaque action passe par une règle métier vérifiée côté service.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Download,
  FileSignature,
  FileText,
  Gauge,
  PackageCheck,
  Plus,
  Printer,
  Scale,
  Search,
  ShoppingCart,
  Star,
  Trash2,
  Truck,
  Wallet,
} from 'lucide-react';
import { storage } from '../../../services/storage';
import { Modal } from '../../common/Modal';
import type { User } from '../../../types';
import {
  CONSULTATION_STATUS_LABELS,
  ITEM_CATEGORY_GROUP_LABELS,
  PROCUREMENT_DEPARTMENT_LABELS,
  PURCHASE_ORDER_STATUS_LABELS,
  RECEIPT_QUALITY_STATUS_LABELS,
  SUPPLIER_CONTRACT_STATUS_LABELS,
  type ConsultationStatus,
  type ItemCategoryGroup,
  type ProcurementDepartment,
  type PurchaseOrder,
  type PurchaseOrderStatus,
  type PurchaseReceipt,
  type ReceiptQualityStatus,
  type SupplierConsultation,
  type SupplierContract,
  type SupplierContractStatus,
} from '../../../types';
import type { ProcurementSection } from '../ApprovisionnementView';

// ── Helpers d'affichage (mêmes conventions que le reste du module) ──────────

const inputCls =
  'px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:border-blue-500 focus:outline-hidden w-full';
const labelCls = 'block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1';

const numberFormat = (value: number): string =>
  new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(value);
const money = (value: number): string =>
  `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(value)} DZD`;
const formatDate = (value?: string): string => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('fr-FR');
};
const todayIso = (): string => new Date().toISOString().slice(0, 10);
const daysBetween = (from: string, to: string): number =>
  Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86400000);

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

// ── Petits composants partagés ─────────────────────────────────────────────

const Banner: React.FC<{ error: string; notice: string; onClose: () => void }> = ({
  error,
  notice,
  onClose,
}) => {
  if (!error && !notice) return null;
  return (
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
      <button type="button" onClick={onClose} className="text-[11px] underline shrink-0 cursor-pointer">
        Fermer
      </button>
    </div>
  );
};

const SectionHeader: React.FC<{
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  actions?: React.ReactNode;
}> = ({ icon: Icon, title, description, actions }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
    <div>
      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
        <Icon className="w-4.5 h-4.5 text-blue-600" />
        {title}
      </h3>
      <p className="text-[11px] text-slate-500 mt-0.5">{description}</p>
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </div>
);

const EmptyState: React.FC<{ icon: React.ComponentType<{ className?: string }>; text: string }> = ({
  icon: Icon,
  text,
}) => (
  <div className="flex flex-col items-center justify-center py-14 text-center">
    <span className="p-3 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 mb-2">
      <Icon className="w-5 h-5" />
    </span>
    <p className="text-xs text-slate-500 max-w-sm">{text}</p>
  </div>
);

const Chip: React.FC<{ tone?: string; children: React.ReactNode }> = ({ tone, children }) => (
  <span
    className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-semibold whitespace-nowrap ${
      tone || 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
    }`}
  >
    {children}
  </span>
);

const orderTone = (status: PurchaseOrderStatus): string => {
  switch (status) {
    case 'BROUILLON':
      return 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
    case 'EMISE':
      return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800';
    case 'CONFIRMEE':
      return 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800';
    case 'PARTIELLEMENT_RECUE':
      return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800';
    case 'RECUE':
    case 'CLOTUREE':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800';
    default:
      return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800';
  }
};

const consultationTone = (status: ConsultationStatus): string => {
  switch (status) {
    case 'OUVERTE':
      return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800';
    case 'ATTRIBUEE':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800';
    case 'ANNULEE':
      return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800';
    default:
      return 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
  }
};

const qualityTone = (status: ReceiptQualityStatus): string => {
  switch (status) {
    case 'ACCEPTEE':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800';
    case 'REFUSEE':
      return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800';
    case 'ACCEPTEE_PARTIELLE':
      return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800';
    default:
      return 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
  }
};

const gradeTone = (grade: 'A' | 'B' | 'C' | 'D'): string => {
  switch (grade) {
    case 'A':
      return 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800';
    case 'B':
      return 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800';
    case 'C':
      return 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800';
    default:
      return 'bg-red-100 text-red-700 border-red-300 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800';
  }
};

const tableCls =
  'w-full text-xs border-collapse';
const thCls =
  'px-2.5 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-800 whitespace-nowrap';
const tdCls = 'px-2.5 py-2 border-b border-slate-100 dark:border-slate-800/70 align-middle';

// ══════════════════════════════════════════════════════════════════════════
// MODALE DE RÉCEPTION (partagée entre Suivi et Réceptions)
// ══════════════════════════════════════════════════════════════════════════

interface ReceiptLineDraft {
  orderLineId: string;
  quantityReceived: string;
  lotNumber: string;
  expiryDate: string;
  locationId: string;
}

const ReceiptModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  presetOrderId?: string;
  onSaved: (message: string) => void;
  onError: (message: string) => void;
}> = ({ isOpen, onClose, presetOrderId, onSaved, onError }) => {
  const receivableOrders = useMemo(
    () =>
      storage
        .getPurchaseOrders()
        .filter(order => ['EMISE', 'CONFIRMEE', 'PARTIELLEMENT_RECUE'].includes(order.status)),
    [isOpen]
  );

  const [orderId, setOrderId] = useState(presetOrderId || '');
  const [warehouseId, setWarehouseId] = useState('');
  const [deliveryNote, setDeliveryNote] = useState('');
  const [onHold, setOnHold] = useState(storage.getProcurementSettings().qualityHoldByDefault);
  const [observations, setObservations] = useState('');
  const [lines, setLines] = useState<ReceiptLineDraft[]>([]);

  const warehouses = storage.getWarehouses(true);
  const order = orderId ? storage.getPurchaseOrder(orderId) : undefined;

  useEffect(() => {
    if (!isOpen) return;
    const initialOrderId = presetOrderId || receivableOrders[0]?.id || '';
    setOrderId(initialOrderId);
    setWarehouseId('');
    setDeliveryNote('');
    setOnHold(storage.getProcurementSettings().qualityHoldByDefault);
    setObservations('');
    setLines([]);
  }, [isOpen, presetOrderId]);

  useEffect(() => {
    if (!order) {
      setLines([]);
      return;
    }
    setWarehouseId(previous => previous || order.deliveryWarehouseId || warehouses[0]?.id || '');
    setLines(
      order.lines
        .filter(line => line.quantityReceived < line.quantityOrdered)
        .map(line => ({
          orderLineId: line.id,
          quantityReceived: String(
            Math.max(0, Number((line.quantityOrdered - line.quantityReceived).toFixed(3)))
          ),
          lotNumber: '',
          expiryDate: '',
          locationId: '',
        }))
    );
  }, [orderId]);

  const locations = useMemo(
    () => (warehouseId ? storage.getWarehouseLocations(warehouseId) : []),
    [warehouseId, isOpen]
  );

  const handleSubmit = () => {
    if (!order) {
      onError('Sélectionnez une commande à réceptionner.');
      return;
    }
    if (!warehouseId) {
      onError('Sélectionnez le magasin de réception.');
      return;
    }
    const payload = lines
      .map(line => ({
        orderLineId: line.orderLineId,
        quantityReceived: Number(line.quantityReceived.replace(',', '.')) || 0,
        lotNumber: line.lotNumber.trim() || undefined,
        expiryDate: line.expiryDate || undefined,
        locationId: line.locationId || undefined,
      }))
      .filter(line => line.quantityReceived > 0);
    if (payload.length === 0) {
      onError('Saisissez au moins une quantité reçue.');
      return;
    }
    try {
      const receipt = storage.createPurchaseReceipt({
        orderId: order.id,
        warehouseId,
        deliveryNoteNumber: deliveryNote.trim() || undefined,
        isOnHold: onHold,
        observations: observations.trim() || undefined,
        lines: payload,
      });
      onSaved(
        `Réception ${receipt.receiptNumber} enregistrée — stock créé ${
          onHold ? 'en quarantaine (contrôle qualité requis)' : 'et disponible'
        }.`
      );
      onClose();
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Réception impossible.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Réceptionner une commande d'achat"
      subtitle="Le stock est créé par mouvement d'entrée ; il reste en quarantaine si un contrôle qualité est requis."
      maxWidth="4xl"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <label className={labelCls}>Commande à réceptionner</label>
            <select className={inputCls} value={orderId} onChange={e => setOrderId(e.target.value)}>
              <option value="">— Sélectionner —</option>
              {receivableOrders.map(item => (
                <option key={item.id} value={item.id}>
                  {item.orderNumber} · {item.supplierName} · {money(item.totalDzd)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>N° de bon de livraison</label>
            <input
              className={inputCls}
              value={deliveryNote}
              onChange={e => setDeliveryNote(e.target.value)}
              placeholder="BL fournisseur"
            />
          </div>
          <div>
            <label className={labelCls}>Magasin de réception</label>
            <select className={inputCls} value={warehouseId} onChange={e => setWarehouseId(e.target.value)}>
              <option value="">— Sélectionner —</option>
              {warehouses.map(warehouse => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.code} — {warehouse.designation}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2 flex items-end">
            <label className="flex items-start gap-2 text-[11px] text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={onHold}
                onChange={e => setOnHold(e.target.checked)}
              />
              <span>
                Placer le stock en <strong>quarantaine</strong> dans l'attente du contrôle qualité
                (recommandé pour les matières premières et les composants d'emballage).
              </span>
            </label>
          </div>
        </div>

        {order && (
          <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
            <table className={tableCls}>
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  <th className={thCls}>Article</th>
                  <th className={thCls}>Commandé</th>
                  <th className={thCls}>Déjà reçu</th>
                  <th className={thCls}>Reçu maintenant</th>
                  <th className={thCls}>N° de lot</th>
                  <th className={thCls}>Péremption</th>
                  <th className={thCls}>Emplacement</th>
                </tr>
              </thead>
              <tbody>
                {order.lines.map(line => {
                  const draft = lines.find(l => l.orderLineId === line.id);
                  const remaining = Math.max(0, line.quantityOrdered - line.quantityReceived);
                  if (!draft) {
                    return (
                      <tr key={line.id} className="opacity-50">
                        <td className={tdCls}>
                          <span className="font-mono text-[10px]">{line.itemCode}</span> {line.designation}
                        </td>
                        <td className={tdCls}>{numberFormat(line.quantityOrdered)} {line.unit}</td>
                        <td className={tdCls}>{numberFormat(line.quantityReceived)}</td>
                        <td className={tdCls} colSpan={4}>
                          <span className="text-[10px] text-emerald-600 font-semibold">Ligne soldée</span>
                        </td>
                      </tr>
                    );
                  }
                  return (
                    <tr key={line.id}>
                      <td className={tdCls}>
                        <div className="font-medium text-slate-700 dark:text-slate-200">{line.designation}</div>
                        <div className="font-mono text-[10px] text-slate-400">{line.itemCode}</div>
                      </td>
                      <td className={tdCls}>{numberFormat(line.quantityOrdered)} {line.unit}</td>
                      <td className={tdCls}>{numberFormat(line.quantityReceived)}</td>
                      <td className={tdCls}>
                        <input
                          className={`${inputCls} w-24`}
                          type="number"
                          min={0}
                          step="0.001"
                          value={draft.quantityReceived}
                          onChange={e =>
                            setLines(prev =>
                              prev.map(item =>
                                item.orderLineId === line.id
                                  ? { ...item, quantityReceived: e.target.value }
                                  : item
                              )
                            )
                          }
                        />
                        <div className="text-[10px] text-slate-400 mt-0.5">reste {numberFormat(remaining)}</div>
                      </td>
                      <td className={tdCls}>
                        <input
                          className={`${inputCls} w-32`}
                          value={draft.lotNumber}
                          onChange={e =>
                            setLines(prev =>
                              prev.map(item =>
                                item.orderLineId === line.id
                                  ? { ...item, lotNumber: e.target.value }
                                  : item
                              )
                            )
                          }
                          placeholder="auto si vide"
                        />
                      </td>
                      <td className={tdCls}>
                        <input
                          className={`${inputCls} w-32`}
                          type="date"
                          value={draft.expiryDate}
                          onChange={e =>
                            setLines(prev =>
                              prev.map(item =>
                                item.orderLineId === line.id
                                  ? { ...item, expiryDate: e.target.value }
                                  : item
                              )
                            )
                          }
                        />
                      </td>
                      <td className={tdCls}>
                        <select
                          className={`${inputCls} w-36`}
                          value={draft.locationId}
                          onChange={e =>
                            setLines(prev =>
                              prev.map(item =>
                                item.orderLineId === line.id
                                  ? { ...item, locationId: e.target.value }
                                  : item
                              )
                            )
                          }
                        >
                          <option value="">Emplacement par défaut</option>
                          {locations.map(location => (
                            <option key={location.id} value={location.id}>
                              {location.code}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div>
          <label className={labelCls}>Observations</label>
          <textarea
            className={inputCls}
            rows={2}
            value={observations}
            onChange={e => setObservations(e.target.value)}
            placeholder="État du camion, écarts constatés, réserves…"
          />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-500 cursor-pointer"
          >
            Enregistrer la réception
          </button>
        </div>
      </div>
    </Modal>
  );
};

// ══════════════════════════════════════════════════════════════════════════
// 7. CONSULTATIONS FOURNISSEURS
// ══════════════════════════════════════════════════════════════════════════

const ConsultationsSection: React.FC<{ currentUser: User; onNavigate: (s: ProcurementSection) => void }> = ({
  currentUser,
  onNavigate,
}) => {
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [quoteFor, setQuoteFor] = useState<SupplierConsultation | null>(null);
  const [awardFor, setAwardFor] = useState<SupplierConsultation | null>(null);

  const can = (permission: 'PR_EDIT' | 'PR_VALIDATE' | 'PR_CANCEL') =>
    storage.canProcurement(permission, currentUser);

  const consultations = storage.getSupplierConsultations();
  const requests = storage
    .getPurchaseRequests()
    .filter(request => ['VALIDEE', 'EN_CONSULTATION', 'PARTIELLEMENT_COMMANDEE'].includes(request.status));
  const suppliers = storage.getSuppliers(false);

  const [form, setForm] = useState({ requestId: '', deadline: '', observations: '', invited: [] as string[] });

  useEffect(() => {
    if (!createOpen) return;
    const defaultDeadline = new Date();
    defaultDeadline.setDate(defaultDeadline.getDate() + 15);
    setForm({
      requestId: requests[0]?.id || '',
      deadline: defaultDeadline.toISOString().slice(0, 10),
      observations: '',
      invited: [],
    });
  }, [createOpen]);

  const handleCreate = () => {
    try {
      const consultation = storage.createSupplierConsultation({
        requestId: form.requestId,
        invitedSupplierIds: form.invited,
        deadline: form.deadline,
        observations: form.observations.trim() || undefined,
      });
      setNotice(`Consultation ${consultation.consultationNumber} ouverte.`);
      setCreateOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Création impossible.');
    }
  };

  return (
    <div className="space-y-3">
      <Banner error={error} notice={notice} onClose={() => { setError(''); setNotice(''); }} />

      <SectionHeader
        icon={FileSignature}
        title="Consultations fournisseurs"
        description="Mise en concurrence des demandes validées : offres, délais, conditions de paiement et attribution motivée."
        actions={
          <button
            type="button"
            disabled={!can('PR_EDIT')}
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Nouvelle consultation
          </button>
        }
      />

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
        {consultations.length === 0 ? (
          <EmptyState
            icon={FileSignature}
            text="Aucune consultation enregistrée. Validez une demande d'achat puis mettez-la en concurrence auprès de plusieurs fournisseurs."
          />
        ) : (
          <table className={tableCls}>
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className={thCls}>N° consultation</th>
                <th className={thCls}>Demande</th>
                <th className={thCls}>Fournisseurs</th>
                <th className={thCls}>Date limite</th>
                <th className={thCls}>Offres</th>
                <th className={thCls}>Statut</th>
                <th className={thCls}>Attribution</th>
                <th className={thCls}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {consultations.map(consultation => {
                const awarded = consultation.quotes.find(q => q.id === consultation.awardedQuoteId);
                return (
                  <tr key={consultation.id}>
                    <td className={tdCls}>
                      <div className="font-semibold text-slate-800 dark:text-slate-100">
                        {consultation.consultationNumber}
                      </div>
                      <div className="text-[10px] text-slate-400">{formatDate(consultation.createdAt)}</div>
                    </td>
                    <td className={tdCls}>{consultation.requestNumber}</td>
                    <td className={tdCls}>{consultation.invitedSupplierIds.length}</td>
                    <td className={tdCls}>{formatDate(consultation.deadline)}</td>
                    <td className={tdCls}>
                      <span className="font-semibold">{consultation.quotes.length}</span>
                      <span className="text-slate-400"> / {consultation.invitedSupplierIds.length}</span>
                    </td>
                    <td className={tdCls}>
                      <Chip tone={consultationTone(consultation.status)}>
                        {CONSULTATION_STATUS_LABELS[consultation.status]}
                      </Chip>
                    </td>
                    <td className={tdCls}>
                      {awarded ? (
                        <div>
                          <div className="font-medium text-slate-700 dark:text-slate-200">{awarded.supplierName}</div>
                          <div className="text-[10px] text-slate-400">{money(awarded.totalDzd)}</div>
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className={tdCls}>
                      <div className="flex flex-wrap gap-1">
                        {consultation.status === 'OUVERTE' && can('PR_EDIT') && (
                          <button
                            type="button"
                            onClick={() => setQuoteFor(consultation)}
                            className="px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-[10px] font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                          >
                            + Offre
                          </button>
                        )}
                        {consultation.quotes.length > 0 && (
                          <button
                            type="button"
                            onClick={() => onNavigate('COMPARISON')}
                            className="px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-[10px] font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                          >
                            Comparer
                          </button>
                        )}
                        {consultation.status !== 'ATTRIBUEE' &&
                          consultation.status !== 'ANNULEE' &&
                          consultation.quotes.length > 0 &&
                          can('PR_VALIDATE') && (
                            <button
                              type="button"
                              onClick={() => setAwardFor(consultation)}
                              className="px-2 py-0.5 rounded border border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300 text-[10px] font-semibold hover:bg-emerald-100 cursor-pointer"
                            >
                              Attribuer
                            </button>
                          )}
                        {consultation.status === 'ATTRIBUEE' && (
                          <button
                            type="button"
                            onClick={() => onNavigate('ORDERS')}
                            className="px-2 py-0.5 rounded border border-blue-200 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-300 text-[10px] font-semibold hover:bg-blue-100 cursor-pointer"
                          >
                            Commander
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Création */}
      <Modal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Nouvelle consultation fournisseurs"
        subtitle="Seules les demandes validées peuvent être mises en concurrence."
      >
        <div className="space-y-3">
          <div>
            <label className={labelCls}>Demande d'achat validée</label>
            <select
              className={inputCls}
              value={form.requestId}
              onChange={e => setForm(prev => ({ ...prev, requestId: e.target.value }))}
            >
              <option value="">— Sélectionner —</option>
              {requests.map(request => (
                <option key={request.id} value={request.id}>
                  {request.requestNumber} · {PROCUREMENT_DEPARTMENT_LABELS[request.department]} · {money(request.estimatedTotalDzd)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Date limite de remise des offres</label>
            <input
              type="date"
              className={inputCls}
              value={form.deadline}
              onChange={e => setForm(prev => ({ ...prev, deadline: e.target.value }))}
            />
          </div>
          <div>
            <label className={labelCls}>Fournisseurs à consulter ({form.invited.length} sélectionné(s))</label>
            <div className="max-h-56 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg divide-y divide-slate-100 dark:divide-slate-800">
              {suppliers.length === 0 && (
                <p className="p-3 text-[11px] text-slate-500">
                  Aucun fournisseur actif : complétez le fichier fournisseurs dans le module.
                </p>
              )}
              {suppliers.map(supplier => (
                <label
                  key={supplier.id}
                  className="flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={form.invited.includes(supplier.id)}
                    onChange={e =>
                      setForm(prev => ({
                        ...prev,
                        invited: e.target.checked
                          ? [...prev.invited, supplier.id]
                          : prev.invited.filter(id => id !== supplier.id),
                      }))
                    }
                  />
                  <span className="flex-1">{supplier.name}</span>
                  <span className="text-[10px] text-slate-400">{supplier.wilaya || '—'}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className={labelCls}>Observations</label>
            <textarea
              className={inputCls}
              rows={2}
              value={form.observations}
              onChange={e => setForm(prev => ({ ...prev, observations: e.target.value }))}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleCreate}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-500 cursor-pointer"
            >
              Ouvrir la consultation
            </button>
          </div>
        </div>
      </Modal>

      {quoteFor && (
        <QuoteModal
          consultation={quoteFor}
          onClose={() => setQuoteFor(null)}
          onSaved={message => {
            setNotice(message);
            setQuoteFor(null);
          }}
          onError={setError}
        />
      )}

      {awardFor && (
        <AwardModal
          consultation={awardFor}
          onClose={() => setAwardFor(null)}
          onSaved={message => {
            setNotice(message);
            setAwardFor(null);
          }}
          onError={setError}
        />
      )}
    </div>
  );
};

// ── Modale de saisie d'une offre ────────────────────────────────────────────

const QuoteModal: React.FC<{
  consultation: SupplierConsultation;
  onClose: () => void;
  onSaved: (message: string) => void;
  onError: (message: string) => void;
}> = ({ consultation, onClose, onSaved, onError }) => {
  const suppliers = storage.getSuppliers(false).filter(supplier =>
    consultation.invitedSupplierIds.includes(supplier.id)
  );
  const alreadyQuoted = consultation.quotes.map(quote => quote.supplierId);
  const request = storage.getPurchaseRequest(consultation.requestId);

  const [supplierId, setSupplierId] = useState(
    suppliers.find(supplier => !alreadyQuoted.includes(supplier.id))?.id || ''
  );
  const [leadTimeDays, setLeadTimeDays] = useState('15');
  const [paymentTermsDays, setPaymentTermsDays] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [incoterm, setIncoterm] = useState('');
  const [observations, setObservations] = useState('');
  const [isCompliant, setIsCompliant] = useState(true);
  const [nonComplianceReason, setNonComplianceReason] = useState('');
  const [lines, setLines] = useState<
    Array<{ itemId: string; itemCode: string; designation: string; quantity: string; unitPrice: string; discount: string }>
  >(
    (request?.lines || []).map(line => ({
      itemId: line.itemId,
      itemCode: line.itemCode,
      designation: line.designation,
      quantity: String(line.quantity),
      unitPrice: '',
      discount: '',
    }))
  );

  const total = lines.reduce((sum, line) => {
    const quantity = Number(line.quantity.replace(',', '.')) || 0;
    const price = Number(line.unitPrice.replace(',', '.')) || 0;
    const discount = Number(line.discount.replace(',', '.')) || 0;
    return sum + quantity * price * (1 - Math.min(Math.max(discount, 0), 100) / 100);
  }, 0);

  const handleSubmit = () => {
    try {
      const quote = storage.addSupplierQuote(consultation.id, {
        supplierId,
        leadTimeDays: Number(leadTimeDays.replace(',', '.')) || 0,
        paymentTermsDays: paymentTermsDays ? Number(paymentTermsDays.replace(',', '.')) : undefined,
        validUntil: validUntil || undefined,
        incoterm: incoterm.trim() || undefined,
        observations: observations.trim() || undefined,
        isCompliant,
        nonComplianceReason: isCompliant ? undefined : nonComplianceReason.trim(),
        lines: lines
          .filter(line => Number(line.quantity.replace(',', '.')) > 0)
          .map(line => ({
            itemId: line.itemId,
            quantity: Number(line.quantity.replace(',', '.')) || 0,
            unitPriceDzd: Number(line.unitPrice.replace(',', '.')) || 0,
            discountPercent: Number(line.discount.replace(',', '.')) || undefined,
          })),
      });
      onSaved(`Offre de ${quote.supplierName} enregistrée — ${money(quote.totalDzd)}.`);
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Enregistrement de l\'offre impossible.');
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={`Saisie d'une offre — ${consultation.consultationNumber}`}
      subtitle={`Demande ${consultation.requestNumber} · date limite ${formatDate(consultation.deadline)}`}
      maxWidth="4xl"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="col-span-2">
            <label className={labelCls}>Fournisseur</label>
            <select className={inputCls} value={supplierId} onChange={e => setSupplierId(e.target.value)}>
              <option value="">— Sélectionner —</option>
              {suppliers.map(supplier => (
                <option key={supplier.id} value={supplier.id} disabled={alreadyQuoted.includes(supplier.id)}>
                  {supplier.name}
                  {alreadyQuoted.includes(supplier.id) ? ' (offre déjà reçue)' : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Délai annoncé (jours)</label>
            <input
              className={inputCls}
              type="number"
              min={0}
              value={leadTimeDays}
              onChange={e => setLeadTimeDays(e.target.value)}
            />
          </div>
          <div>
            <label className={labelCls}>Validité de l'offre</label>
            <input type="date" className={inputCls} value={validUntil} onChange={e => setValidUntil(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Conditions de paiement (jours)</label>
            <input
              className={inputCls}
              type="number"
              min={0}
              value={paymentTermsDays}
              onChange={e => setPaymentTermsDays(e.target.value)}
              placeholder="Hérité du fournisseur"
            />
          </div>
          <div>
            <label className={labelCls}>Incoterm</label>
            <input className={inputCls} value={incoterm} onChange={e => setIncoterm(e.target.value)} placeholder="FOB, CIF…" />
          </div>
          <div className="col-span-2 flex items-end">
            <label className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-300">
              <input type="checkbox" checked={!isCompliant} onChange={e => setIsCompliant(!e.target.checked)} />
              Offre non conforme (exclue du comparatif)
            </label>
          </div>
        </div>

        {!isCompliant && (
          <div>
            <label className={labelCls}>Motif de non-conformité</label>
            <input
              className={inputCls}
              value={nonComplianceReason}
              onChange={e => setNonComplianceReason(e.target.value)}
              placeholder="Ex. : article non certifié, délai incompatible avec le besoin"
            />
          </div>
        )}

        <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
          <table className={tableCls}>
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className={thCls}>Article</th>
                <th className={thCls}>Quantité</th>
                <th className={thCls}>Prix unitaire (DZD)</th>
                <th className={thCls}>Remise %</th>
                <th className={thCls}>Total ligne</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, index) => {
                const quantity = Number(line.quantity.replace(',', '.')) || 0;
                const price = Number(line.unitPrice.replace(',', '.')) || 0;
                const discount = Number(line.discount.replace(',', '.')) || 0;
                const lineTotal = quantity * price * (1 - Math.min(Math.max(discount, 0), 100) / 100);
                return (
                  <tr key={line.itemId}>
                    <td className={tdCls}>
                      <div className="font-medium text-slate-700 dark:text-slate-200">{line.designation}</div>
                      <div className="font-mono text-[10px] text-slate-400">{line.itemCode}</div>
                    </td>
                    <td className={tdCls}>
                      <input
                        className={`${inputCls} w-24`}
                        type="number"
                        min={0}
                        step="0.001"
                        value={line.quantity}
                        onChange={e =>
                          setLines(prev =>
                            prev.map((item, i) => (i === index ? { ...item, quantity: e.target.value } : item))
                          )
                        }
                      />
                    </td>
                    <td className={tdCls}>
                      <input
                        className={`${inputCls} w-28`}
                        type="number"
                        min={0}
                        step="0.01"
                        value={line.unitPrice}
                        onChange={e =>
                          setLines(prev =>
                            prev.map((item, i) => (i === index ? { ...item, unitPrice: e.target.value } : item))
                          )
                        }
                      />
                    </td>
                    <td className={tdCls}>
                      <input
                        className={`${inputCls} w-20`}
                        type="number"
                        min={0}
                        max={100}
                        value={line.discount}
                        onChange={e =>
                          setLines(prev =>
                            prev.map((item, i) => (i === index ? { ...item, discount: e.target.value } : item))
                          )
                        }
                      />
                    </td>
                    <td className={`${tdCls} font-semibold`}>{money(lineTotal)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 dark:bg-slate-800/50">
                <td className={`${tdCls} font-bold`} colSpan={4}>
                  Total offre
                </td>
                <td className={`${tdCls} font-bold text-blue-700 dark:text-blue-300`}>{money(total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div>
          <label className={labelCls}>Observations</label>
          <textarea
            className={inputCls}
            rows={2}
            value={observations}
            onChange={e => setObservations(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-500 cursor-pointer"
          >
            Enregistrer l'offre
          </button>
        </div>
      </div>
    </Modal>
  );
};

// ── Modale d'attribution ────────────────────────────────────────────────────

const AwardModal: React.FC<{
  consultation: SupplierConsultation;
  onClose: () => void;
  onSaved: (message: string) => void;
  onError: (message: string) => void;
}> = ({ consultation, onClose, onSaved, onError }) => {
  const comparison = storage.getQuoteComparison(consultation.id);
  const [quoteId, setQuoteId] = useState(comparison[0]?.quote.id || '');
  const [justification, setJustification] = useState('');

  const handleSubmit = () => {
    try {
      storage.awardSupplierConsultation(consultation.id, quoteId, justification);
      onSaved('Consultation attribuée : la commande peut être générée depuis le module Commandes.');
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Attribution impossible.');
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={`Attribution — ${consultation.consultationNumber}`}
      subtitle="La justification est enregistrée dans le journal d'audit."
      maxWidth="3xl"
    >
      <div className="space-y-4">
        <div className="space-y-2">
          {comparison.map(entry => (
            <label
              key={entry.quote.id}
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer ${
                quoteId === entry.quote.id
                  ? 'border-blue-400 bg-blue-50/60 dark:bg-blue-950/30'
                  : 'border-slate-200 dark:border-slate-700'
              }`}
            >
              <input
                type="radio"
                className="mt-1"
                checked={quoteId === entry.quote.id}
                onChange={() => setQuoteId(entry.quote.id)}
              />
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                    {entry.quote.supplierName}
                  </span>
                  <span className="text-xs font-bold text-blue-700 dark:text-blue-300">
                    {money(entry.quote.totalDzd)}
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Délai {entry.quote.leadTimeDays} j · Paiement {entry.quote.paymentTermsDays ?? 0} j · Score{' '}
                  {entry.totalScore}/100 (rang {entry.rank})
                </div>
              </div>
            </label>
          ))}
        </div>
        <div>
          <label className={labelCls}>Justification de l'attribution (obligatoire, 10 caractères min.)</label>
          <textarea
            className={inputCls}
            rows={3}
            value={justification}
            onChange={e => setJustification(e.target.value)}
            placeholder="Ex. : meilleur rapport prix/délai, fournisseur référencé ISO 22000…"
          />
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 cursor-pointer"
          >
            Attribuer la consultation
          </button>
        </div>
      </div>
    </Modal>
  );
};

// ══════════════════════════════════════════════════════════════════════════
// 8. COMPARATIF DES OFFRES
// ══════════════════════════════════════════════════════════════════════════

const ComparisonSection: React.FC<{ currentUser: User; onNavigate: (s: ProcurementSection) => void }> = ({
  currentUser,
}) => {
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const consultations = storage
    .getSupplierConsultations()
    .filter(consultation => consultation.quotes.length > 0);
  const [consultationId, setConsultationId] = useState(consultations[0]?.id || '');
  const [awardOpen, setAwardOpen] = useState(false);

  const consultation = consultations.find(item => item.id === consultationId) || consultations[0];
  const comparison = consultation ? storage.getQuoteComparison(consultation.id) : [];

  const allItems = useMemo(() => {
    if (!consultation) return [];
    const map = new Map<string, { itemCode: string; designation: string; quantity: number; unit: string }>();
    consultation.quotes.forEach(quote =>
      quote.lines.forEach(line => {
        if (!map.has(line.itemId)) {
          map.set(line.itemId, {
            itemCode: line.itemCode,
            designation: line.designation,
            quantity: line.quantity,
            unit: line.unit,
          });
        }
      })
    );
    return Array.from(map.entries());
  }, [consultationId, consultation?.quotes.length]);

  return (
    <div className="space-y-3">
      <Banner error={error} notice={notice} onClose={() => { setError(''); setNotice(''); }} />

      <SectionHeader
        icon={Scale}
        title="Comparatif des offres"
        description="Classement pondéré : prix 60 %, délai de livraison 25 %, conditions de paiement 15 %. Aucune note n'est saisie manuellement."
        actions={
          consultation && consultation.status !== 'ATTRIBUEE' && comparison.length > 0 ? (
            <button
              type="button"
              disabled={!storage.canProcurement('PR_VALIDATE', currentUser)}
              onClick={() => setAwardOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50 cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Attribuer
            </button>
          ) : undefined
        }
      />

      {consultations.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          <EmptyState icon={Scale} text="Aucune offre disponible pour le moment. Saisissez des offres depuis le module Consultations fournisseurs." />
        </div>
      ) : (
        <>
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3">
            <label className={labelCls}>Consultation</label>
            <select
              className={`${inputCls} max-w-xl`}
              value={consultation?.id || ''}
              onChange={e => setConsultationId(e.target.value)}
            >
              {consultations.map(item => (
                <option key={item.id} value={item.id}>
                  {item.consultationNumber} · {item.requestNumber} · {item.quotes.length} offre(s)
                </option>
              ))}
            </select>
          </div>

          {comparison.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              <EmptyState icon={AlertTriangle} text="Toutes les offres de cette consultation sont déclarées non conformes : aucun comparatif n'est calculé." />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                {comparison.map(entry => (
                  <div
                    key={entry.quote.id}
                    className={`bg-white dark:bg-slate-900 rounded-xl border p-4 ${
                      entry.isBestValue
                        ? 'border-emerald-300 dark:border-emerald-800 ring-1 ring-emerald-200 dark:ring-emerald-900'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-bold text-slate-800 dark:text-slate-100">
                          {entry.quote.supplierName}
                        </div>
                        <div className="text-[10px] text-slate-400">Rang {entry.rank}</div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {entry.isCheapest && <Chip tone="bg-blue-50 text-blue-700 border-blue-200">Moins cher</Chip>}
                        {entry.isFastest && <Chip tone="bg-indigo-50 text-indigo-700 border-indigo-200">Plus rapide</Chip>}
                        {entry.isBestValue && <Chip tone="bg-emerald-50 text-emerald-700 border-emerald-200">Meilleur choix</Chip>}
                      </div>
                    </div>
                    <div className="mt-3 text-xl font-bold text-slate-900 dark:text-slate-100">
                      {money(entry.quote.totalDzd)}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Délai {entry.quote.leadTimeDays} j · Paiement {entry.quote.paymentTermsDays ?? 0} j
                    </div>
                    <div className="mt-3 space-y-1.5">
                      {[
                        { label: 'Prix', value: entry.priceScore, weight: '60 %' },
                        { label: 'Délai', value: entry.leadTimeScore, weight: '25 %' },
                        { label: 'Paiement', value: entry.termsScore, weight: '15 %' },
                      ].map(metric => (
                        <div key={metric.label}>
                          <div className="flex items-center justify-between text-[10px] text-slate-500">
                            <span>
                              {metric.label} <span className="text-slate-400">({metric.weight})</span>
                            </span>
                            <span className="font-semibold">{numberFormat(metric.value)}</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-blue-500"
                              style={{ width: `${Math.min(100, Math.max(0, metric.value))}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Score global</span>
                      <span className="text-base font-bold text-blue-700 dark:text-blue-300">
                        {numberFormat(entry.totalScore)}/100
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
                <table className={tableCls}>
                  <thead className="bg-slate-50 dark:bg-slate-800/50">
                    <tr>
                      <th className={thCls}>Article</th>
                      {comparison.map(entry => (
                        <th key={entry.quote.id} className={thCls}>
                          {entry.quote.supplierName}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {allItems.map(([itemId, item]) => {
                      const prices = comparison.map(entry => {
                        const line = entry.quote.lines.find(l => l.itemId === itemId);
                        return line ? line.unitPriceDzd : undefined;
                      });
                      const minPrice = Math.min(...prices.filter((p): p is number => typeof p === 'number'));
                      return (
                        <tr key={itemId}>
                          <td className={tdCls}>
                            <div className="font-medium text-slate-700 dark:text-slate-200">{item.designation}</div>
                            <div className="font-mono text-[10px] text-slate-400">
                              {item.itemCode} · {numberFormat(item.quantity)} {item.unit}
                            </div>
                          </td>
                          {prices.map((price, index) => (
                            <td
                              key={`${itemId}-${index}`}
                              className={`${tdCls} ${
                                price !== undefined && price === minPrice ? 'font-bold text-emerald-700 dark:text-emerald-300' : ''
                              }`}
                            >
                              {price === undefined ? <span className="text-slate-300">—</span> : money(price)}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {consultation?.awardedQuoteId && (
                <div className="px-4 py-3 rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800 text-[11px] text-emerald-800 dark:text-emerald-300">
                  <strong>Attribution enregistrée :</strong> {consultation.awardedSupplierName} —{' '}
                  {consultation.awardJustification}
                </div>
              )}
            </>
          )}
        </>
      )}

      {awardOpen && consultation && (
        <AwardModal
          consultation={consultation}
          onClose={() => setAwardOpen(false)}
          onSaved={message => {
            setNotice(message);
            setAwardOpen(false);
          }}
          onError={setError}
        />
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════
// 9. COMMANDES D'ACHAT
// ══════════════════════════════════════════════════════════════════════════

const OrdersSection: React.FC<{ currentUser: User; onNavigate: (s: ProcurementSection) => void }> = ({
  currentUser,
  onNavigate,
}) => {
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [cancelFor, setCancelFor] = useState<PurchaseOrder | null>(null);
  const [reason, setReason] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | PurchaseOrderStatus>('ALL');
  const [search, setSearch] = useState('');

  const can = (permission: 'PR_EDIT' | 'PR_VALIDATE' | 'PR_CANCEL') =>
    storage.canProcurement(permission, currentUser);

  const orders = storage.getPurchaseOrders().filter(order => {
    const matchStatus = statusFilter === 'ALL' || order.status === statusFilter;
    const term = search.trim().toLowerCase();
    const matchSearch =
      !term ||
      order.orderNumber.toLowerCase().includes(term) ||
      order.supplierName.toLowerCase().includes(term) ||
      (order.requestNumber || '').toLowerCase().includes(term);
    return matchStatus && matchSearch;
  });

  const handleAction = (action: () => void, successMessage: string) => {
    try {
      action();
      setNotice(successMessage);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action impossible.');
    }
  };

  return (
    <div className="space-y-3">
      <Banner error={error} notice={notice} onClose={() => { setError(''); setNotice(''); }} />

      <SectionHeader
        icon={ShoppingCart}
        title="Commandes d'achat"
        description="Génération depuis une consultation attribuée ou une demande validée, puis confirmation, réception et clôture."
        actions={
          <button
            type="button"
            disabled={!can('PR_EDIT')}
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Nouvelle commande
          </button>
        }
      />

      <div className="flex flex-wrap items-center gap-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            className={`${inputCls} pl-8`}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un n° de commande, un fournisseur, une demande…"
          />
        </div>
        <select
          className={`${inputCls} max-w-52`}
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as 'ALL' | PurchaseOrderStatus)}
        >
          <option value="ALL">Tous les statuts</option>
          {(Object.keys(PURCHASE_ORDER_STATUS_LABELS) as PurchaseOrderStatus[]).map(status => (
            <option key={status} value={status}>
              {PURCHASE_ORDER_STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
        {orders.length === 0 ? (
          <EmptyState icon={ShoppingCart} text="Aucune commande ne correspond aux critères. Générez une commande depuis une demande validée ou une consultation attribuée." />
        ) : (
          <table className={tableCls}>
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className={thCls}>N° commande</th>
                <th className={thCls}>Fournisseur</th>
                <th className={thCls}>Origine</th>
                <th className={thCls}>Émission</th>
                <th className={thCls}>Livraison prévue</th>
                <th className={thCls}>Montant</th>
                <th className={thCls}>Réception</th>
                <th className={thCls}>Statut</th>
                <th className={thCls}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(order => {
                const ordered = order.lines.reduce((sum, line) => sum + line.quantityOrdered, 0);
                const received = order.lines.reduce((sum, line) => sum + line.quantityReceived, 0);
                const progress = ordered > 0 ? Math.min(100, (received / ordered) * 100) : 0;
                const late =
                  !['RECUE', 'CLOTUREE', 'ANNULEE'].includes(order.status) &&
                  order.expectedDate.slice(0, 10) < todayIso();
                return (
                  <tr key={order.id}>
                    <td className={tdCls}>
                      <div className="font-semibold text-slate-800 dark:text-slate-100">{order.orderNumber}</div>
                      <div className="text-[10px] text-slate-400">{order.createdBy}</div>
                    </td>
                    <td className={tdCls}>{order.supplierName}</td>
                    <td className={tdCls}>
                      {order.consultationId ? 'Consultation' : order.requestNumber ? order.requestNumber : 'Directe'}
                    </td>
                    <td className={tdCls}>{formatDate(order.orderDate)}</td>
                    <td className={tdCls}>
                      <span className={late ? 'text-red-600 font-semibold' : ''}>{formatDate(order.expectedDate)}</span>
                      {late && <div className="text-[10px] text-red-500">En retard</div>}
                    </td>
                    <td className={`${tdCls} font-semibold`}>{money(order.totalDzd)}</td>
                    <td className={tdCls}>
                      <div className="w-24">
                        <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${progress >= 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{Math.round(progress)} %</div>
                      </div>
                    </td>
                    <td className={tdCls}>
                      <Chip tone={orderTone(order.status)}>{PURCHASE_ORDER_STATUS_LABELS[order.status]}</Chip>
                    </td>
                    <td className={tdCls}>
                      <div className="flex flex-wrap gap-1">
                        {order.status === 'EMISE' && can('PR_EDIT') && (
                          <button
                            type="button"
                            onClick={() =>
                              handleAction(
                                () => storage.confirmPurchaseOrder(order.id),
                                `Commande ${order.orderNumber} confirmée par le fournisseur.`
                              )
                            }
                            className="px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-[10px] font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                          >
                            Confirmer
                          </button>
                        )}
                        {['EMISE', 'CONFIRMEE', 'PARTIELLEMENT_RECUE'].includes(order.status) && (
                          <button
                            type="button"
                            onClick={() => {
                              window.dispatchEvent(new CustomEvent('mamora-open-receipt', { detail: order.id }));
                              onNavigate('RECEPTIONS');
                            }}
                            className="px-2 py-0.5 rounded border border-blue-200 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-300 text-[10px] font-semibold hover:bg-blue-100 cursor-pointer"
                          >
                            Réceptionner
                          </button>
                        )}
                        {order.status === 'PARTIELLEMENT_RECUE' && can('PR_VALIDATE') && (
                          <button
                            type="button"
                            onClick={() => {
                              setCancelFor(order);
                              setReason('');
                            }}
                            className="px-2 py-0.5 rounded border border-amber-200 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300 text-[10px] font-semibold hover:bg-amber-100 cursor-pointer"
                          >
                            Clôturer
                          </button>
                        )}
                        {['EMISE', 'CONFIRMEE', 'BROUILLON'].includes(order.status) && can('PR_CANCEL') && (
                          <button
                            type="button"
                            onClick={() => {
                              setCancelFor(order);
                              setReason('');
                            }}
                            className="px-2 py-0.5 rounded border border-red-200 bg-red-50 text-red-700 dark:bg-red-950/40 dark:border-red-800 dark:text-red-300 text-[10px] font-semibold hover:bg-red-100 cursor-pointer"
                          >
                            Annuler
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {createOpen && (
        <OrderCreateModal
          onClose={() => setCreateOpen(false)}
          onSaved={message => {
            setNotice(message);
            setCreateOpen(false);
          }}
          onError={setError}
        />
      )}

      <Modal
        isOpen={Boolean(cancelFor)}
        onClose={() => setCancelFor(null)}
        title={
          cancelFor?.status === 'PARTIELLEMENT_RECUE'
            ? `Clôture avec reliquat — ${cancelFor?.orderNumber}`
            : `Annulation — ${cancelFor?.orderNumber}`
        }
        subtitle="Un motif est obligatoire : il est conservé dans le journal d'audit."
        maxWidth="lg"
      >
        <div className="space-y-3">
          <textarea
            className={inputCls}
            rows={3}
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Motif…"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setCancelFor(null)}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"
            >
              Retour
            </button>
            <button
              type="button"
              onClick={() => {
                if (!cancelFor) return;
                const isClosing = cancelFor.status === 'PARTIELLEMENT_RECUE';
                handleAction(
                  () =>
                    isClosing
                      ? storage.closePurchaseOrder(cancelFor.id, reason)
                      : storage.cancelPurchaseOrder(cancelFor.id, reason),
                  isClosing
                    ? `Commande ${cancelFor.orderNumber} clôturée avec reliquat.`
                    : `Commande ${cancelFor.orderNumber} annulée.`
                );
                setCancelFor(null);
              }}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-600 text-white hover:bg-red-500 cursor-pointer"
            >
              Confirmer
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

const OrderCreateModal: React.FC<{
  onClose: () => void;
  onSaved: (message: string) => void;
  onError: (message: string) => void;
}> = ({ onClose, onSaved, onError }) => {
  const awardedConsultations = storage
    .getSupplierConsultations()
    .filter(consultation => consultation.status === 'ATTRIBUEE');
  const orderableRequests = storage
    .getPurchaseRequests()
    .filter(request => ['VALIDEE', 'EN_CONSULTATION', 'PARTIELLEMENT_COMMANDEE'].includes(request.status));
  const suppliers = storage.getSuppliers(false);
  const warehouses = storage.getWarehouses(true);

  const [mode, setMode] = useState<'CONSULTATION' | 'DEMANDE'>(
    awardedConsultations.length > 0 ? 'CONSULTATION' : 'DEMANDE'
  );
  const [consultationId, setConsultationId] = useState(awardedConsultations[0]?.id || '');
  const [requestId, setRequestId] = useState(orderableRequests[0]?.id || '');
  const [supplierId, setSupplierId] = useState('');
  const [expectedDate, setExpectedDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + storage.getProcurementSettings().defaultLeadTimeDays);
    return date.toISOString().slice(0, 10);
  });
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id || '');
  const [paymentTermsDays, setPaymentTermsDays] = useState('');
  const [observations, setObservations] = useState('');
  const [priceOverrides, setPriceOverrides] = useState<Record<string, string>>({});
  const [quantityOverrides, setQuantityOverrides] = useState<Record<string, string>>({});

  const consultation = awardedConsultations.find(item => item.id === consultationId);
  const awardedQuote = consultation?.quotes.find(quote => quote.id === consultation.awardedQuoteId);
  const remainingLines = requestId ? storage.getRequestRemainingLines(requestId).filter(l => l.quantityRemaining > 0) : [];

  const handleSubmit = () => {
    try {
      if (mode === 'CONSULTATION') {
        if (!consultation || !awardedQuote) {
          onError('Sélectionnez une consultation attribuée.');
          return;
        }
        const order = storage.createPurchaseOrder({
          supplierId: awardedQuote.supplierId,
          consultationId: consultation.id,
          requestId: consultation.requestId,
          expectedDate,
          deliveryWarehouseId: warehouseId || undefined,
          paymentTermsDays: paymentTermsDays ? Number(paymentTermsDays) : undefined,
          observations: observations.trim() || undefined,
        });
        onSaved(`Commande ${order.orderNumber} créée — ${money(order.totalDzd)}.`);
        return;
      }

      if (!supplierId) {
        onError('Sélectionnez le fournisseur de la commande.');
        return;
      }
      const order = storage.createPurchaseOrder({
        supplierId,
        requestId: requestId || undefined,
        expectedDate,
        deliveryWarehouseId: warehouseId || undefined,
        paymentTermsDays: paymentTermsDays ? Number(paymentTermsDays) : undefined,
        observations: observations.trim() || undefined,
        lines: remainingLines.map(line => ({
          itemId: line.itemId,
          quantity: Number((quantityOverrides[line.requestLineId] ?? line.quantityRemaining).toString().replace(',', '.')) || 0,
          unitPriceDzd: Number((priceOverrides[line.requestLineId] ?? '0').toString().replace(',', '.')) || 0,
          requestLineId: line.requestLineId,
        })),
      });
      onSaved(`Commande ${order.orderNumber} créée — ${money(order.totalDzd)}.`);
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Création de la commande impossible.');
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Nouvelle commande d'achat"
      subtitle="Depuis une consultation attribuée ou directement depuis une demande validée."
      maxWidth="4xl"
    >
      <div className="space-y-4">
        <div className="flex gap-2">
          {(['CONSULTATION', 'DEMANDE'] as const).map(value => (
            <button
              key={value}
              type="button"
              onClick={() => setMode(value)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border cursor-pointer ${
                mode === value
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {value === 'CONSULTATION' ? 'Consultation attribuée' : 'Demande validée'}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {mode === 'CONSULTATION' ? (
            <div className="md:col-span-2">
              <label className={labelCls}>Consultation attribuée</label>
              <select
                className={inputCls}
                value={consultationId}
                onChange={e => setConsultationId(e.target.value)}
              >
                <option value="">— Sélectionner —</option>
                {awardedConsultations.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.consultationNumber} · {item.awardedSupplierName} · {item.requestNumber}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <>
              <div className="md:col-span-2">
                <label className={labelCls}>Demande d'achat</label>
                <select className={inputCls} value={requestId} onChange={e => setRequestId(e.target.value)}>
                  <option value="">— Sélectionner —</option>
                  {orderableRequests.map(request => (
                    <option key={request.id} value={request.id}>
                      {request.requestNumber} · {PROCUREMENT_DEPARTMENT_LABELS[request.department]} · {money(request.estimatedTotalDzd)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Fournisseur</label>
                <select className={inputCls} value={supplierId} onChange={e => setSupplierId(e.target.value)}>
                  <option value="">— Sélectionner —</option>
                  {suppliers.map(supplier => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div>
            <label className={labelCls}>Livraison prévue</label>
            <input type="date" className={inputCls} value={expectedDate} onChange={e => setExpectedDate(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Magasin de destination</label>
            <select className={inputCls} value={warehouseId} onChange={e => setWarehouseId(e.target.value)}>
              <option value="">— Non précisé —</option>
              {warehouses.map(warehouse => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.code} — {warehouse.designation}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Conditions de paiement (jours)</label>
            <input
              className={inputCls}
              type="number"
              min={0}
              value={paymentTermsDays}
              onChange={e => setPaymentTermsDays(e.target.value)}
              placeholder="Hérité du fournisseur"
            />
          </div>
        </div>

        <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
          <table className={tableCls}>
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className={thCls}>Article</th>
                <th className={thCls}>Quantité</th>
                {mode === 'DEMANDE' && <th className={thCls}>Prix unitaire (DZD)</th>}
                <th className={thCls}>Total</th>
              </tr>
            </thead>
            <tbody>
              {mode === 'CONSULTATION' && awardedQuote ? (
                awardedQuote.lines.map(line => (
                  <tr key={line.itemId}>
                    <td className={tdCls}>
                      <div className="font-medium text-slate-700 dark:text-slate-200">{line.designation}</div>
                      <div className="font-mono text-[10px] text-slate-400">{line.itemCode}</div>
                    </td>
                    <td className={tdCls}>{numberFormat(line.quantity)} {line.unit}</td>
                    <td className={`${tdCls} font-semibold`}>{money(line.lineTotalDzd)}</td>
                  </tr>
                ))
              ) : remainingLines.length > 0 ? (
                remainingLines.map(line => {
                  const quantity = Number((quantityOverrides[line.requestLineId] ?? line.quantityRemaining).toString().replace(',', '.')) || 0;
                  const price = Number((priceOverrides[line.requestLineId] ?? '0').toString().replace(',', '.')) || 0;
                  return (
                    <tr key={line.requestLineId}>
                      <td className={tdCls}>
                        <div className="font-medium text-slate-700 dark:text-slate-200">{line.designation}</div>
                        <div className="font-mono text-[10px] text-slate-400">
                          {line.itemCode} · reste {numberFormat(line.quantityRemaining)} {line.unit}
                        </div>
                      </td>
                      <td className={tdCls}>
                        <input
                          className={`${inputCls} w-24`}
                          type="number"
                          min={0}
                          step="0.001"
                          value={quantityOverrides[line.requestLineId] ?? String(line.quantityRemaining)}
                          onChange={e =>
                            setQuantityOverrides(prev => ({ ...prev, [line.requestLineId]: e.target.value }))
                          }
                        />
                      </td>
                      <td className={tdCls}>
                        <input
                          className={`${inputCls} w-28`}
                          type="number"
                          min={0}
                          step="0.01"
                          value={priceOverrides[line.requestLineId] ?? ''}
                          onChange={e =>
                            setPriceOverrides(prev => ({ ...prev, [line.requestLineId]: e.target.value }))
                          }
                        />
                      </td>
                      <td className={`${tdCls} font-semibold`}>{money(quantity * price)}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td className={`${tdCls} text-center text-slate-500`} colSpan={mode === 'DEMANDE' ? 4 : 3}>
                    Aucune ligne restant à commander pour cette demande.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div>
          <label className={labelCls}>Observations</label>
          <textarea className={inputCls} rows={2} value={observations} onChange={e => setObservations(e.target.value)} />
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-500 cursor-pointer"
          >
            Émettre la commande
          </button>
        </div>
      </div>
    </Modal>
  );
};

// ══════════════════════════════════════════════════════════════════════════
// 10. SUIVI DES COMMANDES & RELANCES
// ══════════════════════════════════════════════════════════════════════════

const TrackingSection: React.FC<{ currentUser: User; onNavigate: (s: ProcurementSection) => void }> = ({
  onNavigate,
}) => {
  const orders = storage
    .getPurchaseOrders()
    .filter(order => ['EMISE', 'CONFIRMEE', 'PARTIELLEMENT_RECUE'].includes(order.status));

  const rows = orders.map(order => {
    const orderedQty = order.lines.reduce((sum, line) => sum + line.quantityOrdered, 0);
    const receivedQty = order.lines.reduce((sum, line) => sum + line.quantityReceived, 0);
    const delayDays = daysBetween(order.expectedDate.slice(0, 10), todayIso());
    return {
      order,
      orderedQty,
      receivedQty,
      remainingQty: Math.max(0, orderedQty - receivedQty),
      progress: orderedQty > 0 ? Math.min(100, (receivedQty / orderedQty) * 100) : 0,
      delayDays,
      isLate: delayDays > 0,
    };
  });

  const lateCount = rows.filter(row => row.isLate).length;

  return (
    <div className="space-y-3">
      <SectionHeader
        icon={Truck}
        title="Suivi des commandes & relances"
        description="Commandes en cours, retards constatés et reliquats à réceptionner. Le retard est calculé sur la date de livraison prévue."
        actions={
          <button
            type="button"
            onClick={() => onNavigate('ORDERS')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
          >
            Toutes les commandes
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Commandes en cours', value: String(rows.length), tone: 'text-slate-800 dark:text-slate-100' },
          { label: 'En retard', value: String(lateCount), tone: 'text-red-600' },
          {
            label: 'Quantités attendues',
            value: numberFormat(rows.reduce((sum, row) => sum + row.remainingQty, 0)),
            tone: 'text-slate-800 dark:text-slate-100',
          },
          {
            label: 'Valeur engagée',
            value: money(rows.reduce((sum, row) => sum + row.order.totalDzd, 0)),
            tone: 'text-blue-700 dark:text-blue-300',
          },
        ].map(stat => (
          <div key={stat.label} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3">
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500">{stat.label}</div>
            <div className={`text-lg font-bold ${stat.tone}`}>{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
        {rows.length === 0 ? (
          <EmptyState icon={Truck} text="Aucune commande en cours de livraison." />
        ) : (
          <table className={tableCls}>
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className={thCls}>Commande</th>
                <th className={thCls}>Fournisseur</th>
                <th className={thCls}>Livraison prévue</th>
                <th className={thCls}>Retard</th>
                <th className={thCls}>Avancement</th>
                <th className={thCls}>Reliquat</th>
                <th className={thCls}>Statut</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.order.id}>
                  <td className={tdCls}>
                    <div className="font-semibold text-slate-800 dark:text-slate-100">{row.order.orderNumber}</div>
                    <div className="text-[10px] text-slate-400">{formatDate(row.order.orderDate)}</div>
                  </td>
                  <td className={tdCls}>{row.order.supplierName}</td>
                  <td className={tdCls}>{formatDate(row.order.expectedDate)}</td>
                  <td className={tdCls}>
                    {row.isLate ? (
                      <Chip tone="bg-red-50 text-red-700 border-red-200">{row.delayDays} j</Chip>
                    ) : (
                      <Chip tone="bg-emerald-50 text-emerald-700 border-emerald-200">À jour</Chip>
                    )}
                  </td>
                  <td className={tdCls}>
                    <div className="w-28">
                      <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${row.progress >= 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                          style={{ width: `${row.progress}%` }}
                        />
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {numberFormat(row.receivedQty)} / {numberFormat(row.orderedQty)}
                      </div>
                    </div>
                  </td>
                  <td className={tdCls}>{numberFormat(row.remainingQty)}</td>
                  <td className={tdCls}>
                    <Chip tone={orderTone(row.order.status)}>{PURCHASE_ORDER_STATUS_LABELS[row.order.status]}</Chip>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════
// 11. RÉCEPTIONS ACHATS
// ══════════════════════════════════════════════════════════════════════════

const ReceiptsSection: React.FC<{ currentUser: User }> = ({ currentUser }) => {
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [presetOrderId, setPresetOrderId] = useState<string | undefined>(undefined);
  const [qualityFor, setQualityFor] = useState<PurchaseReceipt | null>(null);
  const [decision, setDecision] = useState<Exclude<ReceiptQualityStatus, 'EN_ATTENTE'>>('ACCEPTEE');
  const [qualityNotes, setQualityNotes] = useState('');

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      setPresetOrderId(detail);
      setReceiptOpen(true);
    };
    window.addEventListener('mamora-open-receipt', handler);
    return () => window.removeEventListener('mamora-open-receipt', handler);
  }, []);

  const receipts = storage.getPurchaseReceipts();
  const pendingQuality = receipts.filter(receipt => receipt.qualityStatus === 'EN_ATTENTE');

  const handleDecision = () => {
    if (!qualityFor) return;
    try {
      storage.decideReceiptQuality(qualityFor.id, decision, qualityNotes);
      setNotice(`Décision qualité enregistrée sur la réception ${qualityFor.receiptNumber}.`);
      setQualityFor(null);
      setQualityNotes('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Décision impossible.');
    }
  };

  return (
    <div className="space-y-3">
      <Banner error={error} notice={notice} onClose={() => { setError(''); setNotice(''); }} />

      <SectionHeader
        icon={PackageCheck}
        title="Réceptions achats"
        description="Entrée en stock par lot, contrôle qualité et décision d'agréage. Le stock n'est jamais créé sans mouvement tracé."
        actions={
          <button
            type="button"
            disabled={!storage.canProcurement('PR_EDIT', currentUser)}
            onClick={() => {
              setPresetOrderId(undefined);
              setReceiptOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Réceptionner
          </button>
        }
      />

      {pendingQuality.length > 0 && (
        <div className="px-4 py-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {pendingQuality.length} réception(s) en attente de contrôle qualité : le stock correspondant est en quarantaine
          et indisponible pour la production.
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
        {receipts.length === 0 ? (
          <EmptyState icon={PackageCheck} text="Aucune réception enregistrée. Les réceptions se font depuis les commandes émises ou confirmées." />
        ) : (
          <table className={tableCls}>
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className={thCls}>N° réception</th>
                <th className={thCls}>Commande</th>
                <th className={thCls}>Fournisseur</th>
                <th className={thCls}>Date</th>
                <th className={thCls}>Lignes</th>
                <th className={thCls}>Qualité</th>
                <th className={thCls}>Stock</th>
                <th className={thCls}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {receipts.map(receipt => (
                <tr key={receipt.id}>
                  <td className={tdCls}>
                    <div className="font-semibold text-slate-800 dark:text-slate-100">{receipt.receiptNumber}</div>
                    <div className="text-[10px] text-slate-400">{receipt.deliveryNoteNumber || 'Sans BL'}</div>
                  </td>
                  <td className={tdCls}>{receipt.orderNumber}</td>
                  <td className={tdCls}>{receipt.supplierName}</td>
                  <td className={tdCls}>{formatDate(receipt.receivedAt)}</td>
                  <td className={tdCls}>{receipt.lines.length}</td>
                  <td className={tdCls}>
                    <Chip tone={qualityTone(receipt.qualityStatus)}>
                      {RECEIPT_QUALITY_STATUS_LABELS[receipt.qualityStatus]}
                    </Chip>
                  </td>
                  <td className={tdCls}>
                    {receipt.isOnHold ? (
                      <Chip tone="bg-amber-50 text-amber-700 border-amber-200">Quarantaine</Chip>
                    ) : (
                      <Chip tone="bg-emerald-50 text-emerald-700 border-emerald-200">Disponible</Chip>
                    )}
                  </td>
                  <td className={tdCls}>
                    {receipt.qualityStatus === 'EN_ATTENTE' && storage.canProcurement('PR_VALIDATE', currentUser) && (
                      <button
                        type="button"
                        onClick={() => {
                          setQualityFor(receipt);
                          setDecision('ACCEPTEE');
                          setQualityNotes('');
                        }}
                        className="px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-[10px] font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        Statuer
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ReceiptModal
        isOpen={receiptOpen}
        onClose={() => setReceiptOpen(false)}
        presetOrderId={presetOrderId}
        onSaved={setNotice}
        onError={setError}
      />

      <Modal
        isOpen={Boolean(qualityFor)}
        onClose={() => setQualityFor(null)}
        title={`Contrôle qualité — ${qualityFor?.receiptNumber}`}
        subtitle="La décision libère ou rejette le lot : elle est auditée."
        maxWidth="lg"
      >
        <div className="space-y-3">
          <div>
            <label className={labelCls}>Décision</label>
            <select
              className={inputCls}
              value={decision}
              onChange={e => setDecision(e.target.value as Exclude<ReceiptQualityStatus, 'EN_ATTENTE'>)}
            >
              <option value="ACCEPTEE">Acceptée — libération du stock</option>
              <option value="ACCEPTEE_PARTIELLE">Acceptée partiellement</option>
              <option value="REFUSEE">Refusée — rejet du lot</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Commentaire du contrôle (obligatoire)</label>
            <textarea
              className={inputCls}
              rows={3}
              value={qualityNotes}
              onChange={e => setQualityNotes(e.target.value)}
              placeholder="Résultats d'analyse, température à réception, conformité documentaire…"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setQualityFor(null)}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleDecision}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-500 cursor-pointer"
            >
              Enregistrer la décision
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════
// 12. ÉVALUATION FOURNISSEURS (calculée)
// ══════════════════════════════════════════════════════════════════════════

const EvaluationSection: React.FC = () => {
  const evaluations = storage.getSupplierEvaluations();

  return (
    <div className="space-y-3">
      <SectionHeader
        icon={Star}
        title="Évaluation des fournisseurs"
        description="Notes calculées sur les commandes et réceptions réelles : ponctualité 35 %, quantité 20 %, qualité 45 %. Aucune note n'est saisie manuellement."
      />

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
        {evaluations.length === 0 ? (
          <EmptyState icon={Star} text="Aucune évaluation disponible : elle se construit automatiquement à partir des commandes réceptionnées." />
        ) : (
          <table className={tableCls}>
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className={thCls}>Fournisseur</th>
                <th className={thCls}>Note</th>
                <th className={thCls}>Ponctualité</th>
                <th className={thCls}>Quantité</th>
                <th className={thCls}>Qualité</th>
                <th className={thCls}>Délai réel / annoncé</th>
                <th className={thCls}>Commandes</th>
                <th className={thCls}>Achats cumulés</th>
                <th className={thCls}>Dernière commande</th>
              </tr>
            </thead>
            <tbody>
              {evaluations.map(evaluation => (
                <tr key={evaluation.supplierId}>
                  <td className={tdCls}>
                    <div className="font-semibold text-slate-800 dark:text-slate-100">{evaluation.supplierName}</div>
                    <div className="text-[10px] text-slate-400">{evaluation.receiptsCount} réception(s)</div>
                  </td>
                  <td className={tdCls}>
                    <div className="flex items-center gap-1.5">
                      <Chip tone={gradeTone(evaluation.grade)}>{evaluation.grade}</Chip>
                      <span className="font-bold">{numberFormat(evaluation.overallScore)}</span>
                      <span className="text-slate-400">/100</span>
                    </div>
                  </td>
                  {[
                    { value: evaluation.onTimeRate, label: '%' },
                    { value: evaluation.quantityComplianceRate, label: '%' },
                    { value: evaluation.qualityComplianceRate, label: '%' },
                  ].map((metric, index) => (
                    <td key={index} className={tdCls}>
                      <div className="flex items-center gap-1.5">
                        <div className="w-16 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              metric.value >= 90 ? 'bg-emerald-500' : metric.value >= 70 ? 'bg-amber-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(0, metric.value))}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-semibold">{numberFormat(metric.value)} %</span>
                      </div>
                    </td>
                  ))}
                  <td className={tdCls}>
                    {numberFormat(evaluation.averageLeadTimeDays)} j /{' '}
                    <span className="text-slate-400">{numberFormat(evaluation.averagePromisedLeadTimeDays)} j</span>
                  </td>
                  <td className={tdCls}>{evaluation.ordersCount}</td>
                  <td className={`${tdCls} font-semibold`}>{money(evaluation.totalPurchasedDzd)}</td>
                  <td className={tdCls}>{formatDate(evaluation.lastOrderDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════
// 13. CONTRATS & TARIFS
// ══════════════════════════════════════════════════════════════════════════

const ContractsSection: React.FC<{ currentUser: User }> = ({ currentUser }) => {
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [statusFor, setStatusFor] = useState<SupplierContract | null>(null);
  const [newStatus, setNewStatus] = useState<SupplierContractStatus>('SUSPENDU');
  const [statusReason, setStatusReason] = useState('');

  const contracts = storage.getSupplierContracts();
  const expiring = storage.getExpiringContracts(60);
  const suppliers = storage.getSuppliers(false);

  const [form, setForm] = useState({
    reference: '',
    supplierId: '',
    object: '',
    startDate: todayIso(),
    endDate: '',
    amountDzd: '',
    paymentTermsDays: '',
    notes: '',
  });

  const handleCreate = () => {
    try {
      const contract = storage.addSupplierContract({
        reference: form.reference,
        supplierId: form.supplierId,
        object: form.object,
        startDate: form.startDate,
        endDate: form.endDate,
        amountDzd: form.amountDzd ? Number(form.amountDzd) : undefined,
        paymentTermsDays: form.paymentTermsDays ? Number(form.paymentTermsDays) : undefined,
        currency: storage.getProcurementSettings().currency,
        notes: form.notes.trim() || undefined,
        supplierName: '',
      });
      setNotice(`Contrat ${contract.reference} enregistré.`);
      setCreateOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Création du contrat impossible.');
    }
  };

  return (
    <div className="space-y-3">
      <Banner error={error} notice={notice} onClose={() => { setError(''); setNotice(''); }} />

      <SectionHeader
        icon={FileText}
        title="Contrats & accords-cadres"
        description="Archivage des contrats fournisseurs, échéances de validité et conditions commerciales négociées."
        actions={
          <button
            type="button"
            disabled={!storage.canProcurement('SUPPLIER_MANAGE', currentUser)}
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Nouveau contrat
          </button>
        }
      />

      {expiring.length > 0 && (
        <div className="px-4 py-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {expiring.length} contrat(s) arrivent à échéance dans les 60 jours :{' '}
          {expiring.map(contract => `${contract.reference} (${formatDate(contract.endDate)})`).join(', ')}.
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
        {contracts.length === 0 ? (
          <EmptyState icon={FileText} text="Aucun contrat enregistré. Archivez ici les accords-cadres et conditions tarifaires négociées." />
        ) : (
          <table className={tableCls}>
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className={thCls}>Référence</th>
                <th className={thCls}>Fournisseur</th>
                <th className={thCls}>Objet</th>
                <th className={thCls}>Validité</th>
                <th className={thCls}>Montant</th>
                <th className={thCls}>Statut</th>
                <th className={thCls}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {contracts.map(contract => {
                const daysLeft = daysBetween(todayIso(), contract.endDate);
                return (
                  <tr key={contract.id}>
                    <td className={`${tdCls} font-semibold`}>{contract.reference}</td>
                    <td className={tdCls}>{contract.supplierName}</td>
                    <td className={tdCls}>{contract.object}</td>
                    <td className={tdCls}>
                      {formatDate(contract.startDate)} → {formatDate(contract.endDate)}
                      {contract.status === 'ACTIF' && daysLeft >= 0 && daysLeft <= 60 && (
                        <div className="text-[10px] text-amber-600">échéance dans {daysLeft} j</div>
                      )}
                    </td>
                    <td className={tdCls}>{contract.amountDzd ? money(contract.amountDzd) : '—'}</td>
                    <td className={tdCls}>
                      <Chip
                        tone={
                          contract.status === 'ACTIF'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : contract.status === 'EXPIRE'
                              ? 'bg-slate-100 text-slate-600 border-slate-300'
                              : 'bg-red-50 text-red-700 border-red-200'
                        }
                      >
                        {SUPPLIER_CONTRACT_STATUS_LABELS[contract.status]}
                      </Chip>
                    </td>
                    <td className={tdCls}>
                      {storage.canProcurement('SUPPLIER_MANAGE', currentUser) && (
                        <button
                          type="button"
                          onClick={() => {
                            setStatusFor(contract);
                            setNewStatus(contract.status === 'ACTIF' ? 'SUSPENDU' : 'ACTIF');
                            setStatusReason('');
                          }}
                          className="px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-[10px] font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          Statut
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Nouveau contrat fournisseur" maxWidth="2xl">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Référence</label>
              <input className={inputCls} value={form.reference} onChange={e => setForm(p => ({ ...p, reference: e.target.value }))} />
            </div>
            <div>
              <label className={labelCls}>Fournisseur</label>
              <select className={inputCls} value={form.supplierId} onChange={e => setForm(p => ({ ...p, supplierId: e.target.value }))}>
                <option value="">— Sélectionner —</option>
                {suppliers.map(supplier => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className={labelCls}>Objet du contrat</label>
            <input className={inputCls} value={form.object} onChange={e => setForm(p => ({ ...p, object: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Début</label>
              <input type="date" className={inputCls} value={form.startDate} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))} />
            </div>
            <div>
              <label className={labelCls}>Fin</label>
              <input type="date" className={inputCls} value={form.endDate} onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))} />
            </div>
            <div>
              <label className={labelCls}>Montant (DZD)</label>
              <input className={inputCls} type="number" min={0} value={form.amountDzd} onChange={e => setForm(p => ({ ...p, amountDzd: e.target.value }))} />
            </div>
            <div>
              <label className={labelCls}>Paiement (jours)</label>
              <input className={inputCls} type="number" min={0} value={form.paymentTermsDays} onChange={e => setForm(p => ({ ...p, paymentTermsDays: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Notes</label>
            <textarea className={inputCls} rows={2} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setCreateOpen(false)} className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer">
              Annuler
            </button>
            <button type="button" onClick={handleCreate} className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-500 cursor-pointer">
              Enregistrer
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(statusFor)}
        onClose={() => setStatusFor(null)}
        title={`Statut du contrat ${statusFor?.reference || ''}`}
        subtitle="Tout changement de statut est motivé et audité."
        maxWidth="lg"
      >
        <div className="space-y-3">
          <div>
            <label className={labelCls}>Nouveau statut</label>
            <select className={inputCls} value={newStatus} onChange={e => setNewStatus(e.target.value as SupplierContractStatus)}>
              {(Object.keys(SUPPLIER_CONTRACT_STATUS_LABELS) as SupplierContractStatus[]).map(status => (
                <option key={status} value={status}>
                  {SUPPLIER_CONTRACT_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Motif</label>
            <textarea className={inputCls} rows={3} value={statusReason} onChange={e => setStatusReason(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setStatusFor(null)} className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer">
              Annuler
            </button>
            <button
              type="button"
              onClick={() => {
                if (!statusFor) return;
                try {
                  storage.updateSupplierContractStatus(statusFor.id, newStatus, statusReason);
                  setNotice(`Contrat ${statusFor.reference} : statut ${SUPPLIER_CONTRACT_STATUS_LABELS[newStatus]}.`);
                  setStatusFor(null);
                } catch (e) {
                  setError(e instanceof Error ? e.message : 'Changement de statut impossible.');
                }
              }}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-500 cursor-pointer"
            >
              Appliquer
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════
// 14. RAPPORTS & ANALYSES
// ══════════════════════════════════════════════════════════════════════════

const ReportsSection: React.FC = () => {
  const [year, setYear] = useState(new Date().getFullYear());
  const report = storage.getProcurementCycleReport(year);
  const years = Array.from({ length: 4 }, (_, index) => new Date().getFullYear() - index);

  const exportCsv = () => {
    downloadCsv(`rapport-approvisionnement-${year}.csv`, [
      ['Indicateur', 'Valeur'],
      ['Exercice', report.fiscalYear],
      ['Commandes', report.ordersCount],
      ['Réceptions', report.receiptsCount],
      ['Dépenses (DZD)', report.spentDzd],
      ['Commande moyenne (DZD)', report.averageOrderDzd],
      ['Commandes en retard', report.lateOrdersCount],
      ['Taux de service (%)', report.serviceRate],
      [],
      ['Mois', 'Commandes', 'Montant (DZD)'],
      ...report.byMonth.map(row => [row.month, row.ordersCount, row.amountDzd]),
      [],
      ['Fournisseur', 'Commandes', 'Montant (DZD)'],
      ...report.topSuppliers.map(row => [row.supplierName, row.ordersCount, row.amountDzd]),
      [],
      ['Catégorie d\'achat', 'Montant (DZD)'],
      ...report.byCategoryGroup.map(row => [row.label, row.amountDzd]),
    ]);
  };

  return (
    <div className="space-y-3">
      <SectionHeader
        icon={BarChart3}
        title="Rapports & analyses achats"
        description="Dépenses par période, fournisseur et catégorie d'achat, taux de service et retards constatés."
        actions={
          <div className="flex flex-nowrap items-center gap-2">
            <select className={`${inputCls} w-24`} value={year} onChange={e => setYear(Number(e.target.value))}>
              {years.map(value => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={exportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              CSV
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Imprimer
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Dépenses engagées', value: money(report.spentDzd), icon: Wallet, tone: 'text-blue-700 dark:text-blue-300' },
          { label: 'Commandes émises', value: String(report.ordersCount), icon: ShoppingCart, tone: 'text-slate-800 dark:text-slate-100' },
          { label: 'Taux de service', value: `${numberFormat(report.serviceRate)} %`, icon: Gauge, tone: 'text-emerald-700 dark:text-emerald-300' },
          { label: 'Commandes en retard', value: String(report.lateOrdersCount), icon: AlertTriangle, tone: 'text-red-600' },
        ].map(stat => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">{stat.label}</span>
                <Icon className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <div className={`text-lg font-bold mt-1 ${stat.tone}`}>{stat.value}</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3">
          <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-2">Dépenses mensuelles</h4>
          <table className={tableCls}>
            <thead>
              <tr>
                <th className={thCls}>Mois</th>
                <th className={thCls}>Commandes</th>
                <th className={thCls}>Montant</th>
                <th className={thCls}>Poids</th>
              </tr>
            </thead>
            <tbody>
              {report.byMonth.map(row => {
                const max = Math.max(1, ...report.byMonth.map(item => item.amountDzd));
                return (
                  <tr key={row.month}>
                    <td className={tdCls}>{row.month}</td>
                    <td className={tdCls}>{row.ordersCount}</td>
                    <td className={tdCls}>{row.amountDzd > 0 ? money(row.amountDzd) : '—'}</td>
                    <td className={tdCls}>
                      <div className="h-1.5 w-24 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div className="h-full rounded-full bg-blue-500" style={{ width: `${(row.amountDzd / max) * 100}%` }} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="space-y-3">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-2">Top fournisseurs</h4>
            {report.topSuppliers.length === 0 ? (
              <p className="text-[11px] text-slate-500 py-4 text-center">Aucune commande sur l'exercice.</p>
            ) : (
              <table className={tableCls}>
                <thead>
                  <tr>
                    <th className={thCls}>Fournisseur</th>
                    <th className={thCls}>Cmd</th>
                    <th className={thCls}>Montant</th>
                  </tr>
                </thead>
                <tbody>
                  {report.topSuppliers.map(row => (
                    <tr key={row.supplierId}>
                      <td className={tdCls}>{row.supplierName}</td>
                      <td className={tdCls}>{row.ordersCount}</td>
                      <td className={`${tdCls} font-semibold`}>{money(row.amountDzd)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-2">Dépenses par catégorie d'achat</h4>
            {report.byCategoryGroup.length === 0 ? (
              <p className="text-[11px] text-slate-500 py-4 text-center">Aucune donnée.</p>
            ) : (
              <div className="space-y-1.5">
                {report.byCategoryGroup.map(row => {
                  const max = Math.max(1, ...report.byCategoryGroup.map(item => item.amountDzd));
                  return (
                    <div key={row.group}>
                      <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300">
                        <span>{row.label}</span>
                        <span className="font-semibold">{money(row.amountDzd)}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div className="h-full rounded-full bg-indigo-500" style={{ width: `${(row.amountDzd / max) * 100}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3">
        <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-2">Paramètres appliqués au calcul</h4>
        <div className="flex flex-wrap gap-4 text-[11px] text-slate-600 dark:text-slate-300">
          <span>
            Devise : <strong>{report.settings.currency}</strong>
          </span>
          <span>
            Stock cible : <strong>×{report.settings.targetStockMultiplier}</strong> du minimum
          </span>
          <span>
            Tolérance de réception : <strong>{report.settings.maxOverReceptionPercent} %</strong>
          </span>
          <span>
            Circuit de validation : <strong>{report.settings.approvalSteps.length} niveaux</strong>
          </span>
        </div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════
// DISPATCHER
// ══════════════════════════════════════════════════════════════════════════

interface CycleSectionsProps {
  section: ProcurementSection;
  currentUser: User;
  onNavigate: (section: ProcurementSection) => void;
}

export const ProcurementCycleSections: React.FC<CycleSectionsProps> = ({
  section,
  currentUser,
  onNavigate,
}) => {
  // Abonnement au magasin de données : chaque mutation rafraîchit la section active.
  const [, setRevision] = useState(0);
  useEffect(() => storage.subscribe(() => setRevision(value => value + 1)), []);

  switch (section) {
    case 'CONSULTATIONS':
      return <ConsultationsSection currentUser={currentUser} onNavigate={onNavigate} />;
    case 'COMPARISON':
      return <ComparisonSection currentUser={currentUser} onNavigate={onNavigate} />;
    case 'ORDERS':
      return <OrdersSection currentUser={currentUser} onNavigate={onNavigate} />;
    case 'TRACKING':
      return <TrackingSection currentUser={currentUser} onNavigate={onNavigate} />;
    case 'RECEPTIONS':
      return <ReceiptsSection currentUser={currentUser} />;
    case 'EVALUATION':
      return <EvaluationSection />;
    case 'CONTRACTS':
      return <ContractsSection currentUser={currentUser} />;
    case 'REPORTS':
      return <ReportsSection />;
    default:
      return null;
  }
};
