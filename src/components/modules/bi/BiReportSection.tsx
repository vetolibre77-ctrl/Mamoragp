/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * MAMORA BI — Rapports : définition, exécution, export CSV / Excel / PDF.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  Copy,
  Download,
  FileSpreadsheet,
  FileText,
  Pencil,
  Plus,
  Presentation,
  Printer,
  Share2,
  Trash2,
} from 'lucide-react';
import { storage } from '../../../services/storage';
import { BI_SOURCES, BI_SOURCE_LIST } from '../../../services/bi/catalog';
import {
  BI_WIDGET_TYPE_LABELS,
  BiPeriod,
  BiPptxExportPreset,
  BiQueryResult,
  BiReport,
  BiSourceId,
  BiWidgetType,
  User,
} from '../../../types';
import { Modal } from '../../common/Modal';
import {
  EmptyState,
  GdsCard,
  Pill,
  btnDanger,
  btnGhost,
  btnPrimary,
  inputCls,
  labelCls,
} from '../gds/GdsShared';
import { BiChart, BiDataTable, BiNote, downloadBiContent, printBiHtml } from './BiShared';
import { ShareEditor, layoutError } from './BiDashboardSection';

interface ReportSectionProps {
  currentUser: User;
  period: BiPeriod;
  revision: number;
  onNotice: (message: string) => void;
  onError: (message: string) => void;
  onChanged: () => void;
  /** Ouvre l'assistant PowerPoint sur le rapport sélectionné. */
  onExportPptx?: (preset: BiPptxExportPreset) => void;
}

interface ReportForm {
  id?: string;
  name: string;
  description: string;
  source: BiSourceId;
  dimensions: string[];
  measures: string[];
  visualization: BiWidgetType;
  comments: string;
}

const emptyReport = (): ReportForm => ({
  name: '',
  description: '',
  source: 'production',
  dimensions: ['monthLabel'],
  measures: ['totalCans', 'conformingCans'],
  visualization: 'COLUMN',
  comments: '',
});

const REPORT_TYPES: BiWidgetType[] = [
  'TABLE', 'COLUMN', 'BAR', 'LINE', 'AREA', 'PIE', 'DONUT', 'COMBO', 'PIVOT', 'HEATMAP', 'KPI',
];

