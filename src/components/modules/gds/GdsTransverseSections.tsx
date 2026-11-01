/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * MAMORA GP — GDS : tableaux de bord, alertes, rapports et paramètres.
 * Tous les indicateurs proviennent des données réelles du moteur de stock.
 */

import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  BarChart3,
  BellRing,
  Boxes,
  Download,
  Factory,
  Gauge,
  Layers,
  PackageSearch,
  Printer,
  Settings2,
  ShieldCheck,
  Truck,
  Warehouse as WarehouseIcon,
} from 'lucide-react';
import { storage } from '../../../services/storage';
import {
  GDS_ALERT_LABELS,
  GDS_PERMISSION_LABELS,
  GDS_ROLE_PERMISSIONS,
  GdsAlert,
  GdsAlertKind,
  GdsPermission,
  GdsScope,
  ITEM_CATEGORY_GROUP_LABELS,
  User,
  UserRole,
  WAREHOUSE_TYPE_LABELS,
  getRoleLabel,
} from '../../../types';
import {
  Bar,
  EmptyState,
  GdsCard,
  Kpi,
  Pill,
  btnGhost,
  btnPrimary,
  cardCls,
  downloadCsv,
  fmtDate,
  fmtQty,
  fmtQtyUnit,
  inputCls,
  labelCls,
  tdCls,
  thCls,
} from './GdsShared';

// ===========================================================================
// Tableau de bord
// ===========================================================================

