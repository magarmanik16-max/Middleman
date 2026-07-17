import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  EyeIcon,
  EyeSlashIcon,
  ArrowRightIcon,
  CommandLineIcon,
  ShieldCheckIcon,
  BoltIcon,
  GlobeAltIcon,
} from '@heroicons/react/24/outline';
import { ParticlesCanvas, FloatingInput, ValueProp } from '../components/AuthShared';

/* ═══════════════════════════════════════════
   MAIN LOGIN PAGE
   ═══════════════════════════════════════════ */

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const success = await login(email, password);
    if (success) navigate('/');
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen">
      {/* ══════════════════════════════════════
          LEFT — BRAND PANEL (hidden on mobile)
          ══════════════════════════════════════ */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[40%] relative overflow-hidden bg-gradient-to-br from-[#0a0c10] via-[#160808] to-[#0f172a] items-center justify-center p-12">
        <ParticlesCanvas />

        {/* Gradient overlays */}
        <div className="absolute top-1/4 -left-32 w-80 h-80 rounded-full bg-primary-500/10 blur-[120px]" />
        <div className="absolute bottom-1/4 -right-16 w-64 h-64 rounded-full bg-fuchsia-500/8 blur-[100px]" />

        {/* Content */}
        <div className="relative z-10 w-full max-w-sm">
          {/* Logo */}
          <div className="mb-12">
            <div className="inline-flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary-500 via-primary-600 to-fuchsia-600 flex items-center justify-center shadow-xl shadow-primary-500/30">
                <span className="text-white font-extrabold text-lg tracking-tight">TG</span>
              </div>
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-bold text-white">TimesGlobal</span>
                  <span className="text-lg font-bold bg-gradient-to-r from-primary-400 to-fuchsia-400 bg-clip-text text-transparent">Cloud</span>
                </div>
                <p className="text-[11px] font-medium tracking-wider uppercase text-white/30">Dev Environments</p>
              </div>
            </div>
          </div>

          {/* Headline */}
          <h2 className="text-3xl font-bold text-white leading-tight mb-3">
            Cloud dev environments,<br />
            <span className="bg-gradient-to-r from-primary-400 to-fuchsia-400 bg-clip-text text-transparent">instantly ready.</span>
          </h2>
          <p className="text-sm text-white/40 mb-10 leading-relaxed">
            Spin up isolated Ubuntu workspaces with SSH access,<br />
            full sudo, and auto-expiring credentials in seconds.
          </p>

          {/* Value props */}
          <div className="space-y-4 mb-10">
            <ValueProp icon={CommandLineIcon} text="Full SSH access with sudo privileges" />
            <ValueProp icon={BoltIcon} text="Provisioned in under 30 seconds" />
            <ValueProp icon={ShieldCheckIcon} text="Auto-expiring temp passwords" />
            <ValueProp icon={GlobeAltIcon} text="Accessible from anywhere, any device" />
          </div>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mb-6" />

          {/* Stat */}
          <div className="flex items-center gap-6">
            <div>
              <p className="text-2xl font-bold text-white">100+</p>
              <p className="text-xs text-white/30">Workspaces created</p>
            </div>
            <div className="w-px h-10 bg-white/10" />
            <div>
              <p className="text-2xl font-bold text-white">99.9%</p>
              <p className="text-xs text-white/30">Uptime SLA</p>
            </div>
            <div className="w-px h-10 bg-white/10" />
            <div>
              <p className="text-2xl font-bold text-white">24/7</p>
              <p className="text-xs text-white/30">Support</p>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════
          RIGHT — FORM PANEL
          ══════════════════════════════════════ */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10" style={{ backgroundColor: 'var(--color-bg)' }}>
        <div className="w-full max-w-sm animate-fade-in">
          {/* Mobile logo (visible on small screens) */}
          <div className="lg:hidden text-center mb-10">
            <div className="inline-flex items-center justify-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 via-primary-600 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-primary-500/30">
                <span className="text-white font-extrabold text-base">TG</span>
              </div>
              <div className="text-left">
                <div className="flex items-baseline gap-1">
                  <span className="text-base font-bold" style={{ color: 'var(--color-text)' }}>TimesGlobal</span>
                  <span className="text-base font-bold bg-gradient-to-r from-primary-500 to-fuchsia-500 bg-clip-text text-transparent">Cloud</span>
                </div>
                <p className="text-[10px] font-medium tracking-wider uppercase" style={{ color: 'var(--color-text-muted)' }}>Dev Environments</p>
              </div>
            </div>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
              Welcome back
            </h1>
            <p className="text-sm mt-1.5" style={{ color: 'var(--color-text-secondary)' }}>
              Sign in to your account to continue
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <FloatingInput
              id="email"
              label="Email address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              autoFocus
            />

            {/* Password */}
            <div className="relative">
              <FloatingInput
                id="password"
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-0.5 rounded-md transition-colors duration-150 hover:bg-surface-100 dark:hover:bg-surface-800"
                style={{ color: 'var(--color-text-muted)' }}
                tabIndex={-1}
              >
                {showPassword
                  ? <EyeSlashIcon className="h-4 w-4" />
                  : <EyeIcon className="h-4 w-4" />
                }
              </button>
            </div>

            {/* Remember me + Forgot */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className="relative flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="sr-only"
                  />
                  <div
                    className={`
                      w-[18px] h-[18px] rounded-md border-2 flex items-center justify-center
                      transition-all duration-200
                      ${rememberMe
                        ? 'bg-primary-600 border-primary-600'
                        : 'border-surface-300 dark:border-surface-600 group-hover:border-primary-400'
                      }
                    `}
                  >
                    {rememberMe && (
                      <svg className="h-[10px] w-[10px] text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                </div>
                <span className="text-sm select-none" style={{ color: 'var(--color-text-secondary)' }}>
                  Remember me
                </span>
              </label>

              <button
                type="button"
                className="text-sm font-medium transition-colors duration-200 hover:text-primary-600 dark:hover:text-primary-400"
                style={{ color: 'var(--color-text-muted)' }}
              >
                Forgot password?
              </button>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="relative w-full h-11 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white font-semibold text-sm shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 transition-all duration-300 ease-out disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] group overflow-hidden"
            >
              {/* Shimmer */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                <div className="absolute -inset-full top-0 h-full w-1/2 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-x-12 animate-shimmer" />
              </div>

              {loading ? (
                <div className="relative flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Signing in...</span>
                </div>
              ) : (
                <div className="relative flex items-center justify-center gap-2">
                  <span>Sign in</span>
                  <ArrowRightIcon className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
                </div>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t" style={{ borderColor: 'var(--color-border)' }} />
            </div>
            <div className="relative flex justify-center">
              <span className="px-3 text-xs" style={{
                backgroundColor: 'var(--color-bg)',
                color: 'var(--color-text-muted)',
              }}>
                Protected by industry-standard encryption
              </span>
            </div>
          </div>

          {/* Register link */}
          <p className="text-center text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Don't have an account?{' '}
            <Link
              to="/register"
              className="font-semibold inline-flex items-center gap-1 group transition-colors duration-200"
              style={{ color: '#cf2626' }}
              onMouseEnter={(e) => e.target.style.color = '#e84545'}
              onMouseLeave={(e) => e.target.style.color = '#cf2626'}
            >
              Create one
              <ArrowRightIcon className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
