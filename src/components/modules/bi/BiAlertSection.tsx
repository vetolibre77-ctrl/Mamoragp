/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * MAMORA BI — Alertes : seuils fixes et anomalies statistiques (z-score),
 * historique des événements et acquittement.
 */

import React, { useMemo, useState } from 'react';
import {
  Activity,
  BellRing,
  CheckCircle2,
  Pencil,
  Play,
  Plus,
  Trash2,
  XCircle,
} from 'lucide-react';
import { storage } from '../../../services/storage';
import { BI_MEASURES } from '../../../services/bi/catalog';
import {
  BI_ALERT_OPERATOR_LABELS,
  BI_ALERT_STATUS_LABELS,
  BI_KPI_PERIOD_LABELS,
  BiAlertEvent,
  BiAlertMode,
  BiAlertOperator,
  BiAlertRule,
  BiKpiPeriod,
  User,
} from '../../../types';
import { Modal } from '../../common/Modal';
import {
  EmptyState,
  GdsCard,
  Pill,
  btnDanger,
  btnGhost,
  btnPrimary,
  inputCls,
  labelCls,
  tdCls,
  thCls,
} from '../gds/GdsShared';
import { BiNote, fmtBiNumber } from './BiShared';

const MEASURE_OPTIONS = [
  ...Object.values(BI_MEASURES).map(measure => ({ code: measure.code, label: measure.label })),
  { code: 'STOCK_MOYEN', label: 'Stock moyen (non calculable sans historique)' },
];

const measureLabel = (code: string) =>
  MEASURE_OPTIONS.find(option => option.code === code)?.label ?? code;

interface AlertSectionProps {
  currentUser: User;
  revision: number;
  onNotice: (message: string) => void;
  onError: (message: string) => void;
  onChanged: () => void;
}

interface AlertForm {
  id?: string;
  name: string;
  measureCode: string;
  mode: BiAlertMode;
  operator: BiAlertOperator;
  threshold: string;
  period: BiKpiPeriod;
  lookbackPeriods: number;
  deviationFactor: number;
  recipients: string[];
  isActive: boolean;
}

const emptyForm = (): AlertForm => ({
  name: '',
  measureCode: 'PROD_TOTAL',
  mode: 'THRESHOLD',
  operator: 'GT',
  threshold: '0',
  period: 'CURRENT_MONTH',
  lookbackPeriods: 12,
  deviationFactor: 2,
  recipients: [],
  isActive: true,
});

