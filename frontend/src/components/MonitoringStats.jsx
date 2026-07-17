import React, { useState, useEffect, useRef } from 'react';
import {
  CpuChipIcon,
  CircleStackIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  ClockIcon,
  ServerStackIcon,
} from '@heroicons/react/24/outline';

const formatBytes = (bytes) => {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 1 ? 1 : 0)} ${units[i]}`;
};

const formatUptime = (seconds) => {
  if (!seconds || seconds <= 0) return '—';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  if (parts.length === 0) parts.push(`${s}s`);
  return parts.join(' ');
};

const ProgressBar = ({ value, max, color, label }) => {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
        <span className="font-medium tabular-nums" style={{ color: 'var(--color-text)' }}>
          {pct.toFixed(1)}%
        </span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-border)' }}>
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-out ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};

const StatItem = ({ icon: Icon, label, value, color }) => (
  <div className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: 'var(--color-bg-muted)' }}>
    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
      <Icon className="h-4 w-4" />
    </div>
    <div className="min-w-0">
      <p className="text-[11px] uppercase tracking-wider font-medium" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
      <p className="text-sm font-semibold tabular-nums truncate" style={{ color: 'var(--color-text)' }}>{value}</p>
    </div>
  </div>
);

const LiveUptime = ({ baseUptime, isRunning }) => {
  const [elapsed, setElapsed] = useState(0);
  const tickRef = useRef(null);

  useEffect(() => {
    if (!isRunning || !baseUptime) {
      setElapsed(0);
      return;
    }
    setElapsed(0);
    tickRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [baseUptime, isRunning]);

  return <>{formatUptime((baseUptime || 0) + elapsed)}</>;
};

export const MonitoringStats = ({ stats, compact = false }) => {
  if (!stats) {
    return (
      <div className={`text-center ${compact ? 'py-3' : 'py-6'}`}>
        <ServerStackIcon className={`mx-auto mb-1.5 ${compact ? 'h-5 w-5' : 'h-7 w-7'}`} style={{ color: 'var(--color-text-muted)' }} />
        <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          Monitoring unavailable
        </p>
      </div>
    );
  }

  const isRunning = stats.status === 'running';

  if (compact) {
    const cpuPct = stats.cpus > 0 ? (stats.cpu * 100).toFixed(0) : '0';
    const memPct = stats.maxmem > 0 ? ((stats.mem / stats.maxmem) * 100).toFixed(0) : '0';
    return (
      <div className="flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <CpuChipIcon className="h-3 w-3 text-primary-500 dark:text-primary-400" />
          <span className="font-semibold tabular-nums" style={{ color: 'var(--color-text)' }}>{cpuPct}%</span>
          <span style={{ color: 'var(--color-text-muted)' }}>CPU</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 flex items-center justify-center">
            <svg className="h-3 w-3 text-emerald-500 dark:text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="4" y="4" width="16" height="16" rx="2" />
            </svg>
          </div>
          <span className="font-semibold tabular-nums" style={{ color: 'var(--color-text)' }}>{memPct}%</span>
          <span style={{ color: 'var(--color-text-muted)' }}>MEM</span>
        </div>
        {stats.uptime > 0 && (
          <div className="flex items-center gap-1.5">
            <ClockIcon className="h-3 w-3 text-surface-400" />
            <span className="tabular-nums" style={{ color: 'var(--color-text-secondary)' }}>
              <LiveUptime baseUptime={stats.uptime} isRunning={isRunning} />
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* CPU */}
      <ProgressBar
        label="CPU"
        value={stats.cpu * (stats.cpus || 1) * 100}
        max={(stats.cpus || 1) * 100}
        color="bg-gradient-to-r from-primary-500 to-primary-400"
      />

      {/* Memory */}
      <ProgressBar
        label="Memory"
        value={stats.mem}
        max={stats.maxmem}
        color="bg-gradient-to-r from-emerald-500 to-emerald-400"
      />

      {/* Disk */}
      <ProgressBar
        label="Disk"
        value={stats.disk}
        max={stats.maxdisk}
        color="bg-gradient-to-r from-violet-500 to-violet-400"
      />

      {/* Network + Disk I/O row */}
      <div className="grid grid-cols-2 gap-3">
        <StatItem
          icon={ArrowDownIcon}
          label="Network In"
          value={formatBytes(stats.netin)}
          color="bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400"
        />
        <StatItem
          icon={ArrowUpIcon}
          label="Network Out"
          value={formatBytes(stats.netout)}
          color="bg-cyan-50 text-cyan-600 dark:bg-cyan-950/40 dark:text-cyan-400"
        />
        <StatItem
          icon={CircleStackIcon}
          label="Disk Read"
          value={formatBytes(stats.diskread)}
          color="bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400"
        />
        <StatItem
          icon={CircleStackIcon}
          label="Disk Write"
          value={formatBytes(stats.diskwrite)}
          color="bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400"
        />
      </div>

      {/* Uptime */}
      <div className="flex items-center gap-2.5 p-3 rounded-xl" style={{ backgroundColor: 'var(--color-bg-muted)' }}>
        <ClockIcon className="h-4 w-4" style={{ color: 'var(--color-text-muted)' }} />
        <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Uptime</span>
        <span className="text-sm font-semibold tabular-nums ml-auto" style={{ color: 'var(--color-text)' }}>
          <LiveUptime baseUptime={stats.uptime} isRunning={isRunning} />
        </span>
      </div>
    </div>
  );
};

export default MonitoringStats;
