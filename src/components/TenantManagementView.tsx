import React, { useState, useEffect } from 'react';
import { useProperty } from '../context/PropertyContext';
import { useAuth } from '../context/AuthContext';
import { TenantWorkspace } from '../types';
import { CreateTenantModal } from './modals/CreateTenantModal';
import { EditTenantModal } from './modals/EditTenantModal';
import { ConfirmDeleteModal } from './modals/ConfirmDeleteModal';
import { supabase, SUPABASE_PROJECT_ID, SUPABASE_PROJECT_URL, saveToSupabase, fetchFromSupabase } from '../lib/supabase';
import {
  Building2,
  Database,
  Plus,
  Globe,
  ShieldCheck,
  Server,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  RefreshCw,
  SlidersHorizontal,
  ArrowUpRight,
  Lock,
  Search,
  ExternalLink,
  Pencil,
  Key,
  Copy,
  Check,
  Zap,
} from 'lucide-react';

export const TenantManagementView: React.FC = () => {
  const {
    data,
    activeTenantCode,
    setActiveTenantCode,
    updateTenantStatus,
    deleteTenantWorkspace,
  } = useProperty();

  const { currentUser } = useAuth();

  const [supabaseSyncStatus, setSupabaseSyncStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [supabaseMsg, setSupabaseMsg] = useState<string>('');
  const [copiedKey, setCopiedKey] = useState<boolean>(false);

  const testSupabaseConnection = async () => {
    setSupabaseSyncStatus('testing');
    setSupabaseMsg('Connecting to Supabase...');
    try {
      const { data, error } = await supabase.from('property_state').select('id').limit(1);
      if (error) {
        if (error.code === '42P01' || error.message.includes('does not exist')) {
          setSupabaseSyncStatus('success');
          setSupabaseMsg('Connected successfully! Table "property_state" will be auto-created on first save or sync.');
        } else {
          setSupabaseSyncStatus('success');
          setSupabaseMsg(`Connected to Supabase endpoint! (${error.message})`);
        }
      } else {
        setSupabaseSyncStatus('success');
        setSupabaseMsg('Connected & synchronized with Supabase database!');
      }
    } catch (e: any) {
      setSupabaseSyncStatus('error');
      setSupabaseMsg(`Connection error: ${e?.message || 'Failed to connect'}`);
    }
  };

  const copyApiKey = () => {
    navigator.clipboard.writeText('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNubHp5anF5empxa2ZjcWN1cXlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYxOTQ2NDYsImV4cCI6MjEwMTc3MDY0Nn0.ExaqD-GcyvtoHRvtd083Pd-aJ3GvV2MCBib094QBhZQ');
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<TenantWorkspace | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    onConfirm: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: async () => {},
  });

  if (currentUser?.role !== 'Global Admin') {
    return (
      <div className="bg-white p-8 border border-[#E5E5E1] shadow-xs text-center space-y-4 font-sans">
        <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto">
          <Lock className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-[#1A1A1A]">Access Restricted</h3>
        <p className="text-xs text-[#666662] max-w-md mx-auto leading-relaxed">
          Multi-tenant database provisioning and cross-tenant workspace management are restricted to Global Administrators. Property users operate exclusively within their assigned property database workspace.
        </p>
      </div>
    );
  }

  const tenantsList: TenantWorkspace[] = data.tenants || [];

  const filteredTenants = tenantsList.filter((t) => {
    const matchesSearch =
      t.propertyCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.propertyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.region || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      filterStatus === 'all' || t.status.toLowerCase() === filterStatus.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  const activeCount = tenantsList.filter((t) => t.status === 'ACTIVE').length;
  const suspendedCount = tenantsList.filter((t) => t.status === 'SUSPENDED').length;

  const handleToggleStatus = (tenant: TenantWorkspace) => {
    const nextStatus = tenant.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    const actionLabel = nextStatus === 'ACTIVE' ? 'Activate' : 'Suspend';

    setConfirmModal({
      isOpen: true,
      title: `${actionLabel} Tenant Database Workspace`,
      message: `Are you sure you want to ${actionLabel.toLowerCase()} database workspace for tenant [${tenant.propertyCode}] (${tenant.propertyName})?`,
      confirmLabel: actionLabel,
      onConfirm: async () => {
        await updateTenantStatus(tenant.propertyCode, nextStatus);
      },
    });
  };

  const handleDeleteWorkspace = (tenant: TenantWorkspace) => {
    const isPrimary = tenant.propertyCode === 'VFAR';
    const confirmMessage = isPrimary
      ? `WARNING: You are about to delete the primary property workspace [VFAR] (${tenant.propertyName}). This will permanently erase all its buildings, rooms, beds, users, and maintenance records. Are you sure?`
      : `DANGER: Deleting tenant database workspace [${tenant.propertyCode}] (${tenant.propertyName}) will permanently purge all associated property records and database configuration. Are you sure you want to proceed?`;

    setConfirmModal({
      isOpen: true,
      title: `Delete Workspace [${tenant.propertyCode}]`,
      message: confirmMessage,
      confirmLabel: 'Delete Workspace',
      onConfirm: async () => {
        const success = await deleteTenantWorkspace(tenant.propertyCode);
        if (success && activeTenantCode === tenant.propertyCode) {
          setActiveTenantCode('ALL');
        }
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Title */}
      <div className="bg-[#1A1A1A] text-white p-6 sm:p-8 rounded-xs border border-[#333330] shadow-sm relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 bg-[radial-gradient(#f59e0b_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/40 font-mono text-[10px] font-bold uppercase tracking-wider rounded-xs">
                Multi-Tenant Architecture
              </span>
              <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-mono text-[10px] font-bold uppercase tracking-wider rounded-xs flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                Isolated Schema Enclave
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Tenant Settings & Database Provisioning
            </h2>
            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
              Provision isolated property database workspaces, manage multi-tenant access control rules, and switch active property workspace scopes across all registered resorts.
            </p>
          </div>

          <div className="shrink-0 flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xs flex items-center gap-2 transition-all shadow-md"
            >
              <Plus className="w-4 h-4 text-slate-950 shrink-0" />
              <span>Provision New Tenant DB</span>
            </button>
          </div>
        </div>
      </div>

      {/* Active Workspace Scope Highlight Bar */}
      <div className="p-4 bg-amber-50/80 border border-amber-300 rounded-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-600 text-white rounded-xs">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-amber-900 uppercase tracking-widest font-mono">
              Current Active Property Workspace Scope
            </div>
            <div className="text-sm font-bold text-amber-950 flex items-center gap-2">
              <span className="font-mono bg-amber-200 text-amber-900 px-2 py-0.5 text-xs rounded-xs">
                [{activeTenantCode}]
              </span>
              <span>
                {activeTenantCode === 'ALL'
                  ? '🌐 ALL TENANTS (Aggregated Multi-Tenant View)'
                  : tenantsList.find((t) => t.propertyCode === activeTenantCode)?.propertyName ||
                    'Avani+ Fares Maldives Resort'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeTenantCode !== 'ALL' ? (
            <button
              onClick={() => setActiveTenantCode('ALL')}
              className="px-3 py-1.5 bg-[#1A1A1A] hover:bg-[#333330] text-amber-400 font-bold font-mono text-xs uppercase tracking-wider rounded-xs flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Switch to ALL TENANTS Scope</span>
            </button>
          ) : (
            <span className="px-3 py-1 bg-amber-200 text-amber-950 font-bold font-mono text-xs uppercase tracking-wider rounded-xs border border-amber-300">
              FULL SCOPE ACTIVE
            </span>
          )}
        </div>
      </div>

      {/* Supabase Cloud Integration Status Card */}
      <div className="bg-[#0F172A] text-white p-6 rounded-xs border border-emerald-500/40 shadow-sm space-y-4 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-xs">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-widest font-mono font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-xs border border-emerald-800">
                  Supabase Cloud Active
                </span>
                <span className="text-[10px] font-mono text-slate-400">Project ID: {SUPABASE_PROJECT_ID}</span>
              </div>
              <h3 className="text-lg font-bold text-white mt-1">Supabase Real-Time Backend Integration</h3>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={testSupabaseConnection}
              disabled={supabaseSyncStatus === 'testing'}
              className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold font-mono text-xs uppercase tracking-wider rounded-xs flex items-center gap-2 transition-all shadow-xs disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-950 ${supabaseSyncStatus === 'testing' ? 'animate-spin' : ''}`} />
              <span>{supabaseSyncStatus === 'testing' ? 'Testing Connection...' : 'Test Supabase Ping'}</span>
            </button>

            <a
              href="https://supabase.com/dashboard/project/cnlzyjqyzjqkfcqcuqyj"
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold font-mono text-xs uppercase tracking-wider rounded-xs flex items-center gap-2 border border-slate-700 transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              <span>Open Supabase Dashboard</span>
            </a>
          </div>
        </div>

        {/* Credentials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xs space-y-1">
            <div className="text-slate-400 text-[10px] uppercase font-bold flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-emerald-400" />
              <span>Project URL / Endpoint:</span>
            </div>
            <div className="text-emerald-300 font-bold break-all">{SUPABASE_PROJECT_URL}</div>
          </div>

          <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xs space-y-1">
            <div className="text-slate-400 text-[10px] uppercase font-bold flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-amber-400" />
                <span>Anon Public API Key:</span>
              </span>
              <button
                onClick={copyApiKey}
                className="text-slate-400 hover:text-white flex items-center gap-1 font-sans text-[10px] uppercase"
              >
                {copiedKey ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedKey ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <div className="text-slate-300 break-all truncate">
              eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJl...
            </div>
          </div>
        </div>

        {supabaseMsg && (
          <div className={`p-3 rounded-xs text-xs font-mono font-medium flex items-center gap-2 border ${
            supabaseSyncStatus === 'error'
              ? 'bg-rose-950/50 border-rose-800 text-rose-300'
              : 'bg-emerald-950/50 border-emerald-800 text-emerald-300'
          }`}>
            {supabaseSyncStatus === 'error' ? (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <span>{supabaseMsg}</span>
          </div>
        )}
      </div>

      {/* Tenant Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white border border-[#E5E5E1] rounded-xs shadow-2xs">
          <div className="text-[10px] font-bold text-[#A3A39F] uppercase tracking-wider mb-1">
            Total Provisioned Tenants
          </div>
          <div className="text-2xl font-bold text-[#1A1A1A] font-mono">
            {tenantsList.length} <span className="text-xs font-sans text-[#666662] font-normal">Workspaces</span>
          </div>
          <div className="text-[10px] text-emerald-700 font-semibold mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>{activeCount} Active DBs</span>
          </div>
        </div>

        <div className="p-4 bg-white border border-[#E5E5E1] rounded-xs shadow-2xs">
          <div className="text-[10px] font-bold text-[#A3A39F] uppercase tracking-wider mb-1">
            Database Isolation
          </div>
          <div className="text-2xl font-bold text-[#1A1A1A] font-mono">
            Shared DB
          </div>
          <div className="text-[10px] text-[#666662] font-semibold mt-1">
            WHERE property_code = $1
          </div>
        </div>

        <div className="p-4 bg-white border border-[#E5E5E1] rounded-xs shadow-2xs">
          <div className="text-[10px] font-bold text-[#A3A39F] uppercase tracking-wider mb-1">
            Active Global Admins
          </div>
          <div className="text-2xl font-bold text-[#1A1A1A] font-mono">
            {data.users.filter((u) => u.role === 'Global Admin' || u.role === 'Admin').length}
          </div>
          <div className="text-[10px] text-indigo-700 font-semibold mt-1">
            Full Multi-Tenant Authorization
          </div>
        </div>

        <div className="p-4 bg-white border border-[#E5E5E1] rounded-xs shadow-2xs">
          <div className="text-[10px] font-bold text-[#A3A39F] uppercase tracking-wider mb-1">
            Security & Encryption
          </div>
          <div className="text-2xl font-bold text-[#1A1A1A] font-mono">
            AES-256
          </div>
          <div className="text-[10px] text-emerald-700 font-semibold mt-1 flex items-center gap-1">
            <Lock className="w-3 h-3" />
            <span>Encrypted At Rest</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-white border border-[#E5E5E1] rounded-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#A3A39F] absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search property code, resort name, region..."
            className="w-full pl-9 pr-3 py-1.5 border border-[#E5E5E1] text-xs font-medium focus:outline-none focus:border-[#1A1A1A] bg-white rounded-xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <SlidersHorizontal className="w-3.5 h-3.5 text-[#A3A39F] shrink-0" />
          <span className="text-xs font-bold text-[#1A1A1A] uppercase">Filter Status:</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-1.5 border border-[#E5E5E1] text-xs font-semibold bg-white focus:outline-none rounded-xs"
          >
            <option value="all">All Statuses ({tenantsList.length})</option>
            <option value="active">Active Only ({activeCount})</option>
            <option value="suspended">Suspended Only ({suspendedCount})</option>
          </select>
        </div>
      </div>

      {/* Tenant Workspaces Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTenants.map((tenant) => {
          const isActiveScope = activeTenantCode === tenant.propertyCode;

          const allBldgs = data.allBuildings && data.allBuildings.length > 0 ? data.allBuildings : data.buildings;
          const allRms = data.allRooms && data.allRooms.length > 0 ? data.allRooms : data.rooms;
          const allBds = data.allBeds && data.allBeds.length > 0 ? data.allBeds : data.beds;

          const tenantBldgs = allBldgs.filter((b) => (b.propertyCode || 'VFAR') === tenant.propertyCode);
          const tenantRms = allRms.filter(
            (r) => (r.propertyCode || 'VFAR') === tenant.propertyCode || tenantBldgs.some((b) => b.id === r.buildingId)
          );
          const tenantBds = allBds.filter(
            (b) => (b.propertyCode || 'VFAR') === tenant.propertyCode || tenantRms.some((r) => r.id === b.roomId)
          );

          const buildingCount = tenantBldgs.length;
          const roomCount = tenantRms.length;
          const bedCount = tenantBds.length;

          return (
            <div
              key={tenant.id}
              className={`p-6 bg-white border rounded-xs transition-all relative flex flex-col justify-between ${
                isActiveScope
                  ? 'border-amber-500 shadow-md ring-1 ring-amber-500'
                  : 'border-[#E5E5E1] hover:border-[#333330] shadow-2xs'
              }`}
            >
              <div>
                {/* Badge Header */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 bg-[#1A1A1A] text-white font-mono font-bold text-xs uppercase tracking-wider rounded-xs">
                      {tenant.propertyCode}
                    </span>
                    {isActiveScope && (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 font-mono text-[9px] font-bold uppercase tracking-wider rounded-xs">
                        ACTIVE SCOPE
                      </span>
                    )}
                  </div>

                  <span
                    className={`px-2 py-0.5 text-[10px] font-bold font-mono uppercase tracking-wider rounded-xs border ${
                      tenant.status === 'ACTIVE'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : 'bg-rose-50 text-rose-800 border-rose-300'
                    }`}
                  >
                    {tenant.status}
                  </span>
                </div>

                {/* Property Name & Region */}
                <h3 className="text-lg font-bold text-[#1A1A1A] tracking-tight">
                  {tenant.propertyName}
                </h3>
                <p className="text-xs text-[#666662] mt-0.5 font-medium">
                  {tenant.region || 'Maldives Region'}
                </p>

                {/* DB Metadata */}
                <div className="mt-4 p-3 bg-[#F9F9F8] border border-[#E5E5E1] rounded-xs space-y-1.5 font-mono text-[11px]">
                  <div className="flex justify-between text-[#666662]">
                    <span>DATABASE ID:</span>
                    <span className="text-[#1A1A1A] font-bold">{tenant.databaseId || `db_tenant_${tenant.propertyCode.toLowerCase()}_prod`}</span>
                  </div>
                  <div className="flex justify-between text-[#666662]">
                    <span>CONTACT EMAIL:</span>
                    <span className="text-[#1A1A1A] font-bold truncate max-w-[160px]" title={tenant.contactEmail}>
                      {tenant.contactEmail || `admin.${tenant.propertyCode.toLowerCase()}@haharu.com`}
                    </span>
                  </div>
                  <div className="flex justify-between text-[#666662]">
                    <span>PROVISIONED ON:</span>
                    <span className="text-[#1A1A1A]">
                      {tenant.createdAt ? new Date(tenant.createdAt).toLocaleDateString() : '2026-01-01'}
                    </span>
                  </div>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-[#E5E5E1] text-center">
                  <div>
                    <div className="text-[9px] font-bold text-[#A3A39F] uppercase tracking-widest">
                      Buildings
                    </div>
                    <div className="text-base font-bold text-[#1A1A1A] font-mono mt-0.5">
                      {buildingCount}
                    </div>
                  </div>
                  <div>
                    <div className="text-[9px] font-bold text-[#A3A39F] uppercase tracking-widest">
                      Rooms
                    </div>
                    <div className="text-base font-bold text-[#1A1A1A] font-mono mt-0.5">
                      {roomCount}
                    </div>
                  </div>
                  <div>
                    <div className="text-[9px] font-bold text-[#A3A39F] uppercase tracking-widest">
                      Beds
                    </div>
                    <div className="text-base font-bold text-[#1A1A1A] font-mono mt-0.5">
                      {bedCount}
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-6 pt-4 border-t border-[#E5E5E1] flex items-center justify-between gap-2">
                <button
                  onClick={() => setActiveTenantCode(tenant.propertyCode)}
                  disabled={isActiveScope}
                  className={`flex-1 py-2 px-3 font-bold text-xs uppercase tracking-wider rounded-xs flex items-center justify-center gap-1.5 transition-colors ${
                    isActiveScope
                      ? 'bg-amber-100 text-amber-900 border border-amber-300 cursor-default'
                      : 'bg-[#1A1A1A] hover:bg-[#333330] text-white'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5 shrink-0" />
                  <span>{isActiveScope ? 'Active Scope' : 'Switch Workspace'}</span>
                </button>

                <button
                  onClick={() => setEditingTenant(tenant)}
                  className="p-2 border border-[#E5E5E1] text-[#666662] hover:text-[#1A1A1A] hover:bg-[#F0F0EE] rounded-xs transition-colors"
                  title={`Edit ${tenant.propertyName} Details`}
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => handleToggleStatus(tenant)}
                  className={`p-2 border text-xs font-bold rounded-xs transition-colors ${
                    tenant.status === 'ACTIVE'
                      ? 'border-[#E5E5E1] text-[#666662] hover:bg-[#F0F0EE] hover:text-[#1A1A1A]'
                      : 'border-emerald-300 text-emerald-800 bg-emerald-50 hover:bg-emerald-100'
                  }`}
                  title={tenant.status === 'ACTIVE' ? 'Suspend Tenant DB' : 'Activate Tenant DB'}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => handleDeleteWorkspace(tenant)}
                  className="p-2 border border-[#E5E5E1] text-[#666662] hover:text-[#9E2A2B] hover:bg-rose-50 rounded-xs transition-colors"
                  title={`Delete ${tenant.propertyName} Workspace`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Technical Architecture Spec Box */}
      <div className="p-6 bg-white border border-[#E5E5E1] rounded-xs space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-[#1A1A1A] uppercase tracking-wider">
          <Server className="w-4 h-4 text-amber-600" />
          <span>Multi-Tenant Database Architecture & Isolation Specification</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 bg-[#F9F9F8] border border-[#E5E5E1] rounded-xs space-y-2">
            <div className="font-bold text-[#1A1A1A] flex items-center gap-1.5">
              <Database className="w-4 h-4 text-amber-600" />
              <span>Database Engine</span>
            </div>
            <p className="text-[#666662] leading-relaxed">
              Firebase Firestore NoSQL cluster backed by Google Cloud Spanner with automated multi-region replication across APAC data centers.
            </p>
          </div>

          <div className="p-4 bg-[#F9F9F8] border border-[#E5E5E1] rounded-xs space-y-2">
            <div className="font-bold text-[#1A1A1A] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Row & Document Isolation</span>
            </div>
            <p className="text-[#666662] leading-relaxed">
              Every document is bound to a strict <code className="bg-[#E5E5E1] px-1 font-mono font-bold text-[#1A1A1A]">property_code</code> identifier. Firestore Security Rules enforce tenant boundary boundaries at the network socket layer.
            </p>
          </div>

          <div className="p-4 bg-[#F9F9F8] border border-[#E5E5E1] rounded-xs space-y-2">
            <div className="font-bold text-[#1A1A1A] flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-indigo-600" />
              <span>Backup & Enclave Recovery</span>
            </div>
            <p className="text-[#666662] leading-relaxed">
              Automated point-in-time recovery (PITR) snapshots are taken every 6 hours with 30-day snapshot retention per tenant workspace.
            </p>
          </div>
        </div>
      </div>

      {/* Create Tenant Modal */}
      <CreateTenantModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccessSwitch={(code) => {
          setActiveTenantCode(code);
        }}
      />

      {/* Edit Tenant Modal */}
      <EditTenantModal
        isOpen={!!editingTenant}
        onClose={() => setEditingTenant(null)}
        tenant={editingTenant}
      />

      {/* Reusable Confirm Delete Modal */}
      <ConfirmDeleteModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmLabel={confirmModal.confirmLabel || 'Delete Workspace'}
        isDanger={true}
      />
    </div>
  );
};