export const BiReportSection: React.FC<ReportSectionProps> = ({
  currentUser,
  period,
  revision,
  onNotice,
  onError,
  onChanged,
  onExportPptx,
}) => {
  const reports = useMemo(() => {
    try {
      return storage.getBiReports(currentUser);
    } catch {
      return [];
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, revision]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<ReportForm>(emptyReport());
  const [formError, setFormError] = useState('');
  const [shareOpen, setShareOpen] = useState(false);

  const selected = reports.find(report => report.id === selectedId) ?? reports[0] ?? null;

  const execution = useMemo(() => {
    if (!selected) return { result: undefined, error: '' };
    try {
      return { result: storage.runBiReport(selected.id, period), error: '' };
    } catch (error) {
      return { result: undefined, error: error instanceof Error ? error.message : String(error) };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, period, revision]);

  const canCreate = storage.canBi('BI_REPORT_CREATE', currentUser);
  const canExport = storage.canBi('BI_EXPORT', currentUser);
  const canShare = storage.canBi('BI_SHARE', currentUser);

  useEffect(() => {
    if (!selectedId && reports.length > 0) setSelectedId(reports[0].id);
  }, [reports, selectedId]);

  const openCreate = () => {
    setForm(emptyReport());
    setFormError('');
    setFormOpen(true);
  };

  const openEdit = (report: BiReport) => {
    setForm({
      id: report.id,
      name: report.name,
      description: report.description,
      source: report.source,
      dimensions: [...report.dimensions],
      measures: [...report.measures],
      visualization: report.visualization,
      comments: report.comments,
    });
    setFormError('');
    setFormOpen(true);
  };

  const submit = () => {
    const validation = layoutError({
      type: form.visualization,
      dimensions: form.dimensions,
      measures: form.measures,
    });
    if (validation) {
      setFormError(validation);
      return;
    }
    try {
      if (form.id) {
        storage.updateBiReport(form.id, {
          name: form.name,
          description: form.description,
          source: form.source,
          dimensions: form.dimensions,
          measures: form.measures,
          visualization: form.visualization,
          comments: form.comments,
        });
        onNotice(`Rapport « ${form.name} » mis à jour.`);
      } else {
        const created = storage.createBiReport({
          name: form.name,
          description: form.description,
          source: form.source,
          dimensions: form.dimensions,
          measures: form.measures,
          visualization: form.visualization,
          comments: form.comments,
        });
        setSelectedId(created.id);
        onNotice(`Rapport « ${created.name} » créé.`);
      }
      setFormOpen(false);
      onChanged();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : String(error));
    }
  };

  const duplicate = (report: BiReport) => {
    try {
      const copy = storage.duplicateBiReport(report.id);
      setSelectedId(copy.id);
      onChanged();
      onNotice(`Rapport dupliqué : « ${copy.name} ».`);
    } catch (error) {
      onError(error instanceof Error ? error.message : String(error));
    }
  };

  const remove = (report: BiReport) => {
    try {
      storage.deleteBiReport(report.id);
      setSelectedId(null);
      onChanged();
      onNotice('Rapport supprimé.');
    } catch (error) {
      onError(error instanceof Error ? error.message : String(error));
    }
  };

  const exportCsv = () => {
    if (!selected) return;
    try {
      const file = storage.exportBiReportCsv(selected.id);
      downloadBiContent(file.fileName, file.content, file.mimeType);
      onNotice(`Export CSV généré : ${file.fileName}.`);
    } catch (error) {
      onError(error instanceof Error ? error.message : String(error));
    }
  };

  const exportExcel = () => {
    if (!selected) return;
    try {
      const file = storage.exportBiReportExcel(selected.id);
      downloadBiContent(file.fileName, file.content, file.mimeType);
      onNotice(`Export Excel généré : ${file.fileName}.`);
    } catch (error) {
      onError(error instanceof Error ? error.message : String(error));
    }
  };

  const printPdf = () => {
    if (!selected) return;
    try {
      const html = storage.buildBiReportPrintHtml(selected.id);
      if (!printBiHtml(html)) onError('La fenêtre d’impression a été bloquée par le navigateur.');
    } catch (error) {
      onError(error instanceof Error ? error.message : String(error));
    }
  };

  const source = BI_SOURCES[form.source];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[280px_1fr] gap-3">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide">Rapports</h3>
          {canCreate && (
            <button type="button" className={btnGhost} onClick={openCreate}>
              <Plus className="w-3.5 h-3.5" /> Créer
            </button>
          )}
        </div>
        <div className="space-y-1.5">
          {reports.map(report => (
            <button
              key={report.id}
              type="button"
              onClick={() => setSelectedId(report.id)}
              className={`w-full text-left px-3 py-2 rounded-lg border transition-colors ${
                selected?.id === report.id
                  ? 'border-blue-300 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/40'
                  : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800/60'
              }`}
            >
              <div className="text-[11.5px] font-semibold text-slate-800 dark:text-slate-100 truncate">{report.name}</div>
              <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                <FileText className="w-3 h-3" />
                {BI_SOURCES[report.source]?.label ?? report.source} · {BI_WIDGET_TYPE_LABELS[report.visualization]}
              </div>
            </button>
          ))}
        </div>
        {reports.length === 0 && (
          <EmptyState title="Aucun rapport" hint="Créez un rapport à partir d’une source autorisée." />
        )}
      </div>

      <div className="space-y-3 min-w-0">
        {!selected ? (
          <GdsCard>
            <EmptyState icon={FileText} title="Sélectionnez un rapport" hint="Les rapports partagés apparaissent ici." />
          </GdsCard>
        ) : (
          <>
            <GdsCard
              title={selected.name}
              subtitle={selected.description || 'Rapport analytique MAMORA BI'}
              actions={
                <div className="flex flex-wrap items-center gap-1.5">
                  {canCreate && (
                    <>
                      <button type="button" className={btnGhost} onClick={() => openEdit(selected)}>
                        <Pencil className="w-3.5 h-3.5" /> Modifier
                      </button>
                      <button type="button" className={btnGhost} onClick={() => duplicate(selected)}>
                        <Copy className="w-3.5 h-3.5" /> Dupliquer
                      </button>
                    </>
                  )}
                  {canShare && (
                    <button type="button" className={btnGhost} onClick={() => setShareOpen(true)}>
                      <Share2 className="w-3.5 h-3.5" /> Partager
                    </button>
                  )}
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
                          title="Exporter ce rapport vers PowerPoint"
                          onClick={() =>
                            onExportPptx({
                              source: 'REPORT',
                              reportId: selected.id,
                              title: selected.name,
                            })
                          }
                        >
                          <Presentation className="w-3.5 h-3.5" /> PowerPoint
                        </button>
                      )}
                    </>
                  )}
                  {canCreate && (
                    <button type="button" className={btnDanger} onClick={() => remove(selected)}>
                      <Trash2 className="w-3.5 h-3.5" /> Supprimer
                    </button>
                  )}
                </div>
              }
            >
              <div className="flex flex-wrap items-center gap-2 text-[10.5px] text-slate-500">
                <Pill tone="blue">{BI_SOURCES[selected.source]?.label ?? selected.source}</Pill>
                <Pill tone="slate">{BI_WIDGET_TYPE_LABELS[selected.visualization]}</Pill>
                <span>Propriétaire : {selected.ownerName}</span>
                <span>·</span>
                <span>
                  {selected.dimensions.length} dimension(s), {selected.measures.length} mesure(s)
                </span>
                <span>·</span>
                <span>
                  Partagé avec {selected.sharedWithUserIds.length} utilisateur(s), {selected.sharedWithRoles.length} rôle(s)
                </span>
              </div>
              {selected.comments && (
                <p className="text-[11px] text-slate-500 mt-1.5">{selected.comments}</p>
              )}
            </GdsCard>

            {execution.error && <BiNote tone="error">{execution.error}</BiNote>}

            {execution.result && (
              <>
                <GdsCard
                  title="Visualisation"
                  subtitle={`${execution.result.totalRows} ligne(s) agrégée(s) · période ${
                    period.label ?? `${period.from ?? 'début'} → ${period.to ?? 'aujourd’hui'}`
                  }`}
                >
                  <BiChart
                    type={selected.visualization}
                    result={execution.result}
                    height={320}
                    options={{ showLegend: true, showGrid: true, maxRows: 50 }}
                  />
                </GdsCard>
                <GdsCard title="Données détaillées" bodyClassName="p-0">
                  <BiDataTable result={execution.result} maxRows={200} />
                </GdsCard>
              </>
            )}
          </>
        )}
      </div>

      <Modal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        title={form.id ? 'Modifier le rapport' : 'Nouveau rapport'}
        subtitle="Choisissez une source autorisée, des dimensions et des mesures."
        maxWidth="3xl"
      >
        <div className="space-y-3">
          {formError && <BiNote tone="error">{formError}</BiNote>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Nom</label>
              <input className={`${inputCls} w-full`} value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Visualisation</label>
              <select
                className={`${inputCls} w-full`}
                value={form.visualization}
                onChange={event => setForm({ ...form, visualization: event.target.value as BiWidgetType })}
              >
                {REPORT_TYPES.map(type => (
                  <option key={type} value={type}>
                    {BI_WIDGET_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className={labelCls}>Description</label>
            <input className={`${inputCls} w-full`} value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} />
          </div>
          <div>
            <label className={labelCls}>Source analytique</label>
            <select
              className={`${inputCls} w-full`}
              value={form.source}
              onChange={event => {
                const next = BI_SOURCES[event.target.value as BiSourceId];
                setForm({
                  ...form,
                  source: next.id,
                  dimensions: [...next.defaultDimensions],
                  measures: [...next.defaultMeasures],
                });
              }}
            >
              {BI_SOURCE_LIST.map(item => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-2.5">
              <p className="text-[11px] font-bold mb-1.5">Dimensions</p>
              <div className="max-h-44 overflow-auto space-y-1">
                {source.fields.filter(field => field.role === 'DIMENSION').map(field => (
                  <label key={field.key} className="flex items-center gap-1.5 text-[10.5px] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.dimensions.includes(field.key)}
                      onChange={event =>
                        setForm({
                          ...form,
                          dimensions: event.target.checked
                            ? [...form.dimensions, field.key]
                            : form.dimensions.filter(key => key !== field.key),
                        })
                      }
                    />
                    {field.label}
                  </label>
                ))}
              </div>
            </div>
            <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-2.5">
              <p className="text-[11px] font-bold mb-1.5">Mesures</p>
              <div className="max-h-44 overflow-auto space-y-1">
                {source.fields.filter(field => field.role === 'MEASURE').map(field => (
                  <label key={field.key} className="flex items-center gap-1.5 text-[10.5px] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.measures.includes(field.key)}
                      onChange={event =>
                        setForm({
                          ...form,
                          measures: event.target.checked
                            ? [...form.measures, field.key]
                            : form.measures.filter(key => key !== field.key),
                        })
                      }
                    />
                    {field.label}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div>
            <label className={labelCls}>Commentaires</label>
            <textarea
              className={`${inputCls} w-full`}
              rows={2}
              value={form.comments}
              onChange={event => setForm({ ...form, comments: event.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className={btnGhost} onClick={() => setFormOpen(false)}>
              Annuler
            </button>
            <button type="button" className={btnPrimary} onClick={submit} disabled={!form.name.trim()}>
              {form.id ? 'Enregistrer' : 'Créer le rapport'}
            </button>
          </div>
        </div>
      </Modal>

      <ShareEditor
        isOpen={shareOpen}
        resourceType="REPORT"
        resourceId={selected?.id ?? ''}
        currentUser={currentUser}
        onClose={() => setShareOpen(false)}
        onDone={() => {
          onChanged();
          onNotice('Partage enregistré. Les destinataires restent limités à leur périmètre.');
        }}
      />
    </div>
  );
};

export type { BiQueryResult };
