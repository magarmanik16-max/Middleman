import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { MonitoringStats } from '../components/MonitoringStats';
import { HistoricalCharts } from '../components/HistoricalCharts';
import {
  PlayIcon,
  StopIcon,
  TrashIcon,
  ArrowPathIcon,
  ArrowLeftIcon,
  DocumentDuplicateIcon,
  EyeIcon,
  EyeSlashIcon,
  ClockIcon,
  CalendarDaysIcon,
  ServerStackIcon,
  WifiIcon,
  UserCircleIcon,
  KeyIcon,
  CodeBracketIcon,
  ArrowPathRoundedSquareIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';

const StatusBadge = ({ status, large }) => {
  const config = {
    running: { dot: 'bg-emerald-500 animate-pulse-soft', label: 'Running', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800' },
    stopped: { dot: 'bg-red-400', label: 'Stopped', bg: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800' },
    creating: { dot: 'bg-amber-400 animate-pulse', label: 'Creating', bg: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800' },
    error: { dot: 'bg-red-500', label: 'Error', bg: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800' },
    deleting: { dot: 'bg-surface-400', label: 'Deleting', bg: 'bg-surface-100 text-surface-600 border-surface-200 dark:bg-surface-800 dark:text-surface-400 dark:border-surface-700' },
  };
  const c = config[status] || config.error;
  return (
    <span className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${c.bg} ${large ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-xs'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
};

// Fallback copy method using a hidden textarea (works everywhere)
const copyFallback = async (text) => {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand('copy');
    return true;
  } catch {
    return false;
  } finally {
    document.body.removeChild(textarea);
  }
};

const copyToClipboard = async (text, successMsg) => {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(successMsg);
  } catch {
    const ok = await copyFallback(text);
    if (ok) {
      toast.success(successMsg);
    } else {
      toast.error('Failed to copy — try selecting the text manually');
    }
  }
};

const WorkspaceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [workspace, setWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showResize, setShowResize] = useState(false);
  const [resizing, setResizing] = useState(false);
  const [resizeForm, setResizeForm] = useState({ cpu: 1, memory: 512, disk: 10 });
  const pollingRef = useRef(null);
  const fastPollRef = useRef(null);

  const isTerminal = (status) => ['running', 'stopped', 'error', 'deleting'].includes(status);

  const fetchWorkspace = async (isPoll = false) => {
    try {
      const { data } = await axios.get(`/api/workspaces/${id}`);
      setWorkspace(data.workspace);
      return data.workspace;
    } catch {
      if (!isPoll) {
        toast.error('Failed to fetch workspace');
        navigate('/');
      }
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Main effect: initial fetch + continuous background sync (10s for live monitoring)
  useEffect(() => {
    fetchWorkspace();
    pollingRef.current = setInterval(() => fetchWorkspace(true), 10000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (fastPollRef.current) clearInterval(fastPollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Fast poll (5s) while workspace is being created, stops when terminal
  useEffect(() => {
    if (workspace && !isTerminal(workspace.status)) {
      fastPollRef.current = setInterval(() => fetchWorkspace(true), 5000);
      return () => clearInterval(fastPollRef.current);
    }
  }, [workspace?.status]);

  const handleAction = async (fn, successMsg) => {
    try {
      await fn();
      toast.success(successMsg);
      fetchWorkspace();
    } catch {
      toast.error(`Failed to ${successMsg.toLowerCase()}`);
    }
  };

  const openResize = () => {
    setResizeForm({
      cpu: workspace.resources?.cpu || 1,
      memory: workspace.resources?.memory || 512,
      disk: workspace.resources?.disk || 10,
    });
    setShowResize(true);
  };

  const handleResize = async () => {
    setResizing(true);
    try {
      await axios.post(`/api/workspaces/${id}/resize`, resizeForm);
      toast.success('Resources updated!');
      setShowResize(false);
      fetchWorkspace();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to resize workspace');
    } finally {
      setResizing(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="h-32 skeleton rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="h-64 skeleton rounded-2xl" />
            <div className="h-48 skeleton rounded-2xl" />
          </div>
          <div className="space-y-6">
            <div className="h-52 skeleton rounded-2xl" />
            <div className="h-64 skeleton rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!workspace) return null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back + Header */}
      <div className="glass-card p-6" style={{
        background: 'linear-gradient(135deg, rgba(207,38,38,0.08) 0%, rgba(232,69,69,0.03) 50%, transparent 100%)',
      }}>
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-xl transition-all"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg flex-shrink-0" style={{ boxShadow: '0 4px 16px rgba(207,38,38,0.25)' }}>
            <ServerStackIcon className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold truncate" style={{ color: 'var(--color-text)' }}>{workspace.name}</h1>
              <StatusBadge status={workspace.status} large />
              {workspace.status === 'running' && workspace.proxmoxId && (
                <button
                  onClick={openResize}
                  className="p-1.5 rounded-lg transition-all hover:scale-110"
                  style={{ color: 'var(--color-text-muted)' }}
                  title="Scale resources"
                >
                  <Cog6ToothIcon className="h-5 w-5" />
                </button>
              )}
            </div>
            <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{workspace.description || 'No description'}</p>
          </div>
        </div>


        {workspace.status === 'error' && workspace.lastError && (
          <div className="mt-4 p-3 rounded-xl" style={{ backgroundColor: 'rgba(232,69,69,0.08)', border: '1px solid rgba(232,69,69,0.2)' }}>
            <p className="text-sm font-medium text-red-800 dark:text-red-400">Provisioning failed</p>
            <p className="text-xs text-red-600 dark:text-red-300 mt-0.5 break-words">{workspace.lastError}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Details card */}
          <div className="glass-card p-6">
            <h2 className="section-title mb-4">Workspace Details</h2>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-wider font-medium" style={{ color: 'var(--color-text-muted)' }}>Name</p>
                  <p className="text-sm font-medium mt-1" style={{ color: 'var(--color-text)' }}>{workspace.name}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider font-medium" style={{ color: 'var(--color-text-muted)' }}>IP Address</p>
                  <p className="text-sm font-mono font-medium mt-1">
                    {workspace.ip ? (
                      <span className="text-primary-600 dark:text-primary-400 px-2 py-1 rounded-lg" style={{ backgroundColor: 'rgba(207,38,38,0.08)' }}>{workspace.ip}</span>
                    ) : (
                      <span style={{ color: 'var(--color-text-muted)' }}>Not assigned</span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider font-medium" style={{ color: 'var(--color-text-muted)' }}>SSH User</p>
                  <p className="text-sm font-mono mt-1 flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                    <UserCircleIcon className="h-4 w-4" style={{ color: 'var(--color-text-muted)' }} />
                    {workspace.sshUsername || 'root'}
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-wider font-medium" style={{ color: 'var(--color-text-muted)' }}>Created</p>
                  <p className="text-sm mt-1 flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                    <CalendarDaysIcon className="h-4 w-4" style={{ color: 'var(--color-text-muted)' }} />
                    {new Date(workspace.createdAt).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric',
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider font-medium" style={{ color: 'var(--color-text-muted)' }}>Last Accessed</p>
                  <p className="text-sm mt-1 flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                    <ClockIcon className="h-4 w-4" style={{ color: 'var(--color-text-muted)' }} />
                    {workspace.lastAccessed
                      ? new Date(workspace.lastAccessed).toLocaleString()
                      : 'Never'}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider font-medium" style={{ color: 'var(--color-text-muted)' }}>Proxmox ID</p>
                  <p className="text-sm font-mono mt-1" style={{ color: 'var(--color-text)' }}>#{workspace.proxmoxId || '—'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Resources card */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="section-title">Live Monitoring</h2>
              {workspace.status === 'running' && (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
                  </span>
                  Live
                </span>
              )}
            </div>
            {workspace.status === 'running' ? (
              <MonitoringStats stats={workspace.stats} />
            ) : (
              <div className="text-center py-6">
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  Start the workspace to see live monitoring data.
                </p>
              </div>
            )}
          </div>

          {/* Historical charts - only shown when running */}
          {workspace.status === 'running' && (
            <HistoricalCharts workspaceId={id} />
          )}
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Actions card */}
          <div className="glass-card p-6">
            <h2 className="section-title mb-4">Actions</h2>
            <div className="space-y-3">
              {workspace.status === 'stopped' && (
                <button onClick={() => handleAction(() => axios.post(`/api/workspaces/${id}/start`), 'Workspace started!')} className="btn-primary w-full">
                  <PlayIcon className="h-5 w-5 mr-2" />
                  Start Workspace
                </button>
              )}
              {workspace.status === 'error' && (
                <button onClick={() => handleAction(() => axios.post(`/api/workspaces/${id}/retry`), 'Retry initiated!')} className="btn-primary w-full">
                  <ArrowPathIcon className="h-5 w-5 mr-2" />
                  Retry Provisioning
                </button>
              )}
              {workspace.status === 'running' && (
                <>
                  <button onClick={() => handleAction(() => axios.post(`/api/workspaces/${id}/stop`), 'Workspace stopped!')} className="btn-secondary w-full">
                    <StopIcon className="h-5 w-5 mr-2" />
                    Stop Workspace
                  </button>
                  <button onClick={() => handleAction(() => axios.post(`/api/workspaces/${id}/restart`), 'Workspace restarted!')} className="btn-secondary w-full">
                    <ArrowPathIcon className="h-5 w-5 mr-2" />
                    Restart Workspace
                  </button>
                </>
              )}
              <button
                onClick={() => {
                  if (!confirm('Delete this workspace? This cannot be undone.')) return;
                  handleAction(() => axios.delete(`/api/workspaces/${id}`), 'Workspace deleted!');
                }}
                className="btn-danger w-full"
              >
                <TrashIcon className="h-5 w-5 mr-2" />
                Delete Workspace
              </button>
            </div>
          </div>

          {/* Quick Connect card */}
          <div className="glass-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <CodeBracketIcon className="h-5 w-5" style={{ color: 'var(--color-text-muted)' }} />
              <h2 className="section-title">Quick Connect</h2>
            </div>
            {workspace.status === 'running' && workspace.ip ? (
              <div className="space-y-4">
                <div className="code-block text-xs">
                  <div className="flex items-center gap-2 text-emerald-400 mb-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span>SSH Command</span>
                  </div>
                  <span className="text-primary-300">$ </span>
                  <span className="text-surface-100">ssh </span>
                  <span className="text-emerald-300">{workspace.sshUsername || 'root'}</span>
                  <span className="text-surface-300">@</span>
                  <span className="text-amber-300">{workspace.ip}</span>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between p-2.5 rounded-xl" style={{ backgroundColor: 'var(--color-bg-muted)' }}>
                    <div className="flex items-center gap-2.5">
                      <UserCircleIcon className="h-4 w-4" style={{ color: 'var(--color-text-muted)' }} />
                      <span style={{ color: 'var(--color-text-secondary)' }}>User</span>
                    </div>
                    <code className="font-mono text-sm" style={{ color: 'var(--color-text)' }}>{workspace.sshUsername || 'root'}</code>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl" style={{ backgroundColor: 'var(--color-bg-muted)' }}>
                    <div className="flex items-center gap-2.5">
                      <KeyIcon className="h-4 w-4" style={{ color: 'var(--color-text-muted)' }} />
                      <div>
                        <span style={{ color: 'var(--color-text-secondary)' }}>Password</span>
                        <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                          Temporary
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="font-mono text-sm" style={{ color: 'var(--color-text)' }}>
                        {showPassword ? (workspace.sshPassword || '—') : '••••••••'}
                      </code>
                      <button onClick={() => setShowPassword(!showPassword)} className="p-1" style={{ color: 'var(--color-text-muted)' }}>
                        {showPassword ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => copyToClipboard(workspace.sshPassword || '', 'Password copied!')}
                        className="p-1" style={{ color: 'var(--color-text-muted)' }}
                      >
                        <DocumentDuplicateIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl" style={{ backgroundColor: 'var(--color-bg-muted)' }}>
                    <div className="flex items-center gap-2.5">
                      <WifiIcon className="h-4 w-4" style={{ color: 'var(--color-text-muted)' }} />
                      <span style={{ color: 'var(--color-text-secondary)' }}>IP</span>
                    </div>
                    <code className="font-mono text-sm text-primary-600 dark:text-primary-400">{workspace.ip}</code>
                  </div>
                </div>

                <button
                  onClick={() => {
                    const user = workspace.sshUsername || 'root';
                    copyToClipboard(`ssh ${user}@${workspace.ip}`, 'SSH command copied!');
                  }}
                  className="btn-secondary w-full"
                >
                  <DocumentDuplicateIcon className="h-4 w-4 mr-2" />
                  Copy SSH Command
                </button>
              </div>
            ) : (
              <div className="text-center py-6">
                {workspace.status === 'creating' ? (
                  <>
                    <ArrowPathRoundedSquareIcon className="h-8 w-8 text-amber-400 mx-auto mb-2 animate-spin-slow" />
                    <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>Provisioning in progress</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                      Auto-refreshing — IP will appear when ready
                    </p>
                  </>
                ) : (
                  <>
                    <CodeBracketIcon className="h-8 w-8 mx-auto mb-2" style={{ color: 'var(--color-text-muted)' }} />
                    <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                      Start the workspace to get connection details.
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Resize Modal */}
      {showResize && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => !resizing && setShowResize(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-5"
            style={{ backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h3 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>Scale Resources</h3>
              <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                Adjust CPU, memory, or disk. The container will restart.
              </p>
            </div>

            {/* CPU */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>CPU Cores</label>
                <span className="text-sm font-mono font-bold" style={{ color: 'var(--color-text)' }}>{resizeForm.cpu}</span>
              </div>
              <input
                type="range" min={1} max={8} step={1}
                value={resizeForm.cpu}
                onChange={(e) => setResizeForm({ ...resizeForm, cpu: parseInt(e.target.value) })}
                className="w-full accent-primary-500"
              />
              <div className="flex justify-between text-[10px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                <span>1</span><span>8</span>
              </div>
            </div>

            {/* Memory */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Memory</label>
                <span className="text-sm font-mono font-bold" style={{ color: 'var(--color-text)' }}>{resizeForm.memory} MB</span>
              </div>
              <input
                type="range" min={256} max={16384} step={256}
                value={resizeForm.memory}
                onChange={(e) => setResizeForm({ ...resizeForm, memory: parseInt(e.target.value) })}
                className="w-full accent-primary-500"
              />
              <div className="flex justify-between text-[10px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                <span>256 MB</span><span>16 GB</span>
              </div>
            </div>

            {/* Disk */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Disk</label>
                <span className="text-sm font-mono font-bold" style={{ color: 'var(--color-text)' }}>{resizeForm.disk} GB</span>
              </div>
              <input
                type="range" min={5} max={200} step={5}
                value={resizeForm.disk}
                onChange={(e) => setResizeForm({ ...resizeForm, disk: parseInt(e.target.value) })}
                className="w-full accent-primary-500"
              />
              <div className="flex justify-between text-[10px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                <span>5 GB</span><span>200 GB</span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowResize(false)}
                disabled={resizing}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleResize}
                disabled={resizing}
                className="btn-primary flex-1"
              >
                {resizing ? (
                  <span className="flex items-center justify-center gap-2">
                    <ArrowPathIcon className="h-4 w-4 animate-spin" />
                    Resizing...
                  </span>
                ) : 'Apply'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkspaceDetail;
