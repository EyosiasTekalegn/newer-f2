import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, X, Archive, HelpCircle, DollarSign, Package, CheckCircle, ListPlus, Eye } from 'lucide-react';
import { getPackages, addPackage, updatePackage, deletePackage, expandPackage, RentalPackage } from '../../services/packageService';
import { getItemVariants, ItemVariant } from '../../services/inventoryService';

export function PackagesBundles() {
  const [packages, setPackages] = useState<RentalPackage[]>([]);
  const [variants, setVariants] = useState<ItemVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [search, setSearch] = useState('');

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<RentalPackage | null>(null);
  const [viewingPackage, setViewingPackage] = useState<RentalPackage | null>(null);
  const [expandedItems, setExpandedItems] = useState<Array<{ name: string; quantity: number; pricePerUnit: number }>>([]);

  // Form state
  const [formFields, setFormFields] = useState({
    name: '',
    description: '',
    packagePrice: 0,
    isActive: true
  });

  // Selected items inside form: record of variantId -> quantity
  const [formItems, setFormItems] = useState<Array<{ itemVariantId: string; quantity: number }>>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [pkgsData, variantsData] = await Promise.all([
        getPackages(),
        getItemVariants()
      ]);
      setPackages(pkgsData);
      setVariants(variantsData);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch rental packages list');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingPackage(null);
    setFormFields({
      name: '',
      description: '',
      packagePrice: 50,
      isActive: true
    });
    setFormItems([]);
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (pkg: RentalPackage) => {
    setEditingPackage(pkg);
    setFormFields({
      name: pkg.name,
      description: pkg.description || '',
      packagePrice: pkg.packagePrice,
      isActive: pkg.isActive
    });
    setFormItems(pkg.items.map(it => ({
      itemVariantId: it.itemVariantId,
      quantity: it.quantity
    })));
    setIsFormModalOpen(true);
  };

  const handleOpenViewModal = async (pkg: RentalPackage) => {
    setViewingPackage(pkg);
    try {
      setLoading(true);
      const expanded = await expandPackage(pkg.id);
      setExpandedItems(expanded);
      setIsViewModalOpen(true);
    } catch (err: any) {
      alert('Error expanding bundle constituent items');
    } finally {
      setLoading(false);
    }
  };

  const handleAddFormItemRow = () => {
    const availableVariant = variants.find(v => !formItems.some(item => item.itemVariantId === v.id));
    if (!availableVariant) {
      alert('All catalog items are already added to this package bundle');
      return;
    }
    setFormItems([...formItems, { itemVariantId: availableVariant.id, quantity: 1 }]);
  };

  const handleRemoveFormItemRow = (index: number) => {
    const updated = formItems.filter((_, idx) => idx !== index);
    setFormItems(updated);
  };

  const handleFormItemChange = (index: number, field: 'itemVariantId' | 'quantity', value: any) => {
    const updated = [...formItems];
    if (field === 'itemVariantId') {
      updated[index].itemVariantId = value;
    } else {
      updated[index].quantity = Math.max(1, Number(value) || 1);
    }
    setFormItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formFields.name) {
      alert('Package Name is required');
      return;
    }
    if (formItems.length === 0) {
      alert('Specify at least one constituent variant item in this bundle package');
      return;
    }

    try {
      setLoading(true);
      
      // Clean and denormalize names for database
      const preparedItems = formItems.map(it => {
        const variant = variants.find(v => v.id === it.itemVariantId);
        return {
          itemVariantId: it.itemVariantId,
          name: variant ? variant.name : 'Unknown Item',
          quantity: it.quantity
        };
      });

      const payload = {
        name: formFields.name,
        description: formFields.description || undefined,
        items: preparedItems,
        packagePrice: Number(formFields.packagePrice) || 0,
        isActive: formFields.isActive
      };

      if (editingPackage) {
        await updatePackage(editingPackage.id, payload);
      } else {
        await addPackage(payload);
      }
      setIsFormModalOpen(false);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Error saving package bundle');
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this bundle package?')) return;
    try {
      setLoading(true);
      await deletePackage(id);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Error deleting package');
      setLoading(false);
    }
  };

  const filteredPackages = packages.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    (p.description && p.description.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="flex flex-col h-full bg-white border border-gray-200 rounded shadow-sm text-sm">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between shrink-0">
        <h2 className="font-bold text-lg text-[#1A1A1A] flex items-center gap-2">
          <Archive className="w-5 h-5 text-[#DC2626]" /> Rental Packages & Bundles
        </h2>
        <button 
          onClick={handleOpenAddModal}
          className="bg-[#DC2626] hover:bg-red-700 text-white font-bold px-4 py-2 rounded text-sm flex items-center gap-2 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Create Package Bundle
        </button>
      </div>

      {/* Filter and Search */}
      <div className="p-4 border-b border-gray-100 flex gap-4 bg-gray-50/50 shrink-0">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search packages by name or description..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#DC2626]"
          />
        </div>
      </div>

      {/* Main Grid of Packages */}
      <div className="flex-1 overflow-auto p-4 bg-gray-50/40">
        {loading && packages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-[#DC2626]"></div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <X className="w-12 h-12 text-[#DC2626] mb-4" />
            <p className="text-[#DC2626] font-medium mb-4">{error}</p>
            <button onClick={loadData} className="bg-[#1A1A1A] text-white px-4 py-2 rounded font-bold hover:bg-black cursor-pointer">
              Retry
            </button>
          </div>
        ) : filteredPackages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 p-4">
            <Archive className="w-12 h-12 text-gray-300 mb-4" />
            <p className="font-medium text-gray-600">No rental packages available.</p>
            <p className="text-sm text-gray-400">Bundle item listings for discounts (e.g. VIP Sets).</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPackages.map(pkg => (
              <div key={pkg.id} className="bg-white border border-gray-200 rounded p-5 flex flex-col justify-between shadow-2xs hover:border-gray-300 transition-all hover:shadow-xs relative">
                <div>
                  <div className="flex justify-between items-start gap-2">
                    <h3 className="font-bold text-base text-gray-900 leading-snug">{pkg.name}</h3>
                    <span className={`inline-flex px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      pkg.isActive ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-gray-50 text-gray-500 border border-gray-150'
                    }`}>
                      {pkg.isActive ? 'Active' : 'Draft'}
                    </span>
                  </div>
                  {pkg.description && (
                    <p className="text-xs text-gray-500 mt-1.5 leading-relaxed line-clamp-2">{pkg.description}</p>
                  )}

                  <div className="mt-4 border-t border-gray-100 pt-3">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1.5">Bundle Constituents:</span>
                    <div className="space-y-1">
                      {pkg.items.slice(0, 3).map((it, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs text-gray-600">
                          <span className="truncate">{it.name || `Variant ${it.itemVariantId}`}</span>
                          <span className="font-mono font-bold text-gray-900 shrink-0 bg-gray-50 border px-1.5 py-0.5 rounded ml-2">x{it.quantity}</span>
                        </div>
                      ))}
                      {pkg.items.length > 3 && (
                        <p className="text-[10px] text-red-500 font-bold uppercase mt-1">+{pkg.items.length - 3} more items in bundle</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Package Flat Rate</span>
                    <p className="text-xl font-mono font-bold text-gray-900">${pkg.packagePrice.toFixed(2)}</p>
                  </div>

                  <div className="flex gap-1">
                    <button 
                      onClick={() => handleOpenViewModal(pkg)}
                      className="p-2 text-gray-600 hover:text-gray-900 rounded-md hover:bg-gray-100 cursor-pointer"
                      title="Expand / View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleOpenEditModal(pkg)}
                      className="p-2 text-gray-600 hover:text-blue-600 rounded-md hover:bg-gray-100 cursor-pointer"
                      title="Edit Bundle"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(pkg.id)}
                      className="p-2 text-gray-600 hover:text-red-600 rounded-md hover:bg-gray-100 cursor-pointer"
                      title="Delete Bundle"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit Package Modal Form */}
      {isFormModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded shadow-xl w-full max-w-lg overflow-hidden border-t-4 border-[#DC2626]">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="font-bold text-lg text-[#1A1A1A]">{editingPackage ? 'Edit Rental Package' : 'Create Rental Package'}</h3>
              <button onClick={() => setIsFormModalOpen(false)} className="text-gray-400 hover:text-[#1A1A1A] cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Package Title *</label>
                <input 
                  type="text" required
                  placeholder="e.g. VIP Golden Wedding Bundle"
                  value={formFields.name}
                  onChange={(e) => setFormFields({...formFields, name: e.target.value})}
                  className="w-full p-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#DC2626]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Description</label>
                <textarea 
                  placeholder="e.g. Includes golden tier banquet tables, premium silk linen sheets, and cross-back chairs..."
                  value={formFields.description}
                  onChange={(e) => setFormFields({...formFields, description: e.target.value})}
                  className="w-full p-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#DC2626] h-16 resize-none"
                />
              </div>

              {/* Nested Item Lists builder */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Package Constituents *</label>
                  <button 
                    type="button"
                    onClick={handleAddFormItemRow}
                    className="text-[#DC2626] hover:text-red-700 font-bold text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <ListPlus className="w-3.5 h-3.5" /> Add Item Variant
                  </button>
                </div>

                <div className="border border-gray-200 rounded max-h-40 overflow-auto p-2 space-y-2 bg-gray-50/50">
                  {formItems.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-4">No items listed. Click "Add Item Variant" above to build your bundle.</p>
                  ) : (
                    formItems.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <select
                          value={item.itemVariantId}
                          onChange={(e) => handleFormItemChange(idx, 'itemVariantId', e.target.value)}
                          className="flex-1 p-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:border-[#DC2626] bg-white"
                        >
                          {variants.map(v => (
                            <option key={v.id} value={v.id}>{v.name} (${v.pricePerUnit.toFixed(2)}/day)</option>
                          ))}
                        </select>
                        <input 
                          type="number" min="1" required
                          value={item.quantity}
                          onChange={(e) => handleFormItemChange(idx, 'quantity', e.target.value)}
                          className="w-16 p-1.5 border border-gray-200 rounded text-xs font-mono font-bold focus:outline-none focus:border-[#DC2626]"
                        />
                        <button 
                          type="button"
                          onClick={() => handleRemoveFormItemRow(idx)}
                          className="text-gray-400 hover:text-red-600 p-1 cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Bundle Price ($) *</label>
                  <input 
                    type="number" min="0" step="0.01" required
                    value={formFields.packagePrice}
                    onChange={(e) => setFormFields({...formFields, packagePrice: Number(e.target.value)})}
                    className="w-full p-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#DC2626] font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500 block mb-2">Publish Status</label>
                  <label className="flex items-center gap-1.5 text-sm cursor-pointer select-none">
                    <input 
                      type="checkbox"
                      checked={formFields.isActive}
                      onChange={(e) => setFormFields({...formFields, isActive: e.target.checked})}
                      className="rounded border-gray-300 text-[#DC2626] focus:ring-[#DC2626]"
                    />
                    Active & Available for Quotations
                  </label>
                </div>
              </div>

              {/* Footer */}
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
                  Save Package
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Expand / View Package Details Modal */}
      {isViewModalOpen && viewingPackage && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded shadow-xl w-full max-w-md overflow-hidden border-t-4 border-[#DC2626]">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="font-bold text-lg text-[#1A1A1A]">Package Constituents</h3>
              <button onClick={() => setIsViewModalOpen(false)} className="text-gray-400 hover:text-[#1A1A1A] cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-gray-50 p-3 rounded border border-gray-150 space-y-1">
                <p className="font-bold text-gray-900 text-sm">{viewingPackage.name}</p>
                {viewingPackage.description && (
                  <p className="text-xs text-gray-500 leading-relaxed">{viewingPackage.description}</p>
                )}
              </div>

              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Item Breakdown:</h4>
                <div className="border border-gray-200 rounded max-h-48 overflow-auto divide-y divide-gray-100">
                  {expandedItems.map((it, idx) => (
                    <div key={idx} className="p-2.5 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-semibold text-gray-800">{it.name}</p>
                        <p className="text-[10px] text-gray-400">Rate: ${it.pricePerUnit.toFixed(2)}/unit per day</p>
                      </div>
                      <span className="font-mono font-bold text-gray-900 bg-gray-50 border px-2 py-0.5 rounded">x{it.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                <div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Est. Indiv. Value</span>
                  <span className="font-mono text-gray-500 font-bold text-sm">
                    ${expandedItems.reduce((acc, current) => acc + (current.pricePerUnit * current.quantity), 0).toFixed(2)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-[#DC2626] font-bold uppercase tracking-wider block">Bundle Price</span>
                  <span className="font-mono text-xl font-bold text-[#DC2626]">
                    ${viewingPackage.packagePrice.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
