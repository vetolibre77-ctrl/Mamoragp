/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * MAMORA GP — GDS : inventaires physiques et ajustements traçables.
 * Aucun solde n'est jamais corrigé sans mouvement AJUSTEMENT_INVENTAIRE.
 */

import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  ClipboardList,
  Plus,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { storage } from '../../../services/storage';
import {
  GdsScope,
  INVENTORY_STATUS_LABELS,
  INVENTORY_TYPE_LABELS,
  InventoryType,
  StockInventory,
  User,
} from '../../../types';
import { Modal } from '../../common/Modal';
import {
  EmptyState,
  GdsCard,
  Pill,
  QualityPill,
  btnDanger,
  btnGhost,
  btnPrimary,
  fmtDate,
  fmtDateTime,
  fmtQty,
  fmtQtyUnit,
  inputCls,
  labelCls,
  tdCls,
  thCls,
} from './GdsShared';

const statusTone = (status: StockInventory['status']) => {
  switch (status) {
    case 'VALIDE':
      return 'emerald';
    case 'ANNULE':
      return 'red';
    case 'EN_VALIDATION':
      return 'violet';
    case 'EN_COMPTAGE':
      return 'amber';
    default:
      return 'slate';
  }
};

export const GdsInventorySection: React.FC<{
  scope: GdsScope;
  currentUser: User;
  onNotice: (message: string) => void;
  onError: (message: string) => void;
}> = ({ scope, currentUser, onNotice, onError }) => {
  const [revision, setRevision] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [countTarget, setCountTarget] = useState<StockInventory | null>(null);
  const [counts, setCounts] = useState<Record<string, { counted: string; justification: string }>>({});
  const [cancelTarget, setCancelTarget] = useState<StockInventory | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [detail, setDetail] = useState<StockInventory | null>(null);

  const [form, setForm] = useState({
    type: 'MAGASIN' as InventoryType,
    warehouseId: '',
    locationId: '',
    itemId: '',
    lotId: '',
    notes: '',
  });

  const inventories = useMemo(
    () => storage.getInventories({ scope }),
    [scope, revision]
  );
  const warehouses = storage.getAccessibleWarehouses(currentUser);
  const items = storage.getGdsItems(scope);
  const locations = form.warehouseId ? storage.getWarehouseLocations(form.warehouseId) : [];
  const lots = useMemo(() => storage.getGdsLots(scope, { itemId: form.itemId || undefined }), [scope, form.itemId, revision]);

  const run = (label: string, fn: () => void) => {
    try {
      fn();
      onNotice(label);
      setRevision(value => value + 1);
    } catch (error) {
      onError(error instanceof Error ? error.message : String(error));
    }
  };

  const openCount = (inventory: StockInventory) => {
    setCountTarget(inventory);
    setCounts(
      Object.fromEntries(
        inventory.lines.map(line => [
          line.id,
          {
            counted: line.countedQty !== undefined ? String(line.countedQty) : '',
            justification: line.justification || '',
          },
        ])
      )
    );
  };

  const submitCount = () => {
    if (!countTarget) return;
    const payload = countTarget.lines
      .filter(line => counts[line.id]?.counted !== '')
      .map(line => ({
        lineId: line.id,
        countedQty: Number(counts[line.id]?.counted),
        justification: counts[line.id]?.justification,
      }));
    run(`Comptage enregistré pour ${countTarget.inventoryNumber}.`, () =>
      storage.recordInventoryCount(countTarget.id, payload)
    );
    setCountTarget(null);
  };

  const createInventory = () => {
    try {
      const inventory = storage.createInventory({
        scope,
        type: form.type,
        warehouseId: form.warehouseId || undefined,
        locationId: form.locationId || undefined,
        itemId: form.itemId || undefined,
        lotId: form.lotId || undefined,
        notes: form.notes || undefined,
      });
      onNotice(
        `Inventaire ${inventory.inventoryNumber} ouvert avec ${inventory.lines.length} ligne(s) théorique(s).`
      );
      setCreateOpen(false);
      setRevision(value => value + 1);
    } catch (error) {
      onError(error instanceof Error ? error.message : String(error));
    }
  };

  const totals = inventories.reduce(
    (acc, inventory) => {
      const gaps = inventory.lines.filter(line => (line.gapQty || 0) !== 0).length;
      acc.lines += inventory.lines.length;
      acc.gaps += gaps;
      if (inventory.status === 'EN_COMPTAGE' || inventory.status === 'EN_VALIDATION') acc.open += 1;
      return acc;
    },
    { lines: 0, gaps: 0, open: 0 }
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          <p className="text-[10px] font-semibold uppercase text-slate-500">Inventaires</p>
          <p className="text-lg font-bold">{inventories.length}</p>
        </div>
        <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          <p className="text-[10px] font-semibold uppercase text-slate-500">En cours</p>
          <p className="text-lg font-bold text-amber-600">{totals.open}</p>
        </div>
        <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          <p className="text-[10px] font-semibold uppercase text-slate-500">Lignes comptées</p>
          <p className="text-lg font-bold">{totals.lines}</p>
        </div>
        <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          <p className="text-[10px] font-semibold uppercase text-slate-500">Lignes en écart</p>
          <p className="text-lg font-bold text-red-600">{totals.gaps}</p>
        </div>
      </div>

      <GdsCard
        title={`Inventaires ${scope === 'MATIERES_PREMIERES' ? 'matières premières' : 'produits finis'}`}
        subtitle="Le stock théorique est figé à l'ouverture ; chaque écart validé génère un mouvement d'ajustement."
        actions={
          <button type="button" className={btnPrimary} onClick={() => setCreateOpen(true)}>
            <Plus className="w-3.5 h-3.5" />
            Nouvel inventaire
          </button>
        }
        bodyClassName="p-0"
      >
        {inventories.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="Aucun inventaire enregistré"
            hint="Choisissez un inventaire général, par magasin, par emplacement, par article, par lot ou tournant."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/60">
                <tr>
                  <th className={thCls}>N°</th>
                  <th className={thCls}>Type</th>
                  <th className={thCls}>Périmètre</th>
                  <th className={thCls}>Statut</th>
                  <th className={`${thCls} text-right`}>Lignes</th>
                  <th className={`${thCls} text-right`}>Écarts</th>
                  <th className={thCls}>Créé le</th>
                  <th className={thCls}>Validé le</th>
                  <th className={thCls} />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {inventories.map(inventory => {
                  const gaps = inventory.lines.filter(line => (line.gapQty || 0) !== 0).length;
                  const warehouse = inventory.warehouseId
                    ? storage.getWarehouse(inventory.warehouseId)
                    : undefined;
                  return (
                    <tr key={inventory.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className={`${tdCls} font-mono text-[10.5px] font-semibold`}>
                        {inventory.inventoryNumber}
                      </td>
                      <td className={tdCls}>{INVENTORY_TYPE_LABELS[inventory.type]}</td>
                      <td className={`${tdCls} text-slate-500`}>
                        {warehouse ? `${warehouse.code} — ${warehouse.designation}` : 'Tous magasins'}
                        {inventory.locationId && (
                          <span className="block text-[10px]">
                            {storage.getWarehouseLocation(inventory.locationId)?.code}
                          </span>
                        )}
                        {inventory.itemId && (
                          <span className="block text-[10px] font-mono">
                            {storage.getItemById(inventory.itemId)?.code}
                          </span>
                        )}
                      </td>
                      <td className={tdCls}>
                        <Pill tone={statusTone(inventory.status)}>
                          {INVENTORY_STATUS_LABELS[inventory.status]}
                        </Pill>
                      </td>
                      <td className={`${tdCls} text-right font-mono`}>{inventory.lines.length}</td>
                      <td
                        className={`${tdCls} text-right font-mono ${
                          gaps > 0 ? 'text-red-600 font-semibold' : 'text-slate-400'
                        }`}
                      >
                        {gaps}
                      </td>
                      <td className={`${tdCls} text-slate-500`}>{fmtDateTime(inventory.createdAt)}</td>
                      <td className={`${tdCls} text-slate-500`}>{fmtDateTime(inventory.validatedAt)}</td>
                      <td className={`${tdCls} text-right whitespace-nowrap`}>
                        <button
                          type="button"
                          className="text-[10px] font-semibold text-blue-600 hover:underline cursor-pointer"
                          onClick={() => setDetail(inventory)}
                        >
                          Détail
                        </button>
                        {inventory.status === 'EN_COMPTAGE' && (
                          <button
                            type="button"
                            className="ml-2 text-[10px] font-semibold text-violet-600 hover:underline cursor-pointer"
                            onClick={() => openCount(inventory)}
                          >
                            Compter
                          </button>
                        )}
                        {inventory.status === 'EN_COMPTAGE' && (
                          <button
                            type="button"
                            className="ml-2 text-[10px] font-semibold text-indigo-600 hover:underline cursor-pointer"
                            onClick={() =>
                              run(`Inventaire ${inventory.inventoryNumber} soumis.`, () =>
                                storage.submitInventory(inventory.id)
                              )
                            }
                          >
                            Soumettre
                          </button>
                        )}
                        {inventory.status === 'EN_VALIDATION' && (
                          <button
                            type="button"
                            className="ml-2 text-[10px] font-semibold text-emerald-600 hover:underline cursor-pointer"
                            onClick={() =>
                              run(`Inventaire ${inventory.inventoryNumber} validé.`, () =>
                                storage.validateInventory(inventory.id)
                              )
                            }
                          >
                            Valider
                          </button>
                        )}
                        {inventory.status !== 'VALIDE' && inventory.status !== 'ANNULE' && (
                          <button
                            type="button"
                            className="ml-2 text-[10px] font-semibold text-red-600 hover:underline cursor-pointer"
                            onClick={() => {
                              setCancelTarget(inventory);
                              setCancelReason('');
                            }}
                          >
                            Annuler
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </GdsCard>

      <p className="text-[10.5px] text-slate-500 px-1">
        Les écarts exigent une justification et une validation par un profil habilité aux
        régularisations. Le stock physique est corrigé uniquement par un mouvement
        AJUSTEMENT_INVENTAIRE horodaté et attribué.
      </p>

      {createOpen && (
        <Modal
          isOpen
          onClose={() => setCreateOpen(false)}
          title="Ouvrir un inventaire"
          subtitle="Le stock théorique est figé au moment de l'ouverture."
          maxWidth="lg"
        >
          <div className="space-y-3">
            <div>
              <label className={labelCls}>Type d'inventaire *</label>
              <select
                className={`${inputCls} w-full`}
                value={form.type}
                onChange={event =>
                  setForm({ ...form, type: event.target.value as InventoryType })
                }
              >
                {(Object.keys(INVENTORY_TYPE_LABELS) as InventoryType[]).map(type => (
                  <option key={type} value={type}>
                    {INVENTORY_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </div>
            {['MAGASIN', 'EMPLACEMENT', 'TOURNANT'].includes(form.type) && (
              <div>
                <label className={labelCls}>Magasin</label>
                <select
                  className={`${inputCls} w-full`}
                  value={form.warehouseId}
                  onChange={event =>
                    setForm({ ...form, warehouseId: event.target.value, locationId: '' })
                  }
                >
                  <option value="">Sélectionner…</option>
                  {warehouses.map(warehouse => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.code} — {warehouse.designation}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {form.type === 'EMPLACEMENT' && (
              <div>
                <label className={labelCls}>Emplacement</label>
                <select
                  className={`${inputCls} w-full`}
                  value={form.locationId}
                  onChange={event => setForm({ ...form, locationId: event.target.value })}
                >
                  <option value="">Sélectionner…</option>
                  {locations.map(location => (
                    <option key={location.id} value={location.id}>
                      {location.code} — {location.designation}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {['ARTICLE', 'LOT', 'TOURNANT'].includes(form.type) && (
              <div>
                <label className={labelCls}>Article</label>
                <select
                  className={`${inputCls} w-full`}
                  value={form.itemId}
                  onChange={event =>
                    setForm({ ...form, itemId: event.target.value, lotId: '' })
                  }
                >
                  <option value="">Tous les articles</option>
                  {items.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.code} — {item.designation}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {form.type === 'LOT' && (
              <div>
                <label className={labelCls}>Lot</label>
                <select
                  className={`${inputCls} w-full`}
                  value={form.lotId}
                  onChange={event => setForm({ ...form, lotId: event.target.value })}
                >
                  <option value="">Sélectionner…</option>
                  {lots.map(lot => (
                    <option key={lot.lotId} value={lot.lotId}>
                      {lot.lotNumber} — {lot.itemCode} ({fmtQty(lot.remainingQty)})
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className={labelCls}>Notes</label>
              <textarea
                className={`${inputCls} w-full h-16`}
                value={form.notes}
                onChange={event => setForm({ ...form, notes: event.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" className={btnGhost} onClick={() => setCreateOpen(false)}>
                Annuler
              </button>
              <button type="button" className={btnPrimary} onClick={createInventory}>
                <Plus className="w-3.5 h-3.5" />
                Ouvrir l'inventaire
              </button>
            </div>
          </div>
        </Modal>
      )}

      {countTarget && (
        <Modal
          isOpen
          onClose={() => setCountTarget(null)}
          title={`Comptage ${countTarget.inventoryNumber}`}
          subtitle="L'écart est calculé automatiquement. Une justification est obligatoire dès qu'un écart existe."
          maxWidth="4xl"
        >
          <div className="space-y-3">
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/60 sticky top-0">
                  <tr>
                    <th className={thCls}>Article / lot</th>
                    <th className={thCls}>Emplacement</th>
                    <th className={thCls}>Qualité</th>
                    <th className={`${thCls} text-right`}>Théorique</th>
                    <th className={`${thCls} text-right w-28`}>Compté</th>
                    <th className={`${thCls} text-right`}>Écart</th>
                    <th className={thCls}>Justification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {countTarget.lines.map(line => {
                    const raw = counts[line.id]?.counted ?? '';
                    const gap = raw === '' ? undefined : Number(raw) - line.theoreticalQty;
                    return (
                      <tr key={line.id}>
                        <td className={`${tdCls} text-[10.5px]`}>
                          <span className="font-mono text-[10px] text-slate-500">{line.itemCode}</span>{' '}
                          {line.designation}
                          <span className="block font-mono text-[10px] text-slate-400">
                            {line.lotNumber}
                          </span>
                        </td>
                        <td className={`${tdCls} text-[10px] font-mono text-slate-500`}>
                          {line.warehouseCode}/{line.locationCode}
                        </td>
                        <td className={tdCls}>
                          <QualityPill status={line.qualityStatus} />
                        </td>
                        <td className={`${tdCls} text-right font-mono`}>
                          {fmtQtyUnit(line.theoreticalQty, line.unit)}
                        </td>
                        <td className={tdCls}>
                          <input
                            type="number"
                            min={0}
                            step="any"
                            className={`${inputCls} w-full text-right`}
                            value={raw}
                            onChange={event =>
                              setCounts(prev => ({
                                ...prev,
                                [line.id]: {
                                  counted: event.target.value,
                                  justification: prev[line.id]?.justification || '',
                                },
                              }))
                            }
                          />
                        </td>
                        <td
                          className={`${tdCls} text-right font-mono ${
                            gap === undefined
                              ? 'text-slate-300'
                              : gap === 0
                                ? 'text-emerald-600'
                                : 'text-red-600 font-semibold'
                          }`}
                        >
                          {gap === undefined ? '—' : `${gap > 0 ? '+' : ''}${fmtQty(gap, 2)}`}
                        </td>
                        <td className={tdCls}>
                          <input
                            className={`${inputCls} w-full`}
                            value={counts[line.id]?.justification || ''}
                            onChange={event =>
                              setCounts(prev => ({
                                ...prev,
                                [line.id]: {
                                  counted: prev[line.id]?.counted || '',
                                  justification: event.target.value,
                                },
                              }))
                            }
                            placeholder={gap ? 'Obligatoire' : '—'}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" className={btnGhost} onClick={() => setCountTarget(null)}>
                Annuler
              </button>
              <button type="button" className={btnPrimary} onClick={submitCount}>
                <CheckCircle2 className="w-3.5 h-3.5" />
                Enregistrer le comptage
              </button>
            </div>
          </div>
        </Modal>
      )}

      {detail && (
        <Modal
          isOpen
          onClose={() => setDetail(null)}
          title={`Inventaire ${detail.inventoryNumber}`}
          subtitle={`${INVENTORY_TYPE_LABELS[detail.type]} — ${INVENTORY_STATUS_LABELS[detail.status]}`}
          maxWidth="4xl"
        >
          <div className="space-y-3">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 text-[11px]">
              <div>
                <span className="text-slate-500">Créé par : </span>
                {detail.createdBy}
              </div>
              <div>
                <span className="text-slate-500">Créé le : </span>
                {fmtDateTime(detail.createdAt)}
              </div>
              <div>
                <span className="text-slate-500">Validé par : </span>
                {detail.validatedBy || '—'}
              </div>
              <div>
                <span className="text-slate-500">Validé le : </span>
                {fmtDateTime(detail.validatedAt)}
              </div>
            </div>
            <div className="max-h-80 overflow-y-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/60 sticky top-0">
                  <tr>
                    <th className={thCls}>Article / lot</th>
                    <th className={thCls}>Emplacement</th>
                    <th className={`${thCls} text-right`}>Théorique</th>
                    <th className={`${thCls} text-right`}>Compté</th>
                    <th className={`${thCls} text-right`}>Écart</th>
                    <th className={thCls}>Justification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {detail.lines.map(line => (
                    <tr key={line.id}>
                      <td className={`${tdCls} text-[10.5px]`}>
                        <span className="font-mono text-[10px] text-slate-500">{line.itemCode}</span>{' '}
                        {line.designation}
                        <span className="block font-mono text-[10px] text-slate-400">
                          {line.lotNumber}
                        </span>
                      </td>
                      <td className={`${tdCls} text-[10px] font-mono text-slate-500`}>
                        {line.warehouseCode}/{line.locationCode}
                      </td>
                      <td className={`${tdCls} text-right font-mono`}>
                        {fmtQtyUnit(line.theoreticalQty, line.unit)}
                      </td>
                      <td className={`${tdCls} text-right font-mono`}>
                        {line.countedQty !== undefined ? fmtQty(line.countedQty) : '—'}
                      </td>
                      <td
                        className={`${tdCls} text-right font-mono font-semibold ${
                          (line.gapQty || 0) === 0 ? 'text-slate-400' : 'text-red-600'
                        }`}
                      >
                        {line.gapQty === undefined ? '—' : fmtQty(line.gapQty, 2)}
                      </td>
                      <td className={`${tdCls} text-[10.5px] text-slate-500`}>
                        {line.justification || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {detail.notes && (
              <p className="text-[11px] text-slate-500 whitespace-pre-line">{detail.notes}</p>
            )}
            {detail.cancelReason && (
              <p className="text-[11px] text-red-600">Annulation : {detail.cancelReason}</p>
            )}
            <div className="flex justify-end">
              <button type="button" className={btnGhost} onClick={() => setDetail(null)}>
                Fermer
              </button>
            </div>
          </div>
        </Modal>
      )}

      {cancelTarget && (
        <Modal
          isOpen
          onClose={() => setCancelTarget(null)}
          title={`Annuler ${cancelTarget.inventoryNumber}`}
          maxWidth="md"
        >
          <div className="space-y-3">
            <label className={labelCls}>Motif d'annulation *</label>
            <textarea
              className={`${inputCls} w-full h-20`}
              value={cancelReason}
              onChange={event => setCancelReason(event.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button type="button" className={btnGhost} onClick={() => setCancelTarget(null)}>
                Retour
              </button>
              <button
                type="button"
                className={btnDanger}
                disabled={!cancelReason.trim()}
                onClick={() => {
                  run(`Inventaire ${cancelTarget.inventoryNumber} annulé.`, () =>
                    storage.cancelInventory(cancelTarget.id, cancelReason)
                  );
                  setCancelTarget(null);
                }}
              >
                <XCircle className="w-3.5 h-3.5" />
                Confirmer
              </button>
            </div>
          </div>
        </Modal>
      )}

      <div className="flex items-center gap-2 text-[10px] text-slate-500 px-1">
        <ShieldCheck className="w-3.5 h-3.5" />
        Profil connecté : {currentUser.name} — les régularisations requièrent l'habilitation
        « Valider les ajustements ».
      </div>
    </div>
  );
};

export const InventoryHelpers = { statusTone, fmtDate };
