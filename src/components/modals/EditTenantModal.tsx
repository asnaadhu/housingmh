import React, { useState, useEffect } from 'react';
import { useProperty } from '../../context/PropertyContext';
import { TenantWorkspace } from '../../types';
import {
  Building2,
  Database,
  X,
  ShieldCheck,
  CheckCircle2,
  Mail,
  MapPin,
  Save,
  SlidersHorizontal,
} from 'lucide-react';

interface EditTenantModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenant: TenantWorkspace | null;
}

export const EditTenantModal: React.FC<EditTenantModalProps> = ({
  isOpen,
  onClose,
  tenant,
}) => {
  const { updateTenantWorkspace } = useProperty();

  const [propertyName, setPropertyName] = useState('');
  const [region, setRegion] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [databaseId, setDatabaseId] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'SUSPENDED' | 'MAINTENANCE'>('ACTIVE');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (tenant) {
      setPropertyName(tenant.propertyName || '');
      setRegion(tenant.region || '');
      setContactEmail(tenant.contactEmail || '');
      setDatabaseId(tenant.databaseId || `db_tenant_${tenant.propertyCode.toLowerCase()}_prod`);
      setStatus(tenant.status || 'ACTIVE');
      setErrorMsg('');
      setSuccessMsg('');
    }
  }, [tenant, isOpen]);

  if (!isOpen || !tenant) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanName = propertyName.trim();
    if (!cleanName) {
      setErrorMsg('Property Name cannot be empty.');
      return;
    }

    setIsSubmitting(true);
    try {
      await updateTenantWorkspace(tenant.propertyCode, {
        propertyName: cleanName,
        region: region.trim(),
        contactEmail: contactEmail.trim(),
        databaseId: databaseId.trim(),
        status,
        updatedAt: new Date().toISOString(),
      });

      setSuccessMsg('Tenant property workspace updated successfully!');
      setTimeout(() => {
        setIsSubmitting(false);
        onClose();
      }, 600);
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMsg(err?.message || 'Failed to update tenant workspace.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white border border-[#333330] w-full max-w-xl rounded-xs shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="bg-[#1A1A1A] text-white p-6 border-b border-[#333330] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-xs">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold flex items-center gap-1.5">
                <span>Tenant Database Settings</span>
                <span className="px-1.5 py-0.5 bg-amber-400/20 text-amber-300 font-mono text-[9px] rounded-xs">
                  [{tenant.propertyCode}]
                </span>
              </div>
              <h3 className="text-xl font-bold">Edit Property Tenant Workspace</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xs transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xs font-semibold">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Property Code (Read-Only) & Property Name */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-[#666662] uppercase tracking-wider mb-1.5">
                Property Code
              </label>
              <input
                type="text"
                value={tenant.propertyCode}
                disabled
                className="w-full bg-[#F0F0EE] border border-[#E5E5E1] text-[#1A1A1A] px-3 py-2 text-sm font-mono font-bold rounded-xs cursor-not-allowed opacity-80"
              />
              <span className="text-[9px] text-[#A3A39F] font-mono mt-1 block">Primary Isolation Key</span>
            </div>

            <div className="md:col-span-2">
              <label className="block text-[11px] font-bold text-[#666662] uppercase tracking-wider mb-1.5">
                Property Name <span className="text-rose-600">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={propertyName}
                  onChange={(e) => setPropertyName(e.target.value)}
                  placeholder="e.g. Avani+ Fares Maldives Resort"
                  className="w-full bg-white border border-[#E5E5E1] focus:border-amber-500 focus:outline-none text-[#1A1A1A] px-3 py-2 text-sm font-semibold rounded-xs"
                />
              </div>
            </div>
          </div>

          {/* Region / Location & Contact Email */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-[#666662] uppercase tracking-wider mb-1.5">
                Region / Location
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-[#A3A39F] absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  placeholder="e.g. Baa Atoll, Maldives"
                  className="w-full bg-white border border-[#E5E5E1] focus:border-amber-500 focus:outline-none text-[#1A1A1A] pl-9 pr-3 py-2 text-sm rounded-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#666662] uppercase tracking-wider mb-1.5">
                Contact Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#A3A39F] absolute left-3 top-2.5" />
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="e.g. admin.vfar@haharu.com"
                  className="w-full bg-white border border-[#E5E5E1] focus:border-amber-500 focus:outline-none text-[#1A1A1A] pl-9 pr-3 py-2 text-sm rounded-xs"
                />
              </div>
            </div>
          </div>

          {/* Database ID & Workspace Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-[#666662] uppercase tracking-wider mb-1.5">
                Database Schema ID
              </label>
              <div className="relative">
                <Database className="w-4 h-4 text-[#A3A39F] absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={databaseId}
                  onChange={(e) => setDatabaseId(e.target.value)}
                  placeholder="e.g. db_tenant_vfar_prod"
                  className="w-full bg-white border border-[#E5E5E1] focus:border-amber-500 focus:outline-none text-[#1A1A1A] pl-9 pr-3 py-2 text-sm font-mono rounded-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#666662] uppercase tracking-wider mb-1.5">
                Workspace Operational Status
              </label>
              <div className="relative">
                <SlidersHorizontal className="w-4 h-4 text-[#A3A39F] absolute left-3 top-2.5" />
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full bg-white border border-[#E5E5E1] focus:border-amber-500 focus:outline-none text-[#1A1A1A] pl-9 pr-3 py-2 text-sm font-semibold rounded-xs"
                >
                  <option value="ACTIVE">ACTIVE (Fully Operational)</option>
                  <option value="SUSPENDED">SUSPENDED (Access Restricted)</option>
                  <option value="MAINTENANCE">MAINTENANCE (Schema Upgrades)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Info Badge */}
          <div className="p-3 bg-[#F9F9F8] border border-[#E5E5E1] rounded-xs text-[11px] text-[#666662] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Updating property metadata takes effect live across master tenant routing tables and analytics.
            </span>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-[#E5E5E1] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-[#666662] hover:bg-[#F0F0EE] rounded-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-[#1A1A1A] hover:bg-[#333330] text-amber-400 font-bold text-xs uppercase tracking-wider rounded-xs flex items-center gap-2 shadow-sm transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving Changes...' : 'Save Tenant Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
