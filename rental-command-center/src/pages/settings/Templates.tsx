import React, { useState, useEffect } from 'react';
import { 
  getTemplates, 
  addTemplate, 
  updateTemplate, 
  deleteTemplate, 
  renderTemplate, 
  Template 
} from '../../services/templateService';
import { 
  LayoutTemplate, 
  Plus, 
  Edit, 
  Trash, 
  Eye, 
  Code, 
  HelpCircle, 
  RefreshCw, 
  Save, 
  ArrowRight, 
  X,
  FileText
} from 'lucide-react';
import toast from 'react-hot-toast';

const DUMMY_PREVIEW_VARIABLES: Record<string, any> = {
  rentalId: 'RENT-00045',
  quotationId: 'QT-00012',
  customerName: 'Abebe Bekele',
  startDate: '2026-06-25',
  endDate: '2026-07-02',
  totalAmount: '15,250.00',
  validUntil: '2026-07-15',
  transactionId: 'TX-987654321',
  amountPaid: '15,250.00'
};

export function Templates() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Template being configured
  const [activeTemplate, setActiveTemplate] = useState<Template | null>(null);
  const [showEditor, setShowEditor] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [type, setType] = useState<'contract' | 'quotation' | 'invoice'>('contract');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [variables, setVariables] = useState<string[]>([]);
  const [newVariableInput, setNewVariableInput] = useState('');

  // Live preview toggler
  const [previewTab, setPreviewTab] = useState<'edit' | 'preview'>('edit');

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getTemplates();
      setTemplates(data);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load document templates.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAdd = () => {
    setActiveTemplate(null);
    setName('');
    setType('contract');
    setSubject('');
    setBody(`
<div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
  <h2 style="color: #DC2626;">NEW DOCUMENT</h2>
  <p>Dear {{customerName}},</p>
  <p>Your contract reference is {{rentalId}}.</p>
  <p>Total amount due: <strong>\${{totalAmount}} ETB</strong></p>
</div>
    `);
    setVariables(['customerName', 'rentalId', 'totalAmount']);
    setPreviewTab('edit');
    setShowEditor(true);
  };

  const handleOpenEdit = (tmpl: Template) => {
    setActiveTemplate(tmpl);
    setName(tmpl.name);
    setType(tmpl.type);
    setSubject(tmpl.subject || '');
    setBody(tmpl.body);
    setVariables(tmpl.variables || []);
    setPreviewTab('edit');
    setShowEditor(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !body.trim()) {
      toast.error('Please complete the Template Name and HTML Body.');
      return;
    }

    const payload = {
      name,
      type,
      subject,
      body,
      variables
    };

    try {
      if (activeTemplate) {
        await updateTemplate(activeTemplate.id, payload);
        toast.success(`Template "${name}" updated successfully.`);
      } else {
        await addTemplate(payload);
        toast.success(`Template "${name}" created successfully.`);
      }
      setShowEditor(false);
      loadData();
    } catch (error) {
      console.error(error);
      toast.error('Failed to save document template.');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to permanently delete template "${name}"?`)) {
      try {
        await deleteTemplate(id);
        toast.success(`Template "${name}" deleted.`);
        loadData();
      } catch (error) {
        console.error(error);
        toast.error('Failed to delete template.');
      }
    }
  };

  const handleAddVariable = () => {
    if (newVariableInput.trim() && !variables.includes(newVariableInput.trim())) {
      setVariables(prev => [...prev, newVariableInput.trim()]);
      setNewVariableInput('');
    }
  };

  const handleRemoveVariable = (v: string) => {
    setVariables(prev => prev.filter(item => item !== v));
  };

  const handleInsertVariableToken = (v: string) => {
    setBody(prev => prev + ` {{${v}}}`);
    toast(`Inserted {{${v}}} token at the end of body.`);
  };

  const getRenderedHTML = () => {
    return renderTemplate(body, DUMMY_PREVIEW_VARIABLES);
  };

  return (
    <div className="flex-1 p-6 bg-black min-h-screen text-zinc-100 flex flex-col gap-6" id="templates-settings-page">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-[#DC2626] font-semibold text-sm uppercase tracking-widest mb-1">
            <LayoutTemplate className="w-4 h-4" /> Layouts & Contracts
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white uppercase">Document Templates</h1>
          <p className="text-zinc-400 text-sm mt-1">Design and customize PDF/HTML layout definitions for customer communications.</p>
        </div>

        <button 
          onClick={loadData}
          className="text-zinc-400 hover:text-white flex items-center gap-1.5 text-xs font-semibold bg-[#0D0D0D] border border-zinc-800 px-3.5 py-2 rounded-lg transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Reload List
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <RefreshCw className="w-8 h-8 text-[#DC2626] animate-spin" />
          <p className="text-zinc-500 text-sm">Loading document templates...</p>
        </div>
      ) : !showEditor ? (
        // List View
        <div className="space-y-6" id="templates-list-view">
          <div className="flex justify-between items-center bg-[#0D0D0D] border border-zinc-800 p-4 rounded-xl">
            <span className="text-xs text-zinc-400">These templates are processed with live transaction details when rendering leases, bills, or quotations.</span>
            <button
              onClick={handleOpenAdd}
              className="bg-[#DC2626] hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider px-4 py-2.5 rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-4 h-4" /> Create Template
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {templates.map(tmpl => (
              <div key={tmpl.id} className="bg-[#0D0D0D] border border-zinc-800 rounded-xl p-5 flex flex-col justify-between gap-5 hover:border-zinc-700 transition-all">
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <span className="bg-zinc-900 border border-zinc-800 text-zinc-400 text-[9px] font-extrabold uppercase px-2.5 py-1 rounded tracking-widest font-mono">
                      {tmpl.type}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono">ID: {tmpl.id.substring(0, 8)}...</span>
                  </div>

                  <div>
                    <h3 className="text-base font-black text-white uppercase tracking-wide">{tmpl.name}</h3>
                    {tmpl.subject && (
                      <p className="text-xs text-zinc-400 mt-1.5 truncate"><span className="text-zinc-600 font-bold uppercase text-[10px] mr-1">Subject:</span> {tmpl.subject}</p>
                    )}
                  </div>

                  <div className="border-t border-zinc-900 pt-3">
                    <span className="text-[10px] text-zinc-500 uppercase font-black block mb-1">Supported Tokens</span>
                    <div className="flex flex-wrap gap-1">
                      {tmpl.variables.map(v => (
                        <span key={v} className="bg-zinc-950 text-zinc-400 border border-zinc-900/60 font-mono px-1.5 py-0.5 rounded text-[10px]">
                          {v}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 border-t border-zinc-900 pt-3">
                  <button
                    onClick={() => handleOpenEdit(tmpl)}
                    className="flex-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white font-bold text-xs uppercase py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Edit className="w-3.5 h-3.5" /> Design Layout
                  </button>
                  <button
                    onClick={() => handleDelete(tmpl.id, tmpl.name)}
                    className="text-zinc-500 hover:text-red-400 bg-zinc-900 hover:bg-red-950/20 border border-zinc-800 hover:border-red-900 p-2.5 rounded-lg transition-colors"
                    title="Delete Template"
                  >
                    <Trash className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        // Edit / Design Mode
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="templates-editor-view">
          
          {/* Controls column */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            
            {/* Template Header Meta info */}
            <form onSubmit={handleSave} className="bg-[#0D0D0D] border border-zinc-800 rounded-xl p-5 space-y-4">
              <div className="flex justify-between items-center border-b border-zinc-900 pb-2">
                <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-[#DC2626]" /> Layout Configurations
                </h3>
                <button
                  type="button"
                  onClick={() => setShowEditor(false)}
                  className="text-zinc-500 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 p-1.5 rounded transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-8 flex flex-col gap-1.5">
                  <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wide">Template Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Premium Rental Lease - Part B"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
                  />
                </div>
                
                <div className="md:col-span-4 flex flex-col gap-1.5">
                  <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wide">Document Class Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-700"
                  >
                    <option value="contract">Contract (PDF)</option>
                    <option value="quotation">Quotation (Estimates)</option>
                    <option value="invoice">Invoice (Receipts)</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wide">Email Subject Heading</label>
                <input
                  type="text"
                  placeholder="e.g. Agreement for Lease Contract #{{rentalId}}"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
                />
              </div>

              {/* Supported variables checklist */}
              <div className="space-y-2">
                <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wide block">Authorized Template variables (Handlebars format)</label>
                
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. itemDetails, deliveryAddress"
                    value={newVariableInput}
                    onChange={(e) => setNewVariableInput(e.target.value)}
                    className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 flex-1 focus:outline-none focus:border-zinc-700"
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddVariable())}
                  />
                  <button
                    type="button"
                    onClick={handleAddVariable}
                    className="bg-zinc-800 hover:bg-zinc-700 text-white text-xs px-4 rounded-lg transition-colors font-bold uppercase tracking-wider"
                  >
                    Add Token
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5 bg-zinc-950 p-2.5 border border-zinc-900 rounded-lg min-h-12 items-center">
                  {variables.length === 0 ? (
                    <span className="text-[10px] text-zinc-600 italic">No variables declared yet. Appended items will render as literal text.</span>
                  ) : (
                    variables.map(v => (
                      <span key={v} className="bg-zinc-900 border border-zinc-800 text-zinc-300 px-2 py-0.5 rounded text-[10px] flex items-center gap-1.5">
                        <span className="font-mono">{v}</span>
                        <button type="button" onClick={() => handleRemoveVariable(v)} className="text-zinc-500 hover:text-white">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))
                  )}
                </div>
              </div>

              {/* Variable Click shortcuts */}
              {variables.length > 0 && (
                <div className="space-y-1 bg-zinc-950 p-3 border border-zinc-900 rounded-lg">
                  <span className="text-[9px] text-zinc-500 font-black uppercase tracking-wider block">Token Inject Shortcuts (Click to Append to layout body)</span>
                  <div className="flex flex-wrap gap-1 pt-1">
                    {variables.map(v => (
                      <button
                        type="button"
                        key={v}
                        onClick={() => handleInsertVariableToken(v)}
                        className="bg-red-950/10 hover:bg-red-950/30 border border-red-900/35 text-red-400 font-mono text-[10px] px-2 py-0.5 rounded transition-all"
                      >
                        +{v}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* HTML Editor Textarea */}
              <div className="flex flex-col gap-1.5 pt-1">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wide flex items-center gap-1">
                    <Code className="w-3.5 h-3.5" /> Template Structure HTML Content
                  </label>
                  <span className="text-[9px] text-zinc-600 uppercase font-black">Raw Source</span>
                </div>
                <textarea
                  rows={15}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="<div style='font-family: Arial...'>Dear {{customerName}}...</div>"
                  className="w-full bg-zinc-950 border border-zinc-900 rounded-xl p-4 font-mono text-xs text-zinc-300 placeholder-zinc-700 focus:outline-none focus:border-zinc-800 custom-scrollbar"
                />
              </div>

              {/* Form buttons */}
              <div className="flex gap-2 justify-end pt-2 border-t border-zinc-900">
                <button
                  type="button"
                  onClick={() => setShowEditor(false)}
                  className="bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white font-bold text-xs uppercase tracking-wider px-4 py-2.5 rounded-lg border border-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#DC2626] hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider px-5 py-2.5 rounded-lg flex items-center gap-1.5 transition-colors"
                >
                  <Save className="w-4 h-4" /> Save Template
                </button>
              </div>

            </form>

          </div>

          {/* Live Preview Column */}
          <div className="lg:col-span-5 flex flex-col bg-[#0D0D0D] border border-zinc-800 rounded-xl overflow-hidden h-fit">
            <div className="bg-[#070707] px-4 py-3.5 border-b border-zinc-900 flex items-center justify-between">
              <span className="text-[10px] text-zinc-400 font-black uppercase tracking-wider flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-emerald-500" /> Interactive Live Preview Workspace
              </span>
              <div className="bg-zinc-900 text-[9px] text-zinc-500 uppercase px-2 py-0.5 rounded font-bold border border-zinc-800">
                Dummy data enabled
              </div>
            </div>

            {/* Simulated Live Renderer Rendered view */}
            <div className="p-4 bg-zinc-900/10 min-h-[400px] overflow-y-auto custom-scrollbar flex items-start justify-center">
              <div className="bg-white w-full rounded shadow-sm border border-zinc-200 overflow-hidden text-black min-h-[350px]">
                {/* Simulated contract document frame content */}
                <div 
                  className="p-1 overflow-x-auto"
                  dangerouslySetInnerHTML={{ __html: getRenderedHTML() }} 
                />
              </div>
            </div>

            <div className="bg-zinc-950 p-4 border-t border-zinc-900 text-[10px] text-zinc-500 space-y-1">
              <span className="font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1 mb-1"><HelpCircle className="w-3.5 h-3.5 text-[#DC2626]" /> Dummy Variables in preview:</span>
              <div className="grid grid-cols-2 font-mono text-[9px] gap-x-2 gap-y-0.5">
                {Object.entries(DUMMY_PREVIEW_VARIABLES).map(([key, value]) => (
                  <div key={key} className="flex justify-between border-b border-zinc-900/60 pb-0.5 truncate">
                    <span className="text-zinc-600">{key}:</span>
                    <span className="text-zinc-400">{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
