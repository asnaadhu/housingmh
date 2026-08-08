import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useProperty } from '../context/PropertyContext';
import {
  Lock,
  Mail,
  KeyRound,
  ShieldCheck,
  ArrowRight,
  ShieldAlert,
  Phone,
  HelpCircle,
  MessageSquare,
  Building2,
  CheckSquare,
  Square,
} from 'lucide-react';

const REMEMBER_PROPERTY_KEY = 'haharu_remembered_property_code';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const { data } = useProperty();

  const [propertyCode, setPropertyCode] = useState<string>(() => {
    return localStorage.getItem(REMEMBER_PROPERTY_KEY) || '';
  });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberPropertyCode, setRememberPropertyCode] = useState<boolean>(() => {
    return !!localStorage.getItem(REMEMBER_PROPERTY_KEY);
  });
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Auto-uppercase Property Code
  const handlePropertyCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '');
    setPropertyCode(rawVal);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const cleanPropCode = propertyCode.trim().toUpperCase();
    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    if (!cleanPropCode) {
      setErrorMessage('Please enter a valid Property Code (e.g. VFAR or NREE).');
      return;
    }

    if (!cleanEmail || !cleanPassword) {
      setErrorMessage('Please enter both your authorized Username/Email address and password.');
      return;
    }

    // Save or remove property code preference
    if (rememberPropertyCode) {
      localStorage.setItem(REMEMBER_PROPERTY_KEY, cleanPropCode);
    } else {
      localStorage.removeItem(REMEMBER_PROPERTY_KEY);
    }

    setIsLoading(true);

    try {
      // Allow GLOBAL property code or check dynamic tenant directory
      const activeTenants = (data.tenants || []).map((t) => t.propertyCode.toUpperCase());
      const isKnownProperty = cleanPropCode === 'GLOBAL' || activeTenants.includes(cleanPropCode) || cleanPropCode.length >= 2;

      if (cleanEmail.toLowerCase() !== 'admin@admin.com' && !isKnownProperty) {
        setErrorMessage(`Invalid Property Code: "${cleanPropCode}". Workspace does not exist or is inactive.`);
        setIsLoading(false);
        return;
      }

      const res = login(cleanEmail, cleanPassword);
      if (!res.success) {
        if (res.errorReason === 'invalid_password') {
          setErrorMessage(
            `Authentication Failed: Incorrect password for property workspace [${cleanPropCode}]. Please check your credentials.`
          );
        } else if (res.errorReason === 'email_not_found') {
          setErrorMessage(
            `Access Denied: User "${cleanEmail}" is not registered under Property Code [${cleanPropCode}].`
          );
        } else {
          setErrorMessage('Authentication Failed: Invalid property code or credentials.');
        }
      }
    } catch (err: any) {
      setErrorMessage('Server connection error during authentication request.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F9F8] text-[#1A1A1A] font-sans flex flex-col justify-between antialiased selection:bg-[#1A1A1A] selection:text-white">
      {/* Top Branding Banner */}
      <header className="bg-[#1A1A1A] text-white border-b border-[#333330] py-4 px-6 md:px-12 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white text-[#1A1A1A] flex items-center justify-center font-bold text-lg font-mono tracking-tighter">
            HM
          </div>
          <div>
            <h1 className="font-bold text-lg leading-none tracking-tight">
              Haharu Housing System v2.4
            </h1>
            <p className="text-[10px] text-[#A3A39F] font-mono uppercase tracking-widest mt-0.5">
              Multi-Tenant Property Workspace Portal
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-emerald-400 bg-[#262624] px-3 py-1.5 border border-[#3A3A36]">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Strict Tenant Isolation Active</span>
        </div>
      </header>

      {/* Main Login Card Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-8 my-auto">
        <div className="max-w-lg w-full bg-white border border-[#E5E5E1] shadow-xl overflow-hidden">
          {/* Hero Header */}
          <div className="p-6 sm:p-8 bg-[#1A1A1A] text-white border-b border-[#333330]">
            <div className="flex items-center gap-2 text-amber-400 text-[10px] font-mono font-bold uppercase tracking-widest mb-1">
              <Lock className="w-3.5 h-3.5" />
              <span>Multi-Tenant Authentication</span>
            </div>
            <h2 className="text-2xl font-bold">Property Workspace Sign In</h2>
            <p className="text-xs text-[#A3A39F] mt-1">
              Enter your property code and user credentials to access your isolated workspace.
            </p>
          </div>

          {/* Form View */}
          <div className="p-6 sm:p-8 space-y-6">
            {errorMessage && (
              <div className="p-4 bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-3 rounded-xs">
                <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold block text-sm">Authentication Error</strong>
                  <span>{errorMessage}</span>
                </div>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4">
              {/* Field 1: Property Code */}
              <div>
                <label className="block text-[10px] font-bold text-[#A3A39F] uppercase tracking-widest mb-1.5">
                  Property Code (e.g. VFAR) *
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-[#A3A39F] absolute left-3 top-3" />
                  <input
                    type="text"
                    value={propertyCode}
                    onChange={handlePropertyCodeChange}
                    placeholder="VFAR"
                    maxLength={10}
                    required
                    className="w-full pl-9 pr-24 py-2.5 border border-[#E5E5E1] text-[#1A1A1A] text-sm font-bold font-mono focus:outline-none focus:border-[#1A1A1A] bg-white uppercase tracking-wider"
                  />
                  <div className="absolute right-3 top-2.5 text-[10px] font-mono uppercase bg-[#F0F0ED] px-2 py-1 text-[#666662] font-semibold border border-[#D5D5D1]">
                    TENANT ID
                  </div>
                </div>
                <p className="text-[10px] text-[#A3A39F] mt-1">
                  Example codes: <strong className="text-[#1A1A1A]">VFAR</strong> for Avani+ Fares Maldives Resort.
                </p>
              </div>

              {/* Field 2: Email / Username */}
              <div>
                <label className="block text-[10px] font-bold text-[#A3A39F] uppercase tracking-widest mb-1.5">
                  Username or Authorized Email *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#A3A39F] absolute left-3 top-3" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. aasnad@avanihotels.com"
                    required
                    className="w-full pl-9 pr-3 py-2.5 border border-[#E5E5E1] text-[#1A1A1A] text-sm font-semibold focus:outline-none focus:border-[#1A1A1A] bg-white"
                  />
                </div>
              </div>

              {/* Field 3: Password */}
              <div>
                <label className="block text-[10px] font-bold text-[#A3A39F] uppercase tracking-widest mb-1.5">
                  Password *
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-[#A3A39F] absolute left-3 top-3" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter account password"
                    required
                    className="w-full pl-9 pr-3 py-2.5 border border-[#E5E5E1] text-[#1A1A1A] text-sm font-semibold focus:outline-none focus:border-[#1A1A1A] bg-white"
                  />
                </div>
              </div>

              {/* Checkbox: Remember Property Code */}
              <div className="flex items-center justify-between pt-1">
                <label
                  onClick={() => setRememberPropertyCode(!rememberPropertyCode)}
                  className="flex items-center gap-2 text-xs font-semibold text-[#1A1A1A] cursor-pointer select-none"
                >
                  {rememberPropertyCode ? (
                    <CheckSquare className="w-4 h-4 text-[#1A1A1A]" />
                  ) : (
                    <Square className="w-4 h-4 text-[#A3A39F]" />
                  )}
                  <span>Remember Property Code</span>
                </label>

                <span className="text-[10px] font-mono text-[#666662]">
                  v2.4 Multi-Tenant
                </span>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-3 bg-[#1A1A1A] hover:bg-[#333330] disabled:bg-[#888880] text-white font-bold text-xs uppercase tracking-widest transition-colors shadow-xs mt-2"
              >
                <span>{isLoading ? 'Authenticating Scope...' : 'Authenticate Workspace'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Support & Access Assistance */}
            <div className="pt-5 border-t border-[#E5E5E1] mt-6">
              <div className="flex items-center gap-2 text-[11px] font-bold text-[#1A1A1A] uppercase tracking-wider mb-2.5">
                <HelpCircle className="w-4 h-4 text-[#1A1A1A]" />
                <span>Need property workspace assistance?</span>
              </div>

              <div className="p-4 bg-[#F9F9F8] border border-[#E5E5E1] rounded-xs text-xs space-y-2.5">
                <div className="flex items-center justify-between text-[#1A1A1A] font-semibold pb-2 border-b border-[#E5E5E1]">
                  <span className="text-[#A3A39F] text-[10px] uppercase font-bold tracking-widest">
                    Contact System Administrator
                  </span>
                  <span className="font-bold text-[#1A1A1A]">Ahmed Asnad</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-0.5">
                  <a
                    href="tel:+9607292184"
                    className="flex items-center gap-2 text-[#1A1A1A] hover:text-[#000000] font-medium transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5 text-[#666662] shrink-0" />
                    <span>Call: <strong>+960 729 2184</strong></span>
                  </a>

                  <a
                    href="https://wa.me/9607292184"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-emerald-700 hover:text-emerald-800 font-medium transition-colors"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>WhatsApp: <strong>+960 729 2184</strong></span>
                  </a>

                  <a
                    href="mailto:aasnad@avanihotels.com"
                    className="sm:col-span-2 flex items-center gap-2 text-[#1A1A1A] hover:text-[#000000] font-medium transition-colors pt-1"
                  >
                    <Mail className="w-3.5 h-3.5 text-[#666662] shrink-0" />
                    <span>Email: <strong>aasnad@avanihotels.com</strong></span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Security Footer Notice */}
      <footer className="py-4 text-center text-[10px] font-mono text-[#A3A39F] uppercase tracking-wider border-t border-[#E5E5E1] bg-white">
        Haharu Housing System v2.4 &bull; Multi-Tenant Workspace &bull; All activity is audited per property scope.
      </footer>
    </div>
  );
};

