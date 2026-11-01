/**
 * MAMORA BI — Catalogue analytique.
 *
 * Source unique de vérité pour :
 *  - les sources autorisées (liste blanche) ;
 *  - les dimensions et mesures exposées à l'explorateur ;
 *  - les mesures documentées utilisées par les KPI et l'AI Analyst ;
 *  - les dashboards et KPI livrés par défaut.
 *
 * Aucune requête SQL libre, aucun champ hors catalogue ne peut être interrogé.
 */

import {
  BiAlertRule,
  BiDashboard,
  BiDashboardCategory,
  BiFieldDefinition,
  BiKpi,
  BiMeasureDefinition,
  BiSourceDefinition,
  BiSourceId,
  BiValueFormat,
  BiWidget,
  BiWidgetType,
} from '../../types';

// ---------------------------------------------------------------------------
// Helpers de construction
// ---------------------------------------------------------------------------

const dim = (
  key: string,
  label: string,
  type: 'string' | 'number' | 'date' | 'boolean' = 'string',
  group = 'Dimensions',
  description?: string
): BiFieldDefinition => ({ key, label, type, role: 'DIMENSION', group, description });

const measure = (
  key: string,
  label: string,
  field: string,
  aggregation: 'SUM' | 'COUNT' | 'AVG' | 'MIN' | 'MAX' | 'RATIO',
  unit: string,
  format: BiValueFormat,
  group = 'Mesures',
  description?: string,
  numerator?: string,
  denominator?: string
): BiFieldDefinition => ({
  key,
  label,
  type: 'number',
  role: 'MEASURE',
  aggregation,
  field,
  numerator,
  denominator,
  unit,
  format,
  group,
  description,
});

/** Dimensions calendrier communes à toutes les sources datées. */
export const CALENDAR_DIMENSIONS: BiFieldDefinition[] = [
  dim('date', 'Date', 'date', 'Calendrier', 'Date de l’événement au format ISO (AAAA-MM-JJ).'),
  dim('day', 'Jour', 'number', 'Calendrier'),
  dim('week', 'Semaine ISO', 'string', 'Calendrier'),
  dim('month', 'Mois (AAAA-MM)', 'string', 'Calendrier'),
  dim('monthLabel', 'Mois (libellé)', 'string', 'Calendrier'),
  dim('quarter', 'Trimestre', 'string', 'Calendrier'),
  dim('year', 'Année', 'number', 'Calendrier'),
  dim('yearMonthLabel', 'Année / mois', 'string', 'Calendrier'),
];

const CALENDAR_KEYS = CALENDAR_DIMENSIONS.map(field => field.key);

// ---------------------------------------------------------------------------
// Sources analytiques
// ---------------------------------------------------------------------------

const productionFields: BiFieldDefinition[] = [
  ...CALENDAR_DIMENSIONS,
  dim('itemId', 'Identifiant produit', 'string', 'Produit'),
  dim('itemCode', 'Code produit', 'string', 'Produit'),
  dim('productName', 'Produit fini', 'string', 'Produit'),
  dim('format', 'Format', 'string', 'Produit'),
  dim('workOrderId', 'Identifiant OF', 'string', 'Production'),
  dim('orderNumber', 'Ordre de fabrication', 'string', 'Production'),
  dim('lineId', 'Ligne de production', 'string', 'Production'),
  dim('shift', 'Équipe', 'string', 'Production'),
  dim('releaseStatus', 'Statut de libération', 'string', 'Qualité'),
  dim('batchNumber', 'Lot fini', 'string', 'Traçabilité'),
  measure('totalCans', 'Boîtes produites', 'totalCans', 'SUM', 'boîtes', 'QUANTITY', 'Production'),
  measure('conformingCans', 'Boîtes conformes', 'conformingCans', 'SUM', 'boîtes', 'QUANTITY', 'Production'),
  measure('rejectedCans', 'Boîtes rejetées', 'rejectedCans', 'SUM', 'boîtes', 'QUANTITY', 'Production'),
  measure('cartons', 'Cartons produits', 'cartons', 'SUM', 'cartons', 'QUANTITY', 'Production'),
  measure('batchCount', 'Nombre de lots', 'id', 'COUNT', 'lots', 'NUMBER', 'Production'),
  measure(
    'conformityRate', 'Taux de conformité', 'conformingCans', 'RATIO', '%', 'PERCENT',
    'Qualité', 'Boîtes conformes / boîtes produites × 100.', 'conformingCans', 'totalCans'
  ),
];

const productionTargetFields: BiFieldDefinition[] = [
  ...CALENDAR_DIMENSIONS,
  dim('itemId', 'Identifiant produit', 'string', 'Produit'),
  dim('itemCode', 'Code produit', 'string', 'Produit'),
  dim('productName', 'Produit fini', 'string', 'Produit'),
  dim('workOrderId', 'Identifiant OF', 'string', 'Production'),
  dim('orderNumber', 'Ordre de fabrication', 'string', 'Production'),
  dim('lineId', 'Ligne de production', 'string', 'Production'),
  dim('shift', 'Équipe', 'string', 'Production'),
  dim('status', 'Statut OF', 'string', 'Production'),
  measure('plannedCans', 'Production planifiée', 'plannedCans', 'SUM', 'boîtes', 'QUANTITY', 'Production'),
  measure('actualCans', 'Production réalisée', 'actualCans', 'SUM', 'boîtes', 'QUANTITY', 'Production'),
  measure('gapCans', 'Écart objectif / réalisé', 'gapCans', 'SUM', 'boîtes', 'QUANTITY', 'Production'),
  measure('orderCount', 'Nombre d’OF', 'id', 'COUNT', 'OF', 'NUMBER', 'Production'),
  measure(
    'realizationRate', 'Taux de réalisation', 'actualCans', 'RATIO', '%', 'PERCENT',
    'Production', 'Production réalisée / production planifiée × 100.', 'actualCans', 'plannedCans'
  ),
];

const consumptionFields: BiFieldDefinition[] = [
  ...CALENDAR_DIMENSIONS,
  dim('itemId', 'Identifiant article', 'string', 'Article'),
  dim('itemCode', 'Code article', 'string', 'Article'),
  dim('designation', 'Article consommé', 'string', 'Article'),
  dim('category', 'Catégorie article', 'string', 'Article'),
  dim('stepName', 'Étape de fabrication', 'string', 'Production'),
  dim('workOrderId', 'Identifiant OF', 'string', 'Production'),
  dim('orderNumber', 'Ordre de fabrication', 'string', 'Production'),
  dim('lineId', 'Ligne de production', 'string', 'Production'),
  dim('shift', 'Équipe', 'string', 'Production'),
  dim('batchNumber', 'Lot consommé', 'string', 'Traçabilité'),
  dim('status', 'Statut consommation', 'string', 'Production'),
  measure('actualConsumed', 'Consommation réelle', 'actualConsumed', 'SUM', 'unité article', 'QUANTITY', 'Consommation'),
  measure('theoreticalConsumed', 'Consommation théorique', 'theoretical', 'SUM', 'unité article', 'QUANTITY', 'Consommation'),
  measure('varianceQty', 'Écart de consommation', 'variance', 'SUM', 'unité article', 'QUANTITY', 'Consommation'),
  measure('wasteQty', 'Pertes de consommation', 'waste', 'SUM', 'unité article', 'QUANTITY', 'Consommation'),
  measure('withdrawnQty', 'Quantités sorties', 'withdrawn', 'SUM', 'unité article', 'QUANTITY', 'Consommation'),
  measure('returnedQty', 'Quantités retournées', 'returned', 'SUM', 'unité article', 'QUANTITY', 'Consommation'),
  measure('consumptionLineCount', 'Nombre de lignes', 'id', 'COUNT', 'lignes', 'NUMBER', 'Consommation'),
];

