import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Hotel, KeyRound, User as UserIcon, ShieldAlert, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [otpRequired, setOtpRequired] = useState(false);
  const [maskedEmail, setMaskedEmail] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, login } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleLoginSubmit = async (inputUser: string, inputPass: string, inputOtp?: string) => {
    setUsername(inputUser);
    setPassword(inputPass);
    setError('');
    setSuccessMessage('');
    setLoading(true);
    try {
      const cleanedUsername = inputUser.trim().startsWith('@') ? inputUser.trim().substring(1) : inputUser.trim();
      const payload: any = { username: cleanedUsername, password: inputPass };
      if (inputOtp) {
        payload.otp = inputOtp;
      }
      const res = await login(payload);
      if (res && res.otp_required) {
        setOtpRequired(true);
        setMaskedEmail(res.email || '');
        setSuccessMessage(res.message || 'Verification code has been sent to your email.');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      const message = err.response?.data?.detail || err.response?.data?.error || err.message || 'Invalid credentials';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (otpRequired) {
      handleLoginSubmit(username, password, otp);
    } else {
      handleLoginSubmit(username, password);
    }
  };

  const handleBackToLogin = () => {
    setOtpRequired(false);
    setOtp('');
    setError('');
    setSuccessMessage('');
  };

  const developerAccounts = [
    { label: 'System Admin', user: 'Rajeev7112', pass: 'Rajeev123!', role: 'ADMIN', color: 'from-purple-500 to-indigo-500' },
    { label: 'Receptionist', user: 'reception_test', pass: 'Reception123!', role: 'RECEPTION', color: 'from-blue-500 to-cyan-500' },
    { label: 'Waiter Staff', user: 'waiter_test', pass: 'Waiter123!', role: 'WAITER', color: 'from-amber-500 to-orange-500' },
    { label: 'Kitchen KDS', user: 'kitchen_test', pass: 'Kitchen123!', role: 'KITCHEN', color: 'from-emerald-500 to-teal-500' },
    { label: 'Janitor Staff', user: 'janitor_test', pass: 'Janitor123!', role: 'JANITOR', color: 'from-pink-500 to-rose-500' },
  ];

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-[#0b0f19] text-gray-200 font-sans relative overflow-hidden">
      
      {/* Dynamic Background Glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-900/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-900/10 blur-[120px] pointer-events-none" />

      {/* Left Column: Splash Screen (Hidden on mobile) */}
      <div className="hidden lg:flex lg:col-span-7 flex-col justify-between p-12 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/40 relative border-r border-white/5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-indigo-400">
            <Hotel className="w-8 h-8" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-white bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
            Smart Hotel System
          </span>
        </div>

        <div className="my-auto space-y-6 max-w-lg">
          <h1 className="text-3xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Seamlessly managing <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
              Hospitality & Dining
            </span>
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed">
            A state-of-the-art hotel and restaurant management platform. Check in stays, control visual table order statuses, organize kitchen displays, and settle consolidated invoices.
          </p>
        </div>

        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-white/5 border border-white/5 backdrop-blur-md">
            <span className="text-xs font-semibold text-indigo-400 uppercase tracking-widest block mb-2">
              Developer Testing Console
            </span>
            <div className="grid grid-cols-2 gap-2.5">
              {developerAccounts.map((account) => (
                <button
                  type="button"
                  key={account.user}
                  onClick={() => handleLoginSubmit(account.user, account.pass)}
                  className="p-3 text-left rounded-lg bg-slate-900/50 hover:bg-slate-900 border border-white/5 hover:border-indigo-500/30 transition duration-200 group"
                >
                  <p className="text-xs font-bold text-white group-hover:text-indigo-300 transition">
                    {account.label}
                  </p>
                  <p className="text-[10px] text-gray-500 truncate">
                    u: {account.user}
                  </p>
                </button>
              ))}
            </div>
          </div>
          <p className="text-xs text-gray-500">
            © 2026 Smart Hotel. Loaded with responsive layouts & live telemetry.
          </p>
        </div>
      </div>

      {/* Right Column: Form Container */}
      <div className="lg:col-span-5 flex flex-col justify-center p-4 sm:p-8 lg:p-12 relative z-10">
        <div className="w-full max-w-md mx-auto space-y-8 animate-fade-in">
          
          {/* Mobile Logo View */}
          <div className="lg:hidden flex flex-col items-center mb-8">
            <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 text-indigo-400 mb-3">
              <Hotel className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold text-white">Smart Hotel</h2>
          </div>

          {otpRequired ? (
            <div className="space-y-2 text-center lg:text-left">
              <h2 className="text-3xl font-extrabold text-white tracking-tight">Security Check</h2>
              <p className="text-gray-400 text-sm">
                We sent a 6-digit verification code to <span className="text-indigo-400 font-semibold">{maskedEmail}</span>
              </p>
            </div>
          ) : (
            <div className="space-y-2 text-center lg:text-left">
              <h2 className="text-3xl font-extrabold text-white tracking-tight">Welcome Back</h2>
              <p className="text-gray-400 text-sm">Enter your credentials to manage hotel resources</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-2.5 animate-fade-in">
                <ShieldAlert className="w-5 h-5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {successMessage && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2.5 animate-fade-in">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {otpRequired ? (
              <div className="space-y-4">
                <div className="space-y-1.5 animate-fade-in">
                  <label className="text-xs font-bold tracking-wider uppercase text-gray-400">
                    Verification Code (OTP)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                      <Mail className="w-5 h-5" />
                    </div>
                    <input
                      type="text"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      className="w-full pl-11 pr-4 py-3 bg-slate-900/50 hover:bg-slate-900 border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition text-sm text-center tracking-widest font-mono text-lg text-white"
                      placeholder="• • • • • •"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className="w-full py-3.5 glowing-btn-indigo text-white font-bold rounded-xl transition duration-200 disabled:opacity-50 text-sm flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    'Verify & Sign In'
                  )}
                </button>

                <div className="flex flex-col gap-2 pt-2 animate-fade-in">
                  <button
                    type="button"
                    onClick={() => handleLoginSubmit(username, password)}
                    disabled={loading}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold transition text-center"
                  >
                    Resend Verification Code
                  </button>
                  <button
                    type="button"
                    onClick={handleBackToLogin}
                    className="flex items-center justify-center gap-1.5 text-xs text-gray-500 hover:text-gray-400 transition"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Back to Login
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold tracking-wider uppercase text-gray-400">
                    Username / Email
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                      <UserIcon className="w-5 h-5" />
                    </div>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-slate-900/50 hover:bg-slate-900 border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition text-sm"
                      placeholder="e.g. Rajeev7112"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold tracking-wider uppercase text-gray-400">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                      <KeyRound className="w-5 h-5" />
                    </div>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-slate-900/50 hover:bg-slate-900 border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition text-sm"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 glowing-btn-indigo text-white font-bold rounded-xl transition duration-200 disabled:opacity-50 text-sm flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    'Sign In'
                  )}
                </button>
              </div>
            )}
          </form>

          {/* Quick Account Selector Panel (Visible only on Mobile as an accordian/card) */}
          <div className="lg:hidden pt-6 border-t border-white/5 space-y-3">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block text-center">
              Quick Dev Roles
            </span>
            <div className="grid grid-cols-2 xs:grid-cols-2 gap-2">
              {developerAccounts.map((account) => (
                <button
                  type="button"
                  key={account.user + '_mob'}
                  onClick={() => handleLoginSubmit(account.user, account.pass)}
                  className="p-2.5 text-center rounded-lg bg-slate-900/50 hover:bg-slate-900 border border-white/5 transition"
                >
                  <p className="text-xs font-bold text-white">{account.role}</p>
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Login;
