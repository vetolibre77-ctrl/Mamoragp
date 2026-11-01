/**
 * MAMORA BI — Rendu PowerPoint natif.
 *
 * PptxGenJS est chargé dynamiquement pour ne pas alourdir le bundle principal.
 * Les graphiques sont de vrais graphiques PowerPoint (avec classeur Excel
 * embarqué), les tableaux sont natifs et modifiables, et le thème respecte la
 * charte MAMORA GP : couleurs sobres, titres lisibles, pied de page, pagination
 * et date de génération.
 */

import type {
  BiPptxChartBlock,
  BiPptxDeck,
  BiPptxKpiBlock,
  BiPptxSlide,
  BiPptxTableBlock,
  BiPptxTextBlock,
  BiPptxTextTone,
} from '../../types';
import { getBiPptxLabels, formatBiPptxValue, formatBiPptxDelta } from './pptx-plan';

// ---------------------------------------------------------------------------
// Thème MAMORA GP
// ---------------------------------------------------------------------------

const C = {
  navy: '0F172A',
  navySoft: '1E293B',
  blue: '2563EB',
  blueSoft: 'DBEAFE',
  violet: '7C3AED',
  violetSoft: 'EDE9FE',
  emerald: '059669',
  emeraldSoft: 'D1FAE5',
  amber: 'D97706',
  amberSoft: 'FEF3C7',
  red: 'DC2626',
  redSoft: 'FEE2E2',
  slate: '475569',
  slateSoft: 'F1F5F9',
  muted: '64748B',
  border: 'E2E8F0',
  white: 'FFFFFF',
  body: '334155',
  faint: 'F8FAFC',
};

const PALETTE = [
  '2563EB',
  '059669',
  'F59E0B',
  'DC2626',
  '7C3AED',
  '0891B2',
  'DB2777',
  '65A30D',
  'EA580C',
  '475569',
];

const TONE_COLORS: Record<BiPptxTextTone, string> = {
  FACT: C.blue,
  HYPOTHESIS: C.amber,
  RECOMMENDATION: C.emerald,
  INFO: C.slate,
  WARNING: C.red,
};

const TONE_LABELS: Record<'fr' | 'ar', Record<BiPptxTextTone, string>> = {
  fr: {
    FACT: 'FAIT',
    HYPOTHESIS: 'HYPOTHÈSE',
    RECOMMENDATION: 'RECOMMANDATION',
    INFO: 'INFO',
    WARNING: 'ATTENTION',
  },
  ar: {
    FACT: 'واقعة',
    HYPOTHESIS: 'فرضية',
    RECOMMENDATION: 'توصية',
    INFO: 'معلومة',
    WARNING: 'تنبيه',
  },
};

const KPI_ACCENTS: Record<string, string> = {
  blue: C.blue,
  emerald: C.emerald,
  amber: C.amber,
  red: C.red,
  violet: C.violet,
  slate: C.slate,
};

const KPI_FILLS: Record<string, string> = {
  blue: C.blueSoft,
  emerald: C.emeraldSoft,
  amber: C.amberSoft,
  red: C.redSoft,
  violet: C.violetSoft,
  slate: C.slateSoft,
};

const fontFace = (language: 'fr' | 'ar'): string => (language === 'ar' ? 'Arial' : 'Calibri');

const isArabic = (deck: BiPptxDeck): boolean => deck.config.language === 'ar';

const slideSize = (deck: BiPptxDeck): { width: number; height: number } =>
  deck.config.format === '4:3' ? { width: 10, height: 7.5 } : { width: 13.333, height: 7.5 };

const safeText = (value: unknown, fallback = ''): string =>
  value === null || value === undefined ? fallback : String(value);

// ---------------------------------------------------------------------------
// Primitives de dessin
// ---------------------------------------------------------------------------

type SlideLike = any;
type PptxLike = any;

interface DrawContext {
  deck: BiPptxDeck;
  pptx: PptxLike;
  slide: SlideLike;
  width: number;
  height: number;
  margin: number;
  contentWidth: number;
  language: 'fr' | 'ar';
  font: string;
  rtl: boolean;
}

const textOptions = (context: DrawContext, options: Record<string, any> = {}) => ({
  fontFace: context.font,
  lang: context.language === 'ar' ? 'ar-SA' : 'fr-FR',
  rtlMode: context.rtl,
  ...options,
});

const addText = (
  context: DrawContext,
  text: string | any[],
  options: Record<string, any>
) => {
  context.slide.addText(text, textOptions(context, options));
};

