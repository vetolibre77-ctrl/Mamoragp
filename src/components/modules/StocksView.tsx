/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * MAMORA GP — Gestion des Stocks de Production & Magasins
 * Distinction stricte : Disponible, Réservé, Quarantaine, Rejeté
 */

import React, { useState } from 'react';
import { Item, StockMovement } from '../../types';
import { Boxes, Search, Filter, AlertTriangle, ArrowUpRight, ArrowDownLeft, ShieldAlert, Archive } from 'lucide-react';

interface StocksViewProps {
  items: Item[];
  stockMovements: StockMovement[];
}

export const StocksView: React.FC<StocksViewProps> = ({ items, stockMovements }) => {
  const [activeTab, setActiveTab] = useState<'LEVELS' | 'MOVEMENTS'>('LEVELS');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');

  const filteredItems = items.filter(i => {
    const matchesSearch =
      i.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.designation.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = filterCategory === 'ALL' || i.category === filterCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Boxes className="w-5 h-5 text-blue-600" />
            <span>Gestion des Stocks de Production &amp; Magasins</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Suivi des niveaux en temps réel, ségrégation stricte des stocks disponibles vs en quarantaine et traçabilité des flux
          </p>
        </div>

        <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs">
          <button
            onClick={() => setActiveTab('LEVELS')}
            className={`px-3 py-1.5 font-semibold rounded-md transition-colors cursor-pointer ${
              activeTab === 'LEVELS'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            Niveaux de Stocks ({items.length})
          </button>
          <button
            onClick={() => setActiveTab('MOVEMENTS')}
            className={`px-3 py-1.5 font-semibold rounded-md transition-colors cursor-pointer ${
              activeTab === 'MOVEMENTS'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            Mouvements &amp; Entrées/Sorties ({stockMovements.length})
          </button>
        </div>
      </div>

      {activeTab === 'LEVELS' ? (
        /* VUE NIVEAUX DE STOCKS */
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher un article en stock..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden"
              />
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={filterCategory}
                onChange={e => setFilterCategory(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden cursor-pointer"
              >
                <option value="ALL">Toutes les catégories</option>
                <option value="POISSON_CONGELE">Poissons Congelés</option>
                <option value="POISSON_FRAIS">Poissons Frais</option>
                <option value="HUILE">Huiles</option>
                <option value="BOITE_METALLIQUE">Boîtes Métalliques</option>
                <option value="PRODUIT_FINI_THON">Produits Finis Thon</option>
                <option value="PRODUIT_FINI_SARDINE">Produits Finis Sardine</option>
              </select>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-slate-500 font-semibold">
                  <tr>
                    <th className="py-3 px-4">Code Article</th>
                    <th className="py-3 px-4">Désignation</th>
                    <th className="py-3 px-4 text-right">Stock Disponible</th>
                    <th className="py-3 px-4 text-right">En Quarantaine</th>
                    <th className="py-3 px-4 text-right">Réservé OF/Vente</th>
                    <th className="py-3 px-4 text-right">Seuil Mini</th>
                    <th className="py-3 px-4">État de Couverture</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {filteredItems.map(item => {
                    const isLowStock = item.currentStock <= item.minStockLevel;
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                        <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                          {item.code}
                        </td>
                        <td className="py-3 px-4 text-slate-900 dark:text-slate-100">
                          {item.designation}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                          {item.currentStock.toLocaleString()} {item.unit}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-amber-600 dark:text-amber-400">
                          {item.quarantineStock > 0 ? `${item.quarantineStock.toLocaleString()} ${item.unit}` : '-'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-500">
                          {item.allocatedStock > 0 ? `${item.allocatedStock.toLocaleString()} ${item.unit}` : '-'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-500">
                          {item.minStockLevel.toLocaleString()} {item.unit}
                        </td>
                        <td className="py-3 px-4">
                          {isLowStock ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-600">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              Alerte Réappro
                            </span>
                          ) : (
                            <span className="text-[11px] font-semibold text-emerald-600">
                              ✓ Nominal
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* VUE HISTORIQUE DES MOUVEMENTS DE STOCKS */
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-slate-500 font-semibold">
                <tr>
                  <th className="py-3 px-4">Date &amp; Heure</th>
                  <th className="py-3 px-4">Type de Flux</th>
                  <th className="py-3 px-4">Article</th>
                  <th className="py-3 px-4">N° de Lot</th>
                  <th className="py-3 px-4 text-right">Quantité</th>
                  <th className="py-3 px-4">Opérateur</th>
                  <th className="py-3 px-4">Motif / Justification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {stockMovements.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <Archive className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="font-semibold text-slate-700 dark:text-slate-300">Aucun mouvement de stock enregistré</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Les mouvements (entrées réceptions, consommations OF, livraisons) apparaîtront automatiquement ici.</p>
                    </td>
                  </tr>
                ) : (
                  stockMovements.map(mov => (
                  <tr key={mov.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                    <td className="py-3 px-4 font-mono text-slate-500">
                      {new Date(mov.timestamp).toLocaleString('fr-FR')}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {mov.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                      {mov.itemCode}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                      {mov.batchNumber}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                      {mov.quantity.toLocaleString()} {mov.unit}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                      {mov.userName}
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px] truncate max-w-64">
                      {mov.reason || '-'}
                    </td>
                  </tr>
                )))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
