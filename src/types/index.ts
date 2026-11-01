/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * MAMORA GP — Types & Interfaces Définition
 * Système de Gestion de Production Assistée par Ordinateur (GPAO),
 * Sécurité Sanitaire ISO 22000:2018 / HACCP & Gestion Commerciale
 */

export type UserRole =
  | 'ADMIN'
  | 'DIRECTEUR_USINE'
  | 'RESPONSABLE_COMMERCIAL'
  | 'RESPONSABLE_PRODUCTION'
  | 'CHEF_DE_LIGNE'
  | 'OPERATEUR'
  | 'RESPONSABLE_QUALITE'
  | 'TECHNICIEN_LABO'
  | 'RESPONSABLE_MAINTENANCE'
  | 'MAGASINIER'
  | 'AUDITEUR_EXTERNE';

export const getRoleLabel = (role: UserRole): string => {
  switch (role) {
    case 'ADMIN': return 'Administrateur';
    case 'DIRECTEUR_USINE': return 'Directeur d\'Usine';
    case 'RESPONSABLE_COMMERCIAL': return 'Resp. Commercial';
    case 'RESPONSABLE_PRODUCTION': return 'Resp. Production';
    case 'CHEF_DE_LIGNE': return 'Chef de Ligne';
    case 'OPERATEUR': return 'Opérateur Atelier';
    case 'RESPONSABLE_QUALITE': return 'Resp. Qualité ISO 22000';
    case 'TECHNICIEN_LABO': return 'Technicien Labo';
    case 'RESPONSABLE_MAINTENANCE': return 'Resp. Maintenance';
    case 'MAGASINIER': return 'Magasinier';
    case 'AUDITEUR_EXTERNE': return 'Auditeur Externe';
    default: return role;
  }
};

export interface User {
  id: string;
  /** Nom complet (affichage principal). */
  name: string;
  /** Nom d'utilisateur unique (connexion). */
  username: string;
  /** Prénom. */
  firstName?: string;
  /** Nom de famille. */
  lastName?: string;
  email: string;
  role: UserRole;
  badgeNumber: string;
  department: string;
  /** Fonction / poste occupé. */
  function?: string;
  phone?: string;
  signature?: string;
  /** Statut du compte. */
  status: 'ACTIF' | 'INACTIF' | 'SUSPENDU';
  /** Date de création ISO 8601. */
  createdAt: string;
  /** Date de dernière modification ISO 8601. */
  updatedAt: string;
  /** Date de dernière connexion réussie. */
  lastLoginAt?: string;
  /** Nombre de tentatives de connexion échouées consécutives. */
  failedLoginAttempts: number;
  /** Date jusqu'à laquelle le compte est verrouillé (ISO 8601). */
  lockedUntil?: string;
  /** Date du dernier changement de PIN. */
  passwordChangedAt?: string;
  /** Sel aléatoire propre au profil, utilisé pour l'empreinte du code PIN de session. */
  pinSalt?: string;
  /** Empreinte du code PIN. Absente tant que le profil n'a pas été enrôlé à sa première connexion. */
  pinHash?: string;
  /**
   * Périmètre magasins du profil. Vide ou absent = accès à tous les magasins
   * autorisés par son rôle. Renseigné = accès strictement limité à ces magasins.
   */
  assignedWarehouseIds?: string[];
  /**
   * Périmètre services du profil pour la BI et l'Approvisionnement. Vide ou absent
   * = accès à tous les services autorisés par son rôle. Renseigné = accès strictement
   * limité à ces services (PRODUCTION, QUALITE, MAINTENANCE, ...).
   */
  assignedDepartments?: string[];
}

/** Rôle configurable avec permissions dynamiques. */
export interface Role {
  id: string;
  /** Identifiant technique (doit correspondre à une valeur de UserRole). */
  roleKey: UserRole;
  name: string;
  description: string;
  isActive: boolean;
  /** Liste des codes permission accordés. */
  permissions: string[];
  createdAt: string;
  updatedAt: string;
}

/** Événements traçables dans le journal d'audit. */
export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'VALIDATE'
  | 'BLOCK'
  | 'RELEASE'
  | 'QUARANTINE'
  | 'EXPORT'
  | 'RESTORE'
  | 'LOGIN'
  | 'LOGOUT'
  | 'FAILED_LOGIN'
  | 'PASSWORD_RESET'
  | 'USER_CREATED'
  | 'USER_UPDATED'
  | 'USER_DEACTIVATED'
  | 'ROLE_CREATED'
  | 'ROLE_UPDATED'
  | 'PERMISSION_CHANGED'
  | 'SESSION_EXPIRED'
  | 'SESSION_REVOKED';

/** Profils habilités à réinitialiser le code PIN d'un autre profil. */
export const PIN_RESET_ROLES: UserRole[] = ['ADMIN', 'DIRECTEUR_USINE'];

export type ItemCategory =
  | 'POISSON_CONGELE'
  | 'POISSON_FRAIS'
  | 'HUILE'
  | 'SAUCE_EPICES'
  | 'BOITE_METALLIQUE'
  | 'COUVERCLE'
  | 'CARTON_EMBALLAGE'
  | 'ETIQUETTE'
  | 'CONSOMMABLE'
  | 'PRODUIT_CHIMIQUE'
  | 'PALETTE'
  | 'PRODUIT_SEMI_FINI'
  | 'PRODUIT_FINI_THON'
  | 'PRODUIT_FINI_SARDINE'
  | 'AUTRE';

export const ITEM_CATEGORY_LABELS: Record<ItemCategory, string> = {
  POISSON_CONGELE: 'Poissons congelés',
  POISSON_FRAIS: 'Poissons frais',
  HUILE: 'Huiles',
  SAUCE_EPICES: 'Sauces, épices & ingrédients',
  BOITE_METALLIQUE: 'Boîtes métalliques',
  COUVERCLE: 'Couvercles',
  CARTON_EMBALLAGE: 'Cartons & emballages',
  ETIQUETTE: 'Étiquettes',
  CONSOMMABLE: 'Consommables',
  PRODUIT_CHIMIQUE: 'Produits chimiques',
  PALETTE: 'Palettes',
  PRODUIT_SEMI_FINI: 'Produits semi-finis',
  PRODUIT_FINI_THON: 'Produits finis thon',
  PRODUIT_FINI_SARDINE: 'Produits finis sardine',
  AUTRE: 'Autres articles',
};

export type UnitOfMeasure = 'KG' | 'G' | 'TONNE' | 'LITRE' | 'ML' | 'UNITE' | 'BOITE' | 'CARTON' | 'PALETTE';

export const UNIT_LABELS: Record<UnitOfMeasure, string> = {
  KG: 'Kilogramme (kg)',
  G: 'Gramme (g)',
  TONNE: 'Tonne (t)',
  LITRE: 'Litre (L)',
  ML: 'Millilitre (mL)',
  UNITE: 'Unité (u)',
  BOITE: 'Boîte (bt)',
  CARTON: 'Carton (ct)',
  PALETTE: 'Palette (pal)',
};

/**
 * Classification métier du référentiel « Matières premières & composants ».
 * Elle est distincte de `ItemCategory` (classification technique qui pilote le
 * magasin par défaut et les règles de stock) : un article conserve donc sa
 * catégorie technique tout en étant rangé dans le groupe fonctionnel exigé par
 * l'exploitation. Aucune donnée existante n'est requalifiée de force.
 */
export type ItemCategoryGroup =
  | 'MATIERES_PREMIERES_PRINCIPALES'
  | 'INGREDIENTS_ADDITIFS'
  | 'EMBALLAGES_PRIMAIRES'
  | 'EMBALLAGES_SECONDAIRES'
  | 'PRODUITS_SEMI_FINIS'
  | 'AUTRES_COMPOSANTS';

export const ITEM_CATEGORY_GROUP_LABELS: Record<ItemCategoryGroup, string> = {
  MATIERES_PREMIERES_PRINCIPALES: 'Matières premières principales',
  INGREDIENTS_ADDITIFS: 'Ingrédients et additifs',
  EMBALLAGES_PRIMAIRES: 'Emballages primaires',
  EMBALLAGES_SECONDAIRES: 'Emballages secondaires',
  PRODUITS_SEMI_FINIS: 'Produits semi-finis',
  AUTRES_COMPOSANTS: 'Autres composants',
};

export const ITEM_CATEGORY_GROUPS = Object.keys(
  ITEM_CATEGORY_GROUP_LABELS
) as ItemCategoryGroup[];

/** Groupe fonctionnel proposé par défaut pour une catégorie technique. */
export const groupForCategory = (category: ItemCategory): ItemCategoryGroup => {
  switch (category) {
    case 'POISSON_CONGELE':
    case 'POISSON_FRAIS':
      return 'MATIERES_PREMIERES_PRINCIPALES';
    case 'HUILE':
    case 'SAUCE_EPICES':
      return 'INGREDIENTS_ADDITIFS';
    case 'BOITE_METALLIQUE':
    case 'COUVERCLE':
    case 'ETIQUETTE':
      return 'EMBALLAGES_PRIMAIRES';
    case 'CARTON_EMBALLAGE':
    case 'PALETTE':
      return 'EMBALLAGES_SECONDAIRES';
    case 'PRODUIT_SEMI_FINI':
      return 'PRODUITS_SEMI_FINIS';
    case 'PRODUIT_FINI_THON':
    case 'PRODUIT_FINI_SARDINE':
    case 'CONSOMMABLE':
    case 'PRODUIT_CHIMIQUE':
    case 'AUTRE':
    default:
      return 'AUTRES_COMPOSANTS';
  }
};

/** Catégories techniques cohérentes avec un groupe fonctionnel. */
export const categoriesForGroup = (group: ItemCategoryGroup): ItemCategory[] =>
  (Object.keys(ITEM_CATEGORY_LABELS) as ItemCategory[]).filter(
    category => groupForCategory(category) === group
  );

/** Catégories correspondant à un produit fini fabriqué par l'usine (donc doté d'une nomenclature). */
export const MANUFACTURED_CATEGORIES: ItemCategory[] = [
  'PRODUIT_FINI_THON',
  'PRODUIT_FINI_SARDINE',
];

export const isManufacturedCategory = (category: ItemCategory): boolean =>
  MANUFACTURED_CATEGORIES.includes(category);

/** Fournisseur associé à un article (référence commerciale et délai d'approvisionnement). */
export interface ItemSupplierRef {
  supplierId: string;
  supplierName: string;
  /** Référence de l'article chez le fournisseur. */
  supplierReference?: string;
  /** Délai d'approvisionnement contractuel, en jours. */
  leadTimeDays?: number;
}

export interface Item {
  id: string;
  code: string;
  designation: string;
  /** Désignation commerciale ou technique secondaire (facultative). */
  secondaryDesignation?: string;
  category: ItemCategory;
  /**
   * Groupe fonctionnel du référentiel MP & composants. Déduit de la catégorie
   * technique à la création, puis librement ajustable.
   */
  group?: ItemCategoryGroup;
  /** Sous-catégorie configurable (référentiel ItemSubCategory). */
  subCategoryId?: string;
  description?: string;
  /** Photo de l'article encodée en data URL (stockage local, aucune dépendance réseau). */
  photoDataUrl?: string;
  /**
   * Statut de l'article. Absent = actif (compatibilité avec le référentiel
   * historique). Un article inactif reste consultable mais n'est plus proposé
   * dans les nouvelles opérations (nomenclatures, réceptions, transferts).
   */
  isActive?: boolean;
  unit: UnitOfMeasure;
  /** Unité secondaire de conditionnement (fût, carton, palette…). */
  secondaryUnit?: UnitOfMeasure;
  /** Nombre d'unités principales contenues dans une unité secondaire. */
  conversionCoefficient?: number;
  /** Libellé du conditionnement d'achat, ex. « Fût aseptique 240 kg ». */
  packaging?: string;
  /** Quantité (en unité principale) contenue dans un conditionnement. */
  quantityPerPackaging?: number;
  /** Magasin proposé par défaut : information indicative, non bloquante pour les transferts. */
  defaultWarehouseId?: string;
  defaultLocationId?: string;
  maxStockLevel?: number;
  /** Plage de conservation exigée, lorsque l'article est sensible à la température. */
  minTemperatureC?: number;
  maxTemperatureC?: number;
  technicalSpecifications?: string;
  /** Allergènes déclarés (liste libre séparée par des virgules). */
  allergens?: string;
  receiptControlRequirements?: string;
  /** Documents obligatoires à la réception (certificat sanitaire, fiche technique…). */
  mandatoryDocuments?: string[];
  primarySupplierId?: string;
  supplierRefs?: ItemSupplierRef[];
  createdAt?: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
  deactivatedAt?: string;
  deactivatedBy?: string;
  deactivationReason?: string;
  format?: string; // ex: '1/4 club', '4/4', '1/10'
  netWeightGrams?: number;
  drainedWeightGrams?: number;
  minStockLevel: number;
  /**
   * Stock disponible consolidé de l'usine. Cette valeur est désormais DÉRIVÉE des
   * stocks par magasin (somme des lots LIBERE moins les quantités réservées) et
   * ne doit jamais être modifiée directement : utiliser le moteur de stock.
   */
  currentStock: number;
  /** Stock en quarantaine consolidé (dérivé des lots au statut QUARANTAINE). */
  quarantineStock: number;
  /** Stock réservé (OF, ventes) consolidé. */
  allocatedStock: number;
  /** Stock en attente de contrôle qualité (dérivé). */
  pendingControlStock?: number;
  /** Stock bloqué ou rejeté (dérivé). */
  blockedStock?: number;
  /** Stock en transit entre magasins (dérivé, jamais compté dans le disponible). */
  transitStock?: number;
  storageCondition: string;
  shelfLifeMonths?: number;
  technicalSheetVersion: string;
}

// ============================================================================
// RÉFÉRENTIEL MATIÈRES PREMIÈRES & COMPOSANTS
// ============================================================================

/** Sous-catégorie configurable d'un groupe fonctionnel (ex. « Poissons congelés », « Fûts »). */
export interface ItemSubCategory {
  id: string;
  group: ItemCategoryGroup;
  code: string;
  designation: string;
  isActive: boolean;
  createdAt: string;
}

/**
 * Fournisseur du référentiel central. Les fournisseurs déjà saisis sur les
 * réceptions sont repris automatiquement (origine « RECEPTIONS ») : il n'existe
 * qu'une seule liste de fournisseurs dans MAMORA GP.
 */
export interface Supplier {
  id: string;
  code: string;
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  country?: string;
  isActive: boolean;
  /** « RECEPTIONS » = repris du référentiel historique des réceptions. */
  origin: 'RECEPTIONS' | 'MANUEL';
  createdAt: string;
  // --- Extension Service Approvisionnement (champs facultatifs, aucune donnée requalifiée) ---
  status?: 'ACTIF' | 'INACTIF' | 'SUSPENDU';
  wilaya?: string;
  city?: string;
  /** Contacts commerciaux multiples. */
  contacts?: Array<{ name: string; role?: string; phone?: string; email?: string }>;
  /** Groupes d'articles fournis, utilisés pour filtrer les fournisseurs à consulter. */
  categoryGroups?: ItemCategoryGroup[];
  paymentTermsDays?: number;
  currency?: string;
  defaultLeadTimeDays?: number;
  /** Identifiants administratifs (NIF, RC, AI). */
  taxId?: string;
  commercialRegister?: string;
  /** Documents administratifs et contrats archivés. */
  documents?: Array<{ id: string; name: string; kind: 'CONTRAT' | 'DOCUMENT' | 'CERTIFICAT'; reference?: string; validUntil?: string; addedAt: string; addedBy: string }>;
  notes?: string;
}

export type ItemChangeAction = 'CREATE' | 'UPDATE' | 'DEACTIVATE' | 'REACTIVATE';

/** Ligne du journal des modifications d'un article : un enregistrement par champ modifié. */
export interface ItemChangeLog {
  id: string;
  itemId: string;
  itemCode: string;
  itemDesignation: string;
  action: ItemChangeAction;
  /** Nom technique du champ modifié (« designation », « conversionCoefficient »…). */
  field: string;
  /** Libellé lisible du champ. */
  fieldLabel: string;
  oldValue: string;
  newValue: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  timestamp: string;
  motive?: string;
}