const addRect = (
  context: DrawContext,
  options: {
    x: number;
    y: number;
    w: number;
    h: number;
    fill: string;
    line?: string;
    radius?: boolean;
  }
) => {
  const shape = options.radius ? context.pptx.ShapeType.roundRect : context.pptx.ShapeType.rect;
  context.slide.addShape(shape, {
    x: options.x,
    y: options.y,
    w: options.w,
    h: options.h,
    fill: { color: options.fill },
    line: options.line
      ? { color: options.line, width: 0.75 }
      : { color: options.fill, width: 0 },
  });
};

const addLine = (
  context: DrawContext,
  x: number,
  y: number,
  w: number,
  color = C.border,
  h = 0.012
) => {
  addRect(context, { x, y, w, h, fill: color });
};

// ---------------------------------------------------------------------------
// En-tête, métadonnées et pied de page
// ---------------------------------------------------------------------------

const addHeader = (context: DrawContext, slide: BiPptxSlide): void => {
  const labels = getBiPptxLabels(context.deck.config.language);
  addRect(context, {
    x: 0,
    y: 0,
    w: context.width,
    h: 0.11,
    fill: C.violet,
  });
  if (slide.sectionLabel) {
    addText(context, slide.sectionLabel.toUpperCase(), {
      x: context.margin,
      y: 0.2,
      w: context.contentWidth,
      h: 0.24,
      fontSize: 8,
      bold: true,
      color: C.violet,
      charSpacing: 0.6,
      fit: 'shrink',
      align: context.rtl ? 'right' : 'left',
    });
  }
  addText(context, slide.title, {
    x: context.margin,
    y: 0.42,
    w: context.contentWidth,
    h: 0.62,
    fontSize: 22,
    bold: true,
    color: C.navy,
    valign: 'top',
    fit: 'shrink',
    align: context.rtl ? 'right' : 'left',
  });
  if (slide.subtitle) {
    addText(context, slide.subtitle, {
      x: context.margin,
      y: 1.02,
      w: context.contentWidth,
      h: 0.28,
      fontSize: 9.5,
      color: C.muted,
      fit: 'shrink',
      align: context.rtl ? 'right' : 'left',
    });
  }

  const metaParts: string[] = [];
  if (slide.sourceLabel) metaParts.push(`${labels.source} : ${slide.sourceLabel}`);
  if (slide.unit) metaParts.push(`${labels.unit} : ${slide.unit}`);
  if (slide.filters && slide.filters.length > 0) {
    metaParts.push(`${labels.filters} : ${slide.filters.slice(0, 6).join(', ')}`);
  }
  if (metaParts.length > 0) {
    addText(context, metaParts.join('  ·  '), {
      x: context.margin,
      y: 1.27,
      w: context.contentWidth,
      h: 0.2,
      fontSize: 7.5,
      color: C.muted,
      fit: 'shrink',
      align: context.rtl ? 'right' : 'left',
    });
  }
  addLine(context, context.margin, 1.48, context.contentWidth, C.border);
};

const addFooter = (
  context: DrawContext,
  slide: BiPptxSlide,
  index: number,
  total: number
): void => {
  if (!context.deck.config.includeFooter && !context.deck.config.includeSlideNumbers) return;
  const labels = getBiPptxLabels(context.deck.config.language);
  const footerY = context.height - 0.62;
  addLine(context, context.margin, footerY, context.contentWidth, C.border);

  if (context.deck.config.includeFooter) {
    const generated = new Date(context.deck.config.generatedAt).toLocaleString('fr-FR');
    const refreshed = new Date(
      context.deck.config.refreshAt ?? context.deck.config.generatedAt
    ).toLocaleString('fr-FR');
    const periodLabel = slide.periodLabel || context.deck.config.periodLabel;
    const line1 = `${labels.footer}  ·  ${labels.period} : ${periodLabel}`;
    const line2 = `${labels.generatedOn} ${generated}  ·  ${labels.lastRefresh} ${refreshed}`;
    addText(context, line1, {
      x: context.margin,
      y: footerY + 0.05,
      w: context.contentWidth - 1.1,
      h: 0.18,
      fontSize: 7.2,
      color: C.muted,
      fit: 'shrink',
      align: context.rtl ? 'right' : 'left',
    });
    addText(context, line2, {
      x: context.margin,
      y: footerY + 0.22,
      w: context.contentWidth - 1.1,
      h: 0.18,
      fontSize: 6.6,
      color: C.muted,
      fit: 'shrink',
      align: context.rtl ? 'right' : 'left',
    });
  }

  if (context.deck.config.includeSlideNumbers) {
    addText(context, `${index + 1} / ${total}`, {
      x: context.width - context.margin - 0.95,
      y: footerY + 0.08,
      w: 0.95,
      h: 0.2,
      fontSize: 8,
      bold: true,
      color: C.slate,
      align: context.rtl ? 'left' : 'right',
    });
  }
};