const stockFields: BiFieldDefinition[] = [
  dim('itemId', 'Identifiant article', 'string', 'Article'),
  dim('itemCode', 'Code article', 'string', 'Article'),
  dim('designation', 'Article', 'string', 'Article'),
  dim('category', 'Catégorie', 'string', 'Article'),
  dim('group', 'Groupe fonctionnel', 'string', 'Article'),
  dim('warehouseId', 'Identifiant magasin', 'string', 'Magasin'),
  dim('warehouseCode', 'Code magasin', 'string', 'Magasin'),
  dim('warehouseName', 'Magasin', 'string', 'Magasin'),
  dim('warehouseType', 'Type de magasin', 'string', 'Magasin'),
  dim('lotId', 'Identifiant lot', 'string', 'Lot'),
  dim('lotNumber', 'Lot', 'string', 'Lot'),
  dim('qualityStatus', 'Statut qualité', 'string', 'Qualité'),
  dim('expiryDate', 'Date limite', 'date', 'Qualité'),
  dim('expiryBucket', 'Échéance', 'string', 'Qualité'),
  measure('physicalQty', 'Stock physique', 'physicalQty', 'SUM', 'unité article', 'QUANTITY', 'Stock'),
  measure('availableQty', 'Stock disponible', 'availableQty', 'SUM', 'unité article', 'QUANTITY', 'Stock'),
  measure('reservedQty', 'Stock réservé', 'reservedQty', 'SUM', 'unité article', 'QUANTITY', 'Stock'),
  measure('quarantineQty', 'Stock en quarantaine', 'quarantineQty', 'SUM', 'unité article', 'QUANTITY', 'Qualité'),
  measure('blockedQty', 'Stock bloqué', 'blockedQty', 'SUM', 'unité article', 'QUANTITY', 'Qualité'),
  measure('pendingQty', 'Stock en attente de contrôle', 'pendingQty', 'SUM', 'unité article', 'QUANTITY', 'Qualité'),
  measure('transitQty', 'Stock en transit', 'transitQty', 'SUM', 'unité article', 'QUANTITY', 'Stock'),
  measure('belowMinCount', 'Articles sous le stock minimum', 'belowMin', 'SUM', 'articles', 'NUMBER', 'Stock'),
  measure('stockLotCount', 'Nombre de lots', 'id', 'COUNT', 'lots', 'NUMBER', 'Stock'),
];

const movementFields: BiFieldDefinition[] = [
  ...CALENDAR_DIMENSIONS,
  dim('itemId', 'Identifiant article', 'string', 'Article'),
  dim('itemCode', 'Code article', 'string', 'Article'),
  dim('designation', 'Article', 'string', 'Article'),
  dim('type', 'Type de mouvement', 'string', 'Mouvement'),
  dim('documentNumber', 'Document source', 'string', 'Mouvement'),
  dim('lotNumber', 'Lot', 'string', 'Traçabilité'),
  dim('sourceWarehouseCode', 'Magasin source', 'string', 'Magasin'),
  dim('destinationWarehouseCode', 'Magasin destination', 'string', 'Magasin'),
  dim('workOrderId', 'Identifiant OF', 'string', 'Production'),
  dim('userName', 'Opérateur', 'string', 'Gouvernance'),
  measure('movementQty', 'Quantité mouvementée', 'quantity', 'SUM', 'unité article', 'QUANTITY', 'Mouvement'),
  measure('stockDelta', 'Effet net sur le stock', 'stockDelta', 'SUM', 'unité article', 'QUANTITY', 'Mouvement'),
  measure('absoluteDelta', 'Volume mouvementé (valeur absolue)', 'absDelta', 'SUM', 'unité article', 'QUANTITY', 'Mouvement'),
  measure('movementCount', 'Nombre de mouvements', 'id', 'COUNT', 'mouvements', 'NUMBER', 'Mouvement'),
];

const qualityFields: BiFieldDefinition[] = [
  ...CALENDAR_DIMENSIONS,
  dim('ncNumber', 'Numéro NC', 'string', 'Non-conformité'),
  dim('origin', 'Origine', 'string', 'Non-conformité'),
  dim('severity', 'Gravité', 'string', 'Non-conformité'),
  dim('batchType', 'Type de lot', 'string', 'Non-conformité'),
  dim('affectedBatchId', 'Lot affecté', 'string', 'Traçabilité'),
  dim('isResolved', 'NC résolue', 'boolean', 'Non-conformité'),
  dim('finalDisposition', 'Décision finale', 'string', 'Non-conformité'),
  measure('ncCount', 'Nombre de non-conformités', 'id', 'COUNT', 'NC', 'NUMBER', 'Non-conformité'),
  measure('affectedQuantity', 'Quantité affectée', 'affectedQuantity', 'SUM', 'unité article', 'QUANTITY', 'Non-conformité'),
  measure('openNcCount', 'NC ouvertes', 'openFlag', 'SUM', 'NC', 'NUMBER', 'Non-conformité'),
  measure('resolvedNcCount', 'NC résolues', 'resolvedFlag', 'SUM', 'NC', 'NUMBER', 'Non-conformité'),
  measure('criticalNcCount', 'NC critiques', 'criticalFlag', 'SUM', 'NC', 'NUMBER', 'Non-conformité'),
];

const haccpFields: BiFieldDefinition[] = [
  ...CALENDAR_DIMENSIONS,
  dim('referenceId', 'Référence CCP / PRPo', 'string', 'HACCP'),
  dim('type', 'Type', 'string', 'HACCP'),
  dim('pointName', 'Point de surveillance', 'string', 'HACCP'),
  dim('stepName', 'Étape', 'string', 'HACCP'),
  dim('parameterName', 'Paramètre', 'string', 'HACCP'),
  dim('isCompliant', 'Conforme', 'boolean', 'HACCP'),
  dim('operatorName', 'Opérateur', 'string', 'Gouvernance'),
  measure('haccpCount', 'Nombre de contrôles', 'id', 'COUNT', 'contrôles', 'NUMBER', 'HACCP'),
  measure('haccpDeviationCount', 'Contrôles non conformes', 'deviationFlag', 'SUM', 'contrôles', 'NUMBER', 'HACCP'),
  measure('measuredValue', 'Valeur mesurée moyenne', 'measuredValue', 'AVG', 'unité paramètre', 'DECIMAL', 'HACCP'),
];

