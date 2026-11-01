/**
 * MAMORA BI — Moteur analytique en lecture seule.
 *
 * Le moteur construit un snapshot normalisé à partir de l'AppDatabase, puis
 * exécute uniquement des requêtes structurées validées par liste blanche.
 * Aucun SQL, aucun eval(), aucun code utilisateur n'est exécuté.
 */

import type { AppDatabase } from '../storage';
import {
  BI_MEASURES,
  BI_MEASURE_CODES,
  BI_MEASURE_STOCK_MOYEN,
  BI_SOURCES,
  CALENDAR_DIMENSIONS,
  getBiField,
} from './catalog';
import {
  BiAggregation,
  BiFactRow,
  BiFieldDefinition,
  BiFilter,
  BiFormulaEvaluation,
  BiKpi,
  BiKpiPeriod,
  BiMeasureValue,
  BiPeriod,
  BiQuery,
  BiQueryColumn,
  BiQueryResult,
  BiScope,
  BiSnapshot,
  BiSourceId,
} from '../../types';

const MAX_QUERY_ROWS = 5000;
const DEFAULT_QUERY_ROWS = 500;

const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

const EMPTY_SOURCE_ROWS = (): Record<BiSourceId, BiFactRow[]> => ({
  production: [],
  production_target: [],
  consumption: [],
  stock: [],
  movement: [],
  quality: [],
  haccp: [],
  purchase_order: [],
  purchase_receipt: [],
  sales: [],
  maintenance: [],
});

const num = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const text = (value: unknown): string => (value === null || value === undefined ? '' : String(value));

const pad2 = (value: number): string => String(value).padStart(2, '0');

const isoDay = (value: string): string => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
};

