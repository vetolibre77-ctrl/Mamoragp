/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * MAMORA GP — Module USER MANAGER
 * Gestion centralisée des utilisateurs, rôles et permissions
 */

import React, { useMemo, useState, useCallback } from 'react';
import {
  User,
  Role,
  AuditLogEntry,
  UserRole,
  getRoleLabel,
  PERMISSION_FAMILIES,
  UserManagerPermission,
} from '../../types';
import { storage } from '../../services/storage';
import { Modal } from '../../components/common/Modal';
import {
  Users,
  Shield,
  KeyRound,
  Search,
  Plus,
  Edit2,
  Lock,
  Unlock,
  Trash2,
  Eye,
  X,
  Check,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Activity,
  Clock,
  FileText,
} from 'lucide-react';

interface UserManagerViewProps {
  currentUser: User;
}

type UserManagerTab = 'DASHBOARD' | 'USERS' | 'ROLES' | 'PERMISSIONS' | 'SESSIONS' | 'AUDIT';

// Les familles configurables sont déclarées dans types/index.ts (PERMISSION_FAMILIES) :
// la même liste initialise les rôles au démarrage de la base.
const ALL_PERMISSION_MODULES: Array<{
  key: string;
  label: string;
  permissions: Record<string, string>;
}> = PERMISSION_FAMILIES.map(family => ({
  key: family.key,
  label: family.label,
  permissions: family.permissions,
}));

const cardCls =
  'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm';
const btnPrimary =
  'inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors';
const btnSecondary =
  'inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors';
const btnDanger =
  'inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-xs font-medium rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors';
const inputCls =
  'w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500';
const thCls =
  'px-3 py-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider';
const tdCls = 'px-3 py-2 text-xs text-slate-700 dark:text-slate-300';

