-- =============================================================================
-- MAMORA GP — Module GDS (Gestion des Stocks MP & PF)
-- Migration 001 : collections ajoutées par le module GDS
-- -----------------------------------------------------------------------------
-- Portée volontairement limitée aux NOUVELLES structures. Aucun deuxième
-- référentiel d'articles ni de stocks n'est créé : les tables ci-dessous ne
-- contiennent que des documents (inventaires, sorties PF, paramètres) qui
-- pointent vers le référentiel et le grand livre de mouvements existants.
--
-- Tables préexistantes attendues (non modifiées par cette migration) :
--   items                  — référentiel unique des articles (MP et PF)
--   warehouses             — magasins
--   warehouse_locations    — emplacements / zones
--   stock_lots             — lots (MP et PF), statut qualité, traçabilité
--   stock_movements        — grand livre des mouvements (append-only)
--   warehouse_stocks       — soldes lot × magasin × emplacement × statut
--   stock_transfers        — transferts inter-magasins
--   stock_transits         — quantités en transit
--
-- Conventions :
--   * Les identifiants sont des TEXT, alignés sur le schéma d'identifiants
--     réellement utilisé par l'application (aucune séquence inventée).
--   * Les colonnes « ...By » stockent le nom de l'utilisateur tel qu'il est
--     journalisé dans la piste d'audit de l'application.
--   * Aucune ligne validée ne doit être supprimée : voir les REVOKE en fin de
--     fichier (politique append-only du grand livre).
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- Types énumérés (idempotents)
-- -----------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gds_scope') THEN
    CREATE TYPE gds_scope AS ENUM ('MP', 'PF');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'inventory_type') THEN
    CREATE TYPE inventory_type AS ENUM (
      'GENERAL', 'MAGASIN', 'EMPLACEMENT', 'ARTICLE', 'LOT', 'TOURNANT'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'inventory_status') THEN
    CREATE TYPE inventory_status AS ENUM (
      'BROUILLON', 'EN_COMPTAGE', 'EN_VALIDATION', 'VALIDE', 'ANNULE'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'finished_goods_issue_motive') THEN
    CREATE TYPE finished_goods_issue_motive AS ENUM (
      'LIVRAISON_CLIENT', 'ECHANTILLON', 'DESTRUCTION',
      'RETOUR_FOURNISSEUR', 'TRANSFERT', 'AUTRE'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'finished_goods_issue_status') THEN
    CREATE TYPE finished_goods_issue_status AS ENUM (
      'BROUILLON', 'EN_PREPARATION', 'CONTROLE', 'VALIDE', 'ANNULE'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'stock_quality_status') THEN
    CREATE TYPE stock_quality_status AS ENUM (
      'LIBERE',
      'EN_ATTENTE_CONTROLE',
      'CONFORME',
      'NON_CONFORME',
      'QUARANTAINE',
      'BLOQUE',
      'REJETE'
    );
  ELSE
    -- Migration des installations antérieures : ajout des deux statuts
    -- demandés par le cahier des charges (§5.2).
    BEGIN
      ALTER TYPE stock_quality_status ADD VALUE IF NOT EXISTS 'CONFORME';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER TYPE stock_quality_status ADD VALUE IF NOT EXISTS 'NON_CONFORME';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END
$$;

-- -----------------------------------------------------------------------------
-- PARAMÈTRES GDS — ligne unique
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS gds_settings (
  id                                BOOLEAN      PRIMARY KEY DEFAULT TRUE CHECK (id),
  expiry_alert_days                 INTEGER      NOT NULL DEFAULT 45  CHECK (expiry_alert_days >= 0),
  overstock_multiplier              NUMERIC(6,2) NOT NULL DEFAULT 1.50 CHECK (overstock_multiplier > 0),
  transit_alert_days                INTEGER      NOT NULL DEFAULT 3   CHECK (transit_alert_days >= 0),
  inventory_tolerance_percent       NUMERIC(5,2) NOT NULL DEFAULT 1.00 CHECK (inventory_tolerance_percent >= 0),
  require_quality_release_on_receipt BOOLEAN     NOT NULL DEFAULT TRUE,
  block_unreleased_finished_issue    BOOLEAN     NOT NULL DEFAULT TRUE,
  default_production_warehouse_id   TEXT        REFERENCES warehouses(id) ON DELETE SET NULL,
  quarantine_warehouse_id           TEXT        REFERENCES warehouses(id) ON DELETE SET NULL,
  updated_at                        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by                        TEXT
);

