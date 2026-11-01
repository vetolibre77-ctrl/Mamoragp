/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * MAMORA GP — Écran de connexion au poste
 * Sélection du profil + code PIN de session, enrôlement à la première connexion,
 * réinitialisation par un administrateur habilité
 */

import React, { useState } from 'react';
import { Fish, Lock, LogIn, KeyRound, ArrowLeft, ShieldAlert } from 'lucide-react';
import { storage } from '../../services/storage';
import { getRoleLabel } from '../../types';

interface LoginViewProps {
  onAuthenticated: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onAuthenticated }) => {
  const users = storage.getUsers().filter(u => u.status === 'ACTIF');
  const resetAdministrators = storage.getPINResetAdministrators();

  const [selectedUserId, setSelectedUserId] = useState(users[0]?.id ?? '');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [adminId, setAdminId] = useState(resetAdministrators[0]?.id ?? '');
  const [adminPin, setAdminPin] = useState('');

  const selectedUser = users.find(u => u.id === selectedUserId);
  const needsEnrollment = Boolean(selectedUser) && !storage.hasPin(selectedUserId);
  const administrators = recoveryOpen
    ? resetAdministrators
    : resetAdministrators.filter(admin => admin.id !== selectedUserId);

  const resetFields = () => {
    setPin('');
    setConfirmPin('');
    setAdminPin('');
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (needsEnrollment) {
        storage.enrollPin(selectedUserId, pin, confirmPin);
      } else {
        storage.login(selectedUserId, pin);
      }
      onAuthenticated();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleResetByAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      storage.resetPinByAdmin(adminId, adminPin, selectedUserId);
      setRecoveryOpen(false);
      resetFields();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="flex items-center justify-center h-screen w-screen overflow-y-auto bg-slate-900 p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* En-tête marque */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-600 text-white shrink-0 shadow-xs">
            <Fish className="w-6 h-6" />
          </div>
          <div className="overflow-hidden">
            <h1 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white uppercase whitespace-nowrap">
              MAMORA GP
            </h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate">
              GPAO Thon &amp; Sardines · ISO 22000
            </p>
          </div>
        </div>

        <div className="px-6 py-5">
          <div className="flex items-center gap-2 mb-4 text-slate-700 dark:text-slate-200">
            <Lock className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-semibold">
              {recoveryOpen ? 'Réinitialisation du code PIN' : 'Connexion au poste de travail'}
            </h2>
          </div>

          {error && (
            <div className="flex items-start gap-2 mb-4 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {!recoveryOpen ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Profil utilisateur
                </label>
                <select
                  value={selectedUserId}
                  onChange={e => {
                    setSelectedUserId(e.target.value);
                    resetFields();
                  }}
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.name} — {getRoleLabel(user.role)}
                    </option>
                  ))}
                </select>
                {selectedUser && (
                  <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                    Matricule {selectedUser.badgeNumber} · {selectedUser.department}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Code PIN {needsEnrollment ? '(première connexion : à définir)' : ''}
                </label>
                <input
                  type="password"
                  value={pin}
                  onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
                  inputMode="numeric"
                  autoComplete="current-password"
                  maxLength={8}
                  autoFocus
                  placeholder="••••"
                  className="w-full px-3 py-2 text-sm tracking-[0.4em] border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {needsEnrollment && (
                <>
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                      Confirmation du code PIN
                    </label>
                    <input
                      type="password"
                      value={confirmPin}
                      onChange={e => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                      inputMode="numeric"
                      autoComplete="new-password"
                      maxLength={8}
                      placeholder="••••"
                      className="w-full px-3 py-2 text-sm tracking-[0.4em] border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <p className="text-[11px] text-amber-700 dark:text-amber-400">
                    Ce profil n'a encore aucun code PIN. Il est stocké sous forme d'empreinte salée,
                    jamais en clair. Une réinitialisation par un administrateur sera nécessaire en cas d'oubli.
                  </p>
                </>
              )}

              <button
                type="submit"
                disabled={!selectedUser}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-slate-400 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                {needsEnrollment ? 'Définir le code PIN et ouvrir la session' : 'Ouvrir la session'}
              </button>

              <div className="pt-1 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setRecoveryOpen(true);
                    resetFields();
                    setAdminId(resetAdministrators.find(a => a.id !== selectedUserId)?.id ?? '');
                  }}
                  className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  Code PIN oublié ?
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleResetByAdmin} className="space-y-4">
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Un administrateur habilité s'authentifie pour effacer le code PIN de{' '}
                <strong className="text-slate-700 dark:text-slate-200">
                  {selectedUser ? selectedUser.name : 'ce profil'}
                </strong>
                . Le profil devra ensuite définir un nouveau code à sa prochaine connexion.
              </p>

              {administrators.length === 0 ? (
                <p className="text-[11px] text-amber-700 dark:text-amber-400">
                  Aucun autre administrateur habilité n'a encore de code PIN enregistré : la réinitialisation
                  est indisponible tant qu'un profil administrateur n'a pas effectué sa première connexion.
                </p>
              ) : (
                <>
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                      Administrateur habilité
                    </label>
                    <select
                      value={adminId}
                      onChange={e => setAdminId(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    >
                      {administrators.map(admin => (
                        <option key={admin.id} value={admin.id}>
                          {admin.name} — {getRoleLabel(admin.role)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                      Code PIN de l'administrateur
                    </label>
                    <input
                      type="password"
                      value={adminPin}
                      onChange={e => setAdminPin(e.target.value.replace(/\D/g, ''))}
                      inputMode="numeric"
                      autoComplete="current-password"
                      maxLength={8}
                      autoFocus
                      placeholder="••••"
                      className="w-full px-3 py-2 text-sm tracking-[0.4em] border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <KeyRound className="w-4 h-4" />
                    Réinitialiser le code PIN
                  </button>
                </>
              )}

              <div className="pt-1 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setRecoveryOpen(false);
                    resetFields();
                  }}
                  className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Retour à la connexion
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
