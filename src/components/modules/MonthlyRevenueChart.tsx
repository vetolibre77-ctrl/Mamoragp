import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  Cell,
  ReferenceLine,
} from 'recharts';
import { Invoice } from '../../types';
import { TrendingUp, BarChart3, Calendar, CheckCircle2, AlertCircle, DollarSign, ArrowUpRight } from 'lucide-react';

interface MonthlyRevenueChartProps {
  invoices: Invoice[];
  onOpenCommercial?: () => void;
}

interface MonthData {
  monthKey: string; // '2026-05'
  monthLabel: string; // 'Mai 2026'
  shortLabel: string; // 'Mai'
  revenueTtc: number;
  revenueHt: number;
  vatAmount: number;
  paidAmount: number;
  unpaidAmount: number;
  invoiceCount: number;
  growthVsPrevPercent: number | null;
}

const MONTH_NAMES_FR = [
  'Janv', 'Févr', 'Mars', 'Avr', 'Mai', 'Juin',
  'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'
];

const FULL_MONTH_NAMES_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

export const MonthlyRevenueChart: React.FC<MonthlyRevenueChartProps> = ({
  invoices,
  onOpenCommercial,
}) => {
  const [viewMode, setViewMode] = useState<'TTC' | 'HT' | 'STACKED'>('TTC');

  // Calcul dynamique des 6 derniers mois glissants
  const chartData: MonthData[] = useMemo(() => {
    // Prendre comme référence le mois d'octobre 2026 ou la date actuelle
    const refDate = new Date('2026-10-29T12:00:00Z');
    const months: MonthData[] = [];

    // Générer les 6 mois de (refDate - 5 mois) à refDate
    for (let i = 5; i >= 0; i--) {
      const d = new Date(refDate.getFullYear(), refDate.getMonth() - i, 1);
      const year = d.getFullYear();
      const monthIdx = d.getMonth();
      const monthKey = `${year}-${String(monthIdx + 1).padStart(2, '0')}`;
      const shortLabel = MONTH_NAMES_FR[monthIdx];
      const monthLabel = `${FULL_MONTH_NAMES_FR[monthIdx]} ${year}`;

      // Filtrer les factures de ce mois
      const monthInvoices = invoices.filter(inv => {
        if (!inv.invoiceDate) return false;
        return inv.invoiceDate.startsWith(monthKey);
      });

      const revenueTtc = monthInvoices.reduce((sum, inv) => sum + (inv.totalAmountDzd || 0), 0);
      const revenueHt = monthInvoices.reduce((sum, inv) => sum + (inv.subtotalDzd || 0), 0);
      const vatAmount = monthInvoices.reduce((sum, inv) => sum + (inv.vatAmountDzd || 0), 0);
      const paidAmount = monthInvoices.reduce((sum, inv) => sum + (inv.paidAmountDzd || 0), 0);
      const unpaidAmount = Math.max(0, revenueTtc - paidAmount);

      months.push({
        monthKey,
        monthLabel,
        shortLabel,
        revenueTtc,
        revenueHt,
        vatAmount,
        paidAmount,
        unpaidAmount,
        invoiceCount: monthInvoices.length,
        growthVsPrevPercent: null,
      });
    }

    // Calcul du taux de croissance mensuel vs mois précédent (M-1)
    for (let j = 1; j < months.length; j++) {
      const prevRevenue = months[j - 1].revenueTtc;
      const currRevenue = months[j].revenueTtc;
      if (prevRevenue > 0) {
        months[j].growthVsPrevPercent = Math.round(((currRevenue - prevRevenue) / prevRevenue) * 100);
      }
    }

    return months;
  }, [invoices]);

  // Statistiques agrégées sur les 6 mois
  const totalRevenue6MonthsTtc = useMemo(
    () => chartData.reduce((acc, m) => acc + m.revenueTtc, 0),
    [chartData]
  );
  const totalRevenue6MonthsHt = useMemo(
    () => chartData.reduce((acc, m) => acc + m.revenueHt, 0),
    [chartData]
  );
  const averageMonthlyRevenueTtc = Math.round(totalRevenue6MonthsTtc / (chartData.length || 1));
  const totalPaid6Months = chartData.reduce((acc, m) => acc + m.paidAmount, 0);
  const recoveryRate6Months = totalRevenue6MonthsTtc > 0
    ? Math.round((totalPaid6Months / totalRevenue6MonthsTtc) * 100)
    : 0;

  // Trouver le mois record
  const bestMonth = useMemo(() => {
    return [...chartData].sort((a, b) => b.revenueTtc - a.revenueTtc)[0];
  }, [chartData]);

  // Formatteur d'axe Y monétaire (e.g. 2.5M DZD ou 500k DZD)
  const formatYAxis = (val: number) => {
    if (val >= 1000000) {
      return `${(val / 1000000).toFixed(1)}M`;
    }
    if (val >= 1000) {
      return `${(val / 1000).toFixed(0)}k`;
    }
    return val.toString();
  };

  // Tooltip personnalisé haute lisibilité
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data: MonthData = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white p-3.5 rounded-lg shadow-xl border border-slate-700 text-xs min-w-[220px] space-y-2">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="font-bold text-slate-200">{data.monthLabel}</span>
            <span className="font-mono text-[11px] text-slate-400">{data.invoiceCount} facture(s)</span>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-baseline">
              <span className="text-slate-400">CA Total TTC :</span>
              <span className="font-mono font-bold text-emerald-400">
                {data.revenueTtc.toLocaleString()} DZD
              </span>
            </div>
            <div className="flex justify-between items-baseline text-[11px]">
              <span className="text-slate-400">CA Hors Taxes (HT) :</span>
              <span className="font-mono text-slate-300">
                {data.revenueHt.toLocaleString()} DZD
              </span>
            </div>
            <div className="flex justify-between items-baseline text-[11px]">
              <span className="text-slate-400">TVA (19%) :</span>
              <span className="font-mono text-slate-400">
                {data.vatAmount.toLocaleString()} DZD
              </span>
            </div>
          </div>

          <div className="pt-1.5 border-t border-slate-800 space-y-1 text-[11px]">
            <div className="flex justify-between items-baseline">
              <span className="text-cyan-300 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-cyan-400 inline" /> Encaissé :
              </span>
              <span className="font-mono text-cyan-300">
                {data.paidAmount.toLocaleString()} DZD
              </span>
            </div>
            {data.unpaidAmount > 0 && (
              <div className="flex justify-between items-baseline">
                <span className="text-amber-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 text-amber-400 inline" /> Reste dû :
                </span>
                <span className="font-mono text-amber-300 font-semibold">
                  {data.unpaidAmount.toLocaleString()} DZD
                </span>
              </div>
            )}
            {data.growthVsPrevPercent !== null && (
              <div className="flex justify-between items-baseline text-[10px] text-slate-400 pt-0.5">
                <span>Évolution vs M-1 :</span>
                <span className={`font-mono font-bold ${data.growthVsPrevPercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {data.growthVsPrevPercent >= 0 ? `+${data.growthVsPrevPercent}%` : `${data.growthVsPrevPercent}%`}
                </span>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
      {/* En-tête du composant graphique */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 uppercase">
              ANALYSE DES VENTES
            </span>
            <span className="text-xs text-slate-500 font-mono">6 Derniers Mois (Mai - Octobre 2026)</span>
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1 flex items-center gap-2">
            <BarChart3 className="w-4.5 h-4.5 text-blue-600" />
            <span>Chiffre d'Affaires Mensuel Conserverie (DZD)</span>
          </h3>
        </div>

        {/* Boutons d'options d'affichage */}
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-0.5 text-xs font-medium">
            <button
              onClick={() => setViewMode('TTC')}
              className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                viewMode === 'TTC'
                  ? 'bg-blue-600 text-white font-semibold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              CA TTC
            </button>
            <button
              onClick={() => setViewMode('HT')}
              className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                viewMode === 'HT'
                  ? 'bg-blue-600 text-white font-semibold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              CA HT
            </button>
            <button
              onClick={() => setViewMode('STACKED')}
              className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                viewMode === 'STACKED'
                  ? 'bg-blue-600 text-white font-semibold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Encaissé / Reste
            </button>
          </div>

          {onOpenCommercial && (
            <button
              onClick={onOpenCommercial}
              title="Voir détail factures dans le module commercial"
              className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <ArrowUpRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Mini-indicateurs de synthèse sur les 6 mois */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-800">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Total 6 Mois (TTC)
          </div>
          <div className="mt-1 text-base font-bold font-mono text-slate-900 dark:text-slate-100">
            {totalRevenue6MonthsTtc.toLocaleString()} <span className="text-xs font-normal text-slate-500">DZD</span>
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
            HT : {totalRevenue6MonthsHt.toLocaleString()} DZD
          </div>
        </div>

        <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-800">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Moyenne Mensuelle
          </div>
          <div className="mt-1 text-base font-bold font-mono text-blue-600 dark:text-blue-400">
            {averageMonthlyRevenueTtc.toLocaleString()} <span className="text-xs font-normal text-slate-500">DZD</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Ligne de base budgétaire
          </div>
        </div>

        <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-800">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Mois Record (Pic)
          </div>
          <div className="mt-1 text-base font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {bestMonth && bestMonth.revenueTtc > 0 ? `${(bestMonth.revenueTtc / 1000000).toFixed(2)}M` : '0'} <span className="text-xs font-normal text-slate-500">DZD</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {bestMonth && bestMonth.revenueTtc > 0 ? bestMonth.monthLabel : 'Aucune vente'}
          </div>
        </div>

        <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-800">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Taux Recouvrement
          </div>
          <div className="mt-1 text-base font-bold font-mono text-cyan-600 dark:text-cyan-400">
            {recoveryRate6Months}%
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Encaissé sur 6 mois
          </div>
        </div>
      </div>

      {/* Zone du graphique Recharts */}
      <div className="w-full h-72 pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 15, right: 15, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" opacity={0.25} />
            <XAxis
              dataKey="shortLabel"
              tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }}
              axisLine={{ stroke: '#cbd5e1' }}
              tickLine={false}
            />
            <YAxis
              tickFormatter={formatYAxis}
              tick={{ fill: '#64748b', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={50}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }} />

            {/* Ligne repère : moyenne mensuelle si > 0 */}
            {viewMode === 'TTC' && averageMonthlyRevenueTtc > 0 && (
              <ReferenceLine
                y={averageMonthlyRevenueTtc}
                stroke="#3b82f6"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: 'Moyenne',
                  fill: '#3b82f6',
                  fontSize: 10,
                  position: 'insideTopRight',
                }}
              />
            )}

            {viewMode === 'TTC' && (
              <Bar dataKey="revenueTtc" name="Chiffre d'Affaires TTC" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => {
                  // Mettre en valeur le mois en cours (dernier élément) ou le mois pic
                  const isCurrentMonth = index === chartData.length - 1;
                  const isBest = entry.monthKey === bestMonth?.monthKey;
                  let fill = '#0284c7'; // Cyan/Bleu 600
                  if (isBest) fill = '#059669'; // Emerald 600 pour le pic estival
                  if (isCurrentMonth) fill = '#2563eb'; // Blue 600 pour le mois en cours
                  return <Cell key={`cell-${index}`} fill={fill} />;
                })}
              </Bar>
            )}

            {viewMode === 'HT' && (
              <Bar dataKey="revenueHt" name="Chiffre d'Affaires HT" fill="#6366f1" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-ht-${index}`} fill={index === chartData.length - 1 ? '#4f46e5' : '#6366f1'} />
                ))}
              </Bar>
            )}

            {viewMode === 'STACKED' && (
              <>
                <Bar
                  dataKey="paidAmount"
                  name="Encaissé"
                  stackId="a"
                  fill="#10b981"
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="unpaidAmount"
                  name="Reste à Recouvrer"
                  stackId="a"
                  fill="#f59e0b"
                  radius={[4, 4, 0, 0]}
                />
              </>
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Légende et annotations contextuelles */}
      <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800 gap-2">
        <div className="flex items-center gap-4">
          {viewMode === 'TTC' && (
            <>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-emerald-600 inline-block" />
                <span>Mois Record (Pic estival)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-blue-600 inline-block" />
                <span>Mois en cours ({FULL_MONTH_NAMES_FR[new Date('2026-10-29').getMonth()]})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-1 bg-blue-500 inline-block" />
                <span>Ligne moyenne mensuelle ({averageMonthlyRevenueTtc.toLocaleString()} DZD)</span>
              </div>
            </>
          )}

          {viewMode === 'STACKED' && (
            <>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-emerald-500 inline-block" />
                <span>Règlements encaissés ({totalPaid6Months.toLocaleString()} DZD)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-amber-500 inline-block" />
                <span>Créances ouvertes ({(totalRevenue6MonthsTtc - totalPaid6Months).toLocaleString()} DZD)</span>
              </div>
            </>
          )}

          {viewMode === 'HT' && (
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-indigo-600 inline-block" />
              <span>Chiffre d'affaires net hors taxes (Taux TVA applicable : 19%)</span>
            </div>
          )}
        </div>

        <div className="text-[11px] font-mono text-slate-400">
          Source : Grand Livre Facturation MAMORA GP
        </div>
      </div>
    </div>
  );
};