// ---------------------------------------------------------------------------
// Couverture et sommaire
// ---------------------------------------------------------------------------

const renderCover = (context: DrawContext, slide: BiPptxSlide): void => {
  const labels = getBiPptxLabels(context.deck.config.language);
  context.slide.background = { color: C.navy };
  addRect(context, { x: 0, y: 0, w: context.width, h: 0.2, fill: C.blue });
  addRect(context, { x: 0, y: 0.2, w: 2.2, h: 0.06, fill: C.violet });

  addText(context, labels.kicker, {
    x: context.margin,
    y: 0.62,
    w: context.contentWidth - 1.4,
    h: 0.28,
    fontSize: 11,
    bold: true,
    color: '93C5FD',
    charSpacing: 1.2,
    align: context.rtl ? 'right' : 'left',
  });
  addText(context, slide.title, {
    x: context.margin,
    y: 1.08,
    w: context.contentWidth - 1.4,
    h: 1.55,
    fontSize: 34,
    bold: true,
    color: C.white,
    valign: 'top',
    fit: 'shrink',
    align: context.rtl ? 'right' : 'left',
  });
  if (slide.subtitle) {
    addText(context, slide.subtitle, {
      x: context.margin,
      y: 2.75,
      w: context.contentWidth - 1.4,
      h: 0.62,
      fontSize: 15,
      color: 'CBD5E1',
      fit: 'shrink',
      align: context.rtl ? 'right' : 'left',
    });
  }
  addRect(context, {
    x: context.rtl ? context.width - context.margin - 2.4 : context.margin,
    y: 3.5,
    w: 2.4,
    h: 0.05,
    fill: C.blue,
  });

  const bullets = (slide.bullets ?? []).map(block => ({
    text: block.text,
    options: textOptions(context, {
      fontSize: 11,
      color: 'E2E8F0',
      breakLine: true,
      bullet: false,
      align: context.rtl ? 'right' : 'left',
    }),
  }));
  if (bullets.length > 0) {
    context.slide.addText(bullets, textOptions(context, {
      x: context.margin,
      y: 3.82,
      w: context.contentWidth - 1.4,
      h: 2.1,
      valign: 'top',
      lineSpacingMultiple: 1.18,
      fit: 'shrink',
    }));
  }

  if (context.deck.config.logoDataUrl) {
    try {
      context.slide.addImage({
        data: context.deck.config.logoDataUrl,
        x: context.width - context.margin - 1.05,
        y: 0.55,
        w: 1.05,
        h: 1.05,
        sizing: { type: 'contain', w: 1.05, h: 1.05 },
      });
    } catch {
      // Un logo illisible ne doit jamais empêcher la génération du document.
    }
  }

  addText(context, `${context.deck.config.company}  ·  ${labels.readOnly}`, {
    x: context.margin,
    y: context.height - 0.62,
    w: context.contentWidth,
    h: 0.24,
    fontSize: 8,
    color: '94A3B8',
    align: context.rtl ? 'right' : 'left',
  });
};

const renderToc = (context: DrawContext, slide: BiPptxSlide): void => {
  const bullets = (slide.bullets ?? []).map(block => ({
    text: block.text,
    options: textOptions(context, {
      fontSize: 11.5,
      color: C.body,
      breakLine: true,
      bullet: false,
      align: context.rtl ? 'right' : 'left',
    }),
  }));
  if (bullets.length > 0) {
    context.slide.addText(bullets, textOptions(context, {
      x: context.margin,
      y: 1.65,
      w: context.contentWidth,
      h: 4.95,
      valign: 'top',
      lineSpacingMultiple: 1.18,
      fit: 'shrink',
    }));
  }
};

// ---------------------------------------------------------------------------
// Cartes KPI
// ---------------------------------------------------------------------------

