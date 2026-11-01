/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * MAMORA GP — Application Principale de GPAO & Sécurité Sanitaire ISO 22000
 * Conserverie Industrielle de Thon et de Sardines
 */

import React, { Suspense, lazy, useState, useEffect } from 'react';
import { storage } from './services/storage';
import { Sidebar, PROCUREMENT_SUBMENUS } from './components/layout/Sidebar';
import type { ActiveModule } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { LoginView } from './components/layout/LoginView';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { ModuleLoader } from './components/common/ModuleLoader';
import { DashboardView } from './components/modules/DashboardView';
import { GDS_SECTION_LABELS } from './components/modules/gds/gdsSections';
import type { GdsSection } from './components/modules/gds/gdsSections';
import type { ProcurementSection } from './components/modules/ApprovisionnementView';

// Les modules métier sont découpés en chunks et téléchargés à la demande :
// seul le socle (connexion, navigation, tableau de bord) est chargé au démarrage.
const ReferentielsView = lazy(() =>
  import('./components/modules/ReferentielsView').then(m => ({ default: m.ReferentielsView })),
);
const MatieresPremieresView = lazy(() =>
  import('./components/modules/MatieresPremieresView').then(m => ({ default: m.MatieresPremieresView })),
);
const ReceptionView = lazy(() =>
  import('./components/modules/ReceptionView').then(m => ({ default: m.ReceptionView })),
);
const ProductionView = lazy(() =>
  import('./components/modules/ProductionView').then(m => ({ default: m.ProductionView })),
);
const SuiviFabricationView = lazy(() =>
  import('./components/modules/SuiviFabricationView').then(m => ({ default: m.SuiviFabricationView })),
);
const HaccpQualiteView = lazy(() =>
  import('./components/modules/HaccpQualiteView').then(m => ({ default: m.HaccpQualiteView })),
);
const SertissageAutoclavesView = lazy(() =>
  import('./components/modules/SertissageAutoclavesView').then(m => ({ default: m.SertissageAutoclavesView })),
);
const NonConformitesView = lazy(() =>
  import('./components/modules/NonConformitesView').then(m => ({ default: m.NonConformitesView })),
);
const DossiersLotsView = lazy(() =>
  import('./components/modules/DossiersLotsView').then(m => ({ default: m.DossiersLotsView })),
);
const CommercialView = lazy(() =>
  import('./components/modules/CommercialView').then(m => ({ default: m.CommercialView })),
);
const TracabiliteView = lazy(() =>
  import('./components/modules/TracabiliteView').then(m => ({ default: m.TracabiliteView })),
);
const MagasinsView = lazy(() =>
  import('./components/modules/MagasinsView').then(m => ({ default: m.MagasinsView })),
);
const TransfertsView = lazy(() =>
  import('./components/modules/TransfertsView').then(m => ({ default: m.TransfertsView })),
);
const MaintenanceView = lazy(() =>
  import('./components/modules/MaintenanceView').then(m => ({ default: m.MaintenanceView })),
);
const AuditAdminView = lazy(() =>
  import('./components/modules/AuditAdminView').then(m => ({ default: m.AuditAdminView })),
);
const UserManagerView = lazy(() =>
  import('./components/modules/UserManagerView').then(m => ({ default: m.UserManagerView })),
);
const ConsommationReelleView = lazy(() =>
  import('./components/modules/ConsommationReelleView').then(m => ({ default: m.ConsommationReelleView })),
);
const ApprovisionnementView = lazy(() =>
  import('./components/modules/ApprovisionnementView').then(m => ({ default: m.ApprovisionnementView })),
);
const GdsView = lazy(() =>
  import('./components/modules/GdsView').then(m => ({ default: m.GdsView })),
);
const MamoraBiView = lazy(() =>
  import('./components/modules/MamoraBiView').then(m => ({ default: m.MamoraBiView })),
);

