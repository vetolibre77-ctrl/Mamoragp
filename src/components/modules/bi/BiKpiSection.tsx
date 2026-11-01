/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * MAMORA BI — KPI : définitions, formules sécurisées et calculs réels.
 * Aucune formule n'est évaluée par eval() : le moteur utilise un parseur dédié.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Calculator, Pencil, Plus, Presentation, ShieldCheck, Trash2 } from 'lucide-react';
import { storage } from '../../../services/storage';
import { validateBiFormula } from '../../../services/bi/engine';
import { BI_MEASURES } from '../../../services/bi/catalog';
import {
  BI_KPI_PERIOD_LABELS,
  BiKpi,
  BiKpiPeriod,
  BiPptxExportPreset,
  BiValueFormat,
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
import { BiKpiTile, BiNote, fmtBi, fmtBiNumber } from './BiShared';

const FORMATS: BiValueFormat[] = ['NUMBER', 'DECIMAL', 'PERCENT', 'CURRENCY', 'QUANTITY'];

interface KpiSectionProps {
  currentUser: User;
  revision: number;
  onNotice: (message: string) => void;
  onError: (message: string) => void;
  onChanged: () => void;
  /** Ouvre l'assistant PowerPoint sur les KPI calculables. */
  onExportPptx?: (preset: BiPptxExportPreset) => void;
}

interface KpiForm {
  id?: string;
  code: string;
  name: string;
  description: string;
  formula: string;
  unit: string;
  format: BiValueFormat;
  precision: number;
  period: BiKpiPeriod;
  targetValue: string;
  isActive: boolean;
}

const emptyForm = (): KpiForm => ({
  code: '',
  name: '',
  description: '',
  formula: '',
  unit: '',
  format: 'DECIMAL',
  precision: 2,
  period: 'CURRENT_MONTH',
  targetValue: '',
  isActive: true,
});

export const BiKpiSection: React.FC<KpiSectionProps> = ({
  currentUser,
  revision,
  onNotice,
  onError,
  onChanged,
  onExportPptx,
}) => {
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<KpiForm>(emptyForm());
  const [formError, setFormError] = useState('');

  const kpis = useMemo(() => {
    try {
      return storage.getBiKpis();
    } catch {
      return [];
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revision]);

  const computations = useMemo(() => {
    return kpis.map(kpi => {
      try {
        return storage.computeBiKpi(kpi.id);
      } catch (error) {
        return {
          kpi,
          value: null,
          valid: false,
          error: error instanceof Error ? error.message : String(error),
          period: {},
          values: {},
          warnings: [],
        };
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kpis, revision]);

  const canCreate = storage.canBi('BI_KPI_CREATE', currentUser);
  const canExportPptx = storage.canBi('BI_EXPORT', currentUser);
  const canEdit = storage.canBi('BI_KPI_EDIT', currentUser);

  const validation = useMemo(
    () => (form.formula.trim() ? validateBiFormula(form.formula) : { valid: false, identifiers: [] as string[] }),
    [form.formula]
  );

  const openCreate = () => {
    setForm(emptyForm());
    setFormError('');
    setFormOpen(true);
  };

  const openEdit = (kpi: BiKpi) => {
    setForm({
      id: kpi.id,
      code: kpi.code,
      name: kpi.name,
      description: kpi.description,
      formula: kpi.formula,
      unit: kpi.unit,
      format: kpi.format,
      precision: kpi.precision,
      period: kpi.period,
      targetValue: kpi.targetValue === undefined ? '' : String(kpi.targetValue),
      isActive: kpi.isActive,
    });
    setFormError('');
    setFormOpen(true);
  };

  const submit = () => {
    try {
      const payload = {
        code: form.code.trim() || undefined,
        name: form.name,
        description: form.description,
        formula: form.formula,
        unit: form.unit,
        format: form.format,
        precision: form.precision,
        period: form.period,
        isActive: form.isActive,
        targetValue: form.targetValue.trim() === '' ? undefined : Number(form.targetValue),
      };
      if (form.id) {
        storage.updateBiKpi(form.id, payload);
        onNotice(`KPI « ${form.name} » mis à jour.`);
      } else {
        storage.createBiKpi(payload);
        onNotice(`KPI « ${form.name} » créé.`);
      }
      setFormOpen(false);
      onChanged();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : String(error));
    }
  };

  const remove = (kpi: BiKpi) => {
    try {
      storage.deleteBiKpi(kpi.id);
      onNotice(`KPI « ${kpi.name} » supprimé.`);
      onChanged();
    } catch (error) {
      onError(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <div className="space-y-3">
      <GdsCard
        title="Indicateurs clés de performance"
        subtitle="Les formules sont validées par un parseur sécurisé et calculées sur les données réelles. Division par zéro = « non calculable »."
        actions={
          <div className="flex flex-wrap items-center gap-1.5">
            {canExportPptx && onExportPptx && (
              <button
                type="button"
                className={btnGhost}
                disabled={computations.length === 0}
                title="Exporter les KPI calculables vers PowerPoint"
                onClick={() =>
                  onExportPptx({
                    source: 'KPI',
                    title: 'Indicateurs clés de performance',
                    kpiIds: computations
                      .filter(computation => computation.valid)
                      .map(computation => computation.kpi.id),
                  })
                }
              >
                <Presentation className="w-3.5 h-3.5" /> PowerPoint
              </button>
            )}
            {canCreate && (
              <button type="button" className={btnPrimary} onClick={openCreate}>
                <Plus className="w-3.5 h-3.5" /> Nouveau KPI
              </button>
            )}
          </div>
        }
      >
        {computations.length === 0 ? (
          <EmptyState icon={Calculator} title="Aucun KPI défini" hint="Créez un KPI à partir des mesures du catalogue." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
            {computations.map(computation => (
              <BiKpiTile
                key={computation.kpi.id}
                label={computation.kpi.name}
                value={
                  computation.valid
                    ? fmtBi(computation.value, computation.kpi.format, computation.kpi.unit, computation.kpi.precision)
                    : 'non calculable'
                }
                hint={
                  computation.valid
                    ? `${BI_KPI_PERIOD_LABELS[computation.kpi.period]} · ${computation.kpi.code}`
                    : computation.error ?? 'Donnée indisponible sur la période.'
                }
                tone={computation.valid ? 'blue' : 'slate'}
                target={
                  computation.kpi.targetValue !== undefined && computation.kpi.targetValue > 0
                    ? { value: computation.value, target: computation.kpi.targetValue }
                    : undefined
                }
              />
            ))}
          </div>
        )}
      </GdsCard>

      <GdsCard title="Détail des KPI" bodyClassName="p-0">
        {computations.length === 0 ? (
          <EmptyState icon={Calculator} title="Aucun KPI" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/60">
                <tr>
                  <th className={thCls}>Code</th>
                  <th className={thCls}>KPI</th>
                  <th className={thCls}>Formule</th>
                  <th className={thCls}>Période</th>
                  <th className={`${thCls} text-right`}>Valeur</th>
                  <th className={`${thCls} text-right`}>Cible</th>
                  <th className={thCls}>État</th>
                  <th className={thCls} />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {computations.map(computation => (
                  <tr key={computation.kpi.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className={`${tdCls} font-mono text-[10px]`}>{computation.kpi.code}</td>
                    <td className={tdCls}>
                      <div className="font-semibold">{computation.kpi.name}</div>
                      <div className="text-[10px] text-slate-400">{computation.kpi.description}</div>
                    </td>
                    <td className={`${tdCls} font-mono text-[10px]`}>{computation.kpi.formula}</td>
                    <td className={`${tdCls} text-[10px]`}>
                      {BI_KPI_PERIOD_LABELS[computation.kpi.period]}
                      {computation.period.from && (
                        <div className="text-slate-400">
                          {computation.period.from} → {computation.period.to}
                        </div>
                      )}
                    </td>
                    <td className={`${tdCls} text-right font-mono font-semibold`}>
                      {computation.valid
                        ? fmtBi(computation.value, computation.kpi.format, computation.kpi.unit, computation.kpi.precision)
                        : '—'}
                    </td>
                    <td className={`${tdCls} text-right font-mono`}>
                      {computation.kpi.targetValue === undefined
                        ? '—'
                        : fmtBiNumber(computation.kpi.targetValue, computation.kpi.precision)}
                    </td>
                    <td className={tdCls}>
                      {computation.valid ? (
                        <Pill tone="emerald">calculé</Pill>
                      ) : (
                        <Pill tone="amber" title={computation.error}>
                          non calculable
                        </Pill>
                      )}
                      {!computation.kpi.isActive && (
                        <span className="ml-1">
                          <Pill tone="slate">inactif</Pill>
                        </span>
                      )}
                    </td>
                    <td className={tdCls}>
                      {canEdit && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                            title="Modifier"
                            onClick={() => openEdit(computation.kpi)}
                          >
                            <Pencil className="w-3.5 h-3.5 text-slate-500" />
                          </button>
                          <button
                            type="button"
                            className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/40"
                            title="Supprimer"
                            onClick={() => remove(computation.kpi)}
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-500" />
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
        <span className="inline-flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5" /> Les formules n’acceptent que les mesures du
          catalogue, les opérateurs + − × ÷ et les fonctions SAFE_DIV, ABS, ROUND, MIN, MAX. Aucun
          accès au système, au stockage ou au réseau.
        </span>
      </BiNote>

      <Modal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        title={form.id ? 'Modifier le KPI' : 'Nouveau KPI'}
        subtitle="La formule est validée avant enregistrement."
        maxWidth="3xl"
      >
        <div className="space-y-3">
          {formError && <BiNote tone="error">{formError}</BiNote>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Nom</label>
              <input className={`${inputCls} w-full`} value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Code (optionnel)</label>
              <input
                className={`${inputCls} w-full font-mono`}
                value={form.code}
                onChange={event => setForm({ ...form, code: event.target.value.toUpperCase() })}
                placeholder="Généré depuis le nom"
              />
            </div>
          </div>
          <div>
            <label className={labelCls}>Description</label>
            <input className={`${inputCls} w-full`} value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} />
          </div>
          <div>
            <label className={labelCls}>Formule</label>
            <textarea
              className={`${inputCls} w-full font-mono`}
              rows={2}
              value={form.formula}
              onChange={event => setForm({ ...form, formula: event.target.value })}
              placeholder="PROD_CONFORME / PROD_TOTAL * 100"
            />
            {form.formula.trim() === '' ? (
              <p className="text-[10px] text-slate-400 mt-1">
                Utilisez uniquement les codes de mesure ci-dessous.
              </p>
            ) : validation.valid ? (
              <p className="text-[10px] text-emerald-600 mt-1">Formule valide.</p>
            ) : (
              <p className="text-[10px] text-red-600 mt-1">{validation.error}</p>
            )}
          </div>
          <div>
            <p className={labelCls}>Mesures disponibles (cliquez pour insérer)</p>
            <div className="max-h-32 overflow-auto flex flex-wrap gap-1">
              {Object.values(BI_MEASURES).map(measure => (
                <button
                  key={measure.code}
                  type="button"
                  className="text-[9.5px] px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 font-mono"
                  title={measure.description}
                  onClick={() =>
                    setForm(current => ({
                      ...current,
                      formula: `${current.formula}${current.formula && !current.formula.endsWith(' ') ? ' ' : ''}${measure.code}`,
                    }))
                  }
                >
                  {measure.code}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className={labelCls}>Format</label>
              <select
                className={`${inputCls} w-full`}
                value={form.format}
                onChange={event => setForm({ ...form, format: event.target.value as BiValueFormat })}
              >
                {FORMATS.map(format => (
                  <option key={format} value={format}>
                    {format}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Unité</label>
              <input className={`${inputCls} w-full`} value={form.unit} onChange={event => setForm({ ...form, unit: event.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Décimales</label>
              <input
                type="number"
                min={0}
                max={4}
                className={`${inputCls} w-full`}
                value={form.precision}
                onChange={event => setForm({ ...form, precision: Math.max(0, Math.min(4, Number(event.target.value) || 0)) })}
              />
            </div>
            <div>
              <label className={labelCls}>Cible (optionnel)</label>
              <input
                type="number"
                className={`${inputCls} w-full`}
                value={form.targetValue}
                onChange={event => setForm({ ...form, targetValue: event.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
            <label className="inline-flex items-center gap-2 text-[11px] mt-5 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={event => setForm({ ...form, isActive: event.target.checked })}
              />
              KPI actif
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className={btnGhost} onClick={() => setFormOpen(false)}>
              Annuler
            </button>
            <button
              type="button"
              className={btnPrimary}
              onClick={submit}
              disabled={!form.name.trim() || !form.formula.trim() || !validation.valid}
            >
              <Calculator className="w-3.5 h-3.5" /> {form.id ? 'Enregistrer' : 'Créer'}
            </button>
          </div>
        </div>
      </Modal>

      {canEdit && computations.some(computation => !computation.valid) && (
        <div className="text-[10px] text-slate-400">
          Les KPI « non calculables » restent visibles : aucune valeur n’est inventée. Corrigez la
          formule ou complétez les données source.
        </div>
      )}
    </div>
  );
};