const purchaseOrderFields: BiFieldDefinition[] = [
  ...CALENDAR_DIMENSIONS,
  dim('orderNumber', 'Commande', 'string', 'Commande'),
  dim('supplierId', 'Identifiant fournisseur', 'string', 'Fournisseur'),
  dim('supplierName', 'Fournisseur', 'string', 'Fournisseur'),
  dim('status', 'Statut commande', 'string', 'Commande'),
  dim('itemId', 'Identifiant article', 'string', 'Article'),
  dim('itemCode', 'Code article', 'string', 'Article'),
  dim('designation', 'Article', 'string', 'Article'),
  dim('deliveryWarehouseCode', 'Magasin de livraison', 'string', 'Magasin'),
  measure('orderedQty', 'Quantité commandée', 'orderedQty', 'SUM', 'unité article', 'QUANTITY', 'Achats'),
  measure('receivedQtyPo', 'Quantité reçue', 'receivedQty', 'SUM', 'unité article', 'QUANTITY', 'Achats'),
  measure('purchaseAmount', 'Montant commandé', 'amountDzd', 'SUM', 'DZD', 'CURRENCY', 'Achats'),
  measure('orderCount', 'Nombre de commandes', 'orderLineId', 'COUNT', 'lignes', 'NUMBER', 'Achats'),
  measure('lateDays', 'Jours de retard cumulés', 'lateDays', 'SUM', 'jours', 'NUMBER', 'Achats'),
];

const purchaseReceiptFields: BiFieldDefinition[] = [
  ...CALENDAR_DIMENSIONS,
  dim('receiptNumber', 'Réception', 'string', 'Réception'),
  dim('orderNumber', 'Commande', 'string', 'Commande'),
  dim('supplierId', 'Identifiant fournisseur', 'string', 'Fournisseur'),
  dim('supplierName', 'Fournisseur', 'string', 'Fournisseur'),
  dim('qualityStatus', 'Statut qualité', 'string', 'Qualité'),
  dim('itemId', 'Identifiant article', 'string', 'Article'),
  dim('itemCode', 'Code article', 'string', 'Article'),
  dim('designation', 'Article', 'string', 'Article'),
  dim('warehouseCode', 'Magasin', 'string', 'Magasin'),
  measure('receiptQty', 'Quantité réceptionnée', 'receivedQty', 'SUM', 'unité article', 'QUANTITY', 'Réception'),
  measure('acceptedQty', 'Quantité acceptée', 'acceptedQty', 'SUM', 'unité article', 'QUANTITY', 'Réception'),
  measure('rejectedQty', 'Quantité refusée', 'rejectedQty', 'SUM', 'unité article', 'QUANTITY', 'Réception'),
  measure('receiptAmount', 'Montant réceptionné', 'amountDzd', 'SUM', 'DZD', 'CURRENCY', 'Réception'),
  measure('receiptCount', 'Nombre de réceptions', 'receiptLineId', 'COUNT', 'lignes', 'NUMBER', 'Réception'),
  measure(
    'receiptQualityRate', 'Taux d’acceptation', 'acceptedQty', 'RATIO', '%', 'PERCENT',
    'Réception', 'Quantité acceptée / quantité reçue × 100.', 'acceptedQty', 'receivedQty'
  ),
];

const salesFields: BiFieldDefinition[] = [
  ...CALENDAR_DIMENSIONS,
  dim('invoiceNumber', 'Facture', 'string', 'Facture'),
  dim('customerId', 'Identifiant client', 'string', 'Client'),
  dim('customerName', 'Client', 'string', 'Client'),
  dim('paymentStatus', 'Statut de paiement', 'string', 'Facture'),
  measure('revenueTotal', 'Chiffre d’affaires', 'totalDzd', 'SUM', 'DZD', 'CURRENCY', 'Commercial'),
  measure('revenuePaid', 'Montant encaissé', 'paidDzd', 'SUM', 'DZD', 'CURRENCY', 'Commercial'),
  measure('revenueUnpaid', 'Montant impayé', 'unpaidDzd', 'SUM', 'DZD', 'CURRENCY', 'Commercial'),
  measure('invoiceCount', 'Nombre de factures', 'id', 'COUNT', 'factures', 'NUMBER', 'Commercial'),
  measure(
    'collectionRate', 'Taux d’encaissement', 'paidDzd', 'RATIO', '%', 'PERCENT',
    'Commercial', 'Montant encaissé / chiffre d’affaires × 100.', 'paidDzd', 'totalDzd'
  ),
];

const maintenanceFields: BiFieldDefinition[] = [
  dim('equipmentCode', 'Code équipement', 'string', 'Équipement'),
  dim('equipmentName', 'Équipement', 'string', 'Équipement'),
  dim('line', 'Ligne', 'string', 'Équipement'),
  dim('equipmentType', 'Type', 'string', 'Équipement'),
  dim('status', 'Statut', 'string', 'Équipement'),
  dim('nextPreventiveMaintenanceDate', 'Prochaine maintenance', 'date', 'Maintenance'),
  measure('equipmentCount', 'Nombre d’équipements', 'id', 'COUNT', 'équipements', 'NUMBER', 'Maintenance'),
  measure('maintenanceOverdueCount', 'Maintenances en retard', 'overdueFlag', 'SUM', 'équipements', 'NUMBER', 'Maintenance'),
  measure('daysToMaintenance', 'Jours avant maintenance', 'daysToMaintenance', 'AVG', 'jours', 'NUMBER', 'Maintenance'),
];

