/**
 * MAMORA BI — Planification d'une présentation PowerPoint.
 *
 * Ce module est volontairement pur : il ne lit ni localStorage ni le DOM.
 * Il transforme des résultats analytiques déjà résolus (avec habilitations et
 * périmètre appliqués par le stockage) en une structure de diapositives
 * sérialisable, éditable dans l'assistant puis rendue par `pptx-render.ts`.
 *
 * Règles :
 *  - aucune diapositive vide ;
 *  - aucune valeur inventée : une donnée absente est affichée « — » ;
 *  - un graphique par diapositive pour éviter toute déformation ;
 *  - les données sources restent jointes aux graphiques natifs PowerPoint.
 */

import type { BiKpiComputation } from './engine';
import { BI_MEASURES, BI_SOURCES } from './catalog';
import type {
  BiAiResponse,
  BiAlertEvent,
  BiDashboard,
  BiDomain,
  BiKpi,
  BiMeasureValue,
  BiPeriod,
  BiPptxChartBlock,
  BiPptxComparisonRow,
  BiPptxConfig,
  BiPptxContentSummary,
  BiPptxDeck,
  BiPptxKpiBlock,
  BiPptxLanguage,
  BiPptxSelection,
  BiPptxSlide,
  BiPptxTableBlock,
  BiPptxTextBlock,
  BiQuery,
  BiQueryResult,
  BiReport,
  BiScope,
  BiValueFormat,
  BiWidget,
  BiWidgetType,
} from '../../types';

// ---------------------------------------------------------------------------
// Libellés bilingues
// ---------------------------------------------------------------------------

export interface BiPptxLabels {
  kicker: string;
  generatedOn: string;
  author: string;
  period: string;
  department: string;
  scope: string;
  scopeAllWarehouses: string;
  scopeWarehouses: (count: number) => string;
  scopeAllDepartments: string;
  scopeDepartments: (count: number) => string;
  toc: string;
  executiveSummary: string;
  kpis: string;
  kpiDetail: string;
  comparison: string;
  currentPeriod: string;
  previousPeriod: string;
  delta: string;
  deltaPercent: string;
  indicator: string;
  alerts: string;
  ai: string;
  aiAnswer: string;
  facts: string;
  hypotheses: string;
  recommendations: string;
  limitations: string;
  conclusion: string;
  comment: string;
  observations: string;
  sources: string;
  source: string;
  unit: string;
  definition: string;
  filters: string;
  lastRefresh: string;
  generatedAt: string;
  notCalculable: string;
  noData: string;
  rowsShown: (shown: number, total: number) => string;
  topCategories: (shown: number, total: number) => string;
  nullAsZero: string;
  domainProduction: string;
  domainConsumption: string;
  domainRawMaterials: string;
  domainFinishedGoods: string;
  domainQuality: string;
  domainSupply: string;
  domainCommercial: string;
  domainMaintenance: string;
  domainStock: string;
  footer: string;
  slide: string;
  target: string;
  definitionNote: string;
  scopeNote: string;
  readOnly: string;
  noRecommendation: string;
  contentTypes: string;
  charts: string;
  tables: string;
  aiDisclaimer: string;
  dashboard: string;
  report: string;
  explorer: string;
  selectedContent: string;
}

const FR: BiPptxLabels = {
  kicker: 'MAMORA BUSINESS INTELLIGENCE',
  generatedOn: 'Généré le',
  author: 'Auteur',
  period: 'Période',
  department: 'Service',
  scope: 'Périmètre',
  scopeAllWarehouses: 'Tous les magasins',
  scopeWarehouses: count => `${count} magasin(s)`,
  scopeAllDepartments: 'Tous les services',
  scopeDepartments: count => `${count} service(s)`,
  toc: 'Sommaire',
  executiveSummary: 'Synthèse exécutive',
  kpis: 'Indicateurs clés',
  kpiDetail: 'Détail des KPI',
  comparison: 'Comparaison de périodes',
  currentPeriod: 'Période courante',
  previousPeriod: 'Période précédente',
  delta: 'Écart',
  deltaPercent: 'Écart %',
  indicator: 'Indicateur',
  alerts: 'Alertes & anomalies',
  ai: 'Analyse MAMORA AI',
  aiAnswer: 'Réponse',
  facts: 'Faits',
  hypotheses: 'Hypothèses',
  recommendations: 'Recommandations',
  limitations: 'Limites',
  conclusion: 'Conclusions',
  comment: 'Commentaire',
  observations: 'Observations',
  sources: 'Sources, période & définitions',
  source: 'Source',
  unit: 'Unité',
  definition: 'Définition',
  filters: 'Filtres',
  lastRefresh: 'Dernier rafraîchissement',
  generatedAt: 'Date de génération',
  notCalculable: 'Non calculable',
  noData: 'Données non disponibles pour cette période.',
  rowsShown: (shown, total) => `${shown} ligne(s) affichée(s) sur ${total}`,
  topCategories: (shown, total) =>
    `Top ${shown} sur ${total} catégories — données complètes disponibles dans la source analytique.`,
  nullAsZero:
    'Les valeurs non calculables sont représentées par 0 dans le graphique ; elles restent « — » dans les tableaux.',
  domainProduction: 'Production & rendement',
  domainConsumption: 'Consommation & matières',
  domainRawMaterials: 'Matières premières & composants',
  domainFinishedGoods: 'Produits finis',
  domainQuality: 'Qualité & HACCP',
  domainSupply: 'Approvisionnement & achats',
  domainCommercial: 'Commercial & encaissements',
  domainMaintenance: 'Maintenance & équipements',
  domainStock: 'Stocks & GDS',
  footer: 'MAMORA GP — Business Intelligence',
  slide: 'Diapositive',
  target: 'Objectif',
  definitionNote: 'Chaque indicateur conserve sa définition, son unité et sa source.',
  scopeNote: 'Le périmètre magasin / service de l’utilisateur est appliqué à toutes les données.',
  readOnly: 'Couche analytique en lecture seule : aucune donnée métier n’est modifiée.',
  noRecommendation: 'Aucune action prioritaire identifiée par le moteur analytique sur la période.',
  contentTypes: 'Contenus',
  charts: 'graphique(s)',
  tables: 'tableau(x)',
  aiDisclaimer:
    'Les commentaires IA sont issus du moteur analytique local. Les faits, hypothèses et recommandations sont distingués et restent modifiables avant génération.',
  dashboard: 'Tableau de bord',
  report: 'Rapport',
  explorer: 'Analyse exploratoire',
  selectedContent: 'Contenu sélectionné',
};