const isoWeek = (date: Date): number => {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNumber = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNumber);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  return Math.ceil((((target.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};

/** Champs calendrier dérivés, communs aux sources datées. */
export function buildCalendarFields(value: string): BiFactRow {
  if (!value) return {};
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { date: value.slice(0, 10) };
  const year = date.getFullYear();
  const month = date.getMonth();
  return {
    date: isoDay(value),
    day: date.getDate(),
    week: `${year}-S${pad2(isoWeek(date))}`,
    month: `${year}-${pad2(month + 1)}`,
    monthLabel: `${MONTHS_FR[month]} ${year}`,
    quarter: `${year}-T${Math.floor(month / 3) + 1}`,
    year,
    yearMonthLabel: `${year} — ${MONTHS_FR[month]}`,
  };
}

function expiryBucket(expiryDate?: string): string {
  if (!expiryDate) return 'Sans date';
  const days = Math.ceil((new Date(expiryDate).getTime() - Date.now()) / 86400000);
  if (Number.isNaN(days)) return 'Sans date';
  if (days < 0) return 'Périmé';
  if (days <= 30) return '≤ 30 jours';
  if (days <= 90) return '31–90 jours';
  return '> 90 jours';
}

/**
 * Construit le snapshot analytique complet. Le filtrage de sécurité est appliqué
 * à l'exécution de chaque requête, jamais dans le stockage persistant.
 */
export function buildBiSnapshot(db: AppDatabase): BiSnapshot {
  const rows = EMPTY_SOURCE_ROWS();
  const warnings: string[] = [];
  const now = new Date().toISOString();

  const itemsById = new Map((db.items || []).map(item => [item.id, item]));
  const warehousesById = new Map((db.warehouses || []).map(warehouse => [warehouse.id, warehouse]));
  const lotsById = new Map((db.stockLots || []).map(lot => [lot.id, lot]));
  const workOrdersById = new Map((db.workOrders || []).map(order => [order.id, order]));
  const ordersById = new Map((db.purchaseOrders || []).map(order => [order.id, order]));

  // --- Production réalisée : source canonique = finishedBatches ---
  for (const batch of db.finishedBatches || []) {
    const order = workOrdersById.get(batch.workOrderId);
    const item = itemsById.get(batch.itemId);
    rows.production.push({
      ...buildCalendarFields(batch.productionDate),
      id: batch.id,
      batchNumber: batch.batchNumber,
      itemId: batch.itemId,
      itemCode: item?.code ?? batch.itemId,
      productName: batch.productName,
      format: batch.format,
      workOrderId: batch.workOrderId,
      orderNumber: order?.orderNumber ?? '',
      lineId: order?.lineId ?? '',
      shift: order?.shift ?? '',
      releaseStatus: batch.releaseStatus,
      totalCans: num(batch.totalCansProduced),
      conformingCans: num(batch.conformingCans),
      rejectedCans: num(batch.rejectedCans),
      cartons: num(batch.totalCartons),
      department: 'PRODUCTION',
    });
  }

  // --- Objectifs / ordres de fabrication : source canonique = workOrders ---
  for (const order of db.workOrders || []) {
    const item = itemsById.get(order.finishedItemId);
    rows.production_target.push({
      ...buildCalendarFields(order.startDatePlanned || order.startDateActual || ''),
      id: order.id,
      workOrderId: order.id,
      orderNumber: order.orderNumber,
      itemId: order.finishedItemId,
      itemCode: item?.code ?? order.finishedItemId,
      productName: order.productName,
      lineId: order.lineId,
      shift: order.shift,
      status: order.status,
      plannedCans: num(order.plannedCansQty),
      actualCans: num(order.actualCansQty),
      gapCans: num(order.actualCansQty) - num(order.plannedCansQty),
      department: 'PRODUCTION',
    });
  }

  // --- Consommations : seules les fiches validées sont canoniques ---
  let nonValidatedConsumptions = 0;
  for (const record of db.consumptions || []) {
    if (record.status !== 'VALIDEE') {
      nonValidatedConsumptions += 1;
      continue;
    }
    for (const line of record.lines || []) {
      rows.consumption.push({
        ...buildCalendarFields(record.consumptionDateTime),
        id: line.id,
        itemId: line.itemId,
        itemCode: line.itemCode,
        designation: line.designation,
        category: line.category,
        stepName: line.stepName ?? '',
        workOrderId: record.workOrderId,
        orderNumber: record.workOrderNumber,
        lineId: record.lineId,
        shift: record.shift,
        batchNumber: line.batchNumber,
        status: record.status,
        actualConsumed: num(line.actualConsumedQuantity),
        theoretical: num(line.adjustedTheoreticalQuantity),
        variance: num(line.actualConsumedQuantity) - num(line.adjustedTheoreticalQuantity),
        waste: num(line.wasteQuantity),
        withdrawn: num(line.withdrawnQuantity),
        returned: num(line.returnedQuantity),
        department: 'PRODUCTION',
      });
    }
  }
  if (nonValidatedConsumptions > 0) {
    warnings.push(
      `${nonValidatedConsumptions} fiche(s) de consommation non validée(s) exclue(s) du calcul : seules les consommations validées sont canoniques.`
    );
  }

  // --- Stocks : soldes par lot / magasin / statut + transit séparé ---
  for (const stock of db.warehouseStocks || []) {
    const item = itemsById.get(stock.itemId);
    const warehouse = warehousesById.get(stock.warehouseId);
    const lot = lotsById.get(stock.lotId);
    const qualityStatus = stock.qualityStatus;
    const available =
      qualityStatus === 'LIBERE' ? Math.max(0, num(stock.quantity) - num(stock.reservedQty)) : 0;
    const minStock = num(item?.minStockLevel);
    rows.stock.push({
      id: stock.id,
      itemId: stock.itemId,
      itemCode: stock.itemCode,
      designation: item?.designation ?? stock.itemCode,
      category: item?.category ?? '',
      group: item?.group ?? '',
      warehouseId: stock.warehouseId,
      warehouseCode: warehouse?.code ?? stock.warehouseId,
      warehouseName: warehouse?.designation ?? stock.warehouseId,
      warehouseType: warehouse?.type ?? '',
      lotId: stock.lotId,
      lotNumber: stock.lotNumber,
      qualityStatus,
      expiryDate: lot?.expiryDate ?? '',
      expiryBucket: expiryBucket(lot?.expiryDate),
      physicalQty: num(stock.quantity),
      availableQty: available,
      reservedQty: num(stock.reservedQty),
      quarantineQty: qualityStatus === 'QUARANTAINE' ? num(stock.quantity) : 0,
      blockedQty: ['BLOQUE', 'NON_CONFORME', 'REJETE'].includes(qualityStatus) ? num(stock.quantity) : 0,
      pendingQty: ['EN_ATTENTE_CONTROLE', 'CONFORME'].includes(qualityStatus) ? num(stock.quantity) : 0,
      transitQty: 0,
      belowMin: minStock > 0 && available < minStock ? 1 : 0,
      department: 'MAGASIN_MP',
    });
  }

  for (const transit of db.stockTransits || []) {
    if (transit.status !== 'EN_TRANSIT') continue;
    const item = itemsById.get(transit.itemId);
    const warehouse = warehousesById.get(transit.sourceWarehouseId);
    rows.stock.push({
      id: transit.id,
      itemId: transit.itemId,
      itemCode: transit.itemCode,
      designation: item?.designation ?? transit.itemCode,
      category: item?.category ?? '',
      group: item?.group ?? '',
      warehouseId: transit.sourceWarehouseId,
      warehouseCode: warehouse?.code ?? transit.sourceWarehouseId,
      warehouseName: warehouse?.designation ?? transit.sourceWarehouseId,
      warehouseType: warehouse?.type ?? '',
      lotId: transit.lotId,
      lotNumber: transit.lotNumber,
      qualityStatus: transit.qualityStatus,
      expiryDate: '',
      expiryBucket: 'Sans date',
      physicalQty: 0,
      availableQty: 0,
      reservedQty: 0,
      quarantineQty: 0,
      blockedQty: 0,
      pendingQty: 0,
      transitQty: num(transit.quantity),
      belowMin: 0,
      department: 'MAGASIN_MP',
    });
  }

  // --- Mouvements : grand livre unique ---
  const ENTRY_TYPES = new Set([
    'ENTREE_RECEPTION', 'RETOUR_STOCK', 'TRANSFERT_ENTREE', 'RETOUR_MAGASIN',
    'RECEPTION_PRODUCTION', 'MISE_EN_QUARANTAINE',
  ]);
  for (const movement of db.stockMovements || []) {
    const item = itemsById.get(movement.itemId);
    const delta = movement.stockDelta !== undefined
      ? num(movement.stockDelta)
      : (ENTRY_TYPES.has(movement.type) ? num(movement.quantity) : -num(movement.quantity));
    const sourceWarehouse = movement.sourceWarehouseId
      ? warehousesById.get(movement.sourceWarehouseId)
      : undefined;
    const destinationWarehouse = movement.destinationWarehouseId
      ? warehousesById.get(movement.destinationWarehouseId)
      : undefined;
    rows.movement.push({
      ...buildCalendarFields(movement.timestamp),
      id: movement.id,
      itemId: movement.itemId,
      itemCode: movement.itemCode,
      designation: item?.designation ?? movement.itemCode,
      type: movement.type,
      documentNumber: movement.documentNumber ?? '',
      lotNumber: movement.batchNumber,
      sourceWarehouseId: movement.sourceWarehouseId ?? '',
      destinationWarehouseId: movement.destinationWarehouseId ?? '',
      sourceWarehouseCode: sourceWarehouse?.code ?? '',
      destinationWarehouseCode: destinationWarehouse?.code ?? '',
      warehouseId: movement.sourceWarehouseId ?? movement.destinationWarehouseId ?? '',
      workOrderId: movement.workOrderId ?? '',
      userName: movement.userName,
      quantity: num(movement.quantity),
      stockDelta: delta,
      absDelta: Math.abs(delta),
      department: 'MAGASIN_MP',
    });
  }

  // --- Qualité : non-conformités ---
  for (const nc of db.nonConformities || []) {
    rows.quality.push({
      ...buildCalendarFields(nc.date),
      id: nc.id,
      ncNumber: nc.ncNumber,
      origin: nc.origin,
      severity: nc.severity,
      batchType: nc.batchType,
      affectedBatchId: nc.affectedBatchId,
      isResolved: nc.isResolved,
      finalDisposition: nc.finalDisposition,
      affectedQuantity: num(nc.affectedQuantity),
      openFlag: nc.isResolved ? 0 : 1,
      resolvedFlag: nc.isResolved ? 1 : 0,
      criticalFlag: nc.severity === 'CRITIQUE' ? 1 : 0,
      ncFlag: 1,
      department: 'QUALITE',
    });
  }

  // --- HACCP ---
  for (const record of db.haccpRecords || []) {
    rows.haccp.push({
      ...buildCalendarFields(record.timestamp),
      id: record.id,
      referenceId: record.referenceId,
      type: record.type,
      pointName: record.pointName,
      stepName: record.stepName,
      parameterName: record.parameterName,
      isCompliant: record.isCompliant,
      operatorName: record.operatorName,
      measuredValue: num(record.measuredValue),
      deviationFlag: record.isCompliant ? 0 : 1,
      compliantFlag: record.isCompliant ? 1 : 0,
      haccpFlag: 1,
      department: 'QUALITE',
    });
  }

  // --- Commandes d'achat ---
  const today = new Date();
  for (const order of db.purchaseOrders || []) {
    const warehouse = order.deliveryWarehouseId
      ? warehousesById.get(order.deliveryWarehouseId)
      : undefined;
    for (const line of order.lines || []) {
      const expected = new Date(order.expectedDate);
      const lateDays =
        order.expectedDate &&
        !['RECUE', 'CLOTUREE', 'ANNULE'].includes(order.status) &&
        !Number.isNaN(expected.getTime()) &&
        expected.getTime() < today.getTime()
          ? Math.ceil((today.getTime() - expected.getTime()) / 86400000)
          : 0;
      rows.purchase_order.push({
        ...buildCalendarFields(order.orderDate),
        id: line.id,
        orderLineId: line.id,
        orderNumber: order.orderNumber,
        supplierId: order.supplierId,
        supplierName: order.supplierName,
        status: order.status,
        itemId: line.itemId,
        itemCode: line.itemCode,
        designation: line.designation,
        deliveryWarehouseId: order.deliveryWarehouseId ?? '',
        deliveryWarehouseCode: warehouse?.code ?? '',
        orderedQty: num(line.quantityOrdered),
        receivedQty: num(line.quantityReceived),
        amountDzd: num(line.lineTotalDzd),
        lateDays,
        department: 'APPROVISIONNEMENT',
      });
    }
  }

  // --- Réceptions d'achat ---
  for (const receipt of db.purchaseReceipts || []) {
    const order = ordersById.get(receipt.orderId);
    const warehouse = warehousesById.get(receipt.warehouseId);
    for (const line of receipt.lines || []) {
      const orderLine = order?.lines.find(candidate => candidate.id === line.orderLineId);
      const unitPrice = num(orderLine?.unitPriceDzd);
      rows.purchase_receipt.push({
        ...buildCalendarFields(receipt.receivedAt),
        id: line.orderLineId || receipt.id,
        receiptLineId: line.orderLineId || receipt.id,
        receiptNumber: receipt.receiptNumber,
        orderNumber: receipt.orderNumber,
        supplierId: receipt.supplierId,
        supplierName: receipt.supplierName,
        qualityStatus: receipt.qualityStatus,
        itemId: line.itemId,
        itemCode: line.itemCode,
        designation: line.designation,
        warehouseId: receipt.warehouseId,
        warehouseCode: warehouse?.code ?? receipt.warehouseId,
        receivedQty: num(line.quantityReceived),
        acceptedQty: num(line.quantityAccepted),
        rejectedQty: num(line.quantityRejected),
        amountDzd: num(line.quantityReceived) * unitPrice,
        department: 'APPROVISIONNEMENT',
      });
    }
  }

  // --- Commercial ---
  for (const invoice of db.invoices || []) {
    rows.sales.push({
      ...buildCalendarFields(invoice.invoiceDate),
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      customerId: invoice.customerId,
      customerName: invoice.customerName,
      paymentStatus: invoice.paymentStatus,
      totalDzd: num(invoice.totalAmountDzd),
      paidDzd: num(invoice.paidAmountDzd),
      unpaidDzd: Math.max(0, num(invoice.totalAmountDzd) - num(invoice.paidAmountDzd)),
      department: 'COMMERCIAL',
    });
  }

  // --- Maintenance ---
  for (const equipment of db.equipments || []) {
    const nextDate = equipment.nextPreventiveMaintenanceDate
      ? new Date(equipment.nextPreventiveMaintenanceDate)
      : undefined;
    const daysToMaintenance = nextDate && !Number.isNaN(nextDate.getTime())
      ? Math.ceil((nextDate.getTime() - today.getTime()) / 86400000)
      : 0;
    rows.maintenance.push({
      id: equipment.id,
      equipmentCode: equipment.code,
      equipmentName: equipment.name,
      line: equipment.line,
      equipmentType: equipment.type,
      status: equipment.status,
      nextPreventiveMaintenanceDate: equipment.nextPreventiveMaintenanceDate,
      overdueFlag: daysToMaintenance < 0 ? 1 : 0,
      daysToMaintenance,
      department: 'MAINTENANCE',
    });
  }

  const counts = Object.keys(rows).reduce((acc, key) => {
    acc[key as BiSourceId] = rows[key as BiSourceId].length;
    return acc;
  }, {} as Record<BiSourceId, number>);

  return { builtAt: now, rows, counts, warnings };
}

// ---------------------------------------------------------------------------
// Sécurité : périmètre et validation des requêtes
// ---------------------------------------------------------------------------

const ALLOWED_OPERATORS = new Set<BiFilter['operator']>([
  'EQ', 'NE', 'GT', 'GTE', 'LT', 'LTE', 'IN', 'NOT_IN', 'BETWEEN',
  'CONTAINS', 'STARTS_WITH', 'IS_NULL', 'IS_NOT_NULL',
]);

function rowWarehouseIds(row: BiFactRow): string[] {
  const ids = [
    row.warehouseId,
    row.sourceWarehouseId,
    row.destinationWarehouseId,
    row.deliveryWarehouseId,
  ];
  return ids.map(text).filter(Boolean);
}

function isRowInScope(row: BiFactRow, source: BiSourceId, scope: BiScope): boolean {
  if (!scope.allDepartments && scope.departments.length > 0) {
    const department = BI_SOURCES[source].department;
    if (!scope.departments.includes(department)) return false;
  }
  const warehouseField = BI_SOURCES[source].warehouseField;
  if (warehouseField && !scope.allWarehouses) {
    const ids = rowWarehouseIds(row);
    if (ids.length === 0) return false;
    return ids.some(id => scope.warehouseIds.includes(id));
  }
  return true;
}

function normalizeComparable(value: unknown): string | number | boolean | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  return String(value);
}

function compareValues(left: unknown, right: unknown): number {
  const a = normalizeComparable(left);
  const b = normalizeComparable(right);
  if (a === null && b === null) return 0;
  if (a === null) return -1;
  if (b === null) return 1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), 'fr', { numeric: true });
}

