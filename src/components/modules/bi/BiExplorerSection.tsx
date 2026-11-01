/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * MAMORA BI — Explorateur de données.
 * Requêtes structurées uniquement : sources, dimensions, mesures et filtres
 * issus d'une liste blanche. Aucun SQL libre, aucun code utilisateur.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
  Filter,
  Play,
  Presentation,
  Printer,
  SearchX,
  SlidersHorizontal,
} from 'lucide-react';
import {
  BI_SOURCES,
  BI_SOURCE_LIST,
} from '../../../services/bi/catalog';
import { storage } from '../../../services/storage';
import {
  BiFilter,
  BiFilterOperator,
  BiPeriod,
  BiPptxExportPreset,
  BiQuery,
  BiSourceId,
  User,
} from '../../../types';
import {
  EmptyState,
  GdsCard,
  Pill,
  btnGhost,
  btnPrimary,
  inputCls,
  labelCls,
  thCls,
} from '../gds/GdsShared';
import {
  BiDataTable,
  BiNote,
  downloadBiContent,
  fmtBiNumber,
  printBiHtml,
} from './BiShared';

const OPERATORS: Array<{ value: BiFilterOperator; label: string; needsValue: boolean }> = [
  { value: 'EQ', label: 'égal à', needsValue: true },
  { value: 'NE', label: 'différent de', needsValue: true },
  { value: 'GT', label: 'supérieur à', needsValue: true },
  { value: 'GTE', label: 'supérieur ou égal', needsValue: true },
  { value: 'LT', label: 'inférieur à', needsValue: true },
  { value: 'LTE', label: 'inférieur ou égal', needsValue: true },
  { value: 'IN', label: 'parmi (liste)', needsValue: true },
  { value: 'NOT_IN', label: 'exclu de (liste)', needsValue: true },
  { value: 'BETWEEN', label: 'entre (min, max)', needsValue: true },
  { value: 'CONTAINS', label: 'contient', needsValue: true },
  { value: 'STARTS_WITH', label: 'commence par', needsValue: true },
  { value: 'IS_NULL', label: 'est vide', needsValue: false },
  { value: 'IS_NOT_NULL', label: 'n’est pas vide', needsValue: false },
];

const PAGE_SIZE = 100;

const parseFilterValue = (operator: BiFilterOperator, raw: string): BiFilter['value'] => {
  if (operator === 'IS_NULL' || operator === 'IS_NOT_NULL') return undefined;
  if (operator === 'IN' || operator === 'NOT_IN' || operator === 'BETWEEN') {
    const parts = raw
      .split(',')
      .map(part => part.trim())
      .filter(Boolean);
    return parts.map(part => (Number.isFinite(Number(part)) && part !== '' ? Number(part) : part));
  }
  if (raw === '') return raw;
  return Number.isFinite(Number(raw)) && String(Number(raw)) === raw.trim() ? Number(raw) : raw;
};

interface ExplorerSectionProps {
  currentUser: User;
  period: BiPeriod;
  revision: number;
  onNotice: (message: string) => void;
  onError: (message: string) => void;
  /** Ouvre l'assistant PowerPoint sur la requête exécutée. */
  onExportPptx?: (preset: BiPptxExportPreset) => void;
}