export const BI_SOURCES: Record<BiSourceId, BiSourceDefinition> = {
  production: {
    id: 'production',
    label: 'Production réalisée (lots finis)',
    description: 'Un enregistrement par lot de production fini. Source canonique de la production réelle.',
    domain: 'PRODUCTION',
    fields: productionFields,
    defaultDimensions: ['monthLabel'],
    defaultMeasures: ['totalCans', 'conformingCans'],
    permission: 'BI_VIEW',
    department: 'PRODUCTION',
  },
  production_target: {
    id: 'production_target',
    label: 'Objectifs de production (OF)',
    description: 'Un enregistrement par ordre de fabrication. Source canonique de la production planifiée.',
    domain: 'PRODUCTION',
    fields: productionTargetFields,
    defaultDimensions: ['monthLabel'],
    defaultMeasures: ['plannedCans', 'actualCans'],
    permission: 'BI_VIEW',
    department: 'PRODUCTION',
  },
  consumption: {
    id: 'consumption',
    label: 'Consommations réelles',
    description: 'Une ligne par article consommé dans une fiche de consommation validée.',
    domain: 'PRODUCTION',
    fields: consumptionFields,
    defaultDimensions: ['monthLabel'],
    defaultMeasures: ['actualConsumed', 'theoreticalConsumed'],
    permission: 'BI_VIEW',
    department: 'PRODUCTION',
  },
  stock: {
    id: 'stock',
    label: 'Stocks par lot et magasin',
    description: 'Soldes physiques actuels par lot, magasin et statut qualité, complétés par les quantités en transit.',
    domain: 'STOCK',
    fields: stockFields,
    defaultDimensions: ['warehouseCode'],
    defaultMeasures: ['physicalQty', 'availableQty'],
    permission: 'BI_VIEW',
    warehouseField: 'warehouseId',
    department: 'MAGASIN_MP',
  },
  movement: {
    id: 'movement',
    label: 'Mouvements de stock',
    description: 'Grand livre unique des mouvements. Utilisé pour les entrées, sorties, transferts et ajustements.',
    domain: 'STOCK',
    fields: movementFields,
    defaultDimensions: ['monthLabel', 'type'],
    defaultMeasures: ['movementQty', 'movementCount'],
    permission: 'BI_VIEW',
    warehouseField: 'warehouseId',
    department: 'MAGASIN_MP',
  },
  quality: {
    id: 'quality',
    label: 'Non-conformités',
    description: 'Non-conformités qualité avec origine, gravité, quantité affectée et statut de résolution.',
    domain: 'QUALITE',
    fields: qualityFields,
    defaultDimensions: ['monthLabel'],
    defaultMeasures: ['ncCount', 'openNcCount'],
    permission: 'BI_VIEW',
    department: 'QUALITE',
  },
  haccp: {
    id: 'haccp',
    label: 'Surveillance HACCP',
    description: 'Contrôles CCP / PRPo et leur conformité.',
    domain: 'QUALITE',
    fields: haccpFields,
    defaultDimensions: ['monthLabel'],
    defaultMeasures: ['haccpCount', 'haccpDeviationCount'],
    permission: 'BI_VIEW',
    department: 'QUALITE',
  },
  purchase_order: {
    id: 'purchase_order',
    label: 'Commandes d’achat',
    description: 'Lignes de commandes d’achat, montants engagés et retards.',
    domain: 'APPROVISIONNEMENT',
    fields: purchaseOrderFields,
    defaultDimensions: ['monthLabel', 'supplierName'],
    defaultMeasures: ['purchaseAmount', 'orderedQty'],
    permission: 'BI_VIEW',
    department: 'APPROVISIONNEMENT',
  },
  purchase_receipt: {
    id: 'purchase_receipt',
    label: 'Réceptions d’achat',
    description: 'Lignes de réceptions fournisseurs avec quantités reçues, acceptées et refusées.',
    domain: 'APPROVISIONNEMENT',
    fields: purchaseReceiptFields,
    defaultDimensions: ['monthLabel', 'supplierName'],
    defaultMeasures: ['receiptQty', 'acceptedQty'],
    permission: 'BI_VIEW',
    warehouseField: 'warehouseId',
    department: 'APPROVISIONNEMENT',
  },
  sales: {
    id: 'sales',
    label: 'Facturation commerciale',
    description: 'Factures clients, chiffre d’affaires et encaissements.',
    domain: 'COMMERCIAL',
    fields: salesFields,
    defaultDimensions: ['monthLabel'],
    defaultMeasures: ['revenueTotal', 'revenuePaid'],
    permission: 'BI_VIEW',
    department: 'COMMERCIAL',
  },
  maintenance: {
    id: 'maintenance',
    label: 'Équipements & maintenance',
    description: 'Parc équipements, statuts et échéances de maintenance préventive.',
    domain: 'MAINTENANCE',
    fields: maintenanceFields,
    defaultDimensions: ['line'],
    defaultMeasures: ['equipmentCount', 'maintenanceOverdueCount'],
    permission: 'BI_VIEW',
    department: 'MAINTENANCE',
  },
};

export const BI_SOURCE_LIST: BiSourceDefinition[] = Object.values(BI_SOURCES);

export const BI_SOURCE_LABELS: Record<BiSourceId, string> = BI_SOURCE_LIST.reduce(
  (acc, source) => ({ ...acc, [source.id]: source.label }),
  {} as Record<BiSourceId, string>
);

/** Vérifie qu'un champ est bien autorisé pour une source. */
export function getBiField(source: BiSourceId, key: string): BiFieldDefinition | undefined {
  return BI_SOURCES[source]?.fields.find(field => field.key === key);
}

// ---------------------------------------------------------------------------
// Mesures documentées (KPI, AI Analyst, alertes)
// ---------------------------------------------------------------------------

const defMeasure = (
  code: string,
  label: string,
  description: string,
  source: BiSourceId,
  field: string,
  aggregation: 'SUM' | 'COUNT' | 'AVG' | 'MIN' | 'MAX' | 'RATIO',
  unit: string,
  format: BiValueFormat,
  numerator?: string,
  denominator?: string
): BiMeasureDefinition => ({
  code,
  label,
  description,
  source,
  field,
  aggregation,
  numerator,
  denominator,
  unit,
  format,
  permission: 'BI_VIEW',
});