function matchesFilter(row: BiFactRow, filter: BiFilter): boolean {
  const raw = row[filter.field];
  const value = filter.value;
  const compareOrdered = (left: unknown, right: unknown): number => {
    const leftNumeric = typeof left === 'number' ? left : Number(left);
    const rightNumeric = typeof right === 'number' ? right : Number(right);
    if (Number.isFinite(leftNumeric) && Number.isFinite(rightNumeric)) {
      return leftNumeric - rightNumeric;
    }
    return compareValues(left, right);
  };
  switch (filter.operator) {
    case 'EQ':
      return compareValues(raw, value) === 0;
    case 'NE':
      return compareValues(raw, value) !== 0;
    case 'GT':
      return compareOrdered(raw, value) > 0;
    case 'GTE':
      return compareOrdered(raw, value) >= 0;
    case 'LT':
      return compareOrdered(raw, value) < 0;
    case 'LTE':
      return compareOrdered(raw, value) <= 0;
    case 'IN':
      return Array.isArray(value) && value.some(candidate => compareValues(raw, candidate) === 0);
    case 'NOT_IN':
      return Array.isArray(value) && !value.some(candidate => compareValues(raw, candidate) === 0);
    case 'BETWEEN': {
      if (!Array.isArray(value) || value.length !== 2) return false;
      return compareOrdered(raw, value[0]) >= 0 && compareOrdered(raw, value[1]) <= 0;
    }
    case 'CONTAINS':
      return text(raw).toLowerCase().includes(text(value).toLowerCase());
    case 'STARTS_WITH':
      return text(raw).toLowerCase().startsWith(text(value).toLowerCase());
    case 'IS_NULL':
      return raw === null || raw === undefined || raw === '';
    case 'IS_NOT_NULL':
      return !(raw === null || raw === undefined || raw === '');
    default:
      return false;
  }
}

