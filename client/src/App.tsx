import { useState } from 'react';
import { NavLink, Route, Routes } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Properties from './pages/Properties';
import MapView from './pages/MapView';
import Leases from './pages/Leases';
import Transactions from './pages/Transactions';
import Financial from './pages/Financial';
import Settings from './pages/Settings';

const NAV = [
  { to: '/', label: 'Dashboard', icon: '▦', end: true },
  { to: '/map', label: 'Map', icon: '◎' },
  { to: '/properties', label: 'Properties', icon: '⌂' },
  { to: '/leases', label: 'Lease Administration', icon: '▤' },
  { to: '/transactions', label: 'Transactions', icon: '⇄' },
  { to: '/financial', label: 'Financial Modeling', icon: '∑' },
  { to: '/settings', label: 'Settings', icon: '⚙' },
];

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex-1 space-y-1 p-3">
      {NAV.map((n) => (
        <NavLink
          key={n.to}
          to={n.to}
          end={n.end}
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
              isActive
                ? 'bg-blue-50 text-blue-700'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`
          }
        >
          <span className="w-5 text-center text-base">{n.icon}</span>
          {n.label}
        </NavLink>
      ))}
    </nav>
  );
}

function Brand() {
  return (
    <div>
      <div className="text-lg font-bold tracking-tight text-slate-900">CRETMDX</div>
      <div className="text-xs text-slate-500">CRE Portfolio Management</div>
    </div>
  );
}

export default function App() {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="flex h-[100dvh] flex-col md:flex-row">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 flex-shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
        <div className="border-b border-slate-200 px-5 py-4">
          <Brand />
        </div>
        <NavList />
        <div className="border-t border-slate-200 p-4 text-xs text-slate-400">
          Demo portfolio · seeded data
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 pt-safe pl-safe md:hidden">
        <Brand />
        <button
          aria-label="Open menu"
          onClick={() => setNavOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600 active:bg-slate-100"
        >
          <span className="text-xl leading-none">☰</span>
        </button>
      </header>

      {/* Mobile drawer */}
      {navOpen && (
        <div className="fixed inset-0 z-[1100] md:hidden" onClick={() => setNavOpen(false)}>
          <div className="absolute inset-0 bg-slate-900/40" />
          <div
            className="absolute right-0 top-0 flex h-full w-72 max-w-[80%] flex-col bg-white shadow-xl pt-safe"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <Brand />
              <button
                aria-label="Close menu"
                onClick={() => setNavOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 active:bg-slate-100"
              >
                ✕
              </button>
            </div>
            <NavList onNavigate={() => setNavOpen(false)} />
          </div>
        </div>
      )}

      <main className="flex-1 overflow-y-auto scroll-touch">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/map" element={<MapView />} />
          <Route path="/properties" element={<Properties />} />
          <Route path="/leases" element={<Leases />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/financial" element={<Financial />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  );
}
