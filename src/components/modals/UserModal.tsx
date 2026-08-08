import React, { useState, useEffect } from 'react';
import { useProperty } from '../../context/PropertyContext';
import { useAuth } from '../../context/AuthContext';
import { UserProfile, UserRole, ModulePermissions, ModuleAccessLevel } from '../../types';
import { DEFAULT_ROLE_PERMISSIONS } from '../../context/AuthContext';
import { INITIAL_PROPERTY_DATA } from '../../data/initialData';
import { UserPlus, X, Save, Shield, Building, BedDouble, Mail, Phone, KeyRound, Database, Globe } from 'lucide-react';

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  userToEdit: UserProfile | null;
}

const ROLES: { label: string; value: UserRole; desc: string }[] = [
  { label: 'Global Admin', value: 'Global Admin', desc: 'Full multi-tenant system control across all properties and settings' },
  { label: 'Admin', value: 'Admin', desc: 'Full system control across all properties and settings' },
  { label: 'Property Manager', value: 'Property Manager', desc: 'Property Settings, Inventory, Dashboard & Bed Assignments' },
  { label: 'Staff', value: 'Staff', desc: 'Access to view assignments, update bed statuses & maintenance tickets' },
  { label: 'Tenant', value: 'Tenant', desc: 'Resident portal view to track bed assignment & submit maintenance' },
  { label: 'View Only (Dashboard & Reports)', value: 'View Only (Dashboard & Reports)', desc: 'Restricted read-only access limited strictly to Dashboard & Reports' },
];

const MODULE_KEYS: { id: keyof ModulePermissions; label: string; desc: string }[] = [
  { id: 'dashboard', label: 'Dashboard Module', desc: 'Overview metrics & property stats' },
  { id: 'availability', label: 'Property Availability', desc: 'Live vacancy, bed status & occupancy filter' },
  { id: 'assignments', label: 'Bed Assignments', desc: 'Member occupant check-ins & bed rosters' },
  { id: 'foodWaste', label: 'Food Waste Tracker', desc: 'Daily dining hall food waste log entries' },
  { id: 'maintenance', label: 'Maintenance & Tickets', desc: 'Incident reporting & work orders' },
  { id: 'reports', label: 'Reports & Export', desc: 'Occupancy logs & analytics downloads' },
  { id: 'inventory', label: 'Inventory & Buildings', desc: 'Buildings, floors, room types & status setups' },
  { id: 'users', label: 'User Management', desc: 'Account roles, credentials & access permissions' },
  { id: 'settings', label: 'System Settings', desc: 'Global configuration & master attributes' },
];