function validateQuery(query: BiQuery): { sourceFields: Map<string, BiFieldDefinition>; dimensions: BiFieldDefinition[]; measures: BiFieldDefinition[] } {
  const source = BI_SOURCES[query.source];
  if (!source) {
    throw new Error(`Source analytique inconnue : « ${String(query.source)} ».`);
  }
  const sourceFields = new Map(source.fields.map(field => [field.key, field]));
  const dimensions = query.dimensions.map(key => {
    const field = sourceFields.get(key);
    if (!field || field.role !== 'DIMENSION') {
      throw new Error(`Dimension non autorisée pour la source « ${source.label} » : « ${key} ».`);
    }
    return field;
  });
  const measures = query.measures.map(key => {
    const field = sourceFields.get(key);
    if (!field || field.role !== 'MEASURE') {
      throw new Error(`Mesure non autorisée pour la source « ${source.label} » : « ${key} ».`);
    }
    return field;
  });
  if (dimensions.length === 0 && measures.length === 0) {
    throw new Error('La requête doit contenir au moins une dimension ou une mesure autorisée.');
  }
  for (const filter of query.filters || []) {
    if (!sourceFields.has(filter.field)) {
      throw new Error(`Filtre non autorisé sur le champ « ${filter.field} ».`);
    }
    if (!ALLOWED_OPERATORS.has(filter.operator)) {
      throw new Error(`Opérateur de filtre non autorisé : « ${filter.operator} ».`);
    }
    if (filter.value !== undefined && typeof filter.value === 'object' && !Array.isArray(filter.value)) {
      throw new Error('Valeur de filtre invalide : les objets ne sont pas autorisés.');
    }
  }
  return { sourceFields, dimensions, measures };
}

// ---------------------------------------------------------------------------
// Agrégation
// ---------------------------------------------------------------------------