COMMENT ON TABLE  gds_settings IS 'Paramètres transverses du module GDS (une seule ligne, id = TRUE).';
COMMENT ON COLUMN gds_settings.require_quality_release_on_receipt IS 'Une réception PF est placée en attente de libération qualité.';
COMMENT ON COLUMN gds_settings.block_unreleased_finished_issue    IS 'Interdit toute sortie PF d''un lot non libéré.';

INSERT INTO gds_settings (id) VALUES (TRUE) ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- INVENTAIRES
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS stock_inventories (
  id                TEXT             PRIMARY KEY,
  inventory_number  TEXT             NOT NULL UNIQUE,
  scope             gds_scope        NOT NULL,
  inventory_type    inventory_type   NOT NULL,
  status            inventory_status NOT NULL DEFAULT 'BROUILLON',
  -- Périmètre : les colonnes non nulles restreignent l'inventaire.
  warehouse_id      TEXT             REFERENCES warehouses(id)          ON DELETE RESTRICT,
  location_id       TEXT             REFERENCES warehouse_locations(id)  ON DELETE RESTRICT,
  item_id           TEXT             REFERENCES items(id)               ON DELETE RESTRICT,
  lot_id            TEXT             REFERENCES stock_lots(id)          ON DELETE RESTRICT,
  created_by        TEXT             NOT NULL,
  created_at        TIMESTAMPTZ      NOT NULL DEFAULT now(),
  counted_by        TEXT,
  counted_at        TIMESTAMPTZ,
  submitted_by      TEXT,
  submitted_at      TIMESTAMPTZ,
  validated_by      TEXT,
  validated_at      TIMESTAMPTZ,
  cancelled_by      TEXT,
  cancelled_at      TIMESTAMPTZ,
  cancel_reason     TEXT,
  notes             TEXT,
  -- Un inventaire validé ou annulé est figé.
  CONSTRAINT stock_inventories_terminal_state CHECK (
    (status = 'VALIDE' AND validated_by IS NOT NULL AND validated_at IS NOT NULL)
    OR (status = 'ANNULE' AND cancelled_by IS NOT NULL AND cancelled_at IS NOT NULL)
    OR status IN ('BROUILLON', 'EN_COMPTAGE', 'EN_VALIDATION')
  )
);

COMMENT ON TABLE stock_inventories IS 'Sessions d''inventaire (général, magasin, emplacement, article, lot, tournant).';
COMMENT ON COLUMN stock_inventories.inventory_type IS 'Détermine le périmètre réellement figé à l''ouverture.';