export const BI_MEASURES: Record<string, BiMeasureDefinition> = {
  PROD_TOTAL: defMeasure(
    'PROD_TOTAL', 'Production totale', 'Somme des boîtes produites sur les lots finis.',
    'production', 'totalCans', 'SUM', 'boîtes', 'QUANTITY'
  ),
  PROD_CONFORME: defMeasure(
    'PROD_CONFORME', 'Production conforme', 'Somme des boîtes conformes des lots finis.',
    'production', 'conformingCans', 'SUM', 'boîtes', 'QUANTITY'
  ),
  PROD_REJETE: defMeasure(
    'PROD_REJETE', 'Production rejetée', 'Somme des boîtes rejetées des lots finis.',
    'production', 'rejectedCans', 'SUM', 'boîtes', 'QUANTITY'
  ),
  PROD_CARTONS: defMeasure(
    'PROD_CARTONS', 'Cartons produits', 'Somme des cartons produits.',
    'production', 'cartons', 'SUM', 'cartons', 'QUANTITY'
  ),
  PROD_LOTS: defMeasure(
    'PROD_LOTS', 'Lots produits', 'Nombre de lots finis enregistrés.',
    'production', 'id', 'COUNT', 'lots', 'NUMBER'
  ),
  TAUX_CONFORMITE: defMeasure(
    'TAUX_CONFORMITE', 'Taux de conformité', 'Boîtes conformes / boîtes produites × 100.',
    'production', 'conformingCans', 'RATIO', '%', 'PERCENT', 'conformingCans', 'totalCans'
  ),
  PROD_PLANIFIE: defMeasure(
    'PROD_PLANIFIE', 'Production planifiée', 'Somme des quantités planifiées des ordres de fabrication.',
    'production_target', 'plannedCans', 'SUM', 'boîtes', 'QUANTITY'
  ),
  PROD_REALISE: defMeasure(
    'PROD_REALISE', 'Production réalisée (OF)', 'Somme des quantités réellement produites sur les ordres de fabrication.',
    'production_target', 'actualCans', 'SUM', 'boîtes', 'QUANTITY'
  ),
  PROD_ECART: defMeasure(
    'PROD_ECART', 'Écart objectif / réalisé', 'Production réalisée moins production planifiée.',
    'production_target', 'gapCans', 'SUM', 'boîtes', 'QUANTITY'
  ),
  TAUX_REALISATION: defMeasure(
    'TAUX_REALISATION', 'Taux de réalisation', 'Production réalisée / production planifiée × 100.',
    'production_target', 'actualCans', 'RATIO', '%', 'PERCENT', 'actualCans', 'plannedCans'
  ),
  CONSO_REEL: defMeasure(
    'CONSO_REEL', 'Consommation réelle', 'Somme des quantités réellement consommées (lignes de consommation).',
    'consumption', 'actualConsumed', 'SUM', 'unité article', 'QUANTITY'
  ),
  CONSO_THEO: defMeasure(
    'CONSO_THEO', 'Consommation théorique', 'Somme des besoins théoriques ajustés.',
    'consumption', 'theoretical', 'SUM', 'unité article', 'QUANTITY'
  ),
  ECART_CONSO: defMeasure(
    'ECART_CONSO', 'Écart de consommation', 'Consommation réelle moins consommation théorique.',
    'consumption', 'variance', 'SUM', 'unité article', 'QUANTITY'
  ),
  PERTES_CONSO: defMeasure(
    'PERTES_CONSO', 'Pertes de consommation', 'Somme des quantités perdues ou rebutées sur les lignes de consommation.',
    'consumption', 'waste', 'SUM', 'unité article', 'QUANTITY'
  ),
  STOCK_PHYSIQUE: defMeasure(
    'STOCK_PHYSIQUE', 'Stock physique', 'Somme des quantités physiques présentes dans les magasins.',
    'stock', 'physicalQty', 'SUM', 'unité article', 'QUANTITY'
  ),
  STOCK_DISPO: defMeasure(
    'STOCK_DISPO', 'Stock disponible', 'Somme des quantités disponibles (lots libérés, réservations déduites).',
    'stock', 'availableQty', 'SUM', 'unité article', 'QUANTITY'
  ),
  STOCK_RESERVE: defMeasure(
    'STOCK_RESERVE', 'Stock réservé', 'Somme des quantités réservées.',
    'stock', 'reservedQty', 'SUM', 'unité article', 'QUANTITY'
  ),
  STOCK_QUARANTAINE: defMeasure(
    'STOCK_QUARANTAINE', 'Stock en quarantaine', 'Somme des quantités en quarantaine.',
    'stock', 'quarantineQty', 'SUM', 'unité article', 'QUANTITY'
  ),
  STOCK_BLOQUE: defMeasure(
    'STOCK_BLOQUE', 'Stock bloqué', 'Somme des quantités bloquées ou rejetées.',
    'stock', 'blockedQty', 'SUM', 'unité article', 'QUANTITY'
  ),
  STOCK_SOUS_MIN: defMeasure(
    'STOCK_SOUS_MIN', 'Articles sous le stock minimum', 'Nombre de lignes article / magasin sous le stock minimum.',
    'stock', 'belowMin', 'SUM', 'articles', 'NUMBER'
  ),
  STOCK_TRANSIT: defMeasure(
    'STOCK_TRANSIT', 'Stock en transit', 'Somme des quantités en transit entre magasins.',
    'stock', 'transitQty', 'SUM', 'unité article', 'QUANTITY'
  ),
  NC_TOTAL: defMeasure(
    'NC_TOTAL', 'Non-conformités', 'Nombre total de non-conformités.',
    'quality', 'id', 'COUNT', 'NC', 'NUMBER'
  ),
  NC_OUVERTES: defMeasure(
    'NC_OUVERTES', 'Non-conformités ouvertes', 'Nombre de non-conformités non résolues.',
    'quality', 'openFlag', 'SUM', 'NC', 'NUMBER'
  ),
  NC_CRITIQUES: defMeasure(
    'NC_CRITIQUES', 'Non-conformités critiques', 'Nombre de non-conformités de gravité critique.',
    'quality', 'criticalFlag', 'SUM', 'NC', 'NUMBER'
  ),
  NC_QUANTITE: defMeasure(
    'NC_QUANTITE', 'Quantité affectée par les NC', 'Somme des quantités affectées par les non-conformités.',
    'quality', 'affectedQuantity', 'SUM', 'unité article', 'QUANTITY'
  ),
  TAUX_NC: defMeasure(
    'TAUX_NC', 'Taux de non-conformité', 'NC ouvertes / NC totales × 100.',
    'quality', 'openFlag', 'RATIO', '%', 'PERCENT', 'openFlag', 'ncFlag'
  ),
  HACCP_TOTAL: defMeasure(
    'HACCP_TOTAL', 'Contrôles HACCP', 'Nombre de contrôles CCP / PRPo enregistrés.',
    'haccp', 'id', 'COUNT', 'contrôles', 'NUMBER'
  ),
  HACCP_NC: defMeasure(
    'HACCP_NC', 'Contrôles HACCP non conformes', 'Nombre de contrôles CCP / PRPo non conformes.',
    'haccp', 'deviationFlag', 'SUM', 'contrôles', 'NUMBER'
  ),
  TAUX_HACCP: defMeasure(
    'TAUX_HACCP', 'Taux de conformité HACCP', 'Contrôles conformes / contrôles totaux × 100.',
    'haccp', 'compliantFlag', 'RATIO', '%', 'PERCENT', 'compliantFlag', 'haccpFlag'
  ),
  ACHATS_MONTANT: defMeasure(
    'ACHATS_MONTANT', 'Montant des achats', 'Montant total des lignes de commandes d’achat.',
    'purchase_order', 'amountDzd', 'SUM', 'DZD', 'CURRENCY'
  ),
  ACHATS_QTE: defMeasure(
    'ACHATS_QTE', 'Quantités commandées', 'Somme des quantités commandées.',
    'purchase_order', 'orderedQty', 'SUM', 'unité article', 'QUANTITY'
  ),
  COMMANDES_TOTAL: defMeasure(
    'COMMANDES_TOTAL', 'Lignes de commandes', 'Nombre de lignes de commandes d’achat.',
    'purchase_order', 'orderLineId', 'COUNT', 'lignes', 'NUMBER'
  ),
  COMMANDES_RETARD: defMeasure(
    'COMMANDES_RETARD', 'Jours de retard cumulés', 'Somme des jours de retard constatés sur les commandes.',
    'purchase_order', 'lateDays', 'SUM', 'jours', 'NUMBER'
  ),
  RECEPTIONS_QTE: defMeasure(
    'RECEPTIONS_QTE', 'Quantités réceptionnées', 'Somme des quantités réceptionnées auprès des fournisseurs.',
    'purchase_receipt', 'receivedQty', 'SUM', 'unité article', 'QUANTITY'
  ),
  RECEPTIONS_ACCEPTEES: defMeasure(
    'RECEPTIONS_ACCEPTEES', 'Quantités acceptées', 'Somme des quantités acceptées après contrôle qualité.',
    'purchase_receipt', 'acceptedQty', 'SUM', 'unité article', 'QUANTITY'
  ),
  RECEPTIONS_REJETEES: defMeasure(
    'RECEPTIONS_REJETEES', 'Quantités refusées', 'Somme des quantités refusées après contrôle qualité.',
    'purchase_receipt', 'rejectedQty', 'SUM', 'unité article', 'QUANTITY'
  ),
  RECEPTIONS_TOTAL: defMeasure(
    'RECEPTIONS_TOTAL', 'Lignes de réceptions', 'Nombre de lignes de réceptions fournisseurs.',
    'purchase_receipt', 'receiptLineId', 'COUNT', 'lignes', 'NUMBER'
  ),
  TAUX_ACCEPTATION: defMeasure(
    'TAUX_ACCEPTATION', 'Taux d’acceptation des achats', 'Quantités acceptées / quantités réceptionnées × 100.',
    'purchase_receipt', 'acceptedQty', 'RATIO', '%', 'PERCENT', 'acceptedQty', 'receivedQty'
  ),
  CA_TOTAL: defMeasure(
    'CA_TOTAL', 'Chiffre d’affaires', 'Montant total facturé.',
    'sales', 'totalDzd', 'SUM', 'DZD', 'CURRENCY'
  ),
  CA_PAYE: defMeasure(
    'CA_PAYE', 'Montant encaissé', 'Montant total encaissé.',
    'sales', 'paidDzd', 'SUM', 'DZD', 'CURRENCY'
  ),
  CA_IMPAYE: defMeasure(
    'CA_IMPAYE', 'Montant impayé', 'Montant total restant à encaisser.',
    'sales', 'unpaidDzd', 'SUM', 'DZD', 'CURRENCY'
  ),
  FACTURES_TOTAL: defMeasure(
    'FACTURES_TOTAL', 'Factures', 'Nombre de factures.',
    'sales', 'id', 'COUNT', 'factures', 'NUMBER'
  ),
  TAUX_ENCAISSEMENT: defMeasure(
    'TAUX_ENCAISSEMENT', 'Taux d’encaissement', 'Montant encaissé / chiffre d’affaires × 100.',
    'sales', 'paidDzd', 'RATIO', '%', 'PERCENT', 'paidDzd', 'totalDzd'
  ),
  EQUIPEMENTS_TOTAL: defMeasure(
    'EQUIPEMENTS_TOTAL', 'Équipements', 'Nombre d’équipements suivis.',
    'maintenance', 'id', 'COUNT', 'équipements', 'NUMBER'
  ),
  MAINTENANCES_RETARD: defMeasure(
    'MAINTENANCES_RETARD', 'Maintenances en retard', 'Nombre d’équipements dont la maintenance préventive est en retard.',
    'maintenance', 'overdueFlag', 'SUM', 'équipements', 'NUMBER'
  ),
};

