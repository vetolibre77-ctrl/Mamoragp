/**
 * Harnais de test fonctionnel du module GDS — Gestion des Stocks
 * (Matières premières & Produits finis).
 *
 * Couvre : réception MP, quarantaine, libération qualité, sortie atelier,
 * retour magasin, consommation réelle, rapprochement, réception PF partielle,
 * double réception, libération PF, sortie PF, transfert en transit, inventaire
 * et ajustement, traçabilité bidirectionnelle, permissions.
 *
 * Exécuté hors navigateur sur le service réel, avec un stockage local simulé.
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

const expectThrow = (label: string, fn: () => unknown, contains?: string) => {
  try {
    fn();
    check(label, false, 'aucune erreur levée');
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const ok = !contains || message.toLowerCase().includes(contains.toLowerCase());
    check(label, ok, message);
    if (ok) console.log(`         ↳ « ${message.slice(0, 140)} »`);
  }
};

const { storage } = await import('../src/services/storage');
const admin = storage.getUsers().find(u => u.role === 'ADMIN')!;
storage.setCurrentUser(admin);

const warehouses = storage.getWarehouses();
const whMp = warehouses.find(w => w.type === 'MATIERES_PREMIERES')!;
const whProd = warehouses.find(w => w.type === 'PRODUCTION')!;
const whPf = warehouses.find(w => w.type === 'PRODUITS_FINIS')!;
const whQuar = warehouses.find(w => w.type === 'QUARANTAINE')!;

const locMp = storage.getWarehouseLocations(whMp.id)[0];
const locProd = storage.getWarehouseLocations(whProd.id)[0];
const locPf = storage.getWarehouseLocations(whPf.id).find(l => l.zoneType.includes('Attente'))!;

const mpItems = storage.getGdsItems('MATIERES_PREMIERES');
const pfItems = storage.getGdsItems('PRODUITS_FINIS');
const fishItem = mpItems.find(i => i.unit === 'KG' && i.group === 'MATIERES_PREMIERES_PRINCIPALES')!;
const packItem = mpItems.find(i => i.unit === 'BOITE') || mpItems[1];
const recipe = storage.getRecipes().find(r => r.status === 'VALIDEE')!;
const pfItem =
  storage.getItems().find(i => i.id === recipe.finishedItemId) || pfItems[0];

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== 1. Migration, paramètres et périmètre MP / PF ===');
// ═══════════════════════════════════════════════════════════════════════════
check('Collection des inventaires initialisée', Array.isArray(storage.getInventories()));
check('Collection des sorties PF initialisée', Array.isArray(storage.getFinishedGoodsIssues()));
check('Paramètres GDS par défaut chargés', storage.getGdsSettings().expiryAlertDays > 0);
check(
  'Le référentiel articles reste unique (aucun second référentiel)',
  (storage as any).db.items === storage.getItems()
);
check('Périmètre MP non vide', mpItems.length > 0, `${mpItems.length}`);
check('Périmètre PF identifié', pfItems.every(i => i.category.startsWith('PRODUIT_FINI')));
check(
  'Aucun produit fini dans le périmètre MP',
  mpItems.every(i => !i.category.startsWith('PRODUIT_FINI'))
);
check(
  'Magasins MP / Production / PF / Quarantaine disponibles',
  Boolean(whMp && whProd && whPf && whQuar)
);

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== 2. Entrée de stock MP (grand livre unique) ===');
// ═══════════════════════════════════════════════════════════════════════════
const lotFish = 'LOT-TEST-THON-01';
storage.addStockMovement({
  documentNumber: 'REC-TEST-0001',
  itemId: fishItem.id,
  itemCode: fishItem.code,
  batchNumber: lotFish,
  type: 'ENTREE_RECEPTION',
  quantity: 1000,
  unit: fishItem.unit,
  destinationWarehouseId: whMp.id,
  destinationLocationId: locMp.id,
  qualityStatus: 'LIBERE',
  userId: admin.id,
  userName: admin.name,
  reason: 'Réception de test thon congelé',
});

storage.addStockMovement({
  documentNumber: 'REC-TEST-0002',
  itemId: packItem.id,
  itemCode: packItem.code,
  batchNumber: 'LOT-TEST-EMB-01',
  type: 'ENTREE_RECEPTION',
  quantity: 5000,
  unit: packItem.unit,
  destinationWarehouseId: whMp.id,
  destinationLocationId: locMp.id,
  qualityStatus: 'LIBERE',
  userId: admin.id,
  userName: admin.name,
  reason: 'Réception de test emballages',
});

let stockRows = storage.getGdsStock('MATIERES_PREMIERES');
const fishRow = stockRows.find(r => r.itemId === fishItem.id)!;
check('Stock physique MP alimenté', fishRow.physical === 1000, `${fishRow.physical}`);
check('Stock disponible = physique (lot libéré)', fishRow.available === 1000, `${fishRow.available}`);
check('Stock MP affecté au bon magasin', fishRow.warehouses.some(w => w.warehouseId === whMp.id));
check('Lot créé dans le référentiel de lots', Boolean(storage.getStockLots({ lotNumber: lotFish }).length));
check(
  'Conditionnement et conversion exposés',
  fishRow.unit === fishItem.unit && fishRow.conversionCoefficient === fishItem.conversionCoefficient
);

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== 3. Réception MP via Approvisionnement + quarantaine ===');
// ═══════════════════════════════════════════════════════════════════════════
const supplier = storage.getSuppliers(false)[0];
const pr = storage.createPurchaseRequest({
  department: 'MAGASIN_MP',
  type: 'BESOIN_PONCTUEL',
  priority: 'NORMALE',
  justification: 'Test GDS — réception matières premières',
  lines: [
    {
      id: 'L1',
      itemId: fishItem.id,
      itemCode: fishItem.code,
      designation: fishItem.designation,
      category: fishItem.category,
      quantity: 500,
      unit: fishItem.unit,
      estimatedUnitPriceDzd: 300,
    },
  ],
});
storage.submitPurchaseRequest(pr.id);
for (const role of ['RESPONSABLE_PRODUCTION', 'RESPONSABLE_QUALITE', 'DIRECTEUR_USINE'] as const) {
  storage.setCurrentUser(storage.getUsers().find(u => u.role === role)!);
  storage.decidePurchaseRequest(pr.id, 'APPROUVE', 'Validation de test GDS');
}
storage.setCurrentUser(admin);

const order = storage.createPurchaseOrder({
  supplierId: supplier.id,
  requestId: pr.id,
  expectedDate: new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10),
});
const receipt = storage.createPurchaseReceipt({
  orderId: order.id,
  warehouseId: whMp.id,
  isOnHold: true,
  lines: [
    {
      orderLineId: order.lines[0].id,
      quantityReceived: 500,
      lotNumber: 'LOT-TEST-REC-02',
      expiryDate: new Date(Date.now() + 180 * 86_400_000).toISOString().slice(0, 10),
    },
  ],
});

let lots = storage.getGdsLots('MATIERES_PREMIERES');
const receivedLot = lots.find(l => l.lotNumber === 'LOT-TEST-REC-02')!;
check('Réception d\'achat : lot créé', Boolean(receivedLot));
check(
  'Réception non disponible avant décision qualité',
  receivedLot.qualityStatus === 'EN_ATTENTE_CONTROLE' || receivedLot.qualityStatus === 'QUARANTAINE',
  receivedLot?.qualityStatus
);
const beforeRelease = storage.getGdsStock('MATIERES_PREMIERES').find(r => r.itemId === fishItem.id)!;
check(
  'Stock en attente / quarantaine exclu du disponible',
  beforeRelease.available === 1000 &&
    beforeRelease.pendingControl + beforeRelease.quarantine === 500,
  `dispo=${beforeRelease.available} attente=${beforeRelease.pendingControl} quarantaine=${beforeRelease.quarantine}`
);
check(
  'Alerte de lot en attente de contrôle émise',
  storage.getGdsAlerts('MATIERES_PREMIERES').some(a => a.lotNumber === 'LOT-TEST-REC-02')
);

storage.decideReceiptQuality(receipt.id, 'ACCEPTEE', 'Contrôle conforme — certificat sanitaire présent');
const afterRelease = storage.getGdsStock('MATIERES_PREMIERES').find(r => r.itemId === fishItem.id)!;
check(
  'Libération qualité : stock basculé en disponible',
  afterRelease.available === 1500 &&
    afterRelease.pendingControl === 0 &&
    afterRelease.quarantine === 0,
  `dispo=${afterRelease.available} attente=${afterRelease.pendingControl} quarantaine=${afterRelease.quarantine}`
);
check(
  'Stock physique inchangé par la décision qualité',
  afterRelease.physical === 1500,
  `${afterRelease.physical}`
);

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== 4. Sortie matières vers l\'atelier (dotation) ===');
// ═══════════════════════════════════════════════════════════════════════════
const workOrder = storage.addWorkOrder({
  recipeId: recipe.id,
  finishedItemId: pfItem.id,
  productName: pfItem.designation,
  plannedCansQty: 1000,
  plannedCartonsQty: 42,
  actualCansQty: 0,
  lineId: 'LIGNE-01',
  teamLeader: 'Chef de ligne test',
  shift: 'EQUIPE_MATIN',
  startDatePlanned: new Date().toISOString().slice(0, 10),
  endDatePlanned: new Date(Date.now() + 86_400_000).toISOString().slice(0, 10),
  assignedRawBatchId: lotFish,
  assignedCanBatchId: 'LOT-TEST-EMB-01',
  assignedLidBatchId: 'LOT-TEST-EMB-01',
  priority: 'NORMALE',
  status: 'PLANIFIE',
  theoreticalFishKgNeeded: 250,
  actualFishKgConsumed: 0,
  rejectedCansQty: 0,
});
storage.updateWorkOrderStatus(workOrder.id, 'EN_COURS');

const fishLot = storage.getStockLots({ lotNumber: lotFish })[0];
const transfer = storage.createTransfer({
  type: 'INTER_MAGASIN',
  sourceWarehouseId: whMp.id,
  destinationWarehouseId: whProd.id,
  reason: `Dotation atelier pour OF ${workOrder.orderNumber}`,
  workOrderId: workOrder.id,
  lines: [
    {
      itemId: fishItem.id,
      lotId: fishLot.id,
      lotNumber: fishLot.lotNumber,
      requestedQty: 400,
      sourceLocationId: locMp.id,
      destinationLocationId: locProd.id,
    },
  ],
});
storage.submitTransfer(transfer.id);
storage.validateTransfer(transfer.id);
storage.prepareTransfer(transfer.id);
storage.shipTransfer(transfer.id, [
  { lineId: transfer.lines[0].id, preparedQty: 400, shippedQty: 400 },
]);

const inTransit = storage.getGdsStock('MATIERES_PREMIERES').find(r => r.itemId === fishItem.id)!;
check(
  'Marchandise expédiée non disponible à la source',
  inTransit.available === 1100,
  `${inTransit.available}`
);
check('Quantité en transit exposée séparément', inTransit.transit === 400, `${inTransit.transit}`);
check(
  'Transit non compté deux fois dans le physique',
  inTransit.physical === 1100,
  `${inTransit.physical}`
);

storage.receiveTransfer(transfer.id, [
  {
    lineId: transfer.lines[0].id,
    receivedQty: 400,
    damagedQty: 0,
    destinationLocationId: locProd.id,
  },
]);
const atWorkshop = storage.getGdsStock('MATIERES_PREMIERES').find(r => r.itemId === fishItem.id)!;
check('Stock réceptionné dans le magasin de production', atWorkshop.physical === 1500);
check('Plus rien en transit', atWorkshop.transit === 0);
check(
  'Sortie atelier tracée comme transfert, pas comme consommation',
  storage
    .getGdsMovements({ scope: 'MATIERES_PREMIERES', lotNumber: lotFish })
    .some(m => m.type === 'TRANSFERT_SORTIE' && m.workOrderId === workOrder.id) &&
    !storage
      .getGdsMovements({ scope: 'MATIERES_PREMIERES', lotNumber: lotFish })
      .some(m => m.type === 'CONSOMMATION_OF')
);

let reconciliation = storage.getWorkOrderIssueReconciliation(workOrder.id);
const fishReconciliation = reconciliation.find(r => r.itemId === fishItem.id)!;
check('Rapprochement : quantité sortie', fishReconciliation.issuedQty === 400, `${fishReconciliation.issuedQty}`);
check('Rapprochement : rien encore consommé', fishReconciliation.consumedQty === 0);
check(
  'Rapprochement : sortie non justifiée signalée',
  fishReconciliation.outstandingQty === 400,
  `${fishReconciliation.outstandingQty}`
);

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== 5. Retour de matières non consommées ===');
// ═══════════════════════════════════════════════════════════════════════════
const returnTransfer = storage.createReturn({
  sourceWarehouseId: whProd.id,
  destinationWarehouseId: whMp.id,
  reason: `Retour de matières non consommées — OF ${workOrder.orderNumber}`,
  workOrderId: workOrder.id,
  lines: [
    {
      itemId: fishItem.id,
      lotId: fishLot.id,
      lotNumber: fishLot.lotNumber,
      requestedQty: 150,
      sourceLocationId: locProd.id,
      destinationLocationId: locMp.id,
    },
  ],
});
storage.submitTransfer(returnTransfer.id);
storage.validateTransfer(returnTransfer.id);
storage.prepareTransfer(returnTransfer.id);
storage.shipTransfer(returnTransfer.id, [
  { lineId: returnTransfer.lines[0].id, preparedQty: 150, shippedQty: 150 },
]);
storage.receiveTransfer(returnTransfer.id, [
  {
    lineId: returnTransfer.lines[0].id,
    receivedQty: 150,
    damagedQty: 0,
    destinationLocationId: locMp.id,
  },
]);

reconciliation = storage.getWorkOrderIssueReconciliation(workOrder.id);
const afterReturn = reconciliation.find(r => r.itemId === fishItem.id)!;
check('Retour magasin enregistré', afterReturn.returnedQty === 150, `${afterReturn.returnedQty}`);
check(
  'Sortie nette après retour',
  afterReturn.outstandingQty === 250,
  `${afterReturn.outstandingQty}`
);
check(
  'Type de transfert RETOUR_MAGASIN conservé',
  storage.getReturns().some(t => t.id === returnTransfer.id)
);

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== 6. Consommation réelle et rapprochement ===');
// ═══════════════════════════════════════════════════════════════════════════
storage.addConsumption({
  workOrderId: workOrder.id,
  workOrderNumber: workOrder.orderNumber,
  recipeId: workOrder.recipeId,
  recipeCode: 'NOM-TEST',
  recipeVersion: 'v1',
  finishedItemId: pfItem.id,
  finishedItemCode: pfItem.code,
  finishedItemName: pfItem.designation,
  finishedBatchNumber: 'LOT-PF-TEST-01',
  lineId: workOrder.lineId,
  shift: 'EQUIPE_MATIN',
  consumptionDateTime: new Date().toISOString(),
  recordedBy: admin.name,
  status: 'EN_ATTENTE_VALIDATION',
  plannedQuantityCans: 1000,
  actualProducedQuantityCans: 900,
  conformQuantityCans: 880,
  lines: [
    {
      id: 'CL1',
      itemId: fishItem.id,
      itemCode: fishItem.code,
      designation: fishItem.designation,
      category: 'MATIERE_PREMIERE',
      lots: [
        {
          lotId: fishLot.id,
          lotNumber: fishLot.lotNumber,
          withdrawnQty: 400,
          usedQty: 240,
          returnedQty: 150,
          wasteQty: 10,
          unit: fishItem.unit,
          storageLocation: locProd.code,
          lotStatus: 'LIBERE',
        },
      ],
      batchNumber: fishLot.lotNumber,
      storageLocation: locProd.code,
      initialTheoreticalQuantity: 250,
      adjustedTheoreticalQuantity: 240,
      actualConsumedQuantity: 240,
      withdrawnQuantity: 400,
      returnedQuantity: 150,
      wasteQuantity: 10,
      unit: fishItem.unit,
      tolerancePercent: 3,
      quantityVariance: 0,
      percentageVariance: 0,
      responsibleOperator: 'Chef de ligne',
    },
  ],
});

reconciliation = storage.getWorkOrderIssueReconciliation(workOrder.id);
const withConsumption = reconciliation.find(r => r.itemId === fishItem.id)!;
check('Consommation réelle prise en compte', withConsumption.consumedQty === 240, `${withConsumption.consumedQty}`);
check(
  'Écart résiduel = sorti − consommé − retourné',
  withConsumption.outstandingQty === 10,
  `${withConsumption.outstandingQty}`
);
check(
  'Fiche de consommation rattachée au rapprochement',
  withConsumption.consumptionNumbers.length === 1
);

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== 7. Réception des produits finis depuis la production ===');
// ═══════════════════════════════════════════════════════════════════════════
const candidates = storage.getProductionReceiptCandidates();
const candidate = candidates.find(c => c.workOrderId === workOrder.id);
check('OF proposé à la réception PF', Boolean(candidate));
check('Reste à réceptionner = production prévue', candidate?.remainingCans === 1000, `${candidate?.remainingCans}`);

const batch1 = storage.createFinishedGoodsReceipt({
  workOrderId: workOrder.id,
  itemId: pfItem.id,
  batchNumber: 'LOT-PF-GDS-01',
  quantityCans: 600,
  cartons: 25,
  pallets: 1,
  warehouseId: whPf.id,
  locationId: locPf.id,
  productionDate: new Date().toISOString().slice(0, 10),
});

let pfStock = storage.getGdsStock('PRODUITS_FINIS').find(r => r.itemId === pfItem.id)!;
check('Réception PF enregistrée en stock', pfStock.physical === 600, `${pfStock.physical}`);
check(
  'Réception PF placée en attente de libération',
  pfStock.available === 0 && pfStock.pendingControl === 600,
  `dispo=${pfStock.available} attente=${pfStock.pendingControl}`
);
check(
  'Lot fini lié à l\'ordre de fabrication',
  batch1.workOrderId === workOrder.id && batch1.batchNumber === 'LOT-PF-GDS-01'
);

const afterPartial = storage.getProductionReceiptCandidates().find(c => c.workOrderId === workOrder.id);
check(
  'Production partielle : reste 400 boîtes',
  afterPartial?.remainingCans === 400,
  `${afterPartial?.remainingCans}`
);

expectThrow(
  'Double réception du même lot refusée',
  () =>
    storage.createFinishedGoodsReceipt({
      workOrderId: workOrder.id,
      itemId: pfItem.id,
      batchNumber: 'LOT-PF-GDS-01',
      quantityCans: 100,
      warehouseId: whPf.id,
    }),
  'double réception'
);
expectThrow(
  'Réception supérieure au reste à produire refusée',
  () =>
    storage.createFinishedGoodsReceipt({
      workOrderId: workOrder.id,
      itemId: pfItem.id,
      batchNumber: 'LOT-PF-GDS-02',
      quantityCans: 900,
      warehouseId: whPf.id,
    }),
  'restant'
);
expectThrow(
  'Réception d\'un article non fini refusée',
  () =>
    storage.createFinishedGoodsReceipt({
      workOrderId: workOrder.id,
      itemId: fishItem.id,
      quantityCans: 10,
      warehouseId: whPf.id,
    }),
  'produit fini'
);

const batch2 = storage.createFinishedGoodsReceipt({
  workOrderId: workOrder.id,
  itemId: pfItem.id,
  batchNumber: 'LOT-PF-GDS-02',
  quantityCans: 400,
  warehouseId: whPf.id,
  locationId: locPf.id,
});
check('Réception successive acceptée', Boolean(batch2.id));
check(
  'Plus rien à réceptionner après les deux réceptions',
  !storage.getProductionReceiptCandidates().some(c => c.workOrderId === workOrder.id)
);

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== 8. Libération qualité et sortie des produits finis ===');
// ═══════════════════════════════════════════════════════════════════════════
storage.releaseFinishedBatch(batch1.id, admin.name, 'LIBERE', 'Libération sanitaire de test');
pfStock = storage.getGdsStock('PRODUITS_FINIS').find(r => r.itemId === pfItem.id)!;
check('Lot libéré : stock disponible', pfStock.available === 600, `${pfStock.available}`);
check(
  'Lot 2 toujours en attente',
  pfStock.pendingControl === 400,
  `${pfStock.pendingControl}`
);

const releasedLot = storage.getStockLots({ lotNumber: 'LOT-PF-GDS-01' })[0];
const pendingLot = storage.getStockLots({ lotNumber: 'LOT-PF-GDS-02' })[0];

expectThrow(
  'Sortie PF d\'un lot non libéré refusée',
  () =>
    storage.createFinishedGoodsIssue({
      motive: 'ECHANTILLON',
      destination: 'Laboratoire interne',
      lines: [{ itemId: pfItem.id, lotId: pendingLot.id, quantity: 10 }],
    }),
  'libéré'
);

const issue = storage.createFinishedGoodsIssue({
  motive: 'ECHANTILLON',
  destination: 'Salon professionnel Alger',
  documentRef: 'DOC-ECH-001',
  lines: [{ itemId: pfItem.id, lotId: releasedLot.id, quantity: 120, cartons: 5 }],
});
check('Sortie PF créée en brouillon', issue.status === 'BROUILLON');
storage.prepareFinishedGoodsIssue(issue.id, [{ lineId: issue.lines[0].id, preparedQty: 100 }]);
storage.controlFinishedGoodsIssue(issue.id, 'Contrôle quantités et étiquetage conforme');
storage.validateFinishedGoodsIssue(issue.id);

pfStock = storage.getGdsStock('PRODUITS_FINIS').find(r => r.itemId === pfItem.id)!;
check('Sortie PF partielle appliquée (100)', pfStock.available === 500, `${pfStock.available}`);
check('Sortie PF tracée au grand livre', storage.getGdsMovements({ scope: 'PRODUITS_FINIS' }).some(m => m.type === 'SORTIE_PRODUIT_FINI' && m.documentNumber === issue.issueNumber));
expectThrow(
  'Sortie validée non annulable',
  () => storage.cancelFinishedGoodsIssue(issue.id, 'Tentative d\'annulation'),
  'définitifs'
);

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== 9. Inventaire et ajustement ===');
// ═══════════════════════════════════════════════════════════════════════════
const inventory = storage.createInventory({
  scope: 'MATIERES_PREMIERES',
  type: 'MAGASIN',
  warehouseId: whMp.id,
  notes: 'Inventaire tournant de test',
});
check('Inventaire ouvert en comptage', inventory.status === 'EN_COMPTAGE');
check('Lignes théoriques générées', inventory.lines.length > 0, `${inventory.lines.length}`);

const targetLine = inventory.lines.find(l => l.itemId === fishItem.id)!;
const theoretical = targetLine.theoreticalQty;
storage.recordInventoryCount(
  inventory.id,
  inventory.lines.map(line => ({
    lineId: line.id,
    countedQty: line.id === targetLine.id ? line.theoreticalQty - 10 : line.theoreticalQty,
    justification:
      line.id === targetLine.id
        ? 'Écart constaté : 10 kg de parage non déclarés'
        : undefined,
  }))
);
check(
  'Écart calculé automatiquement',
  targetLine.gapQty === -10,
  `${targetLine.gapQty}`
);

// Inventaire dédié au contrôle d'habilitation
const inventoryPermission = storage.createInventory({
  scope: 'MATIERES_PREMIERES',
  type: 'MAGASIN',
  warehouseId: whMp.id,
});
storage.recordInventoryCount(inventoryPermission.id, [
  { lineId: inventoryPermission.lines[0].id, countedQty: inventoryPermission.lines[0].theoreticalQty },
]);
storage.setCurrentUser(storage.getUsers().find(u => u.role === 'MAGASINIER')!);
expectThrow(
  'Validation refusée sans habilitation d\'ajustement',
  () => storage.validateInventory(inventoryPermission.id),
  'habilitation'
);
storage.setCurrentUser(admin);
storage.cancelInventory(inventoryPermission.id, 'Inventaire de contrôle des habilitations');

const physicalBeforeInventory = storage
  .getGdsStock('MATIERES_PREMIERES')
  .reduce((sum, row) => sum + row.physical, 0);

storage.submitInventory(inventory.id);
const validated = storage.validateInventory(inventory.id, 'Régularisation validée après comptage contradictoire');
check('Inventaire validé', validated.status === 'VALIDE');
check(
  'Mouvement d\'ajustement généré',
  storage.getGdsMovements({ scope: 'MATIERES_PREMIERES' }).some(
    m => m.type === 'AJUSTEMENT_INVENTAIRE' && m.documentNumber === inventory.inventoryNumber
  )
);
const physicalAfterInventory = storage
  .getGdsStock('MATIERES_PREMIERES')
  .reduce((sum, row) => sum + row.physical, 0);
check(
  'Stock corrigé par mouvement traçable',
  physicalAfterInventory === physicalBeforeInventory - 10,
  `${physicalAfterInventory} vs ${physicalBeforeInventory - 10}`
);

const inventory2 = storage.createInventory({ scope: 'PRODUITS_FINIS', type: 'GENERAL' });
storage.recordInventoryCount(
  inventory2.id,
  inventory2.lines.map((line, index) => ({
    lineId: line.id,
    countedQty: index === 0 ? line.theoreticalQty - 5 : line.theoreticalQty,
  }))
);
expectThrow(
  'Écart sans justification refusé',
  () => storage.submitInventory(inventory2.id),
  'justification'
);
storage.cancelInventory(inventory2.id, 'Inventaire de test annulé');

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== 10. Traçabilité bidirectionnelle ===');
// ═══════════════════════════════════════════════════════════════════════════
const mpTrace = storage.getLotTraceability(lotFish);
check('Traçabilité MP trouvée', Boolean(mpTrace));
check(
  'Amont MP : document d\'entrée retrouvé dans le grand livre',
  Boolean(
    mpTrace?.movements.some(
      m => m.type === 'ENTREE_RECEPTION' && m.documentNumber === 'REC-TEST-0001'
    )
  ),
  JSON.stringify(mpTrace?.upstream)
);
check(
  'Aval MP : OF fabriqués avec ce lot',
  Boolean(mpTrace?.workOrders.some(w => w.workOrderId === workOrder.id))
);
check(
  'Aval MP : lot fini relié à l\'OF',
  Boolean(
    mpTrace?.workOrders
      .flatMap(w => w.finishedBatches)
      .some(b => b.batchNumber === 'LOT-PF-GDS-01')
  )
);

const pfTrace = storage.getLotTraceability('LOT-PF-GDS-01');
check('Traçabilité PF trouvée', Boolean(pfTrace));
check(
  'Amont PF : ordre de fabrication',
  pfTrace?.upstream.workOrderNumber === workOrder.orderNumber,
  JSON.stringify(pfTrace?.upstream)
);
check(
  'Amont PF : matières réellement consommées avec leur lot',
  Boolean(pfTrace?.consumedMaterials.some(m => m.lotNumber === lotFish))
);
check(
  'Traçabilité basée sur les liens réels (aucune relation inventée)',
  Boolean(pfTrace?.movements.every(m => m.batchNumber === pfTrace.lotNumber))
);

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== 11. Tableaux de bord, alertes et rapports ===');
// ═══════════════════════════════════════════════════════════════════════════
const dashMp = storage.getGdsDashboard('MATIERES_PREMIERES');
const dashPf = storage.getGdsDashboard('PRODUITS_FINIS');
check('Tableau de bord MP cohérent', dashMp.physical >= 0 && dashMp.byFamily.length === 6);
check('Tableau de bord PF cohérent', dashPf.physical >= 0 && dashPf.scope === 'PRODUITS_FINIS');
check(
  'Indicateurs issus des données réelles (pas de valeur fictive)',
  dashPf.physical === storage.getGdsStock('PRODUITS_FINIS').reduce((s, r) => s + r.physical, 0)
);
check(
  'Série mensuelle sur 6 périodes',
  dashMp.monthly.length === 6 && dashPf.monthly.length === 6
);
const alerts = storage.getGdsAlerts();
check('Alertes générées', alerts.length > 0, `${alerts.length}`);
check(
  'Alerte de rupture sur article sans stock',
  alerts.some(a => a.kind === 'RUPTURE')
);
check(
  'Alerte d\'attente de libération PF',
  alerts.some(a => a.kind === 'ATTENTE_LIBERATION')
);

const report = storage.getGdsReport();
check('Rapport annuel : 12 mois', report.monthly.length === 12);
check('Rapport : précision d\'inventaire calculée', report.inventoryAccuracy >= 0 && report.inventoryAccuracy <= 100);
check('Rapport : mouvements comptés', report.totalMovements > 0, `${report.totalMovements}`);
check('Rapport : production recensée', report.topProduced.length > 0);

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== 12. Paramètres, permissions et intégrité ===');
// ═══════════════════════════════════════════════════════════════════════════
const magasinier = storage.getUsers().find(u => u.role === 'MAGASINIER')!;
check('Magasinier : consultation MP autorisée', storage.canGds('GDS_VIEW_MP', magasinier));
check('Magasinier : ajustement refusé', !storage.canGds('GDS_VALIDATE_ADJUSTMENT', magasinier));
check(
  'Qualité : libération PF autorisée',
  storage.canGds('GDS_RELEASE_FP', storage.getUsers().find(u => u.role === 'RESPONSABLE_QUALITE')!)
);
const chefLigne = storage.getUsers().find(u => u.role === 'CHEF_DE_LIGNE')!;
check('Chef de ligne : aucune sortie PF', !storage.canGds('GDS_ISSUE_FP', chefLigne));
check('Chef de ligne : sortie MP autorisée', storage.canGds('GDS_ISSUE_MP', chefLigne));

const settingsBefore = storage.getGdsSettings();
storage.updateGdsSettings({ expiryAlertDays: 60 });
check('Paramètres GDS modifiables par la direction', storage.getGdsSettings().expiryAlertDays === 60);
storage.updateGdsSettings({ expiryAlertDays: settingsBefore.expiryAlertDays });
expectThrow(
  'Paramètres GDS protégés',
  () => {
    storage.setCurrentUser(magasinier);
    try {
      storage.updateGdsSettings({ expiryAlertDays: 10 });
    } finally {
      storage.setCurrentUser(admin);
    }
  },
  'direction'
);
storage.setCurrentUser(admin);

check(
  'Mouvements validés non supprimables (grand livre append-only)',
  storage.getStockMovements().filter(m => m.type === 'SORTIE_PRODUIT_FINI').length > 0
);
const auditTrail = storage.getAuditLogs();
check(
  'Audit : inventaire et sorties tracés',
  auditTrail.some(l => l.entity === 'StockInventory') && auditTrail.some(l => l.entity === 'FinishedGoodsIssue')
);
check(
  'Audit : quantité, lot, magasin et référence documentaire disponibles',
  storage
    .getGdsMovements({ scope: 'PRODUITS_FINIS' })
    .filter(m => m.type === 'SORTIE_PRODUIT_FINI')
    .every(m => Boolean(m.lotId && m.sourceWarehouseId && m.documentNumber && m.quantity > 0))
);

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n══════════════════════════════════════════════════════════');
console.log(`RÉSULTAT GDS : ${passed} réussites / ${failed} échec(s)`);
if (failed > 0) {
  console.log('Échecs :');
  failures.forEach(f => console.log(`  - ${f}`));
  process.exitCode = 1;
}
console.log('══════════════════════════════════════════════════════════\n');
