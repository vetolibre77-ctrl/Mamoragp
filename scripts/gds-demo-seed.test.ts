/**
 * Vérification du jeu de démonstration GDS.
 *
 * Le jeu est optionnel et ne doit jamais s'appliquer à une base contenant déjà
 * des mouvements. Ce harnais contrôle : chargement sur base vierge, cohérence
 * des relations créées, indisponibilité du stock en quarantaine, refus du
 * second chargement et refus pour un profil non administrateur.
 */

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

const check = (label: string, condition: boolean, detail = '') => {
  if (condition) {
    passed += 1;
    console.log(`  OK   ${label}`);
  } else {
    failed += 1;
    console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`);
  }
};

const expectThrow = (label: string, fn: () => unknown, contains?: string) => {
  try {
    fn();
    check(label, false, 'aucune erreur levée');
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    check(label, !contains || message.toLowerCase().includes(contains.toLowerCase()), message);
  }
};

const { storage } = await import('../src/services/storage');

const admin = storage.getUsers().find(u => u.role === 'ADMIN')!;
const operator = storage.getUsers().find(u => u.role !== 'ADMIN' && u.role !== 'DIRECTEUR_USINE')!;
storage.setCurrentUser(admin);

console.log('\n=== 1. Chargement sur base vierge ===');
check('Base vierge avant chargement', storage.getStockMovements().length === 0);

const result = storage.seedGdsDemoData();
check('Mouvements générés', result.movements >= 10, String(result.movements));
check('Lots créés', result.lots >= 9, String(result.lots));
check('Ordres de fabrication créés', result.workOrders === 2, String(result.workOrders));
check('Lots finis réceptionnés', result.finishedBatches === 3, String(result.finishedBatches));
check(
  'Fiches de consommation réelles créées et validées',
  result.consumptionSheets === 2,
  String(result.consumptionSheets)
);
check(
  'Grand livre alimenté (réceptions + consommation directe + réceptions de production)',
  storage.getStockMovements().length === result.movements,
  `grand livre=${storage.getStockMovements().length} annoncé=${result.movements}`
);

console.log('\n=== 2. Cohérence des relations créées ===');
const finishedBatches = storage.getFinishedBatches();
check('3 lots finis enregistrés', finishedBatches.length === 3);
const workOrders = storage.getWorkOrders();
check('2 OF réels enregistrés', workOrders.length === 2);
check(
  'Chaque lot fini référence un OF existant',
  finishedBatches.every(b => workOrders.some(w => w.id === b.workOrderId))
);
check(
  'Chaque OF référence une recette validée existante',
  workOrders.every(w => storage.getRecipes().some(r => r.id === w.recipeId && r.status === 'VALIDEE'))
);

console.log('\n=== 3. États de stock issus du grand livre ===');
const mpRows = storage.getGdsStock('MATIERES_PREMIERES');
const pfRows = storage.getGdsStock('PRODUITS_FINIS');
const mpDash = storage.getGdsDashboard('MATIERES_PREMIERES');
const pfDash = storage.getGdsDashboard('PRODUITS_FINIS');
check('Stock MP physique > 0', mpDash.physical > 0, String(mpDash.physical));
check('Stock PF physique > 0', pfDash.physical > 0, String(pfDash.physical));
check(
  'Quarantaine MP non disponible',
  mpDash.quarantine > 0 && mpDash.available <= mpDash.physical - mpDash.quarantine,
  `quarantaine=${mpDash.quarantine} dispo=${mpDash.available} physique=${mpDash.physical}`
);
check(
  'PF en attente de libération non disponible',
  pfDash.pendingControl + pfDash.blocked > 0 && pfDash.available < pfDash.physical,
  `attente=${pfDash.pendingControl} bloqué=${pfDash.blocked} dispo=${pfDash.available} physique=${pfDash.physical}`
);
check(
  'Aucun stock négatif',
  mpRows.every(r => r.physical >= 0) && pfRows.every(r => r.physical >= 0)
);
const stockedRows = [...mpRows, ...pfRows].filter(r => r.physical > 0);
check('Des lignes de stock physiques existent', stockedRows.length > 0, String(stockedRows.length));
check(
  'Chaque ligne physique porte un lot et un magasin',
  stockedRows.every(r => r.warehouses.length > 0 && r.lotCount > 0)
);

console.log('\n=== 4. Traçabilité PF → MP ===');
const pfLot = finishedBatches.find(b => b.releaseStatus === 'LIBERE')!;
const trace = storage.getLotTraceability(pfLot.batchNumber);
check('Traçabilité du lot fini trouvée', Boolean(trace));
check(
  'Ordre de fabrication lié en amont',
  Boolean(trace?.upstream.workOrderNumber) &&
    trace?.upstream.finishedBatchNumber === pfLot.batchNumber,
  `${trace?.upstream.workOrderNumber} / ${trace?.upstream.finishedBatchNumber}`
);
check(
  'Matières réellement consommées identifiées',
  (trace?.consumedMaterials?.length || 0) >= 3,
  String(trace?.consumedMaterials?.length)
);
check(
  'Chaque matière consommée porte un lot et une fiche de consommation',
  (trace?.consumedMaterials || []).every(m => m.lotNumber && m.consumptionNumber)
);

console.log('\n=== 4 bis. Rapprochement sortie / consommation / retour ===');
const thonOrder = workOrders.find(w => w.recipeId === 'REC-01')!;
const reconciliation = storage.getWorkOrderIssueReconciliation(thonOrder.id);
const thonEntry = reconciliation.find(entry => entry.itemCode === 'MP-THON-ALB');
check('Ligne de rapprochement du thon présente', Boolean(thonEntry));
check('Quantité réellement sortie > 0', (thonEntry?.issuedQty || 0) > 0, String(thonEntry?.issuedQty));
check(
  'Consommation réelle = sortie − retour',
  thonEntry?.consumedQty === (thonEntry?.issuedQty || 0) - 400,
  `sortie=${thonEntry?.issuedQty} consommé=${thonEntry?.consumedQty}`
);
check('Retour magasin = 400 kg', thonEntry?.returnedQty === 400, String(thonEntry?.returnedQty));
check('Écart sortie/consommation nul', thonEntry?.outstandingQty === 0, String(thonEntry?.outstandingQty));
check(
  'Sortie directe : aucun transfert atelier imposé',
  storage.getTransfers().filter(t => t.workOrderId === thonOrder.id).length === 0,
  String(storage.getTransfers().filter(t => t.workOrderId === thonOrder.id).length)
);
const consumptionMovements = storage
  .getStockMovements()
  .filter(m => m.type === 'CONSOMMATION_OF' && m.workOrderId === thonOrder.id);
check(
  'Mouvement de sortie enregistré et rattaché à l\'OF',
  consumptionMovements.length === 3,
  String(consumptionMovements.length)
);
check(
  'Stock déduit du magasin d\'origine (pas de l\'atelier)',
  consumptionMovements.every(
    m => Boolean(m.sourceWarehouseId) && m.sourceWarehouseId !== 'WH-PROD-01' && (m.stockDelta || 0) < 0
  ),
  consumptionMovements.map(m => `${m.itemCode}:${m.sourceWarehouseId}/${m.stockDelta}`).join(', ')
);
check(
  'Aucun stock négatif dans tous les magasins',
  storage.getGdsStock('MATIERES_PREMIERES').every(r => r.physical >= 0)
);
check(
  'Aucun transfert vers un magasin atelier (sortie directe)',
  storage.getStockMovements().filter(m => m.type === 'TRANSFERT_SORTIE').length === 0
);

console.log('\n=== 4 ter. Base de calcul des retours (pas de double comptage) ===');
const validatedSheets = storage.getConsumptions().filter(c => c.status === 'VALIDEE');
check('2 fiches validées et verrouillées', validatedSheets.length === 2, String(validatedSheets.length));
const thonSheet = validatedSheets.find(c => c.workOrderId === thonOrder.id)!;
const thonLine = thonSheet.lines.find(l => l.itemCode === 'MP-THON-ALB')!;
check(
  'Fiche du thon : sorti = consommé + retourné',
  thonLine.withdrawnQuantity === thonLine.actualConsumedQuantity + thonLine.returnedQuantity,
  `${thonLine.withdrawnQuantity} / ${thonLine.actualConsumedQuantity} + ${thonLine.returnedQuantity}`
);
check(
  'Reliquat retournable du thon nul (400 kg déjà déclarés au retour)',
  thonLine.withdrawnQuantity - thonLine.actualConsumedQuantity - thonLine.returnedQuantity === 0
);
const secondOrder = workOrders.find(w => w.recipeId === 'REC-04')!;
const secondSheet = validatedSheets.find(c => c.workOrderId === secondOrder.id)!;
check(
  'Lignes du 2e OF issues de la nomenclature réelle',
  secondSheet.lines.length === 2 &&
    secondSheet.lines.every(l =>
      storage.getWorkOrderMaterialRequirements(secondOrder.id).some(r => r.itemCode === l.itemCode)
    ),
  secondSheet.lines.map(l => l.itemCode).join(', ')
);
const surplusLine = secondSheet.lines[0];
const surplusQty =
  surplusLine.withdrawnQuantity - surplusLine.actualConsumedQuantity - surplusLine.returnedQuantity;
check('Reliquat réellement sorti et non consommé sur le 2e OF', surplusQty > 0, String(surplusQty));
const surplusExit = storage
  .getStockMovements()
  .find(
    m =>
      m.type === 'CONSOMMATION_OF' &&
      m.workOrderId === secondOrder.id &&
      m.itemCode === surplusLine.itemCode
  );
check(
  'Sortie imputée = prélevé − retourné − rebuté (reliquat resté sorti)',
  Math.abs((surplusExit?.stockDelta || 0) + surplusLine.withdrawnQuantity) <= 0.001,
  `delta=${surplusExit?.stockDelta} prélevé=${surplusLine.withdrawnQuantity}`
);
check(
  'La sortie reste rattachée au magasin d\'origine, sans magasin atelier',
  Boolean(surplusExit?.sourceWarehouseId) && surplusExit?.sourceWarehouseId !== 'WH-PROD-01',
  String(surplusExit?.sourceWarehouseId)
);

console.log('\n=== 4 quater. Cycle de retour du reliquat ===');
const stockOf = (code: string) =>
  storage.getGdsStock('MATIERES_PREMIERES').find(r => r.itemCode === code)?.physical || 0;
const surplusStockBefore = stockOf(surplusLine.itemCode);
const surplusItem = storage.getItems().find(i => i.code === surplusLine.itemCode)!;
const surplusLotRow = storage
  .getStockLots()
  .find(l => l.itemId === surplusItem.id && l.lotNumber === surplusLine.batchNumber)!;
const mpWarehouse = storage.getWarehouses().find(w => w.code === 'MAG-MP-01')!;
const mpLocation = storage.getWarehouseLocations(mpWarehouse.id)[0];
storage.addStockMovement({
  type: 'RETOUR_MAGASIN',
  itemId: surplusItem.id,
  itemCode: surplusItem.code,
  batchNumber: surplusLotRow.lotNumber,
  lotId: surplusLotRow.id,
  quantity: surplusQty,
  unit: surplusItem.unit,
  destinationWarehouseId: mpWarehouse.id,
  destinationLocationId: mpLocation.id,
  workOrderId: secondOrder.id,
  documentNumber: secondOrder.id,
  userId: admin.id,
  userName: admin.name,
  reason: 'Retour de production — reliquat non incorporé (test)',
});
const surplusStockAfter = stockOf(surplusLine.itemCode);
check(
  'Le retour réintègre le stock du magasin d\'origine',
  Math.abs(surplusStockAfter - surplusStockBefore - surplusQty) <= 0.001,
  `${surplusStockBefore} → ${surplusStockAfter} (+${surplusQty})`
);
const surplusRecon = storage
  .getWorkOrderIssueReconciliation(secondOrder.id)
  .find(entry => entry.itemCode === surplusLine.itemCode);
check(
  'Retour compté au rapprochement',
  Math.abs((surplusRecon?.returnedQty || 0) - surplusQty) <= 0.001,
  String(surplusRecon?.returnedQty)
);
check(
  'Écart sortie/consommation soldé par le retour',
  Math.abs(surplusRecon?.outstandingQty || 0) <= 0.001,
  String(surplusRecon?.outstandingQty)
);
const lotStatusAfterReturn = storage
  .getStockLots()
  .find(l => l.id === surplusLotRow.id)?.qualityStatus;
check('Statut qualité du lot préservé au retour', lotStatusAfterReturn === 'LIBERE', String(lotStatusAfterReturn));

console.log('\n=== 5. Tableau de bord et alertes ===');
check('Tableau de bord MP non vide', mpDash.itemCount > 0, String(mpDash.itemCount));
check('Lots suivis', mpDash.lotCount > 0, String(mpDash.lotCount));
check('Mouvements des 30 jours comptabilisés', mpDash.entries30d > 0, String(mpDash.entries30d));
check('Répartition par famille alimentée', mpDash.byFamily.length > 0);
check('Répartition par magasin alimentée', mpDash.byWarehouse.length > 0);
const alerts = storage.getGdsAlerts();
check('Alertes calculées sur les données réelles', alerts.length > 0, String(alerts.length));

console.log('\n=== 6. Garde-fous ===');
expectThrow(
  'Second chargement refusé',
  () => storage.seedGdsDemoData(),
  'déjà des mouvements'
);
storage.setCurrentUser(operator);
expectThrow(
  'Profil non administrateur refusé',
  () => storage.seedGdsDemoData(),
  'administration'
);

console.log('\n' + '═'.repeat(58));
console.log(`RÉSULTAT JEU DE DÉMONSTRATION : ${passed} réussites / ${failed} échec(s)`);
console.log('═'.repeat(58));
process.exit(failed === 0 ? 0 : 1);
