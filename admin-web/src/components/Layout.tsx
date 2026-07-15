import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { profile, logout } = useAuth();
  const location = useLocation();

  const nav = [
    { to: '/', label: 'File de vérification', icon: '📋' },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="flex w-64 flex-col border-r border-gray-200 bg-white">
        <div className="border-b border-gray-200 p-6">
          <h1 className="text-xl font-bold text-emerald-700">SoinLokal</h1>
          <p className="text-sm text-gray-500">Administration</p>
        </div>

        <nav className="flex-1 p-4">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`mb-1 flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                location.pathname === item.to
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="border-t border-gray-200 p-4">
          <p className="truncate text-sm font-medium text-gray-800">
            {profile?.first_name} {profile?.last_name}
          </p>
          <p className="truncate text-xs text-gray-500">{profile?.email}</p>
          <button
            onClick={logout}
            className="mt-3 w-full rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100"
          >
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto p-8">{children}</main>
    </div>
  );
}
