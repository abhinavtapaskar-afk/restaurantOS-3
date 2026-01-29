
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Restaurant, Order } from '../../types';
import { safeParse, cn } from '../../lib/utils';
import { 
  DollarSign, 
  ShoppingBag, 
  Target, 
  Zap, 
  Users, 
  TrendingUp, 
  ArrowUpRight,
  RefreshCw
} from 'lucide-react';

// --- Animated Number Component ---
const AnimatedNumber: React.FC<{ value: number; prefix?: string; decimals?: number }> = ({ value, prefix = '', decimals = 0 }) => {
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        let startTimestamp: number | null = null;
        const duration = 1000;
        const step = (timestamp: number) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            const current = progress * value;
            setDisplayValue(current);
            if (progress < 1) {
                window.requestAnimationFrame(step);
            } else {
                setDisplayValue(value);
            }
        };
        window.requestAnimationFrame(step);
    }, [value]);

    return <span>{prefix}{displayValue.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}</span>;
};

// --- Custom Area Chart Component ---
const PeakHourChart: React.FC<{ data: number[] }> = ({ data }) => {
    const max = Math.max(...data, 1);
    const points = data.map((val, i) => `${(i / 23) * 100},${100 - (val / max) * 80}`).join(' ');
    const pathData = `0,100 ${points} 100,100`;

    return (
        <div className="h-32 w-full mt-4 relative">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
                <defs>
                    <linearGradient id="purple-glow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#a855f7" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
                    </linearGradient>
                </defs>
                <path d={pathData} fill="url(#purple-glow)" className="animate-pulse" />
                <polyline
                    points={points}
                    fill="none"
                    stroke="#a855f7"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]"
                />
            </svg>
            <div className="flex justify-between text-[8px] text-slate-500 mt-2 uppercase font-bold tracking-tighter">
                <span>12 AM</span>
                <span>6 AM</span>
                <span>12 PM</span>
                <span>6 PM</span>
                <span>11 PM</span>
            </div>
        </div>
    );
};

// --- Loyalty Ring Component ---
const LoyaltyRing: React.FC<{ percentage: number }> = ({ percentage }) => {
    const radius = 36;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;

    return (
        <div className="relative w-24 h-24 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
                <circle cx="48" cy="48" r={radius} stroke="currentColor" strokeWidth="6" fill="transparent" className="text-slate-800" />
                <circle
                    cx="48" cy="48" r={radius} stroke="currentColor" strokeWidth="6" fill="transparent"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    className="text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)] transition-all duration-1000 ease-out"
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold text-white leading-none">{Math.round(percentage)}%</span>
                <span className="text-[8px] text-slate-500 font-bold uppercase">Loyal</span>
            </div>
        </div>
    );
};

