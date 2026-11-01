/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * MAMORA BI — composants de présentation partagés.
 * Aucune logique métier : formatage, graphiques et tableaux.
 */

import React, { useMemo } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';
import { BarChart3, Inbox } from 'lucide-react';
import {
  BiQueryResult,
  BiValueFormat,
  BiWidgetType,
} from '../../../types';
import { EmptyState } from '../gds/GdsShared';

export const BI_COLORS = [
  '#2563eb',
  '#059669',
  '#f59e0b',
  '#dc2626',
  '#7c3aed',
  '#0891b2',
  '#db2777',
  '#65a30d',
  '#ea580c',
  '#475569',
];

export const fmtBiNumber = (value: number | null | undefined, digits = 0): string => {
  if (value === null || value === undefined || Number.isNaN(value)) return 'non calculable';
  return value.toLocaleString('fr-FR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
};

/** Formate une valeur selon le format analytique du catalogue. */
export const fmtBi = (
  value: number | string | null | undefined,
  format: BiValueFormat = 'NUMBER',
  unit = '',
  precision?: number
): string => {
  if (value === null || value === undefined || value === '') return 'non calculable';
  if (format === 'DATE') {
    const date = new Date(String(value));
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString('fr-FR');
  }
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) return String(value);
  switch (format) {
    case 'PERCENT':
      return `${fmtBiNumber(numeric, precision ?? 1)} %`;
    case 'CURRENCY':
      return `${fmtBiNumber(numeric, precision ?? 0)} ${unit || 'DZD'}`;
    case 'DECIMAL':
      return `${fmtBiNumber(numeric, precision ?? 2)}${unit ? ` ${unit}` : ''}`;
    case 'QUANTITY':
      return `${fmtBiNumber(numeric, precision ?? 0)}${unit ? ` ${unit}` : ''}`;
    default:
      return `${fmtBiNumber(numeric, precision ?? 0)}${unit ? ` ${unit}` : ''}`;
  }
};

export const dimensionKeys = (result: BiQueryResult): string[] =>
  result.columns.filter(column => column.role === 'DIMENSION').map(column => column.key);

export const measureKeys = (result: BiQueryResult): string[] =>
  result.columns.filter(column => column.role === 'MEASURE').map(column => column.key);

const columnFormat = (result: BiQueryResult, key: string): BiValueFormat =>
  result.columns.find(column => column.key === key)?.format ?? 'NUMBER';

const columnUnit = (result: BiQueryResult, key: string): string =>
  result.columns.find(column => column.key === key)?.unit ?? '';

const columnLabel = (result: BiQueryResult, key: string): string =>
  result.columns.find(column => column.key === key)?.label ?? key;

const tooltipValue = (value: unknown): string => {
  if (typeof value === 'number') {
    return value.toLocaleString('fr-FR', { maximumFractionDigits: 2 });
  }
  return String(value ?? '');
};

