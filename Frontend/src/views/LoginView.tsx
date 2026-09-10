import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, Eye, EyeOff, AlertTriangle } from 'lucide-react';

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
      setError('Please provide username and password.');
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
    <div className="relative min-h-screen bg-[#071326] flex flex-col justify-between items-center px-4 py-8 select-none overflow-hidden">
      {/* Background Watermark Art on Right */}
      <div className="absolute right-12 top-1/2 -translate-y-1/2 hidden lg:flex flex-col items-end opacity-20 pointer-events-none">
        <Shield className="w-80 h-80 text-blue-500 stroke-[1]" />
        <div className="text-right text-3xl font-extrabold tracking-wider text-blue-200 mt-2 space-y-1">
          <div>Detect</div>
          <div>Prevent</div>
          <div>Protect</div>
        </div>
      </div>

      {/* Top Header Logo */}
      <div className="flex flex-col items-center text-center mt-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-xl shadow-blue-600/30 mb-3">
          <Shield className="h-8 w-8 fill-current" />
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-white m-0">
          ZeroFraud<span className="text-blue-500">360</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Real-Time Fraud Detection for a Safer Tomorrow
        </p>
      </div>

      {/* Center White Sign In Card matching reference image */}
      <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white p-7 shadow-2xl my-6">
        <div className="mb-5">
          <h2 className="text-xl font-bold text-slate-900 m-0">Sign In</h2>
          <p className="text-xs text-slate-500 mt-0.5">Access your officer portal</p>
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 p-2.5 text-xs text-red-600">
            <AlertTriangle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Role Dropdown */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Role</label>
            <select
              value={selectedRole}
              onChange={(e) => handleRoleChange(e.target.value as any)}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-800 focus:border-blue-600 focus:bg-white focus:outline-none"
            >
              <option value="bank">Bank Officer</option>
              <option value="police">Police Officer</option>
              <option value="cyber">Cyber Analyst</option>
            </select>
          </div>

          {/* Username */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none"
              required
            />
          </div>

          {/* Password with Eye Icon */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none pr-9"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Blue Sign In Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-600/30 transition-all disabled:opacity-50 cursor-pointer mt-1"
          >
            {isLoading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>
      </div>

      {/* Bottom Footer Text matching reference image */}
      <div className="text-center text-[11px] text-slate-500 max-w-sm leading-relaxed mb-2">
        <p className="font-semibold text-slate-400">ZeroFraud360</p>
        <p>An educational simulation for fraud detection and financial crime prevention.</p>
      </div>
    </div>
  );
};
