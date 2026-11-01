/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * MAMORA BI — Coque du module Business Intelligence & AI Analyst.
 * Lecture seule sur les données métier : dashboards, explorateur, KPI,
 * rapports, alertes et assistant analytique partagent le même périmètre.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  BellRing,
  Boxes,
  CalendarRange,
  Compass,
  Database,
  FileText,
  Gauge,
  LayoutDashboard,
  Lock,
  Presentation,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  Warehouse as WarehouseIcon,
} from 'lucide-react';
import { storage } from '../../services/storage';
import { resolveBiPeriod } from '../../services/bi/engine';
import {
  BI_KPI_PERIOD_LABELS,
  BiAiResponse,
  BiKpiPeriod,
  BiPermission,
  BiPeriod,
  BiPptxExportPreset,
  BiQueryResult,
  BiSourceId,
  BiWidgetType,
  User,
} from '../../types';
import {
  EmptyState,
  GdsCard,
  Notice,
  Pill,
  btnGhost,
  btnPrimary,
  inputCls,
  labelCls,
} from './gds/GdsShared';
import {
  BiChart,
  BiDataTable,
  BiKpiTile,
  BiNote,
  fmtBi,
  fmtBiNumber,
} from './bi/BiShared';
import { BiDashboardSection } from './bi/BiDashboardSection';
import { BiExplorerSection } from './bi/BiExplorerSection';
import { BiKpiSection } from './bi/BiKpiSection';
import { BiReportSection } from './bi/BiReportSection';
import { BiAlertSection } from './bi/BiAlertSection';
import { BiPptxWizard } from './bi/BiPptxWizard';

export type BiSection =
  | 'OVERVIEW'
  | 'DASHBOARDS'
  | 'EXPLORER'
  | 'KPIS'
  | 'REPORTS'
  | 'ALERTS'
  | 'AI';

export const BI_SECTION_LABELS: Record<BiSection, string> = {
  OVERVIEW: 'Vue d’ensemble',
  DASHBOARDS: 'Tableaux de bord',
  EXPLORER: 'Explorateur',
  KPIS: 'KPI',
  REPORTS: 'Rapports',
  ALERTS: 'Alertes',
  AI: 'AI Analyst',
};

const SECTION_PERMISSIONS: Record<BiSection, BiPermission> = {
  OVERVIEW: 'BI_VIEW',
  DASHBOARDS: 'BI_DASHBOARD_VIEW',
  EXPLORER: 'BI_EXPLORE',
  KPIS: 'BI_VIEW',
  REPORTS: 'BI_VIEW',
  ALERTS: 'BI_VIEW',
  AI: 'BI_AI_USE',
};

const SECTION_ICONS: Record<BiSection, React.ElementType> = {
  OVERVIEW: LayoutDashboard,
  DASHBOARDS: BarChart3,
  EXPLORER: Compass,
  KPIS: Gauge,
  REPORTS: FileText,
  ALERTS: BellRing,
  AI: Sparkles,
};

const PERIOD_PRESETS: BiKpiPeriod[] = [
  'CURRENT_MONTH',
  'LAST_MONTH',
  'CURRENT_QUARTER',
  'CURRENT_YEAR',
  'LAST_12_MONTHS',
  'ALL',
  'CUSTOM',
];

const OVERVIEW_MEASURES: Array<{
  code: string;
  tone: 'blue' | 'emerald' | 'amber' | 'red' | 'violet' | 'slate';
  icon: React.ElementType;
}> = [
  { code: 'PROD_TOTAL', tone: 'blue', icon: Boxes },
  { code: 'PROD_CONFORME', tone: 'emerald', icon: ShieldCheck },
  { code: 'TAUX_CONFORMITE', tone: 'violet', icon: Gauge },
  { code: 'STOCK_DISPO', tone: 'amber', icon: WarehouseIcon },
  { code: 'NC_OUVERTES', tone: 'red', icon: AlertTriangle },
  { code: 'TAUX_REALISATION', tone: 'slate', icon: Activity },
];