export const UserManagerView: React.FC<UserManagerViewProps> = ({ currentUser }) => {
  const [revision, setRevision] = useState(0);
  const [activeTab, setActiveTab] = useState<UserManagerTab>('DASHBOARD');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const refresh = useCallback(() => setRevision(r => r + 1), []);

  const users = useMemo(() => storage.getUsers(), [revision]);
  const roles = useMemo(() => storage.getRoles(), [revision]);
  const auditLogs = useMemo(() => storage.getAuditLogs(), [revision]);

  const canCreate = storage.hasPermission(currentUser, 'USER_MANAGER_CREATE');
  const canEdit = storage.hasPermission(currentUser, 'USER_MANAGER_EDIT');
  const canDelete = storage.hasPermission(currentUser, 'USER_MANAGER_DELETE');
  const canManageRoles = storage.hasPermission(currentUser, 'USER_MANAGER_MANAGE_ROLES');
  const canManagePerms = storage.hasPermission(currentUser, 'USER_MANAGER_MANAGE_PERMISSIONS');
  const canViewAudit = storage.hasPermission(currentUser, 'USER_MANAGER_VIEW_AUDIT');

  const showNotice = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(''), 4000);
  };

  // ==================== DASHBOARD ====================
  const Dashboard = () => {
    const activeCount = users.filter(u => u.status === 'ACTIF').length;
    const inactiveCount = users.filter(u => u.status === 'INACTIF').length;
    const suspendedCount = users.filter(u => u.status === 'SUSPENDU').length;
    const lockedCount = users.filter(u => u.lockedUntil && new Date(u.lockedUntil) > new Date()).length;
    const todayLogins = auditLogs.filter(
      l => l.action === 'LOGIN' && l.timestamp >= new Date().toISOString().slice(0, 10)
    ).length;

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className={`${cardCls} p-4`}>
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-blue-500" />
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Utilisateurs</span>
            </div>
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{users.length}</div>
          </div>
          <div className={`${cardCls} p-4`}>
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-emerald-500" />
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Actifs</span>
            </div>
            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{activeCount}</div>
          </div>
          <div className={`${cardCls} p-4`}>
            <div className="flex items-center gap-2 mb-1">
              <Lock className="w-4 h-4 text-amber-500" />
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Verrouillés</span>
            </div>
            <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">{lockedCount}</div>
          </div>
          <div className={`${cardCls} p-4`}>
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-purple-500" />
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Connexions aujourd'hui</span>
            </div>
            <div className="text-2xl font-bold text-purple-700 dark:text-purple-400">{todayLogins}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className={`${cardCls} p-4`}>
            <h3 className="text-sm font-semibold mb-3">Répartition par rôle</h3>
            <div className="space-y-2">
              {Object.entries(
                users.reduce((acc, u) => {
                  acc[u.role] = (acc[u.role] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>)
              )
                .sort((a, b) => b[1] - a[1])
                .map(([role, count]) => (
                  <div key={role} className="flex items-center justify-between">
                    <span className="text-xs text-slate-600 dark:text-slate-400">{getRoleLabel(role as UserRole)}</span>
                    <span className="text-xs font-mono font-medium">{count}</span>
                  </div>
                ))}
            </div>
          </div>
          <div className={`${cardCls} p-4`}>
            <h3 className="text-sm font-semibold mb-3">Dernières activités</h3>
            <div className="space-y-2 max-h-60 overflow-auto">
              {auditLogs.slice(0, 10).map(log => (
                <div key={log.id} className="flex items-start gap-2 text-xs">
                  <span className="text-slate-400 whitespace-nowrap">{log.timestamp.slice(11, 16)}</span>
                  <span className="font-medium">{log.userName}</span>
                  <span className="text-slate-500">{log.action}</span>
                  <span className="text-slate-400 truncate">{log.entity}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ==================== USERS ====================
  const UsersSection = () => {
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [roleFilter, setRoleFilter] = useState<string>('');
    const [modalOpen, setModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);

    const filtered = users.filter(u => {
      const needle = search.trim().toLowerCase();
      const matchesSearch =
        !needle ||
        u.name.toLowerCase().includes(needle) ||
        u.username.toLowerCase().includes(needle) ||
        u.email.toLowerCase().includes(needle) ||
        u.department.toLowerCase().includes(needle);
      const matchesStatus = !statusFilter || u.status === statusFilter;
      const matchesRole = !roleFilter || u.role === roleFilter;
      return matchesSearch && matchesStatus && matchesRole;
    });

    const openCreate = () => {
      setEditingUser(null);
      setModalOpen(true);
    };

    const openEdit = (user: User) => {
      setEditingUser(user);
      setModalOpen(true);
    };

    const toggleStatus = (user: User) => {
      try {
        if (user.status === 'ACTIF') {
          storage.deactivateUser(user.id);
          showNotice(`Compte de ${user.name} désactivé.`);
        } else {
          storage.activateUser(user.id);
          showNotice(`Compte de ${user.name} réactivé.`);
        }
        refresh();
      } catch (e: any) {
        setError(e.message);
      }
    };

    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher un utilisateur..."
              className={`${inputCls} pl-8`}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select className={inputCls} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">Tous les statuts</option>
            <option value="ACTIF">Actif</option>
            <option value="INACTIF">Inactif</option>
            <option value="SUSPENDU">Suspendu</option>
          </select>
          <select className={inputCls} value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
            <option value="">Tous les rôles</option>
            {roles.map(r => (
              <option key={r.roleKey} value={r.roleKey}>
                {r.name}
              </option>
            ))}
          </select>
          {canCreate && (
            <button className={btnPrimary} onClick={openCreate}>
              <Plus className="w-3.5 h-3.5" />
              Nouvel utilisateur
            </button>
          )}
        </div>

        <div className={`${cardCls} overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/60">
                <tr>
                  <th className={thCls}>Utilisateur</th>
                  <th className={thCls}>Rôle</th>
                  <th className={thCls}>Service</th>
                  <th className={thCls}>Statut</th>
                  <th className={thCls}>Dernière connexion</th>
                  <th className={`${thCls} text-right`}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map(user => (
                  <tr key={user.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className={tdCls}>
                      <div className="font-medium">{user.name}</div>
                      <div className="text-[10px] text-slate-500">{user.username}</div>
                    </td>
                    <td className={tdCls}>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {getRoleLabel(user.role)}
                      </span>
                    </td>
                    <td className={tdCls}>{user.department}</td>
                    <td className={tdCls}>
                      <StatusBadge status={user.status} />
                    </td>
                    <td className={tdCls}>
                      {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('fr-FR') : '—'}
                    </td>
                    <td className={`${tdCls} text-right`}>
                      <div className="flex items-center justify-end gap-1">
                        {canEdit && (
                          <button className={btnSecondary} onClick={() => openEdit(user)} title="Modifier">
                            <Edit2 className="w-3 h-3" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            className={user.status === 'ACTIF' ? btnDanger : btnSecondary}
                            onClick={() => toggleStatus(user)}
                            title={user.status === 'ACTIF' ? 'Désactiver' : 'Réactiver'}
                          >
                            {user.status === 'ACTIF' ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <UserFormModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          user={editingUser}
          roles={roles}
          onSaved={() => {
            setModalOpen(false);
            refresh();
            showNotice(editingUser ? 'Utilisateur modifié.' : 'Utilisateur créé.');
          }}
        />
      </div>
    );
  };

  // ==================== ROLES ====================
  const RolesSection = () => {
    const [modalOpen, setModalOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<Role | null>(null);

    return (
      <div className="space-y-3">
        <div className="flex justify-end">
          {canManageRoles && (
            <button
              className={btnPrimary}
              onClick={() => {
                setEditingRole(null);
                setModalOpen(true);
              }}
            >
              <Plus className="w-3.5 h-3.5" />
              Nouveau rôle
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {roles.map(role => (
            <div key={role.id} className={`${cardCls} p-4`}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="text-sm font-semibold">{role.name}</h4>
                  <p className="text-[10px] text-slate-500">{role.roleKey}</p>
                </div>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded ${
                    role.isActive
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {role.isActive ? 'Actif' : 'Inactif'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mb-3">{role.description}</p>
              <div className="text-[10px] text-slate-500 mb-3">
                {role.permissions.length} permission(s)
              </div>
              {canManageRoles && (
                <div className="flex gap-2">
                  <button
                    className={btnSecondary}
                    onClick={() => {
                      setEditingRole(role);
                      setModalOpen(true);
                    }}
                  >
                    <Edit2 className="w-3 h-3" />
                    Modifier
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        <RoleFormModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          role={editingRole}
          onSaved={() => {
            setModalOpen(false);
            refresh();
          }}
        />
      </div>
    );
  };

  // ==================== PERMISSIONS ====================
  const PermissionsSection = () => {
    const [selectedRole, setSelectedRole] = useState<Role | null>(roles[0] || null);

    const togglePermission = (perm: string) => {
      if (!selectedRole || !canManagePerms) return;
      const has = selectedRole.permissions.includes(perm);
      const updated = has ? selectedRole.permissions.filter(p => p !== perm) : [...selectedRole.permissions, perm];
      try {
        storage.updateRole(selectedRole.id, { permissions: updated });
        refresh();
        setSelectedRole(prev => (prev ? { ...prev, permissions: updated } : null));
      } catch (e: any) {
        setError(e.message);
      }
    };

    const toggleAll = (modulePerms: string[], checked: boolean) => {
      if (!selectedRole || !canManagePerms) return;
      const base = selectedRole.permissions.filter(p => !modulePerms.includes(p));
      const updated = checked ? [...base, ...modulePerms] : base;
      try {
        storage.updateRole(selectedRole.id, { permissions: updated });
        refresh();
        setSelectedRole(prev => (prev ? { ...prev, permissions: updated } : null));
      } catch (e: any) {
        setError(e.message);
      }
    };

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Rôle :</span>
          <select
            className={inputCls}
            value={selectedRole?.id || ''}
            onChange={e => setSelectedRole(roles.find(r => r.id === e.target.value) || null)}
          >
            {roles.map(r => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>

        {selectedRole && (
          <div className="space-y-4">
            {ALL_PERMISSION_MODULES.map(mod => {
              const perms = Object.entries(mod.permissions);
              const allChecked = perms.every(([key]) => selectedRole.permissions.includes(key));
              const someChecked = perms.some(([key]) => selectedRole.permissions.includes(key)) && !allChecked;
              return (
                <div key={mod.key} className={`${cardCls} p-4`}>
                  <div className="flex items-center gap-2 mb-3">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      checked={allChecked}
                      ref={el => {
                        if (el) el.indeterminate = someChecked;
                      }}
                      onChange={e => toggleAll(perms.map(([k]) => k), e.target.checked)}
                      disabled={!canManagePerms}
                    />
                    <h4 className="text-sm font-semibold">{mod.label}</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {perms.map(([key, label]) => (
                      <label key={key} className="flex items-center gap-2 text-xs cursor-pointer">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          checked={selectedRole.permissions.includes(key)}
                          onChange={() => togglePermission(key)}
                          disabled={!canManagePerms}
                        />
                        <span className="text-slate-700 dark:text-slate-300">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // ==================== AUDIT ====================
  const AuditSection = () => {
    const [search, setSearch] = useState('');
    const securityActions: AuditLogEntry['action'][] = [
      'LOGIN', 'LOGOUT', 'FAILED_LOGIN', 'PASSWORD_RESET', 'BLOCK',
      'USER_CREATED', 'USER_UPDATED', 'USER_DEACTIVATED',
      'ROLE_CREATED', 'ROLE_UPDATED', 'PERMISSION_CHANGED',
      'SESSION_EXPIRED', 'SESSION_REVOKED',
    ];
    const filtered = auditLogs.filter(
      l =>
        securityActions.includes(l.action) &&
        (!search ||
          l.userName.toLowerCase().includes(search.toLowerCase()) ||
          l.action.toLowerCase().includes(search.toLowerCase()) ||
          (l.newValues && l.newValues.toLowerCase().includes(search.toLowerCase())))
    );

    return (
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Filtrer l'audit de sécurité..."
            className={`${inputCls} pl-8`}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className={`${cardCls} overflow-hidden`}>
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/60 sticky top-0">
                <tr>
                  <th className={thCls}>Date</th>
                  <th className={thCls}>Utilisateur</th>
                  <th className={thCls}>Action</th>
                  <th className={thCls}>Entité</th>
                  <th className={thCls}>Détail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map(log => (
                  <tr key={log.id}>
                    <td className={`${tdCls} whitespace-nowrap`}>{new Date(log.timestamp).toLocaleString('fr-FR')}</td>
                    <td className={tdCls}>
                      {log.userName}
                      <span className="text-[10px] text-slate-500 block">{getRoleLabel(log.userRole)}</span>
                    </td>
                    <td className={tdCls}>
                      <AuditActionBadge action={log.action} />
                    </td>
                    <td className={tdCls}>{log.entity}</td>
                    <td className={`${tdCls} max-w-xs truncate`} title={log.newValues}>
                      {log.newValues}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {notice && (
        <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-xs rounded-lg">
          <Check className="w-3.5 h-3.5" />
          {notice}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-xs rounded-lg">
          <AlertTriangle className="w-3.5 h-3.5" />
          {error}
          <button className="ml-auto" onClick={() => setError('')}>
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-lg w-fit">
        {(
          [
            { id: 'DASHBOARD' as UserManagerTab, label: 'Tableau de bord', icon: Activity },
            { id: 'USERS' as UserManagerTab, label: 'Utilisateurs', icon: Users },
            { id: 'ROLES' as UserManagerTab, label: 'Rôles', icon: Shield },
            { id: 'PERMISSIONS' as UserManagerTab, label: 'Permissions', icon: KeyRound },
            { id: 'AUDIT' as UserManagerTab, label: 'Audit sécurité', icon: FileText },
          ] as const
        ).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === tab.id
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'DASHBOARD' && <Dashboard />}
      {activeTab === 'USERS' && <UsersSection />}
      {activeTab === 'ROLES' && <RolesSection />}
      {activeTab === 'PERMISSIONS' && <PermissionsSection />}
      {activeTab === 'AUDIT' && canViewAudit && <AuditSection />}
    </div>
  );
};

// ==================== SUB-COMPONENTS ====================

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    ACTIF: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400',
    INACTIF: 'bg-slate-100 text-slate-500',
    SUSPENDU: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
  };
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${map[status] || map.INACTIF}`}>
      {status}
    </span>
  );
}

function AuditActionBadge({ action }: { action: AuditLogEntry['action'] }) {
  const map: Partial<Record<AuditLogEntry['action'], string>> = {
    LOGIN: 'bg-emerald-50 text-emerald-700',
    LOGOUT: 'bg-slate-100 text-slate-500',
    FAILED_LOGIN: 'bg-red-50 text-red-700',
    BLOCK: 'bg-red-50 text-red-700',
    PASSWORD_RESET: 'bg-blue-50 text-blue-700',
    USER_CREATED: 'bg-emerald-50 text-emerald-700',
    USER_DEACTIVATED: 'bg-amber-50 text-amber-700',
    SESSION_EXPIRED: 'bg-purple-50 text-purple-700',
  };
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${map[action] || 'bg-slate-100 text-slate-500'}`}>
      {action}
    </span>
  );
}

function UserFormModal({
  isOpen,
  onClose,
  user,
  roles,
  onSaved,
}: {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  roles: Role[];
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: user?.name || '',
    username: user?.username || '',
    email: user?.email || '',
    role: user?.role || ('ADMIN' as UserRole),
    badgeNumber: user?.badgeNumber || '',
    department: user?.department || '',
    function: user?.function || '',
    phone: user?.phone || '',
    password: '',
  });
  const [error, setError] = useState('');

  const submit = () => {
    try {
      if (!form.name.trim() || !form.username.trim()) {
        throw new Error('Le nom et le nom d\'utilisateur sont obligatoires.');
      }
      if (user) {
        const updates: any = { ...form };
        if (!updates.password) delete updates.password;
        storage.updateUser(user.id, updates);
      } else {
        storage.addUser({
          ...form,
          status: 'ACTIF',
          assignedWarehouseIds: [],
        });
      }
      onSaved();
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={user ? 'Modifier un utilisateur' : 'Nouvel utilisateur'} maxWidth="lg">
      <div className="space-y-3">
        {error && (
          <div className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-700 text-xs rounded-lg">
            <AlertTriangle className="w-3.5 h-3.5" />
            {error}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-1">Nom complet *</label>
            <input className={inputCls} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-1">Nom d'utilisateur *</label>
            <input className={inputCls} value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-1">Email</label>
            <input className={inputCls} type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-1">Rôle *</label>
            <select className={inputCls} value={form.role} onChange={e => setForm({ ...form, role: e.target.value as UserRole })}>
              {roles.filter(r => r.isActive).map(r => (
                <option key={r.roleKey} value={r.roleKey}>{r.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-1">Matricule</label>
            <input className={inputCls} value={form.badgeNumber} onChange={e => setForm({ ...form, badgeNumber: e.target.value })} />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-1">Service</label>
            <input className={inputCls} value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-1">Fonction</label>
            <input className={inputCls} value={form.function} onChange={e => setForm({ ...form, function: e.target.value })} />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-1">Téléphone</label>
            <input className={inputCls} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="col-span-2">
            <label className="block text-[10px] font-semibold text-slate-500 mb-1">
              {user ? 'Nouveau code PIN (laisser vide pour ne pas changer)' : 'Code PIN initial'}
            </label>
            <input
              className={inputCls}
              type="password"
              placeholder={user ? '••••' : '4 à 8 chiffres'}
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button className={btnSecondary} onClick={onClose}>Annuler</button>
          <button className={btnPrimary} onClick={submit}>
            <Check className="w-3.5 h-3.5" />
            {user ? 'Enregistrer' : 'Créer'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function RoleFormModal({
  isOpen,
  onClose,
  role,
  onSaved,
}: {
  isOpen: boolean;
  onClose: () => void;
  role: Role | null;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: role?.name || '',
    roleKey: role?.roleKey || ('OPERATEUR' as UserRole),
    description: role?.description || '',
    isActive: role?.isActive ?? true,
  });
  const [error, setError] = useState('');

  const submit = () => {
    try {
      if (!form.name.trim()) throw new Error('Le nom du rôle est obligatoire.');
      if (role) {
        storage.updateRole(role.id, form);
      } else {
        storage.addRole({
          ...form,
          roleKey: form.roleKey,
          permissions: [],
        });
      }
      onSaved();
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={role ? 'Modifier un rôle' : 'Nouveau rôle'} maxWidth="md">
      <div className="space-y-3">
        {error && (
          <div className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-700 text-xs rounded-lg">
            <AlertTriangle className="w-3.5 h-3.5" />
            {error}
          </div>
        )}
        <div>
          <label className="block text-[10px] font-semibold text-slate-500 mb-1">Nom du rôle *</label>
          <input className={inputCls} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        </div>
        {!role && (
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-1">Clé technique *</label>
            <select className={inputCls} value={form.roleKey} onChange={e => setForm({ ...form, roleKey: e.target.value as UserRole })}>
              {(['ADMIN','DIRECTEUR_USINE','RESPONSABLE_PRODUCTION','RESPONSABLE_QUALITE','CHEF_DE_LIGNE','OPERATEUR','MAGASINIER','RESPONSABLE_COMMERCIAL','RESPONSABLE_MAINTENANCE','TECHNICIEN_LABO','AUDITEUR_EXTERNE'] as UserRole[]).map(r => (
                <option key={r} value={r}>{getRoleLabel(r)}</option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="block text-[10px] font-semibold text-slate-500 mb-1">Description</label>
          <textarea className={inputCls} rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
        </div>
        <label className="flex items-center gap-2 text-xs">
          <input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} />
          Rôle actif
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <button className={btnSecondary} onClick={onClose}>Annuler</button>
          <button className={btnPrimary} onClick={submit}>
            <Check className="w-3.5 h-3.5" />
            {role ? 'Enregistrer' : 'Créer'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
