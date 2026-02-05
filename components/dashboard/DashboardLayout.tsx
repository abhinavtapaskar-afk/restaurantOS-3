
import React, { useState, useEffect } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Utensils, ShoppingCart, Settings, Heart, LogOut, User as UserIcon, ExternalLink, Star, Wifi, WifiOff, Archive } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../services/supabase';

const navLinks = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Menu', href: '/dashboard/menu', icon: Utensils },
  { name: 'Orders', href: '/dashboard/orders', icon: ShoppingCart },
  { name: 'Inventory', href: '/dashboard/inventory', icon: Archive },
  { name: 'Reviews', href: '/dashboard/reviews', icon: Star },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

const DashboardLayout: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [restaurantSlug, setRestaurantSlug] = useState<string | null>(null);
  const [dbHealthy, setDbHealthy] = useState<boolean | null>(null);

  useEffect(() => {
    const fetchRestaurantSlug = async () => {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('restaurants')
        .select('slug')
        .eq('owner_id', user.id)
        .maybeSingle();
      
      setDbHealthy(!error);
      
      if (data) {
        setRestaurantSlug(data.slug);
      }
    };
    fetchRestaurantSlug();
  }, [user]);


  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-300">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 p-4 flex flex-col border-r border-slate-800">
        <div className="flex items-center gap-3 mb-10 px-2">
          <Utensils className="text-emerald-500" size={28} />
          <h1 className="text-xl font-bold text-white">RestaurantOS</h1>
        </div>
        <nav className="flex-1">
          <ul className="space-y-2">
            {navLinks.map((item) => (
              <li key={item.name}>
                <NavLink
                  to={item.href}
                  end={item.href === '/dashboard'}
                  className={({ isActive }) =>
                    `flex items-center gap-3 p-3 rounded-lg transition-colors font-medium ${
                      isActive
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
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
        <div className="mt-auto space-y-4">
          <div className="flex items-center justify-between px-3 py-2 bg-slate-800/50 rounded-lg text-[10px] font-bold uppercase tracking-wider">
            <span className="text-slate-500">System Status</span>
            <div className="flex items-center gap-1">
              {dbHealthy === null ? (
                <span className="text-slate-500">Checking...</span>
              ) : dbHealthy ? (
                <span className="text-emerald-500 flex items-center gap-1"><Wifi size={10} /> Online</span>
              ) : (
                <span className="text-red-500 flex items-center gap-1"><WifiOff size={10} /> Error</span>
              )}
            </div>
          </div>
          <div className="flex items-center justify-center gap-2 bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-lg text-emerald-400">
            <Heart size={18} />
            <span className="font-semibold text-sm">Mission: Feed Strays</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <header className="flex items-center justify-between h-16 px-6 bg-slate-900/80 backdrop-blur-sm border-b border-slate-800">
           <div>
            {restaurantSlug && (
              <a href={`#/menu/${restaurantSlug}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-emerald-500 hover:underline">
                View Public Menu
                <ExternalLink size={16} />
              </a>
            )}
           </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-400">{user?.email}</span>
            <div className="p-2 bg-slate-800 rounded-full">
              <UserIcon size={20} className="text-slate-400"/>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 p-2 rounded-md text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
              title="Logout"
            >
              <LogOut size={20} />
            </button>
          </div>
        </header>
        <main className="flex-1 p-6 lg:p-8 overflow-y-auto bg-slate-950">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
