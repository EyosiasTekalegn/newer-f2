import React, { useState, useEffect } from 'react';
import { 
  getNumberingRules, 
  updateNumberingRule, 
  NumberingRule 
} from '../../services/numberingService';
import { 
  Binary, 
  RefreshCw, 
  Save, 
  Edit, 
  Eye, 
  X,
  Settings,
  HelpCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

export function NumberingRules() {
  const [rules, setRules] = useState<NumberingRule[]>([]);
  const [loading, setLoading] = useState(true);

  // Editing Rule state
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [editPrefix, setEditPrefix] = useState('');
  const [editNextNumber, setEditNextNumber] = useState(1);
  const [editDigitCount, setEditDigitCount] = useState(5);
  const [editSuffix, setEditSuffix] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getNumberingRules();
      setRules(data);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load numbering rules.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const startEditing = (rule: NumberingRule) => {
    setEditingRuleId(rule.id);
    setEditPrefix(rule.prefix);
    setEditNextNumber(rule.nextNumber);
    setEditDigitCount(rule.digitCount);
    setEditSuffix(rule.suffix);
  };

  const cancelEditing = () => {
    setEditingRuleId(null);
  };

  const handleSave = async (id: string) => {
    if (editNextNumber <= 0 || editDigitCount <= 0 || editDigitCount > 10) {
      toast.error('Please enter valid numbering configurations (digit count: 1-10).');
      return;
    }

    try {
      await updateNumberingRule(id, {
        prefix: editPrefix,
        nextNumber: Number(editNextNumber),
        digitCount: Number(editDigitCount),
        suffix: editSuffix
      });
      toast.success('Numbering rule updated successfully.');
      setEditingRuleId(null);
      loadData();
    } catch (error) {
      console.error(error);
      toast.error('Failed to save numbering rule.');
    }
  };

  const getPreviewFormat = (prefix: string, nextNumber: number, digitCount: number, suffix: string) => {
    const padded = String(nextNumber).padStart(digitCount, '0');
    return `${prefix}${padded}${suffix}`;
  };

  return (
    <div className="flex-1 p-6 bg-black min-h-screen text-zinc-100 flex flex-col gap-6" id="numbering-rules-page">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-[#DC2626] font-semibold text-sm uppercase tracking-widest mb-1">
            <Binary className="w-4 h-4" /> Autogeneration Rules
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white uppercase">Numbering Rules</h1>
          <p className="text-zinc-400 text-sm mt-1">Configure serial code formats for receipts, rentals, bookings, and customer profiles.</p>
        </div>

        <button 
          onClick={loadData}
          className="text-zinc-400 hover:text-white flex items-center gap-1.5 text-xs font-semibold bg-[#0D0D0D] border border-zinc-800 px-3.5 py-2 rounded-lg transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Reload Rules
        </button>
      </div>

      <div className="bg-[#0D0D0D] border border-zinc-800 p-4 rounded-xl flex items-start gap-3.5 text-xs text-zinc-400">
        <HelpCircle className="w-5 h-5 text-[#DC2626] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold text-zinc-200">Concurrent Transaction Safety Guarantee</span>
          <p className="leading-relaxed">
            All custom formatted reference numbers are fetched and incremented inside high-isolation **Firestore Transactions**. Even when multiple managers save or dispatch rentals concurrently, numbers increments are guaranteed unique with zero collisions or skips.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <RefreshCw className="w-8 h-8 text-[#DC2626] animate-spin" />
          <p className="text-zinc-500 text-sm">Querying serial rule ledger...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5" id="numbering-rules-grid">
          {rules.map(rule => {
            const isEditing = editingRuleId === rule.id;
            return (
              <div 
                key={rule.id} 
                className={`bg-[#0D0D0D] border rounded-xl p-5 flex flex-col justify-between gap-5 transition-all ${
                  isEditing ? 'border-[#DC2626]/60 shadow-lg' : 'border-zinc-800'
                }`}
              >
                
                {/* Rule Header */}
                <div className="flex justify-between items-start border-b border-zinc-900 pb-3">
                  <div>
                    <span className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-widest font-mono">
                      Database Module Mapping
                    </span>
                    <h3 className="text-lg font-black text-white uppercase tracking-wide mt-1">
                      {rule.module}
                    </h3>
                  </div>

                  {!isEditing && (
                    <button
                      onClick={() => startEditing(rule)}
                      className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:text-white text-zinc-400 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <Edit className="w-3.5 h-3.5" /> Edit Rule
                    </button>
                  )}
                </div>

                {/* Form Elements / Displays */}
                <div className="space-y-4 flex-1">
                  
                  {/* Dynamic Real-time Live Preview */}
                  <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-900 flex flex-col gap-1.5">
                    <span className="text-[9px] text-zinc-500 uppercase font-black tracking-widest flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5 text-emerald-500" /> Live Generated Serial Sample Preview
                    </span>
                    <span className="text-xl font-black font-mono text-emerald-400 select-all tracking-wide">
                      {isEditing 
                        ? getPreviewFormat(editPrefix, editNextNumber, editDigitCount, editSuffix)
                        : getPreviewFormat(rule.prefix, rule.nextNumber, rule.digitCount, rule.suffix)
                      }
                    </span>
                  </div>

                  {isEditing ? (
                    <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-zinc-500 font-bold uppercase">Prefix</label>
                        <input
                          type="text"
                          value={editPrefix}
                          onChange={(e) => setEditPrefix(e.target.value)}
                          className="bg-zinc-900 border border-zinc-800 roundedpx px-2.5 py-1.5 text-xs text-white focus:outline-none"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-zinc-500 font-bold uppercase">Suffix</label>
                        <input
                          type="text"
                          value={editSuffix}
                          onChange={(e) => setEditSuffix(e.target.value)}
                          className="bg-zinc-900 border border-zinc-800 roundedpx px-2.5 py-1.5 text-xs text-white focus:outline-none"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-zinc-500 font-bold uppercase">Next Serial Number</label>
                        <input
                          type="number"
                          min="1"
                          value={editNextNumber}
                          onChange={(e) => setEditNextNumber(Number(e.target.value))}
                          className="bg-zinc-900 border border-zinc-800 roundedpx px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-zinc-500 font-bold uppercase">Zero-Padding Digits</label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={editDigitCount}
                          onChange={(e) => setEditDigitCount(Number(e.target.value))}
                          className="bg-zinc-900 border border-zinc-800 roundedpx px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-y-2 text-xs font-mono text-zinc-400 bg-zinc-900/15 p-3 rounded-lg border border-zinc-900/60">
                      <div className="flex justify-between border-b border-zinc-900/30 pb-1 pr-3">
                        <span className="text-zinc-600">PREFIX:</span>
                        <span className="text-zinc-200 font-bold">"{rule.prefix}"</span>
                      </div>
                      <div className="flex justify-between border-b border-zinc-900/30 pb-1">
                        <span className="text-zinc-600">SUFFIX:</span>
                        <span className="text-zinc-200 font-bold">"{rule.suffix}"</span>
                      </div>
                      <div className="flex justify-between border-b border-zinc-900/30 pb-1 pr-3">
                        <span className="text-zinc-600">NEXT COUNTER:</span>
                        <span className="text-zinc-100 font-bold">{rule.nextNumber}</span>
                      </div>
                      <div className="flex justify-between border-b border-zinc-900/30 pb-1">
                        <span className="text-zinc-600">DIGIT CODES:</span>
                        <span className="text-zinc-100 font-bold">{rule.digitCount} digits</span>
                      </div>
                    </div>
                  )}

                </div>

                {/* Edit Controls Save/Cancel Buttons */}
                {isEditing && (
                  <div className="flex gap-2 justify-end border-t border-zinc-900 pt-3">
                    <button
                      onClick={cancelEditing}
                      className="bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white font-bold text-xs uppercase px-3.5 py-2 rounded-lg border border-zinc-800 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleSave(rule.id)}
                      className="bg-[#DC2626] hover:bg-red-700 text-white font-bold text-xs uppercase px-4 py-2 rounded-lg flex items-center gap-1.5 transition-colors"
                    >
                      <Save className="w-3.5 h-3.5" /> Save Rule
                    </button>
                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
