import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, X, AlertTriangle, ListFilter, SlidersHorizontal, DollarSign, Package, CheckCircle, RefreshCw } from 'lucide-react';
import { getItemVariants, addItemVariant, updateItemVariant, deleteItemVariant, adjustStock, ItemVariant } from '../../services/inventoryService';

export function ItemsAndVariants() {
  const [variants, setVariants] = useState<ItemVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Search and filter state
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [editingVariant, setEditingVariant] = useState<ItemVariant | null>(null);
  const [selectedVariantForAdjust, setSelectedVariantForAdjust] = useState<ItemVariant | null>(null);

  // Single record Form state
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    subcategory: '',
    size: '',
    style: '',
    pricePerUnit: 0,
    currentStock: 0,
    minStockAlert: 5
  });

  // Stock Adjustment state
  const [adjustData, setAdjustData] = useState({
    delta: 0,
    reason: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getItemVariants();
      setVariants(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch item variants catalog');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingVariant(null);
    setFormData({
      name: '',
      category: 'Chair',
      subcategory: '',
      size: 'Medium',
      style: 'Standard',
      pricePerUnit: 10,
      currentStock: 10,
      minStockAlert: 5
    });
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (item: ItemVariant) => {
    setEditingVariant(item);
    setFormData({
      name: item.name,
      category: item.category,
      subcategory: item.subcategory || '',
      size: item.size || '',
      style: item.style || '',
      pricePerUnit: item.pricePerUnit,
      currentStock: item.currentStock,
      minStockAlert: item.minStockAlert || 5
    });
    setIsFormModalOpen(true);
  };

  const handleOpenAdjustModal = (item: ItemVariant) => {
    setSelectedVariantForAdjust(item);
    setAdjustData({
      delta: 1,
      reason: 'Procured extra warehouse stocks'
    });
    setIsAdjustModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.category) {
      alert('Item Name and Category are required');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        name: formData.name,
        category: formData.category,
        subcategory: formData.subcategory || undefined,
        size: formData.size || undefined,
        style: formData.style || undefined,
        pricePerUnit: Number(formData.pricePerUnit) || 0,
        currentStock: Number(formData.currentStock) || 0,
        minStockAlert: Number(formData.minStockAlert) || undefined
      };

      if (editingVariant) {
        await updateItemVariant(editingVariant.id, payload);
      } else {
        await addItemVariant(payload);
      }
      setIsFormModalOpen(false);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Error saving variant details');
      setLoading(false);
    }
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVariantForAdjust) return;

    try {
      setLoading(true);
      await adjustStock(
        selectedVariantForAdjust.id,
        Number(adjustData.delta),
        adjustData.reason
      );
      setIsAdjustModalOpen(false);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Error adjusting stock levels');
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to completely delete this item from inventory records?')) return;
    try {
      setLoading(true);
      await deleteItemVariant(id);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Error deleting item variant. Note: Cannot delete item variants with bookings or rentals references.');
      setLoading(false);
    }
  };

  const categories = Array.from(new Set(variants.map(v => v.category)));

  // Filter local data lists
  const filteredVariants = variants.filter(v => {
    const matchesCategory = categoryFilter === 'All' || v.category === categoryFilter;
    const matchesSearch = v.name.toLowerCase().includes(search.toLowerCase()) || 
      (v.subcategory && v.subcategory.toLowerCase().includes(search.toLowerCase())) ||
      (v.style && v.style.toLowerCase().includes(search.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="flex flex-col h-full bg-white border border-gray-200 rounded shadow-sm text-sm">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between shrink-0">
        <h2 className="font-bold text-lg text-[#1A1A1A] flex items-center gap-2">
          <Package className="w-5 h-5 text-[#DC2626]" /> Items & Stock Variants Catalog
        </h2>
        <button 
          onClick={handleOpenAddModal}
          className="bg-[#DC2626] hover:bg-red-700 text-white font-bold px-4 py-2 rounded text-sm flex items-center gap-2 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add Item Variant
        </button>
      </div>

      {/* Filters Strip */}
      <div className="p-4 border-b border-gray-100 flex flex-wrap gap-4 bg-gray-50/50 shrink-0">
        <div className="relative flex-1 min-w-[240px] max-w-xs">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search catalog by name, model..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#DC2626]"
          />
        </div>

        <div className="flex items-center gap-2">
          <ListFilter className="w-4 h-4 text-gray-400" />
          <select 
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="p-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#DC2626] bg-white"
          >
            <option value="All">All Categories</option>
            {categories.map((cat, idx) => (
              <option key={idx} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-[#DC2626]"></div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <AlertTriangle className="w-12 h-12 text-[#DC2626] mb-4" />
            <p className="text-[#DC2626] font-medium mb-4">{error}</p>
            <button onClick={loadData} className="bg-[#1A1A1A] text-white px-4 py-2 rounded font-bold hover:bg-black cursor-pointer">
              Retry
            </button>
          </div>
        ) : filteredVariants.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 p-4">
            <Package className="w-12 h-12 text-gray-300 mb-4" />
            <p className="font-medium text-gray-600">No items on record.</p>
            <p className="text-sm text-gray-400">Add chair types, tables or premium linens to your inventory list.</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
              <tr>
                <th className="p-4 text-xs font-bold uppercase text-gray-500 tracking-wider">Item Details</th>
                <th className="p-4 text-xs font-bold uppercase text-gray-500 tracking-wider">Category</th>
                <th className="p-4 text-xs font-bold uppercase text-gray-500 tracking-wider">Style / Model</th>
                <th className="p-4 text-xs font-bold uppercase text-gray-500 tracking-wider">Size</th>
                <th className="p-4 text-xs font-bold uppercase text-gray-500 tracking-wider">Daily Rate</th>
                <th className="p-4 text-xs font-bold uppercase text-gray-500 tracking-wider text-center">On-Hand Stock</th>
                <th className="p-4 text-xs font-bold uppercase text-gray-500 tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {filteredVariants.map(variant => {
                const isUnderStock = variant.minStockAlert !== undefined && variant.currentStock <= variant.minStockAlert;
                return (
                  <tr key={variant.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4 font-semibold text-[#1A1A1A]">{variant.name}</td>
                    <td className="p-4 text-gray-700 font-medium">{variant.category}</td>
                    <td className="p-4 text-gray-500 font-medium">{variant.style || '-'}</td>
                    <td className="p-4 text-gray-500">{variant.size || '-'}</td>
                    <td className="p-4 font-mono font-bold text-gray-900">${variant.pricePerUnit.toFixed(2)}/day</td>
                    <td className="p-4 text-center">
                      <div className="flex flex-col items-center justify-center gap-1">
                        <span className={`font-mono font-bold px-2.5 py-1 rounded text-sm border ${
                          isUnderStock 
                            ? 'bg-red-50 text-[#DC2626] border-red-200 animate-pulse' 
                            : 'bg-green-50 text-green-700 border-green-200'
                        }`}>
                          {variant.currentStock} units
                        </span>
                        {isUnderStock && (
                          <span className="text-[10px] text-red-500 font-bold uppercase flex items-center gap-0.5">
                            <AlertTriangle className="w-3 h-3" /> Reorder Alert
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-right space-x-1 whitespace-nowrap">
                      <button 
                        onClick={() => handleOpenAdjustModal(variant)}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs px-3 py-1.5 rounded cursor-pointer inline-flex items-center gap-1 transition-colors"
                        title="Adjust on-hand counts"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Adjust
                      </button>
                      <button 
                        onClick={() => handleOpenEditModal(variant)}
                        className="p-1.5 text-gray-600 hover:text-blue-600 rounded-md hover:bg-gray-100 transition-colors inline-flex items-center justify-center cursor-pointer"
                        title="Edit Details"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(variant.id)}
                        className="p-1.5 text-gray-500 hover:text-red-600 rounded-md hover:bg-gray-100 transition-colors inline-flex items-center justify-center cursor-pointer"
                        title="Delete Variant"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Add / Edit Form Modal */}
      {isFormModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded shadow-xl w-full max-w-md overflow-hidden border-t-4 border-[#DC2626]">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="font-bold text-lg text-[#1A1A1A]">{editingVariant ? 'Edit Variant Fields' : 'Procure New Variant'}</h3>
              <button onClick={() => setIsFormModalOpen(false)} className="text-gray-400 hover:text-[#1A1A1A] cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Item Name *</label>
                <input 
                  type="text" required
                  placeholder="e.g. Dinkuan - Small - Zend"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full p-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#DC2626]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e: any) => setFormData({...formData, category: e.target.value})}
                    className="w-full p-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#DC2626]"
                  >
                    <option value="Chair">Chair</option>
                    <option value="Table">Table</option>
                    <option value="Tent">Tent</option>
                    <option value="Linen">Linen</option>
                    <option value="Catering">Catering</option>
                    <option value="Other">Other Category</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Subcategory</label>
                  <input 
                    type="text"
                    placeholder="e.g. Dinkuan, Wedding"
                    value={formData.subcategory}
                    onChange={(e) => setFormData({...formData, subcategory: e.target.value})}
                    className="w-full p-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#DC2626]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Size (Dimensions)</label>
                  <input 
                    type="text"
                    placeholder="e.g. Small, 6ft, 10x10"
                    value={formData.size}
                    onChange={(e) => setFormData({...formData, size: e.target.value})}
                    className="w-full p-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#DC2626]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Style / Material</label>
                  <input 
                    type="text"
                    placeholder="e.g. Zend, Wood, Shera"
                    value={formData.style}
                    onChange={(e) => setFormData({...formData, style: e.target.value})}
                    className="w-full p-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#DC2626]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Rental Price ($) *</label>
                  <input 
                    type="number" min="0" step="0.01" required
                    value={formData.pricePerUnit}
                    onChange={(e) => setFormData({...formData, pricePerUnit: Number(e.target.value)})}
                    className="w-full p-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#DC2626] font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Initial Stock *</label>
                  <input 
                    type="number" min="0" required
                    disabled={!!editingVariant}
                    value={formData.currentStock}
                    onChange={(e) => setFormData({...formData, currentStock: Number(e.target.value)})}
                    className="w-full p-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#DC2626] font-mono disabled:bg-gray-100"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Reorder Threshold *</label>
                  <input 
                    type="number" min="0" required
                    value={formData.minStockAlert}
                    onChange={(e) => setFormData({...formData, minStockAlert: Number(e.target.value)})}
                    className="w-full p-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#DC2626] font-mono"
                  />
                </div>
              </div>

              <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-2 -mx-6 -mb-6">
                <button 
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 rounded text-sm font-bold text-gray-600 hover:bg-gray-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="bg-[#DC2626] text-white px-6 py-2 rounded text-sm font-bold hover:bg-red-700 transition-colors cursor-pointer"
                >
                  Save Variant
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {isAdjustModalOpen && selectedVariantForAdjust && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded shadow-xl w-full max-w-sm overflow-hidden border-t-4 border-[#DC2626]">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="font-bold text-lg text-[#1A1A1A]">Adjust Stock Levels</h3>
              <button onClick={() => setIsAdjustModalOpen(false)} className="text-gray-400 hover:text-[#1A1A1A] cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAdjustSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="bg-red-50/30 p-3 rounded text-xs border border-red-100 space-y-1">
                <p className="font-bold text-gray-900">Item: {selectedVariantForAdjust.name}</p>
                <p className="text-gray-500">Current Warehouse Holdings: <span className="font-mono font-bold text-gray-900">{selectedVariantForAdjust.currentStock} units</span></p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Stock Delta (positive/negative) *</label>
                <input 
                  type="number" required
                  placeholder="e.g. +5 or -3"
                  value={adjustData.delta}
                  onChange={(e) => setAdjustData({...adjustData, delta: Number(e.target.value)})}
                  className="w-full p-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#DC2626] font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Reason / Reference notes *</label>
                <textarea 
                  required
                  placeholder="e.g. Added 5 premium silks from procurement, retired 2 damaged tables..."
                  value={adjustData.reason}
                  onChange={(e) => setAdjustData({...adjustData, reason: e.target.value})}
                  className="w-full p-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#DC2626] h-20 resize-none"
                />
              </div>

              <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-2 -mx-6 -mb-6">
                <button 
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 rounded text-sm font-bold text-gray-600 hover:bg-gray-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="bg-[#DC2626] text-white px-6 py-2 rounded text-sm font-bold hover:bg-red-700 transition-colors cursor-pointer"
                >
                  Execute Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
