/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * MAMORA BI — Tableaux de bord : création, édition, duplication, partage,
 * glisser-déposer et redimensionnement des widgets.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BarChart3,
  Copy,
  GripVertical,
  LayoutDashboard,
  Pencil,
  Plus,
  Presentation,
  RefreshCw,
  Save,
  Share2,
  Trash2,
  X,
} from 'lucide-react';
import {
  BI_DASHBOARD_CATEGORY_LABELS,
  BI_WIDGET_TYPE_LABELS,
  BiDashboard,
  BiDashboardCategory,
  BiPeriod,
  BiPptxExportPreset,
  BiQueryResult,
  BiSourceId,
  BiWidget,
  BiWidgetType,
  User,
  getRoleLabel,
} from '../../../types';
import { BI_SOURCES, BI_SOURCE_LIST, buildDefaultBiDashboards } from '../../../services/bi/catalog';
import { storage } from '../../../services/storage';
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
import { BiChart, BiNote, fmtBiNumber } from './BiShared';

const ROW_HEIGHT = 84;
const GRID_COLUMNS = 12;

const cloneDashboard = (dashboard: BiDashboard): BiDashboard =>
  JSON.parse(JSON.stringify(dashboard)) as BiDashboard;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const layoutError = (widget: Pick<BiWidget, 'type' | 'dimensions' | 'measures'>): string | null => {
  if (widget.dimensions.length === 0 && widget.measures.length === 0) {
    return 'Sélectionnez au moins une dimension ou une mesure.';
  }
  if (['PIE', 'DONUT', 'BAR', 'COLUMN', 'LINE', 'AREA'].includes(widget.type) && widget.dimensions.length === 0) {
    return 'Ce graphique nécessite au moins une dimension.';
  }
  if (['PIE', 'DONUT', 'GAUGE', 'KPI', 'HISTOGRAM'].includes(widget.type) && widget.measures.length === 0) {
    return 'Ce graphique nécessite au moins une mesure.';
  }
  if (['PIVOT', 'HEATMAP'].includes(widget.type) && widget.dimensions.length < 2) {
    return 'Ce graphique nécessite deux dimensions.';
  }
  if (widget.type === 'SCATTER' && widget.measures.length < 2) {
    return 'Le nuage de points nécessite deux mesures.';
  }
  return null;
};

// ---------------------------------------------------------------------------
// Éditeur de widget
// ---------------------------------------------------------------------------

interface WidgetEditorProps {
  isOpen: boolean;
  widget: BiWidget | null;
  onClose: () => void;
  onSave: (widget: BiWidget) => void;
}

