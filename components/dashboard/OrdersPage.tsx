
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';
// Fix: Import CartItem from types
import { Order, OrderStatus, Restaurant, MenuItem, CartItem } from '../../types';
import { cn, safeParse } from '../../lib/utils';
import Modal from '../ui/Modal';
import { 
    Eye, 
    MapPin, 
    Phone, 
    Navigation, 
    ShoppingCart, 
    Banknote, 
    CreditCard, 
    ChevronDown, 
    RefreshCw, 
    CheckCircle2, 
    Zap,
    Volume2,
    VolumeX,
    BellRing,
    X,
    Loader2
} from 'lucide-react';

const STATUS_OPTIONS: { value: OrderStatus; label: string; color: string }[] = [
    { value: 'pending', label: 'Pending', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
    { value: 'confirmed', label: 'Confirmed', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
    { value: 'preparing', label: 'Preparing', color: 'bg-[#4f46e5]/10 text-indigo-400 border-[#4f46e5]/20 shadow-glow-indigo' },
    { value: 'out_for_delivery', label: 'Out for Delivery', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
    { value: 'delivered', label: 'Delivered', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
    { value: 'cancelled', label: 'Cancelled', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
];

const getStatusConfig = (status: OrderStatus) => {
    return STATUS_OPTIONS.find(opt => opt.value === status) || STATUS_OPTIONS[0];
};

const TableBadge: React.FC<{ number: number }> = ({ number }) => (
    <div className="flex items-center gap-1.5 bg-[#4f46e5] text-cyan-100 px-2.5 py-1 rounded-lg shadow-lg border border-indigo-400/30">
        <Zap size={10} className="fill-cyan-100" />
        <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">Table {number.toString().padStart(2, '0')}</span>
    </div>
);

const StatusDropdown: React.FC<{ status: OrderStatus, isUpdating?: boolean, onUpdate: (status: OrderStatus) => void }> = ({ status, isUpdating, onUpdate }) => {
    const [isOpen, setIsOpen] = useState(false);
    const config = getStatusConfig(status);

    return (
        <div className="relative inline-block text-left">
            <button 
                type="button"
                disabled={isUpdating}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsOpen(!isOpen); }}
                className={cn(
                    "px-3 py-1.5 inline-flex items-center gap-2 text-[10px] uppercase font-black rounded-full border transition-all",
                    isUpdating ? "opacity-50 cursor-not-allowed bg-slate-800 border-slate-700 text-slate-500" : config.color,
                    !isUpdating && "hover:scale-105 active:scale-95"
                )}
            >
                {isUpdating ? <Loader2 size={12} className="animate-spin" /> : config.label}
                {!isUpdating && <ChevronDown size={12} className={cn("transition-transform", isOpen ? "rotate-180" : "")} />}
            </button>
            {isOpen && !isUpdating && (
                <>
                    <div className="fixed inset-0 z-[60]" onClick={() => setIsOpen(false)} />
                    <div className="absolute left-0 mt-2 w-48 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-[70] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        {STATUS_OPTIONS.map((opt) => (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onUpdate(opt.value);
                                    setIsOpen(false);
                                }}
                                className={cn(
                                    "w-full text-left px-4 py-3 text-[10px] font-black uppercase hover:bg-slate-800 transition-colors border-b border-slate-800 last:border-0",
                                    status === opt.value ? "text-emerald-400 bg-emerald-500/5" : "text-slate-500"
                                )}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

const OrderDetailsModal: React.FC<{ order: Order, isUpdating: boolean, onClose: () => void, onStatusUpdate: (status: OrderStatus) => void }> = ({ order, isUpdating, onClose, onStatusUpdate }) => {
    const orderItems = safeParse<any[]>(order.order_details || order.items, []);
    return (
        <Modal isOpen={!!order} onClose={onClose} title={`Order: ${order?.id?.substring(0, 8).toUpperCase()}`}>
            <div className="space-y-6">
                <div className="flex justify-between items-start">
                    <div className="flex flex-col gap-2">
                        <h4 className="font-black text-[10px] uppercase tracking-widest text-slate-500 mb-1">Kitchen Status</h4>
                        <div className="flex items-center gap-3">
                            <StatusDropdown status={order.status} isUpdating={isUpdating} onUpdate={onStatusUpdate} />
                            {order.table_number && <TableBadge number={order.table_number} />}
                        </div>
                    </div>
                </div>
                
                <div className="space-y-3 bg-slate-950/50 p-4 rounded-xl border border-white/5 text-sm">
                    <p className="flex items-center gap-2 font-bold"><span className="text-slate-500 w-16 uppercase text-[10px]">Client:</span> <span className="text-white">{order?.customer_name}</span></p>
                    <p className="flex items-center gap-2 font-bold"><span className="text-slate-500 w-16 uppercase text-[10px]">Method:</span> <span className="text-indigo-400">{order?.payment_method}</span></p>
                </div>

                <div>
                    <h4 className="font-black text-[10px] uppercase tracking-widest text-slate-500 mb-4 border-b border-white/5 pb-2">Line Items</h4>
                    <ul className="divide-y divide-white/5">
                        {orderItems.map((item: any, index: number) => (
                            <li key={index} className="py-3 flex justify-between items-center text-sm">
                                <span className="text-slate-300 font-bold">{item?.quantity || 1} x <span className="text-white">{item?.name}</span></span>
                                <span className="text-emerald-400 font-black">₹{((item?.price || 0) * (item?.quantity || 1)).toFixed(2)}</span>
                            </li>
                        ))}
                    </ul>
                    <div className="flex justify-between font-black text-xl mt-4 pt-6 border-t border-slate-700 text-white">
                        <span className="text-slate-500 text-xs uppercase tracking-widest self-center">Grand Total</span>
                        <span className="text-emerald-500">₹{Number(order?.total_amount).toFixed(2)}</span>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

const OrdersPage: React.FC = () => {
    const { user } = useAuth();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [isMuted, setIsMuted] = useState(true);
    const [toast, setToast] = useState<{ show: boolean; id: string | null } | null>(null);
    const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const fetchOrders = useCallback(async (restaurantId: string, silent = false) => {
        if (!silent) setLoading(true);
        const { data } = await supabase.from('orders').select('*').eq('restaurant_id', restaurantId).order('created_at', { ascending: false }).limit(50);
        if (data) setOrders(data);
        setLoading(false);
    }, []);

    useEffect(() => {
        audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    }, []);

    useEffect(() => {
        if (!user) return;
        const init = async () => {
            const { data } = await supabase.from('restaurants').select('id').eq('owner_id', user.id).maybeSingle();
            if (data) {
                setRestaurant(data as Restaurant);
                fetchOrders(data.id);
            } else setLoading(false);
        };
        init();
    }, [user, fetchOrders]);

    useEffect(() => {
        if (!restaurant) return;
        const channel = supabase.channel(`live-orders-${restaurant.id}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurant.id}` }, (payload) => {
                if (!isMuted && audioRef.current) audioRef.current.play().catch(() => {});
                setToast({ show: true, id: payload.new.id });
                setTimeout(() => setToast(null), 5000);
                fetchOrders(restaurant.id, true);
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurant.id}` }, () => {
                fetchOrders(restaurant.id, true);
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); }
    }, [restaurant, fetchOrders, isMuted]);

    const deductInventory = async (order: Order) => {
        console.log('[Mystic Wardrobe] Executing Ghost Deduct for order:', order.id);
        // Fix: Cast parsed data to CartItem[] to ensure quantity property is accessible
        const items = safeParse<CartItem[]>(order.order_details || order.items, []);
        
        for (const item of items) {
            // Fetch recipe for each item
            const { data: recipe } = await supabase
                .from('recipe_items')
                .select('*, ingredient:ingredients(*)')
                .eq('menu_item_id', item.id);
            
            if (!recipe) continue;

            for (const ri of recipe) {
                if (!ri.ingredient) continue;
                const qtyToDeduct = ri.quantity * (item.quantity || 1);
                const newStock = ri.ingredient.current_stock - qtyToDeduct;
                
                await supabase
                    .from('ingredients')
                    .update({ current_stock: Math.max(0, newStock) })
                    .eq('id', ri.ingredient_id);
                
                console.log(`[Inventory] Deducted ${qtyToDeduct}${ri.ingredient.unit} of ${ri.ingredient.name}`);
            }
        }
    };

    const handleStatusUpdate = async (id: string, status: OrderStatus) => {
        const order = orders.find(o => o.id === id);
        if (!order) return;

        setUpdatingOrderId(id);
        try {
            // Trigger Ghost Deduct when moved to 'preparing'
            if (status === 'preparing' && order.status !== 'preparing') {
                await deductInventory(order);
            }

            const { error } = await supabase.from('orders').update({ status }).eq('id', id);
            if (error) throw error;
            
            setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
            if (selectedOrder?.id === id) setSelectedOrder(prev => prev ? { ...prev, status } : null);
        } catch (err) {
            console.error('[Orders] Update Error:', err);
        } finally {
            setUpdatingOrderId(null);
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-64 text-slate-500 font-black uppercase tracking-widest animate-pulse">
            <RefreshCw size={32} className="animate-spin mb-4" />
            Synchronizing Log...
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 relative">
            {toast?.show && (
                <div className="fixed top-24 right-8 z-[100] animate-in slide-in-from-right-full">
                    <div className="bg-[#4f46e5] border-2 border-indigo-400/30 text-white p-4 rounded-2xl shadow-2xl flex items-center gap-4 min-w-[300px]">
                        <BellRing className="text-emerald-400 animate-bounce" size={24} />
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Activity Detected</p>
                            <h4 className="text-sm font-black uppercase tracking-tight">Order #{toast.id?.substring(0, 8).toUpperCase()} Received!</h4>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tighter">Live <span className="text-emerald-500 underline decoration-emerald-500/20">Logistics</span></h1>
                    <p className="text-slate-500 font-bold text-xs uppercase tracking-[0.2em] mt-1">Real-time command center</p>
                </div>
                <button 
                    onClick={() => setIsMuted(!isMuted)}
                    className={cn(
                        "flex items-center gap-2 text-[10px] font-black uppercase px-4 py-2 rounded-full transition-all border",
                        isMuted ? "bg-slate-800 border-slate-700 text-slate-500" : "bg-indigo-600/10 border-indigo-500/30 text-indigo-400 shadow-glow-indigo"
                    )}
                >
                    {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} className="animate-pulse" />}
                    {isMuted ? 'Muted' : 'Audio Active'}
                </button>
            </div>

            <div className="bg-slate-900/40 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                <table className="min-w-full divide-y divide-white/5">
                    <thead className="bg-slate-800/50">
                        <tr>
                            <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Order Info</th>
                            <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Client</th>
                            <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Financials</th>
                            <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Workflow Status</th>
                            <th className="px-6 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Inspect</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {orders.map((order) => (
                            <tr key={order.id} className="hover:bg-white/[0.02] transition-colors group">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center gap-3">
                                        <div className="text-xs font-mono font-bold text-slate-400">#{order.id.substring(0, 8).toUpperCase()}</div>
                                        {order.table_number && <TableBadge number={order.table_number} />}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-black text-white">{order.customer_name}</div>
                                    <div className="text-[10px] text-slate-500 font-bold">{order.customer_phone}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-black text-emerald-400">₹{Number(order.total_amount).toFixed(2)}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <StatusDropdown 
                                        status={order.status} 
                                        isUpdating={updatingOrderId === order.id}
                                        onUpdate={(s) => handleStatusUpdate(order.id, s)} 
                                    />
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                    <button onClick={() => setSelectedOrder(order)} className="text-slate-400 hover:text-white p-2.5 rounded-xl hover:bg-white/5 transition-all"><Eye size={18} /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {orders.length === 0 && <div className="py-24 text-center text-slate-500 font-black uppercase text-xs tracking-widest">No Active Logistics Found.</div>}
            </div>
            
            {selectedOrder && (
                <OrderDetailsModal 
                    order={selectedOrder} 
                    isUpdating={updatingOrderId === selectedOrder.id}
                    onClose={() => setSelectedOrder(null)} 
                    onStatusUpdate={(s) => handleStatusUpdate(selectedOrder.id, s)}
                />
            )}
        </div>
    );
};

export default OrdersPage;
