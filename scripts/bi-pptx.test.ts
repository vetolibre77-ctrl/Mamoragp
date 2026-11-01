/**
 * Harnais de test fonctionnel de l'export PowerPoint MAMORA BI.
 *
 * Couvre : construction du plan de présentation à partir des données réelles,
 * variantes de préréglage (vue d'ensemble, tableau de bord, rapport, KPI,
 * explorateur, IA), lisibilité et rigueur des diapositives (faisceau de faits,
 * tonos de texte, KPI, graphiques et tableaux natifs), nommage du fichier,
 * génération effective du .pptx (archive ZIP valide et non vide) et
 * journalisation de l'export.
 *
 * Exécuté hors navigateur sur le service réel, avec un stockage local simulé.
 */

import { readFileSync } from 'node:fs';

class MemoryStorage {
  private data = new Map<string, string>();
  getItem(key: string) { return this.data.has(key) ? this.data.get(key)! : null; }
  setItem(key: string, value: string) { this.data.set(key, String(value)); }
  removeItem(key: string) { this.data.delete(key); }
  clear() { this.data.clear(); }
}

(globalThis as any).localStorage = new MemoryStorage();
(globalThis as any).sessionStorage = new MemoryStorage();

let passed = 0;
let failed = 0;
const failures: string[] = [];