function aggregateRows(rows: BiFactRow[], field: BiFieldDefinition): number | null {
  if (!field.aggregation) return null;
  const aggregation: BiAggregation = field.aggregation;
  if (aggregation === 'COUNT') return rows.length;
  if (aggregation === 'RATIO') {
    const numerator = rows.reduce((sum, row) => sum + num(row[field.numerator ?? field.field ?? '']), 0);
    const denominator = rows.reduce((sum, row) => sum + num(row[field.denominator ?? '']), 0);
    if (denominator === 0) return null;
    const ratio = numerator / denominator;
    return field.format === 'PERCENT' ? ratio * 100 : ratio;
  }
  const values = rows
    .map(row => row[field.field ?? ''])
    .filter(value => value !== null && value !== undefined && value !== '')
    .map(num);
  if (values.length === 0) return 0;
  switch (aggregation) {
    case 'SUM':
      return values.reduce((sum, value) => sum + value, 0);
    case 'AVG':
      return values.reduce((sum, value) => sum + value, 0) / values.length;
    case 'MIN':
      return Math.min(...values);
    case 'MAX':
      return Math.max(...values);
    default:
      return null;
  }
}

/**
 * Exécute une requête analytique structurée et sécurisée.
 * Lève une erreur si la source, un champ, un opérateur ou le périmètre est refusé.
 */
export function runBiQuery(
  snapshot: BiSnapshot,
  query: BiQuery,
  scope: BiScope,
  options?: { maxRows?: number; defaultLimit?: number }
): BiQueryResult {
  const { dimensions, measures } = validateQuery(query);
  const source = BI_SOURCES[query.source];
  const maxRows = Math.max(1, Math.min(options?.maxRows ?? MAX_QUERY_ROWS, MAX_QUERY_ROWS));
  const requestedLimit = query.limit ?? options?.defaultLimit ?? DEFAULT_QUERY_ROWS;
  const limit = Math.max(1, Math.min(requestedLimit, maxRows));
  const offset = Math.max(0, query.offset ?? 0);

  if (!scope.allDepartments && scope.departments.length > 0 && !scope.departments.includes(source.department)) {
    throw new Error(
      `Périmètre service insuffisant : la source « ${source.label} » relève du service ${source.department}.`
    );
  }

  const scopedRows = (snapshot.rows[query.source] || []).filter(row => isRowInScope(row, query.source, scope));
  const filtered = scopedRows.filter(row => (query.filters || []).every(filter => matchesFilter(row, filter)));

  const groups = new Map<string, BiFactRow[]>();
  const dimensionValues = new Map<string, Array<string | number | null>>();
  for (const row of filtered) {
    const values = dimensions.map(field => {
      const raw = row[field.key];
      if (raw === null || raw === undefined) return null;
      if (typeof raw === 'number') return raw;
      if (typeof raw === 'boolean') return raw ? 'Oui' : 'Non';
      return String(raw);
    });
    const key = values.map(value => String(value ?? '')).join('\u0001');
    if (!groups.has(key)) {
      groups.set(key, []);
      dimensionValues.set(key, values);
    }
    groups.get(key)!.push(row);
  }

  let resultRows: Array<Record<string, string | number | null>> = Array.from(groups.entries()).map(([key, groupRows]) => {
    const output: Record<string, string | number | null> = {};
    dimensions.forEach((field, index) => {
      output[field.key] = dimensionValues.get(key)?.[index] ?? null;
    });
    measures.forEach(field => {
      output[field.key] = aggregateRows(groupRows, field);
    });
    return output;
  });

  if (query.orderBy && query.orderBy.length > 0) {
    const orderBy = query.orderBy;
    resultRows = resultRows.sort((left, right) => {
      for (const order of orderBy) {
        const a = left[order.field];
        const b = right[order.field];
        const comparison = compareValues(a, b);
        if (comparison !== 0) return order.direction === 'DESC' ? -comparison : comparison;
      }
      return 0;
    });
  } else if (dimensions.length > 0) {
    const first = dimensions[0];
    const calendarField = CALENDAR_DIMENSIONS.some(field => field.key === first.key);
    if (calendarField) {
      resultRows.sort((left, right) => compareValues(left[first.key], right[first.key]));
    } else if (measures.length > 0) {
      resultRows.sort((left, right) => compareValues(right[measures[0].key], left[measures[0].key]));
    }
  }

  const totalRows = resultRows.length;
  const paged = resultRows.slice(offset, offset + limit);

  const columns: BiQueryColumn[] = [
    ...dimensions.map(field => ({
      key: field.key,
      label: field.label,
      role: 'DIMENSION' as const,
      format: (field.format ?? (field.type === 'date' ? 'DATE' : 'NUMBER')) as BiQueryColumn['format'],
      unit: field.unit,
    })),
    ...measures.map(field => ({
      key: field.key,
      label: field.label,
      role: 'MEASURE' as const,
      format: (field.format ?? 'NUMBER') as BiQueryColumn['format'],
      unit: field.unit,
    })),
  ];

  return {
    source: query.source,
    sourceLabel: source.label,
    columns,
    rows: paged,
    totalRows,
    truncated: totalRows > offset + paged.length,
    generatedAt: new Date().toISOString(),
    filters: query.filters,
    scope,
    warnings: snapshot.warnings,
  };
}

// ---------------------------------------------------------------------------
// Périodes et mesures documentées
// ---------------------------------------------------------------------------

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function endOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