const AR: BiPptxLabels = {
  kicker: 'MAMORA لذكاء الأعمال',
  generatedOn: 'أُنشئ في',
  author: 'المُعد',
  period: 'الفترة',
  department: 'المصلحة',
  scope: 'نطاق الصلاحية',
  scopeAllWarehouses: 'كل المخازن',
  scopeWarehouses: count => `${count} مخزن`,
  scopeAllDepartments: 'كل المصالح',
  scopeDepartments: count => `${count} مصلحة`,
  toc: 'الفهرس',
  executiveSummary: 'الملخص التنفيذي',
  kpis: 'المؤشرات الرئيسية',
  kpiDetail: 'تفصيل المؤشرات',
  comparison: 'مقارنة الفترات',
  currentPeriod: 'الفترة الحالية',
  previousPeriod: 'الفترة السابقة',
  delta: 'الفرق',
  deltaPercent: 'الفرق %',
  indicator: 'المؤشر',
  alerts: 'التنبيهات والحالات الشاذة',
  ai: 'تحليل MAMORA AI',
  aiAnswer: 'الإجابة',
  facts: 'وقائع',
  hypotheses: 'فرضيات',
  recommendations: 'توصيات',
  limitations: 'حدود التحليل',
  conclusion: 'الاستنتاجات',
  comment: 'تعليق',
  observations: 'ملاحظات',
  sources: 'المصادر والفترة والتعريفات',
  source: 'المصدر',
  unit: 'الوحدة',
  definition: 'التعريف',
  filters: 'المرشحات',
  lastRefresh: 'آخر تحديث',
  generatedAt: 'تاريخ الإنشاء',
  notCalculable: 'غير قابل للحساب',
  noData: 'البيانات غير متاحة لهذه الفترة.',
  rowsShown: (shown, total) => `${shown} سطر(ًا) معروض(ًا) من ${total}`,
  topCategories: (shown, total) =>
    `أفضل ${shown} من ${total} فئة — البيانات الكاملة متاحة في المصدر التحليلي.`,
  nullAsZero:
    'القيم غير القابلة للحساب تظهر كـ 0 في الرسم البياني، وتبقى « — » في الجداول.',
  domainProduction: 'الإنتاج والمردود',
  domainConsumption: 'الاستهلاك والمواد',
  domainRawMaterials: 'المواد الأولية والمكونات',
  domainFinishedGoods: 'المنتجات النهائية',
  domainQuality: 'الجودة وHACCP',
  domainSupply: 'التزويد والمشتريات',
  domainCommercial: 'التجاري والتحصيل',
  domainMaintenance: 'الصيانة والتجهيزات',
  domainStock: 'المخزون وإدارة المخزون',
  footer: 'MAMORA GP — ذكاء الأعمال',
  slide: 'شريحة',
  target: 'الهدف',
  definitionNote: 'كل مؤشر يحتفظ بتعريفه ووحدته ومصدره.',
  scopeNote: 'يُطبّق نطاق المخزن / المصلحة الخاص بالمستخدم على كل البيانات.',
  readOnly: 'طبقة تحليلية للقراءة فقط: لا يتم تعديل أي بيانات تشغيلية.',
  noRecommendation: 'لم يحدد المحرك التحليلي أي إجراء ذي أولوية خلال الفترة.',
  contentTypes: 'المحتويات',
  charts: 'رسم بياني',
  tables: 'جدول',
  aiDisclaimer:
    'تعليقات الذكاء الاصطناعي صادرة عن المحرك التحليلي المحلي. يتم التمييز بين الوقائع والفرضيات والتوصيات، ويمكن تعديلها قبل الإنشاء.',
  dashboard: 'لوحة معلومات',
  report: 'تقرير',
  explorer: 'تحليل استكشافي',
  selectedContent: 'المحتوى المحدد',
};

const LABELS: Record<BiPptxLanguage, BiPptxLabels> = { fr: FR, ar: AR };

export const getBiPptxLabels = (language: BiPptxLanguage): BiPptxLabels =>
  LABELS[language] ?? FR;

// ---------------------------------------------------------------------------
// Entrées résolues par le stockage
// ---------------------------------------------------------------------------

export interface BiPptxResolvedWidget {
  key: string;
  dashboardId: string;
  dashboardName: string;
  widget: BiWidget;
  result?: BiQueryResult;
  error?: string;
}

export interface BiPptxResolvedDashboard {
  dashboard: BiDashboard;
  widgets: BiPptxResolvedWidget[];
}

export interface BiPptxResolvedReport {
  report: BiReport;
  result?: BiQueryResult;
  error?: string;
}

export interface BiPptxResolvedKpi {
  kpi: BiKpi;
  computation: BiKpiComputation;
}

export interface BiPptxResolvedExplorer {
  title: string;
  query: BiQuery;
  result?: BiQueryResult;
  error?: string;
}

export interface BiPptxStockSplit {
  rawMaterials?: BiQueryResult;
  finishedGoods?: BiQueryResult;
}

export interface BiPptxOverviewInput {
  details: BiMeasureValue[];
  values: Record<string, number | null>;
  kpis: BiKpiComputation[];
  warnings: string[];
  counts: Record<string, number>;
}

export interface BiPptxBuildInput {
  config: BiPptxConfig;
  selection: BiPptxSelection;
  scope: BiScope;
  periodLabel: string;
  refreshAt: string;
  overview?: BiPptxOverviewInput;
  dashboards: BiPptxResolvedDashboard[];
  reports: BiPptxResolvedReport[];
  kpis: BiPptxResolvedKpi[];
  explorer: BiPptxResolvedExplorer[];
  alerts: BiAlertEvent[];
  aiResponses: BiAiResponse[];
  comparison?: { currentLabel: string; previousLabel: string; rows: BiPptxComparisonRow[] };
  stockSplit?: BiPptxStockSplit;
  sourceLabels: string[];
  warnings?: string[];
}

// ---------------------------------------------------------------------------
// Formatage
// ---------------------------------------------------------------------------

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

/** Formate une valeur analytique ; une donnée absente reste « — ». */
export function formatBiPptxValue(
  value: number | string | null | undefined,
  format: BiValueFormat = 'NUMBER',
  unit = '',
  precision?: number
): string {
  if (value === null || value === undefined || value === '') return '—';
  if (format === 'DATE') {
    const date = new Date(String(value));
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString('fr-FR');
  }
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) return String(value);
  const digits =
    precision ?? (format === 'PERCENT' ? 1 : format === 'CURRENCY' ? 0 : format === 'DECIMAL' ? 2 : 0);
  const formatted = numeric.toLocaleString('fr-FR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  switch (format) {
    case 'PERCENT':
      return `${formatted} %`;
    case 'CURRENCY':
      return `${formatted} ${unit || 'DZD'}`;
    case 'DECIMAL':
      return unit ? `${formatted} ${unit}` : formatted;
    case 'QUANTITY':
      return unit ? `${formatted} ${unit}` : formatted;
    default:
      return unit ? `${formatted} ${unit}` : formatted;
  }
}

