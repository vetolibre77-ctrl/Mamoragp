/**
 * MAMORA AI ANALYST — assistant analytique déterministe.
 *
 * Le fournisseur IA est volontairement séparé du moteur analytique :
 *  - les nombres sont TOUJOURS produits par `engine.ts` ;
 *  - le fournisseur local ne fait qu'orienter la question et rédiger la synthèse ;
 *  - aucun fournisseur externe n'est appelé sans proxy serveur configuré ;
 *  - aucune clé API n'est présente dans le code source.
 */

import {
  BiAiResponse,
  BiPeriod,
  BiQuery,
  BiQueryResult,
  BiScope,
  BiSettings,
  BiSnapshot,
  BiSourceId,
  BiWidgetType,
} from '../../types';
import {
  buildBiSnapshot,
  computeBiMeasureValues,
  resolveBiPeriod,
  runBiQuery,
} from './engine';
import { BI_MEASURES, BI_SOURCES } from './catalog';

export type BiAnalystIntent =
  | 'PRODUCTION_TOTAL'
  | 'PRODUCTION_COMPARE'
  | 'PERTES'
  | 'ECARTS_CONSOMMATION'
  | 'STOCK_MINIMUM'
  | 'FOURNISSEURS_RETARD'
  | 'LIGNES_PERFORMANCE'
  | 'NON_CONFORMITES'
  | 'THEORIQUE_REEL'
  | 'SYNTHESE'
  | 'INCONNU';

export interface BiAnalystProvider {
  id: string;
  label: string;
  available: boolean;
  reason?: string;
}

export const LOCAL_BI_ANALYST_PROVIDER: BiAnalystProvider = {
  id: 'LOCAL',
  label: 'Moteur analytique local MAMORA BI',
  available: true,
};

/**
 * Résout le fournisseur IA configuré. Les fournisseurs externes ne sont jamais
 * appelés directement par le navigateur : ils exigent un proxy serveur.
 */
export function resolveBiAnalystProvider(settings?: BiSettings): BiAnalystProvider {
  if (!settings || !settings.aiEnabled || settings.aiProvider === 'NONE') {
    return {
      id: 'LOCAL',
      label: 'Moteur analytique local (IA externe désactivée)',
      available: true,
      reason: 'Aucun fournisseur IA externe n’est configuré. Les analyses déterministes restent disponibles.',
    };
  }
  if (settings.aiProvider === 'LOCAL') {
    return LOCAL_BI_ANALYST_PROVIDER;
  }
  return {
    id: settings.aiProvider,
    label: `${settings.aiProvider}${settings.aiModel ? ` · ${settings.aiModel}` : ''}`,
    available: false,
    reason:
      'Fournisseur IA externe non disponible : aucun proxy serveur sécurisé n’est configuré. ' +
      'MAMORA BI utilise le moteur analytique local et ne transmet aucune donnée à un tiers.',
  };
}

const MONTHS_FR = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

