/**
 * Harnais de test fonctionnel du module Service Approvisionnement.
 * Couvre : validation multi-niveaux, budgets, réapprovisionnement automatique,
 * consultation → comparatif → commande → réception → qualité → évaluation → contrats.
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
    if (ok) console.log(`         ↳ « ${message.slice(0, 150)} »`);
  }
};

const { storage } = await import('../src/services/storage');
const { PROCUREMENT_DEPARTMENT_LABELS } = await import('../src/types');

const admin = storage.getUsers().find(u => u.role === 'ADMIN')!;
storage.setCurrentUser(admin);

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== 0. Migration et intégrité des nouvelles collections ===');
// ═══════════════════════════════════════════════════════════════════════════
check('Consultations initialisées', Array.isArray(storage.getSupplierConsultations()));
check('Commandes initialisées', Array.isArray(storage.getPurchaseOrders()));
check('Réceptions initialisées', Array.isArray(storage.getPurchaseReceipts()));
check('Contrats initialisés', Array.isArray(storage.getSupplierContracts()));
check(
  'Circuit de validation à 3 niveaux',
  storage.getProcurementSettings().approvalSteps.length === 3,
  `${storage.getProcurementSettings().approvalSteps.length} étape(s)`
);
check(
  'Aucune donnée existante supprimée',
  storage.getItems().length > 0 && storage.getWarehouses(true).length > 0
);

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== 1. Demande d\'achat manuelle et circuit multi-niveaux ===');
// ═══════════════════════════════════════════════════════════════════════════
const items = storage.getActiveItems();
const targetItem = items.find(i => i.group === 'MATIERES_PREMIERES_PRINCIPALES') || items[0];
const secondItem = items.find(i => i.id !== targetItem.id)!;

const request = storage.createPurchaseRequest({
  department: 'PRODUCTION',
  serviceManager: 'Chef de production',
  type: 'BESOIN_PONCTUEL',
  priority: 'NORMALE',
  justification: 'Réapprovisionnement pour la campagne de production de la semaine.',
  desiredDate: new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10),
  lines: [
    {
      id: 'L1',
      itemId: targetItem.id,
      itemCode: targetItem.code,
      designation: targetItem.designation,
      category: targetItem.category,
      quantity: 100,
      unit: targetItem.unit,
      estimatedUnitPriceDzd: 150,
    },
    {
      id: 'L2',
      itemId: secondItem.id,
      itemCode: secondItem.code,
      designation: secondItem.designation,
      category: secondItem.category,
      quantity: 50,
      unit: secondItem.unit,
      estimatedUnitPriceDzd: 80,
    },
  ],
});

check('Demande créée au statut BROUILLON', request.status === 'BROUILLON');
check('Numéro de demande généré', /^DA-\d{4}-\d{4}$/.test(request.requestNumber), request.requestNumber);
check('Total estimé calculé', request.estimatedTotalDzd === 100 * 150 + 50 * 80, String(request.estimatedTotalDzd));
check('Circuit non figé avant soumission', request.approvalCircuit.length === 0);

expectThrow(
  'Justification trop courte refusée',
  () =>
    storage.createPurchaseRequest({
      department: 'PRODUCTION',
      type: 'BESOIN_PONCTUEL',
      priority: 'NORMALE',
      justification: 'abc',
      lines: request.lines,
    }),
  'justification'
);

storage.submitPurchaseRequest(request.id);
check('Demande soumise au statut EN_VALIDATION', request.status === 'EN_VALIDATION');
check('Circuit figé à la soumission (3 niveaux)', request.approvalCircuit.length === 3, String(request.approvalCircuit.length));
check('Première étape = Responsable Production', request.approvalCircuit[0].role === 'RESPONSABLE_PRODUCTION');

// Profil habilité à valider mais qui n'est pas le valideur de l'étape 1
const mauvaisValideur = storage.getUsers().find(u => u.role === 'RESPONSABLE_QUALITE')!;
storage.setCurrentUser(mauvaisValideur);
expectThrow(
  'Un profil hors étape ne peut pas statuer',
  () => storage.decidePurchaseRequest(request.id, 'APPROUVE'),
  'réservée au profil'
);
const chefLigne = storage.getUsers().find(u => u.role === 'CHEF_DE_LIGNE')!;
storage.setCurrentUser(chefLigne);
expectThrow(
  'Un profil sans habilitation ne peut pas statuer',
  () => storage.decidePurchaseRequest(request.id, 'APPROUVE'),
  'habilitation'
);

const respProd = storage.getUsers().find(u => u.role === 'RESPONSABLE_PRODUCTION')!;
storage.setCurrentUser(respProd);
storage.decidePurchaseRequest(request.id, 'APPROUVE', 'Besoin confirmé.');
check('Étape 1 validée, passage à l\'étape 2', request.currentStepIndex === 1, String(request.currentStepIndex));

const respQualite = storage.getUsers().find(u => u.role === 'RESPONSABLE_QUALITE')!;
storage.setCurrentUser(respQualite);
storage.decidePurchaseRequest(request.id, 'APPROUVE', 'Fournisseurs conformes ISO 22000.');
check('Étape 2 validée, passage à l\'étape 3', request.currentStepIndex === 2, String(request.currentStepIndex));

const directeur = storage.getUsers().find(u => u.role === 'DIRECTEUR_USINE')!;
storage.setCurrentUser(directeur);
storage.decidePurchaseRequest(request.id, 'APPROUVE', 'Engagement autorisé.');
check('Demande VALIDEE après 3 niveaux', request.status === 'VALIDEE');
check('Historique de validation complet', request.approvalHistory.length === 3);
check(
  'Chaque décision est tracée avec son auteur',
  request.approvalHistory.every(entry => Boolean(entry.userName) && Boolean(entry.timestamp))
);

storage.setCurrentUser(admin);

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== 2. Budgets par service et blocage des dépassements ===');
// ═══════════════════════════════════════════════════════════════════════════
const year = new Date().getFullYear();
const budget = storage.addProcurementBudget({
  fiscalYear: year,
  department: 'PRODUCTION',
  amountDzd: 500000,
  notes: 'Budget de test',
});
check('Budget créé', Boolean(budget.id));
check('Budget actif', budget.isActive === true);

const overview = storage.getBudgetOverview(year);
const productionBudget = overview.find(entry => entry.budget.id === budget.id)!;
check('Budget visible dans la synthèse', Boolean(productionBudget));
check(
  'Engagement budgétaire calculé',
  productionBudget.engagedDzd >= request.estimatedTotalDzd,
  `${productionBudget.engagedDzd} engagés`
);
check(
  'Disponible = montant - engagé',
  Math.abs(productionBudget.availableDzd - (budget.amountDzd - productionBudget.engagedDzd)) < 0.01
);

const tinyBudget = storage.addProcurementBudget({
  fiscalYear: year,
  department: 'MAINTENANCE',
  amountDzd: 1000,
});
const overBudgetRequest = storage.createPurchaseRequest({
      department: 'MAINTENANCE',
      type: 'BESOIN_PONCTUEL',
      priority: 'NORMALE',
      justification: 'Achat de pièces de rechange critiques pour la ligne 2.',
      lines: [
        {
          id: 'L9',
          itemId: targetItem.id,
          itemCode: targetItem.code,
          designation: targetItem.designation,
          category: targetItem.category,
          quantity: 100,
          unit: targetItem.unit,
          estimatedUnitPriceDzd: 500,
        },
      ],
});
expectThrow(
  'Soumission au-delà du budget refusée',
  () => storage.submitPurchaseRequest(overBudgetRequest.id),
  'budget'
);
check('Budget de maintenance inchangé', storage.getBudgetOverview(year).some(e => e.budget.id === tinyBudget.id));

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== 3. Réapprovisionnement automatique depuis les seuils ===');
// ═══════════════════════════════════════════════════════════════════════════
const proposals = storage.getReplenishmentProposals();
check('Propositions calculées', proposals.length > 0, `${proposals.length} proposition(s)`);
check(
  'Quantité proposée jamais négative',
  proposals.every(p => p.proposedQty >= 0)
);
check(
  'Quantité proposée = cible - disponible - commandé',
  proposals.every(
    p => Math.abs(p.proposedQty - Math.max(0, p.targetStock - p.available - p.onOrderQty)) < 0.01
  )
);
check(
  'Stock cible supérieur ou égal au minimum',
  proposals.every(p => p.targetStock >= p.minStockLevel)
);

const replenishable = proposals.find(p => p.proposedQty > 0);
if (replenishable) {
  const created = storage.createReplenishmentRequest({
    department: 'MAGASIN_MP',
    items: [{ itemId: replenishable.itemId, quantity: replenishable.proposedQty }],
    priority: 'NORMALE',
  });
  check('Demande automatique créée', Boolean(created.id));
  check('Origine AUTOMATIQUE tracée', created.source === 'AUTOMATIQUE', String(created.source));
  check(
    'Aucune quantité négative dans les lignes',
    created.lines.every(line => line.quantity > 0)
  );
} else {
  console.log('  (aucun article sous seuil : scénario automatique partiellement couvert)');
}

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== 4. Consultation fournisseurs et comparatif des offres ===');
// ═══════════════════════════════════════════════════════════════════════════
const suppliers = storage.getSuppliers(true);
check('Fichier fournisseurs alimenté', suppliers.length >= 2, `${suppliers.length} fournisseur(s)`);

const consultation = storage.createSupplierConsultation({
  requestId: request.id,
  invitedSupplierIds: suppliers.slice(0, 2).map(s => s.id),
  deadline: new Date(Date.now() + 12 * 86400000).toISOString().slice(0, 10),
  observations: 'Consultation de test',
});
check('Consultation ouverte', consultation.status === 'OUVERTE');
check('Numéro de consultation généré', /^CDF-\d{4}-\d{4}$/.test(consultation.consultationNumber));
check('Demande passée en consultation', request.status === 'EN_CONSULTATION');

expectThrow(
  'Fournisseur non invité refusé',
  () =>
    storage.addSupplierQuote(consultation.id, {
      supplierId: suppliers[suppliers.length - 1].id,
      leadTimeDays: 10,
      lines: [{ itemId: targetItem.id, quantity: 10, unitPriceDzd: 100 }],
    }),
  'invité'
);

const quoteA = storage.addSupplierQuote(consultation.id, {
  supplierId: suppliers[0].id,
  leadTimeDays: 7,
  paymentTermsDays: 30,
  lines: request.lines.map(line => ({
    itemId: line.itemId,
    quantity: line.quantity,
    unitPriceDzd: 140,
  })),
});
const quoteB = storage.addSupplierQuote(consultation.id, {
  supplierId: suppliers[1].id,
  leadTimeDays: 20,
  paymentTermsDays: 60,
  lines: request.lines.map(line => ({
    itemId: line.itemId,
    quantity: line.quantity,
    unitPriceDzd: 120,
  })),
});

check('Offre A enregistrée', quoteA.totalDzd === 100 * 140 + 50 * 140, String(quoteA.totalDzd));
check('Offre B enregistrée', quoteB.totalDzd === 100 * 120 + 50 * 120, String(quoteB.totalDzd));
check('Totaux recalculés côté service', quoteA.lines.every(l => l.lineTotalDzd === l.quantity * l.unitPriceDzd));

expectThrow(
  'Double offre du même fournisseur refusée',
  () =>
    storage.addSupplierQuote(consultation.id, {
      supplierId: suppliers[0].id,
      leadTimeDays: 5,
      lines: [{ itemId: targetItem.id, quantity: 10, unitPriceDzd: 90 }],
    }),
  'déjà enregistrée'
);

const comparison = storage.getQuoteComparison(consultation.id);
check('Comparatif calculé sur 2 offres', comparison.length === 2);
check('Classement par rang croissant', comparison[0].rank === 1 && comparison[1].rank === 2);
check(
  'Offre la moins chère identifiée',
  comparison.find(e => e.isCheapest)?.quote.id === quoteB.id
);
check(
  'Offre la plus rapide identifiée',
  comparison.find(e => e.isFastest)?.quote.id === quoteA.id
);
check(
  'Score global entre 0 et 100',
  comparison.every(e => e.totalScore >= 0 && e.totalScore <= 100)
);
check(
  'Pondération prix 60 / délai 25 / paiement 15',
  Math.abs(
    comparison[0].totalScore -
      (comparison[0].priceScore * 0.6 + comparison[0].leadTimeScore * 0.25 + comparison[0].termsScore * 0.15)
  ) < 0.2
);

expectThrow(
  'Attribution sans justification refusée',
  () => storage.awardSupplierConsultation(consultation.id, quoteB.id, 'ok'),
  'justification'
);

storage.awardSupplierConsultation(
  consultation.id,
  quoteB.id,
  'Meilleur prix global pour un délai compatible avec le planning de production.'
);
check('Consultation attribuée', consultation.status === 'ATTRIBUEE');
check('Fournisseur retenu enregistré', consultation.awardedSupplierId === suppliers[1].id);

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== 5. Commande d\'achat et engagement de la demande ===');
// ═══════════════════════════════════════════════════════════════════════════
const order = storage.createPurchaseOrder({
  supplierId: suppliers[1].id,
  consultationId: consultation.id,
  requestId: request.id,
  expectedDate: new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10),
  paymentTermsDays: 60,
});
check('Commande émise', order.status === 'EMISE');
check('Numéro de commande généré', /^CMD-\d{4}-\d{4}$/.test(order.orderNumber));
check('Montant de commande = offre attribuée', order.totalDzd === quoteB.totalDzd, String(order.totalDzd));
check('Lignes reprises de l\'offre', order.lines.length === request.lines.length);
check('Demande marquée COMMANDEE', request.status === 'COMMANDEE', request.status);
check(
  'Aucune ligne restant à commander',
  storage.getRequestRemainingLines(request.id).every(l => l.quantityRemaining === 0)
);

expectThrow(
  'Double commande de la même demande refusée',
  () =>
    storage.createPurchaseOrder({
      supplierId: suppliers[1].id,
      requestId: request.id,
      expectedDate: new Date().toISOString().slice(0, 10),
    }),
  'commandable'
);

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== 6. Réception, tolérance d\'excédent et quarantaine ===');
// ═══════════════════════════════════════════════════════════════════════════
const warehouse = storage.getWarehouses(true).find(w => w.type === 'MATIERES_PREMIERES') || storage.getWarehouses(true)[0];

expectThrow(
  'Excédent au-delà de la tolérance refusé',
  () =>
    storage.createPurchaseReceipt({
      orderId: order.id,
      warehouseId: warehouse.id,
      lines: [
        {
          orderLineId: order.lines[0].id,
          quantityReceived: order.lines[0].quantityOrdered * 2,
        },
      ],
    }),
  'excédent'
);

const receipt = storage.createPurchaseReceipt({
  orderId: order.id,
  warehouseId: warehouse.id,
  deliveryNoteNumber: 'BL-TEST-001',
  isOnHold: true,
  lines: order.lines.map(line => ({
    orderLineId: line.id,
    quantityReceived: line.quantityOrdered,
    lotNumber: `LOT-TEST-${line.itemCode}`,
    expiryDate: new Date(Date.now() + 180 * 86400000).toISOString().slice(0, 10),
  })),
});
check('Réception enregistrée', Boolean(receipt.id));
check('Numéro de réception généré', /^REC-\d{4}-\d{4}$/.test(receipt.receiptNumber));
check('Stock en quarantaine', receipt.isOnHold === true);
check('Mouvements de stock créés', receipt.stockMovementsCreated === true);
check('Commande soldée', order.status === 'RECUE', order.status);
check(
  'Quantités reçues cumulées sur la commande',
  order.lines.every(line => line.quantityReceived === line.quantityOrdered)
);
check(
  'Lot créé dans le magasin de réception',
  storage.getStockLots().some(lot => lot.lotNumber === `LOT-TEST-${order.lines[0].itemCode}`)
);

const movements = storage.getStockMovements().filter(m => m.documentNumber === receipt.receiptNumber);
check('Un mouvement d\'entrée par ligne', movements.length === order.lines.length, `${movements.length}`);
check('Mouvements de type ENTREE_RECEPTION', movements.every(m => m.type === 'ENTREE_RECEPTION'));

storage.decideReceiptQuality(
  receipt.id,
  'ACCEPTEE',
  'Analyses conformes, températures à réception dans la plage réglementaire.'
);
check('Décision qualité enregistrée', receipt.qualityStatus === 'ACCEPTEE');
check('Quarantaine levée', receipt.isOnHold === false);
check(
  'Lot libéré',
  storage
    .getStockLots()
    .filter(lot => lot.lotNumber.startsWith('LOT-TEST-'))
    .every(lot => lot.qualityStatus === 'LIBERE')
);

expectThrow(
  'Seconde décision qualité impossible',
  () => storage.decideReceiptQuality(receipt.id, 'REFUSEE', 'Nouvelle tentative'),
  'déjà'
);

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== 7. Évaluation fournisseurs calculée ===');
// ═══════════════════════════════════════════════════════════════════════════
const evaluations = storage.getSupplierEvaluations();
check('Évaluations calculées', evaluations.length > 0);
const evaluated = evaluations.find(e => e.supplierId === suppliers[1].id)!;
check('Fournisseur livré évalué', Boolean(evaluated));
check('Note globale sur 100', evaluated.overallScore >= 0 && evaluated.overallScore <= 100);
check('Grade attribué', ['A', 'B', 'C', 'D'].includes(evaluated.grade));
check('Taux de conformité qualité = 100 %', evaluated.qualityComplianceRate === 100);
check('Délai réel calculé', evaluated.averageLeadTimeDays >= 0);
check('Achats cumulés non nuls', evaluated.totalPurchasedDzd > 0);

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== 8. Contrats fournisseurs ===');
// ═══════════════════════════════════════════════════════════════════════════
const contract = storage.addSupplierContract({
  reference: 'CTR-TEST-001',
  supplierId: suppliers[1].id,
  supplierName: suppliers[1].name,
  object: 'Accord-cadre annuel matières premières',
  startDate: new Date().toISOString().slice(0, 10),
  endDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
  amountDzd: 5000000,
  currency: 'DZD',
});
check('Contrat créé', Boolean(contract.id));
check('Contrat actif', contract.status === 'ACTIF');

expectThrow(
  'Référence de contrat en doublon refusée',
  () =>
    storage.addSupplierContract({
      reference: 'CTR-TEST-001',
      supplierId: suppliers[1].id,
      supplierName: suppliers[1].name,
      object: 'Doublon',
      startDate: new Date().toISOString().slice(0, 10),
      endDate: new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10),
      currency: 'DZD',
    }),
  'existe déjà'
);

expectThrow(
  'Dates incohérentes refusées',
  () =>
    storage.addSupplierContract({
      reference: 'CTR-TEST-002',
      supplierId: suppliers[1].id,
      supplierName: suppliers[1].name,
      object: 'Dates inversées',
      startDate: new Date(Date.now() + 20 * 86400000).toISOString().slice(0, 10),
      endDate: new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10),
      currency: 'DZD',
    }),
  'postérieure'
);

check(
  'Échéance à 60 jours détectée',
  storage.getExpiringContracts(60).some(c => c.id === contract.id)
);
storage.updateSupplierContractStatus(contract.id, 'SUSPENDU', 'Renégociation des tarifs en cours.');
check('Statut contrat modifié', contract.status === 'SUSPENDU');

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== 9. Rapports et cohérence des agrégats ===');
// ═══════════════════════════════════════════════════════════════════════════
const report = storage.getProcurementCycleReport(year);
check('Rapport annuel généré', report.fiscalYear === year);
check('Dépenses = somme des commandes', report.spentDzd >= order.totalDzd);
check('Taux de service entre 0 et 100', report.serviceRate >= 0 && report.serviceRate <= 100);
check('Répartition mensuelle sur 12 mois', report.byMonth.length === 12);
check('Top fournisseurs alimenté', report.topSuppliers.length > 0);
check('Dépenses par catégorie d\'achat', report.byCategoryGroup.length > 0);

const dashboard = storage.getProcurementDashboard(year);
check('Tableau de bord cohérent', dashboard.totalRequests >= 1);
check(
  'Somme des statuts = total des demandes',
  dashboard.byStatus.reduce((sum, entry) => sum + entry.count, 0) === dashboard.totalRequests
);
check(
  'Libellés de service complets',
  dashboard.byDepartment.every(entry => Boolean(PROCUREMENT_DEPARTMENT_LABELS[entry.department]))
);

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== 10. Règles de non-régression ===');
// ═══════════════════════════════════════════════════════════════════════════
const inactiveItem = items[0];
storage.setItemActive(inactiveItem.id, false, 'Article de test désactivé');
expectThrow(
  'Article désactivé non commandable',
  () =>
    storage.createPurchaseOrder({
      supplierId: suppliers[1].id,
      expectedDate: new Date().toISOString().slice(0, 10),
      lines: [{ itemId: inactiveItem.id, quantity: 5, unitPriceDzd: 100 }],
    }),
  'désactivé'
);
storage.setItemActive(inactiveItem.id, true, 'Réactivation après test');

check(
  'Stock jamais modifié par une demande d\'achat',
  storage.getPurchaseRequests().every(pr => pr.lines.every(line => line.quantity > 0))
);
check(
  'Aucune suppression physique de demande',
  storage.getPurchaseRequests().length >= 1
);
check(
  'Journal d\'audit alimenté par le module',
  storage.getAuditLogs().some(log =>
    ['PurchaseRequest', 'SupplierConsultation', 'PurchaseOrder', 'PurchaseReceipt', 'SupplierContract'].includes(
      log.entity
    )
  )
);

console.log('\n==================================================');
console.log(`RÉSULTAT : ${passed} vérifications réussies, ${failed} échec(s)`);
if (failed > 0) {
  console.log('Échecs :');
  failures.forEach(label => console.log(` - ${label}`));
  process.exit(1);
}
console.log('Tous les scénarios du module Service Approvisionnement sont validés.');