/** Mesure non calculable faute d'historique de stock quotidien. */
export const BI_MEASURE_STOCK_MOYEN: BiMeasureDefinition = {
  code: 'STOCK_MOYEN',
  label: 'Stock moyen',
  description:
    'Stock moyen sur la période. Non calculable en mode BI intégré : aucun historique quotidien de stock n’est encore enregistré. Sera calculé à partir des snapshots quotidiens en mode BI LAN.',
  source: 'stock',
  field: 'physicalQty',
  aggregation: 'AVG',
  unit: 'unité article',
  format: 'QUANTITY',
  permission: 'BI_VIEW',
};

export const BI_MEASURE_LIST: BiMeasureDefinition[] = [
  ...Object.values(BI_MEASURES),
  BI_MEASURE_STOCK_MOYEN,
];

export const BI_MEASURE_CODES = BI_MEASURE_LIST.map(measure => measure.code);

// ---------------------------------------------------------------------------
// Dashboards et KPI par défaut
// ---------------------------------------------------------------------------

let widgetSequence = 0;
const widget = (
  type: BiWidgetType,
  title: string,
  source: BiSourceId,
  dimensions: string[],
  measures: string[],
  layout: { x: number; y: number; w: number; h: number },
  options?: BiWidget['options'],
  filters: BiWidget['filters'] = []
): BiWidget => ({
  id: `WGT-${++widgetSequence}`,
  type,
  title,
  source,
  dimensions,
  measures,
  filters,
  layout,
  options,
});

const dashboard = (
  id: string,
  name: string,
  description: string,
  category: BiDashboardCategory,
  widgets: BiWidget[],
  now: string
): BiDashboard => ({
  id,
  name,
  description,
  category,
  widgets,
  ownerId: 'SYSTEM',
  ownerName: 'MAMORA GP',
  sharedWithUserIds: [],
  sharedWithRoles: [],
  isDefault: true,
  createdAt: now,
  updatedAt: now,
  createdBy: 'SYSTEM',
});

