import React, { useState, useEffect } from 'react';
import { 
  getRoles, 
  addRole, 
  updateRole, 
  deleteRole, 
  getUsersWithRoles, 
  assignRoleToUser, 
  Role, 
  UserRole 
} from '../../services/roleService';
import { 
  Shield, 
  Plus, 
  Edit, 
  Trash, 
  Check, 
  Users, 
  Lock, 
  Settings, 
  Info,
  UserCheck,
  RefreshCw,
  X,
  Search
} from 'lucide-react';
import toast from 'react-hot-toast';

const ALL_PERMISSIONS = [
  { key: 'customers.read', label: 'View Customers', module: 'Customers' },
  { key: 'customers.write', label: 'Create/Edit Customers', module: 'Customers' },
  { key: 'customers.delete', label: 'Delete Customers', module: 'Customers' },
  
  { key: 'bookings.read', label: 'View Bookings', module: 'Bookings' },
  { key: 'bookings.write', label: 'Create/Edit Bookings', module: 'Bookings' },
  { key: 'bookings.delete', label: 'Cancel/Delete Bookings', module: 'Bookings' },

  { key: 'rentals.read', label: 'View Rentals', module: 'Active Rentals' },
  { key: 'rentals.write', label: 'Dispatch/Edit Rentals', module: 'Active Rentals' },
  { key: 'rentals.delete', label: 'Delete Rental Contracts', module: 'Active Rentals' },

  { key: 'quotations.read', label: 'View Quotations', module: 'Quotations' },
  { key: 'quotations.write', label: 'Create/Edit Quotations', module: 'Quotations' },
  { key: 'quotations.delete', label: 'Delete Quotations', module: 'Quotations' },

  { key: 'inventory.read', label: 'View Inventory Catalog', module: 'Inventory' },
  { key: 'inventory.write', label: 'Create/Edit Stock Items', module: 'Inventory' },
  { key: 'inventory.delete', label: 'Delete Stock Items', module: 'Inventory' },

  { key: 'logistics.read', label: 'View Deliveries/Logistics', module: 'Logistics' },
  { key: 'logistics.write', label: 'Manage Logistics Schedules', module: 'Logistics' },
  { key: 'logistics.delete', label: 'Cancel Delivery Operations', module: 'Logistics' },

  { key: 'workforce.read', label: 'View Workers & Attendance', module: 'Workforce' },
  { key: 'workforce.write', label: 'Log Attendance & Wages', module: 'Workforce' },
  { key: 'workforce.delete', label: 'Remove Workers from System', module: 'Workforce' },

  { key: 'finance.read', label: 'View Bank Accounts & Ledger', module: 'Finance' },
  { key: 'finance.write', label: 'Record General Transactions', module: 'Finance' },
  { key: 'finance.delete', label: 'Revert Financial Postings', module: 'Finance' },

  { key: 'settings.read', label: 'View Config Rules', module: 'System Admin' },
  { key: 'settings.write', label: 'Modify Pricing & Settings', module: 'System Admin' },
  { key: 'audit.read', label: 'Inspect Compliance Audit Trail', module: 'System Admin' }
];