/** Formate une variation signée (écart ou pourcentage). */
export function formatBiPptxDelta(
  value: number | null | undefined,
  format: BiValueFormat = 'NUMBER',
  unit = '',
  percent = false
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  const sign = value > 0 ? '+' : '';
  const digits = percent ? 1 : format === 'PERCENT' ? 1 : format === 'CURRENCY' ? 0 : format === 'DECIMAL' ? 2 : 0;
  const formatted = value.toLocaleString('fr-FR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  if (percent) return `${sign}${formatted} %`;
  const suffix = unit ? ` ${unit}` : '';
  return `${sign}${formatted}${suffix}`;
}

const toNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  }
  return null;
};

const measureMeta = (
  source: BiQueryResult['source'] | undefined,
  key: string
): { label: string; unit: string; format: BiValueFormat; description: string } => {
  const field = source ? BI_SOURCES[source]?.fields.find(candidate => candidate.key === key) : undefined;
  const documented = BI_MEASURES[key];
  return {
    label: field?.label ?? documented?.label ?? key,
    unit: field?.unit ?? documented?.unit ?? '',
    format: field?.format ?? documented?.format ?? 'NUMBER',
    description: field?.description ?? documented?.description ?? '',
  };
};

// ---------------------------------------------------------------------------
// Construction des blocs
// ---------------------------------------------------------------------------

/** Construit un graphique natif à partir d'un résultat analytique réel. */
export function buildBiPptxChartBlock(
  result: BiQueryResult,
  title: string,
  type: BiWidgetType,
  options: { maxCategories?: number } = {}
): BiPptxChartBlock | null {
  const dimensions = result.columns.filter(column => column.role === 'DIMENSION');
  const measures = result.columns.filter(column => column.role === 'MEASURE');
  if (measures.length === 0 || result.rows.length === 0) return null;

  const maxCategories = options.maxCategories ?? 40;
  let rows = result.rows;

  // Pour les graphiques à catégories, on limite l'affichage en conservant les
  // catégories les plus significatives. Aucune valeur n'est agrégée ou inventée.
  let topNote = '';
  if (type !== 'SCATTER' && dimensions.length > 0 && rows.length > maxCategories) {
    const score = (row: Record<string, string | number | null>) =>
      measures.reduce((sum, column) => sum + Math.abs(toNumber(row[column.key]) ?? 0), 0);
    rows = [...rows].sort((a, b) => score(b) - score(a)).slice(0, maxCategories);
    topNote = `Top ${maxCategories} sur ${result.rows.length} catégories.`;
  }

  const categories =
    dimensions.length > 0
      ? rows.map(row =>
          dimensions
            .map(column => String(row[column.key] ?? '—'))
            .join(' · ')
            .slice(0, 80)
        )
      : measures.map(column => column.label);

  const series =
    dimensions.length > 0
      ? measures.map(column => ({
          name: column.label,
          values: rows.map(row => toNumber(row[column.key]) ?? 0),
        }))
      : [
          {
            name: title,
            values: measures.map(column => toNumber(result.rows[0]?.[column.key]) ?? 0),
          },
        ];

  const hasNulls =
    dimensions.length > 0 &&
    rows.some(row => measures.some(column => toNumber(row[column.key]) === null));

  let scatterX: number[] | undefined;
  if (type === 'SCATTER') {
    scatterX = rows.map((row, index) =>
      dimensions.length > 0 ? toNumber(row[dimensions[0].key]) ?? index : index + 1
    );
  }

  const notes = [topNote, hasNulls ? 'null-as-zero' : ''].filter(Boolean);

  return {
    type,
    title,
    categories,
    series,
    scatterX,
    unit: measures[0]?.unit,
    format: measures[0]?.format,
    note: notes.length > 0 ? notes.join(' ') : undefined,
  };
}

/** Construit un tableau natif éditable. */
export function buildBiPptxTableBlock(
  result: BiQueryResult,
  maxRows = 14
): BiPptxTableBlock {
  const columns = result.columns.map(column => ({
    key: column.key,
    label: column.label,
    role: column.role,
    format: column.format,
    unit: column.unit,
  }));
  const rows = result.rows.slice(0, maxRows).map(row => {
    const next: Record<string, string | number | null> = {};
    for (const column of result.columns) {
      const value = row[column.key];
      next[column.key] =
        column.role === 'MEASURE'
          ? toNumber(value)
          : value === null || value === undefined
            ? '—'
            : String(value);
    }
    return next;
  });
  return {
    columns,
    rows,
    totalRows: result.totalRows,
    truncated: result.truncated || result.totalRows > rows.length,
  };
}

const KPI_TONES: Array<BiPptxKpiBlock['tone']> = [
  'blue',
  'emerald',
  'violet',
  'amber',
  'slate',
  'red',
];

/** Transforme les mesures d'un widget KPI en cartes KPI. */
export function buildBiPptxKpiBlocks(
  result: BiQueryResult,
  limit = 6
): BiPptxKpiBlock[] {
  const measures = result.columns.filter(column => column.role === 'MEASURE');
  const row = result.rows[0] ?? {};
  return measures.slice(0, limit).map((column, index) => {
    const raw = toNumber(row[column.key]);
    const meta = measureMeta(result.source, column.key);
    return {
      code: column.key,
      label: column.label,
      value: formatBiPptxValue(raw, column.format, column.unit),
      unit: column.unit,
      source: result.sourceLabel,
      definition: meta.description || meta.label,
      tone: KPI_TONES[index % KPI_TONES.length],
      hint: result.period?.label,
    };
  });
}

const comparisonLabel = (row: BiPptxComparisonRow): string => row.label;

// ---------------------------------------------------------------------------
// Planification
// ---------------------------------------------------------------------------

interface PlanContext {
  labels: BiPptxLabels;
  config: BiPptxConfig;
  input: BiPptxBuildInput;
  slides: BiPptxSlide[];
  warnings: string[];
  sequence: number;
}

const newSlideId = (context: PlanContext, kind: string): string => {
  context.sequence += 1;
  return `BI-PPTX-${kind}-${String(context.sequence).padStart(2, '0')}`;
};

const pushSlide = (context: PlanContext, slide: BiPptxSlide): void => {
  if (context.slides.length >= 120) {
    if (!context.warnings.includes('Limite de 120 diapositives atteinte : contenus supplémentaires ignorés.')) {
      context.warnings.push('Limite de 120 diapositives atteinte : contenus supplémentaires ignorés.');
    }
    return;
  }
  context.slides.push(slide);
};

