import React, { useState, useEffect } from 'react';
import { getSuppliers, addSupplier, updateSupplier, deleteSupplier, Supplier } from '../services/supplierService';
import { getPurchaseOrders, addPurchaseOrder, updatePurchaseOrder, deletePurchaseOrder, receivePurchaseOrder, generatePONumber, PurchaseOrder, POItem } from '../services/procurementService';
import { getBankLedgers, BankLedger } from '../services/bankService';
import { getItemVariants, ItemVariant } from '../services/inventoryService';
import { Users, FileText, Plus, Edit, Trash2, CheckCircle, Clock, Truck, DollarSign, X, Eye, Package, Search, Calendar, ChevronRight, AlertTriangle } from 'lucide-react';

export function ProcurementSuppliers() {
  const [activeTab, setActiveTab] = useState<'suppliers' | 'pos'>('suppliers');
  
  // Suppliers states
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [supplierLoading, setSupplierLoading] = useState(true);
  const [supplierError, setSupplierError] = useState<string | null>(null);

  // POs states
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [poSearch, setPoSearch] = useState('');
  const [poLoading, setPoLoading] = useState(true);
  const [poError, setPoError] = useState<string | null>(null);

  // Shared Inventory & Bank Lists
  const [itemVariants, setItemVariants] = useState<ItemVariant[]>([]);
  const [banks, setBanks] = useState<BankLedger[]>([]);

  // Modals state
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showEditSupplierModal, setShowEditSupplierModal] = useState(false);
  const [showDeleteSupplierModal, setShowDeleteSupplierModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  const [showPoModal, setShowPoModal] = useState(false);
  const [showViewPoModal, setShowViewPoModal] = useState(false);
  const [showDeletePoModal, setShowDeletePoModal] = useState(false);
  const [selectedPo, setSelectedPo] = useState<PurchaseOrder | null>(null);

  // Supplier Form
  const [supName, setSupName] = useState('');
  const [supContact, setSupContact] = useState('');
  const [supPhone, setSupPhone] = useState('');
  const [supEmail, setSupEmail] = useState('');
  const [supAddress, setSupAddress] = useState('');
  const [supTaxId, setSupTaxId] = useState('');
  const [supTerms, setSupTerms] = useState('Net 30');
  const [supActive, setSupActive] = useState(true);
  const [supNotes, setSupNotes] = useState('');

  // PO Form
  const [poSupplierId, setPoSupplierId] = useState('');
  const [poExpectedDate, setPoExpectedDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().substring(0, 10);
  });
  const [poNotes, setPoNotes] = useState('');
  const [poItems, setPoItems] = useState<Array<{ itemVariantId: string; quantity: number; unitCost: number }>>([
    { itemVariantId: '', quantity: 1, unitCost: 0 }
  ]);

  // Goods receipt Form
  const [receivedQtys, setReceivedQtys] = useState<Record<string, number>>({});
  const [receiptBankId, setReceiptBankId] = useState('');

  const [submitting, setSubmitting] = useState(false);

  const fetchSuppliersData = async () => {
    try {
      setSupplierLoading(true);
      setSupplierError(null);
      const data = await getSuppliers();
      setSuppliers(data);
    } catch (err: any) {
      setSupplierError(err.message || "Failed to load suppliers.");
    } finally {
      setSupplierLoading(false);
    }
  };

  const fetchPOsData = async () => {
    try {
      setPoLoading(true);
      setPoError(null);
      const [poData, itemsData, bankData] = await Promise.all([
        getPurchaseOrders(),
        getItemVariants(),
        getBankLedgers()
      ]);
      setPos(poData);
      setItemVariants(itemsData);
      setBanks(bankData.filter(b => b.isActive));
      if (bankData.length > 0 && !receiptBankId) {
        setReceiptBankId(bankData[0].id);
      }
    } catch (err: any) {
      setPoError(err.message || "Failed to load purchase orders.");
    } finally {
      setPoLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'suppliers') {
      fetchSuppliersData();
    } else {
      fetchPOsData();
    }
  }, [activeTab]);

  // SUPPLIER ACTION HANDLERS
  const handleOpenAddSupplier = () => {
    setSupName('');
    setSupContact('');
    setSupPhone('');
    setSupEmail('');
    setSupAddress('');
    setSupTaxId('');
    setSupTerms('Net 30');
    setSupActive(true);
    setSupNotes('');
    setShowSupplierModal(true);
  };

  const handleAddSupplierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supName.trim()) return;
    try {
      setSubmitting(true);
      await addSupplier({
        name: supName,
        contactPerson: supContact,
        phone: supPhone,
        email: supEmail,
        address: supAddress,
        taxId: supTaxId,
        paymentTerms: supTerms,
        isActive: supActive,
        notes: supNotes
      });
      setShowSupplierModal(false);
      fetchSuppliersData();
    } catch (err: any) {
      alert(err.message || "Failed to add supplier.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEditSupplier = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setSupName(supplier.name);
    setSupContact(supplier.contactPerson);
    setSupPhone(supplier.phone);
    setSupEmail(supplier.email);
    setSupAddress(supplier.address);
    setSupTaxId(supplier.taxId || '');
    setSupTerms(supplier.paymentTerms || 'Net 30');
    setSupActive(supplier.isActive);
    setSupNotes(supplier.notes || '');
    setShowEditSupplierModal(true);
  };

  const handleEditSupplierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplier || !supName.trim()) return;
    try {
      setSubmitting(true);
      await updateSupplier(selectedSupplier.id, {
        name: supName,
        contactPerson: supContact,
        phone: supPhone,
        email: supEmail,
        address: supAddress,
        taxId: supTaxId,
        paymentTerms: supTerms,
        isActive: supActive,
        notes: supNotes
      });
      setShowEditSupplierModal(false);
      fetchSuppliersData();
    } catch (err: any) {
      alert(err.message || "Failed to update supplier.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenDeleteSupplier = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setShowDeleteSupplierModal(true);
  };

  const handleDeleteSupplierConfirm = async () => {
    if (!selectedSupplier) return;
    try {
      setSubmitting(true);
      await deleteSupplier(selectedSupplier.id);
      setShowDeleteSupplierModal(false);
      fetchSuppliersData();
    } catch (err: any) {
      alert(err.message || "Failed to delete supplier.");
    } finally {
      setSubmitting(false);
    }
  };

  // PO ACTION HANDLERS
  const handleOpenAddPo = async () => {
    if (suppliers.length === 0) {
      // Lazy load suppliers if none available
      const list = await getSuppliers();
      setSuppliers(list);
      if (list.length === 0) {
        alert("Please register at least one Active Supplier first before creating a purchase order.");
        return;
      }
    }
    setPoSupplierId(suppliers[0]?.id || '');
    setPoExpectedDate(() => {
      const d = new Date();
      d.setDate(d.getDate() + 7);
      return d.toISOString().substring(0, 10);
    });
    setPoNotes('');
    setPoItems([{ itemVariantId: '', quantity: 1, unitCost: 0 }]);
    setShowPoModal(true);
  };

  const handleAddPoItem = () => {
    setPoItems([...poItems, { itemVariantId: '', quantity: 1, unitCost: 0 }]);
  };

  const handleRemovePoItem = (index: number) => {
    if (poItems.length === 1) return;
    setPoItems(poItems.filter((_, i) => i !== index));
  };

  const handlePoItemChange = (index: number, field: string, value: any) => {
    const next = [...poItems];
    next[index] = {
      ...next[index],
      [field]: value
    };
    // Pre-populate unit cost if variant changes
    if (field === 'itemVariantId') {
      const selectedVar = itemVariants.find(v => v.id === value);
      if (selectedVar) {
        next[index].unitCost = selectedVar.pricePerUnit;
      }
    }
    setPoItems(next);
  };

  const handleAddPoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!poSupplierId || poItems.some(it => !it.itemVariantId || it.quantity <= 0)) {
      alert("Please ensure all items have a valid variant and quantity.");
      return;
    }

    try {
      setSubmitting(true);
      const supplier = suppliers.find(s => s.id === poSupplierId);
      if (!supplier) throw new Error("Supplier not found");

      // Compile PO Items
      const compiledItems: POItem[] = poItems.map(it => {
        const itemVar = itemVariants.find(v => v.id === it.itemVariantId);
        const name = itemVar ? `${itemVar.name} (${itemVar.size || ''} ${itemVar.style || ''})` : 'Unknown Item';
        const qty = Number(it.quantity);
        const cost = Number(it.unitCost);
        return {
          itemVariantId: it.itemVariantId,
          name,
          quantity: qty,
          unitCost: cost,
          totalCost: qty * cost,
          receivedQty: 0
        };
      });

      const subtotal = compiledItems.reduce((acc, it) => acc + it.totalCost, 0);
      const tax = subtotal * 0.15; // 15% VAT Tax
      const total = subtotal + tax;

      const poNum = await generatePONumber();

      await addPurchaseOrder({
        poNumber: poNum,
        supplierId: poSupplierId,
        supplierName: supplier.name,
        orderDate: new Date(),
        expectedDeliveryDate: new Date(poExpectedDate),
        items: compiledItems,
        subtotal,
        tax,
        total,
        status: "Draft",
        notes: poNotes
      });

      setShowPoModal(false);
      fetchPOsData();
    } catch (err: any) {
      alert(err.message || "Failed to create Purchase Order.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenViewPo = (po: PurchaseOrder) => {
    setSelectedPo(po);
    const initialRecs: Record<string, number> = {};
    po.items.forEach(it => {
      // default receipt quantity is what is remaining
      initialRecs[it.itemVariantId] = Number(it.quantity || 0) - Number(it.receivedQty || 0);
    });
    setReceivedQtys(initialRecs);
    setShowViewPoModal(true);
  };

  const handleReceiptQtyChange = (itemVariantId: string, val: number) => {
    setReceivedQtys({
      ...receivedQtys,
      [itemVariantId]: val
    });
  };

  const handleProcessGoodsReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPo) return;

    try {
      setSubmitting(true);
      
      const receiptItems = Object.entries(receivedQtys)
        .map(([variantId, qty]) => ({
          itemVariantId: variantId,
          receivedQty: Number(qty)
        }))
        .filter(it => it.receivedQty > 0);

      if (receiptItems.length === 0) {
        alert("Please enter a valid received quantity for at least one item.");
        return;
      }

      await receivePurchaseOrder(selectedPo.id, receiptItems, receiptBankId || undefined);
      setShowViewPoModal(false);
      fetchPOsData();
    } catch (err: any) {
      alert(err.message || "Error processing goods receipt.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenDeletePo = (po: PurchaseOrder) => {
    setSelectedPo(po);
    setShowDeletePoModal(true);
  };

  const handleDeletePoConfirm = async () => {
    if (!selectedPo) return;
    try {
      setSubmitting(true);
      await deletePurchaseOrder(selectedPo.id);
      setShowDeletePoModal(false);
      fetchPOsData();
    } catch (err: any) {
      alert(err.message || "Failed to delete PO.");
    } finally {
      setSubmitting(false);
    }
  };

  // FILTERING
  const filteredSuppliers = suppliers.filter(s =>
    s.name.toLowerCase().includes(supplierSearch.toLowerCase()) ||
    s.contactPerson.toLowerCase().includes(supplierSearch.toLowerCase())
  );

  const filteredPOs = pos.filter(po =>
    po.poNumber.toLowerCase().includes(poSearch.toLowerCase()) ||
    po.supplierName.toLowerCase().includes(poSearch.toLowerCase())
  );

  return (
    <div className="space-y-6 bg-[#0D0D0D] text-white p-6 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-800 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
            <span className="w-2.5 h-6 bg-[#DC2626] rounded-full inline-block"></span>
            Procurement & Suppliers
          </h1>
          <p className="text-zinc-400 mt-1">Manage vendor relations, track inbound logistics, receive goods, and automate inventory replenishments.</p>
        </div>
        <div className="flex bg-zinc-900 border border-zinc-800 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('suppliers')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg flex items-center gap-2 transition duration-150 ${
              activeTab === 'suppliers' ? 'bg-[#DC2626] text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Users size={16} />
            Suppliers Directory
          </button>
          <button
            onClick={() => setActiveTab('pos')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg flex items-center gap-2 transition duration-150 ${
              activeTab === 'pos' ? 'bg-[#DC2626] text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <FileText size={16} />
            Purchase Orders (PO)
          </button>
        </div>
      </div>

      {/* SUPPLIERS TAB */}
      {activeTab === 'suppliers' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center gap-4 bg-[#1A1A1A] border border-zinc-800 p-4 rounded-xl">
            <div className="relative flex-1 max-w-md">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Search supplier name or contact..."
                value={supplierSearch}
                onChange={(e) => setSupplierSearch(e.target.value)}
                className="w-full bg-zinc-900 text-sm text-white rounded-lg border border-zinc-800 pl-9 pr-4 py-2 focus:outline-none focus:border-[#DC2626]"
              />
            </div>
            <button
              onClick={handleOpenAddSupplier}
              className="bg-[#DC2626] hover:bg-red-700 text-white font-medium px-4 py-2 rounded-lg flex items-center gap-2 transition duration-150 shrink-0"
            >
              <Plus size={16} />
              Add Supplier
            </button>
          </div>

          {supplierLoading ? (
            <div className="flex justify-center items-center py-16">
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-t-[#DC2626] border-r-transparent border-b-[#DC2626] border-l-transparent"></div>
            </div>
          ) : supplierError ? (
            <p className="p-6 text-center text-[#DC2626]">{supplierError}</p>
          ) : filteredSuppliers.length === 0 ? (
            <div className="p-16 text-center text-zinc-500 bg-[#1A1A1A] border border-zinc-800 rounded-xl">
              <Users size={48} className="text-zinc-800 mx-auto mb-3" />
              <p className="font-semibold text-zinc-400">No Suppliers Registered</p>
              <p className="text-xs text-zinc-600 mt-1">Register suppliers to draft Purchase Orders (POs) and replenish inventory variants.</p>
            </div>
          ) : (
            <div className="bg-[#1A1A1A] border border-zinc-800 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-zinc-900 text-zinc-400 uppercase text-[10px] font-bold tracking-wider border-b border-zinc-800">
                      <th className="p-4">Vendor Name</th>
                      <th className="p-4">Contact Person</th>
                      <th className="p-4">Phone / Email</th>
                      <th className="p-4">Address</th>
                      <th className="p-4">Tax ID / Terms</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {filteredSuppliers.map(s => (
                      <tr key={s.id} className="hover:bg-zinc-900/20 transition duration-150">
                        <td className="p-4">
                          <p className="font-bold text-white text-base">{s.name}</p>
                          {s.notes && <p className="text-zinc-500 text-xs mt-1 truncate max-w-xs">{s.notes}</p>}
                        </td>
                        <td className="p-4 text-zinc-300 font-medium">{s.contactPerson}</td>
                        <td className="p-4">
                          <p className="text-white text-sm">{s.phone}</p>
                          <p className="text-zinc-500 text-xs mt-0.5">{s.email}</p>
                        </td>
                        <td className="p-4 text-zinc-400 text-xs max-w-xs truncate">{s.address}</td>
                        <td className="p-4">
                          <p className="text-zinc-300 text-sm font-semibold">{s.taxId || 'No Tax ID'}</p>
                          <p className="text-zinc-500 text-xs">{s.paymentTerms}</p>
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                            s.isActive ? 'bg-emerald-950/50 text-emerald-400' : 'bg-zinc-950 text-zinc-500'
                          }`}>
                            {s.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleOpenEditSupplier(s)}
                              className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded"
                              title="Edit Supplier"
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              onClick={() => handleOpenDeleteSupplier(s)}
                              className="p-1.5 bg-zinc-800 hover:bg-red-950 hover:text-[#DC2626] text-zinc-400 rounded"
                              title="Delete Supplier"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* PURCHASE ORDERS TAB */}
      {activeTab === 'pos' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center gap-4 bg-[#1A1A1A] border border-zinc-800 p-4 rounded-xl">
            <div className="relative flex-1 max-w-md">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Search PO number or supplier name..."
                value={poSearch}
                onChange={(e) => setPoSearch(e.target.value)}
                className="w-full bg-zinc-900 text-sm text-white rounded-lg border border-zinc-800 pl-9 pr-4 py-2 focus:outline-none focus:border-[#DC2626]"
              />
            </div>
            <button
              onClick={handleOpenAddPo}
              className="bg-[#DC2626] hover:bg-red-700 text-white font-medium px-4 py-2 rounded-lg flex items-center gap-2 transition duration-150 shrink-0"
            >
              <Plus size={16} />
              Draft PO Order
            </button>
          </div>

          {poLoading ? (
            <div className="flex justify-center items-center py-16">
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-t-[#DC2626] border-r-transparent border-b-[#DC2626] border-l-transparent"></div>
            </div>
          ) : poError ? (
            <p className="p-6 text-center text-[#DC2626]">{poError}</p>
          ) : filteredPOs.length === 0 ? (
            <div className="p-16 text-center text-zinc-500 bg-[#1A1A1A] border border-zinc-800 rounded-xl">
              <FileText size={48} className="text-zinc-800 mx-auto mb-3" />
              <p className="font-semibold text-zinc-400">No Purchase Orders</p>
              <p className="text-xs text-zinc-600 mt-1">Draft POs to track equipment purchases, supplier logistics, and incoming asset stock.</p>
            </div>
          ) : (
            <div className="bg-[#1A1A1A] border border-zinc-800 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-zinc-900 text-zinc-400 uppercase text-[10px] font-bold tracking-wider border-b border-zinc-800">
                      <th className="p-4">PO Code</th>
                      <th className="p-4">Supplier / Vendor</th>
                      <th className="p-4">Order Date</th>
                      <th className="p-4">Expected Delivery</th>
                      <th className="p-4 text-right">Pre-Tax Cost</th>
                      <th className="p-4 text-right">VAT (15%) & Total</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {filteredPOs.map(po => (
                      <tr key={po.id} className="hover:bg-zinc-900/20 transition duration-150">
                        <td className="p-4 font-mono font-bold text-[#DC2626] text-sm">{po.poNumber}</td>
                        <td className="p-4 font-semibold text-white">{po.supplierName}</td>
                        <td className="p-4 text-zinc-400">{po.orderDate.toLocaleDateString()}</td>
                        <td className="p-4 text-zinc-400">{po.expectedDeliveryDate.toLocaleDateString()}</td>
                        <td className="p-4 text-right text-zinc-300 font-mono">${po.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                        <td className="p-4 text-right">
                          <p className="font-bold text-white font-mono">${po.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                          <p className="text-[10px] text-zinc-500 font-mono">VAT: ${po.tax.toLocaleString()}</p>
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                            po.status === 'Closed' ? 'bg-zinc-950 text-zinc-500 border border-zinc-800' :
                            po.status === 'Received' ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-900/30' :
                            po.status === 'Sent' ? 'bg-blue-950/50 text-blue-400 border border-blue-900/30' :
                            'bg-yellow-950/50 text-yellow-400 border border-yellow-900/30'
                          }`}>
                            {po.status}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleOpenViewPo(po)}
                              className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold rounded flex items-center gap-1.5 transition"
                            >
                              <Eye size={13} />
                              {po.status === 'Closed' ? 'View Details' : 'Receive / Audit'}
                            </button>
                            {po.status === 'Draft' && (
                              <button
                                onClick={() => handleOpenDeletePo(po)}
                                className="p-1.5 bg-zinc-800 hover:bg-red-950 hover:text-[#DC2626] text-zinc-400 rounded transition"
                                title="Delete PO"
                              >
                                <Trash2 size={13} />
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
          )}
        </div>
      )}

      {/* Add Supplier Modal */}
      {showSupplierModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-[#1A1A1A] border border-zinc-800 rounded-xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="bg-[#141414] px-6 py-4 border-b border-zinc-800 flex justify-between items-center">
              <h3 className="font-bold text-white flex items-center gap-2">
                <span className="w-2 h-4 bg-[#DC2626] inline-block rounded-sm"></span>
                Add New Supplier Vendor
              </h3>
              <button onClick={() => setShowSupplierModal(false)} className="text-zinc-500 hover:text-white transition duration-150">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddSupplierSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-xs uppercase tracking-wider text-zinc-400 font-bold mb-1.5">Supplier / Business Name</label>
                <input
                  type="text"
                  required
                  value={supName}
                  onChange={(e) => setSupName(e.target.value)}
                  placeholder="e.g. Al-Fatah Event Fabrics Plc"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#DC2626]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-zinc-400 font-bold mb-1.5">Contact Person</label>
                  <input
                    type="text"
                    required
                    value={supContact}
                    onChange={(e) => setSupContact(e.target.value)}
                    placeholder="e.g. Abebe Kebede"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#DC2626]"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-zinc-400 font-bold mb-1.5">Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={supPhone}
                    onChange={(e) => setSupPhone(e.target.value)}
                    placeholder="+251-911..."
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#DC2626]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-zinc-400 font-bold mb-1.5">Email Address</label>
                <input
                  type="email"
                  required
                  value={supEmail}
                  onChange={(e) => setSupEmail(e.target.value)}
                  placeholder="vendor@company.com"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#DC2626]"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-zinc-400 font-bold mb-1.5">Physical Business Address</label>
                <input
                  type="text"
                  required
                  value={supAddress}
                  onChange={(e) => setSupAddress(e.target.value)}
                  placeholder="e.g. Merkato, Addis Ababa"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#DC2626]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-zinc-400 font-bold mb-1.5">Tax Identification ID / TIN</label>
                  <input
                    type="text"
                    value={supTaxId}
                    onChange={(e) => setSupTaxId(e.target.value)}
                    placeholder="TIN-0012345"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#DC2626]"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-zinc-400 font-bold mb-1.5">Payment Terms</label>
                  <select
                    value={supTerms}
                    onChange={(e) => setSupTerms(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#DC2626]"
                  >
                    <option value="Cash on Delivery">Cash on Delivery</option>
                    <option value="Net 15">Net 15 Days</option>
                    <option value="Net 30">Net 30 Days</option>
                    <option value="Net 60">Net 60 Days</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-zinc-400 font-bold mb-1.5">Internal Supplier Notes</label>
                <textarea
                  value={supNotes}
                  onChange={(e) => setSupNotes(e.target.value)}
                  placeholder="Log premium delivery notes, quality feedback, or standard transport references..."
                  rows={2}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#DC2626]"
                ></textarea>
              </div>

              <div className="flex gap-3 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowSupplierModal(false)}
                  className="flex-1 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 py-2 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-[#DC2626] hover:bg-red-700 text-white py-2 rounded-lg font-semibold transition"
                >
                  {submitting ? 'Adding...' : 'Register Vendor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Supplier Modal */}
      {showEditSupplierModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-[#1A1A1A] border border-zinc-800 rounded-xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="bg-[#141414] px-6 py-4 border-b border-zinc-800 flex justify-between items-center">
              <h3 className="font-bold text-white flex items-center gap-2">
                <span className="w-2 h-4 bg-[#DC2626] inline-block rounded-sm"></span>
                Edit Supplier Details
              </h3>
              <button onClick={() => setShowEditSupplierModal(false)} className="text-zinc-500 hover:text-white transition duration-150">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleEditSupplierSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-xs uppercase tracking-wider text-zinc-400 font-bold mb-1.5">Supplier / Business Name</label>
                <input
                  type="text"
                  required
                  value={supName}
                  onChange={(e) => setSupName(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#DC2626]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-zinc-400 font-bold mb-1.5">Contact Person</label>
                  <input
                    type="text"
                    required
                    value={supContact}
                    onChange={(e) => setSupContact(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#DC2626]"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-zinc-400 font-bold mb-1.5">Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={supPhone}
                    onChange={(e) => setSupPhone(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#DC2626]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-zinc-400 font-bold mb-1.5">Email Address</label>
                <input
                  type="email"
                  required
                  value={supEmail}
                  onChange={(e) => setSupEmail(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#DC2626]"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-zinc-400 font-bold mb-1.5">Physical Business Address</label>
                <input
                  type="text"
                  required
                  value={supAddress}
                  onChange={(e) => setSupAddress(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#DC2626]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-zinc-400 font-bold mb-1.5">Tax Identification TIN</label>
                  <input
                    type="text"
                    value={supTaxId}
                    onChange={(e) => setSupTaxId(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#DC2626]"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-zinc-400 font-bold mb-1.5">Payment Terms</label>
                  <select
                    value={supTerms}
                    onChange={(e) => setSupTerms(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#DC2626]"
                  >
                    <option value="Cash on Delivery">Cash on Delivery</option>
                    <option value="Net 15">Net 15 Days</option>
                    <option value="Net 30">Net 30 Days</option>
                    <option value="Net 60">Net 60 Days</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2 py-2">
                <input
                  type="checkbox"
                  id="supActive"
                  checked={supActive}
                  onChange={(e) => setSupActive(e.target.checked)}
                  className="rounded border-zinc-800 text-[#DC2626] focus:ring-0 focus:ring-offset-0 accent-[#DC2626] h-4 w-4 bg-zinc-900"
                />
                <label htmlFor="supActive" className="text-sm text-zinc-300 font-medium select-none cursor-pointer">
                  Supplier is Active
                </label>
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-zinc-400 font-bold mb-1.5">Internal Notes</label>
                <textarea
                  value={supNotes}
                  onChange={(e) => setSupNotes(e.target.value)}
                  rows={2}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#DC2626]"
                ></textarea>
              </div>

              <div className="flex gap-3 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowEditSupplierModal(false)}
                  className="flex-1 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 py-2 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-[#DC2626] hover:bg-red-700 text-white py-2 rounded-lg font-semibold transition"
                >
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Supplier Modal */}
      {showDeleteSupplierModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-[#1A1A1A] border border-zinc-800 rounded-xl w-full max-w-sm overflow-hidden shadow-2xl text-center p-6">
            <div className="mx-auto w-12 h-12 rounded-full bg-red-950/40 border border-[#DC2626] flex justify-center items-center mb-4">
              <Trash2 size={24} className="text-[#DC2626]" />
            </div>
            <h3 className="font-bold text-white text-lg mb-2">Delete Supplier?</h3>
            <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
              Are you sure you want to delete supplier <span className="text-white font-semibold">"{selectedSupplier?.name}"</span>? 
              This will remove their history card from your vendor CRM directories.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteSupplierModal(false)}
                className="flex-1 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 py-2 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteSupplierConfirm}
                disabled={submitting}
                className="flex-1 bg-[#DC2626] hover:bg-red-700 text-white py-2 rounded-lg font-semibold transition"
              >
                {submitting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add PO Draft Modal */}
      {showPoModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-[#1A1A1A] border border-zinc-800 rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl">
            <div className="bg-[#141414] px-6 py-4 border-b border-zinc-800 flex justify-between items-center">
              <h3 className="font-bold text-white flex items-center gap-2">
                <span className="w-2 h-4 bg-[#DC2626] inline-block rounded-sm"></span>
                Draft Purchase Order
              </h3>
              <button onClick={() => setShowPoModal(false)} className="text-zinc-500 hover:text-white transition">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddPoSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-zinc-400 font-bold mb-1.5">Supplier Vendor</label>
                  <select
                    required
                    value={poSupplierId}
                    onChange={(e) => setPoSupplierId(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#DC2626]"
                  >
                    {suppliers.filter(s => s.isActive).map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-zinc-400 font-bold mb-1.5">Expected Delivery Date</label>
                  <input
                    type="date"
                    required
                    value={poExpectedDate}
                    onChange={(e) => setPoExpectedDate(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Items Table */}
              <div>
                <div className="flex justify-between items-center border-b border-zinc-800 pb-2 mb-3">
                  <h4 className="text-xs uppercase font-bold tracking-wider text-zinc-400">Order Items</h4>
                  <button
                    type="button"
                    onClick={handleAddPoItem}
                    className="text-xs text-[#DC2626] font-semibold hover:underline flex items-center gap-1"
                  >
                    <Plus size={14} /> Add Line Item
                  </button>
                </div>
                <div className="space-y-3">
                  {poItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 bg-zinc-900/40 p-3 rounded-lg border border-zinc-800">
                      <div className="flex-1">
                        <label className="block text-[10px] text-zinc-500 uppercase font-semibold mb-1">SKU Variant</label>
                        <select
                          required
                          value={item.itemVariantId}
                          onChange={(e) => handlePoItemChange(idx, 'itemVariantId', e.target.value)}
                          className="w-full bg-zinc-900 text-sm text-white rounded border border-zinc-800 px-2.5 py-1.5 focus:outline-none focus:border-[#DC2626]"
                        >
                          <option value="" disabled>Select Equipment...</option>
                          {itemVariants.map(v => (
                            <option key={v.id} value={v.id}>{v.name} (Cat: {v.category} | Stock: {v.currentStock})</option>
                          ))}
                        </select>
                      </div>
                      <div className="w-24">
                        <label className="block text-[10px] text-zinc-500 uppercase font-semibold mb-1">Qty</label>
                        <input
                          type="number"
                          required
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handlePoItemChange(idx, 'quantity', Number(e.target.value))}
                          className="w-full bg-zinc-900 text-sm text-white rounded border border-zinc-800 px-2 py-1.5 focus:outline-none"
                        />
                      </div>
                      <div className="w-28">
                        <label className="block text-[10px] text-zinc-500 uppercase font-semibold mb-1">Unit Cost ($)</label>
                        <input
                          type="number"
                          required
                          min="0.01"
                          step="0.01"
                          value={item.unitCost}
                          onChange={(e) => handlePoItemChange(idx, 'unitCost', Number(e.target.value))}
                          className="w-full bg-zinc-900 text-sm text-white rounded border border-zinc-800 px-2 py-1.5 focus:outline-none"
                        />
                      </div>
                      <div className="w-28 text-right pr-2">
                        <span className="block text-[10px] text-zinc-500 uppercase font-semibold mb-1">Subtotal</span>
                        <span className="text-sm font-bold text-zinc-300 font-mono">${(item.quantity * item.unitCost).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                      </div>
                      {poItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemovePoItem(idx)}
                          className="mt-5 p-1.5 bg-zinc-800 text-zinc-500 hover:text-[#DC2626] rounded hover:bg-red-950/20"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-zinc-400 font-bold mb-1.5">Supplier Logistics Notes / Delivery Terms</label>
                <textarea
                  value={poNotes}
                  onChange={(e) => setPoNotes(e.target.value)}
                  placeholder="e.g. Merkato delivery, freight costs included..."
                  rows={2}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#DC2626]"
                ></textarea>
              </div>

              {/* VAT + Totals display */}
              <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 flex justify-between items-center text-sm">
                <span className="text-zinc-500">Auto-calculated VAT: <span className="font-mono text-zinc-400 font-semibold">15% VAT standard</span></span>
                <div className="text-right">
                  <span className="text-xs text-zinc-400">Total Purchase Commitment</span>
                  <p className="text-xl font-extrabold text-[#DC2626] font-mono">
                    ${(poItems.reduce((acc, it) => acc + (it.quantity * it.unitCost), 0) * 1.15).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowPoModal(false)}
                  className="flex-1 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 py-2.5 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-[#DC2626] hover:bg-red-700 text-white py-2.5 rounded-lg font-semibold transition"
                >
                  {submitting ? 'Creating...' : 'Draft Purchase Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View & Receive Goods PO Modal */}
      {showViewPoModal && selectedPo && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-[#1A1A1A] border border-zinc-800 rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl">
            <div className="bg-[#141414] px-6 py-4 border-b border-zinc-800 flex justify-between items-center">
              <h3 className="font-bold text-white flex items-center gap-2">
                <span className="w-2 h-4 bg-[#DC2626] inline-block rounded-sm"></span>
                PO Details: {selectedPo.poNumber}
              </h3>
              <button onClick={() => setShowViewPoModal(false)} className="text-zinc-500 hover:text-white transition">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleProcessGoodsReceipt} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4 border-b border-zinc-800 pb-4 text-sm">
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase font-bold">Supplier Vendor</p>
                  <p className="text-white font-semibold mt-1">{selectedPo.supplierName}</p>
                </div>
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase font-bold">Order Date / Status</p>
                  <p className="text-white mt-1">
                    {selectedPo.orderDate.toLocaleDateString()} — <span className="font-bold text-amber-500">{selectedPo.status}</span>
                  </p>
                </div>
              </div>

              {/* Items listing */}
              <div>
                <p className="text-xs uppercase font-bold tracking-wider text-zinc-400 mb-2">Order Line Audit & Receiving</p>
                <div className="space-y-2">
                  {selectedPo.items.map((it, idx) => {
                    const remaining = Number(it.quantity) - Number(it.receivedQty || 0);
                    return (
                      <div key={idx} className="flex justify-between items-center bg-zinc-900/60 p-3 rounded-lg border border-zinc-800">
                        <div>
                          <p className="text-sm font-bold text-white">{it.name}</p>
                          <div className="flex items-center gap-3 mt-1.5 text-xs text-zinc-400">
                            <span>Ordered: <strong className="text-white">{it.quantity}</strong></span>
                            <span>Received: <strong className="text-[#DC2626]">{it.receivedQty || 0}</strong></span>
                            <span>Remaining: <strong className="text-amber-500">{remaining}</strong></span>
                          </div>
                        </div>
                        
                        {/* Receive Input */}
                        {selectedPo.status !== 'Closed' && selectedPo.status !== 'Cancelled' ? (
                          <div className="w-24 text-right">
                            <label className="block text-[10px] text-zinc-500 uppercase font-bold mb-1">Check In</label>
                            <input
                              type="number"
                              min="0"
                              max={remaining}
                              value={receivedQtys[it.itemVariantId] !== undefined ? receivedQtys[it.itemVariantId] : 0}
                              onChange={(e) => handleReceiptQtyChange(it.itemVariantId, Number(e.target.value))}
                              className="w-full bg-zinc-900 text-sm text-center text-white border border-zinc-800 rounded px-2 py-1 focus:outline-none focus:border-[#DC2626]"
                            />
                          </div>
                        ) : (
                          <p className="text-sm font-semibold text-zinc-500">Completed</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Finance Ledger Option */}
              {selectedPo.status !== 'Closed' && selectedPo.status !== 'Cancelled' && (
                <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-[#DC2626] rounded-full"></span>
                    <h4 className="text-xs uppercase font-bold tracking-wider text-zinc-300">Goods Receipt Expenditure</h4>
                  </div>
                  <p className="text-xs text-zinc-500">Checking in items will increase inventory stock levels. If you want to pay the vendor now from bank ledger, select bank below. Double-entry will debit your operating expenses and credit selected ledger.</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] text-zinc-500 uppercase font-semibold mb-1">Source Bank Ledger</label>
                      <select
                        value={receiptBankId}
                        onChange={(e) => setReceiptBankId(e.target.value)}
                        className="w-full bg-zinc-900 text-sm text-white rounded border border-zinc-800 px-3 py-1.5 focus:outline-none focus:border-[#DC2626]"
                      >
                        <option value="">Do Not Record Expense Transaction</option>
                        {banks.map(b => (
                          <option key={b.id} value={b.id}>{b.name} (${b.currentBalance.toLocaleString()})</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {selectedPo.notes && (
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Internal Memo Notes</p>
                  <p className="text-xs text-zinc-400 bg-zinc-950 p-3 rounded-lg border border-zinc-800 whitespace-pre-line leading-relaxed">{selectedPo.notes}</p>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowViewPoModal(false)}
                  className="flex-1 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 py-2.5 rounded-lg transition"
                >
                  Close Details
                </button>
                {selectedPo.status !== 'Closed' && selectedPo.status !== 'Cancelled' && (
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-lg font-semibold transition"
                  >
                    {submitting ? 'Auditing...' : 'Check In Goods'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete PO Modal */}
      {showDeletePoModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-[#1A1A1A] border border-zinc-800 rounded-xl w-full max-w-sm overflow-hidden shadow-2xl text-center p-6">
            <div className="mx-auto w-12 h-12 rounded-full bg-red-950/40 border border-[#DC2626] flex justify-center items-center mb-4">
              <Trash2 size={24} className="text-[#DC2626]" />
            </div>
            <h3 className="font-bold text-white text-lg mb-2">Delete Purchase Order?</h3>
            <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
              Are you sure you want to delete purchase order draft <span className="text-white font-semibold">"{selectedPo?.poNumber}"</span>? 
              This will remove this draft PO permanently.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowDeletePoModal(false)}
                className="flex-1 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 py-2 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDeletePoConfirm}
                disabled={submitting}
                className="flex-1 bg-[#DC2626] hover:bg-red-700 text-white py-2 rounded-lg font-semibold transition"
              >
                {submitting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
