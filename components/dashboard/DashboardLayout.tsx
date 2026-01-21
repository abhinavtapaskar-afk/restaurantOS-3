
import React from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Utensils, ShoppingCart, Settings, Heart, LogOut, User as UserIcon } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../services/supabase';

const navLinks = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Menu', href: '/dashboard/menu', icon: Utensils },
  { name: 'Orders', href: '/dashboard/orders', icon: ShoppingCart },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

const DashboardLayout: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 p-4 flex flex-col border-r border-slate-800">
        <div className="flex items-center gap-2 mb-10">
          <Utensils className="text-emerald-500" size={28} />
          <h1 className="text-xl font-bold">RestaurantOS</h1>
        </div>
        <nav className="flex-1">
          <ul className="space-y-2">
            {navLinks.map((item) => (
              <li key={item.name}>
                <NavLink
                  to={item.href}
                  end={item.href === '/dashboard'}
                  className={({ isActive }) =>
                    `flex items-center gap-3 p-3 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-emerald-500/10 text-emerald-500'
                        : 'hover:bg-slate-800'
                    }`
                  }
                >
                  <item.icon size={20} />
                  <span>{item.name}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="mt-auto">
          <div className="flex items-center justify-center gap-2 bg-slate-800 p-3 rounded-lg text-emerald-500">
            <Heart size={18} />
            <span className="font-semibold text-sm">Mission: Feed Strays</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <header className="flex items-center justify-end h-16 px-6 bg-slate-900 border-b border-slate-800">
          <div className="flex items-center gap-4">
            <span className="text-sm">{user?.email}</span>
            <div className="p-2 bg-slate-800 rounded-full">
              <UserIcon size={20} />
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 p-2 rounded-md hover:bg-slate-800 transition-colors"
              title="Logout"
            >
              <LogOut size={20} />
            </button>
          </div>
        </header>
        <main className="flex-1 p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