const baseSlide = (
  context: PlanContext,
  kind: BiPptxSlide['kind'],
  title: string,
  extra: Partial<BiPptxSlide> = {}
): BiPptxSlide => ({
  id: newSlideId(context, kind),
  kind,
  title,
  periodLabel: context.input.periodLabel,
  generatedAt: context.config.generatedAt,
  ...extra,
});

const coverageLabel = (context: PlanContext): string => {
  const scope = context.input.scope;
  const warehouse = scope.allWarehouses
    ? context.labels.scopeAllWarehouses
    : context.labels.scopeWarehouses(scope.warehouseIds.length);
  const departments = scope.allDepartments
    ? context.labels.scopeAllDepartments
    : context.labels.scopeDepartments(scope.departments.length);
  return `${warehouse} · ${departments}`;
};

const domainDefinitions = (
  labels: BiPptxLabels
): Array<{ key: string; domain: BiDomain; title: string; codes: string[] }> => [
  {
    key: 'PRODUCTION',
    domain: 'PRODUCTION',
    title: labels.domainProduction,
    codes: [
      'PROD_TOTAL',
      'PROD_CONFORME',
      'PROD_REJETE',
      'PROD_CARTONS',
      'PROD_LOTS',
      'TAUX_CONFORMITE',
      'PROD_PLANIFIE',
      'PROD_REALISE',
      'PROD_ECART',
      'TAUX_REALISATION',
    ],
  },
  {
    key: 'CONSUMPTION',
    domain: 'PRODUCTION',
    title: labels.domainConsumption,
    codes: ['CONSO_REEL', 'CONSO_THEO', 'ECART_CONSO', 'PERTES_CONSO'],
  },
  {
    key: 'QUALITY',
    domain: 'QUALITE',
    title: labels.domainQuality,
    codes: [
      'NC_TOTAL',
      'NC_OUVERTES',
      'NC_CRITIQUES',
      'NC_QUANTITE',
      'TAUX_NC',
      'HACCP_TOTAL',
      'HACCP_NC',
      'TAUX_HACCP',
    ],
  },
  {
    key: 'SUPPLY',
    domain: 'APPROVISIONNEMENT',
    title: labels.domainSupply,
    codes: [
      'ACHATS_MONTANT',
      'ACHATS_QTE',
      'COMMANDES_TOTAL',
      'COMMANDES_RETARD',
      'RECEPTIONS_QTE',
      'RECEPTIONS_ACCEPTEES',
      'RECEPTIONS_REJETEES',
      'TAUX_ACCEPTATION',
    ],
  },
  {
    key: 'COMMERCIAL',
    domain: 'COMMERCIAL',
    title: labels.domainCommercial,
    codes: ['CA_TOTAL', 'CA_PAYE', 'CA_IMPAYE', 'FACTURES_TOTAL', 'TAUX_ENCAISSEMENT'],
  },
  {
    key: 'MAINTENANCE',
    domain: 'MAINTENANCE',
    title: labels.domainMaintenance,
    codes: ['EQUIPEMENTS_TOTAL', 'MAINTENANCES_RETARD'],
  },
];

const kpiBlockFromComputation = (
  context: PlanContext,
  computation: BiKpiComputation
): BiPptxKpiBlock => {
  const kpi = computation.kpi;
  const valid = computation.valid && isFiniteNumber(computation.value);
  return {
    code: kpi.code,
    label: kpi.name,
    value: valid
      ? formatBiPptxValue(computation.value, kpi.format, kpi.unit, kpi.precision)
      : context.labels.notCalculable,
    unit: kpi.unit,
    source: kpi.source === 'MULTI' ? 'Multi-sources' : BI_SOURCES[kpi.source]?.label ?? kpi.source,
    definition: kpi.description,
    target:
      kpi.targetValue !== undefined && isFiniteNumber(kpi.targetValue)
        ? formatBiPptxValue(kpi.targetValue, kpi.format, kpi.unit, kpi.precision)
        : undefined,
    tone: valid ? 'blue' : 'slate',
    hint: valid ? computation.period.label : computation.error,
  };
};

const addKpiSlide = (
  context: PlanContext,
  title: string,
  blocks: BiPptxKpiBlock[],
  extra: Partial<BiPptxSlide> = {}
): void => {
  const usable = blocks.filter(
    block => block.value !== '—' && block.value !== context.labels.notCalculable
  );
  if (usable.length === 0) return;
  for (let index = 0; index < usable.length; index += 6) {
    const chunk = usable.slice(index, index + 6);
    pushSlide(
      context,
      baseSlide(context, 'KPI', index === 0 ? title : `${title} (${index / 6 + 1})`, {
        kpis: chunk,
        sourceLabel: extra.sourceLabel,
        sectionLabel: extra.sectionLabel,
        subtitle: extra.subtitle,
        unit: extra.unit,
        filters: extra.filters,
      })
    );
  }
};

const addWidgetSlide = (
  context: PlanContext,
  entry: BiPptxResolvedWidget
): void => {
  const { widget, result } = entry;
  if (!result) {
    context.warnings.push(
      `Widget « ${widget.title} » ignoré : ${entry.error ?? 'données indisponibles'}.`
    );
    return;
  }
  if (result.rows.length === 0) {
    context.warnings.push(`Widget « ${widget.title} » ignoré : aucune donnée sur la période.`);
    return;
  }
  const dimensions = result.columns.filter(column => column.role === 'DIMENSION');
  const measures = result.columns.filter(column => column.role === 'MEASURE');
  if (measures.length === 0) {
    context.warnings.push(`Widget « ${widget.title} » ignoré : aucune mesure.`);
    return;
  }

  if ((widget.type === 'KPI' || widget.type === 'GAUGE') && dimensions.length === 0) {
    addKpiSlide(context, widget.title, buildBiPptxKpiBlocks(result), {
      sourceLabel: result.sourceLabel,
      sectionLabel: entry.dashboardName,
      unit: measures[0]?.unit,
      filters: describeFilters(result),
    });
    return;
  }

  if (['TABLE', 'PIVOT', 'HEATMAP'].includes(widget.type)) {
    pushSlide(
      context,
      baseSlide(context, 'TABLE', widget.title, {
        table: buildBiPptxTableBlock(result),
        sourceLabel: result.sourceLabel,
        sectionLabel: entry.dashboardName,
        unit: measures[0]?.unit,
        filters: describeFilters(result),
        subtitle: result.truncated
          ? context.labels.rowsShown(result.rows.length, result.totalRows)
          : undefined,
      })
    );
    return;
  }

  const chart = buildBiPptxChartBlock(result, widget.title, widget.type);
  if (!chart) {
    context.warnings.push(`Widget « ${widget.title} » ignoré : graphique non constructible.`);
    return;
  }
  pushSlide(
    context,
    baseSlide(context, 'CHART', widget.title, {
      chart,
      sourceLabel: result.sourceLabel,
      sectionLabel: entry.dashboardName,
      unit: chart.unit,
      filters: describeFilters(result),
      subtitle: result.truncated
        ? context.labels.rowsShown(result.rows.length, result.totalRows)
        : undefined,
    })
  );
};

