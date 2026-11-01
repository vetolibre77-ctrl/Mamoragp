/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * MAMORA GP — Moteur Transactionnel & Persistance
 * Conforme ISO 22000:2018 (Intégrité, Audit-Trail, Verrous Sanitaires)
 */

import {
  User,
  UserRole,
  Item,
  Recipe,
  NomenclatureStatus,
  RawBatchReception,
  WorkOrder,
  ManufacturingStepLog,
  SeamingInspection,
  AutoclaveCycle,
  HaccpMonitoringRecord,
  NonConformity,
  FinishedBatch,
  Customer,
  SalesOrder,
  DeliveryNote,
  Invoice,
  Equipment,
  AuditLogEntry,
  StockMovement,
  ConsumptionRecord,
  PIN_RESET_ROLES,
  PERMISSION_FAMILIES,
  AuditPermission,
  AUDIT_PERMISSION_LABELS,
  findFishItemForSpecies,
  Warehouse,
  WarehouseLocation,
  StockLot,
  WarehouseStock,
  StockTransfer,
  StockTransit,
  StockQualityStatus,
  QUALITY_STATUS_GROUPS,
  BatchReleaseStatus,
  ConsumptionLine,
  WarehousePermission,
  WAREHOUSE_ROLE_PERMISSIONS,
  TransferStatus,
  TransferType,
  TransferLineInput,
  CreateTransferInput,
  ShipTransferLineInput,
  ReceiveTransferLineInput,
  ConsolidatedStock,
  StockMovementType,
  TransferDiscrepancy,
  WarehouseType,
  UnitOfMeasure,
  WarehouseDashboard,
  WorkOrderMaterialRequirement,
  WAREHOUSE_PERMISSION_LABELS,
  ItemCategoryGroup,
  ItemSubCategory,
  Supplier,
  ItemChangeLog,
  ItemChangeAction,
  ItemPermission,
  ITEM_ROLE_PERMISSIONS,
  ITEM_PERMISSION_LABELS,
  ITEM_FIELD_LABELS,
  ITEM_CATEGORY_LABELS,
  ITEM_CATEGORY_GROUP_LABELS,
  groupForCategory,
  ITEM_CATEGORY_GROUPS,
  PurchaseRequest,
  PurchaseRequestLine,
  PurchaseRequestStatus,
  PurchaseRequestType,
  PurchasePriority,
  ProcurementDepartment,
  ApprovalStep,
  ApprovalDecision,
  ApprovalDecisionKind,
  ProcurementBudget,
  ProcurementBudgetStatus,
  ProcurementSettings,
  ProcurementPermission,
  ProcurementDashboard,
  ReplenishmentProposal,
  PROCUREMENT_ROLE_PERMISSIONS,
  PROCUREMENT_PERMISSION_LABELS,
  PURCHASE_REQUEST_STATUS_LABELS,
  SupplierConsultation,
  ConsultationStatus,
  SupplierQuote,
  SupplierQuoteLine,
  PurchaseOrder,
  PurchaseOrderLine,
  PurchaseOrderStatus,
  PurchaseReceipt,
  PurchaseReceiptLine,
  ReceiptQualityStatus,
  SupplierContract,
  SupplierContractStatus,
  SupplierEvaluation,
  PURCHASE_ORDER_STATUS_LABELS,
  RECEIPT_QUALITY_STATUS_LABELS,
  // --- GDS ---
  GdsScope,
  GdsPermission,
  GdsSettings,
  GdsDashboard,
  GdsStockRow,
  GdsAlert,
  GdsReport,
  GdsFamilyBreakdown,
  GdsWarehouseBreakdown,
  GDS_ROLE_PERMISSIONS,
  GDS_PERMISSION_LABELS,
  DEFAULT_GDS_SETTINGS,
  StockInventory,
  InventoryLine,
  InventoryType,
  InventoryStatus,
  FinishedGoodsIssue,
  FinishedGoodsIssueLine,
  FinishedGoodsIssueMotive,
  FinishedGoodsIssueStatus,
  WorkOrderIssueReconciliation,
  LotTraceability,
  GdsLotRow,
  GdsProductionReceiptCandidate,
  Role,
  INVENTORY_TYPE_LABELS,
  INVENTORY_STATUS_LABELS,
  FINISHED_GOODS_ISSUE_MOTIVE_LABELS,
  FINISHED_GOODS_ISSUE_STATUS_LABELS,
  getRoleLabel,
  // --- MAMORA BI ---
  BiPermission,
  BI_ROLE_PERMISSIONS,
  BI_PERMISSION_LABELS,
  BiDashboard,
  BiKpi,
  BiReport,
  BiAlertRule,
  BiAlertEvent,
  BiShare,
  BiRefreshLog,
  BiSettings,
  BiQuery,
  BiQueryResult,
  BiScope,
  BiSnapshot,
  BiPeriod,
  BiSourceId,
  BiAiResponse,
  BiResourceType,
  BiWidget,
  BiValueFormat,
  // --- Export PowerPoint ---
  BiPptxComparisonRow,
  BiPptxConfig,
  BiPptxContentSummary,
  BiPptxDeck,
  BiPptxFormat,
  BiPptxLanguage,
  BiPptxLog,
  BiPptxSelection,
} from '../types';

import {
  BI_SOURCES,
  BI_MEASURES,
  buildDefaultBiAlertRules,
  buildDefaultBiDashboards,
  buildDefaultBiKpis,
} from './bi/catalog';
import {
  buildBiSnapshot,
  buildWidgetQuery,
  computeBiKpi,
  computeBiMeasureMonthlySeries,
  computeBiMeasureValues,
  detectBiAnomaly,
  resolveBiPeriod,
  runBiQuery,
  validateBiFormula,
  type BiKpiComputation,
} from './bi/engine';
import { analyzeBiQuestion, resolveBiAnalystProvider } from './bi/analyst';
import {
  planBiPptxDeck,
  type BiPptxBuildInput,
  type BiPptxResolvedDashboard,
  type BiPptxResolvedExplorer,
  type BiPptxResolvedKpi,
  type BiPptxResolvedReport,
  type BiPptxResolvedWidget,
  type BiPptxStockSplit,
} from './bi/pptx-plan';

import {
  INITIAL_USERS,
  INITIAL_ITEMS,
  INITIAL_ITEM_SUB_CATEGORIES,
  INITIAL_SUPPLIERS,
  INITIAL_RECIPES,
  INITIAL_RECEPTIONS,
  INITIAL_WORK_ORDERS,
  INITIAL_STEP_LOGS,
  INITIAL_SEAMING_INSPECTIONS,
  INITIAL_AUTOCLAVE_CYCLES,
  INITIAL_HACCP_RECORDS,
  INITIAL_NON_CONFORMITIES,
  INITIAL_FINISHED_BATCHES,
  INITIAL_CUSTOMERS,
  INITIAL_SALES_ORDERS,
  INITIAL_DELIVERY_NOTES,
  INITIAL_INVOICES,
  INITIAL_EQUIPMENTS,
  INITIAL_STOCK_MOVEMENTS,
  INITIAL_AUDIT_LOGS,
  INITIAL_CONSUMPTIONS,
  INITIAL_WAREHOUSES,
  INITIAL_WAREHOUSE_LOCATIONS,
  INITIAL_STOCK_LOTS,
  INITIAL_WAREHOUSE_STOCKS,
  INITIAL_STOCK_TRANSFERS,
  INITIAL_STOCK_TRANSITS,
} from '../data/initialData';

const STORAGE_KEY = 'mamora_gp_database_clean_v1';
const CURRENT_USER_KEY = 'mamora_gp_current_user_v1';
/** Session d'authentification : volontairement en sessionStorage, une nouvelle ouverture du navigateur redemande le code PIN. */
const SESSION_KEY = 'mamora_gp_session_v1';
const SESSION_ACTIVITY_KEY = 'mamora_gp_session_activity_v1';
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const PIN_PATTERN = /^\d{4,8}$/;
const PIN_HASH_ROUNDS = 12000;

/**
 * Circuit de validation par défaut : responsable du service demandeur →
 * responsable Approvisionnement → Direction. Les seuils sont nuls (toutes les
 * étapes s'appliquent) et restent modifiables dans les paramètres du module.
 */
const DEFAULT_PROCUREMENT_SETTINGS: ProcurementSettings = {
  currency: 'DZD',
  approvalSteps: [
    { id: 'APR-STEP-1', order: 1, label: 'Responsable du service demandeur', role: 'RESPONSABLE_PRODUCTION' },
    { id: 'APR-STEP-2', order: 2, label: 'Responsable Approvisionnement', role: 'RESPONSABLE_QUALITE' },
    { id: 'APR-STEP-3', order: 3, label: 'Direction', role: 'DIRECTEUR_USINE' },
  ],
  targetStockMultiplier: 2,
  defaultPaymentTermsDays: 30,
  defaultLeadTimeDays: 15,
  qualityHoldByDefault: true,
  maxOverReceptionPercent: 5,
};

/** Libellé lisible d'une période analytique, sans valeur inventée. */
const describeBiPeriodLabel = (period: BiPeriod): string => {
  if (period.label) return period.label;
  const day = (value?: string) =>
    value ? new Date(value).toLocaleDateString('fr-FR') : undefined;
  const from = day(period.from);
  const to = day(period.to);
  if (from && to) return `Du ${from} au ${to}`;
  if (from) return `Depuis le ${from}`;
  if (to) return `Jusqu’au ${to}`;
  return 'Toutes périodes';
};

/** Catégories de stock distinguées dans les diapositives matières / produits finis. */
const BI_PPTX_RAW_CATEGORIES = [
  'POISSON_CONGELE',
  'POISSON_FRAIS',
  'HUILE',
  'SAUCE_EPICES',
  'BOITE_METALLIQUE',
  'COUVERCLE',
  'CARTON_EMBALLAGE',
  'ETIQUETTE',
  'CONSOMMABLE',
  'PRODUIT_CHIMIQUE',
  'PALETTE',
  'PRODUIT_SEMI_FINI',
];

const BI_PPTX_FINISHED_CATEGORIES = ['PRODUIT_FINI_THON', 'PRODUIT_FINI_SARDINE'];

/** Mesures clés comparées entre deux périodes, en complément des KPI choisis. */
const BI_PPTX_COMPARISON_MEASURES = [
  'PROD_TOTAL',
  'TAUX_CONFORMITE',
  'STOCK_DISPO',
  'NC_OUVERTES',
  'CA_TOTAL',
  'ACHATS_MONTANT',
];

/** Paramètres par défaut de MAMORA BI. Aucun secret, aucune clé API. */
const DEFAULT_BI_SETTINGS: BiSettings = {
  aiProvider: 'LOCAL',
  aiEnabled: true,
  aiMaxRequestsPerDay: 200,
  maxRows: 2000,
  defaultPeriodMonths: 12,
  autoRefreshMinutes: 0,
  currency: 'DZD',
};

export interface AppDatabase {
  users: User[];
  /** Rôles configurables avec permissions dynamiques. */
  roles: Role[];
  /** Familles de permissions déjà injectées dans les rôles : évite de réécraser un choix de l'administrateur. */
  permissionFamilies?: string[];
  items: Item[];
  recipes: Recipe[];
  receptions: RawBatchReception[];
  workOrders: WorkOrder[];
  stepLogs: ManufacturingStepLog[];
  seamingInspections: SeamingInspection[];
  autoclaveCycles: AutoclaveCycle[];
  haccpRecords: HaccpMonitoringRecord[];
  nonConformities: NonConformity[];
  finishedBatches: FinishedBatch[];
  customers: Customer[];
  salesOrders: SalesOrder[];
  deliveryNotes: DeliveryNote[];
  invoices: Invoice[];
  equipments: Equipment[];
  stockMovements: StockMovement[];
  auditLogs: AuditLogEntry[];
  consumptions: ConsumptionRecord[];
  // --- Extension multi-magasins (le grand livre stockMovements reste unique) ---
  warehouses: Warehouse[];
  warehouseLocations: WarehouseLocation[];
  stockLots: StockLot[];
  warehouseStocks: WarehouseStock[];
  stockTransfers: StockTransfer[];
  stockTransits: StockTransit[];
  // --- Référentiel matières premières & composants ---
  /** Sous-catégories configurables du référentiel articles. */
  itemSubCategories: ItemSubCategory[];
  /** Référentiel fournisseurs unique (repris des réceptions + saisie manuelle). */
  suppliers: Supplier[];
  /** Journal des modifications des fiches articles, une ligne par champ modifié. */
  itemChangeLogs: ItemChangeLog[];
  // --- Service Approvisionnement ---
  purchaseRequests: PurchaseRequest[];
  procurementBudgets: ProcurementBudget[];
  procurementSettings: ProcurementSettings;
  /** Cycle aval : consultation fournisseurs → offres. */
  supplierConsultations: SupplierConsultation[];
  /** Commandes d'achat issues d'une demande validée ou d'une consultation attribuée. */
  purchaseOrders: PurchaseOrder[];
  /** Réceptions d'achat avec contrôle qualité et mouvements de stock. */
  purchaseReceipts: PurchaseReceipt[];
  /** Contrats et accords-cadres fournisseurs. */
  supplierContracts: SupplierContract[];
  // --- GDS : gestion des stocks matières premières & produits finis ---
  /** Inventaires physiques (MP et PF) avec écarts et ajustements traçables. */
  stockInventories: StockInventory[];
  /** Sorties de produits finis hors circuit commercial (échantillons, rebuts, expéditions). */
  finishedGoodsIssues: FinishedGoodsIssue[];
  /** Paramètres du module GDS. */
  gdsSettings: GdsSettings;
  // --- MAMORA BI : définitions analytiques persistées (aucune donnée métier modifiée) ---
  biDashboards: BiDashboard[];
  biKpis: BiKpi[];
  biReports: BiReport[];
  biAlertRules: BiAlertRule[];
  biAlertEvents: BiAlertEvent[];
  biShares: BiShare[];
  biRefreshLogs: BiRefreshLog[];
  /** Historique des exports PowerPoint (métadonnées uniquement, jamais le fichier). */
  biPresentationLogs: BiPptxLog[];
  biSettings: BiSettings;
  lastBackupDate?: string;
}

function getInitialDatabase(): AppDatabase {
  return {
    users: INITIAL_USERS,
    roles: [],
    items: INITIAL_ITEMS,
    recipes: INITIAL_RECIPES,
    receptions: INITIAL_RECEPTIONS,
    workOrders: INITIAL_WORK_ORDERS,
    stepLogs: INITIAL_STEP_LOGS,
    seamingInspections: INITIAL_SEAMING_INSPECTIONS,
    autoclaveCycles: INITIAL_AUTOCLAVE_CYCLES,
    haccpRecords: INITIAL_HACCP_RECORDS,
    nonConformities: INITIAL_NON_CONFORMITIES,
    finishedBatches: INITIAL_FINISHED_BATCHES,
    customers: INITIAL_CUSTOMERS,
    salesOrders: INITIAL_SALES_ORDERS,
    deliveryNotes: INITIAL_DELIVERY_NOTES,
    invoices: INITIAL_INVOICES,
    equipments: INITIAL_EQUIPMENTS,
    stockMovements: INITIAL_STOCK_MOVEMENTS,
    auditLogs: INITIAL_AUDIT_LOGS,
    consumptions: INITIAL_CONSUMPTIONS,
    warehouses: INITIAL_WAREHOUSES,
    warehouseLocations: INITIAL_WAREHOUSE_LOCATIONS,
    stockLots: INITIAL_STOCK_LOTS,
    warehouseStocks: INITIAL_WAREHOUSE_STOCKS,
    stockTransfers: INITIAL_STOCK_TRANSFERS,
    stockTransits: INITIAL_STOCK_TRANSITS,
    itemSubCategories: INITIAL_ITEM_SUB_CATEGORIES,
    suppliers: INITIAL_SUPPLIERS,
    itemChangeLogs: [],
    purchaseRequests: [],
    procurementBudgets: [],
    procurementSettings: DEFAULT_PROCUREMENT_SETTINGS,
    supplierConsultations: [],
    purchaseOrders: [],
    purchaseReceipts: [],
    supplierContracts: [],
    stockInventories: [],
    finishedGoodsIssues: [],
    gdsSettings: { ...DEFAULT_GDS_SETTINGS },
    biDashboards: [],
    biKpis: [],
    biReports: [],
    biAlertRules: [],
    biAlertEvents: [],
    biShares: [],
    biRefreshLogs: [],
    biPresentationLogs: [],
    biSettings: { ...DEFAULT_BI_SETTINGS },
    lastBackupDate: new Date().toISOString(),
  };
}

/**
 * Normalise les données déjà persistées après extension du modèle de nomenclature.
 * Aucune donnée n'est supprimée : les champs absents reçoivent une valeur déduite de
 * l'existant (une recette déjà approuvée et datée est considérée comme validée).
 */
function migrateDatabase(data: AppDatabase): AppDatabase {
  if (Array.isArray(data.recipes)) {
    data.recipes = data.recipes.map(recipe => {
      const status: NomenclatureStatus =
        recipe.status ?? (recipe.approvedBy && recipe.approvedAt ? 'VALIDEE' : 'BROUILLON');
      return {
        ...recipe,
        status,
        referenceProductionQty: recipe.referenceProductionQty ?? 1000,
        referenceUnit: recipe.referenceUnit ?? 'BOITE',
      };
    });
  }

  // --- Extension multi-magasins : création des collections manquantes ---
  data.warehouses =
    Array.isArray(data.warehouses) && data.warehouses.length > 0
      ? data.warehouses
      : INITIAL_WAREHOUSES.map(w => ({ ...w }));
  data.warehouseLocations =
    Array.isArray(data.warehouseLocations) && data.warehouseLocations.length > 0
      ? data.warehouseLocations
      : INITIAL_WAREHOUSE_LOCATIONS.map(l => ({ ...l }));
  data.stockLots = Array.isArray(data.stockLots) ? data.stockLots : [];
  data.warehouseStocks = Array.isArray(data.warehouseStocks) ? data.warehouseStocks : [];
  data.stockTransfers = Array.isArray(data.stockTransfers) ? data.stockTransfers : [];
  data.stockTransits = Array.isArray(data.stockTransits) ? data.stockTransits : [];

  data.warehouses = data.warehouses.map(w => ({
    ...w,
    isActive: w.isActive ?? true,
    requiresQualityRelease: w.requiresQualityRelease ?? false,
    allowsProductionSupply: w.allowsProductionSupply ?? w.type === 'PRODUCTION',
    allowsProductionOutput: w.allowsProductionOutput ?? w.type === 'PRODUITS_FINIS',
    createdAt: w.createdAt ?? new Date().toISOString(),
  }));
  data.warehouseLocations = data.warehouseLocations.map(l => ({
    ...l,
    isActive: l.isActive ?? true,
    createdAt: l.createdAt ?? new Date().toISOString(),
  }));

  const now = new Date().toISOString();
  const rawWarehouse =
    data.warehouses.find(w => w.type === 'MATIERES_PREMIERES') || data.warehouses[0];
  const finishedWarehouse =
    data.warehouses.find(w => w.type === 'PRODUITS_FINIS') || data.warehouses[0];
  const fallbackLocation = (warehouseId: string) =>
    data.warehouseLocations.find(l => l.warehouseId === warehouseId) ||
    data.warehouseLocations[0];

  // Reprise de l'ancien stock mono-magasin : chaque quantité existante est
  // affectée à un lot de reprise dans le magasin correspondant. Aucun stock
  // historique n'est perdu, et aucun stock n'est compté deux fois.
  const itemsWithWarehouseStock = new Set(data.warehouseStocks.map(s => s.itemId));
  for (const item of data.items || []) {
    if (itemsWithWarehouseStock.has(item.id)) continue;
    const available = Number(item.currentStock) || 0;
    const quarantine = Number(item.quarantineStock) || 0;
    if (available <= 0 && quarantine <= 0) continue;

    const isFinished =
      item.category === 'PRODUIT_FINI_THON' || item.category === 'PRODUIT_FINI_SARDINE';
    const warehouse = isFinished ? finishedWarehouse : rawWarehouse;
    if (!warehouse) continue;
    const location = fallbackLocation(warehouse.id);
    if (!location) continue;

    const lotId = `LOT-REPRISE-${item.id}`;
    const lotNumber = `LOT-REPRISE-${item.code}`;
    if (!data.stockLots.some(l => l.id === lotId)) {
      data.stockLots.push({
        id: lotId,
        lotNumber,
        itemId: item.id,
        itemCode: item.code,
        qualityStatus: 'LIBERE',
        origin: 'Reprise de stock existant',
        createdAt: now,
        warehouseTrail: [
          {
            warehouseId: warehouse.id,
            warehouseCode: warehouse.code,
            locationId: location.id,
            locationCode: location.code,
            enteredAt: now,
          },
        ],
      });
    }
    if (available > 0) {
      data.warehouseStocks.push({
        id: `WS-REPRISE-${item.id}-LIB`,
        warehouseId: warehouse.id,
        locationId: location.id,
        itemId: item.id,
        itemCode: item.code,
        lotId,
        lotNumber,
        qualityStatus: 'LIBERE',
        quantity: available,
        reservedQty: Number(item.allocatedStock) || 0,
        unit: item.unit,
        updatedAt: now,
      });
    }
    if (quarantine > 0) {
      data.warehouseStocks.push({
        id: `WS-REPRISE-${item.id}-QUAR`,
        warehouseId: warehouse.id,
        locationId: location.id,
        itemId: item.id,
        itemCode: item.code,
        lotId,
        lotNumber,
        qualityStatus: 'QUARANTAINE',
        quantity: quarantine,
        reservedQty: 0,
        unit: item.unit,
        updatedAt: now,
      });
    }
  }

  // Recalcul des agrégats consolidés des articles depuis les stocks magasins.
  const round = (n: number) => Number(n.toFixed(4));
  for (const item of data.items || []) {
    const rows = data.warehouseStocks.filter(s => s.itemId === item.id);
    const sum = (predicate: (row: WarehouseStock) => boolean) =>
      round(rows.filter(predicate).reduce((total, row) => total + row.quantity, 0));
    const reserved = round(rows.reduce((total, row) => total + row.reservedQty, 0));
    const libre = sum(row => row.qualityStatus === 'LIBERE');
    const transit = round(
      data.stockTransits
        .filter(t => t.itemId === item.id && t.status === 'EN_TRANSIT')
        .reduce((total, t) => total + t.quantity, 0)
    );
    item.currentStock = round(Math.max(0, libre - reserved));
    item.allocatedStock = reserved;
    item.quarantineStock = sum(row => row.qualityStatus === 'QUARANTAINE');
    item.pendingControlStock = sum(row =>
      QUALITY_STATUS_GROUPS.pending.includes(row.qualityStatus)
    );
    item.blockedStock = sum(row => QUALITY_STATUS_GROUPS.blocked.includes(row.qualityStatus));
    item.transitStock = transit;
  }

  // --- Extension référentiel matières premières & composants ---
  // Aucune donnée existante n'est supprimée : les articles historiques reçoivent
  // un statut actif et un groupe fonctionnel déduit de leur catégorie technique.
  data.itemSubCategories =
    Array.isArray(data.itemSubCategories) && data.itemSubCategories.length > 0
      ? data.itemSubCategories
      : INITIAL_ITEM_SUB_CATEGORIES.map(sub => ({ ...sub }));

  data.itemChangeLogs = Array.isArray(data.itemChangeLogs) ? data.itemChangeLogs : [];

  // --- Service Approvisionnement : collections et paramètres par défaut ---
  data.purchaseRequests = Array.isArray(data.purchaseRequests) ? data.purchaseRequests : [];
  data.procurementBudgets = Array.isArray(data.procurementBudgets) ? data.procurementBudgets : [];
  data.supplierConsultations = Array.isArray(data.supplierConsultations) ? data.supplierConsultations : [];
  data.purchaseOrders = Array.isArray(data.purchaseOrders) ? data.purchaseOrders : [];
  data.purchaseReceipts = Array.isArray(data.purchaseReceipts) ? data.purchaseReceipts : [];
  data.supplierContracts = Array.isArray(data.supplierContracts) ? data.supplierContracts : [];
  data.stockInventories = Array.isArray(data.stockInventories) ? data.stockInventories : [];
  data.finishedGoodsIssues = Array.isArray(data.finishedGoodsIssues) ? data.finishedGoodsIssues : [];
  data.gdsSettings = { ...DEFAULT_GDS_SETTINGS, ...(data.gdsSettings || {}) };
  data.procurementSettings = {
    ...DEFAULT_PROCUREMENT_SETTINGS,
    ...(data.procurementSettings || {}),
    approvalSteps:
      data.procurementSettings?.approvalSteps && data.procurementSettings.approvalSteps.length > 0
        ? data.procurementSettings.approvalSteps
        : DEFAULT_PROCUREMENT_SETTINGS.approvalSteps.map(step => ({ ...step })),
  };

  // --- MAMORA BI : collections de définitions analytiques ---
  data.biDashboards = Array.isArray(data.biDashboards) ? data.biDashboards : [];
  data.biKpis = Array.isArray(data.biKpis) ? data.biKpis : [];
  data.biReports = Array.isArray(data.biReports) ? data.biReports : [];
  data.biAlertRules = Array.isArray(data.biAlertRules) ? data.biAlertRules : [];
  data.biAlertEvents = Array.isArray(data.biAlertEvents) ? data.biAlertEvents : [];
  data.biShares = Array.isArray(data.biShares) ? data.biShares : [];
  data.biRefreshLogs = Array.isArray(data.biRefreshLogs) ? data.biRefreshLogs : [];
  data.biPresentationLogs = Array.isArray(data.biPresentationLogs)
    ? data.biPresentationLogs
    : [];
  data.biSettings = { ...DEFAULT_BI_SETTINGS, ...(data.biSettings || {}) };
  if (!data.biSettings.initializedAt) {
    // Première migration BI : livrer les dashboards, KPI et alertes par défaut.
    // Le marqueur initializedAt évite de réinjecter ces éléments si l'administrateur
    // les supprime ensuite volontairement.
    data.biSettings.initializedAt = now;
    if (data.biDashboards.length === 0) {
      data.biDashboards = buildDefaultBiDashboards(now);
    }
    if (data.biKpis.length === 0) {
      data.biKpis = buildDefaultBiKpis(now);
    }
    if (data.biAlertRules.length === 0) {
      data.biAlertRules = buildDefaultBiAlertRules(now);
    }
  }

  data.items = (data.items || []).map(item => ({
    ...item,
    isActive: item.isActive ?? true,
    group: item.group ?? groupForCategory(item.category),
    createdAt: item.createdAt ?? now,
  }));

  // Reprise du référentiel fournisseurs existant : les noms saisis sur les
  // réceptions constituent la seule source historique. Chaque nom distinct devient
  // une fiche fournisseur, sans doublon et sans perte d'information.
  data.suppliers = Array.isArray(data.suppliers) ? data.suppliers : [];
  const knownSupplierNames = new Set(
    data.suppliers.map(supplier => supplier.name.trim().toLowerCase())
  );
  for (const reception of data.receptions || []) {
    const name = (reception.supplier || '').trim();
    if (!name || knownSupplierNames.has(name.toLowerCase())) continue;
    knownSupplierNames.add(name.toLowerCase());
    data.suppliers.push({
      id: `SUP-LEGACY-${data.suppliers.length + 1}`,
      code: `FRN-${String(data.suppliers.length + 1).padStart(3, '0')}`,
      name,
      isActive: true,
      origin: 'RECEPTIONS',
      createdAt: now,
    });
  }

  // Référentiel fournisseurs de démarrage : injecté uniquement si aucun fournisseur
  // n'existe (jamais d'écrasement d'un référentiel déjà saisi par l'utilisateur).
  if (data.suppliers.length === 0) {
    data.suppliers = INITIAL_SUPPLIERS.map(supplier => ({ ...supplier }));
  }

  // --- Migration USER MANAGER : champs utilisateur étendus + référentiel rôles ---
  data.users = (data.users || []).map(user => {
    const migrated: User = {
      ...user,
      username: (user as any).username || user.id,
      status: (user as any).status || ((user as any).isActive ? 'ACTIF' : 'INACTIF'),
      createdAt: (user as any).createdAt || now,
      updatedAt: (user as any).updatedAt || now,
      failedLoginAttempts: (user as any).failedLoginAttempts ?? 0,
    };
    // Supprimer l'ancien champ isActive s'il existe (optionnel, évite la confusion)
    delete (migrated as any).isActive;
    return migrated;
  });

  data.roles = Array.isArray(data.roles) ? data.roles : [];
  if (data.roles.length === 0) {
    // Initialisation des rôles depuis les matrices de permissions figées
    const allRoleKeys: UserRole[] = [
      'ADMIN', 'DIRECTEUR_USINE', 'RESPONSABLE_COMMERCIAL', 'RESPONSABLE_PRODUCTION',
      'CHEF_DE_LIGNE', 'OPERATEUR', 'RESPONSABLE_QUALITE', 'TECHNICIEN_LABO',
      'RESPONSABLE_MAINTENANCE', 'MAGASINIER', 'AUDITEUR_EXTERNE',
    ];
    const roleNames: Record<UserRole, string> = {
      ADMIN: 'Administrateur',
      DIRECTEUR_USINE: 'Directeur d\'Usine',
      RESPONSABLE_COMMERCIAL: 'Responsable Commercial',
      RESPONSABLE_PRODUCTION: 'Responsable Production',
      CHEF_DE_LIGNE: 'Chef de Ligne',
      OPERATEUR: 'Opérateur',
      RESPONSABLE_QUALITE: 'Responsable Qualité',
      TECHNICIEN_LABO: 'Technicien Laboratoire',
      RESPONSABLE_MAINTENANCE: 'Responsable Maintenance',
      MAGASINIER: 'Magasinier',
      AUDITEUR_EXTERNE: 'Auditeur Externe',
    };
    for (const roleKey of allRoleKeys) {
      const perms = new Set<string>();
      for (const family of PERMISSION_FAMILIES) {
        for (const p of family.matrix[roleKey] || []) perms.add(p);
      }
      data.roles.push({
        id: `ROLE-${roleKey}`,
        roleKey,
        name: roleNames[roleKey],
        description: `Rôle ${roleNames[roleKey]} — importé depuis la configuration existante.`,
        isActive: true,
        permissions: Array.from(perms),
        createdAt: now,
        updatedAt: now,
      });
    }
    data.permissionFamilies = PERMISSION_FAMILIES.map(family => family.key);
  } else {
    // Base déjà initialisée : injecter uniquement les familles de permissions apparues
    // depuis, sans toucher aux droits que l'administrateur a pu retirer lui-même.
    const seededFamilies = new Set(data.permissionFamilies || []);
    for (const family of PERMISSION_FAMILIES) {
      if (seededFamilies.has(family.key)) continue;
      for (const role of data.roles) {
        const granted = family.matrix[role.roleKey];
        if (!granted || granted.length === 0) continue;
        const merged = new Set(role.permissions);
        granted.forEach(permission => merged.add(permission));
        role.permissions = Array.from(merged);
      }
      seededFamilies.add(family.key);
    }
    data.permissionFamilies = Array.from(seededFamilies);
  }

  return data;
}

class StorageService {
  private db: AppDatabase;
  private currentUser: User;
  private listeners: Set<() => void> = new Set();
  /** Cache mémoire du snapshot analytique. Jamais persisté dans localStorage. */
  private biSnapshotCache: BiSnapshot | null = null;

  constructor() {
    this.db = this.loadDatabase();
    this.currentUser = this.loadCurrentUser();
  }

  private loadDatabase(): AppDatabase {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: AppDatabase = JSON.parse(stored);
        return migrateDatabase(parsed);
      }
    } catch (e) {
      console.warn('Erreur de lecture du stockage local MAMORA GP. Initialisation base propre:', e);
    }
    // Base neuve : la migration est appliquée dès l'initialisation afin que le
    // référentiel livré soit déjà normalisé (statut actif, groupe fonctionnel).
    const init = migrateDatabase(getInitialDatabase());
    this.saveDatabase(init);
    return init;
  }

  private saveDatabase(data: AppDatabase) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      // Toute mutation invalide le snapshot analytique : la BI relira les données réelles.
      this.biSnapshotCache = null;
      this.notifyListeners();
    } catch (e) {
      console.error('Erreur d\'écriture dans le stockage local:', e);
    }
  }

  private loadCurrentUser(): User {
    try {
      const stored = localStorage.getItem(CURRENT_USER_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const exists = this.db.users.find(u => u.id === parsed.id);
        if (exists) return exists;
      }
    } catch {
      // Ignorer et revenir au défaut
    }
    // Par défaut : Responsable Qualité (ou Admin)
    return this.db.users.find(u => u.role === 'RESPONSABLE_QUALITE') || this.db.users[0];
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach(fn => fn());
  }

  // ==========================================================================
  // MOTEUR DE STOCK MULTI-MAGASINS (source de vérité unique)
  // ==========================================================================

  private nowIso(): string {
    return new Date().toISOString();
  }

  private newId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  private roundQty(value: number): number {
    return Number(value.toFixed(4));
  }

  private getWarehouseById(warehouseId: string): Warehouse | undefined {
    return this.db.warehouses.find(w => w.id === warehouseId);
  }

  private getWarehouseLocationById(locationId: string): WarehouseLocation | undefined {
    return this.db.warehouseLocations.find(l => l.id === locationId);
  }

  private getDefaultLocation(warehouseId: string): WarehouseLocation | undefined {
    return (
      this.db.warehouseLocations.find(l => l.warehouseId === warehouseId && l.isActive) ||
      this.db.warehouseLocations.find(l => l.warehouseId === warehouseId)
    );
  }

  /** Retrouve un emplacement par identifiant, code ou libellé (compatibilité anciens champs texte). */
  private resolveLocation(warehouseId: string, reference?: string): WarehouseLocation | undefined {
    if (!reference) return this.getDefaultLocation(warehouseId);
    const needle = reference.trim().toLowerCase();
    return (
      this.db.warehouseLocations.find(
        l =>
          l.warehouseId === warehouseId &&
          (l.id.toLowerCase() === needle ||
            l.code.toLowerCase() === needle ||
            l.designation.toLowerCase() === needle)
      ) || this.getDefaultLocation(warehouseId)
    );
  }

  private findWarehouseByType(type: WarehouseType): Warehouse | undefined {
    return (
      this.db.warehouses.find(w => w.type === type && w.isActive) ||
      this.db.warehouses.find(w => w.type === type)
    );
  }

  /** Magasin d'affectation par défaut d'une catégorie d'article (lecture seule). */
  public getDefaultWarehouseForCategory(category: Item['category']): Warehouse | undefined {
    return this.defaultWarehouseForCategory(category);
  }

  private defaultWarehouseForCategory(category: Item['category']): Warehouse | undefined {
    switch (category) {
      case 'PRODUIT_FINI_THON':
      case 'PRODUIT_FINI_SARDINE':
        return this.findWarehouseByType('PRODUITS_FINIS');
      case 'BOITE_METALLIQUE':
      case 'COUVERCLE':
      case 'CARTON_EMBALLAGE':
      case 'ETIQUETTE':
      case 'PALETTE':
        return this.findWarehouseByType('EMBALLAGES') || this.findWarehouseByType('PRODUCTION');
      case 'CONSOMMABLE':
        return this.findWarehouseByType('CONSOMMABLES') || this.findWarehouseByType('PRODUCTION');
      case 'PRODUIT_CHIMIQUE':
        return this.findWarehouseByType('CHIMIQUES') || this.findWarehouseByType('MATIERES_PREMIERES');
      case 'POISSON_CONGELE':
      case 'POISSON_FRAIS':
      case 'HUILE':
      case 'SAUCE_EPICES':
      default:
        return this.findWarehouseByType('MATIERES_PREMIERES');
    }
  }

  private ensureStockLot(params: {
    itemId: string;
    itemCode: string;
    lotNumber: string;
    lotId?: string;
    supplierLotNumber?: string;
    receptionDate?: string;
    expiryDate?: string;
    qualityStatus?: StockQualityStatus;
    origin?: string;
    warehouse?: Warehouse;
    location?: WarehouseLocation;
    transferNumber?: string;
    /** N'ouvre un séjour magasin que pour une entrée physique (jamais pour une sortie). */
    trackWarehouseTrail?: boolean;
  }): StockLot {
    const lotNumber = params.lotNumber?.trim() || `LOT-SANS-NUMERO-${Date.now()}`;
    let lot = params.lotId
      ? this.db.stockLots.find(l => l.id === params.lotId)
      : this.db.stockLots.find(
          l => l.itemId === params.itemId && l.lotNumber === lotNumber
        );
    if (!lot) {
      lot = {
        id: this.newId('LOT'),
        lotNumber,
        supplierLotNumber: params.supplierLotNumber,
        itemId: params.itemId,
        itemCode: params.itemCode,
        receptionDate: params.receptionDate,
        expiryDate: params.expiryDate,
        qualityStatus: params.qualityStatus ?? 'LIBERE',
        origin: params.origin,
        createdAt: this.nowIso(),
        warehouseTrail: [],
        qualityHistory: [],
      };
      this.db.stockLots.push(lot);
    } else {
      lot.supplierLotNumber = lot.supplierLotNumber || params.supplierLotNumber;
      lot.receptionDate = lot.receptionDate || params.receptionDate;
      lot.expiryDate = lot.expiryDate || params.expiryDate;
      lot.origin = lot.origin || params.origin;
      if (params.qualityStatus && lot.qualityStatus !== params.qualityStatus) {
        this.recordLotQualityChange(lot, params.qualityStatus, 'Synchronisation du statut qualité du lot', undefined);
      }
    }

    if (params.warehouse && params.trackWarehouseTrail !== false) {
      const location = params.location || this.getDefaultLocation(params.warehouse.id);
      const alreadyOpen = lot.warehouseTrail.some(
        entry => entry.warehouseId === params.warehouse!.id && !entry.exitedAt
      );
      if (!alreadyOpen) {
        lot.warehouseTrail.push({
          warehouseId: params.warehouse.id,
          warehouseCode: params.warehouse.code,
          locationId: location?.id,
          locationCode: location?.code,
          transferNumber: params.transferNumber,
          enteredAt: this.nowIso(),
        });
      }
    }
    return lot;
  }

  private recordLotQualityChange(
    lot: StockLot,
    newStatus: StockQualityStatus,
    reason: string,
    documentNumber?: string
  ) {
    if (lot.qualityStatus === newStatus) return;
    const from = lot.qualityStatus;
    lot.qualityStatus = newStatus;
    if (!lot.qualityHistory) lot.qualityHistory = [];
    lot.qualityHistory.push({
      timestamp: this.nowIso(),
      from,
      to: newStatus,
      user: `${this.currentUser.name} (${this.currentUser.role})`,
      reason,
      documentNumber,
    });
  }

  private findStockRow(
    warehouseId: string,
    locationId: string,
    itemId: string,
    lotId: string,
    qualityStatus: StockQualityStatus
  ): WarehouseStock | undefined {
    return this.db.warehouseStocks.find(
      row =>
        row.warehouseId === warehouseId &&
        row.locationId === locationId &&
        row.itemId === itemId &&
        row.lotId === lotId &&
        row.qualityStatus === qualityStatus
    );
  }

  /**
   * Applique un delta physique à une ligne de stock magasin/emplacement/lot.
   * Point d'entrée unique : aucun autre code ne doit modifier warehouseStocks.
   */
  private applyStockDelta(params: {
    warehouseId: string;
    locationId: string;
    itemId: string;
    itemCode: string;
    lotNumber: string;
    lotId?: string;
    qualityStatus: StockQualityStatus;
    unit: UnitOfMeasure;
    delta: number;
    reservedDelta?: number;
    allowNegative?: boolean;
  }): WarehouseStock | undefined {
    const item = this.db.items.find(
      i => i.id === params.itemId || i.code === params.itemCode
    );
    if (!item) {
      throw new Error(`Article ${params.itemCode || params.itemId} introuvable dans le référentiel.`);
    }
    const warehouse = this.getWarehouseById(params.warehouseId);
    if (!warehouse) throw new Error('Magasin introuvable.');
    const location =
      this.getWarehouseLocationById(params.locationId) ||
      this.getDefaultLocation(params.warehouseId);
    if (!location) throw new Error(`Aucun emplacement actif dans le magasin ${warehouse.code}.`);

    const lot = this.ensureStockLot({
      itemId: item.id,
      itemCode: item.code,
      lotNumber: params.lotNumber,
      lotId: params.lotId,
      qualityStatus: params.qualityStatus,
      warehouse,
      location,
      trackWarehouseTrail: params.delta > 0,
    });

    let row = this.findStockRow(
      warehouse.id,
      location.id,
      item.id,
      lot.id,
      params.qualityStatus
    );
    if (!row) {
      if (params.delta < 0) {
        throw new Error(
          `Stock insuffisant : ${item.code} lot ${lot.lotNumber} est absent du magasin ${warehouse.code} (${location.code}).`
        );
      }
      row = {
        id: this.newId('WS'),
        warehouseId: warehouse.id,
        locationId: location.id,
        itemId: item.id,
        itemCode: item.code,
        lotId: lot.id,
        lotNumber: lot.lotNumber,
        qualityStatus: params.qualityStatus,
        quantity: 0,
        reservedQty: 0,
        unit: params.unit,
        updatedAt: this.nowIso(),
      };
      this.db.warehouseStocks.push(row);
    }

    const nextQty = this.roundQty(row.quantity + params.delta);
    if (nextQty < -0.0001 && !params.allowNegative) {
      throw new Error(
        `Stock insuffisant : ${item.code} lot ${lot.lotNumber} — disponible ${this.roundQty(
          row.quantity
        )} ${row.unit}, demandé ${Math.abs(params.delta)} ${params.unit} dans ${warehouse.code} (${location.code}).`
      );
    }
    row.quantity = Math.max(0, nextQty);
    if (params.reservedDelta) {
      row.reservedQty = Math.max(0, this.roundQty(row.reservedQty + params.reservedDelta));
    }
    row.qualityStatus = params.qualityStatus;
    row.updatedAt = this.nowIso();

    if (lot.qualityStatus !== params.qualityStatus) {
      this.recordLotQualityChange(
        lot,
        params.qualityStatus,
        `Mouvement de stock dans ${warehouse.code}`
      );
    }

    if (row.quantity <= 0 && row.reservedQty <= 0) {
      this.db.warehouseStocks = this.db.warehouseStocks.filter(r => r.id !== row!.id);
      row = undefined;
    }

    // Clôture du séjour magasin dès que le lot n'y détient plus aucune quantité.
    this.closeLotWarehouseTrailIfEmpty(lot.id, warehouse.id);

    this.recalculateItemAggregates(item.id);
    return row;
  }

  /** Marque la sortie d'un lot d'un magasin lorsqu'il n'y possède plus de stock. */
  private closeLotWarehouseTrailIfEmpty(lotId: string, warehouseId: string) {
    const stillPresent = this.db.warehouseStocks.some(
      r =>
        r.lotId === lotId &&
        r.warehouseId === warehouseId &&
        (r.quantity > 0.0001 || r.reservedQty > 0.0001)
    );
    if (stillPresent) return;
    const lot = this.db.stockLots.find(l => l.id === lotId);
    if (!lot) return;
    lot.warehouseTrail = lot.warehouseTrail.map(entry =>
      entry.warehouseId === warehouseId && !entry.exitedAt
        ? { ...entry, exitedAt: this.nowIso() }
        : entry
    );
  }

  /** Recalcule les agrégats consolidés d'un article à partir des stocks magasins. */
  private recalculateItemAggregates(itemId: string) {
    const item = this.db.items.find(i => i.id === itemId);
    if (!item) return;
    const rows = this.db.warehouseStocks.filter(r => r.itemId === itemId);
    const sum = (predicate: (row: WarehouseStock) => boolean) =>
      this.roundQty(rows.filter(predicate).reduce((total, row) => total + row.quantity, 0));
    const reserved = this.roundQty(rows.reduce((total, row) => total + row.reservedQty, 0));
    const libre = sum(row => row.qualityStatus === 'LIBERE');
    const transit = this.roundQty(
      this.db.stockTransits
        .filter(t => t.itemId === itemId && t.status === 'EN_TRANSIT')
        .reduce((total, t) => total + t.quantity, 0)
    );
    item.currentStock = this.roundQty(Math.max(0, libre - reserved));
    item.allocatedStock = reserved;
    item.quarantineStock = sum(row => row.qualityStatus === 'QUARANTAINE');
    item.pendingControlStock = sum(row =>
      QUALITY_STATUS_GROUPS.pending.includes(row.qualityStatus)
    );
    item.blockedStock = sum(row => QUALITY_STATUS_GROUPS.blocked.includes(row.qualityStatus));
    item.transitStock = transit;
  }

  private recalculateAllItemAggregates() {
    this.db.items.forEach(item => this.recalculateItemAggregates(item.id));
  }

  /**
   * Déplace la totalité d'un lot vers un autre magasin/emplacement et/ou change
   * son statut qualité. Utilisé pour la libération qualité, la quarantaine et
   * les décisions d'agréage. Le lot n'est jamais fusionné avec un autre lot.
   */
  private relocateLotStock(params: {
    lotId: string;
    destinationWarehouseId: string;
    destinationLocationId?: string;
    newStatus: StockQualityStatus;
    reason: string;
    documentNumber?: string;
  }): number {
    const lot = this.db.stockLots.find(l => l.id === params.lotId);
    if (!lot) throw new Error('Lot introuvable.');
    const destinationWarehouse = this.getWarehouseById(params.destinationWarehouseId);
    if (!destinationWarehouse) throw new Error('Magasin de destination introuvable.');
    const destinationLocation =
      (params.destinationLocationId
        ? this.getWarehouseLocationById(params.destinationLocationId)
        : undefined) || this.getDefaultLocation(destinationWarehouse.id);
    if (!destinationLocation) throw new Error('Aucun emplacement de destination disponible.');

    const rows = this.db.warehouseStocks.filter(r => r.lotId === lot.id);
    if (rows.length === 0) return 0;
    const totalQty = this.roundQty(rows.reduce((total, r) => total + r.quantity, 0));
    const totalReserved = this.roundQty(rows.reduce((total, r) => total + r.reservedQty, 0));
    const item = this.db.items.find(i => i.id === lot.itemId);
    if (!item) throw new Error('Article du lot introuvable.');
    const unit = rows[0].unit;
    const sourceWarehouseIds = Array.from(new Set(rows.map(r => r.warehouseId)));

    // Clôture des séjours ouverts dans les magasins d'origine.
    lot.warehouseTrail = lot.warehouseTrail.map(entry =>
      sourceWarehouseIds.includes(entry.warehouseId) && !entry.exitedAt
        ? { ...entry, exitedAt: this.nowIso() }
        : entry
    );

    this.db.warehouseStocks = this.db.warehouseStocks.filter(r => r.lotId !== lot.id);
    if (totalQty > 0) {
      this.db.warehouseStocks.push({
        id: this.newId('WS'),
        warehouseId: destinationWarehouse.id,
        locationId: destinationLocation.id,
        itemId: item.id,
        itemCode: item.code,
        lotId: lot.id,
        lotNumber: lot.lotNumber,
        qualityStatus: params.newStatus,
        quantity: totalQty,
        reservedQty: totalReserved,
        unit,
        updatedAt: this.nowIso(),
      });
    }

    const openDestination = lot.warehouseTrail.find(
      entry => entry.warehouseId === destinationWarehouse.id && !entry.exitedAt
    );
    if (!openDestination && totalQty > 0) {
      lot.warehouseTrail.push({
        warehouseId: destinationWarehouse.id,
        warehouseCode: destinationWarehouse.code,
        locationId: destinationLocation.id,
        locationCode: destinationLocation.code,
        transferNumber: params.documentNumber,
        enteredAt: this.nowIso(),
      });
    }

    const previousStatus = lot.qualityStatus;
    this.recordLotQualityChange(lot, params.newStatus, params.reason, params.documentNumber);

    this.addStockMovement({
      documentNumber: params.documentNumber,
      itemId: item.id,
      itemCode: item.code,
      batchNumber: lot.lotNumber,
      lotId: lot.id,
      type:
        params.newStatus === 'QUARANTAINE' || params.newStatus === 'EN_ATTENTE_CONTROLE'
          ? 'MISE_EN_QUARANTAINE'
          : 'CHANGEMENT_STATUT_QUALITE',
      quantity: totalQty,
      unit,
      stockDelta: 0,
      sourceWarehouseId: sourceWarehouseIds[0],
      destinationWarehouseId: destinationWarehouse.id,
      destinationLocationId: destinationLocation.id,
      destinationLocation: destinationLocation.code,
      qualityStatus: params.newStatus,
      referenceDocument: params.documentNumber,
      userId: this.currentUser.id,
      userName: this.currentUser.name,
      reason: `${params.reason} (statut ${previousStatus} → ${params.newStatus})`,
    });

    this.recalculateItemAggregates(item.id);
    return totalQty;
  }

  private getWarehouseForMovement(movement: Omit<StockMovement, 'id' | 'timestamp'>): Warehouse | undefined {
    const explicitId =
      movement.destinationWarehouseId || movement.sourceWarehouseId || undefined;
    if (explicitId) return this.getWarehouseById(explicitId);

    switch (movement.type) {
      case 'ENTREE_RECEPTION':
        return this.findWarehouseByType('MATIERES_PREMIERES');
      case 'CONSOMMATION_OF':
        return this.findWarehouseByType('PRODUCTION') || this.findWarehouseByType('MATIERES_PREMIERES');
      case 'SORTIE_VENTE':
      case 'SORTIE_PRODUIT_FINI':
        return this.findWarehouseByType('PRODUITS_FINIS');
      case 'REBUT_DEFECTUEUX':
        return this.findWarehouseByType('NON_CONFORMES') || this.findWarehouseByType('QUARANTAINE');
      case 'RETOUR_STOCK':
      case 'RETOUR_MAGASIN':
        return this.findWarehouseByType('PRODUCTION') || this.findWarehouseByType('MATIERES_PREMIERES');
      case 'RECEPTION_PRODUCTION':
        return this.findWarehouseByType('PRODUITS_FINIS');
      default: {
        const item = this.db.items.find(
          i => i.id === movement.itemId || i.code === movement.itemCode
        );
        return item ? this.defaultWarehouseForCategory(item.category) : this.db.warehouses[0];
      }
    }
  }

  /**
   * Identifiant unique garanti au sein d'une collection.
   * Deux entités créées dans la même milliseconde ne doivent jamais partager
   * le même identifiant : cela rendrait les recherches par id ambiguës.
   */
  private uniqueId(prefix: string, existing: string[]): string {
    const base = `${prefix}-${Date.now()}`;
    const taken = new Set(existing);
    if (!taken.has(base)) return base;
    let suffix = 1;
    let candidate = `${base}-${suffix}`;
    while (taken.has(candidate)) {
      suffix += 1;
      candidate = `${base}-${suffix}`;
    }
    return candidate;
  }

  /** Détermine le sens du mouvement sur le stock physique. */
  private movementDelta(movement: Omit<StockMovement, 'id' | 'timestamp'>): number {
    if (typeof movement.stockDelta === 'number') return movement.stockDelta;
    switch (movement.type) {
      case 'ENTREE_RECEPTION':
      case 'RETOUR_STOCK':
      case 'RETOUR_MAGASIN':
      case 'TRANSFERT_ENTREE':
      case 'RECEPTION_PRODUCTION':
        return movement.quantity;
      case 'CONSOMMATION_OF':
      case 'SORTIE_VENTE':
      case 'SORTIE_PRODUIT_FINI':
      case 'REBUT_DEFECTUEUX':
      case 'TRANSFERT_SORTIE':
        return -movement.quantity;
      case 'AJUSTEMENT_INVENTAIRE':
        return movement.destinationLocation || movement.destinationLocationId
          ? movement.quantity
          : -movement.quantity;
      case 'MISE_EN_QUARANTAINE':
      case 'CHANGEMENT_STATUT_QUALITE':
      case 'REGULARISATION_TRANSFERT':
      default:
        return 0;
    }
  }

  /**
   * Retrouve un magasin source contenant effectivement le lot demandé.
   * Utilisé pour la compatibilité des mouvements historiques (consommation sans
   * transfert préalable) : le stock n'est jamais inventé.
   */
  private findWarehouseContainingLot(
    itemId: string,
    lotNumber: string,
    preferredWarehouseId?: string
  ): Warehouse | undefined {
    if (preferredWarehouseId) return this.getWarehouseById(preferredWarehouseId);
    const candidates = this.db.warehouseStocks.filter(
      row => row.itemId === itemId && row.lotNumber === lotNumber && row.quantity > 0
    );
    if (candidates.length === 0) return undefined;
    const preferredOrder: WarehouseType[] = ['PRODUCTION', 'MATIERES_PREMIERES', 'EMBALLAGES'];
    for (const type of preferredOrder) {
      const row = candidates.find(r => this.getWarehouseById(r.warehouseId)?.type === type);
      if (row) return this.getWarehouseById(row.warehouseId);
    }
    return this.getWarehouseById(candidates[0].warehouseId);
  }

  // --- Gestion de la session utilisateur ---
  public getCurrentUser(): User {
    return this.currentUser;
  }

  public setCurrentUser(user: User) {
    this.currentUser = user;
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    this.logAudit({
      action: 'UPDATE',
      entity: 'Session',
      entityId: user.id,
      newValues: `Connexion active sous le profil ${user.name} (${user.role})`,
    });
    this.notifyListeners();
  }

  // --- Authentification par code PIN ---
  public getUsers(): User[] {
    return this.db.users;
  }

  /**
   * Empreinte du code PIN : hachage itéré salé.
   * La base restant stockée en clair dans localStorage, ce verrou protège l'usage courant
   * du poste (changement de profil involontaire, audit trail nominatif) — il ne constitue
   * pas une frontière cryptographique face à un accès direct au fichier du navigateur.
   */
  private static hashPin(pin: string, salt: string): string {
    const input = `${salt}::${pin}`;
    let h1 = 0x811c9dc5;
    let h2 = 0x9e3779b9;
    for (let round = 0; round < PIN_HASH_ROUNDS; round++) {
      for (let i = 0; i < input.length; i++) {
        const c = input.charCodeAt(i) ^ (round & 0xff);
        h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
        h2 = Math.imul(h2 + c, 0x85ebca6b) >>> 0;
      }
    }
    return `${h1.toString(16).padStart(8, '0')}${h2.toString(16).padStart(8, '0')}`;
  }

  private static generatePinSalt(): string {
    const bytes = new Uint8Array(8);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  }

  private static assertPinFormat(pin: string) {
    if (!PIN_PATTERN.test(pin)) {
      throw new Error('Le code PIN doit comporter de 4 à 8 chiffres.');
    }
  }

  public hasPin(userId: string): boolean {
    const user = this.db.users.find(u => u.id === userId);
    return Boolean(user?.pinHash && user?.pinSalt);
  }

  /** Profils habilités à réinitialiser le code PIN d'un autre profil. */
  public getPINResetAdministrators(): User[] {
    return this.db.users.filter(u => u.status === 'ACTIF' && PIN_RESET_ROLES.includes(u.role) && this.hasPin(u.id));
  }

  public isAuthenticated(): boolean {
    const id = sessionStorage.getItem(SESSION_KEY);
    const lastActivity = sessionStorage.getItem(SESSION_ACTIVITY_KEY);
    if (!id) return false;
    if (lastActivity) {
      const elapsed = Date.now() - Number(lastActivity);
      if (elapsed > SESSION_TIMEOUT_MS) {
        this.logAudit({
          action: 'SESSION_EXPIRED',
          entity: 'Session',
          entityId: id,
          newValues: `Session expirée après ${Math.round(elapsed / 60000)} minutes d'inactivité`,
        });
        sessionStorage.removeItem(SESSION_KEY);
        sessionStorage.removeItem(SESSION_ACTIVITY_KEY);
        return false;
      }
    }
    const user = this.db.users.find(u => u.id === id);
    if (!user || user.status !== 'ACTIF') {
      sessionStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(SESSION_ACTIVITY_KEY);
      return false;
    }
    // Rafraîchit l'horodatage d'activité
    sessionStorage.setItem(SESSION_ACTIVITY_KEY, String(Date.now()));
    return true;
  }

  public login(userId: string, pin: string): User {
    const user = this.db.users.find(u => u.id === userId);
    if (!user) throw new Error('Profil introuvable.');
    if (user.status !== 'ACTIF') throw new Error(`Le profil ${user.name} est désactivé.`);
    // Vérification du verrouillage après échecs
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      const mins = Math.ceil((new Date(user.lockedUntil).getTime() - Date.now()) / 60000);
      throw new Error(`Compte temporairement verrouillé. Réessayez dans ${mins} minute(s).`);
    }
    if (!user.pinHash || !user.pinSalt) {
      throw new Error(`Aucun code PIN n'est enregistré pour ${user.name} : définissez-le lors de la première connexion.`);
    }
    if (StorageService.hashPin(pin, user.pinSalt) !== user.pinHash) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      // Verrouillage après 5 échecs consécutifs (15 minutes)
      if (user.failedLoginAttempts >= 5) {
        const lockUntil = new Date(Date.now() + 15 * 60000).toISOString();
        user.lockedUntil = lockUntil;
        this.logAudit({
          action: 'BLOCK',
          entity: 'Session',
          entityId: user.id,
          newValues: `Compte verrouillé après ${user.failedLoginAttempts} tentatives échouées jusqu'à ${lockUntil}`,
          motive: 'Protection brute-force',
          actor: { userId: user.id, userName: user.name, userRole: user.role },
        });
        this.saveDatabase(this.db);
        throw new Error('Compte temporairement verrouillé après 5 tentatives échouées. Réessayez dans 15 minutes.');
      }
      this.logAudit({
        action: 'FAILED_LOGIN',
        entity: 'Session',
        entityId: user.id,
        newValues: `Échec de connexion au profil ${user.name} (${user.role}) : code PIN erroné (tentative ${user.failedLoginAttempts}/5)`,
        motive: 'Contrôle d\'accès au poste',
        actor: { userId: user.id, userName: user.name, userRole: user.role },
      });
      this.saveDatabase(this.db);
      throw new Error('Code PIN incorrect.');
    }
    // Connexion réussie : réinitialise le compteur d'échecs
    user.failedLoginAttempts = 0;
    user.lockedUntil = undefined;
    user.lastLoginAt = new Date().toISOString();
    sessionStorage.setItem(SESSION_KEY, user.id);
    this.setCurrentUser(user);
    this.logAudit({
      action: 'LOGIN',
      entity: 'Session',
      entityId: user.id,
      newValues: `Connexion réussie de ${user.name} (${user.role})`,
    });
    this.saveDatabase(this.db);
    return user;
  }

  public logout() {
    const user = this.currentUser;
    sessionStorage.removeItem(SESSION_KEY);
    this.logAudit({
      action: 'LOGOUT',
      entity: 'Session',
      entityId: user.id,
      newValues: `Déconnexion du profil ${user.name} (${user.role})`,
    });
    this.notifyListeners();
  }

  /** Première connexion d'un profil : aucun PIN n'existe encore, l'opérateur présent le définit. */
  public enrollPin(userId: string, pin: string, confirmation: string): User {
    const user = this.db.users.find(u => u.id === userId);
    if (!user) throw new Error('Profil introuvable.');
    if (user.status !== 'ACTIF') throw new Error(`Le profil ${user.name} est désactivé.`);
    if (this.hasPin(userId)) {
      throw new Error(`Un code PIN est déjà enregistré pour ${user.name}. Passez par une réinitialisation administrateur.`);
    }
    if (pin !== confirmation) throw new Error('La confirmation ne correspond pas au code PIN saisi.');
    StorageService.assertPinFormat(pin);

    user.pinSalt = StorageService.generatePinSalt();
    user.pinHash = StorageService.hashPin(pin, user.pinSalt);
    this.logAudit({
      action: 'UPDATE',
      entity: 'User',
      entityId: user.id,
      newValues: `Code PIN de session défini pour ${user.name} (${user.role})`,
      motive: 'Enrôlement à la première connexion',
      actor: { userId: user.id, userName: user.name, userRole: user.role },
    });
    this.saveDatabase(this.db);

    sessionStorage.setItem(SESSION_KEY, user.id);
    this.setCurrentUser(user);
    return user;
  }

  /** Code PIN oublié : un administrateur habilité s'authentifie puis efface le code du profil ciblé, qui se ré-enrôle. */
  public resetPinByAdmin(adminId: string, adminPin: string, targetUserId: string): void {
    const admin = this.db.users.find(u => u.id === adminId);
    const target = this.db.users.find(u => u.id === targetUserId);
    if (!admin || !target) throw new Error('Profil introuvable.');
    if (!PIN_RESET_ROLES.includes(admin.role)) {
      throw new Error(`Le profil ${admin.name} (${admin.role}) n'est pas habilité à réinitialiser un code PIN.`);
    }
    if (!admin.pinHash || !admin.pinSalt) {
      throw new Error(`Le profil administrateur ${admin.name} n'a pas encore de code PIN enregistré.`);
    }
    if (StorageService.hashPin(adminPin, admin.pinSalt) !== admin.pinHash) {
      this.logAudit({
        action: 'BLOCK',
        entity: 'User',
        entityId: target.id,
        oldValues: `Réinitialisation demandée pour ${target.name}`,
        newValues: `Réinitialisation refusée : code PIN de l'administrateur ${admin.name} erroné`,
        motive: 'Contrôle d\'accès au poste',
        actor: { userId: admin.id, userName: admin.name, userRole: admin.role },
      });
      throw new Error('Code PIN de l\'administrateur incorrect.');
    }

    delete target.pinHash;
    delete target.pinSalt;
    this.logAudit({
      action: 'UPDATE',
      entity: 'User',
      entityId: target.id,
      oldValues: `Code PIN enregistré pour ${target.name}`,
      newValues: `Code PIN de ${target.name} (${target.role}) réinitialisé — à redéfinir à la prochaine connexion`,
      motive: `Réinitialisation effectuée par ${admin.name} (${admin.role})`,
      actor: { userId: admin.id, userName: admin.name, userRole: admin.role },
    });
    this.saveDatabase(this.db);
  }

  // ==========================================
  // USER MANAGER — Gestion des utilisateurs, rôles et permissions
  // ==========================================

  /** Vérifie si un utilisateur possède une permission donnée. ADMIN a toujours tous les droits. */
  public hasPermission(user: User, permission: string): boolean {
    if (user.role === 'ADMIN') return true;
    const role = this.db.roles.find(r => r.roleKey === user.role && r.isActive);
    if (!role) return false;
    return role.permissions.includes(permission);
  }

  /** Lève une erreur si l'utilisateur ne dispose pas de la permission requise. */
  public requirePermission(user: User, permission: string): void {
    if (!this.hasPermission(user, permission)) {
      throw new Error(
        `Permission refusée : ${permission}. Le profil ${user.name} (${user.role}) n'est pas habilité.`
      );
    }
  }

  /** Liste tous les rôles configurables. */
  public getRoles(): Role[] {
    return this.db.roles;
  }

  /** Rôle par identifiant technique. */
  public getRoleById(id: string): Role | undefined {
    return this.db.roles.find(r => r.id === id);
  }

  /** Crée un nouveau rôle personnalisable. */
  public addRole(role: Omit<Role, 'id' | 'createdAt' | 'updatedAt'>): Role {
    const now = this.nowIso();
    const newRole: Role = {
      ...role,
      id: `ROLE-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: now,
      updatedAt: now,
    };
    this.db.roles.push(newRole);
    this.logAudit({
      action: 'ROLE_CREATED',
      entity: 'Role',
      entityId: newRole.id,
      newValues: `${newRole.name} (${newRole.roleKey}) — ${newRole.permissions.length} permission(s)`,
    });
    this.saveDatabase(this.db);
    return newRole;
  }

  /** Modifie un rôle existant. */
  public updateRole(id: string, updates: Partial<Omit<Role, 'id' | 'createdAt'>>): Role {
    const role = this.db.roles.find(r => r.id === id);
    if (!role) throw new Error('Rôle introuvable.');
    const oldPerms = role.permissions.join(', ');
    Object.assign(role, updates, { updatedAt: this.nowIso() });
    this.logAudit({
      action: 'ROLE_UPDATED',
      entity: 'Role',
      entityId: role.id,
      oldValues: oldPerms,
      newValues: role.permissions.join(', '),
    });
    this.saveDatabase(this.db);
    return role;
  }

  /** Supprime un rôle s'il n'est pas le dernier ADMIN et qu'aucun utilisateur ne l'utilise. */
  public deleteRole(id: string): void {
    const role = this.db.roles.find(r => r.id === id);
    if (!role) throw new Error('Rôle introuvable.');
    if (role.roleKey === 'ADMIN') {
      const adminCount = this.db.users.filter(u => u.role === 'ADMIN' && u.status === 'ACTIF').length;
      if (adminCount <= 1) {
        throw new Error('Impossible de supprimer le dernier rôle Administrateur.');
      }
    }
    const usedBy = this.db.users.filter(u => u.role === role.roleKey).length;
    if (usedBy > 0) {
      throw new Error(`Ce rôle est attribué à ${usedBy} utilisateur(s). Désattribuez-le d'abord.`);
    }
    this.db.roles = this.db.roles.filter(r => r.id !== id);
    this.logAudit({
      action: 'DELETE',
      entity: 'Role',
      entityId: role.id,
      oldValues: role.name,
    });
    this.saveDatabase(this.db);
  }

  /** Crée un nouvel utilisateur. */
  public addUser(input: Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'failedLoginAttempts'> & { password?: string }): User {
    const now = this.nowIso();
    const newUser: User = {
      ...input,
      id: `USR-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: now,
      updatedAt: now,
      failedLoginAttempts: 0,
    };
    if (input.password) {
      StorageService.assertPinFormat(input.password);
      newUser.pinSalt = StorageService.generatePinSalt();
      newUser.pinHash = StorageService.hashPin(input.password, newUser.pinSalt);
      delete (newUser as any).password;
    }
    this.db.users.push(newUser);
    this.logAudit({
      action: 'USER_CREATED',
      entity: 'User',
      entityId: newUser.id,
      newValues: `${newUser.name} — ${newUser.role} — ${newUser.department}`,
    });
    this.saveDatabase(this.db);
    return newUser;
  }

  /** Modifie un utilisateur existant. */
  public updateUser(id: string, updates: Partial<Omit<User, 'id' | 'createdAt'>> & { password?: string }): User {
    const user = this.db.users.find(u => u.id === id);
    if (!user) throw new Error('Utilisateur introuvable.');
    const oldRole = user.role;
    const oldStatus = user.status;
    Object.assign(user, updates, { updatedAt: this.nowIso() });
    if (updates.password) {
      StorageService.assertPinFormat(updates.password);
      user.pinSalt = StorageService.generatePinSalt();
      user.pinHash = StorageService.hashPin(updates.password, user.pinSalt);
      user.passwordChangedAt = this.nowIso();
      delete (user as any).password;
    }
    this.logAudit({
      action: 'USER_UPDATED',
      entity: 'User',
      entityId: user.id,
      oldValues: `${oldRole} — ${oldStatus}`,
      newValues: `${user.role} — ${user.status}`,
    });
    this.saveDatabase(this.db);
    return user;
  }

  /** Désactive un compte utilisateur (soft delete). */
  public deactivateUser(id: string): User {
    const user = this.db.users.find(u => u.id === id);
    if (!user) throw new Error('Utilisateur introuvable.');
    if (user.role === 'ADMIN') {
      const activeAdmins = this.db.users.filter(u => u.role === 'ADMIN' && u.status === 'ACTIF').length;
      if (activeAdmins <= 1) {
        throw new Error('Impossible de désactiver le dernier administrateur actif.');
      }
    }
    user.status = 'INACTIF';
    user.updatedAt = this.nowIso();
    this.logAudit({
      action: 'USER_DEACTIVATED',
      entity: 'User',
      entityId: user.id,
      oldValues: 'ACTIF',
      newValues: 'INACTIF',
    });
    this.saveDatabase(this.db);
    return user;
  }

  /** Réactive un compte utilisateur. */
  public activateUser(id: string): User {
    const user = this.db.users.find(u => u.id === id);
    if (!user) throw new Error('Utilisateur introuvable.');
    user.status = 'ACTIF';
    user.failedLoginAttempts = 0;
    user.lockedUntil = undefined;
    user.updatedAt = this.nowIso();
    this.logAudit({
      action: 'USER_UPDATED',
      entity: 'User',
      entityId: user.id,
      oldValues: 'INACTIF',
      newValues: 'ACTIF',
    });
    this.saveDatabase(this.db);
    return user;
  }

  /** Changement de PIN par l'utilisateur lui-même (ancien PIN requis). */
  public changePin(userId: string, oldPin: string, newPin: string, confirmation: string): User {
    const user = this.db.users.find(u => u.id === userId);
    if (!user) throw new Error('Profil introuvable.');
    if (user.status !== 'ACTIF') throw new Error(`Le profil ${user.name} est désactivé.`);
    if (!user.pinHash || !user.pinSalt) {
      throw new Error('Aucun code PIN enregistré. Procédez à l\'enrôlement initial.');
    }
    if (StorageService.hashPin(oldPin, user.pinSalt) !== user.pinHash) {
      throw new Error('Ancien code PIN incorrect.');
    }
    if (newPin !== confirmation) throw new Error('La confirmation ne correspond pas au nouveau code PIN.');
    StorageService.assertPinFormat(newPin);
    // Interdiction des suites évidentes
    const forbidden = ['0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999', '1234', '4321'];
    if (forbidden.includes(newPin)) {
      throw new Error('Ce code PIN est trop simple. Choisissez une combinaison différente.');
    }
    user.pinSalt = StorageService.generatePinSalt();
    user.pinHash = StorageService.hashPin(newPin, user.pinSalt);
    user.passwordChangedAt = this.nowIso();
    this.logAudit({
      action: 'PASSWORD_RESET',
      entity: 'User',
      entityId: user.id,
      newValues: 'Code PIN modifié par l\'utilisateur',
    });
    this.saveDatabase(this.db);
    return user;
  }

  // --- Audit Trail Légale (ISO 22000 § 7.5) ---
  public logAudit(entry: {
    action: AuditLogEntry['action'];
    entity: string;
    entityId: string;
    oldValues?: string;
    newValues?: string;
    motive?: string;
    /** Auteur réel de l'opération lorsqu'il diffère du profil de session courant (échec de connexion, réinitialisation). */
    actor?: Pick<AuditLogEntry, 'userId' | 'userName' | 'userRole'>;
  }) {
    const newEntry: AuditLogEntry = {
      id: `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      userId: entry.actor?.userId ?? this.currentUser.id,
      userName: entry.actor?.userName ?? this.currentUser.name,
      userRole: entry.actor?.userRole ?? this.currentUser.role,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId,
      oldValues: entry.oldValues,
      newValues: entry.newValues,
      motive: entry.motive,
    };
    this.db.auditLogs.unshift(newEntry);
    this.saveDatabase(this.db);
  }

  public getAuditLogs(): AuditLogEntry[] {
    return this.db.auditLogs;
  }

  // --- Référentiel Articles (Items) ---
  public getItems(): Item[] {
    return this.db.items;
  }

  /** Un article sans indicateur explicite est actif (compatibilité référentiel historique). */
  public isItemActive(item: Item): boolean {
    return item.isActive !== false;
  }

  public getActiveItems(): Item[] {
    return this.db.items.filter(item => this.isItemActive(item));
  }

  public getItemById(id: string): Item | undefined {
    return this.db.items.find(item => item.id === id);
  }

  /**
   * Magasin réellement proposé par défaut pour un article : celui de la fiche
   * s'il est renseigné, sinon celui déduit de la catégorie technique (même règle
   * que le moteur de stock). Information indicative : elle ne bloque aucun
   * transfert vers un autre magasin autorisé.
   */
  public getItemDefaultWarehouse(item: Item): Warehouse | undefined {
    if (item.defaultWarehouseId) {
      const explicit = this.getWarehouseById(item.defaultWarehouseId);
      if (explicit) return explicit;
    }
    return this.defaultWarehouseForCategory(item.category);
  }

  /**
   * Articles proposés dans les nouvelles opérations (nomenclature, réception,
   * transfert) : les articles inactifs en sont exclus, mais restent consultables
   * dans l'historique et les documents déjà validés.
   */
  public getItemsForNomenclature(): Item[] {
    return this.getActiveItems();
  }

  // --- Habilitations du référentiel articles ---

  public getItemPermissions(user: User = this.currentUser): ItemPermission[] {
    const staticPerms = ITEM_ROLE_PERMISSIONS[user.role] || [];
    const role = this.db.roles.find(r => r.roleKey === user.role && r.isActive);
    const dynamicPerms = (role?.permissions || []).filter(p => p.startsWith('ITEM_')) as ItemPermission[];
    return Array.from(new Set([...staticPerms, ...dynamicPerms]));
  }

  public canItem(permission: ItemPermission, user: User = this.currentUser): boolean {
    return this.getItemPermissions(user).includes(permission);
  }

  public assertItemPermission(permission: ItemPermission, action: string) {
    if (!this.canItem(permission)) {
      throw new Error(
        `Habilitation insuffisante : « ${ITEM_PERMISSION_LABELS[permission]} » est requise pour ${action}. Profil ${this.currentUser.role}.`
      );
    }
  }

  // --- Sous-catégories configurables ---

  public getItemSubCategories(
    filter?: { group?: ItemCategoryGroup; includeInactive?: boolean }
  ): ItemSubCategory[] {
    const includeInactive = filter?.includeInactive ?? true;
    return this.db.itemSubCategories
      .filter(sub => !filter?.group || sub.group === filter.group)
      .filter(sub => includeInactive || sub.isActive)
      .sort(
        (a, b) =>
          a.group.localeCompare(b.group) || a.designation.localeCompare(b.designation)
      );
  }

  public addItemSubCategory(input: {
    group: ItemCategoryGroup;
    code: string;
    designation: string;
  }): ItemSubCategory {
    this.assertItemPermission('ITEM_CATEGORY_MANAGE', 'créer une sous-catégorie');
    const code = (input.code || '').trim().toUpperCase();
    const designation = (input.designation || '').trim();
    if (!code || !designation) {
      throw new Error('Le code et la désignation de la sous-catégorie sont obligatoires.');
    }
    if (!ITEM_CATEGORY_GROUPS.includes(input.group)) {
      throw new Error('Groupe fonctionnel invalide.');
    }
    if (
      this.db.itemSubCategories.some(
        sub => sub.group === input.group && sub.code.toUpperCase() === code
      )
    ) {
      throw new Error(`La sous-catégorie ${code} existe déjà dans ce groupe.`);
    }
    const sub: ItemSubCategory = {
      id: this.newId('ISC'),
      group: input.group,
      code,
      designation,
      isActive: true,
      createdAt: this.nowIso(),
    };
    this.db.itemSubCategories.push(sub);
    this.logAudit({
      action: 'CREATE',
      entity: 'ItemSubCategory',
      entityId: sub.id,
      newValues: `Création sous-catégorie ${sub.code} — ${sub.designation} (${sub.group})`,
    });
    this.saveDatabase(this.db);
    return sub;
  }

  public updateItemSubCategory(
    id: string,
    updates: Partial<Pick<ItemSubCategory, 'code' | 'designation' | 'isActive'>>
  ): ItemSubCategory {
    this.assertItemPermission('ITEM_CATEGORY_MANAGE', 'modifier une sous-catégorie');
    const sub = this.db.itemSubCategories.find(s => s.id === id);
    if (!sub) throw new Error('Sous-catégorie introuvable.');
    const old = `${sub.code} — ${sub.designation} (${sub.isActive ? 'active' : 'inactive'})`;
    if (updates.code !== undefined) {
      const code = updates.code.trim().toUpperCase();
      if (!code) throw new Error('Le code de la sous-catégorie est obligatoire.');
      if (
        this.db.itemSubCategories.some(
          s => s.id !== id && s.group === sub.group && s.code.toUpperCase() === code
        )
      ) {
        throw new Error(`La sous-catégorie ${code} existe déjà dans ce groupe.`);
      }
      sub.code = code;
    }
    if (updates.designation !== undefined) {
      const designation = updates.designation.trim();
      if (!designation) throw new Error('La désignation de la sous-catégorie est obligatoire.');
      sub.designation = designation;
    }
    if (updates.isActive !== undefined) sub.isActive = updates.isActive;
    this.logAudit({
      action: 'UPDATE',
      entity: 'ItemSubCategory',
      entityId: id,
      oldValues: old,
      newValues: `${sub.code} — ${sub.designation} (${sub.isActive ? 'active' : 'inactive'})`,
    });
    this.saveDatabase(this.db);
    return sub;
  }

  // --- Référentiel fournisseurs (unique : réceptions + saisie manuelle) ---

  public getSuppliers(includeInactive = true): Supplier[] {
    return this.db.suppliers
      .filter(supplier => includeInactive || supplier.isActive)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  public getSupplier(id: string): Supplier | undefined {
    return this.db.suppliers.find(supplier => supplier.id === id);
  }

  public addSupplier(input: {
    name: string;
    contactName?: string;
    email?: string;
    phone?: string;
    address?: string;
    country?: string;
    wilaya?: string;
    city?: string;
    contacts?: Array<{ name: string; role?: string; phone?: string; email?: string }>;
    categoryGroups?: ItemCategoryGroup[];
    paymentTermsDays?: number;
    currency?: string;
    defaultLeadTimeDays?: number;
    taxId?: string;
    commercialRegister?: string;
    notes?: string;
  }): Supplier {
    this.assertItemPermission('ITEM_SUPPLIER_MANAGE', 'créer un fournisseur');
    const name = (input.name || '').trim();
    if (!name) throw new Error('La raison sociale du fournisseur est obligatoire.');
    if (this.db.suppliers.some(s => s.name.trim().toLowerCase() === name.toLowerCase())) {
      throw new Error(`Le fournisseur « ${name} » existe déjà dans le référentiel.`);
    }
    const supplier: Supplier = {
      id: this.newId('SUP'),
      code: `FRN-${String(this.db.suppliers.length + 1).padStart(3, '0')}`,
      name,
      contactName: input.contactName?.trim() || undefined,
      email: input.email?.trim() || undefined,
      phone: input.phone?.trim() || undefined,
      address: input.address?.trim() || undefined,
      country: input.country?.trim() || undefined,
      wilaya: input.wilaya?.trim() || undefined,
      city: input.city?.trim() || undefined,
      contacts: input.contacts ?? [],
      categoryGroups: input.categoryGroups ?? [],
      paymentTermsDays: input.paymentTermsDays,
      currency: input.currency || this.db.procurementSettings.currency,
      defaultLeadTimeDays: input.defaultLeadTimeDays ?? this.db.procurementSettings.defaultLeadTimeDays,
      taxId: input.taxId?.trim() || undefined,
      commercialRegister: input.commercialRegister?.trim() || undefined,
      documents: [],
      notes: input.notes?.trim() || undefined,
      status: 'ACTIF',
      isActive: true,
      origin: 'MANUEL',
      createdAt: this.nowIso(),
    };
    this.db.suppliers.push(supplier);
    this.logAudit({
      action: 'CREATE',
      entity: 'Supplier',
      entityId: supplier.id,
      newValues: `Création fournisseur ${supplier.code} — ${supplier.name}`,
    });
    this.saveDatabase(this.db);
    return supplier;
  }

  public updateSupplier(
    id: string,
    updates: Partial<Omit<Supplier, 'id' | 'code' | 'origin' | 'createdAt'>>
  ): Supplier {
    this.assertItemPermission('ITEM_SUPPLIER_MANAGE', 'modifier un fournisseur');
    const supplier = this.db.suppliers.find(s => s.id === id);
    if (!supplier) throw new Error('Fournisseur introuvable.');
    const old = JSON.stringify(supplier);
    if (updates.name !== undefined) {
      const name = updates.name.trim();
      if (!name) throw new Error('La raison sociale du fournisseur est obligatoire.');
      if (
        this.db.suppliers.some(
          s => s.id !== id && s.name.trim().toLowerCase() === name.toLowerCase()
        )
      ) {
        throw new Error(`Le fournisseur « ${name} » existe déjà dans le référentiel.`);
      }
      supplier.name = name;
    }
    if (updates.contactName !== undefined) supplier.contactName = updates.contactName.trim() || undefined;
    if (updates.email !== undefined) supplier.email = updates.email.trim() || undefined;
    if (updates.phone !== undefined) supplier.phone = updates.phone.trim() || undefined;
    if (updates.address !== undefined) supplier.address = updates.address.trim() || undefined;
    if (updates.country !== undefined) supplier.country = updates.country.trim() || undefined;
    if (updates.wilaya !== undefined) supplier.wilaya = updates.wilaya.trim() || undefined;
    if (updates.city !== undefined) supplier.city = updates.city.trim() || undefined;
    if (updates.taxId !== undefined) supplier.taxId = updates.taxId.trim() || undefined;
    if (updates.commercialRegister !== undefined) {
      supplier.commercialRegister = updates.commercialRegister.trim() || undefined;
    }
    if (updates.notes !== undefined) supplier.notes = updates.notes.trim() || undefined;
    if (updates.currency !== undefined) supplier.currency = updates.currency.trim() || undefined;
    if (updates.contacts !== undefined) supplier.contacts = updates.contacts;
    if (updates.categoryGroups !== undefined) supplier.categoryGroups = updates.categoryGroups;
    if (updates.documents !== undefined) supplier.documents = updates.documents;
    if (updates.paymentTermsDays !== undefined) {
      const days = Number(updates.paymentTermsDays);
      if (!Number.isFinite(days) || days < 0) {
        throw new Error('Les conditions de paiement doivent être un nombre de jours positif ou nul.');
      }
      supplier.paymentTermsDays = days;
    }
    if (updates.defaultLeadTimeDays !== undefined) {
      const days = Number(updates.defaultLeadTimeDays);
      if (!Number.isFinite(days) || days < 0) {
        throw new Error('Le délai de livraison doit être un nombre de jours positif ou nul.');
      }
      supplier.defaultLeadTimeDays = days;
    }
    if (updates.status !== undefined) {
      supplier.status = updates.status;
      supplier.isActive = updates.status === 'ACTIF';
    }
    if (updates.isActive !== undefined) {
      supplier.isActive = updates.isActive;
      supplier.status = updates.isActive ? 'ACTIF' : 'INACTIF';
    }
    this.logAudit({
      action: 'UPDATE',
      entity: 'Supplier',
      entityId: id,
      oldValues: old,
      newValues: JSON.stringify(supplier),
    });
    this.saveDatabase(this.db);
    return supplier;
  }

  // --- Historique des modifications d'articles ---

  public getItemChangeLogs(filter?: {
    itemId?: string;
    search?: string;
    action?: ItemChangeAction;
    limit?: number;
  }): ItemChangeLog[] {
    const needle = filter?.search?.trim().toLowerCase();
    const rows = this.db.itemChangeLogs
      .filter(log => !filter?.itemId || log.itemId === filter.itemId)
      .filter(log => !filter?.action || log.action === filter.action)
      .filter(log => {
        if (!needle) return true;
        return `${log.itemCode} ${log.itemDesignation} ${log.fieldLabel} ${log.userName} ${log.motive || ''}`
          .toLowerCase()
          .includes(needle);
      })
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    return filter?.limit ? rows.slice(0, filter.limit) : rows;
  }

  // --- Génération & contrôle du code article ---

  private static readonly ITEM_CODE_PATTERN = /^[A-Z0-9][A-Z0-9._-]{1,29}$/;

  private groupCodePrefix(group: ItemCategoryGroup): string {
    switch (group) {
      case 'MATIERES_PREMIERES_PRINCIPALES': return 'MP';
      case 'INGREDIENTS_ADDITIFS': return 'ING';
      case 'EMBALLAGES_PRIMAIRES': return 'EMB';
      case 'EMBALLAGES_SECONDAIRES': return 'CAR';
      case 'PRODUITS_SEMI_FINIS': return 'SF';
      default: return 'CMP';
    }
  }

  /** Prochain code libre pour un groupe fonctionnel, au format préfixe-0001. */
  public nextItemCode(group: ItemCategoryGroup): string {
    const prefix = this.groupCodePrefix(group);
    const used = this.db.items
      .map(item => new RegExp(`^${prefix}-(\\d+)$`).exec(item.code)?.[1])
      .filter((n): n is string => Boolean(n))
      .map(n => Number(n));
    const next = (used.length > 0 ? Math.max(...used) : 0) + 1;
    let candidate = `${prefix}-${String(next).padStart(4, '0')}`;
    let guard = 0;
    while (this.db.items.some(i => i.code.toUpperCase() === candidate) && guard < 1000) {
      guard += 1;
      candidate = `${prefix}-${String(next + guard).padStart(4, '0')}`;
    }
    return candidate;
  }

  // --- Utilisation d'un article (verrous de suppression / changement de code) ---

  public getItemUsage(itemId: string) {
    const item = this.getItemById(itemId);
    const movements = this.db.stockMovements.filter(m => m.itemId === itemId);
    const stockRows = this.db.warehouseStocks.filter(row => row.itemId === itemId);
    const lots = this.db.stockLots.filter(lot => lot.itemId === itemId);
    const recipes = this.db.recipes.filter(recipe =>
      recipe.ingredients.some(ing => ing.itemId === itemId)
    );
    const stockQuantity = this.roundQty(stockRows.reduce((total, row) => total + row.quantity, 0));
    const lastMovement = movements
      .map(m => m.timestamp)
      .sort((a, b) => b.localeCompare(a))[0];

    return {
      itemId,
      itemCode: item?.code || '',
      movementCount: movements.length,
      receptionCount: movements.filter(m => m.type === 'ENTREE_RECEPTION').length,
      consumptionCount: movements.filter(m => m.type === 'CONSOMMATION_OF').length,
      transferCount: movements.filter(m => m.type.startsWith('TRANSFERT_')).length,
      recipeCount: recipes.length,
      recipeCodes: recipes.map(recipe => `${recipe.code} ${recipe.version}`),
      lotCount: lots.length,
      stockQuantity,
      lastMovementAt: lastMovement,
      /** Un article déjà mouvementé, stocké ou utilisé dans une nomenclature est immuable sur son code. */
      isUsed: movements.length > 0 || lots.length > 0 || stockQuantity > 0 || recipes.length > 0,
    };
  }

  // --- Validation & normalisation d'une fiche article ---

  private normalizeItemText(value: unknown): string {
    return String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  private formatItemFieldValue(field: string, value: unknown): string {
    if (value === undefined || value === null || value === '') return '—';
    switch (field) {
      case 'isActive':
        return value === false ? 'Inactif' : 'Actif';
      case 'group':
        return ITEM_CATEGORY_GROUP_LABELS[value as ItemCategoryGroup] || String(value);
      case 'category':
        return ITEM_CATEGORY_LABELS[value as keyof typeof ITEM_CATEGORY_LABELS] || String(value);
      case 'unit':
      case 'secondaryUnit':
        return String(value);
      case 'subCategoryId': {
        const sub = this.db.itemSubCategories.find(s => s.id === value);
        return sub ? `${sub.code} — ${sub.designation}` : String(value);
      }
      case 'defaultWarehouseId': {
        const warehouse = this.getWarehouseById(String(value));
        return warehouse ? `${warehouse.code} — ${warehouse.designation}` : String(value);
      }
      case 'defaultLocationId': {
        const location = this.getWarehouseLocationById(String(value));
        return location ? `${location.code} — ${location.designation}` : String(value);
      }
      case 'primarySupplierId': {
        const supplier = this.getSupplier(String(value));
        return supplier ? supplier.name : String(value);
      }
      case 'supplierRefs': {
        const refs = (value as Item['supplierRefs']) || [];
        return refs.length === 0
          ? '—'
          : refs
              .map(ref => {
                const parts = [ref.supplierName];
                if (ref.supplierReference) parts.push(`réf. ${ref.supplierReference}`);
                if (ref.leadTimeDays !== undefined) parts.push(`${ref.leadTimeDays} j`);
                return parts.join(' · ');
              })
              .join(' | ');
      }
      case 'mandatoryDocuments':
        return (value as string[]).length === 0 ? '—' : (value as string[]).join(', ');
      case 'photoDataUrl':
        return String(value).length > 60 ? 'Photo enregistrée' : String(value);
      default:
        return String(value);
    }
  }

  /**
   * Contrôles de gestion du référentiel : code unique, désignation et catégorie
   * obligatoires, unité principale obligatoire, conversions positives et
   * cohérentes, absence de doublon, cohérence des seuils et des températures.
   */
  private validateItemCandidate(
    candidate: Partial<Item>,
    options: { existingId?: string; previous?: Item } = {}
  ): void {
    const code = (candidate.code || '').trim().toUpperCase();
    if (!code) throw new Error('Le code article est obligatoire.');
    if (!StorageService.ITEM_CODE_PATTERN.test(code)) {
      throw new Error(
        'Code article invalide : 2 à 30 caractères, lettres majuscules, chiffres, tiret, point ou souligné (ex. MP-0001).'
      );
    }
    if (
      this.db.items.some(
        item => item.id !== options.existingId && item.code.trim().toUpperCase() === code
      )
    ) {
      throw new Error(`Le code article ${code} est déjà utilisé : il doit être unique.`);
    }

    const designation = (candidate.designation || '').trim();
    if (designation.length < 2) throw new Error('La désignation de l\'article est obligatoire.');

    const category = candidate.category;
    if (!category || !(category in ITEM_CATEGORY_LABELS)) {
      throw new Error('La catégorie de l\'article est obligatoire.');
    }
    if (!candidate.unit) throw new Error('L\'unité principale est obligatoire.');

    const group = candidate.group ?? groupForCategory(category);
    if (!ITEM_CATEGORY_GROUPS.includes(group)) {
      throw new Error('Groupe fonctionnel invalide.');
    }

    if (candidate.subCategoryId) {
      const sub = this.db.itemSubCategories.find(s => s.id === candidate.subCategoryId);
      if (!sub) throw new Error('Sous-catégorie introuvable.');
      if (sub.group !== group) {
        throw new Error(
          `La sous-catégorie « ${sub.designation} » appartient au groupe ${sub.group} : choisissez une sous-catégorie du groupe sélectionné.`
        );
      }
    }

    if (candidate.secondaryUnit) {
      if (candidate.secondaryUnit === candidate.unit) {
        throw new Error('L\'unité secondaire doit être différente de l\'unité principale.');
      }
      const coefficient = Number(candidate.conversionCoefficient);
      if (!Number.isFinite(coefficient) || coefficient <= 0) {
        throw new Error(
          'Une unité secondaire impose un coefficient de conversion strictement positif (nombre d\'unités principales par unité secondaire).'
        );
      }
    } else if (
      candidate.conversionCoefficient !== undefined &&
      Number(candidate.conversionCoefficient) !== 1
    ) {
      throw new Error(
        'Un coefficient de conversion ne peut être défini sans unité secondaire (ou doit valoir 1).'
      );
    }

    if (candidate.packaging !== undefined && candidate.packaging !== '') {
      const qty = Number(candidate.quantityPerPackaging);
      if (!Number.isFinite(qty) || qty <= 0) {
        throw new Error(
          'Un conditionnement renseigné exige une quantité par conditionnement strictement positive.'
        );
      }
    }

    const minStock = Number(candidate.minStockLevel ?? 0);
    if (!Number.isFinite(minStock) || minStock < 0) {
      throw new Error('Le stock minimum doit être un nombre positif ou nul.');
    }
    if (candidate.maxStockLevel !== undefined && candidate.maxStockLevel !== null) {
      const maxStock = Number(candidate.maxStockLevel);
      if (!Number.isFinite(maxStock) || maxStock < 0) {
        throw new Error('Le stock maximum doit être un nombre positif ou nul.');
      }
      if (maxStock > 0 && maxStock < minStock) {
        throw new Error('Le stock maximum ne peut pas être inférieur au stock minimum.');
      }
    }

    if (
      candidate.minTemperatureC !== undefined &&
      candidate.maxTemperatureC !== undefined &&
      Number(candidate.minTemperatureC) > Number(candidate.maxTemperatureC)
    ) {
      throw new Error('La température minimale ne peut pas dépasser la température maximale.');
    }

    if (candidate.defaultWarehouseId) {
      const warehouse = this.getWarehouseById(candidate.defaultWarehouseId);
      if (!warehouse) throw new Error('Magasin par défaut introuvable.');
      if (candidate.defaultLocationId) {
        const location = this.getWarehouseLocationById(candidate.defaultLocationId);
        if (!location || location.warehouseId !== warehouse.id) {
          throw new Error('L\'emplacement par défaut doit appartenir au magasin par défaut.');
        }
      }
    } else if (candidate.defaultLocationId) {
      throw new Error('Un emplacement par défaut exige un magasin par défaut.');
    }

    if (candidate.primarySupplierId && !this.getSupplier(candidate.primarySupplierId)) {
      throw new Error('Fournisseur principal introuvable dans le référentiel.');
    }
    for (const ref of candidate.supplierRefs || []) {
      if (!this.getSupplier(ref.supplierId)) {
        throw new Error(`Fournisseur associé introuvable (${ref.supplierName || ref.supplierId}).`);
      }
      if (ref.leadTimeDays !== undefined && (!Number.isFinite(ref.leadTimeDays) || ref.leadTimeDays < 0)) {
        throw new Error('Le délai d\'approvisionnement doit être un nombre de jours positif ou nul.');
      }
    }

    const duplicate = this.db.items.find(
      item =>
        item.id !== options.existingId &&
        this.normalizeItemText(item.designation) === this.normalizeItemText(designation) &&
        item.category === category
    );
    if (duplicate) {
      throw new Error(
        `Doublon refusé : un article « ${duplicate.designation} » (${duplicate.code}) existe déjà dans la catégorie ${ITEM_CATEGORY_LABELS[category]}. Précisez la désignation (format, conditionnement, origine).`
      );
    }

    if (
      options.previous &&
      (options.previous.code || '').toUpperCase() !== code &&
      this.getItemUsage(options.previous.id).isUsed
    ) {
      const usage = this.getItemUsage(options.previous.id);
      throw new Error(
        `Code ${options.previous.code} non modifiable : l'article est déjà utilisé (${usage.movementCount} mouvement(s) de stock, ${usage.recipeCount} nomenclature(s)). Créez un nouvel article et désactivez celui-ci.`
      );
    }
  }

  /** Construit le payload normalisé d'une fiche article à partir d'une saisie partielle. */
  private buildItemPayload(
    input: Partial<Item>,
    base?: Item
  ): Omit<Item, 'id'> {
    /** Une clé explicitement transmise (même vide) écrase la valeur existante : permet d'effacer un champ. */
    const hasKey = (key: keyof Item) => Object.prototype.hasOwnProperty.call(input, key);

    const optionalNumber = (value: unknown, fallback?: number): number | undefined => {
      if (value === undefined || value === null || value === '') return fallback;
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : fallback;
    };
    const optionalText = (value: unknown, fallback?: string): string | undefined => {
      const text = String(value ?? '').trim();
      return text === '' ? fallback : text;
    };
    const textField = (key: keyof Item): string | undefined =>
      hasKey(key)
        ? optionalText((input as Record<string, unknown>)[key])
        : (base?.[key] as string | undefined);
    const numberField = (key: keyof Item): number | undefined =>
      hasKey(key)
        ? optionalNumber((input as Record<string, unknown>)[key])
        : (base?.[key] as number | undefined);

    const category = (input.category ?? base?.category ?? 'AUTRE') as Item['category'];
    const group = (input.group ?? base?.group ?? groupForCategory(category)) as ItemCategoryGroup;
    const code = (input.code ?? base?.code ?? '').trim().toUpperCase();
    const designation = (input.designation ?? base?.designation ?? '').trim();
    const unit = (input.unit ?? base?.unit ?? 'KG') as Item['unit'];
    const secondaryUnit = hasKey('secondaryUnit')
      ? ((input.secondaryUnit || undefined) as Item['unit'] | undefined)
      : base?.secondaryUnit;

    return {
      // Champs historiques obligatoires
      code,
      designation,
      category,
      unit,
      minStockLevel: Math.max(0, numberField('minStockLevel') ?? 0),
      currentStock: base?.currentStock ?? 0,
      quarantineStock: base?.quarantineStock ?? 0,
      allocatedStock: base?.allocatedStock ?? 0,
      pendingControlStock: base?.pendingControlStock ?? 0,
      blockedStock: base?.blockedStock ?? 0,
      transitStock: base?.transitStock ?? 0,
      storageCondition: textField('storageCondition') ?? '',
      technicalSheetVersion: textField('technicalSheetVersion') || 'FT-v1',

      // Classification & identification
      secondaryDesignation: textField('secondaryDesignation'),
      group,
      subCategoryId: hasKey('subCategoryId')
        ? optionalText(input.subCategoryId)
        : base?.subCategoryId,
      description: textField('description'),
      photoDataUrl: hasKey('photoDataUrl') ? optionalText(input.photoDataUrl) : base?.photoDataUrl,
      isActive: input.isActive ?? base?.isActive ?? true,

      // Unités & conditionnement
      secondaryUnit,
      conversionCoefficient: secondaryUnit
        ? numberField('conversionCoefficient')
        : hasKey('conversionCoefficient')
          ? optionalNumber(input.conversionCoefficient)
          : base?.conversionCoefficient,
      packaging: textField('packaging'),
      quantityPerPackaging: numberField('quantityPerPackaging'),

      // Stockage
      defaultWarehouseId: hasKey('defaultWarehouseId')
        ? optionalText(input.defaultWarehouseId)
        : base?.defaultWarehouseId,
      defaultLocationId: hasKey('defaultLocationId')
        ? optionalText(input.defaultLocationId)
        : base?.defaultLocationId,
      maxStockLevel: numberField('maxStockLevel'),
      minTemperatureC: numberField('minTemperatureC'),
      maxTemperatureC: numberField('maxTemperatureC'),

      // Qualité
      technicalSpecifications: textField('technicalSpecifications'),
      allergens: textField('allergens'),
      receiptControlRequirements: textField('receiptControlRequirements'),
      mandatoryDocuments: hasKey('mandatoryDocuments')
        ? input.mandatoryDocuments ?? []
        : base?.mandatoryDocuments ?? [],
      shelfLifeMonths: numberField('shelfLifeMonths'),

      // Fournisseurs
      primarySupplierId: hasKey('primarySupplierId')
        ? optionalText(input.primarySupplierId)
        : base?.primarySupplierId,
      supplierRefs: hasKey('supplierRefs') ? input.supplierRefs ?? [] : base?.supplierRefs ?? [],

      // Produits finis / emballages (champs existants conservés)
      format: textField('format'),
      netWeightGrams: numberField('netWeightGrams'),
      drainedWeightGrams: numberField('drainedWeightGrams'),

      createdAt: base?.createdAt ?? this.nowIso(),
      createdBy: base?.createdBy ?? `${this.currentUser.name} (${this.currentUser.role})`,
      updatedAt: this.nowIso(),
      updatedBy: `${this.currentUser.name} (${this.currentUser.role})`,
      deactivatedAt: base?.deactivatedAt,
      deactivatedBy: base?.deactivatedBy,
      deactivationReason: base?.deactivationReason,
    };
  }

  /** Écrit une ligne d'historique par champ réellement modifié. */
  private logItemChanges(
    item: Item,
    before: Partial<Item>,
    after: Partial<Item>,
    action: ItemChangeAction,
    motive?: string
  ) {
    const fields = Object.keys(ITEM_FIELD_LABELS);
    for (const field of fields) {
      const oldRaw = (before as Record<string, unknown>)[field];
      const newRaw = (after as Record<string, unknown>)[field];
      const oldValue = this.formatItemFieldValue(field, oldRaw);
      const newValue = this.formatItemFieldValue(field, newRaw);
      if (oldValue === newValue) continue;
      this.db.itemChangeLogs.push({
        id: this.newId('ICL'),
        itemId: item.id,
        itemCode: item.code,
        itemDesignation: item.designation,
        action,
        field,
        fieldLabel: ITEM_FIELD_LABELS[field],
        oldValue,
        newValue,
        userId: this.currentUser.id,
        userName: this.currentUser.name,
        userRole: this.currentUser.role,
        timestamp: this.nowIso(),
        motive: motive?.trim() || undefined,
      });
    }
  }

  /**
   * Crée une fiche article dans le référentiel central unique.
   * Aucun second référentiel n'est créé : les articles produits ici sont
   * immédiatement disponibles dans les nomenclatures, les réceptions et les stocks.
   */
  public createItemProfile(input: Partial<Item>, options?: { motive?: string }): Item {
    this.assertItemPermission('ITEM_CREATE', 'créer un article');
    const payload = this.buildItemPayload(input);
    this.validateItemCandidate(payload);

    const newItem: Item = { ...payload, id: this.newId('ITM') };
    this.db.items.push(newItem);

    this.logItemChanges(newItem, {}, payload, 'CREATE', options?.motive);
    this.logAudit({
      action: 'CREATE',
      entity: 'Item',
      entityId: newItem.id,
      newValues: `Création article ${newItem.code} — ${newItem.designation} (${ITEM_CATEGORY_LABELS[newItem.category]})`,
      motive: options?.motive,
    });
    this.saveDatabase(this.db);
    return newItem;
  }

  /**
   * Modifie une fiche article existante. Chaque champ modifié est historisé avec
   * son ancienne et sa nouvelle valeur, l'utilisateur et le motif éventuel.
   */
  public updateItemProfile(
    id: string,
    updates: Partial<Item>,
    options?: { motive?: string }
  ): Item {
    this.assertItemPermission('ITEM_EDIT', 'modifier un article');
    const index = this.db.items.findIndex(item => item.id === id);
    if (index === -1) throw new Error(`Article ${id} introuvable.`);
    const previous = this.db.items[index];

    const payload = this.buildItemPayload(updates, previous);
    this.validateItemCandidate(payload, { existingId: id, previous });

    const updated: Item = { ...previous, ...payload, id: previous.id };
    this.db.items[index] = updated;

    this.logItemChanges(updated, previous, payload, 'UPDATE', options?.motive);
    this.logAudit({
      action: 'UPDATE',
      entity: 'Item',
      entityId: id,
      oldValues: `${previous.code} — ${previous.designation}`,
      newValues: `${updated.code} — ${updated.designation}`,
      motive: options?.motive,
    });
    this.saveDatabase(this.db);
    return updated;
  }

  /**
   * Désactive (archive) ou réactive un article. Aucune suppression physique n'est
   * jamais effectuée : les mouvements, réceptions et nomenclatures historiques
   * conservent l'article et son code d'origine.
   */
  public setItemActive(id: string, active: boolean, reason: string): Item {
    this.assertItemPermission('ITEM_DEACTIVATE', active ? 'réactiver un article' : 'désactiver un article');
    const item = this.db.items.find(i => i.id === id);
    if (!item) throw new Error('Article introuvable.');
    const motive = (reason || '').trim();
    if (motive.length < 3) {
      throw new Error('Un motif circonstancié (3 caractères minimum) est obligatoire.');
    }
    if (this.isItemActive(item) === active) {
      throw new Error(`L'article ${item.code} est déjà ${active ? 'actif' : 'inactif'}.`);
    }

    const before = { ...item };
    item.isActive = active;
    if (active) {
      item.deactivatedAt = undefined;
      item.deactivatedBy = undefined;
      item.deactivationReason = undefined;
    } else {
      item.deactivatedAt = this.nowIso();
      item.deactivatedBy = `${this.currentUser.name} (${this.currentUser.role})`;
      item.deactivationReason = motive;
    }
    item.updatedAt = this.nowIso();
    item.updatedBy = `${this.currentUser.name} (${this.currentUser.role})`;

    this.logItemChanges(item, before, item, active ? 'REACTIVATE' : 'DEACTIVATE', motive);
    this.logAudit({
      action: active ? 'RELEASE' : 'BLOCK',
      entity: 'Item',
      entityId: id,
      oldValues: `Statut: ${active ? 'Inactif' : 'Actif'}`,
      newValues: `Statut: ${active ? 'Actif' : 'Inactif'} — ${item.code}`,
      motive,
    });
    this.saveDatabase(this.db);
    return item;
  }

  /** Compatibilité : création d'article via l'ancienne API (Référentiels produits finis). */
  public addItem(item: Omit<Item, 'id'>): Item {
    return this.createItemProfile(item, { motive: 'Création depuis le référentiel produits finis' });
  }

  /** Compatibilité : modification d'article via l'ancienne API. */
  public updateItem(id: string, updates: Partial<Item>): Item {
    return this.updateItemProfile(id, updates, { motive: 'Modification depuis le référentiel produits finis' });
  }

  // --- Recettes & Nomenclatures ---
  public getRecipes(): Recipe[] {
    return this.db.recipes;
  }

  public addRecipe(recipe: Omit<Recipe, 'id'>): Recipe {
    this.assertCanManageNomenclature('Création refusée');
    const newRecipe: Recipe = {
      ...recipe,
      id: `REC-${Date.now()}`,
      status: recipe.status ?? 'BROUILLON',
      referenceProductionQty: recipe.referenceProductionQty ?? 1000,
      referenceUnit: recipe.referenceUnit ?? 'BOITE',
      isActive: recipe.status === 'VALIDEE' ? recipe.isActive : false,
    };
    this.db.recipes.push(newRecipe);
    this.logAudit({
      action: 'CREATE',
      entity: 'Recipe',
      entityId: newRecipe.id,
      newValues: `Création recette ${newRecipe.code} version ${newRecipe.version}`,
    });
    this.saveDatabase(this.db);
    return newRecipe;
  }

  /** Profils habilités à créer, modifier et valider une nomenclature de produit fini. */
  public canManageNomenclature(): boolean {
    return ['ADMIN', 'DIRECTEUR_USINE', 'RESPONSABLE_QUALITE', 'RESPONSABLE_PRODUCTION'].includes(
      this.currentUser.role
    );
  }

  private assertCanManageNomenclature(action: string) {
    if (!this.canManageNomenclature()) {
      throw new Error(
        `${action} : le profil ${this.currentUser.role} n'est pas habilité à gérer les nomenclatures de produits finis.`
      );
    }
  }

  public getRecipeById(id: string): Recipe | undefined {
    return this.db.recipes.find(r => r.id === id);
  }

  /** Toutes les versions successives de nomenclature d'un produit fini. */
  public getRecipesForItem(itemId: string): Recipe[] {
    return this.db.recipes.filter(r => r.finishedItemId === itemId);
  }

  /**
   * Nomenclature applicable à un produit fini : la dernière version validée.
   * Undefined lorsque le produit fini ne dispose d'aucune nomenclature valide,
   * auquel cas le lancement d'un ordre de fabrication est refusé.
   */
  public getApplicableRecipe(itemId: string): Recipe | undefined {
    return this.getRecipesForItem(itemId)
      .filter(r => (r.status ?? 'BROUILLON') === 'VALIDEE')
      .sort((a, b) => (b.approvedAt || '').localeCompare(a.approvedAt || ''))[0];
  }

  /** Une nomenclature consommée par une production déjà lancée est figée : passer par une nouvelle version. */
  private assertRecipeNotInProduction(recipeId: string) {
    const launched = this.db.workOrders.find(
      w => w.recipeId === recipeId && ['EN_COURS', 'EN_CONTROLE', 'CLOTURE'].includes(w.status)
    );
    if (launched) {
      throw new Error(
        `Modification refusée : cette nomenclature est utilisée par l'OF ${launched.orderNumber} (${launched.status}). Créez une nouvelle version.`
      );
    }
  }

  public updateRecipe(id: string, updates: Partial<Recipe>): Recipe {
    const idx = this.db.recipes.findIndex(r => r.id === id);
    if (idx === -1) throw new Error(`Nomenclature ${id} introuvable`);
    this.assertCanManageNomenclature('Modification refusée');
    this.assertRecipeNotInProduction(id);
    const old = this.db.recipes[idx];
    this.db.recipes[idx] = { ...old, ...updates };
    this.logAudit({
      action: 'UPDATE',
      entity: 'Recipe',
      entityId: id,
      oldValues: JSON.stringify(old),
      newValues: JSON.stringify(this.db.recipes[idx]),
    });
    this.saveDatabase(this.db);
    return this.db.recipes[idx];
  }

  /**
   * Valide une nomenclature : elle devient la version applicable du produit fini et
   * les versions validées antérieures du même produit fini passent en obsolète.
   */
  public validateRecipe(id: string): Recipe {
    const recipe = this.db.recipes.find(r => r.id === id);
    if (!recipe) throw new Error(`Nomenclature ${id} introuvable`);
    this.assertCanManageNomenclature('Validation refusée');
    if (!recipe.finishedItemId) {
      throw new Error('Validation refusée : une nomenclature validée doit être liée à un produit fini précis.');
    }
    if (!recipe.ingredients.length) {
      throw new Error('Validation refusée : la nomenclature ne contient aucun composant.');
    }
    this.assertRecipeNotInProduction(id);

    this.db.recipes.forEach(r => {
      if (r.id !== id && r.finishedItemId === recipe.finishedItemId && (r.status ?? 'BROUILLON') === 'VALIDEE') {
        r.status = 'OBSOLETE';
        r.isActive = false;
      }
    });

    const oldStatus = recipe.status ?? 'BROUILLON';
    recipe.status = 'VALIDEE';
    recipe.approvedBy = this.currentUser.name;
    recipe.approvedAt = new Date().toISOString();
    recipe.isActive = true;

    const item = this.db.items.find(i => i.id === recipe.finishedItemId);

    this.logAudit({
      action: 'VALIDATE',
      entity: 'Recipe',
      entityId: id,
      oldValues: `Statut: ${oldStatus}`,
      newValues: `Nomenclature ${recipe.code} ${recipe.version} validée — produit fini ${item?.code || recipe.finishedItemId}`,
      motive: 'Validation de nomenclature de produit fini',
    });
    this.saveDatabase(this.db);
    return recipe;
  }

  // --- Réceptions & Matières Premières ---
  public getReceptions(): RawBatchReception[] {
    return this.db.receptions;
  }

  public addReception(reception: Omit<RawBatchReception, 'id' | 'internalBatchNumber' | 'receptionNumber'>): RawBatchReception {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = this.db.receptions.length + 1;
    const receptionNumber = `REC-2026-${String(count).padStart(3, '0')}`;
    const internalBatchNumber = `LOT-MP-${dateStr}-${String(count).padStart(3, '0')}`;

    const newRec: RawBatchReception = {
      ...reception,
      id: `REC-${Date.now()}`,
      receptionNumber,
      internalBatchNumber,
    };
    this.db.receptions.unshift(newRec);

    // Imputation en stock magasin selon la décision qualité (jamais de double comptage).
    const matchItem = findFishItemForSpecies(this.db.items, newRec.species);
    if (!matchItem) {
      this.logAudit({
        action: 'BLOCK',
        entity: 'RawBatchReception',
        entityId: newRec.id,
        newValues: `Réception ${receptionNumber} (${newRec.receivedQtyKg} kg de « ${newRec.species} ») mais aucun article matière première correspondant dans le référentiel`,
        motive: 'Stock non imputé : créer l\'article poisson manquant puis régulariser le stock',
      });
    } else {
      const isAccepted =
        newRec.decision === 'ACCEPTE' || newRec.decision === 'ACCEPTE_DEROGATION';
      const isPending = newRec.decision === 'EN_ATTENTE';
      const quantity = isAccepted
        ? newRec.acceptedQtyKg
        : isPending
          ? newRec.acceptedQtyKg || newRec.receivedQtyKg
          : newRec.rejectedQtyKg || newRec.receivedQtyKg;

      if (quantity > 0) {
        const warehouse = isAccepted
          ? this.findWarehouseByType('MATIERES_PREMIERES')
          : isPending
            ? this.findWarehouseByType('QUARANTAINE')
            : this.findWarehouseByType('NON_CONFORMES') || this.findWarehouseByType('QUARANTAINE');
        const location = warehouse
          ? this.resolveLocation(warehouse.id, newRec.storageLocation)
          : undefined;
        if (warehouse && location) {
          const qualityStatus: StockQualityStatus = isAccepted
            ? 'LIBERE'
            : isPending
              ? 'EN_ATTENTE_CONTROLE'
              : 'REJETE';
          const lot = this.ensureStockLot({
            itemId: matchItem.id,
            itemCode: matchItem.code,
            lotNumber: internalBatchNumber,
            supplierLotNumber: newRec.supplierBatchNumber,
            receptionDate: newRec.receptionDate,
            qualityStatus,
            origin: `${newRec.supplier} — ${newRec.vesselOrOrigin}`,
            warehouse,
            location,
          });
          this.addStockMovement({
            documentNumber: receptionNumber,
            itemId: matchItem.id,
            itemCode: matchItem.code,
            batchNumber: internalBatchNumber,
            lotId: lot.id,
            type: 'ENTREE_RECEPTION',
            quantity,
            unit: 'KG',
            stockDelta: quantity,
            destinationWarehouseId: warehouse.id,
            destinationLocationId: location.id,
            destinationLocation: location.code,
            qualityStatus,
            referenceDocument: receptionNumber,
            userId: this.currentUser.id,
            userName: this.currentUser.name,
            reason: `Réception ${isAccepted ? 'conforme' : isPending ? 'en attente de contrôle' : 'refusée'} ${receptionNumber} — ${matchItem.code}`,
          });
        }
      }
    }

    this.logAudit({
      action: 'CREATE',
      entity: 'RawBatchReception',
      entityId: newRec.id,
      newValues: `Création réception ${receptionNumber} lot ${internalBatchNumber} - Décision: ${newRec.decision}`,
      motive: 'Agréage matière première',
    });

    this.saveDatabase(this.db);
    return newRec;
  }

  public updateReceptionDecision(id: string, decision: RawBatchReception['decision'], reason?: string, authorizedBy?: string) {
    const rec = this.db.receptions.find(r => r.id === id);
    if (!rec) throw new Error('Réception introuvable');
    const oldDec = rec.decision;
    rec.decision = decision;
    rec.decisionReason = reason;
    rec.derogationAuthorizedBy = authorizedBy;

    const matchItem = findFishItemForSpecies(this.db.items, rec.species);
    const lot = matchItem
      ? this.db.stockLots.find(
          l => l.itemId === matchItem.id && l.lotNumber === rec.internalBatchNumber
        )
      : undefined;

    const target = (() => {
      if (decision === 'ACCEPTE' || decision === 'ACCEPTE_DEROGATION') {
        return {
          warehouse: this.findWarehouseByType('MATIERES_PREMIERES'),
          status: 'LIBERE' as StockQualityStatus,
        };
      }
      if (decision === 'EN_ATTENTE') {
        return {
          warehouse: this.findWarehouseByType('QUARANTAINE'),
          status: 'EN_ATTENTE_CONTROLE' as StockQualityStatus,
        };
      }
      return {
        warehouse:
          this.findWarehouseByType('NON_CONFORMES') || this.findWarehouseByType('QUARANTAINE'),
        status: 'REJETE' as StockQualityStatus,
      };
    })();

    if (matchItem && target.warehouse) {
      const destinationLocation =
        this.resolveLocation(target.warehouse.id, rec.storageLocation) ||
        this.getDefaultLocation(target.warehouse.id);

      if (lot && this.db.warehouseStocks.some(row => row.lotId === lot.id)) {
        this.relocateLotStock({
          lotId: lot.id,
          destinationWarehouseId: target.warehouse.id,
          destinationLocationId: destinationLocation?.id,
          newStatus: target.status,
          reason: `Décision d'agréage ${decision} sur la réception ${rec.receptionNumber}`,
          documentNumber: rec.receptionNumber,
        });
      } else if (
        destinationLocation &&
        (decision === 'ACCEPTE' || decision === 'ACCEPTE_DEROGATION' || decision === 'EN_ATTENTE')
      ) {
        const quantity =
          rec.acceptedQtyKg > 0 ? rec.acceptedQtyKg : rec.receivedQtyKg;
        if (quantity > 0) {
          const ensuredLot = this.ensureStockLot({
            itemId: matchItem.id,
            itemCode: matchItem.code,
            lotNumber: rec.internalBatchNumber,
            supplierLotNumber: rec.supplierBatchNumber,
            receptionDate: rec.receptionDate,
            qualityStatus: target.status,
            origin: `${rec.supplier} — ${rec.vesselOrOrigin}`,
            warehouse: target.warehouse,
            location: destinationLocation,
          });
          this.addStockMovement({
            documentNumber: rec.receptionNumber,
            itemId: matchItem.id,
            itemCode: matchItem.code,
            batchNumber: rec.internalBatchNumber,
            lotId: ensuredLot.id,
            type: 'ENTREE_RECEPTION',
            quantity,
            unit: 'KG',
            stockDelta: quantity,
            destinationWarehouseId: target.warehouse.id,
            destinationLocationId: destinationLocation.id,
            destinationLocation: destinationLocation.code,
            qualityStatus: target.status,
            referenceDocument: rec.receptionNumber,
            userId: this.currentUser.id,
            userName: this.currentUser.name,
            reason: `Décision d'agréage ${decision} — réception ${rec.receptionNumber}`,
          });
        }
      }
    }

    this.logAudit({
      action: decision === 'REFUSE' ? 'BLOCK' : 'VALIDATE',
      entity: 'RawBatchReception',
      entityId: id,
      oldValues: `Décision: ${oldDec}`,
      newValues: `Nouvelle décision: ${decision} (${reason || 'N/A'})`,
      motive: authorizedBy ? `Autorisé par dérogation: ${authorizedBy}` : 'Décision contrôle qualité',
    });

    this.saveDatabase(this.db);
  }

  // --- Ordres de Fabrication (OF) ---
  public getWorkOrders(): WorkOrder[] {
    return this.db.workOrders;
  }

  public addWorkOrder(wo: Omit<WorkOrder, 'id' | 'orderNumber'>): WorkOrder {
    const recipe = this.db.recipes.find(r => r.id === wo.recipeId);
    if (!recipe) {
      throw new Error('Ordre de fabrication refusé : aucune nomenclature n\'est associée à ce produit.');
    }
    if ((recipe.status ?? 'BROUILLON') !== 'VALIDEE') {
      throw new Error(
        `Ordre de fabrication refusé : la nomenclature ${recipe.code} (${recipe.version}) est au statut « ${recipe.status ?? 'BROUILLON'} ». Aucune nomenclature valide n'est disponible.`
      );
    }

    const usedNumbers = new Set(this.db.workOrders.map(w => w.orderNumber));
    let sequence = this.db.workOrders.length + 107;
    let orderNumber = `OF-2026-${String(sequence).padStart(3, '0')}`;
    while (usedNumbers.has(orderNumber)) {
      sequence += 1;
      orderNumber = `OF-2026-${String(sequence).padStart(3, '0')}`;
    }
    const newWo: WorkOrder = {
      ...wo,
      recipeVersion: wo.recipeVersion || recipe.version,
      id: this.uniqueId('WO', this.db.workOrders.map(w => w.id)),
      orderNumber,
    };
    this.db.workOrders.unshift(newWo);

    this.logAudit({
      action: 'CREATE',
      entity: 'WorkOrder',
      entityId: newWo.id,
      newValues: `Création OF ${orderNumber} - Produit: ${newWo.productName} - Prévu: ${newWo.plannedCansQty} boîtes - Nomenclature: ${recipe.code} ${recipe.version}`,
    });

    this.saveDatabase(this.db);
    return newWo;
  }

  public updateWorkOrderStatus(id: string, status: WorkOrder['status']) {
    const wo = this.db.workOrders.find(w => w.id === id);
    if (!wo) throw new Error('OF introuvable');

    if (status === 'EN_COURS') {
      const recipe = this.db.recipes.find(r => r.id === wo.recipeId);
      if (!recipe || (recipe.status ?? 'BROUILLON') !== 'VALIDEE') {
        throw new Error(
          'Lancement refusé : aucune nomenclature valide n\'est disponible pour cet ordre de fabrication.'
        );
      }
    }

    const oldStatus = wo.status;
    wo.status = status;
    if (status === 'EN_COURS' && !wo.startDateActual) {
      wo.startDateActual = new Date().toISOString();
    }
    if (status === 'CLOTURE' && !wo.endDateActual) {
      wo.endDateActual = new Date().toISOString();
    }

    this.logAudit({
      action: 'UPDATE',
      entity: 'WorkOrder',
      entityId: id,
      oldValues: `Statut: ${oldStatus}`,
      newValues: `Statut: ${status}`,
    });

    this.saveDatabase(this.db);
  }

  // --- Consommations Réelles, Écarts & Rendements ---
  public getConsumptions(): ConsumptionRecord[] {
    return this.db.consumptions || [];
  }

  public getConsumptionById(id: string): ConsumptionRecord | undefined {
    return (this.db.consumptions || []).find(c => c.id === id);
  }

  public addConsumption(consumption: Omit<ConsumptionRecord, 'id' | 'consumptionNumber'>): ConsumptionRecord {
    const usedNumbers = new Set((this.db.consumptions || []).map(c => c.consumptionNumber));
    let sequence = (this.db.consumptions || []).length + 107;
    let consumptionNumber = `CONS-2026-${String(sequence).padStart(4, '0')}`;
    while (usedNumbers.has(consumptionNumber)) {
      sequence += 1;
      consumptionNumber = `CONS-2026-${String(sequence).padStart(4, '0')}`;
    }
    const newRecord: ConsumptionRecord = {
      ...consumption,
      id: this.uniqueId('CONS', (this.db.consumptions || []).map(c => c.id)),
      consumptionNumber,
    };
    if (!this.db.consumptions) {
      this.db.consumptions = [];
    }
    this.db.consumptions.unshift(newRecord);

    this.logAudit({
      action: 'CREATE',
      entity: 'ConsumptionRecord',
      entityId: newRecord.id,
      newValues: `Création fiche de consommation ${consumptionNumber} pour l'OF ${newRecord.workOrderNumber} - Produit: ${newRecord.finishedItemName} (${newRecord.lines.length} composants)`,
    });

    this.saveDatabase(this.db);
    return newRecord;
  }

  public updateConsumption(id: string, updates: Partial<ConsumptionRecord>): ConsumptionRecord {
    const record = (this.db.consumptions || []).find(c => c.id === id);
    if (!record) throw new Error('Fiche de consommation introuvable');
    if (record.status === 'VALIDEE') {
      throw new Error('Impossible de modifier directement une consommation validée et verrouillée. Utilisez la procédure de régularisation tracée.');
    }

    Object.assign(record, updates);

    this.logAudit({
      action: 'UPDATE',
      entity: 'ConsumptionRecord',
      entityId: id,
      newValues: `Mise à jour fiche ${record.consumptionNumber} - Statut: ${record.status}`,
    });

    this.saveDatabase(this.db);
    return record;
  }

  public validateConsumption(id: string, validatorUser: User, notes?: string): ConsumptionRecord {
    const record = (this.db.consumptions || []).find(c => c.id === id);
    if (!record) throw new Error('Fiche de consommation introuvable');
    if (record.status === 'VALIDEE') {
      throw new Error('Cette fiche de consommation est déjà validée');
    }
    if (record.status === 'ANNULEE') {
      throw new Error('Impossible de valider une consommation annulée');
    }

    // Contrôle d'habilitation (permissions dynamiques + rôles hérités)
    this.requirePermission(validatorUser, 'GDS_RECORD_CONSUMPTION');
    const authorizedRoles: UserRole[] = ['RESPONSABLE_PRODUCTION', 'RESPONSABLE_QUALITE', 'DIRECTEUR_USINE', 'ADMIN'];
    if (!authorizedRoles.includes(validatorUser.role)) {
      throw new Error(`Rôle ${validatorUser.role} non habilité à valider définitivement les consommations de production.`);
    }

    // Contrôle d'intégrité : la quantité sortie couvre au minimum
    // Utilisé + Retourné + Rebuté. Le delta éventuel est un reliquat
    // physiquement sorti et non encore retourné (traçable, non perdu).
    for (const line of record.lines) {
      const calcTotal = (line.actualConsumedQuantity || 0) + (line.returnedQuantity || 0) + (line.wasteQuantity || 0);
      if (line.withdrawnQuantity > 0 && line.withdrawnQuantity + 0.05 < calcTotal) {
        throw new Error(
          `Incohérence sur ${line.designation} : Quantité sortie (${line.withdrawnQuantity} ${line.unit}) inférieure à Utilisé (${line.actualConsumedQuantity}) + Retourné (${line.returnedQuantity}) + Rebuté (${line.wasteQuantity})`
        );
      }

      // Contrôle de conformité des lots : interdire la consommation d'un lot bloqué ou en quarantaine sans dérogation formelle
      for (const lot of line.lots || []) {
        if ((lot.lotStatus === 'EN_QUARANTAINE' || lot.lotStatus === 'BLOQUE' || lot.lotStatus === 'REJETE') && !lot.isDerogationAuthorized) {
          throw new Error(
            `Consommation interdite : Le lot ${lot.lotNumber} pour ${line.designation} est en statut ${lot.lotStatus}. Dérogation formelle de la Direction Qualité requise.`
          );
        }
      }
    }

    // Mise à jour cohérente et atomique des stocks (StockMovement), lot par lot.
    // Un transfert vers l'atelier n'est PAS une consommation : seules les quantités
    // réellement utilisées ou rebutées sortent du stock, le reliquat est retourné.
    for (const line of record.lines) {
      const item = this.db.items.find(i => i.id === line.itemId);
      const details =
        line.lots && line.lots.length > 0
          ? line.lots
          : [
              {
                lotId: '',
                lotNumber: line.batchNumber,
                withdrawnQty: line.withdrawnQuantity,
                usedQty: line.actualConsumedQuantity,
                returnedQty: line.returnedQuantity,
                wasteQty: line.wasteQuantity,
                unit: line.unit,
                storageLocation: line.storageLocation,
                lotStatus: 'LIBERE' as const,
              },
            ];

      for (const detail of details) {
        const row =
          this.db.warehouseStocks.find(
            r =>
              r.itemId === line.itemId &&
              ((detail.lotId && r.lotId === detail.lotId) ||
                (!detail.lotId && r.lotNumber === detail.lotNumber))
          ) || undefined;
        const sourceWarehouseId =
          row?.warehouseId ||
          this.findWarehouseContainingLot(line.itemId, detail.lotNumber)?.id;
        const sourceWarehouse = sourceWarehouseId
          ? this.getWarehouseById(sourceWarehouseId)
          : undefined;
        const qualityStatus = row?.qualityStatus || 'LIBERE';
        const lotId = detail.lotId || row?.lotId;
        const usedQty = Number(detail.usedQty) || 0;
        const wasteQty = Number(detail.wasteQty) || 0;
        const returnedQty = Number(detail.returnedQty) || 0;
        // Quantité physiquement sortie du magasin source. Par défaut, ce qui a
        // été déclaré sur le lot ; à défaut, tout ce qui est justifié.
        const withdrawnQty =
          Number(detail.withdrawnQty) || usedQty + wasteQty + returnedQty;
        // Sortie nette imputée au magasin : le reliquat non consommé reste sorti
        // jusqu'à son retour effectif (mouvement RETOUR_MAGASIN distinct), ce qui
        // évite toute double déduction comme tout stock fantôme.
        const exitQty = this.roundQty(Math.max(0, withdrawnQty - wasteQty - returnedQty));
        const pendingReturnQty = this.roundQty(
          Math.max(0, withdrawnQty - usedQty - wasteQty - returnedQty)
        );

        // 1. Sortie directe du stock à la validation de la consommation réelle
        if (exitQty > 0) {
          this.addStockMovement({
            documentNumber: record.consumptionNumber,
            itemId: line.itemId,
            itemCode: line.itemCode,
            batchNumber: detail.lotNumber,
            lotId,
            type: 'CONSOMMATION_OF',
            quantity: exitQty,
            unit: detail.unit,
            stockDelta: -exitQty,
            sourceWarehouseId,
            sourceLocationId: row?.locationId,
            sourceLocation: detail.storageLocation,
            qualityStatus,
            workOrderId: record.workOrderId,
            referenceDocument: record.consumptionNumber,
            userId: validatorUser.id,
            userName: validatorUser.name,
            reason:
              `Sortie directe ${record.consumptionNumber} pour OF ${record.workOrderNumber} — lot ${detail.lotNumber} : ` +
              `${usedQty} ${detail.unit} consommé(s)` +
              (wasteQty > 0 ? `, ${wasteQty} rebuté(s)` : '') +
              (pendingReturnQty > 0 ? `, ${pendingReturnQty} en attente de retour` : ''),
          });
        }

        // 2. Retour au magasin d'origine du reliquat non consommé
        if (returnedQty > 0 && sourceWarehouse && sourceWarehouse.type === 'PRODUCTION') {
          const originWarehouse =
            (item ? this.defaultWarehouseForCategory(item.category) : undefined) ||
            this.findWarehouseByType('MATIERES_PREMIERES');
          if (originWarehouse && originWarehouse.id !== sourceWarehouse.id) {
            this.addStockMovement({
              documentNumber: record.consumptionNumber,
              itemId: line.itemId,
              itemCode: line.itemCode,
              batchNumber: detail.lotNumber,
              lotId,
              type: 'TRANSFERT_SORTIE',
              quantity: returnedQty,
              unit: detail.unit,
              stockDelta: -returnedQty,
              sourceWarehouseId: sourceWarehouse.id,
              sourceLocationId: row?.locationId,
              sourceLocation: detail.storageLocation,
              qualityStatus,
              workOrderId: record.workOrderId,
              referenceDocument: record.consumptionNumber,
              userId: validatorUser.id,
              userName: validatorUser.name,
              reason: `Retour magasin du reliquat non consommé ${record.consumptionNumber} — lot ${detail.lotNumber}`,
            });
            this.addStockMovement({
              documentNumber: record.consumptionNumber,
              itemId: line.itemId,
              itemCode: line.itemCode,
              batchNumber: detail.lotNumber,
              lotId,
              type: 'TRANSFERT_ENTREE',
              quantity: returnedQty,
              unit: detail.unit,
              stockDelta: returnedQty,
              destinationWarehouseId: originWarehouse.id,
              destinationLocationId: this.getDefaultLocation(originWarehouse.id)?.id,
              qualityStatus,
              workOrderId: record.workOrderId,
              referenceDocument: record.consumptionNumber,
              userId: validatorUser.id,
              userName: validatorUser.name,
              reason: `Retour magasin du reliquat non consommé ${record.consumptionNumber} — lot ${detail.lotNumber}`,
            });
          }
        }

        // 3. Déclaration des pertes et rebuts
        if (wasteQty > 0) {
          this.addStockMovement({
            documentNumber: record.consumptionNumber,
            itemId: line.itemId,
            itemCode: line.itemCode,
            batchNumber: detail.lotNumber,
            lotId,
            type: 'REBUT_DEFECTUEUX',
            quantity: wasteQty,
            unit: detail.unit,
            stockDelta: -wasteQty,
            sourceWarehouseId,
            sourceLocationId: row?.locationId,
            sourceLocation: detail.storageLocation,
            qualityStatus,
            workOrderId: record.workOrderId,
            referenceDocument: record.consumptionNumber,
            userId: validatorUser.id,
            userName: validatorUser.name,
            reason: `Rebut/pertes constatées ${record.consumptionNumber} : ${line.varianceReason || 'Non spécifié'} — lot ${detail.lotNumber}`,
          });
        }
      }
    }

    record.status = 'VALIDEE';
    record.validatedBy = `${validatorUser.name} (${validatorUser.role})`;
    record.validatedAt = new Date().toISOString();
    record.validationNotes = notes;

    this.logAudit({
      action: 'VALIDATE',
      entity: 'ConsumptionRecord',
      entityId: id,
      newValues: `Validation définitive et verrouillage de la consommation ${record.consumptionNumber} par ${validatorUser.name}`,
      motive: notes || 'Validation conforme ISO 22000 et GPAO',
    });

    this.saveDatabase(this.db);
    return record;
  }

  public cancelConsumption(id: string, user: User, reason: string): ConsumptionRecord {
    if (!reason || reason.trim().length === 0) {
      throw new Error('Un motif d\'annulation circonstancié est obligatoire.');
    }
    const record = (this.db.consumptions || []).find(c => c.id === id);
    if (!record) throw new Error('Fiche de consommation introuvable');
    if (record.status === 'VALIDEE') {
      throw new Error('Impossible d\'annuler une consommation déjà validée ayant généré des mouvements de stock. Effectuez une régularisation.');
    }

    record.status = 'ANNULEE';
    record.cancellationReason = reason;
    record.cancelledBy = `${user.name} (${user.role})`;
    record.cancelledAt = new Date().toISOString();

    this.logAudit({
      action: 'UPDATE',
      entity: 'ConsumptionRecord',
      entityId: id,
      newValues: `Annulation fiche ${record.consumptionNumber} par ${user.name}`,
      motive: reason,
    });

    this.saveDatabase(this.db);
    return record;
  }

  public regularizeConsumption(
    id: string,
    user: User,
    lineId: string,
    newActualQty: number,
    reason: string
  ): ConsumptionRecord {
    if (!reason || reason.trim().length === 0) {
      throw new Error('Un motif formel de régularisation est obligatoire.');
    }
    const record = (this.db.consumptions || []).find(c => c.id === id);
    if (!record) throw new Error('Fiche de consommation introuvable');
    if (record.status !== 'VALIDEE') {
      throw new Error('La régularisation ne s\'applique qu\'aux consommations validées et verrouillées.');
    }

    const line = record.lines.find(l => l.id === lineId);
    if (!line) throw new Error('Ligne de consommation introuvable');

    const oldQty = line.actualConsumedQuantity;
    const deltaQty = newActualQty - oldQty;

    line.actualConsumedQuantity = newActualQty;
    line.quantityVariance = Number((newActualQty - line.adjustedTheoreticalQuantity).toFixed(2));
    line.percentageVariance = line.adjustedTheoreticalQuantity > 0
      ? Number(((line.quantityVariance / line.adjustedTheoreticalQuantity) * 100).toFixed(2))
      : 0;

    // Générer mouvement de stock de régularisation (AJUSTEMENT_INVENTAIRE)
    this.addStockMovement({
      itemId: line.itemId,
      itemCode: line.itemCode,
      batchNumber: line.batchNumber,
      type: 'AJUSTEMENT_INVENTAIRE',
      quantity: Math.abs(deltaQty),
      unit: line.unit,
      sourceLocation: deltaQty > 0 ? line.storageLocation : undefined,
      destinationLocation: deltaQty < 0 ? line.storageLocation : undefined,
      workOrderId: record.workOrderId,
      userId: user.id,
      userName: user.name,
      reason: `Régularisation consommation ${record.consumptionNumber} (Ancien: ${oldQty}, Nouveau: ${newActualQty} ${line.unit}) - Motif: ${reason}`,
    });

    if (!record.regularizationHistory) {
      record.regularizationHistory = [];
    }
    record.regularizationHistory.push({
      date: new Date().toISOString(),
      user: `${user.name} (${user.role})`,
      lineId,
      itemCode: line.itemCode,
      oldQty,
      newQty: newActualQty,
      deltaQty,
      reason,
    });

    this.logAudit({
      action: 'UPDATE',
      entity: 'ConsumptionRecord',
      entityId: id,
      oldValues: `Quantité précédente ${line.itemCode}: ${oldQty} ${line.unit}`,
      newValues: `Nouvelle quantité ${line.itemCode}: ${newActualQty} ${line.unit} (Delta: ${deltaQty})`,
      motive: `Régularisation formelle : ${reason}`,
    });

    this.saveDatabase(this.db);
    return record;
  }

  // --- Suivi de Fabrication (17 Étapes) ---
  public getStepLogs(): ManufacturingStepLog[] {
    return this.db.stepLogs;
  }

  public addStepLog(log: Omit<ManufacturingStepLog, 'id'>): ManufacturingStepLog {
    const newLog: ManufacturingStepLog = {
      ...log,
      id: `STP-${Date.now()}`,
    };
    this.db.stepLogs.push(newLog);

    this.logAudit({
      action: 'CREATE',
      entity: 'ManufacturingStepLog',
      entityId: newLog.id,
      newValues: `Étape ${newLog.stepNumber}: ${newLog.stepName} - Entrée: ${newLog.inputQuantityKg}kg, Sortie: ${newLog.outputQuantityKg}kg, Rendement: ${newLog.yieldPercent}%`,
    });

    this.saveDatabase(this.db);
    return newLog;
  }

  // --- Contrôles de Sertissage ---
  public getSeamingInspections(): SeamingInspection[] {
    return this.db.seamingInspections;
  }

  public addSeamingInspection(inspection: Omit<SeamingInspection, 'id' | 'inspectionNumber'>): SeamingInspection {
    const count = this.db.seamingInspections.length + 404;
    const inspectionNumber = `SERTI-2026-${count}`;
    const newInsp: SeamingInspection = {
      ...inspection,
      id: `INSP-${Date.now()}`,
      inspectionNumber,
    };
    this.db.seamingInspections.unshift(newInsp);

    this.logAudit({
      action: newInsp.isConforming ? 'VALIDATE' : 'BLOCK',
      entity: 'SeamingInspection',
      entityId: newInsp.id,
      newValues: `Contrôle sertissage ${inspectionNumber} tête N°${newInsp.headNumber} - Conforme: ${newInsp.isConforming} (Croisure: ${newInsp.overlapPercent}%, Serrage: ${newInsp.tightnessPercent}%)`,
    });

    this.saveDatabase(this.db);
    return newInsp;
  }

  // --- Cycles Autoclaves (Stérilisation CCP-1) ---
  public getAutoclaveCycles(): AutoclaveCycle[] {
    return this.db.autoclaveCycles;
  }

  public addAutoclaveCycle(cycle: Omit<AutoclaveCycle, 'id' | 'cycleNumber'>): AutoclaveCycle {
    const count = this.db.autoclaveCycles.length + 90;
    const cycleNumber = `AUTO-2026-${String(count).padStart(3, '0')}`;
    const newCycle: AutoclaveCycle = {
      ...cycle,
      id: `CYC-${Date.now()}`,
      cycleNumber,
    };
    this.db.autoclaveCycles.unshift(newCycle);

    this.logAudit({
      action: 'CREATE',
      entity: 'AutoclaveCycle',
      entityId: newCycle.id,
      newValues: `Nouveau cycle autoclave ${cycleNumber} - Barème: ${newCycle.scheduleReference} - F0 calculé: ${newCycle.calculatedF0}`,
    });

    this.saveDatabase(this.db);
    return newCycle;
  }

  public approveAutoclaveCycle(id: string, approverName: string) {
    const cycle = this.db.autoclaveCycles.find(c => c.id === id);
    if (!cycle) throw new Error('Cycle autoclave introuvable');
    cycle.isApprovedByQuality = true;
    cycle.qualityApproverName = approverName;
    cycle.approvalTimestamp = new Date().toISOString();
    cycle.cycleStatus = 'VALIDE';

    this.logAudit({
      action: 'VALIDATE',
      entity: 'AutoclaveCycle',
      entityId: id,
      newValues: `Cycle ${cycle.cycleNumber} formellement approuvé et validé par ${approverName}`,
      motive: 'Validation officielle du diagramme de stérilisation selon ISO 22000',
    });

    this.saveDatabase(this.db);
  }

  // --- Surveillance HACCP (CCP / PRPo) ---
  public getHaccpRecords(): HaccpMonitoringRecord[] {
    return this.db.haccpRecords;
  }

  public addHaccpRecord(record: Omit<HaccpMonitoringRecord, 'id'>): HaccpMonitoringRecord {
    const newRec: HaccpMonitoringRecord = {
      ...record,
      id: `HACCP-${Date.now()}`,
    };
    this.db.haccpRecords.unshift(newRec);

    this.logAudit({
      action: newRec.isCompliant ? 'VALIDATE' : 'BLOCK',
      entity: 'HaccpMonitoringRecord',
      entityId: newRec.id,
      newValues: `Surveillance ${newRec.referenceId} (${newRec.pointName}) - Valeur mesurée: ${newRec.measuredValue} ${newRec.unit} - Conforme: ${newRec.isCompliant}`,
    });

    this.saveDatabase(this.db);
    return newRec;
  }

  // --- Non-Conformités (ISO 22000 § 8.9) ---
  public getNonConformities(): NonConformity[] {
    return this.db.nonConformities;
  }

  public addNonConformity(nc: Omit<NonConformity, 'id' | 'ncNumber'>): NonConformity {
    const count = this.db.nonConformities.length + 13;
    const ncNumber = `NC-2026-${String(count).padStart(3, '0')}`;
    const newNc: NonConformity = {
      ...nc,
      id: `NC-${Date.now()}`,
      ncNumber,
    };
    this.db.nonConformities.unshift(newNc);

    this.logAudit({
      action: 'QUARANTINE',
      entity: 'NonConformity',
      entityId: newNc.id,
      newValues: `Ouverture fiche NC ${ncNumber} (${newNc.severity}) - Lot bloqué: ${newNc.affectedBatchId} - Quantité: ${newNc.affectedQuantity} ${newNc.unit}`,
      motive: newNc.description,
    });

    this.saveDatabase(this.db);
    return newNc;
  }

  public resolveNonConformity(id: string, approvalName: string, disposition: NonConformity['finalDisposition'], actionPlanNotes?: string) {
    const nc = this.db.nonConformities.find(n => n.id === id);
    if (!nc) throw new Error('Fiche de non-conformité introuvable');
    nc.isResolved = true;
    nc.resolutionDate = new Date().toISOString();
    nc.qualityApprovalName = approvalName;
    nc.qualityApprovalDate = new Date().toISOString();
    nc.finalDisposition = disposition;
    if (actionPlanNotes) nc.correctiveActionPlan += `\n[Clôture]: ${actionPlanNotes}`;

    this.logAudit({
      action: 'RELEASE',
      entity: 'NonConformity',
      entityId: id,
      newValues: `Résolution fiche NC ${nc.ncNumber} par ${approvalName} - Disposition finale: ${disposition}`,
      motive: actionPlanNotes || 'Levée formelle approuvée Qualité',
    });

    this.saveDatabase(this.db);
  }

  // --- Dossiers de Lots Finis & Libération Sanitaire ---
  public getFinishedBatches(): FinishedBatch[] {
    return this.db.finishedBatches;
  }

  public addFinishedBatch(
    batch: Omit<FinishedBatch, 'id' | 'batchNumber'>,
    options?: {
      /** Numéro de lot imposé (réception GDS) ; généré automatiquement sinon. */
      batchNumber?: string;
      /** Magasin de destination explicite (réception GDS multi-magasins). */
      warehouseId?: string;
      locationId?: string;
      /** Statut qualité d'entrée : attente de contrôle par défaut. */
      qualityStatus?: StockQualityStatus;
    }
  ): FinishedBatch {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = this.db.finishedBatches.length + 4;
    const batchNumber =
      options?.batchNumber?.trim() ||
      `LOT-PF-${dateStr}-${String(count).padStart(2, '0')}`;

    const newBatch: FinishedBatch = {
      ...batch,
      id: this.uniqueId('BATCH', this.db.finishedBatches.map(b => b.id)),
      batchNumber,
    };
    this.db.finishedBatches.unshift(newBatch);

    // Réception de production : le lot fini entre en attente de libération qualité,
    // jamais directement dans le stock disponible.
    const finishedWarehouse =
      (options?.warehouseId ? this.getWarehouseById(options.warehouseId) : undefined) ||
      this.findWarehouseByType('PRODUITS_FINIS');
    const pendingLocation = finishedWarehouse
      ? (options?.locationId
          ? this.getWarehouseLocation(options.locationId)
          : this.db.warehouseLocations.find(
              l => l.warehouseId === finishedWarehouse.id && l.zoneType.toLowerCase().includes('attente')
            )) || this.getDefaultLocation(finishedWarehouse.id)
      : undefined;
    const receiptQualityStatus: StockQualityStatus =
      options?.qualityStatus ?? 'EN_ATTENTE_CONTROLE';
    const item = this.db.items.find(i => i.id === newBatch.itemId);
    const alreadyStocked = this.db.warehouseStocks.some(
      row => row.itemId === newBatch.itemId && row.lotNumber === newBatch.batchNumber
    );
    if (
      finishedWarehouse &&
      pendingLocation &&
      item &&
      newBatch.conformingCans > 0 &&
      !alreadyStocked
    ) {
      const lot = this.ensureStockLot({
        itemId: item.id,
        itemCode: item.code,
        lotNumber: newBatch.batchNumber,
        expiryDate: newBatch.bestBeforeDate,
        qualityStatus: receiptQualityStatus,
        origin: `Production OF ${newBatch.workOrderId}`,
        warehouse: finishedWarehouse,
        location: pendingLocation,
      });
      this.addStockMovement({
        documentNumber: newBatch.batchNumber,
        itemId: item.id,
        itemCode: item.code,
        batchNumber: newBatch.batchNumber,
        lotId: lot.id,
        type: 'RECEPTION_PRODUCTION',
        quantity: newBatch.conformingCans,
        unit: 'BOITE',
        stockDelta: newBatch.conformingCans,
        destinationWarehouseId: finishedWarehouse.id,
        destinationLocationId: pendingLocation.id,
        destinationLocation: pendingLocation.code,
        qualityStatus: receiptQualityStatus,
        workOrderId: newBatch.workOrderId,
        referenceDocument: newBatch.workOrderId,
        userId: this.currentUser.id,
        userName: this.currentUser.name,
        reason:
          receiptQualityStatus === 'LIBERE'
            ? `Réception de production ${newBatch.batchNumber} — libérée à l'entrée`
            : `Réception de production ${newBatch.batchNumber} — en attente de libération qualité`,
      });
    }

    this.logAudit({
      action: 'CREATE',
      entity: 'FinishedBatch',
      entityId: newBatch.id,
      newValues: `Création dossier de lot fini ${batchNumber} - Quantité: ${newBatch.conformingCans} boîtes (${newBatch.totalCartons} cartons)`,
    });

    this.saveDatabase(this.db);
    return newBatch;
  }

  public releaseFinishedBatch(id: string, releasedBy: string, status: FinishedBatch['releaseStatus'], notes?: string) {
    const batch = this.db.finishedBatches.find(b => b.id === id);
    if (!batch) throw new Error('Lot fini introuvable');
    const oldStatus = batch.releaseStatus;
    batch.releaseStatus = status;
    batch.releasedBy = releasedBy;
    batch.releaseDate = this.nowIso();
    batch.releaseNotes = notes;

    const item = this.db.items.find(i => i.id === batch.itemId);
    const finishedWarehouse = this.findWarehouseByType('PRODUITS_FINIS');
    if (item && finishedWarehouse) {
      const target = (() => {
        if (status === 'LIBERE') {
          return {
            warehouse: finishedWarehouse,
            location:
              this.db.warehouseLocations.find(
                l => l.warehouseId === finishedWarehouse.id && l.zoneType.toLowerCase().includes('libéré')
              ) || this.getDefaultLocation(finishedWarehouse.id),
            qualityStatus: 'LIBERE' as StockQualityStatus,
          };
        }
        if (status === 'EN_ATTENTE') {
          return {
            warehouse: finishedWarehouse,
            location:
              this.db.warehouseLocations.find(
                l => l.warehouseId === finishedWarehouse.id && l.zoneType.toLowerCase().includes('attente')
              ) || this.getDefaultLocation(finishedWarehouse.id),
            qualityStatus: 'EN_ATTENTE_CONTROLE' as StockQualityStatus,
          };
        }
        const quarantineWarehouse =
          status === 'REJETE'
            ? this.findWarehouseByType('NON_CONFORMES') || this.findWarehouseByType('QUARANTAINE')
            : this.findWarehouseByType('QUARANTAINE') || this.findWarehouseByType('NON_CONFORMES');
        return {
          warehouse: quarantineWarehouse,
          location: quarantineWarehouse ? this.getDefaultLocation(quarantineWarehouse.id) : undefined,
          qualityStatus: (status === 'REJETE' ? 'REJETE' : 'BLOQUE') as StockQualityStatus,
        };
      })();

      if (target.warehouse && target.location) {
        const existingLot = this.db.stockLots.find(
          l => l.itemId === item.id && l.lotNumber === batch.batchNumber
        );
        const hasStock = existingLot
          ? this.db.warehouseStocks.some(row => row.lotId === existingLot.id)
          : false;

        if (existingLot && hasStock) {
          this.relocateLotStock({
            lotId: existingLot.id,
            destinationWarehouseId: target.warehouse.id,
            destinationLocationId: target.location.id,
            newStatus: target.qualityStatus,
            reason: `Libération sanitaire du lot fini ${batch.batchNumber} : ${status}`,
            documentNumber: batch.batchNumber,
          });
        } else if (batch.conformingCans > 0) {
          const lot = this.ensureStockLot({
            itemId: item.id,
            itemCode: item.code,
            lotNumber: batch.batchNumber,
            expiryDate: batch.bestBeforeDate,
            qualityStatus: target.qualityStatus,
            origin: `Production OF ${batch.workOrderId}`,
            warehouse: target.warehouse,
            location: target.location,
          });
          this.addStockMovement({
            documentNumber: batch.batchNumber,
            itemId: item.id,
            itemCode: item.code,
            batchNumber: batch.batchNumber,
            lotId: lot.id,
            type: 'RECEPTION_PRODUCTION',
            quantity: batch.conformingCans,
            unit: 'BOITE',
            stockDelta: batch.conformingCans,
            destinationWarehouseId: target.warehouse.id,
            destinationLocationId: target.location.id,
            destinationLocation: target.location.code,
            qualityStatus: target.qualityStatus,
            workOrderId: batch.workOrderId,
            referenceDocument: batch.workOrderId,
            userId: this.currentUser.id,
            userName: this.currentUser.name,
            reason: `Réception production / libération ${batch.batchNumber} (${status})`,
          });
        }
      }
    }

    this.logAudit({
      action: status === 'LIBERE' ? 'RELEASE' : 'BLOCK',
      entity: 'FinishedBatch',
      entityId: id,
      oldValues: `Statut précédent: ${oldStatus}`,
      newValues: `Nouveau statut: ${status} par ${releasedBy}`,
      motive: notes || 'Décision formelle de libération sanitaire ISO 22000',
    });

    this.saveDatabase(this.db);
  }

  // --- Module Commercial : Clients ---
  public getCustomers(): Customer[] {
    return this.db.customers;
  }

  public addCustomer(cust: Omit<Customer, 'id' | 'code'>): Customer {
    const code = `CLI-${String(this.db.customers.length + 5).padStart(3, '0')}`;
    const newCust: Customer = {
      ...cust,
      id: `CUST-${Date.now()}`,
      code,
    };
    this.db.customers.push(newCust);

    this.logAudit({
      action: 'CREATE',
      entity: 'Customer',
      entityId: newCust.id,
      newValues: `Création client ${code} - ${newCust.companyName}`,
    });

    this.saveDatabase(this.db);
    return newCust;
  }

  // --- Module Commercial : Bons de Commande (Sales Orders) ---
  public getSalesOrders(): SalesOrder[] {
    return this.db.salesOrders;
  }

  public addSalesOrder(order: Omit<SalesOrder, 'id' | 'orderNumber'>): SalesOrder {
    const count = this.db.salesOrders.length + 44;
    const orderNumber = `BC-2026-${String(count).padStart(3, '0')}`;
    const newOrder: SalesOrder = {
      ...order,
      id: `SO-${Date.now()}`,
      orderNumber,
    };
    this.db.salesOrders.unshift(newOrder);

    this.logAudit({
      action: 'CREATE',
      entity: 'SalesOrder',
      entityId: newOrder.id,
      newValues: `Création commande client ${orderNumber} - Client: ${newOrder.customerName} - Total: ${newOrder.totalAmountDzd} DZD`,
    });

    this.saveDatabase(this.db);
    return newOrder;
  }

  // --- Module Commercial : Bons de Livraison (BL) AVEC VERROU SANITAIRE STRICT ---
  public getDeliveryNotes(): DeliveryNote[] {
    return this.db.deliveryNotes;
  }

  public createDeliveryNote(dn: Omit<DeliveryNote, 'id' | 'deliveryNumber'>): DeliveryNote {
    // ðŸ›¡ï¸ VERROU SANITAIRE ISO 22000 : Vérification impérative que chaque lot est LIBERE
    // et que la quantité expédiée existe réellement dans le stock magasin.
    const finishedWarehouse = this.findWarehouseByType('PRODUITS_FINIS');
    for (const line of dn.lines) {
      const batch = this.db.finishedBatches.find(b => b.id === line.finishedBatchId || b.batchNumber === line.batchNumber);
      if (!batch) {
        throw new Error(`Lot ${line.batchNumber} introuvable dans la base de données.`);
      }
      if (batch.releaseStatus !== 'LIBERE') {
        throw new Error(`[VERROU SANITAIRE ISO 22000] Le lot ${line.batchNumber} est au statut "${batch.releaseStatus}". Il est FORMELLEMENT INTERDIT d'expédier un lot non libéré par la Qualité.`);
      }
      const item = this.db.items.find(i => i.id === line.itemId);
      if (!item) throw new Error(`Article ${line.designation} introuvable dans le référentiel.`);
      const lot = this.db.stockLots.find(
        l => l.itemId === item.id && l.lotNumber === line.batchNumber
      );
      const rows = this.db.warehouseStocks.filter(
        row =>
          row.itemId === item.id &&
          row.lotId === lot?.id &&
          row.qualityStatus === 'LIBERE' &&
          (!finishedWarehouse || row.warehouseId === finishedWarehouse.id)
      );
      const available = this.roundQty(
        rows.reduce((total, row) => total + row.quantity - row.reservedQty, 0)
      );
      if (available + 0.0001 < line.cansDelivered) {
        throw new Error(
          `[VERROU STOCK] Stock libéré insuffisant pour le lot ${line.batchNumber} : disponible ${available} BOITE, demandé ${line.cansDelivered} BOITE.`
        );
      }
    }

    const count = this.db.deliveryNotes.length + 39;
    const deliveryNumber = `BL-2026-${String(count).padStart(3, '0')}`;
    const invoiceNumber = `FAC-2026-${String(count).padStart(3, '0')}`;

    const newDn: DeliveryNote = {
      ...dn,
      id: `DN-${Date.now()}`,
      deliveryNumber,
      invoiceId: invoiceNumber,
    };
    this.db.deliveryNotes.unshift(newDn);

    // Déduction des stocks magasin et traçabilité des mouvements.
    // Une ligne peut être servie depuis plusieurs emplacements du magasin PF :
    // la quantité est répartie sans jamais toucher aux quantités réservées.
    for (const line of dn.lines) {
      const itm = this.db.items.find(i => i.id === line.itemId);
      const lot = itm
        ? this.db.stockLots.find(l => l.itemId === itm.id && l.lotNumber === line.batchNumber)
        : undefined;
      if (!itm || !lot) {
        throw new Error(`[VERROU STOCK] Impossible de localiser le lot ${line.batchNumber} pour ${line.designation}.`);
      }
      const rows = this.db.warehouseStocks
        .filter(
          r =>
            r.itemId === line.itemId &&
            r.lotId === lot.id &&
            r.qualityStatus === 'LIBERE' &&
            (!finishedWarehouse || r.warehouseId === finishedWarehouse.id) &&
            r.quantity - r.reservedQty > 0.0001
        )
        .sort((a, b) => b.quantity - b.reservedQty - (a.quantity - a.reservedQty));

      let remaining = this.roundQty(line.cansDelivered);
      for (const row of rows) {
        if (remaining <= 0.0001) break;
        const available = this.roundQty(row.quantity - row.reservedQty);
        const take = this.roundQty(Math.min(available, remaining));
        if (take <= 0.0001) continue;
        this.addStockMovement({
          documentNumber: deliveryNumber,
          itemId: line.itemId,
          itemCode: itm.code,
          batchNumber: line.batchNumber,
          lotId: lot.id,
          type: 'SORTIE_VENTE',
          quantity: take,
          unit: 'BOITE',
          stockDelta: -take,
          sourceWarehouseId: row.warehouseId,
          sourceLocationId: row.locationId,
          qualityStatus: 'LIBERE',
          deliveryNoteId: newDn.id,
          referenceDocument: deliveryNumber,
          userId: this.currentUser.id,
          userName: this.currentUser.name,
          reason: `Expédition client ${dn.customerName} sous BL ${deliveryNumber}`,
        });
        remaining = this.roundQty(remaining - take);
      }
      if (remaining > 0.0001) {
        throw new Error(
          `[VERROU STOCK] Stock libéré insuffisant pour le lot ${line.batchNumber} : ${remaining} BOITE non affectée(s).`
        );
      }
    }

    // Mise à jour de la commande client
    const so = this.db.salesOrders.find(s => s.id === dn.salesOrderId);
    if (so) {
      so.status = 'EXPEDIE';
    }

    // Création automatique de la facture correspondante
    const subtotal = so ? so.subtotalDzd : 1500000;
    const vat = subtotal * 0.19;
    const total = subtotal + vat;
    const newInvoice: Invoice = {
      id: `INV-${Date.now()}`,
      invoiceNumber,
      deliveryNoteId: newDn.id,
      salesOrderId: dn.salesOrderId,
      customerId: dn.customerId,
      customerName: dn.customerName,
      invoiceDate: new Date().toISOString().slice(0, 10),
      dueDate: new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString().slice(0, 10),
      subtotalDzd: subtotal,
      vatAmountDzd: vat,
      totalAmountDzd: total,
      paidAmountDzd: 0,
      paymentStatus: 'NON_PAYEE',
    };
    this.db.invoices.unshift(newInvoice);

    this.logAudit({
      action: 'RELEASE',
      entity: 'DeliveryNote',
      entityId: newDn.id,
      newValues: `Expédition validée ${deliveryNumber} vers ${dn.customerName} (${dn.totalCans} boîtes). Camion: ${dn.truckPlate} - Facture générée: ${invoiceNumber}`,
      motive: 'Expédition autorisée avec contrôle de conformité des lots libérés',
    });

    this.saveDatabase(this.db);
    return newDn;
  }

  // --- Factures ---
  public getInvoices(): Invoice[] {
    return this.db.invoices;
  }

  // --- Équipements & Maintenance ---
  public getEquipments(): Equipment[] {
    return this.db.equipments;
  }

  public updateEquipmentStatus(id: string, status: Equipment['status'], clearance: boolean) {
    const eq = this.db.equipments.find(e => e.id === id);
    if (!eq) throw new Error('Équipement introuvable');
    const oldStatus = eq.status;
    eq.status = status;
    eq.hygieneClearanceAfterMaintenance = clearance;

    this.logAudit({
      action: 'UPDATE',
      entity: 'Equipment',
      entityId: id,
      oldValues: `Statut: ${oldStatus}`,
      newValues: `Statut: ${status} (Remise en service hygiénique: ${clearance})`,
      motive: 'Mise à jour état équipement maintenance ISO 22000',
    });

    this.saveDatabase(this.db);
  }

  // --- Mouvements de stock ---
  public getStockMovements(): StockMovement[] {
    return this.db.stockMovements;
  }

  /**
   * Enregistre un mouvement dans le grand livre unique ET met à jour le stock
   * magasin correspondant. Les anciens appels (réception, consommation, vente,
   * rebut, retour) restent valides : le magasin et l'emplacement sont déduits
   * du type de mouvement lorsqu'ils ne sont pas explicitement fournis.
   */
  public addStockMovement(movement: Omit<StockMovement, 'id' | 'timestamp'>): StockMovement {
    const timestamp = this.nowIso();
    const newMovement: StockMovement = {
      ...movement,
      id: `SM-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp,
    };
    if (!this.db.stockMovements) {
      this.db.stockMovements = [];
    }
    this.db.stockMovements.unshift(newMovement);

    const delta = this.movementDelta(movement);
    if (delta !== 0) {
      const isEntry = delta > 0;
      let warehouse = isEntry
        ? this.getWarehouseById(movement.destinationWarehouseId || '') ||
          this.getWarehouseForMovement(movement)
        : this.getWarehouseById(movement.sourceWarehouseId || '');

      // Compatibilité : une consommation/rebut/sortie sans magasin explicite
      // doit trouver le magasin qui détient réellement le lot.
      if (!warehouse) {
        warehouse = this.findWarehouseContainingLot(
          movement.itemId,
          movement.batchNumber,
          movement.sourceWarehouseId
        );
      }
      if (!warehouse) warehouse = this.getWarehouseForMovement(movement);

      if (warehouse) {
        const locationReference = isEntry
          ? movement.destinationLocationId || movement.destinationLocation
          : movement.sourceLocationId || movement.sourceLocation;
        const location =
          (locationReference
            ? this.getWarehouseLocationById(locationReference) ||
              this.resolveLocation(warehouse.id, locationReference)
            : undefined) || this.getDefaultLocation(warehouse.id);

        if (location) {
          const qualityStatus: StockQualityStatus =
            movement.qualityStatus ||
            (movement.type === 'REBUT_DEFECTUEUX'
              ? 'REJETE'
              : movement.type === 'MISE_EN_QUARANTAINE'
                ? 'QUARANTAINE'
                : 'LIBERE');

          this.applyStockDelta({
            warehouseId: warehouse.id,
            locationId: location.id,
            itemId: movement.itemId,
            itemCode: movement.itemCode,
            lotNumber: movement.batchNumber,
            lotId: movement.lotId,
            qualityStatus,
            unit: movement.unit,
            delta,
            allowNegative: false,
          });

          newMovement.stockDelta = delta;
          newMovement.sourceWarehouseId = isEntry ? movement.sourceWarehouseId : warehouse.id;
          newMovement.destinationWarehouseId = isEntry ? warehouse.id : movement.destinationWarehouseId;
          newMovement.locationId = location.id;
          newMovement.sourceLocationId = isEntry ? movement.sourceLocationId : location.id;
          newMovement.destinationLocationId = isEntry ? location.id : movement.destinationLocationId;
          newMovement.qualityStatus = qualityStatus;
        }
      }
    }

    return newMovement;
  }

  // ==========================================================================
  // API PUBLIQUE MULTI-MAGASINS : RÉFÉRENTIEL, STOCKS, TRANSFERTS & QUALITÉ
  // ==========================================================================

  // --- Habilitations & périmètre magasins ---

  public getWarehousePermissions(user: User = this.currentUser): WarehousePermission[] {
    const staticPerms = WAREHOUSE_ROLE_PERMISSIONS[user.role] || [];
    const role = this.db.roles.find(r => r.roleKey === user.role && r.isActive);
    const dynamicPerms = (role?.permissions || []).filter(p => p.startsWith('WAREHOUSE_') || p.startsWith('STOCK_') || p.startsWith('TRANSFER_') || p.startsWith('RETURN_') || p.startsWith('MOVEMENT_') || p.startsWith('REPORTS_')) as WarehousePermission[];
    return Array.from(new Set([...staticPerms, ...dynamicPerms]));
  }

  public canWarehouse(permission: WarehousePermission, user: User = this.currentUser): boolean {
    return this.getWarehousePermissions(user).includes(permission);
  }

  public assertWarehousePermission(permission: WarehousePermission, action: string) {
    if (!this.canWarehouse(permission)) {
      throw new Error(
        `Habilitation insuffisante : « ${WAREHOUSE_PERMISSION_LABELS[permission]} » est requise pour ${action}. Profil ${this.currentUser.role}.`
      );
    }
  }

  /**
   * Magasins visibles par un profil. `assignedWarehouseIds` restreint strictement
   * le périmètre ; `allowedUserIds` peut en outre fermer un magasin à certains profils.
   */
  public getAccessibleWarehouses(user: User = this.currentUser): Warehouse[] {
    if (!this.canWarehouse('WAREHOUSE_VIEW', user)) return [];
    const scope = (user.assignedWarehouseIds || []).filter(Boolean);
    return this.db.warehouses
      .filter(w => {
        if (scope.length > 0 && !scope.includes(w.id)) return false;
        if (w.allowedUserIds && w.allowedUserIds.length > 0 && !w.allowedUserIds.includes(user.id)) {
          return false;
        }
        return true;
      })
      .sort((a, b) => a.code.localeCompare(b.code));
  }

  public canAccessWarehouse(warehouseId: string, user: User = this.currentUser): boolean {
    return this.getAccessibleWarehouses(user).some(w => w.id === warehouseId);
  }

  private assertWarehouseAccess(warehouseId: string, action: string) {
    if (!this.canAccessWarehouse(warehouseId)) {
      throw new Error(`Accès refusé : ce profil n'est pas habilité sur le magasin concerné (${action}).`);
    }
  }

  // --- Référentiel des magasins & emplacements ---

  public getWarehouses(includeInactive = true): Warehouse[] {
    return this.db.warehouses
      .filter(w => includeInactive || w.isActive)
      .sort((a, b) => a.code.localeCompare(b.code));
  }

  public getWarehouse(warehouseId: string): Warehouse | undefined {
    return this.db.warehouses.find(w => w.id === warehouseId);
  }

  public addWarehouse(
    input: Omit<Warehouse, 'id' | 'createdAt' | 'isActive'> & {
      id?: string;
      createdAt?: string;
      isActive?: boolean;
    }
  ): Warehouse {
    this.assertWarehousePermission('WAREHOUSE_CREATE', 'créer un magasin');
    const code = input.code?.trim();
    if (!code) throw new Error('Le code du magasin est obligatoire.');
    if (this.db.warehouses.some(w => w.code.toLowerCase() === code.toLowerCase())) {
      throw new Error(`Le code magasin ${code} existe déjà.`);
    }
    const warehouse: Warehouse = {
      ...input,
      id: input.id || this.newId('WH'),
      code,
      isActive: input.isActive ?? true,
      createdAt: input.createdAt || this.nowIso(),
    };
    this.db.warehouses.push(warehouse);
    this.logAudit({
      action: 'CREATE',
      entity: 'Warehouse',
      entityId: warehouse.id,
      newValues: `Création magasin ${warehouse.code} — ${warehouse.designation} (${warehouse.type})`,
      motive: 'Référentiel multi-magasins',
    });
    this.saveDatabase(this.db);
    return warehouse;
  }

  public updateWarehouse(id: string, updates: Partial<Omit<Warehouse, 'id' | 'createdAt'>>): Warehouse {
    this.assertWarehousePermission('WAREHOUSE_EDIT', 'modifier un magasin');
    const warehouse = this.db.warehouses.find(w => w.id === id);
    if (!warehouse) throw new Error('Magasin introuvable.');
    if (updates.code) {
      const code = updates.code.trim();
      if (
        this.db.warehouses.some(
          w => w.id !== id && w.code.toLowerCase() === code.toLowerCase()
        )
      ) {
        throw new Error(`Le code magasin ${code} existe déjà.`);
      }
      updates = { ...updates, code };
    }
    const oldValues = `${warehouse.code} — ${warehouse.designation}`;
    Object.assign(warehouse, updates);
    this.logAudit({
      action: 'UPDATE',
      entity: 'Warehouse',
      entityId: id,
      oldValues,
      newValues: `${warehouse.code} — ${warehouse.designation}`,
      motive: 'Mise à jour du référentiel magasin',
    });
    this.saveDatabase(this.db);
    return warehouse;
  }

  public toggleWarehouseActive(id: string, isActive: boolean): Warehouse {
    return this.updateWarehouse(id, { isActive });
  }

  public getWarehouseLocations(warehouseId?: string): WarehouseLocation[] {
    return this.db.warehouseLocations
      .filter(l => !warehouseId || l.warehouseId === warehouseId)
      .sort((a, b) => a.code.localeCompare(b.code));
  }

  public getWarehouseLocation(locationId: string): WarehouseLocation | undefined {
    return this.db.warehouseLocations.find(l => l.id === locationId);
  }

  public addWarehouseLocation(
    input: Omit<WarehouseLocation, 'id' | 'createdAt' | 'isActive'> & {
      id?: string;
      createdAt?: string;
      isActive?: boolean;
    }
  ): WarehouseLocation {
    this.assertWarehousePermission('WAREHOUSE_EDIT', 'créer un emplacement');
    const warehouse = this.db.warehouses.find(w => w.id === input.warehouseId);
    if (!warehouse) throw new Error('Magasin introuvable pour cet emplacement.');
    const code = input.code?.trim();
    if (!code) throw new Error('Le code de l\'emplacement est obligatoire.');
    if (
      this.db.warehouseLocations.some(
        l =>
          l.warehouseId === input.warehouseId &&
          l.code.toLowerCase() === code.toLowerCase()
      )
    ) {
      throw new Error(`L'emplacement ${code} existe déjà dans ${warehouse.code}.`);
    }
    const location: WarehouseLocation = {
      ...input,
      id: input.id || this.newId('WL'),
      code,
      isActive: input.isActive ?? true,
      createdAt: input.createdAt || this.nowIso(),
    };
    this.db.warehouseLocations.push(location);
    this.logAudit({
      action: 'CREATE',
      entity: 'WarehouseLocation',
      entityId: location.id,
      newValues: `Création emplacement ${location.code} — ${location.designation} dans ${warehouse.code}`,
    });
    this.saveDatabase(this.db);
    return location;
  }

  public updateWarehouseLocation(
    id: string,
    updates: Partial<Omit<WarehouseLocation, 'id' | 'createdAt'>>
  ): WarehouseLocation {
    this.assertWarehousePermission('WAREHOUSE_EDIT', 'modifier un emplacement');
    const location = this.db.warehouseLocations.find(l => l.id === id);
    if (!location) throw new Error('Emplacement introuvable.');
    if (updates.warehouseId) {
      const warehouse = this.db.warehouses.find(w => w.id === updates.warehouseId);
      if (!warehouse) throw new Error('Magasin de destination introuvable.');
    }
    Object.assign(location, updates);
    this.logAudit({
      action: 'UPDATE',
      entity: 'WarehouseLocation',
      entityId: id,
      newValues: `Mise à jour emplacement ${location.code} — ${location.designation}`,
    });
    this.saveDatabase(this.db);
    return location;
  }

  // --- Consultation des stocks par magasin, lot et statut qualité ---

  public getWarehouseStocks(filter?: {
    warehouseId?: string;
    locationId?: string;
    itemId?: string;
    lotId?: string;
    qualityStatus?: StockQualityStatus;
    search?: string;
  }): WarehouseStock[] {
    const accessible = new Set(this.getAccessibleWarehouses().map(w => w.id));
    const needle = filter?.search?.trim().toLowerCase();
    return this.db.warehouseStocks
      .filter(row => accessible.has(row.warehouseId))
      .filter(row => !filter?.warehouseId || row.warehouseId === filter.warehouseId)
      .filter(row => !filter?.locationId || row.locationId === filter.locationId)
      .filter(row => !filter?.itemId || row.itemId === filter.itemId)
      .filter(row => !filter?.lotId || row.lotId === filter.lotId)
      .filter(row => !filter?.qualityStatus || row.qualityStatus === filter.qualityStatus)
      .filter(row => {
        if (!needle) return true;
        const item = this.db.items.find(i => i.id === row.itemId);
        const warehouse = this.db.warehouses.find(w => w.id === row.warehouseId);
        const location = this.db.warehouseLocations.find(l => l.id === row.locationId);
        return `${row.itemCode} ${row.lotNumber} ${item?.designation || ''} ${warehouse?.code || ''} ${location?.code || ''}`
          .toLowerCase()
          .includes(needle);
      })
      .sort(
        (a, b) =>
          a.itemCode.localeCompare(b.itemCode) ||
          a.lotNumber.localeCompare(b.lotNumber) ||
          a.warehouseId.localeCompare(b.warehouseId)
      );
  }

  public getStockLots(filter?: {
    itemId?: string;
    lotNumber?: string;
    qualityStatus?: StockQualityStatus;
  }): StockLot[] {
    const accessible = new Set(this.getAccessibleWarehouses().map(w => w.id));
    const lotsWithAccessibleStock = new Set(
      this.db.warehouseStocks
        .filter(row => accessible.has(row.warehouseId))
        .map(row => row.lotId)
    );
    const needle = filter?.lotNumber?.trim().toLowerCase();
    return this.db.stockLots
      .filter(
        lot =>
          lotsWithAccessibleStock.has(lot.id) ||
          lot.warehouseTrail.some(entry => accessible.has(entry.warehouseId))
      )
      .filter(lot => !filter?.itemId || lot.itemId === filter.itemId)
      .filter(lot => !filter?.qualityStatus || lot.qualityStatus === filter.qualityStatus)
      .filter(lot => !needle || lot.lotNumber.toLowerCase().includes(needle))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  public getStockLot(lotId: string): StockLot | undefined {
    return this.db.stockLots.find(l => l.id === lotId);
  }

  public getConsolidatedStockForItem(itemId: string): ConsolidatedStock | undefined {
    const item = this.db.items.find(i => i.id === itemId);
    if (!item) return undefined;
    const accessible = new Set(this.getAccessibleWarehouses().map(w => w.id));
    const rows = this.db.warehouseStocks.filter(
      row => row.itemId === itemId && accessible.has(row.warehouseId)
    );
    const round = (n: number) => this.roundQty(n);
    const sum = (predicate: (row: WarehouseStock) => boolean) =>
      round(rows.filter(predicate).reduce((total, row) => total + row.quantity, 0));
    const reserved = round(rows.reduce((total, row) => total + row.reservedQty, 0));
    const libre = sum(row => row.qualityStatus === 'LIBERE');
    const transit = round(
      this.db.stockTransits
        .filter(
          t =>
            t.itemId === itemId &&
            t.status === 'EN_TRANSIT' &&
            (accessible.has(t.sourceWarehouseId) || accessible.has(t.destinationWarehouseId))
        )
        .reduce((total, t) => total + t.quantity, 0)
    );
    const byWarehouse = this.getAccessibleWarehouses().map(warehouse => {
      const wRows = rows.filter(row => row.warehouseId === warehouse.id);
      const wReserved = round(wRows.reduce((total, row) => total + row.reservedQty, 0));
      return {
        warehouseId: warehouse.id,
        physical: round(wRows.reduce((total, row) => total + row.quantity, 0)),
        available: round(
          Math.max(
            0,
            wRows
              .filter(row => row.qualityStatus === 'LIBERE')
              .reduce((total, row) => total + row.quantity, 0) - wReserved
          )
        ),
        reserved: wReserved,
        pendingControl: round(
          wRows
            .filter(row => QUALITY_STATUS_GROUPS.pending.includes(row.qualityStatus))
            .reduce((total, row) => total + row.quantity, 0)
        ),
        quarantine: round(
          wRows
            .filter(row => row.qualityStatus === 'QUARANTAINE')
            .reduce((total, row) => total + row.quantity, 0)
        ),
        blocked: round(
          wRows
            .filter(row => QUALITY_STATUS_GROUPS.blocked.includes(row.qualityStatus))
            .reduce((total, row) => total + row.quantity, 0)
        ),
      };
    });
    return {
      itemId: item.id,
      itemCode: item.code,
      designation: item.designation,
      unit: item.unit,
      minStockLevel: item.minStockLevel,
      physical: round(rows.reduce((total, row) => total + row.quantity, 0)),
      available: round(Math.max(0, libre - reserved)),
      reserved,
      pendingControl: sum(row => QUALITY_STATUS_GROUPS.pending.includes(row.qualityStatus)),
      quarantine: sum(row => row.qualityStatus === 'QUARANTAINE'),
      blocked: sum(row => QUALITY_STATUS_GROUPS.blocked.includes(row.qualityStatus)),
      transit,
      byWarehouse,
    };
  }

  public getConsolidatedStockView(): ConsolidatedStock[] {
    return this.db.items
      .map(item => this.getConsolidatedStockForItem(item.id))
      .filter((row): row is ConsolidatedStock => Boolean(row))
      .sort((a, b) => a.itemCode.localeCompare(b.itemCode));
  }

  public getWarehouseStockSummary(warehouseId: string) {
    const rows = this.getWarehouseStocks({ warehouseId });
    const round = (n: number) => this.roundQty(n);
    const sum = (predicate: (row: WarehouseStock) => boolean) =>
      round(rows.filter(predicate).reduce((total, row) => total + row.quantity, 0));
    return {
      warehouseId,
      physical: round(rows.reduce((total, row) => total + row.quantity, 0)),
      available: round(
        Math.max(
          0,
          rows
            .filter(row => row.qualityStatus === 'LIBERE')
            .reduce((total, row) => total + row.quantity - row.reservedQty, 0)
        )
      ),
      reserved: round(rows.reduce((total, row) => total + row.reservedQty, 0)),
      pendingControl: sum(row => QUALITY_STATUS_GROUPS.pending.includes(row.qualityStatus)),
      quarantine: sum(row => row.qualityStatus === 'QUARANTAINE'),
      blocked: sum(row => QUALITY_STATUS_GROUPS.blocked.includes(row.qualityStatus)),
      itemCount: new Set(rows.map(row => row.itemId)).size,
      lotCount: new Set(rows.map(row => row.lotId)).size,
      rowCount: rows.length,
    };
  }

  public getStockTransits(filter?: {
    transferId?: string;
    status?: StockTransit['status'];
  }): StockTransit[] {
    return this.db.stockTransits
      .filter(t => !filter?.transferId || t.transferId === filter.transferId)
      .filter(t => !filter?.status || t.status === filter.status)
      .sort((a, b) => b.shippedAt.localeCompare(a.shippedAt));
  }

  public getWarehouseDashboard(): WarehouseDashboard {
    const warehouses = this.getAccessibleWarehouses();
    const accessible = new Set(warehouses.map(w => w.id));
    const rows = this.db.warehouseStocks.filter(row => accessible.has(row.warehouseId));
    const round = (n: number) => this.roundQty(n);
    const sum = (predicate: (row: WarehouseStock) => boolean) =>
      round(rows.filter(predicate).reduce((total, row) => total + row.quantity, 0));
    const reserved = round(rows.reduce((total, row) => total + row.reservedQty, 0));
    const transit = round(
      this.db.stockTransits
        .filter(
          t =>
            t.status === 'EN_TRANSIT' &&
            (accessible.has(t.sourceWarehouseId) || accessible.has(t.destinationWarehouseId))
        )
        .reduce((total, t) => total + t.quantity, 0)
    );
    const transfers = this.db.stockTransfers.filter(
      t => accessible.has(t.sourceWarehouseId) || accessible.has(t.destinationWarehouseId)
    );
    const byWarehouse = warehouses.map(warehouse => {
      const wRows = rows.filter(row => row.warehouseId === warehouse.id);
      const wReserved = round(wRows.reduce((total, row) => total + row.reservedQty, 0));
      return {
        warehouseId: warehouse.id,
        code: warehouse.code,
        designation: warehouse.designation,
        type: warehouse.type,
        physical: round(wRows.reduce((total, row) => total + row.quantity, 0)),
        available: round(
          Math.max(
            0,
            wRows
              .filter(row => row.qualityStatus === 'LIBERE')
              .reduce((total, row) => total + row.quantity, 0) - wReserved
          )
        ),
        quarantine: round(
          wRows
            .filter(row => row.qualityStatus === 'QUARANTAINE')
            .reduce((total, row) => total + row.quantity, 0)
        ),
        pendingControl: round(
          wRows
            .filter(row => QUALITY_STATUS_GROUPS.pending.includes(row.qualityStatus))
            .reduce((total, row) => total + row.quantity, 0)
        ),
        blocked: round(
          wRows
            .filter(row => QUALITY_STATUS_GROUPS.blocked.includes(row.qualityStatus))
            .reduce((total, row) => total + row.quantity, 0)
        ),
        itemCount: new Set(wRows.map(row => row.itemId)).size,
        lotCount: new Set(wRows.map(row => row.lotId)).size,
      };
    });
    return {
      warehouseCount: warehouses.length,
      activeWarehouseCount: warehouses.filter(w => w.isActive).length,
      locationCount: this.db.warehouseLocations.filter(l => accessible.has(l.warehouseId)).length,
      physicalStock: round(rows.reduce((total, row) => total + row.quantity, 0)),
      availableStock: round(
        Math.max(0, rows.filter(row => row.qualityStatus === 'LIBERE').reduce((total, row) => total + row.quantity, 0) - reserved)
      ),
      reservedStock: reserved,
      pendingControl: sum(row => QUALITY_STATUS_GROUPS.pending.includes(row.qualityStatus)),
      quarantine: sum(row => row.qualityStatus === 'QUARANTAINE'),
      blocked: sum(row => QUALITY_STATUS_GROUPS.blocked.includes(row.qualityStatus)),
      transit,
      activeTransfers: transfers.filter(t =>
        ['VALIDE', 'EN_PREPARATION', 'EXPEDIE', 'PARTIELLEMENT_RECEPTIONNE'].includes(t.status)
      ).length,
      pendingValidation: transfers.filter(t => t.status === 'EN_ATTENTE_VALIDATION').length,
      openDiscrepancies: transfers.reduce(
        (total, t) => total + t.discrepancies.filter(d => d.regularizationStatus === 'CONSTATEE').length,
        0
      ),
      lowStockItems: this.db.items
        .filter(item => item.minStockLevel > 0 && item.currentStock <= item.minStockLevel)
        .map(item => ({
          itemId: item.id,
          itemCode: item.code,
          designation: item.designation,
          unit: item.unit,
          available: item.currentStock,
          minStockLevel: item.minStockLevel,
        }))
        .sort((a, b) => a.itemCode.localeCompare(b.itemCode)),
      byWarehouse,
    };
  }

  // --- Transferts entre magasins : workflow complet ---

  public getTransfers(filter?: {
    status?: TransferStatus;
    type?: TransferType;
    warehouseId?: string;
    workOrderId?: string;
  }): StockTransfer[] {
    const accessible = new Set(this.getAccessibleWarehouses().map(w => w.id));
    return this.db.stockTransfers
      .filter(t => accessible.has(t.sourceWarehouseId) || accessible.has(t.destinationWarehouseId))
      .filter(t => !filter?.status || t.status === filter.status)
      .filter(t => !filter?.type || t.type === filter.type)
      .filter(
        t =>
          !filter?.warehouseId ||
          t.sourceWarehouseId === filter.warehouseId ||
          t.destinationWarehouseId === filter.warehouseId
      )
      .filter(t => !filter?.workOrderId || t.workOrderId === filter.workOrderId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  public getTransfer(id: string): StockTransfer | undefined {
    return this.db.stockTransfers.find(t => t.id === id);
  }

  private findTransferOrThrow(id: string): StockTransfer {
    const transfer = this.db.stockTransfers.find(t => t.id === id);
    if (!transfer) throw new Error('Transfert introuvable.');
    return transfer;
  }

  private nextTransferNumber(): string {
    let index = this.db.stockTransfers.length + 1;
    let candidate = `TRF-2026-${String(index).padStart(4, '0')}`;
    while (this.db.stockTransfers.some(t => t.transferNumber === candidate)) {
      index += 1;
      candidate = `TRF-2026-${String(index).padStart(4, '0')}`;
    }
    return candidate;
  }

  private pushTransferStatus(transfer: StockTransfer, status: TransferStatus, comment?: string) {
    transfer.status = status;
    transfer.updatedAt = this.nowIso();
    transfer.statusHistory.push({
      status,
      timestamp: transfer.updatedAt,
      user: `${this.currentUser.name} (${this.currentUser.role})`,
      comment,
    });
  }

  private releaseTransferReservations(transfer: StockTransfer) {
    for (const line of transfer.lines) {
      const row = this.db.warehouseStocks.find(
        r =>
          r.warehouseId === transfer.sourceWarehouseId &&
          r.lotId === line.lotId &&
          (r.locationId === line.sourceLocationId || !line.sourceLocationId)
      );
      if (!row) continue;
      row.reservedQty = Math.max(0, this.roundQty(row.reservedQty - (line.requestedQty || 0)));
      row.updatedAt = this.nowIso();
    }
    this.recalculateAllItemAggregates();
  }

  public createTransfer(input: CreateTransferInput): StockTransfer {
    const type: TransferType = input.type || 'INTER_MAGASIN';
    this.assertWarehousePermission(
      type === 'RETOUR_MAGASIN' ? 'RETURN_REQUEST' : 'TRANSFER_REQUEST',
      type === 'RETOUR_MAGASIN' ? 'enregistrer un retour magasin' : 'créer une demande de transfert'
    );
    const source = this.db.warehouses.find(w => w.id === input.sourceWarehouseId);
    const destination = this.db.warehouses.find(w => w.id === input.destinationWarehouseId);
    if (!source || !destination) throw new Error('Magasin source ou destination introuvable.');
    if (!source.isActive || !destination.isActive) {
      throw new Error('Un transfert ne peut concerner qu\'un magasin actif.');
    }
    this.assertWarehouseAccess(source.id, 'demande de transfert');
    if (
      source.id === destination.id &&
      type !== 'INTER_EMPLACEMENT'
    ) {
      throw new Error('Le magasin source et le magasin destination doivent être différents.');
    }
    if (!input.lines || input.lines.length === 0) {
      throw new Error('Une demande de transfert doit comporter au moins une ligne.');
    }

    const lines = input.lines.map(lineInput => {
      const item = this.db.items.find(i => i.id === lineInput.itemId);
      if (!item) throw new Error(`Article introuvable : ${lineInput.itemId}.`);
      if (!(lineInput.requestedQty > 0)) {
        throw new Error(`Quantité demandée invalide pour ${item.code}.`);
      }
      const sourceLocation =
        (lineInput.sourceLocationId
          ? this.db.warehouseLocations.find(
              l => l.id === lineInput.sourceLocationId && l.warehouseId === source.id
            )
          : undefined) || this.getDefaultLocation(source.id);
      if (!sourceLocation) throw new Error(`Aucun emplacement source dans ${source.code}.`);

      const candidateRows = this.db.warehouseStocks.filter(
        row =>
          row.warehouseId === source.id &&
          row.itemId === item.id &&
          (lineInput.lotId ? row.lotId === lineInput.lotId : true) &&
          (lineInput.lotNumber ? row.lotNumber === lineInput.lotNumber : true) &&
          (lineInput.sourceLocationId ? row.locationId === sourceLocation.id : true) &&
          row.quantity > 0
      );
      const row =
        candidateRows.find(r => r.qualityStatus === 'LIBERE') ||
        candidateRows.find(r => r.quantity - r.reservedQty > 0) ||
        candidateRows[0];
      if (!row) {
        throw new Error(
          `Aucun stock disponible pour ${item.code}${lineInput.lotNumber ? ` (lot ${lineInput.lotNumber})` : ''} dans ${source.code} / ${sourceLocation.code}.`
        );
      }
      const available =
        row.qualityStatus === 'LIBERE'
          ? this.roundQty(row.quantity - row.reservedQty)
          : this.roundQty(row.quantity);
      if (lineInput.requestedQty > available + 0.0001) {
        throw new Error(
          `Stock insuffisant pour ${item.code} lot ${row.lotNumber} : disponible ${available} ${item.unit}, demandé ${lineInput.requestedQty} ${item.unit}.`
        );
      }
      const destinationLocation = lineInput.destinationLocationId
        ? this.db.warehouseLocations.find(
            l => l.id === lineInput.destinationLocationId && l.warehouseId === destination.id
          )
        : this.getDefaultLocation(destination.id);
      return {
        id: this.newId('TRL'),
        itemId: item.id,
        itemCode: item.code,
        designation: item.designation,
        lotId: row.lotId,
        lotNumber: row.lotNumber,
        unit: row.unit,
        qualityStatus: row.qualityStatus,
        requestedQty: this.roundQty(lineInput.requestedQty),
        availableAtRequest: available,
        sourceLocationId: row.locationId,
        destinationLocationId: destinationLocation?.id,
        status: 'EN_ATTENTE' as const,
      };
    });

    const timestamp = this.nowIso();
    const transfer: StockTransfer = {
      id: this.newId('TRF'),
      transferNumber: this.nextTransferNumber(),
      type,
      sourceWarehouseId: source.id,
      destinationWarehouseId: destination.id,
      requestDate: timestamp,
      requester: this.currentUser.name,
      requesterId: this.currentUser.id,
      reason: input.reason?.trim() || 'Transfert de stock',
      status: 'BROUILLON',
      workOrderId: input.workOrderId,
      returnOfTransferId: input.returnOfTransferId,
      lines,
      discrepancies: [],
      statusHistory: [
        {
          status: 'BROUILLON',
          timestamp,
          user: `${this.currentUser.name} (${this.currentUser.role})`,
          comment: 'Création de la demande',
        },
      ],
      notes: input.notes,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    this.db.stockTransfers.unshift(transfer);

    this.logAudit({
      action: 'CREATE',
      entity: 'StockTransfer',
      entityId: transfer.id,
      newValues: `Création transfert ${transfer.transferNumber} ${source.code} → ${destination.code} (${lines.length} ligne(s))`,
      motive: transfer.reason,
    });
    this.saveDatabase(this.db);
    return transfer;
  }

  public submitTransfer(id: string): StockTransfer {
    const transfer = this.findTransferOrThrow(id);
    if (transfer.status !== 'BROUILLON') {
      throw new Error(`Seul un brouillon peut être soumis (statut actuel : ${transfer.status}).`);
    }
    transfer.submittedAt = this.nowIso();
    this.pushTransferStatus(transfer, 'EN_ATTENTE_VALIDATION', 'Soumission pour validation');
    this.logAudit({
      action: 'UPDATE',
      entity: 'StockTransfer',
      entityId: transfer.id,
      newValues: `Soumission du transfert ${transfer.transferNumber} pour validation`,
    });
    this.saveDatabase(this.db);
    return transfer;
  }

  public validateTransfer(id: string, comment?: string): StockTransfer {
    this.assertWarehousePermission('TRANSFER_VALIDATE', 'valider un transfert');
    const transfer = this.findTransferOrThrow(id);
    if (transfer.status !== 'EN_ATTENTE_VALIDATION') {
      throw new Error(`Seul un transfert en attente de validation peut être validé (statut actuel : ${transfer.status}).`);
    }
    this.assertWarehouseAccess(transfer.sourceWarehouseId, 'validation');
    // Contrôle intégral avant réservation : aucun transfert partiel de réservation.
    // Les lignes sont agrégées par ligne de stock : deux lignes sur le même lot ne
    // peuvent jamais réserver deux fois la même quantité disponible.
    const reservations = new Map<
      string,
      { row: WarehouseStock; qty: number; itemCode: string; lotNumber: string }
    >();
    for (const line of transfer.lines) {
      const row =
        this.db.warehouseStocks.find(
          r =>
            r.warehouseId === transfer.sourceWarehouseId &&
            r.lotId === line.lotId &&
            r.locationId === line.sourceLocationId &&
            r.qualityStatus === (line.qualityStatus || r.qualityStatus)
        ) ||
        this.db.warehouseStocks.find(
          r =>
            r.warehouseId === transfer.sourceWarehouseId &&
            r.lotId === line.lotId &&
            r.qualityStatus === (line.qualityStatus || r.qualityStatus)
        );
      if (!row) {
        throw new Error(`Validation refusée : le lot ${line.lotNumber} n'est plus présent dans le magasin source.`);
      }
      const existing = reservations.get(row.id);
      if (existing) {
        existing.qty = this.roundQty(existing.qty + line.requestedQty);
      } else {
        reservations.set(row.id, {
          row,
          qty: line.requestedQty,
          itemCode: line.itemCode,
          lotNumber: line.lotNumber,
        });
      }
    }
    for (const reservation of reservations.values()) {
      const available =
        reservation.row.qualityStatus === 'LIBERE'
          ? this.roundQty(reservation.row.quantity - reservation.row.reservedQty)
          : this.roundQty(reservation.row.quantity);
      if (reservation.qty > available + 0.0001) {
        throw new Error(
          `Validation refusée : stock insuffisant pour ${reservation.itemCode} lot ${reservation.lotNumber} (disponible ${available}, demandé ${reservation.qty}).`
        );
      }
    }
    for (const reservation of reservations.values()) {
      reservation.row.reservedQty = this.roundQty(reservation.row.reservedQty + reservation.qty);
      reservation.row.updatedAt = this.nowIso();
    }
    transfer.validatedBy = `${this.currentUser.name} (${this.currentUser.role})`;
    transfer.validatedAt = this.nowIso();
    this.pushTransferStatus(transfer, 'VALIDE', comment || 'Validation et réservation des quantités');
    this.recalculateAllItemAggregates();
    this.logAudit({
      action: 'VALIDATE',
      entity: 'StockTransfer',
      entityId: transfer.id,
      newValues: `Validation du transfert ${transfer.transferNumber} — quantités réservées`,
      motive: comment || 'Validation transfert inter-magasins',
    });
    this.saveDatabase(this.db);
    return transfer;
  }

  public refuseTransfer(id: string, reason: string): StockTransfer {
    this.assertWarehousePermission('TRANSFER_VALIDATE', 'refuser un transfert');
    if (!reason?.trim()) throw new Error('Un motif de refus est obligatoire.');
    const transfer = this.findTransferOrThrow(id);
    if (transfer.status !== 'EN_ATTENTE_VALIDATION') {
      throw new Error(`Seul un transfert en attente de validation peut être refusé (statut actuel : ${transfer.status}).`);
    }
    this.assertWarehouseAccess(transfer.sourceWarehouseId, 'refus');
    this.releaseTransferReservations(transfer);
    transfer.refusedBy = `${this.currentUser.name} (${this.currentUser.role})`;
    transfer.refusedAt = this.nowIso();
    transfer.refusalReason = reason.trim();
    this.pushTransferStatus(transfer, 'REFUSE', reason.trim());
    this.logAudit({
      action: 'BLOCK',
      entity: 'StockTransfer',
      entityId: transfer.id,
      newValues: `Refus du transfert ${transfer.transferNumber}`,
      motive: reason.trim(),
    });
    this.saveDatabase(this.db);
    return transfer;
  }

  public prepareTransfer(id: string, comment?: string): StockTransfer {
    this.assertWarehousePermission('TRANSFER_PREPARE', 'préparer un transfert');
    const transfer = this.findTransferOrThrow(id);
    if (transfer.status !== 'VALIDE') {
      throw new Error(`Seul un transfert validé peut être préparé (statut actuel : ${transfer.status}).`);
    }
    this.assertWarehouseAccess(transfer.sourceWarehouseId, 'préparation');
    transfer.preparedBy = `${this.currentUser.name} (${this.currentUser.role})`;
    transfer.preparedAt = this.nowIso();
    transfer.lines.forEach(line => {
      if (line.status === 'EN_ATTENTE') line.status = 'PRET';
    });
    this.pushTransferStatus(transfer, 'EN_PREPARATION', comment || 'Préparation de la sortie');
    this.logAudit({
      action: 'UPDATE',
      entity: 'StockTransfer',
      entityId: transfer.id,
      newValues: `Préparation du transfert ${transfer.transferNumber}`,
    });
    this.saveDatabase(this.db);
    return transfer;
  }

  public shipTransfer(id: string, lines: ShipTransferLineInput[]): StockTransfer {
    this.assertWarehousePermission('TRANSFER_SHIP', 'expédier un transfert');
    const transfer = this.findTransferOrThrow(id);
    if (!['VALIDE', 'EN_PREPARATION'].includes(transfer.status)) {
      throw new Error(`Un transfert ne peut être expédié que s'il est validé ou en préparation (statut actuel : ${transfer.status}).`);
    }
    if (!lines || lines.length === 0) throw new Error('Aucune quantité à expédier.');
    this.assertWarehouseAccess(transfer.sourceWarehouseId, 'expédition');

    // Contrôle préalable de toutes les lignes avant toute mutation.
    const prepared: Array<{
      line: StockTransfer['lines'][number];
      input: ShipTransferLineInput;
      row: WarehouseStock;
    }> = [];
    for (const input of lines) {
      const line = transfer.lines.find(l => l.id === input.lineId);
      if (!line) throw new Error('Ligne de transfert introuvable.');
      const shippedQty = this.roundQty(input.shippedQty);
      if (shippedQty < 0) throw new Error('La quantité expédiée ne peut pas être négative.');
      if (shippedQty > line.requestedQty + 0.0001) {
        throw new Error(`Quantité expédiée supérieure à la demande pour ${line.itemCode} lot ${line.lotNumber}.`);
      }
      if (shippedQty === 0) continue;
      const row =
        this.db.warehouseStocks.find(
          r =>
            r.warehouseId === transfer.sourceWarehouseId &&
            r.lotId === line.lotId &&
            r.locationId === line.sourceLocationId &&
            r.qualityStatus === (line.qualityStatus || r.qualityStatus)
        ) ||
        this.db.warehouseStocks.find(
          r =>
            r.warehouseId === transfer.sourceWarehouseId &&
            r.lotId === line.lotId &&
            r.qualityStatus === (line.qualityStatus || r.qualityStatus)
        );
      if (!row || row.quantity + 0.0001 < shippedQty) {
        throw new Error(
          `Expédition refusée : stock physique insuffisant pour ${line.itemCode} lot ${line.lotNumber} dans le magasin source.`
        );
      }
      prepared.push({ line, input: { ...input, shippedQty }, row });
    }
    if (prepared.length === 0) throw new Error('Aucune quantité positive à expédier.');

    const timestamp = this.nowIso();
    for (const { line, input, row } of prepared) {
      const shippedQty = this.roundQty(input.shippedQty);
      // Libération de la réservation correspondant à la quantité effectivement sortie.
      row.reservedQty = Math.max(0, this.roundQty(row.reservedQty - shippedQty));
      row.updatedAt = timestamp;

      this.addStockMovement({
        documentNumber: transfer.transferNumber,
        itemId: line.itemId,
        itemCode: line.itemCode,
        batchNumber: line.lotNumber,
        lotId: line.lotId,
        type: 'TRANSFERT_SORTIE',
        quantity: shippedQty,
        unit: line.unit,
        stockDelta: -shippedQty,
        sourceWarehouseId: transfer.sourceWarehouseId,
        sourceLocationId: row.locationId,
        sourceLocation: row.locationId,
        qualityStatus: row.qualityStatus,
        workOrderId: transfer.workOrderId,
        referenceDocument: transfer.transferNumber,
        userId: this.currentUser.id,
        userName: this.currentUser.name,
        reason: `Expédition transfert ${transfer.transferNumber} — ${line.itemCode} lot ${line.lotNumber}`,
      });

      this.db.stockTransits.push({
        id: this.newId('TRANSIT'),
        transferId: transfer.id,
        transferNumber: transfer.transferNumber,
        lineId: line.id,
        itemId: line.itemId,
        itemCode: line.itemCode,
        lotId: line.lotId,
        lotNumber: line.lotNumber,
        quantity: shippedQty,
        receivedQty: 0,
        unit: line.unit,
        qualityStatus: row.qualityStatus,
        sourceWarehouseId: transfer.sourceWarehouseId,
        destinationWarehouseId: transfer.destinationWarehouseId,
        shippedAt: timestamp,
        shippedBy: `${this.currentUser.name} (${this.currentUser.role})`,
        status: 'EN_TRANSIT',
      });

      line.preparedQty = this.roundQty(input.preparedQty || shippedQty);
      line.shippedQty = shippedQty;
      line.shippedAt = timestamp;
      line.shippedBy = `${this.currentUser.name} (${this.currentUser.role})`;
      line.status = 'EXPEDIE';
    }

    transfer.shippedBy = `${this.currentUser.name} (${this.currentUser.role})`;
    transfer.shippedAt = timestamp;
    this.pushTransferStatus(transfer, 'EXPEDIE', 'Expédition confirmée');
    this.recalculateAllItemAggregates();
    this.logAudit({
      action: 'VALIDATE',
      entity: 'StockTransfer',
      entityId: transfer.id,
      newValues: `Expédition du transfert ${transfer.transferNumber} (${prepared.length} ligne(s))`,
      motive: 'Sortie physique du magasin source, quantités placées en transit',
    });
    this.saveDatabase(this.db);
    return transfer;
  }

  public receiveTransfer(id: string, lines: ReceiveTransferLineInput[]): StockTransfer {
    this.assertWarehousePermission('TRANSFER_RECEIVE', 'réceptionner un transfert');
    const transfer = this.findTransferOrThrow(id);
    if (!['EXPEDIE', 'PARTIELLEMENT_RECEPTIONNE'].includes(transfer.status)) {
      throw new Error(`Un transfert ne peut être réceptionné que s'il est expédié (statut actuel : ${transfer.status}).`);
    }
    if (!lines || lines.length === 0) throw new Error('Aucune quantité à réceptionner.');
    this.assertWarehouseAccess(transfer.destinationWarehouseId, 'réception');

    const timestamp = this.nowIso();
    for (const input of lines) {
      const line = transfer.lines.find(l => l.id === input.lineId);
      if (!line) throw new Error('Ligne de transfert introuvable.');
      const transit = this.db.stockTransits.find(
        t => t.transferId === transfer.id && t.lineId === line.id && t.status === 'EN_TRANSIT'
      );
      if (!transit) {
        throw new Error(`Aucune quantité en transit pour ${line.itemCode} lot ${line.lotNumber}.`);
      }
      const receivedQty = this.roundQty(input.receivedQty || 0);
      const damagedQty = this.roundQty(input.damagedQty || 0);
      if (receivedQty < 0 || damagedQty < 0) throw new Error('Les quantités réceptionnées ne peuvent pas être négatives.');
      const remaining = this.roundQty(transit.quantity - transit.receivedQty);
      if (receivedQty + damagedQty > remaining + 0.0001) {
        throw new Error(
          `Réception refusée pour ${line.itemCode} lot ${line.lotNumber} : reste ${remaining} ${line.unit}, déclaré ${receivedQty + damagedQty}.`
        );
      }
      const destinationLocation =
        this.db.warehouseLocations.find(
          l => l.id === input.destinationLocationId && l.warehouseId === transfer.destinationWarehouseId
        ) || this.getDefaultLocation(transfer.destinationWarehouseId);
      if (!destinationLocation) throw new Error('Aucun emplacement de réception disponible.');

      if (receivedQty > 0) {
        this.addStockMovement({
          documentNumber: transfer.transferNumber,
          itemId: line.itemId,
          itemCode: line.itemCode,
          batchNumber: line.lotNumber,
          lotId: line.lotId,
          type: 'TRANSFERT_ENTREE',
          quantity: receivedQty,
          unit: line.unit,
          stockDelta: receivedQty,
          destinationWarehouseId: transfer.destinationWarehouseId,
          destinationLocationId: destinationLocation.id,
          destinationLocation: destinationLocation.code,
          qualityStatus: transit.qualityStatus,
          workOrderId: transfer.workOrderId,
          referenceDocument: transfer.transferNumber,
          userId: this.currentUser.id,
          userName: this.currentUser.name,
          reason: `Réception transfert ${transfer.transferNumber} — ${line.itemCode} lot ${line.lotNumber}`,
        });
      }

      transit.receivedQty = this.roundQty(transit.receivedQty + receivedQty);
      const fullyProcessed = transit.receivedQty + damagedQty >= transit.quantity - 0.0001;
      transit.status = fullyProcessed
        ? transit.receivedQty >= transit.quantity - 0.0001
          ? 'RECEPTIONNE'
          : 'ECART'
        : 'EN_TRANSIT';

      line.receivedQty = this.roundQty((line.receivedQty || 0) + receivedQty);
      line.damagedQty = this.roundQty((line.damagedQty || 0) + damagedQty);
      line.receivedLotNumber = input.receivedLotNumber || line.lotNumber;
      line.receivedAt = timestamp;
      line.receivedBy = `${this.currentUser.name} (${this.currentUser.role})`;
      line.observations = input.observations;
      const lineShipped = line.shippedQty || line.requestedQty;
      line.status =
        (line.receivedQty || 0) + (line.damagedQty || 0) >= lineShipped - 0.0001
          ? (line.damagedQty || 0) > 0
            ? 'ECART_VALIDE'
            : 'RECEPTIONNE'
          : 'RECEPTIONNE_PARTIEL';

      if (damagedQty > 0) {
        transfer.discrepancies.push({
          id: this.newId('DISC'),
          lineId: line.id,
          type: 'ENDOMMAGE',
          quantity: damagedQty,
          unit: line.unit,
          reason: input.observations || 'Article endommagé constaté à la réception',
          recordedBy: `${this.currentUser.name} (${this.currentUser.role})`,
          recordedAt: timestamp,
          regularizationStatus: 'CONSTATEE',
        });
      }
    }

    const allLinesClosed = transfer.lines.every(line => {
      const shipped = line.shippedQty || 0;
      return (
        shipped === 0 ||
        (line.receivedQty || 0) + (line.damagedQty || 0) >= shipped - 0.0001
      );
    });
    transfer.receivedBy = `${this.currentUser.name} (${this.currentUser.role})`;
    transfer.receivedAt = timestamp;
    this.pushTransferStatus(
      transfer,
      allLinesClosed ? 'RECEPTIONNE' : 'PARTIELLEMENT_RECEPTIONNE',
      allLinesClosed ? 'Réception complète' : 'Réception partielle'
    );
    this.recalculateAllItemAggregates();
    this.logAudit({
      action: 'UPDATE',
      entity: 'StockTransfer',
      entityId: transfer.id,
      newValues: `Réception du transfert ${transfer.transferNumber} — statut ${transfer.status}`,
      motive: 'Entrée physique dans le magasin de destination',
    });
    this.saveDatabase(this.db);
    return transfer;
  }

  public cancelTransfer(id: string, reason: string): StockTransfer {
    if (!reason?.trim()) throw new Error('Un motif d\'annulation est obligatoire.');
    const transfer = this.findTransferOrThrow(id);
    if (
      ['EXPEDIE', 'PARTIELLEMENT_RECEPTIONNE', 'RECEPTIONNE', 'CLOTURE_PARTIELLE', 'ANNULE', 'REFUSE'].includes(
        transfer.status
      )
    ) {
      throw new Error(`Un transfert ${transfer.status} ne peut pas être annulé.`);
    }
    this.assertWarehouseAccess(transfer.sourceWarehouseId, 'annulation');
    this.releaseTransferReservations(transfer);
    transfer.cancellationReason = reason.trim();
    this.pushTransferStatus(transfer, 'ANNULE', reason.trim());
    this.logAudit({
      action: 'UPDATE',
      entity: 'StockTransfer',
      entityId: transfer.id,
      newValues: `Annulation du transfert ${transfer.transferNumber}`,
      motive: reason.trim(),
    });
    this.saveDatabase(this.db);
    return transfer;
  }

  public closePartialTransfer(id: string, reason: string): StockTransfer {
    this.assertWarehousePermission('TRANSFER_DISCREPANCY_VALIDATE', 'clôturer partiellement un transfert');
    if (!reason?.trim()) throw new Error('Un motif de clôture partielle est obligatoire.');
    const transfer = this.findTransferOrThrow(id);
    if (!['EXPEDIE', 'PARTIELLEMENT_RECEPTIONNE'].includes(transfer.status)) {
      throw new Error(`Seul un transfert expédié ou partiellement réceptionné peut être clôturé partiellement (statut actuel : ${transfer.status}).`);
    }
    this.assertWarehouseAccess(transfer.destinationWarehouseId, 'clôture partielle');
    const timestamp = this.nowIso();
    for (const transit of this.db.stockTransits.filter(
      t => t.transferId === transfer.id && t.status === 'EN_TRANSIT'
    )) {
      const line = transfer.lines.find(l => l.id === transit.lineId);
      const missingQty = this.roundQty(
        transit.quantity - transit.receivedQty - (line?.damagedQty || 0)
      );
      if (missingQty > 0.0001) {
        transfer.discrepancies.push({
          id: this.newId('DISC'),
          lineId: transit.lineId,
          type: 'MANQUANT',
          quantity: missingQty,
          unit: transit.unit,
          reason: reason.trim(),
          recordedBy: `${this.currentUser.name} (${this.currentUser.role})`,
          recordedAt: timestamp,
          regularizationStatus: 'CONSTATEE',
        });
      }
      transit.status = 'ECART';
      if (line) line.status = 'ECART_VALIDE';
    }
    transfer.partialClosureAuthorizedBy = `${this.currentUser.name} (${this.currentUser.role})`;
    transfer.partialClosureReason = reason.trim();
    this.pushTransferStatus(transfer, 'CLOTURE_PARTIELLE', reason.trim());
    this.logAudit({
      action: 'UPDATE',
      entity: 'StockTransfer',
      entityId: transfer.id,
      newValues: `Clôture partielle du transfert ${transfer.transferNumber} — écarts constatés, aucune quantité ajoutée automatiquement`,
      motive: reason.trim(),
    });
    this.saveDatabase(this.db);
    return transfer;
  }

  /**
   * Régularisation d'un écart de transfert. Aucune quantité manquante n'est
   * ajoutée automatiquement : seul un AJOUT_STOCK explicitement autorisé crée du stock.
   */
  public regularizeDiscrepancy(
    transferId: string,
    discrepancyId: string,
    action: 'AJOUT_STOCK' | 'PERTE_DEFINITIVE',
    notes: string
  ): StockTransfer {
    this.assertWarehousePermission('STOCK_REGULARIZE', 'régulariser un écart de transfert');
    if (!notes?.trim()) throw new Error('Une justification est obligatoire pour régulariser un écart.');
    const transfer = this.findTransferOrThrow(transferId);
    const discrepancy = transfer.discrepancies.find(d => d.id === discrepancyId);
    if (!discrepancy) throw new Error('Écart introuvable.');
    this.assertWarehouseAccess(transfer.destinationWarehouseId, 'régularisation d\'écart');
    if (discrepancy.regularizationStatus !== 'CONSTATEE') {
      throw new Error('Cet écart a déjà été régularisé ou clôturé.');
    }
    const line = transfer.lines.find(l => l.id === discrepancy.lineId);
    if (!line) throw new Error('Ligne de transfert associée introuvable.');

    if (action === 'AJOUT_STOCK') {
      const destinationLocation = this.getDefaultLocation(transfer.destinationWarehouseId);
      if (!destinationLocation) throw new Error('Aucun emplacement de destination pour régulariser l\'écart.');
      const transit = this.db.stockTransits.find(
        t => t.transferId === transfer.id && t.lineId === line.id
      );
      this.addStockMovement({
        documentNumber: transfer.transferNumber,
        itemId: line.itemId,
        itemCode: line.itemCode,
        batchNumber: line.lotNumber,
        lotId: line.lotId,
        type: 'REGULARISATION_TRANSFERT',
        quantity: discrepancy.quantity,
        unit: line.unit,
        stockDelta: discrepancy.quantity,
        destinationWarehouseId: transfer.destinationWarehouseId,
        destinationLocationId: destinationLocation.id,
        destinationLocation: destinationLocation.code,
        qualityStatus: transit?.qualityStatus || line.qualityStatus || 'LIBERE',
        referenceDocument: transfer.transferNumber,
        userId: this.currentUser.id,
        userName: this.currentUser.name,
        reason: `Régularisation d'écart (${discrepancy.type}) sur ${transfer.transferNumber} : ${notes.trim()}`,
      });
      if (transit) transit.status = 'RECEPTIONNE';
    }

    discrepancy.regularizationStatus = 'REGULARISEE';
    discrepancy.regularizationAction = action;
    discrepancy.regularizationBy = `${this.currentUser.name} (${this.currentUser.role})`;
    discrepancy.regularizationAt = this.nowIso();
    discrepancy.regularizationNotes = notes.trim();

    this.logAudit({
      action: action === 'AJOUT_STOCK' ? 'VALIDATE' : 'UPDATE',
      entity: 'TransferDiscrepancy',
      entityId: discrepancy.id,
      newValues: `Écart ${discrepancy.type} de ${discrepancy.quantity} ${discrepancy.unit} — ${action}`,
      motive: notes.trim(),
    });
    this.saveDatabase(this.db);
    return transfer;
  }

  public createReturn(input: Omit<CreateTransferInput, 'type'>): StockTransfer {
    return this.createTransfer({ ...input, type: 'RETOUR_MAGASIN' });
  }

  public getReturns(): StockTransfer[] {
    return this.getTransfers({ type: 'RETOUR_MAGASIN' });
  }

  // --- Intégration production : besoins, dotations et retours ---

  public getWorkOrderMaterialRequirements(workOrderId: string): WorkOrderMaterialRequirement[] {
    const workOrder = this.db.workOrders.find(w => w.id === workOrderId);
    if (!workOrder) throw new Error('Ordre de fabrication introuvable.');
    const recipe = this.db.recipes.find(r => r.id === workOrder.recipeId);
    if (!recipe) return [];
    const baseQty = recipe.referenceProductionQty && recipe.referenceProductionQty > 0
      ? recipe.referenceProductionQty
      : 1000;
    const scale = workOrder.plannedCansQty > 0 ? workOrder.plannedCansQty / baseQty : 1;

    return recipe.ingredients.map(ingredient => {
      const item = this.db.items.find(i => i.id === ingredient.itemId);
      const requiredQty = this.roundQty(
        (ingredient.theoreticalQuantityPer1000Cans || 0) * scale
      );
      const availableLots = this.db.warehouseStocks
        .filter(row => row.itemId === ingredient.itemId && row.qualityStatus === 'LIBERE')
        .filter(row => row.quantity - row.reservedQty > 0.0001)
        .filter(row => this.canAccessWarehouse(row.warehouseId))
        .map(row => ({
          lotId: row.lotId,
          lotNumber: row.lotNumber,
          warehouseId: row.warehouseId,
          locationId: row.locationId,
          quantity: this.roundQty(row.quantity - row.reservedQty),
        }))
        .sort((a, b) => b.quantity - a.quantity);
      const availableQty = this.roundQty(
        availableLots.reduce((total, lot) => total + lot.quantity, 0)
      );
      const sourceWarehouseId =
        availableLots[0]?.warehouseId ||
        (item ? this.defaultWarehouseForCategory(item.category)?.id : undefined);
      const sourceWarehouse = sourceWarehouseId ? this.getWarehouseById(sourceWarehouseId) : undefined;
      return {
        itemId: ingredient.itemId,
        itemCode: ingredient.itemCode,
        designation: ingredient.designation,
        unit: ingredient.unit,
        requiredQty,
        availableQty,
        shortageQty: this.roundQty(Math.max(0, requiredQty - availableQty)),
        sourceWarehouseId,
        sourceWarehouseCode: sourceWarehouse?.code,
        availableLots,
      };
    });
  }

  /**
   * Crée les transferts de dotation vers l'atelier à partir des besoins réels d'un OF.
   * Un transfert est créé par magasin source ; les lots ne sont jamais fusionnés.
   */
  public createTransferFromWorkOrder(workOrderId: string, notes?: string): StockTransfer[] {
    const workOrder = this.db.workOrders.find(w => w.id === workOrderId);
    if (!workOrder) throw new Error('Ordre de fabrication introuvable.');
    const productionWarehouse =
      this.findWarehouseByType('PRODUCTION') || this.findWarehouseByType('MATIERES_PREMIERES');
    if (!productionWarehouse) throw new Error('Aucun magasin de production configuré.');

    const requirements = this.getWorkOrderMaterialRequirements(workOrderId);
    const linesByWarehouse = new Map<string, TransferLineInput[]>();
    for (const requirement of requirements) {
      let remaining = requirement.shortageQty > 0 ? requirement.shortageQty : requirement.requiredQty;
      for (const lot of requirement.availableLots) {
        if (remaining <= 0.0001) break;
        if (lot.warehouseId === productionWarehouse.id) continue;
        const qty = this.roundQty(Math.min(remaining, lot.quantity));
        if (qty <= 0) continue;
        const list = linesByWarehouse.get(lot.warehouseId) || [];
        list.push({
          itemId: requirement.itemId,
          lotId: lot.lotId,
          lotNumber: lot.lotNumber,
          requestedQty: qty,
          sourceLocationId: lot.locationId,
          destinationLocationId: this.getDefaultLocation(productionWarehouse.id)?.id,
        });
        linesByWarehouse.set(lot.warehouseId, list);
        remaining = this.roundQty(remaining - qty);
      }
    }
    if (linesByWarehouse.size === 0) {
      throw new Error('Aucun stock disponible ne permet de constituer une dotation pour cet OF.');
    }
    const transfers: StockTransfer[] = [];
    linesByWarehouse.forEach((lines, sourceWarehouseId) => {
      transfers.push(
        this.createTransfer({
          type: 'INTER_MAGASIN',
          sourceWarehouseId,
          destinationWarehouseId: productionWarehouse.id,
          reason: `Dotation matières pour OF ${workOrder.orderNumber}`,
          workOrderId: workOrder.id,
          notes,
          lines,
        })
      );
    });
    return transfers;
  }

  public getWorkOrderDeliveries(workOrderId: string): StockTransfer[] {
    return this.getTransfers({ workOrderId });
  }

  // --- Décision qualité sur un lot (auditée et historisée) ---

  public changeLotQualityStatus(
    lotId: string,
    newStatus: StockQualityStatus,
    reason: string,
    destinationWarehouseId?: string
  ): StockLot {
    this.assertWarehousePermission('STOCK_REGULARIZE', 'changer le statut qualité d\'un lot');
    if (!reason?.trim()) throw new Error('Un motif formel est obligatoire pour changer le statut qualité d\'un lot.');
    const lot = this.db.stockLots.find(l => l.id === lotId);
    if (!lot) throw new Error('Lot introuvable.');
    if (lot.qualityStatus === newStatus) return lot;
    const item = this.db.items.find(i => i.id === lot.itemId);
    if (!item) throw new Error('Article du lot introuvable.');

    const rows = this.db.warehouseStocks.filter(row => row.lotId === lot.id);
    if (rows.length === 0) {
      this.recordLotQualityChange(lot, newStatus, reason.trim());
      this.logAudit({
        action: newStatus === 'LIBERE' ? 'RELEASE' : 'BLOCK',
        entity: 'StockLot',
        entityId: lot.id,
        newValues: `Statut qualité ${newStatus} (aucun stock physique)`,
        motive: reason.trim(),
      });
      this.saveDatabase(this.db);
      return lot;
    }

    let destinationWarehouse = destinationWarehouseId
      ? this.getWarehouseById(destinationWarehouseId)
      : undefined;
    if (!destinationWarehouse) {
      const currentWarehouse = this.getWarehouseById(rows[0].warehouseId);
      if (newStatus === 'LIBERE') {
        destinationWarehouse =
          currentWarehouse &&
          (currentWarehouse.type === 'QUARANTAINE' || currentWarehouse.type === 'NON_CONFORMES')
            ? this.defaultWarehouseForCategory(item.category) || currentWarehouse
            : currentWarehouse;
      } else if (newStatus === 'QUARANTAINE' || newStatus === 'EN_ATTENTE_CONTROLE') {
        destinationWarehouse =
          currentWarehouse?.type === 'QUARANTAINE'
            ? currentWarehouse
            : this.findWarehouseByType('QUARANTAINE') || currentWarehouse;
      } else if (
        newStatus === 'BLOQUE' ||
        newStatus === 'REJETE' ||
        newStatus === 'NON_CONFORME'
      ) {
        destinationWarehouse =
          currentWarehouse &&
          (currentWarehouse.type === 'NON_CONFORMES' || currentWarehouse.type === 'QUARANTAINE')
            ? currentWarehouse
            : this.findWarehouseByType('NON_CONFORMES') ||
              this.findWarehouseByType('QUARANTAINE') ||
              currentWarehouse;
      } else {
        destinationWarehouse = currentWarehouse;
      }
    }
    if (!destinationWarehouse) throw new Error('Magasin de destination introuvable.');

    this.relocateLotStock({
      lotId: lot.id,
      destinationWarehouseId: destinationWarehouse.id,
      newStatus,
      reason: reason.trim(),
      documentNumber: `QUAL-${Date.now()}`,
    });
    this.logAudit({
      action: newStatus === 'LIBERE' ? 'RELEASE' : 'BLOCK',
      entity: 'StockLot',
      entityId: lot.id,
      newValues: `Statut qualité ${newStatus} — magasin ${destinationWarehouse.code}`,
      motive: reason.trim(),
    });
    this.saveDatabase(this.db);
    return lot;
  }

  // ==========================================================================
  // SERVICE APPROVISIONNEMENT — DEMANDES, CIRCUIT, BUDGETS, RÉAPPROVISIONNEMENT
  // ==========================================================================

  public getProcurementPermissions(user: User = this.currentUser): ProcurementPermission[] {
    const staticPerms = PROCUREMENT_ROLE_PERMISSIONS[user.role] || [];
    const role = this.db.roles.find(r => r.roleKey === user.role && r.isActive);
    const dynamicPerms = (role?.permissions || []).filter(p => p.startsWith('PR_') || p.startsWith('SUPPLIER_') || p.startsWith('BUDGET_') || p.startsWith('PROCUREMENT_')) as ProcurementPermission[];
    return Array.from(new Set([...staticPerms, ...dynamicPerms]));
  }

  public canProcurement(permission: ProcurementPermission, user: User = this.currentUser): boolean {
    return this.getProcurementPermissions(user).includes(permission);
  }

  public assertProcurement(permission: ProcurementPermission, action: string) {
    if (!this.canProcurement(permission)) {
      throw new Error(
        `Habilitation insuffisante : « ${PROCUREMENT_PERMISSION_LABELS[permission]} » est requise pour ${action}. Profil ${this.currentUser.role}.`
      );
    }
  }

  // --- Paramètres du module ---

  public getProcurementSettings(): ProcurementSettings {
    return this.db.procurementSettings;
  }

  public updateProcurementSettings(updates: Partial<ProcurementSettings>): ProcurementSettings {
    if (!['ADMIN', 'DIRECTEUR_USINE'].includes(this.currentUser.role)) {
      throw new Error('Seuls l\'Administrateur et la Direction peuvent modifier les paramètres du module.');
    }
    const settings = this.db.procurementSettings;
    const steps = updates.approvalSteps ?? settings.approvalSteps;
    if (!Array.isArray(steps) || steps.length === 0) {
      throw new Error('Le circuit de validation doit comporter au moins une étape.');
    }
    steps.forEach((step, index) => {
      if (!step.label?.trim()) throw new Error(`Étape ${index + 1} : le libellé est obligatoire.`);
      if (!step.role) throw new Error(`Étape ${index + 1} : le profil validateur est obligatoire.`);
      if (step.minAmountDzd !== undefined && step.minAmountDzd < 0) {
        throw new Error(`Étape ${index + 1} : le seuil minimum doit être positif.`);
      }
      if (
        step.minAmountDzd !== undefined &&
        step.maxAmountDzd !== undefined &&
        step.maxAmountDzd < step.minAmountDzd
      ) {
        throw new Error(`Étape ${index + 1} : le seuil maximum est inférieur au seuil minimum.`);
      }
    });
    const multiplier = updates.targetStockMultiplier ?? settings.targetStockMultiplier;
    if (!Number.isFinite(multiplier) || multiplier <= 1) {
      throw new Error('Le multiplicateur de stock cible doit être supérieur à 1.');
    }
    const tolerance = updates.maxOverReceptionPercent ?? settings.maxOverReceptionPercent;
    if (!Number.isFinite(tolerance) || tolerance < 0) {
      throw new Error('La tolérance d\'excédent de réception doit être positive ou nulle.');
    }

    this.db.procurementSettings = {
      ...settings,
      ...updates,
      approvalSteps: steps.map((step, index) => ({ ...step, order: index + 1 })),
      updatedAt: this.nowIso(),
      updatedBy: `${this.currentUser.name} (${this.currentUser.role})`,
    };
    this.logAudit({
      action: 'UPDATE',
      entity: 'ProcurementSettings',
      entityId: 'PROCUREMENT',
      newValues: `Circuit de validation (${steps.length} étape(s)), cible ×${this.db.procurementSettings.targetStockMultiplier}, tolérance ${this.db.procurementSettings.maxOverReceptionPercent}%`,
      motive: 'Paramétrage du service Approvisionnement',
    });
    this.saveDatabase(this.db);
    return this.db.procurementSettings;
  }

  // --- Numérotation & circuit applicable ---

  private nextProcurementNumber(prefix: string, existing: string[]): string {
    const year = new Date().getFullYear();
    const pattern = new RegExp(`^${prefix}-${year}-(\\d+)$`);
    const used = existing
      .map(number => pattern.exec(number)?.[1])
      .filter((value): value is string => Boolean(value))
      .map(Number);
    const next = (used.length > 0 ? Math.max(...used) : 0) + 1;
    return `${prefix}-${year}-${String(next).padStart(4, '0')}`;
  }

  /** Étapes applicables à un montant donné (seuils facultatifs). */
  public getApplicableApprovalSteps(amountDzd: number): ApprovalStep[] {
    return [...this.db.procurementSettings.approvalSteps]
      .sort((a, b) => a.order - b.order)
      .filter(step => {
        if (step.minAmountDzd !== undefined && amountDzd < step.minAmountDzd) return false;
        if (step.maxAmountDzd !== undefined && amountDzd > step.maxAmountDzd) return false;
        return true;
      });
  }

  // --- Demandes d'achat ---

  public getPurchaseRequests(filter?: {
    status?: PurchaseRequestStatus;
    department?: ProcurementDepartment;
    priority?: PurchasePriority;
    search?: string;
    source?: 'MANUELLE' | 'AUTOMATIQUE';
  }): PurchaseRequest[] {
    const needle = filter?.search?.trim().toLowerCase();
    return this.db.purchaseRequests
      .filter(pr => !filter?.status || pr.status === filter.status)
      .filter(pr => !filter?.department || pr.department === filter.department)
      .filter(pr => !filter?.priority || pr.priority === filter.priority)
      .filter(pr => !filter?.source || pr.source === filter.source)
      .filter(pr => {
        if (!needle) return true;
        return `${pr.requestNumber} ${pr.department} ${pr.createdBy} ${pr.justification} ${pr.lines
          .map(line => `${line.itemCode} ${line.designation}`)
          .join(' ')}`
          .toLowerCase()
          .includes(needle);
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  public getPurchaseRequest(id: string): PurchaseRequest | undefined {
    return this.db.purchaseRequests.find(pr => pr.id === id);
  }

  /** Lignes normalisées : l'article et son unité font foi, jamais la saisie libre. */
  private buildPurchaseRequestLines(lines: PurchaseRequestLine[]): PurchaseRequestLine[] {
    if (!Array.isArray(lines) || lines.length === 0) {
      throw new Error('La demande d\'achat doit contenir au moins une ligne d\'article.');
    }
    return lines.map((line, index) => {
      const item =
        this.getItemById(line.itemId) || this.db.items.find(i => i.code === line.itemCode);
      if (!item) throw new Error(`Ligne ${index + 1} : article introuvable dans le référentiel.`);
      if (!this.isItemActive(item)) {
        throw new Error(
          `Ligne ${index + 1} : l'article ${item.code} est inactif et ne peut plus être commandé.`
        );
      }
      const quantity = Number(line.quantity);
      if (!Number.isFinite(quantity) || quantity <= 0) {
        throw new Error(`Ligne ${index + 1} : la quantité demandée doit être strictement positive.`);
      }
      const estimated = Number(line.estimatedUnitPriceDzd);
      const available = this.getConsolidatedStockForItem(item.id)?.available ?? 0;
      return {
        id: line.id || this.newId('PRL'),
        itemId: item.id,
        itemCode: item.code,
        designation: item.designation,
        category: item.category,
        quantity: this.roundQty(quantity),
        unit: line.unit || item.unit,
        packagingQuantity:
          line.packagingQuantity !== undefined && Number(line.packagingQuantity) > 0
            ? Number(line.packagingQuantity)
            : undefined,
        packagingUnit: line.packagingUnit,
        availableQtyAtCreation: available,
        reason: line.reason?.trim() || undefined,
        desiredDate: line.desiredDate || undefined,
        notes: line.notes?.trim() || undefined,
        estimatedUnitPriceDzd:
          Number.isFinite(estimated) && estimated > 0 ? estimated : undefined,
      };
    });
  }

  private computePurchaseRequestTotal(lines: PurchaseRequestLine[]): number {
    return this.roundQty(
      lines.reduce((total, line) => total + line.quantity * (line.estimatedUnitPriceDzd || 0), 0)
    );
  }

  public createPurchaseRequest(input: {
    department: ProcurementDepartment;
    serviceManager?: string;
    type: PurchaseRequestType;
    priority: PurchasePriority;
    justification: string;
    desiredDate?: string;
    destinationWarehouseId?: string;
    costCenter?: string;
    project?: string;
    observations?: string;
    attachments?: string[];
    lines: PurchaseRequestLine[];
    source?: 'MANUELLE' | 'AUTOMATIQUE';
    linkedWorkOrderId?: string;
  }): PurchaseRequest {
    this.assertProcurement('PR_CREATE', 'créer une demande d\'achat');
    const justification = (input.justification || '').trim();
    if (justification.length < 5) {
      throw new Error('La justification de la demande est obligatoire (5 caractères minimum).');
    }
    const lines = this.buildPurchaseRequestLines(input.lines);
    const now = this.nowIso();
    const request: PurchaseRequest = {
      id: this.newId('PR'),
      requestNumber: this.nextProcurementNumber(
        'DA',
        this.db.purchaseRequests.map(pr => pr.requestNumber)
      ),
      createdAt: now,
      createdById: this.currentUser.id,
      createdBy: this.currentUser.name,
      requesterName: this.currentUser.name,
      department: input.department,
      serviceManager: input.serviceManager?.trim() || undefined,
      type: input.type,
      priority: input.priority,
      justification,
      desiredDate: input.desiredDate || undefined,
      destinationWarehouseId: input.destinationWarehouseId || undefined,
      costCenter: input.costCenter?.trim() || undefined,
      project: input.project?.trim() || undefined,
      observations: input.observations?.trim() || undefined,
      attachments: input.attachments ?? [],
      lines,
      estimatedTotalDzd: this.computePurchaseRequestTotal(lines),
      status: 'BROUILLON',
      approvalCircuit: [],
      currentStepIndex: 0,
      approvalHistory: [],
      source: input.source || 'MANUELLE',
      linkedWorkOrderId: input.linkedWorkOrderId,
    };
    this.db.purchaseRequests.unshift(request);
    this.logAudit({
      action: 'CREATE',
      entity: 'PurchaseRequest',
      entityId: request.id,
      newValues: `Création demande ${request.requestNumber} — ${request.department} — ${lines.length} ligne(s) — ${request.estimatedTotalDzd} DZD (${request.source})`,
      motive: justification,
    });
    this.saveDatabase(this.db);
    return request;
  }

  /** Modification autorisée uniquement tant que la demande n'est pas validée. */
  public updatePurchaseRequest(
    id: string,
    updates: Partial<Pick<
      PurchaseRequest,
      | 'department' | 'serviceManager' | 'type' | 'priority' | 'justification'
      | 'desiredDate' | 'destinationWarehouseId' | 'costCenter' | 'project'
      | 'observations' | 'attachments'
    >> & { lines?: PurchaseRequestLine[] }
  ): PurchaseRequest {
    this.assertProcurement('PR_EDIT', 'modifier une demande d\'achat');
    const request = this.getPurchaseRequest(id);
    if (!request) throw new Error('Demande d\'achat introuvable.');
    if (!['BROUILLON', 'RETOURNEE'].includes(request.status)) {
      throw new Error(
        `Modification impossible : la demande ${request.requestNumber} est au statut « ${request.status} ».`
      );
    }
    if (updates.justification !== undefined && updates.justification.trim().length < 5) {
      throw new Error('La justification de la demande est obligatoire (5 caractères minimum).');
    }
    const lines = updates.lines ? this.buildPurchaseRequestLines(updates.lines) : request.lines;
    Object.assign(request, updates, {
      lines,
      estimatedTotalDzd: this.computePurchaseRequestTotal(lines),
    });
    this.logAudit({
      action: 'UPDATE',
      entity: 'PurchaseRequest',
      entityId: id,
      newValues: `Mise à jour demande ${request.requestNumber} — ${lines.length} ligne(s) — ${request.estimatedTotalDzd} DZD`,
    });
    this.saveDatabase(this.db);
    return request;
  }

  /** Budget disponible pour un service et un groupe d'articles (undefined = aucun budget défini). */
  public getBudgetRemaining(
    department: ProcurementDepartment,
    categoryGroup?: ItemCategoryGroup,
    fiscalYear = new Date().getFullYear()
  ): number | undefined {
    const budget = this.db.procurementBudgets.find(
      b =>
        b.fiscalYear === fiscalYear &&
        b.department === department &&
        b.isActive &&
        (categoryGroup ? b.categoryGroup === categoryGroup : !b.categoryGroup)
    );
    if (!budget) return undefined;
    return this.getBudgetStatus(budget).availableDzd;
  }

  private assertBudgetForRequest(request: PurchaseRequest) {
    const groups = Array.from(new Set(request.lines.map(line => groupForCategory(line.category))));
    const hasBudget = this.db.procurementBudgets.some(
      budget =>
        budget.fiscalYear === new Date(request.createdAt).getFullYear() &&
        budget.department === request.department &&
        budget.isActive
    );
    if (!hasBudget) return;
    for (const group of groups) {
      const amountForGroup = request.lines
        .filter(line => groupForCategory(line.category) === group)
        .reduce((total, line) => total + line.quantity * (line.estimatedUnitPriceDzd || 0), 0);
      const remaining =
        this.getBudgetRemaining(request.department, group, new Date(request.createdAt).getFullYear()) ??
        this.getBudgetRemaining(request.department, undefined, new Date(request.createdAt).getFullYear());
      if (remaining !== undefined && amountForGroup > remaining) {
        throw new Error(
          `Budget insuffisant pour ${request.department} / ${group} : ${this.roundQty(amountForGroup)} DZD demandés pour ${this.roundQty(remaining)} DZD disponibles. Augmentez le budget ou réduisez la demande.`
        );
      }
    }
  }

  public submitPurchaseRequest(id: string): PurchaseRequest {
    this.assertProcurement('PR_SUBMIT', 'soumettre une demande d\'achat');
    const request = this.getPurchaseRequest(id);
    if (!request) throw new Error('Demande d\'achat introuvable.');
    if (!['BROUILLON', 'RETOURNEE'].includes(request.status)) {
      throw new Error(
        `Soumission impossible : la demande ${request.requestNumber} est au statut « ${request.status} ».`
      );
    }
    if (request.lines.length === 0) {
      throw new Error('Soumission impossible : la demande ne contient aucune ligne.');
    }
    const circuit = this.getApplicableApprovalSteps(request.estimatedTotalDzd);
    if (circuit.length === 0) {
      throw new Error(
        'Aucune étape de validation ne s\'applique à ce montant : vérifiez les seuils du circuit dans les paramètres du module.'
      );
    }
    this.assertBudgetForRequest(request);

    request.approvalCircuit = circuit;
    request.currentStepIndex = 0;
    request.status = 'EN_VALIDATION';
    request.submittedAt = this.nowIso();
    request.decidedAt = undefined;

    this.logAudit({
      action: 'VALIDATE',
      entity: 'PurchaseRequest',
      entityId: id,
      oldValues: `Statut: ${request.status}`,
      newValues: `Demande ${request.requestNumber} soumise — circuit de ${circuit.length} étape(s) : ${circuit.map(s => s.label).join(' → ')}`,
      motive: 'Soumission à validation',
    });
    this.saveDatabase(this.db);
    return request;
  }

  /**
   * Décision sur l'étape courante. Le profil doit correspondre à l'étape du
   * circuit : un utilisateur ne peut pas valider une étape qui ne lui incombe pas.
   */
  public decidePurchaseRequest(
    id: string,
    decision: ApprovalDecisionKind,
    comment?: string
  ): PurchaseRequest {
    this.assertProcurement(
      decision === 'APPROUVE' ? 'PR_VALIDATE' : 'PR_REFUSE',
      decision === 'APPROUVE' ? 'valider une demande' : 'refuser ou retourner une demande'
    );
    const request = this.getPurchaseRequest(id);
    if (!request) throw new Error('Demande d\'achat introuvable.');
    if (request.status !== 'EN_VALIDATION') {
      throw new Error(`La demande ${request.requestNumber} n'est pas en cours de validation.`);
    }
    const step = request.approvalCircuit[request.currentStepIndex];
    if (!step) throw new Error('Aucune étape de validation en cours.');

    const user = this.currentUser;
    const isSuperUser = user.role === 'ADMIN';
    if (!isSuperUser && user.role !== step.role) {
      throw new Error(
        `Étape « ${step.label} » réservée au profil ${getRoleLabel(step.role)} : le profil ${getRoleLabel(user.role)} ne peut pas statuer.`
      );
    }
    if (decision !== 'APPROUVE' && !comment?.trim()) {
      throw new Error('Un motif est obligatoire pour refuser ou retourner une demande.');
    }

    const entry: ApprovalDecision = {
      id: this.newId('APD'),
      stepIndex: request.currentStepIndex,
      stepLabel: step.label,
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      decision,
      comment: comment?.trim() || undefined,
      timestamp: this.nowIso(),
    };
    request.approvalHistory.push(entry);

    if (decision === 'APPROUVE') {
      if (request.currentStepIndex < request.approvalCircuit.length - 1) {
        request.currentStepIndex += 1;
      } else {
        request.status = 'VALIDEE';
        request.decidedAt = this.nowIso();
      }
    } else if (decision === 'REFUSE') {
      request.status = 'REFUSEE';
      request.decidedAt = this.nowIso();
    } else {
      request.status = 'RETOURNEE';
      request.currentStepIndex = 0;
    }

    this.logAudit({
      action: decision === 'APPROUVE' ? 'VALIDATE' : 'BLOCK',
      entity: 'PurchaseRequest',
      entityId: id,
      oldValues: `Étape ${step.order} : ${step.label}`,
      newValues: `Décision ${decision} par ${user.name} (${user.role}) — statut ${request.status}`,
      motive: comment?.trim() || 'Décision de validation',
    });
    this.saveDatabase(this.db);
    return request;
  }

  public cancelPurchaseRequest(id: string, reason: string): PurchaseRequest {
    this.assertProcurement('PR_CANCEL', 'annuler une demande d\'achat');
    const request = this.getPurchaseRequest(id);
    if (!request) throw new Error('Demande d\'achat introuvable.');
    if (!['BROUILLON', 'EN_VALIDATION', 'VALIDEE', 'RETOURNEE', 'REFUSEE'].includes(request.status)) {
      throw new Error(
        `Annulation impossible : la demande ${request.requestNumber} est déjà engagée (${request.status}).`
      );
    }
    const motive = (reason || '').trim();
    if (motive.length < 5) throw new Error('Un motif d\'annulation circonstancié est obligatoire.');
    const previous = request.status;
    request.status = 'ANNULEE';
    request.cancelReason = motive;
    request.decidedAt = this.nowIso();
    this.logAudit({
      action: 'UPDATE',
      entity: 'PurchaseRequest',
      entityId: id,
      oldValues: `Statut: ${previous}`,
      newValues: `Demande ${request.requestNumber} annulée`,
      motive,
    });
    this.saveDatabase(this.db);
    return request;
  }

  // --- Budgets ---

  public getProcurementBudgets(fiscalYear?: number): ProcurementBudget[] {
    return this.db.procurementBudgets
      .filter(budget => !fiscalYear || budget.fiscalYear === fiscalYear)
      .sort(
        (a, b) =>
          b.fiscalYear - a.fiscalYear ||
          a.department.localeCompare(b.department) ||
          (a.categoryGroup || '').localeCompare(b.categoryGroup || '')
      );
  }

  private static readonly ENGAGED_STATUSES: PurchaseRequestStatus[] = [
    'VALIDEE',
    'EN_CONSULTATION',
    'COMMANDEE',
    'PARTIELLEMENT_COMMANDEE',
    'CLOTUREE',
  ];

  public getBudgetStatus(budget: ProcurementBudget): ProcurementBudgetStatus {
    const engaged = this.db.purchaseRequests
      .filter(
        request =>
          StorageService.ENGAGED_STATUSES.includes(request.status) &&
          request.department === budget.department &&
          new Date(request.createdAt).getFullYear() === budget.fiscalYear
      )
      .reduce((total, request) => {
        if (!budget.categoryGroup) return total + request.estimatedTotalDzd;
        return (
          total +
          request.lines
            .filter(line => groupForCategory(line.category) === budget.categoryGroup)
            .reduce((sum, line) => sum + line.quantity * (line.estimatedUnitPriceDzd || 0), 0)
        );
      }, 0);
    const engagedDzd = this.roundQty(engaged);
    const availableDzd = this.roundQty(budget.amountDzd - engagedDzd);
    return {
      budget,
      engagedDzd,
      availableDzd,
      usagePercent: budget.amountDzd > 0 ? Number(((engagedDzd / budget.amountDzd) * 100).toFixed(1)) : 0,
      isExceeded: engagedDzd > budget.amountDzd,
    };
  }

  public getBudgetOverview(fiscalYear = new Date().getFullYear()): ProcurementBudgetStatus[] {
    return this.getProcurementBudgets(fiscalYear).map(budget => this.getBudgetStatus(budget));
  }

  public addProcurementBudget(input: {
    fiscalYear: number;
    department: ProcurementDepartment;
    categoryGroup?: ItemCategoryGroup;
    amountDzd: number;
    notes?: string;
  }): ProcurementBudget {
    this.assertProcurement('BUDGET_MANAGE', 'créer un budget');
    const amount = Number(input.amountDzd);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error('Le montant du budget doit être strictement positif.');
    }
    const duplicate = this.db.procurementBudgets.find(
      budget =>
        budget.fiscalYear === input.fiscalYear &&
        budget.department === input.department &&
        budget.categoryGroup === (input.categoryGroup || undefined) &&
        budget.isActive
    );
    if (duplicate) {
      throw new Error(
        'Un budget actif existe déjà pour cet exercice, ce service et cette catégorie. Modifiez-le plutôt que d\'en créer un second.'
      );
    }
    const budget: ProcurementBudget = {
      id: this.newId('BUD'),
      fiscalYear: input.fiscalYear,
      department: input.department,
      categoryGroup: input.categoryGroup || undefined,
      amountDzd: this.roundQty(amount),
      isActive: true,
      notes: input.notes?.trim() || undefined,
      createdAt: this.nowIso(),
      createdBy: `${this.currentUser.name} (${this.currentUser.role})`,
    };
    this.db.procurementBudgets.push(budget);
    this.logAudit({
      action: 'CREATE',
      entity: 'ProcurementBudget',
      entityId: budget.id,
      newValues: `Budget ${budget.fiscalYear} — ${budget.department} — ${budget.categoryGroup || 'toutes catégories'} — ${budget.amountDzd} DZD`,
    });
    this.saveDatabase(this.db);
    return budget;
  }

  public updateProcurementBudget(
    id: string,
    updates: Partial<Pick<ProcurementBudget, 'amountDzd' | 'isActive' | 'notes'>>
  ): ProcurementBudget {
    this.assertProcurement('BUDGET_MANAGE', 'modifier un budget');
    const budget = this.db.procurementBudgets.find(b => b.id === id);
    if (!budget) throw new Error('Budget introuvable.');
    const old = `${budget.amountDzd} DZD (${budget.isActive ? 'actif' : 'inactif'})`;
    if (updates.amountDzd !== undefined) {
      const amount = Number(updates.amountDzd);
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error('Le montant du budget doit être strictement positif.');
      }
      budget.amountDzd = this.roundQty(amount);
    }
    if (updates.isActive !== undefined) budget.isActive = updates.isActive;
    if (updates.notes !== undefined) budget.notes = updates.notes.trim() || undefined;
    this.logAudit({
      action: 'UPDATE',
      entity: 'ProcurementBudget',
      entityId: id,
      oldValues: old,
      newValues: `${budget.amountDzd} DZD (${budget.isActive ? 'actif' : 'inactif'})`,
    });
    this.saveDatabase(this.db);
    return budget;
  }

  // --- Réapprovisionnement automatique ---

  /**
   * Besoins de réapprovisionnement calculés sur les stocks réels :
   * quantité proposée = stock cible − disponible − déjà engagé, jamais négative.
   */
  public getReplenishmentProposals(): ReplenishmentProposal[] {
    const settings = this.db.procurementSettings;
    const openStatuses: PurchaseRequestStatus[] = ['EN_VALIDATION', 'VALIDEE', 'EN_CONSULTATION'];
    const openRequests = this.db.purchaseRequests.filter(pr => openStatuses.includes(pr.status));
    const proposals: ReplenishmentProposal[] = [];

    for (const item of this.getActiveItems()) {
      if (item.minStockLevel <= 0) continue;
      const consolidated = this.getConsolidatedStockForItem(item.id);
      const available = consolidated?.available ?? 0;
      if (available > item.minStockLevel) continue;

      const targetStock =
        item.maxStockLevel && item.maxStockLevel > item.minStockLevel
          ? item.maxStockLevel
          : Math.ceil(item.minStockLevel * settings.targetStockMultiplier);
      const onOrderQty = this.roundQty(
        openRequests
          .flatMap(pr => pr.lines)
          .filter(line => line.itemId === item.id)
          .reduce((total, line) => total + line.quantity, 0)
      );
      const shortage = Math.max(0, this.roundQty(targetStock - available));
      const proposedQty = Math.max(0, this.roundQty(targetStock - available - onOrderQty));
      const covering = openRequests.find(pr => pr.lines.some(line => line.itemId === item.id));
      const supplier = item.primarySupplierId ? this.getSupplier(item.primarySupplierId) : undefined;
      const warehouse = this.getItemDefaultWarehouse(item);

      proposals.push({
        itemId: item.id,
        itemCode: item.code,
        designation: item.designation,
        category: item.category,
        group: item.group,
        unit: item.unit,
        available,
        minStockLevel: item.minStockLevel,
        maxStockLevel: item.maxStockLevel,
        targetStock,
        onOrderQty,
        proposedQty,
        shortage,
        suggestedSupplierId: supplier?.id,
        suggestedSupplierName: supplier?.name,
        suggestedWarehouseId: warehouse?.id,
        suggestedWarehouseCode: warehouse?.code,
        coveredByRequest: covering?.requestNumber,
        reason:
          available <= 0
            ? 'Stock épuisé'
            : `Stock disponible (${this.roundQty(available)} ${item.unit}) inférieur ou égal au seuil (${item.minStockLevel} ${item.unit})`,
      });
    }

    return proposals.sort((a, b) => b.shortage - a.shortage);
  }

  /** Transforme une sélection de propositions en demande d'achat à valider. */
  public createReplenishmentRequest(input: {
    department: ProcurementDepartment;
    items: Array<{ itemId: string; quantity: number; supplierId?: string }>;
    warehouseId?: string;
    priority?: PurchasePriority;
  }): PurchaseRequest {
    this.assertProcurement('PR_CREATE', 'créer une demande de réapprovisionnement');
    const proposals = this.getReplenishmentProposals();
    const lines: PurchaseRequestLine[] = [];
    for (const selection of input.items) {
      const proposal = proposals.find(p => p.itemId === selection.itemId);
      const item = this.getItemById(selection.itemId);
      if (!item) throw new Error('Article introuvable.');
      const quantity = Number(selection.quantity);
      if (!Number.isFinite(quantity) || quantity <= 0) continue;
      lines.push({
        id: this.newId('PRL'),
        itemId: item.id,
        itemCode: item.code,
        designation: item.designation,
        category: item.category,
        quantity: this.roundQty(quantity),
        unit: item.unit,
        availableQtyAtCreation: proposal?.available ?? 0,
        reason: proposal?.reason || 'Réapprovisionnement sur seuil de stock',
      });
    }
    if (lines.length === 0) {
      throw new Error('Aucune ligne à commander : sélectionnez au moins un article avec une quantité positive.');
    }
    return this.createPurchaseRequest({
      department: input.department,
      type: 'REAPPROVISIONNEMENT',
      priority: input.priority || 'NORMALE',
      justification: `Réapprovisionnement automatique : ${lines.length} article(s) sous le seuil de stock minimum.`,
      desiredDate: new Date(Date.now() + this.db.procurementSettings.defaultLeadTimeDays * 86400000)
        .toISOString()
        .slice(0, 10),
      destinationWarehouseId: input.warehouseId,
      lines,
      source: 'AUTOMATIQUE',
    });
  }

  // --- Tableau de bord ---

  public getProcurementDashboard(fiscalYear = new Date().getFullYear()): ProcurementDashboard {
    const requests = this.db.purchaseRequests;
    const inYear = requests.filter(
      request => new Date(request.createdAt).getFullYear() === fiscalYear
    );
    const budgets = this.getBudgetOverview(fiscalYear);
    const proposals = this.getReplenishmentProposals();

    const byStatus = (Object.keys(PURCHASE_REQUEST_STATUS_LABELS) as PurchaseRequestStatus[])
      .map(status => ({ status, count: inYear.filter(r => r.status === status).length }))
      .filter(entry => entry.count > 0);

    const departments = Array.from(
      new Set(inYear.map(request => request.department))
    ) as ProcurementDepartment[];

    return {
      pendingRequests: inYear.filter(r => r.status === 'EN_VALIDATION').length,
      urgentRequests: inYear.filter(
        r =>
          (r.priority === 'URGENTE' || r.priority === 'TRES_URGENTE') &&
          ['BROUILLON', 'EN_VALIDATION', 'VALIDEE'].includes(r.status)
      ).length,
      validatedNotOrdered: inYear.filter(r => r.status === 'VALIDEE').length,
      totalRequests: inYear.length,
      budgetTotalDzd: this.roundQty(budgets.reduce((total, b) => total + b.budget.amountDzd, 0)),
      budgetEngagedDzd: this.roundQty(budgets.reduce((total, b) => total + b.engagedDzd, 0)),
      budgetAvailableDzd: this.roundQty(budgets.reduce((total, b) => total + b.availableDzd, 0)),
      lowStockItems: proposals.length,
      replenishmentProposals: proposals.filter(p => p.proposedQty > 0).length,
      byStatus,
      byDepartment: departments.map(department => ({
        department,
        count: inYear.filter(r => r.department === department).length,
        amountDzd: this.roundQty(
          inYear
            .filter(r => r.department === department && r.status !== 'ANNULEE')
            .reduce((total, r) => total + r.estimatedTotalDzd, 0)
        ),
      })),
      byPriority: (['NORMALE', 'URGENTE', 'TRES_URGENTE'] as PurchasePriority[]).map(priority => ({
        priority,
        count: inYear.filter(r => r.priority === priority).length,
      })),
      topSuppliers: [],
    };
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // CONSULTATIONS FOURNISSEURS, COMPARATIF, COMMANDES, RÉCEPTIONS, CONTRATS
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  public getSupplierConsultations(): SupplierConsultation[] {
    return this.db.supplierConsultations;
  }

  public getSupplierConsultation(id: string): SupplierConsultation | undefined {
    return this.db.supplierConsultations.find(consultation => consultation.id === id);
  }

  /** Met une demande validée en consultation auprès d'un ou plusieurs fournisseurs. */
  public createSupplierConsultation(input: {
    requestId: string;
    invitedSupplierIds: string[];
    deadline: string;
    observations?: string;
  }): SupplierConsultation {
    this.assertProcurement('PR_EDIT', 'lancer une consultation fournisseurs');
    const request = this.getPurchaseRequest(input.requestId);
    if (!request) throw new Error('Demande d\'achat introuvable.');
    if (!['VALIDEE', 'EN_CONSULTATION'].includes(request.status)) {
      throw new Error(
        `La demande ${request.requestNumber} doit être validée avant consultation (statut actuel : ${PURCHASE_REQUEST_STATUS_LABELS[request.status]}).`
      );
    }
    const invited = Array.from(new Set(input.invitedSupplierIds || []));
    if (invited.length === 0) throw new Error('Sélectionnez au moins un fournisseur à consulter.');
    invited.forEach(id => {
      if (!this.db.suppliers.some(supplier => supplier.id === id)) {
        throw new Error('Fournisseur consulté introuvable dans le fichier fournisseurs.');
      }
    });
    if (!input.deadline) throw new Error('La date limite de remise des offres est obligatoire.');
    if (new Date(input.deadline).getTime() < new Date(request.createdAt).getTime()) {
      throw new Error('La date limite ne peut pas précéder la création de la demande.');
    }

    const consultation: SupplierConsultation = {
      id: this.newId('CDF'),
      consultationNumber: this.nextProcurementNumber(
        'CDF',
        this.db.supplierConsultations.map(c => c.consultationNumber)
      ),
      requestId: request.id,
      requestNumber: request.requestNumber,
      createdAt: this.nowIso(),
      createdBy: this.currentUser.name,
      deadline: input.deadline,
      invitedSupplierIds: invited,
      status: 'OUVERTE',
      quotes: [],
      observations: input.observations,
    };

    this.db.supplierConsultations.unshift(consultation);
    request.status = 'EN_CONSULTATION';
    this.logAudit({
      action: 'CREATE',
      entity: 'SupplierConsultation',
      entityId: consultation.id,
      newValues: `Consultation ${consultation.consultationNumber} ouverte pour ${request.requestNumber} — ${invited.length} fournisseur(s) invité(s)`,
      motive: 'Lancement d\'une consultation fournisseurs',
    });
    this.saveDatabase(this.db);
    return consultation;
  }

  /** Enregistre une offre reçue. Les totaux sont recalculés, jamais saisis. */
  public addSupplierQuote(
    consultationId: string,
    input: {
      supplierId: string;
      receivedAt?: string;
      validUntil?: string;
      leadTimeDays: number;
      paymentTermsDays?: number;
      incoterm?: string;
      observations?: string;
      isCompliant?: boolean;
      nonComplianceReason?: string;
      documents?: string[];
      lines: Array<{
        itemId: string;
        quantity: number;
        unitPriceDzd: number;
        discountPercent?: number;
        leadTimeDays?: number;
        observations?: string;
      }>;
    }
  ): SupplierQuote {
    this.assertProcurement('PR_EDIT', 'enregistrer une offre fournisseur');
    const consultation = this.getSupplierConsultation(consultationId);
    if (!consultation) throw new Error('Consultation introuvable.');
    if (consultation.status !== 'OUVERTE') {
      throw new Error('Les offres ne peuvent être saisies que sur une consultation ouverte.');
    }
    if (!consultation.invitedSupplierIds.includes(input.supplierId)) {
      throw new Error('Ce fournisseur n\'a pas été invité à cette consultation.');
    }
    const supplier = this.db.suppliers.find(s => s.id === input.supplierId);
    if (!supplier) throw new Error('Fournisseur introuvable.');
    if (consultation.quotes.some(q => q.supplierId === input.supplierId)) {
      throw new Error(`Une offre de ${supplier.name} est déjà enregistrée pour cette consultation.`);
    }
    if (!input.lines || input.lines.length === 0) {
      throw new Error('Une offre doit comporter au moins une ligne.');
    }
    if (input.leadTimeDays < 0) throw new Error('Le délai annoncé ne peut pas être négatif.');

    const lines: SupplierQuoteLine[] = input.lines.map(line => {
      const item = this.db.items.find(i => i.id === line.itemId);
      if (!item) throw new Error('Article de l\'offre introuvable dans le référentiel.');
      if (line.quantity <= 0) throw new Error(`Quantité invalide pour ${item.code}.`);
      if (line.unitPriceDzd < 0) throw new Error(`Prix unitaire négatif interdit pour ${item.code}.`);
      const discount = Math.min(Math.max(line.discountPercent ?? 0, 0), 100);
      const net = line.quantity * line.unitPriceDzd * (1 - discount / 100);
      return {
        itemId: item.id,
        itemCode: item.code,
        designation: item.designation,
        quantity: this.roundQty(line.quantity),
        unit: item.unit,
        unitPriceDzd: this.roundQty(line.unitPriceDzd),
        discountPercent: discount || undefined,
        lineTotalDzd: this.roundQty(net),
        leadTimeDays: line.leadTimeDays,
        observations: line.observations,
      };
    });

    const quote: SupplierQuote = {
      id: this.newId('OFF'),
      supplierId: supplier.id,
      supplierName: supplier.name,
      receivedAt: input.receivedAt || this.nowIso(),
      validUntil: input.validUntil,
      currency: this.db.procurementSettings.currency,
      lines,
      totalDzd: this.roundQty(lines.reduce((total, line) => total + line.lineTotalDzd, 0)),
      leadTimeDays: Math.round(input.leadTimeDays),
      paymentTermsDays: input.paymentTermsDays ?? supplier.paymentTermsDays,
      incoterm: input.incoterm,
      documents: input.documents,
      isCompliant: input.isCompliant !== false,
      nonComplianceReason: input.isCompliant === false ? input.nonComplianceReason : undefined,
      observations: input.observations,
      createdBy: this.currentUser.name,
    };

    consultation.quotes.push(quote);
    this.logAudit({
      action: 'CREATE',
      entity: 'SupplierQuote',
      entityId: quote.id,
      newValues: `Offre ${supplier.name} — ${this.roundQty(quote.totalDzd)} ${quote.currency} — délai ${quote.leadTimeDays} j (${consultation.consultationNumber})`,
      motive: 'Réception d\'une offre fournisseur',
    });
    this.saveDatabase(this.db);
    return quote;
  }

  public removeSupplierQuote(consultationId: string, quoteId: string): void {
    this.assertProcurement('PR_EDIT', 'supprimer une offre fournisseur');
    const consultation = this.getSupplierConsultation(consultationId);
    if (!consultation) throw new Error('Consultation introuvable.');
    if (consultation.status !== 'OUVERTE') {
      throw new Error('Une offre ne peut être retirée que d\'une consultation ouverte.');
    }
    const index = consultation.quotes.findIndex(q => q.id === quoteId);
    if (index < 0) throw new Error('Offre introuvable.');
    const [removed] = consultation.quotes.splice(index, 1);
    this.logAudit({
      action: 'DELETE',
      entity: 'SupplierQuote',
      entityId: removed.id,
      oldValues: `Offre ${removed.supplierName} — ${removed.totalDzd} ${removed.currency}`,
      motive: 'Retrait d\'une offre fournisseur',
    });
    this.saveDatabase(this.db);
  }

  public closeSupplierConsultation(consultationId: string): SupplierConsultation {
    this.assertProcurement('PR_EDIT', 'clôturer une consultation');
    const consultation = this.getSupplierConsultation(consultationId);
    if (!consultation) throw new Error('Consultation introuvable.');
    if (consultation.status !== 'OUVERTE') throw new Error('Seule une consultation ouverte peut être clôturée.');
    consultation.status = 'CLOTUREE';
    consultation.closedAt = this.nowIso();
    this.logAudit({
      action: 'UPDATE',
      entity: 'SupplierConsultation',
      entityId: consultation.id,
      newValues: `Consultation ${consultation.consultationNumber} clôturée — ${consultation.quotes.length} offre(s)`,
      motive: 'Clôture de la consultation',
    });
    this.saveDatabase(this.db);
    return consultation;
  }

  /** Attribution motivée : la justification est obligatoire (traçabilité achat). */
  public awardSupplierConsultation(
    consultationId: string,
    quoteId: string,
    justification: string
  ): SupplierConsultation {
    this.assertProcurement('PR_VALIDATE', 'attribuer une consultation');
    const consultation = this.getSupplierConsultation(consultationId);
    if (!consultation) throw new Error('Consultation introuvable.');
    if (consultation.status === 'ATTRIBUEE') throw new Error('Cette consultation est déjà attribuée.');
    if (consultation.status === 'ANNULEE') throw new Error('Une consultation annulée ne peut être attribuée.');
    if (!justification?.trim() || justification.trim().length < 10) {
      throw new Error('Une justification d\'attribution d\'au moins 10 caractères est obligatoire.');
    }
    const quote = consultation.quotes.find(q => q.id === quoteId);
    if (!quote) throw new Error('Offre introuvable.');
    if (!quote.isCompliant) {
      throw new Error(`L'offre de ${quote.supplierName} est déclarée non conforme et ne peut être retenue.`);
    }
    consultation.awardedQuoteId = quote.id;
    consultation.awardedSupplierId = quote.supplierId;
    consultation.awardedSupplierName = quote.supplierName;
    consultation.awardJustification = justification.trim();
    consultation.awardedAt = this.nowIso();
    consultation.awardedBy = this.currentUser.name;
    consultation.status = 'ATTRIBUEE';
    consultation.closedAt = consultation.closedAt || this.nowIso();
    this.logAudit({
      action: 'UPDATE',
      entity: 'SupplierConsultation',
      entityId: consultation.id,
      newValues: `Attribution à ${quote.supplierName} — ${this.roundQty(quote.totalDzd)} ${quote.currency}`,
      motive: justification.trim(),
    });
    this.saveDatabase(this.db);
    return consultation;
  }

  public cancelSupplierConsultation(consultationId: string, reason: string): SupplierConsultation {
    this.assertProcurement('PR_CANCEL', 'annuler une consultation');
    const consultation = this.getSupplierConsultation(consultationId);
    if (!consultation) throw new Error('Consultation introuvable.');
    if (!reason?.trim()) throw new Error('Un motif d\'annulation est obligatoire.');
    if (consultation.status === 'ATTRIBUEE') {
      throw new Error('Une consultation déjà attribuée ne peut être annulée.');
    }
    consultation.status = 'ANNULEE';
    consultation.observations = `${consultation.observations ? consultation.observations + ' — ' : ''}Annulée : ${reason.trim()}`;
    this.logAudit({
      action: 'UPDATE',
      entity: 'SupplierConsultation',
      entityId: consultation.id,
      newValues: `Consultation ${consultation.consultationNumber} annulée`,
      motive: reason.trim(),
    });
    this.saveDatabase(this.db);
    return consultation;
  }

  /**
   * Comparatif pondéré : prix 60 %, délai 25 %, conditions de paiement 15 %.
   * Aucune note n'est saisie : tout découle des offres réelles.
   */
  public getQuoteComparison(consultationId: string): Array<{
    quote: SupplierQuote;
    priceScore: number;
    leadTimeScore: number;
    termsScore: number;
    totalScore: number;
    rank: number;
    isCheapest: boolean;
    isFastest: boolean;
    isBestValue: boolean;
  }> {
    const consultation = this.getSupplierConsultation(consultationId);
    if (!consultation || consultation.quotes.length === 0) return [];
    const eligible = consultation.quotes.filter(quote => quote.isCompliant);
    if (eligible.length === 0) return [];
    const minPrice = Math.min(...eligible.map(q => q.totalDzd));
    const minLead = Math.min(...eligible.map(q => Math.max(1, q.leadTimeDays)));
    const maxTerms = Math.max(...eligible.map(q => q.paymentTermsDays ?? 0));

    const scored = eligible.map(quote => {
      const priceScore = quote.totalDzd > 0 ? (minPrice / quote.totalDzd) * 100 : 0;
      const leadTimeScore = (minLead / Math.max(1, quote.leadTimeDays)) * 100;
      const termsScore = maxTerms > 0 ? ((quote.paymentTermsDays ?? 0) / maxTerms) * 100 : 100;
      const totalScore = priceScore * 0.6 + leadTimeScore * 0.25 + termsScore * 0.15;
      return {
        quote,
        priceScore: this.roundQty(priceScore),
        leadTimeScore: this.roundQty(leadTimeScore),
        termsScore: this.roundQty(termsScore),
        totalScore: this.roundQty(totalScore),
        rank: 0,
        isCheapest: quote.totalDzd === minPrice,
        isFastest: quote.leadTimeDays === minLead,
        isBestValue: false,
      };
    });

    scored.sort((a, b) => b.totalScore - a.totalScore);
    scored.forEach((entry, index) => {
      entry.rank = index + 1;
    });
    if (scored.length > 0) scored[0].isBestValue = true;
    return scored;
  }

  // --- Commandes d'achat ---

  public getPurchaseOrders(): PurchaseOrder[] {
    return this.db.purchaseOrders;
  }

  public getPurchaseOrder(id: string): PurchaseOrder | undefined {
    return this.db.purchaseOrders.find(order => order.id === id);
  }

  /** Quantité restant à commander sur une demande (jamais négative). */
  public getRequestRemainingLines(requestId: string): Array<{
    requestLineId: string;
    itemId: string;
    itemCode: string;
    designation: string;
    unit: UnitOfMeasure;
    quantityRequested: number;
    quantityOrdered: number;
    quantityRemaining: number;
  }> {
    const request = this.getPurchaseRequest(requestId);
    if (!request) return [];
    const orderedByLine = new Map<string, number>();
    this.db.purchaseOrders
      .filter(order => order.status !== 'ANNULEE' && order.requestId === requestId)
      .forEach(order => {
        order.lines.forEach(line => {
          if (!line.requestLineId) return;
          orderedByLine.set(
            line.requestLineId,
            (orderedByLine.get(line.requestLineId) || 0) + line.quantityOrdered
          );
        });
      });
    return request.lines.map(line => {
      const ordered = this.roundQty(orderedByLine.get(line.id) || 0);
      return {
        requestLineId: line.id,
        itemId: line.itemId,
        itemCode: line.itemCode,
        designation: line.designation,
        unit: line.unit,
        quantityRequested: line.quantity,
        quantityOrdered: ordered,
        quantityRemaining: Math.max(0, this.roundQty(line.quantity - ordered)),
      };
    });
  }

  public createPurchaseOrder(input: {
    supplierId: string;
    requestId?: string;
    consultationId?: string;
    expectedDate: string;
    deliveryWarehouseId?: string;
    paymentTermsDays?: number;
    incoterm?: string;
    observations?: string;
    lines?: Array<{ itemId: string; quantity: number; unitPriceDzd: number; requestLineId?: string }>;
  }): PurchaseOrder {
    this.assertProcurement('PR_EDIT', 'créer une commande d\'achat');
    const supplier = this.db.suppliers.find(s => s.id === input.supplierId);
    if (!supplier) throw new Error('Fournisseur introuvable.');
    if (!input.expectedDate) throw new Error('La date de livraison prévue est obligatoire.');

    const consultation = input.consultationId
      ? this.getSupplierConsultation(input.consultationId)
      : undefined;
    const request = input.requestId ? this.getPurchaseRequest(input.requestId) : undefined;
    if (input.requestId && !request) throw new Error('Demande d\'achat introuvable.');
    if (request && !['VALIDEE', 'EN_CONSULTATION', 'PARTIELLEMENT_COMMANDEE'].includes(request.status)) {
      throw new Error(
        `La demande ${request.requestNumber} n'est pas commandable (statut : ${PURCHASE_REQUEST_STATUS_LABELS[request.status]}).`
      );
    }

    let rawLines: Array<{ itemId: string; quantity: number; unitPriceDzd: number; requestLineId?: string }> = [];

    if (consultation) {
      if (consultation.status !== 'ATTRIBUEE' || !consultation.awardedQuoteId) {
        throw new Error('La consultation doit être attribuée avant de générer la commande.');
      }
      const quote = consultation.quotes.find(q => q.id === consultation.awardedQuoteId);
      if (!quote) throw new Error('Offre attribuée introuvable.');
      if (quote.supplierId !== supplier.id) {
        throw new Error('Le fournisseur de la commande doit être celui de l\'offre attribuée.');
      }
      rawLines = quote.lines.map(line => ({
        itemId: line.itemId,
        quantity: line.quantity,
        unitPriceDzd: line.unitPriceDzd,
      }));
    } else if (input.lines && input.lines.length > 0) {
      rawLines = input.lines;
    } else if (request) {
      rawLines = this.getRequestRemainingLines(request.id)
        .filter(line => line.quantityRemaining > 0)
        .map(line => ({ itemId: line.itemId, quantity: line.quantityRemaining, unitPriceDzd: 0, requestLineId: line.requestLineId }));
    }

    if (rawLines.length === 0) {
      throw new Error('Aucune ligne à commander : la demande est déjà entièrement commandée.');
    }

    const lines: PurchaseOrderLine[] = rawLines.map(raw => {
      const item = this.db.items.find(i => i.id === raw.itemId);
      if (!item) throw new Error('Article de la commande introuvable.');
      if (!this.isItemActive(item)) {
        throw new Error(`L'article ${item.code} est désactivé : il ne peut plus être commandé.`);
      }
      if (raw.quantity <= 0) throw new Error(`Quantité nulle ou négative interdite pour ${item.code}.`);
      if (raw.unitPriceDzd < 0) throw new Error(`Prix unitaire négatif interdit pour ${item.code}.`);
      return {
        id: this.newId('POL'),
        itemId: item.id,
        itemCode: item.code,
        designation: item.designation,
        quantityOrdered: this.roundQty(raw.quantity),
        quantityReceived: 0,
        unit: item.unit,
        unitPriceDzd: this.roundQty(raw.unitPriceDzd),
        lineTotalDzd: this.roundQty(raw.quantity * raw.unitPriceDzd),
        packaging: item.packaging,
        quantityPerPackaging: item.quantityPerPackaging,
        requestLineId: raw.requestLineId,
      };
    });

    // Rattachement aux lignes de la demande : indispensable pour solder la demande
    // lorsqu'une commande est générée depuis une offre de consultation.
    if (request) {
      const usedRequestLines = new Set<string>(
        lines.map(line => line.requestLineId).filter((id): id is string => Boolean(id))
      );
      lines.forEach(line => {
        if (line.requestLineId) return;
        const match = request.lines.find(
          requestLine => requestLine.itemId === line.itemId && !usedRequestLines.has(requestLine.id)
        );
        if (match) {
          line.requestLineId = match.id;
          usedRequestLines.add(match.id);
        }
      });
    }

    const order: PurchaseOrder = {
      id: this.newId('CMD'),
      orderNumber: this.nextProcurementNumber('CMD', this.db.purchaseOrders.map(o => o.orderNumber)),
      supplierId: supplier.id,
      supplierName: supplier.name,
      requestId: request?.id,
      requestNumber: request?.requestNumber,
      consultationId: consultation?.id,
      createdAt: this.nowIso(),
      createdBy: this.currentUser.name,
      orderDate: this.nowIso(),
      expectedDate: input.expectedDate,
      status: 'EMISE',
      lines,
      totalDzd: this.roundQty(lines.reduce((total, line) => total + line.lineTotalDzd, 0)),
      currency: this.db.procurementSettings.currency,
      paymentTermsDays: input.paymentTermsDays ?? supplier.paymentTermsDays ?? this.db.procurementSettings.defaultPaymentTermsDays,
      deliveryWarehouseId: input.deliveryWarehouseId,
      incoterm: input.incoterm,
      observations: input.observations,
    };

    this.db.purchaseOrders.unshift(order);

    if (request) {
      const remaining = this.getRequestRemainingLines(request.id);
      const fullyOrdered = remaining.every(line => line.quantityRemaining <= 0);
      request.status = fullyOrdered ? 'COMMANDEE' : 'PARTIELLEMENT_COMMANDEE';
    }

    this.logAudit({
      action: 'CREATE',
      entity: 'PurchaseOrder',
      entityId: order.id,
      newValues: `Commande ${order.orderNumber} — ${supplier.name} — ${order.totalDzd} ${order.currency} — ${lines.length} ligne(s)`,
      motive: request ? `Commande issue de la demande ${request.requestNumber}` : 'Commande d\'achat créée',
    });
    this.saveDatabase(this.db);
    return order;
  }

  public confirmPurchaseOrder(orderId: string): PurchaseOrder {
    this.assertProcurement('PR_EDIT', 'confirmer une commande');
    const order = this.getPurchaseOrder(orderId);
    if (!order) throw new Error('Commande introuvable.');
    if (order.status !== 'EMISE') {
      throw new Error('Seule une commande émise peut être confirmée par le fournisseur.');
    }
    order.status = 'CONFIRMEE';
    order.confirmedAt = this.nowIso();
    this.logAudit({
      action: 'UPDATE',
      entity: 'PurchaseOrder',
      entityId: order.id,
      newValues: `Commande ${order.orderNumber} confirmée`,
      motive: 'Confirmation de commande par le fournisseur',
    });
    this.saveDatabase(this.db);
    return order;
  }

  public cancelPurchaseOrder(orderId: string, reason: string): PurchaseOrder {
    this.assertProcurement('PR_CANCEL', 'annuler une commande');
    const order = this.getPurchaseOrder(orderId);
    if (!order) throw new Error('Commande introuvable.');
    if (!reason?.trim()) throw new Error('Un motif d\'annulation est obligatoire.');
    if (order.lines.some(line => line.quantityReceived > 0)) {
      throw new Error('Une commande partiellement réceptionnée ne peut être annulée.');
    }
    order.status = 'ANNULEE';
    order.cancelReason = reason.trim();
    order.closedAt = this.nowIso();
    if (order.requestId) {
      const request = this.getPurchaseRequest(order.requestId);
      if (request && request.status !== 'CLOTUREE') request.status = 'VALIDEE';
    }
    this.logAudit({
      action: 'UPDATE',
      entity: 'PurchaseOrder',
      entityId: order.id,
      newValues: `Commande ${order.orderNumber} annulée`,
      motive: reason.trim(),
    });
    this.saveDatabase(this.db);
    return order;
  }

  public closePurchaseOrder(orderId: string, reason: string): PurchaseOrder {
    this.assertProcurement('PR_VALIDATE', 'clôturer une commande');
    const order = this.getPurchaseOrder(orderId);
    if (!order) throw new Error('Commande introuvable.');
    if (!reason?.trim()) throw new Error('Une justification est obligatoire pour clôturer une commande avec reliquat.');
    order.status = 'CLOTUREE';
    order.closedAt = this.nowIso();
    order.observations = `${order.observations ? order.observations + ' — ' : ''}Clôture : ${reason.trim()}`;
    this.logAudit({
      action: 'UPDATE',
      entity: 'PurchaseOrder',
      entityId: order.id,
      newValues: `Commande ${order.orderNumber} clôturée avec reliquat`,
      motive: reason.trim(),
    });
    this.saveDatabase(this.db);
    return order;
  }

  // --- Réceptions d'achat ---

  public getPurchaseReceipts(): PurchaseReceipt[] {
    return this.db.purchaseReceipts;
  }

  public getPurchaseOrderRemaining(orderId: string): Array<{
    line: PurchaseOrderLine;
    remaining: number;
  }> {
    const order = this.getPurchaseOrder(orderId);
    if (!order) return [];
    return order.lines.map(line => ({
      line,
      remaining: Math.max(0, this.roundQty(line.quantityOrdered - line.quantityReceived)),
    }));
  }

  /**
   * Réceptionne une commande. Le stock est créé en mouvement `ENTREE_RECEPTION`,
   * en quarantaine si un contrôle qualité est requis. La tolérance d'excédent
   * est paramétrable et jamais dépassable.
   */
  public createPurchaseReceipt(input: {
    orderId: string;
    warehouseId: string;
    deliveryNoteNumber?: string;
    receivedAt?: string;
    isOnHold?: boolean;
    qualityStatus?: ReceiptQualityStatus;
    observations?: string;
    lines: Array<{
      orderLineId: string;
      quantityReceived: number;
      lotNumber?: string;
      expiryDate?: string;
      locationId?: string;
    }>;
  }): PurchaseReceipt {
    this.assertProcurement('PR_EDIT', 'réceptionner une commande');
    const order = this.getPurchaseOrder(input.orderId);
    if (!order) throw new Error('Commande introuvable.');
    if (!['EMISE', 'CONFIRMEE', 'PARTIELLEMENT_RECUE'].includes(order.status)) {
      throw new Error(
        `La commande ${order.orderNumber} n'est pas réceptionnable (statut : ${PURCHASE_ORDER_STATUS_LABELS[order.status]}).`
      );
    }
    const warehouse = this.getWarehouseById(input.warehouseId);
    if (!warehouse) throw new Error('Magasin de réception introuvable.');

    const tolerance = 1 + this.db.procurementSettings.maxOverReceptionPercent / 100;
    const qualityStatus: ReceiptQualityStatus = input.qualityStatus || (input.isOnHold ? 'EN_ATTENTE' : 'ACCEPTEE');
    const onHold = qualityStatus === 'EN_ATTENTE' || qualityStatus === 'REFUSEE' || input.isOnHold === true;

    const receiptLines: PurchaseReceiptLine[] = [];

    input.lines.forEach(raw => {
      if (!raw.quantityReceived || raw.quantityReceived <= 0) return;
      const orderLine = order.lines.find(line => line.id === raw.orderLineId);
      if (!orderLine) throw new Error('Ligne de commande introuvable.');
      const remaining = this.roundQty(orderLine.quantityOrdered - orderLine.quantityReceived);
      const maxAllowed = this.roundQty(remaining * tolerance);
      if (raw.quantityReceived > maxAllowed) {
        throw new Error(
          `Excédent refusé pour ${orderLine.itemCode} : ${raw.quantityReceived} reçu(s) pour ${remaining} attendu(s), tolérance ${this.db.procurementSettings.maxOverReceptionPercent}%.`
        );
      }
      // En attente de contrôle, la marchandise est physiquement reçue puis bloquée
      // en quarantaine : seule une réception REFUSEE est rejetée à l'entrée.
      const accepted = qualityStatus === 'REFUSEE' ? 0 : this.roundQty(raw.quantityReceived);
      const rejected = this.roundQty(raw.quantityReceived - accepted);

      receiptLines.push({
        orderLineId: orderLine.id,
        itemId: orderLine.itemId,
        itemCode: orderLine.itemCode,
        designation: orderLine.designation,
        quantityOrdered: orderLine.quantityOrdered,
        quantityReceived: this.roundQty(raw.quantityReceived),
        quantityAccepted: accepted,
        quantityRejected: rejected,
        unit: orderLine.unit,
        lotNumber: raw.lotNumber?.trim() || `LOT-${order.orderNumber}-${orderLine.itemCode}`,
        expiryDate: raw.expiryDate,
        locationId: raw.locationId,
      });
    });

    if (receiptLines.length === 0) {
      throw new Error('Saisissez au moins une quantité reçue supérieure à zéro.');
    }

    const receipt: PurchaseReceipt = {
      id: this.newId('REC'),
      receiptNumber: this.nextProcurementNumber('REC', this.db.purchaseReceipts.map(r => r.receiptNumber)),
      orderId: order.id,
      orderNumber: order.orderNumber,
      supplierId: order.supplierId,
      supplierName: order.supplierName,
      receivedAt: input.receivedAt || this.nowIso(),
      receivedBy: this.currentUser.name,
      deliveryNoteNumber: input.deliveryNoteNumber,
      warehouseId: warehouse.id,
      lines: receiptLines,
      qualityStatus,
      isOnHold: onHold,
      stockMovementsCreated: false,
      observations: input.observations,
    };

    // 1. Mise à jour des quantités reçues sur la commande
    receiptLines.forEach(receiptLine => {
      const orderLine = order.lines.find(line => line.id === receiptLine.orderLineId);
      if (orderLine) {
        orderLine.quantityReceived = this.roundQty(orderLine.quantityReceived + receiptLine.quantityReceived);
      }
    });

    // 2. Mouvements de stock : seules les quantités non rejetées entrent physiquement
    receiptLines.forEach(receiptLine => {
      const quantityToStock = this.roundQty(receiptLine.quantityReceived - receiptLine.quantityRejected);
      if (quantityToStock <= 0) return;
      this.addStockMovement({
        documentNumber: receipt.receiptNumber,
        itemId: receiptLine.itemId,
        itemCode: receiptLine.itemCode,
        batchNumber: receiptLine.lotNumber,
        type: 'ENTREE_RECEPTION',
        quantity: quantityToStock,
        unit: receiptLine.unit,
        destinationWarehouseId: warehouse.id,
        destinationLocationId: receiptLine.locationId,
        qualityStatus: onHold ? 'QUARANTAINE' : 'LIBERE',
        referenceDocument: `${order.orderNumber} / ${input.deliveryNoteNumber || 'sans BL'}`,
        userId: this.currentUser.id,
        userName: this.currentUser.name,
        reason: `Réception achat ${order.supplierName}`,
      });
      const lot = this.db.stockLots.find(
        l => l.itemId === receiptLine.itemId && l.lotNumber === receiptLine.lotNumber
      );
      if (lot) {
        if (receiptLine.expiryDate) lot.expiryDate = receiptLine.expiryDate;
        lot.supplierLotNumber = lot.supplierLotNumber || input.deliveryNoteNumber;
        lot.receptionDate = lot.receptionDate || receipt.receivedAt;
      }
    });

    receipt.stockMovementsCreated = true;
    this.db.purchaseReceipts.unshift(receipt);

    // 3. Statut de la commande
    const fullyReceived = order.lines.every(line => line.quantityReceived >= line.quantityOrdered);
    const partiallyReceived = order.lines.some(line => line.quantityReceived > 0);
    order.status = fullyReceived ? 'RECUE' : partiallyReceived ? 'PARTIELLEMENT_RECUE' : order.status;

    if (order.requestId && fullyReceived) {
      const request = this.getPurchaseRequest(order.requestId);
      if (request && request.status !== 'CLOTUREE') {
        request.status = 'CLOTUREE';
        request.closedAt = this.nowIso();
      }
    }

    this.logAudit({
      action: 'CREATE',
      entity: 'PurchaseReceipt',
      entityId: receipt.id,
      newValues: `Réception ${receipt.receiptNumber} — commande ${order.orderNumber} — ${receiptLines.length} ligne(s) — qualité ${RECEIPT_QUALITY_STATUS_LABELS[qualityStatus]}`,
      motive: 'Réception d\'une commande d\'achat',
    });
    this.saveDatabase(this.db);
    return receipt;
  }

  /** Contrôle qualité d'une réception : libère ou rejette le stock mis en quarantaine. */
  public decideReceiptQuality(
    receiptId: string,
    decision: Exclude<ReceiptQualityStatus, 'EN_ATTENTE'>,
    notes: string
  ): PurchaseReceipt {
    this.assertProcurement('PR_VALIDATE', 'statuer sur la qualité d\'une réception');
    const receipt = this.db.purchaseReceipts.find(r => r.id === receiptId);
    if (!receipt) throw new Error('Réception introuvable.');
    if (receipt.qualityStatus !== 'EN_ATTENTE') {
      throw new Error('Cette réception a déjà fait l\'objet d\'une décision qualité.');
    }
    if (!notes?.trim()) throw new Error('Un commentaire de contrôle qualité est obligatoire.');

    receipt.lines.forEach(line => {
      if (decision === 'REFUSEE') {
        line.quantityAccepted = 0;
        line.quantityRejected = line.quantityReceived;
        line.nonConformityReason = notes.trim();
      } else if (decision === 'ACCEPTEE') {
        line.quantityAccepted = line.quantityReceived;
        line.quantityRejected = 0;
      }
      const lot = this.db.stockLots.find(
        l => l.itemId === line.itemId && l.lotNumber === line.lotNumber
      );
      if (lot && decision !== 'ACCEPTEE_PARTIELLE') {
        this.changeLotQualityStatus(
          lot.id,
          decision === 'ACCEPTEE' ? 'LIBERE' : 'REJETE',
          `Contrôle qualité réception ${receipt.receiptNumber} : ${notes.trim()}`,
          decision === 'REFUSEE' ? this.findWarehouseByType('NON_CONFORMES')?.id : undefined
        );
      }
    });

    receipt.qualityStatus = decision;
    receipt.isOnHold = decision === 'REFUSEE';
    receipt.qualityControlledBy = this.currentUser.name;
    receipt.qualityControlledAt = this.nowIso();
    receipt.qualityNotes = notes.trim();

    this.logAudit({
      action: 'UPDATE',
      entity: 'PurchaseReceipt',
      entityId: receipt.id,
      newValues: `Réception ${receipt.receiptNumber} — décision qualité : ${RECEIPT_QUALITY_STATUS_LABELS[decision]}`,
      motive: notes.trim(),
    });
    this.saveDatabase(this.db);
    return receipt;
  }

  // --- Contrats fournisseurs ---

  public getSupplierContracts(): SupplierContract[] {
    return this.db.supplierContracts;
  }

  public addSupplierContract(input: Omit<SupplierContract, 'id' | 'createdAt' | 'createdBy' | 'status'> & {
    status?: SupplierContractStatus;
  }): SupplierContract {
    this.assertProcurement('SUPPLIER_MANAGE', 'créer un contrat fournisseur');
    const supplier = this.db.suppliers.find(s => s.id === input.supplierId);
    if (!supplier) throw new Error('Fournisseur introuvable.');
    if (!input.reference?.trim()) throw new Error('La référence du contrat est obligatoire.');
    if (!input.object?.trim()) throw new Error('L\'objet du contrat est obligatoire.');
    if (!input.startDate || !input.endDate) throw new Error('Les dates de début et de fin sont obligatoires.');
    if (new Date(input.endDate).getTime() <= new Date(input.startDate).getTime()) {
      throw new Error('La date de fin doit être postérieure à la date de début.');
    }
    if (this.db.supplierContracts.some(c => c.reference.toLowerCase() === input.reference.trim().toLowerCase())) {
      throw new Error(`La référence de contrat « ${input.reference.trim()} » existe déjà.`);
    }
    const today = new Date().toISOString().slice(0, 10);
    const status: SupplierContractStatus =
      input.status || (input.endDate < today ? 'EXPIRE' : 'ACTIF');

    const contract: SupplierContract = {
      ...input,
      id: this.newId('CTR'),
      reference: input.reference.trim(),
      supplierName: supplier.name,
      currency: input.currency || this.db.procurementSettings.currency,
      status,
      createdAt: this.nowIso(),
      createdBy: this.currentUser.name,
    };
    this.db.supplierContracts.unshift(contract);
    this.logAudit({
      action: 'CREATE',
      entity: 'SupplierContract',
      entityId: contract.id,
      newValues: `Contrat ${contract.reference} — ${supplier.name} — ${contract.startDate} → ${contract.endDate}`,
      motive: 'Création d\'un contrat fournisseur',
    });
    this.saveDatabase(this.db);
    return contract;
  }

  public updateSupplierContractStatus(
    contractId: string,
    status: SupplierContractStatus,
    reason: string
  ): SupplierContract {
    this.assertProcurement('SUPPLIER_MANAGE', 'modifier le statut d\'un contrat');
    const contract = this.db.supplierContracts.find(c => c.id === contractId);
    if (!contract) throw new Error('Contrat introuvable.');
    if (!reason?.trim()) throw new Error('Un motif est obligatoire pour changer le statut d\'un contrat.');
    const previous = contract.status;
    contract.status = status;
    this.logAudit({
      action: 'UPDATE',
      entity: 'SupplierContract',
      entityId: contract.id,
      oldValues: `Statut ${previous}`,
      newValues: `Statut ${status}`,
      motive: reason.trim(),
    });
    this.saveDatabase(this.db);
    return contract;
  }

  /** Contrats actifs dont l'échéance tombe dans les 60 jours. */
  public getExpiringContracts(days = 60): SupplierContract[] {
    const limit = new Date();
    limit.setDate(limit.getDate() + days);
    const limitIso = limit.toISOString().slice(0, 10);
    const today = new Date().toISOString().slice(0, 10);
    return this.db.supplierContracts
      .filter(c => c.status === 'ACTIF' && c.endDate >= today && c.endDate <= limitIso)
      .sort((a, b) => a.endDate.localeCompare(b.endDate));
  }

  // --- Évaluation fournisseurs : 100 % calculée ---

  public getSupplierEvaluations(): SupplierEvaluation[] {
    const settings = this.db.procurementSettings;
    const evaluations: SupplierEvaluation[] = [];

    this.db.suppliers.forEach(supplier => {
      const orders = this.db.purchaseOrders.filter(
        order => order.supplierId === supplier.id && order.status !== 'ANNULEE'
      );
      const receipts = this.db.purchaseReceipts.filter(receipt => receipt.supplierId === supplier.id);
      if (orders.length === 0 && receipts.length === 0) return;

      let onTime = 0;
      let delivered = 0;
      let totalOrdered = 0;
      let totalReceived = 0;
      let accepted = 0;
      let receivedQty = 0;
      const leadTimes: number[] = [];
      const promisedLeadTimes: number[] = [];

      orders.forEach(order => {
        const orderReceipts = receipts.filter(receipt => receipt.orderId === order.id);
        if (orderReceipts.length === 0) return;
        const firstReceipt = orderReceipts
          .map(r => r.receivedAt)
          .sort((a, b) => a.localeCompare(b))[0];
        delivered += 1;
        if (firstReceipt.slice(0, 10) <= order.expectedDate.slice(0, 10)) onTime += 1;
        const actualLead = Math.max(
          0,
          Math.round(
            (new Date(firstReceipt).getTime() - new Date(order.orderDate).getTime()) / 86400000
          )
        );
        const promisedLead = Math.max(
          0,
          Math.round(
            (new Date(order.expectedDate).getTime() - new Date(order.orderDate).getTime()) / 86400000
          )
        );
        leadTimes.push(actualLead);
        promisedLeadTimes.push(promisedLead);
        order.lines.forEach(line => {
          totalOrdered += line.quantityOrdered;
          totalReceived += line.quantityReceived;
        });
      });

      receipts.forEach(receipt => {
        receipt.lines.forEach(line => {
          receivedQty += line.quantityReceived;
          accepted += line.quantityAccepted;
        });
      });

      const onTimeRate = delivered > 0 ? (onTime / delivered) * 100 : 0;
      const quantityComplianceRate = totalOrdered > 0 ? Math.min(100, (totalReceived / totalOrdered) * 100) : 0;
      const qualityComplianceRate = receivedQty > 0 ? (accepted / receivedQty) * 100 : 0;
      const averageLeadTimeDays =
        leadTimes.length > 0 ? leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length : 0;
      const averagePromisedLeadTimeDays =
        promisedLeadTimes.length > 0
          ? promisedLeadTimes.reduce((a, b) => a + b, 0) / promisedLeadTimes.length
          : 0;

      const overallScore = this.roundQty(
        onTimeRate * 0.35 + quantityComplianceRate * 0.2 + qualityComplianceRate * 0.45
      );
      const grade: SupplierEvaluation['grade'] =
        overallScore >= 90 ? 'A' : overallScore >= 75 ? 'B' : overallScore >= 60 ? 'C' : 'D';

      const totalPurchasedDzd = this.roundQty(
        orders.reduce((total, order) => total + order.totalDzd, 0)
      );

      // Tendance : note cumulée par trimestre sur les 4 derniers trimestres
      const trend: Array<{ period: string; score: number }> = [];
      for (let i = 3; i >= 0; i -= 1) {
        const reference = new Date();
        reference.setMonth(reference.getMonth() - i * 3);
        const year = reference.getFullYear();
        const quarter = Math.floor(reference.getMonth() / 3) + 1;
        const start = new Date(year, (quarter - 1) * 3, 1);
        const end = new Date(year, quarter * 3, 0, 23, 59, 59);
        const periodReceipts = receipts.filter(r => {
          const date = new Date(r.receivedAt);
          return date >= start && date <= end;
        });
        if (periodReceipts.length === 0) continue;
        let periodReceived = 0;
        let periodAccepted = 0;
        periodReceipts.forEach(r =>
          r.lines.forEach(line => {
            periodReceived += line.quantityReceived;
            periodAccepted += line.quantityAccepted;
          })
        );
        trend.push({
          period: `T${quarter} ${year}`,
          score: periodReceived > 0 ? this.roundQty((periodAccepted / periodReceived) * 100) : 0,
        });
      }

      evaluations.push({
        supplierId: supplier.id,
        supplierName: supplier.name,
        ordersCount: orders.length,
        receiptsCount: receipts.length,
        totalPurchasedDzd,
        onTimeRate: this.roundQty(onTimeRate),
        quantityComplianceRate: this.roundQty(quantityComplianceRate),
        qualityComplianceRate: this.roundQty(qualityComplianceRate),
        averageLeadTimeDays: this.roundQty(averageLeadTimeDays),
        averagePromisedLeadTimeDays: this.roundQty(averagePromisedLeadTimeDays),
        overallScore,
        grade,
        lastOrderDate: orders
          .map(order => order.orderDate)
          .sort((a, b) => b.localeCompare(a))[0],
        trend,
      });
    });

    return evaluations.sort((a, b) => b.overallScore - a.overallScore);
  }

  /** Indicateurs consolidés du cycle aval pour les rapports. */
  public getProcurementCycleReport(fiscalYear = new Date().getFullYear()) {
    const yearPrefix = String(fiscalYear);
    const orders = this.db.purchaseOrders.filter(
      order => order.status !== 'ANNULEE' && order.orderDate.slice(0, 4) === yearPrefix
    );
    const receipts = this.db.purchaseReceipts.filter(
      receipt => receipt.receivedAt.slice(0, 4) === yearPrefix
    );

    const spentDzd = this.roundQty(orders.reduce((total, order) => total + order.totalDzd, 0));

    const byMonth = Array.from({ length: 12 }, (_, index) => {
      const month = String(index + 1).padStart(2, '0');
      const monthOrders = orders.filter(order => order.orderDate.slice(5, 7) === month);
      return {
        month: `${month}/${yearPrefix}`,
        ordersCount: monthOrders.length,
        amountDzd: this.roundQty(monthOrders.reduce((total, order) => total + order.totalDzd, 0)),
      };
    });

    const supplierTotals = new Map<string, { supplierName: string; amountDzd: number; ordersCount: number }>();
    orders.forEach(order => {
      const current = supplierTotals.get(order.supplierId) || {
        supplierName: order.supplierName,
        amountDzd: 0,
        ordersCount: 0,
      };
      current.amountDzd += order.totalDzd;
      current.ordersCount += 1;
      supplierTotals.set(order.supplierId, current);
    });

    const groupTotals = new Map<string, number>();
    orders.forEach(order =>
      order.lines.forEach(line => {
        const item = this.db.items.find(i => i.id === line.itemId);
        if (!item) return;
        const group = item.group || groupForCategory(item.category);
        groupTotals.set(group, (groupTotals.get(group) || 0) + line.lineTotalDzd);
      })
    );

    const lateOrders = orders.filter(order => {
      if (['RECUE', 'CLOTUREE'].includes(order.status)) return false;
      return order.expectedDate.slice(0, 10) < new Date().toISOString().slice(0, 10);
    });

    const totalOrderedQty = orders.reduce(
      (total, order) => total + order.lines.reduce((sum, line) => sum + line.quantityOrdered, 0),
      0
    );
    const totalReceivedQty = orders.reduce(
      (total, order) => total + order.lines.reduce((sum, line) => sum + line.quantityReceived, 0),
      0
    );

    return {
      fiscalYear,
      ordersCount: orders.length,
      receiptsCount: receipts.length,
      spentDzd,
      averageOrderDzd: orders.length > 0 ? this.roundQty(spentDzd / orders.length) : 0,
      lateOrdersCount: lateOrders.length,
      serviceRate: totalOrderedQty > 0 ? this.roundQty((totalReceivedQty / totalOrderedQty) * 100) : 0,
      byMonth,
      topSuppliers: Array.from(supplierTotals.entries())
        .map(([supplierId, data]) => ({ supplierId, ...data, amountDzd: this.roundQty(data.amountDzd) }))
        .sort((a, b) => b.amountDzd - a.amountDzd)
        .slice(0, 8),
      byCategoryGroup: Array.from(groupTotals.entries())
        .map(([group, amountDzd]) => ({
          group: group as ItemCategoryGroup,
          label: ITEM_CATEGORY_GROUP_LABELS[group as ItemCategoryGroup],
          amountDzd: this.roundQty(amountDzd),
        }))
        .sort((a, b) => b.amountDzd - a.amountDzd),
      settings: this.db.procurementSettings,
    };
  }

  // ==========================================================================
  // GDS — GESTION DES STOCKS (MATIÈRES PREMIÈRES & PRODUITS FINIS)
  // Couche opérationnelle au-dessus du moteur de stock unique. Aucune écriture
  // directe dans `warehouseStocks` : tout passe par `addStockMovement` ou par le
  // workflow de transfert existant.
  // ==========================================================================

  // --- Habilitations GDS ---

  public getGdsPermissions(user: User = this.currentUser): GdsPermission[] {
    const staticPerms = GDS_ROLE_PERMISSIONS[user.role] || [];
    const role = this.db.roles.find(r => r.roleKey === user.role && r.isActive);
    const dynamicPerms = (role?.permissions || []).filter(p => p.startsWith('GDS_')) as GdsPermission[];
    return Array.from(new Set([...staticPerms, ...dynamicPerms]));
  }

  public canGds(permission: GdsPermission, user: User = this.currentUser): boolean {
    return this.getGdsPermissions(user).includes(permission);
  }

  public assertGds(permission: GdsPermission, action: string) {
    if (!this.canGds(permission)) {
      throw new Error(
        `Habilitation insuffisante : « ${GDS_PERMISSION_LABELS[permission]} » est requise pour ${action}. Profil ${getRoleLabel(
          this.currentUser.role
        )}.`
      );
    }
  }

  private assertGdsAdministration(action: string) {
    if (this.currentUser.role !== 'ADMIN' && this.currentUser.role !== 'DIRECTEUR_USINE') {
      throw new Error(
        `Seuls les profils Administration et Direction peuvent ${action}. Profil ${getRoleLabel(
          this.currentUser.role
        )}.`
      );
    }
  }

  // --- Paramètres GDS ---

  public getGdsSettings(): GdsSettings {
    if (!this.db.gdsSettings) this.db.gdsSettings = { ...DEFAULT_GDS_SETTINGS };
    return { ...DEFAULT_GDS_SETTINGS, ...this.db.gdsSettings };
  }

  public updateGdsSettings(updates: Partial<GdsSettings>): GdsSettings {
    this.assertGdsAdministration('modifier les paramètres GDS');
    const current = this.getGdsSettings();
    const next: GdsSettings = { ...current, ...updates };
    if (!Number.isFinite(next.expiryAlertDays) || next.expiryAlertDays < 0) {
      throw new Error("Le seuil d'alerte de péremption doit être un nombre de jours positif.");
    }
    if (!Number.isFinite(next.transitAlertDays) || next.transitAlertDays < 0) {
      throw new Error("Le seuil d'alerte de transit doit être un nombre de jours positif.");
    }
    if (!Number.isFinite(next.overstockMultiplier) || next.overstockMultiplier <= 0) {
      throw new Error('Le coefficient de surstock doit être strictement positif.');
    }
    const destinationTypes = Array.isArray(next.issueDestinationTypes)
      ? next.issueDestinationTypes.map(value => String(value).trim()).filter(Boolean)
      : [];
    if (destinationTypes.length === 0) {
      throw new Error('Au moins un type de destination doit être autorisé pour les sorties de produits finis.');
    }
    next.issueDestinationTypes = Array.from(new Set(destinationTypes));
    if (!Number.isFinite(next.inventoryTolerancePercent) || next.inventoryTolerancePercent < 0) {
      throw new Error("La tolérance d'inventaire doit être positive ou nulle.");
    }
    this.db.gdsSettings = next;
    this.logAudit({
      action: 'UPDATE',
      entity: 'GdsSettings',
      entityId: 'GDS',
      oldValues: JSON.stringify(current),
      newValues: JSON.stringify(next),
      motive: 'Paramétrage du module GDS',
    });
    this.saveDatabase(this.db);
    return next;
  }

  // --- Périmètre MP / PF (le référentiel articles reste unique) ---

  private isFinishedGoodsItem(item: Item): boolean {
    return item.category === 'PRODUIT_FINI_THON' || item.category === 'PRODUIT_FINI_SARDINE';
  }

  public getItemGdsScope(item: Item): GdsScope {
    return this.isFinishedGoodsItem(item) ? 'PRODUITS_FINIS' : 'MATIERES_PREMIERES';
  }

  public getGdsItems(scope: GdsScope, includeInactive = true): Item[] {
    return this.db.items
      .filter(item => this.getItemGdsScope(item) === scope)
      .filter(item => includeInactive || this.isItemActive(item))
      .sort((a, b) => a.code.localeCompare(b.code));
  }

  // --- État des stocks GDS ---

  public getGdsStock(
    scope: GdsScope,
    filter?: {
      search?: string;
      group?: ItemCategoryGroup;
      warehouseId?: string;
      onlyActive?: boolean;
      onlyBelowMin?: boolean;
    }
  ): GdsStockRow[] {
    const accessible = new Set(this.getAccessibleWarehouses().map(w => w.id));
    const needle = filter?.search?.trim().toLowerCase();
    const round = (value: number) => this.roundQty(value);

    return this.getGdsItems(scope, !filter?.onlyActive)
      .filter(
        item => !filter?.group || (item.group ?? groupForCategory(item.category)) === filter.group
      )
      .map(item => {
        const rows = this.db.warehouseStocks
          .filter(row => row.itemId === item.id && accessible.has(row.warehouseId))
          .filter(row => !filter?.warehouseId || row.warehouseId === filter.warehouseId);

        const sumWhere = (predicate: (row: WarehouseStock) => boolean) =>
          round(rows.filter(predicate).reduce((total, row) => total + row.quantity, 0));

        const reserved = round(rows.reduce((total, row) => total + row.reservedQty, 0));
        const available = round(
          Math.max(
            0,
            rows
              .filter(row => row.qualityStatus === 'LIBERE')
              .reduce((total, row) => total + row.quantity - row.reservedQty, 0)
          )
        );
        const transit = round(
          this.db.stockTransits
            .filter(t => t.itemId === item.id && t.status === 'EN_TRANSIT')
            .filter(
              t =>
                !filter?.warehouseId ||
                t.sourceWarehouseId === filter.warehouseId ||
                t.destinationWarehouseId === filter.warehouseId
            )
            .reduce((total, t) => total + t.quantity, 0)
        );

        const warehouses = rows
          .map(row => {
            const warehouse = this.getWarehouseById(row.warehouseId);
            const location = this.getWarehouseLocationById(row.locationId);
            return {
              warehouseId: row.warehouseId,
              code: warehouse?.code || '—',
              designation: warehouse?.designation || '—',
              locationCode: location?.code,
              quantity: round(row.quantity),
              available:
                row.qualityStatus === 'LIBERE'
                  ? round(Math.max(0, row.quantity - row.reservedQty))
                  : 0,
            };
          })
          .filter(entry => entry.quantity > 0 || entry.available > 0)
          .sort((a, b) => a.code.localeCompare(b.code));

        const row: GdsStockRow = {
          itemId: item.id,
          itemCode: item.code,
          designation: item.designation,
          group: item.group ?? groupForCategory(item.category),
          category: item.category,
          unit: item.unit,
          secondaryUnit: item.secondaryUnit,
          conversionCoefficient: item.conversionCoefficient,
          packaging: item.packaging,
          physical: sumWhere(() => true),
          available,
          reserved,
          pendingControl: sumWhere(r => QUALITY_STATUS_GROUPS.pending.includes(r.qualityStatus)),
          quarantine: sumWhere(r => r.qualityStatus === 'QUARANTAINE'),
          blocked: sumWhere(r => QUALITY_STATUS_GROUPS.blocked.includes(r.qualityStatus)),
          transit,
          minStockLevel: item.minStockLevel || 0,
          maxStockLevel: item.maxStockLevel,
          isActive: this.isItemActive(item),
          warehouses,
          lotCount: new Set(rows.map(r => r.lotId)).size,
        };
        return row;
      })
      .filter(row => {
        if (!needle) return true;
        return `${row.itemCode} ${row.designation} ${row.packaging || ''}`
          .toLowerCase()
          .includes(needle);
      })
      .filter(
        row =>
          !filter?.onlyBelowMin ||
          (row.minStockLevel > 0 && row.available < row.minStockLevel)
      )
      .sort((a, b) => a.itemCode.localeCompare(b.itemCode));
  }

  // --- Mouvements de stock filtrés (grand livre unique) ---

  public getGdsMovements(filter?: {
    scope?: GdsScope;
    itemId?: string;
    lotNumber?: string;
    warehouseId?: string;
    type?: StockMovementType;
    dateFrom?: string;
    dateTo?: string;
    documentNumber?: string;
    search?: string;
    limit?: number;
  }): StockMovement[] {
    const scopeByItem = new Map<string, GdsScope>();
    for (const item of this.db.items) scopeByItem.set(item.id, this.getItemGdsScope(item));
    const needle = filter?.search?.trim().toLowerCase();
    const movements = this.db.stockMovements
      .filter(m => !filter?.scope || scopeByItem.get(m.itemId) === filter.scope)
      .filter(m => !filter?.itemId || m.itemId === filter.itemId)
      .filter(m => !filter?.lotNumber || m.batchNumber === filter.lotNumber)
      .filter(
        m =>
          !filter?.warehouseId ||
          m.sourceWarehouseId === filter.warehouseId ||
          m.destinationWarehouseId === filter.warehouseId
      )
      .filter(m => !filter?.type || m.type === filter.type)
      .filter(m => !filter?.documentNumber || m.documentNumber === filter.documentNumber)
      .filter(m => !filter?.dateFrom || m.timestamp >= filter.dateFrom)
      .filter(m => !filter?.dateTo || m.timestamp <= `${filter.dateTo}T23:59:59.999Z`)
      .filter(m => {
        if (!needle) return true;
        return `${m.itemCode} ${m.batchNumber} ${m.documentNumber || ''} ${m.reason || ''} ${m.userName || ''}`
          .toLowerCase()
          .includes(needle);
      });
    return typeof filter?.limit === 'number' ? movements.slice(0, filter.limit) : movements;
  }

  // --- Lots GDS ---

  public getGdsLots(
    scope: GdsScope,
    filter?: { search?: string; qualityStatus?: StockQualityStatus; itemId?: string; warehouseId?: string }
  ): GdsLotRow[] {
    const settings = this.getGdsSettings();
    const accessible = new Set(this.getAccessibleWarehouses().map(w => w.id));
    const scopeItems = new Map(this.getGdsItems(scope).map(item => [item.id, item]));
    const needle = filter?.search?.trim().toLowerCase();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.db.stockLots
      .filter(lot => scopeItems.has(lot.itemId))
      .filter(lot => !filter?.itemId || lot.itemId === filter.itemId)
      .filter(lot => !filter?.qualityStatus || lot.qualityStatus === filter.qualityStatus)
      .map(lot => {
        const item = scopeItems.get(lot.itemId)!;
        const rows = this.db.warehouseStocks
          .filter(row => row.lotId === lot.id && accessible.has(row.warehouseId))
          .filter(row => !filter?.warehouseId || row.warehouseId === filter.warehouseId);
        const remainingQty = this.roundQty(rows.reduce((total, row) => total + row.quantity, 0));
        const warehouses = rows
          .map(row => {
            const warehouse = this.getWarehouseById(row.warehouseId);
            const location = this.getWarehouseLocationById(row.locationId);
            return {
              warehouseId: row.warehouseId,
              code: warehouse?.code || '—',
              designation: warehouse?.designation || '—',
              locationCode: location?.code,
              quantity: this.roundQty(row.quantity),
              qualityStatus: row.qualityStatus,
            };
          })
          .filter(entry => entry.quantity > 0);
        const entryQty = this.db.stockMovements
          .filter(m => m.lotId === lot.id && (m.stockDelta || 0) > 0)
          .reduce((total, m) => total + (m.stockDelta || 0), 0);
        const daysToExpiry = lot.expiryDate
          ? Math.round(
              (new Date(`${lot.expiryDate}T00:00:00`).getTime() - today.getTime()) / 86_400_000
            )
          : undefined;
        const workOrderNumbers = Array.from(
          new Set(
            this.db.stockMovements
              .filter(m => m.lotId === lot.id && m.workOrderId)
              .map(m => {
                const wo = this.db.workOrders.find(
                  w => w.id === m.workOrderId || w.orderNumber === m.workOrderId
                );
                return wo?.orderNumber || m.workOrderId!;
              })
          )
        );

        const row: GdsLotRow = {
          lotId: lot.id,
          lotNumber: lot.lotNumber,
          itemId: lot.itemId,
          itemCode: item.code,
          designation: item.designation,
          scope,
          unit: item.unit,
          qualityStatus: lot.qualityStatus,
          expiryDate: lot.expiryDate,
          receptionDate: lot.receptionDate,
          supplierLotNumber: lot.supplierLotNumber,
          origin: lot.origin,
          initialQty: this.roundQty(entryQty > 0 ? entryQty : remainingQty),
          remainingQty,
          warehouses,
          isExpired: Boolean(daysToExpiry !== undefined && daysToExpiry < 0),
          daysToExpiry,
          workOrderNumbers,
        };
        return row;
      })
      .filter(row => {
        if (!needle) return true;
        return `${row.lotNumber} ${row.itemCode} ${row.designation} ${row.supplierLotNumber || ''}`
          .toLowerCase()
          .includes(needle);
      })
      .filter(
        row =>
          settings.expiryAlertDays >= 0 ||
          row.daysToExpiry === undefined ||
          row.daysToExpiry > settings.expiryAlertDays
      )
      .sort((a, b) => b.lotNumber.localeCompare(a.lotNumber));
  }

  // --- Tableaux de bord GDS ---

  public getGdsDashboard(scope: GdsScope): GdsDashboard {
    const settings = this.getGdsSettings();
    const items = this.getGdsItems(scope);
    const itemIds = new Set(items.map(item => item.id));
    const rows = this.getGdsStock(scope);
    const round = (value: number) => this.roundQty(value);
    const total = (key: 'physical' | 'available' | 'reserved' | 'pendingControl' | 'quarantine' | 'blocked' | 'transit') =>
      round(rows.reduce((sum, row) => sum + row[key], 0));

    const lots = this.getGdsLots(scope);
    const activeLots = lots.filter(lot => lot.remainingQty > 0);

    const belowMin = rows.filter(
      row => row.minStockLevel > 0 && row.available < row.minStockLevel && row.available > 0
    ).length;
    const outOfStock = rows.filter(row => row.available <= 0 && row.minStockLevel > 0).length;

    const expiringSoon = activeLots.filter(
      lot =>
        lot.daysToExpiry !== undefined &&
        lot.daysToExpiry >= 0 &&
        lot.daysToExpiry <= settings.expiryAlertDays
    ).length;
    const expired = activeLots.filter(lot => lot.isExpired).length;

    // Transferts en cours touchant le périmètre (filtrage par les articles des lignes).
    const activeStatuses: TransferStatus[] = [
      'EN_ATTENTE_VALIDATION',
      'VALIDE',
      'EN_PREPARATION',
      'EXPEDIE',
      'PARTIELLEMENT_RECEPTIONNE',
    ];
    const pendingTransfers = this.db.stockTransfers.filter(
      transfer =>
        activeStatuses.includes(transfer.status) &&
        transfer.lines.some(line => itemIds.has(line.itemId))
    ).length;

    const pendingReleases =
      scope === 'PRODUITS_FINIS'
        ? this.db.finishedBatches.filter(
            batch =>
              batch.releaseStatus === 'EN_ATTENTE' &&
              this.db.items.some(
                item => item.id === batch.itemId && this.getItemGdsScope(item) === scope
              )
          ).length
        : activeLots.filter(lot => QUALITY_STATUS_GROUPS.pending.includes(lot.qualityStatus)).length;

    const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
    const recent = this.db.stockMovements.filter(
      m => itemIds.has(m.itemId) && m.timestamp >= since
    );
    const entries30d = round(
      recent.filter(m => (m.stockDelta || 0) > 0).reduce((sum, m) => sum + (m.stockDelta || 0), 0)
    );
    const exits30d = round(
      recent
        .filter(m => (m.stockDelta || 0) < 0)
        .reduce((sum, m) => sum + Math.abs(m.stockDelta || 0), 0)
    );

    // Le regroupement suit la nature réelle du périmètre : familles de matières
    // premières d'un côté, catégories de produits finis de l'autre.
    const buildFamily = (key: string, label: string, familyRows: typeof rows): GdsFamilyBreakdown => ({
      group: key,
      label,
      itemCount: familyRows.length,
      physical: round(familyRows.reduce((sum, row) => sum + row.physical, 0)),
      available: round(familyRows.reduce((sum, row) => sum + row.available, 0)),
      belowMin: familyRows.filter(
        row => row.minStockLevel > 0 && row.available < row.minStockLevel
      ).length,
    });

    const byFamily: GdsFamilyBreakdown[] =
      scope === 'MATIERES_PREMIERES'
        ? ITEM_CATEGORY_GROUPS.map(group =>
            buildFamily(
              group,
              ITEM_CATEGORY_GROUP_LABELS[group],
              rows.filter(row => row.group === group)
            )
          )
        : Array.from(new Set(rows.map(row => row.category))).map(category =>
            buildFamily(
              category,
              ITEM_CATEGORY_LABELS[category] || 'Autres produits finis',
              rows.filter(row => row.category === category)
            )
          );

    const byWarehouse: GdsWarehouseBreakdown[] = this.getAccessibleWarehouses()
      .map(warehouse => {
        const warehouseRows = this.db.warehouseStocks.filter(
          row => row.warehouseId === warehouse.id && itemIds.has(row.itemId)
        );
        return {
          warehouseId: warehouse.id,
          code: warehouse.code,
          designation: warehouse.designation,
          type: warehouse.type,
          physical: round(warehouseRows.reduce((sum, row) => sum + row.quantity, 0)),
          available: round(
            Math.max(
              0,
              warehouseRows
                .filter(row => row.qualityStatus === 'LIBERE')
                .reduce((sum, row) => sum + row.quantity - row.reservedQty, 0)
            )
          ),
          pendingControl: round(
            warehouseRows
              .filter(row => QUALITY_STATUS_GROUPS.pending.includes(row.qualityStatus))
              .reduce((sum, row) => sum + row.quantity, 0)
          ),
          quarantine: round(
            warehouseRows
              .filter(row => row.qualityStatus === 'QUARANTAINE')
              .reduce((sum, row) => sum + row.quantity, 0)
          ),
          blocked: round(
            warehouseRows
              .filter(row => QUALITY_STATUS_GROUPS.blocked.includes(row.qualityStatus))
              .reduce((sum, row) => sum + row.quantity, 0)
          ),
          itemCount: new Set(warehouseRows.map(row => row.itemId)).size,
          lotCount: new Set(warehouseRows.map(row => row.lotId)).size,
        };
      })
      .filter(entry => entry.physical > 0 || entry.itemCount > 0);

    const monthly: Array<{ period: string; entries: number; exits: number }> = [];
    for (let index = 5; index >= 0; index -= 1) {
      const date = new Date();
      date.setDate(1);
      date.setMonth(date.getMonth() - index);
      const period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthMovements = this.db.stockMovements.filter(
        m => itemIds.has(m.itemId) && m.timestamp.slice(0, 7) === period
      );
      monthly.push({
        period,
        entries: round(
          monthMovements
            .filter(m => (m.stockDelta || 0) > 0)
            .reduce((sum, m) => sum + (m.stockDelta || 0), 0)
        ),
        exits: round(
          monthMovements
            .filter(m => (m.stockDelta || 0) < 0)
            .reduce((sum, m) => sum + Math.abs(m.stockDelta || 0), 0)
        ),
      });
    }

    const movedByItem = new Map<string, number>();
    for (const movement of recent) {
      movedByItem.set(
        movement.itemId,
        (movedByItem.get(movement.itemId) || 0) + Math.abs(movement.stockDelta || 0)
      );
    }
    const topMoved = Array.from(movedByItem.entries())
      .map(([itemId, quantity]) => {
        const item = this.db.items.find(i => i.id === itemId);
        return {
          itemCode: item?.code || itemId,
          designation: item?.designation || '—',
          quantity: round(quantity),
          unit: (item?.unit || 'KG') as UnitOfMeasure,
        };
      })
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    return {
      scope,
      itemCount: items.length,
      lotCount: activeLots.length,
      physical: total('physical'),
      available: total('available'),
      reserved: total('reserved'),
      pendingControl: total('pendingControl'),
      quarantine: total('quarantine'),
      blocked: total('blocked'),
      transit: total('transit'),
      belowMin,
      outOfStock,
      expiringSoon,
      expired,
      pendingTransfers,
      pendingReleases,
      entries30d,
      exits30d,
      byFamily,
      byWarehouse,
      monthly,
      topMoved,
    };
  }

  // --- Alertes ---

  public getGdsAlerts(scope?: GdsScope): GdsAlert[] {
    const settings = this.getGdsSettings();
    const scopes: GdsScope[] = scope ? [scope] : ['MATIERES_PREMIERES', 'PRODUITS_FINIS'];
    const alerts: GdsAlert[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const push = (alert: GdsAlert) => alerts.push(alert);

    for (const currentScope of scopes) {
      const rows = this.getGdsStock(currentScope);
      for (const row of rows) {
        if (row.minStockLevel > 0 && row.available <= 0) {
          push({
            id: `RUPTURE-${row.itemId}`,
            kind: 'RUPTURE',
            severity: 'CRITIQUE',
            scope: currentScope,
            itemId: row.itemId,
            itemCode: row.itemCode,
            designation: row.designation,
            unit: row.unit,
            quantity: row.available,
            message: `Rupture : stock disponible nul (minimum ${row.minStockLevel} ${row.unit}).`,
          });
        } else if (row.minStockLevel > 0 && row.available < row.minStockLevel) {
          push({
            id: `MIN-${row.itemId}`,
            kind: 'SOUS_MINIMUM',
            severity: 'AVERTISSEMENT',
            scope: currentScope,
            itemId: row.itemId,
            itemCode: row.itemCode,
            designation: row.designation,
            unit: row.unit,
            quantity: row.available,
            message: `Disponible ${row.available} ${row.unit} sous le minimum de ${row.minStockLevel} ${row.unit}.`,
          });
        }
        if (row.maxStockLevel && row.physical > row.maxStockLevel * settings.overstockMultiplier) {
          push({
            id: `SURSTOCK-${row.itemId}`,
            kind: 'SURSTOCK',
            severity: 'INFO',
            scope: currentScope,
            itemId: row.itemId,
            itemCode: row.itemCode,
            designation: row.designation,
            unit: row.unit,
            quantity: row.physical,
            message: `Stock physique ${row.physical} ${row.unit} supérieur à ${settings.overstockMultiplier} × le stock maximum.`,
          });
        }
      }

      const lots = this.getGdsLots(currentScope);
      for (const lot of lots) {
        if (lot.remainingQty <= 0) continue;
        if (lot.isExpired) {
          push({
            id: `PERIME-${lot.lotId}`,
            kind: 'PERIME',
            severity: 'CRITIQUE',
            scope: currentScope,
            itemId: lot.itemId,
            itemCode: lot.itemCode,
            designation: lot.designation,
            unit: lot.unit,
            quantity: lot.remainingQty,
            lotNumber: lot.lotNumber,
            warehouseCode: lot.warehouses[0]?.code,
            warehouseId: lot.warehouses[0]?.warehouseId,
            dueDate: lot.expiryDate,
            daysRemaining: lot.daysToExpiry,
            message: `Lot périmé depuis ${Math.abs(lot.daysToExpiry || 0)} jour(s) — ${lot.remainingQty} ${lot.unit}.`,
          });
        } else if (
          lot.daysToExpiry !== undefined &&
          lot.daysToExpiry <= settings.expiryAlertDays
        ) {
          push({
            id: `PEMPTION-${lot.lotId}`,
            kind: 'PEREMPTION_PROCHE',
            severity: lot.daysToExpiry <= 7 ? 'CRITIQUE' : 'AVERTISSEMENT',
            scope: currentScope,
            itemId: lot.itemId,
            itemCode: lot.itemCode,
            designation: lot.designation,
            unit: lot.unit,
            quantity: lot.remainingQty,
            lotNumber: lot.lotNumber,
            warehouseCode: lot.warehouses[0]?.code,
            warehouseId: lot.warehouses[0]?.warehouseId,
            dueDate: lot.expiryDate,
            daysRemaining: lot.daysToExpiry,
            message: `Péremption dans ${lot.daysToExpiry} jour(s) — ${lot.remainingQty} ${lot.unit}.`,
          });
        }
        if (lot.qualityStatus === 'QUARANTAINE') {
          push({
            id: `QUAR-${lot.lotId}`,
            kind: 'QUARANTAINE',
            severity: 'AVERTISSEMENT',
            scope: currentScope,
            itemId: lot.itemId,
            itemCode: lot.itemCode,
            designation: lot.designation,
            unit: lot.unit,
            quantity: lot.remainingQty,
            lotNumber: lot.lotNumber,
            warehouseCode: lot.warehouses[0]?.code,
            warehouseId: lot.warehouses[0]?.warehouseId,
            message: `Lot en quarantaine : ${lot.remainingQty} ${lot.unit} non disponibles.`,
          });
        }
        if (QUALITY_STATUS_GROUPS.pending.includes(lot.qualityStatus)) {
          push({
            id: `ATTENTE-${lot.lotId}`,
            kind: 'EN_ATTENTE_CONTROLE',
            severity: 'INFO',
            scope: currentScope,
            itemId: lot.itemId,
            itemCode: lot.itemCode,
            designation: lot.designation,
            unit: lot.unit,
            quantity: lot.remainingQty,
            lotNumber: lot.lotNumber,
            warehouseCode: lot.warehouses[0]?.code,
            warehouseId: lot.warehouses[0]?.warehouseId,
            message:
              lot.qualityStatus === 'CONFORME'
                ? `Lot conforme en attente de libération : ${lot.remainingQty} ${lot.unit}.`
                : `Lot en attente de contrôle : ${lot.remainingQty} ${lot.unit}.`,
          });
        }
        if (QUALITY_STATUS_GROUPS.blocked.includes(lot.qualityStatus)) {
          push({
            id: `BLOQUE-${lot.lotId}`,
            kind: 'BLOQUE',
            severity: 'AVERTISSEMENT',
            scope: currentScope,
            itemId: lot.itemId,
            itemCode: lot.itemCode,
            designation: lot.designation,
            unit: lot.unit,
            quantity: lot.remainingQty,
            lotNumber: lot.lotNumber,
            warehouseCode: lot.warehouses[0]?.code,
            warehouseId: lot.warehouses[0]?.warehouseId,
            message: `Lot ${lot.qualityStatus === 'REJETE' ? 'rejeté' : 'bloqué'} : ${lot.remainingQty} ${lot.unit}.`,
          });
        }
      }

      if (currentScope === 'PRODUITS_FINIS') {
        for (const batch of this.db.finishedBatches) {
          if (batch.releaseStatus !== 'EN_ATTENTE') continue;
          const item = this.db.items.find(i => i.id === batch.itemId);
          if (!item || this.getItemGdsScope(item) !== currentScope) continue;
          push({
            id: `LIBERATION-${batch.id}`,
            kind: 'ATTENTE_LIBERATION',
            severity: 'AVERTISSEMENT',
            scope: currentScope,
            itemId: batch.itemId,
            itemCode: item.code,
            designation: item.designation,
            unit: 'BOITE',
            quantity: batch.conformingCans,
            lotNumber: batch.batchNumber,
            message: `Lot fini en attente de libération qualité : ${batch.conformingCans} boîtes.`,
          });
        }
      }
    }

    const limit = new Date(Date.now() - settings.transitAlertDays * 86_400_000).toISOString();
    for (const transit of this.db.stockTransits) {
      if (transit.status !== 'EN_TRANSIT' || transit.shippedAt >= limit) continue;
      const item = this.db.items.find(i => i.id === transit.itemId);
      if (!item) continue;
      const transitScope = this.getItemGdsScope(item);
      if (scope && transitScope !== scope) continue;
      push({
        id: `TRANSIT-${transit.id}`,
        kind: 'TRANSIT_LONG',
        severity: 'AVERTISSEMENT',
        scope: transitScope,
        itemId: item.id,
        itemCode: item.code,
        designation: item.designation,
        unit: transit.unit,
        quantity: transit.quantity,
        lotNumber: transit.lotNumber,
        warehouseId: transit.destinationWarehouseId,
        warehouseCode: this.getWarehouseById(transit.destinationWarehouseId)?.code,
        message: `Transfert ${transit.transferNumber} en transit depuis plus de ${settings.transitAlertDays} jour(s).`,
      });
    }

    const severityOrder: Record<GdsAlert['severity'], number> = {
      CRITIQUE: 0,
      AVERTISSEMENT: 1,
      INFO: 2,
    };
    return alerts.sort(
      (a, b) =>
        severityOrder[a.severity] - severityOrder[b.severity] || a.itemCode.localeCompare(b.itemCode)
    );
  }

  // --- Rapprochement sorties atelier / consommations / retours ---

  public getWorkOrderIssueReconciliation(workOrderId: string): WorkOrderIssueReconciliation[] {
    const workOrder = this.db.workOrders.find(w => w.id === workOrderId);
    if (!workOrder) throw new Error('Ordre de fabrication introuvable.');
    const productionWarehouse = this.findWarehouseByType('PRODUCTION');
    const transfers = this.db.stockTransfers.filter(t => t.workOrderId === workOrderId);
    const consumptions = this.db.consumptions.filter(
      c => c.workOrderId === workOrderId && c.status !== 'ANNULEE'
    );

    const map = new Map<string, WorkOrderIssueReconciliation>();
    // Une seule source par article : la consommation réelle (sortie directe) prime ;
    // le transfert atelier n'est retenu que pour les articles sans fiche de
    // consommation, afin de ne jamais compter deux fois la même sortie.
    const issuedFromTransfers = new Map<string, number>();
    const issuedFromConsumption = new Map<string, number>();
    const returnedFromTransfers = new Map<string, number>();
    const returnedFromConsumption = new Map<string, number>();
    // Retours enregistrés après validation de la fiche : mouvement distinct
    // (RETOUR_MAGASIN) rattaché au même OF, donc compté comme un retour.
    const returnedFromMovements = new Map<string, number>();
    for (const movement of this.db.stockMovements) {
      if (movement.type !== 'RETOUR_MAGASIN' || movement.workOrderId !== workOrderId) continue;
      returnedFromMovements.set(
        movement.itemId,
        this.roundQty(
          (returnedFromMovements.get(movement.itemId) || 0) +
            Math.abs(movement.stockDelta || movement.quantity || 0)
        )
      );
    }

    const ensure = (itemId: string, itemCode: string, designation: string, unit: UnitOfMeasure) => {
      let entry = map.get(itemId);
      if (!entry) {
        entry = {
          workOrderId,
          orderNumber: workOrder.orderNumber,
          itemId,
          itemCode,
          designation,
          unit,
          issuedQty: 0,
          consumedQty: 0,
          returnedQty: 0,
          outstandingQty: 0,
          consumptionNumbers: [],
        };
        map.set(itemId, entry);
      }
      return entry;
    };

    for (const transfer of transfers) {
      if (transfer.status === 'ANNULE' || transfer.status === 'REFUSE') continue;
      const isReturn = transfer.type === 'RETOUR_MAGASIN';
      const isSupply =
        transfer.type === 'INTER_MAGASIN' &&
        (!productionWarehouse || transfer.destinationWarehouseId === productionWarehouse.id);
      if (!isReturn && !isSupply) continue;
      for (const line of transfer.lines) {
        ensure(line.itemId, line.itemCode, line.designation, line.unit);
        const moved = this.roundQty(
          line.shippedQty !== undefined ? line.shippedQty : line.preparedQty ?? 0
        );
        if (isReturn) {
          returnedFromTransfers.set(
            line.itemId,
            this.roundQty((returnedFromTransfers.get(line.itemId) || 0) + moved)
          );
        } else {
          issuedFromTransfers.set(
            line.itemId,
            this.roundQty((issuedFromTransfers.get(line.itemId) || 0) + moved)
          );
        }
      }
    }

    for (const consumption of consumptions) {
      for (const line of consumption.lines) {
        const entry = ensure(line.itemId, line.itemCode, line.designation, line.unit);
        entry.consumedQty = this.roundQty(entry.consumedQty + (line.actualConsumedQuantity || 0));
        // Sortie réelle déclarée sur la fiche : consommé + pertes.
        issuedFromConsumption.set(
          line.itemId,
          this.roundQty(
            (issuedFromConsumption.get(line.itemId) || 0) +
              (line.withdrawnQuantity ||
                (line.actualConsumedQuantity || 0) + (line.wasteQuantity || 0))
          )
        );
        returnedFromConsumption.set(
          line.itemId,
          this.roundQty((returnedFromConsumption.get(line.itemId) || 0) + (line.returnedQuantity || 0))
        );
        if (!entry.consumptionNumbers.includes(consumption.consumptionNumber)) {
          entry.consumptionNumbers.push(consumption.consumptionNumber);
        }
      }
    }

    return Array.from(map.values())
      .map(entry => {
        const hasConsumption = entry.consumptionNumbers.length > 0;
        const declaredReturn = returnedFromConsumption.get(entry.itemId);
        const movementReturn = returnedFromMovements.get(entry.itemId) || 0;
        const returnedQty = hasConsumption
          ? this.roundQty((declaredReturn || 0) + movementReturn)
          : this.roundQty((returnedFromTransfers.get(entry.itemId) || 0) + movementReturn);
        const issuedQty = hasConsumption
          ? issuedFromConsumption.get(entry.itemId) || 0
          : issuedFromTransfers.get(entry.itemId) || 0;
        return {
          ...entry,
          issuedQty,
          returnedQty,
          outstandingQty: this.roundQty(issuedQty - entry.consumedQty - returnedQty),
        };
      })
      .sort((a, b) => a.itemCode.localeCompare(b.itemCode));
  }

  // --- Réception des produits finis depuis la production ---

  public getProductionReceiptCandidates(): GdsProductionReceiptCandidate[] {
    const round = (value: number) => this.roundQty(value);
    return this.db.workOrders
      .filter(wo => wo.status === 'EN_COURS' || wo.status === 'EN_CONTROLE' || wo.status === 'CLOTURE')
      .map(workOrder => {
        const item = this.db.items.find(i => i.id === workOrder.finishedItemId);
        const batches = this.db.finishedBatches.filter(
          batch =>
            batch.workOrderId === workOrder.id || batch.workOrderId === workOrder.orderNumber
        );
        const alreadyReceived = round(batches.reduce((sum, b) => sum + b.conformingCans, 0));
        const produced = workOrder.actualCansQty > 0 ? workOrder.actualCansQty : workOrder.plannedCansQty;
        const candidate: GdsProductionReceiptCandidate = {
          workOrderId: workOrder.id,
          orderNumber: workOrder.orderNumber,
          itemId: workOrder.finishedItemId,
          itemCode: item?.code || '—',
          productName: workOrder.productName,
          plannedCans: workOrder.plannedCansQty,
          producedCans: produced,
          alreadyReceivedCans: alreadyReceived,
          remainingCans: round(Math.max(0, produced - alreadyReceived)),
          finishedBatchNumbers: batches.map(b => b.batchNumber),
          status: workOrder.status,
          productionDate: workOrder.endDateActual || workOrder.startDateActual,
        };
        return candidate;
      })
      .filter(candidate => Boolean(candidate.itemId) && candidate.remainingCans > 0)
      .sort((a, b) => a.orderNumber.localeCompare(b.orderNumber));
  }

  /**
   * Réception d'un produit fini depuis la production. Chaque réception crée un
   * lot fini distinct : les réceptions successives (productions partielles) sont
   * donc possibles, mais une double réception du même lot est refusée.
   */
  public createFinishedGoodsReceipt(input: {
    workOrderId: string;
    itemId: string;
    batchNumber?: string;
    quantityCans: number;
    cartons?: number;
    pallets?: number;
    warehouseId: string;
    locationId?: string;
    productionDate?: string;
    bestBeforeDate?: string;
    notes?: string;
  }): FinishedBatch {
    this.assertGds('GDS_RECEIVE_FP', 'réceptionner un produit fini depuis la production');
    const workOrder = this.db.workOrders.find(w => w.id === input.workOrderId);
    if (!workOrder) throw new Error('Ordre de fabrication introuvable.');
    const item = this.db.items.find(i => i.id === input.itemId);
    if (!item) throw new Error('Produit fini introuvable dans le référentiel.');
    if (!this.isFinishedGoodsItem(item)) {
      throw new Error(
        `L'article ${item.code} n'est pas un produit fini fabriqué : il ne peut pas être réceptionné depuis la production.`
      );
    }
    const quantity = this.roundQty(input.quantityCans);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new Error('La quantité réceptionnée doit être strictement positive.');
    }
    const warehouse = this.getWarehouse(input.warehouseId);
    if (!warehouse) throw new Error('Magasin de destination introuvable.');
    if (!warehouse.isActive) throw new Error(`Le magasin ${warehouse.code} est inactif.`);
    const location = input.locationId
      ? this.getWarehouseLocation(input.locationId)
      : this.getDefaultLocation(warehouse.id);
    if (!location || location.warehouseId !== warehouse.id) {
      throw new Error(`Aucun emplacement valide dans le magasin ${warehouse.code}.`);
    }

    const candidate = this.getProductionReceiptCandidates().find(
      c => c.workOrderId === input.workOrderId
    );
    const remaining = candidate ? candidate.remainingCans : quantity;
    if (quantity > remaining + 0.001) {
      throw new Error(
        `Quantité refusée : ${quantity} boîtes demandées pour ${remaining} boîte(s) restant à réceptionner sur l'OF ${workOrder.orderNumber}.`
      );
    }

    const batchNumber = input.batchNumber?.trim();
    if (batchNumber) {
      const duplicate = this.db.finishedBatches.some(
        batch => batch.batchNumber.toLowerCase() === batchNumber.toLowerCase()
      );
      const duplicateLot = this.db.stockLots.some(
        lot => lot.itemId === item.id && lot.lotNumber.toLowerCase() === batchNumber.toLowerCase()
      );
      if (duplicate || duplicateLot) {
        throw new Error(
          `Double réception refusée : le lot ${batchNumber} existe déjà pour cet article.`
        );
      }
    }

    const productionDate = input.productionDate || new Date().toISOString().slice(0, 10);
    const bestBeforeDate =
      input.bestBeforeDate ||
      (() => {
        const date = new Date(`${productionDate}T00:00:00`);
        date.setMonth(date.getMonth() + (item.shelfLifeMonths || 36));
        return date.toISOString().slice(0, 10);
      })();

    const settings = this.getGdsSettings();
    const qualityStatus: StockQualityStatus = settings.requireQualityReleaseOnFinishedReceipt
      ? 'EN_ATTENTE_CONTROLE'
      : 'LIBERE';

    const batch = this.addFinishedBatch(
      {
        workOrderId: workOrder.id,
        itemId: item.id,
        productName: item.designation,
        format: item.format || '—',
        productionDate,
        bestBeforeDate,
        totalCansProduced: quantity,
        conformingCans: quantity,
        rejectedCans: 0,
        totalCartons: input.cartons ?? Math.floor(quantity / 24),
        totalPallets: input.pallets ?? 0,
        warehouseLocation: `${warehouse.code} / ${location.code}`,
        seamingChecked: false,
        autoclaveCycleConforming: false,
        incubationTestPassed: false,
        chemicalAndHistaminePassed: false,
        releaseStatus: settings.requireQualityReleaseOnFinishedReceipt ? 'EN_ATTENTE' : 'LIBERE',
      },
      {
        batchNumber,
        warehouseId: warehouse.id,
        locationId: location.id,
        qualityStatus,
      }
    );

    this.logAudit({
      action: 'CREATE',
      entity: 'FinishedGoodsReceipt',
      entityId: batch.id,
      newValues: `Réception PF ${batch.batchNumber} — ${quantity} boîtes — OF ${workOrder.orderNumber} — ${warehouse.code}/${location.code}`,
      motive: input.notes || 'Réception de production depuis le module GDS',
    });
    this.saveDatabase(this.db);
    return batch;
  }

  // --- Traçabilité bidirectionnelle ---

  public getLotTraceability(lotNumberOrId: string): LotTraceability | undefined {
    const needle = lotNumberOrId?.trim();
    if (!needle) return undefined;
    const lot =
      this.db.stockLots.find(l => l.id === needle) ||
      this.db.stockLots.find(l => l.lotNumber.toLowerCase() === needle.toLowerCase());
    if (!lot) return undefined;
    const item = this.db.items.find(i => i.id === lot.itemId);
    if (!item) return undefined;
    const scope = this.getItemGdsScope(item);
    const accessible = new Set(this.getAccessibleWarehouses().map(w => w.id));
    const rows = this.db.warehouseStocks.filter(
      row => row.lotId === lot.id && accessible.has(row.warehouseId)
    );
    const movements = this.db.stockMovements.filter(
      m => m.lotId === lot.id || (m.itemId === lot.itemId && m.batchNumber === lot.lotNumber)
    );

    const workOrders: LotTraceability['workOrders'] = [];
    if (scope === 'MATIERES_PREMIERES') {
      const usedByWorkOrder = new Map<string, number>();
      for (const consumption of this.db.consumptions) {
        if (consumption.status === 'ANNULEE') continue;
        for (const line of consumption.lines) {
          const detail = line.lots.find(
            l => l.lotId === lot.id || l.lotNumber === lot.lotNumber
          );
          if (!detail) continue;
          const used = detail.usedQty ?? detail.withdrawnQty ?? 0;
          usedByWorkOrder.set(
            consumption.workOrderId,
            this.roundQty((usedByWorkOrder.get(consumption.workOrderId) || 0) + used)
          );
        }
      }
      for (const movement of movements) {
        if (!movement.workOrderId) continue;
        if (movement.type !== 'CONSOMMATION_OF' && !movement.type.startsWith('TRANSFERT')) continue;
        const workOrder = this.db.workOrders.find(
          w => w.id === movement.workOrderId || w.orderNumber === movement.workOrderId
        );
        const key = workOrder?.id || movement.workOrderId;
        if (usedByWorkOrder.has(key)) continue;
        usedByWorkOrder.set(
          key,
          this.roundQty((usedByWorkOrder.get(key) || 0) + Math.abs(movement.stockDelta || 0))
        );
      }
      for (const [workOrderKey, quantityUsed] of usedByWorkOrder) {
        const workOrder = this.db.workOrders.find(
          w => w.id === workOrderKey || w.orderNumber === workOrderKey
        );
        const batches = this.db.finishedBatches.filter(
          batch =>
            batch.workOrderId === workOrderKey ||
            batch.workOrderId === workOrder?.id ||
            batch.workOrderId === workOrder?.orderNumber
        );
        workOrders.push({
          workOrderId: workOrder?.id || workOrderKey,
          orderNumber: workOrder?.orderNumber || workOrderKey,
          productName: workOrder?.productName || '—',
          quantityUsed,
          unit: item.unit,
          finishedBatches: batches.map(batch => ({
            batchNumber: batch.batchNumber,
            conformingCans: batch.conformingCans,
            releaseStatus: batch.releaseStatus,
          })),
        });
      }
    }

    const deliveries: LotTraceability['deliveries'] =
      scope === 'PRODUITS_FINIS'
        ? this.db.deliveryNotes
            .filter(note => note.lines.some(line => line.batchNumber === lot.lotNumber))
            .map(note => ({
              deliveryNumber: note.deliveryNumber,
              customerName: note.customerName,
              date: note.departureDate,
              cans: note.lines
                .filter(line => line.batchNumber === lot.lotNumber)
                .reduce((sum, line) => sum + line.cansDelivered, 0),
            }))
        : [];

    const consumedMaterials: LotTraceability['consumedMaterials'] = [];
    let upstream: LotTraceability['upstream'] = {};
    if (scope === 'PRODUITS_FINIS') {
      const batch = this.db.finishedBatches.find(b => b.batchNumber === lot.lotNumber);
      const workOrder = batch
        ? this.db.workOrders.find(
            w => w.id === batch.workOrderId || w.orderNumber === batch.workOrderId
          )
        : undefined;
      upstream = {
        workOrderNumber: workOrder?.orderNumber,
        finishedBatchNumber: batch?.batchNumber,
        productionDate: batch?.productionDate,
      };
      if (workOrder) {
        for (const consumption of this.db.consumptions.filter(
          c => c.workOrderId === workOrder.id && c.status !== 'ANNULEE'
        )) {
          for (const line of consumption.lines) {
            for (const detail of line.lots) {
              const quantity = detail.usedQty ?? detail.withdrawnQty ?? 0;
              if (quantity <= 0) continue;
              const materialItem = this.db.items.find(i => i.id === line.itemId);
              consumedMaterials.push({
                itemId: line.itemId,
                itemCode: line.itemCode,
                designation: line.designation,
                lotNumber: detail.lotNumber,
                quantity: this.roundQty(quantity),
                unit: detail.unit || materialItem?.unit || line.unit,
                consumptionNumber: consumption.consumptionNumber,
              });
            }
          }
        }
      }
    } else {
      const reception = this.db.receptions.find(
        r =>
          r.internalBatchNumber === lot.lotNumber ||
          (lot.supplierLotNumber && r.supplierBatchNumber === lot.supplierLotNumber)
      );
      upstream = {
        supplierName: reception?.supplier,
        receptionNumber: reception?.receptionNumber,
        receptionDate: reception?.receptionDate || lot.receptionDate,
        supplierLotNumber: lot.supplierLotNumber || reception?.supplierBatchNumber,
      };
    }

    return {
      lotId: lot.id,
      lotNumber: lot.lotNumber,
      itemId: lot.itemId,
      itemCode: item.code,
      designation: item.designation,
      scope,
      qualityStatus: lot.qualityStatus,
      expiryDate: lot.expiryDate,
      remainingQty: this.roundQty(rows.reduce((sum, row) => sum + row.quantity, 0)),
      unit: item.unit,
      warehouses: rows.map(row => {
        const warehouse = this.getWarehouseById(row.warehouseId);
        return {
          code: warehouse?.code || '—',
          designation: warehouse?.designation || '—',
          quantity: this.roundQty(row.quantity),
          qualityStatus: row.qualityStatus,
        };
      }),
      upstream,
      workOrders,
      deliveries,
      consumedMaterials,
      movements: movements.slice(0, 200),
    };
  }

  // --- Inventaires ---

  public getInventories(filter?: {
    scope?: GdsScope;
    status?: InventoryStatus;
    type?: InventoryType;
  }): StockInventory[] {
    return this.db.stockInventories
      .filter(inv => !filter?.scope || inv.scope === filter.scope)
      .filter(inv => !filter?.status || inv.status === filter.status)
      .filter(inv => !filter?.type || inv.type === filter.type)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  public getInventory(id: string): StockInventory | undefined {
    return this.db.stockInventories.find(inv => inv.id === id);
  }

  private nextGdsNumber(prefix: string, existing: string[]): string {
    return this.nextProcurementNumber(prefix, existing);
  }

  public createInventory(input: {
    scope: GdsScope;
    type: InventoryType;
    warehouseId?: string;
    locationId?: string;
    itemId?: string;
    lotId?: string;
    notes?: string;
  }): StockInventory {
    this.assertGds('GDS_INVENTORY', 'ouvrir un inventaire');
    const scopeItems = new Set(this.getGdsItems(input.scope).map(item => item.id));
    if (input.itemId && !scopeItems.has(input.itemId)) {
      throw new Error("L'article sélectionné n'appartient pas au périmètre demandé.");
    }
    const rows = this.db.warehouseStocks
      .filter(row => scopeItems.has(row.itemId))
      .filter(row => !input.warehouseId || row.warehouseId === input.warehouseId)
      .filter(row => !input.locationId || row.locationId === input.locationId)
      .filter(row => !input.itemId || row.itemId === input.itemId)
      .filter(row => !input.lotId || row.lotId === input.lotId)
      .filter(row => row.quantity > 0 || row.reservedQty > 0);

    if (rows.length === 0) {
      throw new Error(
        'Aucune ligne de stock ne correspond au périmètre choisi : inventaire impossible.'
      );
    }
    if (input.type === 'MAGASIN' && !input.warehouseId) {
      throw new Error('Un inventaire par magasin exige la sélection du magasin.');
    }
    if (input.type === 'EMPLACEMENT' && !input.locationId) {
      throw new Error("Un inventaire par emplacement exige la sélection de l'emplacement.");
    }
    if (input.type === 'ARTICLE' && !input.itemId) {
      throw new Error("Un inventaire par article exige la sélection de l'article.");
    }
    if (input.type === 'LOT' && !input.lotId) {
      throw new Error('Un inventaire par lot exige la sélection du lot.');
    }

    const lines: InventoryLine[] = rows.map(row => {
      const item = this.db.items.find(i => i.id === row.itemId);
      const warehouse = this.getWarehouseById(row.warehouseId);
      const location = this.getWarehouseLocationById(row.locationId);
      return {
        id: this.newId('INVL'),
        itemId: row.itemId,
        itemCode: row.itemCode,
        designation: item?.designation || row.itemCode,
        lotId: row.lotId,
        lotNumber: row.lotNumber,
        warehouseId: row.warehouseId,
        warehouseCode: warehouse?.code || '—',
        locationId: row.locationId,
        locationCode: location?.code || '—',
        qualityStatus: row.qualityStatus,
        unit: row.unit,
        theoreticalQty: this.roundQty(row.quantity),
      };
    });

    const inventory: StockInventory = {
      id: this.newId('INV'),
      inventoryNumber: this.nextGdsNumber(
        input.scope === 'MATIERES_PREMIERES' ? 'INV-MP' : 'INV-PF',
        this.db.stockInventories.map(inv => inv.inventoryNumber)
      ),
      scope: input.scope,
      type: input.type,
      status: 'EN_COMPTAGE',
      warehouseId: input.warehouseId,
      locationId: input.locationId,
      itemId: input.itemId,
      lotId: input.lotId,
      createdBy: this.currentUser.name,
      createdAt: this.nowIso(),
      lines,
      notes: input.notes,
    };
    this.db.stockInventories.unshift(inventory);
    this.logAudit({
      action: 'CREATE',
      entity: 'StockInventory',
      entityId: inventory.id,
      newValues: `${inventory.inventoryNumber} — ${INVENTORY_TYPE_LABELS[input.type]} — ${lines.length} ligne(s)`,
      motive: input.notes || "Ouverture d'inventaire depuis le module GDS",
    });
    this.saveDatabase(this.db);
    return inventory;
  }

  public recordInventoryCount(
    inventoryId: string,
    counts: Array<{ lineId: string; countedQty: number; justification?: string }>
  ): StockInventory {
    this.assertGds('GDS_INVENTORY', 'saisir un comptage');
    const inventory = this.findInventoryOrThrow(inventoryId);
    if (inventory.status !== 'EN_COMPTAGE') {
      throw new Error(
        `Le comptage n'est possible que sur un inventaire en cours (statut actuel : ${inventory.status}).`
      );
    }
    for (const count of counts) {
      const line = inventory.lines.find(l => l.id === count.lineId);
      if (!line) continue;
      const counted = Number(count.countedQty);
      if (!Number.isFinite(counted) || counted < 0) {
        throw new Error(`Quantité comptée invalide pour ${line.itemCode} lot ${line.lotNumber}.`);
      }
      line.countedQty = this.roundQty(counted);
      line.gapQty = this.roundQty(line.countedQty - line.theoreticalQty);
      line.justification = count.justification?.trim() || line.justification;
      line.countedBy = this.currentUser.name;
      line.countedAt = this.nowIso();
    }
    inventory.countedBy = this.currentUser.name;
    inventory.countedAt = this.nowIso();
    this.saveDatabase(this.db);
    return inventory;
  }

  public submitInventory(inventoryId: string): StockInventory {
    this.assertGds('GDS_INVENTORY', "soumettre un inventaire à validation");
    const inventory = this.findInventoryOrThrow(inventoryId);
    if (inventory.status !== 'EN_COMPTAGE') {
      throw new Error('Seul un inventaire en comptage peut être soumis.');
    }
    const uncounted = inventory.lines.filter(line => line.countedQty === undefined);
    if (uncounted.length > 0) {
      throw new Error(
        `${uncounted.length} ligne(s) ne sont pas comptées : le comptage doit être complet avant soumission.`
      );
    }
    const missingJustification = inventory.lines.filter(
      line => (line.gapQty || 0) !== 0 && !line.justification?.trim()
    );
    if (missingJustification.length > 0) {
      throw new Error(
        `${missingJustification.length} écart(s) sans justification : une justification est obligatoire pour chaque écart.`
      );
    }
    inventory.status = 'EN_VALIDATION';
    inventory.submittedBy = this.currentUser.name;
    inventory.submittedAt = this.nowIso();
    this.logAudit({
      action: 'VALIDATE',
      entity: 'StockInventory',
      entityId: inventory.id,
      newValues: `${inventory.inventoryNumber} soumis à validation — ${inventory.lines.length} ligne(s)`,
      motive: 'Soumission du comptage inventaire',
    });
    this.saveDatabase(this.db);
    return inventory;
  }

  /**
   * Validation d'un inventaire : chaque écart génère un mouvement
   * AJUSTEMENT_INVENTAIRE. Aucun solde n'est jamais corrigé sans mouvement.
   */
  public validateInventory(inventoryId: string, notes?: string): StockInventory {
    this.assertGds('GDS_VALIDATE_ADJUSTMENT', "valider les ajustements d'inventaire");
    const inventory = this.findInventoryOrThrow(inventoryId);
    if (inventory.status !== 'EN_VALIDATION') {
      throw new Error('Seul un inventaire soumis peut être validé.');
    }
    const gapLines = inventory.lines.filter(line => (line.gapQty || 0) !== 0);
    for (const line of gapLines) {
      if (!line.justification?.trim()) {
        throw new Error(
          `Justification manquante pour l'écart de ${line.itemCode} (lot ${line.lotNumber}).`
        );
      }
    }

    for (const line of gapLines) {
      const gap = this.roundQty(line.gapQty || 0);
      const movement = this.addStockMovement({
        documentNumber: inventory.inventoryNumber,
        itemId: line.itemId,
        itemCode: line.itemCode,
        batchNumber: line.lotNumber,
        lotId: line.lotId,
        type: 'AJUSTEMENT_INVENTAIRE',
        quantity: Math.abs(gap),
        unit: line.unit,
        stockDelta: gap,
        qualityStatus: line.qualityStatus,
        sourceWarehouseId: gap < 0 ? line.warehouseId : undefined,
        sourceLocationId: gap < 0 ? line.locationId : undefined,
        destinationWarehouseId: gap > 0 ? line.warehouseId : undefined,
        destinationLocationId: gap > 0 ? line.locationId : undefined,
        userId: this.currentUser.id,
        userName: this.currentUser.name,
        reason: `Inventaire ${inventory.inventoryNumber} — ${line.justification}`,
        referenceDocument: inventory.inventoryNumber,
      });
      line.adjustmentMovementId = movement.id;
    }

    inventory.status = 'VALIDE';
    inventory.validatedBy = this.currentUser.name;
    inventory.validatedAt = this.nowIso();
    if (notes) inventory.notes = inventory.notes ? `${inventory.notes}\n${notes}` : notes;

    this.logAudit({
      action: 'VALIDATE',
      entity: 'StockInventory',
      entityId: inventory.id,
      newValues: `${inventory.inventoryNumber} validé — ${gapLines.length} ajustement(s) — écart total ${this.roundQty(
        inventory.lines.reduce((sum, line) => sum + (line.gapQty || 0), 0)
      )}`,
      motive: notes || "Validation des écarts d'inventaire",
    });
    this.saveDatabase(this.db);
    return inventory;
  }

  public cancelInventory(inventoryId: string, reason: string): StockInventory {
    this.assertGds('GDS_INVENTORY', 'annuler un inventaire');
    const inventory = this.findInventoryOrThrow(inventoryId);
    if (inventory.status === 'VALIDE') {
      throw new Error(
        'Un inventaire validé ne peut plus être annulé : les mouvements générés sont définitifs.'
      );
    }
    if (!reason?.trim()) throw new Error("Un motif d'annulation est obligatoire.");
    inventory.status = 'ANNULE';
    inventory.cancelledBy = this.currentUser.name;
    inventory.cancelledAt = this.nowIso();
    inventory.cancelReason = reason.trim();
    this.logAudit({
      action: 'UPDATE',
      entity: 'StockInventory',
      entityId: inventory.id,
      oldValues: inventory.inventoryNumber,
      newValues: 'ANNULE',
      motive: reason.trim(),
    });
    this.saveDatabase(this.db);
    return inventory;
  }

  private findInventoryOrThrow(id: string): StockInventory {
    const inventory = this.db.stockInventories.find(inv => inv.id === id);
    if (!inventory) throw new Error('Inventaire introuvable.');
    return inventory;
  }

  // --- Sorties de produits finis ---

  public getFinishedGoodsIssues(filter?: {
    status?: FinishedGoodsIssueStatus;
    motive?: FinishedGoodsIssueMotive;
    search?: string;
  }): FinishedGoodsIssue[] {
    const needle = filter?.search?.trim().toLowerCase();
    return this.db.finishedGoodsIssues
      .filter(issue => !filter?.status || issue.status === filter.status)
      .filter(issue => !filter?.motive || issue.motive === filter.motive)
      .filter(issue => {
        if (!needle) return true;
        return `${issue.issueNumber} ${issue.destination} ${issue.lines
          .map(line => `${line.itemCode} ${line.lotNumber} ${line.designation}`)
          .join(' ')}`
          .toLowerCase()
          .includes(needle);
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  public getFinishedGoodsIssue(id: string): FinishedGoodsIssue | undefined {
    return this.db.finishedGoodsIssues.find(issue => issue.id === id);
  }

  public createFinishedGoodsIssue(input: {
    motive: FinishedGoodsIssueMotive;
    destination: string;
    destinationType?: string;
    date?: string;
    /** Tiers destinataire libre : aucun lien commercial, aucune facturation. */
    recipient?: string;
    documentRef?: string;
    observations?: string;
    lines: Array<{
      itemId: string;
      lotId: string;
      quantity: number;
      cartons?: number;
      pallets?: number;
    }>;
  }): FinishedGoodsIssue {
    this.assertGds('GDS_ISSUE_FP', 'créer une sortie de produits finis');
    if (!input.destination?.trim()) throw new Error('La destination de la sortie est obligatoire.');
    const destinationTypes = this.getGdsSettings().issueDestinationTypes;
    if (input.destinationType && !destinationTypes.includes(input.destinationType)) {
      throw new Error(
        `Type de destination « ${input.destinationType} » non autorisé. Types configurés : ${destinationTypes.join(', ')}.`
      );
    }
    if (!input.lines || input.lines.length === 0) {
      throw new Error('Une sortie de produits finis doit comporter au moins une ligne.');
    }
    const settings = this.getGdsSettings();
    const lines: FinishedGoodsIssueLine[] = input.lines.map(raw => {
      const item = this.db.items.find(i => i.id === raw.itemId);
      if (!item) throw new Error('Produit fini introuvable dans le référentiel.');
      if (!this.isFinishedGoodsItem(item)) {
        throw new Error(`L'article ${item.code} n'est pas un produit fini.`);
      }
      const lot = this.db.stockLots.find(l => l.id === raw.lotId);
      if (!lot) throw new Error(`Lot introuvable pour l'article ${item.code}.`);
      if (lot.itemId !== item.id) {
        throw new Error(`Le lot ${lot.lotNumber} n'appartient pas à l'article ${item.code}.`);
      }
      const quantity = this.roundQty(Number(raw.quantity));
      if (!Number.isFinite(quantity) || quantity <= 0) {
        throw new Error(`Quantité invalide pour le lot ${lot.lotNumber}.`);
      }
      if (settings.blockUnreleasedFinishedGoodsIssue && lot.qualityStatus !== 'LIBERE') {
        throw new Error(
          `Sortie refusée : le lot ${lot.lotNumber} n'est pas libéré par la qualité (statut ${lot.qualityStatus}).`
        );
      }
      const rows = this.db.warehouseStocks.filter(row => row.lotId === lot.id);
      const available = this.roundQty(
        rows
          .filter(row => row.qualityStatus === 'LIBERE')
          .reduce((sum, row) => sum + row.quantity - row.reservedQty, 0)
      );
      if (quantity > available + 0.001) {
        throw new Error(
          `Stock insuffisant pour le lot ${lot.lotNumber} : ${available} ${item.unit} disponibles, ${quantity} demandés.`
        );
      }
      return {
        id: this.newId('ISSL'),
        itemId: item.id,
        itemCode: item.code,
        designation: item.designation,
        lotId: lot.id,
        lotNumber: lot.lotNumber,
        quantity,
        unit: item.unit,
        cartons: raw.cartons,
        pallets: raw.pallets,
      };
    });

    const issue: FinishedGoodsIssue = {
      id: this.newId('ISSUE'),
      issueNumber: this.nextGdsNumber(
        'SOR-PF',
        this.db.finishedGoodsIssues.map(i => i.issueNumber)
      ),
      date: input.date || new Date().toISOString().slice(0, 10),
      motive: input.motive,
      status: 'BROUILLON',
      scope: 'PRODUITS_FINIS',
      destination: input.destination.trim(),
      destinationType: input.destinationType?.trim() || undefined,
      documentRef: input.documentRef,
      observations: input.observations,
      lines,
      createdBy: this.currentUser.name,
      createdAt: this.nowIso(),
    };
    this.db.finishedGoodsIssues.unshift(issue);
    this.logAudit({
      action: 'CREATE',
      entity: 'FinishedGoodsIssue',
      entityId: issue.id,
      newValues: `${issue.issueNumber} — ${issue.destination} — ${lines.length} ligne(s)`,
      motive: input.observations || 'Création de sortie produit fini',
    });
    this.saveDatabase(this.db);
    return issue;
  }

  public prepareFinishedGoodsIssue(
    id: string,
    lines: Array<{ lineId: string; preparedQty: number }>
  ): FinishedGoodsIssue {
    this.assertGds('GDS_ISSUE_FP', 'préparer une sortie de produits finis');
    const issue = this.findIssueOrThrow(id);
    if (issue.status !== 'BROUILLON' && issue.status !== 'EN_PREPARATION') {
      throw new Error('Seule une sortie en brouillon ou en préparation peut être préparée.');
    }
    for (const raw of lines) {
      const line = issue.lines.find(l => l.id === raw.lineId);
      if (!line) continue;
      const prepared = this.roundQty(Number(raw.preparedQty));
      if (!Number.isFinite(prepared) || prepared < 0) {
        throw new Error(`Quantité préparée invalide pour le lot ${line.lotNumber}.`);
      }
      if (prepared > line.quantity + 0.001) {
        throw new Error(
          `La quantité préparée (${prepared}) dépasse la quantité demandée (${line.quantity}) pour le lot ${line.lotNumber}.`
        );
      }
      line.preparedQty = prepared;
    }
    issue.status = 'EN_PREPARATION';
    issue.preparedBy = this.currentUser.name;
    issue.preparedAt = this.nowIso();
    this.saveDatabase(this.db);
    return issue;
  }

  public controlFinishedGoodsIssue(id: string, notes?: string): FinishedGoodsIssue {
    this.assertGds('GDS_ISSUE_FP', 'contrôler une sortie de produits finis');
    const issue = this.findIssueOrThrow(id);
    if (issue.status !== 'EN_PREPARATION') {
      throw new Error('Seule une sortie en préparation peut être contrôlée.');
    }
    const unprepared = issue.lines.filter(line => line.preparedQty === undefined);
    if (unprepared.length > 0) {
      throw new Error(
        `${unprepared.length} ligne(s) ne sont pas préparées : le contrôle exige une préparation complète.`
      );
    }
    issue.status = 'CONTROLE';
    issue.controlledBy = this.currentUser.name;
    issue.controlledAt = this.nowIso();
    if (notes) issue.observations = issue.observations ? `${issue.observations}\n${notes}` : notes;
    this.saveDatabase(this.db);
    return issue;
  }

  /**
   * Validation finale : les mouvements de sortie sont créés pour les quantités
   * réellement préparées. Les mouvements validés ne sont jamais supprimés.
   */
  public validateFinishedGoodsIssue(id: string): FinishedGoodsIssue {
    this.assertGds('GDS_ISSUE_FP', 'valider une sortie de produits finis');
    const issue = this.findIssueOrThrow(id);
    if (issue.status !== 'CONTROLE' && issue.status !== 'EN_PREPARATION') {
      throw new Error('Seule une sortie préparée ou contrôlée peut être validée.');
    }
    const settings = this.getGdsSettings();
    let shippedTotal = 0;

    for (const line of issue.lines) {
      const quantity = this.roundQty(
        line.preparedQty !== undefined ? line.preparedQty : line.quantity
      );
      if (quantity <= 0) {
        line.shippedQty = 0;
        continue;
      }
      const lot = this.db.stockLots.find(l => l.id === line.lotId);
      if (!lot) throw new Error(`Lot ${line.lotNumber} introuvable.`);
      if (settings.blockUnreleasedFinishedGoodsIssue && lot.qualityStatus !== 'LIBERE') {
        throw new Error(
          `Sortie refusée : le lot ${lot.lotNumber} n'est plus libéré (statut ${lot.qualityStatus}).`
        );
      }
      const rows = this.db.warehouseStocks
        .filter(row => row.lotId === lot.id && row.qualityStatus === 'LIBERE')
        .sort((a, b) => b.quantity - a.quantity);
      if (rows.length === 0) {
        throw new Error(`Aucun stock libéré pour le lot ${lot.lotNumber}.`);
      }
      let remaining = quantity;
      for (const row of rows) {
        if (remaining <= 0.001) break;
        const warehouse = this.getWarehouseById(row.warehouseId);
        const location = this.getWarehouseLocationById(row.locationId);
        const take = this.roundQty(Math.min(remaining, Math.max(0, row.quantity - row.reservedQty)));
        if (take <= 0) continue;
        this.addStockMovement({
          documentNumber: issue.issueNumber,
          itemId: line.itemId,
          itemCode: line.itemCode,
          batchNumber: line.lotNumber,
          lotId: line.lotId,
          type: 'SORTIE_PRODUIT_FINI',
          quantity: take,
          unit: line.unit,
          stockDelta: -take,
          sourceWarehouseId: row.warehouseId,
          sourceLocationId: row.locationId,
          qualityStatus: 'LIBERE',
          userId: this.currentUser.id,
          userName: this.currentUser.name,
          reason: `Sortie ${issue.issueNumber} — ${FINISHED_GOODS_ISSUE_MOTIVE_LABELS[issue.motive]} — ${issue.destination}`,
          referenceDocument: issue.documentRef || issue.issueNumber,
        });
        issue.warehouseId = issue.warehouseId || warehouse?.id;
        remaining = this.roundQty(remaining - take);
        void location;
      }
      if (remaining > 0.001) {
        throw new Error(
          `Stock insuffisant pour le lot ${line.lotNumber} : ${remaining} ${line.unit} manquants.`
        );
      }
      line.shippedQty = quantity;
      shippedTotal = this.roundQty(shippedTotal + quantity);
    }

    if (shippedTotal <= 0) {
      throw new Error('Aucune quantité à sortir : la validation est impossible.');
    }
    issue.status = 'VALIDE';
    issue.validatedBy = this.currentUser.name;
    issue.validatedAt = this.nowIso();
    this.logAudit({
      action: 'VALIDATE',
      entity: 'FinishedGoodsIssue',
      entityId: issue.id,
      newValues: `${issue.issueNumber} validée — ${shippedTotal} unité(s) sorties — ${issue.destination}`,
      motive: `Sortie de produits finis : ${FINISHED_GOODS_ISSUE_MOTIVE_LABELS[issue.motive]}`,
    });
    this.saveDatabase(this.db);
    return issue;
  }

  public cancelFinishedGoodsIssue(id: string, reason: string): FinishedGoodsIssue {
    this.assertGds('GDS_ISSUE_FP', 'annuler une sortie de produits finis');
    const issue = this.findIssueOrThrow(id);
    if (issue.status === 'VALIDE') {
      throw new Error(
        'Une sortie validée ne peut pas être annulée : les mouvements de stock sont définitifs. Créez un retour ou un inventaire.'
      );
    }
    if (!reason?.trim()) throw new Error("Un motif d'annulation est obligatoire.");
    issue.status = 'ANNULE';
    issue.cancelledBy = this.currentUser.name;
    issue.cancelledAt = this.nowIso();
    issue.cancelReason = reason.trim();
    this.logAudit({
      action: 'UPDATE',
      entity: 'FinishedGoodsIssue',
      entityId: issue.id,
      oldValues: issue.issueNumber,
      newValues: 'ANNULE',
      motive: reason.trim(),
    });
    this.saveDatabase(this.db);
    return issue;
  }

  private findIssueOrThrow(id: string): FinishedGoodsIssue {
    const issue = this.db.finishedGoodsIssues.find(i => i.id === id);
    if (!issue) throw new Error('Sortie de produits finis introuvable.');
    return issue;
  }

  // --- Rapports GDS ---

  public getGdsReport(year = new Date().getFullYear()): GdsReport {
    this.assertGds('GDS_VIEW_REPORTS', 'consulter les rapports GDS');
    const round = (value: number) => this.roundQty(value);
    const scopeByItem = new Map<string, GdsScope>();
    for (const item of this.db.items) scopeByItem.set(item.id, this.getItemGdsScope(item));

    const monthly = Array.from({ length: 12 }, (_, index) => {
      const period = `${year}-${String(index + 1).padStart(2, '0')}`;
      const movements = this.db.stockMovements.filter(m => m.timestamp.slice(0, 7) === period);
      const mpEntries = round(
        movements
          .filter(m => scopeByItem.get(m.itemId) === 'MATIERES_PREMIERES' && (m.stockDelta || 0) > 0)
          .reduce((sum, m) => sum + (m.stockDelta || 0), 0)
      );
      const mpExits = round(
        movements
          .filter(m => scopeByItem.get(m.itemId) === 'MATIERES_PREMIERES' && (m.stockDelta || 0) < 0)
          .reduce((sum, m) => sum + Math.abs(m.stockDelta || 0), 0)
      );
      const fgReceipts = round(
        movements
          .filter(
            m =>
              scopeByItem.get(m.itemId) === 'PRODUITS_FINIS' &&
              m.type === 'RECEPTION_PRODUCTION'
          )
          .reduce((sum, m) => sum + (m.stockDelta || 0), 0)
      );
      const fgIssues = round(
        movements
          .filter(
            m =>
              scopeByItem.get(m.itemId) === 'PRODUITS_FINIS' &&
              (m.type === 'SORTIE_VENTE' || m.type === 'SORTIE_PRODUIT_FINI')
          )
          .reduce((sum, m) => sum + Math.abs(m.stockDelta || 0), 0)
      );
      const adjustments = movements.filter(m => m.type === 'AJUSTEMENT_INVENTAIRE').length;
      const inventoryGapValue = round(
        movements
          .filter(m => m.type === 'AJUSTEMENT_INVENTAIRE')
          .reduce((sum, m) => sum + Math.abs(m.stockDelta || 0), 0)
      );
      return { period, mpEntries, mpExits, fgReceipts, fgIssues, adjustments, inventoryGapValue };
    });

    const mpStock = this.getGdsStock('MATIERES_PREMIERES');
    const byFamily = mpStock.map(row => ({
      label: ITEM_CATEGORY_GROUP_LABELS[row.group],
      physical: row.physical,
      available: row.available,
      itemCount: 1,
    }));
    const familyMap = new Map<string, { label: string; physical: number; available: number; itemCount: number }>();
    for (const row of byFamily) {
      const entry = familyMap.get(row.label) || {
        label: row.label,
        physical: 0,
        available: 0,
        itemCount: 0,
      };
      entry.physical = round(entry.physical + row.physical);
      entry.available = round(entry.available + row.available);
      entry.itemCount += 1;
      familyMap.set(row.label, entry);
    }

    const byWarehouse = [
      ...this.getGdsDashboard('MATIERES_PREMIERES').byWarehouse,
      ...this.getGdsDashboard('PRODUITS_FINIS').byWarehouse,
    ].map(entry => ({
      code: entry.code,
      designation: entry.designation,
      type: entry.type,
      physical: entry.physical,
      available: entry.available,
    }));

    const yearMovements = this.db.stockMovements.filter(m =>
      m.timestamp.startsWith(String(year))
    );

    const consumedMap = new Map<string, { itemCode: string; designation: string; quantity: number; unit: UnitOfMeasure }>();
    for (const movement of yearMovements.filter(m => m.type === 'CONSOMMATION_OF')) {
      const item = this.db.items.find(i => i.id === movement.itemId);
      const entry = consumedMap.get(movement.itemId) || {
        itemCode: movement.itemCode,
        designation: item?.designation || movement.itemCode,
        quantity: 0,
        unit: movement.unit,
      };
      entry.quantity = round(entry.quantity + Math.abs(movement.stockDelta || 0));
      consumedMap.set(movement.itemId, entry);
    }
    const topConsumed = Array.from(consumedMap.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 8);

    const producedMap = new Map<string, { itemCode: string; designation: string; cans: number; cartons: number }>();
    for (const batch of this.db.finishedBatches.filter(b =>
      (b.productionDate || '').startsWith(String(year))
    )) {
      const item = this.db.items.find(i => i.id === batch.itemId);
      const entry = producedMap.get(batch.itemId) || {
        itemCode: item?.code || batch.itemId,
        designation: item?.designation || batch.productName,
        cans: 0,
        cartons: 0,
      };
      entry.cans += batch.conformingCans;
      entry.cartons += batch.totalCartons;
      producedMap.set(batch.itemId, entry);
    }
    const topProduced = Array.from(producedMap.values())
      .sort((a, b) => b.cans - a.cans)
      .slice(0, 8);

    const losses = yearMovements
      .filter(m => m.type === 'REBUT_DEFECTUEUX')
      .map(m => {
        const item = this.db.items.find(i => i.id === m.itemId);
        return {
          itemCode: m.itemCode,
          designation: item?.designation || m.itemCode,
          quantity: round(Math.abs(m.stockDelta || 0)),
          unit: m.unit,
          reason: m.reason || 'Rebut',
        };
      })
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 8);

    const validatedInventories = this.db.stockInventories.filter(
      inv => inv.status === 'VALIDE' && inv.validatedAt?.startsWith(String(year))
    );
    const countedLines = validatedInventories.flatMap(inv => inv.lines);
    const exactLines = countedLines.filter(line => (line.gapQty || 0) === 0).length;
    const inventoryAccuracy =
      countedLines.length > 0 ? Math.round((exactLines / countedLines.length) * 1000) / 10 : 100;

    return {
      year,
      monthly,
      byFamily: Array.from(familyMap.values()),
      byWarehouse,
      topConsumed,
      topProduced,
      losses,
      inventoryAccuracy,
      totalMovements: yearMovements.length,
    };
  }

  // --- Jeu de démonstration GDS (optionnel, jamais chargé automatiquement) ---

  /**
   * Charge un jeu de démonstration sur une base VIERGE.
   *
   * Aucune valeur n'est écrite en dur dans les écrans : chaque quantité passe
   * par `addStockMovement` / `addFinishedBatch`, donc par le grand livre unique.
   * Les relations créées sont réelles (OF → recette validée → article fini,
   * lot → mouvement → magasin), jamais simulées.
   *
   * Refusé si le grand livre contient déjà des mouvements : le jeu de
   * démonstration ne doit jamais polluer une base d'exploitation.
   */
  public seedGdsDemoData(): {
    movements: number;
    lots: number;
    workOrders: number;
    consumptionSheets: number;
    finishedBatches: number;
  } {
    this.assertGdsAdministration('charger le jeu de démonstration GDS');

    if (this.db.stockMovements.length > 0) {
      throw new Error(
        "Le grand livre contient déjà des mouvements : le jeu de démonstration ne s'applique qu'à une base vierge."
      );
    }

    const mpWarehouse =
      this.findWarehouseByType('MATIERES_PREMIERES') || this.findWarehouseByType('PRODUCTION');
    const embWarehouse = this.findWarehouseByType('EMBALLAGES') || mpWarehouse!;
    const quarantineWarehouse = this.findWarehouseByType('QUARANTAINE');
    const finishedWarehouse = this.findWarehouseByType('PRODUITS_FINIS');
    if (!mpWarehouse || !finishedWarehouse) {
      throw new Error(
        'Magasins requis introuvables : un magasin de matières premières et un magasin de produits finis sont nécessaires.'
      );
    }

    const dayOffset = (days: number) => {
      const date = new Date();
      date.setDate(date.getDate() + days);
      return date.toISOString().slice(0, 10);
    };
    const today = new Date().toISOString().slice(0, 10);
    const operator = this.currentUser;

    // --- 1. Ordres de fabrication réels (recettes validées existantes) ---
    const workOrders: string[] = [];
    const buildWorkOrder = (recipeId: string, plannedCans: number, cartons: number, line: string) => {
      const recipe = this.db.recipes.find(r => r.id === recipeId);
      if (!recipe) return undefined;
      const finishedItem = this.db.items.find(i => i.id === recipe.finishedItemId);
      if (!finishedItem) return undefined;
      const workOrder = this.addWorkOrder({
        recipeId: recipe.id,
        finishedItemId: finishedItem.id,
        productName: finishedItem.designation,
        plannedCansQty: plannedCans,
        plannedCartonsQty: cartons,
        actualCansQty: 0,
        theoreticalFishKgNeeded: Math.round(plannedCans * 0.2),
        actualFishKgConsumed: 0,
        rejectedCansQty: 0,
        lineId: line,
        teamLeader: 'Chef de ligne démonstration',
        shift: 'EQUIPE_MATIN',
        startDatePlanned: today,
        endDatePlanned: dayOffset(1),
        assignedRawBatchId: 'LOT-DEMO-THON-01',
        assignedCanBatchId: 'LOT-DEMO-BTE-01',
        assignedLidBatchId: 'LOT-DEMO-COUV-01',
        priority: 'NORMALE',
        status: 'EN_COURS',
      });
      workOrders.push(workOrder.id);
      return workOrder;
    };

    const woThon = buildWorkOrder('REC-01', 24_000, 1_000, 'LIGNE-THON-1');
    const woSardine = buildWorkOrder('REC-04', 18_000, 750, 'LIGNE-SARDINE-1');

    // --- 2. Entrées matières premières (réceptions réelles, lots + péremption) ---
    type EntryLine = {
      code: string;
      qty: number;
      lot: string;
      expiryDays: number;
      warehouseId: string;
      quality?: StockQualityStatus;
      document: string;
    };

    const entries: EntryLine[] = [
      { code: 'MP-THON-ALB', qty: 12_000, lot: 'LOT-DEMO-THON-01', expiryDays: 540, warehouseId: mpWarehouse.id, document: 'BR-DEMO-2026-001' },
      { code: 'MP-THON-SKJ', qty: 15_000, lot: 'LOT-DEMO-SKJ-01', expiryDays: 420, warehouseId: mpWarehouse.id, document: 'BR-DEMO-2026-002' },
      { code: 'MP-SARD-PIL', qty: 4_200, lot: 'LOT-DEMO-SARD-01', expiryDays: 9, warehouseId: mpWarehouse.id, document: 'BR-DEMO-2026-003' },
      { code: 'ING-HUILE-OLIV', qty: 1_800, lot: 'LOT-DEMO-HUIL-01', expiryDays: 720, warehouseId: mpWarehouse.id, document: 'BR-DEMO-2026-004' },
      { code: 'ING-SAUCE-TOM', qty: 2_400, lot: 'LOT-DEMO-TOM-01', expiryDays: 400, warehouseId: mpWarehouse.id, document: 'BR-DEMO-2026-005' },
      { code: 'ING-SEL-FIN', qty: 950, lot: 'LOT-DEMO-SEL-01', expiryDays: 900, warehouseId: mpWarehouse.id, document: 'BR-DEMO-2026-006' },
      { code: 'EMB-BOITE-14CLUB', qty: 180_000, lot: 'LOT-DEMO-BTE-01', expiryDays: 1_095, warehouseId: embWarehouse.id, document: 'BR-DEMO-2026-007' },
      { code: 'EMB-COUV-14CLUB', qty: 175_000, lot: 'LOT-DEMO-COUV-01', expiryDays: 1_095, warehouseId: embWarehouse.id, document: 'BR-DEMO-2026-008' },
      { code: 'EMB-CARTON-50B', qty: 3_600, lot: 'LOT-DEMO-CART-01', expiryDays: 730, warehouseId: embWarehouse.id, document: 'BR-DEMO-2026-009' },
      // Lot placé directement en quarantaine : non disponible pour la production.
      ...(quarantineWarehouse
        ? [{
            code: 'MP-THON-ALB',
            qty: 1_500,
            lot: 'LOT-DEMO-THON-QUAR-01',
            expiryDays: 540,
            warehouseId: quarantineWarehouse.id,
            quality: 'QUARANTAINE' as StockQualityStatus,
            document: 'BR-DEMO-2026-010',
          }]
        : []),
    ];

    let lots = 0;
    let lastThonLot = 'LOT-DEMO-THON-01';

    for (const entry of entries) {
      const item = this.db.items.find(i => i.code === entry.code);
      if (!item) continue;
      const warehouse = this.getWarehouseById(entry.warehouseId) || mpWarehouse;
      const location = this.getDefaultLocation(warehouse.id);
      if (!location) continue;

      this.addStockMovement({
        type: 'ENTREE_RECEPTION',
        itemId: item.id,
        itemCode: item.code,
        batchNumber: entry.lot,
        quantity: entry.qty,
        unit: item.unit,
        destinationWarehouseId: warehouse.id,
        destinationLocationId: location.id,
        qualityStatus: entry.quality || 'LIBERE',
        documentNumber: entry.document,
        referenceDocument: entry.document,
        userId: operator.id,
        userName: operator.name,
        reason: 'Réception fournisseur (jeu de démonstration)',
      });

      const lot = this.db.stockLots.find(l => l.itemId === item.id && l.lotNumber === entry.lot);
      if (lot) {
        lot.receptionDate = dayOffset(-12);
        lot.expiryDate = dayOffset(entry.expiryDays);
        lot.origin = 'Fournisseur (jeu de démonstration)';
        lots += 1;
      }
      if (entry.code === 'MP-THON-ALB' && !entry.quality) lastThonLot = entry.lot;
    }

    // --- 3. Consommation réelle : sortie DIRECTE du stock, sans transfert atelier ---
    // La fiche est créée puis validée : c'est la validation qui déduit le stock et
    // enregistre le mouvement, jamais l'affichage ni la création de l'OF.
    const productionWarehouse = this.findWarehouseByType('PRODUCTION') || mpWarehouse;
    const prodLocation = this.getDefaultLocation(productionWarehouse.id);
    const consumptionLines: ConsumptionLine[] = [];
    let consumptionSheets = 0;

    const dotationPlan: Array<{
      code: string;
      lot: string;
      warehouseId: string;
      theoretical: number;
      withdrawn: number;
      used: number;
      returned: number;
    }> = [
      { code: 'MP-THON-ALB', lot: 'LOT-DEMO-THON-01', warehouseId: mpWarehouse.id, theoretical: 2_000, withdrawn: 2_500, used: 2_100, returned: 400 },
      { code: 'ING-HUILE-OLIV', lot: 'LOT-DEMO-HUIL-01', warehouseId: mpWarehouse.id, theoretical: 320, withdrawn: 320, used: 320, returned: 0 },
      { code: 'EMB-BOITE-14CLUB', lot: 'LOT-DEMO-BTE-01', warehouseId: embWarehouse.id, theoretical: 12_000, withdrawn: 12_000, used: 12_000, returned: 0 },
    ];

    if (woThon) {
      for (const line of dotationPlan) {
        const item = this.db.items.find(i => i.code === line.code);
        const lot = this.db.stockLots.find(l => l.itemId === item?.id && l.lotNumber === line.lot);
        const stockRow = lot
          ? this.db.warehouseStocks.find(r => r.lotId === lot.id && r.warehouseId === line.warehouseId)
          : undefined;
        if (!item || !lot || !stockRow) continue;

        const location = this.getWarehouseLocationById(stockRow.locationId);
        consumptionLines.push({
          id: `CL-DEMO-${item.code}`,
          itemId: item.id,
          itemCode: item.code,
          designation: item.designation,
          category: item.code.startsWith('EMB-')
            ? 'EMBALLAGE'
            : item.code.startsWith('ING-')
              ? 'INGREDIENT'
              : item.code.startsWith('CONS-')
                ? 'CONSOMMABLE'
                : 'MATIERE_PREMIERE',
          lots: [
            {
              lotId: lot.id,
              lotNumber: lot.lotNumber,
              withdrawnQty: line.withdrawn,
              usedQty: line.used,
              returnedQty: line.returned,
              wasteQty: 0,
              unit: item.unit,
              storageLocation: location?.code || '',
              lotStatus: 'LIBERE',
            },
          ],
          batchNumber: lot.lotNumber,
          storageLocation: location?.code || '',
          initialTheoreticalQuantity: line.theoretical,
          adjustedTheoreticalQuantity: line.theoretical,
          actualConsumedQuantity: line.used,
          withdrawnQuantity: line.withdrawn,
          returnedQuantity: line.returned,
          wasteQuantity: 0,
          unit: item.unit,
          tolerancePercent: 2,
          quantityVariance: this.roundQty(line.used - line.theoretical),
          percentageVariance:
            line.theoretical > 0
              ? ((line.used - line.theoretical) / line.theoretical) * 100
              : 0,
          varianceReason:
            line.used !== line.theoretical ? 'Écart constaté en atelier' : undefined,
          responsibleOperator: operator.name,
        });
      }
    }

    // --- 4. Réceptions de production (lots finis liés à un OF réel) ---
    let finishedBatches = 0;
    let releasedBatch: FinishedBatch | undefined;
    const receiveBatch = (
      workOrderId: string | undefined,
      itemCode: string,
      cans: number,
      cartons: number,
      pallets: number,
      releaseStatus: BatchReleaseStatus,
      qualityStatus: StockQualityStatus,
      bestBeforeMonths: number
    ) => {
      if (!workOrderId) return undefined;
      const item = this.db.items.find(i => i.code === itemCode);
      const workOrder = this.db.workOrders.find(w => w.id === workOrderId);
      if (!item || !workOrder) return undefined;
      const bestBefore = new Date();
      bestBefore.setMonth(bestBefore.getMonth() + bestBeforeMonths);

      const batch = this.addFinishedBatch(
        {
          workOrderId,
          itemId: item.id,
          productName: item.designation,
          format: item.format || item.packaging || '1/4 Club',
          productionDate: today,
          bestBeforeDate: bestBefore.toISOString().slice(0, 10),
          totalCansProduced: cans,
          conformingCans: cans,
          rejectedCans: 0,
          totalCartons: cartons,
          totalPallets: pallets,
          warehouseLocation: this.getDefaultLocation(finishedWarehouse.id)?.code || 'PF-ZONE-1',
          seamingChecked: true,
          autoclaveCycleConforming: true,
          incubationTestPassed: releaseStatus === 'LIBERE',
          chemicalAndHistaminePassed: releaseStatus === 'LIBERE',
          releaseStatus,
          releasedBy: releaseStatus === 'LIBERE' ? operator.name : undefined,
          releaseDate: releaseStatus === 'LIBERE' ? today : undefined,
          releaseNotes:
            releaseStatus === 'BLOQUE'
              ? 'Blocage qualité : non-conformité sertissage (jeu de démonstration)'
              : undefined,
        },
        { qualityStatus }
      );
      finishedBatches += 1;
      if (releaseStatus === 'LIBERE') releasedBatch = batch;
      return batch;
    };

    receiveBatch(woThon?.id, 'PF-THON-OLIV-14', 12_000, 500, 5, 'LIBERE', 'LIBERE', 60);
    receiveBatch(woThon?.id, 'PF-THON-NATUR-14', 6_000, 250, 3, 'EN_ATTENTE', 'EN_ATTENTE_CONTROLE', 60);
    receiveBatch(woSardine?.id, 'PF-SARD-TOM-14', 9_000, 375, 4, 'BLOQUE', 'BLOQUE', 36);

    // --- 5. Fiches de consommation réelle : lien PF → MP de la traçabilité ---
    const registerConsumptionSheet = (
      workOrder: typeof woThon,
      lines: ConsumptionLine[],
      finishedBatchNumber: string,
      note: string,
      producedCans = 0,
      conformCans = 0
    ) => {
      if (!workOrder || lines.length === 0) return;
      const recipe = this.db.recipes.find(r => r.id === workOrder.recipeId);
      const finishedItem = this.db.items.find(i => i.id === workOrder.finishedItemId);
      const sheet = this.addConsumption({
        workOrderId: workOrder.id,
        workOrderNumber: workOrder.orderNumber,
        recipeId: workOrder.recipeId,
        recipeCode: recipe?.code || workOrder.recipeId,
        recipeVersion: workOrder.recipeVersion || recipe?.version || '1.0',
        finishedItemId: workOrder.finishedItemId,
        finishedItemCode: finishedItem?.code || '',
        finishedItemName: workOrder.productName,
        finishedBatchNumber,
        lineId: workOrder.lineId,
        shift: 'EQUIPE_MATIN',
        consumptionDateTime: new Date().toISOString(),
        recordedBy: operator.name,
        status: 'EN_ATTENTE_VALIDATION',
        plannedQuantityCans: workOrder.plannedCansQty,
        actualProducedQuantityCans: producedCans,
        conformQuantityCans: conformCans,
        lines,
        notes: note,
      });
      // Validation : déduction directe du stock du magasin d'origine.
      this.validateConsumption(sheet.id, operator);
      consumptionSheets += 1;
    };

    registerConsumptionSheet(
      woThon,
      consumptionLines,
      releasedBatch?.batchNumber || '',
      'Fiche de consommation du jeu de démonstration : la sortie de stock a lieu à la validation, sans transfert atelier préalable.',
      releasedBatch?.totalCansProduced || 0,
      releasedBatch?.conformingCans || 0
    );

    // Second OF : les lignes sont dérivées de la nomenclature réelle de l'OF
    // (aucune relation inventée). Un reliquat reste physiquement en atelier et
    // alimente l'écran « Retours de production ».
    if (woSardine) {
      const sardineLines: ConsumptionLine[] = [];
      const lineCategory = (category: Item['category']): ConsumptionLine['category'] => {
        if (category === 'BOITE_METALLIQUE' || category === 'COUVERCLE' || category === 'CARTON_EMBALLAGE' || category === 'ETIQUETTE') {
          return 'EMBALLAGE';
        }
        if (category === 'HUILE' || category === 'SAUCE_EPICES') return 'INGREDIENT';
        if (category === 'CONSOMMABLE' || category === 'PRODUIT_CHIMIQUE') return 'CONSOMMABLE';
        return 'MATIERE_PREMIERE';
      };

      for (const requirement of this.getWorkOrderMaterialRequirements(woSardine.id)) {
        if (sardineLines.length >= 2) break;
        const item = this.db.items.find(i => i.id === requirement.itemId);
        const lot = requirement.availableLots[0];
        if (!item || !lot) continue;
        const used = this.roundQty(requirement.requiredQty);
        // Surplus plafonné à 10 % et à la disponibilité réelle du lot.
        const surplus = this.roundQty(Math.min(used * 0.1, lot.quantity - used));
        if (used <= 0 || surplus <= 0) continue;
        const withdrawn = this.roundQty(used + surplus);
        sardineLines.push({
          id: `CL-DEMO-${item.code}`,
          itemId: item.id,
          itemCode: item.code,
          designation: item.designation,
          category: lineCategory(item.category),
          lots: [
            {
              lotId: lot.lotId,
              lotNumber: lot.lotNumber,
              withdrawnQty: withdrawn,
              usedQty: used,
              returnedQty: 0,
              wasteQty: 0,
              unit: requirement.unit,
              storageLocation: this.getWarehouseLocationById(lot.locationId)?.code || '',
              lotStatus: 'LIBERE',
            },
          ],
          batchNumber: lot.lotNumber,
          storageLocation: this.getWarehouseLocationById(lot.locationId)?.code || '',
          initialTheoreticalQuantity: requirement.requiredQty,
          adjustedTheoreticalQuantity: requirement.requiredQty,
          actualConsumedQuantity: used,
          withdrawnQuantity: withdrawn,
          returnedQuantity: 0,
          wasteQuantity: 0,
          unit: requirement.unit,
          tolerancePercent: 2,
          quantityVariance: 0,
          percentageVariance: 0,
          responsibleOperator: operator.name,
        });
      }

      registerConsumptionSheet(
        woSardine,
        sardineLines,
        '',
        'Sortie directe avec reliquat non consommé resté en atelier (jeu de démonstration).',
        9_000,
        9_000
      );
    }

    const totalMovements = this.db.stockMovements.length;

    this.logAudit({
      action: 'CREATE',
      entity: 'GdsDemoData',
      entityId: 'GDS-DEMO',
      oldValues: 'Base vierge',
      newValues: `${totalMovements} mouvements, ${lots} lots, ${workOrders.length} OF, ${consumptionSheets} fiche(s) de consommation, ${finishedBatches} lots finis`,
      motive: 'Chargement explicite du jeu de démonstration GDS',
    });

    this.saveDatabase(this.db);
    return {
      movements: totalMovements,
      lots,
      workOrders: workOrders.length,
      consumptionSheets,
      finishedBatches,
    };
  }

  // --- Sauvegarde & Restauration & Export PostgreSQL Windows ---
  /** Refus d'une opération sensible sur la base : journalisé avant de remonter l'erreur. */
  private assertAuditPermission(permission: AuditPermission, operation: string) {
    if (this.hasPermission(this.currentUser, permission)) return;
    this.logAudit({
      action: 'BLOCK',
      entity: 'Database',
      entityId: 'ALL',
      newValues: `${operation} refusé au profil ${this.currentUser.name} (${this.currentUser.role}) — permission ${permission} absente`,
      motive: 'Contrôle d\'accès aux données de la base',
    });
    throw new Error(
      `${operation} : le profil ${this.currentUser.name} (${this.currentUser.role}) ne dispose pas de la permission « ${AUDIT_PERMISSION_LABELS[permission]} ».`
    );
  }

  public exportJsonDatabase(): string {
    this.assertAuditPermission('BACKUP_EXPORT', 'Export de la sauvegarde JSON');
    this.logAudit({
      action: 'EXPORT',
      entity: 'Database',
      entityId: 'ALL',
      newValues: 'Exportation de la sauvegarde complète JSON',
    });
    return JSON.stringify(this.db, null, 2);
  }

  public importJsonDatabase(jsonStr: string): boolean {
    this.assertAuditPermission('BACKUP_IMPORT', 'Restauration d\'une sauvegarde JSON');
    try {
      const parsed = JSON.parse(jsonStr) as AppDatabase;
      if (!parsed.items || !parsed.workOrders || !parsed.receptions) {
        throw new Error('Fichier de sauvegarde invalide');
      }
      // Les sauvegardes antérieures au référentiel MP & composants sont migrées
      // à la volée : aucune collection historique n'est perdue.
      this.db = migrateDatabase(parsed);
      this.saveDatabase(this.db);
      this.logAudit({
        action: 'RESTORE',
        entity: 'Database',
        entityId: 'ALL',
        newValues: 'Restauration réussie depuis sauvegarde JSON',
      });
      return true;
    } catch (e) {
      console.error('Erreur lors de la restauration:', e);
      return false;
    }
  }

  public resetToFactoryDefault() {
    this.assertAuditPermission('DATABASE_RESET', 'Réinitialisation de la base');
    const operator = this.currentUser;
    this.logAudit({
      action: 'RESTORE',
      entity: 'Database',
      entityId: 'FACTORY_RESET',
      newValues: 'Réinitialisation complète aux données usine par défaut',
      motive: `Opération effectuée par ${operator.name} (${operator.role})`,
    });
    // Le registre d'audit est conservé : ISO 22000 § 7.5 impose des informations
    // documentées non rétroactivement effaçables, y compris par l'administrateur.
    const preservedAuditLogs = this.db.auditLogs;
    this.db = migrateDatabase(getInitialDatabase());
    this.db.auditLogs = [...preservedAuditLogs, ...this.db.auditLogs];
    this.saveDatabase(this.db);
    this.currentUser = this.db.users.find(u => u.id === operator.id) || this.loadCurrentUser();
    // Les empreintes de code PIN sont effacées : la session est fermée et chaque
    // profil doit se ré-enrôler à sa prochaine connexion.
    this.logout();
  }

  public generatePostgresSqlDump(): string {
    this.assertAuditPermission('SQL_DUMP_EXPORT', 'Export du script SQL PostgreSQL');
    this.logAudit({
      action: 'EXPORT',
      entity: 'Database',
      entityId: 'SQL_DUMP',
      newValues: 'Génération du script SQL DDL/DML PostgreSQL pour le serveur Windows',
    });
    const dateStr = new Date().toISOString();
    return `-- =====================================================================
-- MAMORA GP — DUMP SQL DDL / DML POSTGRESQL SERVEUR USINE (WINDOWS)
-- Généré automatiquement le : ${dateStr}
-- Compatible PostgreSQL 14+, 15+, 16+
-- =====================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table des Utilisateurs & Rôles
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    role VARCHAR(50) NOT NULL,
    badge_number VARCHAR(50),
    department VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table des Articles & Matières Premières
CREATE TABLE IF NOT EXISTS items (
    id VARCHAR(50) PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    designation VARCHAR(255) NOT NULL,
    secondary_designation VARCHAR(255),
    category VARCHAR(50) NOT NULL,
    category_group VARCHAR(50),
    sub_category_id VARCHAR(50),
    description TEXT,
    photo_data_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    unit VARCHAR(20) NOT NULL,
    secondary_unit VARCHAR(20),
    conversion_coefficient NUMERIC(12,4),
    packaging VARCHAR(150),
    quantity_per_packaging NUMERIC(12,4),
    default_warehouse_id VARCHAR(50),
    default_location_id VARCHAR(50),
    format VARCHAR(50),
    net_weight_grams NUMERIC(10,2),
    drained_weight_grams NUMERIC(10,2),
    min_stock_level NUMERIC(12,2) DEFAULT 0,
    max_stock_level NUMERIC(12,2),
    current_stock NUMERIC(12,2) DEFAULT 0,
    quarantine_stock NUMERIC(12,2) DEFAULT 0,
    storage_condition TEXT,
    min_temperature_c NUMERIC(5,2),
    max_temperature_c NUMERIC(5,2),
    technical_specifications TEXT,
    allergens TEXT,
    receipt_control_requirements TEXT,
    mandatory_documents TEXT,
    shelf_life_months INTEGER,
    primary_supplier_id VARCHAR(50),
    technical_sheet_version VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE,
    created_by VARCHAR(150),
    updated_at TIMESTAMP WITH TIME ZONE,
    updated_by VARCHAR(150),
    deactivated_at TIMESTAMP WITH TIME ZONE,
    deactivated_by VARCHAR(150),
    deactivation_reason TEXT
);

-- Référentiel des sous-catégories d'articles (configurable)
CREATE TABLE IF NOT EXISTS item_sub_categories (
    id VARCHAR(50) PRIMARY KEY,
    category_group VARCHAR(50) NOT NULL,
    code VARCHAR(50) NOT NULL,
    designation VARCHAR(150) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (category_group, code)
);

-- Référentiel unique des fournisseurs (repris des réceptions + saisie manuelle)
CREATE TABLE IF NOT EXISTS suppliers (
    id VARCHAR(50) PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) UNIQUE NOT NULL,
    contact_name VARCHAR(150),
    email VARCHAR(150),
    phone VARCHAR(50),
    address TEXT,
    country VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    origin VARCHAR(20) DEFAULT 'MANUEL',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Journal des modifications des fiches articles (une ligne par champ modifié)
CREATE TABLE IF NOT EXISTS item_change_logs (
    id VARCHAR(80) PRIMARY KEY,
    item_id VARCHAR(50) NOT NULL REFERENCES items(id),
    item_code VARCHAR(50) NOT NULL,
    item_designation VARCHAR(255) NOT NULL,
    action VARCHAR(20) NOT NULL,
    field VARCHAR(60) NOT NULL,
    field_label VARCHAR(120),
    old_value TEXT,
    new_value TEXT,
    user_id VARCHAR(50),
    user_name VARCHAR(150),
    user_role VARCHAR(50),
    motive TEXT,
    changed_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_item_change_logs_item ON item_change_logs(item_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_items_category_group ON items(category_group, is_active);

-- Table des Réceptions & Agréage Matières Premières (ISO 22000)
CREATE TABLE IF NOT EXISTS raw_batch_receptions (
    id VARCHAR(50) PRIMARY KEY,
    reception_number VARCHAR(50) UNIQUE NOT NULL,
    internal_batch_number VARCHAR(50) UNIQUE NOT NULL,
    supplier VARCHAR(150) NOT NULL,
    vessel_or_origin VARCHAR(150),
    supplier_batch_number VARCHAR(100),
    species VARCHAR(100) NOT NULL,
    reception_date TIMESTAMP WITH TIME ZONE NOT NULL,
    ordered_qty_kg NUMERIC(12,2),
    received_qty_kg NUMERIC(12,2),
    accepted_qty_kg NUMERIC(12,2),
    temperature_at_intake_c NUMERIC(5,2),
    histamine_ppm NUMERIC(6,2),
    vehicle_cleanliness_compliant BOOLEAN DEFAULT TRUE,
    storage_location VARCHAR(100),
    decision VARCHAR(50) NOT NULL,
    decision_reason TEXT
);

-- Table des Ordres de Fabrication (OF)
CREATE TABLE IF NOT EXISTS work_orders (
    id VARCHAR(50) PRIMARY KEY,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    recipe_id VARCHAR(50),
    finished_item_id VARCHAR(50) REFERENCES items(id),
    product_name VARCHAR(255) NOT NULL,
    planned_cans_qty INTEGER NOT NULL,
    actual_cans_qty INTEGER DEFAULT 0,
    line_id VARCHAR(50),
    team_leader VARCHAR(100),
    shift VARCHAR(50),
    start_date_planned TIMESTAMP WITH TIME ZONE,
    end_date_planned TIMESTAMP WITH TIME ZONE,
    assigned_raw_batch_id VARCHAR(50),
    status VARCHAR(50) NOT NULL,
    raw_material_yield_percent NUMERIC(5,2)
);

-- Table des Cycles de Stérilisation Autoclaves (CCP-1)
CREATE TABLE IF NOT EXISTS autoclave_cycles (
    id VARCHAR(50) PRIMARY KEY,
    cycle_number VARCHAR(50) UNIQUE NOT NULL,
    autoclave_id VARCHAR(50),
    autoclave_name VARCHAR(150),
    schedule_reference VARCHAR(100) NOT NULL,
    cycle_date DATE NOT NULL,
    target_temp_c NUMERIC(5,2),
    actual_temp_mean_c NUMERIC(5,2),
    target_holding_duration_min NUMERIC(6,2),
    actual_holding_duration_min NUMERIC(6,2),
    target_pressure_bar NUMERIC(4,2),
    actual_pressure_bar NUMERIC(4,2),
    calculated_f0 NUMERIC(6,2) NOT NULL,
    operator_name VARCHAR(100),
    quality_approver_name VARCHAR(100),
    is_approved_by_quality BOOLEAN DEFAULT FALSE,
    cycle_status VARCHAR(50) NOT NULL
);

-- Table des Non-Conformités (ISO 22000 § 8.9)
CREATE TABLE IF NOT EXISTS non_conformities (
    id VARCHAR(50) PRIMARY KEY,
    nc_number VARCHAR(50) UNIQUE NOT NULL,
    nc_date TIMESTAMP WITH TIME ZONE NOT NULL,
    origin VARCHAR(50) NOT NULL,
    severity VARCHAR(50) NOT NULL,
    affected_batch_id VARCHAR(50) NOT NULL,
    affected_quantity NUMERIC(12,2),
    unit VARCHAR(20),
    description TEXT NOT NULL,
    immediate_action TEXT,
    is_quarantined BOOLEAN DEFAULT TRUE,
    corrective_action_plan TEXT,
    responsible_person VARCHAR(100),
    is_resolved BOOLEAN DEFAULT FALSE,
    final_disposition VARCHAR(50)
);

-- Table des Dossiers de Lots Finis & Libération Sanitaire
CREATE TABLE IF NOT EXISTS finished_batches (
    id VARCHAR(50) PRIMARY KEY,
    batch_number VARCHAR(50) UNIQUE NOT NULL,
    work_order_id VARCHAR(50),
    item_id VARCHAR(50) REFERENCES items(id),
    product_name VARCHAR(255) NOT NULL,
    production_date DATE NOT NULL,
    best_before_date DATE NOT NULL,
    total_cans_produced INTEGER,
    total_cartons INTEGER,
    seaming_checked BOOLEAN DEFAULT FALSE,
    autoclave_cycle_conforming BOOLEAN DEFAULT FALSE,
    incubation_test_passed BOOLEAN DEFAULT FALSE,
    release_status VARCHAR(50) NOT NULL,
    released_by VARCHAR(100),
    release_date TIMESTAMP WITH TIME ZONE
);

-- Table des Clients
CREATE TABLE IF NOT EXISTS customers (
    id VARCHAR(50) PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    category VARCHAR(50),
    city VARCHAR(100),
    country VARCHAR(100),
    contact_person VARCHAR(100),
    phone VARCHAR(50),
    tax_number VARCHAR(100)
);

-- Table des Bons de Commande (Sales Orders)
CREATE TABLE IF NOT EXISTS sales_orders (
    id VARCHAR(50) PRIMARY KEY,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id VARCHAR(50) REFERENCES customers(id),
    order_date TIMESTAMP WITH TIME ZONE NOT NULL,
    requested_delivery_date DATE,
    subtotal_dzd NUMERIC(14,2),
    total_amount_dzd NUMERIC(14,2),
    status VARCHAR(50) NOT NULL
);

-- Table des Bons de Livraison (BL)
CREATE TABLE IF NOT EXISTS delivery_notes (
    id VARCHAR(50) PRIMARY KEY,
    delivery_number VARCHAR(50) UNIQUE NOT NULL,
    sales_order_id VARCHAR(50) REFERENCES sales_orders(id),
    customer_id VARCHAR(50) REFERENCES customers(id),
    departure_date TIMESTAMP WITH TIME ZONE NOT NULL,
    driver_name VARCHAR(100),
    truck_plate VARCHAR(50),
    truck_hygiene_compliant BOOLEAN DEFAULT TRUE,
    total_cans INTEGER,
    status VARCHAR(50) NOT NULL
);

-- Journal d'Audit Immuable (ISO 22000 § 7.5 - Append-Only)
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(50) PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    user_id VARCHAR(50),
    user_name VARCHAR(150),
    user_role VARCHAR(50),
    action VARCHAR(50) NOT NULL,
    entity VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    old_values TEXT,
    new_values TEXT,
    motive TEXT
);

-- =====================================================================
-- EXTENSION MULTI-MAGASINS : RÉFÉRENTIEL, LOTS, STOCKS PAR MAGASIN,
-- TRANSFERTS, TRANSITS ET ÉCARTS
-- =====================================================================

CREATE TABLE IF NOT EXISTS warehouses (
    id VARCHAR(50) PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    designation VARCHAR(255) NOT NULL,
    warehouse_type VARCHAR(50) NOT NULL,
    description TEXT,
    manager VARCHAR(150),
    location VARCHAR(255),
    address_zone TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    requires_quality_release BOOLEAN DEFAULT FALSE,
    allows_production_supply BOOLEAN DEFAULT FALSE,
    allows_production_output BOOLEAN DEFAULT FALSE,
    allowed_user_ids JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS warehouse_locations (
    id VARCHAR(50) PRIMARY KEY,
    code VARCHAR(50) NOT NULL,
    designation VARCHAR(255) NOT NULL,
    warehouse_id VARCHAR(50) NOT NULL REFERENCES warehouses(id),
    zone_type VARCHAR(100),
    capacity NUMERIC(14,2),
    capacity_unit VARCHAR(20),
    storage_conditions TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (warehouse_id, code)
);

CREATE TABLE IF NOT EXISTS stock_lots (
    id VARCHAR(50) PRIMARY KEY,
    lot_number VARCHAR(100) NOT NULL,
    supplier_lot_number VARCHAR(100),
    item_id VARCHAR(50) NOT NULL REFERENCES items(id),
    item_code VARCHAR(50) NOT NULL,
    reception_date DATE,
    expiry_date DATE,
    quality_status VARCHAR(50) NOT NULL,
    origin TEXT,
    warehouse_trail JSONB,
    quality_history JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (item_id, lot_number)
);

-- Stock physique : une ligne = un lot + un magasin + un emplacement + un statut.
-- Aucune quantité de magasins différents n'est jamais fusionnée.
CREATE TABLE IF NOT EXISTS warehouse_stocks (
    id VARCHAR(50) PRIMARY KEY,
    warehouse_id VARCHAR(50) NOT NULL REFERENCES warehouses(id),
    location_id VARCHAR(50) NOT NULL REFERENCES warehouse_locations(id),
    item_id VARCHAR(50) NOT NULL REFERENCES items(id),
    item_code VARCHAR(50) NOT NULL,
    lot_id VARCHAR(50) NOT NULL REFERENCES stock_lots(id),
    lot_number VARCHAR(100) NOT NULL,
    quality_status VARCHAR(50) NOT NULL,
    quantity NUMERIC(14,4) NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    reserved_qty NUMERIC(14,4) NOT NULL DEFAULT 0 CHECK (reserved_qty >= 0),
    unit VARCHAR(20) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stock_transfers (
    id VARCHAR(50) PRIMARY KEY,
    transfer_number VARCHAR(50) UNIQUE NOT NULL,
    transfer_type VARCHAR(50) NOT NULL,
    source_warehouse_id VARCHAR(50) NOT NULL REFERENCES warehouses(id),
    destination_warehouse_id VARCHAR(50) NOT NULL REFERENCES warehouses(id),
    request_date TIMESTAMP WITH TIME ZONE NOT NULL,
    requester VARCHAR(150),
    requester_id VARCHAR(50),
    reason TEXT NOT NULL,
    status VARCHAR(50) NOT NULL,
    work_order_id VARCHAR(50),
    return_of_transfer_id VARCHAR(50),
    lines JSONB NOT NULL,
    discrepancies JSONB NOT NULL DEFAULT '[]'::jsonb,
    status_history JSONB NOT NULL DEFAULT '[]'::jsonb,
    validated_by VARCHAR(150),
    validated_at TIMESTAMP WITH TIME ZONE,
    refused_by VARCHAR(150),
    refusal_reason TEXT,
    shipped_by VARCHAR(150),
    shipped_at TIMESTAMP WITH TIME ZONE,
    received_by VARCHAR(150),
    received_at TIMESTAMP WITH TIME ZONE,
    cancellation_reason TEXT,
    partial_closure_authorized_by VARCHAR(150),
    partial_closure_reason TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stock_transits (
    id VARCHAR(50) PRIMARY KEY,
    transfer_id VARCHAR(50) NOT NULL REFERENCES stock_transfers(id),
    transfer_number VARCHAR(50) NOT NULL,
    line_id VARCHAR(50) NOT NULL,
    item_id VARCHAR(50) NOT NULL REFERENCES items(id),
    item_code VARCHAR(50) NOT NULL,
    lot_id VARCHAR(50) NOT NULL REFERENCES stock_lots(id),
    lot_number VARCHAR(100) NOT NULL,
    quantity NUMERIC(14,4) NOT NULL,
    received_qty NUMERIC(14,4) NOT NULL DEFAULT 0,
    unit VARCHAR(20) NOT NULL,
    quality_status VARCHAR(50) NOT NULL,
    source_warehouse_id VARCHAR(50) NOT NULL REFERENCES warehouses(id),
    destination_warehouse_id VARCHAR(50) NOT NULL REFERENCES warehouses(id),
    shipped_at TIMESTAMP WITH TIME ZONE NOT NULL,
    shipped_by VARCHAR(150),
    status VARCHAR(50) NOT NULL
);

-- Grand livre unique des mouvements, étendu aux dimensions magasin / lot.
CREATE TABLE IF NOT EXISTS stock_movements (
    id VARCHAR(50) PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    document_number VARCHAR(100),
    item_id VARCHAR(50) NOT NULL REFERENCES items(id),
    item_code VARCHAR(50) NOT NULL,
    batch_number VARCHAR(100) NOT NULL,
    lot_id VARCHAR(50),
    movement_type VARCHAR(50) NOT NULL,
    quantity NUMERIC(14,4) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    stock_delta NUMERIC(14,4),
    source_warehouse_id VARCHAR(50) REFERENCES warehouses(id),
    destination_warehouse_id VARCHAR(50) REFERENCES warehouses(id),
    location_id VARCHAR(50) REFERENCES warehouse_locations(id),
    quality_status VARCHAR(50),
    work_order_id VARCHAR(50),
    delivery_note_id VARCHAR(50),
    user_id VARCHAR(50),
    user_name VARCHAR(150),
    reason TEXT
);

-- Index de performance et traçabilité
CREATE INDEX IF NOT EXISTS idx_receptions_batch ON raw_batch_receptions(internal_batch_number);
CREATE INDEX IF NOT EXISTS idx_finished_batches_number ON finished_batches(batch_number);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_warehouse_stocks_item ON warehouse_stocks(item_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_stocks_lot ON warehouse_stocks(lot_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_stocks_warehouse ON warehouse_stocks(warehouse_id, location_id);
CREATE INDEX IF NOT EXISTS idx_stock_lots_number ON stock_lots(lot_number);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_status ON stock_transfers(status);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_source ON stock_transfers(source_warehouse_id);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_destination ON stock_transfers(destination_warehouse_id);
CREATE INDEX IF NOT EXISTS idx_stock_transits_status ON stock_transits(status);
CREATE INDEX IF NOT EXISTS idx_stock_movements_item_lot ON stock_movements(item_id, lot_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_timestamp ON stock_movements(timestamp);

-- =====================================================================
-- SERVICE APPROVISIONNEMENT : DEMANDES, VALIDATION, BUDGETS, CONSULTATIONS,
-- COMMANDES, RÉCEPTIONS ET CONTRATS
-- =====================================================================

-- Paramètres du module (ligne unique)
CREATE TABLE IF NOT EXISTS procurement_settings (
    id VARCHAR(30) PRIMARY KEY DEFAULT 'PROCUREMENT',
    currency VARCHAR(10) NOT NULL DEFAULT 'DZD',
    target_stock_multiplier NUMERIC(6,2) NOT NULL DEFAULT 2,
    default_payment_terms_days INTEGER NOT NULL DEFAULT 30,
    default_lead_time_days INTEGER NOT NULL DEFAULT 15,
    quality_hold_by_default BOOLEAN NOT NULL DEFAULT TRUE,
    max_over_reception_percent NUMERIC(6,2) NOT NULL DEFAULT 5,
    approval_steps JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE,
    updated_by VARCHAR(150)
);

-- Demandes d'achat (manuelles et automatiques)
CREATE TABLE IF NOT EXISTS purchase_requests (
    id VARCHAR(50) PRIMARY KEY,
    request_number VARCHAR(40) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_by_id VARCHAR(50),
    created_by VARCHAR(150) NOT NULL,
    department VARCHAR(40) NOT NULL,
    service_manager VARCHAR(150),
    requester_name VARCHAR(150),
    type VARCHAR(30) NOT NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'NORMALE',
    justification TEXT NOT NULL,
    desired_date DATE,
    destination_warehouse_id VARCHAR(50) REFERENCES warehouses(id),
    cost_center VARCHAR(80),
    project VARCHAR(120),
    observations TEXT,
    attachments JSONB DEFAULT '[]'::jsonb,
    estimated_total_dzd NUMERIC(16,2) NOT NULL DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'BROUILLON',
    approval_circuit JSONB NOT NULL DEFAULT '[]'::jsonb,
    current_step_index INTEGER NOT NULL DEFAULT 0,
    approval_history JSONB NOT NULL DEFAULT '[]'::jsonb,
    submitted_at TIMESTAMP WITH TIME ZONE,
    decided_at TIMESTAMP WITH TIME ZONE,
    closed_at TIMESTAMP WITH TIME ZONE,
    cancel_reason TEXT,
    source VARCHAR(20) NOT NULL DEFAULT 'MANUELLE',
    linked_work_order_id VARCHAR(50) REFERENCES work_orders(id)
);

CREATE TABLE IF NOT EXISTS purchase_request_lines (
    id VARCHAR(50) PRIMARY KEY,
    request_id VARCHAR(50) NOT NULL REFERENCES purchase_requests(id) ON DELETE CASCADE,
    line_order INTEGER NOT NULL DEFAULT 1,
    item_id VARCHAR(50) NOT NULL REFERENCES items(id),
    item_code VARCHAR(50) NOT NULL,
    designation VARCHAR(255) NOT NULL,
    category VARCHAR(60) NOT NULL,
    quantity NUMERIC(14,3) NOT NULL CHECK (quantity > 0),
    unit VARCHAR(20) NOT NULL,
    packaging_quantity NUMERIC(14,3),
    packaging_unit VARCHAR(20),
    available_qty_at_creation NUMERIC(14,3),
    reason TEXT,
    desired_date DATE,
    notes TEXT,
    estimated_unit_price_dzd NUMERIC(14,2)
);

-- Budgets par exercice, service et catégorie d'achat
CREATE TABLE IF NOT EXISTS procurement_budgets (
    id VARCHAR(50) PRIMARY KEY,
    fiscal_year INTEGER NOT NULL,
    department VARCHAR(40) NOT NULL,
    category_group VARCHAR(40),
    amount_dzd NUMERIC(16,2) NOT NULL CHECK (amount_dzd > 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_by VARCHAR(150) NOT NULL,
    UNIQUE (fiscal_year, department, category_group)
);

-- Consultations fournisseurs
CREATE TABLE IF NOT EXISTS supplier_consultations (
    id VARCHAR(50) PRIMARY KEY,
    consultation_number VARCHAR(40) UNIQUE NOT NULL,
    request_id VARCHAR(50) NOT NULL REFERENCES purchase_requests(id),
    request_number VARCHAR(40) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_by VARCHAR(150) NOT NULL,
    deadline DATE NOT NULL,
    invited_supplier_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    status VARCHAR(20) NOT NULL DEFAULT 'OUVERTE',
    awarded_quote_id VARCHAR(50),
    awarded_supplier_id VARCHAR(50) REFERENCES suppliers(id),
    awarded_supplier_name VARCHAR(200),
    award_justification TEXT,
    awarded_at TIMESTAMP WITH TIME ZONE,
    awarded_by VARCHAR(150),
    closed_at TIMESTAMP WITH TIME ZONE,
    observations TEXT
);

CREATE TABLE IF NOT EXISTS supplier_quotes (
    id VARCHAR(50) PRIMARY KEY,
    consultation_id VARCHAR(50) NOT NULL REFERENCES supplier_consultations(id) ON DELETE CASCADE,
    supplier_id VARCHAR(50) NOT NULL REFERENCES suppliers(id),
    supplier_name VARCHAR(200) NOT NULL,
    received_at TIMESTAMP WITH TIME ZONE NOT NULL,
    valid_until DATE,
    currency VARCHAR(10) NOT NULL DEFAULT 'DZD',
    total_dzd NUMERIC(16,2) NOT NULL DEFAULT 0,
    lead_time_days INTEGER NOT NULL DEFAULT 0,
    payment_terms_days INTEGER,
    incoterm VARCHAR(20),
    documents JSONB DEFAULT '[]'::jsonb,
    is_compliant BOOLEAN NOT NULL DEFAULT TRUE,
    non_compliance_reason TEXT,
    observations TEXT,
    created_by VARCHAR(150),
    UNIQUE (consultation_id, supplier_id)
);

CREATE TABLE IF NOT EXISTS supplier_quote_lines (
    id BIGSERIAL PRIMARY KEY,
    quote_id VARCHAR(50) NOT NULL REFERENCES supplier_quotes(id) ON DELETE CASCADE,
    item_id VARCHAR(50) NOT NULL REFERENCES items(id),
    item_code VARCHAR(50) NOT NULL,
    designation VARCHAR(255) NOT NULL,
    quantity NUMERIC(14,3) NOT NULL CHECK (quantity > 0),
    unit VARCHAR(20) NOT NULL,
    unit_price_dzd NUMERIC(14,2) NOT NULL CHECK (unit_price_dzd >= 0),
    discount_percent NUMERIC(5,2),
    line_total_dzd NUMERIC(16,2) NOT NULL,
    lead_time_days INTEGER,
    observations TEXT
);

-- Commandes d'achat
CREATE TABLE IF NOT EXISTS purchase_orders (
    id VARCHAR(50) PRIMARY KEY,
    order_number VARCHAR(40) UNIQUE NOT NULL,
    supplier_id VARCHAR(50) NOT NULL REFERENCES suppliers(id),
    supplier_name VARCHAR(200) NOT NULL,
    request_id VARCHAR(50) REFERENCES purchase_requests(id),
    request_number VARCHAR(40),
    consultation_id VARCHAR(50) REFERENCES supplier_consultations(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_by VARCHAR(150) NOT NULL,
    order_date DATE NOT NULL,
    expected_date DATE NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'EMISE',
    total_dzd NUMERIC(16,2) NOT NULL DEFAULT 0,
    currency VARCHAR(10) NOT NULL DEFAULT 'DZD',
    payment_terms_days INTEGER NOT NULL DEFAULT 30,
    delivery_warehouse_id VARCHAR(50) REFERENCES warehouses(id),
    incoterm VARCHAR(20),
    observations TEXT,
    confirmed_at TIMESTAMP WITH TIME ZONE,
    closed_at TIMESTAMP WITH TIME ZONE,
    cancel_reason TEXT
);

CREATE TABLE IF NOT EXISTS purchase_order_lines (
    id VARCHAR(50) PRIMARY KEY,
    order_id VARCHAR(50) NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    item_id VARCHAR(50) NOT NULL REFERENCES items(id),
    item_code VARCHAR(50) NOT NULL,
    designation VARCHAR(255) NOT NULL,
    quantity_ordered NUMERIC(14,3) NOT NULL CHECK (quantity_ordered > 0),
    quantity_received NUMERIC(14,3) NOT NULL DEFAULT 0,
    unit VARCHAR(20) NOT NULL,
    unit_price_dzd NUMERIC(14,2) NOT NULL DEFAULT 0,
    line_total_dzd NUMERIC(16,2) NOT NULL DEFAULT 0,
    packaging VARCHAR(80),
    quantity_per_packaging NUMERIC(14,3),
    request_line_id VARCHAR(50) REFERENCES purchase_request_lines(id),
    CHECK (quantity_received >= 0)
);

-- Réceptions d'achat et contrôle qualité
CREATE TABLE IF NOT EXISTS purchase_receipts (
    id VARCHAR(50) PRIMARY KEY,
    receipt_number VARCHAR(40) UNIQUE NOT NULL,
    order_id VARCHAR(50) NOT NULL REFERENCES purchase_orders(id),
    order_number VARCHAR(40) NOT NULL,
    supplier_id VARCHAR(50) NOT NULL REFERENCES suppliers(id),
    supplier_name VARCHAR(200) NOT NULL,
    received_at TIMESTAMP WITH TIME ZONE NOT NULL,
    received_by VARCHAR(150) NOT NULL,
    delivery_note_number VARCHAR(80),
    warehouse_id VARCHAR(50) NOT NULL REFERENCES warehouses(id),
    quality_status VARCHAR(30) NOT NULL DEFAULT 'EN_ATTENTE',
    quality_controlled_by VARCHAR(150),
    quality_controlled_at TIMESTAMP WITH TIME ZONE,
    quality_notes TEXT,
    is_on_hold BOOLEAN NOT NULL DEFAULT TRUE,
    stock_movements_created BOOLEAN NOT NULL DEFAULT FALSE,
    observations TEXT
);

CREATE TABLE IF NOT EXISTS purchase_receipt_lines (
    id BIGSERIAL PRIMARY KEY,
    receipt_id VARCHAR(50) NOT NULL REFERENCES purchase_receipts(id) ON DELETE CASCADE,
    order_line_id VARCHAR(50) NOT NULL REFERENCES purchase_order_lines(id),
    item_id VARCHAR(50) NOT NULL REFERENCES items(id),
    item_code VARCHAR(50) NOT NULL,
    designation VARCHAR(255) NOT NULL,
    quantity_ordered NUMERIC(14,3) NOT NULL,
    quantity_received NUMERIC(14,3) NOT NULL,
    quantity_accepted NUMERIC(14,3) NOT NULL DEFAULT 0,
    quantity_rejected NUMERIC(14,3) NOT NULL DEFAULT 0,
    unit VARCHAR(20) NOT NULL,
    lot_number VARCHAR(80) NOT NULL,
    expiry_date DATE,
    location_id VARCHAR(50) REFERENCES warehouse_locations(id),
    non_conformity_reason TEXT
);

-- Contrats et accords-cadres fournisseurs
CREATE TABLE IF NOT EXISTS supplier_contracts (
    id VARCHAR(50) PRIMARY KEY,
    reference VARCHAR(80) UNIQUE NOT NULL,
    supplier_id VARCHAR(50) NOT NULL REFERENCES suppliers(id),
    supplier_name VARCHAR(200) NOT NULL,
    object TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIF',
    amount_dzd NUMERIC(16,2),
    payment_terms_days INTEGER,
    currency VARCHAR(10) NOT NULL DEFAULT 'DZD',
    category_groups JSONB DEFAULT '[]'::jsonb,
    documents JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_by VARCHAR(150) NOT NULL,
    CHECK (end_date > start_date)
);

-- Index de performance du cycle achat
CREATE INDEX IF NOT EXISTS idx_pr_status ON purchase_requests(status, department);
CREATE INDEX IF NOT EXISTS idx_pr_created ON purchase_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prl_request ON purchase_request_lines(request_id);
CREATE INDEX IF NOT EXISTS idx_prl_item ON purchase_request_lines(item_id);
CREATE INDEX IF NOT EXISTS idx_budget_year ON procurement_budgets(fiscal_year, department, is_active);
CREATE INDEX IF NOT EXISTS idx_consultation_request ON supplier_consultations(request_id, status);
CREATE INDEX IF NOT EXISTS idx_quotes_consultation ON supplier_quotes(consultation_id);
CREATE INDEX IF NOT EXISTS idx_po_supplier ON purchase_orders(supplier_id, status);
CREATE INDEX IF NOT EXISTS idx_po_request ON purchase_orders(request_id);
CREATE INDEX IF NOT EXISTS idx_pol_order ON purchase_order_lines(order_id);
CREATE INDEX IF NOT EXISTS idx_receipt_order ON purchase_receipts(order_id, quality_status);
CREATE INDEX IF NOT EXISTS idx_receipt_lines_receipt ON purchase_receipt_lines(receipt_id);
CREATE INDEX IF NOT EXISTS idx_contract_supplier ON supplier_contracts(supplier_id, status, end_date);

COMMIT;
`;
  }

  // ==========================================================================
  // MAMORA BI — COUCHE ANALYTIQUE, DÉFINITIONS, KPI, RAPPORTS, ALERTES & IA
  // Lecture seule sur les données métier : seules les collections bi* sont
  // écrites (définitions, historiques et journal d'audit).
  // ==========================================================================

  public getBiPermissions(user: User = this.currentUser): BiPermission[] {
    const staticPerms = BI_ROLE_PERMISSIONS[user.role] || [];
    const role = this.db.roles.find(candidate => candidate.roleKey === user.role && candidate.isActive);
    const dynamicPerms = (role?.permissions || []).filter(permission =>
      permission.startsWith('BI_')
    ) as BiPermission[];
    return Array.from(new Set([...staticPerms, ...dynamicPerms]));
  }

  public canBi(permission: BiPermission, user: User = this.currentUser): boolean {
    return this.getBiPermissions(user).includes(permission);
  }

  public assertBi(permission: BiPermission, action: string): void {
    if (!this.canBi(permission)) {
      throw new Error(
        `Habilitation MAMORA BI insuffisante : « ${BI_PERMISSION_LABELS[permission]} » est requise pour ${action}. Profil ${this.currentUser.role}.`
      );
    }
  }

  /**
   * Périmètre de sécurité appliqué à toutes les requêtes, exports et questions IA.
   * Le périmètre magasin reprend exactement celui de GDS ; le périmètre service
   * repose sur `assignedDepartments` (vide = tous les services autorisés).
   */
  public getBiScope(user: User = this.currentUser): BiScope {
    const accessible = this.getAccessibleWarehouses(user);
    const assigned = user.assignedWarehouseIds ?? [];
    const allWarehouses =
      assigned.length === 0 &&
      accessible.length >= (this.db.warehouses?.length ?? accessible.length);
    const departments = user.assignedDepartments ?? [];
    return {
      userId: user.id,
      userName: user.name,
      role: user.role,
      allWarehouses,
      warehouseIds: accessible.map(warehouse => warehouse.id),
      allDepartments: departments.length === 0,
      departments,
    };
  }

  private getBiSnapshot(force = false): BiSnapshot {
    if (!this.biSnapshotCache || force) {
      this.biSnapshotCache = buildBiSnapshot(this.db);
    }
    return this.biSnapshotCache;
  }

  public getBiSettings(): BiSettings {
    return { ...this.db.biSettings };
  }

  public updateBiSettings(patch: Partial<BiSettings>): BiSettings {
    this.assertBi('BI_ADMIN', 'modifier les paramètres MAMORA BI');
    this.db.biSettings = { ...this.db.biSettings, ...patch };
    this.saveDatabase(this.db);
    this.logAudit({
      action: 'UPDATE',
      entity: 'MAMORA_BI_SETTINGS',
      entityId: 'BI_SETTINGS',
      newValues: `Paramètres BI mis à jour : ${Object.keys(patch).join(', ')}`,
    });
    return { ...this.db.biSettings };
  }

  /** Actualisation manuelle du snapshot analytique, avec journal de rafraîchissement. */
  public refreshBiSnapshot(): BiRefreshLog {
    this.assertBi('BI_VIEW', 'actualiser les données MAMORA BI');
    const started = Date.now();
    try {
      const snapshot = this.getBiSnapshot(true);
      const log: BiRefreshLog = {
        id: `BI-REFRESH-${Date.now()}`,
        timestamp: new Date().toISOString(),
        actor: this.currentUser.name,
        status: 'SUCCES',
        durationMs: Date.now() - started,
        sourceCounts: snapshot.counts,
      };
      this.db.biRefreshLogs.unshift(log);
      this.db.biRefreshLogs = this.db.biRefreshLogs.slice(0, 50);
      this.db.biSettings.lastRefreshAt = log.timestamp;
      this.saveDatabase(this.db);
      // saveDatabase invalide le cache : on réinstalle le snapshot fraîchement calculé.
      this.biSnapshotCache = snapshot;
      return log;
    } catch (error) {
      const log: BiRefreshLog = {
        id: `BI-REFRESH-${Date.now()}`,
        timestamp: new Date().toISOString(),
        actor: this.currentUser.name,
        status: 'ECHEC',
        durationMs: Date.now() - started,
        sourceCounts: {},
        message: error instanceof Error ? error.message : 'Erreur d’actualisation inconnue.',
      };
      this.db.biRefreshLogs.unshift(log);
      this.saveDatabase(this.db);
      return log;
    }
  }

  public getBiRefreshLogs(): BiRefreshLog[] {
    this.assertBi('BI_VIEW', 'consulter l’historique d’actualisation');
    return [...this.db.biRefreshLogs];
  }

  // --- Export PowerPoint : présentation structurée, jamais un screenshot ---

  /**
   * Construit une présentation PowerPoint à partir de données réelles.
   *
   * Toutes les requêtes passent par le moteur analytique et le périmètre de
   * l'utilisateur courant. Les ressources non partagées sont exclues et
   * signalées ; les commentaires IA nécessitent l'habilitation dédiée.
   */
  public buildBiPptxDeck(
    selection: BiPptxSelection,
    configInput: Partial<BiPptxConfig> = {}
  ): BiPptxDeck {
    this.assertBi('BI_EXPORT', 'exporter une analyse vers PowerPoint');
    const snapshot = this.getBiSnapshot();
    const scope = this.getBiScope();
    const settings = this.db.biSettings;
    const period = selection.period ?? resolveBiPeriod('LAST_12_MONTHS');
    const periodLabel = describeBiPeriodLabel(period);
    const warnings: string[] = [];
    const sourceLabels = new Set<string>();

    // 1) Vue d'ensemble : mesures et KPI réels sur la période demandée.
    const measures = computeBiMeasureValues(snapshot, scope, period);
    const overviewKpis = this.db.biKpis
      .filter(kpi => kpi.isActive)
      .map(kpi => computeBiKpi(kpi, snapshot, scope, period));
    for (const detail of measures.details) {
      if (detail.value !== null) {
        sourceLabels.add(BI_SOURCES[detail.source]?.label ?? detail.source);
      }
    }
    const overview = {
      details: measures.details,
      values: measures.values,
      kpis: overviewKpis,
      warnings: measures.warnings,
      counts: snapshot.counts,
    };

    // 2) Tableaux de bord : visibilité + requêtes widget réelles.
    const dashboardPool =
      this.db.biDashboards.length > 0 ? this.db.biDashboards : buildDefaultBiDashboards();
    const dashboards: BiPptxResolvedDashboard[] = [];
    for (const dashboardId of Array.from(new Set(selection.dashboardIds))) {
      const dashboard = dashboardPool.find(candidate => candidate.id === dashboardId);
      if (!dashboard) {
        warnings.push(`Tableau de bord introuvable : ${dashboardId}.`);
        continue;
      }
      if (!this.isBiResourceVisible(dashboard, this.currentUser)) {
        warnings.push(
          `Tableau de bord « ${dashboard.name} » exclu : il n'est pas partagé avec votre profil.`
        );
        continue;
      }
      const requestedWidgets = selection.widgetKeys.filter(key =>
        key.startsWith(`${dashboard.id}::`)
      );
      const widgets = dashboard.widgets.filter(
        widget =>
          requestedWidgets.length === 0 ||
          requestedWidgets.includes(`${dashboard.id}::${widget.id}`)
      );
      const resolved: BiPptxResolvedWidget[] = [];
      for (const widget of widgets) {
        const key = `${dashboard.id}::${widget.id}`;
        try {
          const result = this.executeBiQuery(
            buildWidgetQuery({
              source: widget.source,
              dimensions: widget.dimensions,
              measures: widget.measures,
              filters: widget.filters,
              limit: widget.limit ?? settings.maxRows,
            })
          );
          sourceLabels.add(result.sourceLabel);
          resolved.push({
            key,
            dashboardId: dashboard.id,
            dashboardName: dashboard.name,
            widget,
            result,
          });
        } catch (error) {
          resolved.push({
            key,
            dashboardId: dashboard.id,
            dashboardName: dashboard.name,
            widget,
            error: error instanceof Error ? error.message : 'Erreur analytique inconnue.',
          });
        }
      }
      dashboards.push({ dashboard, widgets: resolved });
    }

    // 3) Rapports enregistrés : visibilité + filtres de période.
    const reports: BiPptxResolvedReport[] = [];
    for (const reportId of Array.from(new Set(selection.reportIds))) {
      const report = this.db.biReports.find(candidate => candidate.id === reportId);
      if (!report) {
        warnings.push(`Rapport introuvable : ${reportId}.`);
        continue;
      }
      if (!this.isBiResourceVisible(report, this.currentUser)) {
        warnings.push(
          `Rapport « ${report.name} » exclu : il n'est pas partagé avec votre profil.`
        );
        continue;
      }
      try {
        const source = BI_SOURCES[report.source];
        const filters = [...report.filters];
        if (source?.fields.some(field => field.key === 'date')) {
          if (period.from) filters.push({ field: 'date', operator: 'GTE', value: period.from });
          if (period.to) filters.push({ field: 'date', operator: 'LTE', value: period.to });
        }
        const result = this.executeBiQuery({
          source: report.source,
          dimensions: report.dimensions,
          measures: report.measures,
          filters,
          limit: settings.maxRows,
        });
        sourceLabels.add(result.sourceLabel);
        reports.push({ report, result });
      } catch (error) {
        reports.push({
          report,
          error: error instanceof Error ? error.message : 'Erreur analytique inconnue.',
        });
      }
    }

    // 4) KPI sélectionnés.
    const kpis: BiPptxResolvedKpi[] = [];
    for (const kpiId of Array.from(new Set(selection.kpiIds))) {
      const kpi = this.db.biKpis.find(
        candidate => candidate.id === kpiId || candidate.code === kpiId
      );
      if (!kpi) {
        warnings.push(`KPI introuvable : ${kpiId}.`);
        continue;
      }
      kpis.push({ kpi, computation: computeBiKpi(kpi, snapshot, scope, period) });
      if (kpi.source !== 'MULTI') {
        sourceLabels.add(BI_SOURCES[kpi.source]?.label ?? kpi.source);
      }
    }

    // 5) Analyses ponctuelles de l'explorateur : requêtes structurées validées.
    const explorer: BiPptxResolvedExplorer[] = [];
    if (selection.explorerQueries.length > 0) {
      this.assertBi('BI_EXPLORE', 'exporter une analyse exploratoire');
      for (const entry of selection.explorerQueries) {
        try {
          const result = this.executeBiQuery(entry.query);
          sourceLabels.add(result.sourceLabel);
          explorer.push({ title: entry.title, query: entry.query, result });
        } catch (error) {
          explorer.push({
            title: entry.title,
            query: entry.query,
            error: error instanceof Error ? error.message : 'Erreur analytique inconnue.',
          });
        }
      }
    }

    // 6) Alertes non acquittées, cohérentes avec le module BI.
    const alerts = selection.includeAlerts
      ? [...this.db.biAlertEvents].sort((a, b) => b.detectedAt.localeCompare(a.detectedAt))
      : [];

    // 7) Comparaison de périodes : KPI choisis + mesures clés, aucune extrapolation.
    let comparison:
      | { currentLabel: string; previousLabel: string; rows: BiPptxComparisonRow[] }
      | undefined;
    if (selection.includeComparison && selection.comparison) {
      const previousPeriod = selection.comparison.previousPeriod;
      const previousMeasures = computeBiMeasureValues(snapshot, scope, previousPeriod);
      const rows: BiPptxComparisonRow[] = [];
      const seen = new Set<string>();
      const addRow = (input: {
        label: string;
        current: number | null;
        previous: number | null;
        unit: string;
        format: BiValueFormat;
        source?: string;
      }) => {
        if (seen.has(input.label)) return;
        seen.add(input.label);
        const delta =
          input.current !== null && input.previous !== null
            ? input.current - input.previous
            : null;
        const deltaPercent =
          delta !== null && input.previous !== null && input.previous !== 0
            ? (delta / Math.abs(input.previous)) * 100
            : null;
        rows.push({
          label: input.label,
          current: input.current,
          previous: input.previous,
          delta,
          deltaPercent,
          unit: input.unit,
          format: input.format,
          source: input.source,
        });
      };

      const kpiPool =
        kpis.length > 0
          ? kpis.map(entry => entry.kpi)
          : this.db.biKpis.filter(kpi => kpi.isActive);
      for (const kpi of kpiPool) {
        const current = computeBiKpi(kpi, snapshot, scope, period);
        const previous = computeBiKpi(kpi, snapshot, scope, previousPeriod);
        addRow({
          label: kpi.name,
          current: current.valid ? current.value : null,
          previous: previous.valid ? previous.value : null,
          unit: kpi.unit,
          format: kpi.format,
          source: kpi.source === 'MULTI' ? 'Multi-sources' : BI_SOURCES[kpi.source]?.label,
        });
      }
      for (const code of BI_PPTX_COMPARISON_MEASURES) {
        const currentDetail = measures.details.find(detail => detail.code === code);
        if (!currentDetail) continue;
        const previousDetail = previousMeasures.details.find(detail => detail.code === code);
        addRow({
          label: currentDetail.label,
          current: currentDetail.value,
          previous: previousDetail?.value ?? null,
          unit: currentDetail.unit,
          format: currentDetail.format,
          source: BI_SOURCES[currentDetail.source]?.label ?? currentDetail.source,
        });
      }
      comparison = {
        currentLabel: periodLabel,
        previousLabel:
          selection.comparison.label || describeBiPeriodLabel(previousPeriod),
        rows,
      };
    }

    // 8) Répartition stock matières premières / produits finis, sans double comptage.
    let stockSplit: BiPptxStockSplit | undefined;
    if (selection.includeDomainAnalysis) {
      const buildSplit = (
        categories: string[],
        title: string
      ): BiQueryResult | undefined => {
        try {
          const result = this.executeBiQuery({
            source: 'stock',
            dimensions: ['category'],
            measures: ['availableQty'],
            filters: [{ field: 'category', operator: 'IN', value: categories }],
            limit: 200,
          });
          if (result.rows.length > 0) sourceLabels.add(result.sourceLabel);
          return result;
        } catch (error) {
          warnings.push(
            `${title} ignoré : ${error instanceof Error ? error.message : 'erreur analytique'}.`
          );
          return undefined;
        }
      };
      stockSplit = {
        rawMaterials: buildSplit(BI_PPTX_RAW_CATEGORIES, 'Stock matières premières'),
        finishedGoods: buildSplit(BI_PPTX_FINISHED_CATEGORIES, 'Stock produits finis'),
      };
    }

    // 9) Commentaires IA : jamais exportés sans l'habilitation dédiée.
    let aiResponses = selection.aiResponses ?? [];
    let includeAi = selection.includeAi;
    if (includeAi && aiResponses.length > 0 && !this.canBi('BI_AI_USE')) {
      includeAi = false;
      aiResponses = [];
      warnings.push(
        'Commentaires IA exclus : l’habilitation « Utiliser l’AI Analyst » est requise.'
      );
    }

    const now = new Date().toISOString();
    const config: BiPptxConfig = {
      title: configInput.title?.trim() || 'MAMORA BI — Analyse analytique',
      subtitle: configInput.subtitle?.trim() || '',
      department:
        configInput.department?.trim() ||
        (scope.allDepartments ? 'Tous les services' : scope.departments.join(', ')),
      periodLabel,
      generatedAt: configInput.generatedAt ?? now,
      refreshAt:
        configInput.refreshAt ?? settings.lastRefreshAt ?? snapshot.builtAt ?? now,
      author: configInput.author?.trim() || this.currentUser.name,
      language: configInput.language ?? 'fr',
      format: configInput.format ?? '16:9',
      logoDataUrl: configInput.logoDataUrl,
      company: configInput.company?.trim() || 'MAMORA GP',
      includeSlideNumbers: configInput.includeSlideNumbers ?? true,
      includeFooter: configInput.includeFooter ?? true,
    };

    const input: BiPptxBuildInput = {
      config,
      selection: { ...selection, includeAi },
      scope,
      periodLabel,
      refreshAt: config.refreshAt ?? now,
      overview,
      dashboards,
      reports,
      kpis,
      explorer,
      alerts,
      aiResponses,
      comparison,
      stockSplit,
      sourceLabels: Array.from(sourceLabels),
      warnings,
    };
    return planBiPptxDeck(input);
  }

  /** Enregistre le résultat d'un export PowerPoint dans l'historique et l'audit. */
  public recordBiPptxExport(entry: {
    title: string;
    language: BiPptxLanguage;
    format: BiPptxFormat;
    slideCount: number;
    fileName: string;
    status: 'SUCCES' | 'ECHEC';
    message?: string;
    dashboardIds?: string[];
    reportIds?: string[];
    kpiIds?: string[];
    summary: BiPptxContentSummary;
  }): BiPptxLog {
    this.assertBi('BI_EXPORT', 'enregistrer un export PowerPoint');
    const log: BiPptxLog = {
      id: `BI-PPTX-${Date.now().toString(36).toUpperCase()}`,
      timestamp: new Date().toISOString(),
      actor: this.currentUser.name,
      title: entry.title,
      language: entry.language,
      format: entry.format,
      slideCount: entry.slideCount,
      fileName: entry.fileName,
      status: entry.status,
      message: entry.message,
      dashboardIds: entry.dashboardIds ?? [],
      reportIds: entry.reportIds ?? [],
      kpiIds: entry.kpiIds ?? [],
      summary: entry.summary,
    };
    this.db.biPresentationLogs.unshift(log);
    this.db.biPresentationLogs = this.db.biPresentationLogs.slice(0, 50);
    this.logAudit({
      action: 'EXPORT',
      entity: 'MAMORA_BI_PPTX',
      entityId: log.id,
      newValues: `${entry.status} — ${entry.fileName} (${entry.slideCount} diapositive(s), ${entry.language.toUpperCase()}, ${entry.format})${entry.message ? ` — ${entry.message}` : ''}`,
    });
    return log;
  }

  public getBiPptxLogs(): BiPptxLog[] {
    this.assertBi('BI_EXPORT', 'consulter l’historique des exports PowerPoint');
    return [...this.db.biPresentationLogs];
  }

  public getBiSourceCatalog() {
    this.assertBi('BI_VIEW', 'consulter le catalogue analytique');
    return BI_SOURCES;
  }

  public getBiMeasureCatalog() {
    this.assertBi('BI_VIEW', 'consulter le catalogue des mesures');
    return Object.values(BI_MEASURES);
  }

  public getBiMeasureValues(period?: BiPeriod) {
    this.assertBi('BI_VIEW', 'consulter les mesures MAMORA BI');
    return computeBiMeasureValues(this.getBiSnapshot(), this.getBiScope(), period);
  }

  /** Vue d'ensemble : mesures réelles, KPI actifs et alertes nouvelles. */
  public getBiOverview(period?: BiPeriod) {
    this.assertBi('BI_VIEW', 'consulter la vue d’ensemble MAMORA BI');
    const snapshot = this.getBiSnapshot();
    const scope = this.getBiScope();
    const measures = computeBiMeasureValues(snapshot, scope, period);
    const kpis = this.db.biKpis
      .filter(kpi => kpi.isActive)
      .map(kpi => computeBiKpi(kpi, snapshot, scope, period));
    return {
      generatedAt: snapshot.builtAt,
      values: measures.values,
      details: measures.details,
      warnings: measures.warnings,
      kpis,
      openAlerts: this.db.biAlertEvents.filter(event => event.status === 'NOUVELLE').length,
      scope,
      counts: snapshot.counts,
    };
  }

  /** Exécution interne : le contrôle d'habilitation est fait par l'appelant. */
  private executeBiQuery(query: BiQuery): BiQueryResult {
    const settings = this.db.biSettings;
    return runBiQuery(this.getBiSnapshot(), query, this.getBiScope(), {
      maxRows: settings.maxRows,
      defaultLimit: Math.min(500, settings.maxRows),
    });
  }

  /** Exécute une requête structurée, validée par liste blanche et filtrée par périmètre. */
  public runBiQuery(query: BiQuery): BiQueryResult {
    this.assertBi('BI_EXPLORE', 'exécuter une requête analytique');
    return this.executeBiQuery(query);
  }

  /** Exécute la requête d'un rapport enregistré (consultation autorisée par BI_VIEW). */
  public runBiReport(reportId: string, period?: BiPeriod): BiQueryResult {
    this.assertBi('BI_VIEW', 'consulter un rapport BI');
    const report = this.db.biReports.find(candidate => candidate.id === reportId);
    if (!report) throw new Error(`Rapport introuvable : « ${reportId} ».`);
    const source = BI_SOURCES[report.source];
    const filters = [...report.filters];
    if (source?.fields.some(field => field.key === 'date')) {
      if (period?.from) filters.push({ field: 'date', operator: 'GTE', value: period.from });
      if (period?.to) filters.push({ field: 'date', operator: 'LTE', value: period.to });
    }
    return this.executeBiQuery({
      source: report.source,
      dimensions: report.dimensions,
      measures: report.measures,
      filters,
      limit: this.db.biSettings.maxRows,
    });
  }

  public computeBiKpi(kpiId: string, period?: BiPeriod): BiKpiComputation {
    this.assertBi('BI_VIEW', 'calculer un KPI');
    const kpi = this.db.biKpis.find(candidate => candidate.id === kpiId || candidate.code === kpiId);
    if (!kpi) throw new Error(`KPI introuvable : « ${kpiId} ».`);
    return computeBiKpi(kpi, this.getBiSnapshot(), this.getBiScope(), period);
  }

  private isBiResourceVisible(
    resource: {
      isDefault?: boolean;
      ownerId?: string;
      sharedWithUserIds?: string[];
      sharedWithRoles?: UserRole[];
    },
    user: User
  ): boolean {
    if (this.canBi('BI_ADMIN', user)) return true;
    if (resource.isDefault) return true;
    if (resource.ownerId === user.id || resource.ownerId === 'SYSTEM') return true;
    if ((resource.sharedWithUserIds || []).includes(user.id)) return true;
    if ((resource.sharedWithRoles || []).includes(user.role)) return true;
    return false;
  }

  // --- Tableaux de bord ---

  public getBiDashboards(user: User = this.currentUser): BiDashboard[] {
    this.assertBi('BI_DASHBOARD_VIEW', 'consulter les tableaux de bord');
    return this.db.biDashboards.filter(dashboard => this.isBiResourceVisible(dashboard, user));
  }

  public getBiDashboard(id: string, user: User = this.currentUser): BiDashboard | undefined {
    return this.getBiDashboards(user).find(dashboard => dashboard.id === id);
  }

  public createBiDashboard(input: Partial<BiDashboard> & { name: string }): BiDashboard {
    this.assertBi('BI_DASHBOARD_CREATE', 'créer un tableau de bord');
    const name = input.name.trim();
    if (!name) throw new Error('Le nom du tableau de bord est obligatoire.');
    const now = new Date().toISOString();
    const dashboard: BiDashboard = {
      id: `BI-DASH-${Date.now().toString(36).toUpperCase()}`,
      name,
      description: input.description ?? '',
      category: input.category ?? 'CUSTOM',
      widgets: (input.widgets ?? []).map(widget => ({
        ...widget,
        id: widget.id || `BI-WGT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6)}`,
      })),
      ownerId: this.currentUser.id,
      ownerName: this.currentUser.name,
      sharedWithUserIds: input.sharedWithUserIds ?? [],
      sharedWithRoles: input.sharedWithRoles ?? [],
      isDefault: false,
      createdAt: now,
      updatedAt: now,
      createdBy: this.currentUser.name,
    };
    this.db.biDashboards.push(dashboard);
    this.saveDatabase(this.db);
    this.logAudit({
      action: 'CREATE',
      entity: 'MAMORA_BI_DASHBOARD',
      entityId: dashboard.id,
      newValues: `Création du tableau de bord « ${dashboard.name} »`,
    });
    return dashboard;
  }

  public updateBiDashboard(id: string, patch: Partial<BiDashboard>): BiDashboard {
    this.assertBi('BI_DASHBOARD_EDIT', 'modifier un tableau de bord');
    const dashboard = this.db.biDashboards.find(candidate => candidate.id === id);
    if (!dashboard) throw new Error(`Tableau de bord introuvable : « ${id} ».`);
    if (patch.name !== undefined && !patch.name.trim()) {
      throw new Error('Le nom du tableau de bord est obligatoire.');
    }
    const { id: _id, ownerId: _ownerId, createdAt: _createdAt, createdBy: _createdBy, ...allowed } = patch;
    Object.assign(dashboard, allowed, { updatedAt: new Date().toISOString() });
    this.saveDatabase(this.db);
    this.logAudit({
      action: 'UPDATE',
      entity: 'MAMORA_BI_DASHBOARD',
      entityId: dashboard.id,
      newValues: `Mise à jour du tableau de bord « ${dashboard.name} »`,
    });
    return dashboard;
  }

  public deleteBiDashboard(id: string): void {
    this.assertBi('BI_DASHBOARD_DELETE', 'supprimer un tableau de bord');
    const dashboard = this.db.biDashboards.find(candidate => candidate.id === id);
    if (!dashboard) throw new Error(`Tableau de bord introuvable : « ${id} ».`);
    if (dashboard.isDefault) {
      throw new Error(
        'Les tableaux de bord livrés par défaut ne peuvent pas être supprimés. Dupliquez-les pour les personnaliser.'
      );
    }
    this.db.biDashboards = this.db.biDashboards.filter(candidate => candidate.id !== id);
    this.db.biShares = this.db.biShares.filter(
      share => !(share.resourceType === 'DASHBOARD' && share.resourceId === id)
    );
    this.saveDatabase(this.db);
    this.logAudit({
      action: 'DELETE',
      entity: 'MAMORA_BI_DASHBOARD',
      entityId: id,
      oldValues: `Suppression du tableau de bord « ${dashboard.name} »`,
    });
  }

  public duplicateBiDashboard(id: string): BiDashboard {
    this.assertBi('BI_DASHBOARD_CREATE', 'dupliquer un tableau de bord');
    const source = this.db.biDashboards.find(candidate => candidate.id === id);
    if (!source) throw new Error(`Tableau de bord introuvable : « ${id} ».`);
    return this.createBiDashboard({
      ...source,
      name: `${source.name} (copie)`,
      isDefault: false,
      sharedWithUserIds: [],
      sharedWithRoles: [],
      widgets: source.widgets.map(widget => ({
        ...widget,
        id: `BI-WGT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6)}`,
      })),
    });
  }

  // --- KPI ---

  public getBiKpis(): BiKpi[] {
    this.assertBi('BI_VIEW', 'consulter les KPI');
    return [...this.db.biKpis];
  }

  public createBiKpi(input: Partial<BiKpi> & { name: string; formula: string }): BiKpi {
    this.assertBi('BI_KPI_CREATE', 'créer un KPI');
    const validation = validateBiFormula(input.formula);
    if (!validation.valid) throw new Error(validation.error ?? 'Formule KPI invalide.');
    const now = new Date().toISOString();
    const code = (
      input.code || `KPI_${input.name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_')}`
    ).toUpperCase();
    if (this.db.biKpis.some(kpi => kpi.code.toUpperCase() === code)) {
      throw new Error(`Le code KPI « ${code} » existe déjà.`);
    }
    const kpi: BiKpi = {
      id: `BI-KPI-${Date.now().toString(36).toUpperCase()}`,
      code,
      name: input.name.trim(),
      description: input.description ?? '',
      source: input.source ?? 'MULTI',
      formula: input.formula,
      unit: input.unit ?? '',
      format: input.format ?? 'DECIMAL',
      precision: input.precision ?? 2,
      period: input.period ?? 'CURRENT_MONTH',
      owner: input.owner ?? this.currentUser.name,
      isActive: input.isActive ?? true,
      targetValue: input.targetValue,
      createdAt: now,
      updatedAt: now,
      createdBy: this.currentUser.name,
    };
    this.db.biKpis.push(kpi);
    this.saveDatabase(this.db);
    this.logAudit({
      action: 'CREATE',
      entity: 'MAMORA_BI_KPI',
      entityId: kpi.id,
      newValues: `Création du KPI « ${kpi.name} » (${kpi.formula})`,
    });
    return kpi;
  }

  public updateBiKpi(id: string, patch: Partial<BiKpi>): BiKpi {
    this.assertBi('BI_KPI_EDIT', 'modifier un KPI');
    const kpi = this.db.biKpis.find(candidate => candidate.id === id);
    if (!kpi) throw new Error(`KPI introuvable : « ${id} ».`);
    if (patch.formula !== undefined) {
      const validation = validateBiFormula(patch.formula);
      if (!validation.valid) throw new Error(validation.error ?? 'Formule KPI invalide.');
    }
    if (patch.code !== undefined) {
      const code = patch.code.toUpperCase();
      if (this.db.biKpis.some(candidate => candidate.id !== id && candidate.code.toUpperCase() === code)) {
        throw new Error(`Le code KPI « ${code} » existe déjà.`);
      }
    }
    const { id: _id, createdAt: _createdAt, createdBy: _createdBy, ...allowed } = patch;
    Object.assign(kpi, allowed, { updatedAt: new Date().toISOString() });
    this.saveDatabase(this.db);
    this.logAudit({
      action: 'UPDATE',
      entity: 'MAMORA_BI_KPI',
      entityId: kpi.id,
      newValues: `Mise à jour du KPI « ${kpi.name} »`,
    });
    return kpi;
  }

  public deleteBiKpi(id: string): void {
    this.assertBi('BI_KPI_EDIT', 'supprimer un KPI');
    const kpi = this.db.biKpis.find(candidate => candidate.id === id);
    if (!kpi) throw new Error(`KPI introuvable : « ${id} ».`);
    this.db.biKpis = this.db.biKpis.filter(candidate => candidate.id !== id);
    this.saveDatabase(this.db);
    this.logAudit({
      action: 'DELETE',
      entity: 'MAMORA_BI_KPI',
      entityId: id,
      oldValues: `Suppression du KPI « ${kpi.name} »`,
    });
  }

  // --- Rapports ---

  public getBiReports(user: User = this.currentUser): BiReport[] {
    this.assertBi('BI_VIEW', 'consulter les rapports BI');
    return this.db.biReports.filter(report => this.isBiResourceVisible(report, user));
  }

  public createBiReport(input: Partial<BiReport> & { name: string; source: BiSourceId }): BiReport {
    this.assertBi('BI_REPORT_CREATE', 'créer un rapport BI');
    if (!BI_SOURCES[input.source]) throw new Error(`Source analytique inconnue : « ${input.source} ».`);
    const name = input.name.trim();
    if (!name) throw new Error('Le nom du rapport est obligatoire.');
    const now = new Date().toISOString();
    const report: BiReport = {
      id: `BI-RPT-${Date.now().toString(36).toUpperCase()}`,
      name,
      description: input.description ?? '',
      source: input.source,
      dimensions: input.dimensions ?? [],
      measures: input.measures ?? [],
      filters: input.filters ?? [],
      visualization: input.visualization ?? 'TABLE',
      comments: input.comments ?? '',
      ownerId: this.currentUser.id,
      ownerName: this.currentUser.name,
      sharedWithUserIds: input.sharedWithUserIds ?? [],
      sharedWithRoles: input.sharedWithRoles ?? [],
      createdAt: now,
      updatedAt: now,
      createdBy: this.currentUser.name,
    };
    this.db.biReports.push(report);
    this.saveDatabase(this.db);
    this.logAudit({
      action: 'CREATE',
      entity: 'MAMORA_BI_REPORT',
      entityId: report.id,
      newValues: `Création du rapport « ${report.name} »`,
    });
    return report;
  }

  public updateBiReport(id: string, patch: Partial<BiReport>): BiReport {
    this.assertBi('BI_REPORT_CREATE', 'modifier un rapport BI');
    const report = this.db.biReports.find(candidate => candidate.id === id);
    if (!report) throw new Error(`Rapport introuvable : « ${id} ».`);
    if (patch.source !== undefined && !BI_SOURCES[patch.source]) {
      throw new Error(`Source analytique inconnue : « ${patch.source} ».`);
    }
    const { id: _id, ownerId: _ownerId, createdAt: _createdAt, createdBy: _createdBy, ...allowed } = patch;
    Object.assign(report, allowed, { updatedAt: new Date().toISOString() });
    this.saveDatabase(this.db);
    this.logAudit({
      action: 'UPDATE',
      entity: 'MAMORA_BI_REPORT',
      entityId: report.id,
      newValues: `Mise à jour du rapport « ${report.name} »`,
    });
    return report;
  }

  public deleteBiReport(id: string): void {
    this.assertBi('BI_REPORT_CREATE', 'supprimer un rapport BI');
    const report = this.db.biReports.find(candidate => candidate.id === id);
    if (!report) throw new Error(`Rapport introuvable : « ${id} ».`);
    this.db.biReports = this.db.biReports.filter(candidate => candidate.id !== id);
    this.db.biShares = this.db.biShares.filter(
      share => !(share.resourceType === 'REPORT' && share.resourceId === id)
    );
    this.saveDatabase(this.db);
    this.logAudit({
      action: 'DELETE',
      entity: 'MAMORA_BI_REPORT',
      entityId: id,
      oldValues: `Suppression du rapport « ${report.name} »`,
    });
  }

  public duplicateBiReport(id: string): BiReport {
    this.assertBi('BI_REPORT_CREATE', 'dupliquer un rapport BI');
    const source = this.db.biReports.find(candidate => candidate.id === id);
    if (!source) throw new Error(`Rapport introuvable : « ${id} ».`);
    return this.createBiReport({
      ...source,
      name: `${source.name} (copie)`,
      sharedWithUserIds: [],
      sharedWithRoles: [],
    });
  }

  // --- Alertes ---

  public getBiAlertRules(): BiAlertRule[] {
    this.assertBi('BI_VIEW', 'consulter les règles d’alerte');
    return [...this.db.biAlertRules];
  }

  public createBiAlertRule(
    input: Partial<BiAlertRule> & {
      name: string;
      measureCode: string;
      operator: BiAlertRule['operator'];
      threshold: number;
    }
  ): BiAlertRule {
    this.assertBi('BI_KPI_CREATE', 'créer une alerte BI');
    if (!BI_MEASURES[input.measureCode] && input.measureCode !== 'STOCK_MOYEN') {
      throw new Error(`Mesure inconnue pour l’alerte : « ${input.measureCode} ».`);
    }
    const name = input.name.trim();
    if (!name) throw new Error('Le nom de l’alerte est obligatoire.');
    if (!Number.isFinite(input.threshold)) throw new Error('Le seuil de l’alerte doit être un nombre.');
    const now = new Date().toISOString();
    const rule: BiAlertRule = {
      id: `BI-ALERT-${Date.now().toString(36).toUpperCase()}`,
      name,
      measureCode: input.measureCode,
      operator: input.operator,
      threshold: input.threshold,
      period: input.period ?? 'CURRENT_MONTH',
      mode: input.mode ?? 'THRESHOLD',
      lookbackPeriods: input.lookbackPeriods,
      deviationFactor: input.deviationFactor,
      recipients: input.recipients ?? [],
      isActive: input.isActive ?? true,
      createdAt: now,
      updatedAt: now,
      createdBy: this.currentUser.name,
    };
    this.db.biAlertRules.push(rule);
    this.saveDatabase(this.db);
    this.logAudit({
      action: 'CREATE',
      entity: 'MAMORA_BI_ALERT',
      entityId: rule.id,
      newValues: `Création de l’alerte « ${rule.name} »`,
    });
    return rule;
  }

  public updateBiAlertRule(id: string, patch: Partial<BiAlertRule>): BiAlertRule {
    this.assertBi('BI_KPI_EDIT', 'modifier une alerte BI');
    const rule = this.db.biAlertRules.find(candidate => candidate.id === id);
    if (!rule) throw new Error(`Alerte introuvable : « ${id} ».`);
    if (
      patch.measureCode !== undefined &&
      !BI_MEASURES[patch.measureCode] &&
      patch.measureCode !== 'STOCK_MOYEN'
    ) {
      throw new Error(`Mesure inconnue pour l’alerte : « ${patch.measureCode} ».`);
    }
    const { id: _id, createdAt: _createdAt, createdBy: _createdBy, ...allowed } = patch;
    Object.assign(rule, allowed, { updatedAt: new Date().toISOString() });
    this.saveDatabase(this.db);
    this.logAudit({
      action: 'UPDATE',
      entity: 'MAMORA_BI_ALERT',
      entityId: rule.id,
      newValues: `Mise à jour de l’alerte « ${rule.name} »`,
    });
    return rule;
  }

  public deleteBiAlertRule(id: string): void {
    this.assertBi('BI_KPI_EDIT', 'supprimer une alerte BI');
    const rule = this.db.biAlertRules.find(candidate => candidate.id === id);
    if (!rule) throw new Error(`Alerte introuvable : « ${id} ».`);
    this.db.biAlertRules = this.db.biAlertRules.filter(candidate => candidate.id !== id);
    this.saveDatabase(this.db);
    this.logAudit({
      action: 'DELETE',
      entity: 'MAMORA_BI_ALERT',
      entityId: id,
      oldValues: `Suppression de l’alerte « ${rule.name} »`,
    });
  }

  public getBiAlertEvents(): BiAlertEvent[] {
    this.assertBi('BI_VIEW', 'consulter l’historique des alertes');
    return [...this.db.biAlertEvents].sort((a, b) => b.detectedAt.localeCompare(a.detectedAt));
  }

  /**
   * Évalue les règles à seuil fixe. Les anomalies statistiques (écart à la moyenne
   * mobile) seront activées en mode BI LAN, quand l'historique quotidien existera.
   * Une seule alerte par règle et par jour est conservée.
   */
  public evaluateBiAlerts(): BiAlertEvent[] {
    this.assertBi('BI_VIEW', 'évaluer les alertes BI');
    const snapshot = this.getBiSnapshot();
    const scope = this.getBiScope();
    const today = new Date().toISOString().slice(0, 10);
    const created: BiAlertEvent[] = [];

    for (const rule of this.db.biAlertRules.filter(candidate => candidate.isActive)) {
      const isAnomalyMode = rule.mode === 'ANOMALY';
      let observed: number | null | undefined;
      let detail = '';
      if (isAnomalyMode) {
        const series = computeBiMeasureMonthlySeries(
          snapshot,
          scope,
          rule.measureCode,
          rule.lookbackPeriods ?? 12
        );
        const anomaly = detectBiAnomaly(
          series.map(point => point.value),
          rule.deviationFactor ?? 2
        );
        observed = anomaly.current;
        if (
          observed === null ||
          observed === undefined ||
          !anomaly.isAnomaly ||
          anomaly.zScore === null
        ) {
          continue;
        }
        detail = `écart statistique de ${anomaly.zScore.toFixed(2)} écart(s)-type en ${
          anomaly.direction === 'HAUSSE' ? 'hausse' : 'baisse'
        } par rapport à la moyenne de ${(anomaly.mean ?? 0).toLocaleString('fr-FR', {
          maximumFractionDigits: 2,
        })}`;
      } else {
        const period = resolveBiPeriod(rule.period);
        const { values } = computeBiMeasureValues(snapshot, scope, period);
        observed = values[rule.measureCode];
        if (observed === null || observed === undefined) continue;
        const triggered =
          rule.operator === 'GT' ? observed > rule.threshold :
          rule.operator === 'GTE' ? observed >= rule.threshold :
          rule.operator === 'LT' ? observed < rule.threshold :
          rule.operator === 'LTE' ? observed <= rule.threshold :
          rule.operator === 'EQ' ? observed === rule.threshold :
          observed !== rule.threshold;
        if (!triggered) continue;
        detail = `seuil ${rule.threshold.toLocaleString('fr-FR')}`;
      }
      const already = this.db.biAlertEvents.some(
        event => event.ruleId === rule.id && event.detectedAt.slice(0, 10) === today
      );
      if (already) continue;
      const severity: BiAlertEvent['severity'] =
        isAnomalyMode
          ? 'AVERTISSEMENT'
          : (rule.operator === 'LT' || rule.operator === 'LTE') &&
              rule.threshold > 0 &&
              observed < rule.threshold * 0.9
            ? 'CRITIQUE'
            : (rule.operator === 'GT' || rule.operator === 'GTE') && rule.threshold === 0
              ? 'CRITIQUE'
              : 'AVERTISSEMENT';
      const event: BiAlertEvent = {
        id: `BI-ALERT-EVT-${Date.now().toString(36).toUpperCase()}-${created.length}`,
        ruleId: rule.id,
        ruleName: rule.name,
        measureCode: rule.measureCode,
        observedValue: observed,
        threshold: rule.threshold,
        operator: rule.operator,
        severity,
        message: `${rule.name} : valeur observée ${observed.toLocaleString('fr-FR', {
          maximumFractionDigits: 2,
        })}, ${detail}.`,
        detectedAt: new Date().toISOString(),
        status: 'NOUVELLE',
      };
      this.db.biAlertEvents.unshift(event);
      created.push(event);
    }

    if (created.length > 0) {
      this.db.biAlertEvents = this.db.biAlertEvents.slice(0, 500);
      this.saveDatabase(this.db);
      this.logAudit({
        action: 'CREATE',
        entity: 'MAMORA_BI_ALERT_EVENT',
        entityId: 'BATCH',
        newValues: `${created.length} alerte(s) BI détectée(s)`,
      });
    }
    return created;
  }

  public acknowledgeBiAlertEvent(id: string, status: BiAlertEvent['status']): BiAlertEvent {
    this.assertBi('BI_KPI_EDIT', 'traiter une alerte BI');
    const event = this.db.biAlertEvents.find(candidate => candidate.id === id);
    if (!event) throw new Error(`Alerte introuvable : « ${id} ».`);
    event.status = status;
    event.acknowledgedBy = this.currentUser.name;
    event.acknowledgedAt = new Date().toISOString();
    this.saveDatabase(this.db);
    return event;
  }

  // --- Partages ---

  public getBiShares(): BiShare[] {
    this.assertBi('BI_SHARE', 'consulter les partages BI');
    return [...this.db.biShares];
  }

  public shareBiResource(
    resourceType: BiResourceType,
    resourceId: string,
    userIds: string[],
    roles: UserRole[]
  ): BiShare {
    this.assertBi('BI_SHARE', 'partager une ressource BI');
    const resource =
      resourceType === 'DASHBOARD'
        ? this.db.biDashboards.find(candidate => candidate.id === resourceId)
        : this.db.biReports.find(candidate => candidate.id === resourceId);
    if (!resource) throw new Error(`Ressource BI introuvable : « ${resourceId} ».`);
    const now = new Date().toISOString();
    const share: BiShare = {
      id: `BI-SHARE-${Date.now().toString(36).toUpperCase()}`,
      resourceType,
      resourceId,
      userIds: Array.from(new Set(userIds)),
      roles: Array.from(new Set(roles)),
      sharedBy: this.currentUser.name,
      createdAt: now,
    };
    this.db.biShares.push(share);
    resource.sharedWithUserIds = Array.from(
      new Set([...(resource.sharedWithUserIds || []), ...share.userIds])
    );
    resource.sharedWithRoles = Array.from(
      new Set([...(resource.sharedWithRoles || []), ...share.roles])
    );
    this.saveDatabase(this.db);
    this.logAudit({
      action: 'UPDATE',
      entity: 'MAMORA_BI_SHARE',
      entityId: share.id,
      newValues: `Partage ${resourceType} « ${resource.name} » avec ${share.userIds.length} utilisateur(s) et ${share.roles.length} rôle(s)`,
    });
    return share;
  }

  public revokeBiShare(id: string): void {
    this.assertBi('BI_SHARE', 'révoquer un partage BI');
    const share = this.db.biShares.find(candidate => candidate.id === id);
    if (!share) throw new Error(`Partage introuvable : « ${id} ».`);
    this.db.biShares = this.db.biShares.filter(candidate => candidate.id !== id);
    this.saveDatabase(this.db);
    this.logAudit({
      action: 'DELETE',
      entity: 'MAMORA_BI_SHARE',
      entityId: id,
      oldValues: `Révocation du partage ${share.resourceType} ${share.resourceId}`,
    });
  }

  // --- MAMORA AI ANALYST ---

  /** Fournisseur IA effectif : le moteur local est toujours disponible. */
  public getBiAnalystProvider() {
    this.assertBi('BI_VIEW', 'consulter le fournisseur MAMORA AI Analyst');
    return resolveBiAnalystProvider(this.db.biSettings);
  }

  public askBiAnalyst(question: string, period?: BiPeriod): BiAiResponse {
    this.assertBi('BI_AI_USE', 'interroger MAMORA AI Analyst');
    const settings = this.db.biSettings;
    const today = new Date().toISOString().slice(0, 10);
    const usageToday = this.db.auditLogs.filter(
      log => log.entity === 'MAMORA_BI_AI' && log.timestamp.slice(0, 10) === today
    ).length;
    if (usageToday >= settings.aiMaxRequestsPerDay) {
      throw new Error(
        `Limite quotidienne d’utilisation de MAMORA AI Analyst atteinte (${settings.aiMaxRequestsPerDay} questions). Réessayez demain ou ajustez la limite dans les paramètres BI.`
      );
    }
    const response = analyzeBiQuestion(
      question,
      this.getBiSnapshot(),
      this.getBiScope(),
      settings,
      period
    );
    this.logAudit({
      action: 'EXPORT',
      entity: 'MAMORA_BI_AI',
      entityId: 'QUESTION',
      newValues: `Question IA (${response.intent}) : ${question.slice(0, 240)} — fournisseur ${response.provider}`,
    });
    return response;
  }

  // --- Données de widgets ---

  /** Exécute la requête d'un widget de tableau de bord (lecture seule, périmètre appliqué). */
  public runBiWidget(widget: BiWidget, period?: BiPeriod): BiQueryResult {
    this.assertBi('BI_DASHBOARD_VIEW', 'afficher un widget de tableau de bord');
    const settings = this.db.biSettings;
    const source = BI_SOURCES[widget.source];
    const filters = [...widget.filters];
    // Filtre de période global du tableau de bord, uniquement sur les sources datées.
    if (source?.fields.some(field => field.key === 'date')) {
      if (period?.from) filters.push({ field: 'date', operator: 'GTE', value: period.from });
      if (period?.to) filters.push({ field: 'date', operator: 'LTE', value: period.to });
    }
    return runBiQuery(
      this.getBiSnapshot(),
      {
        source: widget.source,
        dimensions: [...widget.dimensions],
        measures: [...widget.measures],
        filters,
        limit: widget.limit ?? widget.options?.maxRows ?? 200,
      },
      this.getBiScope(),
      { maxRows: settings.maxRows, defaultLimit: Math.min(200, settings.maxRows) }
    );
  }

  // --- Exports (CSV, Excel, impression PDF) ---

  private static biCsvEscape(value: unknown): string {
    if (value === null || value === undefined) return '';
    const raw =
      typeof value === 'number'
        ? value.toLocaleString('fr-FR', { maximumFractionDigits: 4, useGrouping: false })
        : String(value);
    if (/[";\n\r]/.test(raw)) return `"${raw.replace(/"/g, '""')}"`;
    return raw;
  }

  private buildBiCsv(result: BiQueryResult): string {
    const header = result.columns.map(column => StorageService.biCsvEscape(column.label)).join(';');
    const lines = result.rows.map(row =>
      result.columns.map(column => StorageService.biCsvEscape(row[column.key])).join(';')
    );
    return `\uFEFF${[header, ...lines].join('\r\n')}`;
  }

  private buildBiExcelHtml(result: BiQueryResult, title: string): string {
    const escapeHtml = (value: unknown): string =>
      String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    const header = result.columns
      .map(column => `<th>${escapeHtml(column.label)}</th>`)
      .join('');
    const body = result.rows
      .map(
        row =>
          `<tr>${result.columns
            .map(column => {
              const value = row[column.key];
              const isNumber = typeof value === 'number';
              return `<td${isNumber ? ' style="text-align:right"' : ''}>${escapeHtml(value)}</td>`;
            })
            .join('')}</tr>`
      )
      .join('');
    return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
<head><meta charset="utf-8" /><title>${escapeHtml(title)}</title></head>
<body>
<h3>${escapeHtml(title)}</h3>
<p>Source : ${escapeHtml(result.sourceLabel)} — ${result.totalRows} ligne(s) — généré le ${escapeHtml(
      new Date(result.generatedAt).toLocaleString('fr-FR')
    )} par ${escapeHtml(result.scope.userName)}.</p>
<table border="1"><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table>
</body></html>`;
  }

  private buildBiPrintHtml(result: BiQueryResult, title: string): string {
    const escapeHtml = (value: unknown): string =>
      String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    const header = result.columns
      .map(column => `<th>${escapeHtml(column.label)}</th>`)
      .join('');
    const body = result.rows
      .map(
        row =>
          `<tr>${result.columns
            .map(column => `<td>${escapeHtml(row[column.key])}</td>`)
            .join('')}</tr>`
      )
      .join('');
    return `<!doctype html><html lang="fr"><head><meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<style>
  body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; margin: 24px; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  .meta { font-size: 11px; color: #475569; margin-bottom: 14px; }
  table { width: 100%; border-collapse: collapse; font-size: 10.5px; }
  th { background: #e2e8f0; text-align: left; padding: 5px 6px; border: 1px solid #cbd5e1; }
  td { padding: 4px 6px; border: 1px solid #e2e8f0; }
  tbody tr:nth-child(even) { background: #f8fafc; }
  .footer { margin-top: 16px; font-size: 9.5px; color: #64748b; }
</style></head>
<body>
<h1>${escapeHtml(title)}</h1>
<div class="meta">Source : ${escapeHtml(result.sourceLabel)} — ${result.rows.length} ligne(s) affichée(s) sur ${
      result.totalRows
    } — généré le ${escapeHtml(new Date(result.generatedAt).toLocaleString('fr-FR'))} par ${escapeHtml(
      result.scope.userName
    )}.</div>
<table><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table>
<div class="footer">MAMORA BI — document généré depuis la couche analytique en lecture seule. Les données respectent le périmètre magasin / service de l’utilisateur.</div>
</body></html>`;
  }

  public exportBiQueryCsv(
    query: BiQuery,
    fileName = 'mamora-bi-export'
  ): { fileName: string; content: string; mimeType: string } {
    this.assertBi('BI_EXPORT', 'exporter des données MAMORA BI');
    const result = this.executeBiQuery(query);
    this.logAudit({
      action: 'EXPORT',
      entity: 'MAMORA_BI_EXPORT',
      entityId: result.source,
      newValues: `Export CSV de ${result.rows.length} ligne(s) depuis « ${result.sourceLabel} »`,
    });
    return {
      fileName: `${fileName}.csv`,
      content: this.buildBiCsv(result),
      mimeType: 'text/csv;charset=utf-8;',
    };
  }

  public exportBiQueryExcel(
    query: BiQuery,
    fileName = 'mamora-bi-export'
  ): { fileName: string; content: string; mimeType: string } {
    this.assertBi('BI_EXPORT', 'exporter des données MAMORA BI vers Excel');
    const result = this.executeBiQuery(query);
    this.logAudit({
      action: 'EXPORT',
      entity: 'MAMORA_BI_EXPORT',
      entityId: result.source,
      newValues: `Export Excel de ${result.rows.length} ligne(s) depuis « ${result.sourceLabel} »`,
    });
    return {
      fileName: `${fileName}.xls`,
      content: this.buildBiExcelHtml(result, fileName),
      mimeType: 'application/vnd.ms-excel;charset=utf-8;',
    };
  }

  public buildBiQueryPrintHtml(query: BiQuery, title: string): string {
    this.assertBi('BI_EXPORT', 'imprimer un rapport MAMORA BI');
    const result = this.executeBiQuery(query);
    return this.buildBiPrintHtml(result, title);
  }

  public exportBiReportCsv(reportId: string): { fileName: string; content: string; mimeType: string } {
    this.assertBi('BI_EXPORT', 'exporter un rapport MAMORA BI');
    const report = this.db.biReports.find(candidate => candidate.id === reportId);
    if (!report) throw new Error(`Rapport introuvable : « ${reportId} ».`);
    const query: BiQuery = {
      source: report.source,
      dimensions: report.dimensions,
      measures: report.measures,
      filters: report.filters,
      limit: this.db.biSettings.maxRows,
    };
    const result = this.executeBiQuery(query);
    this.logAudit({
      action: 'EXPORT',
      entity: 'MAMORA_BI_REPORT_EXPORT',
      entityId: report.id,
      newValues: `Export CSV du rapport « ${report.name} » (${result.rows.length} ligne(s))`,
    });
    return {
      fileName: `${report.name.replace(/[^A-Za-z0-9_-]+/g, '_')}.csv`,
      content: this.buildBiCsv(result),
      mimeType: 'text/csv;charset=utf-8;',
    };
  }

  public exportBiReportExcel(
    reportId: string
  ): { fileName: string; content: string; mimeType: string } {
    this.assertBi('BI_EXPORT', 'exporter un rapport MAMORA BI vers Excel');
    const report = this.db.biReports.find(candidate => candidate.id === reportId);
    if (!report) throw new Error(`Rapport introuvable : « ${reportId} ».`);
    const query: BiQuery = {
      source: report.source,
      dimensions: report.dimensions,
      measures: report.measures,
      filters: report.filters,
      limit: this.db.biSettings.maxRows,
    };
    const result = this.executeBiQuery(query);
    this.logAudit({
      action: 'EXPORT',
      entity: 'MAMORA_BI_REPORT_EXPORT',
      entityId: report.id,
      newValues: `Export Excel du rapport « ${report.name} » (${result.rows.length} ligne(s))`,
    });
    return {
      fileName: `${report.name.replace(/[^A-Za-z0-9_-]+/g, '_')}.xls`,
      content: this.buildBiExcelHtml(result, report.name),
      mimeType: 'application/vnd.ms-excel;charset=utf-8;',
    };
  }

  public buildBiReportPrintHtml(reportId: string): string {
    this.assertBi('BI_EXPORT', 'imprimer un rapport MAMORA BI');
    const report = this.db.biReports.find(candidate => candidate.id === reportId);
    if (!report) throw new Error(`Rapport introuvable : « ${reportId} ».`);
    const query: BiQuery = {
      source: report.source,
      dimensions: report.dimensions,
      measures: report.measures,
      filters: report.filters,
      limit: this.db.biSettings.maxRows,
    };
    const result = this.executeBiQuery(query);
    return this.buildBiPrintHtml(result, report.name);
  }

}

export const storage = new StorageService();

