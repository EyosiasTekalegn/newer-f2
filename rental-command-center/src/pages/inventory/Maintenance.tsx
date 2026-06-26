import React, { useState, useEffect } from 'react';
import { Search, Plus, Trash2, Edit, CheckCircle, X, Clock, AlertTriangle, Wrench, RefreshCw, Upload } from 'lucide-react';
import { getMaintenanceOrders, addMaintenanceOrder, updateMaintenanceOrder, deleteMaintenanceOrder, completeMaintenance, MaintenanceOrder } from '../../services/maintenanceService';
import { getItemVariants, ItemVariant } from '../../services/inventoryService';
import { format } from 'date-fns';

export function Maintenance() {
  const [orders, setOrders] = useState<MaintenanceOrder[]>([]);
  const [variants, setVariants] = useState<ItemVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Modals state
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<MaintenanceOrder | null>(null);

  // New order form state
  const [newItemVariantId, setNewItemVariantId] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCost, setNewCost] = useState(0);
  const [newNotes, setNewNotes] = useState('');
  const [newPhotoUrl, setNewPhotoUrl] = useState('');

  // Edit order form state
  const [editStatus, setEditStatus] = useState<"Pending" | "In Progress" | "Completed" | "Cancelled">('Pending');
  const [editNotes, setEditNotes] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [ordersData, variantsData] = await Promise.all([
        getMaintenanceOrders(),
        getItemVariants()
      ]);
      setOrders(ordersData);
      setVariants(variantsData);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch maintenance orders');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenNewModal = () => {
    setNewItemVariantId('');
    setNewDesc('');
    setNewCost(0);
    setNewNotes('');
    setNewPhotoUrl('');
    setIsNewModalOpen(true);
  };

  const handleNewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemVariantId) {
      alert('Please select an item variant');
      return;
    }
    if (!newDesc.trim()) {
      alert('Damage description is required');
      return;
    }

    const selectedVariant = variants.find(v => v.id === newItemVariantId);
    const itemName = selectedVariant ? selectedVariant.name : 'Unknown Variant';

    try {
      setLoading(true);
      await addMaintenanceOrder({
        itemVariantId: newItemVariantId,
        itemName,
        damageDescription: newDesc,
        damageCost: Number(newCost) || 0,
        notes: newNotes,
        photoUrls: newPhotoUrl ? [newPhotoUrl] : [],
        status: 'Pending'
      });
      setIsNewModalOpen(false);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to create maintenance order');
      setLoading(false);
    }
  };

  const handleOpenEditModal = (order: MaintenanceOrder) => {
    setEditingOrder(order);
    setEditStatus(order.status);
    setEditNotes(order.notes || '');
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder) return;

    try {
      setLoading(true);
      await updateMaintenanceOrder(editingOrder.id, {
        status: editStatus,
        notes: editNotes
      });
      setIsEditModalOpen(false);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to update order');
      setLoading(false);
    }
  };

  const handleComplete = async (orderId: string) => {
    if (!window.confirm('Mark this maintenance order as COMPLETED? This will return 1 unit to Available stock.')) return;
    try {
      setLoading(true);
      await completeMaintenance(orderId);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to complete maintenance');
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this maintenance order?')) return;
    try {
      setLoading(true);
      await deleteMaintenanceOrder(id);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete order');
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter(o => {
    const matchesSearch = o.itemName.toLowerCase().includes(search.toLowerCase()) || 
                          o.damageDescription.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'All' || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex flex-col h-full bg-white border border-gray-200 rounded shadow-sm">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between shrink-0">
        <h2 className="font-bold text-lg text-[#1A1A1A]">Maintenance & Damage Control</h2>
        <button 
          onClick={handleOpenNewModal}
          className="bg-[#DC2626] hover:bg-red-700 text-white font-bold px-4 py-2 rounded text-sm flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" /> New Order
        </button>
      </div>

      {/* Filters */}
      <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-4 bg-gray-50/50 shrink-0">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search maintenance logs..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626]"
          />
        </div>
        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-200 rounded text-sm py-2 px-3 focus:outline-none focus:border-[#DC2626]"
          >
            <option value="All">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Content Grid/Table */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-[#DC2626]"></div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <AlertTriangle className="w-12 h-12 text-[#DC2626] mb-4" />
            <p className="text-[#DC2626] font-medium mb-4">{error}</p>
            <button onClick={fetchData} className="bg-[#1A1A1A] text-white px-4 py-2 rounded font-bold hover:bg-black">
              Retry
            </button>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 p-4">
            <Wrench className="w-12 h-12 text-gray-300 mb-4" />
            <p className="font-medium text-gray-600">No maintenance orders found.</p>
            <p className="text-sm text-gray-400">All damaged or items requiring tuning appear here.</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
              <tr>
                <th className="p-4 text-xs font-bold uppercase text-gray-500 tracking-wider">Item Name</th>
                <th className="p-4 text-xs font-bold uppercase text-gray-500 tracking-wider">Damage Description</th>
                <th className="p-4 text-xs font-bold uppercase text-gray-500 tracking-wider text-right">Cost</th>
                <th className="p-4 text-xs font-bold uppercase text-gray-500 tracking-wider text-center">Status</th>
                <th className="p-4 text-xs font-bold uppercase text-gray-500 tracking-wider">Created Date</th>
                <th className="p-4 text-xs font-bold uppercase text-gray-500 tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredOrders.map(order => {
                let badgeClass = 'bg-yellow-100 text-yellow-800';
                if (order.status === 'Completed') badgeClass = 'bg-green-100 text-green-800';
                if (order.status === 'In Progress') badgeClass = 'bg-blue-100 text-blue-800';
                if (order.status === 'Cancelled') badgeClass = 'bg-gray-100 text-gray-800';

                return (
                  <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4 font-medium text-[#1A1A1A]">{order.itemName}</td>
                    <td className="p-4 text-sm text-gray-600">
                      <div>{order.damageDescription}</div>
                      {order.notes && <div className="text-xs text-gray-400 italic mt-0.5">Notes: {order.notes}</div>}
                    </td>
                    <td className="p-4 text-sm font-semibold text-right text-[#1A1A1A]">${order.damageCost.toFixed(2)}</td>
                    <td className="p-4 text-center">
                      <span className={`inline-flex px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider ${badgeClass}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-gray-500">
                      {format(order.createdAt, 'MMM d, yyyy')}
                    </td>
                    <td className="p-4 text-right space-x-1">
                      {order.status !== 'Completed' && order.status !== 'Cancelled' && (
                        <button 
                          onClick={() => handleComplete(order.id)}
                          className="p-2 text-green-600 hover:text-green-800 rounded-md hover:bg-green-50 transition-colors inline-flex items-center justify-center"
                          title="Complete Maintenance"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                      <button 
                        onClick={() => handleOpenEditModal(order)}
                        className="p-2 text-gray-600 hover:text-blue-600 rounded-md hover:bg-gray-100 transition-colors inline-flex items-center justify-center"
                        title="Edit Details"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(order.id)}
                        className="p-2 text-gray-600 hover:text-red-600 rounded-md hover:bg-gray-100 transition-colors inline-flex items-center justify-center"
                        title="Delete Log"
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

      {/* Manual Entry New Order Modal */}
      {isNewModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded shadow-xl w-full max-w-lg overflow-hidden border-t-4 border-[#DC2626]">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="font-bold text-lg text-[#1A1A1A]">New Maintenance Order</h3>
              <button onClick={() => setIsNewModalOpen(false)} className="text-gray-400 hover:text-[#1A1A1A] transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleNewSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Item Variant *</label>
                <select
                  required
                  value={newItemVariantId}
                  onChange={(e) => setNewItemVariantId(e.target.value)}
                  className="w-full p-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#DC2626]"
                >
                  <option value="">Select Item Variant...</option>
                  {variants.map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Damage / Repair Description *</label>
                <textarea 
                  required
                  rows={2}
                  placeholder="e.g. Scratched legs, loose joints..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full p-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Estimated Cost ($)</label>
                  <input 
                    type="number" min="0" step="0.01"
                    value={newCost}
                    onChange={(e) => setNewCost(Number(e.target.value))}
                    className="w-full p-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Photo Attachment URL</label>
                  <input 
                    type="text"
                    placeholder="https://example.com/photo.png"
                    value={newPhotoUrl}
                    onChange={(e) => setNewPhotoUrl(e.target.value)}
                    className="w-full p-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Internal Admin Notes</label>
                <textarea 
                  rows={2}
                  placeholder="e.g. Sent to carpenter workshop..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full p-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626]"
                />
              </div>

              <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-2 -mx-6 -mb-6">
                <button 
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 rounded text-sm font-bold text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="bg-[#DC2626] text-white px-6 py-2 rounded text-sm font-bold hover:bg-red-700 transition-colors"
                >
                  Save Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Order Modal */}
      {isEditModalOpen && editingOrder && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded shadow-xl w-full max-w-md overflow-hidden border-t-4 border-[#DC2626]">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="font-bold text-lg text-[#1A1A1A]">Update Maintenance Order</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-[#1A1A1A] transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                <p>Item: <strong className="text-[#1A1A1A]">{editingOrder.itemName}</strong></p>
                <p>Description: <span className="italic">{editingOrder.damageDescription}</span></p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Order Status *</label>
                <select
                  value={editStatus}
                  onChange={(e: any) => setEditStatus(e.target.value)}
                  className="w-full p-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#DC2626]"
                >
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
                <p className="text-xs text-red-600 mt-1">
                  * Setting status to Completed here directly will NOT trigger the inventory return movement. Please use the checkmark button in the table if you wish to adjust available stock automatically.
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Internal Admin Notes</label>
                <textarea 
                  rows={3}
                  placeholder="Update progress..."
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full p-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626]"
                />
              </div>

              <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-2 -mx-6 -mb-6">
                <button 
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 rounded text-sm font-bold text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="bg-[#DC2626] text-white px-6 py-2 rounded text-sm font-bold hover:bg-red-700 transition-colors"
                >
                  Update Details
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
