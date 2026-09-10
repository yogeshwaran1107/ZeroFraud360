import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, Eye, EyeOff, AlertTriangle, Building2, Lock, KeyRound } from 'lucide-react';

export const LoginView: React.FC = () => {
  const { login } = useAuth();
  const [selectedRole, setSelectedRole] = useState<'bank' | 'police' | 'cyber'>('bank');
  const [username, setUsername] = useState('bank');
  const [password, setPassword] = useState('Bank@12345');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRoleChange = (roleKey: 'bank' | 'police' | 'cyber') => {
    setSelectedRole(roleKey);
    if (roleKey === 'bank') {
      setUsername('bank');
      setPassword('Bank@12345');
    } else if (roleKey === 'police') {
      setUsername('police');
      setPassword('Police@12345');
    } else if (roleKey === 'cyber') {
      setUsername('cyber');
      setPassword('Cyber@12345');
    }
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Please provide officer username and password.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await login(username.trim(), password);
    } catch (err: any) {
      if (err.status === 401) {
        setError('Invalid officer credentials or account locked (after 5 failed attempts).');
      } else {
        setError(err.message || 'Unable to connect to ZeroFraud360 (:8081). Ensure backend is running.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-100 via-white to-blue-50/60 flex flex-col justify-between items-center px-4 py-8 select-none overflow-hidden">
      {/* Background Decorative Private Bank Watermark */}
      <div className="absolute right-12 top-1/2 -translate-y-1/2 hidden lg:flex flex-col items-end opacity-5 pointer-events-none">
        <Building2 className="w-96 h-96 text-slate-800" />
      </div>

      {/* Top Header Logo - White Private Bank Theme */}
      <div className="flex flex-col items-center text-center mt-3 z-10">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 text-white shadow-xl shadow-blue-900/20 mb-3 border border-blue-700/30">
          <Shield className="h-7 w-7 fill-current" />
        </div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-black tracking-tight text-slate-900 m-0">
            ZeroFraud<span className="text-blue-700">360</span>
          </h1>
          <span className="px-2 py-0.5 rounded-md bg-blue-100/70 text-blue-800 text-[10px] font-bold border border-blue-200">
            PRIVATE BANKING
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-1 max-w-sm">
          Institutional Real-Time Fraud Interception &amp; AML Compliance Portal
        </p>
      </div>

      {/* Center White Sign In Card */}
      <div className="relative z-10 w-full max-w-sm rounded-3xl bg-white p-8 shadow-xl shadow-slate-200/70 border border-slate-200/90 my-6">
        <div className="mb-6 text-center sm:text-left">
          <div className="flex items-center gap-2 mb-1">
            <Lock className="h-4 w-4 text-blue-700" />
            <h2 className="text-lg font-bold text-slate-900 m-0">Officer Sign In</h2>
          </div>
          <p className="text-xs text-slate-500">
            Enter your credentials to access the fraud interception desk
          </p>
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2.5 rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700">
            <AlertTriangle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Quick Role Selection Tabs */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              Officer Role
            </label>
            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-slate-100 border border-slate-200/80">
              <button
                type="button"
                onClick={() => handleRoleChange('bank')}
                className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedRole === 'bank'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Bank
              </button>
              <button
                type="button"
                onClick={() => handleRoleChange('police')}
                className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedRole === 'police'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Police
              </button>
              <button
                type="button"
                onClick={() => handleRoleChange('cyber')}
                className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedRole === 'cyber'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Cyber
              </button>
            </div>
          </div>

          {/* Username */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Officer ID / Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. bank"
              className="w-full rounded-xl border border-slate-300 bg-slate-50/50 px-3.5 py-2.5 text-xs font-medium text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none transition-colors"
              required
            />
          </div>

          {/* Password with Eye Icon */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Security Key / Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full rounded-xl border border-slate-300 bg-slate-50/50 px-3.5 py-2.5 text-xs font-medium text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none pr-10 transition-colors"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Sign In Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl bg-blue-700 hover:bg-blue-800 py-3 text-xs font-bold text-white shadow-md shadow-blue-700/20 transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 mt-2"
          >
            <KeyRound className="h-4 w-4" />
            <span>{isLoading ? 'Verifying Credentials...' : 'Authenticate & Sign In'}</span>
          </button>
        </form>

        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <span>Simulation Mode</span>
          <span className="font-mono font-semibold text-slate-600">ZeroFraud360 Core</span>
        </div>
      </div>

      {/* Bottom Footer Text */}
      <div className="text-center text-[11px] text-slate-500 max-w-sm leading-relaxed mb-2 z-10">
        <p className="font-bold text-slate-600">Private Banking Security &amp; Interbank Consortium</p>
        <p className="text-[10px] text-slate-400 mt-0.5">
          Compliant with RBI Cyber Security Framework &amp; Section 43A IT Act.
        </p>
      </div>
    </div>
  );
};
