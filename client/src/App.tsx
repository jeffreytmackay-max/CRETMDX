import { NavLink, Route, Routes } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Properties from './pages/Properties';
import MapView from './pages/MapView';
import Leases from './pages/Leases';
import Transactions from './pages/Transactions';
import Financial from './pages/Financial';

const NAV = [
  { to: '/', label: 'Dashboard', icon: '▦', end: true },
  { to: '/map', label: 'Map', icon: '◎' },
  { to: '/properties', label: 'Properties', icon: '⌂' },
  { to: '/leases', label: 'Lease Administration', icon: '▤' },
  { to: '/transactions', label: 'Transactions', icon: '⇄' },
  { to: '/financial', label: 'Financial Modeling', icon: '∑' },
];

export default function App() {
  return (
    <div className="flex h-full">
      <aside className="flex w-60 flex-shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-4">
          <div className="text-lg font-bold tracking-tight text-slate-900">CRETMDX</div>
          <div className="text-xs text-slate-500">CRE Portfolio Management</div>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
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
        <div className="border-t border-slate-200 p-4 text-xs text-slate-400">
          Demo portfolio · seeded data
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/map" element={<MapView />} />
          <Route path="/properties" element={<Properties />} />
          <Route path="/leases" element={<Leases />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/financial" element={<Financial />} />
        </Routes>
      </main>
    </div>
  );
}
