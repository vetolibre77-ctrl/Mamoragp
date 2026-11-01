/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * MAMORA GP — GDS : historique des mouvements (grand livre unique).
 */

import React, { useMemo, useState } from 'react';
import { Download, History, Printer } from 'lucide-react';
import { storage } from '../../../services/storage';
import { GdsScope, StockMovementType, User } from '../../../types';
import {
  EmptyState,
  GdsCard,
  Pill,
  SearchField,
  btnGhost,
  downloadCsv,
  fmtDateTime,
  fmtQty,
  inputCls,
  labelCls,
  tdCls,
  thCls,
} from './GdsShared';

const MOVEMENT_LABELS: Record<StockMovementType, string> = {
  ENTREE_RECEPTION: 'Entrée réception',
  CONSOMMATION_OF: 'Consommation OF',
  SORTIE_VENTE: 'Sortie vente',
  REBUT_DEFECTUEUX: 'Rebut / défaut',
  RETOUR_STOCK: 'Retour stock',
  AJUSTEMENT_INVENTAIRE: 'Ajustement inventaire',
  TRANSFERT_SORTIE: 'Transfert — sortie',
  TRANSFERT_ENTREE: 'Transfert — entrée',
  RETOUR_MAGASIN: 'Retour magasin',
  RECEPTION_PRODUCTION: 'Réception production',
  MISE_EN_QUARANTAINE: 'Mise en quarantaine',
  CHANGEMENT_STATUT_QUALITE: 'Changement statut qualité',
  REGULARISATION_TRANSFERT: 'Régularisation transfert',
  SORTIE_PRODUIT_FINI: 'Sortie produit fini',
};