const renderKpiCards = (context: DrawContext, blocks: BiPptxKpiBlock[]): void => {
  if (blocks.length === 0) return;
  const labels = getBiPptxLabels(context.deck.config.language);
  const count = blocks.length;
  const cols = count === 1 ? 1 : count === 2 ? 2 : count <= 6 ? 3 : 4;
  const rows = Math.ceil(count / cols);
  const gap = 0.16;
  const areaY = 1.62;
  const areaH = context.height - areaY - 0.78;
  const cardW =
    count === 1
      ? Math.min(5.6, context.contentWidth)
      : (context.contentWidth - gap * (cols - 1)) / cols;
  const cardH = Math.min(2.35, (areaH - gap * (rows - 1)) / rows);
  const totalW = cols * cardW + gap * (cols - 1);
  const startX = context.margin + Math.max(0, (context.contentWidth - totalW) / 2);
  const startY = areaY + Math.max(0, (areaH - (rows * cardH + gap * (rows - 1))) / 2);

  blocks.forEach((block, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const x = startX + col * (cardW + gap);
    const y = startY + row * (cardH + gap);
    const tone = block.tone ?? 'blue';
    const accent = KPI_ACCENTS[tone] ?? C.blue;

    addRect(context, { x, y, w: cardW, h: cardH, fill: C.white, line: C.border, radius: true });
    addRect(context, { x, y, w: 0.08, h: cardH, fill: accent });
    addRect(context, { x, y, w: cardW, h: 0.06, fill: KPI_FILLS[tone] ?? C.blueSoft });

    addText(context, block.label, {
      x: x + 0.2,
      y: y + 0.16,
      w: cardW - 0.34,
      h: 0.38,
      fontSize: cardW < 3 ? 8 : 9,
      bold: true,
      color: accent,
      fit: 'shrink',
      valign: 'top',
      align: context.rtl ? 'right' : 'left',
    });
    addText(context, block.value, {
      x: x + 0.2,
      y: y + 0.58,
      w: cardW - 0.34,
      h: 0.62,
      fontSize: cardH > 2 ? 21 : 18,
      bold: true,
      color: C.navy,
      fit: 'shrink',
      valign: 'top',
      align: context.rtl ? 'right' : 'left',
    });

    const detailY = y + 1.22;
    const detailH = Math.max(0.35, cardH - 1.72);
    const details: string[] = [];
    if (block.definition) details.push(block.definition);
    if (block.target) details.push(`${labels.target} : ${block.target}`);
    if (details.length > 0) {
      addText(context, details.join('  ·  '), {
        x: x + 0.2,
        y: detailY,
        w: cardW - 0.34,
        h: detailH,
        fontSize: cardW < 3 ? 7 : 7.8,
        color: C.muted,
        valign: 'top',
        fit: 'shrink',
        align: context.rtl ? 'right' : 'left',
      });
    }
    if (block.hint) {
      addText(context, block.hint, {
        x: x + 0.2,
        y: y + cardH - 0.34,
        w: cardW - 0.34,
        h: 0.22,
        fontSize: 7,
        italic: true,
        color: C.muted,
        fit: 'shrink',
        align: context.rtl ? 'right' : 'left',
      });
    }
  });
}

// ---------------------------------------------------------------------------
// Graphiques natifs
// ---------------------------------------------------------------------------

const chartTypeFor = (type: BiPptxChartBlock['type']): string => {
  switch (type) {
    case 'BAR':
    case 'COLUMN':
    case 'HISTOGRAM':
      return 'bar';
    case 'LINE':
      return 'line';
    case 'AREA':
      return 'area';
    case 'PIE':
      return 'pie';
    case 'DONUT':
      return 'doughnut';
    case 'SCATTER':
      return 'scatter';
    case 'COMBO':
      return 'bar';
    default:
      return 'bar';
  }
};

