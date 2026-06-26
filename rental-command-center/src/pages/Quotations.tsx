import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, X, Check, FileText } from 'lucide-react';
import { getQuotations, addQuotation, updateQuotation, deleteQuotation, convertToBooking, Quotation, QuotationItem, getInventoryItems, InventoryItem } from '../services/quotationService';
import { getCustomers, Customer } from '../services/customerService';
import { format } from 'date-fns';

export function Quotations() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentQuote, setCurrentQuote] = useState<Partial<Quotation> | null>(null);
  
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [quotesData, customersData, inventoryData] = await Promise.all([
        getQuotations(),
        getCustomers(),
        getInventoryItems()
      ]);
      setQuotations(quotesData.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
      setCustomers(customersData);
      setInventoryItems(inventoryData);
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError('Failed to load quotations.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Draft': return 'bg-gray-100 text-gray-800';
      case 'Sent': return 'bg-blue-100 text-blue-800';
      case 'Accepted': return 'bg-green-100 text-green-800';
      case 'Expired': return 'bg-red-100 text-[#DC2626]';
      case 'Converted': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this quotation?')) {
      try {
        await deleteQuotation(id);
        fetchData();
      } catch (err) {
        alert('Failed to delete quotation');
      }
    }
  };

  const handleConvert = async (id: string) => {
    try {
      await convertToBooking(id);
      fetchData();
      alert('Successfully converted to booking!');
    } catch (err) {
      alert('Failed to convert quotation');
    }
  };

  const openModal = (quote: Quotation | null = null) => {
    if (quote) {
      setCurrentQuote(quote);
    } else {
      setCurrentQuote({
        customerId: '',
        customerName: '',
        items: [],
        startDate: new Date(),
        endDate: new Date(),
        subtotal: 0,
        tax: 0,
        total: 0,
        status: 'Draft'
      });
    }
    setIsModalOpen(true);
  };

  const filteredQuotes = quotations.filter(q => 
    q.customerName.toLowerCase().includes(search.toLowerCase()) || 
    q.status.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-white border border-gray-200 rounded shadow-sm">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between shrink-0">
        <h2 className="font-bold text-lg text-[#1A1A1A]">Quotations</h2>
        <button 
          onClick={() => openModal()}
          className="bg-[#DC2626] text-white px-4 py-2 rounded text-sm font-bold hover:bg-red-700 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Quotation
        </button>
      </div>

      <div className="p-4 border-b border-gray-100 flex gap-4 shrink-0 bg-gray-50/50">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search by customer or status..." 
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
        ) : filteredQuotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <FileText className="w-12 h-12 text-gray-300 mb-4" />
            <p>No quotations found.</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 sticky top-0 border-b border-gray-200">
              <tr>
                <th className="p-4 text-xs font-bold uppercase text-gray-500 tracking-wider">Customer</th>
                <th className="p-4 text-xs font-bold uppercase text-gray-500 tracking-wider">Schedule</th>
                <th className="p-4 text-xs font-bold uppercase text-gray-500 tracking-wider">Total Amount</th>
                <th className="p-4 text-xs font-bold uppercase text-gray-500 tracking-wider">Status</th>
                <th className="p-4 text-xs font-bold uppercase text-gray-500 tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredQuotes.map(quote => (
                <tr key={quote.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="p-4">
                    <p className="font-medium text-[#1A1A1A]">{quote.customerName}</p>
                    <p className="text-xs text-gray-500">ID: {quote.id.slice(0, 8)}</p>
                  </td>
                  <td className="p-4">
                    <p className="text-sm text-[#1A1A1A]">{format(quote.startDate, 'MMM d, yyyy')}</p>
                    <p className="text-xs text-gray-500">to {format(quote.endDate, 'MMM d, yyyy')}</p>
                  </td>
                  <td className="p-4 font-medium text-[#1A1A1A]">
                    ${quote.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider ${getStatusColor(quote.status)}`}>
                      {quote.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {quote.status !== 'Converted' && (
                        <button 
                          onClick={() => handleConvert(quote.id)}
                          title="Convert to Booking"
                          className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                      <button 
                        onClick={() => openModal(quote)}
                        className="p-2 text-gray-400 hover:text-[#1A1A1A] hover:bg-gray-100 rounded transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(quote.id)}
                        className="p-2 text-gray-400 hover:text-[#DC2626] hover:bg-red-50 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {isModalOpen && currentQuote && (
        <QuoteModal 
          quote={currentQuote} 
          customers={customers}
          inventoryItems={inventoryItems}
          onClose={() => setIsModalOpen(false)} 
          onSave={fetchData} 
        />
      )}
    </div>
  );
}

function QuoteModal({ quote, customers, inventoryItems, onClose, onSave }: { quote: Partial<Quotation>, customers: Customer[], inventoryItems: InventoryItem[], onClose: () => void, onSave: () => void }) {
  const [formData, setFormData] = useState<Partial<Quotation>>({
    ...quote,
    startDate: quote.startDate || new Date(),
    endDate: quote.endDate || new Date(),
    items: quote.items || [],
  });
  const [saving, setSaving] = useState(false);

  const calculateTotals = (items: QuotationItem[]) => {
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

  const handleItemChange = (index: number, field: keyof QuotationItem, value: any) => {
    const newItems = [...(formData.items || [])];
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
    if (!formData.customerId || !formData.startDate || !formData.endDate) {
      alert('Please fill out all required fields.');
      return;
    }

    try {
      setSaving(true);
      const dataToSave = {
        ...formData,
        customerName: customers.find(c => c.id === formData.customerId)?.name || 'Unknown',
      };

      if (quote.id) {
        await updateQuotation(quote.id, dataToSave as any);
      } else {
        await addQuotation(dataToSave as any);
      }
      onSave();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to save quotation');
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
            {quote.id ? 'Edit Quotation' : 'New Quotation'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-[#1A1A1A] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="flex-1 overflow-auto p-6 flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Customer</label>
              <select 
                value={formData.customerId}
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
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Status</label>
              <select 
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full p-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626]"
              >
                <option value="Draft">Draft</option>
                <option value="Sent">Sent</option>
                <option value="Accepted">Accepted</option>
                <option value="Expired">Expired</option>
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
                    <th className="p-2 text-xs font-bold uppercase text-gray-500 w-1/2">Description</th>
                    <th className="p-2 text-xs font-bold uppercase text-gray-500 w-1/6">Qty</th>
                    <th className="p-2 text-xs font-bold uppercase text-gray-500 w-1/6">Price</th>
                    <th className="p-2 text-xs font-bold uppercase text-gray-500 w-1/6 text-right">Total</th>
                    <th className="p-2 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {formData.items?.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-sm text-gray-500">No items added yet.</td>
                    </tr>
                  ) : formData.items?.map((item, index) => (
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
                        <input 
                          type="number" 
                          min="1"
                          value={item.quantity}
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
                          value={item.unitPrice}
                          onChange={(e) => handleItemChange(index, 'unitPrice', Number(e.target.value))}
                          className="w-full p-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#DC2626]"
                          required
                        />
                      </td>
                      <td className="p-2 text-right text-sm font-medium text-[#1A1A1A]">
                        ${item.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-2 text-right">
                        <button 
                          type="button"
                          onClick={() => removeItem(index)}
                          className="text-gray-400 hover:text-[#DC2626] transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="flex justify-end mt-4">
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
            {saving ? 'Saving...' : 'Save Quotation'}
          </button>
        </div>
      </div>
    </div>
  );
}