export const GdsHistorySection: React.FC<{ scope: GdsScope; currentUser: User }> = ({
  scope,
  currentUser,
}) => {
  const [search, setSearch] = useState('');
  const [type, setType] = useState<'ALL' | StockMovementType>('ALL');
  const [warehouseId, setWarehouseId] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [limit, setLimit] = useState(100);

  const warehouses = storage.getAccessibleWarehouses(currentUser);

  const movements = useMemo(
    () =>
      storage.getGdsMovements({
        scope,
        search,
        type: type === 'ALL' ? undefined : type,
        warehouseId: warehouseId === 'ALL' ? undefined : warehouseId,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      }),
    [scope, search, type, warehouseId, dateFrom, dateTo]
  );

  const visible = movements.slice(0, limit);

  const exportCsv = () => {
    downloadCsv(
      `gds-mouvements-${scope === 'MATIERES_PREMIERES' ? 'mp' : 'pf'}-${new Date()
        .toISOString()
        .slice(0, 10)}.csv`,
      [
        ['Date', 'Type', 'Document', 'Article', 'Désignation', 'Lot', 'Magasin source', 'Magasin destination', 'Quantité', 'Effet', 'Utilisateur', 'Motif'],
        ...movements.map(movement => [
          movement.timestamp,
          MOVEMENT_LABELS[movement.type] || movement.type,
          movement.documentNumber || '',
          movement.itemCode,
          storage.getItemById(movement.itemId)?.designation || '',
          movement.batchNumber,
          movement.sourceWarehouseId || '',
          movement.destinationWarehouseId || '',
          movement.quantity,
          movement.stockDelta || 0,
          movement.userName || '',
          movement.reason || '',
        ]),
      ]
    );
  };

  return (
    <div className="space-y-4">
      <GdsCard
        title={`Historique des mouvements — ${
          scope === 'MATIERES_PREMIERES' ? 'matières premières' : 'produits finis'
        }`}
        subtitle="Grand livre unique : aucune écriture n'est supprimée, chaque ligne est horodatée et attribuée."
        actions={
          <>
            <button type="button" className={btnGhost} onClick={exportCsv}>
              <Download className="w-3.5 h-3.5" />
              CSV
            </button>
            <button type="button" className={btnGhost} onClick={() => window.print()}>
              <Printer className="w-3.5 h-3.5" />
              Imprimer
            </button>
          </>
        }
        bodyClassName="p-0"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-2 p-3 border-b border-slate-100 dark:border-slate-800">
          <div className="lg:col-span-2">
            <label className={labelCls}>Recherche</label>
            <SearchField
              value={search}
              onChange={setSearch}
              placeholder="Article, lot, document, utilisateur…"
            />
          </div>
          <div>
            <label className={labelCls}>Type</label>
            <select
              className={`${inputCls} w-full`}
              value={type}
              onChange={event => setType(event.target.value as 'ALL' | StockMovementType)}
            >
              <option value="ALL">Tous les types</option>
              {(Object.keys(MOVEMENT_LABELS) as StockMovementType[]).map(key => (
                <option key={key} value={key}>
                  {MOVEMENT_LABELS[key]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Magasin</label>
            <select
              className={`${inputCls} w-full`}
              value={warehouseId}
              onChange={event => setWarehouseId(event.target.value)}
            >
              <option value="ALL">Tous</option>
              {warehouses.map(warehouse => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.code}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Du</label>
            <input
              type="date"
              className={`${inputCls} w-full`}
              value={dateFrom}
              onChange={event => setDateFrom(event.target.value)}
            />
          </div>
          <div>
            <label className={labelCls}>Au</label>
            <input
              type="date"
              className={`${inputCls} w-full`}
              value={dateTo}
              onChange={event => setDateTo(event.target.value)}
            />
          </div>
        </div>

        {movements.length === 0 ? (
          <EmptyState
            icon={History}
            title="Aucun mouvement pour ces critères"
            hint="Les mouvements apparaissent dès la première réception, dotation, consommation, sortie ou régularisation."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/60">
                  <tr>
                    <th className={thCls}>Date</th>
                    <th className={thCls}>Type</th>
                    <th className={thCls}>Document</th>
                    <th className={thCls}>Article</th>
                    <th className={thCls}>Lot</th>
                    <th className={thCls}>Source → Destination</th>
                    <th className={`${thCls} text-right`}>Quantité</th>
                    <th className={`${thCls} text-right`}>Effet</th>
                    <th className={thCls}>Utilisateur</th>
                    <th className={thCls}>Motif</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {visible.map(movement => {
                    const delta = movement.stockDelta || 0;
                    return (
                      <tr key={movement.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                        <td className={`${tdCls} whitespace-nowrap`}>{fmtDateTime(movement.timestamp)}</td>
                        <td className={tdCls}>
                          <Pill
                            tone={
                              delta > 0
                                ? 'emerald'
                                : delta < 0
                                  ? 'orange'
                                  : movement.type === 'MISE_EN_QUARANTAINE' ||
                                      movement.type === 'CHANGEMENT_STATUT_QUALITE'
                                    ? 'violet'
                                    : 'slate'
                            }
                          >
                            {MOVEMENT_LABELS[movement.type] || movement.type}
                          </Pill>
                        </td>
                        <td className={`${tdCls} font-mono text-[10px]`}>
                          {movement.documentNumber || '—'}
                        </td>
                        <td className={tdCls}>
                          <span className="font-mono text-[10px] text-slate-500">
                            {movement.itemCode}
                          </span>
                          <span className="block text-[10.5px]">
                            {storage.getItemById(movement.itemId)?.designation || '—'}
                          </span>
                        </td>
                        <td className={`${tdCls} font-mono text-[10px]`}>{movement.batchNumber}</td>
                        <td className={`${tdCls} text-[10px] text-slate-500`}>
                          {storage.getWarehouse(movement.sourceWarehouseId || '')?.code || '—'} →{' '}
                          {storage.getWarehouse(movement.destinationWarehouseId || '')?.code || '—'}
                        </td>
                        <td className={`${tdCls} text-right font-mono`}>{fmtQty(movement.quantity)}</td>
                        <td
                          className={`${tdCls} text-right font-mono font-semibold ${
                            delta > 0
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : delta < 0
                                ? 'text-red-600'
                                : 'text-slate-400'
                          }`}
                        >
                          {delta > 0 ? '+' : ''}
                          {fmtQty(delta)}
                        </td>
                        <td className={`${tdCls} text-[10.5px] text-slate-500`}>
                          {movement.userName || '—'}
                        </td>
                        <td className={`${tdCls} text-[10px] text-slate-500 max-w-56 truncate`} title={movement.reason}>
                          {movement.reason || '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between gap-2 px-3 py-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[10.5px] text-slate-500">
                {visible.length} / {movements.length} mouvement(s) affiché(s)
              </span>
              {visible.length < movements.length && (
                <button
                  type="button"
                  className={btnGhost}
                  onClick={() => setLimit(value => value + 100)}
                >
                  Afficher 100 de plus
                </button>
              )}
            </div>
          </>
        )}
      </GdsCard>
    </div>
  );
};