const AI_SUGGESTIONS = [
  'Quelle est la production des 12 derniers mois ?',
  'Quels articles sont sous le stock minimum ?',
  'Quels fournisseurs ont des retards de réception ?',
  'Quel est le taux de conformité du mois en cours ?',
];

/** Convertit le graphique renvoyé par l'analyste en résultat analytique affichable. */
const aiChartResult = (response: BiAiResponse): BiQueryResult | null => {
  const chart = response.chart;
  if (!chart || chart.data.length === 0) return null;
  const first = chart.data[0] ?? {};
  const xKey = chart.xKey ?? Object.keys(first)[0];
  if (!xKey) return null;
  const series =
    chart.series && chart.series.length > 0
      ? chart.series
      : Object.keys(first).filter(key => key !== xKey);
  return {
    source: response.query?.source ?? ('production' as BiSourceId),
    sourceLabel: 'MAMORA AI Analyst',
    columns: [
      { key: xKey, label: xKey, role: 'DIMENSION', format: 'NUMBER' },
      ...series.map(key => ({
        key,
        label: key,
        role: 'MEASURE' as const,
        format: 'NUMBER' as const,
      })),
    ],
    rows: chart.data,
    totalRows: chart.data.length,
    truncated: false,
    generatedAt: response.generatedAt,
    filters: [],
    period: response.period,
    scope: storage.getBiScope(),
    warnings: [],
  };
};

interface MamoraBiViewProps {
  currentUser: User;
}

