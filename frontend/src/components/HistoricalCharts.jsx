import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import {
  CpuChipIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  CircleStackIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

const TIMEFRAMES = [
  { key: 'hour', label: '1H' },
  { key: 'day', label: '1D' },
  { key: 'week', label: '1W' },
  { key: 'month', label: '1M' },
];

const CHARTS = [
  {
    key: 'cpu',
    title: 'CPU',
    icon: CpuChipIcon,
    accent: '#ef4444',
    gradient: ['#ef4444', '#f87171'],
    series: [{ dataKey: 'cpu', name: 'Usage' }],
    format: (v) => `${(v * 100).toFixed(1)}%`,
    domain: [0, 1],
    yFormat: (v) => `${(v * 100).toFixed(0)}%`,
  },
  {
    key: 'mem',
    title: 'Memory',
    icon: CircleStackIcon,
    accent: '#10b981',
    gradient: ['#10b981', '#34d399'],
    series: [{ dataKey: 'mem', name: 'Used' }],
    format: (v) => `${(v / (1024 * 1024)).toFixed(0)} MB`,
    domain: [0, 'dataMax'],
    yFormat: (v) => `${(v / (1024 * 1024)).toFixed(0)}M`,
  },
  {
    key: 'net',
    title: 'Network I/O',
    icon: ArrowDownTrayIcon,
    accent: '#3b82f6',
    gradient: ['#3b82f6', '#60a5fa'],
    series: [
      { dataKey: 'netin', name: 'In', color: '#3b82f6', fill: ['#3b82f6', '#93c5fd'] },
      { dataKey: 'netout', name: 'Out', color: '#06b6d4', fill: ['#06b6d4', '#67e8f9'] },
    ],
    format: (v) => formatBytesRate(v),
    domain: [0, 'dataMax'],
    yFormat: (v) => formatBytesRateShort(v),
  },
  {
    key: 'disk',
    title: 'Disk I/O',
    icon: ArrowUpTrayIcon,
    accent: '#f59e0b',
    gradient: ['#f59e0b', '#fbbf24'],
    series: [
      { dataKey: 'diskread', name: 'Read', color: '#f59e0b', fill: ['#f59e0b', '#fde68a'] },
      { dataKey: 'diskwrite', name: 'Write', color: '#f97316', fill: ['#f97316', '#fdba74'] },
    ],
    format: (v) => formatBytesRate(v),
    domain: [0, 'dataMax'],
    yFormat: (v) => formatBytesRateShort(v),
  },
];

const formatBytesRate = (bytesPerSec) => {
  if (!bytesPerSec || bytesPerSec === 0) return '0 B/s';
  const units = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
  const i = Math.floor(Math.log(bytesPerSec) / Math.log(1024));
  return `${(bytesPerSec / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
};

const formatBytesRateShort = (bytesPerSec) => {
  if (!bytesPerSec || bytesPerSec === 0) return '0';
  const units = ['B', 'K', 'M', 'G'];
  const i = Math.floor(Math.log(bytesPerSec) / Math.log(1024));
  return `${(bytesPerSec / Math.pow(1024, i)).toFixed(0)}${units[i]}`;
};

const formatTime = (ts, timeframe) => {
  const d = new Date(ts * 1000);
  if (timeframe === 'hour') return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (timeframe === 'day') return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (timeframe === 'week') return d.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

/* ── Tooltip ─────────────────────────────────────────────────────────────── */

const ChartTooltip = ({ active, payload, timeframe, config }) => {
  if (!active || !payload || !payload.length) return null;
  const point = payload[0].payload;
  return (
    <div
      className="px-3.5 py-2.5 rounded-xl text-xs shadow-2xl backdrop-blur-md"
      style={{
        backgroundColor: 'rgba(15, 23, 42, 0.92)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <p className="font-medium mb-1.5" style={{ color: '#94a3b8' }}>
        {formatTime(point.time, timeframe)}
      </p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2 tabular-nums">
          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
          <span style={{ color: '#cbd5e1' }}>{entry.name}</span>
          <span className="font-semibold ml-auto" style={{ color: '#f1f5f9' }}>
            {config.format(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
};

/* ── Inline Legend ────────────────────────────────────────────────────────── */

const InlineLegend = ({ series }) => (
  <div className="flex items-center gap-3 mt-0.5" role="list" aria-label="Chart legend">
    {series.map((s) => (
      <div key={s.dataKey} className="flex items-center gap-1.5" role="listitem">
        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
        <span className="text-[10px] font-medium" style={{ color: 'var(--color-text-muted)' }}>{s.name}</span>
      </div>
    ))}
  </div>
);

/* ── Chart Card ──────────────────────────────────────────────────────────── */

const ChartCard = ({ config, data, timeframe }) => {
  const latest = data.length > 0 ? data[data.length - 1] : null;
  const currentValue = latest ? latest[config.series[0].dataKey] : 0;
  const hasData = data.length > 1;

  return (
    <div
      className="rounded-2xl overflow-hidden transition-all duration-300"
      style={{
        backgroundColor: 'var(--color-bg-elevated)',
        border: '1px solid var(--color-border)',
      }}
      role="figure"
      aria-label={`${config.title} chart — current value: ${config.format(currentValue)}`}
    >
      {/* Colored top accent */}
      <div className="h-[2px]" style={{ background: `linear-gradient(90deg, ${config.gradient[0]}, ${config.gradient[1]})` }} />

      <div className="p-4">
        {/* Header: icon + title + current KPI value */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${config.accent}12` }}
            >
              <config.icon className="h-4 w-4" style={{ color: config.accent }} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                {config.title}
              </p>
              {config.series.length > 1 && <InlineLegend series={config.series} />}
            </div>
          </div>
          <p className="text-lg font-bold tabular-nums" style={{ color: 'var(--color-text)' }}>
            {config.format(currentValue)}
          </p>
        </div>

        {/* Chart area */}
        <div className="h-32 -mx-1">
          {hasData ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                <defs>
                  {config.series.map((s) => (
                    <linearGradient key={s.dataKey} id={`${config.key}-${s.dataKey}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={s.fill?.[0] || config.gradient[0]} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={s.fill?.[1] || config.gradient[1]} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--color-border)"
                  strokeOpacity={0.35}
                  vertical={false}
                />
                <XAxis dataKey="time" tick={false} axisLine={false} tickLine={false} />
                <YAxis
                  domain={config.domain}
                  tickFormatter={config.yFormat}
                  tick={false}
                  axisLine={false}
                  tickLine={false}
                  width={0}
                />
                <Tooltip
                  content={<ChartTooltip timeframe={timeframe} config={config} />}
                  cursor={{ stroke: config.accent, strokeWidth: 1, strokeOpacity: 0.25 }}
                />
                {config.series.map((s) => (
                  <Area
                    key={s.dataKey}
                    type="monotone"
                    dataKey={s.dataKey}
                    name={s.name}
                    stroke={s.color || config.gradient[0]}
                    fill={`url(#${config.key}-${s.dataKey})`}
                    strokeWidth={1.5}
                    dot={false}
                    activeDot={{ r: 3.5, strokeWidth: 0, fill: s.color || config.gradient[0] }}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center">
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Waiting for data…</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ── Main Component ──────────────────────────────────────────────────────── */

export const HistoricalCharts = ({ workspaceId }) => {
  const [timeframe, setTimeframe] = useState('hour');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);

  const fetchData = async (tf) => {
    try {
      const { data: res } = await axios.get(`/api/workspaces/${workspaceId}/rrddata?timeframe=${tf}`);
      setData(res.data || []);
      setError(null);
    } catch {
      setError('Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchData(timeframe);
    intervalRef.current = setInterval(() => fetchData(timeframe), 30000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [timeframe, workspaceId]);

  /* ── Loading state ── */
  if (loading && data.length === 0) {
    return (
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="section-title">Resource History</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
              <div className="h-[2px] skeleton" />
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 skeleton rounded-lg" />
                    <div className="h-3 w-16 skeleton rounded" />
                  </div>
                  <div className="h-5 w-14 skeleton rounded" />
                </div>
                <div className="h-32 skeleton rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ── Error state ── */
  if (error) {
    return (
      <div className="glass-card p-6">
        <h2 className="section-title mb-4">Resource History</h2>
        <div className="text-center py-8 space-y-3">
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{error}</p>
          <button
            onClick={() => fetchData(timeframe)}
            className="btn-secondary inline-flex items-center gap-2 text-xs"
          >
            <ArrowPathIcon className="h-3.5 w-3.5" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-6">
      {/* Header + timeframe selector */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="section-title">Resource History</h2>
        <div className="flex gap-1 p-1 rounded-xl" style={{ backgroundColor: 'var(--color-bg-muted)' }} role="tablist" aria-label="Timeframe selector">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.key}
              onClick={() => setTimeframe(tf.key)}
              role="tab"
              aria-selected={timeframe === tf.key}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                timeframe === tf.key
                  ? 'bg-white dark:bg-surface-800 shadow-sm text-primary-600 dark:text-primary-400'
                  : 'hover:text-primary-500'
              }`}
              style={timeframe !== tf.key ? { color: 'var(--color-text-muted)' } : {}}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {CHARTS.map((config) => (
          <ChartCard key={config.key} config={config} data={data} timeframe={timeframe} />
        ))}
      </div>
    </div>
  );
};

export default HistoricalCharts;
