/** Sonde temporaire : le moteur de rendu produit-il un vrai .pptx hors navigateur ? */
import { writeFileSync } from 'node:fs';

class MockStorage {
  private d = new Map<string, string>();
  getItem(k: string) { return this.d.has(k) ? this.d.get(k)! : null; }
  setItem(k: string, v: string) { this.d.set(k, String(v)); }
  removeItem(k: string) { this.d.delete(k); }
  clear() { this.d.clear(); }
}
(globalThis as any).localStorage = new MockStorage();
(globalThis as any).sessionStorage = new MockStorage();

const { storage } = await import('../src/services/storage');
const { renderBiPptxDeck, biPptxFileName } = await import('../src/services/bi/pptx-render');

const admin = storage.getUsers().find(u => u.role === 'ADMIN')!;
storage.setCurrentUser(admin);
storage.refreshBiSnapshot();

const dashboards = storage.getBiDashboards(admin);
const reports = storage.getBiReports(admin);
const kpis = storage.getBiKpis();

const deck = storage.buildBiPptxDeck(
  {
    dashboardIds: dashboards.map(d => d.id),
    widgetKeys: [],
    reportIds: reports.map(r => r.id),
    kpiIds: kpis.slice(0, 6).map(k => k.id),
    explorerQueries: [],
    includeOverview: true,
    includeExecutiveSummary: true,
    includeDomainAnalysis: true,
    includeAlerts: true,
    includeAi: false,
    includeComparison: true,
    includeConclusion: true,
    includeRecommendations: true,
    includeSources: true,
  },
  { title: 'Sonde PPTX', language: 'fr', format: '16:9' }
);

console.log('diapositives :', deck.slides.length);
console.log('kinds :', deck.slides.map(s => s.kind).join(', '));
console.log('warnings :', deck.warnings.length, deck.warnings.slice(0, 3));
console.log('summary :', JSON.stringify(deck.summary));

const buffer = await renderBiPptxDeck(deck);
const fileName = biPptxFileName(deck);
writeFileSync(`dist/__sonde_${fileName}`, Buffer.from(buffer));
console.log('fichier :', `dist/__sonde_${fileName}`, 'octets :', buffer.byteLength);
const head = Buffer.from(buffer.slice(0, 4));
console.log('en-tête ZIP :', head.toString('hex'), head.toString('ascii'));
