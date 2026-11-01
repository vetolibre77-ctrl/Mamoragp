/**
 * Harnais de test fonctionnel du référentiel Matières Premières & Composants.
 * Exécuté hors navigateur avec un stockage local simulé, sur le service réel.
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
const { ITEM_CATEGORY_LABELS } = await import('../src/types');

const admin = storage.getUsers().find(u => u.role === 'ADMIN')!;
storage.setCurrentUser(admin);

console.log('\n=== 0. Migration non destructive du référentiel existant ===');
const initialItems = storage.getItems();
check('Articles historiques conservés', initialItems.length >= 20, `${initialItems.length} articles`);
check(
  'Tous les articles ont un statut explicite',
  initialItems.every(item => item.isActive !== undefined)
);
check(
  'Tous les articles ont un groupe fonctionnel',
  initialItems.every(item => Boolean(item.group))
);
check('Sous-catégories initialisées', storage.getItemSubCategories().length >= 10);
check(
  'Codes historiques inchangés',
  initialItems.some(item => item.code === 'MP-THON-ALB') &&
    initialItems.some(item => item.code === 'ING-HUILE-OLIV')
);

console.log('\n=== 1. Création d\'un article ===');
const created = storage.createItemProfile({
  code: 'MP-TEST-001',
  designation: 'Concentré de tomate 28-30 Brix (jeu de test)',
  secondaryDesignation: 'Double concentré',
  category: 'SAUCE_EPICES',
  unit: 'KG',
  secondaryUnit: 'UNITE',
  conversionCoefficient: 240,
  packaging: 'Fût aseptique 240 kg',
  quantityPerPackaging: 240,
  minStockLevel: 500,
  maxStockLevel: 5000,
  storageCondition: 'Fûts aseptiques ≤ 18°C',
  shelfLifeMonths: 24,
  allergens: 'Aucun',
  mandatoryDocuments: ['Certificat sanitaire', 'Fiche technique fournisseur'],
  technicalSpecifications: 'Brix 28-30, pH < 4,4',
  receiptControlRequirements: 'Contrôle température et scellés',
});
check('Article créé avec un identifiant', Boolean(created.id));
check(
  'Groupe fonctionnel déduit de la catégorie',
  created.group === 'INGREDIENTS_ADDITIFS',
  String(created.group)
);
check('Statut actif par défaut', created.isActive === true);
check('Coefficient de conversion enregistré', created.conversionCoefficient === 240);
check('Documents obligatoires enregistrés', created.mandatoryDocuments?.length === 2);
check(
  'Disponible immédiatement en nomenclature',
  storage.getItemsForNomenclature().some(item => item.id === created.id)
);
check(
  'Trace de création dans l\'historique',
  storage.getItemChangeLogs({ itemId: created.id }).some(log => log.action === 'CREATE')
);
const autoCode = storage.nextItemCode('EMBALLAGES_PRIMAIRES');
check(
  'Code auto proposé et libre',
  /^EMB-\d{4}$/.test(autoCode) && !storage.getItems().some(i => i.code === autoCode),
  autoCode
);

console.log('\n=== 2. Création avec code déjà existant ===');
expectThrow(
  'Code en doublon refusé',
  () =>
    storage.createItemProfile({
      code: 'MP-TEST-001',
      designation: 'Autre article',
      category: 'HUILE',
      unit: 'KG',
    }),
  'déjà utilisé'
);
expectThrow(
  'Code en doublon insensible à la casse refusé',
  () =>
    storage.createItemProfile({
      code: 'mp-test-001',
      designation: 'Autre article bis',
      category: 'HUILE',
      unit: 'KG',
    }),
  'déjà utilisé'
);
expectThrow(
  'Code historique en doublon refusé',
  () =>
    storage.createItemProfile({
      code: 'MP-THON-ALB',
      designation: 'Poisson dupliqué',
      category: 'POISSON_CONGELE',
      unit: 'KG',
    }),
  'déjà utilisé'
);
expectThrow(
  'Doublon de désignation dans la même catégorie refusé',
  () =>
    storage.createItemProfile({
      code: 'MP-TEST-002',
      designation: 'Concentré de tomate 28-30 Brix (jeu de test)',
      category: 'SAUCE_EPICES',
      unit: 'KG',
    }),
  'doublon'
);
expectThrow(
  'Désignation obligatoire',
  () => storage.createItemProfile({ code: 'MP-TEST-003', designation: ' ', category: 'HUILE', unit: 'KG' }),
  'obligatoire'
);
expectThrow(
  'Catégorie obligatoire',
  () =>
    storage.createItemProfile({
      code: 'MP-TEST-004',
      designation: 'Article sans catégorie',
      category: '' as any,
      unit: 'KG',
    }),
  'catégorie'
);

console.log('\n=== 3. Conversions d\'unités ===');
expectThrow(
  'Coefficient nul refusé',
  () =>
    storage.createItemProfile({
      code: 'MP-TEST-010',
      designation: 'Article coefficient nul',
      category: 'HUILE',
      unit: 'KG',
      secondaryUnit: 'UNITE',
      conversionCoefficient: 0,
    }),
  'strictement positif'
);
expectThrow(
  'Coefficient négatif refusé',
  () =>
    storage.createItemProfile({
      code: 'MP-TEST-011',
      designation: 'Article coefficient négatif',
      category: 'HUILE',
      unit: 'KG',
      secondaryUnit: 'UNITE',
      conversionCoefficient: -5,
    }),
  'strictement positif'
);
expectThrow(
  'Unité secondaire identique à l\'unité principale refusée',
  () =>
    storage.createItemProfile({
      code: 'MP-TEST-012',
      designation: 'Article unité identique',
      category: 'HUILE',
      unit: 'KG',
      secondaryUnit: 'KG',
      conversionCoefficient: 1,
    }),
  'différente'
);
expectThrow(
  'Conditionnement sans quantité refusé',
  () =>
    storage.createItemProfile({
      code: 'MP-TEST-013',
      designation: 'Article conditionnement incomplet',
      category: 'HUILE',
      unit: 'KG',
      packaging: 'Fût 240 kg',
    }),
  'quantité par conditionnement'
);
expectThrow(
  'Stock maximum inférieur au minimum refusé',
  () =>
    storage.createItemProfile({
      code: 'MP-TEST-014',
      designation: 'Article seuils incohérents',
      category: 'HUILE',
      unit: 'KG',
      minStockLevel: 100,
      maxStockLevel: 50,
    }),
  'maximum'
);

console.log('\n=== 4. Modification et historique ===');
const logsBefore = storage.getItemChangeLogs({ itemId: created.id }).length;
const updated = storage.updateItemProfile(
  created.id,
  {
    designation: 'Concentré de tomate 30-32 Brix (jeu de test)',
    minStockLevel: 800,
    allergens: 'Aucun allergène déclaré',
  },
  { motive: 'Révision de la spécification fournisseur' }
);
const logsAfter = storage.getItemChangeLogs({ itemId: created.id });
check('Désignation modifiée', updated.designation.includes('30-32'));
check('Stock minimum modifié', updated.minStockLevel === 800);
check('Trois champs historisés', logsAfter.length === logsBefore + 3, `${logsAfter.length - logsBefore}`);
const designationLog = logsAfter.find(log => log.field === 'designation');
check(
  'Ancienne et nouvelle valeur historisées',
  Boolean(designationLog?.oldValue.includes('28-30') && designationLog?.newValue.includes('30-32')),
  `${designationLog?.oldValue} → ${designationLog?.newValue}`
);
check('Utilisateur historisé', designationLog?.userName === admin.name);
check('Date et heure historisées', Boolean(designationLog?.timestamp));
check('Motif historisé', designationLog?.motive === 'Révision de la spécification fournisseur');
check(
  'Date de dernière modification mise à jour',
  Boolean(updated.updatedAt && updated.updatedBy?.includes(admin.name))
);

console.log('\n=== 5. Article déjà utilisé dans une nomenclature ===');
const usedRecipe = storage
  .getRecipes()
  .find(recipe => recipe.ingredients.length > 0 && recipe.status === 'VALIDEE')
  ?? storage.getRecipes().find(recipe => recipe.ingredients.length > 0);
const usedItemId = usedRecipe?.ingredients[0]?.itemId;
const usedItem = usedItemId ? storage.getItemById(usedItemId) : undefined;
check('Article de nomenclature identifié', Boolean(usedItem), usedRecipe?.code);
if (usedItem) {
  const usage = storage.getItemUsage(usedItem.id);
  check('Usage détecté (nomenclature)', usage.recipeCount > 0, `${usage.recipeCount} nomenclature(s)`);
  expectThrow(
    'Changement de code refusé sur article utilisé',
    () => storage.updateItemProfile(usedItem.id, { code: 'CODE-INTERDIT-01' }),
    'non modifiable'
  );
  const stillOk = storage.updateItemProfile(usedItem.id, {
    storageCondition: usedItem.storageCondition || 'Conditions maintenues',
    minStockLevel: usedItem.minStockLevel,
  });
  check('Modification des autres champs autorisée', stillOk.code === usedItem.code);
  check(
    'Nomenclature validée préservée',
    storage.getRecipeById(usedRecipe!.id)?.ingredients[0]?.itemCode === usedItem.code
  );
}

console.log('\n=== 6. Désactivation / consultation d\'un article inactif ===');
expectThrow(
  'Désactivation sans motif refusée',
  () => storage.setItemActive(created.id, false, ''),
  'motif'
);
const deactivated = storage.setItemActive(created.id, false, 'Référence remplacée par MP-TEST-020');
check('Article désactivé', deactivated.isActive === false);
check('Date et auteur de désactivation conservés', Boolean(deactivated.deactivatedAt && deactivated.deactivatedBy));
check(
  'Article inactif retiré des nouvelles nomenclatures',
  !storage.getItemsForNomenclature().some(item => item.id === created.id)
);
check('Article inactif toujours consultable', storage.getItemById(created.id)?.code === 'MP-TEST-001');
check(
  'Désactivation historisée',
  storage.getItemChangeLogs({ itemId: created.id }).some(log => log.action === 'DEACTIVATE')
);
expectThrow(
  'Double désactivation refusée',
  () => storage.setItemActive(created.id, false, 'Doublon'),
  'déjà inactif'
);
const reactivated = storage.setItemActive(created.id, true, 'Retour au catalogue');
check('Réactivation effective', reactivated.isActive === true && !reactivated.deactivatedAt);
check(
  'Réactivation historisée',
  storage.getItemChangeLogs({ itemId: created.id }).some(log => log.action === 'REACTIVATE')
);

console.log('\n=== 7. Association à plusieurs magasins ===');
const warehouses = storage.getWarehouses(false).filter(w => w.isActive);
const rawWarehouse = warehouses.find(w => w.type === 'MATIERES_PREMIERES')!;
const packWarehouse = warehouses.find(w => w.type === 'EMBALLAGES')!;
storage.updateItemProfile(created.id, { defaultWarehouseId: rawWarehouse.id });
storage.addStockMovement({
  itemId: created.id,
  itemCode: created.code,
  batchNumber: 'LOT-TEST-A',
  type: 'ENTREE_RECEPTION',
  quantity: 100,
  unit: 'KG',
  destinationWarehouseId: rawWarehouse.id,
  qualityStatus: 'LIBERE',
  userId: admin.id,
  userName: admin.name,
  reason: 'Test multi-magasins',
});
storage.addStockMovement({
  itemId: created.id,
  itemCode: created.code,
  batchNumber: 'LOT-TEST-B',
  type: 'ENTREE_RECEPTION',
  quantity: 50,
  unit: 'KG',
  destinationWarehouseId: packWarehouse.id,
  qualityStatus: 'LIBERE',
  userId: admin.id,
  userName: admin.name,
  reason: 'Test multi-magasins',
});
const consolidated = storage.getConsolidatedStockForItem(created.id);
check('Stock consolidé sur deux magasins', consolidated?.physical === 150, String(consolidated?.physical));
check(
  'Deux lignes de magasin distinctes',
  (consolidated?.byWarehouse || []).filter(row => row.physical > 0).length === 2
);
check(
  'Magasin par défaut purement indicatif (stock présent ailleurs)',
  (consolidated?.byWarehouse || []).some(
    row => row.warehouseId === packWarehouse.id && row.physical === 50
  )
);
check(
  'Fiche article sans effet sur les quantités',
  storage.getItemById(created.id)?.currentStock === 150
);
expectThrow(
  'Changement de code refusé après mouvement de stock',
  () => storage.updateItemProfile(created.id, { code: 'MP-TEST-999' }),
  'non modifiable'
);

console.log('\n=== 8. Historique global ===');
const globalLogs = storage.getItemChangeLogs({ limit: 500 });
check('Journal global alimenté', globalLogs.length > 5, `${globalLogs.length} lignes`);
check(
  'Journal trié du plus récent au plus ancien',
  globalLogs.every((log, index) => index === 0 || globalLogs[index - 1].timestamp >= log.timestamp)
);
check(
  'Recherche dans le journal',
  storage.getItemChangeLogs({ search: 'MP-TEST-001' }).length > 0
);
check(
  'Filtre par type d\'opération',
  storage.getItemChangeLogs({ action: 'DEACTIVATE' }).every(log => log.action === 'DEACTIVATE')
);

console.log('\n=== 9. Habilitations par profil ===');
const magasinier = storage.getUsers().find(u => u.role === 'MAGASINIER')!;
storage.setCurrentUser(magasinier);
check('Magasinier : consultation autorisée', storage.canItem('ITEM_VIEW'));
check('Magasinier : création refusée', !storage.canItem('ITEM_CREATE'));
expectThrow(
  'Création refusée au magasinier',
  () =>
    storage.createItemProfile({
      code: 'MP-TEST-030',
      designation: 'Article interdit',
      category: 'HUILE',
      unit: 'KG',
    }),
  'habilitation'
);
expectThrow(
  'Désactivation refusée au magasinier',
  () => storage.setItemActive(created.id, false, 'Tentative non habilitée'),
  'habilitation'
);
const chefDeLigne = storage.getUsers().find(u => u.role === 'CHEF_DE_LIGNE')!;
storage.setCurrentUser(chefDeLigne);
check('Chef de ligne : historique refusé', !storage.canItem('ITEM_HISTORY_VIEW'));
check('Chef de ligne : modification refusée', !storage.canItem('ITEM_EDIT'));
const qualite = storage.getUsers().find(u => u.role === 'RESPONSABLE_QUALITE')!;
storage.setCurrentUser(qualite);
check('Responsable qualité : gestion des catégories', storage.canItem('ITEM_CATEGORY_MANAGE'));
check('Responsable qualité : gestion des fournisseurs', storage.canItem('ITEM_SUPPLIER_MANAGE'));
const production = storage.getUsers().find(u => u.role === 'RESPONSABLE_PRODUCTION')!;
storage.setCurrentUser(production);
check('Responsable production : unités autorisées', storage.canItem('ITEM_UNIT_MANAGE'));
check('Responsable production : catégories refusées', !storage.canItem('ITEM_CATEGORY_MANAGE'));

console.log('\n=== 10. Sous-catégories et fournisseurs ===');
storage.setCurrentUser(admin);
const sub = storage.addItemSubCategory({
  group: 'INGREDIENTS_ADDITIFS',
  code: 'ING-TEST',
  designation: 'Ingrédients de test',
});
check('Sous-catégorie créée', sub.group === 'INGREDIENTS_ADDITIFS' && sub.isActive);
expectThrow(
  'Sous-catégorie en doublon refusée',
  () =>
    storage.addItemSubCategory({
      group: 'INGREDIENTS_ADDITIFS',
      code: 'ING-TEST',
      designation: 'Doublon',
    }),
  'existe déjà'
);
expectThrow(
  'Sous-catégorie d\'un autre groupe refusée sur la fiche',
  () =>
    storage.updateItemProfile(created.id, {
      group: 'EMBALLAGES_PRIMAIRES',
      subCategoryId: sub.id,
    }),
  'appartient au groupe'
);
const supplier = storage.addSupplier({ name: 'Fournisseur Test SARL', contactName: 'M. Test' });
check('Fournisseur créé', supplier.origin === 'MANUEL' && supplier.isActive);
expectThrow(
  'Fournisseur en doublon refusé',
  () => storage.addSupplier({ name: 'Fournisseur Test SARL' }),
  'existe déjà'
);
const withSupplier = storage.updateItemProfile(created.id, {
  primarySupplierId: supplier.id,
  supplierRefs: [
    { supplierId: supplier.id, supplierName: supplier.name, supplierReference: 'REF-001', leadTimeDays: 15 },
  ],
});
check('Fournisseur principal associé', withSupplier.primarySupplierId === supplier.id);
check('Référence et délai enregistrés', withSupplier.supplierRefs?.[0]?.leadTimeDays === 15);
check(
  'Association fournisseur historisée',
  storage
    .getItemChangeLogs({ itemId: created.id })
    .some(log => log.field === 'primarySupplierId' && log.newValue.includes('Fournisseur Test'))
);

console.log('\n=== 11. Intégrité du référentiel après opérations ===');
check('Aucun article supprimé physiquement', storage.getItems().some(i => i.id === created.id));
check(
  'Codes articles toujours uniques',
  new Set(storage.getItems().map(i => i.code.toUpperCase())).size === storage.getItems().length
);
check(
  'Libellés de catégorie complets',
  storage.getItems().every(item => Boolean(ITEM_CATEGORY_LABELS[item.category]))
);
check(
  'Nomenclatures validées préservées',
  storage.getRecipes().filter(r => r.status === 'VALIDEE').length > 0
);

console.log('\n==================================================');
console.log(`RÉSULTAT : ${passed} vérifications réussies, ${failed} échec(s)`);
if (failed > 0) {
  console.log('Échecs :');
  failures.forEach(label => console.log(` - ${label}`));
  process.exit(1);
}
console.log('Tous les scénarios du cahier des charges sont validés.');