export const MamoraBiView: React.FC<MamoraBiViewProps> = ({ currentUser }) => {
  const [section, setSection] = useState<BiSection>('OVERVIEW');
  const [revision, setRevision] = useState(0);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [periodMode, setPeriodMode] = useState<BiKpiPeriod>('LAST_12_MONTHS');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [question, setQuestion] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiResponse, setAiResponse] = useState<BiAiResponse | null>(null);
  const [aiHistory, setAiHistory] = useState<BiAiResponse[]>([]);
  const [pptxOpen, setPptxOpen] = useState(false);
  const [pptxPreset, setPptxPreset] = useState<BiPptxExportPreset | null>(null);

  useEffect(() => storage.subscribe(() => setRevision(value => value + 1)), []);

  const period: BiPeriod = useMemo(
    () =>
      resolveBiPeriod(periodMode, new Date(), {
        from: customFrom || undefined,
        to: customTo || undefined,
        label: 'Période personnalisée',
      }),
    [periodMode, customFrom, customTo]
  );

  const hasView = storage.canBi('BI_VIEW', currentUser);
  const canRefresh = hasView;
  const canExplore = storage.canBi('BI_EXPLORE', currentUser);
  const canExportPptx = storage.canBi('BI_EXPORT', currentUser);

  /**
   * Ouvre l'assistant d'export PowerPoint avec le contexte de la section
   * d'origine (tableau de bord, rapport, KPI, explorateur ou analyse IA).
   */
  const openPptx = (preset: BiPptxExportPreset) => {
    if (!canExportPptx) {
      fail("Votre profil ne dispose pas de l'habilitation « Exporter vers PowerPoint ».");
      return;
    }
    setPptxPreset(preset);
    setPptxOpen(true);
  };

  const closePptx = () => {
    setPptxOpen(false);
    setPptxPreset(null);
  };

  const overview = useMemo(() => {
    if (!hasView) return null;
    try {
      return { data: storage.getBiOverview(period), error: '' };
    } catch (caught) {
      return {
        data: null,
        error: caught instanceof Error ? caught.message : String(caught),
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasView, period, revision, currentUser]);

  const productionChart = useMemo(() => {
    if (!hasView || !canExplore) return null;
    try {
      return storage.runBiQuery({
        source: 'production',
        dimensions: ['monthLabel'],
        measures: ['totalCans', 'conformingCans', 'rejectedCans'],
        filters: [
          ...(period.from ? [{ field: 'date', operator: 'GTE' as const, value: period.from }] : []),
          ...(period.to ? [{ field: 'date', operator: 'LTE' as const, value: period.to }] : []),
        ],
        limit: 24,
      });
    } catch {
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasView, canExplore, period, revision]);

  const recentEvents = useMemo(() => {
    if (!hasView) return [];
    try {
      return storage.getBiAlertEvents().slice(0, 5);
    } catch {
      return [];
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasView, revision]);

  const notify = (message: string) => {
    setNotice(message);
    setError('');
  };
  const fail = (message: string) => {
    setError(message);
    setNotice('');
  };

  const refresh = () => {
    try {
      const log = storage.refreshBiSnapshot();
      const total = Object.values(log.sourceCounts).reduce((sum, value) => sum + (value ?? 0), 0);
      notify(
        `Données actualisées en ${log.durationMs} ms — ${fmtBiNumber(total)} enregistrement(s) analytique(s).`
      );
      setRevision(value => value + 1);
    } catch (caught) {
      fail(caught instanceof Error ? caught.message : String(caught));
    }
  };

  const ask = (rawQuestion: string) => {
    const trimmed = rawQuestion.trim();
    if (!trimmed) return;
    setAiBusy(true);
    try {
      const response = storage.askBiAnalyst(trimmed, period);
      setAiResponse(response);
      setAiHistory(history => [response, ...history].slice(0, 8));
      setNotice('Réponse générée à partir des données analytiques autorisées.');
      setError('');
      setRevision(value => value + 1);
    } catch (caught) {
      fail(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setAiBusy(false);
    }
  };

  if (!hasView) {
    return (
      <div className="space-y-4">
        <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-violet-600" />
            MAMORA BI — Business Intelligence &amp; AI Analyst
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Analyse décisionnelle en lecture seule sur les données MAMORA GP.
          </p>
        </div>
        <GdsCard>
          <EmptyState
            icon={Lock}
            title="Accès MAMORA BI non autorisé"
            hint={`Votre profil ${currentUser.role} ne dispose pas de l’habilitation « Consulter MAMORA BI ». Contactez un administrateur.`}
          />
        </GdsCard>
      </div>
    );
  }

  const data = overview?.data ?? null;
  const scope = data?.scope ?? storage.getBiScope(currentUser);
  const warnings = data?.warnings ?? [];

  const sectionBody = (() => {
    switch (section) {
      case 'OVERVIEW': {
        if (overview?.error) {
          return <BiNote tone="error">{overview.error}</BiNote>;
        }
        if (!data) {
          return (
            <GdsCard>
              <EmptyState icon={BarChart3} title="Aucune donnée analytique" hint="Actualisez les données." />
            </GdsCard>
          );
        }
        const totalRecords = Object.values(data.counts).reduce((sum, value) => sum + value, 0);
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2.5">
              {OVERVIEW_MEASURES.map(({ code, tone, icon }) => {
                const detail = data.details.find(item => item.code === code);
                return (
                  <BiKpiTile
                    key={code}
                    label={detail?.label ?? code}
                    value={fmtBi(detail?.value ?? null, detail?.format ?? 'NUMBER', detail?.unit ?? '')}
                    hint={detail?.source ?? undefined}
                    tone={tone}
                    icon={icon}
                  />
                );
              })}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1.6fr_1fr] gap-3">
              <GdsCard
                title="Production mensuelle"
                subtitle={
                  canExplore
                    ? 'Lots finis — production totale, conforme et rejetée.'
                    : 'Graphique disponible avec l’habilitation « Explorer les données ».'
                }
              >
                {productionChart ? (
                  <BiChart
                    type="COMBO"
                    result={productionChart}
                    height={280}
                    options={{ showLegend: true, showGrid: true, maxRows: 24 }}
                  />
                ) : (
                  <EmptyState
                    icon={Compass}
                    title="Visualisation non disponible"
                    hint="Le périmètre ou l’habilitation ne permet pas d’exécuter cette requête."
                  />
                )}
              </GdsCard>

              <div className="space-y-3">
                <GdsCard title="KPI actifs" subtitle={`${data.kpis.length} indicateur(s) calculé(s)`}>
                  {data.kpis.length === 0 ? (
                    <EmptyState icon={Gauge} title="Aucun KPI actif" hint="Créez un KPI dans l’onglet KPI." />
                  ) : (
                    <div className="space-y-1.5">
                      {data.kpis.slice(0, 5).map(computation => (
                        <div
                          key={computation.kpi.id}
                          className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg border border-slate-100 dark:border-slate-800"
                        >
                          <div className="min-w-0">
                            <div className="text-[11px] font-semibold truncate">{computation.kpi.name}</div>
                            <div className="text-[9.5px] text-slate-400">
                              {BI_KPI_PERIOD_LABELS[computation.kpi.period]}
                              {computation.error ? ` · ${computation.error}` : ''}
                            </div>
                          </div>
                          <div className="text-[11.5px] font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                            {fmtBi(computation.value, computation.kpi.format, computation.kpi.unit, computation.kpi.precision)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </GdsCard>

                <GdsCard
                  title="Alertes récentes"
                  subtitle={`${data.openAlerts} alerte(s) non acquittée(s)`}
                  actions={
                    <button type="button" className={btnGhost} onClick={() => setSection('ALERTS')}>
                      <BellRing className="w-3.5 h-3.5" /> Voir
                    </button>
                  }
                >
                  {recentEvents.length === 0 ? (
                    <EmptyState icon={BellRing} title="Aucune alerte" hint="Lancez une évaluation dans l’onglet Alertes." />
                  ) : (
                    <div className="space-y-1.5">
                      {recentEvents.map(event => (
                        <div key={event.id} className="text-[10.5px] flex items-start gap-1.5">
                          <Pill tone={event.severity === 'CRITIQUE' ? 'red' : event.severity === 'AVERTISSEMENT' ? 'amber' : 'blue'}>
                            {event.severity}
                          </Pill>
                          <span className="text-slate-600 dark:text-slate-300 line-clamp-2">{event.message}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </GdsCard>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
              <GdsCard title="Périmètre analytique appliqué" subtitle="Le même périmètre s’applique aux dashboards, exports, partages et questions IA.">
                <div className="flex flex-wrap items-center gap-2 text-[10.5px]">
                  <Pill tone="blue">
                    <WarehouseIcon className="w-3 h-3 inline mr-1" />
                    {scope.allWarehouses ? 'Tous les magasins' : `${scope.warehouseIds.length} magasin(s)`}
                  </Pill>
                  <Pill tone="violet">
                    {scope.allDepartments ? 'Tous les services' : `${scope.departments.length} service(s)`}
                  </Pill>
                  <Pill tone="slate">Profil {scope.role}</Pill>
                  <Pill tone="emerald">{fmtBiNumber(totalRecords)} enregistrement(s)</Pill>
                </div>
                <div className="mt-2 text-[10px] text-slate-500">
                  Données construites le {new Date(data.generatedAt).toLocaleString('fr-FR')} — lecture seule,
                  aucune écriture dans les stocks, consommations ou ordres de fabrication.
                </div>
              </GdsCard>

              <GdsCard title="Sources analytiques" subtitle="Une seule source canonique par mesure, sans double comptage.">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {(Object.entries(data.counts) as Array<[BiSourceId, number]>).map(([sourceId, count]) => (
                    <div
                      key={sourceId}
                      className="px-2 py-1.5 rounded-lg border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1"
                    >
                      <span className="text-[10px] text-slate-500 truncate">{sourceId}</span>
                      <span className="text-[10.5px] font-bold">{fmtBiNumber(count)}</span>
                    </div>
                  ))}
                </div>
              </GdsCard>
            </div>

            {warnings.length > 0 && (
              <BiNote tone="warning">
                <span className="font-semibold">Limites analytiques : </span>
                {warnings.join(' ')}
              </BiNote>
            )}
          </div>
        );
      }

      case 'DASHBOARDS':
        return (
          <BiDashboardSection
            currentUser={currentUser}
            period={period}
            revision={revision}
            onNotice={notify}
            onError={fail}
            onChanged={() => setRevision(value => value + 1)}
            onExportPptx={openPptx}
          />
        );

      case 'EXPLORER':
        return (
          <BiExplorerSection
            currentUser={currentUser}
            period={period}
            revision={revision}
            onNotice={notify}
            onError={fail}
            onExportPptx={openPptx}
          />
        );

      case 'KPIS':
        return (
          <BiKpiSection
            currentUser={currentUser}
            revision={revision}
            onNotice={notify}
            onError={fail}
            onChanged={() => setRevision(value => value + 1)}
            onExportPptx={openPptx}
          />
        );

      case 'REPORTS':
        return (
          <BiReportSection
            currentUser={currentUser}
            period={period}
            revision={revision}
            onNotice={notify}
            onError={fail}
            onChanged={() => setRevision(value => value + 1)}
            onExportPptx={openPptx}
          />
        );

      case 'ALERTS':
        return (
          <BiAlertSection
            currentUser={currentUser}
            revision={revision}
            onNotice={notify}
            onError={fail}
            onChanged={() => setRevision(value => value + 1)}
          />
        );

      case 'AI': {
        const provider = storage.getBiAnalystProvider();
        const chartResult = aiResponse ? aiChartResult(aiResponse) : null;
        return (
          <div className="space-y-3">
            <GdsCard
              title="MAMORA AI Analyst"
              subtitle="Réponses déterministes calculées par le moteur analytique. Aucun chiffre n’est inventé."
              actions={
                <Pill tone={provider.available ? 'emerald' : 'amber'}>
                  {provider.available ? 'moteur local' : 'repli local'}
                </Pill>
              }
            >
              <div className="space-y-2.5">
                <div>
                  <label className={labelCls}>Question</label>
                  <div className="flex items-start gap-2">
                    <textarea
                      className={`${inputCls} w-full h-20`}
                      value={question}
                      onChange={event => setQuestion(event.target.value)}
                      placeholder="Ex : quelle est la production des 12 derniers mois ?"
                      onKeyDown={event => {
                        if (event.key === 'Enter' && !event.shiftKey) {
                          event.preventDefault();
                          ask(question);
                        }
                      }}
                    />
                    <button
                      type="button"
                      className={btnPrimary}
                      onClick={() => ask(question)}
                      disabled={aiBusy || !question.trim()}
                    >
                      <Send className="w-3.5 h-3.5" /> {aiBusy ? 'Analyse…' : 'Analyser'}
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {AI_SUGGESTIONS.map(suggestion => (
                    <button
                      key={suggestion}
                      type="button"
                      className={btnGhost}
                      onClick={() => {
                        setQuestion(suggestion);
                        ask(suggestion);
                      }}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-500">
                  Fournisseur : {provider.label}.{' '}
                  {provider.reason ?? 'Les calculs proviennent exclusivement du snapshot analytique autorisé.'}
                </p>
              </div>
            </GdsCard>

            {!aiResponse ? (
              <GdsCard>
                <EmptyState
                  icon={Sparkles}
                  title="Posez une question sur vos données"
                  hint="Production, stocks, qualité, achats, ventes, maintenance — dans la limite de votre périmètre."
                />
              </GdsCard>
            ) : (
              <>
                <GdsCard
                  title="Réponse"
                  subtitle={`Intention ${aiResponse.intent} · ${new Date(aiResponse.generatedAt).toLocaleString('fr-FR')}`}
                  actions={
                    <div className="flex items-center gap-1.5">
                      {canExportPptx && (
                        <button
                          type="button"
                          className={btnGhost}
                          title="Exporter cette analyse AI Analyst vers PowerPoint"
                          onClick={() =>
                            openPptx({
                              source: 'AI',
                              title: `AI Analyst — ${aiResponse.intent}`,
                              aiResponse,
                              query: aiResponse.query,
                            })
                          }
                        >
                          <Presentation className="w-3.5 h-3.5" /> PowerPoint
                        </button>
                      )}
                      <Pill tone={aiResponse.usedFallback ? 'amber' : 'emerald'}>
                        {aiResponse.usedFallback ? 'repli local' : 'moteur local'}
                      </Pill>
                    </div>
                  }
                >
                  <p className="text-[12px] font-semibold text-slate-800 dark:text-slate-100">
                    {aiResponse.answer}
                  </p>
                  {aiResponse.facts.length > 0 && (
                    <ul className="mt-2 space-y-1 list-disc pl-4 text-[11px] text-slate-600 dark:text-slate-300">
                      {aiResponse.facts.map(fact => (
                        <li key={fact}>{fact}</li>
                      ))}
                    </ul>
                  )}
                  {aiResponse.recommendations.length > 0 && (
                    <div className="mt-2">
                      <p className="text-[10px] font-bold uppercase text-slate-500">Recommandations</p>
                      <ul className="mt-1 space-y-1 list-disc pl-4 text-[11px] text-slate-600 dark:text-slate-300">
                        {aiResponse.recommendations.map(item => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {aiResponse.limitations.length > 0 && (
                    <div className="mt-2">
                      <BiNote tone="warning">{aiResponse.limitations.join(' ')}</BiNote>
                    </div>
                  )}
                </GdsCard>

                {chartResult && (
                  <GdsCard title={aiResponse.chart?.title ?? 'Visualisation'} subtitle="Graphique construit à partir du résultat analytique.">
                    <BiChart
                      type={(aiResponse.chart?.type ?? 'COLUMN') as BiWidgetType}
                      result={chartResult}
                      height={300}
                      options={{ showLegend: true, showGrid: true, maxRows: 50 }}
                    />
                  </GdsCard>
                )}

                {aiResponse.result && (
                  <GdsCard title="Données utilisées" bodyClassName="p-0">
                    <BiDataTable result={aiResponse.result} maxRows={100} />
                  </GdsCard>
                )}

                {aiResponse.query && (
                  <GdsCard title="Plan de requête contrôlé" subtitle="Source, dimensions et mesures issues de la liste blanche.">
                    <div className="flex flex-wrap gap-1.5 text-[10px]">
                      <Pill tone="blue">{aiResponse.query.source}</Pill>
                      {aiResponse.query.dimensions.map(dimension => (
                        <Pill key={dimension} tone="violet">
                          dim · {dimension}
                        </Pill>
                      ))}
                      {aiResponse.query.measures.map(measure => (
                        <Pill key={measure} tone="emerald">
                          mesure · {measure}
                        </Pill>
                      ))}
                      {aiResponse.query.filters.map((filter, index) => (
                        <Pill key={`${filter.field}-${index}`} tone="amber">
                          {filter.field} {filter.operator} {String(filter.value ?? '')}
                        </Pill>
                      ))}
                    </div>
                  </GdsCard>
                )}
              </>
            )}

            {aiHistory.length > 1 && (
              <GdsCard title="Historique de session" subtitle="Les questions ne sont pas persistées en dehors du journal d’audit.">
                <div className="space-y-1.5">
                  {aiHistory.map((response, index) => (
                    <button
                      key={`${response.generatedAt}-${index}`}
                      type="button"
                      className="w-full text-left px-2 py-1.5 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      onClick={() => setAiResponse(response)}
                    >
                      <div className="text-[10.5px] font-semibold truncate">{response.answer}</div>
                      <div className="text-[9.5px] text-slate-400">
                        {response.intent} · {new Date(response.generatedAt).toLocaleTimeString('fr-FR')}
                      </div>
                    </button>
                  ))}
                </div>
              </GdsCard>
            )}
          </div>
        );
      }

      default:
        return null;
    }
  })();

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-violet-600" />
              <span>MAMORA BI</span>
              <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800">
                Business Intelligence
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {BI_SECTION_LABELS[section]} · analyse en lecture seule des données MAMORA GP
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[10.5px] text-slate-600 dark:text-slate-300">
              <WarehouseIcon className="w-3.5 h-3.5" />
              {scope.allWarehouses ? 'Tous magasins' : `${scope.warehouseIds.length} magasin(s)`}
            </div>
            <div className="inline-flex items-center gap-1 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[10.5px] text-slate-600 dark:text-slate-300">
              <Database className="w-3.5 h-3.5" />
              Snapshot {data ? new Date(data.generatedAt).toLocaleTimeString('fr-FR') : '—'}
            </div>
            <button type="button" className={btnGhost} onClick={refresh} disabled={!canRefresh}>
              <RefreshCw className="w-3.5 h-3.5" /> Actualiser
            </button>
            <button
              type="button"
              className={btnGhost}
              disabled={!canExportPptx}
              title={
                canExportPptx
                  ? 'Ouvrir l’assistant d’export PowerPoint'
                  : 'Habilitation « Exporter vers PowerPoint » requise'
              }
              onClick={() => openPptx({ source: 'OVERVIEW', title: 'MAMORA BI — Analyse de performance' })}
            >
              <Presentation className="w-3.5 h-3.5" /> PowerPoint
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3 border-t border-slate-100 dark:border-slate-800 pt-3">
          <nav className="flex flex-wrap items-center gap-1" aria-label="Sections MAMORA BI">
            {(Object.keys(BI_SECTION_LABELS) as BiSection[]).map(key => {
              const Icon = SECTION_ICONS[key];
              const allowed = storage.canBi(SECTION_PERMISSIONS[key], currentUser);
              return (
                <button
                  key={key}
                  type="button"
                  disabled={!allowed}
                  title={allowed ? BI_SECTION_LABELS[key] : `Habilitation requise : ${SECTION_PERMISSIONS[key]}`}
                  onClick={() => {
                    setSection(key);
                    setNotice('');
                    setError('');
                  }}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${
                    section === key
                      ? 'bg-violet-600 text-white'
                      : allowed
                        ? 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        : 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {BI_SECTION_LABELS[key]}
                  {!allowed && <Lock className="w-3 h-3" />}
                </button>
              );
            })}
          </nav>

          <div className="flex flex-wrap items-end gap-2">
            <div>
              <label className={labelCls}>Période d’analyse</label>
              <div className="flex items-center gap-1.5">
                <CalendarRange className="w-3.5 h-3.5 text-slate-400" />
                <select
                  className={inputCls}
                  value={periodMode}
                  onChange={event => setPeriodMode(event.target.value as BiKpiPeriod)}
                >
                  {PERIOD_PRESETS.map(preset => (
                    <option key={preset} value={preset}>
                      {BI_KPI_PERIOD_LABELS[preset]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {periodMode === 'CUSTOM' && (
              <>
                <div>
                  <label className={labelCls}>Du</label>
                  <input
                    type="date"
                    className={inputCls}
                    value={customFrom}
                    onChange={event => setCustomFrom(event.target.value)}
                  />
                </div>
                <div>
                  <label className={labelCls}>Au</label>
                  <input
                    type="date"
                    className={inputCls}
                    value={customTo}
                    onChange={event => setCustomTo(event.target.value)}
                  />
                </div>
              </>
            )}
          </div>
        </div>

        <div className="text-[10px] text-slate-500">
          {period.label ??
            (period.from || period.to
              ? `${period.from ?? 'début'} → ${period.to ?? 'aujourd’hui'}`
              : 'Toutes périodes')}
        </div>
      </div>

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

      {sectionBody}

      <BiPptxWizard
        isOpen={pptxOpen}
        onClose={closePptx}
        currentUser={currentUser}
        period={period}
        preset={pptxPreset}
        aiResponses={aiHistory}
      />
    </div>
  );
};