export const BiExplorerSection: React.FC<ExplorerSectionProps> = ({
  currentUser,
  period,
  revision,
  onNotice,
  onError,
  onExportPptx,
}) => {
  const [sourceId, setSourceId] = useState<BiSourceId>('production');
  const source = BI_SOURCES[sourceId];
  const [dimensions, setDimensions] = useState<string[]>([...source.defaultDimensions]);
  const [measures, setMeasures] = useState<string[]>([...source.defaultMeasures]);
  const [filters, setFilters] = useState<BiFilter[]>([]);
  const [page, setPage] = useState(0);
  const [applied, setApplied] = useState(0);

  const canExport = storage.canBi('BI_EXPORT', currentUser);

  useEffect(() => {
    const next = BI_SOURCES[sourceId];
    setDimensions([...next.defaultDimensions]);
    setMeasures([...next.defaultMeasures]);
    setFilters([]);
    setPage(0);
  }, [sourceId]);

  const query: BiQuery = useMemo(() => {
    const nextFilters = [...filters];
    if (source.fields.some(field => field.key === 'date')) {
      if (period.from) nextFilters.push({ field: 'date', operator: 'GTE', value: period.from });
      if (period.to) nextFilters.push({ field: 'date', operator: 'LTE', value: period.to });
    }
    return {
      source: sourceId,
      dimensions,
      measures,
      filters: nextFilters,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    };
  }, [sourceId, source.fields, dimensions, measures, filters, period, page]);

  const execution = useMemo(() => {
    try {
      return { result: storage.runBiQuery(query), error: '' };
    } catch (error) {
      return { result: undefined, error: error instanceof Error ? error.message : String(error) };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, applied, revision]);

  const dimensionFields = source.fields.filter(field => field.role === 'DIMENSION');
  const measureFields = source.fields.filter(field => field.role === 'MEASURE');

  const toggle = (key: string, role: 'DIMENSION' | 'MEASURE') => {
    if (role === 'DIMENSION') {
      setDimensions(current => (current.includes(key) ? current.filter(item => item !== key) : [...current, key]));
    } else {
      setMeasures(current => (current.includes(key) ? current.filter(item => item !== key) : [...current, key]));
    }
    setPage(0);
  };

  const updateFilter = (index: number, patch: Partial<BiFilter>) => {
    setFilters(current =>
      current.map((filter, position) => (position === index ? { ...filter, ...patch } : filter))
    );
  };

  const addFilter = () => {
    const field = source.fields.find(candidate => candidate.role === 'DIMENSION') ?? source.fields[0];
    setFilters(current => [...current, { field: field.key, operator: 'EQ', value: '' }]);
  };

  const removeFilter = (index: number) => {
    setFilters(current => current.filter((_, position) => position !== index));
  };

  const run = () => {
    setPage(0);
    setApplied(value => value + 1);
  };

  const exportCsv = () => {
    try {
      const file = storage.exportBiQueryCsv(query, `mamora-bi-${sourceId}`);
      downloadBiContent(file.fileName, file.content, file.mimeType);
      onNotice(`Export CSV généré : ${file.fileName}.`);
    } catch (error) {
      onError(error instanceof Error ? error.message : String(error));
    }
  };

  const exportExcel = () => {
    try {
      const file = storage.exportBiQueryExcel(query, `mamora-bi-${sourceId}`);
      downloadBiContent(file.fileName, file.content, file.mimeType);
      onNotice(`Export Excel généré : ${file.fileName}.`);
    } catch (error) {
      onError(error instanceof Error ? error.message : String(error));
    }
  };

  const printPdf = () => {
    try {
      const html = storage.buildBiQueryPrintHtml(query, `Exploration — ${source.label}`);
      if (!printBiHtml(html)) {
        onError('La fenêtre d’impression a été bloquée par le navigateur.');
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : String(error));
    }
  };

  const result = execution.result;
  const totalPages = result ? Math.max(1, Math.ceil(result.totalRows / PAGE_SIZE)) : 1;

  return (
    <div className="space-y-3">
      <GdsCard
        title="Explorateur de données"
        subtitle="Toutes les requêtes sont validées par liste blanche et filtrées par votre périmètre magasin / service."
        actions={
          <div className="flex flex-wrap items-center gap-1.5">
            <button type="button" className={btnPrimary} onClick={run}>
              <Play className="w-3.5 h-3.5" /> Exécuter
            </button>
            {canExport && (
              <>
                <button type="button" className={btnGhost} onClick={exportCsv}>
                  <Download className="w-3.5 h-3.5" /> CSV
                </button>
                <button type="button" className={btnGhost} onClick={exportExcel}>
                  <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
                </button>
                <button type="button" className={btnGhost} onClick={printPdf}>
                  <Printer className="w-3.5 h-3.5" /> PDF
                </button>
                {onExportPptx && (
                  <button
                    type="button"
                    className={btnGhost}
                    disabled={!execution.result}
                    title={
                      execution.result
                        ? 'Exporter cette analyse vers PowerPoint'
                        : 'Exécutez la requête avant de l’exporter'
                    }
                    onClick={() =>
                      onExportPptx({
                        source: 'EXPLORER',
                        title: `${source.label} — ${measures.length} mesure(s)`,
                        query: { ...query, offset: 0 },
                      })
                    }
                  >
                    <Presentation className="w-3.5 h-3.5" /> PowerPoint
                  </button>
                )}
              </>
            )}
          </div>
        }
      >
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr_auto] gap-2 items-end">
            <div>
              <label className={labelCls}>Source analytique</label>
              <select
                className={`${inputCls} w-full`}
                value={sourceId}
                onChange={event => setSourceId(event.target.value as BiSourceId)}
              >
                {BI_SOURCE_LIST.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-400 mt-1">{source.description}</p>
            </div>
            <div>
              <label className={labelCls}>Période appliquée</label>
              <div className="text-[11px] px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {period.label ?? `${period.from ?? 'début'} → ${period.to ?? 'aujourd’hui'}`}
              </div>
            </div>
            <div className="text-[10.5px] text-slate-500">
              <Pill tone="blue">{source.domain}</Pill>
              <div className="mt-1">{result ? `${result.totalRows} ligne(s) agrégée(s)` : '—'}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-2.5">
              <div className="flex items-center gap-1 text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5" /> Dimensions
              </div>
              <div className="max-h-44 overflow-auto grid grid-cols-1 sm:grid-cols-2 gap-x-2 gap-y-0.5">
                {dimensionFields.map(field => (
                  <label key={field.key} className="flex items-start gap-1.5 text-[10.5px] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={dimensions.includes(field.key)}
                      onChange={() => toggle(field.key, 'DIMENSION')}
                      className="mt-0.5"
                    />
                    <span className="truncate" title={`${field.label} · ${field.group}`}>
                      {field.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
            <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-2.5">
              <div className="flex items-center gap-1 text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5" /> Mesures
              </div>
              <div className="max-h-44 overflow-auto grid grid-cols-1 sm:grid-cols-2 gap-x-2 gap-y-0.5">
                {measureFields.map(field => (
                  <label key={field.key} className="flex items-start gap-1.5 text-[10.5px] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={measures.includes(field.key)}
                      onChange={() => toggle(field.key, 'MEASURE')}
                      className="mt-0.5"
                    />
                    <span className="truncate" title={`${field.label} · ${field.unit ?? ''}`}>
                      {field.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-2.5">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1 text-[11px] font-bold text-slate-700 dark:text-slate-200">
                <Filter className="w-3.5 h-3.5" /> Filtres
              </div>
              <button type="button" className={btnGhost} onClick={addFilter}>
                + Filtre
              </button>
            </div>
            {filters.length === 0 ? (
              <p className="text-[10.5px] text-slate-400">
                Aucun filtre : la période globale s’applique aux sources datées.
              </p>
            ) : (
              <div className="space-y-1.5">
                {filters.map((filter, index) => {
                  const operator = OPERATORS.find(item => item.value === filter.operator) ?? OPERATORS[0];
                  const field = source.fields.find(candidate => candidate.key === filter.field);
                  const valueText = Array.isArray(filter.value)
                    ? filter.value.join(', ')
                    : filter.value === undefined || filter.value === null
                      ? ''
                      : String(filter.value);
                  return (
                    <div key={index} className="flex flex-wrap items-center gap-1.5">
                      <select
                        className={inputCls}
                        value={filter.field}
                        onChange={event => updateFilter(index, { field: event.target.value })}
                      >
                        {source.fields.map(candidate => (
                          <option key={candidate.key} value={candidate.key}>
                            {candidate.label}
                          </option>
                        ))}
                      </select>
                      <select
                        className={inputCls}
                        value={filter.operator}
                        onChange={event =>
                          updateFilter(index, { operator: event.target.value as BiFilterOperator })
                        }
                      >
                        {OPERATORS.map(item => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                      {operator.needsValue && (
                        <input
                          className={`${inputCls} min-w-32`}
                          value={valueText}
                          placeholder={
                            filter.operator === 'BETWEEN'
                              ? 'min, max'
                              : filter.operator === 'IN' || filter.operator === 'NOT_IN'
                                ? 'valeur1, valeur2'
                                : field?.type === 'date'
                                  ? 'AAAA-MM-JJ'
                                  : 'Valeur'
                          }
                          onChange={event =>
                            updateFilter(index, {
                              value: parseFilterValue(filter.operator, event.target.value),
                            })
                          }
                        />
                      )}
                      <button
                        type="button"
                        className="text-[10px] text-red-500 hover:underline"
                        onClick={() => removeFilter(index)}
                      >
                        Retirer
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </GdsCard>

      {execution.error && <BiNote tone="error">{execution.error}</BiNote>}

      {result ? (
        <GdsCard
          title={`Résultat — ${result.sourceLabel}`}
          subtitle={`${result.totalRows} ligne(s) agrégée(s) · page ${page + 1} / ${totalPages} · périmètre ${
            result.scope.allWarehouses ? 'tous magasins' : `${result.scope.warehouseIds.length} magasin(s)`
          }`}
          actions={
            <div className="flex items-center gap-1">
              <button
                type="button"
                className={btnGhost}
                disabled={page === 0}
                onClick={() => setPage(current => Math.max(0, current - 1))}
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Précédent
              </button>
              <button
                type="button"
                className={btnGhost}
                disabled={page + 1 >= totalPages}
                onClick={() => setPage(current => current + 1)}
              >
                Suivant <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          }
          bodyClassName="p-0"
        >
          {result.rows.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title="Aucune ligne pour cette requête"
              hint="Élargissez la période, retirez un filtre ou vérifiez la saisie des données opérationnelles."
            />
          ) : (
            <BiDataTable result={result} />
          )}
          {result.warnings.length > 0 && (
            <div className="p-2.5 border-t border-slate-100 dark:border-slate-800 space-y-1">
              {result.warnings.map((warning, index) => (
                <p key={index} className="text-[10px] text-amber-700 dark:text-amber-400">
                  ⚠ {warning}
                </p>
              ))}
            </div>
          )}
        </GdsCard>
      ) : (
        !execution.error && (
          <GdsCard>
            <EmptyState icon={Play} title="Lancez une requête" hint="Sélectionnez une source, des dimensions et des mesures." />
          </GdsCard>
        )
      )}

      <div className="text-[10px] text-slate-400">
        Les valeurs affichées sont agrégées par le moteur MAMORA BI. Aucune donnée métier n’est
        modifiée par l’explorateur. {fmtBiNumber(result?.totalRows ?? 0, 0)} ligne(s) au total.
      </div>
    </div>
  );
};
