import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import {
  PlusIcon,
  PlayIcon,
  StopIcon,
  TrashIcon,
  ServerStackIcon,
  XMarkIcon,
  CpuChipIcon,
  CircleStackIcon,
  ClockIcon,
  WifiIcon,
  BoltIcon,
  ShieldCheckIcon,
  ChevronRightIcon,
  Squares2X2Icon,
  RocketLaunchIcon,
  CommandLineIcon,
  CubeTransparentIcon,
} from '@heroicons/react/24/outline';

/* ── Status Badge ───────────────────────────────── */

const StatusBadge = ({ status, size = 'sm' }) => {
  const config = {
    running: {
      dot: 'bg-emerald-500', ring: 'ring-emerald-500/30',
      label: 'Running',
      bg: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800',
    },
    stopped: {
      dot: 'bg-red-400', ring: 'ring-red-400/30',
      label: 'Stopped',
      bg: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800',
    },
    creating: {
      dot: 'bg-amber-400', ring: 'ring-amber-400/30',
      label: 'Creating',
      bg: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800',
    },
    error: {
      dot: 'bg-rose-500', ring: 'ring-rose-500/30',
      label: 'Error',
      bg: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800',
    },
    deleting: {
      dot: 'bg-surface-400', ring: 'ring-surface-400/30',
      label: 'Deleting',
      bg: 'bg-surface-100 text-surface-600 border-surface-200 dark:bg-surface-800 dark:text-surface-400 dark:border-surface-700',
    },
  };
  const c = config[status] || config.error;
  const cls = size === 'lg'
    ? 'px-3 py-1.5 text-sm gap-2 rounded-xl'
    : 'px-2.5 py-1 text-xs gap-1.5 rounded-full';

  return (
    <span className={`inline-flex items-center font-semibold border transition-all ${c.bg} ${cls}`}>
      <span className="relative flex h-2 w-2">
        <span className={`absolute inset-0 rounded-full ${c.dot} animate-ping opacity-75`} />
        <span className={`relative inline-flex rounded-full h-2 w-2 ring-2 ${c.ring} ${c.dot}`} />
      </span>
      {c.label}
    </span>
  );
};

/* ── Copy Utility ───────────────────────────────── */

const copyToClipboard = async (text, msg) => {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(msg);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); toast.success(msg); }
    catch { toast.error('Failed to copy'); }
    finally { document.body.removeChild(ta); }
  }
};

/* ── Animated Counter ────────────────────────────── */

const AnimatedNumber = ({ value }) => {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (value === display) return;
    const duration = 600;
    const start = performance.now();
    const from = display;
    const animate = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from + (value - from) * eased));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [value]);
  return <span className="tabular-nums">{display}</span>;
};

/* ── Create Workspace Modal ─────────────────────── */

