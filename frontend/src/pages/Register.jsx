import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import {
  EyeIcon,
  EyeSlashIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  XCircleIcon,
  CommandLineIcon,
  ShieldCheckIcon,
  BoltIcon,
  GlobeAltIcon,
} from '@heroicons/react/24/outline';
import { ParticlesCanvas, FloatingInput, ValueProp } from '../components/AuthShared';

/* ═══════════════════════════════════════════
   PASSWORD STRENGTH METER
   ═══════════════════════════════════════════ */

const StrengthBar = ({ score }) => {
  const colors = ['', 'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-lime-500', 'bg-emerald-500'];
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
  const textColors = [
    '',
    'text-red-600 dark:text-red-400',
    'text-orange-600 dark:text-orange-400',
    'text-amber-600 dark:text-amber-400',
    'text-lime-600 dark:text-lime-400',
    'text-emerald-600 dark:text-emerald-400',
  ];

  return (
    <div className="mt-2.5 space-y-1.5">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              i <= score ? colors[score] : 'bg-surface-200 dark:bg-surface-700'
            }`}
          />
        ))}
      </div>
      <p className={`text-[11px] font-medium ${textColors[score]}`}>
        {labels[score]}
      </p>
    </div>
  );
};

/* ═══════════════════════════════════════════
   REGISTER PAGE
   ═══════════════════════════════════════════ */

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const calcStrength = (pwd) => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[a-z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return score;
  };

  const strength = calcStrength(password);
  const passwordsMatch = password === confirmPassword;
  const showMatchIcon = confirmPassword.length > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    const success = await register(email, password);
    if (success) navigate('/verify-otp', { state: { email } });
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
                <span className="text-white font-extrabold text-lg tracking-tight">MC</span>
              </div>
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-bold text-white">ManikCloud</span>
                  <span className="text-lg font-bold bg-gradient-to-r from-primary-400 to-fuchsia-400 bg-clip-text text-transparent">Cloud</span>
                </div>
                <p className="text-[11px] font-medium tracking-wider uppercase text-white/30">Dev Environments</p>
              </div>
            </div>
          </div>

          {/* Headline */}
          <h2 className="text-3xl font-bold text-white leading-tight mb-3">
            Start building in<br />
            <span className="bg-gradient-to-r from-primary-400 to-fuchsia-400 bg-clip-text text-transparent">seconds, not hours.</span>
          </h2>
          <p className="text-sm text-white/40 mb-10 leading-relaxed">
            Create your free workspace and get instant SSH access<br />
            to a fully isolated Ubuntu development environment.
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
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-10">
            <div className="inline-flex items-center justify-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 via-primary-600 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-primary-500/30">
                <span className="text-white font-extrabold text-base">MC</span>
              </div>
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-base font-bold" style={{ color: 'var(--color-text)' }}>ManikCloud</span>
                  <span className="text-base font-bold bg-gradient-to-r from-primary-500 to-fuchsia-500 bg-clip-text text-transparent">Cloud</span>
                </div>
                <p className="text-[10px] font-medium tracking-wider uppercase" style={{ color: 'var(--color-text-muted)' }}>Dev Environments</p>
              </div>
            </div>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
              Create your account
            </h1>
            <p className="text-sm mt-1.5" style={{ color: 'var(--color-text-secondary)' }}>
              Join ManikCloud and get your workspace
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <FloatingInput
                id="email"
                label="Email address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                autoFocus
              />
              <p className="mt-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                Only{' '}
                <span className="font-semibold" style={{ color: '#cf2626' }}>
                  @timesglobal.com.np
                </span>{' '}
                emails are allowed
              </p>
            </div>

            {/* Password */}
            <div className="relative">
              <FloatingInput
                id="password"
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
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

              {/* Strength meter */}
              {password && <StrengthBar score={strength} />}
            </div>

            {/* Confirm Password */}
            <div className="relative">
              <FloatingInput
                id="confirmPassword"
                label="Confirm password"
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-0.5 rounded-md transition-colors duration-150 hover:bg-surface-100 dark:hover:bg-surface-800"
                style={{ color: 'var(--color-text-muted)' }}
                tabIndex={-1}
              >
                {showConfirm
                  ? <EyeSlashIcon className="h-4 w-4" />
                  : <EyeIcon className="h-4 w-4" />
                }
              </button>

              {/* Match indicator */}
              {showMatchIcon && (
                <div className="mt-2 flex items-center gap-1.5">
                  {passwordsMatch ? (
                    <>
                      <CheckCircleIcon className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
                      <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                        Passwords match
                      </span>
                    </>
                  ) : (
                    <>
                      <XCircleIcon className="h-4 w-4 text-red-500 dark:text-red-400" />
                      <span className="text-xs font-medium text-red-600 dark:text-red-400">
                        Passwords do not match
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="relative w-full h-11 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white font-semibold text-sm shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 transition-all duration-300 ease-out disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] group overflow-hidden"
            >
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                <div className="absolute -inset-full top-0 h-full w-1/2 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-x-12 animate-shimmer" />
              </div>

              {loading ? (
                <div className="relative flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Creating account...</span>
                </div>
              ) : (
                <div className="relative flex items-center justify-center gap-2">
                  <span>Create account</span>
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
                Free account. No credit card required.
              </span>
            </div>
          </div>

          {/* Login link */}
          <p className="text-center text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-semibold inline-flex items-center gap-1 group transition-colors duration-200"
              style={{ color: '#cf2626' }}
              onMouseEnter={(e) => e.target.style.color = '#e84545'}
              onMouseLeave={(e) => e.target.style.color = '#cf2626'}
            >
              Sign in
              <ArrowRightIcon className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