export const BiAlertSection: React.FC<AlertSectionProps> = ({
  currentUser,
  revision,
  onNotice,
  onError,
  onChanged,
}) => {
  const rules = useMemo(() => {
    try {
      return storage.getBiAlertRules();
    } catch {
      return [];
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revision]);

  const events = useMemo(() => {
    try {
      return storage.getBiAlertEvents();
    } catch {
      return [];
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revision]);

  const users = useMemo(() => storage.getUsers(), []);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<AlertForm>(emptyForm());
  const [formError, setFormError] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | BiAlertEvent['status']>('ALL');

  const canCreate = storage.canBi('BI_KPI_CREATE', currentUser);
  const canEdit = storage.canBi('BI_KPI_EDIT', currentUser);

  const openCreate = () => {
    setForm(emptyForm());
    setFormError('');
    setFormOpen(true);
  };

  const openEdit = (rule: BiAlertRule) => {
    setForm({
      id: rule.id,
      name: rule.name,
      measureCode: rule.measureCode,
      mode: rule.mode ?? 'THRESHOLD',
      operator: rule.operator,
      threshold: String(rule.threshold),
      period: rule.period,
      lookbackPeriods: rule.lookbackPeriods ?? 12,
      deviationFactor: rule.deviationFactor ?? 2,
      recipients: [...rule.recipients],
      isActive: rule.isActive,
    });
    setFormError('');
    setFormOpen(true);
  };

  const submit = () => {
    try {
      const payload = {
        name: form.name,
        measureCode: form.measureCode,
        operator: form.operator,
        threshold: form.mode === 'ANOMALY' ? 0 : Number(form.threshold) || 0,
        period: form.period,
        mode: form.mode,
        lookbackPeriods: form.lookbackPeriods,
        deviationFactor: form.deviationFactor,
        recipients: form.recipients,
        isActive: form.isActive,
      };
      if (form.id) {
        storage.updateBiAlertRule(form.id, payload);
        onNotice(`Alerte « ${form.name} » mise à jour.`);
      } else {
        storage.createBiAlertRule(payload);
        onNotice(`Alerte « ${form.name} » créée.`);
      }
      setFormOpen(false);
      onChanged();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : String(error));
    }
  };

  const toggleRule = (rule: BiAlertRule) => {
    try {
      storage.updateBiAlertRule(rule.id, { isActive: !rule.isActive });
      onChanged();
    } catch (error) {
      onError(error instanceof Error ? error.message : String(error));
    }
  };

  const remove = (rule: BiAlertRule) => {
    try {
      storage.deleteBiAlertRule(rule.id);
      onNotice(`Alerte « ${rule.name} » supprimée.`);
      onChanged();
    } catch (error) {
      onError(error instanceof Error ? error.message : String(error));
    }
  };

  const evaluate = () => {
    try {
      const created = storage.evaluateBiAlerts();
      onNotice(
        created.length === 0
          ? 'Évaluation terminée : aucune nouvelle alerte déclenchée.'
          : `${created.length} nouvelle(s) alerte(s) détectée(s).`
      );
      onChanged();
    } catch (error) {
      onError(error instanceof Error ? error.message : String(error));
    }
  };

  const acknowledge = (event: BiAlertEvent, status: BiAlertEvent['status']) => {
    try {
      storage.acknowledgeBiAlertEvent(event.id, status);
      onChanged();
    } catch (error) {
      onError(error instanceof Error ? error.message : String(error));
    }
  };

  const filteredEvents = events.filter(event => statusFilter === 'ALL' || event.status === statusFilter);

  return (
    <div className="space-y-3">
      <GdsCard
        title="Règles d’alerte"
        subtitle="Seuils fixes et anomalies statistiques calculés sur les mesures réelles du catalogue."
        actions={
          <div className="flex flex-wrap items-center gap-1.5">
            <button type="button" className={btnPrimary} onClick={evaluate}>
              <Play className="w-3.5 h-3.5" /> Évaluer maintenant
            </button>
            {canCreate && (
              <button type="button" className={btnGhost} onClick={openCreate}>
                <Plus className="w-3.5 h-3.5" /> Nouvelle alerte
              </button>
            )}
          </div>
        }
        bodyClassName="p-0"
      >
        {rules.length === 0 ? (
          <EmptyState icon={BellRing} title="Aucune règle d’alerte" hint="Créez un seuil ou une détection d’anomalie." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/60">
                <tr>
                  <th className={thCls}>Alerte</th>
                  <th className={thCls}>Mesure</th>
                  <th className={thCls}>Condition</th>
                  <th className={thCls}>Période</th>
                  <th className={thCls}>Destinataires</th>
                  <th className={thCls}>État</th>
                  <th className={thCls} />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {rules.map(rule => (
                  <tr key={rule.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className={tdCls}>
                      <div className="font-semibold">{rule.name}</div>
                      <div className="text-[10px] text-slate-400">{rule.createdBy}</div>
                    </td>
                    <td className={tdCls}>{measureLabel(rule.measureCode)}</td>
                    <td className={tdCls}>
                      {rule.mode === 'ANOMALY' ? (
                        <Pill tone="violet">
                          anomalie ≥ {fmtBiNumber(rule.deviationFactor ?? 2, 1)} σ sur{' '}
                          {rule.lookbackPeriods ?? 12} mois
                        </Pill>
                      ) : (
                        <span className="text-[11px]">
                          {BI_ALERT_OPERATOR_LABELS[rule.operator]} {fmtBiNumber(rule.threshold, 2)}
                        </span>
                      )}
                    </td>
                    <td className={`${tdCls} text-[10.5px]`}>{BI_KPI_PERIOD_LABELS[rule.period]}</td>
                    <td className={`${tdCls} text-[10.5px]`}>
                      {rule.recipients.length === 0
                        ? '—'
                        : rule.recipients
                            .map(id => users.find(user => user.id === id)?.name ?? id)
                            .join(', ')}
                    </td>
                    <td className={tdCls}>
                      <Pill tone={rule.isActive ? 'emerald' : 'slate'}>{rule.isActive ? 'active' : 'inactive'}</Pill>
                    </td>
                    <td className={tdCls}>
                      <div className="flex items-center gap-1">
                        {canEdit && (
                          <>
                            <button
                              type="button"
                              className={btnGhost}
                              onClick={() => toggleRule(rule)}
                              title="Activer / désactiver"
                            >
                              {rule.isActive ? 'Désactiver' : 'Activer'}
                            </button>
                            <button
                              type="button"
                              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                              title="Modifier"
                              onClick={() => openEdit(rule)}
                            >
                              <Pencil className="w-3.5 h-3.5 text-slate-500" />
                            </button>
                            <button
                              type="button"
                              className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/40"
                              title="Supprimer"
                              onClick={() => remove(rule)}
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-500" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GdsCard>

      <GdsCard
        title="Historique des alertes"
        subtitle="Une alerte par règle et par jour. Les événements restent dans le journal d’audit."
        actions={
          <select
            className={inputCls}
            value={statusFilter}
            onChange={event => setStatusFilter(event.target.value as 'ALL' | BiAlertEvent['status'])}
          >
            <option value="ALL">Tous les statuts</option>
            <option value="NOUVELLE">Nouvelles</option>
            <option value="ACQUITTEE">Acquittées</option>
            <option value="IGNOREE">Ignorées</option>
          </select>
        }
        bodyClassName="p-0"
      >
        {filteredEvents.length === 0 ? (
          <EmptyState icon={Activity} title="Aucun événement" hint="Lancez une évaluation pour détecter les dépassements." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/60">
                <tr>
                  <th className={thCls}>Détectée le</th>
                  <th className={thCls}>Alerte</th>
                  <th className={thCls}>Gravité</th>
                  <th className={thCls}>Message</th>
                  <th className={thCls}>Statut</th>
                  <th className={thCls} />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredEvents.map(event => (
                  <tr key={event.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className={`${tdCls} whitespace-nowrap`}>
                      {new Date(event.detectedAt).toLocaleString('fr-FR')}
                    </td>
                    <td className={tdCls}>{event.ruleName}</td>
                    <td className={tdCls}>
                      <Pill tone={event.severity === 'CRITIQUE' ? 'red' : event.severity === 'AVERTISSEMENT' ? 'amber' : 'blue'}>
                        {event.severity}
                      </Pill>
                    </td>
                    <td className={tdCls}>{event.message}</td>
                    <td className={tdCls}>
                      <Pill tone={event.status === 'NOUVELLE' ? 'amber' : event.status === 'ACQUITTEE' ? 'emerald' : 'slate'}>
                        {BI_ALERT_STATUS_LABELS[event.status]}
                      </Pill>
                      {event.acknowledgedBy && (
                        <div className="text-[10px] text-slate-400 mt-0.5">par {event.acknowledgedBy}</div>
                      )}
                    </td>
                    <td className={tdCls}>
                      {canEdit && event.status === 'NOUVELLE' && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            className={btnGhost}
                            onClick={() => acknowledge(event, 'ACQUITTEE')}
                            title="Acquitter"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Acquitter
                          </button>
                          <button
                            type="button"
                            className={btnGhost}
                            onClick={() => acknowledge(event, 'IGNOREE')}
                            title="Ignorer"
                          >
                            <XCircle className="w-3.5 h-3.5 text-slate-500" /> Ignorer
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GdsCard>

      <BiNote>
        Les anomalies statistiques comparent la dernière valeur mensuelle à la moyenne des périodes
        précédentes, en nombre d’écarts-types. Elles nécessitent au moins trois mois d’historique.
      </BiNote>

      <Modal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        title={form.id ? 'Modifier l’alerte' : 'Nouvelle alerte'}
        maxWidth="2xl"
      >
        <div className="space-y-3">
          {formError && <BiNote tone="error">{formError}</BiNote>}
          <div>
            <label className={labelCls}>Nom</label>
            <input className={`${inputCls} w-full`} value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Mesure surveillée</label>
              <select
                className={`${inputCls} w-full`}
                value={form.measureCode}
                onChange={event => setForm({ ...form, measureCode: event.target.value })}
              >
                {MEASURE_OPTIONS.map(option => (
                  <option key={option.code} value={option.code}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Mode d’évaluation</label>
              <select
                className={`${inputCls} w-full`}
                value={form.mode}
                onChange={event => setForm({ ...form, mode: event.target.value as BiAlertMode })}
              >
                <option value="THRESHOLD">Seuil fixe</option>
                <option value="ANOMALY">Anomalie statistique</option>
              </select>
            </div>
          </div>
          {form.mode === 'THRESHOLD' ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>Opérateur</label>
                <select
                  className={`${inputCls} w-full`}
                  value={form.operator}
                  onChange={event => setForm({ ...form, operator: event.target.value as BiAlertOperator })}
                >
                  {(Object.keys(BI_ALERT_OPERATOR_LABELS) as BiAlertOperator[]).map(operator => (
                    <option key={operator} value={operator}>
                      {BI_ALERT_OPERATOR_LABELS[operator]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Seuil</label>
                <input
                  type="number"
                  className={`${inputCls} w-full`}
                  value={form.threshold}
                  onChange={event => setForm({ ...form, threshold: event.target.value })}
                />
              </div>
              <div>
                <label className={labelCls}>Période</label>
                <select
                  className={`${inputCls} w-full`}
                  value={form.period}
                  onChange={event => setForm({ ...form, period: event.target.value as BiKpiPeriod })}
                >
                  {(Object.keys(BI_KPI_PERIOD_LABELS) as BiKpiPeriod[]).map(period => (
                    <option key={period} value={period}>
                      {BI_KPI_PERIOD_LABELS[period]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Historique (mois)</label>
                <input
                  type="number"
                  min={3}
                  max={36}
                  className={`${inputCls} w-full`}
                  value={form.lookbackPeriods}
                  onChange={event =>
                    setForm({ ...form, lookbackPeriods: Math.max(3, Math.min(36, Number(event.target.value) || 12)) })
                  }
                />
              </div>
              <div>
                <label className={labelCls}>Seuil en écarts-types (σ)</label>
                <input
                  type="number"
                  min={1}
                  max={6}
                  step={0.5}
                  className={`${inputCls} w-full`}
                  value={form.deviationFactor}
                  onChange={event =>
                    setForm({ ...form, deviationFactor: Math.max(1, Math.min(6, Number(event.target.value) || 2)) })
                  }
                />
              </div>
            </div>
          )}
          <div>
            <label className={labelCls}>Destinataires (information)</label>
            <div className="max-h-32 overflow-auto border border-slate-200 dark:border-slate-800 rounded-lg p-2 space-y-1">
              {users.map(user => (
                <label key={user.id} className="flex items-center gap-2 text-[11px] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.recipients.includes(user.id)}
                    onChange={event =>
                      setForm({
                        ...form,
                        recipients: event.target.checked
                          ? [...form.recipients, user.id]
                          : form.recipients.filter(id => id !== user.id),
                      })
                    }
                  />
                  {user.name}
                </label>
              ))}
            </div>
          </div>
          <label className="inline-flex items-center gap-2 text-[11px] cursor-pointer">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={event => setForm({ ...form, isActive: event.target.checked })}
            />
            Alerte active
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" className={btnGhost} onClick={() => setFormOpen(false)}>
              Annuler
            </button>
            <button type="button" className={btnPrimary} onClick={submit} disabled={!form.name.trim()}>
              {form.id ? 'Enregistrer' : 'Créer l’alerte'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
