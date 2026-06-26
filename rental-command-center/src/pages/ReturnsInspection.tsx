import React, { useState, useEffect, useRef } from 'react';
import { Search, Undo2, Check, FileText, Upload } from 'lucide-react';
import { getActiveRentals, Rental } from '../services/rentalService';
import { completeReturn, ReturnRecord } from '../services/returnService';
import { generateFullContract } from '../services/contractService';
import SignatureCanvas from 'react-signature-canvas';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

export function ReturnsInspection() {
  const navigate = useNavigate();
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  
  const [selectedRental, setSelectedRental] = useState<Rental | null>(null);
  
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const rentalsData = await getActiveRentals();
      setRentals(rentalsData.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
    } catch (err: any) {
      console.error('Error fetching rentals:', err);
      setError('Failed to load rentals for return.');
    } finally {
      setLoading(false);
    }
  };

  const filteredRentals = rentals.filter(r => 
    r.customerName.toLowerCase().includes(search.toLowerCase()) || 
    r.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-white border border-gray-200 rounded shadow-sm">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between shrink-0">
        <h2 className="font-bold text-lg text-[#1A1A1A]">Returns & Inspection</h2>
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
            <p>No active rentals available for return.</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 sticky top-0 border-b border-gray-200">
              <tr>
                <th className="p-4 text-xs font-bold uppercase text-gray-500 tracking-wider">Rental ID</th>
                <th className="p-4 text-xs font-bold uppercase text-gray-500 tracking-wider">Customer</th>
                <th className="p-4 text-xs font-bold uppercase text-gray-500 tracking-wider">End Date</th>
                <th className="p-4 text-xs font-bold uppercase text-gray-500 tracking-wider">Status</th>
                <th className="p-4 text-xs font-bold uppercase text-gray-500 tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRentals.map(rental => (
                <tr key={rental.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="p-4 font-mono text-sm">{rental.id.slice(0, 8)}</td>
                  <td className="p-4 font-medium text-[#1A1A1A]">{rental.customerName}</td>
                  <td className="p-4 text-sm text-[#1A1A1A]">{format(rental.endDate, 'MMM d, yyyy')}</td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider ${rental.status === 'Delivered' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {rental.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button 
                      onClick={() => setSelectedRental(rental)}
                      className="bg-[#1A1A1A] text-white px-4 py-2 rounded text-xs font-bold hover:bg-black transition-colors"
                    >
                      Start Return
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selectedRental && (
        <ReturnInspectionModal 
          rental={selectedRental}
          onClose={() => setSelectedRental(null)}
          onComplete={() => {
            setSelectedRental(null);
            fetchData();
          }}
        />
      )}
    </div>
  );
}

function ReturnInspectionModal({ rental, onClose, onComplete }: { rental: Rental, onClose: () => void, onComplete: () => void }) {
  const [items, setItems] = useState<any[]>(rental.items.map(item => ({
    ...item,
    deliveredQty: item.quantity,
    returnedQty: item.quantity,
    damagedQty: 0,
    missingQty: 0,
    damageCost: 0,
    photoUrls: [],
  })));
  
  const [saving, setSaving] = useState(false);
  const signatureRef = useRef<SignatureCanvas>(null);

  const totalDamages = items.reduce((sum, item) => sum + item.damageCost, 0);
  const netRefund = Math.max(0, rental.depositAmount - totalDamages);
  const additionalInvoice = Math.max(0, totalDamages - rental.depositAmount);

  const handleQtyChange = (index: number, field: string, value: number) => {
    const newItems = [...items];
    newItems[index][field] = value;
    
    // Auto calculate damage cost based on unit price if damagedQty changes
    if (field === 'damagedQty') {
      newItems[index].damageCost = value * newItems[index].unitPrice;
    }
    
    setItems(newItems);
  };

  const handleDamageCostChange = (index: number, value: number) => {
    const newItems = [...items];
    newItems[index].damageCost = value;
    setItems(newItems);
  };

  const clearSignature = () => {
    signatureRef.current?.clear();
  };

  const handleSubmit = async () => {
    // Validate quantities
    for (const item of items) {
      if (item.returnedQty + item.damagedQty + item.missingQty !== item.deliveredQty) {
        alert(`Quantities do not match for item: ${item.name}. Total must equal ${item.deliveredQty}.`);
        return;
      }
    }

    if (signatureRef.current?.isEmpty()) {
      alert("Please provide a signature.");
      return;
    }

    try {
      setSaving(true);
      const signatureDataUrl = signatureRef.current?.getTrimmedCanvas().toDataURL('image/png');
      
      const returnData = {
        rentalId: rental.id,
        customerId: rental.customerId,
        items: items.map(i => ({
          itemVariantId: i.itemVariantId,
          name: i.name,
          deliveredQty: i.deliveredQty,
          returnedQty: i.returnedQty,
          damagedQty: i.damagedQty,
          missingQty: i.missingQty,
          damageCost: i.damageCost,
          photoUrls: i.photoUrls,
        })),
        totalDamages,
        depositAmount: rental.depositAmount,
        netRefund,
        additionalInvoice,
        signatureUrl: signatureDataUrl, // In real app, upload this to Storage first and save the URL
      };

      await completeReturn(rental.id, returnData as any);
      alert('Return completed successfully!');
      
      // Offer to auto-generate the Combined Full Contract (Part A + B)
      if (window.confirm("Would you like to automatically compile and generate the Combined Full Contract (Part A + Part B) for this rental record?")) {
        try {
          await generateFullContract(rental.id);
          alert("Combined Full Contract generated and compiled successfully! Check the Contracts page.");
        } catch (contractErr: any) {
          alert(`Warning: Failed to compile Combined Contract automatically: ${contractErr.message}`);
        }
      }
      
      onComplete();
    } catch (err: any) {
      alert(err.message || 'Failed to complete return');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden border-t-4 border-[#DC2626]">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div>
            <h3 className="font-bold text-lg text-[#1A1A1A]">Return Inspection</h3>
            <p className="text-sm text-gray-500">Rental #{rental.id.slice(0, 8)} • {rental.customerName}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-[#1A1A1A] transition-colors">
            <span className="text-2xl leading-none">&times;</span>
          </button>
        </div>
        
        <div className="flex-1 overflow-auto p-6 space-y-8">
          {/* Section 1: Return Summary */}
          <section>
            <h4 className="text-sm font-bold text-[#DC2626] uppercase tracking-wider mb-4 border-b border-red-100 pb-2">1. Item Inspection</h4>
            <div className="border border-gray-200 rounded overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="p-3 text-xs font-bold uppercase text-gray-500">Item</th>
                    <th className="p-3 text-xs font-bold uppercase text-gray-500 text-center">Delivered</th>
                    <th className="p-3 text-xs font-bold uppercase text-green-600 text-center">Returned Good</th>
                    <th className="p-3 text-xs font-bold uppercase text-orange-600 text-center">Damaged</th>
                    <th className="p-3 text-xs font-bold uppercase text-red-600 text-center">Missing</th>
                    <th className="p-3 text-xs font-bold uppercase text-gray-500 text-right">Damage Cost ($)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((item, index) => {
                    const isValid = (item.returnedQty + item.damagedQty + item.missingQty) === item.deliveredQty;
                    return (
                    <tr key={index} className={!isValid ? 'bg-red-50/50' : ''}>
                      <td className="p-3">
                        <p className="text-sm font-medium">{item.name}</p>
                      </td>
                      <td className="p-3 text-center text-sm font-bold text-gray-600">{item.deliveredQty}</td>
                      <td className="p-3 text-center">
                        <input 
                          type="number" min="0" max={item.deliveredQty}
                          value={item.returnedQty}
                          onChange={(e) => handleQtyChange(index, 'returnedQty', Number(e.target.value))}
                          className={`w-16 p-1.5 border rounded text-sm text-center focus:outline-none focus:border-[#DC2626] ${!isValid ? 'border-red-300' : 'border-gray-200'}`}
                        />
                      </td>
                      <td className="p-3 text-center">
                        <input 
                          type="number" min="0" max={item.deliveredQty}
                          value={item.damagedQty}
                          onChange={(e) => handleQtyChange(index, 'damagedQty', Number(e.target.value))}
                          className={`w-16 p-1.5 border rounded text-sm text-center focus:outline-none focus:border-[#DC2626] ${!isValid ? 'border-red-300' : 'border-gray-200'}`}
                        />
                      </td>
                      <td className="p-3 text-center">
                        <input 
                          type="number" min="0" max={item.deliveredQty}
                          value={item.missingQty}
                          onChange={(e) => handleQtyChange(index, 'missingQty', Number(e.target.value))}
                          className={`w-16 p-1.5 border rounded text-sm text-center focus:outline-none focus:border-[#DC2626] ${!isValid ? 'border-red-300' : 'border-gray-200'}`}
                        />
                      </td>
                      <td className="p-3 text-right">
                        {item.damagedQty > 0 || item.missingQty > 0 ? (
                          <input 
                            type="number" min="0" step="0.01"
                            value={item.damageCost}
                            onChange={(e) => handleDamageCostChange(index, Number(e.target.value))}
                            className="w-24 p-1.5 border border-red-300 rounded text-sm text-right focus:outline-none focus:border-[#DC2626]"
                          />
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-500 mt-2">* Returned + Damaged + Missing must equal Delivered quantity.</p>
          </section>

          {/* Section 2: Deposit Preview */}
          <section>
            <h4 className="text-sm font-bold text-[#DC2626] uppercase tracking-wider mb-4 border-b border-red-100 pb-2">2. Settlement</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 border border-gray-200 rounded p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Original Deposit:</span>
                  <span className="font-bold">${rental.depositAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-red-600">
                  <span>Total Damages/Missing:</span>
                  <span className="font-bold">-${totalDamages.toFixed(2)}</span>
                </div>
                <div className="pt-3 border-t border-gray-200 flex justify-between text-base">
                  <span className="font-bold text-[#1A1A1A]">Net Refund:</span>
                  <span className={`font-bold ${netRefund > 0 ? 'text-green-600' : 'text-gray-500'}`}>${netRefund.toFixed(2)}</span>
                </div>
              </div>

              {additionalInvoice > 0 && (
                <div className="bg-red-50 border border-red-200 rounded p-4 flex flex-col justify-center items-center text-center">
                  <h5 className="font-bold text-[#DC2626] mb-1">Additional Invoice Required</h5>
                  <p className="text-sm text-red-700 mb-2">Damages exceed the collected deposit.</p>
                  <p className="text-2xl font-black text-[#DC2626]">${additionalInvoice.toFixed(2)}</p>
                </div>
              )}
            </div>
          </section>

          {/* Section 3: Signature */}
          <section>
             <h4 className="text-sm font-bold text-[#DC2626] uppercase tracking-wider mb-4 border-b border-red-100 pb-2">3. Customer Signature</h4>
             <div className="border border-gray-300 rounded bg-gray-50 relative">
               <SignatureCanvas 
                  ref={signatureRef}
                  penColor="#1A1A1A"
                  canvasProps={{className: 'w-full h-40 cursor-crosshair'}}
               />
               <div className="absolute bottom-2 right-2 flex gap-2">
                 <button onClick={clearSignature} className="text-xs text-gray-500 hover:text-gray-800 bg-white px-2 py-1 rounded shadow-sm border border-gray-200">
                    Clear
                 </button>
               </div>
             </div>
             <p className="text-xs text-gray-500 mt-2 text-center">I acknowledge the return conditions and settlement as stated above.</p>
          </section>

        </div>
        
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
            {saving ? 'Processing...' : 'Complete Return'}
          </button>
        </div>
      </div>
    </div>
  );
}
