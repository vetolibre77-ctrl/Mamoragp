/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * MAMORA BI — Assistant d'export PowerPoint (.pptx).
 *
 * Quatre étapes : sélection du contenu, configuration, organisation, exportation.
 * La présentation est construite par `storage.buildBiPptxDeck` (données réelles du
 * moteur analytique) puis rendue par `services/bi/pptx-render` en graphiques et
 * tableaux PowerPoint natifs : aucune capture d'écran n'est utilisée.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  BellRing,
  CheckCircle2,
  Download,
  Eye,
  FileText,
  Gauge,
  Globe,
  History,
  ImagePlus,
  Info,
  LayoutDashboard,
  ListOrdered,
  Loader2,
  Lock,
  Plus,
  Presentation,
  Settings2,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { storage } from '../../../services/storage';
import { resolveBiPeriod } from '../../../services/bi/engine';
import { biPptxFileName, renderBiPptxDeck } from '../../../services/bi/pptx-render';
import {
  BI_KPI_PERIOD_LABELS,
  BI_WIDGET_TYPE_LABELS,
  BiAiResponse,
  BiKpiPeriod,
  BiPptxConfig,
  BiPptxDeck,
  BiPptxExportPreset,
  BiPptxFormat,
  BiPptxLanguage,
  BiPptxLog,
  BiPptxSelection,
  BiPptxSlide,
  BiPptxTextBlock,
  BiPptxTextTone,
  BiPeriod,
  BiQuery,
  User,
} from '../../../types';
import { Modal } from '../../common/Modal';
import {
  EmptyState,
  GdsCard,
  Notice,
  Pill,
  btnGhost,
  btnPrimary,
  inputCls,
  labelCls,
} from '../gds/GdsShared';
import { downloadBiBinary } from './BiShared';

const PPTX_MIME =
  'application/vnd.openxmlformats-officedocument.presentationml.presentation';

/** Un logo trop lourd alourdirait le fichier remis à la direction. */
const MAX_LOGO_BYTES = 1_000_000;

const STEPS: Array<{ index: number; label: string; icon: React.ElementType }> = [
  { index: 1, label: 'Sélection du contenu', icon: ListOrdered },
  { index: 2, label: 'Configuration', icon: Settings2 },
  { index: 3, label: 'Organisation', icon: Eye },
  { index: 4, label: 'Exportation', icon: Download },
];

const TONE_LABELS: Record<BiPptxTextTone, string> = {
  FACT: 'Fait mesuré',
  HYPOTHESIS: 'Hypothèse',
  RECOMMENDATION: 'Recommandation',
  INFO: 'Information',
  WARNING: 'Point de vigilance',
};

const TONE_PILLS: Record<BiPptxTextTone, string> = {
  FACT: 'emerald',
  HYPOTHESIS: 'violet',
  RECOMMENDATION: 'blue',
  INFO: 'slate',
  WARNING: 'amber',
};

const LANGUAGE_LABELS: Record<BiPptxLanguage, string> = {
  fr: 'Français',
  ar: 'العربية (arabe — RTL)',
};

/** Périodes proposées comme référence de comparaison. */
const PERIODS_FOR_COMPARISON: BiKpiPeriod[] = [
  'LAST_MONTH',
  'CURRENT_MONTH',
  'CURRENT_QUARTER',
  'CURRENT_YEAR',
  'LAST_12_MONTHS',
  'ALL',
];

interface ConfigDraft {
  title: string;
  subtitle: string;
  department: string;
  company: string;
  author: string;
  language: BiPptxLanguage;
  format: BiPptxFormat;
  logoDataUrl?: string;
  includeFooter: boolean;
  includeSlideNumbers: boolean;
  /** Format `datetime-local`, converti en ISO au moment de la génération. */
  generatedAt: string;
}

const toLocalInput = (date: Date): string => {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
};

const emptySelection = (): BiPptxSelection => ({
  dashboardIds: [],
  widgetKeys: [],
  reportIds: [],
  kpiIds: [],
  explorerQueries: [],
  includeOverview: false,
  includeExecutiveSummary: true,
  includeDomainAnalysis: false,
  includeAlerts: false,
  includeAi: false,
  includeComparison: false,
  includeConclusion: true,
  includeRecommendations: true,
  includeSources: true,
});

export interface BiPptxWizardProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  /** Période d'analyse affichée dans MAMORA BI : elle borne toutes les requêtes. */
  period: BiPeriod;
  /** Contexte d'ouverture depuis une section (tableau de bord, rapport, KPI, IA…). */
  preset?: BiPptxExportPreset | null;
  /** Analyses de la session courante de MAMORA AI Analyst. */
  aiResponses?: BiAiResponse[];
  /** Requêtes de l'explorateur à joindre à la présentation. */
  explorerQueries?: Array<{ title: string; query: BiQuery }>;
}