CREATE INDEX IF NOT EXISTS idx_stock_inventories_status  ON stock_inventories (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_inventories_scope   ON stock_inventories (scope, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_inventories_wh      ON stock_inventories (warehouse_id) WHERE warehouse_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS stock_inventory_lines (
  id                     TEXT                PRIMARY KEY,
  inventory_id           TEXT                NOT NULL REFERENCES stock_inventories(id) ON DELETE CASCADE,
  item_id                TEXT                NOT NULL REFERENCES items(id)             ON DELETE RESTRICT,
  item_code              TEXT                NOT NULL,
  designation            TEXT                NOT NULL,
  lot_id                 TEXT                REFERENCES stock_lots(id)                ON DELETE RESTRICT,
  lot_number             TEXT,
  warehouse_id           TEXT                REFERENCES warehouses(id)                ON DELETE RESTRICT,
  warehouse_code         TEXT,
  location_id            TEXT                REFERENCES warehouse_locations(id)       ON DELETE RESTRICT,
  location_code          TEXT,
  quality_status         stock_quality_status NOT NULL DEFAULT 'LIBERE',
  unit                   TEXT                NOT NULL,
  -- Stock théorique figé à l'ouverture : jamais recalculé après comptage.
  theoretical_qty        NUMERIC(16,4)       NOT NULL DEFAULT 0,
  counted_qty            NUMERIC(16,4),
  gap_qty                NUMERIC(16,4),
  justification          TEXT,
  adjustment_movement_id TEXT                REFERENCES stock_movements(id) ON DELETE RESTRICT,
  counted_by             TEXT,
  counted_at             TIMESTAMPTZ,
  -- Écart ⇒ justification obligatoire (règle métier Phase 11).
  CONSTRAINT stock_inventory_lines_gap_justified CHECK (
    gap_qty IS NULL OR gap_qty = 0 OR (justification IS NOT NULL AND length(btrim(justification)) > 0)
  ),
  -- Écart cohérent avec les quantités saisies.
  CONSTRAINT stock_inventory_lines_gap_computed CHECK (
    counted_qty IS NULL OR gap_qty IS NULL OR gap_qty = counted_qty - theoretical_qty
  ),
  CONSTRAINT stock_inventory_lines_unique_perimeter UNIQUE (inventory_id, item_id, lot_id, warehouse_id, location_id, quality_status)
);

COMMENT ON TABLE  stock_inventory_lines IS 'Lignes d''inventaire : théorique figé, compté, écart, justification, mouvement d''ajustement.';
COMMENT ON COLUMN stock_inventory_lines.theoretical_qty IS 'Quantité théorique figée à l''ouverture de l''inventaire.';
COMMENT ON COLUMN stock_inventory_lines.adjustment_movement_id IS 'Mouvement AJUSTEMENT_INVENTAIRE généré à la validation (jamais d''écriture directe du solde).';

CREATE INDEX IF NOT EXISTS idx_stock_inventory_lines_inv  ON stock_inventory_lines (inventory_id);
CREATE INDEX IF NOT EXISTS idx_stock_inventory_lines_item ON stock_inventory_lines (item_id, lot_id);

-- -----------------------------------------------------------------------------
-- SORTIES DE PRODUITS FINIS (hors vente / facturation)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS finished_goods_issues (
  id               TEXT                        PRIMARY KEY,
  issue_number     TEXT                        NOT NULL UNIQUE,
  issue_date       DATE                        NOT NULL DEFAULT CURRENT_DATE,
  motive           finished_goods_issue_motive NOT NULL,
  status           finished_goods_issue_status NOT NULL DEFAULT 'BROUILLON',
  scope            gds_scope                   NOT NULL DEFAULT 'PF',
  destination      TEXT                        NOT NULL,
  customer_id      TEXT,
  customer_name    TEXT,
  sales_order_id   TEXT,
  delivery_note_id TEXT,
  warehouse_id     TEXT                        REFERENCES warehouses(id) ON DELETE RESTRICT,
  document_ref     TEXT,
  observations     TEXT,
  created_by       TEXT                        NOT NULL,
  created_at       TIMESTAMPTZ                 NOT NULL DEFAULT now(),
  prepared_by      TEXT,
  prepared_at      TIMESTAMPTZ,
  controlled_by    TEXT,
  controlled_at    TIMESTAMPTZ,
  validated_by     TEXT,
  validated_at     TIMESTAMPTZ,
  cancelled_by     TEXT,
  cancelled_at     TIMESTAMPTZ,
  cancel_reason    TEXT,
  CONSTRAINT finished_goods_issues_scope_pf CHECK (scope = 'PF'),
  CONSTRAINT finished_goods_issues_terminal_state CHECK (
    (status = 'VALIDE' AND validated_by IS NOT NULL AND validated_at IS NOT NULL)
    OR (status = 'ANNULE' AND cancelled_by IS NOT NULL AND cancelled_at IS NOT NULL)
    OR status IN ('BROUILLON', 'EN_PREPARATION', 'CONTROLE')
  ),
  -- Circuit : préparation → contrôle → validation, dans cet ordre.
  CONSTRAINT finished_goods_issues_control_before_validation CHECK (
    status NOT IN ('CONTROLE', 'VALIDE') OR prepared_by IS NOT NULL
  )
);

COMMENT ON TABLE  finished_goods_issues IS 'Sorties de produits finis (livraison, échantillon, destruction, retour, transfert, autre). Aucune facturation.';
COMMENT ON COLUMN finished_goods_issues.status IS 'BROUILLON → EN_PREPARATION → CONTROLE → VALIDE, ou ANNULE (motif obligatoire).';

CREATE INDEX IF NOT EXISTS idx_finished_goods_issues_status ON finished_goods_issues (status, issue_date DESC);
CREATE INDEX IF NOT EXISTS idx_finished_goods_issues_date   ON finished_goods_issues (issue_date DESC);

CREATE TABLE IF NOT EXISTS finished_goods_issue_lines (
  id             TEXT          PRIMARY KEY,
  issue_id       TEXT          NOT NULL REFERENCES finished_goods_issues(id) ON DELETE CASCADE,
  item_id        TEXT          NOT NULL REFERENCES items(id)                 ON DELETE RESTRICT,
  item_code      TEXT          NOT NULL,
  designation    TEXT          NOT NULL,
  lot_id         TEXT          NOT NULL REFERENCES stock_lots(id)            ON DELETE RESTRICT,
  lot_number     TEXT          NOT NULL,
  quantity       NUMERIC(16,4) NOT NULL CHECK (quantity > 0),
  unit           TEXT          NOT NULL,
  cartons        INTEGER       CHECK (cartons IS NULL OR cartons >= 0),
  pallets        INTEGER       CHECK (pallets  IS NULL OR pallets  >= 0),
  prepared_qty   NUMERIC(16,4) CHECK (prepared_qty IS NULL OR prepared_qty >= 0),
  shipped_qty    NUMERIC(16,4) CHECK (shipped_qty  IS NULL OR shipped_qty  >= 0),
  observations   TEXT,
  -- Sortie partielle : jamais plus que la quantité demandée.
  CONSTRAINT finished_goods_issue_lines_partial_bounds CHECK (
    (prepared_qty IS NULL OR prepared_qty <= quantity)
    AND (shipped_qty IS NULL OR shipped_qty <= quantity)
  ),
  CONSTRAINT finished_goods_issue_lines_unique_lot UNIQUE (issue_id, item_id, lot_id)
);

COMMENT ON TABLE  finished_goods_issue_lines IS 'Lignes de sortie PF : quantité demandée, préparée, réellement sortie.';
COMMENT ON COLUMN finished_goods_issue_lines.shipped_qty IS 'Quantité effectivement sortie ; une sortie partielle laisse le reliquat disponible.';

CREATE INDEX IF NOT EXISTS idx_finished_goods_issue_lines_issue ON finished_goods_issue_lines (issue_id);
CREATE INDEX IF NOT EXISTS idx_finished_goods_issue_lines_lot   ON finished_goods_issue_lines (lot_id);

-- -----------------------------------------------------------------------------
-- Politique append-only : ni les mouvements validés, ni les documents validés
-- ne peuvent être supprimés. Les corrections passent par un mouvement inverse
-- ou une annulation motivée.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION gds_forbid_delete() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION
    'Suppression interdite sur % (politique append-only du module GDS). Utilisez une annulation motivée ou un mouvement inverse.',
    TG_TABLE_NAME
    USING ERRCODE = 'restrict_violation';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_stock_movements_no_delete ON stock_movements;
CREATE TRIGGER trg_stock_movements_no_delete
  BEFORE DELETE ON stock_movements
  FOR EACH ROW EXECUTE FUNCTION gds_forbid_delete();

DROP TRIGGER IF EXISTS trg_stock_inventories_no_delete_validated ON stock_inventories;
CREATE TRIGGER trg_stock_inventories_no_delete_validated
  BEFORE DELETE ON stock_inventories
  FOR EACH ROW
  WHEN (OLD.status = 'VALIDE')
  EXECUTE FUNCTION gds_forbid_delete();

DROP TRIGGER IF EXISTS trg_finished_goods_issues_no_delete_validated ON finished_goods_issues;
CREATE TRIGGER trg_finished_goods_issues_no_delete_validated
  BEFORE DELETE ON finished_goods_issues
  FOR EACH ROW
  WHEN (OLD.status = 'VALIDE')
  EXECUTE FUNCTION gds_forbid_delete();

-- -----------------------------------------------------------------------------
-- Vue de contrôle : cohérence entre le grand livre et les soldes.
-- Doit toujours retourner 0 ligne ; toute ligne signale une écriture directe
-- du solde (interdite : tout ajustement passe par un mouvement traçable).
-- -----------------------------------------------------------------------------

CREATE OR REPLACE VIEW v_gds_stock_integrity AS
SELECT
  ws.warehouse_id,
  ws.item_id,
  ws.lot_id,
  ws.quality_status,
  ws.quantity                                   AS balance_qty,
  COALESCE(mv.ledger_qty, 0)                    AS ledger_qty,
  ws.quantity - COALESCE(mv.ledger_qty, 0)      AS delta
FROM warehouse_stocks ws
LEFT JOIN (
  SELECT warehouse_id, item_id, lot_id, quality_status, SUM(signed_qty) AS ledger_qty
  FROM stock_movements
  GROUP BY warehouse_id, item_id, lot_id, quality_status
) mv
  ON  mv.warehouse_id   = ws.warehouse_id
  AND mv.item_id        = ws.item_id
  AND mv.lot_id         IS NOT DISTINCT FROM ws.lot_id
  AND mv.quality_status = ws.quality_status
WHERE ws.quantity <> COALESCE(mv.ledger_qty, 0);

COMMENT ON VIEW v_gds_stock_integrity IS 'Écarts entre soldes et grand livre ; doit rester vide (aucune modification directe de solde).';

COMMIT;
