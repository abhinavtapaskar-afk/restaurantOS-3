
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Order, OrderStatus, Restaurant, CartItem } from '../../types';
import { cn, safeParse } from '../../lib/utils';
import Modal from '../ui/Modal';
import { 
    Eye, 
    ChevronDown, 
    RefreshCw, 
    Zap,
    Volume2,
    VolumeX,
    BellRing,
    X,
    Loader2,
    AlertTriangle
} from 'lucide-react';

const STATUS_OPTIONS: { value: OrderStatus; label: string; color: string }[] = [
    { value: 'pending', label: 'Pending', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
    { value: 'confirmed', label: 'Confirmed', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
    { value: 'preparing', label: 'Preparing', color: 'bg-indigo-600/20 text-indigo-400 border-indigo-500/30 shadow-glow-indigo' },
    { value: 'out_for_delivery', label: 'Out for Delivery', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
    { value: 'delivered', label: 'Delivered', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
    { value: 'cancelled', label: 'Cancelled', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
];

const getStatusConfig = (status: OrderStatus) => STATUS_OPTIONS.find(opt => opt.value === status) || STATUS_OPTIONS[0];

const StatusDropdown: React.FC<{ status: OrderStatus, isUpdating?: boolean, onUpdate: (status: OrderStatus) => void }> = ({ status, isUpdating, onUpdate }) => {
    const [isOpen, setIsOpen] = useState(false);
    const config = getStatusConfig(status);

    return (
        <div className="relative inline-block text-left">
            <button type="button" disabled={isUpdating} onClick={() => setIsOpen(!isOpen)}
                className={cn("px-3 py-1.5 flex items-center gap-2 text-[10px] uppercase font-black rounded-full border", isUpdating ? "opacity-50 cursor-not-allowed" : config.color, !isUpdating && "hover:scale-105")}>
                {isUpdating ? <Loader2 size={12} className="animate-spin" /> : config.label}
                {!isUpdating && <ChevronDown size={12} />}
            </button>
            {isOpen && !isUpdating && (
                 <div className="absolute left-0 mt-2 w-48 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-[70]">
                    {STATUS_OPTIONS.map(opt => (
                        <button key={opt.value} type="button" onClick={() => { onUpdate(opt.value); setIsOpen(false); }}
                            className="w-full text-left px-4 py-3 text-[10px] font-black uppercase hover:bg-slate-800">
                            {opt.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

const OrdersPage: React.FC = () => {
    const { user } = useAuth();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
    const [isMuted, setIsMuted] = useState(true);
    const [toast, setToast] = useState<{ show: boolean; id: string | null } | null>(null);
    const [errorToast, setErrorToast] = useState<string | null>(null);
    const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const fetchOrders = useCallback(async (restaurantId: string) => {
        const { data, error } = await supabase.from('orders').select('*').eq('restaurant_id', restaurantId).order('created_at', { ascending: false });
        if (data) setOrders(data);
        if (error) {
            console.error('[Orders] Fetch error:', error);
            setErrorToast(`Failed to sync orders: ${error.message}`);
        }
    }, []);

    useEffect(() => { audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'); }, []);

    useEffect(() => {
        if (!user) return;
        setLoading(true);
        supabase.from('restaurants').select('id').eq('owner_id', user.id).maybeSingle().then(({ data: restData }) => {
            if (restData) {
                setRestaurant(restData as Restaurant);
                fetchOrders(restData.id).finally(() => setLoading(false));
            } else {
                setLoading(false);
            }
        });
    }, [user, fetchOrders]);

    useEffect(() => {
        if (!restaurant) return;
        const channel = supabase.channel(`orders-live-hub-${restaurant.id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurant.id}` }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    if (!isMuted && audioRef.current) audioRef.current.play().catch(e => console.error(e));
                    setToast({ show: true, id: payload.new.id });
                }
                fetchOrders(restaurant.id);
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); }
    }, [restaurant, fetchOrders, isMuted]);

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [toast]);
    
    useEffect(() => {
        if (errorToast) {
            const timer = setTimeout(() => setErrorToast(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [errorToast]);


    const handleStatusUpdate = async (id: string, status: OrderStatus) => {
        setUpdatingOrderId(id);
        setErrorToast(null);
        try {
            const { error } = await supabase.from('orders').update({ status }).eq('id', id);
            if (error) throw error;
            // The UI will update automatically from the realtime subscription, no need to set state here.
        } catch (err: any) {
            console.error('[Orders] Update Error:', err);
            setErrorToast(`Status update failed: ${err.message}`);
        } finally {
            setUpdatingOrderId(null);
        }
    };
    
    if (loading) return <div className="text-center p-12">Loading Live Logistics...</div>;

    return (
        <div className="space-y-6 relative">
            {toast?.show && (
                <div className="fixed top-24 right-8 z-[100] bg-indigo-600/90 backdrop-blur-sm border border-indigo-400/50 text-white p-4 rounded-2xl shadow-2xl shadow-indigo-500/30 flex items-center gap-4 animate-in slide-in-from-right-full">
                    <BellRing className="text-emerald-400 animate-bounce" size={24} />
                    <div>
                        <p className="font-black">New Order Received!</p>
                        <p className="text-xs">Order #{toast.id?.substring(0, 8).toUpperCase()}</p>
                    </div>
                </div>
            )}
            {errorToast && (
                <div className="fixed top-24 right-8 z-[100] bg-red-600/90 backdrop-blur-sm border border-red-400/50 text-white p-4 rounded-2xl shadow-2xl shadow-red-500/30 flex items-start gap-4 animate-in slide-in-from-right-full">
                    <AlertTriangle className="flex-shrink-0 mt-1" />
                    <div>
                        <p className="font-black text-sm uppercase tracking-wider">Operation Failed</p>
                        <p className="text-xs text-white/80 mt-1">{errorToast}</p>
                    </div>
                    <button onClick={() => setErrorToast(null)} className="p-1 -mt-2 -mr-2 text-white/70 hover:text-white"><X size={16} /></button>
                </div>
            )}
            <div className="flex justify-between items-center">
                <h1 className="text-4xl font-black text-white tracking-tighter">Live <span className="text-emerald-500">Orders</span></h1>
                <button onClick={() => setIsMuted(!isMuted)} className={cn("flex items-center gap-2 text-[10px] font-black uppercase px-4 py-2 rounded-full border", isMuted ? "bg-slate-800 border-slate-700 text-slate-500" : "bg-indigo-600/10 border-indigo-500/30 text-indigo-400 shadow-glow-indigo")}>
                    {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />} Audio Alert
                </button>
            </div>

            <div className="bg-slate-900/40 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                <table className="min-w-full divide-y divide-white/5">
                    <thead className="bg-slate-800/50"><tr className="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <th className="px-6 py-5">Order ID</th><th className="px-6 py-5">Customer</th><th className="px-6 py-5">Amount</th><th className="px-6 py-5">Status</th>
                    </tr></thead>
                    <tbody className="divide-y divide-white/5">
                        {orders.map((order) => (
                            <tr key={order.id} className="hover:bg-white/[0.02]">
                                <td className="px-6 py-4 font-mono text-xs text-slate-400">#{order.id.substring(0, 8).toUpperCase()}</td>
                                <td className="px-6 py-4 text-sm font-black text-white">{order.customer_name}</td>
                                <td className="px-6 py-4 text-sm font-black text-emerald-400">₹{Number(order.total_amount).toFixed(2)}</td>
                                <td className="px-6 py-4">
                                    <StatusDropdown status={order.status} isUpdating={updatingOrderId === order.id} onUpdate={(s) => handleStatusUpdate(order.id, s)} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                 {orders.length === 0 && <div className="py-24 text-center text-slate-500 font-black uppercase text-xs tracking-widest">No Active Logistics Found.</div>}
            </div>
        </div>
    );
};

export default OrdersPage;