const renderChart = (context: DrawContext, block: BiPptxChartBlock): void => {
  const labels = getBiPptxLabels(context.deck.config.language);
  const type = chartTypeFor(block.type);
  const seriesCount = block.series.length;
  const pieLike = block.type === 'PIE' || block.type === 'DONUT';
  const categoryCount = block.categories.length;
  const catFont = categoryCount > 24 ? 7 : categoryCount > 14 ? 8 : 9;
  const rotate =
    ['COLUMN', 'LINE', 'AREA', 'HISTOGRAM', 'COMBO'].includes(block.type) && categoryCount > 8
      ? -30
      : 0;

  const chartOptions: Record<string, any> = {
    x: context.margin,
    y: 1.58,
    w: context.contentWidth,
    h: context.height - 1.58 - 0.82,
    showTitle: false,
    showLegend: seriesCount > 1 || pieLike,
    legendPos: 'b',
    legendFontSize: 8,
    legendFontFace: context.font,
    legendColor: C.body,
    catAxisLabelFontSize: catFont,
    catAxisLabelFontFace: context.font,
    catAxisLabelColor: C.body,
    catAxisLabelRotate: rotate,
    valAxisLabelFontSize: 8,
    valAxisLabelFontFace: context.font,
    valAxisLabelColor: C.body,
    showValAxisTitle: !!block.unit,
    valAxisTitle: block.unit || undefined,
    valAxisTitleFontSize: 9,
    valAxisTitleFontFace: context.font,
    valAxisTitleColor: C.muted,
    showCatAxisTitle: false,
    showSerAxisTitle: false,
    chartColors: PALETTE,
    chartColorsOpacity: 100,
    valGridLine: { color: C.border, size: 0.5, style: 'solid' },
    catGridLine: { style: 'none' },
    serGridLine: { style: 'none' },
    dataLabelFontSize: 8,
    dataLabelFontFace: context.font,
    lang: context.language === 'ar' ? 'ar-SA' : 'fr-FR',
    rtlMode: context.rtl,
    showValue: false,
    showPercent: pieLike,
    showCatName: false,
    showSerName: false,
    showLeaderLines: pieLike,
    border: { pt: 0, color: C.white },
    chartArea: { fill: { color: C.white }, border: { pt: 0, color: C.white }, roundedCorners: false },
    plotArea: { fill: { color: C.white }, border: { pt: 0, color: C.white } },
  };

  if (block.type === 'BAR') {
    chartOptions.barDir = 'bar';
    chartOptions.barGrouping = 'clustered';
  } else if (block.type === 'COLUMN' || block.type === 'HISTOGRAM') {
    chartOptions.barDir = 'col';
    chartOptions.barGrouping = 'clustered';
  } else if (block.type === 'COMBO') {
    chartOptions.barDir = 'col';
    chartOptions.barGrouping = 'clustered';
  } else if (block.type === 'LINE') {
    chartOptions.lineDataSymbol = 'circle';
    chartOptions.lineDataSymbolSize = 5;
    chartOptions.lineSize = 2;
  } else if (block.type === 'AREA') {
    chartOptions.barGrouping = 'standard';
  } else if (pieLike) {
    chartOptions.legendPos = 'b';
  }

  try {
    if (block.type === 'SCATTER') {
      const data = [
        { name: 'X', values: block.scatterX ?? block.categories.map((_, index) => index + 1) },
        ...block.series.map(series => ({ name: series.name, values: series.values })),
      ];
      context.slide.addChart('scatter', data, chartOptions);
      return;
    }

    if (block.type === 'COMBO') {
      const multi = block.series.map((series, index) => ({
        type: index === 0 ? 'bar' : 'line',
        data: [
          {
            name: series.name,
            labels: block.categories,
            values: series.values,
          },
        ],
      }));
      context.slide.addChart(multi, chartOptions);
      return;
    }

    const series = pieLike ? block.series.slice(0, 1) : block.series;
    const data = series.map(item => ({
      name: item.name,
      labels: block.categories,
      values: item.values,
    }));
    context.slide.addChart(type, data, chartOptions);
  } catch (error) {
    // Repli lisible : le graphique est remplacé par un tableau natif, jamais
    // par une image déformée. Les données restent donc exploitables.
    const fallback: BiPptxTableBlock = {
      columns: [
        { key: 'category', label: labels.indicator, role: 'DIMENSION', format: 'NUMBER' },
        ...block.series.map(series => ({
          key: series.name,
          label: series.name,
          role: 'MEASURE' as const,
          format: block.format ?? 'NUMBER',
          unit: block.unit,
        })),
      ],
      rows: block.categories.map((category, index) => {
        const row: Record<string, string | number | null> = { category };
        for (const series of block.series) row[series.name] = series.values[index] ?? null;
        return row;
      }),
      totalRows: block.categories.length,
      truncated: false,
    };
    renderTable(context, fallback, 1.7);
    addText(context, `Graphique non rendu (${error instanceof Error ? error.message : 'erreur'}) — données affichées en tableau.`, {
      x: context.margin,
      y: context.height - 0.96,
      w: context.contentWidth,
      h: 0.22,
      fontSize: 7.5,
      italic: true,
      color: C.amber,
      fit: 'shrink',
      align: context.rtl ? 'right' : 'left',
    });
  }
};

// ---------------------------------------------------------------------------
// Tableaux natifs
// ---------------------------------------------------------------------------