/** Décrit les filtres appliqués à un résultat, sans exposer de valeur sensible. */
export function describeFilters(result: BiQueryResult): string[] {
  if (!result.filters || result.filters.length === 0) return [];
  return result.filters
    .slice(0, 12)
    .map(filter => `${filter.field} ${filter.operator} ${String(filter.value ?? '')}`.trim());
}

const addDashboardSlides = (context: PlanContext): void => {
  for (const dashboard of context.input.dashboards) {
    const kpiBlocks: BiPptxKpiBlock[] = [];
    const otherWidgets: BiPptxResolvedWidget[] = [];

    for (const entry of dashboard.widgets) {
      const result = entry.result;
      const isKpi =
        result &&
        (entry.widget.type === 'KPI' || entry.widget.type === 'GAUGE') &&
        result.columns.every(column => column.role !== 'DIMENSION') &&
        result.rows.length > 0;
      if (isKpi) {
        kpiBlocks.push(...buildBiPptxKpiBlocks(result));
      } else {
        otherWidgets.push(entry);
      }
    }

    if (kpiBlocks.length > 0) {
      addKpiSlide(context, dashboard.dashboard.name, kpiBlocks, {
        sectionLabel: dashboard.dashboard.name,
        subtitle: dashboard.dashboard.description,
      });
    }

    for (const entry of otherWidgets) {
      addWidgetSlide(context, entry);
    }
  }
};

const addReportSlides = (context: PlanContext): void => {
  for (const entry of context.input.reports) {
    const { report, result } = entry;
    if (!result || result.rows.length === 0) {
      context.warnings.push(
        `Rapport « ${report.name} » ignoré : ${entry.error ?? 'aucune donnée sur la période'}.`
      );
      continue;
    }
    const dimensions = result.columns.filter(column => column.role === 'DIMENSION');
    const measures = result.columns.filter(column => column.role === 'MEASURE');
    if (measures.length === 0) {
      context.warnings.push(`Rapport « ${report.name} » ignoré : aucune mesure.`);
      continue;
    }

    if (report.visualization === 'KPI' && dimensions.length === 0) {
      addKpiSlide(context, report.name, buildBiPptxKpiBlocks(result), {
        sourceLabel: result.sourceLabel,
        sectionLabel: context.labels.report,
        subtitle: report.description,
        unit: measures[0]?.unit,
        filters: describeFilters(result),
      });
      continue;
    }

    if (['TABLE', 'PIVOT', 'HEATMAP'].includes(report.visualization)) {
      pushSlide(
        context,
        baseSlide(context, 'TABLE', report.name, {
          table: buildBiPptxTableBlock(result),
          sourceLabel: result.sourceLabel,
          sectionLabel: context.labels.report,
          subtitle: report.description || undefined,
          unit: measures[0]?.unit,
          filters: describeFilters(result),
        })
      );
      continue;
    }

    const chart = buildBiPptxChartBlock(result, report.name, report.visualization);
    if (!chart) {
      context.warnings.push(`Rapport « ${report.name} » ignoré : graphique non constructible.`);
      continue;
    }
    pushSlide(
      context,
      baseSlide(context, 'CHART', report.name, {
        chart,
        sourceLabel: result.sourceLabel,
        sectionLabel: context.labels.report,
        subtitle: report.description || report.comments || undefined,
        unit: chart.unit,
        filters: describeFilters(result),
      })
    );
  }
};

const addExplorerSlides = (context: PlanContext): void => {
  for (const entry of context.input.explorer) {
    const result = entry.result;
    if (!result || result.rows.length === 0) {
      context.warnings.push(
        `Analyse « ${entry.title} » ignorée : ${entry.error ?? 'aucune donnée sur la période'}.`
      );
      continue;
    }
    const measures = result.columns.filter(column => column.role === 'MEASURE');
    const dimensions = result.columns.filter(column => column.role === 'DIMENSION');
    if (measures.length === 0) {
      context.warnings.push(`Analyse « ${entry.title} » ignorée : aucune mesure.`);
      continue;
    }
    if (dimensions.length > 0) {
      const chart = buildBiPptxChartBlock(result, entry.title, 'COLUMN');
      if (chart) {
        pushSlide(
          context,
          baseSlide(context, 'CHART', entry.title, {
            chart,
            sourceLabel: result.sourceLabel,
            sectionLabel: context.labels.explorer,
            unit: chart.unit,
            filters: describeFilters(result),
            subtitle: result.truncated
              ? context.labels.rowsShown(result.rows.length, result.totalRows)
              : undefined,
          })
        );
        continue;
      }
    }
    pushSlide(
      context,
      baseSlide(context, 'TABLE', entry.title, {
        table: buildBiPptxTableBlock(result),
        sourceLabel: result.sourceLabel,
        sectionLabel: context.labels.explorer,
        unit: measures[0]?.unit,
        filters: describeFilters(result),
      })
    );
  }
};

const addSelectedKpiSlides = (context: PlanContext): void => {
  if (context.input.kpis.length === 0) return;
  const blocks = context.input.kpis.map(entry => kpiBlockFromComputation(context, entry.computation));
  addKpiSlide(context, context.labels.kpis, blocks, {
    sectionLabel: context.labels.kpiDetail,
    subtitle: context.labels.definitionNote,
  });
};