/** Droits distincts du référentiel articles. */
export type ItemPermission =
  | 'ITEM_VIEW'
  | 'ITEM_CREATE'
  | 'ITEM_EDIT'
  | 'ITEM_DEACTIVATE'
  | 'ITEM_CATEGORY_MANAGE'
  | 'ITEM_UNIT_MANAGE'
  | 'ITEM_SUPPLIER_MANAGE'
  | 'ITEM_HISTORY_VIEW';

export const ITEM_PERMISSION_LABELS: Record<ItemPermission, string> = {
  ITEM_VIEW: 'Consulter les articles',
  ITEM_CREATE: 'Créer des articles',
  ITEM_EDIT: 'Modifier les articles',
  ITEM_DEACTIVATE: 'Désactiver / réactiver un article',
  ITEM_CATEGORY_MANAGE: 'Gérer les catégories et sous-catégories',
  ITEM_UNIT_MANAGE: 'Modifier les unités et conversions',
  ITEM_SUPPLIER_MANAGE: 'Gérer les fournisseurs associés',
  ITEM_HISTORY_VIEW: 'Consulter l\'historique des modifications',
};

export const ITEM_ROLE_PERMISSIONS: Record<UserRole, ItemPermission[]> = {
  ADMIN: Object.keys(ITEM_PERMISSION_LABELS) as ItemPermission[],
  DIRECTEUR_USINE: Object.keys(ITEM_PERMISSION_LABELS) as ItemPermission[],
  RESPONSABLE_QUALITE: [
    'ITEM_VIEW',
    'ITEM_CREATE',
    'ITEM_EDIT',
    'ITEM_DEACTIVATE',
    'ITEM_CATEGORY_MANAGE',
    'ITEM_UNIT_MANAGE',
    'ITEM_SUPPLIER_MANAGE',
    'ITEM_HISTORY_VIEW',
  ],
  RESPONSABLE_PRODUCTION: [
    'ITEM_VIEW',
    'ITEM_CREATE',
    'ITEM_EDIT',
    'ITEM_UNIT_MANAGE',
    'ITEM_HISTORY_VIEW',
  ],
  MAGASINIER: ['ITEM_VIEW', 'ITEM_HISTORY_VIEW'],
  CHEF_DE_LIGNE: ['ITEM_VIEW'],
  OPERATEUR: ['ITEM_VIEW'],
  TECHNICIEN_LABO: ['ITEM_VIEW', 'ITEM_HISTORY_VIEW'],
  RESPONSABLE_COMMERCIAL: ['ITEM_VIEW'],
  RESPONSABLE_MAINTENANCE: ['ITEM_VIEW'],
  AUDITEUR_EXTERNE: ['ITEM_VIEW', 'ITEM_HISTORY_VIEW'],
};

/** Champs d'une fiche article modifiables via le module, avec leur libellé lisible. */
export const ITEM_FIELD_LABELS: Record<string, string> = {
  code: 'Code article',
  designation: 'Désignation',
  secondaryDesignation: 'Désignation secondaire',
  category: 'Catégorie',
  group: 'Groupe fonctionnel',
  subCategoryId: 'Sous-catégorie',
  description: 'Description',
  photoDataUrl: 'Photo',
  isActive: 'Statut',
  unit: 'Unité principale',
  secondaryUnit: 'Unité secondaire',
  conversionCoefficient: 'Coefficient de conversion',
  packaging: 'Conditionnement',
  quantityPerPackaging: 'Quantité par conditionnement',
  defaultWarehouseId: 'Magasin par défaut',
  defaultLocationId: 'Emplacement par défaut',
  minStockLevel: 'Stock minimum',
  maxStockLevel: 'Stock maximum',
  storageCondition: 'Conditions de conservation',
  minTemperatureC: 'Température minimale (°C)',
  maxTemperatureC: 'Température maximale (°C)',
  technicalSpecifications: 'Spécifications techniques',
  allergens: 'Allergènes',
  receiptControlRequirements: 'Contrôle à la réception',
  mandatoryDocuments: 'Documents obligatoires',
  shelfLifeMonths: 'Durée de conservation (mois)',
  technicalSheetVersion: 'Version fiche technique',
  primarySupplierId: 'Fournisseur principal',
  supplierRefs: 'Autres fournisseurs',
  format: 'Format',
  netWeightGrams: 'Poids net (g)',
  drainedWeightGrams: 'Poids égoutté (g)',
};

// ============================================================================
// ESPÈCES DE POISSON — DISCRIMINATION FIABLE (remplace les tests sur libellés)
// ============================================================================

/**
 * Famille d'espèce déclarée à l'agréage. Les libellés du select « Espèce de Poisson »
 * portent le nom scientifique entre parennnèses : c'est lui qui fait foi, car les
 * intitulés commerciaux varient (« Sardina pilchardus (Fraîche) » ne contient pas « Sardine »).
 */
export type FishSpeciesKind = 'THON_ALBACORE' | 'THON_LISTAO' | 'SARDINE' | 'INCONNUE';

export const speciesKindOf = (species: string): FishSpeciesKind => {
  const s = (species || '').toLowerCase();
  if (s.includes('albacares') || s.includes('albacore')) return 'THON_ALBACORE';
  if (s.includes('pelamis') || s.includes('listao')) return 'THON_LISTAO';
  if (s.includes('pilchardus') || s.includes('sardin')) return 'SARDINE';
  return 'INCONNUE';
};

/** Espèce débarquée fraîche sous glace (seuil ≤ +2 °C) plutôt que congelée (seuil ≤ -18 °C). */
export const isFreshSpecies = (species: string): boolean => /fra[îi]ch/i.test(species || '');

export const fishCategoryForSpecies = (species: string): ItemCategory =>
  isFreshSpecies(species) ? 'POISSON_FRAIS' : 'POISSON_CONGELE';

/** Catégorie de produit fini fabriquée à partir de l'espèce. */
export const finishedCategoryForSpecies = (species: string): ItemCategory | undefined => {
  const kind = speciesKindOf(species);
  if (kind === 'SARDINE') return 'PRODUIT_FINI_SARDINE';
  if (kind === 'THON_ALBACORE' || kind === 'THON_LISTAO') return 'PRODUIT_FINI_THON';
  return undefined;
};

/** Un lot de matière première n'est affectable qu'à un OF du produit fini correspondant. */
export const isSpeciesCompatibleWithCategory = (species: string, category: ItemCategory): boolean =>
  finishedCategoryForSpecies(species) === category;

const SPECIES_ITEM_KEYWORDS: Record<FishSpeciesKind, string[]> = {
  THON_ALBACORE: ['albacore', 'albacares'],
  THON_LISTAO: ['listao', 'pelamis'],
  SARDINE: ['sardine', 'sardina', 'pilchardus'],
  INCONNUE: [],
};

/**
 * Article matière première du référentiel correspondant à une espèce réceptionnée.
 * Retourne undefined si le référentiel ne contient aucun article poisson de la bonne
 * température de conservation : la réception ne doit alors rien imputer en stock.
 */
export const findFishItemForSpecies = (items: Item[], species: string): Item | undefined => {
  const category = fishCategoryForSpecies(species);
  const keywords = SPECIES_ITEM_KEYWORDS[speciesKindOf(species)];
  const candidates = items.filter(i => i.category === category);
  const matched = candidates.find(item => {
    const haystack = `${item.code} ${item.designation}`.toLowerCase();
    return keywords.some(keyword => haystack.includes(keyword));
  });
  return matched || (keywords.length === 0 ? candidates[0] : undefined);
};

export interface RecipeIngredient {
  itemId: string;
  itemCode: string;
  designation: string;
  theoreticalQuantityPer1000Cans: number;
  unit: UnitOfMeasure;
  tolerancePercent: number;
  /** Perte théorique de fabrication du composant (parage, égouttage, purges), en %. */
  theoreticalLossPercent?: number;
}

/**
 * Cycle de vie d'une nomenclature. Une nomenclature BROUILLON ne peut pas être
 * utilisée pour lancer un ordre de fabrication ; une nomenclature OBSOLETE a été
 * remplacée par une version successive et reste consultable à des fins de traçabilité.
 */
export type NomenclatureStatus = 'BROUILLON' | 'VALIDEE' | 'OBSOLETE';

export interface Recipe {
  id: string;
  code: string;
  name: string;
  /** Produit fini auquel cette nomenclature est liée. Vide tant qu'elle est en brouillon non rattaché. */
  finishedItemId: string;
  version: string;
  targetCanFormat?: string;
  ingredients: RecipeIngredient[];
  /** Quantité de fabrication de référence servant de base aux quantités théoriques des composants. */
  referenceProductionQty?: number;
  referenceUnit?: UnitOfMeasure;
  comments?: string;
  status?: NomenclatureStatus;
  sterilizationScheduleRef?: string; // ex: 'BAREME-AUTO-TH-01'
  targetTemperatureC?: number;
  targetHoldingTimeMinutes?: number;
  targetF0Value?: number;
  targetPressureBar?: number;
  seamingSpecRef?: string;
  approvedBy?: string;
  approvedAt?: string;
  isActive: boolean;
}

export type QualityDecision = 'EN_ATTENTE' | 'ACCEPTE' | 'ACCEPTE_DEROGATION' | 'REFUSE';

export interface RawBatchReception {
  id: string;
  receptionNumber: string; // REC-YYYYMMDD-XXX
  internalBatchNumber: string; // LOT-MP-YYYYMMDD-XXX
  supplier: string;
  vesselOrOrigin: string;
  supplierBatchNumber: string;
  species: string; // 'Thon Albacore (Thunnus albacares)', 'Thon Listao (Katsuwonus pelamis)', 'Sardina pilchardus'
  receptionDate: string;
  orderedQtyKg: number;
  receivedQtyKg: number;
  acceptedQtyKg: number;
  rejectedQtyKg: number;
  temperatureAtIntakeC: number; // Max -18°C congelé, max +4°C frais
  histaminePpm: number; // ISO 22000 / CE: < 50 ppm recommandé, max 100 ppm
  vehicleCleanlinessCompliant: boolean;
  documentsAttached: string[];
  intakeOperator: string;
  qualityInspector: string;
  storageLocation: string;
  decision: QualityDecision;
  decisionReason?: string;
  derogationAuthorizedBy?: string;
  notes?: string;
}

export type WorkOrderStatus =
  | 'BROUILLON'
  | 'PLANIFIE'
  | 'EN_COURS'
  | 'EN_CONTROLE'
  | 'CLOTURE'
  | 'ANNULE';

export interface WorkOrder {
  id: string;
  orderNumber: string; // OF-2026-XXXX
  recipeId: string;
  /** Version de nomenclature figée au lancement de l'OF (traçabilité, non modifiable a posteriori). */
  recipeVersion?: string;
  finishedItemId: string;
  productName: string;
  plannedCansQty: number;
  plannedCartonsQty: number;
  actualCansQty: number;
  lineId: string;
  teamLeader: string;
  shift: 'EQUIPE_MATIN' | 'EQUIPE_SOIR' | 'EQUIPE_NUIT';
  startDatePlanned: string;
  endDatePlanned: string;
  startDateActual?: string;
  endDateActual?: string;
  assignedRawBatchId: string;
  assignedOilBatchId?: string;
  assignedCanBatchId: string;
  assignedLidBatchId: string;
  priority: 'NORMALE' | 'HAUTE' | 'URGENTE';
  status: WorkOrderStatus;
  rawMaterialYieldPercent?: number; // Rendement matière net
  theoreticalFishKgNeeded: number;
  actualFishKgConsumed: number;
  rejectedCansQty: number;
  salesOrderId?: string;
  validatedBy?: string;
  notes?: string;
}

export interface ManufacturingStepLog {
  id: string;
  workOrderId: string;
  stepNumber: number; // 1 to 17
  stepName: string;
  startTime: string;
  endTime?: string;
  operator: string;
  lineOrEquipment: string;
  inputQuantityKg: number;
  outputQuantityKg: number;
  yieldPercent: number;
  wasteKg: number;
  rejectionReason?: string;
  stopTimeMinutes: number;
  stopReason?: string;
  measuredParameters: Record<string, string | number>;
  isControlled: boolean;
  controllerName?: string;
  status: 'NON_COMMENCE' | 'EN_COURS' | 'TERMINE' | 'ALERTE';
  notes?: string;
}

export interface SeamingInspection {
  id: string;
  inspectionNumber: string; // SERTI-2026-XXXX
  workOrderId: string;
  timestamp: string;
  lineId: string;
  seamerId: string;
  headNumber: number; // 1 to 4
  canReference: string;
  lidBatchNumber: string;
  seamThicknessMm: number; // Cible ex: 1.15 ± 0.05 mm
  seamHeightMm: number; // Cible ex: 2.80 ± 0.10 mm
  countersinkDepthMm: number; // Cible ex: 3.00 ± 0.15 mm
  bodyHookMm: number; // Crochet de corps
  coverHookMm: number; // Crochet de fond
  overlapPercent: number; // Croisure % (doit être >= 50%)
  tightnessPercent: number; // Serrage % (doit être >= 70%)
  visualAspectCompliant: boolean;
  wrinkleRating: 'CONFORME' | 'ACCEPTABLE' | 'DEFAUT';
  inspectorName: string;
  isConforming: boolean;
  correctiveActionTaken?: string;
}

export interface AutoclaveCycle {
  id: string;
  cycleNumber: string; // AUTO-2026-XXXX
  autoclaveId: string;
  autoclaveName: string;
  workOrderIds: string[];
  loadedBatches: string[];
  basketCount: number;
  totalCansLoaded: number;
  scheduleReference: string; // Barème officiel validé
  date: string;
  ventingStartTime: string;
  ventingEndTime: string;
  ventingTempC: number;
  holdingStartTime: string;
  holdingEndTime: string;
  targetTempC: number;
  actualTempMeanC: number;
  targetHoldingDurationMin: number;
  actualHoldingDurationMin: number;
  targetPressureBar: number;
  actualPressureBar: number;
  coolingStartTime: string;
  coolingEndTime: string;
  coolingWaterChlorinePpm: number; // PRPo ISO 22000 (0.5 - 2.0 ppm)
  waterExitTempC: number; // Max 40°C pour séchage
  calculatedF0: number; // Valeur stérilisatrice F0 atteinte
  operatorName: string;
  qualityApproverName?: string;
  isApprovedByQuality: boolean;
  approvalTimestamp?: string;
  cycleStatus: 'PROGRAMME' | 'EN_COURS' | 'VALIDE' | 'NON_CONFORME' | 'BLOQUE';
  temperatureCurvePoints: { timeMinute: number; temperatureC: number; pressureBar: number }[];
  deviationNotes?: string;
}

export type CcpPrpoType = 'CCP' | 'PRPO';

export interface HaccpMonitoringRecord {
  id: string;
  referenceId: string; // ex: 'CCP-1', 'PRPo-2'
  type: CcpPrpoType;
  pointName: string;
  stepName: string;
  workOrderId?: string;
  timestamp: string;
  parameterName: string;
  measuredValue: number;
  unit: string;
  criticalLimitMin?: number;
  criticalLimitMax?: number;
  operationalLimitMin?: number;
  operationalLimitMax?: number;
  isCompliant: boolean;
  operatorName: string;
  reviewedByQuality: boolean;
  correctiveAction?: string;
}

export type NonConformitySeverity = 'MINEURE' | 'MAJEURE' | 'CRITIQUE';

export interface NonConformity {
  id: string;
  ncNumber: string; // NC-2026-XXXX
  date: string;
  origin: 'RECEPTION' | 'FABRICATION' | 'SERTISSAGE' | 'STERILISATION' | 'LABORATOIRE' | 'CLIENT';
  severity: NonConformitySeverity;
  affectedBatchId: string;
  batchType: 'MATIERE_PREMIERE' | 'SEMI_FINI' | 'PRODUIT_FINI';
  affectedQuantity: number;
  unit: UnitOfMeasure;
  description: string;
  causeAnalysis5M: {
    matiere?: string;
    methode?: string;
    milieu?: string;
    materiel?: string;
    mainDoeuvre?: string;
  };
  immediateAction: string; // Quarantaine, arrêt ligne, etc.
  isQuarantined: boolean;
  quarantineLocation: string;
  correctiveActionPlan: string;
  responsiblePerson: string;
  deadlineDate: string;
  isResolved: boolean;
  resolutionDate?: string;
  qualityApprovalName?: string;
  qualityApprovalDate?: string;
  finalDisposition: 'RETRAITEMENT' | 'DECLASSEMENT' | 'DESTRUCTION' | 'LIBERATION_DEROGATION';
}

