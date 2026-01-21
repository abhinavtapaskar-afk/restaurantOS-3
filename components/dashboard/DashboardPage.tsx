import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Restaurant, Order } from '../../types';
import { DollarSign, ShoppingBag, PawPrint, AlertTriangle } from 'lucide-react';

const StatCard: React.FC<{ title: string; value: string; icon: React.ElementType }> = ({ title, value, icon: Icon }) => (
    <div className="bg-slate-800/50 p-6 rounded-lg border border-slate-700 flex items-center gap-4 transition-all duration-300 hover:border-emerald-500/50 hover:shadow-glow-emerald">
        <div className="bg-emerald-500/10 p-3 rounded-full border border-emerald-500/20">
            <Icon className="text-emerald-500" size={24} />
        </div>
        <div>
            <p className="text-slate-400 text-sm">{title}</p>
            <p className="text-2xl font-bold text-white">{value}</p>
        </div>
    </div>
);

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data: restaurantData, error: restaurantError } = await supabase
      .from('restaurants')
      .select('*')
      .eq('owner_id', user.id)
      .single();

    if (restaurantData) {
      setRestaurant(restaurantData);
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .eq('restaurant_id', restaurantData.id);
      
      if (ordersData) setOrders(ordersData);
      if (ordersError) console.error('Error fetching orders:', ordersError);
    }
    
    if (restaurantError && restaurantError.code !== 'PGRST116') { // Ignore 'single row not found'
        console.error('Error fetching restaurant:', restaurantError);
    }
    
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  if (loading) {
    return <div className="text-center p-8">Loading dashboard...</div>;
  }

  if (!restaurant) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-slate-900/50 border-2 border-dashed border-slate-800 rounded-lg p-8 text-center">
        <AlertTriangle className="text-yellow-500" size={48} />
        <h2 className="mt-4 text-2xl font-semibold text-white">Setup Required</h2>
        <p className="mt-2 text-slate-400">
          You need to set up your restaurant details before you can see the dashboard.
        </p>
        <Link
          to="/dashboard/settings"
          className="mt-6 bg-emerald-600 text-white font-semibold py-2 px-6 rounded-lg hover:bg-emerald-500 transition-colors"
        >
          Go to Settings
        </Link>
      </div>
    );
  }

  const totalRevenue = orders.reduce((acc, order) => acc + (order.status === 'delivered' ? Number(order.total_amount) : 0), 0);
  const activeOrders = orders.filter(order => order.status === 'pending' || order.status === 'preparing').length;
  const animalsFed = Math.floor(orders.length * 0.05);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6 text-white">Welcome, {restaurant.name}</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard title="Total Revenue" value={`₹${totalRevenue.toFixed(2)}`} icon={DollarSign} />
        <StatCard title="Active Orders" value={activeOrders.toString()} icon={ShoppingBag} />
        <StatCard title="Animals Fed (est.)" value={animalsFed.toString()} icon={PawPrint} />
      </div>
    </div>
  );
};

export default DashboardPage;