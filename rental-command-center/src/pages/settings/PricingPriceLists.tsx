import React, { useState, useEffect } from 'react';
import { 
  getPricingSettings, 
  updatePricingSettings, 
  getPriceLists, 
  addPriceList, 
  updatePriceList, 
  deletePriceList, 
  PricingSettings, 
  PriceList, 
  DurationDiscount 
} from '../../services/pricingService';
import { 
  Tags, 
  Plus, 
  Edit, 
  Trash, 
  Percent, 
  Calendar, 
  Calculator, 
  AlertCircle, 
  Save, 
  RefreshCw, 
  ToggleLeft, 
  ToggleRight, 
  PlusCircle, 
  MinusCircle,
  X,
  Info
} from 'lucide-react';
import toast from 'react-hot-toast';

export function PricingPriceLists() {
  const [settings, setSettings] = useState<PricingSettings | null>(null);
  const [priceLists, setPriceLists] = useState<PriceList[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'base' | 'seasonal'>('base');

  // Pricing settings fields
  const [weeklyMultiplier, setWeeklyMultiplier] = useState(5.0);
  const [monthlyMultiplier, setMonthlyMultiplier] = useState(15.0);
  const [discounts, setDiscounts] = useState<DurationDiscount[]>([]);

  // Seasonal list modal states
  const [showSeasonModal, setShowSeasonModal] = useState(false);
  const [editingSeason, setEditingSeason] = useState<PriceList | null>(null);
  const [seasonName, setSeasonName] = useState('');
  const [seasonStart, setSeasonStart] = useState('');
  const [seasonEnd, setSeasonEnd] = useState('');
  const [seasonMultiplier, setSeasonMultiplier] = useState(1.0);
  const [seasonActive, setSeasonActive] = useState(true);
  const [seasonCategories, setSeasonCategories] = useState<string[]>([]);
  const [categoryInput, setCategoryInput] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const s = await getPricingSettings();
      setSettings(s);
      setWeeklyMultiplier(s.weeklyRateMultiplier);
      setMonthlyMultiplier(s.monthlyRateMultiplier);
      setDiscounts(s.durationDiscounts || []);

      const pl = await getPriceLists();
      setPriceLists(pl);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load pricing configurations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updatePricingSettings({
        weeklyRateMultiplier: Number(weeklyMultiplier),
        monthlyRateMultiplier: Number(monthlyMultiplier),
        durationDiscounts: discounts
      });
      toast.success('Base pricing settings updated successfully.');
      loadData();
    } catch (error) {
      console.error(error);
      toast.error('Failed to update base pricing multipliers.');
    }
  };

  // Add a tiered discount bracket
  const handleAddDiscountBracket = () => {
    setDiscounts(prev => [...prev, { minDays: 1, maxDays: 30, discountPercent: 5 }]);
  };

  // Remove a tiered discount bracket
  const handleRemoveDiscountBracket = (idx: number) => {
    setDiscounts(prev => prev.filter((_, i) => i !== idx));
  };

  const handleDiscountChange = (idx: number, field: keyof DurationDiscount, value: number) => {
    setDiscounts(prev => prev.map((item, i) => {
      if (i === idx) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  // Seasonal Price List Operations
  const openAddSeasonModal = () => {
    setEditingSeason(null);
    setSeasonName('');
    setSeasonStart('');
    setSeasonEnd('');
    setSeasonMultiplier(1.0);
    setSeasonActive(true);
    setSeasonCategories([]);
    setCategoryInput('');
    setShowSeasonModal(true);
  };

  const openEditSeasonModal = (pl: PriceList) => {
    setEditingSeason(pl);
    setSeasonName(pl.name);
    // Format to yyyy-MM-dd
    setSeasonStart(new Date(pl.startDate).toISOString().split('T')[0]);
    setSeasonEnd(new Date(pl.endDate).toISOString().split('T')[0]);
    setSeasonMultiplier(pl.multiplier);
    setSeasonActive(pl.isActive);
    setSeasonCategories(pl.targetCategories || []);
    setCategoryInput('');
    setShowSeasonModal(true);
  };

  const handleSaveSeason = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!seasonName.trim() || !seasonStart || !seasonEnd) {
      toast.error('Please complete all seasonal fields.');
      return;
    }

    const payload = {
      name: seasonName,
      startDate: new Date(seasonStart),
      endDate: new Date(seasonEnd),
      multiplier: Number(seasonMultiplier),
      isActive: seasonActive,
      targetCategories: seasonCategories
    };

    try {
      if (editingSeason) {
        await updatePriceList(editingSeason.id, payload);
        toast.success(`Seasonal rate "${seasonName}" modified.`);
      } else {
        await addPriceList(payload);
        toast.success(`Seasonal rate "${seasonName}" registered.`);
      }
      setShowSeasonModal(false);
      loadData();
    } catch (error) {
      console.error(error);
      toast.error('Failed to save seasonal price list.');
    }
  };

  const handleDeleteSeason = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to permanently delete the seasonal rule "${name}"?`)) {
      try {
        await deletePriceList(id);
        toast.success(`Seasonal rate "${name}" removed.`);
        loadData();
      } catch (error) {
        console.error(error);
        toast.error('Failed to delete seasonal rule.');
      }
    }
  };

  const handleToggleSeasonActive = async (pl: PriceList) => {
    try {
      await updatePriceList(pl.id, { isActive: !pl.isActive });
      toast.success(`${pl.name} has been ${pl.isActive ? 'deactivated' : 'activated'} successfully.`);
      loadData();
    } catch (error) {
      console.error(error);
      toast.error('Failed to toggle seasonal status.');
    }
  };

  const handleAddCategoryTag = () => {
    if (categoryInput.trim() && !seasonCategories.includes(categoryInput.trim())) {
      setSeasonCategories(prev => [...prev, categoryInput.trim()]);
      setCategoryInput('');
    }
  };

  const handleRemoveCategoryTag = (cat: string) => {
    setSeasonCategories(prev => prev.filter(c => c !== cat));
  };

  return (
    <div className="flex-1 p-6 bg-black min-h-screen text-zinc-100 flex flex-col gap-6" id="pricing-settings-page">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-[#DC2626] font-semibold text-sm uppercase tracking-widest mb-1">
            <Tags className="w-4 h-4" /> Global Settings & Finance
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white uppercase">Pricing & Price Lists</h1>
          <p className="text-zinc-400 text-sm mt-1">Configure base rental multi-day formulas and seasonal campaign multipliers.</p>
        </div>

        <button 
          onClick={loadData}
          className="text-zinc-400 hover:text-white flex items-center gap-1.5 text-xs font-semibold bg-[#0D0D0D] border border-zinc-800 px-3.5 py-2 rounded-lg transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Reload Config
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-800 gap-1">
        <button
          onClick={() => setActiveTab('base')}
          className={`px-5 py-3 text-sm font-bold tracking-tight uppercase border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'base'
              ? 'border-[#DC2626] text-white bg-zinc-900/40'
              : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Calculator className="w-4 h-4" /> Multiplier & Tier discounts
        </button>
        <button
          onClick={() => setActiveTab('seasonal')}
          className={`px-5 py-3 text-sm font-bold tracking-tight uppercase border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'seasonal'
              ? 'border-[#DC2626] text-white bg-zinc-900/40'
              : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Calendar className="w-4 h-4" /> Seasonal Price campaigns
        </button>
      </div>

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20 gap-3">
          <RefreshCw className="w-8 h-8 text-[#DC2626] animate-spin" />
          <p className="text-zinc-500 text-sm">Querying pricing configurations...</p>
        </div>
      ) : activeTab === 'base' ? (
        // Base Pricing Multipliers & Brackets
        <form onSubmit={handleSaveSettings} className="space-y-6" id="pricing-multipliers-tab">
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Multipliers Area */}
            <div className="bg-[#0D0D0D] border border-zinc-800 rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-black text-white uppercase tracking-wider border-b border-zinc-900 pb-2">Multi-Day Multiplier Formulas</h3>
              <p className="text-xs text-zinc-400">Specify the pricing multiplier factors relative to an item's base daily price. Standard practice pay-ratios:</p>
              
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between bg-zinc-950 p-4 border border-zinc-900 rounded-lg gap-4">
                  <div>
                    <label className="text-xs font-bold text-zinc-200">Weekly Rate Pay-Factor</label>
                    <span className="text-[10px] text-zinc-500 block mt-0.5">e.g. Pay for 5 days instead of 7 (Value: 5.0)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={weeklyMultiplier}
                      onChange={(e) => setWeeklyMultiplier(Number(e.target.value))}
                      className="w-20 bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-center text-xs text-white focus:outline-none focus:border-[#DC2626]"
                    />
                    <span className="text-xs text-zinc-500 font-bold font-mono">x Day Price</span>
                  </div>
                </div>

                <div className="flex items-center justify-between bg-zinc-950 p-4 border border-zinc-900 rounded-lg gap-4">
                  <div>
                    <label className="text-xs font-bold text-zinc-200">Monthly Rate Pay-Factor</label>
                    <span className="text-[10px] text-zinc-500 block mt-0.5">e.g. Pay for 15 days instead of 30 (Value: 15.0)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={monthlyMultiplier}
                      onChange={(e) => setMonthlyMultiplier(Number(e.target.value))}
                      className="w-20 bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-center text-xs text-white focus:outline-none focus:border-[#DC2626]"
                    />
                    <span className="text-xs text-zinc-500 font-bold font-mono">x Day Price</span>
                  </div>
                </div>
              </div>
            </div>

            {/* General Info / Advice card */}
            <div className="bg-[#0D0D0D] border border-zinc-800 rounded-xl p-5 space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <h3 className="text-sm font-black text-white uppercase tracking-wider border-b border-zinc-900 pb-2 flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-[#DC2626]" /> Calculation Flow Instructions
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  When a lease contract is calculated, the system queries the customer's duration in days:
                </p>
                <ul className="text-xs text-zinc-400 space-y-2.5 list-disc pl-5">
                  <li><strong>Active Season Multipliers</strong> are computed first, shifting the unit rate before applying tiered bulk price reductions.</li>
                  <li><strong>Tiered Brackets</strong> are evaluated and deducted based on total booking calendar duration length.</li>
                  <li>Receipts are generated instantly, compiling subtotal differences transparently for verification.</li>
                </ul>
              </div>

              <div className="bg-red-950/20 border border-red-900/40 p-4 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-red-300 leading-relaxed">
                  Note: Changes applied to base parameters affect quotation simulations dynamically. Real contract bills locked in active rentals remain fixed.
                </p>
              </div>
            </div>
          </div>

          {/* Tiered Discounts Grid */}
          <div className="bg-[#0D0D0D] border border-zinc-800 rounded-xl p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-zinc-900 pb-2">
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                <Percent className="w-4 h-4 text-emerald-500" /> Tiered duration bulk discounts
              </h3>
              <button
                type="button"
                onClick={handleAddDiscountBracket}
                className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white font-bold text-[11px] uppercase tracking-wider px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
              >
                <PlusCircle className="w-4 h-4 text-emerald-400" /> Add Discount bracket
              </button>
            </div>

            <p className="text-xs text-zinc-400">Enable automatic bulk percentage deductions based on rental duration brackets:</p>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pt-2">
              {discounts.map((bracket, idx) => (
                <div key={idx} className="bg-zinc-950 border border-zinc-900 rounded-xl p-4 flex flex-col gap-3 relative group">
                  <button
                    type="button"
                    onClick={() => handleRemoveDiscountBracket(idx)}
                    className="absolute top-3 right-3 text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Remove Bracket"
                  >
                    <MinusCircle className="w-4 h-4" />
                  </button>

                  <div className="text-[10px] text-zinc-500 font-black uppercase tracking-wider">Bracket #{idx + 1}</div>

                  <div className="grid grid-cols-3 gap-2.5 items-center">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-zinc-500 uppercase">Min Days</label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={bracket.minDays}
                        onChange={(e) => handleDiscountChange(idx, 'minDays', Number(e.target.value))}
                        className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-xs text-center font-mono text-white focus:outline-none"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-zinc-500 uppercase font-bold">Max Days</label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={bracket.maxDays}
                        onChange={(e) => handleDiscountChange(idx, 'maxDays', Number(e.target.value))}
                        className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-xs text-center font-mono text-white focus:outline-none"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-zinc-500 uppercase text-emerald-400 font-black">Discount %</label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          required
                          value={bracket.discountPercent}
                          onChange={(e) => handleDiscountChange(idx, 'discountPercent', Number(e.target.value))}
                          className="bg-zinc-900 border border-[#10B981]/30 rounded px-2 py-1.5 text-xs text-center font-bold text-emerald-400 w-full focus:outline-none focus:border-[#10B981]"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Form Save Button */}
          <div className="flex justify-end border-t border-zinc-900 pt-4">
            <button
              type="submit"
              className="bg-[#DC2626] hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider px-6 py-3 rounded-lg flex items-center gap-2 transition-colors shadow-lg"
            >
              <Save className="w-4 h-4" /> Save base pricing parameters
            </button>
          </div>

        </form>
      ) : (
        // Seasonal Rates Lists Tab
        <div className="space-y-6" id="pricing-seasonal-tab">
          
          <div className="flex justify-between items-center bg-[#0D0D0D] border border-zinc-800 p-4 rounded-xl">
            <span className="text-xs text-zinc-400">Configure event-based and high/low seasonal multipliers which kick in based on contract dates.</span>
            <button
              onClick={openAddSeasonModal}
              className="bg-[#DC2626] hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider px-4 py-2.5 rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Seasonal Rule
            </button>
          </div>

          <div className="bg-[#0D0D0D] border border-zinc-800 rounded-xl overflow-hidden">
            {priceLists.length === 0 ? (
              <div className="p-20 text-center text-zinc-500">No seasonal pricing rules configured yet.</div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 bg-[#070707] text-[10px] uppercase text-zinc-500 tracking-wider">
                    <th className="py-3.5 px-5 font-semibold">Seasonal Campaign</th>
                    <th className="py-3.5 px-5 font-semibold">Start Calendar Date</th>
                    <th className="py-3.5 px-5 font-semibold">End Calendar Date</th>
                    <th className="py-3.5 px-5 font-semibold">Price Multiplier Factor</th>
                    <th className="py-3.5 px-5 font-semibold text-center">Status</th>
                    <th className="py-3.5 px-5 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900 text-xs">
                  {priceLists.map((pl) => (
                    <tr key={pl.id} className="hover:bg-zinc-900/20 transition-colors">
                      <td className="py-4 px-5">
                        <div className="flex flex-col">
                          <span className="font-bold text-zinc-200">{pl.name}</span>
                          <span className="text-[10px] text-zinc-500 mt-0.5">
                            Applicable: {pl.targetCategories.length === 0 ? 'All Inventory Categories' : pl.targetCategories.join(', ')}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-5 font-mono text-zinc-400">
                        {pl.startDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </td>
                      <td className="py-4 px-5 font-mono text-zinc-400">
                        {pl.endDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </td>
                      <td className="py-4 px-5">
                        <span className={`font-mono font-bold ${pl.multiplier >= 1.0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {pl.multiplier}x 
                        </span>
                        <span className="text-[10px] text-zinc-500 ml-1">
                          ({pl.multiplier >= 1.0 ? `+${Math.round((pl.multiplier - 1) * 100)}% surcharge` : `-${Math.round((1 - pl.multiplier) * 100)}% discount`})
                        </span>
                      </td>
                      <td className="py-4 px-5 text-center">
                        <button
                          onClick={() => handleToggleSeasonActive(pl)}
                          className="focus:outline-none inline-flex items-center"
                          title="Toggle Status"
                        >
                          {pl.isActive ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-950/50 text-emerald-400 border border-emerald-800/65">
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-zinc-900 text-zinc-500 border border-zinc-800">
                              Inactive
                            </span>
                          )}
                        </button>
                      </td>
                      <td className="py-4 px-5 text-right">
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => openEditSeasonModal(pl)}
                            className="text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 p-2 rounded transition-colors"
                            title="Edit Season"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteSeason(pl.id, pl.name)}
                            className="text-zinc-500 hover:text-red-400 bg-zinc-900 hover:bg-red-950/20 border border-zinc-800 hover:border-red-900 p-2 rounded transition-colors"
                            title="Delete Season"
                          >
                            <Trash className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

        </div>
      )}

      {/* Season Add/Edit Modal */}
      {showSeasonModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-50 p-4" id="season-config-modal">
          <div className="bg-[#0D0D0D] border border-zinc-800 max-w-xl w-full rounded-xl overflow-hidden shadow-2xl flex flex-col">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-zinc-800 flex justify-between items-center">
              <h3 className="text-lg font-black tracking-tight text-white uppercase flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#DC2626]" /> 
                {editingSeason ? `Modify Seasonal rule: ${editingSeason.name}` : 'Create Seasonal multiplier rule'}
              </h3>
              <button 
                onClick={() => setShowSeasonModal(false)}
                className="text-zinc-500 hover:text-white p-1.5 rounded bg-zinc-900/50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveSeason} className="p-6 space-y-4 text-xs">
              
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wide">Season/Campaign Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Summer Peak Surcharge, Spring Equinox Special"
                  value={seasonName}
                  onChange={(e) => setSeasonName(e.target.value)}
                  className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wide">Calendar Start Date</label>
                  <input
                    type="date"
                    required
                    value={seasonStart}
                    onChange={(e) => setSeasonStart(e.target.value)}
                    className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-700"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wide">Calendar End Date</label>
                  <input
                    type="date"
                    required
                    value={seasonEnd}
                    onChange={(e) => setSeasonEnd(e.target.value)}
                    className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-zinc-950 p-4 border border-zinc-900 rounded-lg">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wide">Price Multiplier (x)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.05"
                      min="0.1"
                      max="10.0"
                      required
                      value={seasonMultiplier}
                      onChange={(e) => setSeasonMultiplier(Number(e.target.value))}
                      className="bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs font-mono text-white text-center w-24 focus:outline-none focus:border-[#DC2626]"
                    />
                    <span className="text-zinc-400">
                      ({seasonMultiplier >= 1.0 ? `+${Math.round((seasonMultiplier - 1) * 100)}% markup` : `-${Math.round((1 - seasonMultiplier) * 100)}% markdown`})
                    </span>
                  </div>
                </div>

                <div className="flex items-center pl-4">
                  <label className="flex items-center gap-2 text-zinc-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={seasonActive}
                      onChange={(e) => setSeasonActive(e.target.checked)}
                      className="w-4 h-4 accent-[#DC2626] rounded border-zinc-800"
                    />
                    <span>Active from day one</span>
                  </label>
                </div>
              </div>

              {/* Target Categories */}
              <div className="space-y-2.5">
                <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wide block">Restricted to Categories (Empty = All Inventory)</label>
                
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. Tents, Lighting, Audio"
                    value={categoryInput}
                    onChange={(e) => setCategoryInput(e.target.value)}
                    className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 flex-1 focus:outline-none focus:border-zinc-700"
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCategoryTag())}
                  />
                  <button
                    type="button"
                    onClick={handleAddCategoryTag}
                    className="bg-zinc-800 hover:bg-zinc-700 text-white text-xs px-3 rounded-lg transition-colors font-bold uppercase tracking-wider"
                  >
                    Add
                  </button>
                </div>

                {seasonCategories.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1.5">
                    {seasonCategories.map(cat => (
                      <span key={cat} className="bg-zinc-900 border border-zinc-800 text-zinc-300 px-2 py-1 rounded-full text-[10px] flex items-center gap-1">
                        {cat}
                        <button type="button" onClick={() => handleRemoveCategoryTag(cat)} className="text-zinc-500 hover:text-white">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Modal Buttons */}
              <div className="flex gap-2 justify-end border-t border-zinc-900 pt-4 mt-5">
                <button
                  type="button"
                  onClick={() => setShowSeasonModal(false)}
                  className="bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white font-bold text-xs uppercase tracking-wider px-4 py-2.5 rounded-lg border border-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#DC2626] hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider px-4 py-2.5 rounded-lg transition-colors"
                >
                  Save seasonal rule
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