export function buildDefaultBiDashboards(now = new Date().toISOString()): BiDashboard[] {
  widgetSequence = 0;
  return [
    dashboard(
      'BI-DASH-GENERAL',
      'Vue générale MAMORA',
      'Synthèse production, stocks, qualité et approvisionnement.',
      'GENERAL',
      [
        widget('KPI', 'Production totale', 'production', [], ['totalCans'], { x: 0, y: 0, w: 3, h: 2 }),
        widget('KPI', 'Taux de conformité', 'production', [], ['conformityRate'], { x: 3, y: 0, w: 3, h: 2 }),
        widget('KPI', 'Stock disponible', 'stock', [], ['availableQty'], { x: 6, y: 0, w: 3, h: 2 }),
        widget('KPI', 'NC ouvertes', 'quality', [], ['openNcCount'], { x: 9, y: 0, w: 3, h: 2 }),
        widget('COLUMN', 'Production par mois', 'production', ['monthLabel'], ['totalCans', 'conformingCans'], { x: 0, y: 2, w: 8, h: 4 }, { showLegend: true, showGrid: true }),
        widget('DONUT', 'Stock disponible par magasin', 'stock', ['warehouseCode'], ['availableQty'], { x: 8, y: 2, w: 4, h: 4 }, { showLegend: true }),
        widget('COMBO', 'Objectif vs réalisation', 'production_target', ['monthLabel'], ['plannedCans', 'actualCans'], { x: 0, y: 6, w: 6, h: 4 }, { showLegend: true, showGrid: true }),
        widget('PIE', 'Non-conformités par origine', 'quality', ['origin'], ['ncCount'], { x: 6, y: 6, w: 6, h: 4 }, { showLegend: true }),
      ],
      now
    ),
    dashboard(
      'BI-DASH-PRODUCTION',
      'Production & rendement',
      'Production par produit, ligne, objectif et consommation matière.',
      'PRODUCTION',
      [
        widget('KPI', 'Production réalisée', 'production', [], ['totalCans'], { x: 0, y: 0, w: 3, h: 2 }),
        widget('KPI', 'Taux de conformité', 'production', [], ['conformityRate'], { x: 3, y: 0, w: 3, h: 2 }),
        widget('KPI', 'Taux de réalisation', 'production_target', [], ['realizationRate'], { x: 6, y: 0, w: 3, h: 2 }),
        widget('KPI', 'Écart de consommation', 'consumption', [], ['varianceQty'], { x: 9, y: 0, w: 3, h: 2 }),
        widget('COLUMN', 'Production par produit', 'production', ['productName'], ['totalCans', 'conformingCans'], { x: 0, y: 2, w: 6, h: 4 }, { showLegend: true }),
        widget('LINE', 'Production mensuelle', 'production', ['monthLabel'], ['totalCans', 'rejectedCans'], { x: 6, y: 2, w: 6, h: 4 }, { showLegend: true, showGrid: true }),
        widget('BAR', 'Consommation réelle vs théorique par article', 'consumption', ['designation'], ['actualConsumed', 'theoreticalConsumed'], { x: 0, y: 6, w: 6, h: 4 }, { showLegend: true }),
        widget('TABLE', 'Détail des écarts de consommation', 'consumption', ['orderNumber', 'designation'], ['actualConsumed', 'theoreticalConsumed', 'varianceQty'], { x: 6, y: 6, w: 6, h: 4 }, { maxRows: 12 }),
      ],
      now
    ),
    dashboard(
      'BI-DASH-GDS',
      'Stocks & GDS',
      'Stock par article, magasin, lot et statut qualité.',
      'GDS',
      [
        widget('KPI', 'Stock physique', 'stock', [], ['physicalQty'], { x: 0, y: 0, w: 3, h: 2 }),
        widget('KPI', 'Stock disponible', 'stock', [], ['availableQty'], { x: 3, y: 0, w: 3, h: 2 }),
        widget('KPI', 'Stock en quarantaine', 'stock', [], ['quarantineQty'], { x: 6, y: 0, w: 3, h: 2 }),
        widget('KPI', 'Articles sous minimum', 'stock', [], ['belowMinCount'], { x: 9, y: 0, w: 3, h: 2 }),
        widget('BAR', 'Stock par catégorie', 'stock', ['category'], ['physicalQty', 'availableQty'], { x: 0, y: 2, w: 6, h: 4 }, { showLegend: true }),
        widget('DONUT', 'Répartition par magasin', 'stock', ['warehouseCode'], ['availableQty'], { x: 6, y: 2, w: 6, h: 4 }, { showLegend: true }),
        widget('HEATMAP', 'Stock par magasin et catégorie', 'stock', ['warehouseCode', 'category'], ['availableQty'], { x: 0, y: 6, w: 8, h: 4 }),
        widget('TABLE', 'Lots et statuts qualité', 'stock', ['lotNumber', 'designation', 'warehouseCode', 'qualityStatus'], ['physicalQty', 'availableQty'], { x: 8, y: 6, w: 4, h: 4 }, { maxRows: 15 }),
      ],
      now
    ),
    dashboard(
      'BI-DASH-QUALITE',
      'Qualité & HACCP',
      'Non-conformités, contrôles CCP / PRPo et lots bloqués.',
      'QUALITE',
      [
        widget('KPI', 'Non-conformités', 'quality', [], ['ncCount'], { x: 0, y: 0, w: 3, h: 2 }),
        widget('KPI', 'NC ouvertes', 'quality', [], ['openNcCount'], { x: 3, y: 0, w: 3, h: 2 }),
        widget('KPI', 'NC critiques', 'quality', [], ['criticalNcCount'], { x: 6, y: 0, w: 3, h: 2 }),
        widget('KPI', 'Contrôles HACCP non conformes', 'haccp', [], ['haccpDeviationCount'], { x: 9, y: 0, w: 3, h: 2 }),
        widget('COLUMN', 'Non-conformités par mois', 'quality', ['monthLabel'], ['ncCount', 'openNcCount'], { x: 0, y: 2, w: 6, h: 4 }, { showLegend: true }),
        widget('PIE', 'Non-conformités par gravité', 'quality', ['severity'], ['ncCount'], { x: 6, y: 2, w: 6, h: 4 }, { showLegend: true }),
        widget('LINE', 'Contrôles HACCP par mois', 'haccp', ['monthLabel'], ['haccpCount', 'haccpDeviationCount'], { x: 0, y: 6, w: 6, h: 4 }, { showLegend: true, showGrid: true }),
        widget('TABLE', 'Détail des non-conformités', 'quality', ['ncNumber', 'origin', 'severity', 'isResolved'], ['affectedQuantity'], { x: 6, y: 6, w: 6, h: 4 }, { maxRows: 12 }),
      ],
      now
    ),
    dashboard(
      'BI-DASH-APPRO',
      'Approvisionnement',
      'Commandes, réceptions, retards et performance fournisseurs.',
      'APPROVISIONNEMENT',
      [
        widget('KPI', 'Montant des achats', 'purchase_order', [], ['purchaseAmount'], { x: 0, y: 0, w: 3, h: 2 }),
        widget('KPI', 'Quantités commandées', 'purchase_order', [], ['orderedQty'], { x: 3, y: 0, w: 3, h: 2 }),
        widget('KPI', 'Quantités réceptionnées', 'purchase_receipt', [], ['receiptQty'], { x: 6, y: 0, w: 3, h: 2 }),
        widget('KPI', 'Taux d’acceptation', 'purchase_receipt', [], ['receiptQualityRate'], { x: 9, y: 0, w: 3, h: 2 }),
        widget('BAR', 'Achats par fournisseur', 'purchase_order', ['supplierName'], ['purchaseAmount'], { x: 0, y: 2, w: 6, h: 4 }),
        widget('LINE', 'Achats par mois', 'purchase_order', ['monthLabel'], ['purchaseAmount'], { x: 6, y: 2, w: 6, h: 4 }, { showGrid: true }),
        widget('COLUMN', 'Réceptions par mois', 'purchase_receipt', ['monthLabel'], ['receiptQty', 'acceptedQty', 'rejectedQty'], { x: 0, y: 6, w: 6, h: 4 }, { showLegend: true }),
        widget('TABLE', 'Performance fournisseurs', 'purchase_order', ['supplierName'], ['purchaseAmount', 'lateDays', 'orderCount'], { x: 6, y: 6, w: 6, h: 4 }, { maxRows: 12 }),
      ],
      now
    ),
    dashboard(
      'BI-DASH-COMMERCIAL',
      'Commercial & encaissements',
      'Chiffre d’affaires, encaissements et factures.',
      'COMMERCIAL',
      [
        widget('KPI', 'Chiffre d’affaires', 'sales', [], ['revenueTotal'], { x: 0, y: 0, w: 3, h: 2 }),
        widget('KPI', 'Encaissé', 'sales', [], ['revenuePaid'], { x: 3, y: 0, w: 3, h: 2 }),
        widget('KPI', 'Impayé', 'sales', [], ['revenueUnpaid'], { x: 6, y: 0, w: 3, h: 2 }),
        widget('KPI', 'Taux d’encaissement', 'sales', [], ['collectionRate'], { x: 9, y: 0, w: 3, h: 2 }),
        widget('COLUMN', 'Chiffre d’affaires par mois', 'sales', ['monthLabel'], ['revenueTotal', 'revenuePaid'], { x: 0, y: 2, w: 7, h: 4 }, { showLegend: true }),
        widget('PIE', 'Chiffre d’affaires par client', 'sales', ['customerName'], ['revenueTotal'], { x: 7, y: 2, w: 5, h: 4 }, { showLegend: true }),
        widget('TABLE', 'Factures', 'sales', ['invoiceNumber', 'customerName', 'paymentStatus'], ['revenueTotal', 'revenueUnpaid'], { x: 0, y: 6, w: 12, h: 4 }, { maxRows: 15 }),
      ],
      now
    ),
  ];
}