const WidgetEditor: React.FC<WidgetEditorProps> = ({ isOpen, widget, onClose, onSave }) => {
  const [draft, setDraft] = useState<BiWidget | null>(widget);
  const [error, setError] = useState('');

  useEffect(() => {
    setDraft(widget ? { ...widget, dimensions: [...widget.dimensions], measures: [...widget.measures] } : null);
    setError('');
  }, [widget, isOpen]);

  if (!draft) return null;
  const source = BI_SOURCES[draft.source];
  const dimensionFields = source.fields.filter(field => field.role === 'DIMENSION');
  const measureFields = source.fields.filter(field => field.role === 'MEASURE');

  const toggle = (key: string, role: 'DIMENSION' | 'MEASURE') => {
    setDraft(current => {
      if (!current) return current;
      const list = role === 'DIMENSION' ? current.dimensions : current.measures;
      const next = list.includes(key) ? list.filter(item => item !== key) : [...list, key];
      return role === 'DIMENSION'
        ? { ...current, dimensions: next }
        : { ...current, measures: next };
    });
  };

  const submit = () => {
    const validation = layoutError(draft);
    if (validation) {
      setError(validation);
      return;
    }
    onSave({
      ...draft,
      title: draft.title.trim() || BI_WIDGET_TYPE_LABELS[draft.type],
    });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Widget analytique" subtitle="Source, dimensions, mesures et options d'affichage." maxWidth="3xl">
      <div className="space-y-4">
        {error && <BiNote tone="error">{error}</BiNote>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Titre</label>
            <input
              className={`${inputCls} w-full`}
              value={draft.title}
              onChange={event => setDraft({ ...draft, title: event.target.value })}
              placeholder="Titre du widget"
            />
          </div>
          <div>
            <label className={labelCls}>Type de visualisation</label>
            <select
              className={`${inputCls} w-full`}
              value={draft.type}
              onChange={event => setDraft({ ...draft, type: event.target.value as BiWidgetType })}
            >
              {(Object.keys(BI_WIDGET_TYPE_LABELS) as BiWidgetType[]).map(type => (
                <option key={type} value={type}>
                  {BI_WIDGET_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Source analytique autorisée</label>
            <select
              className={`${inputCls} w-full`}
              value={draft.source}
              onChange={event => {
                const nextSource = event.target.value as BiSourceId;
                const next = BI_SOURCES[nextSource];
                setDraft({
                  ...draft,
                  source: nextSource,
                  dimensions: [...next.defaultDimensions],
                  measures: [...next.defaultMeasures],
                  filters: [],
                });
              }}
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
            <label className={labelCls}>Limite de lignes</label>
            <input
              type="number"
              min={1}
              max={2000}
              className={`${inputCls} w-full`}
              value={draft.limit ?? 200}
              onChange={event =>
                setDraft({ ...draft, limit: Math.max(1, Math.min(2000, Number(event.target.value) || 1)) })
              }
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-2.5">
            <p className="text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1.5">Dimensions</p>
            <div className="max-h-52 overflow-auto space-y-1">
              {dimensionFields.map(field => (
                <label key={field.key} className="flex items-start gap-1.5 text-[11px] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={draft.dimensions.includes(field.key)}
                    onChange={() => toggle(field.key, 'DIMENSION')}
                    className="mt-0.5"
                  />
                  <span>
                    {field.label}
                    <span className="text-slate-400"> · {field.group}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
          <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-2.5">
            <p className="text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1.5">Mesures</p>
            <div className="max-h-52 overflow-auto space-y-1">
              {measureFields.map(field => (
                <label key={field.key} className="flex items-start gap-1.5 text-[11px] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={draft.measures.includes(field.key)}
                    onChange={() => toggle(field.key, 'MEASURE')}
                    className="mt-0.5"
                  />
                  <span>
                    {field.label}
                    {field.unit ? <span className="text-slate-400"> · {field.unit}</span> : null}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-[11px]">
          <label className="inline-flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={draft.options?.showLegend ?? true}
              onChange={event =>
                setDraft({ ...draft, options: { ...draft.options, showLegend: event.target.checked } })
              }
            />
            Légende
          </label>
          <label className="inline-flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={draft.options?.showGrid ?? true}
              onChange={event =>
                setDraft({ ...draft, options: { ...draft.options, showGrid: event.target.checked } })
              }
            />
            Grille
          </label>
          <label className="inline-flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={draft.options?.stacked ?? false}
              onChange={event =>
                setDraft({ ...draft, options: { ...draft.options, stacked: event.target.checked } })
              }
            />
            Empilé
          </label>
          {(draft.type === 'GAUGE' || draft.type === 'KPI') && (
            <label className="inline-flex items-center gap-1.5">
              Cible
              <input
                type="number"
                className={`${inputCls} w-24`}
                value={draft.options?.targetValue ?? 0}
                onChange={event =>
                  setDraft({
                    ...draft,
                    options: { ...draft.options, targetValue: Number(event.target.value) || 0 },
                  })
                }
              />
            </label>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <button type="button" className={btnGhost} onClick={onClose}>
            Annuler
          </button>
          <button type="button" className={btnPrimary} onClick={submit}>
            <Save className="w-3.5 h-3.5" /> Appliquer au brouillon
          </button>
        </div>
        <p className="text-[10px] text-slate-400">
          Le widget n'est enregistré qu'après « Enregistrer » sur le tableau de bord.
        </p>
      </div>
    </Modal>
  );
};

// ---------------------------------------------------------------------------
// Partage
// ---------------------------------------------------------------------------

export const ShareEditor: React.FC<{
  isOpen: boolean;
  resourceType: 'DASHBOARD' | 'REPORT';
  resourceId: string;
  currentUser: User;
  onClose: () => void;
  onDone: () => void;
}> = ({ isOpen, resourceType, resourceId, currentUser, onClose, onDone }) => {
  const users = useMemo(() => storage.getUsers().filter(user => user.id !== currentUser.id), []);
  const roles = useMemo(
    () => Array.from(new Set(storage.getUsers().map(user => user.role))),
    []
  );
  const [userIds, setUserIds] = useState<string[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    setUserIds([]);
    setSelectedRoles([]);
    setError('');
  }, [isOpen, resourceId]);

  const submit = () => {
    try {
      storage.shareBiResource(resourceType, resourceId, userIds, selectedRoles as never);
      onDone();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Partager" subtitle="Le partage ne contourne jamais le périmètre magasin / service." maxWidth="lg">
      <div className="space-y-3">
        {error && <BiNote tone="error">{error}</BiNote>}
        <div>
          <p className={labelCls}>Utilisateurs</p>
          <div className="max-h-40 overflow-auto border border-slate-200 dark:border-slate-800 rounded-lg p-2 space-y-1">
            {users.map(user => (
              <label key={user.id} className="flex items-center gap-2 text-[11px] cursor-pointer">
                <input
                  type="checkbox"
                  checked={userIds.includes(user.id)}
                  onChange={event =>
                    setUserIds(prev =>
                      event.target.checked ? [...prev, user.id] : prev.filter(id => id !== user.id)
                    )
                  }
                />
                {user.name} <span className="text-slate-400">· {getRoleLabel(user.role)}</span>
              </label>
            ))}
          </div>
        </div>
        <div>
          <p className={labelCls}>Rôles</p>
          <div className="flex flex-wrap gap-1.5">
            {roles.map(role => (
              <label
                key={role}
                className="inline-flex items-center gap-1.5 text-[10.5px] px-2 py-1 rounded border border-slate-200 dark:border-slate-700 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedRoles.includes(role)}
                  onChange={event =>
                    setSelectedRoles(prev =>
                      event.target.checked ? [...prev, role] : prev.filter(item => item !== role)
                    )
                  }
                />
                {getRoleLabel(role)}
              </label>
            ))}
          </div>
        </div>
        <BiNote>
          Chaque destinataire ne voit que les données de son propre périmètre, même s'il ouvre un
          widget partagé.
        </BiNote>
        <div className="flex justify-end gap-2">
          <button type="button" className={btnGhost} onClick={onClose}>
            Annuler
          </button>
          <button type="button" className={btnPrimary} onClick={submit}>
            <Share2 className="w-3.5 h-3.5" /> Partager
          </button>
        </div>
      </div>
    </Modal>
  );
};

// ---------------------------------------------------------------------------
// Section principale
// ---------------------------------------------------------------------------

interface DashboardSectionProps {
  currentUser: User;
  period: BiPeriod;
  revision: number;
  onNotice: (message: string) => void;
  onError: (message: string) => void;
  onChanged: () => void;
  /** Ouvre l'assistant PowerPoint sur le tableau de bord affiché. */
  onExportPptx?: (preset: BiPptxExportPreset) => void;
}

export const BiDashboardSection: React.FC<DashboardSectionProps> = ({
  currentUser,
  period,
  revision,
  onNotice,
  onError,
  onChanged,
  onExportPptx,
}) => {
  const dashboards = useMemo(() => {
    const list = storage.getBiDashboards(currentUser);
    return list.length > 0 ? list : buildDefaultBiDashboards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, revision]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<BiDashboard | null>(null);
  const [widgetEditor, setWidgetEditor] = useState<BiWidget | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [createCategory, setCreateCategory] = useState<BiDashboardCategory>('CUSTOM');
  const [shareOpen, setShareOpen] = useState(false);
  const [createError, setCreateError] = useState('');
  const gridRef = useRef<HTMLDivElement | null>(null);
  const dragIdRef = useRef<string | null>(null);

  const selected = dashboards.find(dashboard => dashboard.id === selectedId) ?? dashboards[0] ?? null;
  const activeDashboard = editing && draft ? draft : selected;
  const canEdit = storage.canBi('BI_DASHBOARD_EDIT', currentUser);
  const canCreate = storage.canBi('BI_DASHBOARD_CREATE', currentUser);
  const canDelete = storage.canBi('BI_DASHBOARD_DELETE', currentUser);
  const canShare = storage.canBi('BI_SHARE', currentUser);
  const canExportPptx = storage.canBi('BI_EXPORT', currentUser);

  useEffect(() => {
    if (!selectedId && dashboards.length > 0) setSelectedId(dashboards[0].id);
  }, [dashboards, selectedId]);

  useEffect(() => {
    setEditing(false);
    setDraft(null);
  }, [selectedId]);

  const results = useMemo(() => {
    const map: Record<string, { result?: BiQueryResult; error?: string }> = {};
    if (!activeDashboard) return map;
    activeDashboard.widgets.forEach(widget => {
      try {
        map[widget.id] = { result: storage.runBiWidget(widget, period) };
      } catch (error) {
        map[widget.id] = { error: error instanceof Error ? error.message : String(error) };
      }
    });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDashboard, period, revision]);

  const beginEdit = () => {
    if (!selected) return;
    setDraft(cloneDashboard(selected));
    setEditing(true);
  };

  const updateWidget = (widgetId: string, patch: Partial<BiWidget>) => {
    setDraft(current =>
      current
        ? {
            ...current,
            widgets: current.widgets.map(widget =>
              widget.id === widgetId ? { ...widget, ...patch } : widget
            ),
          }
        : current
    );
  };

  const saveDraft = () => {
    if (!draft) return;
    try {
      storage.updateBiDashboard(draft.id, {
        name: draft.name,
        description: draft.description,
        category: draft.category,
        widgets: draft.widgets,
      });
      setEditing(false);
      setDraft(null);
      onChanged();
      onNotice(`Tableau de bord « ${draft.name} » enregistré.`);
    } catch (error) {
      onError(error instanceof Error ? error.message : String(error));
    }
  };

  const cancelEdit = () => {
    setEditing(false);
    setDraft(null);
  };

  const addWidget = () => {
    if (!draft) return;
    const source = BI_SOURCES.production;
    const next: BiWidget = {
      id: `BI-WGT-${Date.now().toString(36).toUpperCase()}`,
      type: 'COLUMN',
      title: 'Nouveau widget',
      source: 'production',
      dimensions: [...source.defaultDimensions],
      measures: [...source.defaultMeasures],
      filters: [],
      layout: { x: 0, y: (draft.widgets.reduce((max, widget) => Math.max(max, widget.layout.y + widget.layout.h), 0)), w: 6, h: 4 },
      limit: 200,
      options: { showLegend: true, showGrid: true },
    };
    setDraft({ ...draft, widgets: [...draft.widgets, next] });
    setWidgetEditor(next);
  };

  const removeWidget = (widgetId: string) => {
    setDraft(current =>
      current ? { ...current, widgets: current.widgets.filter(widget => widget.id !== widgetId) } : current
    );
  };

  const duplicateWidget = (widget: BiWidget) => {
    if (!draft) return;
    const copy: BiWidget = {
      ...widget,
      id: `BI-WGT-${Date.now().toString(36).toUpperCase()}`,
      title: `${widget.title} (copie)`,
      layout: { ...widget.layout, y: widget.layout.y + widget.layout.h },
    };
    setDraft({ ...draft, widgets: [...draft.widgets, copy] });
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const widgetId = dragIdRef.current;
    dragIdRef.current = null;
    const container = gridRef.current;
    if (!widgetId || !container || !draft) return;
    const widget = draft.widgets.find(candidate => candidate.id === widgetId);
    if (!widget) return;
    const rect = container.getBoundingClientRect();
    const cellWidth = rect.width / GRID_COLUMNS;
    const x = clamp(Math.round((event.clientX - rect.left) / cellWidth), 0, GRID_COLUMNS - widget.layout.w);
    const y = Math.max(0, Math.round((event.clientY - rect.top) / ROW_HEIGHT));
    updateWidget(widgetId, { layout: { ...widget.layout, x, y } });
  };

  const beginResize = (event: React.PointerEvent<HTMLDivElement>, widget: BiWidget) => {
    event.preventDefault();
    event.stopPropagation();
    const container = gridRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const startX = event.clientX;
    const startY = event.clientY;
    const startW = widget.layout.w;
    const startH = widget.layout.h;
    const move = (moveEvent: PointerEvent) => {
      const dw = Math.round((moveEvent.clientX - startX) / (rect.width / GRID_COLUMNS));
      const dh = Math.round((moveEvent.clientY - startY) / ROW_HEIGHT);
      updateWidget(widget.id, {
        layout: {
          ...widget.layout,
          w: clamp(startW + dw, 2, GRID_COLUMNS - widget.layout.x),
          h: clamp(startH + dh, 2, 12),
        },
      });
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const submitCreate = () => {
    try {
      const created = storage.createBiDashboard({
        name: createName,
        description: createDescription,
        category: createCategory,
        widgets: [],
      });
      setCreateOpen(false);
      setCreateName('');
      setCreateDescription('');
      setCreateCategory('CUSTOM');
      setCreateError('');
      setSelectedId(created.id);
      onChanged();
      onNotice(`Tableau de bord « ${created.name} » créé.`);
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : String(error));
    }
  };

  const duplicateDashboard = () => {
    if (!selected) return;
    try {
      const copy = storage.duplicateBiDashboard(selected.id);
      setSelectedId(copy.id);
      onChanged();
      onNotice(`Tableau de bord dupliqué : « ${copy.name} ».`);
    } catch (error) {
      onError(error instanceof Error ? error.message : String(error));
    }
  };

  const deleteDashboard = () => {
    if (!selected) return;
    try {
      storage.deleteBiDashboard(selected.id);
      setSelectedId(null);
      onChanged();
      onNotice('Tableau de bord supprimé.');
    } catch (error) {
      onError(error instanceof Error ? error.message : String(error));
    }
  };

  const maxRow = activeDashboard
    ? activeDashboard.widgets.reduce((max, widget) => Math.max(max, widget.layout.y + widget.layout.h), 0)
    : 0;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[260px_1fr] gap-3">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide">
            Tableaux de bord
          </h3>
          {canCreate && (
            <button type="button" className={btnGhost} onClick={() => setCreateOpen(true)}>
              <Plus className="w-3.5 h-3.5" /> Créer
            </button>
          )}
        </div>
        <div className="space-y-1.5">
          {dashboards.map(dashboard => (
            <button
              key={dashboard.id}
              type="button"
              onClick={() => setSelectedId(dashboard.id)}
              className={`w-full text-left px-3 py-2 rounded-lg border transition-colors ${
                selected?.id === dashboard.id
                  ? 'border-blue-300 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/40'
                  : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-[11.5px] font-semibold text-slate-800 dark:text-slate-100 truncate">
                  {dashboard.name}
                </span>
                {dashboard.isDefault && <Pill tone="blue">livré</Pill>}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                <LayoutDashboard className="w-3 h-3" />
                {BI_DASHBOARD_CATEGORY_LABELS[dashboard.category]} · {dashboard.widgets.length} widget(s)
              </div>
            </button>
          ))}
        </div>
        {dashboards.length === 0 && (
          <EmptyState title="Aucun tableau de bord" hint="Créez votre premier tableau de bord." />
        )}
      </div>

      <div className="space-y-3 min-w-0">
        {!activeDashboard ? (
          <GdsCard>
            <EmptyState
              icon={LayoutDashboard}
              title="Sélectionnez un tableau de bord"
              hint="Les tableaux de bord livrés sont disponibles pour tous les profils autorisés."
            />
          </GdsCard>
        ) : (
          <>
            <GdsCard
              title={activeDashboard.name}
              subtitle={activeDashboard.description || 'Tableau de bord analytique MAMORA BI'}
              actions={
                <div className="flex flex-wrap items-center gap-1.5">
                  {editing ? (
                    <>
                      <button type="button" className={btnGhost} onClick={addWidget}>
                        <Plus className="w-3.5 h-3.5" /> Widget
                      </button>
                      <button type="button" className={btnGhost} onClick={cancelEdit}>
                        <X className="w-3.5 h-3.5" /> Annuler
                      </button>
                      <button type="button" className={btnPrimary} onClick={saveDraft}>
                        <Save className="w-3.5 h-3.5" /> Enregistrer
                      </button>
                    </>
                  ) : (
                    <>
                      {canEdit && (
                        <button type="button" className={btnGhost} onClick={beginEdit}>
                          <Pencil className="w-3.5 h-3.5" /> Modifier
                        </button>
                      )}
                      {canCreate && (
                        <button type="button" className={btnGhost} onClick={duplicateDashboard}>
                          <Copy className="w-3.5 h-3.5" /> Dupliquer
                        </button>
                      )}
                      {canShare && (
                        <button type="button" className={btnGhost} onClick={() => setShareOpen(true)}>
                          <Share2 className="w-3.5 h-3.5" /> Partager
                        </button>
                      )}
                      {canExportPptx && onExportPptx && (
                        <button
                          type="button"
                          className={btnGhost}
                          title="Exporter ce tableau de bord vers PowerPoint"
                          onClick={() =>
                            onExportPptx({
                              source: 'DASHBOARD',
                              dashboardId: activeDashboard.id,
                              title: activeDashboard.name,
                            })
                          }
                        >
                          <Presentation className="w-3.5 h-3.5" /> PowerPoint
                        </button>
                      )}
                      {canDelete && !activeDashboard.isDefault && (
                        <button type="button" className={btnDanger} onClick={deleteDashboard}>
                          <Trash2 className="w-3.5 h-3.5" /> Supprimer
                        </button>
                      )}
                    </>
                  )}
                </div>
              }
            >
              <div className="flex flex-wrap items-center gap-2 text-[10.5px] text-slate-500">
                <Pill tone="slate">{BI_DASHBOARD_CATEGORY_LABELS[activeDashboard.category]}</Pill>
                <span>Propriétaire : {activeDashboard.ownerName}</span>
                <span>·</span>
                <span>
                  Partagé avec {activeDashboard.sharedWithUserIds.length} utilisateur(s) et{' '}
                  {activeDashboard.sharedWithRoles.length} rôle(s)
                </span>
                {editing && (
                  <Pill tone="amber">Mode édition : glissez les widgets, redimensionnez par le coin inférieur droit</Pill>
                )}
              </div>
            </GdsCard>

            <div
              ref={gridRef}
              className="relative"
              style={{ height: Math.max(ROW_HEIGHT * Math.max(maxRow, 4), 340) }}
              onDragOver={event => {
                if (editing) event.preventDefault();
              }}
              onDrop={handleDrop}
            >
              {activeDashboard.widgets.length === 0 && (
                <GdsCard className="h-full">
                  <EmptyState
                    icon={BarChart3}
                    title="Tableau de bord vide"
                    hint={editing ? 'Ajoutez un widget pour commencer.' : 'Passez en mode édition pour ajouter des widgets.'}
                  />
                </GdsCard>
              )}
              {activeDashboard.widgets.map(widget => {
                const entry = results[widget.id];
                const style = {
                  left: `${(widget.layout.x / GRID_COLUMNS) * 100}%`,
                  width: `${(widget.layout.w / GRID_COLUMNS) * 100}%`,
                  top: widget.layout.y * ROW_HEIGHT,
                  height: widget.layout.h * ROW_HEIGHT - 8,
                };
                return (
                  <div
                    key={widget.id}
                    className="absolute px-1"
                    style={style}
                    draggable={editing}
                    onDragStart={() => {
                      dragIdRef.current = widget.id;
                    }}
                  >
                    <div className="h-full bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
                      <div className="flex items-center justify-between gap-1 px-2.5 py-1.5 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-1 min-w-0">
                          {editing && <GripVertical className="w-3.5 h-3.5 text-slate-400 shrink-0 cursor-grab" />}
                          <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-100 truncate">
                            {widget.title}
                          </span>
                        </div>
                        {editing && (
                          <div className="flex items-center gap-0.5 shrink-0">
                            <button
                              type="button"
                              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                              title="Modifier le widget"
                              onClick={() => setWidgetEditor(widget)}
                            >
                              <Pencil className="w-3 h-3 text-slate-500" />
                            </button>
                            <button
                              type="button"
                              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                              title="Dupliquer le widget"
                              onClick={() => duplicateWidget(widget)}
                            >
                              <Copy className="w-3 h-3 text-slate-500" />
                            </button>
                            <button
                              type="button"
                              className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/40"
                              title="Supprimer le widget"
                              onClick={() => removeWidget(widget.id)}
                            >
                              <Trash2 className="w-3 h-3 text-red-500" />
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-h-0 p-1.5 overflow-hidden">
                        {entry?.error ? (
                          <div className="h-full flex items-center justify-center text-[10.5px] text-red-600 text-center px-2">
                            {entry.error}
                          </div>
                        ) : entry?.result ? (
                          <BiChart
                            type={widget.type}
                            result={entry.result}
                            height={Math.max(100, widget.layout.h * ROW_HEIGHT - 56)}
                            options={{ ...widget.options, maxRows: widget.options?.maxRows ?? widget.limit }}
                          />
                        ) : (
                          <div className="h-full flex items-center justify-center text-[10.5px] text-slate-400">
                            Chargement…
                          </div>
                        )}
                      </div>
                      {editing && (
                        <div
                          onPointerDown={event => beginResize(event, widget)}
                          className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize"
                          title="Redimensionner"
                          style={{
                            background:
                              'linear-gradient(135deg, transparent 50%, rgba(37,99,235,0.55) 50%)',
                            borderBottomRightRadius: 10,
                          }}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="text-[10px] text-slate-400 flex items-center gap-1">
              <RefreshCw className="w-3 h-3" />
              Données recalculées depuis la couche analytique en lecture seule · période appliquée à
              chaque widget daté.
            </div>
          </>
        )}
      </div>

      <WidgetEditor
        isOpen={widgetEditor !== null}
        widget={widgetEditor}
        onClose={() => setWidgetEditor(null)}
        onSave={saved => {
          if (widgetEditor && draft?.widgets.some(widget => widget.id === saved.id)) {
            updateWidget(saved.id, saved);
          } else {
            setDraft(current => (current ? { ...current, widgets: [...current.widgets, saved] } : current));
          }
          setWidgetEditor(null);
        }}
      />

      <ShareEditor
        isOpen={shareOpen}
        resourceType="DASHBOARD"
        resourceId={activeDashboard?.id ?? ''}
        currentUser={currentUser}
        onClose={() => setShareOpen(false)}
        onDone={() => {
          onChanged();
          onNotice('Partage enregistré. Les destinataires restent limités à leur périmètre.');
        }}
      />

      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Nouveau tableau de bord" maxWidth="lg">
        <div className="space-y-3">
          {createError && <BiNote tone="error">{createError}</BiNote>}
          <div>
            <label className={labelCls}>Nom</label>
            <input className={`${inputCls} w-full`} value={createName} onChange={event => setCreateName(event.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Description</label>
            <textarea
              className={`${inputCls} w-full`}
              rows={2}
              value={createDescription}
              onChange={event => setCreateDescription(event.target.value)}
            />
          </div>
          <div>
            <label className={labelCls}>Catégorie</label>
            <select
              className={`${inputCls} w-full`}
              value={createCategory}
              onChange={event => setCreateCategory(event.target.value as BiDashboardCategory)}
            >
              {(Object.keys(BI_DASHBOARD_CATEGORY_LABELS) as BiDashboardCategory[]).map(category => (
                <option key={category} value={category}>
                  {BI_DASHBOARD_CATEGORY_LABELS[category]}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className={btnGhost} onClick={() => setCreateOpen(false)}>
              Annuler
            </button>
            <button type="button" className={btnPrimary} onClick={submitCreate} disabled={!createName.trim()}>
              <Plus className="w-3.5 h-3.5" /> Créer
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export { layoutError, fmtBiNumber };
