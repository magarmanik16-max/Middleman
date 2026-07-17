import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  HomeIcon,
  UserGroupIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  ChevronDownIcon,
  SunIcon,
  MoonIcon,
} from '@heroicons/react/24/outline';

/* ── Navigation Items ────────────────────── */

const navItems = [
  { name: 'Dashboard', href: '/', icon: HomeIcon, exact: true },
];

/* ── Sidebar ─────────────────────────────── */

const Sidebar = ({ mobile, onClose }) => {
  const { user, isAdmin } = useAuth();
  const location = useLocation();

  const isActive = (path, exact = false) => {
    if (exact) return location.pathname === path;
    return path !== '/' && location.pathname.startsWith(path);
  };

  const items = [
    ...navItems,
    ...(isAdmin ? [{ name: 'Admin Panel', href: '/admin', icon: UserGroupIcon }] : []),
  ];

  return (
    <div className="flex flex-col h-full relative overflow-hidden" style={{
      backgroundColor: 'var(--color-sidebar)',
      borderRight: '1px solid var(--color-border)',
    }}>
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-5 flex-shrink-0" style={{
        borderBottom: '1px solid var(--color-border)',
      }}>
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 via-primary-600 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-primary-500/30 group-hover:shadow-primary-500/50 group-hover:scale-105 transition-all duration-300">
            <span className="text-white font-extrabold text-sm tracking-tight">MC</span>
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-base font-bold" style={{ color: 'var(--color-text)' }}>ManikCloud</span>
            </div>
            <p className="text-[10px] font-medium tracking-wider uppercase" style={{ color: 'var(--color-text-muted)' }}>Dev Environments</p>
          </div>
        </Link>
        {mobile && (
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors" style={{ color: 'var(--color-text-muted)' }}>
            <XMarkIcon className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-hide">
        <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>Menu</p>
        {items.map((item) => {
          const active = item.exact
            ? isActive(item.href, true)
            : isActive(item.href);
          return (
            <Link
              key={item.name}
              to={item.href}
              onClick={() => mobile && onClose?.()}
              className="relative group flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 overflow-hidden"
            >
              {/* Active left accent bar */}
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full bg-gradient-to-b from-primary-500 to-fuchsia-500 shadow-lg shadow-primary-500/50" />
              )}

              {/* Hover/Active background */}
              <span className={`absolute inset-0 rounded-xl transition-all duration-200 ${
                active
                  ? 'bg-surface-100 dark:bg-white/5 backdrop-blur-sm'
                  : 'opacity-0 group-hover:opacity-100 bg-surface-50 dark:bg-white/[0.03]'
              }`} />

              {/* Content */}
              <span className="relative z-10 flex items-center gap-3">
                <item.icon className={`h-5 w-5 flex-shrink-0 transition-all duration-200 ${
                  active
                    ? 'text-primary-600 dark:text-primary-400 drop-shadow-sm'
                    : 'text-surface-400 dark:text-white/40 group-hover:text-surface-500 dark:group-hover:text-white/60'
                }`} />
                <span className={`transition-all duration-200 ${
                  active
                    ? 'font-semibold'
                    : 'group-hover:font-medium'
                }`} style={{
                  color: active ? 'var(--color-text)' : 'var(--color-text-secondary)'
                }}>
                  {item.name}
                </span>
              </span>

              {/* Active dot */}
              {active && (
                <span className="relative z-10 ml-auto w-1.5 h-1.5 rounded-full bg-primary-500 dark:bg-primary-400 shadow-sm shadow-primary-500/50" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User area */}
      <div className="p-3" style={{ borderTop: '1px solid var(--color-border)' }}>
        <UserMenu />
      </div>
    </div>
  );
};

/* ── User Menu Dropdown ──────────────────── */

const UserMenu = () => {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });
  const menuRef = useRef(null);

  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [dark]);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const toggleDark = () => setDark((d) => !d);

  const initial = user?.email?.charAt(0)?.toUpperCase() || '?';

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-3 w-full p-2 rounded-xl transition-all duration-200 group hover:bg-surface-100 dark:hover:bg-surface-800"
      >
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 via-primary-600 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-primary-500/20 group-hover:shadow-primary-500/40 group-hover:scale-105 transition-all duration-300 flex-shrink-0">
          <span className="text-white font-bold text-sm">{initial}</span>
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>
            {user?.email?.split('@')[0] || 'User'}
          </p>
          <p className="text-[11px] truncate" style={{ color: 'var(--color-text-muted)' }}>{user?.role || 'user'}</p>
        </div>
        <ChevronDownIcon className={`h-4 w-4 transition-transform duration-200 ${
          open ? 'rotate-180' : ''
        }`} style={{ color: 'var(--color-text-muted)' }} />
      </button>

      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-2 z-50 overflow-hidden rounded-xl animate-fade-in-up origin-bottom" style={{
          backgroundColor: 'var(--color-bg-elevated)',
          border: '1px solid var(--color-border)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
        }}>
          {/* Menu items */}
          <div className="py-1.5">
            <button
              onClick={() => { toggleDark(); setOpen(false); }}
              className="flex items-center gap-3 w-full px-3.5 py-2.5 text-sm transition-colors hover:bg-surface-100 dark:hover:bg-surface-800"
              style={{
                color: 'var(--color-text-secondary)',
              }}
            >
              {dark ? (
                <SunIcon className="h-4 w-4 text-amber-500" />
              ) : (
                <MoonIcon className="h-4 w-4 text-primary-500" />
              )}
              {dark ? 'Light Mode' : 'Dark Mode'}
            </button>
          </div>
          <div className="h-px" style={{ backgroundColor: 'var(--color-border)' }} />
          <div className="py-1.5">
            <button
              onClick={() => { logout(); setOpen(false); }}
              className="flex items-center gap-3 w-full px-3.5 py-2.5 text-sm transition-colors hover:bg-red-50 dark:hover:bg-red-950/30"
              style={{
                color: '#ef4444',
              }}
            >
              <ArrowRightOnRectangleIcon className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