const formatNumber = (value: number | null, unit = '', digits = 0): string => {
  if (value === null || Number.isNaN(value)) return 'non calculable';
  const formatted = value.toLocaleString('fr-FR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  return unit ? `${formatted} ${unit}` : formatted;
};

const formatPercent = (value: number | null): string => {
  if (value === null || Number.isNaN(value)) return 'non calculable';
  return `${value.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`;
};

function periodLabel(period?: BiPeriod): string {
  if (!period || (!period.from && !period.to)) return 'toutes périodes confondues';
  if (period.label) return period.label;
  return `du ${period.from ?? 'début'} au ${period.to ?? 'aujourd’hui'}`;
}

function periodFilters(period?: BiPeriod): Array<{ field: 'date'; operator: 'GTE' | 'LTE'; value: string }> {
  const filters: Array<{ field: 'date'; operator: 'GTE' | 'LTE'; value: string }> = [];
  if (period?.from) filters.push({ field: 'date', operator: 'GTE', value: period.from });
  if (period?.to) filters.push({ field: 'date', operator: 'LTE', value: period.to });
  return filters;
}

/** Détecte la période demandée à partir de mots-clés simples en français. */
export function detectBiQuestionPeriod(question: string, now = new Date()): { period: BiPeriod; label: string } {
  const normalized = question.toLowerCase();
  if (/(12 derniers mois|douze derniers mois|dernière année|derniers 12 mois)/.test(normalized)) {
    return { period: resolveBiPeriod('LAST_12_MONTHS', now), label: '12 derniers mois' };
  }
  if (/(année en cours|cette année|année \d{4}|exercice)/.test(normalized)) {
    const yearMatch = normalized.match(/année\s+(\d{4})/);
    if (yearMatch) {
      const year = Number(yearMatch[1]);
      return { period: { from: `${year}-01-01`, to: `${year}-12-31`, label: `Année ${year}` }, label: `Année ${year}` };
    }
    return { period: resolveBiPeriod('CURRENT_YEAR', now), label: 'année en cours' };
  }
  if (/(mois précédent|mois dernier)/.test(normalized)) {
    return { period: resolveBiPeriod('LAST_MONTH', now), label: 'mois précédent' };
  }
  if (/(ce mois|mois en cours|ce mois-ci|du mois)/.test(normalized)) {
    return { period: resolveBiPeriod('CURRENT_MONTH', now), label: 'mois en cours' };
  }
  if (/(trimestre|ce trimestre)/.test(normalized)) {
    return { period: resolveBiPeriod('CURRENT_QUARTER', now), label: 'trimestre en cours' };
  }
  if (/(aujourd’hui|aujourd'hui)/.test(normalized)) {
    const day = now.toISOString().slice(0, 10);
    return { period: { from: day, to: day, label: `journée du ${day}` }, label: 'journée' };
  }
  if (/(cette semaine|semaine en cours)/.test(normalized)) {
    const start = new Date(now);
    const day = start.getDay() || 7;
    start.setDate(start.getDate() - day + 1);
    return {
      period: { from: start.toISOString().slice(0, 10), to: now.toISOString().slice(0, 10), label: 'semaine en cours' },
      label: 'semaine en cours',
    };
  }
  // Par défaut : mois en cours pour les questions de performance.
  return { period: resolveBiPeriod('CURRENT_MONTH', now), label: 'mois en cours' };
}

export function detectBiIntent(question: string): BiAnalystIntent {
  const normalized = question.toLowerCase();
  if (/(fournisseur|fournisseurs|ponctualité|retard de réception|retards)/.test(normalized)) {
    return 'FOURNISSEURS_RETARD';
  }
  if (/(sous le stock|stock minimum|rupture|réapprovisionnement|stock faible|sous-minimum)/.test(normalized)) {
    return 'STOCK_MINIMUM';
  }
  if (/(non-conformité|non conformité|nc |qualité|haccp|anomalie)/.test(normalized)) {
    return 'NON_CONFORMITES';
  }
  if (/(perte|pertes|rebut|rejet)/.test(normalized)) {
    return 'PERTES';
  }
  if (/(écart de consommation|ecart de consommation|consommation théorique|consommation theorique|matières premières|matieres premieres)/.test(normalized)) {
    return 'ECARTS_CONSOMMATION';
  }
  if (/(théorique|theorique).*(réel|reel)|(réel|reel).*(théorique|theorique)/.test(normalized)) {
    return 'THEORIQUE_REEL';
  }
  if (/(ligne|lignes de production|atelier|performance des lignes)/.test(normalized)) {
    return 'LIGNES_PERFORMANCE';
  }
  if (/(compare|comparaison|thon|sardine|produit)/.test(normalized) && /(production|rendement|conformité|conformite)/.test(normalized)) {
    return 'PRODUCTION_COMPARE';
  }
  if (/(production totale|production|boîtes|boites|fabrication)/.test(normalized)) {
    return 'PRODUCTION_TOTAL';
  }
  if (/(synthèse|synthese|résumé|resume|tableau de bord|performance globale|direction)/.test(normalized)) {
    return 'SYNTHESE';
  }
  return 'INCONNU';
}

interface IntentPlan {
  intent: BiAnalystIntent;
  query?: BiQuery;
  chartType?: BiWidgetType;
  title: string;
}

function withPeriodFilters(query: BiQuery, period: BiPeriod): BiQuery {
  const filters = periodFilters(period);
  return { ...query, filters: [...query.filters, ...filters] };
}

function buildIntentPlan(intent: BiAnalystIntent, period: BiPeriod): IntentPlan {
  switch (intent) {
    case 'PRODUCTION_TOTAL':
      return {
        intent,
        title: 'Production réalisée',
        chartType: 'COLUMN',
        query: withPeriodFilters({
          source: 'production',
          dimensions: ['monthLabel'],
          measures: ['totalCans', 'conformingCans', 'rejectedCans'],
          filters: [],
          orderBy: [{ field: 'monthLabel', direction: 'ASC' }],
          limit: 24,
        }, period),
      };
    case 'PRODUCTION_COMPARE':
      return {
        intent,
        title: 'Comparaison des produits',
        chartType: 'BAR',
        query: withPeriodFilters({
          source: 'production',
          dimensions: ['productName'],
          measures: ['totalCans', 'conformityRate'],
          filters: [],
          orderBy: [{ field: 'totalCans', direction: 'DESC' }],
          limit: 20,
        }, period),
      };
    case 'PERTES':
      return {
        intent,
        title: 'Pertes de production',
        chartType: 'BAR',
        query: withPeriodFilters({
          source: 'production',
          dimensions: ['productName'],
          measures: ['rejectedCans', 'totalCans', 'conformityRate'],
          filters: [],
          orderBy: [{ field: 'rejectedCans', direction: 'DESC' }],
          limit: 15,
        }, period),
      };
    case 'ECARTS_CONSOMMATION':
      return {
        intent,
        title: 'Écarts de consommation',
        chartType: 'BAR',
        query: withPeriodFilters({
          source: 'consumption',
          dimensions: ['designation'],
          measures: ['varianceQty', 'actualConsumed', 'theoreticalConsumed'],
          filters: [],
          orderBy: [{ field: 'varianceQty', direction: 'DESC' }],
          limit: 15,
        }, period),
      };
    case 'STOCK_MINIMUM':
      return {
        intent,
        title: 'Articles sous le stock minimum',
        chartType: 'TABLE',
        query: {
          source: 'stock',
          dimensions: ['itemCode', 'designation', 'warehouseCode'],
          measures: ['availableQty', 'belowMinCount'],
          filters: [{ field: 'belowMin', operator: 'GT', value: 0 }],
          orderBy: [{ field: 'availableQty', direction: 'ASC' }],
          limit: 50,
        },
      };
    case 'FOURNISSEURS_RETARD':
      return {
        intent,
        title: 'Retards fournisseurs',
        chartType: 'BAR',
        query: withPeriodFilters({
          source: 'purchase_order',
          dimensions: ['supplierName'],
          measures: ['lateDays', 'purchaseAmount', 'orderCount'],
          filters: [],
          orderBy: [{ field: 'lateDays', direction: 'DESC' }],
          limit: 15,
        }, period),
      };
    case 'LIGNES_PERFORMANCE':
      return {
        intent,
        title: 'Performance des lignes',
        chartType: 'BAR',
        query: withPeriodFilters({
          source: 'production',
          dimensions: ['lineId'],
          measures: ['totalCans', 'conformityRate'],
          filters: [],
          orderBy: [{ field: 'totalCans', direction: 'DESC' }],
          limit: 20,
        }, period),
      };
    case 'NON_CONFORMITES':
      return {
        intent,
        title: 'Non-conformités',
        chartType: 'COLUMN',
        query: withPeriodFilters({
          source: 'quality',
          dimensions: ['monthLabel', 'severity'],
          measures: ['ncCount', 'openNcCount', 'criticalNcCount'],
          filters: [],
          orderBy: [{ field: 'monthLabel', direction: 'ASC' }],
          limit: 36,
        }, period),
      };
    case 'THEORIQUE_REEL':
      return {
        intent,
        title: 'Consommation théorique vs réelle',
        chartType: 'BAR',
        query: withPeriodFilters({
          source: 'consumption',
          dimensions: ['designation'],
          measures: ['theoreticalConsumed', 'actualConsumed', 'varianceQty'],
          filters: [],
          orderBy: [{ field: 'varianceQty', direction: 'DESC' }],
          limit: 15,
        }, period),
      };
    default:
      return { intent, title: 'Synthèse MAMORA BI' };
  }
}

function resultToChart(result: BiQueryResult, type: BiWidgetType, title: string) {
  const dimensionColumns = result.columns.filter(column => column.role === 'DIMENSION');
  const measureColumns = result.columns.filter(column => column.role === 'MEASURE');
  return {
    type,
    title,
    data: result.rows,
    xKey: dimensionColumns[0]?.key,
    series: measureColumns.map(column => column.key),
  };
}

function topRows(result: BiQueryResult, measureKey: string, limit = 5): Array<Record<string, string | number | null>> {
  return [...result.rows]
    .sort((left, right) => Number(right[measureKey] ?? 0) - Number(left[measureKey] ?? 0))
    .slice(0, limit);
}

function firstDimension(result: BiQueryResult): string {
  return result.columns.find(column => column.role === 'DIMENSION')?.key ?? '';
}

function answerProductionTotal(result: BiQueryResult, period: BiPeriod): { facts: string[]; recommendations: string[] } {
  const total = result.rows.reduce((sum, row) => sum + Number(row.totalCans ?? 0), 0);
  const conforming = result.rows.reduce((sum, row) => sum + Number(row.conformingCans ?? 0), 0);
  const rejected = result.rows.reduce((sum, row) => sum + Number(row.rejectedCans ?? 0), 0);
  const rate = total > 0 ? (conforming / total) * 100 : null;
  const facts = [
    `Production totale sur ${periodLabel(period)} : ${formatNumber(total, 'boîtes')}.`,
    `Production conforme : ${formatNumber(conforming, 'boîtes')} (${formatPercent(rate)}).`,
    `Boîtes rejetées : ${formatNumber(rejected, 'boîtes')}.`,
  ];
  const recommendations: string[] = [];
  if (rate !== null && rate < 95) {
    recommendations.push('Le taux de conformité est inférieur à 95 % : analyser les causes de rejet par produit et par ligne.');
  }
  if (rejected > 0) {
    recommendations.push('Prioriser l’analyse des lots ayant le plus de rejets et vérifier les réglages de sertissage / stérilisation.');
  }
  return { facts, recommendations };
}

function answerProductionCompare(result: BiQueryResult): { facts: string[]; recommendations: string[] } {
  const dimension = firstDimension(result);
  const rows = topRows(result, 'totalCans', 8);
  const facts = rows.slice(0, 5).map(row =>
    `${String(row[dimension] ?? 'Produit inconnu')} : ${formatNumber(Number(row.totalCans ?? 0), 'boîtes')}, conformité ${formatPercent(Number(row.conformityRate ?? 0))}.`
  );
  const thon = result.rows.find(row => String(row[dimension] ?? '').toLowerCase().includes('thon'));
  const sardine = result.rows.find(row => String(row[dimension] ?? '').toLowerCase().includes('sardine'));
  if (thon && sardine) {
    const thonRate = Number(thon.conformityRate ?? 0);
    const sardineRate = Number(sardine.conformityRate ?? 0);
    facts.push(
      `Comparaison directe : thon ${formatPercent(thonRate)} de conformité contre sardine ${formatPercent(sardineRate)} ; écart ${formatPercent(thonRate - sardineRate)}.`
    );
  }
  const recommendations: string[] = [];
  if (rows.length > 0) {
    recommendations.push(`Approfondir l’écart du produit « ${String(rows[0][dimension] ?? '')} » avec le détail par lot et par ligne.`);
  }
  return { facts, recommendations };
}

function answerLosses(result: BiQueryResult): { facts: string[]; recommendations: string[] } {
  const dimension = firstDimension(result);
  const rows = topRows(result, 'rejectedCans', 5);
  const totalRejected = result.rows.reduce((sum, row) => sum + Number(row.rejectedCans ?? 0), 0);
  const facts = [
    `Total des boîtes rejetées sur la période : ${formatNumber(totalRejected, 'boîtes')}.`,
    ...rows.map(row =>
      `${String(row[dimension] ?? 'Produit inconnu')} : ${formatNumber(Number(row.rejectedCans ?? 0), 'boîtes')} rejetées (conformité ${formatPercent(Number(row.conformityRate ?? 0))}).`
    ),
  ];
  const recommendations = totalRejected > 0
    ? ['Analyser les rejets par étape (sertissage, stérilisation, parage) et vérifier les paramètres machine des lots concernés.']
    : [];
  return { facts, recommendations };
}

function answerConsumptionVariance(result: BiQueryResult): { facts: string[]; recommendations: string[] } {
  const dimension = firstDimension(result);
  const rows = topRows(result, 'varianceQty', 5);
  const facts = rows.map(row =>
    `${String(row[dimension] ?? 'Article inconnu')} : écart ${formatNumber(Number(row.varianceQty ?? 0), 'unité')} (réel ${formatNumber(Number(row.actualConsumed ?? 0))}, théorique ${formatNumber(Number(row.theoreticalConsumed ?? 0))}).`
  );
  const recommendations = rows.length > 0
    ? ['Vérifier les nomenclatures, les conversions d’unités et les pertes de parage des articles présentant les écarts les plus élevés.']
    : [];
  return { facts, recommendations };
}

function answerStockMinimum(result: BiQueryResult): { facts: string[]; recommendations: string[] } {
  const dimension = firstDimension(result);
  const rows = result.rows.slice(0, 10);
  const facts = rows.length === 0
    ? ['Aucun article sous le stock minimum n’est enregistré dans le périmètre autorisé.']
    : rows.map(row =>
        `${String(row[dimension] ?? 'Article')} — ${String(row.designation ?? '')} (${String(row.warehouseCode ?? '')}) : disponible ${formatNumber(Number(row.availableQty ?? 0))}.`
      );
  const recommendations = rows.length > 0
    ? ['Lancer une demande de réapprovisionnement pour les articles dont le stock disponible est nul ou sous le minimum.']
    : [];
  return { facts, recommendations };
}

function answerSupplierLate(result: BiQueryResult): { facts: string[]; recommendations: string[] } {
  const dimension = firstDimension(result);
  const rows = topRows(result, 'lateDays', 5);
  const facts = rows.map(row =>
    `${String(row[dimension] ?? 'Fournisseur inconnu')} : ${formatNumber(Number(row.lateDays ?? 0), 'jours de retard cumulés')} sur ${formatNumber(Number(row.orderCount ?? 0), 'ligne(s)')}.`
  );
  const recommendations = rows.length > 0
    ? ['Comparer les délais promis et réels dans le module Approvisionnement, puis revoir les commandes des fournisseurs les plus retardataires.']
    : [];
  return { facts, recommendations };
}

function answerLinePerformance(result: BiQueryResult): { facts: string[]; recommendations: string[] } {
  const dimension = firstDimension(result);
  const rows = topRows(result, 'totalCans', 8);
  const facts = rows.map(row =>
    `${String(row[dimension] ?? 'Ligne inconnue')} : ${formatNumber(Number(row.totalCans ?? 0), 'boîtes')}, conformité ${formatPercent(Number(row.conformityRate ?? 0))}.`
  );
  const recommendations = rows.length > 1
    ? ['Comparer les réglages et les équipes des lignes aux performances les plus faibles avec la ligne de référence.']
    : [];
  return { facts, recommendations };
}

function answerNonConformities(result: BiQueryResult): { facts: string[]; recommendations: string[] } {
  const total = result.rows.reduce((sum, row) => sum + Number(row.ncCount ?? 0), 0);
  const open = result.rows.reduce((sum, row) => sum + Number(row.openNcCount ?? 0), 0);
  const critical = result.rows.reduce((sum, row) => sum + Number(row.criticalNcCount ?? 0), 0);
  const facts = [
    `Non-conformités sur la période : ${formatNumber(total)} au total, ${formatNumber(open)} ouverte(s), ${formatNumber(critical)} critique(s).`,
  ];
  const recommendations: string[] = [];
  if (open > 0) recommendations.push('Traiter en priorité les NC ouvertes et vérifier les actions correctives associées.');
  if (critical > 0) recommendations.push('Les NC critiques doivent faire l’objet d’une revue qualité et d’une analyse 5M documentée.');
  return { facts, recommendations };
}

function answerTheoreticalReal(result: BiQueryResult): { facts: string[]; recommendations: string[] } {
  const dimension = firstDimension(result);
  const rows = topRows(result, 'varianceQty', 6);
  const facts = rows.map(row =>
    `${String(row[dimension] ?? 'Article')} : théorique ${formatNumber(Number(row.theoreticalConsumed ?? 0))}, réel ${formatNumber(Number(row.actualConsumed ?? 0))}, écart ${formatNumber(Number(row.varianceQty ?? 0))}.`
  );
  const recommendations = rows.length > 0
    ? ['L’écart théorique / réel peut provenir de la nomenclature, des conversions, des pertes ou de la saisie. Vérifier ces hypothèses avant toute correction.']
    : [];
  return { facts, recommendations };
}

function answerSynthesis(snapshot: BiSnapshot, scope: BiScope, period: BiPeriod): {
  facts: string[];
  recommendations: string[];
  result?: BiQueryResult;
} {
  const { values, warnings } = computeBiMeasureValues(snapshot, scope, period);
  const facts = [
    `Production : ${formatNumber(values.PROD_TOTAL, 'boîtes')} produites, ${formatNumber(values.PROD_CONFORME, 'boîtes')} conformes (${formatPercent(values.TAUX_CONFORMITE)}).`,
    `Objectif / réalisation : ${formatNumber(values.PROD_REALISE, 'boîtes')} réalisées pour ${formatNumber(values.PROD_PLANIFIE, 'boîtes')} planifiées (${formatPercent(values.TAUX_REALISATION)}).`,
    `Stock disponible : ${formatNumber(values.STOCK_DISPO, 'unité')} ; ${formatNumber(values.STOCK_SOUS_MIN)} article(s) sous le minimum.`,
    `Qualité : ${formatNumber(values.NC_TOTAL)} NC, dont ${formatNumber(values.NC_OUVERTES)} ouverte(s) et ${formatNumber(values.NC_CRITIQUES)} critique(s).`,
    `Achats : ${formatNumber(values.ACHATS_MONTANT, 'DZD')} commandés ; réceptions ${formatNumber(values.RECEPTIONS_QTE, 'unité')}.`,
  ];
  const recommendations: string[] = [];
  if ((values.TAUX_CONFORMITE ?? 100) < 95) {
    recommendations.push('Prioriser l’analyse des rejets de production : le taux de conformité est sous le seuil de 95 %.');
  }
  if ((values.STOCK_SOUS_MIN ?? 0) > 0) {
    recommendations.push('Traiter les articles sous le stock minimum via une demande de réapprovisionnement.');
  }
  if ((values.NC_OUVERTES ?? 0) > 0) {
    recommendations.push('Revue qualité des NC ouvertes et suivi des actions correctives.');
  }
  if (warnings.length > 0) {
    recommendations.push('Compléter l’historique des stocks pour activer la rotation et le stock moyen.');
  }
  return { facts, recommendations };
}

/**
 * Répond à une question en langage naturel avec les chiffres réels du moteur.
 * Aucun chiffre n'est inventé : si une donnée manque, la réponse le dit.
 */
export function answerBiQuestion(
  question: string,
  snapshot: BiSnapshot,
  scope: BiScope,
  options?: { period?: BiPeriod; provider?: BiAnalystProvider; now?: Date }
): BiAiResponse {
  const now = options?.now ?? new Date();
  const provider = options?.provider ?? LOCAL_BI_ANALYST_PROVIDER;
  const intent = detectBiIntent(question);
  const detected = detectBiQuestionPeriod(question, now);
  const period = options?.period ?? detected.period;

  if (!question.trim()) {
    return {
      answer: 'Posez une question sur la production, les stocks, la qualité ou les achats.',
      intent: 'INCONNU',
      provider: provider.label,
      usedFallback: provider.id !== 'LOCAL',
      facts: [],
      hypotheses: [],
      recommendations: [],
      limitations: ['Question vide.'],
      generatedAt: now.toISOString(),
    };
  }

  const plan = buildIntentPlan(intent, period);

  if (intent === 'SYNTHESE' || intent === 'INCONNU') {
    const synthesis = answerSynthesis(snapshot, scope, period);
    const limitations = [
      `Période analysée : ${periodLabel(period)}.`,
      'Les chiffres proviennent exclusivement du moteur analytique MAMORA BI.',
    ];
    if (intent === 'INCONNU') {
      limitations.push(
        'La question n’a pas été reconnue avec certitude. Une synthèse générale est fournie ; précisez un domaine (production, stocks, qualité, achats) pour une analyse ciblée.'
      );
    }
    if (provider.reason) limitations.push(provider.reason);
    return {
      answer: `Synthèse MAMORA BI — ${periodLabel(period)} : ${synthesis.facts[0]} ${synthesis.facts[2]}`,
      intent,
      provider: provider.label,
      usedFallback: provider.id !== 'LOCAL',
      facts: synthesis.facts,
      hypotheses: [],
      recommendations: synthesis.recommendations,
      limitations,
      period,
      generatedAt: now.toISOString(),
    };
  }

  if (!plan.query) {
    return {
      answer: 'Je ne dispose pas d’une analyse autorisée pour cette question.',
      intent,
      provider: provider.label,
      usedFallback: provider.id !== 'LOCAL',
      facts: [],
      hypotheses: [],
      recommendations: [],
      limitations: ['Aucun plan de requête n’a pu être construit.'],
      generatedAt: now.toISOString(),
    };
  }

  let result: BiQueryResult;
  try {
    result = runBiQuery(snapshot, plan.query, scope);
  } catch (error) {
    return {
      answer: 'L’analyse demandée est refusée ou indisponible dans votre périmètre.',
      intent,
      provider: provider.label,
      usedFallback: provider.id !== 'LOCAL',
      facts: [],
      hypotheses: [],
      recommendations: [],
      limitations: [error instanceof Error ? error.message : 'Requête analytique refusée.'],
      period,
      generatedAt: now.toISOString(),
    };
  }

  let facts: string[] = [];
  let recommendations: string[] = [];
  switch (intent) {
    case 'PRODUCTION_TOTAL':
      ({ facts, recommendations } = answerProductionTotal(result, period));
      break;
    case 'PRODUCTION_COMPARE':
      ({ facts, recommendations } = answerProductionCompare(result));
      break;
    case 'PERTES':
      ({ facts, recommendations } = answerLosses(result));
      break;
    case 'ECARTS_CONSOMMATION':
      ({ facts, recommendations } = answerConsumptionVariance(result));
      break;
    case 'STOCK_MINIMUM':
      ({ facts, recommendations } = answerStockMinimum(result));
      break;
    case 'FOURNISSEURS_RETARD':
      ({ facts, recommendations } = answerSupplierLate(result));
      break;
    case 'LIGNES_PERFORMANCE':
      ({ facts, recommendations } = answerLinePerformance(result));
      break;
    case 'NON_CONFORMITES':
      ({ facts, recommendations } = answerNonConformities(result));
      break;
    case 'THEORIQUE_REEL':
      ({ facts, recommendations } = answerTheoreticalReal(result));
      break;
    default:
      break;
  }

  if (result.rows.length === 0) {
    facts = [`Aucune donnée disponible pour « ${plan.title} » sur ${periodLabel(period)} dans votre périmètre.`];
    recommendations = ['Vérifier la période, les filtres et la saisie des données opérationnelles correspondantes.'];
  }

  const limitations = [
    `Période analysée : ${periodLabel(period)}.`,
    `Source : ${BI_SOURCES[result.source].label}.`,
    `Périmètre : ${scope.allWarehouses ? 'tous magasins autorisés' : `${scope.warehouseIds.length} magasin(s)`}, ${scope.allDepartments ? 'tous services autorisés' : `${scope.departments.length} service(s)`}.`,
    'Les chiffres sont calculés par le moteur analytique ; l’assistant ne les estime jamais.',
  ];
  if (snapshot.warnings.length > 0) limitations.push(...snapshot.warnings);
  if (provider.reason) limitations.push(provider.reason);

  return {
    answer: facts[0] ?? 'Aucune donnée disponible.',
    intent,
    provider: provider.label,
    usedFallback: provider.id !== 'LOCAL',
    facts,
    hypotheses: [],
    recommendations,
    limitations,
    query: plan.query,
    result,
    chart: result.rows.length > 0 ? resultToChart(result, plan.chartType ?? 'TABLE', plan.title) : undefined,
    period,
    generatedAt: now.toISOString(),
  };
}

/** Point d'entrée utilisé par le service de stockage. */
export function analyzeBiQuestion(
  question: string,
  snapshot: BiSnapshot,
  scope: BiScope,
  settings?: BiSettings,
  period?: BiPeriod
): BiAiResponse {
  const provider = resolveBiAnalystProvider(settings);
  const response = answerBiQuestion(question, snapshot, scope, { period, provider });
  if (!provider.available) {
    response.usedFallback = true;
    if (!response.limitations.includes(provider.reason ?? '')) {
      response.limitations.push(provider.reason ?? 'Fournisseur IA externe indisponible.');
    }
  }
  return response;
}

export { buildBiSnapshot };