export function resolveBiPeriod(period: BiKpiPeriod, now = new Date(), custom?: BiPeriod): BiPeriod {
  if (period === 'ALL') return {};
  if (period === 'CUSTOM') return custom ?? {};
  const year = now.getFullYear();
  const month = now.getMonth();
  switch (period) {
    case 'CURRENT_MONTH':
      return {
        from: isoDay(new Date(year, month, 1).toISOString()),
        to: isoDay(endOfDay(new Date(year, month + 1, 0)).toISOString()),
        label: `Mois en cours (${MONTHS_FR[month]} ${year})`,
      };
    case 'LAST_MONTH':
      return {
        from: isoDay(new Date(year, month - 1, 1).toISOString()),
        to: isoDay(endOfDay(new Date(year, month, 0)).toISOString()),
        label: `Mois précédent (${MONTHS_FR[(month + 11) % 12]} ${month === 0 ? year - 1 : year})`,
      };
    case 'CURRENT_QUARTER': {
      const quarterStart = Math.floor(month / 3) * 3;
      return {
        from: isoDay(new Date(year, quarterStart, 1).toISOString()),
        to: isoDay(endOfDay(new Date(year, quarterStart + 3, 0)).toISOString()),
        label: `Trimestre en cours (T${Math.floor(month / 3) + 1} ${year})`,
      };
    }
    case 'CURRENT_YEAR':
      return {
        from: `${year}-01-01`,
        to: `${year}-12-31`,
        label: `Année ${year}`,
      };
    case 'LAST_12_MONTHS':
      return {
        from: isoDay(new Date(year, month - 11, 1).toISOString()),
        to: isoDay(endOfDay(new Date(year, month + 1, 0)).toISOString()),
        label: '12 derniers mois',
      };
    default:
      return {};
  }
}

function rowInPeriod(row: BiFactRow, period?: BiPeriod): boolean {
  if (!period || (!period.from && !period.to)) return true;
  const value = text(row.date);
  if (!value) return false;
  if (period.from && value < period.from) return false;
  if (period.to && value > period.to) return false;
  return true;
}

function aggregateSourceMeasure(
  snapshot: BiSnapshot,
  source: BiSourceId,
  field: BiFieldDefinition,
  scope: BiScope,
  period?: BiPeriod
): number | null {
  let rows = (snapshot.rows[source] || []).filter(row => isRowInScope(row, source, scope));
  if (source !== 'stock' && source !== 'maintenance') {
    rows = rows.filter(row => rowInPeriod(row, period));
  }
  return aggregateRows(rows, field);
}

/**
 * Calcule toutes les mesures documentées pour une période et un périmètre.
 * Les mesures non calculables retournent null, jamais une valeur inventée.
 */
export function computeBiMeasureValues(
  snapshot: BiSnapshot,
  scope: BiScope,
  period?: BiPeriod
): { values: Record<string, number | null>; details: BiMeasureValue[]; warnings: string[] } {
  const values: Record<string, number | null> = {};
  const details: BiMeasureValue[] = [];
  const warnings = [...snapshot.warnings];

  for (const measure of Object.values(BI_MEASURES)) {
    const source = BI_SOURCES[measure.source];
    const sourceField = source.fields.find(candidate => candidate.key === measure.field);
    if (!sourceField) {
      values[measure.code] = null;
      details.push({ ...measure, value: null });
      continue;
    }
    // Les mesures de ratio portent leur propre numérateur / dénominateur :
    // on ne réutilise pas l'agrégation du champ brut (sinon on obtiendrait une somme).
    const field: BiFieldDefinition =
      measure.aggregation === 'RATIO'
        ? {
            ...sourceField,
            aggregation: 'RATIO',
            numerator: measure.numerator,
            denominator: measure.denominator,
            format: measure.format,
          }
        : sourceField;
    const value = aggregateSourceMeasure(snapshot, measure.source, field, scope, period);
    values[measure.code] = value;
    details.push({ ...measure, value });
  }

  values[BI_MEASURE_STOCK_MOYEN.code] = null;
  details.push({ ...BI_MEASURE_STOCK_MOYEN, value: null });
  warnings.push(
    'Stock moyen et rotation des stocks : non calculables sans historique quotidien de stock. Le mode BI LAN activera les snapshots quotidiens.'
  );

  return { values, details, warnings };
}

// ---------------------------------------------------------------------------
// Moteur de formules KPI sécurisé (sans eval)
// ---------------------------------------------------------------------------

type FormulaToken =
  | { type: 'NUMBER'; value: number }
  | { type: 'IDENTIFIER'; value: string }
  | { type: 'OPERATOR'; value: '+' | '-' | '*' | '/' | '(' | ')' | ',' };

function tokenizeFormula(formula: string): FormulaToken[] {
  const tokens: FormulaToken[] = [];
  let index = 0;
  while (index < formula.length) {
    const char = formula[index];
    if (/\s/.test(char)) {
      index += 1;
      continue;
    }
    if (/[0-9.]/.test(char)) {
      let numberText = '';
      while (index < formula.length && /[0-9.]/.test(formula[index])) {
        numberText += formula[index];
        index += 1;
      }
      const value = Number(numberText);
      if (!Number.isFinite(value)) throw new Error(`Nombre invalide : « ${numberText} ».`);
      tokens.push({ type: 'NUMBER', value });
      continue;
    }
    if (/[A-Za-z_]/.test(char)) {
      let identifier = '';
      while (index < formula.length && /[A-Za-z0-9_]/.test(formula[index])) {
        identifier += formula[index];
        index += 1;
      }
      tokens.push({ type: 'IDENTIFIER', value: identifier });
      continue;
    }
    if ('+-*/(),'.includes(char)) {
      tokens.push({ type: 'OPERATOR', value: char as '+' | '-' | '*' | '/' | '(' | ')' | ',' });
      index += 1;
      continue;
    }
    throw new Error(`Caractère interdit dans la formule : « ${char} ».`);
  }
  return tokens;
}

interface FormulaParserResult {
  value: number | null;
  identifiers: Set<string>;
  divisionByZero: boolean;
}

