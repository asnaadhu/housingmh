import React, { useState } from 'react';
import { useProperty } from '../../context/PropertyContext';
import {
  Building2,
  Database,
  X,
  Plus,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Server,
  KeyRound,
  Mail,
  MapPin,
  Layers,
  ArrowRight,
  RefreshCw,
  Copy,
} from 'lucide-react';

interface CreateTenantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessSwitch?: (code: string) => void;
}

export const CreateTenantModal: React.FC<CreateTenantModalProps> = ({
  isOpen,
  onClose,
  onSuccessSwitch,
}) => {
  const { data, createTenantWorkspace } = useProperty();

  const [propertyCode, setPropertyCode] = useState('');
  const [propertyName, setPropertyName] = useState('');
  const [region, setRegion] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('Admin2026!');
  const [templateMode, setTemplateMode] = useState<'clean' | 'seed' | 'clone'>('clean');

  const [errorMsg, setErrorMsg] = useState('');
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [provisionStep, setProvisionStep] = useState(0);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handlePropertyCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '');
    setPropertyCode(raw);
    setErrorMsg('');
  };

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanCode = propertyCode.trim().toUpperCase();
    const cleanName = propertyName.trim();

    if (!cleanCode || cleanCode.length < 2) {
      setErrorMsg('Property Code must be at least 2 uppercase characters (e.g., LUX, KUD, ANAN).');
      return;
    }

    if (!cleanName) {
      setErrorMsg('Please enter a valid Property Name.');
      return;
    }

    // Check existing property codes
    const existingTenants = data.tenants || [];
    const exists = existingTenants.some(
      (t) => t.propertyCode.toUpperCase() === cleanCode
    ) || ['VFAR', 'NREE', 'AVANI', 'MJR', 'DEMO', 'GLOBAL'].includes(cleanCode);

    if (exists) {
      setErrorMsg(`Property Code "${cleanCode}" already exists in the system. Please use a unique property code.`);
      return;
    }

    // Start Provisioning Animation Sequence
    setIsProvisioning(true);
    setProvisionStep(1);

    setTimeout(async () => {
      setProvisionStep(2);
      setTimeout(async () => {
        setProvisionStep(3);
        setTimeout(async () => {
          setProvisionStep(4);
          try {
            await createTenantWorkspace({
              propertyCode: cleanCode,
              propertyName: cleanName,
              region: region.trim() || 'Maldives',
              contactEmail: contactEmail.trim() || `admin.${cleanCode.toLowerCase()}@haharu.com`,
              templateMode,
              initialAdminEmail: contactEmail.trim() || `admin.${cleanCode.toLowerCase()}@haharu.com`,
              initialAdminPassword: adminPassword || 'Admin2026!',
            });

            setIsProvisioning(false);
            setIsSuccess(true);
          } catch (err: any) {
            setIsProvisioning(false);
            setErrorMsg(err?.message || 'Failed to provision tenant database workspace.');
          }
        }, 800);
      }, 800);
    }, 700);
  };

  const handleResetForm = () => {
    setPropertyCode('');
    setPropertyName('');
    setRegion('');
    setContactEmail('');
    setAdminPassword('Admin2026!');
    setTemplateMode('clean');
    setErrorMsg('');
    setIsProvisioning(false);
    setProvisionStep(0);
    setIsSuccess(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white border border-[#333330] w-full max-w-2xl rounded-xs shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="bg-[#1A1A1A] text-white p-6 border-b border-[#333330] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-xs">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold">
                Multi-Tenant Database Provisioning Engine
              </div>
              <h3 className="text-xl font-bold">Provision New Property Tenant Workspace</h3>
            </div>
          </div>
          <button
            onClick={handleResetForm}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xs transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-6 max-h-[80vh] overflow-y-auto">
          {isSuccess ? (
            /* Success View */
            <div className="text-center py-6 space-y-5">
              <div className="w-16 h-16 bg-emerald-100 border-2 border-emerald-500 text-emerald-700 rounded-full flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest bg-emerald-100 text-emerald-800 px-3 py-1 font-bold rounded-xs border border-emerald-300">
                  Database Workspace Provisioned
                </span>
                <h4 className="text-2xl font-bold text-[#1A1A1A] mt-3">
                  Tenant [{propertyCode}] Created Successfully!
                </h4>
                <p className="text-xs text-[#666662] max-w-md mx-auto mt-1">
                  The property workspace for <strong className="text-[#1A1A1A]">{propertyName}</strong> has been initialized with an isolated database schema and security enclave.
                </p>
              </div>

              <div className="p-4 bg-[#F9F9F8] border border-[#E5E5E1] text-left text-xs space-y-2 rounded-xs max-w-lg mx-auto font-mono">
                <div className="flex justify-between">
                  <span className="text-[#666662]">PROPERTY CODE:</span>
                  <span className="font-bold text-[#1A1A1A]">{propertyCode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#666662]">PROPERTY NAME:</span>
                  <span className="font-bold text-[#1A1A1A]">{propertyName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#666662]">INITIAL DB TEMPLATE:</span>
                  <span className="font-bold text-amber-700 uppercase">{templateMode} WORKSPACE</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#666662]">ADMIN ACCOUNT:</span>
                  <span className="font-bold text-[#1A1A1A]">{contactEmail || `admin.${propertyCode.toLowerCase()}@haharu.com`}</span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-3 pt-4">
                <button
                  onClick={() => {
                    handleResetForm();
                    if (onSuccessSwitch) {
                      onSuccessSwitch(propertyCode);
                    }
                  }}
                  className="px-5 py-2.5 bg-[#1A1A1A] hover:bg-[#333330] text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 rounded-xs shadow-xs"
                >
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Switch to [{propertyCode}] Workspace Now</span>
                </button>
                <button
                  onClick={handleResetForm}
                  className="px-4 py-2.5 border border-[#E5E5E1] hover:bg-[#F0F0EE] text-[#1A1A1A] font-bold text-xs uppercase tracking-wider rounded-xs"
                >
                  Close
                </button>
              </div>
            </div>
          ) : isProvisioning ? (
            /* Provisioning Progress View */
            <div className="py-8 space-y-6 text-center">
              <div className="inline-block p-4 bg-amber-50 border border-amber-200 rounded-full animate-pulse">
                <Server className="w-10 h-10 text-amber-600" />
              </div>

              <div>
                <h4 className="text-xl font-bold text-[#1A1A1A]">
                  Initializing Property Database Workspace...
                </h4>
                <p className="text-xs text-[#666662] mt-1 font-mono">
                  Provisioning tenant [{propertyCode}] on shared database with strict schema isolation.
                </p>
              </div>

              {/* Progress Steps Checklist */}
              <div className="max-w-md mx-auto space-y-3 text-left font-mono text-xs border border-[#E5E5E1] bg-[#F9F9F8] p-4 rounded-xs">
                <div className={`flex items-center gap-3 ${provisionStep >= 1 ? 'text-emerald-700 font-bold' : 'text-[#A3A39F]'}`}>
                  {provisionStep >= 1 ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <div className="w-4 h-4 rounded-full border border-zinc-300 shrink-0" />}
                  <span>1. Registering [{propertyCode}] in Master Tenant Directory</span>
                </div>
                <div className={`flex items-center gap-3 ${provisionStep >= 2 ? 'text-emerald-700 font-bold' : 'text-[#A3A39F]'}`}>
                  {provisionStep >= 2 ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <div className="w-4 h-4 rounded-full border border-zinc-300 shrink-0" />}
                  <span>2. Creating Isolated Database Enclave & Firestore Rules</span>
                </div>
                <div className={`flex items-center gap-3 ${provisionStep >= 3 ? 'text-emerald-700 font-bold' : 'text-[#A3A39F]'}`}>
                  {provisionStep >= 3 ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <div className="w-4 h-4 rounded-full border border-zinc-300 shrink-0" />}
                  <span>3. Seeding Workspace Schema ({templateMode.toUpperCase()} Mode)</span>
                </div>
                <div className={`flex items-center gap-3 ${provisionStep >= 4 ? 'text-emerald-700 font-bold' : 'text-[#A3A39F]'}`}>
                  {provisionStep >= 4 ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <div className="w-4 h-4 rounded-full border border-zinc-300 shrink-0" />}
                  <span>4. Assigning Initial Tenant Admin Access Credentials</span>
                </div>
              </div>
            </div>
          ) : (
            /* Creation Form */
            <form onSubmit={handleCreateTenant} className="space-y-6">
              {errorMsg && (
                <div className="p-4 bg-rose-50 border border-rose-200 text-rose-900 text-xs font-semibold rounded-xs">
                  {errorMsg}
                </div>
              )}

              {/* Section 1: Tenant Identity */}
              <div className="space-y-4">
                <div className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-[#E5E5E1]">
                  <Building2 className="w-4 h-4 text-amber-600" />
                  <span>1. Property & Tenant Identity Configuration</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-[#A3A39F] uppercase tracking-widest mb-1">
                      Property Code (Tenant ID) *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={propertyCode}
                        onChange={handlePropertyCodeChange}
                        placeholder="e.g. LUX"
                        maxLength={10}
                        required
                        className="w-full px-3 py-2 border border-[#E5E5E1] text-[#1A1A1A] text-sm font-bold font-mono focus:outline-none focus:border-[#1A1A1A] bg-white uppercase tracking-wider"
                      />
                      <span className="absolute right-2 top-2 text-[9px] font-mono text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 border border-amber-200">
                        UPPERCASE
                      </span>
                    </div>
                    <p className="text-[10px] text-[#A3A39F] mt-1">
                      Short unique identifier used at login (e.g., VFAR, NREE, LUX, KUD).
                    </p>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#A3A39F] uppercase tracking-widest mb-1">
                      Property Name *
                    </label>
                    <input
                      type="text"
                      value={propertyName}
                      onChange={(e) => setPropertyName(e.target.value)}
                      placeholder="e.g. LUX* South Ari Atoll"
                      required
                      className="w-full px-3 py-2 border border-[#E5E5E1] text-[#1A1A1A] text-sm font-semibold focus:outline-none focus:border-[#1A1A1A] bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-[#A3A39F] uppercase tracking-widest mb-1">
                      Region / Island Location
                    </label>
                    <div className="relative">
                      <MapPin className="w-3.5 h-3.5 text-[#A3A39F] absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={region}
                        onChange={(e) => setRegion(e.target.value)}
                        placeholder="e.g. South Ari Atoll, Maldives"
                        className="w-full pl-8 pr-3 py-2 border border-[#E5E5E1] text-[#1A1A1A] text-xs font-semibold focus:outline-none focus:border-[#1A1A1A] bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#A3A39F] uppercase tracking-widest mb-1">
                      Tenant Admin Email
                    </label>
                    <div className="relative">
                      <Mail className="w-3.5 h-3.5 text-[#A3A39F] absolute left-3 top-2.5" />
                      <input
                        type="email"
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        placeholder={
                          propertyCode
                            ? `admin.${propertyCode.toLowerCase()}@haharu.com`
                            : 'admin.tenant@haharu.com'
                        }
                        className="w-full pl-8 pr-3 py-2 border border-[#E5E5E1] text-[#1A1A1A] text-xs font-semibold focus:outline-none focus:border-[#1A1A1A] bg-white"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: DB Initialization Strategy */}
              <div className="space-y-3">
                <div className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-[#E5E5E1]">
                  <Database className="w-4 h-4 text-amber-600" />
                  <span>2. Database Workspace Initialization Strategy</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Option 1: Clean Empty DB */}
                  <label
                    onClick={() => setTemplateMode('clean')}
                    className={`p-3.5 border text-left cursor-pointer rounded-xs transition-all relative block ${
                      templateMode === 'clean'
                        ? 'border-amber-600 bg-amber-50/60 ring-1 ring-amber-600'
                        : 'border-[#E5E5E1] hover:border-[#A3A39F] bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-[#1A1A1A] uppercase flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                        Clean Empty DB
                      </span>
                      {templateMode === 'clean' && (
                        <CheckCircle2 className="w-4 h-4 text-amber-600" />
                      )}
                    </div>
                    <p className="text-[10px] text-[#666662] leading-relaxed">
                      Starts with a fresh, empty workspace (0 rooms, 0 beds) with standard default status categories.
                    </p>
                    <span className="inline-block text-[9px] font-mono font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 mt-2 rounded-xs">
                      RECOMMENDED FOR NEW PROPERTY
                    </span>
                  </label>

                  {/* Option 2: Seed Sample DB */}
                  <label
                    onClick={() => setTemplateMode('seed')}
                    className={`p-3.5 border text-left cursor-pointer rounded-xs transition-all relative block ${
                      templateMode === 'seed'
                        ? 'border-amber-600 bg-amber-50/60 ring-1 ring-amber-600'
                        : 'border-[#E5E5E1] hover:border-[#A3A39F] bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-[#1A1A1A] uppercase flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-indigo-600" />
                        Sample Seed DB
                      </span>
                      {templateMode === 'seed' && (
                        <CheckCircle2 className="w-4 h-4 text-amber-600" />
                      )}
                    </div>
                    <p className="text-[10px] text-[#666662] leading-relaxed">
                      Pre-populates sample buildings, 4 floors, 8 rooms & beds for quick testing and demonstration.
                    </p>
                    <span className="inline-block text-[9px] font-mono font-bold text-indigo-800 bg-indigo-50 px-1.5 py-0.5 mt-2 rounded-xs">
                      DEMO & TESTING
                    </span>
                  </label>

                  {/* Option 3: Clone Blueprint Schema */}
                  <label
                    onClick={() => setTemplateMode('clone')}
                    className={`p-3.5 border text-left cursor-pointer rounded-xs transition-all relative block ${
                      templateMode === 'clone'
                        ? 'border-amber-600 bg-amber-50/60 ring-1 ring-amber-600'
                        : 'border-[#E5E5E1] hover:border-[#A3A39F] bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-[#1A1A1A] uppercase flex items-center gap-1.5">
                        <Copy className="w-3.5 h-3.5 text-emerald-600" />
                        Clone Schema
                      </span>
                      {templateMode === 'clone' && (
                        <CheckCircle2 className="w-4 h-4 text-amber-600" />
                      )}
                    </div>
                    <p className="text-[10px] text-[#666662] leading-relaxed">
                      Clones room types & status categories from current VFAR property, keeping room records clean.
                    </p>
                    <span className="inline-block text-[9px] font-mono font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 mt-2 rounded-xs">
                      BLUEPRINT COPY
                    </span>
                  </label>
                </div>
              </div>

              {/* Section 3: Isolation Architecture Summary */}
              <div className="p-4 bg-[#F9F9F8] border border-[#E5E5E1] rounded-xs space-y-2 text-xs">
                <div className="font-bold text-[#1A1A1A] flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Tenant Data Isolation Guarantee</span>
                </div>
                <p className="text-[11px] text-[#666662] leading-normal">
                  All property records created under <strong className="text-[#1A1A1A]">{propertyCode || '[PROPERTY_CODE]'}</strong> will carry a strict <code className="bg-[#E5E5E1] px-1 font-mono text-[#1A1A1A]">property_code</code> key. Database middleware automatically appends <code className="bg-[#E5E5E1] px-1 font-mono text-[#1A1A1A]">WHERE property_code = active_property_code</code> to prevent cross-tenant data leaks.
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E5E5E1]">
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="px-4 py-2 border border-[#E5E5E1] hover:bg-[#F0F0EE] text-[#1A1A1A] font-bold text-xs uppercase tracking-wider rounded-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#1A1A1A] hover:bg-[#333330] text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 rounded-xs shadow-xs"
                >
                  <Database className="w-4 h-4 text-amber-400" />
                  <span>Provision Property DB</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