export const BiPptxWizard: React.FC<BiPptxWizardProps> = ({
  isOpen,
  onClose,
  currentUser,
  period,
  preset,
  aiResponses = [],
  explorerQueries = [],
}) => {
  const canExport = storage.canBi('BI_EXPORT', currentUser);
  const canUseAi = storage.canBi('BI_AI_USE', currentUser);

  const [step, setStep] = useState(1);
  const [selection, setSelection] = useState<BiPptxSelection>(emptySelection);
  const [comparisonMode, setComparisonMode] = useState<BiKpiPeriod>('LAST_MONTH');
  const [config, setConfig] = useState<ConfigDraft>({
    title: 'MAMORA BI — Analyse de performance',
    subtitle: '',
    department: '',
    company: 'MAMORA GP',
    author: currentUser.name,
    language: 'fr',
    format: '16:9',
    includeFooter: true,
    includeSlideNumbers: true,
    generatedAt: toLocalInput(new Date()),
  });
  const [logoName, setLogoName] = useState('');
  const [deck, setDeck] = useState<BiPptxDeck | null>(null);
  const [buildError, setBuildError] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [generated, setGenerated] = useState<{
    fileName: string;
    bytes: number;
    slides: number;
  } | null>(null);
  const [logs, setLogs] = useState<BiPptxLog[]>([]);
  const [previewId, setPreviewId] = useState('');

  const dashboards = useMemo(() => {
    if (!isOpen || !canExport) return [];
    try {
      return storage.getBiDashboards(currentUser);
    } catch {
      return [];
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, canExport, currentUser]);

  const reports = useMemo(() => {
    if (!isOpen || !canExport) return [];
    try {
      return storage.getBiReports(currentUser);
    } catch {
      return [];
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, canExport, currentUser]);

  const kpis = useMemo(() => {
    if (!isOpen || !canExport) return [];
    try {
      return storage.getBiKpis().filter(kpi => kpi.isActive);
    } catch {
      return [];
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, canExport]);

  const notify = (message: string) => {
    setNotice(message);
    setError('');
  };
  const fail = (message: string) => {
    setError(message);
    setNotice('');
  };

  /** Pré-sélectionne le contenu demandé depuis la section BI d'origine. */
  const initialSelection = (): BiPptxSelection => {
    const base = emptySelection();
    const explorer = preset?.query
      ? [{ title: preset.title || 'Analyse de l’explorateur', query: preset.query }]
      : explorerQueries;
    if (!preset) {
      return { ...base, explorerQueries: explorer, includeOverview: true };
    }
    switch (preset.source) {
      case 'OVERVIEW':
        return {
          ...base,
          includeOverview: true,
          includeExecutiveSummary: true,
          includeDomainAnalysis: true,
          includeAlerts: true,
        };
      case 'DASHBOARD':
        return {
          ...base,
          dashboardIds: preset.dashboardId ? [preset.dashboardId] : [],
          widgetKeys: preset.widgetKey && preset.dashboardId
            ? [`${preset.dashboardId}::${preset.widgetKey}`]
            : [],
        };
      case 'REPORT':
        return { ...base, reportIds: preset.reportId ? [preset.reportId] : [] };
      case 'EXPLORER':
        return { ...base, explorerQueries: explorer };
      case 'KPI':
        return { ...base, kpiIds: preset.kpiIds ?? [] };
      case 'AI':
        return {
          ...base,
          includeAi: canUseAi,
          explorerQueries: preset.query
            ? [{ title: preset.title || 'Analyse AI Analyst', query: preset.query }]
            : [],
        };
      default:
        return base;
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    setStep(1);
    setDeck(null);
    setGenerated(null);
    setBuildError('');
    setNotice('');
    setError('');
    setPreviewId('');
    setLogoName('');
    setComparisonMode('LAST_MONTH');
    setSelection(initialSelection());
    setConfig(current => ({
      ...current,
      author: currentUser.name,
      generatedAt: toLocalInput(new Date()),
      logoDataUrl: undefined,
    }));
    try {
      setLogs(canExport ? storage.getBiPptxLogs() : []);
    } catch {
      setLogs([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const toConfigPartial = (draft: ConfigDraft): Partial<BiPptxConfig> => {
    const parsed = new Date(draft.generatedAt);
    return {
      title: draft.title,
      subtitle: draft.subtitle,
      department: draft.department,
      company: draft.company,
      author: draft.author,
      language: draft.language,
      format: draft.format,
      logoDataUrl: draft.logoDataUrl,
      includeFooter: draft.includeFooter,
      includeSlideNumbers: draft.includeSlideNumbers,
      generatedAt: Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString(),
    };
  };

  /** Résout la période de comparaison choisie puis construit la présentation. */
  const buildDeck = () => {
    try {
      const withComparison: BiPptxSelection = selection.includeComparison
        ? {
            ...selection,
            comparison: {
              previousPeriod: resolveBiPeriod(comparisonMode, new Date()),
              label: BI_KPI_PERIOD_LABELS[comparisonMode],
            },
          }
        : selection;
      const built = storage.buildBiPptxDeck(
        {
          ...withComparison,
          period,
          aiResponses: withComparison.includeAi && canUseAi ? aiResponses : [],
        },
        toConfigPartial(config)
      );
      setDeck(built);
      setBuildError('');
      setPreviewId(built.slides[0]?.id ?? '');
      return built;
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : String(caught);
      setDeck(null);
      setBuildError(message);
      return null;
    }
  };

  useEffect(() => {
    if (isOpen && step === 3) {
      const built = buildDeck();
      if (built) {
        notify(`Présentation générée : ${built.slides.length} diapositive(s) à partir des données sélectionnées.`);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const patchSelection = (patch: Partial<BiPptxSelection>) =>
    setSelection(current => ({ ...current, ...patch }));

  const toggleValue = (values: string[], value: string): string[] =>
    values.includes(value) ? values.filter(item => item !== value) : [...values, value];

  const toggleDashboard = (dashboardId: string) => {
    const dashboard = dashboards.find(item => item.id === dashboardId);
    if (!dashboard) return;
    const keys = dashboard.widgets.map(widget => `${dashboard.id}::${widget.id}`);
    const selected = selection.dashboardIds.includes(dashboardId);
    patchSelection({
      dashboardIds: toggleValue(selection.dashboardIds, dashboardId),
      widgetKeys: selected
        ? selection.widgetKeys.filter(key => !keys.includes(key))
        : Array.from(new Set([...selection.widgetKeys, ...keys])),
    });
  };

  const toggleWidget = (dashboardId: string, widgetId: string) => {
    const key = `${dashboardId}::${widgetId}`;
    const dashboard = dashboards.find(item => item.id === dashboardId);
    const allKeys = (dashboard?.widgets ?? []).map(widget => `${dashboardId}::${widget.id}`);
    const nextKeys = toggleValue(selection.widgetKeys, key);
    // Retirer le dernier widget d'un tableau de bord retire le tableau de bord entier.
    const stillUsed = allKeys.some(item => nextKeys.includes(item));
    patchSelection({
      widgetKeys: nextKeys,
      dashboardIds: stillUsed
        ? Array.from(new Set([...selection.dashboardIds, dashboardId]))
        : selection.dashboardIds.filter(item => item !== dashboardId),
    });
  };

  const patchSlide = (slideId: string, patch: Partial<BiPptxSlide>) =>
    setDeck(current =>
      current
        ? {
            ...current,
            slides: current.slides.map(slide =>
              slide.id === slideId ? { ...slide, ...patch } : slide
            ),
          }
        : current
    );

  const moveSlide = (index: number, delta: number) =>
    setDeck(current => {
      if (!current) return current;
      const target = index + delta;
      if (target < 0 || target >= current.slides.length) return current;
      const slides = [...current.slides];
      const [moved] = slides.splice(index, 1);
      if (!moved) return current;
      slides.splice(target, 0, moved);
      return { ...current, slides };
    });

  const removeSlide = (slideId: string) =>
    setDeck(current =>
      current
        ? { ...current, slides: current.slides.filter(slide => slide.id !== slideId) }
        : current
    );

  const addCustomSlide = () =>
    setDeck(current => {
      if (!current) return current;
      const slide: BiPptxSlide = {
        id: `SLIDE-CUSTOM-${Date.now().toString(36).toUpperCase()}`,
        kind: 'CUSTOM',
        title: 'Diapositive libre',
        bullets: [{ tone: 'INFO', text: '' }],
      };
      setPreviewId(slide.id);
      return { ...current, slides: [...current.slides, slide] };
    });

  const patchBullet = (
    slideId: string,
    index: number,
    patch: Partial<BiPptxTextBlock>
  ) =>
    setDeck(current => {
      if (!current) return current;
      return {
        ...current,
        slides: current.slides.map(slide => {
          if (slide.id !== slideId || !slide.bullets) return slide;
          return {
            ...slide,
            bullets: slide.bullets.map((bullet, position) =>
              position === index ? { ...bullet, ...patch } : bullet
            ),
          };
        }),
      };
    });

  const removeBullet = (slideId: string, index: number) =>
    setDeck(current => {
      if (!current) return current;
      return {
        ...current,
        slides: current.slides.map(slide => {
          if (slide.id !== slideId || !slide.bullets) return slide;
          return { ...slide, bullets: slide.bullets.filter((_, position) => position !== index) };
        }),
      };
    });

  const addBullet = (slideId: string) =>
    setDeck(current => {
      if (!current) return current;
      return {
        ...current,
        slides: current.slides.map(slide =>
          slide.id === slideId
            ? { ...slide, bullets: [...(slide.bullets ?? []), { tone: 'INFO', text: '' }] }
            : slide
        ),
      };
    });

  const onLogoFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!/^image\/(png|jpeg|jpg|svg\+xml)$/.test(file.type)) {
      fail('Format de logo non pris en charge : PNG, JPEG ou SVG attendu.');
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      fail(
        `Logo trop volumineux (${Math.round(file.size / 1024)} Ko) : 1 Mo maximum pour garder un fichier PowerPoint léger.`
      );
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const data = String(reader.result ?? '');
      setConfig(current => ({ ...current, logoDataUrl: data }));
      setLogoName(file.name);
      notify('Logo ajouté à la diapositive de couverture.');
    };
    reader.onerror = () => fail('Lecture du fichier logo impossible.');
    reader.readAsDataURL(file);
  };

  const generate = async () => {
    if (!deck || busy) return;
    setBusy(true);
    setError('');
    setGenerated(null);
    const fileName = biPptxFileName(deck);
    const summary = deck.summary;
    try {
      const buffer = await renderBiPptxDeck(deck);
      downloadBiBinary(fileName, buffer, PPTX_MIME);
      storage.recordBiPptxExport({
        title: deck.config.title,
        language: deck.config.language,
        format: deck.config.format,
        slideCount: deck.slides.length,
        fileName,
        status: 'SUCCES',
        dashboardIds: selection.dashboardIds,
        reportIds: selection.reportIds,
        kpiIds: selection.kpiIds,
        summary,
      });
      setGenerated({ fileName, bytes: buffer.byteLength, slides: deck.slides.length });
      setLogs(storage.getBiPptxLogs());
      notify(`Présentation « ${fileName} » générée et téléchargée.`);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : String(caught);
      fail(`Échec de la génération PowerPoint : ${message}`);
      try {
        storage.recordBiPptxExport({
          title: deck.config.title,
          language: deck.config.language,
          format: deck.config.format,
          slideCount: deck.slides.length,
          fileName,
          status: 'ECHEC',
          message,
          dashboardIds: selection.dashboardIds,
          reportIds: selection.reportIds,
          kpiIds: selection.kpiIds,
          summary,
        });
        setLogs(storage.getBiPptxLogs());
      } catch {
        // L'historique ne doit jamais masquer l'erreur de génération remontée.
      }
    } finally {
      setBusy(false);
    }
  };

  const selectedWidgetCount = selection.widgetKeys.length;
  const hasContent =
    selection.dashboardIds.length > 0 ||
    selection.reportIds.length > 0 ||
    selection.kpiIds.length > 0 ||
    selection.explorerQueries.length > 0 ||
    selection.includeOverview ||
    selection.includeExecutiveSummary ||
    selection.includeDomainAnalysis ||
    selection.includeAlerts ||
    selection.includeComparison ||
    (selection.includeAi && aiResponses.length > 0);

  const previewSlide = deck?.slides.find(slide => slide.id === previewId) ?? deck?.slides[0] ?? null;

  const checkboxCls =
    'w-3.5 h-3.5 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 accent-blue-600';

  const stepBody = (() => {
    if (step === 1) {
      return (
        <div className="space-y-3">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <GdsCard
              title="Tableaux de bord et graphiques"
              subtitle={`${dashboards.length} tableau(x) accessible(s) à votre profil`}
            >
              {dashboards.length === 0 ? (
                <EmptyState icon={LayoutDashboard} title="Aucun tableau de bord partagé" />
              ) : (
                <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                  {dashboards.map(dashboard => {
                    const checked = selection.dashboardIds.includes(dashboard.id);
                    return (
                      <div
                        key={dashboard.id}
                        className="rounded-lg border border-slate-200 dark:border-slate-700 p-2.5"
                      >
                        <label className="flex items-start gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            className={checkboxCls}
                            checked={checked}
                            onChange={() => toggleDashboard(dashboard.id)}
                          />
                          <span className="min-w-0">
                            <span className="block text-[11.5px] font-semibold text-slate-800 dark:text-slate-100 truncate">
                              {dashboard.name}
                            </span>
                            <span className="block text-[10px] text-slate-500 truncate">
                              {dashboard.widgets.length} graphique(s) · {dashboard.description}
                            </span>
                          </span>
                        </label>
                        {checked && (
                          <div className="mt-2 space-y-1 pl-5.5 border-t border-slate-100 dark:border-slate-800 pt-2">
                            {dashboard.widgets.map(widget => {
                              const key = `${dashboard.id}::${widget.id}`;
                              return (
                                <label
                                  key={widget.id}
                                  className="flex items-center gap-2 text-[10.5px] text-slate-600 dark:text-slate-300 cursor-pointer"
                                >
                                  <input
                                    type="checkbox"
                                    className={checkboxCls}
                                    checked={selection.widgetKeys.includes(key)}
                                    onChange={() => toggleWidget(dashboard.id, widget.id)}
                                  />
                                  <span className="truncate">{widget.title}</span>
                                  <Pill tone="slate">{BI_WIDGET_TYPE_LABELS[widget.type]}</Pill>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </GdsCard>

            <GdsCard
              title="Rapports enregistrés"
              subtitle={`${reports.length} rapport(s) partagé(s) avec votre profil`}
            >
              {reports.length === 0 ? (
                <EmptyState icon={FileText} title="Aucun rapport disponible" />
              ) : (
                <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                  {reports.map(report => (
                    <label
                      key={report.id}
                      className="flex items-start gap-2 text-[11px] text-slate-700 dark:text-slate-200 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        className={checkboxCls}
                        checked={selection.reportIds.includes(report.id)}
                        onChange={() => patchSelection({ reportIds: toggleValue(selection.reportIds, report.id) })}
                      />
                      <span className="min-w-0">
                        <span className="block font-semibold truncate">{report.name}</span>
                        <span className="block text-[10px] text-slate-500 truncate">
                          {BI_WIDGET_TYPE_LABELS[report.visualization]} · {report.dimensions.length} dimension(s)
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </GdsCard>

            <GdsCard title="Indicateurs (KPI)" subtitle={`${kpis.length} KPI actif(s)`}>
              {kpis.length === 0 ? (
                <EmptyState icon={Gauge} title="Aucun KPI actif" />
              ) : (
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {kpis.map(kpi => (
                    <label
                      key={kpi.id}
                      className="flex items-start gap-2 text-[11px] text-slate-700 dark:text-slate-200 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        className={checkboxCls}
                        checked={selection.kpiIds.includes(kpi.id)}
                        onChange={() => patchSelection({ kpiIds: toggleValue(selection.kpiIds, kpi.id) })}
                      />
                      <span className="min-w-0">
                        <span className="block font-semibold truncate">{kpi.name}</span>
                        <span className="block text-[10px] text-slate-500 truncate">
                          {kpi.unit || 'sans unité'} · {BI_KPI_PERIOD_LABELS[kpi.period]}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </GdsCard>

            <GdsCard
              title="Analyses et contenus automatiques"
              subtitle="Générés uniquement si les données existent"
            >
              <div className="space-y-1.5">
                {[
                  { key: 'includeOverview', label: 'Vue d’ensemble (mesures et KPI de la période)', icon: LayoutDashboard },
                  { key: 'includeExecutiveSummary', label: 'Synthèse exécutive pour la direction', icon: Presentation },
                  { key: 'includeDomainAnalysis', label: 'Analyse par domaine (production, qualité, stocks…)', icon: Sparkles },
                  { key: 'includeAlerts', label: 'Alertes et anomalies détectées', icon: BellRing },
                  { key: 'includeConclusion', label: 'Conclusions', icon: CheckCircle2 },
                  { key: 'includeRecommendations', label: 'Recommandations', icon: Info },
                  { key: 'includeSources', label: 'Sources et période des données', icon: FileText },
                ].map(({ key, label, icon: Icon }) => (
                  <label
                    key={key}
                    className="flex items-center gap-2 text-[11px] text-slate-700 dark:text-slate-200 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      className={checkboxCls}
                      checked={Boolean(selection[key as keyof BiPptxSelection])}
                      onChange={() =>
                        patchSelection({ [key]: !selection[key as keyof BiPptxSelection] } as Partial<BiPptxSelection>)
                      }
                    />
                    <Icon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{label}</span>
                  </label>
                ))}

                <div className="pt-2 mt-1 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                  <label className="flex items-center gap-2 text-[11px] text-slate-700 dark:text-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      className={checkboxCls}
                      checked={selection.includeComparison}
                      onChange={() => patchSelection({ includeComparison: !selection.includeComparison })}
                    />
                    <span>Comparer avec une période précédente</span>
                  </label>
                  {selection.includeComparison && (
                    <select
                      className={`${inputCls} w-full`}
                      value={comparisonMode}
                      onChange={event => setComparisonMode(event.target.value as BiKpiPeriod)}
                    >
                      {PERIODS_FOR_COMPARISON.map(mode => (
                        <option key={mode} value={mode}>
                          Période de référence : {BI_KPI_PERIOD_LABELS[mode]}
                        </option>
                      ))}
                    </select>
                  )}

                  <label
                    className={`flex items-center gap-2 text-[11px] ${
                      canUseAi
                        ? 'text-slate-700 dark:text-slate-200 cursor-pointer'
                        : 'text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className={checkboxCls}
                      disabled={!canUseAi}
                      checked={selection.includeAi && canUseAi}
                      onChange={() => patchSelection({ includeAi: !selection.includeAi })}
                    />
                    <Sparkles className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                    <span>Commentaires MAMORA AI Analyst ({aiResponses.length} réponse(s))</span>
                    {!canUseAi && <Lock className="w-3 h-3" />}
                  </label>
                  {!canUseAi && (
                    <p className="text-[10px] text-slate-500 pl-5.5">
                      Habilitation « Utiliser MAMORA AI Analyst » requise.
                    </p>
                  )}
                </div>

                {selection.explorerQueries.length > 0 && (
                  <div className="pt-2 mt-1 border-t border-slate-100 dark:border-slate-800 space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                      Analyses de l’explorateur
                    </p>
                    {selection.explorerQueries.map((entry, index) => (
                      <div key={`${entry.title}-${index}`} className="flex items-center gap-2">
                        <Pill tone="blue">{entry.title}</Pill>
                        <button
                          type="button"
                          className="text-[10px] text-red-600 hover:underline"
                          onClick={() =>
                            patchSelection({
                              explorerQueries: selection.explorerQueries.filter((_, position) => position !== index),
                            })
                          }
                        >
                          retirer
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </GdsCard>
          </div>

          <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
            <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
              Contenu sélectionné
            </span>
            <Pill tone="blue">{selection.dashboardIds.length} tableau(x)</Pill>
            <Pill tone="violet">{selectedWidgetCount} graphique(s)</Pill>
            <Pill tone="emerald">{selection.reportIds.length} rapport(s)</Pill>
            <Pill tone="amber">{selection.kpiIds.length} KPI</Pill>
            <Pill tone="slate">{selection.explorerQueries.length} analyse(s)</Pill>
            {!hasContent && (
              <span className="text-[10.5px] text-amber-700 dark:text-amber-300 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                Sélectionnez au moins un contenu pour continuer.
              </span>
            )}
          </div>
        </div>
      );
    }

    if (step === 2) {
      return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <GdsCard title="Identification de la présentation">
            <div className="space-y-2.5">
              <div>
                <label className={labelCls}>Titre</label>
                <input
                  className={`${inputCls} w-full`}
                  value={config.title}
                  maxLength={120}
                  onChange={event => setConfig(current => ({ ...current, title: event.target.value }))}
                />
              </div>
              <div>
                <label className={labelCls}>Sous-titre</label>
                <input
                  className={`${inputCls} w-full`}
                  value={config.subtitle}
                  maxLength={160}
                  placeholder="Ex. : Revue de performance mensuelle"
                  onChange={event => setConfig(current => ({ ...current, subtitle: event.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className={labelCls}>Service</label>
                  <input
                    className={`${inputCls} w-full`}
                    value={config.department}
                    maxLength={80}
                    placeholder={currentUser.department || 'Tous les services'}
                    onChange={event => setConfig(current => ({ ...current, department: event.target.value }))}
                  />
                </div>
                <div>
                  <label className={labelCls}>Société</label>
                  <input
                    className={`${inputCls} w-full`}
                    value={config.company}
                    maxLength={60}
                    onChange={event => setConfig(current => ({ ...current, company: event.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className={labelCls}>Auteur</label>
                  <input
                    className={`${inputCls} w-full`}
                    value={config.author}
                    maxLength={80}
                    onChange={event => setConfig(current => ({ ...current, author: event.target.value }))}
                  />
                </div>
                <div>
                  <label className={labelCls}>Date de génération</label>
                  <input
                    type="datetime-local"
                    className={`${inputCls} w-full`}
                    value={config.generatedAt}
                    onChange={event => setConfig(current => ({ ...current, generatedAt: event.target.value }))}
                  />
                </div>
              </div>
              <div>
                <label className={labelCls}>Période analysée</label>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  {period.label ??
                    (period.from || period.to
                      ? `${period.from ?? 'début'} → ${period.to ?? 'aujourd’hui'}`
                      : 'Toutes périodes')}
                </p>
                <p className="text-[10px] text-slate-500 mt-1">
                  Modifiez la période dans l’en-tête de MAMORA BI : elle borne toutes les requêtes
                  de la présentation.
                </p>
              </div>
            </div>
          </GdsCard>

          <div className="space-y-3">
            <GdsCard title="Langue et format">
              <div className="space-y-2.5">
                <div>
                  <label className={labelCls}>Langue</label>
                  <select
                    className={`${inputCls} w-full`}
                    value={config.language}
                    onChange={event =>
                      setConfig(current => ({ ...current, language: event.target.value as BiPptxLanguage }))
                    }
                  >
                    {(Object.keys(LANGUAGE_LABELS) as BiPptxLanguage[]).map(language => (
                      <option key={language} value={language}>
                        {LANGUAGE_LABELS[language]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Format des diapositives</label>
                  <select
                    className={`${inputCls} w-full`}
                    value={config.format}
                    onChange={event =>
                      setConfig(current => ({ ...current, format: event.target.value as BiPptxFormat }))
                    }
                  >
                    <option value="16:9">16:9 paysage (recommandé)</option>
                    <option value="4:3">4:3 classique</option>
                  </select>
                </div>
                <div className="flex flex-wrap gap-3 pt-1">
                  <label className="flex items-center gap-2 text-[11px] text-slate-700 dark:text-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      className={checkboxCls}
                      checked={config.includeFooter}
                      onChange={event =>
                        setConfig(current => ({ ...current, includeFooter: event.target.checked }))
                      }
                    />
                    Pied de page (société, période, date)
                  </label>
                  <label className="flex items-center gap-2 text-[11px] text-slate-700 dark:text-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      className={checkboxCls}
                      checked={config.includeSlideNumbers}
                      onChange={event =>
                        setConfig(current => ({ ...current, includeSlideNumbers: event.target.checked }))
                      }
                    />
                    Numérotation des diapositives
                  </label>
                </div>
              </div>
            </GdsCard>

            <GdsCard
              title="Logo MAMORA GP"
              subtitle="PNG, JPEG ou SVG — 1 Mo maximum"
              actions={
                config.logoDataUrl ? (
                  <button
                    type="button"
                    className="text-[10.5px] text-red-600 hover:underline"
                    onClick={() => {
                      setConfig(current => ({ ...current, logoDataUrl: undefined }));
                      setLogoName('');
                    }}
                  >
                    retirer
                  </button>
                ) : undefined
              }
            >
              <div className="flex items-center gap-3">
                <label className={btnGhost}>
                  <ImagePlus className="w-3.5 h-3.5" /> Choisir un logo
                  <input type="file" accept="image/png,image/jpeg,image/svg+xml" className="hidden" onChange={onLogoFile} />
                </label>
                {config.logoDataUrl ? (
                  <>
                    <img
                      src={config.logoDataUrl}
                      alt="Logo sélectionné"
                      className="h-10 max-w-32 object-contain rounded border border-slate-200 dark:border-slate-700 bg-white p-0.5"
                    />
                    <span className="text-[10.5px] text-slate-500 truncate">{logoName}</span>
                  </>
                ) : (
                  <span className="text-[10.5px] text-slate-500">
                    Aucun logo : la couverture restera au thème MAMORA GP.
                  </span>
                )}
              </div>
            </GdsCard>

            <GdsCard title="Aperçu du thème">
              <div
                className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 text-slate-800"
                style={{ background: '#FFFFFF', aspectRatio: config.format === '4:3' ? '4 / 3' : '16 / 9' }}
                dir={config.language === 'ar' ? 'rtl' : 'ltr'}
              >
                <div className="text-[9px] font-bold uppercase tracking-wide" style={{ color: '#2563EB' }}>
                  {config.company || 'MAMORA GP'}
                </div>
                <div className="text-sm font-bold leading-tight" style={{ color: '#0F172A' }}>
                  {config.title || 'Titre de la présentation'}
                </div>
                {config.subtitle && (
                  <div className="text-[10px]" style={{ color: '#475569' }}>
                    {config.subtitle}
                  </div>
                )}
                <div className="mt-2 text-[9px]" style={{ color: '#64748B' }}>
                  {config.department || currentUser.department || 'Tous les services'} ·{' '}
                  {LANGUAGE_LABELS[config.language]}
                </div>
                <div className="mt-3 flex gap-1.5">
                  {['#2563EB', '#059669', '#F59E0B', '#DC2626', '#7C3AED'].map(color => (
                    <span key={color} className="h-4 w-8 rounded" style={{ background: color }} />
                  ))}
                </div>
              </div>
            </GdsCard>
          </div>
        </div>
      );
    }

    if (step === 3) {
      if (buildError) {
        return (
          <Notice tone="error" message={buildError} onClose={() => setBuildError('')} />
        );
      }
      if (!deck) {
        return <EmptyState icon={Presentation} title="Présentation non générée" hint="Revenez à l’étape 1." />;
      }
      return (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
          <div className="lg:col-span-2 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                {deck.slides.length} diapositive(s)
              </span>
              <button type="button" className={btnGhost} onClick={addCustomSlide}>
                <Plus className="w-3.5 h-3.5" /> Diapositive libre
              </button>
            </div>
            <div className="space-y-1.5 max-h-[52vh] overflow-y-auto pr-1">
              {deck.slides.map((slide, index) => {
                const locked = slide.kind === 'COVER' || slide.kind === 'TOC';
                return (
                  <div
                    key={slide.id}
                    className={`rounded-lg border p-2 cursor-pointer transition-colors ${
                      previewId === slide.id
                        ? 'border-blue-400 bg-blue-50/60 dark:bg-blue-950/30'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                    onClick={() => setPreviewId(slide.id)}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-slate-400 w-5 shrink-0">
                        {index + 1}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-100 truncate flex-1">
                        {slide.title}
                      </span>
                      <button
                        type="button"
                        title="Monter"
                        disabled={index === 0}
                        className="p-0.5 text-slate-500 hover:text-blue-600 disabled:opacity-30"
                        onClick={event => {
                          event.stopPropagation();
                          moveSlide(index, -1);
                        }}
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        title="Descendre"
                        disabled={index === deck.slides.length - 1}
                        className="p-0.5 text-slate-500 hover:text-blue-600 disabled:opacity-30"
                        onClick={event => {
                          event.stopPropagation();
                          moveSlide(index, 1);
                        }}
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        title={locked ? 'Diapositive structurelle non supprimable' : 'Supprimer'}
                        disabled={locked}
                        className="p-0.5 text-slate-500 hover:text-red-600 disabled:opacity-30"
                        onClick={event => {
                          event.stopPropagation();
                          removeSlide(slide.id);
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-1 pl-6.5 mt-1">
                      <Pill tone="slate">{slide.kind}</Pill>
                      {slide.kpis && slide.kpis.length > 0 && <Pill tone="amber">{slide.kpis.length} KPI</Pill>}
                      {slide.chart && <Pill tone="blue">{BI_WIDGET_TYPE_LABELS[slide.chart.type]}</Pill>}
                      {slide.table && <Pill tone="emerald">{slide.table.rows.length} ligne(s)</Pill>}
                      {slide.comparison && <Pill tone="violet">comparaison</Pill>}
                      {slide.bullets && slide.bullets.length > 0 && (
                        <Pill tone="slate">{slide.bullets.length} commentaire(s)</Pill>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-3 space-y-2.5">
            {previewSlide ? (
              <>
                <GdsCard
                  title="Édition de la diapositive"
                  subtitle="Les modifications sont appliquées au fichier PowerPoint généré."
                >
                  <div className="space-y-2.5">
                    <div>
                      <label className={labelCls}>Titre</label>
                      <input
                        className={`${inputCls} w-full`}
                        value={previewSlide.title}
                        maxLength={120}
                        onChange={event => patchSlide(previewSlide.id, { title: event.target.value })}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Sous-titre</label>
                      <input
                        className={`${inputCls} w-full`}
                        value={previewSlide.subtitle ?? ''}
                        maxLength={160}
                        onChange={event => patchSlide(previewSlide.id, { subtitle: event.target.value })}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Commentaire affiché sous le contenu</label>
                      <textarea
                        className={`${inputCls} w-full min-h-16`}
                        value={previewSlide.comment ?? ''}
                        maxLength={600}
                        placeholder="Interprétation destinée à la direction…"
                        onChange={event => patchSlide(previewSlide.id, { comment: event.target.value })}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Observations</label>
                      <textarea
                        className={`${inputCls} w-full min-h-16`}
                        value={previewSlide.observations ?? ''}
                        maxLength={600}
                        placeholder="Éléments de contexte, réserves, précision de périmètre…"
                        onChange={event => patchSlide(previewSlide.id, { observations: event.target.value })}
                      />
                    </div>
                  </div>
                </GdsCard>

                <GdsCard
                  title="Commentaires et interprétations"
                  subtitle={
                    previewSlide.kind === 'AI'
                      ? 'Commentaires MAMORA AI Analyst : modifiez-les ou supprimez-les avant génération.'
                      : 'Faits, hypothèses et recommandations affichés sur la diapositive.'
                  }
                  actions={
                    <button type="button" className={btnGhost} onClick={() => addBullet(previewSlide.id)}>
                      <Plus className="w-3.5 h-3.5" /> Ajouter
                    </button>
                  }
                >
                  {(previewSlide.bullets ?? []).length === 0 ? (
                    <p className="text-[10.5px] text-slate-500">Aucun commentaire sur cette diapositive.</p>
                  ) : (
                    <div className="space-y-2">
                      {(previewSlide.bullets ?? []).map((bullet, index) => (
                        <div key={index} className="rounded-lg border border-slate-200 dark:border-slate-700 p-2">
                          <div className="flex items-center gap-2 mb-1.5">
                            <select
                              className={inputCls}
                              value={bullet.tone}
                              onChange={event =>
                                patchBullet(previewSlide.id, index, {
                                  tone: event.target.value as BiPptxTextTone,
                                })
                              }
                            >
                              {(Object.keys(TONE_LABELS) as BiPptxTextTone[]).map(tone => (
                                <option key={tone} value={tone}>
                                  {TONE_LABELS[tone]}
                                </option>
                              ))}
                            </select>
                            <Pill tone={TONE_PILLS[bullet.tone]}>{TONE_LABELS[bullet.tone]}</Pill>
                            <button
                              type="button"
                              className="ml-auto p-1 text-slate-400 hover:text-red-600"
                              title="Supprimer ce commentaire"
                              onClick={() => removeBullet(previewSlide.id, index)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <textarea
                            className={`${inputCls} w-full min-h-14`}
                            value={bullet.text}
                            maxLength={800}
                            onChange={event =>
                              patchBullet(previewSlide.id, index, { text: event.target.value })
                            }
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </GdsCard>

                <GdsCard title="Prévisualisation structurée">
                  <div
                    className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white p-3"
                    dir={config.language === 'ar' ? 'rtl' : 'ltr'}
                    style={{ aspectRatio: config.format === '4:3' ? '4 / 3' : '16 / 9' }}
                  >
                    <div className="text-[9px] font-bold uppercase tracking-wide" style={{ color: '#64748B' }}>
                      {previewSlide.sectionLabel ?? deck.config.company} · diapositive{' '}
                      {(deck.slides.findIndex(slide => slide.id === previewSlide.id) || 0) + 1}/
                      {deck.slides.length}
                    </div>
                    <div className="text-sm font-bold leading-tight" style={{ color: '#0F172A' }}>
                      {previewSlide.title}
                    </div>
                    {previewSlide.subtitle && (
                      <div className="text-[10px]" style={{ color: '#475569' }}>
                        {previewSlide.subtitle}
                      </div>
                    )}
                    <div className="mt-2 space-y-1.5 overflow-y-auto" style={{ maxHeight: '62%' }}>
                      {(previewSlide.kpis ?? []).map((kpi, index) => (
                        <div
                          key={`${kpi.label}-${index}`}
                          className="flex items-baseline justify-between rounded px-2 py-1"
                          style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}
                        >
                          <span className="text-[9.5px]" style={{ color: '#475569' }}>
                            {kpi.label}
                          </span>
                          <span className="text-[11px] font-bold" style={{ color: '#0F172A' }}>
                            {kpi.value} {kpi.unit ?? ''}
                          </span>
                        </div>
                      ))}
                      {previewSlide.chart && (
                        <div className="rounded px-2 py-1" style={{ background: '#DBEAFE' }}>
                          <span className="text-[9.5px] font-semibold" style={{ color: '#1E40AF' }}>
                            Graphique natif {BI_WIDGET_TYPE_LABELS[previewSlide.chart.type]} ·{' '}
                            {previewSlide.chart.categories.length} catégorie(s) ·{' '}
                            {previewSlide.chart.series.length} série(s)
                          </span>
                        </div>
                      )}
                      {previewSlide.table && (
                        <div className="rounded px-2 py-1" style={{ background: '#D1FAE5' }}>
                          <span className="text-[9.5px] font-semibold" style={{ color: '#065F46' }}>
                            Tableau natif · {previewSlide.table.columns.length} colonne(s) ·{' '}
                            {previewSlide.table.rows.length} ligne(s) affichée(s)
                          </span>
                        </div>
                      )}
                      {previewSlide.comparison && (
                        <div className="rounded px-2 py-1" style={{ background: '#EDE9FE' }}>
                          <span className="text-[9.5px] font-semibold" style={{ color: '#5B21B6' }}>
                            Comparaison {previewSlide.comparison.previousLabel} →{' '}
                            {previewSlide.comparison.currentLabel} ·{' '}
                            {previewSlide.comparison.rows.length} indicateur(s)
                          </span>
                        </div>
                      )}
                      {(previewSlide.bullets ?? []).map((bullet, index) => (
                        <div key={index} className="flex items-start gap-1.5">
                          <span className="text-[9px] mt-0.5" style={{ color: '#2563EB' }}>
                            •
                          </span>
                          <span className="text-[9.5px]" style={{ color: '#334155' }}>
                            {bullet.text || '(commentaire vide)'}
                          </span>
                        </div>
                      ))}
                      {previewSlide.comment && (
                        <div className="text-[9.5px] italic" style={{ color: '#475569' }}>
                          {previewSlide.comment}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 space-y-1 text-[10px] text-slate-500">
                    {previewSlide.periodLabel && <div>Période : {previewSlide.periodLabel}</div>}
                    {previewSlide.sourceLabel && <div>Source : {previewSlide.sourceLabel}</div>}
                    {previewSlide.filters && previewSlide.filters.length > 0 && (
                      <div>Filtres : {previewSlide.filters.join(', ')}</div>
                    )}
                    {previewSlide.unit && <div>Unité : {previewSlide.unit}</div>}
                    {previewSlide.generatedAt && (
                      <div>Actualisation : {new Date(previewSlide.generatedAt).toLocaleString('fr-FR')}</div>
                    )}
                  </div>
                </GdsCard>
              </>
            ) : (
              <EmptyState icon={Eye} title="Sélectionnez une diapositive" />
            )}
          </div>
        </div>
      );
    }

    // Étape 4 — Exportation
    return (
      <div className="space-y-3">
        {deck && (
          <GdsCard
            title="Générer le fichier PowerPoint"
            subtitle="Graphiques et tableaux natifs modifiables dans Microsoft PowerPoint."
          >
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Pill tone="blue">{deck.slides.length} diapositive(s)</Pill>
                <Pill tone="violet">{deck.summary.charts} graphique(s)</Pill>
                <Pill tone="emerald">{deck.summary.tables} tableau(x)</Pill>
                <Pill tone="amber">{deck.summary.kpis} KPI</Pill>
                <Pill tone="slate">{LANGUAGE_LABELS[deck.config.language]}</Pill>
                <Pill tone="slate">{deck.config.format}</Pill>
              </div>

              {deck.warnings.length > 0 && (
                <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-2.5">
                  <p className="text-[10.5px] font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {deck.warnings.length} élément(s) exclu(s) de la présentation
                  </p>
                  <ul className="mt-1 space-y-0.5 max-h-28 overflow-y-auto pr-1">
                    {deck.warnings.slice(0, 20).map((warning, index) => (
                      <li key={index} className="text-[10px] text-amber-700 dark:text-amber-400">
                        • {warning}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-1 text-[10px] text-amber-700 dark:text-amber-400">
                    Aucune diapositive vide n’est créée : les contenus sans données sur la période
                    sont retirés et signalés ici.
                  </p>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <button type="button" className={btnPrimary} onClick={generate} disabled={busy}>
                  {busy ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                  {busy ? 'Génération en cours…' : 'Générer et télécharger le .pptx'}
                </button>
                <button type="button" className={btnGhost} onClick={() => setStep(3)} disabled={busy}>
                  <ArrowLeft className="w-3.5 h-3.5" /> Revenir à l’organisation
                </button>
              </div>

              {generated && (
                <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-2.5 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="text-[10.5px] text-emerald-800 dark:text-emerald-300">
                    <div className="font-semibold">{generated.fileName}</div>
                    <div>
                      {generated.slides} diapositive(s) · {(generated.bytes / 1024).toFixed(0)} Ko —
                      fichier ouvert par votre navigateur.
                    </div>
                  </div>
                </div>
              )}
            </div>
          </GdsCard>
        )}

        <GdsCard
          title="Historique des générations"
          subtitle={`${logs.length} export(s) enregistré(s) — journalisé dans l’audit de sécurité`}
          actions={
            <button
              type="button"
              className={btnGhost}
              onClick={() => {
                try {
                  setLogs(storage.getBiPptxLogs());
                } catch (caught) {
                  fail(caught instanceof Error ? caught.message : String(caught));
                }
              }}
            >
              <History className="w-3.5 h-3.5" /> Actualiser
            </button>
          }
        >
          {logs.length === 0 ? (
            <p className="text-[10.5px] text-slate-500">Aucun export PowerPoint enregistré.</p>
          ) : (
            <div className="overflow-x-auto max-h-56 overflow-y-auto">
              <table className="w-full">
                <thead className="sticky top-0 bg-white dark:bg-slate-900">
                  <tr className="text-left text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    <th className="py-1.5 pr-2">Date</th>
                    <th className="py-1.5 pr-2">Titre</th>
                    <th className="py-1.5 pr-2">Fichier</th>
                    <th className="py-1.5 pr-2">Diapo.</th>
                    <th className="py-1.5 pr-2">Langue</th>
                    <th className="py-1.5">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={log.id} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="py-1.5 pr-2 text-[10.5px] text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString('fr-FR')}
                      </td>
                      <td className="py-1.5 pr-2 text-[10.5px] text-slate-700 dark:text-slate-200 max-w-40 truncate">
                        {log.title}
                      </td>
                      <td className="py-1.5 pr-2 text-[10px] text-slate-500 max-w-44 truncate">
                        {log.fileName}
                      </td>
                      <td className="py-1.5 pr-2 text-[10.5px] text-slate-600 dark:text-slate-300">
                        {log.slideCount}
                      </td>
                      <td className="py-1.5 pr-2 text-[10.5px] text-slate-600 dark:text-slate-300">
                        {log.language.toUpperCase()} · {log.format}
                      </td>
                      <td className="py-1.5">
                        <Pill tone={log.status === 'SUCCES' ? 'emerald' : 'red'}>
                          {log.status === 'SUCCES' ? 'Succès' : 'Échec'}
                        </Pill>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </GdsCard>
      </div>
    );
  })();

  const canContinue = step !== 1 || hasContent;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="4xl"
      title="Exporter vers PowerPoint"
      subtitle="Assistant de création d’une présentation MAMORA BI pour la direction"
    >
      {!canExport ? (
        <EmptyState
          icon={Lock}
          title="Export PowerPoint non autorisé"
          hint={`Votre profil ${currentUser.role} ne dispose pas de l’habilitation « Exporter des données ». Contactez un administrateur.`}
        />
      ) : (
        <div className="space-y-3">
          <ol className="flex flex-wrap items-center gap-1.5">
            {STEPS.map(({ index, label, icon: Icon }) => (
              <li key={index} className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={index > step}
                  onClick={() => setStep(index)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${
                    step === index
                      ? 'bg-violet-600 text-white'
                      : index < step
                        ? 'text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-950/40 hover:bg-violet-100'
                        : 'text-slate-400 bg-slate-50 dark:bg-slate-800 cursor-not-allowed'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  Étape {index} · {label}
                </button>
                {index < STEPS.length && <ArrowRight className="w-3.5 h-3.5 text-slate-300" />}
              </li>
            ))}
          </ol>

          {(error || notice) && (
            <Notice
              tone={error ? 'error' : 'success'}
              message={error || notice}
              onClose={() => {
                setError('');
                setNotice('');
              }}
            />
          )}

          {stepBody}

          <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              className={btnGhost}
              disabled={step === 1 || busy}
              onClick={() => setStep(current => Math.max(1, current - 1))}
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Précédent
            </button>
            <span className="text-[10px] text-slate-500 flex items-center gap-1">
              <Globe className="w-3 h-3" />
              Données réelles du moteur analytique MAMORA BI · périmètre de {currentUser.role}
            </span>
            {step < 4 ? (
              <button
                type="button"
                className={btnPrimary}
                disabled={!canContinue || busy}
                onClick={() => setStep(current => Math.min(4, current + 1))}
              >
                Suivant <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button type="button" className={btnPrimary} onClick={generate} disabled={busy || !deck}>
                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                Exporter
              </button>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
};