const renderTable = (
  context: DrawContext,
  block: BiPptxTableBlock,
  startY = 1.65
): void => {
  const labels = getBiPptxLabels(context.deck.config.language);
  if (block.columns.length === 0 || block.rows.length === 0) {
    addText(context, labels.noData, {
      x: context.margin,
      y: startY,
      w: context.contentWidth,
      h: 0.6,
      fontSize: 11,
      color: C.muted,
      align: context.rtl ? 'right' : 'left',
    });
    return;
  }

  const maxColumns = 8;
  const columns = block.columns.slice(0, maxColumns);
  const weights = columns.map(column => (column.role === 'DIMENSION' ? 1.45 : 1));
  const weightSum = weights.reduce((sum, value) => sum + value, 0);
  const colW = weights.map(weight => (weight / weightSum) * context.contentWidth);

  const header = columns.map(column => ({
    text: column.label,
    options: textOptions(context, {
      bold: true,
      fontSize: 8.5,
      color: C.white,
      fill: { color: C.navySoft },
      align: column.role === 'MEASURE' ? (context.rtl ? 'left' : 'right') : context.rtl ? 'right' : 'left',
      valign: 'middle',
      margin: 0.04,
    }),
  }));

  const body = block.rows.map((row, rowIndex) => {
    return columns.map(column => {
      const value = row[column.key];
      const text =
        column.role === 'MEASURE'
          ? formatBiPptxValue(
              typeof value === 'number' ? value : value === null ? null : Number(value),
              column.format,
              column.unit
            )
          : safeText(value, '—');
      return {
        text,
        options: textOptions(context, {
          fontSize: block.rows.length > 10 ? 7.2 : 8,
          color: C.body,
          fill: { color: rowIndex % 2 === 0 ? C.white : C.faint },
          align: column.role === 'MEASURE' ? (context.rtl ? 'left' : 'right') : context.rtl ? 'right' : 'left',
          valign: 'middle',
          margin: 0.04,
        }),
      };
    });
  });

  const availableHeight = context.height - startY - 0.9;
  const rowHeight = Math.min(0.34, Math.max(0.22, availableHeight / (block.rows.length + 1)));
  context.slide.addTable([header, ...body], textOptions(context, {
    x: context.margin,
    y: startY,
    w: context.contentWidth,
    colW,
    rowH: rowHeight,
    border: { pt: 0.5, color: C.border },
    margin: 0.04,
    valign: 'middle',
    autoPage: false,
    fontFace: context.font,
    fontSize: 8,
  }));

  const notes: string[] = [];
  if (block.truncated) notes.push(labels.rowsShown(block.rows.length, block.totalRows));
  if (block.columns.length > maxColumns) {
    notes.push(`${block.columns.length - maxColumns} colonne(s) supplémentaire(s) disponible(s) dans la source.`);
  }
  if (notes.length > 0) {
    addText(context, notes.join('  ·  '), {
      x: context.margin,
      y: context.height - 0.98,
      w: context.contentWidth,
      h: 0.22,
      fontSize: 7.2,
      italic: true,
      color: C.muted,
      fit: 'shrink',
      align: context.rtl ? 'right' : 'left',
    });
  }
};

const renderComparison = (context: DrawContext, slide: BiPptxSlide): void => {
  const comparison = slide.comparison;
  if (!comparison) return;
  const labels = getBiPptxLabels(context.deck.config.language);
  const columns = [
    { key: 'label', label: labels.indicator, role: 'DIMENSION' as const, format: 'NUMBER' as const },
    { key: 'current', label: comparison.currentLabel, role: 'MEASURE' as const, format: 'NUMBER' as const },
    { key: 'previous', label: comparison.previousLabel, role: 'MEASURE' as const, format: 'NUMBER' as const },
    { key: 'delta', label: labels.delta, role: 'MEASURE' as const, format: 'NUMBER' as const },
    { key: 'deltaPercent', label: labels.deltaPercent, role: 'MEASURE' as const, format: 'PERCENT' as const },
  ];
  const weights = [1.7, 1.1, 1.1, 1.1, 0.9];
  const weightSum = weights.reduce((sum, value) => sum + value, 0);
  const colW = weights.map(weight => (weight / weightSum) * context.contentWidth);

  const header = columns.map(column => ({
    text: column.label,
    options: textOptions(context, {
      bold: true,
      fontSize: 8.5,
      color: C.white,
      fill: { color: C.navySoft },
      align: column.role === 'MEASURE' ? (context.rtl ? 'left' : 'right') : context.rtl ? 'right' : 'left',
      valign: 'middle',
      margin: 0.04,
    }),
  }));

  const body = comparison.rows.map((row, index) => {
    const cells = [
      row.label,
      formatBiPptxValue(row.current, row.format, row.unit),
      formatBiPptxValue(row.previous, row.format, row.unit),
      formatBiPptxDelta(row.delta, row.format, row.unit),
      formatBiPptxDelta(row.deltaPercent, 'PERCENT', '', true),
    ];
    return cells.map((text, columnIndex) => ({
      text,
      options: textOptions(context, {
        fontSize: 8,
        color: columnIndex === 0 ? C.body : C.navy,
        bold: columnIndex >= 3,
        fill: { color: index % 2 === 0 ? C.white : C.faint },
        align: columnIndex === 0 ? (context.rtl ? 'right' : 'left') : context.rtl ? 'left' : 'right',
        valign: 'middle',
        margin: 0.04,
      }),
    }));
  });

  const startY = 1.65;
  const availableHeight = context.height - startY - 0.9;
  const rowHeight = Math.min(0.36, Math.max(0.24, availableHeight / (comparison.rows.length + 1)));
  context.slide.addTable([header, ...body], textOptions(context, {
    x: context.margin,
    y: startY,
    w: context.contentWidth,
    colW,
    rowH: rowHeight,
    border: { pt: 0.5, color: C.border },
    margin: 0.04,
    valign: 'middle',
    autoPage: false,
    fontFace: context.font,
    fontSize: 8,
  }));
  addText(context, '« — » signale une donnée non disponible : aucune valeur n’est extrapolée.', {
    x: context.margin,
    y: context.height - 0.98,
    w: context.contentWidth,
    h: 0.22,
    fontSize: 7.2,
    italic: true,
    color: C.muted,
    fit: 'shrink',
    align: context.rtl ? 'right' : 'left',
  });
};