/* ── Main Layout ─────────────────────────── */

const Layout = () => {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const headerInitial = user?.email?.charAt(0)?.toUpperCase() || '?';

  const getPageTitle = () => {
    if (location.pathname === '/') return 'Dashboard';
    if (location.pathname.startsWith('/workspace/')) return 'Workspace Details';
    if (location.pathname.startsWith('/admin')) return 'Admin';
    return 'ManikCloud';
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg)' }}>
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 backdrop-blur-sm"
            style={{ backgroundColor: 'var(--color-overlay)' }}
            onClick={() => setSidebarOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-72 animate-slide-in-right shadow-2xl" style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
            <Sidebar mobile onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <Sidebar />
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* ────────────────────────────────────────────── */}
        {/* HEADER — minimal */}
        {/* ────────────────────────────────────────────── */}
        <header
          className="sticky top-0 z-30 transition-all duration-300"
          style={{
            backgroundColor: 'var(--color-header)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          <div className="flex items-center justify-between h-14 px-4 sm:px-6 lg:px-8">
            {/* Left: hamburger + page title */}
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                className="lg:hidden -ml-2 p-2 rounded-xl transition-all hover:bg-surface-100 dark:hover:bg-surface-800"
                style={{ color: 'var(--color-text-secondary)' }}
                onClick={() => setSidebarOpen(true)}
              >
                <Bars3Icon className="h-5 w-5" />
              </button>

              <h1 className="text-base font-semibold truncate" style={{ color: 'var(--color-text)' }}>
                {getPageTitle()}
              </h1>
            </div>

            {/* Right: just avatar */}
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-500 via-primary-600 to-fuchsia-600 flex items-center justify-center shadow-md shadow-primary-500/20 flex-shrink-0 cursor-pointer hover:scale-105 active:scale-95 transition-transform duration-200">
                <span className="text-white font-bold text-xs">
                  {headerInitial}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 sm:p-6 lg:p-8 animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
