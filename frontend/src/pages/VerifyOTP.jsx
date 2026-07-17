import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  ArrowPathIcon,
  ShieldCheckIcon,
  CommandLineIcon,
  BoltIcon,
  GlobeAltIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  FingerPrintIcon,
} from '@heroicons/react/24/outline';
import { ParticlesCanvas, ValueProp } from '../components/AuthShared';

/* ═══════════════════════════════════════════
   OTP INPUT
   ═══════════════════════════════════════════ */

const OtpInput = ({ value, index, onChange, onKeyDown, onPaste, inputRef, autoFocus, isFilled }) => {
  const [focused, setFocused] = useState(false);
  const isActive = focused || value !== '';

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="numeric"
      maxLength={1}
      value={value}
      onChange={(e) => onChange(index, e.target.value)}
      onKeyDown={(e) => onKeyDown(index, e)}
      onPaste={index === 0 ? onPaste : undefined}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      autoFocus={autoFocus}
      className={`
        w-12 h-14 sm:w-14 sm:h-16 text-center text-lg sm:text-xl font-bold rounded-xl border-2
        transition-all duration-200 outline-none
      `}
      style={{
        backgroundColor: 'var(--color-input-bg)',
        color: 'var(--color-text)',
        borderColor: isActive || isFilled ? '#cf2626' : 'var(--color-border)',
        boxShadow: isActive || isFilled ? '0 0 0 3px rgba(207,38,38,0.08)' : 'none',
      }}
    />
  );
};

/* ═══════════════════════════════════════════
   VERIFY OTP PAGE
   ═══════════════════════════════════════════ */

const VerifyOTP = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email;
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const inputRefs = useRef([]);

  useEffect(() => {
    if (!email) navigate('/register');
  }, [email, navigate]);

  const handleChange = (index, value) => {
    if (value && !/^\d$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const newOtp = [...otp];
    for (let i = 0; i < pasted.length; i++) {
      newOtp[i] = pasted[i];
    }
    setOtp(newOtp);
    const nextIndex = Math.min(pasted.length, 5);
    inputRefs.current[nextIndex]?.focus();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length !== 6) {
      toast.error('Please enter the complete 6-digit code');
      return;
    }
    setLoading(true);
    try {
      await axios.post('/api/auth/verify-otp', { email, otp: code });
      toast.success('Email verified successfully!');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await axios.post('/api/auth/resend-otp', { email });
      toast.success('New verification code sent!');
    } catch (err) {
      toast.error('Failed to resend code');
    } finally {
      setResending(false);
    }
  };

  // Auto-submit when all 6 digits are entered
  useEffect(() => {
    if (otp.every((d) => d !== '')) {
      const timer = setTimeout(() => {
        document.getElementById('otp-form')?.requestSubmit();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [otp]);

  const allFilled = otp.every((d) => d !== '');
  const digitCount = otp.filter((d) => d !== '').length;

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
            One last step<br />
            <span className="bg-gradient-to-r from-primary-400 to-fuchsia-400 bg-clip-text text-transparent">verify your email.</span>
          </h2>
          <p className="text-sm text-white/40 mb-10 leading-relaxed">
            We've sent a 6-digit code to your inbox.<br />
            Enter it below to activate your workspace.
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
          <div className="text-center mb-8">
            {/* Icon */}
            <div className="relative inline-flex mb-5 group">
              <div className="absolute -inset-3 rounded-3xl bg-gradient-to-r from-primary-500/30 via-fuchsia-500/20 to-primary-500/30 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 animate-pulse-soft" />
              <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-600 via-primary-500 to-fuchsia-600 flex items-center justify-center transform -rotate-3 group-hover:rotate-0 transition-transform duration-500 mx-auto"
                style={{ boxShadow: '0 8px 32px rgba(207,38,38,0.25)' }}>
                <FingerPrintIcon className="h-8 w-8 text-white" />
              </div>
            </div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
              Verify your email
            </h1>
            <p className="text-sm mt-2 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
              We sent a verification code to<br />
              <span className="font-semibold" style={{ color: '#cf2626' }}>
                {email || 'your email'}
              </span>
            </p>
          </div>

          {/* Card */}
          <div className="rounded-2xl p-8" style={{
            backgroundColor: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
          }}>
            <form id="otp-form" onSubmit={handleSubmit} className="space-y-6">
              {/* OTP Inputs */}
              <div>
                <p className="text-sm font-medium text-center mb-5" style={{ color: 'var(--color-text-secondary)' }}>
                  Enter verification code
                </p>
                <div className="flex gap-2.5 sm:gap-3 justify-center" onPaste={handlePaste}>
                  {otp.map((digit, i) => (
                    <OtpInput
                      key={i}
                      value={digit}
                      index={i}
                      onChange={handleChange}
                      onKeyDown={handleKeyDown}
                      onPaste={handlePaste}
                      inputRef={(el) => (inputRefs.current[i] = el)}
                      autoFocus={i === 0}
                      isFilled={digit !== ''}
                    />
                  ))}
                </div>

                {/* Progress indicator */}
                <div className="flex items-center justify-center gap-1.5 mt-4">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div
                      key={i}
                      className={`h-1 w-6 rounded-full transition-all duration-300 ${
                        i <= digitCount ? 'bg-primary-500' : 'bg-surface-200 dark:bg-surface-700'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Verify button */}
              <button
                type="submit"
                disabled={loading || !allFilled}
                className="relative w-full h-11 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white font-semibold text-sm shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 transition-all duration-300 ease-out disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] group overflow-hidden"
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                  <div className="absolute -inset-full top-0 h-full w-1/2 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-x-12 animate-shimmer" />
                </div>

                {loading ? (
                  <div className="relative flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Verifying...</span>
                  </div>
                ) : (
                  <div className="relative flex items-center justify-center gap-2">
                    <CheckCircleIcon className="h-4 w-4" />
                    <span>Verify Email</span>
                    <ArrowRightIcon className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
                  </div>
                )}
              </button>

              {/* Resend */}
              <div className="text-center">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending}
                  className="inline-flex items-center gap-2 text-sm font-medium transition-all duration-200 hover:gap-2.5 group"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  <ArrowPathIcon className={`h-3.5 w-3.5 transition-transform duration-300 ${
                    resending ? 'animate-spin' : 'group-hover:rotate-180'
                  }`} />
                  {resending ? 'Sending...' : 'Resend verification code'}
                </button>
              </div>
            </form>
          </div>

          {/* Footer hint */}
          <p className="text-center text-xs mt-6" style={{ color: 'var(--color-text-muted)' }}>
            Didn't receive the email? Check your spam folder
          </p>
        </div>
      </div>
    </div>
  );
};

export default VerifyOTP;