const addExecutiveSummary = (context: PlanContext): void => {
  const overview = context.input.overview;
  if (!overview) return;
  const preferred = [
    'PROD_TOTAL',
    'TAUX_CONFORMITE',
    'STOCK_DISPO',
    'NC_OUVERTES',
    'TAUX_REALISATION',
    'CA_TOTAL',
    'ACHATS_MONTANT',
    'TAUX_ENCAISSEMENT',
  ];
  const blocks: BiPptxKpiBlock[] = [];
  for (const code of preferred) {
    const detail = overview.details.find(item => item.code === code);
    if (!detail || detail.value === null) continue;
    blocks.push({
      code,
      label: detail.label,
      value: formatBiPptxValue(detail.value, detail.format, detail.unit),
      unit: detail.unit,
      source: BI_SOURCES[detail.source]?.label ?? detail.source,
      definition: detail.description,
      tone: KPI_TONES[blocks.length % KPI_TONES.length],
    });
    if (blocks.length >= 6) break;
  }
  if (blocks.length === 0) {
    context.warnings.push('Synthèse exécutive ignorée : aucune mesure calculable sur la période.');
    return;
  }

  const bullets: BiPptxTextBlock[] = blocks.slice(0, 4).map(block => ({
    tone: 'FACT',
    text: `${block.label} : ${block.value}${block.unit ? ` (${block.unit})` : ''}.`,
  }));
  const alerts = context.input.alerts.filter(event => event.status === 'NOUVELLE');
  if (alerts.length > 0) {
    bullets.push({
      tone: 'WARNING',
      text: `${alerts.length} alerte(s) non acquittée(s) enregistrée(s) sur le périmètre.`,
    });
  }
  for (const warning of overview.warnings.slice(0, 2)) {
    bullets.push({ tone: 'WARNING', text: warning });
  }
  if (context.input.aiResponses.length > 0) {
    const facts = context.input.aiResponses[0].facts.slice(0, 2);
    for (const fact of facts) bullets.push({ tone: 'FACT', text: fact });
  }

  pushSlide(
    context,
    baseSlide(context, 'EXECUTIVE_SUMMARY', context.labels.executiveSummary, {
      kpis: blocks,
      bullets,
      subtitle: `${context.labels.period} : ${context.input.periodLabel}`,
      sectionLabel: context.labels.selectedContent,
      sourceLabel: context.input.sourceLabels.slice(0, 4).join(' · '),
    })
  );
};

const addDomainSlides = (context: PlanContext): void => {
  const overview = context.input.overview;
  if (!overview) return;
  for (const definition of domainDefinitions(context.labels)) {
    const details = definition.codes
      .map(code => overview.details.find(item => item.code === code))
      .filter((detail): detail is BiMeasureValue => !!detail && detail.value !== null);
    if (details.length === 0) continue;
    const blocks: BiPptxKpiBlock[] = details.map((detail, index) => ({
      code: detail.code,
      label: detail.label,
      value: formatBiPptxValue(detail.value, detail.format, detail.unit),
      unit: detail.unit,
      source: BI_SOURCES[detail.source]?.label ?? detail.source,
      definition: detail.description,
      tone: KPI_TONES[index % KPI_TONES.length],
    }));
    addKpiSlide(context, definition.title, blocks, {
      sectionLabel: definition.title,
      subtitle: context.labels.definitionNote,
    });
  }

  // Matières premières / produits finis : deux graphiques issus d'une seule
  // requête stock agrégée par catégorie, puis répartie sans double comptage.
  const stockSplit = context.input.stockSplit;
  if (stockSplit?.rawMaterials) {
    const chart = buildBiPptxChartBlock(
      stockSplit.rawMaterials,
      context.labels.domainRawMaterials,
      'BAR'
    );
    if (chart) {
      pushSlide(
        context,
        baseSlide(context, 'CHART', context.labels.domainRawMaterials, {
          chart,
          sourceLabel: stockSplit.rawMaterials.sourceLabel,
          sectionLabel: context.labels.domainStock,
          unit: chart.unit,
        })
      );
    }
  }
  if (stockSplit?.finishedGoods) {
    const chart = buildBiPptxChartBlock(
      stockSplit.finishedGoods,
      context.labels.domainFinishedGoods,
      'BAR'
    );
    if (chart) {
      pushSlide(
        context,
        baseSlide(context, 'CHART', context.labels.domainFinishedGoods, {
          chart,
          sourceLabel: stockSplit.finishedGoods.sourceLabel,
          sectionLabel: context.labels.domainStock,
          unit: chart.unit,
        })
      );
    }
  }
};

const addComparisonSlide = (context: PlanContext): void => {
  const comparison = context.input.comparison;
  if (!comparison || comparison.rows.length === 0) {
    context.warnings.push('Comparaison ignorée : aucune valeur comparable sur les deux périodes.');
    return;
  }
  const rows = comparison.rows.filter(
    row => row.current !== null || row.previous !== null
  );
  if (rows.length === 0) return;
  pushSlide(
    context,
    baseSlide(context, 'COMPARISON', context.labels.comparison, {
      comparison: {
        currentLabel: comparison.currentLabel,
        previousLabel: comparison.previousLabel,
        rows: rows.slice(0, 12),
      },
      subtitle: `${comparison.currentLabel} / ${comparison.previousLabel}`,
      sectionLabel: context.labels.comparison,
      sourceLabel: Array.from(new Set(rows.map(row => row.source).filter(Boolean))).join(' · '),
    })
  );
};

const addAlertsSlide = (context: PlanContext): void => {
  const events = context.input.alerts.filter(event => event.status === 'NOUVELLE');
  if (events.length === 0) return;
  const bullets: BiPptxTextBlock[] = events.slice(0, 12).map(event => ({
    tone: event.severity === 'CRITIQUE' ? 'WARNING' : 'FACT',
    text: `[${event.severity}] ${event.ruleName} — ${event.message}`,
  }));
  if (events.length > 12) {
    bullets.push({
      tone: 'INFO',
      text: `${events.length - 12} alerte(s) supplémentaire(s) dans le journal MAMORA BI.`,
    });
  }
  pushSlide(
    context,
    baseSlide(context, 'ALERTS', context.labels.alerts, {
      bullets,
      subtitle: `${events.length} alerte(s) non acquittée(s)`,
      sectionLabel: context.labels.alerts,
    })
  );
};