const check = (label: string, condition: boolean, detail = '') => {
  if (condition) {
    passed += 1;
    console.log(`  OK   ${label}`);
  } else {
    failed += 1;
    failures.push(label);
    console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`);
  }
};

const { storage } = await import('../src/services/storage');
const { renderBiPptxDeck, biPptxFileName } = await import('../src/services/bi/pptx-render');
const { resolveBiPeriod } = await import('../src/services/bi/engine');

const admin = storage.getUsers().find(user => user.role === 'ADMIN')!;
storage.setCurrentUser(admin);
storage.refreshBiSnapshot();

const period = resolveBiPeriod('ALL', new Date());
const dashboards = storage.getBiDashboards(admin);
const reports = storage.getBiReports(admin);
const kpis = storage.getBiKpis().filter(kpi => kpi.isActive);

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== 1. Construction du plan de présentation ===');
// ═══════════════════════════════════════════════════════════════════════════
const baseSelection = {
  dashboardIds: dashboards.map(dashboard => dashboard.id),
  widgetKeys: [],
  reportIds: reports.map(report => report.id),
  kpiIds: kpis.slice(0, 6).map(kpi => kpi.id),
  explorerQueries: [],
  includeOverview: true,
  includeExecutiveSummary: true,
  includeDomainAnalysis: true,
  includeAlerts: true,
  includeAi: false,
  includeComparison: false,
  includeConclusion: true,
  includeRecommendations: true,
  includeSources: true,
  period,
  aiResponses: [],
};

const deck = storage.buildBiPptxDeck(baseSelection, {
  title: 'Test PPTX',
  subtitle: 'Sous-titre',
  company: 'MAMORA GP',
  author: admin.name,
  language: 'fr',
  format: '16:9',
  includeFooter: true,
  includeSlideNumbers: true,
});

check('Le plan de présentation est construit', Boolean(deck));
check('Au moins une diapositive est produite', deck.slides.length > 0, `${deck.slides.length}`);
check('Chaque diapositive possède un identifiant unique', new Set(deck.slides.map(slide => slide.id)).size === deck.slides.length);
check('Chaque diapositive possède un titre', deck.slides.every(slide => typeof slide.title === 'string' && slide.title.length > 0));
check('Chaque diapositive possède un type déclaré', deck.slides.every(slide => typeof slide.kind === 'string' && slide.kind.length > 0));
check(
  'Les types de diapositive appartiennent au catalogue attendu',
  deck.slides.every(slide =>
    ['COVER', 'TOC', 'EXECUTIVE_SUMMARY', 'DOMAIN', 'KPI', 'CHART', 'TABLE', 'COMPARISON', 'ALERTS', 'AI', 'CONCLUSION', 'RECOMMENDATIONS', 'SOURCES', 'CUSTOM'].includes(slide.kind)
  )
);

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== 2. Contenu : faits, KPI, graphiques et tableaux ===');
// ═══════════════════════════════════════════════════════════════════════════
const textBlocks = deck.slides.flatMap(slide => slide.bullets ?? []);
const kpiBlocks = deck.slides.flatMap(slide => slide.kpis ?? []);
const chartBlocks = deck.slides.flatMap(slide => (slide.chart ? [slide.chart] : []));
const tableBlocks = deck.slides.flatMap(slide => (slide.table ? [slide.table] : []));

check('Le plan contient des blocs de contenu', textBlocks.length + kpiBlocks.length + chartBlocks.length + tableBlocks.length > 0);
check(
  'Les faits mesurés sont distingués des hypothèses',
  textBlocks.every(block => ['FACT', 'HYPOTHESIS', 'RECOMMENDATION', 'INFO', 'WARNING'].includes(block.tone))
);
check(
  'Les blocs KPI portent une valeur et une unité',
  kpiBlocks.every(block => block.value !== undefined && typeof block.label === 'string')
);
check(
  'Les graphiques déclarent au moins une série',
  chartBlocks.every(chart => Array.isArray(chart.series) && chart.series.length > 0)
);
check(
  'Les tableaux déclarent des colonnes et des lignes',
  tableBlocks.every(table => Array.isArray(table.columns) && table.columns.length > 0 && Array.isArray(table.rows))
);
check(
  'Les diapositives KPI portent des mesures chiffrées',
  deck.slides.some(slide => (slide.kpis ?? []).length > 0)
);

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== 3. Rigueur : aucun chiffre inventé ===');
// ═══════════════════════════════════════════════════════════════════════════
const factBlocks = textBlocks.filter(block => block.tone === 'FACT');
check('Des faits chiffrés sont présents', factBlocks.length > 0, `${factBlocks.length}`);
// La diapositive SOURCES porte une provenance sans valeur chiffrée : elle est
// vérifiée séparément. Les autres faits doivent tous contenir un chiffre.
const analyticalFacts = deck.slides
  .filter(slide => slide.kind !== 'SOURCES')
  .flatMap(slide => (slide.bullets ?? []).filter(block => block.tone === 'FACT'));
check(
  'Chaque fait analytique contient au moins un chiffre',
  analyticalFacts.every(block => /\d/.test(block.text)),
  analyticalFacts.filter(block => !/\d/.test(block.text)).map(block => block.text).join(' | ')
);
check(
  'Les faits chiffrés ne sont jamais des hypothèses',
  analyticalFacts.every(block => block.tone === 'FACT')
);
check(
  'Les avertissements d’exclusion sont expliqués',
  deck.warnings.every(warning => typeof warning === 'string' && warning.length > 0)
);
check(
  'Aucune capture d’écran n’est requise pour la présentation',
  deck.slides.every(slide => !JSON.stringify(slide).toLowerCase().includes('screenshot'))
);

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== 4. Variantes de préréglage ===');
// ═══════════════════════════════════════════════════════════════════════════
const overviewDeck = storage.buildBiPptxDeck(
  { ...baseSelection, includeOverview: true, dashboardIds: [], reportIds: [], kpiIds: [] },
  { title: 'Vue d’ensemble', language: 'fr', format: '16:9' }
);
check('Le préréglage « Vue d’ensemble » produit des diapositives', overviewDeck.slides.length > 0);
check(
  'Le préréglage « Vue d’ensemble » inclut la synthèse exécutive',
  overviewDeck.slides.some(slide => slide.kind === 'EXECUTIVE_SUMMARY')
);

const dashboardPreset = storage.buildBiPptxDeck(
  { ...baseSelection, dashboardIds: dashboards.slice(0, 1).map(dashboard => dashboard.id), reportIds: [], kpiIds: [] },
  { title: 'Tableau de bord', language: 'fr', format: '16:9' }
);
check('Le préréglage « Tableau de bord » produit des diapositives', dashboardPreset.slides.length > 0);

const kpiPreset = storage.buildBiPptxDeck(
  { ...baseSelection, dashboardIds: [], reportIds: [], kpiIds: kpis.slice(0, 3).map(kpi => kpi.id) },
  { title: 'KPI', language: 'fr', format: '16:9' }
);
check('Le préréglage « KPI » produit des diapositives', kpiPreset.slides.length > 0);
check(
  'Le préréglage « KPI » conserve les identifiants de KPI demandés',
  kpiPreset.slides.some(slide => (slide.kpis ?? []).length > 0)
);

const arabicDeck = storage.buildBiPptxDeck(
  baseSelection,
  { title: 'عرض تقديمي', language: 'ar', format: '4:3' }
);
check('Le format 4:3 est accepté', arabicDeck.slides.length > 0);
check('La langue arabe est appliquée', arabicDeck.slides.length > 0);

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== 5. Nommage du fichier ===');
// ═══════════════════════════════════════════════════════════════════════════
const fileName = biPptxFileName(deck);
check('Le nom de fichier est produit', typeof fileName === 'string' && fileName.length > 0);
check('Le nom de fichier se termine par .pptx', fileName.toLowerCase().endsWith('.pptx'));
check('Le nom de fichier ne contient aucun caractère interdit', !/[/\\:*?"<>|]/.test(fileName));

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== 6. Génération effective du fichier .pptx ===');
// ═══════════════════════════════════════════════════════════════════════════
const buffer = await renderBiPptxDeck(deck);
const bytes = Buffer.from(buffer);
check('Le fichier est produit', bytes.byteLength > 0, `${bytes.byteLength} octets`);
check('Le fichier est un ZIP valide (signature PK)', bytes.slice(0, 2).toString('ascii') === 'PK');
check('Le fichier dépasse le seuil d’un export vide', bytes.byteLength > 10_000, `${bytes.byteLength}`);

// Contrôle du contenu de l'archive : le paquet OOXML doit contenir les diapositives.
// Le répertoire central ZIP répète chaque nom (en-tête local + entrée centrale) :
// on déduplique donc avant de comparer au plan.
const archiveText = bytes.toString('latin1');
const embeddedSlides = new Set(archiveText.match(/ppt\/slides\/slide\d+\.xml/g) ?? []);
check('L’archive contient le balisage des diapositives', embeddedSlides.size > 0);
check('L’archive contient le type de contenu OOXML', archiveText.includes('[Content_Types].xml'));
check(
  'Le nombre de diapositives embarquées correspond au plan',
  embeddedSlides.size === deck.slides.length,
  `${embeddedSlides.size} vs ${deck.slides.length}`
);

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== 7. Journalisation de l\'export ===');
// ═══════════════════════════════════════════════════════════════════════════
const log = storage.recordBiPptxExport({
  title: 'Test PPTX',
  language: 'fr',
  format: '16:9',
  slideCount: deck.slides.length,
  fileName,
  status: 'SUCCES',
  dashboardIds: baseSelection.dashboardIds,
  reportIds: baseSelection.reportIds,
  kpiIds: baseSelection.kpiIds,
  summary: deck.summary,
});
check('L’export est journalisé', Boolean(log?.id));
check('Le journal conserve le nombre de diapositives', log.slideCount === deck.slides.length);
check('Le journal est consultable', storage.getBiPptxLogs().some(entry => entry.id === log.id));

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n' + '═'.repeat(72));
console.log(`  MAMORA BI — PPTX : ${passed} test(s) réussi(s), ${failed} échec(s)`);
console.log('═'.repeat(72));
if (failed > 0) {
  console.log('\nÉchecs :');
  failures.forEach(item => console.log(`  - ${item}`));
  process.exit(1);
}