// --- Main Dashboard Page ---
const DashboardPage: React.FC = () => {
    const { user } = useAuth();
    const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const fetchData = useCallback(async (isManual = false) => {
        if (!user) return;
        if (isManual) setIsRefreshing(true);
        else setLoading(true);

        try {
            const { data: restData } = await supabase.from('restaurants').select('*').eq('owner_id', user.id).maybeSingle();
            if (restData) {
                setRestaurant(restData);
                const { data: ordersData } = await supabase.from('orders').select('*').eq('restaurant_id', restData.id);
                if (ordersData) setOrders(ordersData);
            }
        } catch (err) {
            console.error('[Dashboard] Error:', err);
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    }, [user]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // --- Computed Metrics ---
    const metrics = useMemo(() => {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

        let todayRev = 0;
        let monthRev = 0;
        let totalRev = 0;
        let deliveredCount = 0;
        const phoneTracker = new Map<string, number>();
        const hourCounts = new Array(24).fill(0);
        const categoryStats = new Map<string, number>();

        orders.forEach(order => {
            const time = new Date(order.created_at).getTime();
            const hour = new Date(order.created_at).getHours();
            const amount = Number(order.total_amount) || 0;
            const phone = order.customer_phone || 'guest';

            if (order.status === 'delivered') {
                deliveredCount++;
                totalRev += amount;
                if (time >= startOfDay) todayRev += amount;
                if (time >= startOfMonth) monthRev += amount;
            }

            hourCounts[hour]++;
            phoneTracker.set(phone, (phoneTracker.get(phone) || 0) + 1);

            const items = safeParse<any[]>(order.order_details || order.items, []);
            items.forEach(item => {
                const cat = item.category || 'Other';
                const qty = Number(item.quantity) || 1;
                categoryStats.set(cat, (categoryStats.get(cat) || 0) + qty);
            });
        });

        // Loyalty: % of unique phone numbers that have ordered more than once
        const uniquePhones = Array.from(phoneTracker.keys()).length;
        const repeatCustomers = Array.from(phoneTracker.values()).filter(v => v > 1).length;
        const loyaltyPercent = uniquePhones > 0 ? (repeatCustomers / uniquePhones) * 100 : 0;

        // Categories sorted Ascending (Lowest Sales First) for marketing opportunities
        const categories = Array.from(categoryStats.entries())
            .map(([name, sales]) => ({ name, sales }))
            .sort((a, b) => a.sales - b.sales);

        return {
            todayRev,
            monthRev,
            totalOrders: orders.length,
            aov: deliveredCount > 0 ? totalRev / deliveredCount : 0,
            hourCounts,
            loyaltyPercent,
            categories
        };
    }, [orders]);

    if (loading) return (
        <div className="flex items-center justify-center h-full">
            <RefreshCw className="text-emerald-500 animate-spin" size={48} />
        </div>
    );

    if (!restaurant) return (
        <div className="flex flex-col items-center justify-center h-full text-center bg-slate-900/40 backdrop-blur-md rounded-2xl border border-white/10 p-12">
            <Target className="text-emerald-500 mb-4 animate-bounce" size={64} />
            <h2 className="text-3xl font-bold text-white mb-2">Initialize Your Hub</h2>
            <p className="text-slate-400 mb-8 max-w-sm">Unlock world-class analytics by configuring your restaurant profile.</p>
            <Link to="/dashboard/settings" className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-glow-emerald">
                Configure OS
            </Link>
        </div>
    );

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* --- Header Section --- */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tight flex items-center gap-3">
                        Command <span className="text-emerald-500 underline decoration-emerald-500/30">Center</span>
                    </h1>
                    <p className="text-slate-500 font-bold text-xs uppercase tracking-[0.2em] mt-1 flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        {restaurant.name} &bull; Live Intelligence
                    </p>
                </div>
                <button 
                    onClick={() => fetchData(true)} 
                    className={cn("flex items-center gap-2 bg-slate-900/50 backdrop-blur-sm border border-white/5 hover:border-white/20 text-slate-400 hover:text-white px-4 py-2 rounded-xl transition-all", isRefreshing && "opacity-50 pointer-events-none")}
                >
                    <RefreshCw size={16} className={isRefreshing ? "animate-spin" : ""} />
                    <span className="text-xs font-bold uppercase tracking-wider">Sync Data</span>
                </button>
            </div>

            {/* --- Data Bar: Stats Cards --- */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: "Today's Revenue", value: metrics.todayRev, prefix: "₹", decimals: 2, icon: DollarSign, color: "emerald" },
                    { label: "Monthly Revenue", value: metrics.monthRev, prefix: "₹", decimals: 2, icon: TrendingUp, color: "purple" },
                    { label: "Total Orders", value: metrics.totalOrders, icon: ShoppingBag, color: "sky" },
                    { label: "Average Order Value", value: metrics.aov, prefix: "₹", decimals: 2, icon: Zap, color: "amber" }
                ].map((stat, i) => (
                    <div 
                        key={i} 
                        className={cn(
                            "group relative overflow-hidden bg-slate-900/40 backdrop-blur-md border border-white/10 p-6 rounded-2xl transition-all duration-500 hover:-translate-y-1",
                            `hover:border-${stat.color}-500/50 shadow-[0_0_15px_rgba(0,0,0,0.2)]`
                        )}
                    >
                        <div className={`absolute -top-4 -right-4 bg-${stat.color}-500/10 w-20 h-20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700`} />
                        <div className="flex justify-between items-start relative z-10">
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">{stat.label}</p>
                                <h3 className="text-2xl font-black text-white leading-none">
                                    <AnimatedNumber value={stat.value} prefix={stat.prefix} decimals={stat.decimals} />
                                </h3>
                            </div>
                            <div className={`bg-${stat.color}-500/10 p-2.5 rounded-xl border border-${stat.color}-500/20`}>
                                <stat.icon className={`text-${stat.color}-500`} size={20} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* --- Charts & Loyalty Tracker --- */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Peak Hour Pulse */}
                <div className="lg:col-span-2 bg-slate-900/40 backdrop-blur-md border border-white/10 p-8 rounded-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-5">
                        <TrendingUp size={120} className="text-purple-500" />
                    </div>
                    <div className="relative z-10">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h4 className="text-white font-black text-lg">Peak Hour Pulse</h4>
                                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Live Traffic Analysis</p>
                            </div>
                            <div className="text-right">
                                <span className="text-purple-500 text-xl font-black">{Math.max(...metrics.hourCounts)}</span>
                                <p className="text-[10px] text-slate-500 font-bold uppercase">Peak Peak Vol.</p>
                            </div>
                        </div>
                        <PeakHourChart data={metrics.hourCounts} />
                    </div>
                </div>

                {/* Loyalty Tracker */}
                <div className="bg-slate-900/40 backdrop-blur-md border border-white/10 p-8 rounded-2xl flex flex-col items-center justify-center text-center group">
                    <h4 className="text-white font-black text-lg mb-1">Customer Loyalty</h4>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-8">Repeat Order Growth</p>
                    <LoyaltyRing percentage={metrics.loyaltyPercent} />
                    <div className="mt-8 w-full space-y-2">
                        <div className="flex justify-between text-[10px] font-bold uppercase">
                            <span className="text-slate-500">New Users</span>
                            <span className="text-white">{(100 - metrics.loyaltyPercent).toFixed(1)}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] transition-all duration-1000" 
                                style={{ width: `${metrics.loyaltyPercent}%` }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* --- Marketing Opportunities (Categories) --- */}
            <div>
                <div className="flex items-center gap-4 mb-6">
                    <ArrowUpRight className="text-emerald-500" size={24} />
                    <div>
                        <h4 className="text-white font-black text-xl">Marketing Opportunities</h4>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Least Performing Categories (Ascending Order)</p>
                    </div>
                </div>
                
                <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                    {metrics.categories.map((cat, i) => (
                        <div 
                            key={cat.name} 
                            className={cn(
                                "flex-shrink-0 min-w-[200px] bg-slate-900/40 backdrop-blur-md border border-white/10 p-5 rounded-xl transition-all hover:scale-105",
                                i < 2 ? "border-amber-500/30 bg-amber-500/5" : ""
                            )}
                        >
                            <div className="flex justify-between items-start mb-3">
                                <span className="text-xs font-black text-slate-500 uppercase tracking-widest">{cat.name}</span>
                                {i < 2 && <span className="bg-amber-500 text-slate-900 text-[8px] font-black uppercase px-2 py-0.5 rounded-full animate-pulse">Low Vol</span>}
                            </div>
                            <div className="flex items-end gap-2">
                                <span className="text-3xl font-black text-white leading-none">{cat.sales}</span>
                                <span className="text-[10px] text-slate-500 font-bold uppercase mb-1">Items Sold</span>
                            </div>
                        </div>
                    ))}
                    {metrics.categories.length === 0 && (
                        <div className="w-full text-center py-12 border-2 border-dashed border-slate-800 rounded-2xl text-slate-500 italic">
                            Awaiting menu interaction data...
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;
