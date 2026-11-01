/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * MAMORA GP — Module Commercial, Expéditions & Facturation
 * Verrou Sanitaire ISO 22000 : Interdiction formelle d'expédier un lot non libéré
 */

import React, { useState } from 'react';
import { Customer, SalesOrder, DeliveryNote, Invoice, FinishedBatch, Item } from '../../types';
import { storage } from '../../services/storage';
import { StatusBadge } from '../common/StatusBadge';
import { Modal } from '../common/Modal';
import {
  ShoppingCart,
  ShoppingBag,
  Plus,
  Search,
  Filter,
  Truck,
  CreditCard,
  Building2,
  AlertTriangle,
  CheckCircle,
  FileText,
  Printer,
  ShieldCheck,
} from 'lucide-react';

interface CommercialViewProps {
  customers: Customer[];
  salesOrders: SalesOrder[];
  deliveryNotes: DeliveryNote[];
  invoices: Invoice[];
  finishedBatches: FinishedBatch[];
  items: Item[];
  currentUserName: string;
}

export const CommercialView: React.FC<CommercialViewProps> = ({
  customers,
  salesOrders,
  deliveryNotes,
  invoices,
  finishedBatches,
  items,
  currentUserName,
}) => {
  const [activeTab, setActiveTab] = useState<'ORDERS' | 'DELIVERY' | 'INVOICES' | 'CUSTOMERS'>('ORDERS');
  const [searchTerm, setSearchTerm] = useState('');

  // Modales
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);

  // Formulaire Commande (BC)
  const [selectedCustomerId, setSelectedCustomerId] = useState(customers[0]?.id || '');
  const [requestedDeliveryDate, setRequestedDeliveryDate] = useState('');
  const [orderItemRef, setOrderItemRef] = useState(
    items.find(i => i.category === 'PRODUIT_FINI_THON' || i.category === 'PRODUIT_FINI_SARDINE')?.id || ''
  );
  const [orderedCans, setOrderedCans] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [orderNotes, setOrderNotes] = useState('');

  // Formulaire Bon de Livraison (BL) avec Verrou Sanitaire
  const [blSalesOrderId, setBlSalesOrderId] = useState(salesOrders[0]?.id || '');
  const [driverName, setDriverName] = useState('');
  const [truckPlate, setTruckPlate] = useState('');
  const [truckHygieneCompliant, setTruckHygieneCompliant] = useState(true);
  const [selectedBatchForBl, setSelectedBatchForBl] = useState(finishedBatches[0]?.id || '');
  const [blCartons, setBlCartons] = useState('');
  const [blCans, setBlCans] = useState('');
  const [blErrorMessage, setBlErrorMessage] = useState('');

  // Formulaire Client
  const [newCustName, setNewCustName] = useState('');
  const [newCustCategory, setNewCustCategory] = useState<Customer['category']>('GMS');
  const [newCustCity, setNewCustCity] = useState('Alger');
  const [newCustContact, setNewCustContact] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustTax, setNewCustTax] = useState('');

  // Lots éligibles (libérés)
  const releasedBatches = finishedBatches.filter(b => b.releaseStatus === 'LIBERE');

  const handleCreateSalesOrder = (e: React.FormEvent) => {
    e.preventDefault();
    const cust = customers.find(c => c.id === selectedCustomerId) || customers[0];
    const item = items.find(i => i.id === orderItemRef) || items[0];
    const cans = Number(orderedCans) || 0;
    const price = Number(unitPrice) || 0;
    const subtotal = cans * price;
    const total = subtotal * 1.19;

    storage.addSalesOrder({
      customerId: cust.id,
      customerName: cust.companyName,
      orderDate: new Date().toISOString(),
      requestedDeliveryDate,
      items: [
        {
          itemId: item.id,
          itemCode: item.code,
          designation: item.designation,
          orderedCansQty: cans,
          orderedCartonsQty: Math.ceil(cans / 50),
          unitPriceDzd: price,
          totalLineDzd: subtotal,
          isAllocated: false,
        },
      ],
      subtotalDzd: subtotal,
      vatRatePercent: 19,
      totalAmountDzd: Math.round(total),
      status: 'CONFIRME',
      deliveryAddress: `${cust.address}, ${cust.city}`,
      salesRepresentative: currentUserName,
      notes: orderNotes,
    });

    setIsOrderModalOpen(false);
  };

  const handleCreateDeliveryNote = (e: React.FormEvent) => {
    e.preventDefault();
    setBlErrorMessage('');

    const so = salesOrders.find(s => s.id === blSalesOrderId) || salesOrders[0];
    const batch = finishedBatches.find(b => b.id === selectedBatchForBl);

    if (!batch) {
      setBlErrorMessage('Veuillez sélectionner un lot de fabrication.');
      return;
    }

    // 🛡️ APPLICATION DU VERROU SANITAIRE ISO 22000
    if (batch.releaseStatus !== 'LIBERE') {
      setBlErrorMessage(
        `[VERROU SANITAIRE ISO 22000] Le lot ${batch.batchNumber} est au statut "${batch.releaseStatus}". Il est FORMELLEMENT INTERDIT d'expédier un lot qui n'a pas été libéré par le Responsable Qualité.`
      );
      return;
    }

    try {
      storage.createDeliveryNote({
        salesOrderId: so.id,
        customerId: so.customerId,
        customerName: so.customerName,
        departureDate: new Date().toISOString(),
        driverName,
        truckPlate,
        truckHygieneCompliant,
        lines: [
          {
            finishedBatchId: batch.id,
            batchNumber: batch.batchNumber,
            itemId: batch.itemId,
            designation: batch.productName,
            cartonsDelivered: Number(blCartons) || 50,
            cansDelivered: Number(blCans) || 2500,
            palletsCount: Math.ceil((Number(blCartons) || 50) / 40),
            bestBeforeDate: batch.bestBeforeDate,
          },
        ],
        totalCartons: Number(blCartons) || 50,
        totalCans: Number(blCans) || 2500,
        deliveredBy: currentUserName,
        status: 'EXPEDIE',
      });

      setIsDeliveryModalOpen(false);
    } catch (err: any) {
      setBlErrorMessage(err.message || 'Erreur lors de la validation du bon de livraison.');
    }
  };

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName) return;

    storage.addCustomer({
      companyName: newCustName.trim(),
      category: newCustCategory,
      address: 'Zone d\'Activité',
      city: newCustCity,
      country: 'Algérie',
      contactPerson: newCustContact || 'Responsable Achats',
      email: 'contact@client.dz',
      phone: newCustPhone || '+213 21 00 00 00',
      taxNumber: newCustTax || 'NIF-0000000000',
      paymentTermsDays: 45,
      creditLimitDzd: 10000000,
      currentBalanceDzd: 0,
      isActive: true,
    });

    setIsCustomerModalOpen(false);
    setNewCustName('');
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-blue-600" />
            <span>Module Commercial, Expéditions &amp; Facturation</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Commandes clients, allocation sur stocks libérés, bons de livraison avec verrou sanitaire ISO 22000
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
            <button
              onClick={() => setActiveTab('ORDERS')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                activeTab === 'ORDERS'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              Commandes (BC) ({salesOrders.length})
            </button>
            <button
              onClick={() => setActiveTab('DELIVERY')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                activeTab === 'DELIVERY'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              Bons de Livraison (BL) ({deliveryNotes.length})
            </button>
            <button
              onClick={() => setActiveTab('INVOICES')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                activeTab === 'INVOICES'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              Factures ({invoices.length})
            </button>
            <button
              onClick={() => setActiveTab('CUSTOMERS')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                activeTab === 'CUSTOMERS'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              Clients ({customers.length})
            </button>
          </div>

          {activeTab === 'ORDERS' && (
            <button
              onClick={() => setIsOrderModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nouveau BC</span>
            </button>
          )}

          {activeTab === 'DELIVERY' && (
            <button
              onClick={() => setIsDeliveryModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-700 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Créer Bon de Livraison (BL)</span>
            </button>
          )}

          {activeTab === 'CUSTOMERS' && (
            <button
              onClick={() => setIsCustomerModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Ajouter Client</span>
            </button>
          )}
        </div>
      </div>

      {activeTab === 'ORDERS' && (
        /* VUE COMMANDES CLIENTS (BC) */
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-slate-500 font-semibold">
                  <tr>
                    <th className="py-3 px-4">N° Commande</th>
                    <th className="py-3 px-4">Client</th>
                    <th className="py-3 px-4">Date BC</th>
                    <th className="py-3 px-4">Date Souhaitée</th>
                    <th className="py-3 px-4">Articles Commandés</th>
                    <th className="py-3 px-4 text-right">Montant TTC</th>
                    <th className="py-3 px-4">Statut</th>
                    <th className="py-3 px-4">Commercial</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {salesOrders.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p className="font-semibold text-slate-700 dark:text-slate-300">Aucune commande client (BC) enregistrée</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Cliquez sur « Nouveau BC » pour enregistrer une commande.</p>
                      </td>
                    </tr>
                  ) : (
                    salesOrders.map(so => (
                      <tr key={so.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                        <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                          {so.orderNumber}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                          {so.customerName}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-500">
                          {new Date(so.orderDate).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-700 dark:text-slate-300 font-bold">
                          {so.requestedDeliveryDate}
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                          {so.items.map(i => `${i.designation} (${i.orderedCansQty.toLocaleString()} btes)`).join(', ')}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {so.totalAmountDzd.toLocaleString()} DZD
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge status={so.status} size="sm" />
                        </td>
                        <td className="py-3 px-4 text-slate-500 text-[11px]">
                          {so.salesRepresentative}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'DELIVERY' && (
        /* VUE BONS DE LIVRAISON (BL) AVEC VERROU SANITAIRE */
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-800 text-xs text-blue-800 dark:text-blue-300 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 shrink-0 text-blue-600" />
            <span>
              <strong>Intégrité Sanitaire ISO 22000 :</strong> Chaque Bon de Livraison consigne les numéros de lots précis et garantit que seules les conserves validées par la direction qualité sont mises en expédition.
            </span>
          </div>

          <div className="space-y-4">
            {deliveryNotes.length === 0 ? (
              <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-400">
                <Truck className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="font-semibold text-slate-700 dark:text-slate-300">Aucun bon de livraison émis</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Cliquez sur « Créer Bon de Livraison (BL) » lorsqu'un lot de produits finis est libéré.</p>
              </div>
            ) : (
              deliveryNotes.map(dn => (
                <div
                  key={dn.id}
                  className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-cyan-600 dark:text-cyan-400">
                          {dn.deliveryNumber}
                        </span>
                        <StatusBadge status={dn.status} size="sm" />
                        <span className="text-xs text-slate-400">·</span>
                        <span className="text-xs text-slate-500 font-mono">Facture liée : {dn.invoiceId}</span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        Client : {dn.customerName}
                      </h3>
                    </div>

                    <div className="flex items-center gap-3 text-xs font-mono text-slate-600 dark:text-slate-400">
                      <span>Camion : <strong>{dn.truckPlate}</strong></span>
                      <span>·</span>
                      <span>Chauffeur : <strong>{dn.driverName}</strong></span>
                      {dn.truckHygieneCompliant && (
                        <span className="text-emerald-600 font-semibold">✓ Hygiène camion conforme</span>
                      )}
                    </div>
                  </div>

                  {/* Colisage & Traçabilité des lots expédiés */}
                  <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-slate-500 font-semibold">
                        <tr>
                          <th className="py-2 px-3">Numéro de Lot Fini (Traçabilité)</th>
                          <th className="py-2 px-3">Désignation Produit</th>
                          <th className="py-2 px-3 font-mono">DDM / DLUO</th>
                          <th className="py-2 px-3 text-right">Cartons</th>
                          <th className="py-2 px-3 text-right">Boîtes</th>
                          <th className="py-2 px-3 text-right">Palettes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {dn.lines.map((line, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                            <td className="py-2 px-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                              {line.batchNumber}
                            </td>
                            <td className="py-2 px-3 text-slate-800 dark:text-slate-200">
                              {line.designation}
                            </td>
                            <td className="py-2 px-3 font-mono text-slate-500">
                              {line.bestBeforeDate}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-semibold text-slate-800 dark:text-slate-200">
                              {line.cartonsDelivered}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                              {line.cansDelivered.toLocaleString()}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-slate-500">
                              {line.palletsCount}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'INVOICES' && (
        /* VUE FACTURES */
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-slate-500 font-semibold">
                  <tr>
                    <th className="py-3 px-4">N° Facture</th>
                    <th className="py-3 px-4">Client</th>
                    <th className="py-3 px-4">Date Émission</th>
                    <th className="py-3 px-4">Échéance</th>
                    <th className="py-3 px-4 text-right">Montant HT</th>
                    <th className="py-3 px-4 text-right">TVA (19%)</th>
                    <th className="py-3 px-4 text-right">Total TTC</th>
                    <th className="py-3 px-4">État Règlement</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {invoices.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p className="font-semibold text-slate-700 dark:text-slate-300">Aucune facture émise</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Les factures sont générées automatiquement lors de la validation des livraisons.</p>
                      </td>
                    </tr>
                  ) : (
                    invoices.map(inv => (
                      <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                        <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                          {inv.invoiceNumber}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                          {inv.customerName}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-500">{inv.invoiceDate}</td>
                        <td className="py-3 px-4 font-mono text-slate-700 dark:text-slate-300 font-bold">
                          {inv.dueDate}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-600 dark:text-slate-300">
                          {inv.subtotalDzd.toLocaleString()} DZD
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-500">
                          {inv.vatAmountDzd.toLocaleString()} DZD
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {inv.totalAmountDzd.toLocaleString()} DZD
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge status={inv.paymentStatus} size="sm" />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'CUSTOMERS' && (
        /* VUE CLIENTS */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {customers.map(cust => (
            <div
              key={cust.id}
              className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="font-mono text-xs font-bold text-blue-600">{cust.code}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {cust.category}
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {cust.companyName}
              </h3>
              <div className="text-xs text-slate-500 space-y-1">
                <div>Contact : <strong>{cust.contactPerson}</strong></div>
                <div>Téléphone : <span className="font-mono">{cust.phone}</span></div>
                <div>Adresse : {cust.address}, {cust.city}</div>
                <div>Identifiant Fiscal : <span className="font-mono text-[11px]">{cust.taxNumber}</span></div>
              </div>
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400 font-sans">Délai : {cust.paymentTermsDays} jours</span>
                <span className="text-slate-700 dark:text-slate-300 font-bold">
                  Plafond : {(cust.creditLimitDzd / 1000000).toFixed(1)}M DZD
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Création Commande Client (BC) */}
      <Modal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        title="Création d'un Bon de Commande Vente (BC)"
        subtitle="Enregistrement de la commande client et réservation sur stocks"
      >
        <form onSubmit={handleCreateSalesOrder} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Client Acheteur *
              </label>
              <select
                value={selectedCustomerId}
                onChange={e => setSelectedCustomerId(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden"
              >
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.companyName} ({c.category} - {c.city})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Date de Livraison Souhaitée *
              </label>
              <input
                type="date"
                required
                value={requestedDeliveryDate}
                onChange={e => setRequestedDeliveryDate(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Produit Fini Commandé *
              </label>
              <select
                value={orderItemRef}
                onChange={e => setOrderItemRef(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden"
              >
                {items
                  .filter(i => i.category === 'PRODUIT_FINI_THON' || i.category === 'PRODUIT_FINI_SARDINE')
                  .map(i => (
                    <option key={i.id} value={i.id}>
                      {i.designation} (Dispo : {i.currentStock.toLocaleString()} btes)
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Quantité Boîtes *
              </label>
              <input
                type="number"
                step="500"
                required
                value={orderedCans}
                onChange={e => setOrderedCans(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Prix Unitaire HT (DZD) *
              </label>
              <input
                type="number"
                required
                value={unitPrice}
                onChange={e => setUnitPrice(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Taux TVA Applicable
              </label>
              <input
                type="text"
                disabled
                value="19 % (Taux normal)"
                className="w-full px-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
              Instructions Spéciales / Cahier des Charges
            </label>
            <textarea
              rows={2}
              value={orderNotes}
              onChange={e => setOrderNotes(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsOrderModalOpen(false)}
              className="px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer"
            >
              Créer Bon de Commande
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Création Bon de Livraison avec Verrou Sanitaire */}
      <Modal
        isOpen={isDeliveryModalOpen}
        onClose={() => setIsDeliveryModalOpen(false)}
        title="Édition d'un Bon de Livraison &amp; Expédition"
        subtitle="Verrou sanitaire ISO 22000 : contrôle d'autorisation avant chargement camion"
      >
        <form onSubmit={handleCreateDeliveryNote} className="space-y-4 text-xs">
          {blErrorMessage && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 rounded-lg border border-red-300 dark:border-red-800 text-red-800 dark:text-red-200 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{blErrorMessage}</span>
            </div>
          )}

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
              Commande Client Associée *
            </label>
            <select
              value={blSalesOrderId}
              onChange={e => setBlSalesOrderId(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden"
            >
              {salesOrders.map(so => (
                <option key={so.id} value={so.id}>
                  {so.orderNumber} — {so.customerName} ({so.status})
                </option>
              ))}
            </select>
          </div>

          {/* SÉLECTION DU LOT AVEC VÉRIFICATION DU STATUT DE LIBÉRATION */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
            <label className="block text-slate-800 dark:text-slate-200 font-bold">
              Lot de Conserves Affecté au Chargement *
            </label>
            <select
              value={selectedBatchForBl}
              onChange={e => setSelectedBatchForBl(e.target.value)}
              className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-mono font-bold focus:outline-hidden"
            >
              {finishedBatches.map(b => (
                <option key={b.id} value={b.id}>
                  {b.batchNumber} — {b.productName} [STATUT : {b.releaseStatus}]
                </option>
              ))}
            </select>

            <div className="text-[11px] text-slate-500">
              {finishedBatches.find(b => b.id === selectedBatchForBl)?.releaseStatus === 'LIBERE' ? (
                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Lot formellement libéré par la Qualité ISO 22000. Expédition autorisée.
                </span>
              ) : (
                <span className="text-red-600 font-bold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Ce lot n'est PAS libéré. La validation de l'expédition sera rejetée.
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Cartons Livrés
              </label>
              <input
                type="number"
                value={blCartons}
                onChange={e => setBlCartons(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Nombre Total de Boîtes
              </label>
              <input
                type="number"
                value={blCans}
                onChange={e => setBlCans(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Chauffeur Transporteur *
              </label>
              <input
                type="text"
                required
                value={driverName}
                onChange={e => setDriverName(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Immatriculation Camion / Conteneur *
              </label>
              <input
                type="text"
                required
                value={truckPlate}
                onChange={e => setTruckPlate(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono focus:outline-hidden"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="hygiene"
              checked={truckHygieneCompliant}
              onChange={e => setTruckHygieneCompliant(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 cursor-pointer"
            />
            <label htmlFor="hygiene" className="text-slate-700 dark:text-slate-300 font-medium cursor-pointer">
              Contrôle hygiène &amp; propreté du camion conforme (PRP ISO 22000)
            </label>
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsDeliveryModalOpen(false)}
              className="px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-700 rounded-lg cursor-pointer"
            >
              Valider BL &amp; Déstocker
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Création Client */}
      <Modal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        title="Création d'un Nouveau Compte Client"
        subtitle="Renseignez les coordonnées commerciales et fiscales"
      >
        <form onSubmit={handleCreateCustomer} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Raison Sociale *
              </label>
              <input
                type="text"
                required
                placeholder="ex: Carrefour Algérie"
                value={newCustName}
                onChange={e => setNewCustName(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Catégorie Commerciale *
              </label>
              <select
                value={newCustCategory}
                onChange={e => setNewCustCategory(e.target.value as Customer['category'])}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden"
              >
                <option value="GMS">GMS (Grande Distribution)</option>
                <option value="GROSSISTE">Grossiste / Distributeur</option>
                <option value="EXPORT">Client Export International</option>
                <option value="COLLECTIVITE">Collectivité / Restauration</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Ville</label>
              <input
                type="text"
                value={newCustCity}
                onChange={e => setNewCustCity(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Contact</label>
              <input
                type="text"
                value={newCustContact}
                onChange={e => setNewCustContact(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsCustomerModalOpen(false)}
              className="px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 rounded-lg cursor-pointer"
            >
              Enregistrer Client
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