export default function App() {
  const [, setTick] = useState(0);
  const [activeModule, setActiveModule] = useState<ActiveModule>('DASHBOARD');
  const [procurementSection, setProcurementSection] = useState<ProcurementSection>('DASHBOARD');
  const [gdsSection, setGdsSection] = useState<GdsSection>('MP_DASHBOARD');
  const [selectedWorkOrderIdForSteps, setSelectedWorkOrderIdForSteps] = useState<string>('');

  useEffect(() => {
    // Écoute réactive des mutations de la base de données
    const unsubscribe = storage.subscribe(() => {
      setTick(t => t + 1);
    });
    return unsubscribe;
  }, []);

  // L'application reste inaccessible tant qu'aucune session n'est authentifiée par code PIN
  if (!storage.isAuthenticated()) {
    return <LoginView onAuthenticated={() => setTick(t => t + 1)} />;
  }

  const currentUser = storage.getCurrentUser();
  const allUsers = storage.getUsers();
  const items = storage.getItems();
  const recipes = storage.getRecipes();
  const receptions = storage.getReceptions();
  const workOrders = storage.getWorkOrders();
  const stepLogs = storage.getStepLogs();
  const seamingInspections = storage.getSeamingInspections();
  const autoclaveCycles = storage.getAutoclaveCycles();
  const haccpRecords = storage.getHaccpRecords();
  const nonConformities = storage.getNonConformities();
  const finishedBatches = storage.getFinishedBatches();
  const customers = storage.getCustomers();
  const salesOrders = storage.getSalesOrders();
  const deliveryNotes = storage.getDeliveryNotes();
  const invoices = storage.getInvoices();
  const equipments = storage.getEquipments();
  const auditLogs = storage.getAuditLogs();

  // Indicateurs de notification (badges)
  const activeWorkOrdersCount = workOrders.filter(w => w.status === 'EN_COURS').length;
  const pendingReceptionsCount = receptions.filter(r => r.decision === 'EN_ATTENTE').length;
  const blockedBatchesCount = nonConformities.filter(n => !n.isResolved).length;
  const pendingReleasesCount = finishedBatches.filter(b => b.releaseStatus === 'EN_ATTENTE').length;
  const pendingOrdersCount = salesOrders.filter(o => o.status === 'CONFIRME' || o.status === 'EN_PREPARATION').length;
  const pendingConsumptionsCount = ((storage as any).db?.consumptions || []).filter((c: any) => c.status === 'EN_ATTENTE_VALIDATION').length;
  const pendingPurchaseRequestsCount = storage
    .getPurchaseRequests()
    .filter(r => r.status === 'EN_VALIDATION').length;
  // Alertes GDS critiques (rupture, péremption, sous-minimum bloquant)
  const gdsCriticalAlertsCount = storage.getGdsAlerts().filter(a => a.severity === 'CRITIQUE').length;

  const getModuleName = (mod: ActiveModule) => {
    switch (mod) {
      case 'DASHBOARD': return 'Tableau de Bord de Production';
      case 'REFERENTIELS': return 'Nomenclatures des Produits Finis & Recettes';
      case 'MATIERES_PREMIERES': return 'Matières Premières & Composants';
      case 'APPROVISIONNEMENT': {
        const label =
          PROCUREMENT_SUBMENUS.find(s => s.id === procurementSection)?.label ?? 'Tableau de bord';
        return `Service Approvisionnement — ${label}`;
      }
      case 'GDS':
        return `GDS — ${GDS_SECTION_LABELS[gdsSection]}`;
      case 'MAMORA_BI':
        return 'MAMORA BI — Business Intelligence & AI Analyst';
      case 'RECEPTIONS': return 'Réceptions & Agréage Matières Premières';
      case 'PLANIFICATION': return 'Planification des Ordres de Fabrication (OF)';
      case 'CONSOMMATION_REELLE': return 'Consommations Réelles en Production';
      case 'ANALYSE_ECARTS': return 'Analyse des Écarts Théorique vs Réel';
      case 'RENDEMENT_PERTES': return 'Rendement Matière & Pertes de Production';
      case 'SUIVI_FABRICATION': return 'Suivi d\'Atelier des 17 Étapes';
      case 'HACCP_QUALITE': return 'Surveillance des CCP & PRPo (ISO 22000)';
      case 'SERTISSAGE_AUTOCLAVES': return 'Contrôles Sertissage & Stérilisation';
      case 'NON_CONFORMITES': return 'Non-Conformités & Actions Correctives (5M)';
      case 'DOSSIERS_LOTS': return 'Dossiers de Lots & Libération Sanitaire';
      case 'COMMERCIAL': return 'Module Commercial, BL & Facturation';
      case 'TRACABILITE': return 'Traçabilité Amont/Aval & Rappel de Produit';
      case 'STOCKS': return 'Gestion des Stocks Multi-Magasins';
      case 'MAGASINS': return 'Magasins, Emplacements & Stocks par Lot';
      case 'TRANSFERTS': return 'Transferts Inter-Magasins, Production & Écarts';
      case 'MAINTENANCE': return 'Maintenance & Métrologie des Équipements';
      case 'AUDIT_ADMIN': return 'Journal d\'Audit, Sauvegardes & Déploiement';
      case 'USER_MANAGER': return 'Gestion des Utilisateurs, Rôles & Permissions';
      default: return mod;
    }
  };

  const handleNavigateToSteps = (woId: string) => {
    setSelectedWorkOrderIdForSteps(woId);
    setActiveModule('SUIVI_FABRICATION');
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans">
      {/* Menu Latéral Rétractable par Flèche */}
      <Sidebar
        activeModule={activeModule}
        onSelectModule={(mod, section) => {
          setActiveModule(mod);
          if (mod === 'APPROVISIONNEMENT' && section) {
            setProcurementSection(section as ProcurementSection);
          }
          if (mod === 'GDS' && section) {
            setGdsSection(section as GdsSection);
          }
        }}
        procurementSection={procurementSection}
        gdsSection={gdsSection}
        currentUser={currentUser}
        onLogout={() => storage.logout()}
        badgeCounts={{
          activeWorkOrders: activeWorkOrdersCount,
          pendingReceptions: pendingReceptionsCount,
          blockedBatches: blockedBatchesCount,
          pendingReleases: pendingReleasesCount,
          pendingOrders: pendingOrdersCount,
          activeIncidents: blockedBatchesCount,
          pendingConsumptions: pendingConsumptionsCount,
          pendingPurchaseRequests: pendingPurchaseRequestsCount,
          gdsAlerts: gdsCriticalAlertsCount,
        }}
      />

      {/* Contenu Principal */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Barre Supérieure */}
        <TopBar
          currentModuleName={getModuleName(activeModule)}
          currentUser={currentUser}
          onOpenAudit={() => setActiveModule('NON_CONFORMITES')}
          blockedCount={blockedBatchesCount}
        />

        {/* Corps de Page Défilable */}
        <main className="flex-1 p-6 overflow-y-auto">
          <ErrorBoundary key={`${activeModule}:${procurementSection}:${gdsSection}`} moduleName={getModuleName(activeModule)}>
          <div className="max-w-7xl mx-auto">
            <Suspense fallback={<ModuleLoader label={`Chargement — ${getModuleName(activeModule)}`} />}>
              {activeModule === 'DASHBOARD' && (
                <DashboardView
                  db={(storage as any).db}
                  onNavigate={mod => setActiveModule(mod)}
                />
              )}

              {activeModule === 'APPROVISIONNEMENT' && (
                <ApprovisionnementView
                  currentUser={currentUser}
                  section={procurementSection}
                  onNavigate={section => setProcurementSection(section)}
                />
              )}

              {activeModule === 'GDS' && (
                <GdsView
                  currentUser={currentUser}
                  section={gdsSection}
                  onNavigate={setGdsSection}
                  onOpenProcurementReceptions={() => {
                    setActiveModule('APPROVISIONNEMENT');
                    setProcurementSection('RECEPTIONS');
                  }}
                />
              )}

              {activeModule === 'MAMORA_BI' && (
                <MamoraBiView currentUser={currentUser} />
              )}

              {activeModule === 'REFERENTIELS' && (
                <ReferentielsView items={items} recipes={recipes} />
              )}

              {activeModule === 'MATIERES_PREMIERES' && (
                <MatieresPremieresView currentUser={currentUser} />
              )}

              {activeModule === 'RECEPTIONS' && (
                <ReceptionView receptions={receptions} currentUserName={currentUser.name} />
              )}

              {activeModule === 'PLANIFICATION' && (
                <ProductionView
                  workOrders={workOrders}
                  recipes={recipes}
                  items={items}
                  receptions={receptions}
                  currentUserName={currentUser.name}
                  onNavigateToSteps={handleNavigateToSteps}
                />
              )}

              {activeModule === 'CONSOMMATION_REELLE' && (
                <ConsommationReelleView
                  db={(storage as any).db}
                  currentUser={currentUser}
                  initialTab="SAISIE"
                />
              )}

              {activeModule === 'ANALYSE_ECARTS' && (
                <ConsommationReelleView
                  db={(storage as any).db}
                  currentUser={currentUser}
                  initialTab="ECARTS"
                />
              )}

              {activeModule === 'RENDEMENT_PERTES' && (
                <ConsommationReelleView
                  db={(storage as any).db}
                  currentUser={currentUser}
                  initialTab="RENDEMENT"
                />
              )}

              {activeModule === 'SUIVI_FABRICATION' && (
                <SuiviFabricationView
                  workOrders={workOrders}
                  stepLogs={stepLogs}
                  currentUserName={currentUser.name}
                  selectedWorkOrderId={selectedWorkOrderIdForSteps}
                />
              )}

              {activeModule === 'HACCP_QUALITE' && (
                <HaccpQualiteView haccpRecords={haccpRecords} currentUserName={currentUser.name} />
              )}

              {activeModule === 'SERTISSAGE_AUTOCLAVES' && (
                <SertissageAutoclavesView
                  seamingInspections={seamingInspections}
                  autoclaveCycles={autoclaveCycles}
                  workOrders={workOrders}
                  currentUserName={currentUser.name}
                  currentUserRole={currentUser.role}
                />
              )}

              {activeModule === 'NON_CONFORMITES' && (
                <NonConformitesView
                  nonConformities={nonConformities}
                  currentUserName={currentUser.name}
                />
              )}

              {activeModule === 'DOSSIERS_LOTS' && (
                <DossiersLotsView
                  finishedBatches={finishedBatches}
                  currentUserName={currentUser.name}
                  currentUserRole={currentUser.role}
                />
              )}

              {activeModule === 'COMMERCIAL' && (
                <CommercialView
                  customers={customers}
                  salesOrders={salesOrders}
                  deliveryNotes={deliveryNotes}
                  invoices={invoices}
                  finishedBatches={finishedBatches}
                  items={items}
                  currentUserName={currentUser.name}
                />
              )}

              {activeModule === 'TRACABILITE' && (
                <TracabiliteView
                  receptions={receptions}
                  workOrders={workOrders}
                  finishedBatches={finishedBatches}
                  deliveryNotes={deliveryNotes}
                  customers={customers}
                />
              )}

              {activeModule === 'STOCKS' && (
                <MagasinsView currentUser={currentUser} />
              )}

              {activeModule === 'MAGASINS' && (
                <MagasinsView currentUser={currentUser} />
              )}

              {activeModule === 'TRANSFERTS' && (
                <TransfertsView currentUser={currentUser} />
              )}

              {activeModule === 'MAINTENANCE' && (
                <MaintenanceView equipments={equipments} currentUserName={currentUser.name} />
              )}

              {activeModule === 'AUDIT_ADMIN' && (
                <AuditAdminView
                  auditLogs={auditLogs}
                  currentUser={currentUser}
                />
              )}

              {activeModule === 'USER_MANAGER' && (
                <UserManagerView currentUser={currentUser} />
              )}
            </Suspense>
          </div>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