export const UserModal: React.FC<UserModalProps> = ({ isOpen, onClose, userToEdit }) => {
  const { data, activeTenantCode, addUser, updateUser } = useProperty();
  const { currentUser } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('Staff');
  const [selectedPropertyCode, setSelectedPropertyCode] = useState<string>('VFAR');
  const [employeeId, setEmployeeId] = useState('');
  const [department, setDepartment] = useState('');
  const [phone, setPhone] = useState('');
  const [assignedBuildingIds, setAssignedBuildingIds] = useState<string[]>([]);
  const [assignedBedId, setAssignedBedId] = useState('');
  const [customPermissions, setCustomPermissions] = useState<ModulePermissions>(
    DEFAULT_ROLE_PERMISSIONS['Staff']
  );
  const [showCustomPermissions, setShowCustomPermissions] = useState(false);

  const availableTenants = data.tenants && data.tenants.length > 0 ? data.tenants : INITIAL_PROPERTY_DATA.tenants || [];

  useEffect(() => {
    if (userToEdit && isOpen) {
      setName(userToEdit.name);
      setEmail(userToEdit.email);
      setPassword(userToEdit.password || '123456');
      setRole(userToEdit.role);
      const initialCode = userToEdit?.propertyCode && userToEdit.propertyCode !== 'ALL'
        ? userToEdit.propertyCode
        : (activeTenantCode !== 'ALL' ? activeTenantCode : (availableTenants[0]?.propertyCode || 'VFAR'));
      setSelectedPropertyCode(initialCode);
      setEmployeeId(userToEdit.employeeId || '');
      setDepartment(userToEdit.department || '');
      setPhone(userToEdit.phone || '');
      setAssignedBuildingIds(userToEdit.assignedBuildingIds || []);
      setAssignedBedId(userToEdit.assignedBedId || '');

      const basePerms = DEFAULT_ROLE_PERMISSIONS[userToEdit.role] || DEFAULT_ROLE_PERMISSIONS['Staff'];
      setCustomPermissions({ ...basePerms, ...(userToEdit.modulePermissions || {}) });
      setShowCustomPermissions(!!userToEdit.modulePermissions);
    } else if (isOpen) {
      setName('');
      setEmail('');
      setPassword('123456');
      setRole('Staff');
      const defaultCode = activeTenantCode !== 'ALL' ? activeTenantCode : (availableTenants[0]?.propertyCode || 'VFAR');
      setSelectedPropertyCode(defaultCode);
      setEmployeeId('');
      setDepartment('');
      setPhone('');
      setAssignedBuildingIds([]);
      setAssignedBedId('');
      setCustomPermissions(DEFAULT_ROLE_PERMISSIONS['Staff']);
      setShowCustomPermissions(false);
    }
  }, [userToEdit?.id, isOpen, activeTenantCode]);

  if (!isOpen) return null;

  // Filter buildings synced strictly to selected tenant workspace
  const allBuildingsList = data.allBuildings || data.buildings || [];
  const allRoomsList = data.allRooms || data.rooms || [];
  const allBedsList = data.allBeds || data.beds || [];

  const tenantBuildings = allBuildingsList.filter(
    (b) => (b.propertyCode || 'VFAR') === selectedPropertyCode
  );

  // Filter beds synced strictly to selected tenant workspace
  const tenantBeds = allBedsList.filter((b) => {
    const room = allRoomsList.find((r) => r.id === b.roomId);
    const building = allBuildingsList.find((bg) => bg.id === room?.buildingId);
    return (building?.propertyCode || 'VFAR') === selectedPropertyCode;
  });

  const handleRoleChange = (newRole: UserRole) => {
    setRole(newRole);
    setCustomPermissions(DEFAULT_ROLE_PERMISSIONS[newRole] || DEFAULT_ROLE_PERMISSIONS['Staff']);
  };

  const handleModulePermChange = (moduleKey: keyof ModulePermissions, level: ModuleAccessLevel) => {
    setCustomPermissions((prev) => ({
      ...prev,
      [moduleKey]: level,
    }));
  };

  const handleBuildingToggle = (bId: string) => {
    if (assignedBuildingIds.includes(bId)) {
      setAssignedBuildingIds(assignedBuildingIds.filter((id) => id !== bId));
    } else {
      setAssignedBuildingIds([...assignedBuildingIds, bId]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    const cleanPassword = password.trim() || '123456';

    const targetPropCode = selectedPropertyCode && selectedPropertyCode !== 'ALL'
      ? selectedPropertyCode
      : (activeTenantCode !== 'ALL' ? activeTenantCode : (availableTenants[0]?.propertyCode || 'VFAR'));

    const payload = {
      name: name.trim(),
      email: email.trim(),
      password: cleanPassword,
      role,
      propertyCode: targetPropCode,
      ...(employeeId.trim() ? { employeeId: employeeId.trim() } : {}),
      ...(department.trim() ? { department: department.trim() } : {}),
      ...(phone.trim() ? { phone: phone.trim() } : {}),
      ...(role === 'Property Manager' && assignedBuildingIds.length > 0 ? { assignedBuildingIds } : {}),
      ...(role === 'Tenant' && assignedBedId ? { assignedBedId } : {}),
      modulePermissions: showCustomPermissions ? customPermissions : DEFAULT_ROLE_PERMISSIONS[role],
    };

    if (userToEdit) {
      updateUser(userToEdit.id, payload);
    } else {
      addUser(payload);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#1A1A1A]/60 backdrop-blur-xs flex items-center justify-center p-4 font-sans">
      <div className="bg-white max-w-lg w-full shadow-2xl overflow-hidden border border-[#E5E5E1] animate-in fade-in zoom-in duration-150 my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 bg-[#1A1A1A] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-white" />
            <h3 className="font-bold text-lg">
              {userToEdit ? 'Edit User Account & Role' : 'Create New User Profile'}
            </h3>
          </div>
          <button onClick={onClose} className="text-[#A3A39F] hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Target Tenant / Property Database Workspace Selector */}
          <div className="bg-amber-50/60 p-3.5 border border-amber-300 rounded-xs space-y-1.5">
            <label className="block text-[10px] font-bold text-amber-900 uppercase tracking-widest flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-amber-600" />
                <span>Target Tenant / Property Database Workspace *</span>
              </span>
              <span className="px-2 py-0.5 bg-amber-200 text-amber-950 font-mono text-[9px] font-bold rounded-xs">
                DB ID: db_tenant_{selectedPropertyCode.toLowerCase()}_prod
              </span>
            </label>

            <select
              value={selectedPropertyCode}
              disabled={currentUser?.role !== 'Global Admin'}
              onChange={(e) => {
                const code = e.target.value;
                setSelectedPropertyCode(code);
                setAssignedBuildingIds([]);
                setAssignedBedId('');
              }}
              className="w-full px-3 py-2 border border-amber-300 text-[#1A1A1A] text-xs font-bold focus:outline-none focus:border-amber-600 bg-white disabled:bg-[#F9F9F8] disabled:cursor-not-allowed"
            >
              {availableTenants.map((t) => (
                <option key={t.propertyCode} value={t.propertyCode}>
                  [{t.propertyCode}] {t.propertyName} &mdash; {t.region || 'Maldives'}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-amber-800 font-medium leading-relaxed">
              Assigns this user account strictly to database workspace <strong className="font-mono">[{selectedPropertyCode}]</strong>. Buildings, rooms, and bed options below dynamically sync to match this property tenant only.
            </p>
          </div>

          {/* Name & Email */}
          <div>
            <label className="block text-[10px] font-bold text-[#A3A39F] uppercase tracking-widest mb-1.5">
              Full Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sarah Jenkins"
              required
              className="w-full px-3 py-2 border border-[#E5E5E1] text-[#1A1A1A] text-xs font-semibold focus:outline-none focus:border-[#1A1A1A]"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-[#A3A39F] uppercase tracking-widest mb-1.5 flex items-center gap-1">
              <Mail className="w-3 h-3 text-[#A3A39F]" />
              <span>Email Address *</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. sarah.j@haharu.com"
              required
              className="w-full px-3 py-2 border border-[#E5E5E1] text-[#1A1A1A] text-xs font-semibold focus:outline-none focus:border-[#1A1A1A]"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-[#A3A39F] uppercase tracking-widest mb-1.5 flex items-center gap-1">
              <KeyRound className="w-3 h-3 text-[#A3A39F]" />
              <span>Login Password *</span>
            </label>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Set account password (e.g. 123456)"
              required
              className="w-full px-3 py-2 border border-[#E5E5E1] text-[#1A1A1A] text-xs font-mono font-semibold focus:outline-none focus:border-[#1A1A1A] bg-amber-50/20"
            />
            <p className="text-[10px] text-[#A3A39F] mt-1">
              This password is required for this user to sign in at the login screen.
            </p>
          </div>

          {/* Role Selection */}
          <div>
            <label className="block text-[10px] font-bold text-[#A3A39F] uppercase tracking-widest mb-1.5 flex items-center gap-1">
              <Shield className="w-3 h-3 text-[#1A1A1A]" />
              <span>Assigned System Role *</span>
            </label>
            <select
              value={role}
              onChange={(e) => handleRoleChange(e.target.value as UserRole)}
              className="w-full px-3 py-2 border border-[#E5E5E1] text-[#1A1A1A] text-xs font-bold focus:outline-none focus:border-[#1A1A1A] bg-white"
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label} &mdash; {r.desc}
                </option>
              ))}
            </select>
          </div>

          {/* Module-based Permissions Customization toggle */}
          <div className="bg-[#F9F9F8] p-3.5 border border-[#E5E5E1] space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#1A1A1A] block">
                  Module-Level Granular Permissions
                </span>
                <span className="text-[10px] text-[#A3A39F]">
                  Configure per-module access rights (Full Access, View Only, No Access)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowCustomPermissions(!showCustomPermissions)}
                className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 bg-white border border-[#E5E5E1] hover:bg-[#F0F0EE] text-[#1A1A1A]"
              >
                {showCustomPermissions ? 'Use Default Role Rights' : 'Customize Modules'}
              </button>
            </div>

            {/* Matrix Table */}
            <div className="space-y-2 pt-2 border-t border-[#E5E5E1]">
              {MODULE_KEYS.map((mod) => {
                const currentLevel = (showCustomPermissions ? customPermissions : (DEFAULT_ROLE_PERMISSIONS[role] || DEFAULT_ROLE_PERMISSIONS['Staff']))[mod.id];
                return (
                  <div key={mod.id} className="flex items-center justify-between gap-2 p-2 bg-white border border-[#E5E5E1] text-xs">
                    <div>
                      <div className="font-bold text-[#1A1A1A] text-[11px]">{mod.label}</div>
                      <div className="text-[9px] text-[#A3A39F]">{mod.desc}</div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={!showCustomPermissions}
                        onClick={() => handleModulePermChange(mod.id, 'full')}
                        className={`px-2 py-1 text-[9px] font-bold uppercase tracking-wider rounded-xs transition-colors ${
                          currentLevel === 'full'
                            ? 'bg-[#1A1A1A] text-white font-bold'
                            : 'bg-[#F0F0EE] text-[#666662] hover:bg-[#E5E5E1]'
                        } ${!showCustomPermissions && 'opacity-80 cursor-default'}`}
                      >
                        Full
                      </button>
                      <button
                        type="button"
                        disabled={!showCustomPermissions}
                        onClick={() => handleModulePermChange(mod.id, 'view')}
                        className={`px-2 py-1 text-[9px] font-bold uppercase tracking-wider rounded-xs transition-colors ${
                          currentLevel === 'view'
                            ? 'bg-amber-400 text-[#1A1A1A] font-bold'
                            : 'bg-[#F0F0EE] text-[#666662] hover:bg-[#E5E5E1]'
                        } ${!showCustomPermissions && 'opacity-80 cursor-default'}`}
                      >
                        View Only
                      </button>
                      <button
                        type="button"
                        disabled={!showCustomPermissions}
                        onClick={() => handleModulePermChange(mod.id, 'none')}
                        className={`px-2 py-1 text-[9px] font-bold uppercase tracking-wider rounded-xs transition-colors ${
                          currentLevel === 'none'
                            ? 'bg-rose-100 text-rose-800 font-bold border border-rose-300'
                            : 'bg-[#F0F0EE] text-[#666662] hover:bg-[#E5E5E1]'
                        } ${!showCustomPermissions && 'opacity-80 cursor-default'}`}
                      >
                        No Access
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Department & Employee ID */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-[#A3A39F] uppercase tracking-widest mb-1.5">
                Employee ID
              </label>
              <input
                type="text"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                placeholder="e.g. EMP-9021"
                className="w-full px-3 py-2 border border-[#E5E5E1] text-[#1A1A1A] text-xs focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[#A3A39F] uppercase tracking-widest mb-1.5">
                Department
              </label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. Facilities, Engineering"
                className="w-full px-3 py-2 border border-[#E5E5E1] text-[#1A1A1A] text-xs focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-[#A3A39F] uppercase tracking-widest mb-1.5 flex items-center gap-1">
              <Phone className="w-3 h-3 text-[#A3A39F]" />
              <span>Contact Phone Number</span>
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (555) 019-2834"
              className="w-full px-3 py-2 border border-[#E5E5E1] text-[#1A1A1A] text-xs focus:outline-none"
            />
          </div>

          {/* Conditional Property Manager assigned buildings */}
          {role === 'Property Manager' && (
            <div className="bg-[#F9F9F8] p-3.5 border border-[#E5E5E1] space-y-2">
              <label className="block text-[10px] font-bold text-[#A3A39F] uppercase tracking-widest flex items-center justify-between">
                <span>Assigned Properties / Buildings</span>
                <span className="text-amber-700 font-mono font-bold">[{selectedPropertyCode} Scope]</span>
              </label>
              {tenantBuildings.length === 0 ? (
                <p className="text-xs text-[#A3A39F] italic py-1">
                  No buildings provisioned in [{selectedPropertyCode}] tenant database workspace yet.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {tenantBuildings.map((b) => (
                    <label key={b.id} className="flex items-center gap-2 text-xs text-[#1A1A1A] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={assignedBuildingIds.includes(b.id)}
                        onChange={() => handleBuildingToggle(b.id)}
                        className="w-4 h-4 text-[#1A1A1A] border-[#E5E5E1] focus:ring-0"
                      />
                      <span>{b.name} ({b.code})</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Conditional Tenant assigned bed */}
          {role === 'Tenant' && (
            <div className="bg-[#F9F9F8] p-3.5 border border-[#E5E5E1] space-y-2">
              <label className="block text-[10px] font-bold text-[#A3A39F] uppercase tracking-widest flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <BedDouble className="w-3.5 h-3.5 text-[#1A1A1A]" />
                  <span>Link Assigned Bed</span>
                </span>
                <span className="text-amber-700 font-mono font-bold">[{selectedPropertyCode} Scope]</span>
              </label>
              <select
                value={assignedBedId}
                onChange={(e) => setAssignedBedId(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-[#E5E5E1] text-[#1A1A1A] text-xs font-semibold focus:outline-none bg-white"
              >
                <option value="">-- Unassigned / Pending Check-in --</option>
                {tenantBeds.map((b) => {
                  const room = (data.rooms || []).find((r) => r.id === b.roomId);
                  const building = (data.buildings || []).find((bg) => bg.id === room?.buildingId);
                  return (
                    <option key={b.id} value={b.id}>
                      {building?.name || 'Building'} &bull; Room #{room?.roomNumber} &bull; {b.label}
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {/* Actions */}
          <div className="pt-4 border-t border-[#E5E5E1] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-[#E5E5E1] text-[#666662] hover:bg-[#F0F0EE] font-bold text-[10px] uppercase tracking-widest transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2.5 bg-[#1A1A1A] hover:bg-[#333330] text-white font-bold text-[10px] uppercase tracking-widest transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{userToEdit ? 'Save Changes' : 'Create User'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