export function buildDefaultBiKpis(now = new Date().toISOString()): BiKpi[] {
  const kpi = (
    code: string,
    name: string,
    description: string,
    source: BiKpi['source'],
    formula: string,
    unit: string,
    format: BiValueFormat,
    period: BiKpi['period'],
    targetValue?: number
  ): BiKpi => ({
    id: `KPI-${code}`,
    code,
    name,
    description,
    source,
    formula,
    unit,
    format,
    precision: format === 'PERCENT' ? 1 : format === 'CURRENCY' ? 0 : 2,
    period,
    owner: 'Direction',
    isActive: true,
    targetValue,
    createdAt: now,
    updatedAt: now,
    createdBy: 'SYSTEM',
  });

  return [
    kpi('PRODUCTION_MENSUELLE', 'Production mensuelle', 'Boîtes produites sur le mois en cours.', 'production', 'PROD_TOTAL', 'boîtes', 'QUANTITY', 'CURRENT_MONTH'),
    kpi('TAUX_CONFORMITE', 'Taux de conformité', 'Boîtes conformes / boîtes produites × 100.', 'production', 'PROD_CONFORME / PROD_TOTAL * 100', '%', 'PERCENT', 'CURRENT_MONTH', 98),
    kpi('TAUX_REALISATION', 'Taux de réalisation', 'Production réalisée / production planifiée × 100.', 'production_target', 'PROD_REALISE / PROD_PLANIFIE * 100', '%', 'PERCENT', 'CURRENT_MONTH', 100),
    kpi('TAUX_PERTES', 'Taux de pertes', 'Boîtes rejetées / boîtes produites × 100.', 'production', 'PROD_REJETE / PROD_TOTAL * 100', '%', 'PERCENT', 'CURRENT_MONTH'),
    kpi('ECART_CONSOMMATION', 'Écart de consommation', 'Consommation réelle moins consommation théorique.', 'consumption', 'CONSO_REEL - CONSO_THEO', 'unité article', 'QUANTITY', 'CURRENT_MONTH'),
    kpi('TAUX_NC', 'Taux de non-conformité', 'NC ouvertes / NC totales × 100.', 'quality', 'NC_OUVERTES / NC_TOTAL * 100', '%', 'PERCENT', 'CURRENT_MONTH'),
    kpi('ROTATION_STOCK', 'Rotation des stocks', 'Consommation réelle / stock moyen. Non calculable sans historique quotidien de stock.', 'MULTI', 'CONSO_REEL / STOCK_MOYEN', 'fois', 'DECIMAL', 'LAST_12_MONTHS'),
    kpi('VALEUR_STOCK_DISPO', 'Stock disponible', 'Quantité totale disponible dans les magasins.', 'stock', 'STOCK_DISPO', 'unité article', 'QUANTITY', 'ALL'),
    kpi('TAUX_ACCEPTATION_ACHATS', 'Taux d’acceptation des achats', 'Quantités acceptées / quantités réceptionnées × 100.', 'purchase_receipt', 'RECEPTIONS_ACCEPTEES / RECEPTIONS_QTE * 100', '%', 'PERCENT', 'CURRENT_MONTH', 95),
    kpi('TAUX_ENCAISSEMENT', 'Taux d’encaissement', 'Montant encaissé / chiffre d’affaires × 100.', 'sales', 'CA_PAYE / CA_TOTAL * 100', '%', 'PERCENT', 'CURRENT_YEAR', 90),
  ];
}

export function buildDefaultBiAlertRules(now = new Date().toISOString()): BiAlertRule[] {
  return [
    {
      id: 'BI-ALERT-CONFORMITE',
      name: 'Taux de conformité sous 95 %',
      measureCode: 'TAUX_CONFORMITE',
      operator: 'LT',
      threshold: 95,
      period: 'CURRENT_MONTH',
      recipients: [],
      isActive: true,
      createdAt: now,
      updatedAt: now,
      createdBy: 'SYSTEM',
    },
    {
      id: 'BI-ALERT-NC',
      name: 'Plus de 5 non-conformités ouvertes',
      measureCode: 'NC_OUVERTES',
      operator: 'GT',
      threshold: 5,
      period: 'CURRENT_MONTH',
      recipients: [],
      isActive: true,
      createdAt: now,
      updatedAt: now,
      createdBy: 'SYSTEM',
    },
    {
      id: 'BI-ALERT-STOCK',
      name: 'Articles sous le stock minimum',
      measureCode: 'STOCK_SOUS_MIN',
      operator: 'GT',
      threshold: 0,
      period: 'ALL',
      recipients: [],
      isActive: true,
      createdAt: now,
      updatedAt: now,
      createdBy: 'SYSTEM',
    },
    {
      id: 'BI-ALERT-ANOMALIE-PROD',
      name: 'Anomalie statistique de production mensuelle',
      measureCode: 'PROD_TOTAL',
      operator: 'NE',
      threshold: 0,
      period: 'CURRENT_MONTH',
      mode: 'ANOMALY',
      lookbackPeriods: 12,
      deviationFactor: 2,
      recipients: [],
      isActive: true,
      createdAt: now,
      updatedAt: now,
      createdBy: 'SYSTEM',
    },
  ];
}

/** Libellé lisible d'une mesure ou d'un champ. */
export function getBiFieldLabel(source: BiSourceId, key: string): string {
  return getBiField(source, key)?.label ?? BI_MEASURES[key]?.label ?? key;
}