const addAiSlides = (context: PlanContext): void => {
  for (const response of context.input.aiResponses) {
    const bullets: BiPptxTextBlock[] = [];
    if (response.answer) bullets.push({ tone: 'INFO', text: response.answer });
    for (const fact of response.facts.slice(0, 4)) bullets.push({ tone: 'FACT', text: fact });
    for (const hypothesis of response.hypotheses.slice(0, 3)) {
      bullets.push({ tone: 'HYPOTHESIS', text: hypothesis });
    }
    for (const recommendation of response.recommendations.slice(0, 4)) {
      bullets.push({ tone: 'RECOMMENDATION', text: recommendation });
    }
    for (const limitation of response.limitations.slice(0, 2)) {
      bullets.push({ tone: 'WARNING', text: limitation });
    }
    if (bullets.length === 0) continue;

    pushSlide(
      context,
      baseSlide(context, 'AI', `${context.labels.ai} — ${response.intent}`, {
        bullets: bullets.slice(0, 12),
        subtitle: context.labels.aiDisclaimer,
        sectionLabel: context.labels.ai,
        sourceLabel: response.provider,
        periodLabel: response.period?.label ?? context.input.periodLabel,
      })
    );

    const chart = response.chart;
    if (chart && chart.data.length > 0) {
      const xKey = chart.xKey ?? Object.keys(chart.data[0] ?? {})[0];
      if (xKey) {
        const seriesKeys =
          chart.series && chart.series.length > 0
            ? chart.series
            : Object.keys(chart.data[0] ?? {}).filter(key => key !== xKey);
        const chartBlock: BiPptxChartBlock = {
          type: chart.type,
          title: chart.title,
          categories: chart.data.map(row => String(row[xKey] ?? '—')),
          series: seriesKeys.map(key => ({
            name: key,
            values: chart.data.map(row => toNumber(row[key]) ?? 0),
          })),
        };
        if (chartBlock.series.length > 0) {
          pushSlide(
            context,
            baseSlide(context, 'CHART', chart.title, {
              chart: chartBlock,
              sectionLabel: context.labels.ai,
              sourceLabel: 'MAMORA AI Analyst',
            })
          );
        }
      }
    }
  }
};

const addConclusionSlide = (context: PlanContext): void => {
  const overview = context.input.overview;
  const bullets: BiPptxTextBlock[] = [];

  if (overview) {
    const validKpis = overview.kpis.filter(
      computation => computation.valid && isFiniteNumber(computation.value)
    ).length;
    if (overview.kpis.length > 0) {
      bullets.push({
        tone: 'FACT',
        text: `${validKpis} KPI sur ${overview.kpis.length} sont calculables sur la période analysée.`,
      });
    }
    const computedMeasures = overview.details.filter(detail => detail.value !== null).length;
    bullets.push({
      tone: 'FACT',
      text: `${computedMeasures} mesure(s) analytique(s) calculée(s) à partir du snapshot du ${new Date(
        context.input.refreshAt
      ).toLocaleString('fr-FR')}.`,
    });
  }

  const comparison = context.input.comparison;
  if (comparison) {
    const comparable = comparison.rows.filter(
      row => row.current !== null && row.previous !== null && row.delta !== null
    );
    if (comparable.length > 0) {
      const strongest = [...comparable].sort(
        (a, b) => Math.abs(b.deltaPercent ?? 0) - Math.abs(a.deltaPercent ?? 0)
      )[0];
      bullets.push({
        tone: 'FACT',
        text: `Variation la plus marquée : ${strongest.label} (${formatBiPptxDelta(
          strongest.delta,
          strongest.format,
          strongest.unit
        )}, ${formatBiPptxDelta(strongest.deltaPercent, 'PERCENT', '', true)}).`,
      });
    }
  }

  const alerts = context.input.alerts.filter(event => event.status === 'NOUVELLE');
  if (alerts.length > 0) {
    bullets.push({
      tone: 'WARNING',
      text: `${alerts.length} alerte(s) restent non acquittée(s) et nécessitent une revue.`,
    });
  }

  for (const warning of (overview?.warnings ?? []).slice(0, 3)) {
    bullets.push({ tone: 'WARNING', text: warning });
  }
  bullets.push({ tone: 'INFO', text: context.labels.readOnly });

  pushSlide(
    context,
    baseSlide(context, 'CONCLUSION', context.labels.conclusion, {
      bullets: bullets.slice(0, 10),
      sectionLabel: context.labels.conclusion,
    })
  );
};

const addRecommendationsSlide = (context: PlanContext): void => {
  const bullets: BiPptxTextBlock[] = [];

  for (const response of context.input.aiResponses) {
    for (const recommendation of response.recommendations.slice(0, 4)) {
      bullets.push({ tone: 'RECOMMENDATION', text: recommendation });
    }
  }

  const overview = context.input.overview;
  if (overview) {
    const value = (code: string) =>
      overview.details.find(detail => detail.code === code)?.value ?? null;
    const stockUnderMin = value('STOCK_SOUS_MIN');
    if (stockUnderMin !== null && stockUnderMin > 0) {
      bullets.push({
        tone: 'RECOMMENDATION',
        text: `Réapprovisionner les ${formatBiPptxValue(stockUnderMin, 'NUMBER', 'article(s)')} sous le stock minimum.`,
      });
    }
    const openNc = value('NC_OUVERTES');
    if (openNc !== null && openNc > 0) {
      bullets.push({
        tone: 'RECOMMENDATION',
        text: `Traiter et clore les ${formatBiPptxValue(openNc, 'NUMBER', 'non-conformité(s)')} ouvertes.`,
      });
    }
    const realization = value('TAUX_REALISATION');
    if (realization !== null && realization < 100) {
      bullets.push({
        tone: 'RECOMMENDATION',
        text: `Analyser l’écart objectif / réalisé : taux de réalisation de ${formatBiPptxValue(
          realization,
          'PERCENT'
        )}.`,
      });
    }
    const criticalNc = value('NC_CRITIQUES');
    if (criticalNc !== null && criticalNc > 0) {
      bullets.push({
        tone: 'RECOMMENDATION',
        text: `Prioriser les ${formatBiPptxValue(criticalNc, 'NUMBER', 'non-conformité(s) critique(s)')}.`,
      });
    }
  }

  const criticalAlerts = context.input.alerts.filter(
    event => event.status === 'NOUVELLE' && event.severity === 'CRITIQUE'
  );
  for (const alert of criticalAlerts.slice(0, 3)) {
    bullets.push({
      tone: 'RECOMMENDATION',
      text: `Alerte critique à traiter : ${alert.ruleName} — ${alert.message}`,
    });
  }

  const unique = Array.from(new Set(bullets.map(bullet => bullet.text))).map(text => {
    const found = bullets.find(bullet => bullet.text === text)!;
    return found;
  });
  if (unique.length === 0) return;

  pushSlide(
    context,
    baseSlide(context, 'RECOMMENDATIONS', context.labels.recommendations, {
      bullets: unique.slice(0, 10),
      sectionLabel: context.labels.recommendations,
      subtitle: context.labels.aiDisclaimer,
    })
  );
};