export type BatchReleaseStatus = 'EN_ATTENTE' | 'LIBERE' | 'BLOQUE' | 'REJETE';

export interface FinishedBatch {
  id: string;
  batchNumber: string; // LOT-PF-YYYYMMDD-XXX
  workOrderId: string;
  itemId: string;
  productName: string;
  format: string;
  productionDate: string;
  bestBeforeDate: string; // DDM / DLUO (+ 3 ou 5 ans)
  totalCansProduced: number;
  conformingCans: number;
  rejectedCans: number;
  totalCartons: number;
  totalPallets: number;
  warehouseLocation: string;
  seamingChecked: boolean;
  autoclaveCycleConforming: boolean;
  incubationTestPassed: boolean; // Épreuve d'étuve 7j / 14j (ISO 22000)
  chemicalAndHistaminePassed: boolean;
  releaseStatus: BatchReleaseStatus;
  releasedBy?: string;
  releaseDate?: string;
  releaseNotes?: string;
}

export interface Customer {
  id: string;
  code: string; // CLI-XXXX
  companyName: string;
  category: 'GMS' | 'GROSSISTE' | 'EXPORT' | 'COLLECTIVITE' | 'DISTRIBUTEUR';
  address: string;
  city: string;
  country: string;
  contactPerson: string;
  email: string;
  phone: string;
  taxNumber: string; // NIF / Registre de Commerce
  paymentTermsDays: number; // 30, 60, comptant
  creditLimitDzd: number;
  currentBalanceDzd: number;
  isActive: boolean;
}

export type SalesOrderStatus =
  | 'BROUILLON'
  | 'CONFIRME'
  | 'EN_PREPARATION'
  | 'EXPEDIE'
  | 'FACTURE'
  | 'ANNULE';

export interface SalesOrderItem {
  itemId: string;
  itemCode: string;
  designation: string;
  orderedCansQty: number;
  orderedCartonsQty: number;
  unitPriceDzd: number;
  totalLineDzd: number;
  allocatedBatchId?: string;
  isAllocated: boolean;
}

export interface SalesOrder {
  id: string;
  orderNumber: string; // BC-2026-XXXX
  customerId: string;
  customerName: string;
  orderDate: string;
  requestedDeliveryDate: string;
  items: SalesOrderItem[];
  subtotalDzd: number;
  vatRatePercent: number;
  totalAmountDzd: number;
  status: SalesOrderStatus;
  assignedWorkOrderId?: string;
  deliveryAddress: string;
  salesRepresentative: string;
  notes?: string;
}

export interface DeliveryNoteLine {
  finishedBatchId: string;
  batchNumber: string;
  itemId: string;
  designation: string;
  cartonsDelivered: number;
  cansDelivered: number;
  palletsCount: number;
  bestBeforeDate: string;
}

export interface DeliveryNote {
  id: string;
  deliveryNumber: string; // BL-2026-XXXX
  salesOrderId: string;
  customerId: string;
  customerName: string;
  departureDate: string;
  driverName: string;
  truckPlate: string;
  truckHygieneCompliant: boolean; // PRP ISO 22000
  lines: DeliveryNoteLine[];
  totalCartons: number;
  totalCans: number;
  deliveredBy: string;
  receivedByCustomer?: string;
  invoiceId?: string;
  status: 'EN_PREPARATION' | 'EXPEDIE' | 'LIVRE';
}

export interface Invoice {
  id: string;
  invoiceNumber: string; // FAC-2026-XXXX
  deliveryNoteId: string;
  salesOrderId: string;
  customerId: string;
  customerName: string;
  invoiceDate: string;
  dueDate: string;
  subtotalDzd: number;
  vatAmountDzd: number;
  totalAmountDzd: number;
  paidAmountDzd: number;
  paymentStatus: 'NON_PAYEE' | 'PARTIELLEMENT_PAYEE' | 'REGLEE' | 'EN_RETARD';
}

export type StockMovementType =
  | 'ENTREE_RECEPTION'
  | 'CONSOMMATION_OF'
  | 'SORTIE_VENTE'
  | 'REBUT_DEFECTUEUX'
  | 'RETOUR_STOCK'
  | 'AJUSTEMENT_INVENTAIRE'
  | 'TRANSFERT_SORTIE'
  | 'TRANSFERT_ENTREE'
  | 'RETOUR_MAGASIN'
  | 'RECEPTION_PRODUCTION'
  | 'MISE_EN_QUARANTAINE'
  | 'CHANGEMENT_STATUT_QUALITE'
  | 'REGULARISATION_TRANSFERT'
  | 'SORTIE_PRODUIT_FINI';

/**
 * Grand livre unique des mouvements de stock de MAMORA GP.
 * Les champs magasin / emplacement / lot étendent le registre historique existant :
 * il n'existe PAS de second système de stock. `stockDelta` porte l'effet réel sur
 * le stock physique (0 pour un mouvement purement documentaire).
 */
export interface StockMovement {
  id: string;
  timestamp: string;
  /** Numéro du document source (réception, transfert, BL, OF, fiche de consommation…). */
  documentNumber?: string;
  itemId: string;
  itemCode: string;
  batchNumber: string;
  lotId?: string;
  type: StockMovementType;
  quantity: number;
  unit: UnitOfMeasure;
  /** Effet réel sur le stock physique. Si absent, déduit du type de mouvement. */
  stockDelta?: number;
  sourceWarehouseId?: string;
  destinationWarehouseId?: string;
  locationId?: string;
  sourceLocationId?: string;
  destinationLocationId?: string;
  sourceLocation?: string;
  destinationLocation?: string;
  qualityStatus?: StockQualityStatus;
  workOrderId?: string;
  deliveryNoteId?: string;
  referenceDocument?: string;
  userId: string;
  userName: string;
  reason?: string;
}

// ============================================================================
// MULTI-MAGASINS : MAGASINS, EMPLACEMENTS, LOTS & STOCKS PAR MAGASIN
// ============================================================================

export type WarehouseType =
  | 'MATIERES_PREMIERES'
  | 'PRODUCTION'
  | 'PRODUITS_FINIS'
  | 'EMBALLAGES'
  | 'CONSOMMABLES'
  | 'CHIMIQUES'
  | 'QUARANTAINE'
  | 'NON_CONFORMES'
  | 'STOCKAGE_TEMPORAIRE'
  | 'AUTRE';

export const WAREHOUSE_TYPE_LABELS: Record<WarehouseType, string> = {
  MATIERES_PREMIERES: 'Matières premières',
  PRODUCTION: 'Production',
  PRODUITS_FINIS: 'Produits finis',
  EMBALLAGES: 'Emballages',
  CONSOMMABLES: 'Consommables',
  CHIMIQUES: 'Produits chimiques',
  QUARANTAINE: 'Quarantaine',
  NON_CONFORMES: 'Produits non conformes',
  STOCKAGE_TEMPORAIRE: 'Stockage temporaire',
  AUTRE: 'Autre magasin',
};

export interface Warehouse {
  id: string;
  /** Code unique, ex. MAG-MP-01. */
  code: string;
  designation: string;
  type: WarehouseType;
  description: string;
  /** Nom du responsable du magasin. */
  manager: string;
  /** Emplacement géographique dans l'usine (bâtiment, niveau, travée…). */
  location: string;
  /** Adresse ou zone détaillée. */
  addressZone: string;
  isActive: boolean;
  createdAt: string;
  /** Profils explicitement autorisés. Vide = tous les profils autorisés par leur rôle. */
  allowedUserIds?: string[];
  /** Magasin dont les entrées nécessitent une libération qualité avant disponibilité. */
  requiresQualityRelease: boolean;
  /** Magasin pouvant alimenter les ateliers de production. */
  allowsProductionSupply: boolean;
  /** Magasin pouvant recevoir les produits finis de production. */
  allowsProductionOutput: boolean;
}

export interface WarehouseLocation {
  id: string;
  code: string;
  designation: string;
  warehouseId: string;
  /** Type de zone : poisson frais, poisson congelé, ingrédients, produits libérés… */
  zoneType: string;
  /** Capacité facultative, exprimée dans capacityUnit. */
  capacity?: number;
  capacityUnit?: UnitOfMeasure;
  storageConditions: string;
  isActive: boolean;
  createdAt: string;
}

export type StockQualityStatus =
  | 'LIBERE'
  | 'EN_ATTENTE_CONTROLE'
  | 'CONFORME'
  | 'NON_CONFORME'
  | 'QUARANTAINE'
  | 'BLOQUE'
  | 'REJETE';

export const STOCK_QUALITY_LABELS: Record<StockQualityStatus, string> = {
  LIBERE: 'Libéré / Disponible',
  EN_ATTENTE_CONTROLE: 'En attente de contrôle',
  CONFORME: 'Conforme (en attente de libération)',
  NON_CONFORME: 'Non conforme',
  QUARANTAINE: 'Quarantaine',
  BLOQUE: 'Bloqué',
  REJETE: 'Rejeté',
};

/**
 * Statuts qui rendent une quantité indisponible pour la production ou la sortie.
 * « Conforme » atteste la réussite des contrôles mais reste bloquant jusqu'à la
 * décision de libération : seuls les lots LIBERE sont disponibles.
 */
export const UNAVAILABLE_QUALITY_STATUSES: StockQualityStatus[] = [
  'EN_ATTENTE_CONTROLE',
  'CONFORME',
  'NON_CONFORME',
  'QUARANTAINE',
  'BLOQUE',
  'REJETE',
];

/** Regroupement des statuts pour les agrégats d'état du stock. */
export const QUALITY_STATUS_GROUPS: Record<
  'pending' | 'blocked',
  StockQualityStatus[]
> = {
  pending: ['EN_ATTENTE_CONTROLE', 'CONFORME'],
  blocked: ['BLOQUE', 'NON_CONFORME', 'REJETE'],
};

export interface LotWarehouseTrailEntry {
  warehouseId: string;
  warehouseCode: string;
  locationId?: string;
  locationCode?: string;
  transferNumber?: string;
  enteredAt: string;
  exitedAt?: string;
}

export interface LotQualityHistoryEntry {
  timestamp: string;
  from: StockQualityStatus;
  to: StockQualityStatus;
  user: string;
  reason: string;
  documentNumber?: string;
}

/** Identité d'un lot, conservée tout au long de son cycle de vie multi-magasins. */
export interface StockLot {
  id: string;
  /** Numéro de lot interne, unique par article. */
  lotNumber: string;
  supplierLotNumber?: string;
  itemId: string;
  itemCode: string;
  receptionDate?: string;
  /** Date de durabilité applicable (DDM / DLUO). */
  expiryDate?: string;
  /** Statut qualité de référence du lot (synchronisé avec ses stocks). */
  qualityStatus: StockQualityStatus;
  origin?: string;
  createdAt: string;
  /** Historique des magasins traversés : aucun transfert ne perd cette information. */
  warehouseTrail: LotWarehouseTrailEntry[];
  qualityHistory?: LotQualityHistoryEntry[];
}

/**
 * Stock physique d'un lot dans un magasin et un emplacement donnés.
 * Une ligne = un lot + un magasin + un emplacement + un statut qualité.
 * Aucune quantité de magasins différents n'est jamais fusionnée dans cette table.
 */
export interface WarehouseStock {
  id: string;
  warehouseId: string;
  locationId: string;
  itemId: string;
  itemCode: string;
  lotId: string;
  lotNumber: string;
  qualityStatus: StockQualityStatus;
  quantity: number;
  reservedQty: number;
  unit: UnitOfMeasure;
  updatedAt: string;
}

/** Quantité expédiée d'un magasin à un autre, ni disponible à l'origine ni à destination. */
export interface StockTransit {
  id: string;
  transferId: string;
  transferNumber: string;
  lineId: string;
  itemId: string;
  itemCode: string;
  lotId: string;
  lotNumber: string;
  quantity: number;
  receivedQty: number;
  unit: UnitOfMeasure;
  qualityStatus: StockQualityStatus;
  sourceWarehouseId: string;
  destinationWarehouseId: string;
  shippedAt: string;
  shippedBy: string;
  status: 'EN_TRANSIT' | 'RECEPTIONNE' | 'ECART';
}

// ============================================================================
// TRANSFERTS ENTRE MAGASINS
// ============================================================================

export type TransferStatus =
  | 'BROUILLON'
  | 'EN_ATTENTE_VALIDATION'
  | 'VALIDE'
  | 'REFUSE'
  | 'EN_PREPARATION'
  | 'EXPEDIE'
  | 'PARTIELLEMENT_RECEPTIONNE'
  | 'RECEPTIONNE'
  | 'CLOTURE_PARTIELLE'
  | 'ANNULE';

export const TRANSFER_STATUS_LABELS: Record<TransferStatus, string> = {
  BROUILLON: 'Brouillon',
  EN_ATTENTE_VALIDATION: 'En attente de validation',
  VALIDE: 'Validé',
  REFUSE: 'Refusé',
  EN_PREPARATION: 'En préparation',
  EXPEDIE: 'Expédié',
  PARTIELLEMENT_RECEPTIONNE: 'Partiellement réceptionné',
  RECEPTIONNE: 'Réceptionné',
  CLOTURE_PARTIELLE: 'Clôturé partiellement',
  ANNULE: 'Annulé',
};

export type TransferType = 'INTER_MAGASIN' | 'INTER_EMPLACEMENT' | 'RETOUR_MAGASIN';

export const TRANSFER_TYPE_LABELS: Record<TransferType, string> = {
  INTER_MAGASIN: 'Transfert entre magasins',
  INTER_EMPLACEMENT: 'Transfert entre emplacements',
  RETOUR_MAGASIN: 'Retour magasin',
};

export type TransferLineStatus =
  | 'EN_ATTENTE'
  | 'PRET'
  | 'EXPEDIE'
  | 'RECEPTIONNE_PARTIEL'
  | 'RECEPTIONNE'
  | 'ECART_VALIDE';

export interface TransferLine {
  id: string;
  itemId: string;
  itemCode: string;
  designation: string;
  lotId: string;
  lotNumber: string;
  unit: UnitOfMeasure;
  /** Statut qualité du lot au moment de la demande : il est préservé pendant tout le transfert. */
  qualityStatus?: StockQualityStatus;
  requestedQty: number;
  availableAtRequest: number;
  sourceLocationId: string;
  destinationLocationId?: string;
  preparedQty?: number;
  shippedQty?: number;
  receivedQty?: number;
  damagedQty?: number;
  receivedLotNumber?: string;
  shippedAt?: string;
  shippedBy?: string;
  receivedAt?: string;
  receivedBy?: string;
  observations?: string;
  status: TransferLineStatus;
}

export type DiscrepancyType =
  | 'MANQUANT'
  | 'EXCEDENT'
  | 'ENDOMMAGE'
  | 'LOT_INCORRECT'
  | 'RECEPTION_PARTIELLE'
  | 'AUTRE';

export const DISCREPANCY_TYPE_LABELS: Record<DiscrepancyType, string> = {
  MANQUANT: 'Quantité manquante',
  EXCEDENT: 'Quantité excédentaire',
  ENDOMMAGE: 'Article endommagé',
  LOT_INCORRECT: 'Lot incorrect',
  RECEPTION_PARTIELLE: 'Réception partielle',
  AUTRE: 'Autre écart',
};

export interface TransferDiscrepancy {
  id: string;
  lineId: string;
  type: DiscrepancyType;
  quantity: number;
  unit: UnitOfMeasure;
  reason: string;
  recordedBy: string;
  recordedAt: string;
  regularizationStatus: 'CONSTATEE' | 'REGULARISEE' | 'CLOTUREE';
  regularizationAction?: 'AJOUT_STOCK' | 'PERTE_DEFINITIVE';
  regularizationBy?: string;
  regularizationAt?: string;
  regularizationNotes?: string;
}

