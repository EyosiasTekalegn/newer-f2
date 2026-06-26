import React, { useState, useEffect, useRef } from 'react';
import { 
  getContracts, 
  generateContractPartA, 
  generateContractPartB, 
  generateFullContract, 
  signContract, 
  deleteContract, 
  Contract 
} from '../services/contractService';
import { getBookings, Booking } from '../services/bookingService';
import { getActiveRentals, Rental } from '../services/rentalService';
import { 
  Search, 
  Filter, 
  Plus, 
  X, 
  Eye, 
  Download, 
  FileText, 
  Trash2, 
  Loader2, 
  AlertTriangle, 
  Check, 
  Edit3
} from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';

export function Contracts() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [rentals, setRentals] = useState<Rental[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modals state
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isSignModalOpen, setIsSignModalOpen] = useState(false);

  // Active selections
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  
  // Generate Form state
  const [generateType, setGenerateType] = useState<'partA' | 'partB' | 'full'>('partA');
  const [selectedBookingId, setSelectedBookingId] = useState('');
  const [selectedRentalId, setSelectedRentalId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Signature pad ref
  const sigPadRef = useRef<SignatureCanvas>(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [contractsData, bookingsData, rentalsData] = await Promise.all([
        getContracts(),
        getBookings(),
        getActiveRentals()
      ]);
      setContracts(contractsData);
      setBookings(bookingsData || []);
      setRentals(rentalsData || []);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to load contracts database.');
    } finally {
      setIsLoading(false);
    }
  };

  const reloadContracts = async () => {
    try {
      const data = await getContracts();
      setContracts(data);
    } catch (err: any) {
      console.error(err);
    }
  };

  // Filter Bookings/Rentals for Generation
  const availableBookings = bookings.filter(b => b.status === 'Reserved' || b.status === 'Confirmed');
  const availableRentals = rentals.filter(r => r.status === 'Delivered' || r.status === 'Partially Returned');

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      if (generateType === 'partA') {
        if (!selectedBookingId) throw new Error("Please select a booking.");
        await generateContractPartA(selectedBookingId);
      } else if (generateType === 'partB') {
        if (!selectedRentalId) throw new Error("Please select a rental.");
        await generateContractPartB(selectedRentalId);
      } else {
        if (!selectedRentalId) throw new Error("Please select a rental.");
        await generateFullContract(selectedRentalId);
      }

      await reloadContracts();
      setIsGenerateModalOpen(false);
      setSelectedBookingId('');
      setSelectedRentalId('');
    } catch (err: any) {
      setError(err.message || "Failed to generate contract.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSign = async () => {
    if (!selectedContract || !sigPadRef.current) return;
    if (sigPadRef.current.isEmpty()) {
      alert("Please provide a signature on the pad before signing.");
      return;
    }

    setIsSubmitting(true);
    try {
      const dataUrl = sigPadRef.current.getTrimmedCanvas().toDataURL('image/png');
      await signContract(selectedContract.id, dataUrl);
      await reloadContracts();
      setIsSignModalOpen(false);
      // Re-fetch or update view modal if it was open
      if (isViewModalOpen) {
        const updated = contracts.find(c => c.id === selectedContract.id);
        if (updated) setSelectedContract(updated);
      }
    } catch (err: any) {
      alert(err.message || "Signing failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (contractId: string) => {
    if (!window.confirm("Are you sure you want to delete this contract? This action is irreversible.")) return;

    try {
      await deleteContract(contractId);
      setContracts(contracts.filter(c => c.id !== contractId));
    } catch (err: any) {
      alert(err.message || "Failed to delete contract.");
    }
  };

  const handleClearSignature = () => {
    sigPadRef.current?.clear();
  };

  // Filtering contracts
  const filteredContracts = contracts.filter(c => {
    const matchesSearch = 
      c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.rentalId.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = typeFilter === 'all' || c.contractType === typeFilter;
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="p-6 bg-zinc-950 text-white min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <FileText className="text-[#DC2626]" /> Contracts & Handshakes
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            Manage two-part Agreements (Part A: Bookings, Part B: Handover checklists) and Combined PDFs.
          </p>
        </div>
        <button
          onClick={() => setIsGenerateModalOpen(true)}
          className="bg-[#DC2626] hover:bg-[#B91C1C] text-white px-4 py-2 rounded-md font-medium text-sm flex items-center gap-2 transition duration-200"
          id="generate-contract-btn"
        >
          <Plus size={16} /> Generate Contract
        </button>
      </div>

      {/* Stats Quick Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-lg">
          <div className="text-zinc-500 text-xs font-mono">TOTAL CONTRACTS</div>
          <div className="text-2xl font-bold mt-1">{contracts.length}</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-lg">
          <div className="text-amber-500 text-xs font-mono flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            DRAFT AGREEMENTS
          </div>
          <div className="text-2xl font-bold mt-1 text-amber-500">
            {contracts.filter(c => c.status === 'Draft').length}
          </div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-lg">
          <div className="text-emerald-500 text-xs font-mono">SIGNED CONTRACTS</div>
          <div className="text-2xl font-bold mt-1 text-emerald-500">
            {contracts.filter(c => c.status === 'Signed').length}
          </div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-lg">
          <div className="text-sky-500 text-xs font-mono">FINALIZED AGREEMENTS</div>
          <div className="text-2xl font-bold mt-1 text-sky-500">
            {contracts.filter(c => c.status === 'Final').length}
          </div>
        </div>
      </div>

      {/* Filters bar */}
      <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-lg mb-6 flex flex-col md:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search by contract ID, customer or booking..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-md pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-[#DC2626] transition"
            id="contract-search"
          />
        </div>

        {/* Type Filter */}
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-zinc-500" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-[#DC2626]"
            id="type-filter"
          >
            <option value="all">All Types</option>
            <option value="partA">Part A (Booking)</option>
            <option value="partB">Part B (Logistics)</option>
            <option value="full">Combined Full</option>
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-[#DC2626]"
            id="status-filter"
          >
            <option value="all">All Statuses</option>
            <option value="Draft">Draft</option>
            <option value="Signed">Signed</option>
            <option value="Final">Final</option>
          </select>
        </div>
      </div>

      {/* Main Table Content */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="animate-spin text-[#DC2626] mb-4" size={40} />
          <p className="text-zinc-400 text-sm">Loading agreements from warehouse logs...</p>
        </div>
      ) : error ? (
        <div className="bg-red-950/30 border border-red-900 rounded-lg p-6 text-center max-w-xl mx-auto my-10">
          <AlertTriangle className="text-[#DC2626] mx-auto mb-4" size={36} />
          <h3 className="text-lg font-bold text-white mb-2">Failed to Load Database</h3>
          <p className="text-zinc-400 text-sm mb-4">{error}</p>
          <button
            onClick={fetchInitialData}
            className="bg-[#DC2626] hover:bg-[#B91C1C] text-white px-4 py-2 rounded-md font-medium text-sm transition"
          >
            Retry Connection
          </button>
        </div>
      ) : filteredContracts.length === 0 ? (
        <div className="border border-dashed border-zinc-800 rounded-lg py-20 text-center bg-zinc-900/10">
          <FileText className="text-zinc-700 mx-auto mb-4" size={48} />
          <h3 className="text-lg font-medium text-white mb-1">No contracts found</h3>
          <p className="text-zinc-500 text-sm max-w-md mx-auto mb-6">
            There are no contracts matching the search or filters. Generate Part A from Bookings or Part B/Full from active rentals.
          </p>
          <button
            onClick={() => setIsGenerateModalOpen(true)}
            className="bg-[#DC2626] hover:bg-[#B91C1C] text-white px-4 py-2 rounded-md font-medium text-sm inline-flex items-center gap-2"
          >
            <Plus size={16} /> Generate Now
          </button>
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/50 text-zinc-400 text-xs font-mono">
                <th className="p-4">Contract ID</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Type</th>
                <th className="p-4">Link Reference</th>
                <th className="p-4">Status</th>
                <th className="p-4">Created Date</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 text-sm">
              {filteredContracts.map((contract) => (
                <tr key={contract.id} className="hover:bg-zinc-900/40 transition">
                  <td className="p-4 font-mono text-zinc-300 font-medium">{contract.id.substring(0, 8)}...</td>
                  <td className="p-4 font-medium text-white">{contract.customerName}</td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-medium ${
                      contract.contractType === 'partA' ? 'bg-[#DC2626]/10 text-[#DC2626]' :
                      contract.contractType === 'partB' ? 'bg-amber-500/10 text-amber-500' :
                      'bg-sky-500/10 text-sky-500'
                    }`}>
                      {contract.contractType === 'partA' ? 'Part A' :
                       contract.contractType === 'partB' ? 'Part B' : 'Full (A+B)'}
                    </span>
                  </td>
                  <td className="p-4 text-zinc-400 font-mono text-xs">{contract.rentalId}</td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      contract.status === 'Draft' ? 'bg-zinc-800 text-zinc-400' :
                      contract.status === 'Signed' ? 'bg-emerald-500/10 text-emerald-400' :
                      'bg-sky-500/10 text-sky-400'
                    }`}>
                      {contract.status}
                    </span>
                  </td>
                  <td className="p-4 text-zinc-400">{contract.createdAt.toLocaleDateString()}</td>
                  <td className="p-4 text-right flex items-center justify-end gap-2">
                    <button
                      onClick={() => {
                        setSelectedContract(contract);
                        setIsViewModalOpen(true);
                      }}
                      className="p-1.5 hover:bg-zinc-800 rounded-md text-zinc-300 hover:text-white transition"
                      title="View PDF"
                    >
                      <Eye size={16} />
                    </button>
                    {contract.status === 'Draft' && (
                      <button
                        onClick={() => {
                          setSelectedContract(contract);
                          setIsSignModalOpen(true);
                        }}
                        className="p-1.5 hover:bg-zinc-800 rounded-md text-emerald-400 hover:text-emerald-300 transition"
                        title="Sign Contract"
                      >
                        <Edit3 size={16} />
                      </button>
                    )}
                    <a
                      href={contract.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer referrer"
                      className="p-1.5 hover:bg-zinc-800 rounded-md text-zinc-300 hover:text-white transition"
                      title="Download PDF"
                    >
                      <Download size={16} />
                    </a>
                    <button
                      onClick={() => handleDelete(contract.id)}
                      className="p-1.5 hover:bg-red-950/40 rounded-md text-red-500 hover:text-[#DC2626] transition"
                      title="Delete Agreement"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* --- MODAL 1: GENERATE CONTRACT --- */}
      {isGenerateModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-lg rounded-lg shadow-xl overflow-hidden">
            <div className="border-b border-zinc-800 p-4 flex justify-between items-center bg-zinc-950">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <FileText className="text-[#DC2626]" /> Draft New Rental Contract
              </h3>
              <button 
                onClick={() => setIsGenerateModalOpen(false)} 
                className="text-zinc-500 hover:text-white transition"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleGenerate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-mono text-zinc-400 uppercase mb-2">Contract Phase</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setGenerateType('partA')}
                    className={`p-3 rounded-lg border text-center text-xs font-semibold transition ${
                      generateType === 'partA' 
                        ? 'border-[#DC2626] bg-[#DC2626]/10 text-white' 
                        : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:bg-zinc-900'
                    }`}
                  >
                    Part A (Booking)
                  </button>
                  <button
                    type="button"
                    onClick={() => setGenerateType('partB')}
                    className={`p-3 rounded-lg border text-center text-xs font-semibold transition ${
                      generateType === 'partB' 
                        ? 'border-amber-500 bg-amber-500/10 text-white' 
                        : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:bg-zinc-900'
                    }`}
                  >
                    Part B (Delivery)
                  </button>
                  <button
                    type="button"
                    onClick={() => setGenerateType('full')}
                    className={`p-3 rounded-lg border text-center text-xs font-semibold transition ${
                      generateType === 'full' 
                        ? 'border-sky-500 bg-sky-500/10 text-white' 
                        : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:bg-zinc-900'
                    }`}
                  >
                    Combined Full
                  </button>
                </div>
              </div>

              {/* Form Options conditional on Phase selection */}
              {generateType === 'partA' ? (
                <div>
                  <label className="block text-xs font-mono text-zinc-400 uppercase mb-1.5">Select Confirmed Booking</label>
                  <select
                    value={selectedBookingId}
                    onChange={(e) => setSelectedBookingId(e.target.value)}
                    required
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-[#DC2626]"
                    id="booking-select-dropdown"
                  >
                    <option value="">-- Select Active Booking --</option>
                    {availableBookings.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.customerName} - {b.id.substring(0,6)} ({new Date(b.startDate).toLocaleDateString()})
                      </option>
                    ))}
                  </select>
                  <p className="text-zinc-500 text-[11px] mt-1">Only Confirmed or Reserved status bookings are shown.</p>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-mono text-zinc-400 uppercase mb-1.5">Select Active Rental</label>
                  <select
                    value={selectedRentalId}
                    onChange={(e) => setSelectedRentalId(e.target.value)}
                    required
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-[#DC2626]"
                    id="rental-select-dropdown"
                  >
                    <option value="">-- Select Handed Over Rental --</option>
                    {availableRentals.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.customerName} - {r.id.substring(0,6)} (Amt: ${r.total.toFixed(0)})
                      </option>
                    ))}
                  </select>
                  <p className="text-zinc-500 text-[11px] mt-1">Only currently Active / Delivered rentals are eligible.</p>
                </div>
              )}

              {error && (
                <div className="bg-red-950/20 border border-red-900 text-red-400 p-3 rounded-md text-xs flex items-center gap-2">
                  <AlertTriangle size={14} /> {error}
                </div>
              )}

              <div className="border-t border-zinc-800 pt-4 flex justify-end gap-2 bg-zinc-900">
                <button
                  type="button"
                  onClick={() => setIsGenerateModalOpen(false)}
                  className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-md text-sm font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-[#DC2626] hover:bg-[#B91C1C] disabled:opacity-50 text-white px-5 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Compiling...
                    </>
                  ) : (
                    'Generate PDF Agreement'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 2: VIEW PDF PREVIEW --- */}
      {isViewModalOpen && selectedContract && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-4xl rounded-lg shadow-2xl overflow-hidden flex flex-col h-[90vh]">
            <div className="border-b border-zinc-800 p-4 flex justify-between items-center bg-zinc-950">
              <div>
                <h3 className="text-md font-bold text-white">
                  {selectedContract.pdfName}
                </h3>
                <p className="text-zinc-400 text-xs mt-0.5">
                  Client: {selectedContract.customerName} • Status: {selectedContract.status}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {selectedContract.status === 'Draft' && (
                  <button
                    onClick={() => {
                      setIsViewModalOpen(false);
                      setIsSignModalOpen(true);
                    }}
                    className="bg-[#DC2626] hover:bg-[#B91C1C] text-white px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1 transition"
                  >
                    <Edit3 size={14} /> Sign Now
                  </button>
                )}
                <a
                  href={selectedContract.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer referrer"
                  className="bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1 transition"
                >
                  <Download size={14} /> External Link
                </a>
                <button 
                  onClick={() => setIsViewModalOpen(false)} 
                  className="text-zinc-500 hover:text-white transition"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-zinc-950 flex flex-col md:flex-row">
              {/* Left Column: Metadata & Details */}
              <div className="w-full md:w-80 border-r border-zinc-800 p-4 space-y-4 overflow-y-auto">
                <div className="bg-zinc-900 p-3 rounded-md border border-zinc-800">
                  <span className="text-xs font-mono text-zinc-500 block">CONTRACT ID</span>
                  <span className="text-xs font-mono text-white break-all">{selectedContract.id}</span>
                </div>

                <div className="bg-zinc-900 p-3 rounded-md border border-zinc-800">
                  <span className="text-xs font-mono text-zinc-500 block">CUSTOMER</span>
                  <span className="text-sm font-semibold text-white">{selectedContract.customerName}</span>
                </div>

                <div className="bg-zinc-900 p-3 rounded-md border border-zinc-800 space-y-2">
                  <span className="text-xs font-mono text-zinc-500 block">PHASE METRICS</span>
                  {selectedContract.partAData && (
                    <div className="text-xs space-y-1">
                      <p className="text-zinc-300 font-semibold border-b border-zinc-800 pb-1">Part A (Booking)</p>
                      <p className="text-zinc-400">Total: ${selectedContract.partAData.total.toFixed(2)}</p>
                      <p className="text-zinc-400">Deposit: ${selectedContract.partAData.depositRequired.toFixed(2)}</p>
                      {selectedContract.partAData.signedAt && (
                        <p className="text-emerald-400 flex items-center gap-1">
                          <Check size={12} /> Signed {new Date(selectedContract.partAData.signedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  )}

                  {selectedContract.partBData && (
                    <div className="text-xs space-y-1 pt-2">
                      <p className="text-zinc-300 font-semibold border-b border-zinc-800 pb-1">Part B (Logistics)</p>
                      <p className="text-zinc-400">Verified: Yes</p>
                      <p className="text-zinc-400">Acceptance: Accepted</p>
                      {selectedContract.partBData.signedAt && (
                        <p className="text-emerald-400 flex items-center gap-1">
                          <Check size={12} /> Signed {new Date(selectedContract.partBData.signedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {selectedContract.signatureImageUrl && (
                  <div className="bg-zinc-900 p-3 rounded-md border border-zinc-800 text-center">
                    <span className="text-xs font-mono text-zinc-500 block mb-2">DIGITAL HANDSHAKE</span>
                    <img 
                      src={selectedContract.signatureImageUrl} 
                      alt="Signature" 
                      className="bg-white border border-zinc-700 rounded p-1 mx-auto max-h-24 object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}
              </div>

              {/* Right Column: PDF Frame with fallback */}
              <div className="flex-1 bg-zinc-900 flex flex-col items-stretch p-4">
                <div className="flex-1 border border-zinc-800 rounded bg-zinc-950 overflow-hidden relative">
                  <iframe 
                    src={selectedContract.pdfUrl} 
                    className="w-full h-full border-0 bg-white"
                    title="PDF Viewer"
                  />
                  
                  {/* Absolute fallback option in case browser restricts frame loading */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-zinc-950/90 border border-zinc-800 rounded-full px-4 py-2 flex items-center gap-3 shadow-lg">
                    <span className="text-xs text-zinc-400">Frame preview locked?</span>
                    <a
                      href={selectedContract.pdfUrl}
                      download={selectedContract.pdfName}
                      className="text-xs font-semibold text-[#DC2626] hover:underline"
                    >
                      Download PDF Directly
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 3: DIGITAL SIGNATURE PAD --- */}
      {isSignModalOpen && selectedContract && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-lg rounded-lg shadow-2xl overflow-hidden">
            <div className="border-b border-zinc-800 p-4 flex justify-between items-center bg-zinc-950">
              <h3 className="text-md font-bold text-white flex items-center gap-2">
                <Edit3 className="text-[#DC2626]" /> Perform Digital Handshake
              </h3>
              <button 
                onClick={() => setIsSignModalOpen(false)} 
                className="text-zinc-500 hover:text-white transition"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="text-xs text-zinc-400 space-y-2">
                <p><strong>Customer Name:</strong> {selectedContract.customerName}</p>
                <p><strong>Contract Reference:</strong> {selectedContract.id.substring(0,10)}...</p>
                <p>By signing on the electronic signature pad below, the client legally warrants full validation and agreement to Redline Rentals terms and damage guidelines.</p>
              </div>

              {/* Pad Frame */}
              <div className="border-2 border-dashed border-zinc-700 bg-white rounded-lg overflow-hidden">
                <SignatureCanvas 
                  penColor="black"
                  canvasProps={{
                    className: "w-full h-44 bg-white",
                    id: "signature-canvas"
                  }}
                  ref={sigPadRef}
                />
              </div>

              <div className="flex justify-between items-center">
                <button
                  type="button"
                  onClick={handleClearSignature}
                  className="bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-1.5 rounded-md text-xs font-medium transition"
                  id="clear-signature-pad"
                >
                  Clear Screen
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsSignModalOpen(false)}
                    className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-1.5 rounded-md text-xs font-medium transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSign}
                    disabled={isSubmitting}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1 transition"
                    id="confirm-signature-btn"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={12} className="animate-spin" /> Uploading...
                      </>
                    ) : (
                      <>
                        <Check size={14} /> Validate & Sign
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
