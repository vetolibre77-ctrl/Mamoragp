/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * MAMORA GP — Journal d'Audit Légal, Sauvegardes & Déploiement Windows
 * Conforme ISO 22000 § 7.5 (Maîtrise des Informations Documentées & Immuabilité)
 */

import React, { useState } from 'react';
import { AuditLogEntry, User, AUDIT_PERMISSION_LABELS, AuditPermission } from '../../types';
import { storage } from '../../services/storage';
import {
  FileSpreadsheet,
  Download,
  Upload,
  RotateCcw,
  Server,
  ShieldCheck,
  Search,
  CheckCircle,
  AlertTriangle,
  Database,
  Terminal,
  Lock,
} from 'lucide-react';

interface AuditAdminViewProps {
  auditLogs: AuditLogEntry[];
  currentUser: User;
}

export const AuditAdminView: React.FC<AuditAdminViewProps> = ({ auditLogs, currentUser }) => {
  const [activeTab, setActiveTab] = useState<'AUDIT' | 'BACKUP' | 'WINDOWS_DEPLOY'>('AUDIT');
  const [searchTerm, setSearchTerm] = useState('');
  const [restoreStatus, setRestoreStatus] = useState<string>('');
  const [restoreError, setRestoreError] = useState<string>('');

  const can = (permission: AuditPermission) => storage.hasPermission(currentUser, permission);
  const canViewAudit = can('AUDIT_VIEW');
  const canExportBackup = can('BACKUP_EXPORT');
  const canImportBackup = can('BACKUP_IMPORT');
  const canResetDatabase = can('DATABASE_RESET');
  const canExportSql = can('SQL_DUMP_EXPORT');

  const filteredLogs = auditLogs.filter(log => {
    return (
      log.entity.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.newValues && log.newValues.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  });

  const fail = (err: unknown) => {
    setRestoreStatus('');
    setRestoreError(err instanceof Error ? err.message : String(err));
  };

  const handleDownloadJsonBackup = () => {
    try {
      const jsonStr = storage.exportJsonDatabase();
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `MAMORA_GP_BACKUP_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setRestoreError('');
    } catch (err) {
      fail(err);
    }
  };

  const handleDownloadPostgreSqlDump = () => {
    try {
      const sqlDump = storage.generatePostgresSqlDump();
      const blob = new Blob([sqlDump], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mamora_gp_windows_server_${new Date().toISOString().slice(0, 10)}.sql`;
      a.click();
      URL.revokeObjectURL(url);
      setRestoreError('');
    } catch (err) {
      fail(err);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = evt => {
      const content = evt.target?.result as string;
      if (!content) return;
      try {
        if (storage.importJsonDatabase(content)) {
          setRestoreError('');
          setRestoreStatus('Restauration de la base de données réussie avec succès.');
        } else {
          setRestoreStatus('');
          setRestoreError('Échec de la restauration : fichier de sauvegarde non conforme.');
        }
      } catch (err) {
        fail(err);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleResetFactory = () => {
    if (!window.confirm('Voulez-vous vraiment réinitialiser toutes les données aux valeurs d\'usine de démonstration ?')) {
      return;
    }
    try {
      storage.resetToFactoryDefault();
      setRestoreError('');
      setRestoreStatus('Données réinitialisées aux paramètres d\'usine. La session a été fermée : chaque profil doit redéfinir son code PIN.');
    } catch (err) {
      fail(err);
    }
  };

  /** Bandeau d'habilitation affiché sous une action réservée à d'autres profils. */
  const deniedNote = (permission: AuditPermission) => (
    <p className="flex items-start gap-1.5 text-[11px] text-red-700 dark:text-red-400">
      <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5" />
      <span>Action réservée aux profils disposant de la permission « {AUDIT_PERMISSION_LABELS[permission]} ».</span>
    </p>
  );

  const disabledBtnCls =
    'w-full py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-400 dark:text-slate-500 cursor-not-allowed';

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-blue-600" />
            <span>Sécurité, Journal d'Audit Légal &amp; Déploiement Serveur</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Registre inviolable des événements (ISO 22000 § 7.5), sauvegardes et exportateur PostgreSQL pour le serveur Windows
          </p>
        </div>

        <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs">
          <button
            onClick={() => setActiveTab('AUDIT')}
            className={`px-3 py-1.5 font-semibold rounded-md transition-colors cursor-pointer ${
              activeTab === 'AUDIT'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            Journal d'Audit ({auditLogs.length})
          </button>
          <button
            onClick={() => setActiveTab('BACKUP')}
            className={`px-3 py-1.5 font-semibold rounded-md transition-colors cursor-pointer ${
              activeTab === 'BACKUP'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            Sauvegardes &amp; Restauration
          </button>
          <button
            onClick={() => setActiveTab('WINDOWS_DEPLOY')}
            className={`px-3 py-1.5 font-semibold rounded-md transition-colors cursor-pointer ${
              activeTab === 'WINDOWS_DEPLOY'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-blue-600 dark:text-blue-400 font-bold'
            }`}
          >
            Déploiement Windows LAN
          </button>
        </div>
      </div>

      {restoreStatus && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{restoreStatus}</span>
        </div>
      )}

      {restoreError && (
        <div className="p-4 bg-red-50 dark:bg-red-950/40 rounded-xl border border-red-300 dark:border-red-800 text-red-800 dark:text-red-300 text-xs flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{restoreError}</span>
        </div>
      )}

      {activeTab === 'AUDIT' && !canViewAudit && (
        <div className="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-950 flex items-center justify-center text-red-600 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Journal d'audit non accessible
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Le profil {currentUser.name} ({currentUser.role}) ne dispose pas de la permission
                « {AUDIT_PERMISSION_LABELS.AUDIT_VIEW} ». Toute tentative d'accès est journalisée.
              </p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'AUDIT' && canViewAudit && (
        /* VUE JOURNAL D'AUDIT LÉGAL IMMUABLE */
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Filtrer les événements d'audit par utilisateur, entité, action..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full text-xs bg-transparent focus:outline-hidden"
            />
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-slate-500 font-semibold">
                  <tr>
                    <th className="py-3 px-4">Horodatage Serveur</th>
                    <th className="py-3 px-4">Utilisateur</th>
                    <th className="py-3 px-4">Rôle</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Entité / N° Réf</th>
                    <th className="py-3 px-4">Détails de l'Opération</th>
                    <th className="py-3 px-4">Motif / Justification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {filteredLogs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                      <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                        {new Date(log.timestamp).toLocaleString('fr-FR')}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                        {log.userName}
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-[11px] font-mono">
                        {log.userRole}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded ${
                            log.action === 'RELEASE'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : log.action === 'BLOCK' || log.action === 'QUARANTINE'
                              ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                              : log.action === 'VALIDATE'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                        {log.entity} #{log.entityId}
                      </td>
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-300 truncate max-w-72">
                        {log.newValues || '-'}
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-[11px] truncate max-w-48">
                        {log.motive || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'BACKUP' && (
        /* VUE SAUVEGARDES & RESTAURATION */
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {/* Télécharger Sauvegarde */}
            <div className="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-blue-600">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Sauvegarde Instantanée (JSON)
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Exporte l'intégralité des référentiels, ordres, réceptions, contrôles et journal d'audit dans un fichier horodaté vérifiable.
                </p>
              </div>
              {canExportBackup ? (
                <button
                  onClick={handleDownloadJsonBackup}
                  className="w-full py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  Télécharger Sauvegarde JSON
                </button>
              ) : (
                <>
                  <button type="button" disabled className={disabledBtnCls}>
                    Télécharger Sauvegarde JSON
                  </button>
                  {deniedNote('BACKUP_EXPORT')}
                </>
              )}
            </div>

            {/* Restaurer Sauvegarde */}
            <div className="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Restauration de Base
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Injecte une sauvegarde préalablement vérifiée. Le système contrôle l'intégrité de la structure avant d'écraser l'état actuel.
                </p>
              </div>
              {canImportBackup ? (
                <label className="block w-full py-2 text-xs font-semibold text-center text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 rounded-lg border border-emerald-200 dark:border-emerald-800 transition-colors cursor-pointer">
                  <span>Importer Fichier JSON</span>
                  <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
                </label>
              ) : (
                <>
                  <div className={disabledBtnCls}>Importer Fichier JSON</div>
                  {deniedNote('BACKUP_IMPORT')}
                </>
              )}
            </div>

            {/* Réinitialisation d'Usine Propre */}
            <div className="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Réinitialisation à Zéro (Production Propre)
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Réinitialise la base à zéro (stocks à 0, sans données fictives), avec les nomenclatures techniques et comptes utilisateurs prêts pour la production réelle.
                </p>
              </div>
              {canResetDatabase ? (
                <button
                  onClick={handleResetFactory}
                  className="w-full py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                >
                  Réinitialiser la Base à Zéro
                </button>
              ) : (
                <>
                  <button type="button" disabled className={disabledBtnCls}>
                    Réinitialiser la Base à Zéro
                  </button>
                  {deniedNote('DATABASE_RESET')}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'WINDOWS_DEPLOY' && (
        /* VUE GUIDE DE DÉPLOIEMENT SERVEUR WINDOWS & SCRIPT SQL */
        <div className="space-y-6">
          <div className="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-blue-600">
                  <Database className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    Déploiement sur Serveur Windows &amp; Base Centrale PostgreSQL
                  </h3>
                  <p className="text-xs text-slate-500">
                    Génération du schéma SQL DDL/DML prêt pour déploiement multi-postes sur le réseau local de l'usine
                  </p>
                </div>
              </div>

              {canExportSql ? (
                <button
                  onClick={handleDownloadPostgreSqlDump}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Télécharger Script SQL PostgreSQL (.sql)</span>
                </button>
              ) : (
                <div className="max-w-sm space-y-1.5">
                  <button
                    type="button"
                    disabled
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-400 dark:text-slate-500 cursor-not-allowed"
                  >
                    <Lock className="w-4 h-4" />
                    <span>Télécharger Script SQL PostgreSQL (.sql)</span>
                  </button>
                  {deniedNote('SQL_DUMP_EXPORT')}
                </div>
              )}
            </div>

            {/* Procédure pas à pas */}
            <div className="space-y-4 text-xs">
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                Procédure d'Installation sur le PC Serveur d'Usine (Windows 10 / 11 / Windows Server)
              </h4>

              <div className="space-y-3">
                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-700 space-y-1.5">
                  <div className="font-bold text-blue-600 dark:text-blue-400">
                    Étape 1 : Installation du Moteur PostgreSQL
                  </div>
                  <p className="text-slate-600 dark:text-slate-300">
                    Installez PostgreSQL 15 ou 16 pour Windows. Dans le fichier <code className="font-mono bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded">postgresql.conf</code>, réglez <code className="font-mono text-emerald-600">listen_addresses = '*'</code>. Dans <code className="font-mono bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded">pg_hba.conf</code>, autorisez le sous-réseau Ethernet d'usine (ex: <code className="font-mono">host all all 192.168.1.0/24 scram-sha-256</code>).
                  </p>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-700 space-y-1.5">
                  <div className="font-bold text-blue-600 dark:text-blue-400">
                    Étape 2 : Exécution du Script DDL / DML
                  </div>
                  <p className="text-slate-600 dark:text-slate-300">
                    Créez la base <code className="font-mono font-bold">mamora_gp_db</code> puis exécutez le script SQL téléchargé via pgAdmin ou l'invite de commande :
                  </p>
                  <pre className="p-2.5 bg-slate-950 text-slate-200 rounded font-mono text-[11px] overflow-x-auto">
                    psql -U postgres -d mamora_gp_db -f mamora_gp_windows_server.sql
                  </pre>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-700 space-y-1.5">
                  <div className="font-bold text-blue-600 dark:text-blue-400">
                    Étape 3 : Démarrage du Service API &amp; Configuration Pare-Feu Windows
                  </div>
                  <p className="text-slate-600 dark:text-slate-300">
                    Sur le serveur Windows, installez l'application Node.js comme service de fond Windows permanent (via NSSM ou PM2 Windows Service). Ouvrez le port 3000 dans le Pare-feu Windows Defender pour le profil "Réseau Privé".
                  </p>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-700 space-y-1.5">
                  <div className="font-bold text-blue-600 dark:text-blue-400">
                    Étape 4 : Déploiement sur les Postes Clients (Atelier &amp; Bureaux)
                  </div>
                  <p className="text-slate-600 dark:text-slate-300">
                    Sur chaque PC d'atelier, ouvrez Microsoft Edge ou Google Chrome à l'adresse <code className="font-mono text-blue-600">http://192.168.1.100:3000</code>. Cliquez sur le bouton "Installer l'application" pour épingler MAMORA GP sur le bureau Windows.
                  </p>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-700 space-y-1.5">
                  <div className="font-bold text-blue-600 dark:text-blue-400">
                    Étape 5 : Sauvegardes Automatiques Planifiées (Tâche Planifiée Windows)
                  </div>
                  <p className="text-slate-600 dark:text-slate-300">
                    Créez une tâche planifiée Windows exécutant quotidiennement à 23h30 le script batch :
                  </p>
                  <pre className="p-2.5 bg-slate-950 text-slate-200 rounded font-mono text-[11px] overflow-x-auto">
                    pg_dump -U postgres -F c -b -v -f "D:\Sauvegardes\mamora_gp_%date:~-4,4%%date:~-7,2%%date:~-10,2%.dump" mamora_gp_db
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
