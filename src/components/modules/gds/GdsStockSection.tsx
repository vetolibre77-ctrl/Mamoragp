/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * MAMORA GP — GDS : état des stocks (matières premières ou produits finis).
 * Les quantités proviennent exclusivement du moteur de stock multi-magasins.
 */

import React, { useMemo, useState } from 'react';
import {
  Boxes,
  ChevronDown,
  ChevronRight,
  Download,
  Layers,
  PackageSearch,
  Warehouse as WarehouseIcon,
} from 'lucide-react';
import { storage } from '../../../services/storage';
import {
  GdsScope,
  ItemCategoryGroup,
  ITEM_CATEGORY_GROUP_LABELS,
  User,
  Warehouse,
} from '../../../types';
import {
  Bar,
  EmptyState,
  GdsCard,
  Kpi,
  Pill,
  QualityPill,
  SearchField,
  btnGhost,
  cardCls,
  downloadCsv,
  fmtQty,
  fmtQtyUnit,
  inputCls,
  tdCls,
  thCls,
  unitShort,
} from './GdsShared';

interface GdsStockSectionProps {
  scope: GdsScope;
  currentUser: User;
  onOpenTrace: (lotNumber: string) => void;
}

export const GdsStockSection: React.FC<GdsStockSectionProps> = ({
  scope,
  currentUser,
  onOpenTrace,
}) => {
  const [search, setSearch] = useState('');
  const [group, setGroup] = useState<'ALL' | ItemCategoryGroup>('ALL');
  const [warehouseId, setWarehouseId] = useState<'ALL' | string>('ALL');
  const [onlyActive, setOnlyActive] = useState(false);
  const [onlyBelowMin, setOnlyBelowMin] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const warehouses: Warehouse[] = storage.getAccessibleWarehouses(currentUser);

  const rows = useMemo(
    () =>
      storage.getGdsStock(scope, {
        search,
        group: group === 'ALL' ? undefined : group,
        warehouseId: warehouseId === 'ALL' ? undefined : warehouseId,
        onlyActive,
        onlyBelowMin,
      }),
    [scope, search, group, warehouseId, onlyActive, onlyBelowMin]
  );

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, row) => ({
          physical: acc.physical + row.physical,
          available: acc.available + row.available,
          reserved: acc.reserved + row.reserved,
          pending: acc.pending + row.pendingControl,
          quarantine: acc.quarantine + row.quarantine,
          blocked: acc.blocked + row.blocked,
          transit: acc.transit + row.transit,
        }),
        {
          physical: 0,
          available: 0,
          reserved: 0,
          pending: 0,
          quarantine: 0,
          blocked: 0,
          transit: 0,
        }
      ),
    [rows]
  );

  const lotsByItem = useMemo(() => {
    const map = new Map<string, ReturnType<typeof storage.getGdsLots>>();
    for (const row of rows) {
      map.set(
        row.itemId,
        storage.getGdsLots(scope, { itemId: row.itemId })
      );
    }
    return map;
  }, [rows, scope]);

  const exportCsv = () => {
    const header = [
      'Code',
      'Désignation',
      'Famille',
      'Unité',
      'Conditionnement',
      'Conversion',
      'Stock physique',
      'Stock disponible',
      'Stock réservé',
      'En attente contrôle',
      'Quarantaine',
      'Bloqué',
      'En transit',
      'Stock minimum',
      'Magasin / Emplacement',
    ];
    const body = rows.map(row => [
      row.itemCode,
      row.designation,
      ITEM_CATEGORY_GROUP_LABELS[row.group],
      unitShort(row.unit),
      row.packaging || '',
      row.conversionCoefficient ? `1 ${unitShort(row.secondaryUnit)} = ${row.conversionCoefficient} ${unitShort(row.unit)}` : '',
      row.physical,
      row.available,
      row.reserved,
      row.pendingControl,
      row.quarantine,
      row.blocked,
      row.transit,
      row.minStockLevel,
      row.warehouses.map(w => `${w.code}/${w.locationCode || '—'}`).join(' | '),
    ]);
    downloadCsv(
      `gds-stocks-${scope === 'MATIERES_PREMIERES' ? 'mp' : 'pf'}-${new Date()
        .toISOString()
        .slice(0, 10)}.csv`,
      [header, ...body]
    );
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-2.5">
        <Kpi label="Stock physique" value={fmtQty(totals.physical)} icon={Boxes} tone="text-slate-600" />
        <Kpi label="Disponible" value={fmtQty(totals.available)} icon={PackageSearch} tone="text-emerald-600" />
        <Kpi label="Réservé" value={fmtQty(totals.reserved)} icon={Layers} tone="text-indigo-600" />
        <Kpi label="Attente contrôle" value={fmtQty(totals.pending)} icon={Layers} tone="text-amber-600" />
        <Kpi label="Quarantaine" value={fmtQty(totals.quarantine)} icon={Layers} tone="text-orange-600" />
        <Kpi label="Bloqué / rejeté" value={fmtQty(totals.blocked)} icon={Layers} tone="text-red-600" />
        <Kpi label="En transit" value={fmtQty(totals.transit)} icon={WarehouseIcon} tone="text-violet-600" />
      </div>

      <GdsCard bodyClassName="p-0">
        <div className="flex flex-wrap items-center gap-2 p-3 border-b border-slate-100 dark:border-slate-800">
          <SearchField
            value={search}
            onChange={setSearch}
            placeholder="Code, désignation, conditionnement…"
            className="w-64"
          />
          <select
            className={inputCls}
            value={group}
            onChange={event => setGroup(event.target.value as 'ALL' | ItemCategoryGroup)}
            aria-label="Filtrer par famille"
          >
            <option value="ALL">Toutes les familles</option>
            {(Object.keys(ITEM_CATEGORY_GROUP_LABELS) as ItemCategoryGroup[]).map(key => (
              <option key={key} value={key}>
                {ITEM_CATEGORY_GROUP_LABELS[key]}
              </option>
            ))}
          </select>
          <select
            className={inputCls}
            value={warehouseId}
            onChange={event => setWarehouseId(event.target.value)}
            aria-label="Filtrer par magasin"
          >
            <option value="ALL">Tous les magasins</option>
            {warehouses.map(warehouse => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.code} — {warehouse.designation}
              </option>
            ))}
          </select>
          <label className="inline-flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={onlyActive}
              onChange={event => setOnlyActive(event.target.checked)}
              className="accent-blue-600"
            />
            Articles actifs
          </label>
          <label className="inline-flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={onlyBelowMin}
              onChange={event => setOnlyBelowMin(event.target.checked)}
              className="accent-blue-600"
            />
            Sous minimum
          </label>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-[11px] text-slate-500">{rows.length} article(s)</span>
            <button type="button" className={btnGhost} onClick={exportCsv}>
              <Download className="w-3.5 h-3.5" />
              CSV
            </button>
          </div>
        </div>

        {rows.length === 0 ? (
          <EmptyState
            icon={PackageSearch}
            title="Aucun article ne correspond aux critères"
            hint="Ajustez la recherche, la famille ou le magasin. Les articles sans stock restent affichés avec des quantités à zéro."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/60">
                <tr>
                  <th className={thCls} />
                  <th className={thCls}>Code</th>
                  <th className={thCls}>Désignation</th>
                  <th className={thCls}>Famille</th>
                  <th className={thCls}>Unité</th>
                  <th className={thCls}>Conditionnement</th>
                  <th className={`${thCls} text-right`}>Physique</th>
                  <th className={`${thCls} text-right`}>Disponible</th>
                  <th className={`${thCls} text-right`}>Réservé</th>
                  <th className={`${thCls} text-right`}>Attente</th>
                  <th className={`${thCls} text-right`}>Quarant.</th>
                  <th className={`${thCls} text-right`}>Bloqué</th>
                  <th className={`${thCls} text-right`}>Transit</th>
                  <th className={`${thCls} text-right`}>Min.</th>
                  <th className={thCls}>Magasin / Emplacement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {rows.map(row => {
                  const isOpen = expanded === row.itemId;
                  const belowMin = row.minStockLevel > 0 && row.available < row.minStockLevel;
                  return (
                    <React.Fragment key={row.itemId}>
                      <tr
                        className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 ${
                          isOpen ? 'bg-slate-50 dark:bg-slate-800/50' : ''
                        }`}
                      >
                        <td className={tdCls}>
                          <button
                            type="button"
                            onClick={() => setExpanded(isOpen ? null : row.itemId)}
                            aria-label={isOpen ? 'Réduire' : 'Détail magasins et lots'}
                            className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                          >
                            {isOpen ? (
                              <ChevronDown className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </td>
                        <td className={`${tdCls} font-mono text-[10.5px] font-semibold whitespace-nowrap`}>
                          {row.itemCode}
                        </td>
                        <td className={`${tdCls} max-w-[220px]`}>
                          <span className="font-medium block truncate" title={row.designation}>
                            {row.designation}
                          </span>
                          {!row.isActive && (
                            <span className="ml-1.5 text-[9.5px] font-semibold text-slate-400 uppercase">
                              inactif
                            </span>
                          )}
                        </td>
                        <td className={`${tdCls} text-slate-500 whitespace-nowrap`}>
                          {ITEM_CATEGORY_GROUP_LABELS[row.group]}
                        </td>
                        <td className={`${tdCls} whitespace-nowrap`}>{unitShort(row.unit)}</td>
                        <td className={`${tdCls} text-slate-500`}>
                          {row.packaging ? (
                            <span title={row.packaging}>
                              {row.packaging}
                              {row.conversionCoefficient && row.secondaryUnit ? (
                                <span className="block text-[9.5px] text-slate-400">
                                  1 {unitShort(row.secondaryUnit)} = {fmtQty(row.conversionCoefficient)}{' '}
                                  {unitShort(row.unit)}
                                </span>
                              ) : null}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className={`${tdCls} text-right font-mono`}>{fmtQty(row.physical)}</td>
                        <td className={`${tdCls} text-right font-mono font-semibold ${belowMin ? 'text-red-600' : 'text-emerald-700 dark:text-emerald-400'}`}>
                          {fmtQty(row.available)}
                        </td>
                        <td className={`${tdCls} text-right font-mono text-slate-500`}>{fmtQty(row.reserved)}</td>
                        <td className={`${tdCls} text-right font-mono text-amber-700 dark:text-amber-400`}>
                          {fmtQty(row.pendingControl)}
                        </td>
                        <td className={`${tdCls} text-right font-mono text-orange-700 dark:text-orange-400`}>
                          {fmtQty(row.quarantine)}
                        </td>
                        <td className={`${tdCls} text-right font-mono text-red-700 dark:text-red-400`}>
                          {fmtQty(row.blocked)}
                        </td>
                        <td className={`${tdCls} text-right font-mono text-violet-700 dark:text-violet-400`}>
                          {fmtQty(row.transit)}
                        </td>
                        <td className={`${tdCls} text-right font-mono text-slate-500`}>{fmtQty(row.minStockLevel)}</td>
                        <td className={`${tdCls} text-slate-500 max-w-40`}>
                          {row.warehouses.length === 0
                            ? '—'
                            : Array.from(new Set(row.warehouses.map(w => w.code))).join(', ')}
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="bg-slate-50 dark:bg-slate-800/40">
                          <td colSpan={15} className="px-4 py-3">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                              <div>
                                <h4 className="text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1.5 flex items-center gap-1.5">
                                  <WarehouseIcon className="w-3.5 h-3.5 text-blue-600" />
                                  Répartition par magasin et emplacement
                                </h4>
                                {row.warehouses.length === 0 ? (
                                  <p className="text-[11px] text-slate-400">Aucun stock physique.</p>
                                ) : (
                                  <table className="w-full text-left">
                                    <thead>
                                      <tr className="text-[10px] text-slate-500 uppercase">
                                        <th className="py-1">Magasin</th>
                                        <th className="py-1">Emplacement</th>
                                        <th className="py-1 text-right">Quantité</th>
                                        <th className="py-1 text-right">Disponible</th>
                                        <th className="py-1">Part</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200/70 dark:divide-slate-700/60">
                                      {row.warehouses.map((entry, index) => (
                                        <tr key={`${entry.warehouseId}-${entry.locationCode}-${index}`}>
                                          <td className="py-1 text-[11px]">
                                            <span className="font-mono text-[10px] text-slate-500">
                                              {entry.code}
                                            </span>{' '}
                                            {entry.designation}
                                          </td>
                                          <td className="py-1 text-[11px] font-mono text-slate-500">
                                            {entry.locationCode || '—'}
                                          </td>
                                          <td className="py-1 text-[11px] text-right font-mono">
                                            {fmtQtyUnit(entry.quantity, row.unit)}
                                          </td>
                                          <td className="py-1 text-[11px] text-right font-mono text-emerald-700 dark:text-emerald-400">
                                            {fmtQty(entry.available)}
                                          </td>
                                          <td className="py-1 w-24">
                                            <Bar value={entry.quantity} max={row.physical} />
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                )}
                              </div>
                              <div>
                                <h4 className="text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1.5 flex items-center gap-1.5">
                                  <Layers className="w-3.5 h-3.5 text-violet-600" />
                                  Lots ({lotsByItem.get(row.itemId)?.length || 0})
                                </h4>
                                {(lotsByItem.get(row.itemId)?.length || 0) === 0 ? (
                                  <p className="text-[11px] text-slate-400">Aucun lot enregistré.</p>
                                ) : (
                                  <table className="w-full text-left">
                                    <thead>
                                      <tr className="text-[10px] text-slate-500 uppercase">
                                        <th className="py-1">Lot</th>
                                        <th className="py-1">Statut</th>
                                        <th className="py-1">Péremption</th>
                                        <th className="py-1 text-right">Restant</th>
                                        <th className="py-1" />
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200/70 dark:divide-slate-700/60">
                                      {(lotsByItem.get(row.itemId) || []).map(lot => (
                                        <tr key={lot.lotId}>
                                          <td className="py-1 text-[11px] font-mono">{lot.lotNumber}</td>
                                          <td className="py-1">
                                            <QualityPill status={lot.qualityStatus} />
                                          </td>
                                          <td className="py-1 text-[11px] text-slate-500">
                                            {lot.expiryDate || '—'}
                                            {lot.isExpired && (
                                              <Pill tone="red">périmé</Pill>
                                            )}
                                          </td>
                                          <td className="py-1 text-[11px] text-right font-mono">
                                            {fmtQtyUnit(lot.remainingQty, lot.unit)}
                                          </td>
                                          <td className="py-1 text-right">
                                            <button
                                              type="button"
                                              onClick={() => onOpenTrace(lot.lotNumber)}
                                              className="text-[10px] font-semibold text-blue-600 hover:underline cursor-pointer"
                                            >
                                              Traçabilité
                                            </button>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </GdsCard>

      <p className="text-[10.5px] text-slate-500 dark:text-slate-400 px-1">
        Le stock disponible exclut systématiquement les quantités réservées, en attente de contrôle,
        en quarantaine, bloquées et en transit. Aucun transfert en cours n'est compté deux fois.
      </p>
    </div>
  );
};

/** Carte compacte réutilisable pour un récapitulatif de magasin. */
export const WarehouseMiniCard: React.FC<{
  code: string;
  designation: string;
  physical: number;
  available: number;
  extra?: React.ReactNode;
}> = ({ code, designation, physical, available, extra }) => (
  <div className={`${cardCls} p-3`}>
    <div className="flex items-center justify-between gap-2">
      <span className="font-mono text-[10px] text-slate-500">{code}</span>
      {extra}
    </div>
    <p className="text-[11.5px] font-semibold text-slate-800 dark:text-slate-100 truncate">
      {designation}
    </p>
    <div className="mt-1 flex items-center justify-between text-[11px]">
      <span className="text-slate-500">Physique</span>
      <span className="font-mono font-semibold">{fmtQty(physical)}</span>
    </div>
    <div className="flex items-center justify-between text-[11px]">
      <span className="text-slate-500">Disponible</span>
      <span className="font-mono font-semibold text-emerald-700 dark:text-emerald-400">
        {fmtQty(available)}
      </span>
    </div>
  </div>
);