export const GdsDashboardSection: React.FC<{
  scope: GdsScope;
  onNavigate: (section: string) => void;
}> = ({ scope, onNavigate }) => {
  const dashboard = useMemo(() => storage.getGdsDashboard(scope), [scope]);
  const alerts = useMemo(() => storage.getGdsAlerts(scope), [scope]);
  const isMp = scope === 'MATIERES_PREMIERES';

  const maxMonthly = Math.max(
    1,
    ...dashboard.monthly.flatMap(entry => [entry.entries, entry.exits])
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-2.5">
        <Kpi label="Articles suivis" value={String(dashboard.itemCount)} icon={Boxes} tone="text-blue-600" hint={`${dashboard.lotCount} lot(s) actif(s)`} />
        <Kpi label="Stock physique" value={fmtQty(dashboard.physical)} icon={Layers} tone="text-slate-600" />
        <Kpi label="Stock disponible" value={fmtQty(dashboard.available)} icon={PackageSearch} tone="text-emerald-600" onClick={() => onNavigate(isMp ? 'MP_STOCK' : 'PF_STOCK')} />
        <Kpi label="Réservé" value={fmtQty(dashboard.reserved)} icon={Layers} tone="text-indigo-600" />
        <Kpi label="En transit" value={fmtQty(dashboard.transit)} icon={Truck} tone="text-violet-600" hint={`${dashboard.pendingTransfers} transfert(s) en cours`} />
        <Kpi label={isMp ? 'Sous minimum' : 'Attente de libération'} value={String(isMp ? dashboard.belowMin : dashboard.pendingReleases)} icon={AlertTriangle} tone="text-amber-600" onClick={() => onNavigate('ALERTS')} />
        <Kpi label={isMp ? 'Ruptures' : 'Bloqués / quarantaine'} value={String(isMp ? dashboard.outOfStock : dashboard.quarantine + dashboard.blocked)} icon={AlertTriangle} tone="text-red-600" onClick={() => onNavigate('ALERTS')} />
        <Kpi label="Péremption proche" value={String(dashboard.expiringSoon)} icon={Gauge} tone="text-orange-600" hint={`${dashboard.expired} lot(s) périmé(s)`} onClick={() => onNavigate('ALERTS')} />
        <Kpi label="Entrées 30 j" value={fmtQty(dashboard.entries30d)} icon={ArrowDownToLine} tone="text-emerald-600" />
        <Kpi label="Sorties 30 j" value={fmtQty(dashboard.exits30d)} icon={ArrowUpFromLine} tone="text-orange-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GdsCard title={isMp ? 'Quantités par famille' : 'Stock par famille de produit'} bodyClassName="p-0">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/60">
              <tr>
                <th className={thCls}>Famille</th>
                <th className={`${thCls} text-right`}>Articles</th>
                <th className={`${thCls} text-right`}>Physique</th>
                <th className={`${thCls} text-right`}>Disponible</th>
                <th className={`${thCls} text-right`}>Sous min.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {dashboard.byFamily.map(family => (
                <tr key={family.group}>
                  <td className={tdCls}>{family.label}</td>
                  <td className={`${tdCls} text-right font-mono`}>{family.itemCount}</td>
                  <td className={`${tdCls} text-right font-mono`}>{fmtQty(family.physical)}</td>
                  <td className={`${tdCls} text-right font-mono text-emerald-700 dark:text-emerald-400`}>
                    {fmtQty(family.available)}
                  </td>
                  <td className={`${tdCls} text-right font-mono ${family.belowMin > 0 ? 'text-red-600 font-semibold' : 'text-slate-400'}`}>
                    {family.belowMin}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </GdsCard>

        <GdsCard title="Stock par magasin" bodyClassName="p-0">
          {dashboard.byWarehouse.length === 0 ? (
            <EmptyState icon={WarehouseIcon} title="Aucun stock en magasin" />
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[520px]">
              <thead className="bg-slate-50 dark:bg-slate-800/60">
                <tr>
                  <th className={`${thCls} whitespace-nowrap`}>Magasin</th>
                  <th className={`${thCls} whitespace-nowrap`}>Type</th>
                  <th className={`${thCls} text-right whitespace-nowrap`}>Physique</th>
                  <th className={`${thCls} text-right whitespace-nowrap`}>Dispo.</th>
                  <th className={`${thCls} text-right whitespace-nowrap`}>Attente</th>
                  <th className={`${thCls} text-right whitespace-nowrap`}>Quar.</th>
                  <th className={`${thCls} text-right whitespace-nowrap`}>Bloqué</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {dashboard.byWarehouse.map(warehouse => (
                  <tr key={warehouse.warehouseId}>
                    <td className={tdCls}>
                      <span className="font-mono text-[10px] text-slate-500">{warehouse.code}</span>
                      <span className="block text-[10.5px]">{warehouse.designation}</span>
                    </td>
                    <td className={`${tdCls} text-[10px] text-slate-500`}>
                      {WAREHOUSE_TYPE_LABELS[warehouse.type]}
                    </td>
                    <td className={`${tdCls} text-right font-mono`}>{fmtQty(warehouse.physical)}</td>
                    <td className={`${tdCls} text-right font-mono text-emerald-700 dark:text-emerald-400`}>
                      {fmtQty(warehouse.available)}
                    </td>
                    <td className={`${tdCls} text-right font-mono text-amber-700 dark:text-amber-400`}>
                      {fmtQty(warehouse.pendingControl)}
                    </td>
                    <td className={`${tdCls} text-right font-mono text-orange-700 dark:text-orange-400`}>
                      {fmtQty(warehouse.quarantine)}
                    </td>
                    <td className={`${tdCls} text-right font-mono text-red-600`}>
                      {fmtQty(warehouse.blocked)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </GdsCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <GdsCard
          title="Entrées / sorties des 6 derniers mois"
          className="lg:col-span-2"
          subtitle="Somme des effets physiques réels du grand livre des mouvements."
        >
          <div className="space-y-2">
            {dashboard.monthly.map(entry => (
              <div key={entry.period} className="flex items-center gap-2">
                <span className="w-16 text-[10.5px] font-mono text-slate-500">{entry.period}</span>
                <div className="flex-1 space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <Bar value={entry.entries} max={maxMonthly} tone="bg-emerald-500" />
                    <span className="w-16 text-right text-[10px] font-mono text-emerald-700 dark:text-emerald-400">
                      +{fmtQty(entry.entries)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Bar value={entry.exits} max={maxMonthly} tone="bg-orange-500" />
                    <span className="w-16 text-right text-[10px] font-mono text-orange-700 dark:text-orange-400">
                      -{fmtQty(entry.exits)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </GdsCard>

        <GdsCard title="Articles les plus mouvementés (30 j)" bodyClassName="p-0">
          {dashboard.topMoved.length === 0 ? (
            <EmptyState icon={BarChart3} title="Aucun mouvement sur la période" />
          ) : (
            <table className="w-full text-left">
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {dashboard.topMoved.map(item => (
                  <tr key={item.itemCode}>
                    <td className={tdCls}>
                      <span className="font-mono text-[10px] text-slate-500">{item.itemCode}</span>
                      <span className="block text-[10.5px] truncate max-w-[190px]">{item.designation}</span>
                    </td>
                    <td className={`${tdCls} text-right font-mono whitespace-nowrap`}>
                      {fmtQtyUnit(item.quantity, item.unit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </GdsCard>
      </div>

      <GdsCard
        title={`Alertes (${alerts.length})`}
        actions={
          <button type="button" className={btnGhost} onClick={() => onNavigate('ALERTS')}>
            <BellRing className="w-3.5 h-3.5" />
            Centre d'alertes
          </button>
        }
        bodyClassName="p-0"
      >
        {alerts.length === 0 ? (
          <EmptyState icon={ShieldCheck} title="Aucune alerte" hint="Tous les seuils sont respectés." />
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {alerts.slice(0, 6).map(alert => (
              <li key={alert.id} className="flex items-center gap-2 px-3 py-1.5">
                <Pill
                  tone={
                    alert.severity === 'CRITIQUE'
                      ? 'red'
                      : alert.severity === 'AVERTISSEMENT'
                        ? 'amber'
                        : 'slate'
                  }
                >
                  {GDS_ALERT_LABELS[alert.kind]}
                </Pill>
                <span className="font-mono text-[10px] text-slate-500">{alert.itemCode}</span>
                <span className="flex-1 truncate text-[11px]">{alert.message}</span>
                <span className="text-[10px] text-slate-400">{alert.warehouseCode || ''}</span>
              </li>
            ))}
          </ul>
        )}
      </GdsCard>
    </div>
  );
};

// ===========================================================================
// Alertes
// ===========================================================================

export const GdsAlertsSection: React.FC<{ scope?: GdsScope }> = ({ scope }) => {
  const [kind, setKind] = useState<'ALL' | GdsAlertKind>('ALL');
  const [severity, setSeverity] = useState<'ALL' | GdsAlert['severity']>('ALL');
  const alerts = useMemo(() => storage.getGdsAlerts(scope), [scope]);
  const filtered = alerts.filter(
    alert =>
      (kind === 'ALL' || alert.kind === kind) &&
      (severity === 'ALL' || alert.severity === severity)
  );

  const byKind = alerts.reduce<Record<string, number>>((acc, alert) => {
    acc[alert.kind] = (acc[alert.kind] || 0) + 1;
    return acc;
  }, {});

  const exportCsv = () => {
    downloadCsv(`gds-alertes-${new Date().toISOString().slice(0, 10)}.csv`, [
      ['Gravité', 'Type', 'Périmètre', 'Article', 'Désignation', 'Lot', 'Magasin', 'Quantité', 'Échéance', 'Message'],
      ...filtered.map(alert => [
        alert.severity,
        GDS_ALERT_LABELS[alert.kind],
        alert.scope,
        alert.itemCode,
        alert.designation,
        alert.lotNumber || '',
        alert.warehouseCode || '',
        alert.quantity,
        alert.dueDate || '',
        alert.message,
      ]),
    ]);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div className={`${cardCls} p-3`}>
          <p className="text-[10px] uppercase font-semibold text-slate-500">Alertes critiques</p>
          <p className="text-lg font-bold text-red-600">
            {alerts.filter(a => a.severity === 'CRITIQUE').length}
          </p>
        </div>
        <div className={`${cardCls} p-3`}>
          <p className="text-[10px] uppercase font-semibold text-slate-500">Avertissements</p>
          <p className="text-lg font-bold text-amber-600">
            {alerts.filter(a => a.severity === 'AVERTISSEMENT').length}
          </p>
        </div>
        <div className={`${cardCls} p-3`}>
          <p className="text-[10px] uppercase font-semibold text-slate-500">Informations</p>
          <p className="text-lg font-bold text-slate-600">
            {alerts.filter(a => a.severity === 'INFO').length}
          </p>
        </div>
        <div className={`${cardCls} p-3`}>
          <p className="text-[10px] uppercase font-semibold text-slate-500">Total</p>
          <p className="text-lg font-bold">{alerts.length}</p>
        </div>
      </div>

      <GdsCard
        title="Centre d'alertes"
        subtitle="Ruptures, sous-minimum, péremptions, quarantaines, blocages, surstocks et transferts prolongés."
        actions={
          <button type="button" className={btnGhost} onClick={exportCsv}>
            <Download className="w-3.5 h-3.5" />
            CSV
          </button>
        }
        bodyClassName="p-0"
      >
        <div className="flex flex-wrap items-center gap-2 p-3 border-b border-slate-100 dark:border-slate-800">
          <select
            className={inputCls}
            value={kind}
            onChange={event => setKind(event.target.value as 'ALL' | GdsAlertKind)}
            aria-label="Filtrer par type d'alerte"
          >
            <option value="ALL">Tous les types</option>
            {(Object.keys(GDS_ALERT_LABELS) as GdsAlertKind[]).map(key => (
              <option key={key} value={key}>
                {GDS_ALERT_LABELS[key]} ({byKind[key] || 0})
              </option>
            ))}
          </select>
          <select
            className={inputCls}
            value={severity}
            onChange={event => setSeverity(event.target.value as 'ALL' | GdsAlert['severity'])}
            aria-label="Filtrer par gravité"
          >
            <option value="ALL">Toutes les gravités</option>
            <option value="CRITIQUE">Critique</option>
            <option value="AVERTISSEMENT">Avertissement</option>
            <option value="INFO">Information</option>
          </select>
          <span className="ml-auto text-[11px] text-slate-500">{filtered.length} alerte(s)</span>
        </div>

        {filtered.length === 0 ? (
          <EmptyState icon={ShieldCheck} title="Aucune alerte pour ces critères" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/60">
                <tr>
                  <th className={thCls}>Gravité</th>
                  <th className={thCls}>Type</th>
                  <th className={thCls}>Article</th>
                  <th className={thCls}>Lot</th>
                  <th className={thCls}>Magasin</th>
                  <th className={`${thCls} text-right`}>Quantité</th>
                  <th className={thCls}>Échéance</th>
                  <th className={thCls}>Message</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map(alert => (
                  <tr key={alert.id}>
                    <td className={tdCls}>
                      <Pill
                        tone={
                          alert.severity === 'CRITIQUE'
                            ? 'red'
                            : alert.severity === 'AVERTISSEMENT'
                              ? 'amber'
                              : 'slate'
                        }
                      >
                        {alert.severity}
                      </Pill>
                    </td>
                    <td className={tdCls}>{GDS_ALERT_LABELS[alert.kind]}</td>
                    <td className={tdCls}>
                      <span className="font-mono text-[10px] text-slate-500">{alert.itemCode}</span>
                      <span className="block text-[10.5px]">{alert.designation}</span>
                    </td>
                    <td className={`${tdCls} font-mono text-[10px]`}>{alert.lotNumber || '—'}</td>
                    <td className={`${tdCls} text-[10.5px] text-slate-500`}>
                      {alert.warehouseCode || '—'}
                    </td>
                    <td className={`${tdCls} text-right font-mono`}>
                      {fmtQtyUnit(alert.quantity, alert.unit)}
                    </td>
                    <td className={`${tdCls} text-slate-500`}>{fmtDate(alert.dueDate)}</td>
                    <td className={`${tdCls} text-[10.5px] text-slate-500`}>{alert.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GdsCard>
    </div>
  );
};

// ===========================================================================
// Rapports
// ===========================================================================

export const GdsReportsSection: React.FC = () => {
  const [year, setYear] = useState(new Date().getFullYear());
  const report = useMemo(() => storage.getGdsReport(year), [year]);

  const exportCsv = () => {
    downloadCsv(`gds-rapport-${year}.csv`, [
      [`Rapport GDS ${year}`],
      [],
      ['Période', 'Entrées MP', 'Sorties MP', 'Réceptions PF', 'Sorties PF', 'Ajustements', 'Écart inventaire'],
      ...report.monthly.map(entry => [
        entry.period,
        entry.mpEntries,
        entry.mpExits,
        entry.fgReceipts,
        entry.fgIssues,
        entry.adjustments,
        entry.inventoryGapValue,
      ]),
      [],
      ['Famille', 'Physique', 'Disponible', 'Articles'],
      ...report.byFamily.map(family => [family.label, family.physical, family.available, family.itemCount]),
      [],
      ['Magasin', 'Type', 'Physique', 'Disponible'],
      ...report.byWarehouse.map(warehouse => [
        warehouse.code,
        WAREHOUSE_TYPE_LABELS[warehouse.type],
        warehouse.physical,
        warehouse.available,
      ]),
      [],
      ['Article consommé', 'Désignation', 'Quantité', 'Unité'],
      ...report.topConsumed.map(item => [item.itemCode, item.designation, item.quantity, item.unit]),
      [],
      ['Produit fabriqué', 'Désignation', 'Boîtes', 'Cartons'],
      ...report.topProduced.map(item => [item.itemCode, item.designation, item.cans, item.cartons]),
    ]);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <select
          className={inputCls}
          value={year}
          onChange={event => setYear(Number(event.target.value))}
          aria-label="Exercice"
        >
          {[0, 1, 2].map(offset => {
            const value = new Date().getFullYear() - offset;
            return (
              <option key={value} value={value}>
                Exercice {value}
              </option>
            );
          })}
        </select>
        <button type="button" className={btnGhost} onClick={exportCsv}>
          <Download className="w-3.5 h-3.5" />
          Export CSV
        </button>
        <button type="button" className={btnGhost} onClick={() => window.print()}>
          <Printer className="w-3.5 h-3.5" />
          Imprimer
        </button>
        <span className="ml-auto text-[11px] text-slate-500">
          {report.totalMovements} mouvement(s) sur l'exercice
        </span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <Kpi label="Précision d'inventaire" value={`${report.inventoryAccuracy} %`} icon={Gauge} tone="text-emerald-600" />
        <Kpi
          label="Entrées MP (année)"
          value={fmtQty(report.monthly.reduce((sum, entry) => sum + entry.mpEntries, 0))}
          icon={ArrowDownToLine}
          tone="text-blue-600"
        />
        <Kpi
          label="Sorties MP (année)"
          value={fmtQty(report.monthly.reduce((sum, entry) => sum + entry.mpExits, 0))}
          icon={ArrowUpFromLine}
          tone="text-orange-600"
        />
        <Kpi
          label="Réceptions PF (année)"
          value={fmtQty(report.monthly.reduce((sum, entry) => sum + entry.fgReceipts, 0))}
          icon={Factory}
          tone="text-violet-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GdsCard title={`Dépenses et flux mensuels ${year}`} bodyClassName="p-0">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/60">
              <tr>
                <th className={thCls}>Mois</th>
                <th className={`${thCls} text-right`}>Entrées MP</th>
                <th className={`${thCls} text-right`}>Sorties MP</th>
                <th className={`${thCls} text-right`}>Récept. PF</th>
                <th className={`${thCls} text-right`}>Sorties PF</th>
                <th className={`${thCls} text-right`}>Ajust.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {report.monthly.map(entry => (
                <tr key={entry.period}>
                  <td className={`${tdCls} font-mono text-[10.5px]`}>{entry.period}</td>
                  <td className={`${tdCls} text-right font-mono`}>{fmtQty(entry.mpEntries)}</td>
                  <td className={`${tdCls} text-right font-mono`}>{fmtQty(entry.mpExits)}</td>
                  <td className={`${tdCls} text-right font-mono`}>{fmtQty(entry.fgReceipts)}</td>
                  <td className={`${tdCls} text-right font-mono`}>{fmtQty(entry.fgIssues)}</td>
                  <td className={`${tdCls} text-right font-mono ${entry.adjustments > 0 ? 'text-amber-600 font-semibold' : 'text-slate-400'}`}>
                    {entry.adjustments}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </GdsCard>

        <GdsCard title="Stock par famille et par magasin" bodyClassName="p-0">
          <div className="p-3 space-y-2">
            {report.byFamily.map(family => (
              <div key={family.label} className="flex items-center gap-2">
                <span className="w-44 truncate text-[11px]">{family.label}</span>
                <div className="flex-1">
                  <Bar
                    value={family.available}
                    max={Math.max(1, ...report.byFamily.map(entry => entry.available))}
                  />
                </div>
                <span className="w-20 text-right font-mono text-[10.5px]">
                  {fmtQty(family.available)}
                </span>
              </div>
            ))}
          </div>
          <table className="w-full text-left border-t border-slate-100 dark:border-slate-800">
            <thead className="bg-slate-50 dark:bg-slate-800/60">
              <tr>
                <th className={thCls}>Magasin</th>
                <th className={thCls}>Type</th>
                <th className={`${thCls} text-right`}>Physique</th>
                <th className={`${thCls} text-right`}>Disponible</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {report.byWarehouse.map(warehouse => (
                <tr key={warehouse.code}>
                  <td className={`${tdCls} text-[10.5px]`}>{warehouse.code}</td>
                  <td className={`${tdCls} text-[10px] text-slate-500`}>
                    {WAREHOUSE_TYPE_LABELS[warehouse.type]}
                  </td>
                  <td className={`${tdCls} text-right font-mono`}>{fmtQty(warehouse.physical)}</td>
                  <td className={`${tdCls} text-right font-mono text-emerald-700 dark:text-emerald-400`}>
                    {fmtQty(warehouse.available)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </GdsCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <GdsCard title="Consommations les plus élevées" bodyClassName="p-0">
          {report.topConsumed.length === 0 ? (
            <EmptyState title="Aucune consommation enregistrée" />
          ) : (
            <table className="w-full text-left">
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {report.topConsumed.map(item => (
                  <tr key={item.itemCode}>
                    <td className={tdCls}>
                      <span className="font-mono text-[10px] text-slate-500">{item.itemCode}</span>
                      <span className="block text-[10.5px] truncate max-w-[190px]">{item.designation}</span>
                    </td>
                    <td className={`${tdCls} text-right font-mono whitespace-nowrap`}>
                      {fmtQtyUnit(item.quantity, item.unit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </GdsCard>

        <GdsCard title="Productions réceptionnées" bodyClassName="p-0">
          {report.topProduced.length === 0 ? (
            <EmptyState title="Aucune production réceptionnée" />
          ) : (
            <table className="w-full text-left">
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {report.topProduced.map(item => (
                  <tr key={item.itemCode}>
                    <td className={tdCls}>
                      <span className="font-mono text-[10px] text-slate-500">{item.itemCode}</span>
                      <span className="block text-[10.5px]">{item.designation}</span>
                    </td>
                    <td className={`${tdCls} text-right font-mono`}>{fmtQty(item.cans)} bt</td>
                    <td className={`${tdCls} text-right font-mono text-slate-500`}>
                      {fmtQty(item.cartons)} ct
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </GdsCard>

        <GdsCard title="Pertes et rebuts" bodyClassName="p-0">
          {report.losses.length === 0 ? (
            <EmptyState title="Aucune perte enregistrée" />
          ) : (
            <table className="w-full text-left">
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {report.losses.map((item, index) => (
                  <tr key={`${item.itemCode}-${index}`}>
                    <td className={tdCls}>
                      <span className="font-mono text-[10px] text-slate-500">{item.itemCode}</span>
                      <span className="block text-[10.5px]">{item.designation}</span>
                      <span className="block text-[9.5px] text-slate-400">{item.reason}</span>
                    </td>
                    <td className={`${tdCls} text-right font-mono text-red-600`}>
                      {fmtQtyUnit(item.quantity, item.unit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </GdsCard>
      </div>
    </div>
  );
};

// ===========================================================================
// Paramètres
// ===========================================================================

export const GdsSettingsSection: React.FC<{ currentUser: User }> = ({ currentUser }) => {
  const [settings, setSettings] = useState(() => storage.getGdsSettings());
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const warehouses = storage.getWarehouses();
  const canEdit = currentUser.role === 'ADMIN' || currentUser.role === 'DIRECTEUR_USINE';
  const [demoConfirm, setDemoConfirm] = useState(false);
  const [newDestinationType, setNewDestinationType] = useState('');
  const [demoResult, setDemoResult] = useState('');
  const ledgerEmpty = storage.getStockMovements().length === 0;

  const addDestinationType = () => {
    const value = newDestinationType.trim();
    if (!value) return;
    if (settings.issueDestinationTypes.includes(value)) {
      setError('Ce type de destination existe déjà.');
      return;
    }
    setSettings({
      ...settings,
      issueDestinationTypes: [...settings.issueDestinationTypes, value],
    });
    setNewDestinationType('');
    setError('');
  };

  const removeDestinationType = (type: string) => {
    if (settings.issueDestinationTypes.length <= 1) {
      setError('Au moins un type de destination doit rester autorisé.');
      return;
    }
    setSettings({
      ...settings,
      issueDestinationTypes: settings.issueDestinationTypes.filter(value => value !== type),
    });
    setError('');
  };

  const saveDestinationTypes = () => {
    try {
      const next = storage.updateGdsSettings({
        issueDestinationTypes: settings.issueDestinationTypes,
      });
      setSettings(next);
      setNotice('Types de destination enregistrés.');
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const loadDemo = () => {
    try {
      const result = storage.seedGdsDemoData();
      setDemoResult(
        `Jeu de démonstration chargé : ${result.movements} mouvements, ${result.lots} lots, ` +
          `${result.workOrders} ordres de fabrication, ${result.consumptionSheets} fiche(s) de ` +
          `consommation validée(s) et ${result.finishedBatches} lots finis.`
      );
      setError('');
      setDemoConfirm(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setDemoConfirm(false);
    }
  };

  const save = () => {
    try {
      const next = storage.updateGdsSettings({
        ...settings,
        expiryAlertDays: Number(settings.expiryAlertDays),
        transitAlertDays: Number(settings.transitAlertDays),
        overstockMultiplier: Number(settings.overstockMultiplier),
        inventoryTolerancePercent: Number(settings.inventoryTolerancePercent),
      });
      setSettings(next);
      setNotice('Paramètres GDS enregistrés.');
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="space-y-4">
      {(error || notice) && (
        <div
          className={`px-4 py-2.5 rounded-lg border text-xs ${
            error
              ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-950/40 dark:border-red-800 dark:text-red-300'
              : 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <span>{error || notice}</span>
            <button
              type="button"
              onClick={() => {
                setError('');
                setNotice('');
              }}
              className="text-[11px] font-semibold cursor-pointer"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GdsCard
          title="Seuils et règles de gestion"
          subtitle="Ces paramètres pilotent les alertes et les contrôles du module GDS."
          actions={
            <button type="button" className={btnPrimary} onClick={save} disabled={!canEdit}>
              <Settings2 className="w-3.5 h-3.5" />
              Enregistrer
            </button>
          }
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Alerte péremption (jours)</label>
              <input
                type="number"
                min={0}
                className={`${inputCls} w-full`}
                value={settings.expiryAlertDays}
                onChange={event =>
                  setSettings({ ...settings, expiryAlertDays: Number(event.target.value) })
                }
                disabled={!canEdit}
              />
            </div>
            <div>
              <label className={labelCls}>Alerte transit (jours)</label>
              <input
                type="number"
                min={0}
                className={`${inputCls} w-full`}
                value={settings.transitAlertDays}
                onChange={event =>
                  setSettings({ ...settings, transitAlertDays: Number(event.target.value) })
                }
                disabled={!canEdit}
              />
            </div>
            <div>
              <label className={labelCls}>Coefficient de surstock</label>
              <input
                type="number"
                min={1}
                step="0.1"
                className={`${inputCls} w-full`}
                value={settings.overstockMultiplier}
                onChange={event =>
                  setSettings({ ...settings, overstockMultiplier: Number(event.target.value) })
                }
                disabled={!canEdit}
              />
            </div>
            <div>
              <label className={labelCls}>Tolérance d'inventaire (%)</label>
              <input
                type="number"
                min={0}
                step="0.1"
                className={`${inputCls} w-full`}
                value={settings.inventoryTolerancePercent}
                onChange={event =>
                  setSettings({
                    ...settings,
                    inventoryTolerancePercent: Number(event.target.value),
                  })
                }
                disabled={!canEdit}
              />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Magasin de production (dotations atelier)</label>
              <select
                className={`${inputCls} w-full`}
                value={settings.defaultProductionWarehouseId || ''}
                onChange={event =>
                  setSettings({ ...settings, defaultProductionWarehouseId: event.target.value })
                }
                disabled={!canEdit}
              >
                <option value="">Automatique (premier magasin de production)</option>
                {warehouses.map(warehouse => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.code} — {warehouse.designation}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Magasin de quarantaine</label>
              <select
                className={`${inputCls} w-full`}
                value={settings.quarantineWarehouseId || ''}
                onChange={event =>
                  setSettings({ ...settings, quarantineWarehouseId: event.target.value })
                }
                disabled={!canEdit}
              >
                <option value="">Automatique</option>
                {warehouses
                  .filter(warehouse => ['QUARANTAINE', 'NON_CONFORMES'].includes(warehouse.type))
                  .map(warehouse => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.code} — {warehouse.designation}
                    </option>
                  ))}
              </select>
            </div>
            <label className="col-span-2 inline-flex items-center gap-2 text-[11px]">
              <input
                type="checkbox"
                checked={settings.requireQualityReleaseOnFinishedReceipt}
                onChange={event =>
                  setSettings({
                    ...settings,
                    requireQualityReleaseOnFinishedReceipt: event.target.checked,
                  })
                }
                disabled={!canEdit}
                className="accent-blue-600"
              />
              Placer toute réception de produit fini en attente de libération qualité
            </label>
            <label className="col-span-2 inline-flex items-center gap-2 text-[11px]">
              <input
                type="checkbox"
                checked={settings.blockUnreleasedFinishedGoodsIssue}
                onChange={event =>
                  setSettings({
                    ...settings,
                    blockUnreleasedFinishedGoodsIssue: event.target.checked,
                  })
                }
                disabled={!canEdit}
                className="accent-blue-600"
              />
              Interdire la sortie d'un lot de produit fini non libéré
            </label>
          </div>
          {!canEdit && (
            <p className="mt-2 text-[10px] text-amber-600">
              Seuls les profils Administration et Direction peuvent modifier ces paramètres.
            </p>
          )}
        </GdsCard>

        <GdsCard
          title="Habilitations GDS par profil"
          subtitle="Matrice appliquée par le moteur ; elle complète les habilitations magasins existantes."
          bodyClassName="p-0"
          className="lg:col-span-2"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/60">
                <tr>
                  <th className={thCls}>Profil</th>
                  {(['GDS_VIEW_MP', 'GDS_RECEIVE_MP', 'GDS_ISSUE_MP', 'GDS_RECEIVE_FP', 'GDS_RELEASE_FP', 'GDS_ISSUE_FP', 'GDS_INVENTORY', 'GDS_VALIDATE_ADJUSTMENT'] as GdsPermission[]).map(
                    permission => (
                      <th key={permission} className={`${thCls} text-center`} title={GDS_PERMISSION_LABELS[permission]}>
                        {permission.replace('GDS_', '').replace(/_/g, ' ')}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {(Object.keys(GDS_ROLE_PERMISSIONS) as UserRole[]).map(role => (
                  <tr key={role}>
                    <td className={`${tdCls} whitespace-nowrap`}>{getRoleLabel(role)}</td>
                    {(['GDS_VIEW_MP', 'GDS_RECEIVE_MP', 'GDS_ISSUE_MP', 'GDS_RECEIVE_FP', 'GDS_RELEASE_FP', 'GDS_ISSUE_FP', 'GDS_INVENTORY', 'GDS_VALIDATE_ADJUSTMENT'] as GdsPermission[]).map(
                      permission => {
                        const permitted = GDS_ROLE_PERMISSIONS[role].includes(permission);
                        return (
                          <td key={permission} className={`${tdCls} text-center`}>
                            {permitted ? (
                              <span className="text-emerald-600 font-bold">✓</span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                        );
                      }
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="px-3 py-2 text-[10px] text-slate-500">
            La libération des produits finis reste en outre contrôlée par le module Qualité
            (double contrôle de rôle).
          </p>
        </GdsCard>
      </div>

      <GdsCard
        title="Types de destination des sorties de produits finis"
        subtitle="Liste réellement utilisée par le bon de sortie : elle remplace les motifs figés du code."
        actions={
          <button
            type="button"
            className={btnPrimary}
            onClick={saveDestinationTypes}
            disabled={!canEdit}
          >
            <Settings2 className="w-3.5 h-3.5" />
            Enregistrer
          </button>
        }
      >
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {settings.issueDestinationTypes.map(type => (
              <span
                key={type}
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[11px] font-medium"
              >
                {type}
                <button
                  type="button"
                  onClick={() => removeDestinationType(type)}
                  disabled={!canEdit}
                  className="text-slate-400 hover:text-red-600 cursor-pointer disabled:cursor-not-allowed"
                  aria-label={`Retirer ${type}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              className={`${inputCls} w-64`}
              value={newDestinationType}
              onChange={event => setNewDestinationType(event.target.value)}
              placeholder="Nouveau type (ex. Laboratoire externe)"
              disabled={!canEdit}
            />
            <button
              type="button"
              className={btnGhost}
              onClick={addDestinationType}
              disabled={!canEdit || !newDestinationType.trim()}
            >
              Ajouter
            </button>
          </div>
          <p className="text-[10px] text-slate-500">
            Les sorties déjà enregistrées conservent le type choisi au moment de leur création.
          </p>
        </div>
      </GdsCard>

      <GdsCard
        title="Jeu de démonstration"
        subtitle="Scénario complet construit sur le moteur réel : réceptions MP, lot en quarantaine, dotation atelier, retour de matière et réceptions de production."
      >
        <div className="space-y-3 text-[11px] text-slate-600 dark:text-slate-300">
          <p>
            Le chargement est refusé dès que le grand livre contient un mouvement : il ne s'applique
            qu'à une base vierge et ne remplace jamais des données d'exploitation.
          </p>
          {demoResult && (
            <div className="px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300">
              {demoResult}
            </div>
          )}
          {!ledgerEmpty && (
            <p className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 dark:bg-slate-800/60 dark:border-slate-700 dark:text-slate-300">
              Le grand livre contient déjà {storage.getStockMovements().length} mouvement(s) : le jeu
              de démonstration n'est plus proposé sur cette base.
            </p>
          )}
          <div className="flex items-center gap-2">
            {!demoConfirm ? (
              <button
                type="button"
                className={btnPrimary}
                disabled={!canEdit || !ledgerEmpty}
                onClick={() => setDemoConfirm(true)}
              >
                <Download className="w-3.5 h-3.5" />
                Charger le jeu de démonstration
              </button>
            ) : (
              <>
                <span className="font-semibold text-amber-700 dark:text-amber-300">
                  Confirmer le chargement ?
                </span>
                <button type="button" className={btnPrimary} onClick={loadDemo}>
                  Oui, charger
                </button>
                <button type="button" className={btnGhost} onClick={() => setDemoConfirm(false)}>
                  Annuler
                </button>
              </>
            )}
            {!canEdit && (
              <span className="text-slate-500">
                Réservé aux profils Administration et Direction.
              </span>
            )}
          </div>
        </div>
      </GdsCard>

      <GdsCard title="Rappel des principes structurants">
        <ul className="grid grid-cols-1 lg:grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-slate-300">
          <li className="flex gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
            Un seul référentiel d'articles et un seul grand livre de mouvements : le GDS ne duplique
            ni les articles, ni les stocks.
          </li>
          <li className="flex gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
            Aucun solde n'est modifié directement : tout passe par un mouvement horodaté, attribué et
            documenté.
          </li>
          <li className="flex gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
            Le stock en transit n'est jamais compté deux fois ; les quantités bloquées ne sont jamais
            disponibles.
          </li>
          <li className="flex gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
            La traçabilité n'utilise que les liens réellement enregistrés (mouvements, consommations,
            réceptions).
          </li>
        </ul>
      </GdsCard>
    </div>
  );
};

export const ReportIcons = { BellRing, BarChart3, ITEM_CATEGORY_GROUP_LABELS };