export function RolesPermissions() {
  const [activeTab, setActiveTab] = useState<'roles' | 'users'>('roles');
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal / Form States
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [roleName, setRoleName] = useState('');
  const [roleIsDefault, setRoleIsDefault] = useState(false);
  const [checkedPermissions, setCheckedPermissions] = useState<string[]>([]);

  // User assignments states
  const [userSearch, setUserSearch] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const allRoles = await getRoles();
      setRoles(allRoles);
      
      const allUsers = await getUsersWithRoles();
      setUsers(allUsers);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load roles and permissions data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddModal = () => {
    setEditingRole(null);
    setRoleName('');
    setRoleIsDefault(false);
    setCheckedPermissions([]);
    setShowRoleModal(true);
  };

  const openEditModal = (role: Role) => {
    if (role.name === 'Admin') {
      toast.error('The default "Admin" role contains all privileges and cannot be modified.');
      return;
    }
    setEditingRole(role);
    setRoleName(role.name);
    setRoleIsDefault(role.isDefault);
    setCheckedPermissions(role.permissions);
    setShowRoleModal(true);
  };

  const togglePermission = (key: string) => {
    setCheckedPermissions(prev => 
      prev.includes(key) ? prev.filter(p => p !== key) : [...prev, key]
    );
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleName.trim()) {
      toast.error('Please enter a role name.');
      return;
    }

    try {
      if (editingRole) {
        await updateRole(editingRole.id, {
          name: roleName,
          permissions: checkedPermissions,
          isDefault: roleIsDefault
        });
        toast.success(`Role "${roleName}" updated successfully.`);
      } else {
        await addRole({
          name: roleName,
          permissions: checkedPermissions,
          isDefault: roleIsDefault
        });
        toast.success(`Role "${roleName}" created successfully.`);
      }
      setShowRoleModal(false);
      loadData();
    } catch (error) {
      console.error(error);
      toast.error('Failed to save role configuration.');
    }
  };

  const handleDeleteRole = async (id: string, name: string) => {
    if (name === 'Admin' || name === 'Viewer' || name === 'Staff') {
      toast.error(`System critical role "${name}" is protected and cannot be deleted.`);
      return;
    }
    if (window.confirm(`Are you sure you want to permanently delete the "${name}" role?`)) {
      try {
        await deleteRole(id);
        toast.success(`Role "${name}" deleted successfully.`);
        loadData();
      } catch (error: any) {
        toast.error(error.message || 'Failed to delete role.');
      }
    }
  };

  const handleAssignUserRole = async (userId: string, email: string, roleId: string) => {
    try {
      await assignRoleToUser(userId, roleId, email);
      toast.success(`Access permissions updated for ${email}.`);
      loadData();
    } catch (error) {
      console.error(error);
      toast.error('Failed to assign role to user.');
    }
  };

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  // Group permissions by module
  const modules = Array.from(new Set(ALL_PERMISSIONS.map(p => p.module)));

  return (
    <div className="flex-1 p-6 bg-black min-h-screen text-zinc-100 flex flex-col gap-6" id="roles-permissions-page">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-[#DC2626] font-semibold text-sm uppercase tracking-widest mb-1">
            <Shield className="w-4 h-4" /> Identity & Access Management
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white uppercase">Roles & Permissions</h1>
          <p className="text-zinc-400 text-sm mt-1">Configure role privileges and manage staff access profiles securely.</p>
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
          onClick={() => setActiveTab('roles')}
          className={`px-5 py-3 text-sm font-bold tracking-tight uppercase border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'roles'
              ? 'border-[#DC2626] text-white bg-zinc-900/40'
              : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Lock className="w-4 h-4" /> Role configuration
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-5 py-3 text-sm font-bold tracking-tight uppercase border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'users'
              ? 'border-[#DC2626] text-white bg-zinc-900/40'
              : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Users className="w-4 h-4" /> User authorizations
        </button>
      </div>

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20 gap-3">
          <RefreshCw className="w-8 h-8 text-[#DC2626] animate-spin" />
          <p className="text-zinc-500 text-sm">Querying system directory...</p>
        </div>
      ) : activeTab === 'roles' ? (
        // Roles Tab
        <div className="space-y-6" id="roles-config-tab">
          
          <div className="flex justify-between items-center bg-[#0D0D0D] border border-zinc-800 p-4 rounded-xl">
            <span className="text-xs text-zinc-400">Specify exactly who gets to write, approve, delete or audit records across your system.</span>
            <button
              onClick={openAddModal}
              className="bg-[#DC2626] hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider px-4 py-2.5 rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-4 h-4" /> Create Custom Role
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {roles.map((role) => (
              <div key={role.id} className="bg-[#0D0D0D] border border-zinc-800 rounded-xl p-5 flex flex-col gap-4 relative">
                
                {/* Role Header */}
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-black text-white flex items-center gap-2 uppercase tracking-wide">
                      {role.name}
                      {role.name === 'Admin' && (
                        <span className="text-[10px] bg-red-950 text-red-400 px-2 py-0.5 rounded border border-red-800/50 uppercase font-extrabold tracking-widest">
                          Root
                        </span>
                      )}
                      {role.isDefault && (
                        <span className="text-[10px] bg-zinc-900 text-zinc-400 px-2 py-0.5 rounded border border-zinc-800 uppercase font-extrabold tracking-widest">
                          Default
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-zinc-500 font-mono mt-1">UUID: {role.id}</p>
                  </div>

                  <div className="flex gap-1.5">
                    {role.name !== 'Admin' && (
                      <button
                        onClick={() => openEditModal(role)}
                        className="text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 p-2 rounded transition-colors"
                        title="Edit Permissions"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    )}
                    {role.name !== 'Admin' && role.name !== 'Viewer' && role.name !== 'Staff' && (
                      <button
                        onClick={() => handleDeleteRole(role.id, role.name)}
                        className="text-zinc-500 hover:text-red-400 bg-zinc-900 hover:bg-red-950/20 border border-zinc-800 hover:border-red-900 p-2 rounded transition-colors"
                        title="Delete Role"
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Privileges Meter */}
                <div className="border-t border-zinc-900 pt-4 flex flex-col gap-2">
                  <div className="flex justify-between text-xs text-zinc-400">
                    <span>Authorized Privileges</span>
                    <span className="font-mono text-zinc-300 font-semibold">
                      {role.name === 'Admin' ? ALL_PERMISSIONS.length : role.permissions.length} / {ALL_PERMISSIONS.length}
                    </span>
                  </div>
                  <div className="w-full bg-zinc-950 h-2 rounded border border-zinc-900 overflow-hidden">
                    <div 
                      className="bg-[#DC2626] h-full transition-all duration-500"
                      style={{ 
                        width: `${role.name === 'Admin' ? 100 : (role.permissions.length / ALL_PERMISSIONS.length) * 100}%` 
                      }}
                    />
                  </div>
                </div>

                {/* Preview of Permissions */}
                <div className="bg-zinc-950 border border-zinc-900 rounded-lg p-3 text-xs flex flex-wrap gap-1.5 max-h-36 overflow-y-auto custom-scrollbar">
                  {role.name === 'Admin' ? (
                    <div className="text-zinc-500 italic p-1">This superuser role bypasses the authorization gate and automatically inherits all system privileges.</div>
                  ) : role.permissions.length === 0 ? (
                    <div className="text-zinc-500 italic p-1">No privileges assigned. This role can only authenticate but cannot access system menus.</div>
                  ) : (
                    role.permissions.map(p => {
                      const permInfo = ALL_PERMISSIONS.find(ap => ap.key === p);
                      return (
                        <span key={p} className="bg-zinc-900 border border-zinc-800 text-zinc-300 px-2 py-0.5 rounded text-[11px] font-mono">
                          {permInfo?.label || p}
                        </span>
                      );
                    })
                  )}
                </div>

              </div>
            ))}
          </div>

        </div>
      ) : (
        // Users Tab
        <div className="space-y-6" id="user-authorizations-tab">
          
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-[#0D0D0D] border border-zinc-800 p-4 rounded-xl">
            <div className="relative w-full max-w-sm">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search operators by email..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
              />
            </div>
            <div className="text-[11px] text-zinc-500 italic">Assign roles dynamically. System configuration is live-reflected.</div>
          </div>

          <div className="bg-[#0D0D0D] border border-zinc-800 rounded-xl overflow-hidden">
            {filteredUsers.length === 0 ? (
              <div className="p-20 text-center text-zinc-500">No team members are mapped to users directory database.</div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 bg-[#070707] text-[10px] uppercase text-zinc-500 tracking-wider">
                    <th className="py-3.5 px-5 font-semibold">User Operator</th>
                    <th className="py-3.5 px-5 font-semibold">Authentication UID</th>
                    <th className="py-3.5 px-5 font-semibold">Last Authorization Update</th>
                    <th className="py-3.5 px-5 font-semibold text-right">Assign Authority Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900 text-xs">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-zinc-900/20 transition-colors">
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center font-bold text-[#DC2626]">
                            {user.email.substring(0, 2).toUpperCase()}
                          </div>
                          <span className="font-bold text-zinc-200">{user.email}</span>
                        </div>
                      </td>
                      <td className="py-4 px-5 font-mono text-zinc-500">{user.id}</td>
                      <td className="py-4 px-5 text-zinc-400 font-mono">
                        {user.updatedAt.toLocaleString()}
                      </td>
                      <td className="py-4 px-5 text-right">
                        <select
                          value={user.roleId}
                          onChange={(e) => handleAssignUserRole(user.id, user.email, e.target.value)}
                          className="bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-[#DC2626] font-semibold text-left uppercase tracking-wide"
                        >
                          <option value="">Select Role</option>
                          {roles.map(role => (
                            <option key={role.id} value={role.id}>{role.name}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

        </div>
      )}

      {/* Role Add/Edit Modal */}
      {showRoleModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-50 p-4" id="role-config-modal">
          <div className="bg-[#0D0D0D] border border-zinc-800 max-w-4xl w-full rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-zinc-800 flex justify-between items-center">
              <h3 className="text-lg font-black tracking-tight text-white uppercase flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#DC2626]" /> 
                {editingRole ? `Edit Role: ${editingRole.name}` : 'Create Custom Access Role'}
              </h3>
              <button 
                onClick={() => setShowRoleModal(false)}
                className="text-zinc-500 hover:text-white p-1.5 rounded bg-zinc-900/50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveRole} className="flex-1 overflow-y-auto p-6 space-y-6 flex flex-col">
              
              {/* Role General Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-zinc-950 p-4 border border-zinc-900 rounded-lg">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wide">Role Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sales Coordinator, Inventory Audit"
                    value={roleName}
                    onChange={(e) => setRoleName(e.target.value)}
                    className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
                  />
                </div>
                <div className="flex items-center mt-6 pl-4">
                  <label className="flex items-center gap-2.5 text-xs text-zinc-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={roleIsDefault}
                      onChange={(e) => setRoleIsDefault(e.target.checked)}
                      className="w-4 h-4 accent-[#DC2626] rounded border-zinc-800"
                    />
                    <span>Set as **Default Role** for new operators</span>
                  </label>
                </div>
              </div>

              {/* Permissions Checklist Grouped */}
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Permissions Grid Management</h4>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setCheckedPermissions(ALL_PERMISSIONS.map(p => p.key))}
                      className="text-[10px] uppercase font-bold text-zinc-400 hover:text-white transition-colors"
                    >
                      Check All
                    </button>
                    <span className="text-zinc-700">|</span>
                    <button
                      type="button"
                      onClick={() => setCheckedPermissions([])}
                      className="text-[10px] uppercase font-bold text-zinc-400 hover:text-white transition-colors"
                    >
                      Uncheck All
                    </button>
                  </div>
                </div>

                <div className="space-y-6">
                  {modules.map(moduleName => {
                    const modulePerms = ALL_PERMISSIONS.filter(p => p.module === moduleName);
                    return (
                      <div key={moduleName} className="border border-zinc-900 bg-zinc-950/20 rounded-lg p-4 space-y-3">
                        <h5 className="text-xs font-black text-[#DC2626] uppercase tracking-wider border-b border-zinc-900 pb-1.5">{moduleName} Privileges</h5>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {modulePerms.map(perm => {
                            const isChecked = checkedPermissions.includes(perm.key);
                            return (
                              <div 
                                key={perm.key}
                                onClick={() => togglePermission(perm.key)}
                                className={`p-2.5 rounded-lg border text-xs cursor-pointer flex items-center justify-between transition-all select-none ${
                                  isChecked 
                                    ? 'bg-red-950/20 border-red-900 text-white' 
                                    : 'bg-zinc-900 border-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                                }`}
                              >
                                <span>{perm.label}</span>
                                <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ml-2 ${
                                  isChecked ? 'bg-[#DC2626] border-[#DC2626]' : 'border-zinc-700'
                                }`}>
                                  {isChecked && <Check className="w-3 h-3 text-white stroke-[3px]" />}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex gap-2 justify-end border-t border-zinc-900 pt-5">
                <button
                  type="button"
                  onClick={() => setShowRoleModal(false)}
                  className="bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white font-bold text-xs uppercase tracking-wider px-4 py-2.5 rounded-lg border border-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#DC2626] hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider px-4 py-2.5 rounded-lg transition-colors"
                >
                  Save Authority Role
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