function parseFormula(formula: string, resolve: (identifier: string) => number | null): FormulaParserResult {
  const tokens = tokenizeFormula(formula);
  let position = 0;
  const identifiers = new Set<string>();
  let divisionByZero = false;

  const peek = (): FormulaToken | undefined => tokens[position];
  const consume = (): FormulaToken => {
    const token = tokens[position];
    if (!token) throw new Error('Formule incomplète.');
    position += 1;
    return token;
  };

  const applyBinary = (operator: string, left: number | null, right: number | null): number | null => {
    if (left === null || right === null) return null;
    switch (operator) {
      case '+': return left + right;
      case '-': return left - right;
      case '*': return left * right;
      case '/':
        if (right === 0) {
          divisionByZero = true;
          return null;
        }
        return left / right;
      default:
        throw new Error(`Opérateur inconnu : « ${operator} ».`);
    }
  };

  const parseFactor = (): number | null => {
    const token = peek();
    if (!token) throw new Error('Formule incomplète.');
    if (token.type === 'NUMBER') {
      consume();
      return token.value;
    }
    if (token.type === 'IDENTIFIER') {
      consume();
      const name = token.value;
      identifiers.add(name);
      if (peek()?.type === 'OPERATOR' && (peek() as { value: string }).value === '(') {
        consume(); // (
        const args: Array<number | null> = [];
        if (!(peek()?.type === 'OPERATOR' && (peek() as { value: string }).value === ')')) {
          args.push(parseExpression());
          while (peek()?.type === 'OPERATOR' && (peek() as { value: string }).value === ',') {
            consume();
            args.push(parseExpression());
          }
        }
        if (!(peek()?.type === 'OPERATOR' && (peek() as { value: string }).value === ')')) {
          throw new Error(`Parenthèse fermante attendue après la fonction « ${name} ».`);
        }
        consume(); // )
        return applyFunction(name, args, divisionByZero);
      }
      return resolve(name);
    }
    if (token.type === 'OPERATOR' && token.value === '(') {
      consume();
      const value = parseExpression();
      if (!(peek()?.type === 'OPERATOR' && (peek() as { value: string }).value === ')')) {
        throw new Error('Parenthèse fermante attendue.');
      }
      consume();
      return value;
    }
    if (token.type === 'OPERATOR' && token.value === '-') {
      consume();
      const value = parseFactor();
      return value === null ? null : -value;
    }
    throw new Error(`Élément inattendu dans la formule : « ${String(token.value)} ».`);
  };

  const parseTerm = (): number | null => {
    let value = parseFactor();
    while (peek()?.type === 'OPERATOR' && ['*', '/'].includes((peek() as { value: string }).value)) {
      const operator = (consume() as { value: string }).value;
      const right = parseFactor();
      value = applyBinary(operator, value, right);
    }
    return value;
  };

  const parseExpression = (): number | null => {
    let value = parseTerm();
    while (peek()?.type === 'OPERATOR' && ['+', '-'].includes((peek() as { value: string }).value)) {
      const operator = (consume() as { value: string }).value;
      const right = parseTerm();
      value = applyBinary(operator, value, right);
    }
    return value;
  };

  if (tokens.length === 0) throw new Error('La formule est vide.');
  const value = parseExpression();
  if (position < tokens.length) {
    throw new Error('Formule invalide : éléments supplémentaires après la fin de l’expression.');
  }
  return { value, identifiers, divisionByZero };
}

function applyFunction(name: string, args: Array<number | null>, divisionByZero: boolean): number | null {
  const upper = name.toUpperCase();
  if (upper === 'SAFE_DIV') {
    if (args.length !== 2) throw new Error('SAFE_DIV attend exactement deux arguments.');
    const [numerator, denominator] = args;
    if (numerator === null || denominator === null) return null;
    if (denominator === 0) return null;
    return numerator / denominator;
  }
  if (upper === 'ABS') {
    if (args.length !== 1 || args[0] === null) return null;
    return Math.abs(args[0]);
  }
  if (upper === 'ROUND') {
    if (args.length < 1 || args.length > 2 || args[0] === null) return null;
    const digits = args.length === 2 && args[1] !== null ? Math.max(0, Math.min(6, Math.trunc(args[1]))) : 0;
    const factor = 10 ** digits;
    return Math.round(args[0] * factor) / factor;
  }
  if (upper === 'MIN' || upper === 'MAX') {
    if (args.length === 0 || args.some(arg => arg === null)) return null;
    return upper === 'MIN' ? Math.min(...(args as number[])) : Math.max(...(args as number[]));
  }
  if (divisionByZero) return null;
  throw new Error(`Fonction non autorisée dans une formule : « ${name} ».`);
}

/** Valide la syntaxe d'une formule et vérifie les identifiants autorisés. */
export function validateBiFormula(
  formula: string,
  allowedIdentifiers: string[] = BI_MEASURE_CODES
): { valid: boolean; error?: string; identifiers: string[] } {
  try {
    const result = parseFormula(formula, () => 1);
    const allowed = new Set(allowedIdentifiers.map(identifier => identifier.toUpperCase()));
    const unknown = Array.from(result.identifiers).filter(identifier => !allowed.has(identifier.toUpperCase()));
    if (unknown.length > 0) {
      return {
        valid: false,
        error: `Indicateur(s) inconnu(s) : ${unknown.join(', ')}. Utilisez uniquement les mesures du catalogue.`,
        identifiers: Array.from(result.identifiers),
      };
    }
    return { valid: true, identifiers: Array.from(result.identifiers) };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Formule invalide.',
      identifiers: [],
    };
  }
}

/** Évalue une formule KPI à partir des mesures réelles du moteur. */
export function evaluateBiFormula(
  formula: string,
  values: Record<string, number | null>
): BiFormulaEvaluation {
  try {
    const result = parseFormula(formula, identifier => {
      const key = Object.keys(values).find(candidate => candidate.toUpperCase() === identifier.toUpperCase());
      if (!key) throw new Error(`Indicateur inconnu : « ${identifier} ».`);
      return values[key];
    });
    if (result.value === null) {
      return {
        value: null,
        valid: false,
        error: result.divisionByZero
          ? 'Division par zéro : le KPI n’est pas calculable sur cette période.'
          : 'Donnée manquante : le KPI n’est pas calculable sur cette période.',
        identifiers: Array.from(result.identifiers),
      };
    }
    return { value: result.value, valid: true, identifiers: Array.from(result.identifiers) };
  } catch (error) {
    return {
      value: null,
      valid: false,
      error: error instanceof Error ? error.message : 'Formule invalide.',
      identifiers: [],
    };
  }
}