const CreateWorkspaceModal = ({ open, onClose, onCreate, creating }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 backdrop-blur-sm" style={{ backgroundColor: 'var(--color-overlay)' }} onClick={onClose} />
      <div
        className="relative rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-scale-in"
        style={{ backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}
      >
        {/* Animated gradient header */}
        <div className="h-1.5 bg-gradient-to-r from-primary-600 via-fuchsia-500 to-primary-400 bg-[length:200%_100%] animate-shimmer" />

        <div className="p-6">
          {/* Close button */}
          <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors" style={{ color: 'var(--color-text-muted)' }}>
            <XMarkIcon className="h-5 w-5" />
          </button>

          {/* Icon */}
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 via-primary-600 to-fuchsia-600 flex items-center justify-center shadow-xl shadow-primary-500/30 mb-4 mx-auto transform -rotate-3 hover:rotate-0 transition-transform duration-500">
            <RocketLaunchIcon className="h-7 w-7 text-white" />
          </div>

          <h2 className="text-xl font-bold text-center" style={{ color: 'var(--color-text)' }}>Launch Workspace</h2>
          <p className="text-sm text-center mt-1" style={{ color: 'var(--color-text-secondary)' }}>A fresh dev environment, ready in seconds</p>

          {/* Resource card */}
          <div className="mt-6 p-4 rounded-2xl backdrop-blur" style={{ backgroundColor: 'var(--color-bg-muted)', border: '1px solid var(--color-border)' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                <CubeTransparentIcon className="h-3.5 w-3.5 inline mr-1" />
                Resources
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
                Default
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: CpuChipIcon, label: 'CPU', value: '1 vCPU' },
                { icon: () => <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="4" width="16" height="16" rx="2" /></svg>, label: 'RAM', value: '512 MB' },
                { icon: CircleStackIcon, label: 'Disk', value: '10 GB' },
              ].map((item, i) => (
                <div key={i} className="text-center">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center mx-auto mb-1" style={{ backgroundColor: 'rgba(207,38,38,0.08)' }}>
                    <item.icon className="h-3.5 w-3.5 text-primary-500 dark:text-primary-400" />
                  </div>
                  <p className="text-[11px] font-semibold" style={{ color: 'var(--color-text)' }}>{item.value}</p>
                  <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{item.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Notice */}
          <div className="mt-4 p-3 rounded-2xl flex items-start gap-2.5 text-xs" style={{ backgroundColor: 'rgba(207,38,38,0.05)', border: '1px solid rgba(207,38,38,0.12)' }}>
            <ShieldCheckIcon className="h-4 w-4 mt-0.5 flex-shrink-0 text-primary-500" />
            <span style={{ color: 'var(--color-text-secondary)' }}>
              A temporary password is auto-generated. You'll be prompted to change it on first SSH login.
            </span>
          </div>

          {/* Actions */}
          <div className="mt-6 flex gap-3">
            <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button onClick={onCreate} disabled={creating} className="btn-primary flex-1 group">
              {creating ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Launching...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <RocketLaunchIcon className="h-4 w-4 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
                  <span>Launch</span>
                </div>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── Stat Card ──────────────────────────────────── */

const StatCard = ({ label, value, icon: Icon, color, bg, accent, index }) => (
  <div
    className="relative group cursor-default animate-fade-in-up overflow-hidden rounded-2xl"
    style={{ animationDelay: `${index * 80}ms`, animationFillMode: 'both' }}
  >
    {/* Hover glow */}
    <div className={`absolute -inset-1 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl ${accent}`} />

    <div className="relative p-4 rounded-2xl backdrop-blur" style={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}>
      <div className="flex items-center gap-3">
        <div className={`w-12 h-12 rounded-xl ${bg} flex items-center justify-center ring-1 ring-black/5 dark:ring-white/10 group-hover:scale-110 transition-transform duration-300`}>
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
        <div>
          <p className="text-2xl font-bold tabular-nums" style={{ color: 'var(--color-text)' }}>
            <AnimatedNumber value={value} />
          </p>
          <p className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>{label}</p>
        </div>
      </div>
    </div>
  </div>
);

/* ── Workspace Card ─────────────────────────────── */

const timeAgo = (date) => {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const statusAccents = {
  running: 'from-emerald-500/20 via-transparent to-transparent',
  creating: 'from-amber-500/20 via-transparent to-transparent',
  error: 'from-rose-500/20 via-transparent to-transparent',
  stopped: 'from-surface-500/10 via-transparent to-transparent',
};

const WorkspaceCard = ({ ws, onAction, index }) => (
  <div
    className="relative group animate-fade-in-up"
    style={{ animationDelay: `${index * 60}ms`, animationFillMode: 'both' }}
  >
    {/* Status accent bar */}
    <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl transition-all duration-300 group-hover:w-1.5 ${
      ws.status === 'running' ? 'bg-emerald-500' :
      ws.status === 'creating' ? 'bg-amber-400' :
      ws.status === 'error' ? 'bg-rose-500' : 'bg-surface-300 dark:bg-surface-600'
    }`} />

    <div
      className="relative ml-1.5 p-5 rounded-2xl transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 overflow-hidden"
      style={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}
    >
      {/* Hover glow */}
      <div className={`absolute -top-20 -right-20 w-40 h-40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-3xl pointer-events-none ${
        statusAccents[ws.status] || statusAccents.stopped
      }`} />

      <div className="relative">
        {/* Top */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg ${
              ws.status === 'running' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400 shadow-emerald-500/20' :
              ws.status === 'creating' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400 shadow-amber-500/20' :
              ws.status === 'error' ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400 shadow-rose-500/20' :
              'bg-surface-100 text-surface-500 dark:bg-surface-800 dark:text-surface-400'
            }`}>
              <ServerStackIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <Link to={`/workspace/${ws._id}`} className="hover:underline">
                <h3 className="text-sm font-bold truncate" style={{ color: 'var(--color-text)' }}>{ws.name}</h3>
              </Link>
              <p className="text-xs flex items-center gap-1 mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                <ClockIcon className="h-3 w-3" />
                {timeAgo(ws.createdAt)}
              </p>
            </div>
          </div>
          <StatusBadge status={ws.status} />
        </div>

        {/* IP + Resources */}
        <div className="space-y-3 mb-4">
          {ws.ip && (
            <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-xl" style={{ backgroundColor: 'var(--color-bg-muted)' }}>
              <WifiIcon className="h-3.5 w-3.5" style={{ color: 'var(--color-text-muted)' }} />
              <code className="font-mono text-xs font-semibold" style={{ color: 'var(--color-text)' }}>
                {ws.ip}
              </code>
              <button
                onClick={() => copyToClipboard(ws.ip, 'IP copied!')}
                className="ml-auto p-1 rounded-md opacity-0 group-hover:opacity-100 transition-all hover:bg-surface-100 dark:hover:bg-surface-800"
                style={{ color: 'var(--color-text-muted)' }}
                title="Copy IP"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              </button>
            </div>
          )}

          {/* Resource chips */}
          <div className="flex gap-2 flex-wrap">
            {[
              { icon: CpuChipIcon, text: `${ws.resources.cpu} vCPU`, color: 'text-primary-600 dark:text-primary-400', bg: 'rgba(207,38,38,0.08)' },
              { icon: () => <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="4" width="16" height="16" rx="2" /></svg>, text: `${ws.resources.memory} MB`, color: 'text-emerald-600 dark:text-emerald-400', bg: 'rgba(16,185,129,0.08)' },
              { icon: CircleStackIcon, text: `${ws.resources.disk} GB`, color: 'text-violet-600 dark:text-violet-400', bg: 'rgba(139,92,246,0.08)' },
            ].map((chip, i) => (
              <span key={i} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold" style={{ backgroundColor: chip.bg, color: chip.color }}>
                <chip.icon className="h-3 w-3" />
                {chip.text}
              </span>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid var(--color-border)' }}>
          <div className="flex gap-1">
            {ws.status === 'stopped' && (
              <button onClick={() => onAction(ws._id, 'start')}
                className="p-2 rounded-xl text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-all hover:scale-110 active:scale-95"
                title="Start">
                <PlayIcon className="h-4 w-4" />
              </button>
            )}
            {ws.status === 'running' && (
              <button onClick={() => onAction(ws._id, 'stop')}
                className="p-2 rounded-xl text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-all hover:scale-110 active:scale-95"
                title="Stop">
                <StopIcon className="h-4 w-4" />
              </button>
            )}
            <button onClick={() => onAction(ws._id, 'delete')}
              className="p-2 rounded-xl text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all hover:scale-110 active:scale-95"
              title="Delete">
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
          <Link to={`/workspace/${ws._id}`}
            className="inline-flex items-center gap-1 text-xs font-semibold transition-all hover:gap-1.5 px-3 py-1.5 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-800"
            style={{ color: 'var(--color-text-secondary)' }}>
            Manage
            <ChevronRightIcon className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  </div>
);

/* ── Main Dashboard ──────────────────────────────── */

const Dashboard = () => {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const pollingRef = useRef(null);

  const anyCreating = (list) => list.some((ws) => ws.status === 'creating');

  const fetchWorkspaces = useCallback(async (isPoll) => {
    try {
      const { data } = await axios.get('/api/workspaces');
      setWorkspaces(data.workspaces);
    } catch {
      if (!isPoll) toast.error('Failed to fetch workspaces');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkspaces();
    pollingRef.current = setInterval(() => fetchWorkspaces(true), 30000);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [fetchWorkspaces]);

  useEffect(() => {
    if (anyCreating(workspaces)) {
      const fast = setInterval(() => fetchWorkspaces(true), 5000);
      return () => clearInterval(fast);
    }
  }, [workspaces, fetchWorkspaces]);

  const createWorkspace = async () => {
    setCreating(true);
    try {
      await axios.post('/api/workspaces', { name: `ws-${Date.now().toString(36)}`, description: '' });
      toast.success('Workspace launched!');
      setShowCreateModal(false);
      fetchWorkspaces();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to create workspace');
    } finally { setCreating(false); }
  };

  const handleAction = async (id, action) => {
    const map = {
      start: { fn: () => axios.post(`/api/workspaces/${id}/start`), msg: 'Workspace started' },
      stop: { fn: () => axios.post(`/api/workspaces/${id}/stop`), msg: 'Workspace stopped' },
      delete: {
        fn: () => axios.delete(`/api/workspaces/${id}`),
        msg: 'Workspace deleted',
        confirm: true,
      },
    };
    const a = map[action];
    if (a.confirm && !confirm('Delete this workspace? This cannot be undone.')) return;
    try { await a.fn(); toast.success(a.msg); fetchWorkspaces(); }
    catch { toast.error(`Failed to ${action}`); }
  };

  const name = user?.email?.split('@')[0]?.split('.')[0] || 'there';
  const has = workspaces.length > 0;
  const stats = [
    { label: 'Total', value: workspaces.length, icon: Squares2X2Icon, color: 'text-primary-600 dark:text-primary-400', bg: 'bg-primary-50 dark:bg-primary-950/40', accent: 'bg-primary-500/10' },
    { label: 'Running', value: workspaces.filter(w => w.status === 'running').length, icon: PlayIcon, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/40', accent: 'bg-emerald-500/10' },
    { label: 'Stopped', value: workspaces.filter(w => w.status === 'stopped').length, icon: StopIcon, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-950/40', accent: 'bg-rose-500/10' },
    { label: 'Failed', value: workspaces.filter(w => w.status === 'error').length, icon: XMarkIcon, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/40', accent: 'bg-amber-500/10' },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-44 skeleton rounded-3xl" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-24 skeleton rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => <div key={i} className="h-52 skeleton rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* ──────────────────────────────────────────────── */}
      {/* HERO */}
      {/* ──────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl p-8 sm:p-10" style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}>
        {/* Animated mesh gradient */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute -top-1/2 -left-1/2 w-full h-full rounded-full bg-gradient-to-br from-primary-500/30 via-fuchsia-500/20 to-transparent blur-3xl animate-pulse-soft" />
          <div className="absolute -bottom-1/2 -right-1/2 w-full h-full rounded-full bg-gradient-to-tl from-primary-600/20 via-transparent to-fuchsia-500/10 blur-3xl animate-pulse-soft" style={{ animationDelay: '2s' }} />
        </div>

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
          backgroundSize: '24px 24px',
        }} />

        <div className="relative">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              {/* Status tag */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider mb-4" style={{
                backgroundColor: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.6)',
              }}>
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
                </span>
                {anyCreating(workspaces) ? 'Provisioning' : 'All Systems Go'}
              </div>

              <h1 className="text-3xl sm:text-4xl font-bold text-white">
                Hey, {name}
              </h1>
              <p className="text-sm mt-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                {has ? 'Manage your development environments' : 'Launch your first environment'}
              </p>
            </div>

            <button onClick={() => setShowCreateModal(true)} className="relative group">
              {/* Button glow */}
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-primary-500 via-fuchsia-500 to-primary-500 opacity-60 group-hover:opacity-100 blur-lg transition-opacity duration-500 animate-pulse-soft" />
              <div className="relative px-6 py-3 rounded-2xl bg-white text-surface-900 font-bold text-sm flex items-center gap-2 transition-transform duration-200 group-hover:scale-[1.02] active:scale-[0.98] shadow-2xl">
                <RocketLaunchIcon className="h-5 w-5" />
                New Workspace
              </div>
</button>
          </div>

          {/* Quick stats row */}
          <div className="mt-6 flex items-center gap-6 text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
            <span className="flex items-center gap-2">
              <CommandLineIcon className="h-4 w-4" />
              SSH access with sudo
            </span>
            <span className="w-1 h-1 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }} />
            <span className="flex items-center gap-2">
              <CubeTransparentIcon className="h-4 w-4" />
              Ubuntu 24.04
            </span>
            <span className="w-1 h-1 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }} />
            <span className="flex items-center gap-2">
              <BoltIcon className="h-4 w-4" />
              Auto-expires password
            </span>
          </div>
        </div>
      </div>

      {/* ──────────────────────────────────────────────── */}
      {/* STATS */}
      {/* ──────────────────────────────────────────────── */}
      {has && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {stats.map((s, i) => <StatCard key={s.label} {...s} index={i} />)}
        </div>
      )}

      {/* ──────────────────────────────────────────────── */}
      {/* WORKSPACE LIST / EMPTY */}
      {/* ──────────────────────────────────────────────── */}
      {!has ? (
        <div className="relative overflow-hidden rounded-3xl py-24 px-8 text-center animate-fade-in-up group" style={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}>
          {/* Decorative elements */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-gradient-to-b from-primary-500/5 to-transparent blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full bg-gradient-to-t from-fuchsia-500/5 to-transparent blur-3xl pointer-events-none" />

          <div className="relative">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary-500 via-primary-600 to-fuchsia-600 flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-primary-500/25 transform -rotate-6 group-hover:rotate-0 transition-transform duration-700">
              <RocketLaunchIcon className="h-12 w-12 text-white" />
            </div>
            <h3 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>No environments yet</h3>
            <p className="text-sm mt-2 max-w-md mx-auto" style={{ color: 'var(--color-text-secondary)' }}>
              Launch your first development environment. You'll get SSH access with full sudo privileges inside a fresh Ubuntu 24.04 container.
            </p>
            <button onClick={() => setShowCreateModal(true)} className="btn-primary mt-8 shadow-lg shadow-primary-500/25">
              <RocketLaunchIcon className="h-5 w-5 mr-2" />
              Launch Your First Workspace
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>Environments</h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                {workspaces.length} {workspaces.length === 1 ? 'environment' : 'environments'}
              </p>
            </div>
            <button onClick={() => setShowCreateModal(true)} className="btn-primary shadow-lg shadow-primary-500/25 hidden sm:flex">
              <PlusIcon className="h-4 w-4 mr-1.5" />
              New Environment
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {workspaces.map((ws, i) => (
              <WorkspaceCard key={ws._id} ws={ws} onAction={handleAction} index={i} />
            ))}
          </div>
        </>
      )}

      {/* ── Create Modal ── */}
      <CreateWorkspaceModal open={showCreateModal} onClose={() => setShowCreateModal(false)} onCreate={createWorkspace} creating={creating} />

      {/* ── FAB ── */}
      {has && (
        <button onClick={() => setShowCreateModal(true)}
          className="lg:hidden fixed bottom-6 right-6 z-40 w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-600 via-primary-500 to-fuchsia-600 text-white shadow-2xl shadow-primary-500/50 hover:shadow-primary-500/70 hover:scale-110 active:scale-95 transition-all duration-300 flex items-center justify-center">
          <PlusIcon className="h-7 w-7" />
        </button>
      )}
    </div>
  );
};

export default Dashboard;
