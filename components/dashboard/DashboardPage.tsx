import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Restaurant, Order, MenuItem } from '../../types';
import { DollarSign, ShoppingBag, PawPrint, AlertTriangle, BarChart, Utensils } from 'lucide-react';

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

type TopItem = {
    name: string;
    count: number;
}

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [topItems, setTopItems] = useState<TopItem[]>([]);

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
      
      if (ordersData) {
        setOrders(ordersData);
        
        // Calculate top items
        const itemCounts = new Map<string, number>();
        ordersData.forEach(order => {
          if (order.order_details) {
            order.order_details.forEach(item => {
              itemCounts.set(item.name, (itemCounts.get(item.name) || 0) + item.quantity);
            });
          }
        });
        const sortedItems = Array.from(itemCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([name, count]) => ({ name, count }));
        setTopItems(sortedItems);
      }
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

  const deliveredOrders = orders.filter(o => o.status === 'delivered');
  const totalRevenue = deliveredOrders.reduce((acc, order) => acc + Number(order.total_amount), 0);
  const totalOrders = orders.length;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / deliveredOrders.length : 0;
  const animalsFed = Math.floor(totalOrders * 0.05);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6 text-white">Welcome, {restaurant.name}</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Revenue" value={`₹${totalRevenue.toFixed(2)}`} icon={DollarSign} />
        <StatCard title="Total Orders" value={totalOrders.toString()} icon={ShoppingBag} />
        <StatCard title="Avg. Order Value" value={`₹${avgOrderValue.toFixed(2)}`} icon={BarChart} />
        <StatCard title="Animals Fed (est.)" value={animalsFed.toString()} icon={PawPrint} />
      </div>

      <div className="mt-8">
        <h2 className="text-2xl font-bold text-white mb-4">Top Selling Items</h2>
        {topItems.length > 0 ? (
          <div className="bg-slate-800/50 p-6 rounded-lg border border-slate-700">
            <ul className="space-y-4">
              {topItems.map((item, index) => (
                <li key={index} className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <Utensils size={18} className="text-slate-500"/>
                    <span className="font-medium text-slate-300">{item.name}</span>
                  </div>
                  <span className="font-bold text-white bg-slate-700 px-2 py-0.5 rounded-md text-sm">{item.count} sold</span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="text-center py-10 bg-slate-800/50 border-2 border-dashed border-slate-800 rounded-lg">
            <p className="text-slate-400">No order data yet to show top items.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;