// ---------------------------------------------------------------------------
// Blocs de texte
// ---------------------------------------------------------------------------

const renderBullets = (
  context: DrawContext,
  blocks: BiPptxTextBlock[],
  options: { y?: number; h?: number; fontSize?: number } = {}
): void => {
  if (blocks.length === 0) return;
  const tags = TONE_LABELS[context.language];
  const runs = blocks.map(block => ({
    text: `${tags[block.tone] ?? tags.INFO} — ${block.text}`,
    options: textOptions(context, {
      fontSize: options.fontSize ?? 10.5,
      color: TONE_COLORS[block.tone] ?? C.body,
      breakLine: true,
      bullet: { characterCode: '25CF', indent: 12 },
      align: context.rtl ? 'right' : 'left',
    }),
  }));
  context.slide.addText(runs, textOptions(context, {
    x: context.margin,
    y: options.y ?? 1.65,
    w: context.contentWidth,
    h: options.h ?? context.height - 1.65 - 0.86,
    valign: 'top',
    lineSpacingMultiple: 1.16,
    fit: 'shrink',
  }));
};

// ---------------------------------------------------------------------------
// Commentaires et observations édités dans l'assistant
// ---------------------------------------------------------------------------

const ANNOTATION_KINDS: BiPptxSlide['kind'][] = [
  'AI',
  'CONCLUSION',
  'RECOMMENDATIONS',
  'ALERTS',
  'SOURCES',
  'CUSTOM',
  'TOC',
];

const renderAnnotations = (context: DrawContext, slide: BiPptxSlide): void => {
  if (!slide.comment && !slide.observations) return;
  if (!ANNOTATION_KINDS.includes(slide.kind)) return;
  const labels = getBiPptxLabels(context.deck.config.language);
  const text = [
    slide.comment ? `${labels.comment} : ${slide.comment}` : '',
    slide.observations ? `${labels.observations} : ${slide.observations}` : '',
  ]
    .filter(Boolean)
    .join('   ·   ');
  const y = context.height - 1.62;
  addRect(context, {
    x: context.margin,
    y,
    w: context.contentWidth,
    h: 0.62,
    fill: C.faint,
    line: C.border,
    radius: true,
  });
  addRect(context, { x: context.margin, y, w: 0.06, h: 0.62, fill: C.violet });
  addText(context, text, {
    x: context.margin + 0.16,
    y: y + 0.06,
    w: context.contentWidth - 0.28,
    h: 0.5,
    fontSize: 8,
    italic: true,
    color: C.body,
    valign: 'middle',
    fit: 'shrink',
    align: context.rtl ? 'right' : 'left',
  });
};

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------

