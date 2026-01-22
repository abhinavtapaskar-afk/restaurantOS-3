
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Restaurant, Order } from '../../types';
import { safeParse } from '../../lib/utils';
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
    try {
        const { data: restaurantData } = await supabase.from('restaurants').select('*').eq('owner_id', user.id).maybeSingle();

        if (restaurantData) {
          setRestaurant(restaurantData);
          const { data: ordersData } = await supabase.from('orders').select('*').eq('restaurant_id', restaurantData.id);
          
          if (ordersData) {
            setOrders(ordersData);
            
            const itemCounts = new Map<string, number>();
            ordersData.forEach(order => {
              const items = safeParse<any[]>(order.order_details || order.items, []);
              
              items.forEach((item: any) => {
                if (item?.name) {
                    const qty = Number(item?.quantity) || 1;
                    itemCounts.set(item.name, (itemCounts.get(item.name) || 0) + qty);
                }
              });
            });

            const sortedItems = Array.from(itemCounts.entries())
              .sort((a, b) => b[1] - a[1])
              .slice(0, 5)
              .map(([name, count]) => ({ name, count }));
            setTopItems(sortedItems);
          }
        }
    } catch(err) {
        console.error('Dashboard Error:', err);
    } finally {
        setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  if (loading) return <div className="text-center p-8 text-slate-400">Analyzing data...</div>;

  if (!restaurant) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-slate-900/50 border-2 border-dashed border-slate-800 rounded-lg p-8 text-center">
        <AlertTriangle className="text-yellow-500" size={48} />
        <h2 className="mt-4 text-2xl font-semibold text-white">Setup Required</h2>
        <p className="mt-2 text-slate-400">Complete your restaurant profile to activate the dashboard.</p>
        <Link to="/dashboard/settings" className="mt-6 bg-emerald-600 text-white font-semibold py-2 px-6 rounded-lg hover:bg-emerald-500 transition-colors">Go to Settings</Link>
      </div>
    );
  }

  // AUDIT FIX: Use Number() and handle potential nulls for accurate Revenue
  const revenueOrders = orders.filter(o => o.status === 'delivered');
  const totalRevenue = revenueOrders.reduce((acc, order) => {
      const amount = Number(order.total_amount) || 0;
      return acc + amount;
  }, 0);
  
  const totalOrders = orders.length;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / Math.max(revenueOrders.length, 1) : 0;
  const animalsFed = Math.floor(totalOrders * 0.05);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6 text-white">{restaurant.name} Overview</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Revenue" value={`₹${totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`} icon={DollarSign} />
        <StatCard title="Total Orders" value={totalOrders.toString()} icon={ShoppingBag} />
        <StatCard title="Avg. Order Value" value={`₹${avgOrderValue.toFixed(2)}`} icon={BarChart} />
        <StatCard title="Animals Fed (est.)" value={animalsFed.toString()} icon={PawPrint} />
      </div>

      <div className="mt-8">
        <h2 className="text-2xl font-bold text-white mb-4">Top Sellers</h2>
        {topItems.length > 0 ? (
          <div className="bg-slate-800/50 p-6 rounded-lg border border-slate-700">
            <ul className="space-y-4">
              {topItems.map((item, index) => (
                <li key={index} className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <Utensils size={18} className="text-slate-500"/>
                    <span className="font-medium text-slate-300">{item.name}</span>
                  </div>
                  <span className="font-bold text-white bg-slate-700 px-2 py-0.5 rounded-md text-sm">{item.count} qty</span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="text-center py-10 bg-slate-800/50 border-2 border-dashed border-slate-800 rounded-lg">
            <p className="text-slate-400">Waiting for first orders to calculate metrics.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
