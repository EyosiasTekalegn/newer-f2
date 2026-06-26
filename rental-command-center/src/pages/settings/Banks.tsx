import React, { useState, useEffect } from 'react';
import { 
  getBankLedgers, 
  addBankLedger, 
  updateBankLedger, 
  deleteBankLedger, 
  BankLedger 
} from '../../services/bankService';
import { 
  Landmark, 
  Plus, 
  Edit, 
  Trash, 
  Wallet, 
  CheckCircle, 
  X, 
  Save, 
  RefreshCw, 
  ArrowUpRight, 
  CreditCard,
  Building
} from 'lucide-react';
import toast from 'react-hot-toast';

export function Banks() {
  const [ledgers, setLedgers] = useState<BankLedger[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal / Form States
  const [showModal, setShowModal] = useState(false);
  const [editingLedger, setEditingLedger] = useState<BankLedger | null>(null);
  const [name, setName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [initialBalance, setInitialBalance] = useState<number>(0);
  const [isActive, setIsActive] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getBankLedgers();
      setLedgers(data);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load bank ledgers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddModal = () => {
    setEditingLedger(null);
    setName('');
    setAccountNumber('');
    setInitialBalance(0);
    setIsActive(true);
    setShowModal(true);
  };

  const openEditModal = (ledger: BankLedger) => {
    setEditingLedger(ledger);
    setName(ledger.name);
    setAccountNumber(ledger.accountNumber || '');
    setInitialBalance(ledger.initialBalance);
    setIsActive(ledger.isActive);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Please enter a bank ledger name.');
      return;
    }

    try {
      if (editingLedger) {
        await updateBankLedger(editingLedger.id, {
          name,
          accountNumber,
          initialBalance: Number(initialBalance),
          isActive
        });
        toast.success(`Bank ledger "${name}" updated successfully.`);
      } else {
        await addBankLedger({
          name,
          accountNumber,
          initialBalance: Number(initialBalance),
          isActive
        });
        toast.success(`Bank ledger "${name}" created successfully.`);
      }
      setShowModal(false);
      loadData();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Failed to save bank ledger.');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to permanently delete the bank ledger "${name}"?`)) {
      try {
        await deleteBankLedger(id);
        toast.success(`Bank ledger "${name}" deleted.`);
        loadData();
      } catch (error: any) {
        console.error(error);
        toast.error(error.message || 'Failed to delete bank ledger. Financial transactions might be registered under this ledger.');
      }
    }
  };

  const handleToggleActive = async (ledger: BankLedger) => {
    try {
      await updateBankLedger(ledger.id, { isActive: !ledger.isActive });
      toast.success(`Bank ledger "${ledger.name}" is now ${ledger.isActive ? 'deactivated' : 'activated'}.`);
      loadData();
    } catch (error) {
      console.error(error);
      toast.error('Failed to toggle ledger status.');
    }
  };

  const getBankGradient = (bankName: string) => {
    const nameLower = bankName.toLowerCase();
    if (nameLower.includes('cbe') || nameLower.includes('commercial')) {
      return 'from-purple-900 to-indigo-950 border-purple-800/80';
    }
    if (nameLower.includes('awash')) {
      return 'from-blue-900 to-sky-950 border-blue-800/80';
    }
    if (nameLower.includes('telebirr') || nameLower.includes('tele')) {
      return 'from-amber-900 to-yellow-950 border-amber-800/80';
    }
    if (nameLower.includes('cash') || nameLower.includes('wallet')) {
      return 'from-zinc-900 to-zinc-950 border-zinc-800';
    }
    return 'from-red-950 to-neutral-950 border-red-900/60';
  };

  return (
    <div className="flex-1 p-6 bg-black min-h-screen text-zinc-100 flex flex-col gap-6" id="banks-settings-page">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-[#DC2626] font-semibold text-sm uppercase tracking-widest mb-1">
            <Building className="w-4 h-4" /> Banking & Accounts
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white uppercase">Bank accounts & Ledgers</h1>
          <p className="text-zinc-400 text-sm mt-1">Configure double-entry cash accounts and trace running ledger balances.</p>
        </div>

        <button 
          onClick={loadData}
          className="text-zinc-400 hover:text-white flex items-center gap-1.5 text-xs font-semibold bg-[#0D0D0D] border border-zinc-800 px-3.5 py-2 rounded-lg transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Reload Balances
        </button>
      </div>

      <div className="flex justify-between items-center bg-[#0D0D0D] border border-zinc-800 p-4 rounded-xl">
        <span className="text-xs text-zinc-400">All financial journal transactions (credits & debits) must reference an active bank or cash vault listed here.</span>
        <button
          onClick={openAddModal}
          className="bg-[#DC2626] hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider px-4 py-2.5 rounded-lg flex items-center gap-1.5 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Bank Account
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <RefreshCw className="w-8 h-8 text-[#DC2626] animate-spin" />
          <p className="text-zinc-500 text-sm">Synchronizing ledger records...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="banks-grid">
          {ledgers.map(ledger => (
            <div 
              key={ledger.id} 
              className={`bg-gradient-to-br ${getBankGradient(ledger.name)} border p-6 rounded-2xl flex flex-col justify-between min-h-[190px] relative overflow-hidden shadow-xl hover:scale-[1.01] transition-all`}
            >
              {/* Card Hologram chip decoration */}
              <div className="absolute right-6 top-6 w-10 h-8 rounded-md bg-zinc-400/10 border border-white/5 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-white/20" />
              </div>

              {/* Top Row */}
              <div className="space-y-1.5 z-10">
                <div className="flex items-center gap-2">
                  <span className="bg-white/10 backdrop-blur-sm border border-white/10 px-2.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-widest text-white">
                    {ledger.accountNumber && ledger.accountNumber.includes('Wallet') ? 'Cash Vault' : 'Bank Ledger'}
                  </span>
                  {!ledger.isActive && (
                    <span className="bg-red-950/75 border border-red-900/50 text-red-400 text-[9px] font-extrabold uppercase px-2.5 py-0.5 rounded tracking-widest">
                      Disabled
                    </span>
                  )}
                </div>
                <h3 className="text-2xl font-black text-white tracking-wide uppercase mt-2">{ledger.name}</h3>
                <p className="text-xs text-white/50 font-mono select-all">
                  {ledger.accountNumber || 'N/A'}
                </p>
              </div>

              {/* Bottom Row (Balance) */}
              <div className="flex justify-between items-end border-t border-white/10 pt-4 mt-6 z-10">
                <div className="flex flex-col">
                  <span className="text-[9px] text-white/40 uppercase font-black tracking-widest">Running Balance</span>
                  <span className="text-2xl font-black text-white font-mono mt-0.5">
                    {ledger.currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })} <span className="text-sm font-semibold">ETB</span>
                  </span>
                </div>

                <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => openEditModal(ledger)}
                    className="bg-white/10 hover:bg-white/20 text-white border border-white/10 p-2 rounded-lg transition-colors"
                    title="Edit Ledger details"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(ledger.id, ledger.name)}
                    className="bg-white/5 hover:bg-red-500/20 text-white/70 hover:text-red-300 border border-white/5 hover:border-red-500/30 p-2 rounded-lg transition-colors"
                    title="Delete Ledger"
                  >
                    <Trash className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Bank Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-50 p-4" id="bank-ledger-modal">
          <div className="bg-[#0D0D0D] border border-zinc-800 max-w-md w-full rounded-xl overflow-hidden shadow-2xl flex flex-col">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-zinc-800 flex justify-between items-center">
              <h3 className="text-lg font-black tracking-tight text-white uppercase flex items-center gap-2">
                <Landmark className="w-5 h-5 text-[#DC2626]" /> 
                {editingLedger ? `Modify Ledger: ${editingLedger.name}` : 'Create Double-Entry bank ledger'}
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                className="text-zinc-500 hover:text-white p-1.5 rounded bg-zinc-900/50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSave} className="p-6 space-y-4 text-xs">
              
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wide">Bank Ledger Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CBE Primary, Telebirr Wallet, Cash Box"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wide">Account Identifier / Number</label>
                <input
                  type="text"
                  placeholder="e.g. 1000123456789, or physical box description"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wide">Initial Balance (ETB)</label>
                  <input
                    type="number"
                    required
                    disabled={!!editingLedger} // Locked during updates to preserve ledger trails
                    min="0"
                    placeholder="e.g. 5000"
                    value={initialBalance}
                    onChange={(e) => setInitialBalance(Number(e.target.value))}
                    className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-zinc-700 disabled:opacity-50"
                  />
                </div>

                <div className="flex items-center pl-4 mt-4">
                  <label className="flex items-center gap-2 text-zinc-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="w-4 h-4 accent-[#DC2626] rounded border-zinc-800"
                    />
                    <span>Ledger is active</span>
                  </label>
                </div>
              </div>

              {editingLedger && (
                <div className="bg-zinc-950 p-3 border border-zinc-900 rounded text-[11px] text-zinc-500 leading-relaxed">
                  Note: The starting balance cannot be directly edited after creation to preserve financial ledger traceability. Record a transaction to adjust balance levels.
                </div>
              )}

              {/* Modal Buttons */}
              <div className="flex gap-2 justify-end border-t border-zinc-900 pt-4 mt-5">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white font-bold text-xs uppercase tracking-wider px-4 py-2.5 rounded-lg border border-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#DC2626] hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider px-4 py-2.5 rounded-lg transition-colors"
                >
                  Save ledger details
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