const renderSlideBody = (context: DrawContext, slide: BiPptxSlide): void => {
  switch (slide.kind) {
    case 'COVER':
      renderCover(context, slide);
      return;
    case 'TOC':
      renderToc(context, slide);
      return;
    case 'COMPARISON':
      renderComparison(context, slide);
      return;
    case 'CHART':
      if (slide.chart) renderChart(context, slide.chart);
      else if (slide.table) renderTable(context, slide.table);
      else renderBullets(context, slide.bullets ?? []);
      return;
    case 'TABLE':
      if (slide.table) renderTable(context, slide.table);
      else renderBullets(context, slide.bullets ?? []);
      return;
    case 'KPI':
    case 'EXECUTIVE_SUMMARY':
      if (slide.kpis && slide.kpis.length > 0) {
        renderKpiCards(context, slide.kpis);
        if (slide.kind === 'EXECUTIVE_SUMMARY' && slide.bullets && slide.bullets.length > 0) {
          // La synthèse exécutive réserve une bande basse aux faits clés.
          renderBullets(context, slide.bullets.slice(0, 2), {
            y: context.height - 1.55,
            h: 0.62,
            fontSize: 8,
          });
        }
      } else {
        renderBullets(context, slide.bullets ?? []);
      }
      return;
    default:
      renderBullets(context, slide.bullets ?? []);
  }
};

/**
 * Génère le fichier .pptx et renvoie un ArrayBuffer.
 * Le rendu est effectué entièrement côté client, sans serveur ni donnée externe.
 */
export async function renderBiPptxDeck(deck: BiPptxDeck): Promise<ArrayBuffer> {
  const module = await import('pptxgenjs');
  const PptxGenJS = (module as any).default ?? module;
  const pptx: PptxLike = new PptxGenJS();

  pptx.layout = deck.config.format === '4:3' ? 'LAYOUT_4x3' : 'LAYOUT_WIDE';
  pptx.rtlMode = isArabic(deck);
  pptx.author = deck.config.author;
  pptx.company = deck.config.company;
  pptx.subject = deck.config.subtitle;
  pptx.title = deck.config.title;
  pptx.revision = '1';
  pptx.theme = {
    headFontFace: fontFace(deck.config.language),
    bodyFontFace: fontFace(deck.config.language),
  };

  const { width, height } = slideSize(deck);
  const margin = deck.config.format === '4:3' ? 0.45 : 0.55;
  const total = deck.slides.length;

  deck.slides.forEach((slide, index) => {
    const pptxSlide = pptx.addSlide();
    const context: DrawContext = {
      deck,
      pptx,
      slide: pptxSlide,
      width,
      height,
      margin,
      contentWidth: width - margin * 2,
      language: deck.config.language,
      font: fontFace(deck.config.language),
      rtl: isArabic(deck),
    };

    if (slide.kind !== 'COVER') {
      pptxSlide.background = { color: C.white };
      addHeader(context, slide);
    }
    renderSlideBody(context, slide);
    if (slide.kind !== 'COVER') {
      renderAnnotations(context, slide);
      addFooter(context, slide, index, total);
    }

    const notes = [
      `${deck.config.title} — ${slide.title}`,
      `${getBiPptxLabels(deck.config.language).period} : ${slide.periodLabel ?? deck.config.periodLabel}`,
      slide.sourceLabel ? `${getBiPptxLabels(deck.config.language).source} : ${slide.sourceLabel}` : '',
      slide.filters && slide.filters.length > 0
        ? `${getBiPptxLabels(deck.config.language).filters} : ${slide.filters.join(', ')}`
        : '',
      slide.comment
        ? `${getBiPptxLabels(deck.config.language).comment} : ${slide.comment}`
        : '',
      slide.observations
        ? `${getBiPptxLabels(deck.config.language).observations} : ${slide.observations}`
        : '',
      `${getBiPptxLabels(deck.config.language).generatedAt} : ${new Date(deck.config.generatedAt).toLocaleString('fr-FR')}`,
    ]
      .filter(Boolean)
      .join('\n');
    try {
      pptxSlide.addNotes(notes);
    } catch {
      // Les notes sont un confort : leur échec ne bloque pas l'export.
    }
  });

  const output = await pptx.write({ outputType: 'arraybuffer' });
  if (output instanceof ArrayBuffer) return output;
  if (ArrayBuffer.isView(output)) {
    return output.buffer.slice(output.byteOffset, output.byteOffset + output.byteLength) as ArrayBuffer;
  }
  if (typeof output === 'string') {
    const bytes = new TextEncoder().encode(output);
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  }
  throw new Error('Format de sortie PowerPoint inattendu.');
}

/** Nom de fichier sûr, compatible Windows et réseau partagé. */
export function biPptxFileName(deck: BiPptxDeck): string {
  const base = (deck.config.title || 'MAMORA-BI')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_ ]+/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 70) || 'MAMORA-BI';
  const stamp = new Date(deck.config.generatedAt)
    .toISOString()
    .slice(0, 16)
    .replace(/[:T]/g, '-');
  return `${base}-${stamp}.pptx`;
}
