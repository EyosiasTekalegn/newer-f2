import React, { useState, useEffect } from 'react';
import { Plus, Search, Eye, Undo2, Check, FileText, AlertTriangle } from 'lucide-react';
import { getActiveRentals, createWalkinRental, convertBookingToRental, Rental } from '../services/rentalService';
import { getBookings, Booking } from '../services/bookingService';
import { getCustomers, Customer } from '../services/customerService';
import { getInventoryItems, InventoryItem } from '../services/quotationService';
import { generateContractPartB } from '../services/contractService';
import { getIssues } from '../services/issueService';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

export function ActiveRentals() {
  const navigate = useNavigate();
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  
  const [isWalkinModalOpen, setIsWalkinModalOpen] = useState(false);
  
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [rentalsData, bookingsData, customersData, inventoryData, issuesData] = await Promise.all([
        getActiveRentals(),
        getBookings(),
        getCustomers(),
        getInventoryItems(),
        getIssues()
      ]);
      setRentals(rentalsData.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
      setBookings(bookingsData.filter(b => b.status === 'Reserved'));
      setCustomers(customersData);
      setInventoryItems(inventoryData);
      setIssues(issuesData || []);
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError('Failed to load active rentals.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Delivered': return 'bg-green-100 text-green-800';
      case 'Partially Returned': return 'bg-yellow-100 text-yellow-800';
      case 'Closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleConvertBooking = async (bookingId: string) => {
    if (window.confirm('Convert this booking to an active rental? This will mark it as Delivered and deduct stock.')) {
      try {
        await convertBookingToRental(bookingId);
        fetchData();
        alert('Booking successfully converted to Active Rental!');
      } catch (err: any) {
        alert(err.message || 'Failed to convert booking.');
      }
    }
  };

  const filteredRentals = rentals.filter(r => 
    r.customerName.toLowerCase().includes(search.toLowerCase()) || 
    r.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-white border border-gray-200 rounded shadow-sm">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between shrink-0">
        <h2 className="font-bold text-lg text-[#1A1A1A]">Active Rentals</h2>
        <button 
          onClick={() => setIsWalkinModalOpen(true)}
          className="bg-[#DC2626] text-white px-4 py-2 rounded text-sm font-bold hover:bg-red-700 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Walk-in Rental
        </button>
      </div>

      <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row gap-4 shrink-0 bg-gray-50/50">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search by customer or rental ID..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626]"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-[#DC2626]"></div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-[#DC2626] font-medium mb-4">{error}</p>
            <button onClick={fetchData} className="bg-[#1A1A1A] text-white px-4 py-2 rounded font-bold hover:bg-black">Retry</button>
          </div>
        ) : filteredRentals.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <FileText className="w-12 h-12 text-gray-300 mb-4" />
            <p>No active rentals found.</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 sticky top-0 border-b border-gray-200">
              <tr>
                <th className="p-4 text-xs font-bold uppercase text-gray-500 tracking-wider">Customer & ID</th>
                <th className="p-4 text-xs font-bold uppercase text-gray-500 tracking-wider">Type</th>
                <th className="p-4 text-xs font-bold uppercase text-gray-500 tracking-wider">Schedule</th>
                <th className="p-4 text-xs font-bold uppercase text-gray-500 tracking-wider">Total</th>
                <th className="p-4 text-xs font-bold uppercase text-gray-500 tracking-wider">Status</th>
                <th className="p-4 text-xs font-bold uppercase text-gray-500 tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRentals.map(rental => (
                <tr key={rental.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <div>
                        <p className="font-medium text-[#1A1A1A]">{rental.customerName}</p>
                        <p className="text-xs text-gray-500">ID: {rental.id.slice(0, 8)}</p>
                      </div>
                      {issues.filter(i => i.rentalId === rental.id && i.status !== 'closed' && i.status !== 'resolved').length > 0 && (
                        <span 
                          onClick={() => navigate('/issues')}
                          className="cursor-pointer inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-red-100 text-red-800 text-[10px] font-mono font-bold animate-pulse"
                          title="Active issue linked to this rental record! Click to inspect."
                        >
                          <AlertTriangle className="w-2.5 h-2.5" /> DISPUTE
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider ${rental.rentalType === 'reserved' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'}`}>
                      {rental.rentalType}
                    </span>
                  </td>
                  <td className="p-4">
                    <p className="text-sm text-[#1A1A1A]">{format(rental.startDate, 'MMM d, yyyy')}</p>
                    <p className="text-xs text-gray-500">to {format(rental.endDate, 'MMM d, yyyy')}</p>
                  </td>
                  <td className="p-4 font-medium text-[#1A1A1A]">
                    ${rental.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider ${getStatusColor(rental.status)}`}>
                      {rental.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => navigate('/returns-inspection')}
                        title="Process Return"
                        className="p-2 text-gray-400 hover:text-[#DC2626] hover:bg-red-50 rounded transition-colors"
                      >
                        <Undo2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={async () => {
                          try {
                            if (window.confirm("Generate and draft Contract Part B (Logistics Handover checklist) for this rental?")) {
                              alert("Generating Contract Part B... Please wait.");
                              await generateContractPartB(rental.id);
                              alert("Contract Part B drafted successfully! Check under Contracts tab.");
                            }
                          } catch (err: any) {
                            alert(`Failed to generate Part B contract: ${err.message}`);
                          }
                        }}
                        title="Generate Contract Part B"
                        className="p-2 text-gray-400 hover:text-amber-500 hover:bg-amber-50 rounded transition-colors"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {bookings.length > 0 && (
        <div className="border-t border-gray-200 shrink-0">
           <div className="p-4 bg-gray-50 border-b border-gray-200">
             <h3 className="font-bold text-sm text-[#1A1A1A] uppercase">Ready for Delivery (Reserved Bookings)</h3>
           </div>
           <div className="overflow-x-auto">
             <table className="w-full text-left text-sm">
                <thead className="bg-white border-b border-gray-100 text-xs text-gray-500 uppercase">
                   <tr>
                     <th className="p-3">Customer</th>
                     <th className="p-3">Start Date</th>
                     <th className="p-3">Items</th>
                     <th className="p-3 text-right">Action</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                   {bookings.map(b => (
                     <tr key={b.id}>
                        <td className="p-3 font-medium">{b.customerName}</td>
                        <td className="p-3">{format(b.startDate, 'MMM d, yyyy')}</td>
                        <td className="p-3">{b.items.reduce((acc, i) => acc + i.quantity, 0)} items</td>
                        <td className="p-3 text-right">
                          <button onClick={() => handleConvertBooking(b.id)} className="text-xs bg-[#1A1A1A] text-white px-3 py-1 rounded hover:bg-black transition-colors">
                             Convert to Rental
                          </button>
                        </td>
                     </tr>
                   ))}
                </tbody>
             </table>
           </div>
        </div>
      )}

      {isWalkinModalOpen && (
        <WalkinRentalModal 
          customers={customers}
          inventoryItems={inventoryItems}
          onClose={() => setIsWalkinModalOpen(false)} 
          onSave={fetchData} 
        />
      )}
    </div>
  );
}

function WalkinRentalModal({ customers, inventoryItems, onClose, onSave }: { customers: Customer[], inventoryItems: InventoryItem[], onClose: () => void, onSave: () => void }) {
  const [formData, setFormData] = useState<Partial<Rental>>({
    startDate: new Date(),
    endDate: new Date(Date.now() + 86400000),
    items: [],
    subtotal: 0,
    tax: 0,
    total: 0,
    depositAmount: 0,
  });
  const [saving, setSaving] = useState(false);

  const calculateTotals = (items: any[]) => {
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const tax = subtotal * 0.15;
    return { subtotal, tax, total: subtotal + tax };
  };

  const handleItemVariantSelect = (index: number, variantId: string) => {
    const variant = inventoryItems.find(i => i.id === variantId);
    if (!variant) return;

    const newItems = [...(formData.items || [])];
    newItems[index] = {
      ...newItems[index],
      itemVariantId: variant.id,
      name: `${variant.name}${variant.size ? ` - ${variant.size}` : ''}${variant.style ? ` - ${variant.style}` : ''}`,
      unitPrice: variant.pricePerUnit,
    };
    newItems[index].total = (Number(newItems[index].quantity) || 0) * newItems[index].unitPrice;
    
    const totals = calculateTotals(newItems);
    setFormData({ ...formData, items: newItems, ...totals });
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...(formData.items || [])] as any[];
    newItems[index] = { ...newItems[index], [field]: value };
    
    if (field === 'quantity' || field === 'unitPrice') {
      newItems[index].total = (Number(newItems[index].quantity) || 0) * (Number(newItems[index].unitPrice) || 0);
    }
    
    const totals = calculateTotals(newItems);
    setFormData({ ...formData, items: newItems, ...totals });
  };

  const addItem = () => {
    const newItems = [...(formData.items || []), { itemVariantId: '', name: '', quantity: 1, unitPrice: 0, total: 0 }];
    setFormData({ ...formData, items: newItems });
  };

  const removeItem = (index: number) => {
    const newItems = [...(formData.items || [])];
    newItems.splice(index, 1);
    const totals = calculateTotals(newItems);
    setFormData({ ...formData, items: newItems, ...totals });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerId || !formData.startDate || !formData.endDate || formData.depositAmount === undefined) {
      alert('Please fill out all required fields.');
      return;
    }
    if (formData.startDate >= formData.endDate) {
      alert('Start date must be before end date.');
      return;
    }

    // Check stock client side before submitting
    for (const item of formData.items || []) {
      const variant = inventoryItems.find(v => v.id === item.itemVariantId);
      if (variant && item.quantity > variant.currentStock) {
         alert(`Insufficient on-hand stock for ${item.name}. Only ${variant.currentStock} available.`);
         return;
      }
    }

    try {
      setSaving(true);
      const dataToSave = {
        ...formData,
        customerName: customers.find(c => c.id === formData.customerId)?.name || 'Unknown',
      };

      await createWalkinRental(dataToSave as any);
      onSave();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to save walk-in rental');
      setSaving(false);
    }
  };

  const formatDateForInput = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border-t-4 border-[#DC2626]">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <h3 className="font-bold text-lg text-[#1A1A1A]">
            New Walk-in Rental
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-[#1A1A1A] transition-colors">
            <Check className="w-5 h-5 hidden" /> {/* Just to trick linter if needed */}
            <span className="text-2xl leading-none">&times;</span>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="flex-1 overflow-auto p-6 flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Customer</label>
              <select 
                value={formData.customerId || ''}
                onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                className="w-full p-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626]"
                required
              >
                <option value="">Select a customer</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Start Date</label>
              <input 
                type="date" 
                value={formData.startDate ? formatDateForInput(formData.startDate) : ''}
                onChange={(e) => setFormData({ ...formData, startDate: new Date(e.target.value) })}
                className="w-full p-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626]"
                required
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">End Date</label>
              <input 
                type="date" 
                value={formData.endDate ? formatDateForInput(formData.endDate) : ''}
                onChange={(e) => setFormData({ ...formData, endDate: new Date(e.target.value) })}
                className="w-full p-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626]"
                required
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Deposit Collected Now ($)</label>
              <input 
                type="number" 
                min="0"
                step="0.01"
                value={formData.depositAmount}
                onChange={(e) => setFormData({ ...formData, depositAmount: Number(e.target.value) })}
                className="w-full p-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Advance Payment ($) - Optional</label>
              <input 
                type="number" 
                min="0"
                step="0.01"
                value={formData.advancePayment || ''}
                onChange={(e) => setFormData({ ...formData, advancePayment: Number(e.target.value) })}
                className="w-full p-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626]"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Items</label>
              <button 
                type="button"
                onClick={addItem}
                className="text-sm font-bold text-[#DC2626] hover:text-red-700 transition-colors flex items-center gap-1"
              >
                <Plus className="w-4 h-4" /> Add Item
              </button>
            </div>
            
            <div className="border border-gray-200 rounded overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="p-2 text-xs font-bold uppercase text-gray-500 w-2/5">Item</th>
                    <th className="p-2 text-xs font-bold uppercase text-gray-500 w-1/5">Stock</th>
                    <th className="p-2 text-xs font-bold uppercase text-gray-500 w-1/12">Qty</th>
                    <th className="p-2 text-xs font-bold uppercase text-gray-500 w-1/6">Price</th>
                    <th className="p-2 text-xs font-bold uppercase text-gray-500 w-1/6 text-right">Total</th>
                    <th className="p-2 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {formData.items?.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-4 text-center text-sm text-gray-500">No items added yet.</td>
                    </tr>
                  ) : formData.items?.map((item, index) => {
                    const variant = inventoryItems.find(v => v.id === item.itemVariantId);
                    const onHand = variant ? variant.currentStock : 0;
                    const isAvailable = onHand >= (item.quantity || 0);
                    return (
                    <tr key={index}>
                      <td className="p-2">
                        <select
                          value={item.itemVariantId || ''}
                          onChange={(e) => handleItemVariantSelect(index, e.target.value)}
                          className="w-full p-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#DC2626]"
                          required
                        >
                          <option value="" disabled>Select Item</option>
                          {inventoryItems.map(inv => (
                            <option key={inv.id} value={inv.id}>
                              {inv.name} {inv.size ? `- ${inv.size}` : ''} {inv.style ? `- ${inv.style}` : ''}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-2">
                        {item.itemVariantId && (
                          <span className={`text-xs font-bold px-2 py-1 rounded ${isAvailable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-[#DC2626]'}`}>
                            On Hand: {onHand}
                          </span>
                        )}
                      </td>
                      <td className="p-2">
                        <input 
                          type="number" 
                          min="1"
                          value={item.quantity || ''}
                          onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))}
                          className="w-full p-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#DC2626]"
                          required
                        />
                      </td>
                      <td className="p-2">
                        <input 
                          type="number" 
                          min="0"
                          step="0.01"
                          value={item.unitPrice !== undefined ? item.unitPrice : ''}
                          onChange={(e) => handleItemChange(index, 'unitPrice', Number(e.target.value))}
                          className="w-full p-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#DC2626]"
                          required
                        />
                      </td>
                      <td className="p-2 text-right text-sm font-medium text-[#1A1A1A]">
                        ${(item.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-2 text-right">
                        <button 
                          type="button"
                          onClick={() => removeItem(index)}
                          className="text-gray-400 hover:text-[#DC2626] transition-colors"
                        >
                          <span className="text-xl">&times;</span>
                        </button>
                      </td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>
            
            <div className="flex justify-between items-end mt-4">
              <div>
                <button
                  type="button"
                  onClick={() => {
                    setFormData({ ...formData, contractPartBUrl: 'https://dummy-contract-b.pdf' });
                    alert('Contract Part B Generated (Dummy URL set)');
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-800 rounded font-bold text-sm hover:bg-gray-200 transition-colors"
                >
                  Generate Contract Part B
                </button>
                {formData.contractPartBUrl && (
                  <p className="text-xs text-green-600 mt-2">Contract ready.</p>
                )}
              </div>
              <div className="w-64 space-y-2">
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Subtotal</span>
                  <span>${(formData.subtotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Tax (15%)</span>
                  <span>${(formData.tax || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-base font-bold text-[#1A1A1A] pt-2 border-t border-gray-200">
                  <span>Total</span>
                  <span>${(formData.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
          </div>
        </form>
        
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-2">
          <button 
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-200 rounded text-sm font-bold text-gray-600 hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSubmit}
            disabled={saving}
            className="bg-[#DC2626] text-white px-6 py-2 rounded text-sm font-bold hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Walk-in Rental'}
          </button>
        </div>
      </div>
    </div>
  );
}
