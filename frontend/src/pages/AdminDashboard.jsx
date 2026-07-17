import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  UsersIcon,
  ServerStackIcon,
  ChartBarIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

const statusStyles = {
  running: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800',
  stopped: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800',
  creating: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800',
  error: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800',
  deleting: 'bg-surface-100 text-surface-600 border-surface-200 dark:bg-surface-800 dark:text-surface-400 dark:border-surface-700',
};

const AdminDashboard = () => {
  const [metrics, setMetrics] = useState(null);
  const [users, setUsers] = useState([]);
  const [workspaces, setWorkspaces] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [search, setSearch] = useState('');
  const [confirmModal, setConfirmModal] = useState(null);

  useEffect(() => { fetchAllData(); }, []);

  const fetchAllData = async () => {
    try {
      const [metricsRes, usersRes, workspacesRes, logsRes] = await Promise.all([
        axios.get('/api/admin/metrics'),
        axios.get('/api/admin/users'),
        axios.get('/api/admin/workspaces'),
        axios.get('/api/admin/activity-logs'),
      ]);
      setMetrics(metricsRes.data.metrics);
      setUsers(usersRes.data.users);
      setWorkspaces(workspacesRes.data.workspaces);
      setActivityLogs(logsRes.data.logs);
    } catch { toast.error('Failed to fetch admin data'); }
    finally { setLoading(false); }
  };

  const updateUser = async (userId, updates) => {
    try {
      await axios.put(`/api/admin/users/${userId}`, updates);
      toast.success('User updated');
      fetchAllData();
    } catch { toast.error('Failed to update user'); }
  };

  const deleteUser = async (userId) => {
    try {
      await axios.delete(`/api/admin/users/${userId}`);
      toast.success('User deleted');
      setConfirmModal(null);
      fetchAllData();
    } catch { toast.error('Failed to delete user'); }
  };

  const deleteWorkspace = async (workspaceId) => {
    try {
      await axios.delete(`/api/admin/workspaces/${workspaceId}`);
      toast.success('Workspace deleted');
      setConfirmModal(null);
      fetchAllData();
    } catch { toast.error('Failed to delete workspace'); }
  };

  const formatDate = (d) => new Date(d).toLocaleString();

  const filteredUsers = users.filter(u => u.email.toLowerCase().includes(search.toLowerCase()));
  const filteredWorkspaces = workspaces.filter(w =>
    w.name?.toLowerCase().includes(search.toLowerCase()) ||
    w.userId?.email?.toLowerCase().includes(search.toLowerCase())
  );
  const filteredLogs = activityLogs.filter(l =>
    l.userId?.email?.toLowerCase().includes(search.toLowerCase()) ||
    l.action?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex gap-4">{[1,2,3,4].map(i => <div key={i} className="h-24 flex-1 skeleton rounded-2xl" />)}</div>
        <div className="h-96 skeleton rounded-2xl" />
      </div>
    );
  }

  const stats = [
    { label: 'Total Users', value: metrics?.totalUsers || 0, icon: UsersIcon, color: 'text-primary-600 dark:text-primary-400', bg: 'bg-primary-50 dark:bg-primary-950/40' },
    { label: 'Active (30d)', value: metrics?.activeUsers || 0, icon: ChartBarIcon, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/40' },
    { label: 'Workspaces', value: metrics?.totalWorkspaces || 0, icon: ServerStackIcon, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-950/40' },
    { label: 'Running', value: metrics?.runningWorkspaces || 0, icon: ClockIcon, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/40' },
  ];

  const tabs = [
    { key: 'overview', label: 'Overview', count: null },
    { key: 'users', label: 'Users', count: users.length },
    { key: 'workspaces', label: 'Workspaces', count: workspaces.length },
    { key: 'activity', label: 'Activity', count: activityLogs.length },
  ];

  const renderSearch = () => (
    <div className="relative max-w-sm">
      <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--color-text-muted)' }} />
      <input
        type="text"
        placeholder={`Search ${activeTab}...`}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="input pl-10 text-sm"
      />
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <div key={s.label} className={`glass-card p-4 animate-fade-in-up animate-in-delay-${i}`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}>
                <s.icon className={`h-5 w-5 ${s.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>{s.value}</p>
                <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{s.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex gap-1 p-1 rounded-xl" style={{ backgroundColor: 'var(--color-bg-muted)' }}>
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => { setActiveTab(t.key); setSearch(''); }}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                activeTab === t.key
                  ? 'shadow-sm dark:bg-surface-800 dark:text-surface-100'
                  : 'hover:text-surface-700 dark:hover:text-surface-300'
              }`}
              style={{
                backgroundColor: activeTab === t.key ? 'var(--color-bg-elevated)' : 'transparent',
                color: activeTab === t.key ? 'var(--color-text)' : 'var(--color-text-secondary)',
              }}
            >
              {t.label}
              {t.count !== null && (
                <span className={`ml-2 px-1.5 py-0.5 text-xs rounded-full ${
                  activeTab === t.key
                    ? 'bg-primary-50 text-primary-600 dark:bg-primary-950/50 dark:text-primary-400'
                    : 'dark:bg-surface-700 dark:text-surface-400'
                }`} style={{
                  backgroundColor: activeTab === t.key ? '' : 'var(--color-bg-muted)',
                  color: activeTab === t.key ? '' : 'var(--color-text-muted)',
                }}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
        {(activeTab !== 'overview') && renderSearch()}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-card p-6">
            <h3 className="section-title mb-4">Recent Users</h3>
            <div className="space-y-3">
              {users.slice(0, 5).map((u) => (
                <div key={u._id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
                      <span className="text-white font-medium text-xs">{u.email.charAt(0).toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{u.email}</p>
                      <p className="text-xs capitalize" style={{ color: 'var(--color-text-secondary)' }}>{u.role}</p>
                    </div>
                  </div>
                  <span className={`badge ${u.isVerified ? 'badge-running' : 'badge-creating'}`}>
                    {u.isVerified ? 'Verified' : 'Pending'}
                  </span>
                </div>
              ))}
              {users.length === 0 && <p className="text-sm text-center py-4" style={{ color: 'var(--color-text-secondary)' }}>No users yet</p>}
            </div>
          </div>

          <div className="glass-card p-6">
            <h3 className="section-title mb-4">Recent Workspaces</h3>
            <div className="space-y-3">
              {workspaces.slice(0, 5).map((w) => (
                <div key={w._id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{w.name}</p>
                    <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{w.userId?.email}</p>
                  </div>
                  <span className={`badge ${statusStyles[w.status] || 'badge-stopped'}`}>{w.status}</span>
                </div>
              ))}
              {workspaces.length === 0 && <p className="text-sm text-center py-4" style={{ color: 'var(--color-text-secondary)' }}>No workspaces yet</p>}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                  {['User', 'Role', 'Status', 'Created', 'Actions'].map((h) => (
                    <th key={h} className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)', backgroundColor: 'var(--color-bg-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                {filteredUsers.map((u) => (
                  <tr key={u._id} className="hover:bg-surface-50 dark:hover:bg-surface-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
                          <span className="text-white font-medium text-xs">{u.email.charAt(0).toUpperCase()}</span>
                        </div>
                        <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{u.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={u.role}
                        onChange={(e) => updateUser(u._id, { role: e.target.value })}
                        className="text-sm rounded-lg px-2.5 py-1.5 transition-all duration-200"
                        style={{
                          backgroundColor: 'var(--color-input-bg)',
                          color: 'var(--color-text)',
                          borderColor: 'var(--color-border)',
                          border: '1px solid var(--color-border)',
                        }}
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`badge ${u.isVerified ? 'badge-running' : 'badge-creating'}`}>
                        {u.isVerified ? 'Verified' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm" style={{ color: 'var(--color-text-secondary)' }}>{formatDate(u.createdAt)}</td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => setConfirmModal({ type: 'user', id: u._id, label: u.email })}
                        className="text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/50 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr><td colSpan={5} className="text-center py-8 text-sm" style={{ color: 'var(--color-text-secondary)' }}>No users found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'workspaces' && (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                  {['Name', 'Owner', 'Status', 'Resources', 'IP', 'Created', 'Actions'].map((h) => (
                    <th key={h} className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)', backgroundColor: 'var(--color-bg-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                {filteredWorkspaces.map((w) => (
                  <tr key={w._id} className="hover:bg-surface-50 dark:hover:bg-surface-800/30 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium" style={{ color: 'var(--color-text)' }}>{w.name}</td>
                    <td className="px-6 py-4 text-sm" style={{ color: 'var(--color-text-secondary)' }}>{w.userId?.email}</td>
                    <td className="px-6 py-4"><span className={`badge ${statusStyles[w.status] || 'badge-stopped'}`}>{w.status}</span></td>
                    <td className="px-6 py-4 text-sm" style={{ color: 'var(--color-text-secondary)' }}>{w.resources.cpu}vCPU / {w.resources.memory}MB / {w.resources.disk}GB</td>
                    <td className="px-6 py-4"><code className="text-sm font-mono text-primary-600 dark:text-primary-400">{w.ip || '—'}</code></td>
                    <td className="px-6 py-4 text-sm" style={{ color: 'var(--color-text-secondary)' }}>{formatDate(w.createdAt)}</td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => setConfirmModal({ type: 'workspace', id: w._id, label: w.name })}
                        className="text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/50 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredWorkspaces.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-8 text-sm" style={{ color: 'var(--color-text-secondary)' }}>No workspaces found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'activity' && (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                  {['User', 'Action', 'Resource', 'Timestamp'].map((h) => (
                    <th key={h} className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)', backgroundColor: 'var(--color-bg-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                {filteredLogs.map((l) => (
                  <tr key={l._id} className="hover:bg-surface-50 dark:hover:bg-surface-800/30 transition-colors">
                    <td className="px-6 py-4 text-sm" style={{ color: 'var(--color-text)' }}>{l.userId?.email}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full" style={{ backgroundColor: 'var(--color-bg-muted)', color: 'var(--color-text)' }}>
                        {l.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm capitalize" style={{ color: 'var(--color-text-secondary)' }}>{l.resource}</td>
                    <td className="px-6 py-4 text-sm" style={{ color: 'var(--color-text-secondary)' }}>{formatDate(l.timestamp)}</td>
                  </tr>
                ))}
                {filteredLogs.length === 0 && (
                  <tr><td colSpan={4} className="text-center py-8 text-sm" style={{ color: 'var(--color-text-secondary)' }}>No activity logs found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Confirm modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0" style={{ backgroundColor: 'var(--color-overlay)', backdropFilter: 'blur(4px)' }} onClick={() => setConfirmModal(null)} />
          <div className="relative rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-scale-in" style={{
            backgroundColor: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border)',
          }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(232,69,69,0.1)' }}>
                <TrashIcon className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>Confirm Delete</h3>
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  {confirmModal.type === 'user' ? 'Delete user' : 'Delete workspace'}
                </p>
              </div>
            </div>
            <p className="text-sm mb-2" style={{ color: 'var(--color-text-secondary)' }}>
              Are you sure you want to delete <span className="font-medium" style={{ color: 'var(--color-text)' }}>{confirmModal.label}</span>?
            </p>
            <p className="text-xs text-red-600 dark:text-red-400 mb-6">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmModal(null)} className="btn-secondary flex-1">Cancel</button>
              <button
                onClick={() => confirmModal.type === 'user'
                  ? deleteUser(confirmModal.id)
                  : deleteWorkspace(confirmModal.id)
                }
                className="btn-danger flex-1"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