/** Carte KPI compacte, utilisée dans les dashboards et la vue d'ensemble. */
export const BiKpiTile: React.FC<{
  label: string;
  value: string;
  hint?: string;
  tone?: 'blue' | 'emerald' | 'amber' | 'red' | 'violet' | 'slate';
  icon?: React.ElementType;
  target?: { value: number | null; target: number };
}> = ({ label, value, hint, tone = 'blue', icon: Icon = BarChart3, target }) => {
  const tones: Record<string, string> = {
    blue: 'text-blue-600 dark:text-blue-400',
    emerald: 'text-emerald-600 dark:text-emerald-400',
    amber: 'text-amber-600 dark:text-amber-400',
    red: 'text-red-600 dark:text-red-400',
    violet: 'text-violet-600 dark:text-violet-400',
    slate: 'text-slate-600 dark:text-slate-300',
  };
  const percent =
    target && target.value !== null && target.target > 0
      ? Math.max(0, Math.min(100, (target.value / target.target) * 100))
      : null;
  return (
    <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
        <Icon className={`w-3.5 h-3.5 ${tones[tone]}`} />
        <span className="truncate">{label}</span>
      </div>
      <div className={`mt-1 text-lg font-bold leading-tight ${tones[tone]}`}>{value}</div>
      {percent !== null && (
        <div className="mt-1.5">
          <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded overflow-hidden">
            <div
              className={`h-full rounded ${
                percent >= 100 ? 'bg-emerald-500' : percent >= 80 ? 'bg-amber-500' : 'bg-red-500'
              }`}
              style={{ width: `${percent}%` }}
            />
          </div>
          <div className="text-[9.5px] text-slate-400 mt-0.5">
            Objectif {fmtBiNumber(target?.target ?? 0, 0)} — {fmtBiNumber(percent, 0)} %
          </div>
        </div>
      )}
      {hint && <div className="text-[10px] text-slate-400 mt-0.5 truncate">{hint}</div>}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Graphiques
// ---------------------------------------------------------------------------

const ChartShell: React.FC<{ height: number; children: React.ReactNode }> = ({ height, children }) => (
  <div style={{ width: '100%', height }}>{children}</div>
);

const Histogram: React.FC<{ result: BiQueryResult; height: number; color?: string }> = ({
  result,
  height,
  color = BI_COLORS[0],
}) => {
  const measure = measureKeys(result)[0];
  const data = useMemo(() => {
    if (!measure) return [];
    const values = result.rows
      .map(row => Number(row[measure]))
      .filter(value => Number.isFinite(value));
    if (values.length === 0) return [];
    const min = Math.min(...values);
    const max = Math.max(...values);
    if (min === max) {
      return [{ bucket: fmtBiNumber(min, 0), count: values.length }];
    }
    const bucketCount = Math.min(12, Math.max(4, Math.ceil(Math.sqrt(values.length))));
    const width = (max - min) / bucketCount;
    const buckets = Array.from({ length: bucketCount }, (_, index) => ({
      bucket: `${fmtBiNumber(min + index * width, 0)} – ${fmtBiNumber(min + (index + 1) * width, 0)}`,
      count: 0,
    }));
    values.forEach(value => {
      const index = Math.min(bucketCount - 1, Math.floor((value - min) / width));
      buckets[index].count += 1;
    });
    return buckets;
  }, [result, measure]);

  if (data.length === 0) return <EmptyState title="Aucune valeur numérique à histogrammer" />;
  return (
    <ChartShell height={height}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="bucket" tick={{ fontSize: 9 }} interval={0} angle={-20} textAnchor="end" height={40} />
          <YAxis tick={{ fontSize: 9 }} allowDecimals={false} />
          <Tooltip formatter={tooltipValue} />
          <Bar dataKey="count" name="Occurrences" fill={color} radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartShell>
  );
};

const Gauge: React.FC<{ result: BiQueryResult; options?: { targetValue?: number }; height: number }> = ({
  result,
  options,
  height,
}) => {
  const measure = measureKeys(result)[0];
  const raw = result.rows.reduce((sum, row) => sum + Number(row[measure] ?? 0), 0);
  const value = Number.isFinite(raw) ? raw : 0;
  const target = options?.targetValue && options.targetValue > 0 ? options.targetValue : value > 0 ? value * 1.2 : 100;
  const percent = Math.max(0, Math.min(100, (value / target) * 100));
  const radius = 70;
  const circumference = Math.PI * radius;
  const filled = (percent / 100) * circumference;
  const tone = percent >= 100 ? '#059669' : percent >= 80 ? '#f59e0b' : '#dc2626';
  return (
    <div className="flex flex-col items-center justify-center" style={{ height }}>
      <svg viewBox="0 0 180 100" className="w-full max-w-[240px]">
        <path
          d="M 20 90 A 70 70 0 0 1 160 90"
          fill="none"
          stroke="#e2e8f0"
          strokeWidth="16"
          strokeLinecap="round"
        />
        <path
          d="M 20 90 A 70 70 0 0 1 160 90"
          fill="none"
          stroke={tone}
          strokeWidth="16"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference}`}
        />
        <text x="90" y="78" textAnchor="middle" fontSize="20" fontWeight="700" fill="#0f172a">
          {fmtBiNumber(value, 0)}
        </text>
        <text x="90" y="94" textAnchor="middle" fontSize="8" fill="#64748b">
          {columnUnit(result, measure) || columnLabel(result, measure)}
        </text>
      </svg>
      <div className="text-[10px] text-slate-500 mt-1">
        {fmtBiNumber(percent, 0)} % de la cible ({fmtBiNumber(target, 0)})
      </div>
    </div>
  );
};

const Heatmap: React.FC<{ result: BiQueryResult; height: number }> = ({ result, height }) => {
  const dims = dimensionKeys(result);
  const measure = measureKeys(result)[0];
  if (dims.length < 2 || !measure) {
    return (
      <EmptyState
        title="Carte thermique : deux dimensions et une mesure requises"
        hint="Choisissez par exemple Magasin et Catégorie, puis une mesure de stock."
      />
    );
  }
  const [rowKey, colKey] = dims;
  const rowValues = Array.from(new Set(result.rows.map(row => String(row[rowKey] ?? '—'))));
  const colValues = Array.from(new Set(result.rows.map(row => String(row[colKey] ?? '—'))));
  const lookup = new Map<string, number>();
  result.rows.forEach(row => {
    lookup.set(`${String(row[rowKey] ?? '—')}\u0001${String(row[colKey] ?? '—')}`, Number(row[measure] ?? 0));
  });
  const all = Array.from(lookup.values());
  const max = all.length > 0 ? Math.max(...all.map(value => Math.abs(value))) : 0;
  return (
    <div className="overflow-auto" style={{ maxHeight: height }}>
      <table className="w-full text-[10px] border-collapse">
        <thead>
          <tr>
            <th className="sticky left-0 bg-slate-50 dark:bg-slate-800 p-1.5 text-left font-semibold">
              {columnLabel(result, rowKey)}
            </th>
            {colValues.map(col => (
              <th key={col} className="p-1.5 font-semibold whitespace-nowrap bg-slate-50 dark:bg-slate-800">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rowValues.map(row => (
            <tr key={row}>
              <th className="sticky left-0 bg-white dark:bg-slate-900 p-1.5 text-left font-medium whitespace-nowrap border-t border-slate-100 dark:border-slate-800">
                {row}
              </th>
              {colValues.map(col => {
                const value = lookup.get(`${row}\u0001${col}`);
                const intensity = value !== undefined && max > 0 ? Math.abs(value) / max : 0;
                return (
                  <td
                    key={col}
                    className="p-1.5 text-center border-t border-slate-100 dark:border-slate-800"
                    style={{
                      backgroundColor: `rgba(37, 99, 235, ${0.06 + intensity * 0.7})`,
                      color: intensity > 0.55 ? '#ffffff' : '#0f172a',
                    }}
                    title={`${row} / ${col} : ${fmtBiNumber(value ?? 0, 2)}`}
                  >
                    {value === undefined ? '—' : fmtBiNumber(value, 0)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const Pivot: React.FC<{ result: BiQueryResult; height: number }> = ({ result, height }) => {
  const dims = dimensionKeys(result);
  const measure = measureKeys(result)[0];
  if (dims.length < 2 || !measure) {
    return (
      <EmptyState
        title="Tableau croisé : deux dimensions et une mesure requises"
        hint="Exemple : Magasin en lignes, Catégorie en colonnes, Stock disponible en valeurs."
      />
    );
  }
  const [rowKey, colKey] = dims;
  const rowValues = Array.from(new Set(result.rows.map(row => String(row[rowKey] ?? '—'))));
  const colValues = Array.from(new Set(result.rows.map(row => String(row[colKey] ?? '—'))));
  const lookup = new Map<string, number>();
  result.rows.forEach(row => {
    lookup.set(`${String(row[rowKey] ?? '—')}\u0001${String(row[colKey] ?? '—')}`, Number(row[measure] ?? 0));
  });
  const rowTotal = (row: string) =>
    colValues.reduce((sum, col) => sum + (lookup.get(`${row}\u0001${col}`) ?? 0), 0);
  const colTotal = (col: string) =>
    rowValues.reduce((sum, row) => sum + (lookup.get(`${row}\u0001${col}`) ?? 0), 0);
  const grandTotal = rowValues.reduce((sum, row) => sum + rowTotal(row), 0);
  return (
    <div className="overflow-auto" style={{ maxHeight: height }}>
      <table className="w-full text-[10.5px] border-collapse">
        <thead>
          <tr className="bg-slate-50 dark:bg-slate-800">
            <th className="p-1.5 text-left font-bold sticky left-0 bg-slate-50 dark:bg-slate-800">
              {columnLabel(result, rowKey)}
            </th>
            {colValues.map(col => (
              <th key={col} className="p-1.5 text-right font-bold whitespace-nowrap">
                {col}
              </th>
            ))}
            <th className="p-1.5 text-right font-bold">Total</th>
          </tr>
        </thead>
        <tbody>
          {rowValues.map(row => (
            <tr key={row} className="border-t border-slate-100 dark:border-slate-800">
              <th className="p-1.5 text-left font-medium sticky left-0 bg-white dark:bg-slate-900">{row}</th>
              {colValues.map(col => (
                <td key={col} className="p-1.5 text-right">
                  {lookup.has(`${row}\u0001${col}`) ? fmtBiNumber(lookup.get(`${row}\u0001${col}`) ?? 0, 2) : '—'}
                </td>
              ))}
              <td className="p-1.5 text-right font-semibold">{fmtBiNumber(rowTotal(row), 2)}</td>
            </tr>
          ))}
          <tr className="border-t-2 border-slate-200 dark:border-slate-700 font-bold">
            <th className="p-1.5 text-left sticky left-0 bg-slate-50 dark:bg-slate-800">Total</th>
            {colValues.map(col => (
              <td key={col} className="p-1.5 text-right">
                {fmtBiNumber(colTotal(col), 2)}
              </td>
            ))}
            <td className="p-1.5 text-right">{fmtBiNumber(grandTotal, 2)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export const BiDataTable: React.FC<{
  result: BiQueryResult;
  maxRows?: number;
  height?: number;
  compact?: boolean;
}> = ({ result, maxRows, height, compact }) => {
  const rows = typeof maxRows === 'number' ? result.rows.slice(0, maxRows) : result.rows;
  if (result.rows.length === 0) return <EmptyState icon={Inbox} title="Aucune donnée sur ce périmètre" />;
  return (
    <div className="overflow-auto" style={height ? { maxHeight: height } : undefined}>
      <table className="w-full text-left">
        <thead className="bg-slate-50 dark:bg-slate-800/60">
          <tr>
            {result.columns.map(column => (
              <th
                key={column.key}
                className={`px-2.5 ${compact ? 'py-1.5' : 'py-2'} text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 whitespace-nowrap ${
                  column.role === 'MEASURE' ? 'text-right' : ''
                }`}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {rows.map((row, index) => (
            <tr key={index} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
              {result.columns.map(column => (
                <td
                  key={column.key}
                  className={`px-2.5 ${compact ? 'py-1' : 'py-1.5'} text-[11px] text-slate-700 dark:text-slate-200 ${
                    column.role === 'MEASURE' ? 'text-right font-mono' : ''
                  }`}
                >
                  {column.role === 'MEASURE'
                    ? fmtBi(row[column.key] as number, column.format, column.unit)
                    : row[column.key] === null || row[column.key] === undefined
                      ? '—'
                      : String(row[column.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {typeof maxRows === 'number' && result.rows.length > maxRows && (
        <div className="px-2.5 py-1.5 text-[10px] text-slate-400">
          {maxRows} ligne(s) affichée(s) sur {result.totalRows}.
        </div>
      )}
    </div>
  );
};

/** Rendu générique d'un widget analytique, à partir du résultat réel du moteur. */
export const BiChart: React.FC<{
  type: BiWidgetType;
  result: BiQueryResult;
  height?: number;
  options?: {
    color?: string;
    showLegend?: boolean;
    showGrid?: boolean;
    stacked?: boolean;
    targetValue?: number;
    maxRows?: number;
  };
}> = ({ type, result, height = 240, options }) => {
  const dims = dimensionKeys(result);
  const measures = measureKeys(result);
  const xKey = dims[0];
  const color = options?.color ?? BI_COLORS[0];
  const showLegend = options?.showLegend ?? measures.length > 1;
  const showGrid = options?.showGrid ?? true;

  if (result.rows.length === 0) {
    return <EmptyState icon={Inbox} title="Aucune donnée sur ce périmètre" hint="Vérifiez la période et les filtres." />;
  }

  if (type === 'KPI') {
    const key = measures[0];
    const value = result.rows.reduce((sum, row) => sum + Number(row[key] ?? 0), 0);
    return (
      <div className="flex flex-col items-center justify-center" style={{ height }}>
        <div className="text-3xl font-bold text-blue-700 dark:text-blue-300">
          {fmtBi(value, columnFormat(result, key), columnUnit(result, key))}
        </div>
        <div className="text-[10.5px] text-slate-500 mt-1">{columnLabel(result, key)}</div>
      </div>
    );
  }

  if (type === 'TABLE') {
    return <BiDataTable result={result} maxRows={options?.maxRows} height={height} compact />;
  }

  if (type === 'PIVOT') return <Pivot result={result} height={height} />;
  if (type === 'HEATMAP') return <Heatmap result={result} height={height} />;
  if (type === 'HISTOGRAM') return <Histogram result={result} height={height} color={color} />;
  if (type === 'GAUGE') return <Gauge result={result} options={options} height={height} />;

  if (type === 'PIE' || type === 'DONUT') {
    const measure = measures[0];
    const data = result.rows.map(row => ({
      name: String(row[xKey] ?? '—'),
      value: Number(row[measure] ?? 0),
    }));
    return (
      <ChartShell height={height}>
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={type === 'DONUT' ? '52%' : 0}
              outerRadius="78%"
              paddingAngle={1}
            >
              {data.map((_, index) => (
                <Cell key={index} fill={BI_COLORS[index % BI_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={tooltipValue} />
            {showLegend && <Legend wrapperStyle={{ fontSize: 10 }} />}
          </PieChart>
        </ResponsiveContainer>
      </ChartShell>
    );
  }

  if (type === 'SCATTER') {
    const xMeasure = measures[0];
    const yMeasure = measures[1] ?? measures[0];
    const data = result.rows.map(row => ({
      x: Number(row[xMeasure] ?? 0),
      y: Number(row[yMeasure] ?? 0),
      name: String(row[xKey] ?? '—'),
    }));
    return (
      <ChartShell height={height}>
        <ResponsiveContainer>
          <ScatterChart margin={{ top: 10, right: 16, left: 0, bottom: 8 }}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />}
            <XAxis type="number" dataKey="x" tick={{ fontSize: 9 }} name={columnLabel(result, xMeasure)} />
            <YAxis type="number" dataKey="y" tick={{ fontSize: 9 }} name={columnLabel(result, yMeasure)} />
            <ZAxis range={[60, 60]} />
            <Tooltip
              formatter={tooltipValue}
              labelFormatter={(_, payload) => String(payload?.[0]?.payload?.name ?? '')}
            />
            <Scatter data={data} fill={color} />
          </ScatterChart>
        </ResponsiveContainer>
      </ChartShell>
    );
  }

  if (type === 'COMBO') {
    const [barMeasure, ...lineMeasures] = measures;
    return (
      <ChartShell height={height}>
        <ResponsiveContainer>
          <ComposedChart data={result.rows} margin={{ top: 10, right: 12, left: 0, bottom: 4 }}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />}
            <XAxis dataKey={xKey} tick={{ fontSize: 9 }} />
            <YAxis tick={{ fontSize: 9 }} />
            <Tooltip formatter={tooltipValue} />
            {showLegend && <Legend wrapperStyle={{ fontSize: 10 }} />}
            <Bar dataKey={barMeasure} name={columnLabel(result, barMeasure)} fill={color} radius={[3, 3, 0, 0]} />
            {lineMeasures.map((key, index) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                name={columnLabel(result, key)}
                stroke={BI_COLORS[(index + 1) % BI_COLORS.length]}
                strokeWidth={2}
                dot={false}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </ChartShell>
    );
  }

  if (type === 'LINE' || type === 'AREA') {
    const ChartComponent = type === 'AREA' ? AreaChart : LineChart;
    return (
      <ChartShell height={height}>
        <ResponsiveContainer>
          <ChartComponent data={result.rows} margin={{ top: 10, right: 12, left: 0, bottom: 4 }}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />}
            <XAxis dataKey={xKey} tick={{ fontSize: 9 }} />
            <YAxis tick={{ fontSize: 9 }} />
            <Tooltip formatter={tooltipValue} />
            {showLegend && <Legend wrapperStyle={{ fontSize: 10 }} />}
            {measures.map((key, index) =>
              type === 'AREA' ? (
                <Area
                  key={key}
                  type="monotone"
                  dataKey={key}
                  name={columnLabel(result, key)}
                  stroke={BI_COLORS[index % BI_COLORS.length]}
                  fill={BI_COLORS[index % BI_COLORS.length]}
                  fillOpacity={0.18}
                  strokeWidth={2}
                  stackId={options?.stacked ? 'stack' : undefined}
                />
              ) : (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  name={columnLabel(result, key)}
                  stroke={BI_COLORS[index % BI_COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                />
              )
            )}
          </ChartComponent>
        </ResponsiveContainer>
      </ChartShell>
    );
  }

  // BAR (horizontal) et COLUMN (vertical)
  return (
    <ChartShell height={height}>
      <ResponsiveContainer>
        <BarChart
          data={result.rows}
          layout={type === 'BAR' ? 'vertical' : 'horizontal'}
          margin={{ top: 10, right: 16, left: type === 'BAR' ? 8 : 0, bottom: 4 }}
        >
          {showGrid && (
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#e2e8f0"
              vertical={type === 'BAR'}
              horizontal={type !== 'BAR'}
            />
          )}
          {type === 'BAR' ? (
            <>
              <XAxis type="number" tick={{ fontSize: 9 }} />
              <YAxis type="category" dataKey={xKey} tick={{ fontSize: 9 }} width={110} />
            </>
          ) : (
            <>
              <XAxis dataKey={xKey} tick={{ fontSize: 9 }} />
              <YAxis tick={{ fontSize: 9 }} />
            </>
          )}
          <Tooltip formatter={tooltipValue} />
          {showLegend && <Legend wrapperStyle={{ fontSize: 10 }} />}
          {measures.map((key, index) => (
            <Bar
              key={key}
              dataKey={key}
              name={columnLabel(result, key)}
              fill={BI_COLORS[index % BI_COLORS.length]}
              radius={type === 'BAR' ? [0, 3, 3, 0] : [3, 3, 0, 0]}
              stackId={options?.stacked ? 'stack' : undefined}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </ChartShell>
  );
};

/** Bloc d'information contextuelle (périmètre, avertissements, fournisseur IA). */
export const BiNote: React.FC<{ tone?: 'info' | 'warning' | 'error'; children: React.ReactNode }> = ({
  tone = 'info',
  children,
}) => (
  <div
    className={`rounded-lg border px-3 py-2 text-[11px] ${
      tone === 'error'
        ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300'
        : tone === 'warning'
          ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
          : 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300'
    }`}
  >
    {children}
  </div>
);

/** Télécharge un contenu généré côté client (CSV, Excel, etc.). */
export const downloadBiContent = (fileName: string, content: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
};

/** Télécharge un fichier binaire généré côté client (présentation .pptx). */
export const downloadBiBinary = (fileName: string, data: ArrayBuffer, mimeType: string) => {
  const blob = new Blob([data], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
};

/** Ouvre une fenêtre d'impression (export PDF via « Enregistrer en PDF »). */
export const printBiHtml = (html: string): boolean => {
  const win = window.open('', '_blank', 'width=1100,height=800');
  if (!win) return false;
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  window.setTimeout(() => win.print(), 350);
  return true;
};
