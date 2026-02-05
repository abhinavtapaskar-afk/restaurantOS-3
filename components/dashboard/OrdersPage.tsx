
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Order, OrderStatus, Restaurant } from '../../types';
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
    X
} from 'lucide-react';

const STATUS_OPTIONS: { value: OrderStatus; label: string; color: string }[] = [
    { value: 'pending', label: 'Pending', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
    { value: 'confirmed', label: 'Confirmed', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
    { value: 'preparing', label: 'Preparing', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
    { value: 'out_for_delivery', label: 'Out for Delivery', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
    { value: 'delivered', label: 'Delivered', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
    { value: 'cancelled', label: 'Cancelled', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
];

const getStatusConfig = (status: OrderStatus) => {
    return STATUS_OPTIONS.find(opt => opt.value === status) || STATUS_OPTIONS[0];
};

const TableBadge: React.FC<{ number: number }> = ({ number }) => (
    <div className="flex items-center gap-1.5 bg-indigo-600 text-cyan-100 px-2.5 py-1 rounded-lg shadow-lg border border-indigo-400/30">
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
                {isUpdating ? <RefreshCw size={12} className="animate-spin" /> : config.label}
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
    const mapsUrl = order?.latitude && order?.longitude 
        ? `https://www.google.com/maps/search/?api=1&query=${order.latitude},${order.longitude}`
        : null;
    
    const orderItems = safeParse<any[]>(order.order_details || order.items, []);

    return (
        <Modal isOpen={!!order} onClose={onClose} title={`Order: ${order?.id?.substring(0, 8).toUpperCase()}`}>
            <div className="space-y-6">
                <div className="flex justify-between items-start">
                    <div className="flex flex-col gap-2">
                        <h4 className="font-black text-[10px] uppercase tracking-widest text-slate-500 mb-1">Status Control</h4>
                        <div className="flex items-center gap-3">
                            <StatusDropdown status={order.status} isUpdating={isUpdating} onUpdate={onStatusUpdate} />
                            {order.table_number && <TableBadge number={order.table_number} />}
                        </div>
                    </div>
                    <div className="text-right">
                         <h4 className="font-black text-[10px] uppercase tracking-widest text-slate-500 mb-1">Order Time</h4>
                         <p className="text-white text-xs font-bold">{new Date(order.created_at).toLocaleString()}</p>
                    </div>
                </div>
                
                <div className="space-y-3 bg-slate-950/50 p-4 rounded-xl border border-white/5 text-sm">
                    <p className="flex items-center gap-2"><span className="text-slate-500 w-16 font-bold uppercase text-[10px]">Name:</span> <span className="text-white font-medium">{order?.customer_name}</span></p>
                    <p className="flex items-center gap-2">
                        <span className="text-slate-500 w-16 font-bold uppercase text-[10px]">Phone:</span> 
                        <a href={`tel:${order?.customer_phone}`} className="text-emerald-400 hover:underline flex items-center gap-1 font-black">
                            <Phone size={14} /> {order?.customer_phone}
                        </a>
                    </p>
                    <p className="flex items-start gap-2">
                        <span className="text-slate-500 w-16 font-bold uppercase text-[10px] mt-0.5">Note:</span> 
                        <span className="text-white flex-1 font-medium">{order?.customer_address || 'No notes provided'}</span>
                    </p>
                    <p className="flex items-center gap-2">
                        <span className="text-slate-500 w-16 font-bold uppercase text-[10px]">Payment:</span> 
                        <span className={cn("px-2 py-0.5 rounded text-[10px] font-black uppercase border", order?.payment_method === 'UPI' ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : "bg-orange-500/10 text-orange-400 border-orange-500/20")}>
                            {order?.payment_method || 'COD'}
                        </span>
                    </p>
                </div>

                {!order.table_number && mapsUrl && (
                    <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Dispatch Map</p>
                                <p className="text-[10px] text-slate-500 font-mono">LAT: {order?.latitude}, LNG: {order?.longitude}</p>
                            </div>
                            <a 
                                href={mapsUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase py-2.5 px-5 rounded-lg transition-all shadow-glow-emerald"
                            >
                                <Navigation size={14} />
                                Start Route
                            </a>
                        </div>
                    </div>
                )}

                <div>
                    <h4 className="font-black text-[10px] uppercase tracking-widest text-slate-500 mb-4 border-b border-white/5 pb-2">Items Breakdown</h4>
                    {orderItems.length > 0 ? (
                        <ul className="divide-y divide-white/5">
                        {orderItems.map((item: any, index: number) => (
                            <li key={item?.id || index} className="py-3 flex justify-between items-center text-sm">
                                <span className="text-slate-300 font-bold">{item?.quantity || 1} x <span className="text-white">{item?.name || 'Item'}</span></span>
                                <span className="text-emerald-400 font-black">₹{((Number(item?.price) || 0) * (Number(item?.quantity) || 1)).toFixed(2)}</span>
                            </li>
                        ))}
                        </ul>
                    ) : (
                        <p className="text-slate-500 text-sm text-center py-4 italic">No items recorded.</p>
                    )}
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
    const [isSyncing, setIsSyncing] = useState(false);
    const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
    
    // Notifications State
    const [isMuted, setIsMuted] = useState(true);
    const [toast, setToast] = useState<{ show: boolean; id: string | null } | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const fetchOrders = useCallback(async (restaurantId: string, silent = false) => {
        if (!silent) setLoading(true);
        else setIsSyncing(true);
        
        try {
            const { data, error } = await supabase
                .from('orders')
                .select('*')
                .eq('restaurant_id', restaurantId)
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;
            if (data) setOrders(data);
        } catch (err) {
            console.error('[OrdersPage] Fetch Error:', err);
        } finally {
            setLoading(false);
            setIsSyncing(false);
        }
    }, []);

    // Initialize Audio
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
        const channel = supabase.channel(`orders-live-hub-${restaurant.id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurant.id}` }, (payload) => {
                console.log('[OrdersPage] Realtime change detected:', payload.eventType);
                
                // If brand new order arrives
                if (payload.eventType === 'INSERT') {
                    // Trigger Audio
                    if (!isMuted && audioRef.current) {
                        audioRef.current.currentTime = 0;
                        audioRef.current.play().catch(e => console.error('[Audio] Play blocked:', e));
                    }
                    // Trigger Visual Toast
                    setToast({ show: true, id: payload.new.id });
                    setTimeout(() => setToast(null), 5000);
                }

                fetchOrders(restaurant.id, true);
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); }
    }, [restaurant, fetchOrders, isMuted]);

    const handleStatusUpdate = async (id: string, status: OrderStatus) => {
        setUpdatingOrderId(id);
        const previousOrders = [...orders];
        setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
        if (selectedOrder && selectedOrder.id === id) {
            setSelectedOrder({ ...selectedOrder, status });
        }
        
        try {
            const { error } = await supabase.from('orders').update({ status }).eq('id', id);
            if (error) throw error;
        } catch (err: any) {
            setOrders(previousOrders);
            if (selectedOrder && selectedOrder.id === id) {
                const prev = previousOrders.find(o => o.id === id);
                if (prev) setSelectedOrder(prev);
            }
        } finally {
            setUpdatingOrderId(null);
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-64 text-slate-500 font-black uppercase tracking-widest animate-pulse">
            <RefreshCw size={32} className="animate-spin mb-4" />
            Syncing Live Orders...
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 relative">
            
            {/* NEW ORDER TOAST (Electric Indigo) */}
            {toast?.show && (
                <div className="fixed top-24 right-8 z-[100] animate-in slide-in-from-right-full duration-500">
                    <div className="bg-[#4f46e5] border-2 border-indigo-400/30 text-white p-4 rounded-2xl shadow-2xl flex items-center gap-4 min-w-[300px] relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-1 h-full bg-emerald-400 animate-pulse" />
                        <div className="bg-white/10 p-3 rounded-xl">
                            <BellRing className="text-emerald-400 animate-bounce" size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-70">New Activity Landing</p>
                            <h4 className="text-sm font-black uppercase tracking-tight">Order #{toast.id?.substring(0, 8).toUpperCase()} Received!</h4>
                        </div>
                        <button onClick={() => setToast(null)} className="ml-auto text-white/50 hover:text-white transition-colors">
                            <X size={16} />
                        </button>
                    </div>
                </div>
            )}

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tighter">Live <span className="text-emerald-500 underline decoration-emerald-500/20">Orders</span></h1>
                    <p className="text-slate-500 font-bold text-xs uppercase tracking-[0.2em] mt-1">Real-time logistics control</p>
                </div>
                <div className="flex items-center gap-3">
                    {/* Audio Toggle Control */}
                    <button 
                        onClick={() => setIsMuted(!isMuted)}
                        className={cn(
                            "flex items-center gap-2 text-[10px] font-black uppercase px-4 py-2 rounded-full transition-all border",
                            isMuted ? "bg-slate-800 border-slate-700 text-slate-500 hover:text-white" : "bg-indigo-600/10 border-indigo-500/30 text-indigo-400 shadow-glow-indigo"
                        )}
                    >
                        {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} className="animate-pulse" />}
                        {isMuted ? 'Sound Off' : 'Alerts Active'}
                    </button>

                    {isSyncing && (
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase text-emerald-500 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                            <RefreshCw size={12} className="animate-spin" /> Live Syncing
                        </div>
                    )}
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase bg-emerald-600 text-white px-4 py-2 rounded-full shadow-glow-emerald">
                        <CheckCircle2 size={12} className="text-white" />
                        System Online
                    </div>
                </div>
            </div>

            <div className="bg-slate-900/40 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-white/5">
                        <thead className="bg-slate-800/50">
                            <tr>
                                <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">ID / Timestamp</th>
                                <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer Details</th>
                                <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Financials</th>
                                <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Payment</th>
                                <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Workflow Status</th>
                                <th className="px-6 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {orders.map((order) => (
                                <tr key={order.id} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-3">
                                            <div>
                                                <div className="text-xs font-mono font-bold text-slate-400">#{order.id.substring(0, 8).toUpperCase()}</div>
                                                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter mt-1">{new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                            </div>
                                            {order.table_number && <TableBadge number={order.table_number} />}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-black text-white">{order.customer_name || 'Guest User'}</div>
                                        <div className="text-[10px] text-slate-500 font-bold">{order.customer_phone}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-black text-emerald-400">₹{Number(order.total_amount).toFixed(2)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {order.payment_method === 'UPI' ? (
                                            <span className="text-sky-400 flex items-center gap-1.5 text-[10px] font-black uppercase bg-sky-400/10 px-2 py-1 rounded border border-sky-400/20"><CreditCard size={12} /> Digital</span>
                                        ) : (
                                            <span className="text-amber-400 flex items-center gap-1.5 text-[10px] font-black uppercase bg-amber-400/10 px-2 py-1 rounded border border-amber-400/20"><Banknote size={12} /> Cash</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <StatusDropdown 
                                            status={order.status} 
                                            isUpdating={updatingOrderId === order.id}
                                            onUpdate={(newStatus) => handleStatusUpdate(order.id, newStatus)} 
                                        />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                       <div className="flex justify-end gap-2">
                                            <button 
                                                onClick={() => setSelectedOrder(order)} 
                                                className="text-slate-400 hover:text-white p-2.5 rounded-xl hover:bg-white/5 transition-all active:scale-90"
                                                title="View Details"
                                            >
                                                <Eye size={18} />
                                            </button>
                                       </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                     {orders.length === 0 && (
                        <div className="text-center py-24 text-slate-500 flex flex-col items-center gap-4 animate-in fade-in duration-1000">
                            <ShoppingCart className="w-16 h-16 opacity-10" />
                            <div>
                                <p className="text-lg font-black text-white uppercase tracking-widest">No Active Orders</p>
                                <p className="text-xs font-bold text-slate-600 mt-1 uppercase tracking-wider">Awaiting your first customer from Nanded...</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            
            {selectedOrder && (
                <OrderDetailsModal 
                    order={selectedOrder} 
                    isUpdating={updatingOrderId === selectedOrder.id}
                    onClose={() => setSelectedOrder(null)} 
                    onStatusUpdate={(newStatus) => handleStatusUpdate(selectedOrder.id, newStatus)}
                />
            )}
        </div>
    );
};

export default OrdersPage;