export interface BiKpiComputation {
  kpi: BiKpi;
  value: number | null;
  valid: boolean;
  error?: string;
  period: BiPeriod;
  values: Record<string, number | null>;
  warnings: string[];
}

/** Calcule un KPI défini par l'utilisateur avec le moteur de formules sécurisé. */
export function computeBiKpi(
  kpi: BiKpi,
  snapshot: BiSnapshot,
  scope: BiScope,
  customPeriod?: BiPeriod
): BiKpiComputation {
  const period = resolveBiPeriod(kpi.period, new Date(), customPeriod);
  const { values, warnings } = computeBiMeasureValues(snapshot, scope, period);
  const evaluation = evaluateBiFormula(kpi.formula, values);
  return {
    kpi,
    value: evaluation.value,
    valid: evaluation.valid,
    error: evaluation.error,
    period,
    values,
    warnings,
  };
}

/** Construit la requête d'un widget à partir de sa définition persistée. */
export function buildWidgetQuery(widget: {
  source: BiSourceId;
  dimensions: string[];
  measures: string[];
  filters: BiFilter[];
  limit?: number;
}): BiQuery {
  return {
    source: widget.source,
    dimensions: [...widget.dimensions],
    measures: [...widget.measures],
    filters: [...widget.filters],
    limit: widget.limit,
  };
}

/** Vérifie qu'un identifiant de mesure documenté existe. */
export function isKnownMeasureCode(code: string): boolean {
  return code === BI_MEASURE_STOCK_MOYEN.code || Boolean(BI_MEASURES[code]);
}

/** Retourne le libellé d'une mesure documentée. */
export function getMeasureLabel(code: string): string {
  return BI_MEASURES[code]?.label ?? (code === BI_MEASURE_STOCK_MOYEN.code ? BI_MEASURE_STOCK_MOYEN.label : code);
}

// ---------------------------------------------------------------------------
// Séries mensuelles & détection d'anomalies statistiques
// ---------------------------------------------------------------------------

export interface BiMonthlyPoint {
  period: string;
  label: string;
  value: number | null;
}

/**
 * Série mensuelle d'une mesure documentée sur les N derniers mois.
 * Utilisée par les alertes statistiques et l'AI Analyst.
 */
export function computeBiMeasureMonthlySeries(
  snapshot: BiSnapshot,
  scope: BiScope,
  measureCode: string,
  months = 12,
  now = new Date()
): BiMonthlyPoint[] {
  const measure = BI_MEASURES[measureCode];
  if (!measure) return [];
  const source = BI_SOURCES[measure.source];
  const field = source.fields.find(candidate => candidate.key === measure.field);
  if (!field) return [];
  const safeMonths = Math.max(3, Math.min(36, Math.trunc(months)));
  const series: BiMonthlyPoint[] = [];
  for (let offset = safeMonths - 1; offset >= 0; offset -= 1) {
    const start = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - offset + 1, 0);
    const period: BiPeriod = {
      from: isoDay(start.toISOString()),
      to: isoDay(end.toISOString()),
    };
    series.push({
      period: `${start.getFullYear()}-${pad2(start.getMonth() + 1)}`,
      label: `${MONTHS_FR[start.getMonth()]} ${start.getFullYear()}`,
      value: aggregateSourceMeasure(snapshot, measure.source, field, scope, period),
    });
  }
  return series;
}

export interface BiAnomalyResult {
  isAnomaly: boolean;
  current: number | null;
  mean: number | null;
  stdDev: number | null;
  zScore: number | null;
  direction: 'HAUSSE' | 'BAISSE' | null;
  baselinePeriods: number;
}

/**
 * Détecte une anomalie statistique sur la dernière valeur d'une série :
 * comparaison à la moyenne des périodes précédentes, en nombre d'écarts-types.
 * Retourne toujours un résultat explicite, jamais une valeur inventée.
 */
export function detectBiAnomaly(
  values: Array<number | null>,
  deviationFactor = 2
): BiAnomalyResult {
  const empty: BiAnomalyResult = {
    isAnomaly: false,
    current: null,
    mean: null,
    stdDev: null,
    zScore: null,
    direction: null,
    baselinePeriods: 0,
  };
  const clean = values.filter((value): value is number => value !== null && Number.isFinite(value));
  if (clean.length < 3) return { ...empty, baselinePeriods: clean.length };
  const current = clean[clean.length - 1];
  const baseline = clean.slice(0, -1);
  const mean = baseline.reduce((sum, value) => sum + value, 0) / baseline.length;
  const variance =
    baseline.reduce((sum, value) => sum + (value - mean) ** 2, 0) / baseline.length;
  const stdDev = Math.sqrt(variance);
  if (!Number.isFinite(stdDev) || stdDev === 0) {
    return {
      isAnomaly: false,
      current,
      mean,
      stdDev,
      zScore: null,
      direction: null,
      baselinePeriods: baseline.length,
    };
  }
  const zScore = (current - mean) / stdDev;
  const factor = Math.max(1, Math.min(6, deviationFactor));
  return {
    isAnomaly: Math.abs(zScore) >= factor,
    current,
    mean,
    stdDev,
    zScore,
    direction: zScore >= 0 ? 'HAUSSE' : 'BAISSE',
    baselinePeriods: baseline.length,
  };
}

export { getBiField };