const addSourcesSlide = (context: PlanContext): void => {
  const overview = context.input.overview;
  const bullets: BiPptxTextBlock[] = [
    { tone: 'INFO', text: `${context.labels.period} : ${context.input.periodLabel}` },
    {
      tone: 'INFO',
      text: `${context.labels.lastRefresh} : ${new Date(context.input.refreshAt).toLocaleString('fr-FR')}`,
    },
    {
      tone: 'INFO',
      text: `${context.labels.generatedAt} : ${new Date(context.config.generatedAt).toLocaleString('fr-FR')}`,
    },
    { tone: 'INFO', text: `${context.labels.scope} : ${coverageLabel(context)}` },
    { tone: 'INFO', text: context.labels.definitionNote },
    { tone: 'INFO', text: context.labels.scopeNote },
    { tone: 'INFO', text: context.labels.readOnly },
  ];

  const sources = Array.from(new Set(context.input.sourceLabels.filter(Boolean)));
  if (sources.length > 0) {
    bullets.push({ tone: 'FACT', text: `${context.labels.source} : ${sources.join(' · ')}` });
  }
  if (overview && Object.keys(overview.counts).length > 0) {
    const counts = Object.entries(overview.counts)
      .map(([source, count]) => `${source} ${count}`)
      .join(' · ');
    bullets.push({ tone: 'FACT', text: `Enregistrements : ${counts}` });
  }
  for (const warning of (overview?.warnings ?? []).slice(0, 3)) {
    bullets.push({ tone: 'WARNING', text: warning });
  }

  pushSlide(
    context,
    baseSlide(context, 'SOURCES', context.labels.sources, {
      bullets: bullets.slice(0, 12),
      sectionLabel: context.labels.sources,
    })
  );
};

const buildTocSlide = (context: PlanContext): BiPptxSlide => {
  const entries = context.slides
    .filter(slide => slide.kind !== 'COVER')
    .slice(0, 14)
    .map((slide, index) => ({
      tone: 'INFO' as const,
      text: `${index + 1}. ${slide.title}${slide.sectionLabel ? ` — ${slide.sectionLabel}` : ''}`,
    }));
  return {
    id: 'BI-PPTX-TOC-01',
    kind: 'TOC',
    title: context.labels.toc,
    bullets: entries,
    periodLabel: context.input.periodLabel,
    generatedAt: context.config.generatedAt,
    sectionLabel: context.labels.selectedContent,
  };
};

const buildCoverSlide = (context: PlanContext): BiPptxSlide => ({
  id: 'BI-PPTX-COVER-01',
  kind: 'COVER',
  title: context.config.title,
  subtitle: context.config.subtitle,
  bullets: [
    { tone: 'INFO', text: `${context.labels.period} : ${context.input.periodLabel}` },
    { tone: 'INFO', text: `${context.labels.department} : ${context.config.department}` },
    { tone: 'INFO', text: `${context.labels.scope} : ${coverageLabel(context)}` },
    {
      tone: 'INFO',
      text: `${context.labels.generatedOn} ${new Date(context.config.generatedAt).toLocaleString('fr-FR')} — ${context.labels.author} : ${context.config.author}`,
    },
  ],
  periodLabel: context.input.periodLabel,
  generatedAt: context.config.generatedAt,
  sectionLabel: context.config.company,
});

/** Construit la présentation complète. Aucune diapositive vide n'est produite. */
export function planBiPptxDeck(input: BiPptxBuildInput): BiPptxDeck {
  const labels = getBiPptxLabels(input.config.language);
  const context: PlanContext = {
    labels,
    config: input.config,
    input,
    slides: [],
    warnings: [...(input.warnings ?? [])],
    sequence: 0,
  };

  if (input.selection.includeExecutiveSummary) addExecutiveSummary(context);
  if (input.selection.includeDomainAnalysis) addDomainSlides(context);
  addDashboardSlides(context);
  addReportSlides(context);
  addExplorerSlides(context);
  addSelectedKpiSlides(context);
  if (input.selection.includeComparison) addComparisonSlide(context);
  if (input.selection.includeAlerts) addAlertsSlide(context);
  if (input.selection.includeAi) addAiSlides(context);
  if (input.selection.includeConclusion) addConclusionSlide(context);
  if (input.selection.includeRecommendations) addRecommendationsSlide(context);
  if (input.selection.includeSources) addSourcesSlide(context);

  const cover = buildCoverSlide(context);
  const slides: BiPptxSlide[] = [cover];
  if (context.slides.length > 0) {
    slides.push(buildTocSlide(context), ...context.slides);
  }

  const summary: BiPptxContentSummary = {
    dashboards: input.dashboards.filter(dashboard =>
      slides.some(slide => slide.sectionLabel === dashboard.dashboard.name)
    ).length,
    charts: slides.filter(slide => !!slide.chart).length,
    tables: slides.filter(slide => !!slide.table).length,
    kpis: slides.reduce((sum, slide) => sum + (slide.kpis?.length ?? 0), 0),
    reports: input.reports.filter(report =>
      slides.some(slide => slide.sectionLabel === labels.report && slide.title === report.report.name)
    ).length,
    aiResponses: input.aiResponses.length,
    alerts: input.alerts.filter(event => event.status === 'NOUVELLE').length,
  };

  return {
    id: `BI-PPTX-${Date.now().toString(36).toUpperCase()}`,
    config: input.config,
    slides,
    warnings: context.warnings,
    scope: input.scope,
    sourceLabels: Array.from(new Set(input.sourceLabels.filter(Boolean))),
    createdAt: new Date().toISOString(),
    summary,
  };
}

/** Résumé de contenu affiché dans l'assistant avant planification. */
export function summarizeBiPptxSelection(input: {
  dashboards: BiPptxResolvedDashboard[];
  reports: BiPptxResolvedReport[];
  kpis: BiPptxResolvedKpi[];
  explorer: BiPptxResolvedExplorer[];
  aiResponses: BiAiResponse[];
  alerts: BiAlertEvent[];
}): BiPptxContentSummary {
  const widgets = input.dashboards.flatMap(dashboard => dashboard.widgets);
  return {
    dashboards: input.dashboards.length,
    charts: widgets.filter(widget =>
      ['BAR', 'COLUMN', 'LINE', 'AREA', 'PIE', 'DONUT', 'HISTOGRAM', 'COMBO', 'SCATTER'].includes(
        widget.widget.type
      )
    ).length + input.reports.filter(report =>
      ['BAR', 'COLUMN', 'LINE', 'AREA', 'PIE', 'DONUT', 'HISTOGRAM', 'COMBO', 'SCATTER'].includes(
        report.report.visualization
      )
    ).length + input.explorer.length,
    tables: widgets.filter(widget => ['TABLE', 'PIVOT', 'HEATMAP'].includes(widget.widget.type)).length +
      input.reports.filter(report => ['TABLE', 'PIVOT', 'HEATMAP'].includes(report.report.visualization)).length,
    kpis:
      input.kpis.length +
      widgets.filter(widget => widget.widget.type === 'KPI' || widget.widget.type === 'GAUGE').length,
    reports: input.reports.length,
    aiResponses: input.aiResponses.length,
    alerts: input.alerts.filter(event => event.status === 'NOUVELLE').length,
  };
}