export interface TransferStatusHistoryEntry {
  status: TransferStatus;
  timestamp: string;
  user: string;
  comment?: string;
}

export interface StockTransfer {
  id: string;
  transferNumber: string;
  type: TransferType;
  sourceWarehouseId: string;
  destinationWarehouseId: string;
  requestDate: string;
  requester: string;
  requesterId: string;
  reason: string;
  status: TransferStatus;
  workOrderId?: string;
  returnOfTransferId?: string;
  lines: TransferLine[];
  discrepancies: TransferDiscrepancy[];
  statusHistory: TransferStatusHistoryEntry[];
  submittedAt?: string;
  validatedBy?: string;
  validatedAt?: string;
  refusedBy?: string;
  refusedAt?: string;
  refusalReason?: string;
  preparedBy?: string;
  preparedAt?: string;
  shippedBy?: string;
  shippedAt?: string;
  receivedBy?: string;
  receivedAt?: string;
  cancellationReason?: string;
  partialClosureAuthorizedBy?: string;
  partialClosureReason?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TransferLineInput {
  itemId: string;
  lotId?: string;
  lotNumber?: string;
  requestedQty: number;
  sourceLocationId: string;
  destinationLocationId?: string;
}

export interface CreateTransferInput {
  type?: TransferType;
  sourceWarehouseId: string;
  destinationWarehouseId: string;
  reason: string;
  workOrderId?: string;
  returnOfTransferId?: string;
  notes?: string;
  lines: TransferLineInput[];
}

export interface ShipTransferLineInput {
  lineId: string;
  preparedQty: number;
  shippedQty: number;
}

export interface ReceiveTransferLineInput {
  lineId: string;
  receivedQty: number;
  damagedQty: number;
  receivedLotNumber?: string;
  destinationLocationId: string;
  observations?: string;
}

// ============================================================================
// DROITS & PERMISSIONS MULTI-MAGASINS
// ============================================================================

export type WarehousePermission =
  | 'WAREHOUSE_VIEW'
  | 'WAREHOUSE_CREATE'
  | 'WAREHOUSE_EDIT'
  | 'STOCK_VIEW'
  | 'TRANSFER_REQUEST'
  | 'TRANSFER_VALIDATE'
  | 'TRANSFER_PREPARE'
  | 'TRANSFER_SHIP'
  | 'TRANSFER_RECEIVE'
  | 'TRANSFER_DISCREPANCY_VALIDATE'
  | 'RETURN_REQUEST'
  | 'STOCK_REGULARIZE'
  | 'MOVEMENT_HISTORY_VIEW'
  | 'REPORTS_EXPORT';

export const WAREHOUSE_PERMISSION_LABELS: Record<WarehousePermission, string> = {
  WAREHOUSE_VIEW: 'Consulter les magasins',
  WAREHOUSE_CREATE: 'Créer un magasin',
  WAREHOUSE_EDIT: 'Modifier les paramètres d\'un magasin',
  STOCK_VIEW: 'Consulter les stocks',
  TRANSFER_REQUEST: 'Demander un transfert',
  TRANSFER_VALIDATE: 'Valider / refuser un transfert',
  TRANSFER_PREPARE: 'Préparer une sortie',
  TRANSFER_SHIP: 'Confirmer une expédition',
  TRANSFER_RECEIVE: 'Réceptionner un transfert',
  TRANSFER_DISCREPANCY_VALIDATE: 'Valider les écarts et clôtures partielles',
  RETURN_REQUEST: 'Effectuer un retour magasin',
  STOCK_REGULARIZE: 'Effectuer une régularisation de stock',
  MOVEMENT_HISTORY_VIEW: 'Consulter les historiques',
  REPORTS_EXPORT: 'Exporter les rapports',
};

/**
 * Matrice des habilitations par rôle. Les profils ADMIN et DIRECTEUR_USINE
 * disposent de toutes les permissions. Un profil peut en outre être restreint
 * à certains magasins via `User.assignedWarehouseIds`.
 */
export const WAREHOUSE_ROLE_PERMISSIONS: Record<UserRole, WarehousePermission[]> = {
  ADMIN: Object.keys(WAREHOUSE_PERMISSION_LABELS) as WarehousePermission[],
  DIRECTEUR_USINE: Object.keys(WAREHOUSE_PERMISSION_LABELS) as WarehousePermission[],
  RESPONSABLE_PRODUCTION: [
    'WAREHOUSE_VIEW',
    'STOCK_VIEW',
    'TRANSFER_REQUEST',
    'TRANSFER_VALIDATE',
    'TRANSFER_PREPARE',
    'TRANSFER_SHIP',
    'TRANSFER_RECEIVE',
    'RETURN_REQUEST',
    'MOVEMENT_HISTORY_VIEW',
    'REPORTS_EXPORT',
  ],
  RESPONSABLE_QUALITE: [
    'WAREHOUSE_VIEW',
    'STOCK_VIEW',
    'TRANSFER_REQUEST',
    'TRANSFER_VALIDATE',
    'TRANSFER_RECEIVE',
    'TRANSFER_DISCREPANCY_VALIDATE',
    'RETURN_REQUEST',
    'STOCK_REGULARIZE',
    'MOVEMENT_HISTORY_VIEW',
    'REPORTS_EXPORT',
  ],
  MAGASINIER: [
    'WAREHOUSE_VIEW',
    'STOCK_VIEW',
    'TRANSFER_REQUEST',
    'TRANSFER_PREPARE',
    'TRANSFER_SHIP',
    'TRANSFER_RECEIVE',
    'RETURN_REQUEST',
    'MOVEMENT_HISTORY_VIEW',
  ],
  CHEF_DE_LIGNE: [
    'WAREHOUSE_VIEW',
    'STOCK_VIEW',
    'TRANSFER_REQUEST',
    'RETURN_REQUEST',
    'MOVEMENT_HISTORY_VIEW',
  ],
  OPERATEUR: ['WAREHOUSE_VIEW', 'STOCK_VIEW'],
  RESPONSABLE_COMMERCIAL: [
    'WAREHOUSE_VIEW',
    'STOCK_VIEW',
    'MOVEMENT_HISTORY_VIEW',
    'REPORTS_EXPORT',
  ],
  RESPONSABLE_MAINTENANCE: ['WAREHOUSE_VIEW', 'STOCK_VIEW', 'TRANSFER_REQUEST'],
  TECHNICIEN_LABO: ['WAREHOUSE_VIEW', 'STOCK_VIEW', 'MOVEMENT_HISTORY_VIEW'],
  AUDITEUR_EXTERNE: [
    'WAREHOUSE_VIEW',
    'STOCK_VIEW',
    'MOVEMENT_HISTORY_VIEW',
    'REPORTS_EXPORT',
  ],
};

/** Agrégats de stock consolidés d'un article, toutes qualités confondues. */
export interface ConsolidatedStock {
  itemId: string;
  itemCode: string;
  designation: string;
  unit: UnitOfMeasure;
  minStockLevel: number;
  physical: number;
  available: number;
  reserved: number;
  pendingControl: number;
  quarantine: number;
  blocked: number;
  transit: number;
  byWarehouse: Array<{
    warehouseId: string;
    physical: number;
    available: number;
    reserved: number;
    pendingControl: number;
    quarantine: number;
    blocked: number;
  }>;
}

/** Indicateurs consolidés du tableau de bord multi-magasins. */
export interface WarehouseDashboard {
  warehouseCount: number;
  activeWarehouseCount: number;
  locationCount: number;
  physicalStock: number;
  availableStock: number;
  reservedStock: number;
  pendingControl: number;
  quarantine: number;
  blocked: number;
  transit: number;
  activeTransfers: number;
  pendingValidation: number;
  openDiscrepancies: number;
  lowStockItems: Array<{
    itemId: string;
    itemCode: string;
    designation: string;
    unit: UnitOfMeasure;
    available: number;
    minStockLevel: number;
  }>;
  byWarehouse: Array<{
    warehouseId: string;
    code: string;
    designation: string;
    type: WarehouseType;
    physical: number;
    available: number;
    quarantine: number;
    pendingControl: number;
    blocked: number;
    itemCount: number;
    lotCount: number;
  }>;
}

/** Besoin matière d'un ordre de fabrication, confronté au stock disponible réel. */
export interface WorkOrderMaterialRequirement {
  itemId: string;
  itemCode: string;
  designation: string;
  unit: UnitOfMeasure;
  requiredQty: number;
  availableQty: number;
  shortageQty: number;
  sourceWarehouseId?: string;
  sourceWarehouseCode?: string;
  availableLots: Array<{
    lotId: string;
    lotNumber: string;
    warehouseId: string;
    locationId: string;
    quantity: number;
  }>;
}

export interface Equipment {
  id: string;
  code: string;
  name: string;
  line: string;
  type: 'SERTISSEUSE' | 'AUTOCLAVE' | 'PRECUISSEUR' | 'EMBOITEUSE' | 'ETIQUETEUSE' | 'PONCEUSE';
  status: 'OPERATIONNEL' | 'EN_MAINTENANCE' | 'ARRET_INCIDENT' | 'EN_NETTOYAGE';
  lastPreventiveMaintenanceDate: string;
  nextPreventiveMaintenanceDate: string;
  lastCalibrationDate?: string;
  nextCalibrationDate?: string;
  responsibleTechnician: string;
  hygieneClearanceAfterMaintenance: boolean; // Requis ISO 22000
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: AuditAction;
  entity: string;
  entityId: string;
  oldValues?: string;
  newValues?: string;
  motive?: string;
  ipAddress?: string;
}

// ==========================================
// MODULE CONSOMMATIONS RÉELLES, ÉCARTS & RENDEMENTS
// ==========================================

export type ConsumptionStatus =
  | 'BROUILLON'
  | 'EN_COURS'
  | 'EN_ATTENTE_VALIDATION'
  | 'VALIDEE'
  | 'ANNULEE';

export interface ConsumptionLotDetail {
  lotId: string;
  lotNumber: string;
  withdrawnQty: number; // Sortie magasin
  usedQty: number; // Quantité réellement utilisée / incorporée
  returnedQty: number; // Quantité retournée et acceptée au stock
  wasteQty: number; // Quantité perdue ou rebutée
  unit: UnitOfMeasure;
  storageLocation: string;
  lotStatus: 'CONFORME' | 'LIBERE' | 'EN_QUARANTAINE' | 'BLOQUE' | 'REJETE';
  isDerogationAuthorized?: boolean;
  derogationNotes?: string;
  derogationApprovedBy?: string;
}

export interface ConsumptionLine {
  id: string;
  itemId: string;
  itemCode: string;
  designation: string;
  category: 'MATIERE_PREMIERE' | 'INGREDIENT' | 'EMBALLAGE' | 'CONSOMMABLE';
  stepName?: string; // ex: 'Éviscération & Parage', 'Jusquage Huile', 'Sertissage', 'Emballage'
  lots: ConsumptionLotDetail[];
  batchNumber: string; // Numéro de lot principal ou combiné
  storageLocation: string;
  initialTheoreticalQuantity: number; // Besoin théorique initial (production planifiée)
  adjustedTheoreticalQuantity: number; // Besoin théorique ajusté (production réelle retenue)
  actualConsumedQuantity: number; // Consommation réelle nette (utilisé en production)
  withdrawnQuantity: number; // Total sorti du magasin
  returnedQuantity: number; // Total retourné et accepté en stock
  wasteQuantity: number; // Total perdu ou rebuté
  unit: UnitOfMeasure;
  tolerancePercent: number; // Seuil de tolérance issu de la nomenclature (%)
  quantityVariance: number; // Réel - Théorique ajusté
  percentageVariance: number; // (Écart / Théorique ajusté) * 100
  varianceReason?: string; // Pertes de parage, rejet sertissage, dérive dosage, etc.
  responsibleOperator: string;
  isExtraComponent?: boolean; // Ajout hors nomenclature autorisé
  extraComponentJustification?: string;
  isDerogation?: boolean;
  derogationReason?: string;
  derogationApprovedBy?: string;
}

export interface StepConsumptionSummary {
  stepNumber: number;
  stepName: string;
  componentsInvolved: string[];
  totalInputKgOrUnits: number;
  totalOutputKgOrUnits: number;
  stepYieldPercent: number;
  wasteKgOrUnits: number;
  operator: string;
  notes?: string;
}

export interface YieldLossSummary {
  rawFishEngagedKg: number; // Matière première brute engagée
  dressedFishObtainedKg: number; // Matière préparée utile étêtée/éviscérée
  cleaningYieldPercent: number; // Rendement parage (%)
  fishLostWasteKg: number; // Têtes, viscères, abats perdus
  fishRecoverableByProductKg: number; // Sous-produits valorisables (farine)
  oilTheoreticalLitres: number;
  oilActualLitres: number;
  oilLossLitres: number;
  oilLossPercent: number;
  cansInitialEngaged: number;
  cansSeamingRejects: number;
  cansFinishedGoodYieldRate: number; // Boîtes conformes / engagées %
  fishIncorporatedPer1000CansKg: number;
}

export interface ConsumptionRegularization {
  date: string;
  user: string;
  lineId: string;
  itemCode: string;
  oldQty: number;
  newQty: number;
  deltaQty: number;
  reason: string;
}

export interface ConsumptionRecord {
  id: string;
  consumptionNumber: string; // CONS-2026-XXXX
  workOrderId: string;
  workOrderNumber: string; // OF-2026-XXXX
  recipeId: string;
  recipeCode: string;
  recipeVersion: string;
  finishedItemId: string;
  finishedItemCode: string;
  finishedItemName: string;
  finishedBatchNumber: string;
  lineId: string;
  shift: 'EQUIPE_MATIN' | 'EQUIPE_SOIR' | 'EQUIPE_NUIT';
  consumptionDateTime: string;
  recordedBy: string;
  status: ConsumptionStatus;
  cancellationReason?: string;
  cancelledBy?: string;
  cancelledAt?: string;
  validatedBy?: string;
  validatedAt?: string;
  validationNotes?: string;
  plannedQuantityCans: number;
  actualProducedQuantityCans: number;
  conformQuantityCans: number;
  lines: ConsumptionLine[];
  stepConsumptions?: StepConsumptionSummary[];
  yieldLossSummary?: YieldLossSummary;
  notes?: string;
  regularizationHistory?: ConsumptionRegularization[];
}


// ============================================================================
// SERVICE APPROVISIONNEMENT — CYCLE COMPLET DES ACHATS
// Réutilise le référentiel articles (Item), le référentiel fournisseurs
// (Supplier), les magasins, les stocks, les utilisateurs et leurs permissions.
// ============================================================================

/** Services demandeurs configurables. */
export type ProcurementDepartment =
  | 'PRODUCTION'
  | 'MAINTENANCE'
  | 'QUALITE'
  | 'MAGASIN_MP'
  | 'MAGASIN_EMBALLAGES'
  | 'ADMINISTRATION'
  | 'COMMERCIAL'
  | 'AUTRE';

export const PROCUREMENT_DEPARTMENT_LABELS: Record<ProcurementDepartment, string> = {
  PRODUCTION: 'Production',
  MAINTENANCE: 'Maintenance',
  QUALITE: 'Qualité',
  MAGASIN_MP: 'Magasin matières premières',
  MAGASIN_EMBALLAGES: 'Magasin emballages',
  ADMINISTRATION: 'Administration',
  COMMERCIAL: 'Commercial',
  AUTRE: 'Autre service',
};

export type PurchasePriority = 'NORMALE' | 'URGENTE' | 'TRES_URGENTE';

export const PURCHASE_PRIORITY_LABELS: Record<PurchasePriority, string> = {
  NORMALE: 'Normale',
  URGENTE: 'Urgente',
  TRES_URGENTE: 'Très urgente',
};

export type PurchaseRequestType =
  | 'BESOIN_PONCTUEL'
  | 'REAPPROVISIONNEMENT'
  | 'PROJET'
  | 'URGENCE_PRODUCTION';

export const PURCHASE_REQUEST_TYPE_LABELS: Record<PurchaseRequestType, string> = {
  BESOIN_PONCTUEL: 'Besoin ponctuel',
  REAPPROVISIONNEMENT: 'Réapprovisionnement',
  PROJET: 'Projet',
  URGENCE_PRODUCTION: 'Urgence production',
};

export type PurchaseRequestStatus =
  | 'BROUILLON'
  | 'EN_VALIDATION'
  | 'VALIDEE'
  | 'REFUSEE'
  | 'RETOURNEE'
  | 'EN_CONSULTATION'
  | 'COMMANDEE'
  | 'PARTIELLEMENT_COMMANDEE'
  | 'CLOTUREE'
  | 'ANNULEE';

export const PURCHASE_REQUEST_STATUS_LABELS: Record<PurchaseRequestStatus, string> = {
  BROUILLON: 'Brouillon',
  EN_VALIDATION: 'En validation',
  VALIDEE: 'Validée',
  REFUSEE: 'Refusée',
  RETOURNEE: 'Retournée pour correction',
  EN_CONSULTATION: 'En consultation',
  COMMANDEE: 'Commandée',
  PARTIELLEMENT_COMMANDEE: 'Partiellement commandée',
  CLOTUREE: 'Clôturée',
  ANNULEE: 'Annulée',
};

export interface PurchaseRequestLine {
  id: string;
  itemId: string;
  itemCode: string;
  designation: string;
  category: ItemCategory;
  quantity: number;
  unit: UnitOfMeasure;
  /** Conditionnement demandé, si l'achat se fait au fût / carton / palette. */
  packagingQuantity?: number;
  packagingUnit?: UnitOfMeasure;
  /** Stock disponible constaté à la création de la ligne (informationnel, jamais modifié ici). */
  availableQtyAtCreation?: number;
  /** Motif du besoin propre à la ligne. */
  reason?: string;
  desiredDate?: string;
  notes?: string;
  estimatedUnitPriceDzd?: number;
}

export type ApprovalDecisionKind = 'APPROUVE' | 'REFUSE' | 'RETOURNE';

export const APPROVAL_DECISION_LABELS: Record<ApprovalDecisionKind, string> = {
  APPROUVE: 'Approuvée',
  REFUSE: 'Refusée',
  RETOURNE: 'Retournée',
};

/** Étape du circuit de validation, configurable dans les paramètres. */
export interface ApprovalStep {
  id: string;
  order: number;
  label: string;
  /** Profil habilité à statuer sur cette étape. */
  role: UserRole;
  /** Seuils de montant (DZD) : l'étape ne s'applique que dans cette plage. */
  minAmountDzd?: number;
  maxAmountDzd?: number;
}

export interface ApprovalDecision {
  id: string;
  stepIndex: number;
  stepLabel: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  decision: ApprovalDecisionKind;
  comment?: string;
  timestamp: string;
}

export interface PurchaseRequest {
  id: string;
  requestNumber: string;
  createdAt: string;
  createdById: string;
  createdBy: string;
  department: ProcurementDepartment;
  /** Responsable du service demandeur (premier niveau de validation). */
  serviceManager?: string;
  requesterName: string;
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
  estimatedTotalDzd: number;
  status: PurchaseRequestStatus;
  /** Circuit figé à la soumission (les seuils peuvent évoluer ensuite). */
  approvalCircuit: ApprovalStep[];
  currentStepIndex: number;
  approvalHistory: ApprovalDecision[];
  submittedAt?: string;
  decidedAt?: string;
  closedAt?: string;
  cancelReason?: string;
  /** Origine : saisie manuelle ou proposition automatique de réapprovisionnement. */
  source: 'MANUELLE' | 'AUTOMATIQUE';
  linkedWorkOrderId?: string;
}

/** Proposition de réapprovisionnement calculée depuis les seuils de stock réels. */
export interface ReplenishmentProposal {
  itemId: string;
  itemCode: string;
  designation: string;
  category: ItemCategory;
  group?: ItemCategoryGroup;
  unit: UnitOfMeasure;
  available: number;
  minStockLevel: number;
  maxStockLevel?: number;
  /** Stock cible retenu pour le calcul. */
  targetStock: number;
  /** Quantité déjà engagée dans des demandes/commandes non réceptionnées. */
  onOrderQty: number;
  proposedQty: number;
  shortage: number;
  suggestedSupplierId?: string;
  suggestedSupplierName?: string;
  suggestedWarehouseId?: string;
  suggestedWarehouseCode?: string;
  /** Une demande ouverte couvre déjà ce besoin. */
  coveredByRequest?: string;
  reason: string;
}

/** Budget d'approvisionnement par exercice, service et catégorie d'achat. */
export interface ProcurementBudget {
  id: string;
  fiscalYear: number;
  department: ProcurementDepartment;
  /** Groupe d'articles couvert ; absent = toutes catégories du service. */
  categoryGroup?: ItemCategoryGroup;
  amountDzd: number;
  isActive: boolean;
  notes?: string;
  createdAt: string;
  createdBy: string;
}

export interface ProcurementBudgetStatus {
  budget: ProcurementBudget;
  engagedDzd: number;
  availableDzd: number;
  usagePercent: number;
  isExceeded: boolean;
}

export type ProcurementPermission =
  | 'PR_VIEW'
  | 'PR_CREATE'
  | 'PR_EDIT'
  | 'PR_SUBMIT'
  | 'PR_VALIDATE'
  | 'PR_REFUSE'
  | 'PR_CANCEL'
  | 'SUPPLIER_VIEW'
  | 'SUPPLIER_MANAGE'
  | 'BUDGET_VIEW'
  | 'BUDGET_MANAGE'
  | 'PROCUREMENT_REPORTS'
  | 'PROCUREMENT_EXPORT';

export const PROCUREMENT_PERMISSION_LABELS: Record<ProcurementPermission, string> = {
  PR_VIEW: 'Consulter les demandes d\'achat',
  PR_CREATE: 'Créer une demande d\'achat',
  PR_EDIT: 'Modifier une demande d\'achat',
  PR_SUBMIT: 'Soumettre une demande à validation',
  PR_VALIDATE: 'Valider une demande d\'achat',
  PR_REFUSE: 'Refuser / retourner une demande',
  PR_CANCEL: 'Annuler une demande d\'achat',
  SUPPLIER_VIEW: 'Consulter les fournisseurs',
  SUPPLIER_MANAGE: 'Créer et modifier les fournisseurs',
  BUDGET_VIEW: 'Consulter les budgets',
  BUDGET_MANAGE: 'Gérer les budgets',
  PROCUREMENT_REPORTS: 'Consulter les rapports',
  PROCUREMENT_EXPORT: 'Exporter et imprimer',
};

export const PROCUREMENT_ROLE_PERMISSIONS: Record<UserRole, ProcurementPermission[]> = {
  ADMIN: Object.keys(PROCUREMENT_PERMISSION_LABELS) as ProcurementPermission[],
  DIRECTEUR_USINE: Object.keys(PROCUREMENT_PERMISSION_LABELS) as ProcurementPermission[],
  RESPONSABLE_PRODUCTION: [
    'PR_VIEW', 'PR_CREATE', 'PR_EDIT', 'PR_SUBMIT', 'PR_VALIDATE',
    'SUPPLIER_VIEW', 'BUDGET_VIEW', 'PROCUREMENT_REPORTS',
  ],
  RESPONSABLE_QUALITE: [
    'PR_VIEW', 'PR_CREATE', 'PR_EDIT', 'PR_SUBMIT', 'PR_VALIDATE', 'PR_REFUSE',
    'SUPPLIER_VIEW', 'SUPPLIER_MANAGE', 'BUDGET_VIEW', 'PROCUREMENT_REPORTS',
  ],
  RESPONSABLE_MAINTENANCE: [
    'PR_VIEW', 'PR_CREATE', 'PR_EDIT', 'PR_SUBMIT', 'SUPPLIER_VIEW', 'BUDGET_VIEW',
  ],
  RESPONSABLE_COMMERCIAL: ['PR_VIEW', 'PR_CREATE', 'PR_SUBMIT', 'SUPPLIER_VIEW', 'BUDGET_VIEW'],
  MAGASINIER: ['PR_VIEW', 'PR_CREATE', 'PR_EDIT', 'PR_SUBMIT', 'SUPPLIER_VIEW', 'BUDGET_VIEW'],
  CHEF_DE_LIGNE: ['PR_VIEW', 'PR_CREATE', 'PR_SUBMIT'],
  OPERATEUR: ['PR_VIEW'],
  TECHNICIEN_LABO: ['PR_VIEW', 'PR_CREATE', 'SUPPLIER_VIEW'],
  AUDITEUR_EXTERNE: ['PR_VIEW', 'SUPPLIER_VIEW', 'BUDGET_VIEW', 'PROCUREMENT_REPORTS'],
};

/** Paramètres généraux du module. */
export interface ProcurementSettings {
  currency: string;
  /** Circuit multi-niveaux : service demandeur → approvisionnement → direction. */
  approvalSteps: ApprovalStep[];
  /** Multiplicateur appliqué au stock minimum pour calculer le stock cible. */
  targetStockMultiplier: number;
  defaultPaymentTermsDays: number;
  defaultLeadTimeDays: number;
  /** Réception placée en attente de contrôle qualité par défaut. */
  qualityHoldByDefault: boolean;
  /** Tolérance d'excédent de réception en pourcentage. */
  maxOverReceptionPercent: number;
  updatedAt?: string;
  updatedBy?: string;
}

/** Indicateurs du tableau de bord, tous calculés sur les données réelles. */
export interface ProcurementDashboard {
  pendingRequests: number;
  urgentRequests: number;
  validatedNotOrdered: number;
  totalRequests: number;
  budgetTotalDzd: number;
  budgetEngagedDzd: number;
  budgetAvailableDzd: number;
  lowStockItems: number;
  replenishmentProposals: number;
  byStatus: Array<{ status: PurchaseRequestStatus; count: number }>;
  byDepartment: Array<{ department: ProcurementDepartment; count: number; amountDzd: number }>;
  byPriority: Array<{ priority: PurchasePriority; count: number }>;
  topSuppliers: Array<{ supplierId: string; supplierName: string; amountDzd: number }>;
}

/* ══════════════════════════════════════════════════════════════════════════
   CYCLE AVAL DE L'ACHAT : CONSULTATION → COMMANDE → RÉCEPTION → ÉVALUATION
   ══════════════════════════════════════════════════════════════════════════ */

export type ConsultationStatus = 'OUVERTE' | 'CLOTUREE' | 'ATTRIBUEE' | 'ANNULEE';

export const CONSULTATION_STATUS_LABELS: Record<ConsultationStatus, string> = {
  OUVERTE: 'Ouverte',
  CLOTUREE: 'Clôturée',
  ATTRIBUEE: 'Attribuée',
  ANNULEE: 'Annulée',
};

/** Ligne d'offre fournisseur, exprimée dans l'unité de l'article du référentiel. */
export interface SupplierQuoteLine {
  itemId: string;
  itemCode: string;
  designation: string;
  quantity: number;
  unit: UnitOfMeasure;
  unitPriceDzd: number;
  discountPercent?: number;
  lineTotalDzd: number;
  leadTimeDays?: number;
  observations?: string;
}

/** Offre reçue d'un fournisseur consulté. */
export interface SupplierQuote {
  id: string;
  supplierId: string;
  supplierName: string;
  receivedAt: string;
  validUntil?: string;
  currency: string;
  lines: SupplierQuoteLine[];
  totalDzd: number;
  /** Délai global annoncé (jours ouvrés). */
  leadTimeDays: number;
  paymentTermsDays?: number;
  incoterm?: string;
  documents?: string[];
  /** Offre déclarée non conforme : exclue du comparatif automatique. */
  isCompliant: boolean;
  nonComplianceReason?: string;
  observations?: string;
  createdBy: string;
}

/** Consultation fournisseurs rattachée à une demande d'achat validée. */
export interface SupplierConsultation {
  id: string;
  consultationNumber: string;
  requestId: string;
  requestNumber: string;
  createdAt: string;
  createdBy: string;
  /** Date limite de remise des offres. */
  deadline: string;
  invitedSupplierIds: string[];
  status: ConsultationStatus;
  quotes: SupplierQuote[];
  awardedQuoteId?: string;
  awardedSupplierId?: string;
  awardedSupplierName?: string;
  awardJustification?: string;
  awardedAt?: string;
  awardedBy?: string;
  closedAt?: string;
  observations?: string;
}

export type PurchaseOrderStatus =
  | 'BROUILLON'
  | 'EMISE'
  | 'CONFIRMEE'
  | 'PARTIELLEMENT_RECUE'
  | 'RECUE'
  | 'CLOTUREE'
  | 'ANNULEE';

export const PURCHASE_ORDER_STATUS_LABELS: Record<PurchaseOrderStatus, string> = {
  BROUILLON: 'Brouillon',
  EMISE: 'Émise',
  CONFIRMEE: 'Confirmée',
  PARTIELLEMENT_RECUE: 'Partiellement reçue',
  RECUE: 'Reçue',
  CLOTUREE: 'Clôturée',
  ANNULEE: 'Annulée',
};

export interface PurchaseOrderLine {
  id: string;
  itemId: string;
  itemCode: string;
  designation: string;
  quantityOrdered: number;
  quantityReceived: number;
  unit: UnitOfMeasure;
  unitPriceDzd: number;
  lineTotalDzd: number;
  packaging?: string;
  quantityPerPackaging?: number;
  requestLineId?: string;
}

export interface PurchaseOrder {
  id: string;
  orderNumber: string;
  supplierId: string;
  supplierName: string;
  requestId?: string;
  requestNumber?: string;
  consultationId?: string;
  createdAt: string;
  createdBy: string;
  orderDate: string;
  expectedDate: string;
  status: PurchaseOrderStatus;
  lines: PurchaseOrderLine[];
  totalDzd: number;
  currency: string;
  paymentTermsDays: number;
  deliveryWarehouseId?: string;
  incoterm?: string;
  observations?: string;
  confirmedAt?: string;
  closedAt?: string;
  cancelReason?: string;
}

export type ReceiptQualityStatus = 'EN_ATTENTE' | 'ACCEPTEE' | 'ACCEPTEE_PARTIELLE' | 'REFUSEE';

export const RECEIPT_QUALITY_STATUS_LABELS: Record<ReceiptQualityStatus, string> = {
  EN_ATTENTE: 'En attente de contrôle',
  ACCEPTEE: 'Acceptée',
  ACCEPTEE_PARTIELLE: 'Acceptée partiellement',
  REFUSEE: 'Refusée',
};

export interface PurchaseReceiptLine {
  orderLineId: string;
  itemId: string;
  itemCode: string;
  designation: string;
  quantityOrdered: number;
  quantityReceived: number;
  quantityAccepted: number;
  quantityRejected: number;
  unit: UnitOfMeasure;
  lotNumber: string;
  expiryDate?: string;
  locationId?: string;
  nonConformityReason?: string;
}

/** Réception d'une commande d'achat, avec contrôle qualité et mouvements de stock. */
export interface PurchaseReceipt {
  id: string;
  receiptNumber: string;
  orderId: string;
  orderNumber: string;
  supplierId: string;
  supplierName: string;
  receivedAt: string;
  receivedBy: string;
  deliveryNoteNumber?: string;
  warehouseId: string;
  lines: PurchaseReceiptLine[];
  qualityStatus: ReceiptQualityStatus;
  qualityControlledBy?: string;
  qualityControlledAt?: string;
  qualityNotes?: string;
  /** Réception bloquée : le stock est créé mais non disponible à la production. */
  isOnHold: boolean;
  stockMovementsCreated: boolean;
  observations?: string;
}

export type SupplierContractStatus = 'ACTIF' | 'EXPIRE' | 'SUSPENDU' | 'RESILIE';

export const SUPPLIER_CONTRACT_STATUS_LABELS: Record<SupplierContractStatus, string> = {
  ACTIF: 'Actif',
  EXPIRE: 'Expiré',
  SUSPENDU: 'Suspendu',
  RESILIE: 'Résilié',
};

export interface SupplierContract {
  id: string;
  reference: string;
  supplierId: string;
  supplierName: string;
  object: string;
  startDate: string;
  endDate: string;
  status: SupplierContractStatus;
  amountDzd?: number;
  paymentTermsDays?: number;
  currency: string;
  /** Groupes d'articles couverts par le contrat. */
  categoryGroups?: ItemCategoryGroup[];
  documents?: string[];
  notes?: string;
  createdAt: string;
  createdBy: string;
}

/** Évaluation fournisseur : entièrement calculée, jamais saisie manuellement. */
export interface SupplierEvaluation {
  supplierId: string;
  supplierName: string;
  ordersCount: number;
  receiptsCount: number;
  totalPurchasedDzd: number;
  /** Taux de livraison à temps (%). */
  onTimeRate: number;
  /** Taux de conformité quantitative (%). */
  quantityComplianceRate: number;
  /** Taux de conformité qualité (%). */
  qualityComplianceRate: number;
  /** Délai moyen réel constaté (jours). */
  averageLeadTimeDays: number;
  /** Délai moyen annoncé (jours). */
  averagePromisedLeadTimeDays: number;
  /** Note globale pondérée sur 100. */
  overallScore: number;
  grade: 'A' | 'B' | 'C' | 'D';
  lastOrderDate?: string;
  trend: Array<{ period: string; score: number }>;
}

// ============================================================================
// GDS — GESTION DES STOCKS (MATIÈRES PREMIÈRES & PRODUITS FINIS)
// Couche opérationnelle au-dessus du moteur de stock unique : aucun second
// référentiel d'articles, aucun second registre de mouvements.
// ============================================================================

/** Périmètre fonctionnel du GDS. */
export type GdsScope = 'MATIERES_PREMIERES' | 'PRODUITS_FINIS';

export const GDS_SCOPE_LABELS: Record<GdsScope, string> = {
  MATIERES_PREMIERES: 'Matières premières',
  PRODUITS_FINIS: 'Produits finis',
};

export type GdsPermission =
  | 'GDS_VIEW_MP'
  | 'GDS_RECEIVE_MP'
  | 'GDS_ISSUE_MP'
  | 'GDS_VALIDATE_TRANSFER'
  | 'GDS_RECORD_CONSUMPTION'
  | 'GDS_RECEIVE_FP'
  | 'GDS_RELEASE_FP'
  | 'GDS_ISSUE_FP'
  | 'GDS_INVENTORY'
  | 'GDS_VALIDATE_ADJUSTMENT'
  | 'GDS_VIEW_REPORTS';

export const GDS_PERMISSION_LABELS: Record<GdsPermission, string> = {
  GDS_VIEW_MP: 'Consulter les matières premières',
  GDS_RECEIVE_MP: 'Réceptionner les matières premières',
  GDS_ISSUE_MP: 'Sortir les matières premières',
  GDS_VALIDATE_TRANSFER: 'Valider les transferts',
  GDS_RECORD_CONSUMPTION: 'Enregistrer les consommations',
  GDS_RECEIVE_FP: 'Réceptionner les produits finis',
  GDS_RELEASE_FP: 'Libérer les produits finis (qualité)',
  GDS_ISSUE_FP: 'Sortir les produits finis',
  GDS_INVENTORY: 'Effectuer les inventaires',
  GDS_VALIDATE_ADJUSTMENT: 'Valider les ajustements',
  GDS_VIEW_REPORTS: 'Consulter les rapports',
};

/**
 * Matrice des habilitations GDS. Les profils ADMIN et DIRECTEUR_USINE disposent
 * de toutes les permissions. La libération PF reste en outre soumise au rôle
 * qualité dans `releaseFinishedBatch` (double contrôle).
 */
export const GDS_ROLE_PERMISSIONS: Record<UserRole, GdsPermission[]> = {
  ADMIN: Object.keys(GDS_PERMISSION_LABELS) as GdsPermission[],
  DIRECTEUR_USINE: Object.keys(GDS_PERMISSION_LABELS) as GdsPermission[],
  RESPONSABLE_PRODUCTION: [
    'GDS_VIEW_MP',
    'GDS_ISSUE_MP',
    'GDS_VALIDATE_TRANSFER',
    'GDS_RECORD_CONSUMPTION',
    'GDS_RECEIVE_FP',
    'GDS_ISSUE_FP',
    'GDS_INVENTORY',
    'GDS_VIEW_REPORTS',
  ],
  RESPONSABLE_QUALITE: [
    'GDS_VIEW_MP',
    'GDS_RELEASE_FP',
    'GDS_VALIDATE_TRANSFER',
    'GDS_INVENTORY',
    'GDS_VALIDATE_ADJUSTMENT',
    'GDS_VIEW_REPORTS',
  ],
  MAGASINIER: [
    'GDS_VIEW_MP',
    'GDS_RECEIVE_MP',
    'GDS_ISSUE_MP',
    'GDS_RECEIVE_FP',
    'GDS_ISSUE_FP',
    'GDS_INVENTORY',
    'GDS_VIEW_REPORTS',
  ],
  CHEF_DE_LIGNE: ['GDS_VIEW_MP', 'GDS_ISSUE_MP', 'GDS_RECORD_CONSUMPTION'],
  OPERATEUR: ['GDS_VIEW_MP'],
  RESPONSABLE_COMMERCIAL: ['GDS_VIEW_MP', 'GDS_ISSUE_FP', 'GDS_VIEW_REPORTS'],
  RESPONSABLE_MAINTENANCE: ['GDS_VIEW_MP'],
  TECHNICIEN_LABO: ['GDS_VIEW_MP', 'GDS_VIEW_REPORTS'],
  AUDITEUR_EXTERNE: ['GDS_VIEW_MP', 'GDS_VIEW_REPORTS'],
};

// ---------------------------------------------------------------------------
// USER MANAGER — Permissions du module de gestion des utilisateurs et rôles
// ---------------------------------------------------------------------------
export type UserManagerPermission =
  | 'USER_MANAGER_VIEW'
  | 'USER_MANAGER_CREATE'
  | 'USER_MANAGER_EDIT'
  | 'USER_MANAGER_DELETE'
  | 'USER_MANAGER_MANAGE_ROLES'
  | 'USER_MANAGER_MANAGE_PERMISSIONS'
  | 'USER_MANAGER_VIEW_AUDIT';

export const USER_MANAGER_PERMISSION_LABELS: Record<UserManagerPermission, string> = {
  USER_MANAGER_VIEW: 'Consulter les utilisateurs',
  USER_MANAGER_CREATE: 'Créer des utilisateurs',
  USER_MANAGER_EDIT: 'Modifier des utilisateurs',
  USER_MANAGER_DELETE: 'Désactiver des utilisateurs',
  USER_MANAGER_MANAGE_ROLES: 'Gérer les rôles',
  USER_MANAGER_MANAGE_PERMISSIONS: 'Gérer les permissions',
  USER_MANAGER_VIEW_AUDIT: 'Consulter l\'audit de sécurité',
};

export const USER_MANAGER_ROLE_PERMISSIONS: Record<UserRole, UserManagerPermission[]> = {
  ADMIN: Object.keys(USER_MANAGER_PERMISSION_LABELS) as UserManagerPermission[],
  DIRECTEUR_USINE: Object.keys(USER_MANAGER_PERMISSION_LABELS) as UserManagerPermission[],
  RESPONSABLE_PRODUCTION: [],
  RESPONSABLE_QUALITE: [],
  CHEF_DE_LIGNE: [],
  OPERATEUR: [],
  MAGASINIER: [],
  RESPONSABLE_COMMERCIAL: [],
  RESPONSABLE_MAINTENANCE: [],
  TECHNICIEN_LABO: [],
  AUDITEUR_EXTERNE: ['USER_MANAGER_VIEW_AUDIT'],
};

// ---------------------------------------------------------------------------
// SÉCURITÉ & SAUVEGARDES — Journal d'audit, exports et opérations destructives
// ---------------------------------------------------------------------------
export type AuditPermission =
  | 'AUDIT_VIEW'
  | 'BACKUP_EXPORT'
  | 'BACKUP_IMPORT'
  | 'DATABASE_RESET'
  | 'SQL_DUMP_EXPORT';

export const AUDIT_PERMISSION_LABELS: Record<AuditPermission, string> = {
  AUDIT_VIEW: 'Consulter le journal d\'audit',
  BACKUP_EXPORT: 'Exporter une sauvegarde JSON',
  BACKUP_IMPORT: 'Restaurer une sauvegarde JSON',
  DATABASE_RESET: 'Réinitialiser la base à zéro',
  SQL_DUMP_EXPORT: 'Exporter le script SQL PostgreSQL',
};

/**
 * La restauration et la réinitialisation écrasent l'intégralité des données : elles
 * restent réservées à l'administrateur. L'auditabilité ISO 22000 § 7.5 donne en
 * revanche la consultation du journal à la qualité, à la production et à l'auditeur.
 */
export const AUDIT_ROLE_PERMISSIONS: Record<UserRole, AuditPermission[]> = {
  ADMIN: Object.keys(AUDIT_PERMISSION_LABELS) as AuditPermission[],
  DIRECTEUR_USINE: ['AUDIT_VIEW', 'BACKUP_EXPORT', 'SQL_DUMP_EXPORT'],
  RESPONSABLE_PRODUCTION: ['AUDIT_VIEW'],
  RESPONSABLE_QUALITE: ['AUDIT_VIEW', 'BACKUP_EXPORT'],
  CHEF_DE_LIGNE: [],
  OPERATEUR: [],
  MAGASINIER: [],
  RESPONSABLE_COMMERCIAL: [],
  RESPONSABLE_MAINTENANCE: [],
  TECHNICIEN_LABO: [],
  AUDITEUR_EXTERNE: ['AUDIT_VIEW'],
};

// ---------------------------------------------------------------------------
// MAMORA BI — Permissions du module Business Intelligence
// ---------------------------------------------------------------------------
export type BiPermission =
  | 'BI_VIEW'
  | 'BI_DASHBOARD_VIEW'
  | 'BI_DASHBOARD_CREATE'
  | 'BI_DASHBOARD_EDIT'
  | 'BI_DASHBOARD_DELETE'
  | 'BI_EXPLORE'
  | 'BI_KPI_CREATE'
  | 'BI_KPI_EDIT'
  | 'BI_REPORT_CREATE'
  | 'BI_EXPORT'
  | 'BI_SHARE'
  | 'BI_AI_USE'
  | 'BI_ADMIN';

export const BI_PERMISSION_LABELS: Record<BiPermission, string> = {
  BI_VIEW: 'Consulter MAMORA BI',
  BI_DASHBOARD_VIEW: 'Consulter les tableaux de bord',
  BI_DASHBOARD_CREATE: 'Créer des tableaux de bord',
  BI_DASHBOARD_EDIT: 'Modifier des tableaux de bord',
  BI_DASHBOARD_DELETE: 'Supprimer des tableaux de bord',
  BI_EXPLORE: 'Explorer les données',
  BI_KPI_CREATE: 'Créer des KPI',
  BI_KPI_EDIT: 'Modifier des KPI',
  BI_REPORT_CREATE: 'Créer des rapports',
  BI_EXPORT: 'Exporter des données',
  BI_SHARE: 'Partager des rapports et dashboards',
  BI_AI_USE: 'Utiliser MAMORA AI Analyst',
  BI_ADMIN: 'Administrer MAMORA BI',
};

/**
 * Matrice des habilitations BI. Les profils ADMIN et DIRECTEUR_USINE disposent
 * de tous les droits. Les autres profils combinent consultation, exploration et
 * création selon leur périmètre métier. Le périmètre magasin/service est appliqué
 * en plus de ces permissions par le moteur analytique.
 */
export const BI_ROLE_PERMISSIONS: Record<UserRole, BiPermission[]> = {
  ADMIN: Object.keys(BI_PERMISSION_LABELS) as BiPermission[],
  DIRECTEUR_USINE: Object.keys(BI_PERMISSION_LABELS) as BiPermission[],
  RESPONSABLE_PRODUCTION: [
    'BI_VIEW', 'BI_DASHBOARD_VIEW', 'BI_DASHBOARD_CREATE', 'BI_DASHBOARD_EDIT',
    'BI_EXPLORE', 'BI_KPI_CREATE', 'BI_KPI_EDIT', 'BI_REPORT_CREATE',
    'BI_EXPORT', 'BI_SHARE', 'BI_AI_USE',
  ],
  RESPONSABLE_QUALITE: [
    'BI_VIEW', 'BI_DASHBOARD_VIEW', 'BI_DASHBOARD_CREATE', 'BI_DASHBOARD_EDIT',
    'BI_EXPLORE', 'BI_KPI_CREATE', 'BI_KPI_EDIT', 'BI_REPORT_CREATE',
    'BI_EXPORT', 'BI_SHARE', 'BI_AI_USE',
  ],
  RESPONSABLE_COMMERCIAL: [
    'BI_VIEW', 'BI_DASHBOARD_VIEW', 'BI_EXPLORE', 'BI_REPORT_CREATE',
    'BI_EXPORT', 'BI_SHARE', 'BI_AI_USE',
  ],
  MAGASINIER: ['BI_VIEW', 'BI_DASHBOARD_VIEW', 'BI_EXPLORE'],
  CHEF_DE_LIGNE: ['BI_VIEW', 'BI_DASHBOARD_VIEW', 'BI_EXPLORE'],
  OPERATEUR: ['BI_VIEW', 'BI_DASHBOARD_VIEW'],
  TECHNICIEN_LABO: ['BI_VIEW', 'BI_DASHBOARD_VIEW', 'BI_EXPLORE', 'BI_EXPORT'],
  RESPONSABLE_MAINTENANCE: ['BI_VIEW', 'BI_DASHBOARD_VIEW', 'BI_EXPLORE'],
  AUDITEUR_EXTERNE: ['BI_VIEW', 'BI_DASHBOARD_VIEW', 'BI_EXPLORE', 'BI_EXPORT'],
};

/**
 * Familles de permissions configurables : source unique utilisée par le module
 * User Manager (affichage/grant) et par l'initialisation des rôles.
 */
export const PERMISSION_FAMILIES: Array<{
  key: string;
  label: string;
  permissions: Record<string, string>;
  matrix: Record<UserRole, string[]>;
}> = [
  { key: 'ITEM', label: 'Matières premières & Articles', permissions: ITEM_PERMISSION_LABELS, matrix: ITEM_ROLE_PERMISSIONS },
  { key: 'WAREHOUSE', label: 'Entrepôts & Stocks', permissions: WAREHOUSE_PERMISSION_LABELS, matrix: WAREHOUSE_ROLE_PERMISSIONS },
  { key: 'PROCUREMENT', label: 'Approvisionnement', permissions: PROCUREMENT_PERMISSION_LABELS, matrix: PROCUREMENT_ROLE_PERMISSIONS },
  { key: 'GDS', label: 'Gestion des stocks (GDS)', permissions: GDS_PERMISSION_LABELS, matrix: GDS_ROLE_PERMISSIONS },
  { key: 'USER_MANAGER', label: 'User Manager', permissions: USER_MANAGER_PERMISSION_LABELS, matrix: USER_MANAGER_ROLE_PERMISSIONS },
  { key: 'AUDIT', label: 'Sécurité, audit & sauvegardes', permissions: AUDIT_PERMISSION_LABELS, matrix: AUDIT_ROLE_PERMISSIONS },
  { key: 'BI', label: 'MAMORA BI — Business Intelligence', permissions: BI_PERMISSION_LABELS, matrix: BI_ROLE_PERMISSIONS },
];

// ---------------------------------------------------------------------------
// INVENTAIRES & AJUSTEMENTS
// ---------------------------------------------------------------------------

export type InventoryType = 'GENERAL' | 'MAGASIN' | 'EMPLACEMENT' | 'ARTICLE' | 'LOT' | 'TOURNANT';

export const INVENTORY_TYPE_LABELS: Record<InventoryType, string> = {
  GENERAL: 'Inventaire général',
  MAGASIN: 'Inventaire par magasin',
  EMPLACEMENT: 'Inventaire par emplacement',
  ARTICLE: 'Inventaire par article',
  LOT: 'Inventaire par lot',
  TOURNANT: 'Inventaire tournant',
};

export type InventoryStatus = 'BROUILLON' | 'EN_COMPTAGE' | 'EN_VALIDATION' | 'VALIDE' | 'ANNULE';

export const INVENTORY_STATUS_LABELS: Record<InventoryStatus, string> = {
  BROUILLON: 'Brouillon',
  EN_COMPTAGE: 'En comptage',
  EN_VALIDATION: 'En attente de validation',
  VALIDE: 'Validé',
  ANNULE: 'Annulé',
};

export interface InventoryLine {
  id: string;
  itemId: string;
  itemCode: string;
  designation: string;
  lotId: string;
  lotNumber: string;
  warehouseId: string;
  warehouseCode: string;
  locationId: string;
  locationCode: string;
  qualityStatus: StockQualityStatus;
  unit: UnitOfMeasure;
  /** Stock théorique figé à l'ouverture de l'inventaire. */
  theoreticalQty: number;
  /** Quantité physiquement comptée (absente tant que non comptée). */
  countedQty?: number;
  /** Écart = compté − théorique (négatif = manquant). */
  gapQty?: number;
  /** Justification obligatoire dès qu'un écart existe. */
  justification?: string;
  /** Mouvement d'ajustement généré à la validation. */
  adjustmentMovementId?: string;
  countedBy?: string;
  countedAt?: string;
}

export interface StockInventory {
  id: string;
  inventoryNumber: string;
  scope: GdsScope;
  type: InventoryType;
  status: InventoryStatus;
  warehouseId?: string;
  locationId?: string;
  itemId?: string;
  lotId?: string;
  createdBy: string;
  createdAt: string;
  countedBy?: string;
  countedAt?: string;
  submittedBy?: string;
  submittedAt?: string;
  validatedBy?: string;
  validatedAt?: string;
  cancelledBy?: string;
  cancelledAt?: string;
  cancelReason?: string;
  lines: InventoryLine[];
  notes?: string;
}

// ---------------------------------------------------------------------------
// SORTIES DE PRODUITS FINIS (hors circuit commercial)
// ---------------------------------------------------------------------------

export type FinishedGoodsIssueMotive =
  | 'LIVRAISON_CLIENT'
  | 'ECHANTILLON'
  | 'DESTRUCTION'
  | 'RETOUR_FOURNISSEUR'
  | 'TRANSFERT'
  | 'AUTRE';

export const FINISHED_GOODS_ISSUE_MOTIVE_LABELS: Record<FinishedGoodsIssueMotive, string> = {
  LIVRAISON_CLIENT: 'Livraison client',
  ECHANTILLON: 'Échantillon / promotion',
  DESTRUCTION: 'Destruction / rebut',
  RETOUR_FOURNISSEUR: 'Retour fournisseur',
  TRANSFERT: 'Transfert vers un autre site',
  AUTRE: 'Autre motif',
};

export type FinishedGoodsIssueStatus =
  | 'BROUILLON'
  | 'EN_PREPARATION'
  | 'CONTROLE'
  | 'VALIDE'
  | 'ANNULE';

export const FINISHED_GOODS_ISSUE_STATUS_LABELS: Record<FinishedGoodsIssueStatus, string> = {
  BROUILLON: 'Brouillon',
  EN_PREPARATION: 'En préparation',
  CONTROLE: 'En contrôle',
  VALIDE: 'Validée / sortie',
  ANNULE: 'Annulée',
};

export interface FinishedGoodsIssueLine {
  id: string;
  itemId: string;
  itemCode: string;
  designation: string;
  lotId: string;
  lotNumber: string;
  quantity: number;
  unit: UnitOfMeasure;
  cartons?: number;
  pallets?: number;
  /** Quantité effectivement préparée puis sortie (sorties partielles). */
  preparedQty?: number;
  shippedQty?: number;
  observations?: string;
}

export interface FinishedGoodsIssue {
  id: string;
  issueNumber: string;
  date: string;
  motive: FinishedGoodsIssueMotive;
  status: FinishedGoodsIssueStatus;
  scope: GdsScope;
  destination: string;
  /** Type de destination choisi dans la liste configurée (paramètres GDS). */
  destinationType?: string;
  warehouseId?: string;
  lines: FinishedGoodsIssueLine[];
  preparedBy?: string;
  preparedAt?: string;
  controlledBy?: string;
  controlledAt?: string;
  validatedBy?: string;
  validatedAt?: string;
  cancelledBy?: string;
  cancelledAt?: string;
  cancelReason?: string;
  documentRef?: string;
  observations?: string;
  createdBy: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// PARAMÈTRES GDS
// ---------------------------------------------------------------------------

export interface GdsSettings {
  /** Seuil d'alerte avant péremption (jours). */
  expiryAlertDays: number;
  /** Seuil de surstock exprimé en multiple du stock maximum de l'article. */
  overstockMultiplier: number;
  /** Nombre de jours au-delà duquel un transfert en transit est signalé. */
  transitAlertDays: number;
  /** Tolérance d'écart d'inventaire acceptée sans justification (%). */
  inventoryTolerancePercent: number;
  /** Réception PF placée systématiquement en attente de libération qualité. */
  requireQualityReleaseOnFinishedReceipt: boolean;
  /** Interdire toute sortie PF d'un lot non libéré. */
  blockUnreleasedFinishedGoodsIssue: boolean;
  /**
   * Types de destination autorisés pour les sorties physiques de produits finis.
   * Liste configurable par l'administration : aucune valeur n'est imposée par le code.
   */
  issueDestinationTypes: string[];
  /** Magasin de production proposé par défaut pour les dotations atelier. */
  defaultProductionWarehouseId?: string;
  /** Magasin de quarantaine proposé par défaut. */
  quarantineWarehouseId?: string;
}

export const DEFAULT_GDS_SETTINGS: GdsSettings = {
  expiryAlertDays: 45,
  overstockMultiplier: 1.5,
  transitAlertDays: 3,
  inventoryTolerancePercent: 1,
  requireQualityReleaseOnFinishedReceipt: true,
  blockUnreleasedFinishedGoodsIssue: true,
  issueDestinationTypes: [
    'Service interne',
    'Autre site',
    'Partenaire',
    'Échantillon',
    'Don',
    'Autre',
  ],
};

// ---------------------------------------------------------------------------
// ALERTES
// ---------------------------------------------------------------------------

export type GdsAlertKind =
  | 'RUPTURE'
  | 'SOUS_MINIMUM'
  | 'PEREMPTION_PROCHE'
  | 'PERIME'
  | 'QUARANTAINE'
  | 'EN_ATTENTE_CONTROLE'
  | 'BLOQUE'
  | 'SURSTOCK'
  | 'TRANSIT_LONG'
  | 'ATTENTE_LIBERATION';

export const GDS_ALERT_LABELS: Record<GdsAlertKind, string> = {
  RUPTURE: 'Rupture de stock',
  SOUS_MINIMUM: 'Sous le stock minimum',
  PEREMPTION_PROCHE: 'Péremption proche',
  PERIME: 'Lot périmé',
  QUARANTAINE: 'Lot en quarantaine',
  EN_ATTENTE_CONTROLE: 'En attente de contrôle',
  BLOQUE: 'Stock bloqué',
  SURSTOCK: 'Surstock',
  TRANSIT_LONG: 'Transfert en transit prolongé',
  ATTENTE_LIBERATION: 'Produit fini en attente de libération',
};

export type GdsAlertSeverity = 'INFO' | 'AVERTISSEMENT' | 'CRITIQUE';

export interface GdsAlert {
  id: string;
  kind: GdsAlertKind;
  severity: GdsAlertSeverity;
  scope: GdsScope;
  itemId: string;
  itemCode: string;
  designation: string;
  unit: UnitOfMeasure;
  quantity: number;
  lotNumber?: string;
  warehouseCode?: string;
  warehouseId?: string;
  message: string;
  dueDate?: string;
  daysRemaining?: number;
}

// ---------------------------------------------------------------------------
// TABLEAUX DE BORD & RAPPORTS
// ---------------------------------------------------------------------------

export interface GdsFamilyBreakdown {
  /** Famille réellement utilisée pour le regroupement (famille MP ou catégorie PF). */
  group: string;
  label: string;
  itemCount: number;
  physical: number;
  available: number;
  belowMin: number;
}

export interface GdsWarehouseBreakdown {
  warehouseId: string;
  code: string;
  designation: string;
  type: WarehouseType;
  physical: number;
  available: number;
  pendingControl: number;
  quarantine: number;
  blocked: number;
  itemCount: number;
  lotCount: number;
}

export interface GdsDashboard {
  scope: GdsScope;
  itemCount: number;
  lotCount: number;
  physical: number;
  available: number;
  reserved: number;
  pendingControl: number;
  quarantine: number;
  blocked: number;
  transit: number;
  belowMin: number;
  outOfStock: number;
  expiringSoon: number;
  expired: number;
  pendingTransfers: number;
  pendingReleases: number;
  entries30d: number;
  exits30d: number;
  byFamily: GdsFamilyBreakdown[];
  byWarehouse: GdsWarehouseBreakdown[];
  monthly: Array<{ period: string; entries: number; exits: number }>;
  topMoved: Array<{ itemCode: string; designation: string; quantity: number; unit: UnitOfMeasure }>;
}

export interface GdsStockRow {
  itemId: string;
  itemCode: string;
  designation: string;
  group: ItemCategoryGroup;
  category: ItemCategory;
  unit: UnitOfMeasure;
  secondaryUnit?: UnitOfMeasure;
  conversionCoefficient?: number;
  packaging?: string;
  physical: number;
  available: number;
  reserved: number;
  pendingControl: number;
  quarantine: number;
  blocked: number;
  transit: number;
  minStockLevel: number;
  maxStockLevel?: number;
  isActive: boolean;
  warehouses: Array<{
    warehouseId: string;
    code: string;
    designation: string;
    locationCode?: string;
    quantity: number;
    available: number;
  }>;
  lotCount: number;
}

/** Rapprochement sortie atelier / consommation réelle / retour pour un OF. */
export interface WorkOrderIssueReconciliation {
  workOrderId: string;
  orderNumber: string;
  itemId: string;
  itemCode: string;
  designation: string;
  unit: UnitOfMeasure;
  issuedQty: number;
  consumedQty: number;
  returnedQty: number;
  /** Sorti non encore justifié par une consommation ou un retour. */
  outstandingQty: number;
  consumptionNumbers: string[];
}

/** Traçabilité bidirectionnelle d'un lot, construite sur les liens réellement enregistrés. */
export interface LotTraceability {
  lotId: string;
  lotNumber: string;
  itemId: string;
  itemCode: string;
  designation: string;
  scope: GdsScope;
  qualityStatus: StockQualityStatus;
  expiryDate?: string;
  remainingQty: number;
  unit: UnitOfMeasure;
  warehouses: Array<{ code: string; designation: string; quantity: number; qualityStatus: StockQualityStatus }>;
  /** Amont : d'où vient le lot (fournisseur, réception, OF pour un PF). */
  upstream: {
    supplierName?: string;
    receptionNumber?: string;
    receptionDate?: string;
    supplierLotNumber?: string;
    workOrderNumber?: string;
    finishedBatchNumber?: string;
    productionDate?: string;
  };
  /** Aval MP : OF et lots finis fabriqués avec ce lot. */
  workOrders: Array<{
    workOrderId: string;
    orderNumber: string;
    productName: string;
    quantityUsed: number;
    unit: UnitOfMeasure;
    finishedBatches: Array<{ batchNumber: string; conformingCans: number; releaseStatus: BatchReleaseStatus }>;
  }>;
  /** Aval PF : clients et BL servis. */
  deliveries: Array<{ deliveryNumber: string; customerName: string; date: string; cans: number }>;
  /** Amont PF : matières réellement consommées (lots). */
  consumedMaterials: Array<{
    itemId: string;
    itemCode: string;
    designation: string;
    lotNumber: string;
    quantity: number;
    unit: UnitOfMeasure;
    consumptionNumber: string;
  }>;
  movements: StockMovement[];
}

export interface GdsReport {
  year: number;
  monthly: Array<{
    period: string;
    mpEntries: number;
    mpExits: number;
    fgReceipts: number;
    fgIssues: number;
    adjustments: number;
    inventoryGapValue: number;
  }>;
  byFamily: Array<{ label: string; physical: number; available: number; itemCount: number }>;
  byWarehouse: Array<{ code: string; designation: string; type: WarehouseType; physical: number; available: number }>;
  topConsumed: Array<{ itemCode: string; designation: string; quantity: number; unit: UnitOfMeasure }>;
  topProduced: Array<{ itemCode: string; designation: string; cans: number; cartons: number }>;
  losses: Array<{ itemCode: string; designation: string; quantity: number; unit: UnitOfMeasure; reason: string }>;
  inventoryAccuracy: number;
  totalMovements: number;
}

/** Ligne de lot telle qu'affichée dans le GDS (quantité restante réelle, multi-magasins). */
export interface GdsLotRow {
  lotId: string;
  lotNumber: string;
  itemId: string;
  itemCode: string;
  designation: string;
  scope: GdsScope;
  unit: UnitOfMeasure;
  qualityStatus: StockQualityStatus;
  expiryDate?: string;
  receptionDate?: string;
  supplierLotNumber?: string;
  origin?: string;
  initialQty: number;
  remainingQty: number;
  warehouses: Array<{
    warehouseId: string;
    code: string;
    designation: string;
    locationCode?: string;
    quantity: number;
    qualityStatus: StockQualityStatus;
  }>;
  isExpired: boolean;
  daysToExpiry?: number;
  workOrderNumbers: string[];
}

/** Ordre de fabrication dont la production reste partiellement à réceptionner. */
export interface GdsProductionReceiptCandidate {
  workOrderId: string;
  orderNumber: string;
  itemId: string;
  itemCode: string;
  productName: string;
  plannedCans: number;
  producedCans: number;
  alreadyReceivedCans: number;
  remainingCans: number;
  finishedBatchNumbers: string[];
  status: WorkOrderStatus;
  productionDate?: string;
}

// ============================================================================
// MAMORA BI — BUSINESS INTELLIGENCE & AI ANALYST
// Couche analytique en lecture seule au-dessus des données opérationnelles.
// Aucune structure de cette section ne modifie les données métier.
// ============================================================================

/** Sources analytiques autorisées. Aucune autre source ne peut être interrogée. */
export type BiSourceId =
  | 'production'
  | 'production_target'
  | 'consumption'
  | 'stock'
  | 'movement'
  | 'quality'
  | 'haccp'
  | 'purchase_order'
  | 'purchase_receipt'
  | 'sales'
  | 'maintenance';

export type BiDomain =
  | 'PRODUCTION'
  | 'STOCK'
  | 'QUALITE'
  | 'APPROVISIONNEMENT'
  | 'COMMERCIAL'
  | 'MAINTENANCE';

export type BiFieldType = 'string' | 'number' | 'date' | 'boolean';
export type BiFieldRole = 'DIMENSION' | 'MEASURE';
export type BiAggregation = 'SUM' | 'COUNT' | 'AVG' | 'MIN' | 'MAX' | 'RATIO';
export type BiValueFormat =
  | 'NUMBER'
  | 'DECIMAL'
  | 'PERCENT'
  | 'CURRENCY'
  | 'QUANTITY'
  | 'DATE';

/** Champ autorisé d'une source analytique (dimension ou mesure). */
export interface BiFieldDefinition {
  key: string;
  label: string;
  type: BiFieldType;
  role: BiFieldRole;
  description?: string;
  /** Mode d'agrégation, obligatoire pour une mesure. */
  aggregation?: BiAggregation;
  /** Champ numérique agrégé pour SUM / AVG / MIN / MAX. */
  field?: string;
  /** Numérateur et dénominateur pour une mesure de type RATIO. */
  numerator?: string;
  denominator?: string;
  unit?: string;
  format?: BiValueFormat;
  /** Groupe d'affichage dans l'explorateur. */
  group?: string;
}

/** Définition d'une source analytique en liste blanche. */
export interface BiSourceDefinition {
  id: BiSourceId;
  label: string;
  description: string;
  domain: BiDomain;
  fields: BiFieldDefinition[];
  defaultDimensions: string[];
  defaultMeasures: string[];
  permission: BiPermission;
  /** Champ portant l'identifiant magasin pour appliquer le périmètre. */
  warehouseField?: string;
  /** Service de rattachement pour le périmètre service. */
  department: string;
}

export type BiFilterOperator =
  | 'EQ'
  | 'NE'
  | 'GT'
  | 'GTE'
  | 'LT'
  | 'LTE'
  | 'IN'
  | 'NOT_IN'
  | 'BETWEEN'
  | 'CONTAINS'
  | 'STARTS_WITH'
  | 'IS_NULL'
  | 'IS_NOT_NULL';

export interface BiFilter {
  field: string;
  operator: BiFilterOperator;
  value?: string | number | boolean | Array<string | number>;
}

/** Requête analytique structurée : jamais de SQL, jamais de code utilisateur. */
export interface BiQuery {
  source: BiSourceId;
  dimensions: string[];
  measures: string[];
  filters: BiFilter[];
  orderBy?: Array<{ field: string; direction: 'ASC' | 'DESC' }>;
  limit?: number;
  offset?: number;
}

export interface BiPeriod {
  from?: string;
  to?: string;
  label?: string;
}

/** Périmètre de sécurité résolu pour l'utilisateur courant. */
export interface BiScope {
  userId: string;
  userName: string;
  role: UserRole;
  allWarehouses: boolean;
  warehouseIds: string[];
  allDepartments: boolean;
  departments: string[];
}

export type BiFactValue = string | number | boolean | null | undefined;
export type BiFactRow = Record<string, BiFactValue>;

export interface BiSnapshot {
  builtAt: string;
  rows: Record<BiSourceId, BiFactRow[]>;
  counts: Record<BiSourceId, number>;
  warnings: string[];
}

export interface BiQueryColumn {
  key: string;
  label: string;
  role: BiFieldRole;
  format: BiValueFormat;
  unit?: string;
}

export interface BiQueryResult {
  source: BiSourceId;
  sourceLabel: string;
  columns: BiQueryColumn[];
  rows: Array<Record<string, string | number | null>>;
  totalRows: number;
  truncated: boolean;
  generatedAt: string;
  filters: BiFilter[];
  period?: BiPeriod;
  scope: BiScope;
  warnings: string[];
}

/** Mesure documentée du catalogue MAMORA BI. */
export interface BiMeasureDefinition {
  code: string;
  label: string;
  description: string;
  source: BiSourceId;
  field?: string;
  aggregation: BiAggregation;
  numerator?: string;
  denominator?: string;
  unit: string;
  format: BiValueFormat;
  permission: BiPermission;
}

export interface BiMeasureValue {
  code: string;
  label: string;
  description: string;
  value: number | null;
  unit: string;
  format: BiValueFormat;
  source: BiSourceId;
}

export interface BiFormulaEvaluation {
  value: number | null;
  valid: boolean;
  error?: string;
  identifiers: string[];
}

export type BiWidgetType =
  | 'KPI'
  | 'BAR'
  | 'COLUMN'
  | 'LINE'
  | 'AREA'
  | 'PIE'
  | 'DONUT'
  | 'HISTOGRAM'
  | 'COMBO'
  | 'SCATTER'
  | 'GAUGE'
  | 'TABLE'
  | 'PIVOT'
  | 'HEATMAP';

export const BI_WIDGET_TYPE_LABELS: Record<BiWidgetType, string> = {
  KPI: 'Carte KPI',
  BAR: 'Barres horizontales',
  COLUMN: 'Colonnes',
  LINE: 'Courbe',
  AREA: 'Aire',
  PIE: 'Camembert',
  DONUT: 'Anneau',
  HISTOGRAM: 'Histogramme',
  COMBO: 'Graphique combiné',
  SCATTER: 'Nuage de points',
  GAUGE: 'Jauge',
  TABLE: 'Tableau détaillé',
  PIVOT: 'Tableau croisé',
  HEATMAP: 'Carte thermique',
};

export interface BiWidgetLayout {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface BiWidgetOptions {
  color?: string;
  showLegend?: boolean;
  showGrid?: boolean;
  stacked?: boolean;
  format?: BiValueFormat;
  kpiCode?: string;
  sortBy?: string;
  sortDirection?: 'ASC' | 'DESC';
  targetValue?: number;
  maxRows?: number;
}

export interface BiWidget {
  id: string;
  type: BiWidgetType;
  title: string;
  source: BiSourceId;
  dimensions: string[];
  measures: string[];
  filters: BiFilter[];
  layout: BiWidgetLayout;
  limit?: number;
  options?: BiWidgetOptions;
}

export type BiDashboardCategory =
  | 'GENERAL'
  | 'PRODUCTION'
  | 'GDS'
  | 'QUALITE'
  | 'APPROVISIONNEMENT'
  | 'COMMERCIAL'
  | 'CUSTOM';

export const BI_DASHBOARD_CATEGORY_LABELS: Record<BiDashboardCategory, string> = {
  GENERAL: 'Vue générale',
  PRODUCTION: 'Production',
  GDS: 'Stocks / GDS',
  QUALITE: 'Qualité',
  APPROVISIONNEMENT: 'Approvisionnement',
  COMMERCIAL: 'Commercial',
  CUSTOM: 'Personnalisé',
};

export interface BiDashboard {
  id: string;
  name: string;
  description: string;
  category: BiDashboardCategory;
  widgets: BiWidget[];
  ownerId: string;
  ownerName: string;
  sharedWithUserIds: string[];
  sharedWithRoles: UserRole[];
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export type BiKpiPeriod =
  | 'CURRENT_MONTH'
  | 'LAST_MONTH'
  | 'CURRENT_QUARTER'
  | 'CURRENT_YEAR'
  | 'LAST_12_MONTHS'
  | 'ALL'
  | 'CUSTOM';

export const BI_KPI_PERIOD_LABELS: Record<BiKpiPeriod, string> = {
  CURRENT_MONTH: 'Mois en cours',
  LAST_MONTH: 'Mois précédent',
  CURRENT_QUARTER: 'Trimestre en cours',
  CURRENT_YEAR: 'Année en cours',
  LAST_12_MONTHS: '12 derniers mois',
  ALL: 'Toutes périodes',
  CUSTOM: 'Période personnalisée',
};

export interface BiKpi {
  id: string;
  code: string;
  name: string;
  description: string;
  source: BiSourceId | 'MULTI';
  formula: string;
  unit: string;
  format: BiValueFormat;
  precision: number;
  period: BiKpiPeriod;
  owner: string;
  isActive: boolean;
  targetValue?: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface BiReport {
  id: string;
  name: string;
  description: string;
  source: BiSourceId;
  dimensions: string[];
  measures: string[];
  filters: BiFilter[];
  visualization: BiWidgetType;
  comments: string;
  ownerId: string;
  ownerName: string;
  sharedWithUserIds: string[];
  sharedWithRoles: UserRole[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export type BiAlertOperator = 'GT' | 'GTE' | 'LT' | 'LTE' | 'EQ' | 'NE';
export type BiAlertStatus = 'NOUVELLE' | 'ACQUITTEE' | 'IGNOREE';
export type BiAlertSeverity = 'INFO' | 'AVERTISSEMENT' | 'CRITIQUE';
/**
 * Mode d'évaluation d'une alerte :
 *  - THRESHOLD : seuil fixe (supérieur / inférieur à une valeur) ;
 *  - ANOMALY   : écart statistique à la moyenne historique (z-score).
 */
export type BiAlertMode = 'THRESHOLD' | 'ANOMALY';

export const BI_ALERT_STATUS_LABELS: Record<BiAlertStatus, string> = {
  NOUVELLE: 'Nouvelle',
  ACQUITTEE: 'Acquittée',
  IGNOREE: 'Ignorée',
};

export const BI_ALERT_OPERATOR_LABELS: Record<BiAlertOperator, string> = {
  GT: 'supérieur à',
  GTE: 'supérieur ou égal à',
  LT: 'inférieur à',
  LTE: 'inférieur ou égal à',
  EQ: 'égal à',
  NE: 'différent de',
};

export interface BiAlertRule {
  id: string;
  name: string;
  measureCode: string;
  operator: BiAlertOperator;
  threshold: number;
  period: BiKpiPeriod;
  /** Mode d'évaluation. Absent = seuil fixe (compatibilité ascendante). */
  mode?: BiAlertMode;
  /** Nombre de périodes d'historique pour le calcul statistique (défaut 12). */
  lookbackPeriods?: number;
  /** Nombre d'écarts-types au-delà duquel l'anomalie est signalée (défaut 2). */
  deviationFactor?: number;
  recipients: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface BiAlertEvent {
  id: string;
  ruleId: string;
  ruleName: string;
  measureCode: string;
  observedValue: number | null;
  threshold: number;
  operator: BiAlertOperator;
  severity: BiAlertSeverity;
  message: string;
  detectedAt: string;
  status: BiAlertStatus;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
}

export type BiResourceType = 'DASHBOARD' | 'REPORT';

export interface BiShare {
  id: string;
  resourceType: BiResourceType;
  resourceId: string;
  userIds: string[];
  roles: UserRole[];
  sharedBy: string;
  createdAt: string;
}

export type BiAiProvider = 'NONE' | 'LOCAL' | 'GEMINI' | 'OPENAI' | 'AZURE_OPENAI';

export interface BiSettings {
  aiProvider: BiAiProvider;
  aiModel?: string;
  aiEnabled: boolean;
  aiMaxRequestsPerDay: number;
  maxRows: number;
  defaultPeriodMonths: number;
  autoRefreshMinutes: number;
  currency: string;
  lastRefreshAt?: string;
  initializedAt?: string;
}

export interface BiRefreshLog {
  id: string;
  timestamp: string;
  actor: string;
  status: 'SUCCES' | 'ECHEC';
  durationMs: number;
  sourceCounts: Partial<Record<BiSourceId, number>>;
  message?: string;
}

export interface BiAiChart {
  type: BiWidgetType;
  title: string;
  data: Array<Record<string, string | number | null>>;
  xKey?: string;
  series?: string[];
}

export interface BiAiResponse {
  answer: string;
  intent: string;
  provider: string;
  usedFallback: boolean;
  facts: string[];
  hypotheses: string[];
  recommendations: string[];
  limitations: string[];
  query?: BiQuery;
  result?: BiQueryResult;
  chart?: BiAiChart;
  period?: BiPeriod;
  generatedAt: string;
}

// ============================================================================
// MAMORA BI — EXPORT POWERPOINT (.pptx)
// Présentation structurée et modifiable : aucun screenshot de dashboard.
// Les blocs sont construits à partir des résultats réels du moteur analytique.
// ============================================================================

/** Langues prises en charge par le thème PowerPoint. */
export type BiPptxLanguage = 'fr' | 'ar';

/** Format de diapositive : 16:9 par défaut, 4:3 uniquement sur demande. */
export type BiPptxFormat = '16:9' | '4:3';

export type BiPptxSlideKind =
  | 'COVER'
  | 'TOC'
  | 'EXECUTIVE_SUMMARY'
  | 'DOMAIN'
  | 'KPI'
  | 'CHART'
  | 'TABLE'
  | 'COMPARISON'
  | 'ALERTS'
  | 'AI'
  | 'CONCLUSION'
  | 'RECOMMENDATIONS'
  | 'SOURCES'
  /** Diapositive libre ajoutée par l'utilisateur dans l'assistant. */
  | 'CUSTOM';

export type BiPptxTextTone = 'FACT' | 'HYPOTHESIS' | 'RECOMMENDATION' | 'INFO' | 'WARNING';

export interface BiPptxTextBlock {
  tone: BiPptxTextTone;
  text: string;
}

export interface BiPptxKpiBlock {
  code?: string;
  label: string;
  value: string;
  unit?: string;
  source?: string;
  definition?: string;
  target?: string;
  tone?: 'blue' | 'emerald' | 'amber' | 'red' | 'violet' | 'slate';
  hint?: string;
}

export interface BiPptxTableColumn {
  key: string;
  label: string;
  role: BiFieldRole;
  format: BiValueFormat;
  unit?: string;
}

export interface BiPptxTableBlock {
  columns: BiPptxTableColumn[];
  rows: Array<Record<string, string | number | null>>;
  totalRows: number;
  truncated: boolean;
}

export interface BiPptxChartSeries {
  name: string;
  values: number[];
}

/** Données normalisées d'un graphique natif PowerPoint. */
export interface BiPptxChartBlock {
  type: BiWidgetType;
  title: string;
  categories: string[];
  series: BiPptxChartSeries[];
  /** Valeurs X du nuage de points (série Y dans `series`). */
  scatterX?: number[];
  unit?: string;
  format?: BiValueFormat;
  note?: string;
}

export interface BiPptxComparisonRow {
  label: string;
  current: number | null;
  previous: number | null;
  delta: number | null;
  deltaPercent: number | null;
  unit: string;
  format: BiValueFormat;
  source?: string;
}

export interface BiPptxComparisonBlock {
  currentLabel: string;
  previousLabel: string;
  rows: BiPptxComparisonRow[];
}

/** Diapositive sérialisable, éditable dans l'assistant avant génération. */
export interface BiPptxSlide {
  id: string;
  kind: BiPptxSlideKind;
  title: string;
  subtitle?: string;
  kpis?: BiPptxKpiBlock[];
  chart?: BiPptxChartBlock;
  table?: BiPptxTableBlock;
  comparison?: BiPptxComparisonBlock;
  bullets?: BiPptxTextBlock[];
  comment?: string;
  observations?: string;
  periodLabel?: string;
  sourceLabel?: string;
  filters?: string[];
  unit?: string;
  generatedAt?: string;
  sectionLabel?: string;
}

export interface BiPptxConfig {
  title: string;
  subtitle: string;
  department: string;
  periodLabel: string;
  generatedAt: string;
  /** Date du dernier rafraîchissement analytique, affichée dans le pied de page. */
  refreshAt?: string;
  author: string;
  language: BiPptxLanguage;
  format: BiPptxFormat;
  logoDataUrl?: string;
  company: string;
  includeSlideNumbers: boolean;
  includeFooter: boolean;
}

/**
 * Sélection de contenu. Les identifiants sont résolus côté stockage avec les
 * habilitations et le périmètre de l'utilisateur courant.
 */
export interface BiPptxSelection {
  dashboardIds: string[];
  /** Clés `dashboardId::widgetId` pour une sélection partielle de widgets. */
  widgetKeys: string[];
  reportIds: string[];
  kpiIds: string[];
  /** Analyses ponctuelles issues de l'explorateur (requêtes structurées). */
  explorerQueries: Array<{ title: string; query: BiQuery }>;
  includeOverview: boolean;
  includeExecutiveSummary: boolean;
  includeDomainAnalysis: boolean;
  includeAlerts: boolean;
  includeAi: boolean;
  includeComparison: boolean;
  includeConclusion: boolean;
  includeRecommendations: boolean;
  includeSources: boolean;
  period?: BiPeriod;
  comparison?: { previousPeriod: BiPeriod; label: string };
  aiResponses?: BiAiResponse[];
}

export interface BiPptxContentSummary {
  dashboards: number;
  charts: number;
  tables: number;
  kpis: number;
  reports: number;
  aiResponses: number;
  alerts: number;
}

/** Présentation prête à rendre : données réelles, aucune valeur inventée. */
export interface BiPptxDeck {
  id: string;
  config: BiPptxConfig;
  slides: BiPptxSlide[];
  warnings: string[];
  scope: BiScope;
  sourceLabels: string[];
  createdAt: string;
  summary: BiPptxContentSummary;
}

/** Historique de génération (persisté uniquement si l'utilisateur est habilité). */
export interface BiPptxLog {
  id: string;
  timestamp: string;
  actor: string;
  title: string;
  language: BiPptxLanguage;
  format: BiPptxFormat;
  slideCount: number;
  fileName: string;
  status: 'SUCCES' | 'ECHEC';
  message?: string;
  dashboardIds: string[];
  reportIds: string[];
  kpiIds: string[];
  summary: BiPptxContentSummary;
}

/** Contexte d'ouverture de l'assistant depuis une section BI. */
export interface BiPptxExportPreset {
  source: 'OVERVIEW' | 'DASHBOARD' | 'REPORT' | 'EXPLORER' | 'KPI' | 'AI';
  dashboardId?: string;
  widgetKey?: string;
  reportId?: string;
  kpiIds?: string[];
  query?: BiQuery;
  title?: string;
  aiResponse?: BiAiResponse;
}
