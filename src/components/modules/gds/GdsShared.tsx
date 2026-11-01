/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * MAMORA GP — GDS : composants et formateurs partagés.
 * Aucune logique métier ici : uniquement présentation et formatage.
 */

import React from 'react';
import { Inbox } from 'lucide-react';
import { StockQualityStatus, STOCK_QUALITY_LABELS, UnitOfMeasure } from '../../../types';

export const UNIT_SHORT: Record<UnitOfMeasure, string> = {
  KG: 'kg',
  G: 'g',
  TONNE: 't',
  LITRE: 'L',
  ML: 'mL',
  UNITE: 'u',
  BOITE: 'bt',
  CARTON: 'ct',
  PALETTE: 'pal',
};

export const unitShort = (unit: UnitOfMeasure | undefined) => (unit ? UNIT_SHORT[unit] : '');

export const fmtQty = (value: number | undefined, digits = 0) => {
  if (value === undefined || value === null || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  }).format(value);
};

export const fmtQtyUnit = (value: number | undefined, unit: UnitOfMeasure | undefined) =>
  `${fmtQty(value, Math.abs(Number(value)) < 10 && Number(value) % 1 !== 0 ? 2 : 0)} ${unitShort(unit)}`.trim();

export const fmtDate = (value?: string) => {
  if (!value) return '—';
  const date = new Date(value.length <= 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export const fmtDateTime = (value?: string) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const todayIso = () => new Date().toISOString().slice(0, 10);

export const daysUntil = (dateIso?: string): number | undefined => {
  if (!dateIso) return undefined;
  const target = new Date(`${dateIso.slice(0, 10)}T00:00:00`).getTime();
  if (Number.isNaN(target)) return undefined;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target - today.getTime()) / 86_400_000);
};

export const inputCls =
  'px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:border-blue-500 focus:outline-hidden disabled:opacity-60';
export const labelCls = 'block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1';
export const cardCls =
  'bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800';
export const btnPrimary =
  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors';
export const btnGhost =
  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors';
export const btnDanger =
  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-900 text-red-600 dark:text-red-300 text-xs font-semibold hover:bg-red-50 dark:hover:bg-red-950/40 disabled:opacity-50 cursor-pointer transition-colors';
export const thCls =
  'px-2.5 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 whitespace-nowrap';
export const tdCls = 'px-2.5 py-2 text-[11px] text-slate-700 dark:text-slate-200 align-top';

export const GdsCard: React.FC<{
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}> = ({ title, subtitle, actions, children, className = '', bodyClassName = 'p-4' }) => (
  <section className={`${cardCls} ${className}`}>
    {(title || actions) && (
      <header className="flex items-start justify-between gap-3 px-4 pt-3.5 pb-2 border-b border-slate-100 dark:border-slate-800">
        <div className="min-w-0">
          {title && (
            <h3 className="text-[13px] font-bold text-slate-800 dark:text-slate-100 truncate">
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-1.5 shrink-0">{actions}</div>}
      </header>
    )}
    <div className={bodyClassName}>{children}</div>
  </section>
);

export const Kpi: React.FC<{
  label: string;
  value: React.ReactNode;
  icon: React.ElementType;
  tone?: string;
  hint?: string;
  onClick?: () => void;
}> = ({ label, value, icon: Icon, tone = 'text-blue-600', hint, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={!onClick}
    className={`text-left p-3 ${cardCls} ${
      onClick ? 'hover:border-blue-300 dark:hover:border-blue-700 cursor-pointer' : ''
    } transition-colors`}
  >
    <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
      <Icon className={`w-3.5 h-3.5 ${tone}`} />
      <span className="truncate">{label}</span>
    </div>
    <div className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100 leading-tight">
      {value}
    </div>
    {hint && <div className="text-[10px] text-slate-400 mt-0.5">{hint}</div>}
  </button>
);

const TONES: Record<string, string> = {
  slate: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  blue: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
  emerald:
    'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
  amber:
    'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
  red: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800',
  violet:
    'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800',
  indigo:
    'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800',
  orange:
    'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800',
};

export const Pill: React.FC<{
  tone?: keyof typeof TONES | string;
  children: React.ReactNode;
  title?: string;
}> = ({ tone = 'slate', children, title }) => (
  <span
    title={title}
    className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-semibold whitespace-nowrap ${
      TONES[tone] || TONES.slate
    }`}
  >
    {children}
  </span>
);

export const QUALITY_TONES: Record<StockQualityStatus, keyof typeof TONES> = {
  LIBERE: 'emerald',
  EN_ATTENTE_CONTROLE: 'amber',
  CONFORME: 'blue',
  NON_CONFORME: 'red',
  QUARANTAINE: 'orange',
  BLOQUE: 'red',
  REJETE: 'red',
};

export const QualityPill: React.FC<{ status: StockQualityStatus }> = ({ status }) => (
  <Pill tone={QUALITY_TONES[status]} title={STOCK_QUALITY_LABELS[status]}>
    {STOCK_QUALITY_LABELS[status]}
  </Pill>
);

export const EmptyState: React.FC<{ title: string; hint?: string; icon?: React.ElementType }> = ({
  title,
  hint,
  icon: Icon = Inbox,
}) => (
  <div className="flex flex-col items-center justify-center py-10 text-center">
    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-2">
      <Icon className="w-5 h-5 text-slate-400" />
    </div>
    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">{title}</p>
    {hint && <p className="text-[11px] text-slate-400 mt-0.5 max-w-md">{hint}</p>}
  </div>
);

export const SearchField: React.FC<{
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}> = ({ value, onChange, placeholder = 'Rechercher…', className = '' }) => (
  <div className={`relative ${className}`}>
    <input
      value={value}
      onChange={event => onChange(event.target.value)}
      placeholder={placeholder}
      className={`${inputCls} pl-7 w-full`}
      aria-label={placeholder}
    />
    <svg
      className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  </div>
);

export const Bar: React.FC<{ value: number; max: number; tone?: string }> = ({
  value,
  max,
  tone = 'bg-blue-500',
}) => (
  <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded overflow-hidden">
    <div
      className={`h-full ${tone} rounded`}
      style={{ width: `${Math.min(100, max > 0 ? (value / max) * 100 : 0)}%` }}
    />
  </div>
);

export const Notice: React.FC<{
  tone: 'error' | 'success' | 'info';
  message: string;
  onClose: () => void;
}> = ({ tone, message, onClose }) => (
  <div
    className={`flex items-start justify-between gap-3 px-4 py-2.5 rounded-lg border text-xs ${
      tone === 'error'
        ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-950/40 dark:border-red-800 dark:text-red-300'
        : tone === 'success'
          ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300'
          : 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-300'
    }`}
    role="status"
  >
    <span>{message}</span>
    <button
      type="button"
      onClick={onClose}
      aria-label="Fermer le message"
      className="p-0.5 rounded hover:bg-black/5 cursor-pointer shrink-0"
    >
      ✕
    </button>
  </div>
);

/** Export CSV générique (respecte les séparateurs et l'encodage français). */
export const downloadCsv = (filename: string, rows: Array<Array<string | number>>) => {
  const escape = (value: string | number) => {
    const text = String(value ?? '');
    return /[";\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const content = rows.map(row => row.map(escape).join(';')).join('\r\n');
  const blob = new Blob([`\uFEFF${content}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};
