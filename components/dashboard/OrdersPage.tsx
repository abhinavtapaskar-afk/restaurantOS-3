
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Order, OrderStatus, Restaurant } from '../../types';
import { cn, safeParse } from '../../lib/utils';
import Modal from '../ui/Modal';
import { Eye, MapPin, Phone, Navigation, ShoppingCart, Banknote, CreditCard, ChevronDown } from 'lucide-react';

// Hardcoded status array for guaranteed availability
const STATUS_OPTIONS: { value: OrderStatus; label: string; color: string }[] = [
    { value: 'pending', label: 'Pending', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
    { value: 'confirmed', label: 'Confirmed', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
    { value: 'preparing', label: 'Preparing', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
    { value: 'out_for_delivery', label: 'Out for Delivery', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
    { value: 'delivered', label: 'Delivered', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
    { value: 'cancelled', label: 'Cancelled', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
];

const getStatusConfig = (status: OrderStatus) => STATUS_OPTIONS.find(opt => opt.value === status) || STATUS_OPTIONS[0];

const StatusDropdown: React.FC<{ status: OrderStatus, onUpdate: (status: OrderStatus) => void }> = ({ status, onUpdate }) => {
    const [isOpen, setIsOpen] = useState(false);
    const config = getStatusConfig(status);

    return (
        <div className="relative">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={cn("px-3 py-1 inline-flex items-center gap-2 text-[10px] uppercase font-bold rounded-full border transition-all", config.color)}
            >
                {config.label}
                <ChevronDown size={12} />
            </button>
            {isOpen && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
                    <div className="absolute right-0 mt-2 w-48 bg-slate-900 border border-slate-700 rounded-md shadow-xl z-20 overflow-hidden">
                        {STATUS_OPTIONS.map((opt) => (
                            <button
                                key={opt.value}
                                onClick={() => {
                                    onUpdate(opt.value);
                                    setIsOpen(false);
                                }}
                                className={cn(
                                    "w-full text-left px-4 py-3 text-[10px] font-bold uppercase hover:bg-slate-800 transition-colors border-b border-slate-800 last:border-0",
                                    status === opt.value ? "text-emerald-400 bg-emerald-500/5" : "text-slate-400"
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

const OrderDetailsModal: React.FC<{ order: Order, onClose: () => void, onStatusUpdate: (status: OrderStatus) => void }> = ({ order, onClose, onStatusUpdate }) => {
    const mapsUrl = order?.latitude && order?.longitude 
        ? `https://www.google.com/maps/search/?api=1&query=${order.latitude},${order.longitude}`
        : null;
    
    const orderItems = safeParse<any[]>(order.order_details || order.items, []);

    return (
        <Modal isOpen={!!order} onClose={onClose} title={`Order: ${order?.id?.substring(0, 8).toUpperCase()}`}>
            <div className="space-y-6">
                <div className="flex justify-between items-start">
                    <h4 className="font-semibold text-emerald-400 mb-2">Customer Info</h4>
                    <StatusDropdown status={order.status} onUpdate={onStatusUpdate} />
                </div>
                
                <div className="space-y-2 text-sm">
                    <p className="flex items-center gap-2"><span className="text-slate-500 w-16">Name:</span> <span className="text-white">{order?.customer_name}</span></p>
                    <p className="flex items-center gap-2">
                        <span className="text-slate-500 w-16">Phone:</span> 
                        <a href={`tel:${order?.customer_phone}`} className="text-emerald-400 hover:underline flex items-center gap-1 font-bold">
                            <Phone size={14} /> {order?.customer_phone}
                        </a>
                    </p>
                    <p className="flex items-start gap-2">
                        <span className="text-slate-500 w-16 mt-0.5">Address:</span> 
                        <span className="text-white flex-1">{order?.customer_address || 'No address notes'}</span>
                    </p>
                    <p className="flex items-center gap-2">
                        <span className="text-slate-500 w-16">Payment:</span> 
                        <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase border", order?.payment_method === 'UPI' ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : "bg-orange-500/10 text-orange-400 border-orange-500/20")}>
                            {order?.payment_method || 'COD'}
                        </span>
                    </p>
                </div>

                {mapsUrl && (
                    <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-slate-400 font-bold uppercase mb-1">Logistics Location</p>
                                <p className="text-[10px] text-slate-500">Coordinates: {order?.latitude}, {order?.longitude}</p>
                            </div>
                            <a 
                                href={mapsUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2 px-4 rounded-md transition-colors shadow-lg"
                            >
                                <Navigation size={14} />
                                Navigate
                            </a>
                        </div>
                    </div>
                )}

                <div>
                    <h4 className="font-semibold text-emerald-400 mb-2">Items</h4>
                    {orderItems.length > 0 ? (
                        <ul className="divide-y divide-slate-800">
                        {orderItems.map((item: any, index: number) => (
                            <li key={item?.id || index} className="py-2 flex justify-between items-center text-sm">
                                <span className="text-slate-300 font-medium">{item?.quantity || 1} x {item?.name || 'Item'}</span>
                                <span className="text-white">₹{((Number(item?.price) || 0) * (Number(item?.quantity) || 1)).toFixed(2)}</span>
                            </li>
                        ))}
                        </ul>
                    ) : (
                        <p className="text-slate-400 text-sm text-center py-4 italic">No items found.</p>
                    )}
                    <div className="flex justify-between font-bold text-lg mt-4 pt-4 border-t border-slate-700 text-emerald-400">
                        <span>Total Amount</span>
                        <span>₹{Number(order?.total_amount).toFixed(2)}</span>
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

    const fetchOrders = useCallback(async (restaurantId: string) => {
        try {
            const { data, error } = await supabase
                .from('orders')
                .select('*')
                .eq('restaurant_id', restaurantId)
                .order('created_at', { ascending: false })
                .limit(20);

            if (error) throw error;
            if (data) setOrders(data);
        } catch (err) {
            console.error('[OrdersPage] Error:', err);
        } finally {
            setLoading(false);
        }
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
        const channel = supabase.channel(`orders-live-sync-${restaurant.id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurant.id}` }, () => {
                fetchOrders(restaurant.id);
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); }
    }, [restaurant, fetchOrders]);

    const updateStatus = async (id: string, status: OrderStatus) => {
        setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
        if (selectedOrder && selectedOrder.id === id) {
            setSelectedOrder({ ...selectedOrder, status });
        }
        
        try {
            const { error } = await supabase.from('orders').update({ status }).eq('id', id);
            if (error) throw error;
        } catch (err) {
            console.error('[OrdersPage] Status update failed:', err);
            fetchOrders(restaurant?.id || '');
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-400">Syncing with server...</div>

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-white">Live Orders</h1>
                <div className="flex items-center gap-2 text-xs font-bold uppercase bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full border border-emerald-500/20">
                    <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span></span>
                    Real-time
                </div>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-700">
                        <thead className="bg-slate-800/80">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">ID</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Customer</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Total</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Pay Mode</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {orders.map((order) => (
                                <tr key={order.id} className="hover:bg-slate-800/40 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-mono text-slate-400">#{order.id.substring(0, 8).toUpperCase()}</div>
                                        <div className="text-[10px] text-slate-500">{new Date(order.created_at).toLocaleTimeString()}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-bold text-white">{order.customer_name || 'Guest'}</div>
                                        <div className="text-xs text-slate-500">{order.customer_phone}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-emerald-400">₹{Number(order.total_amount).toFixed(2)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {order.payment_method === 'UPI' ? (
                                            <span className="text-blue-400 flex items-center gap-1 text-[10px] font-bold uppercase"><CreditCard size={12} /> UPI</span>
                                        ) : (
                                            <span className="text-orange-400 flex items-center gap-1 text-[10px] font-bold uppercase"><Banknote size={12} /> COD</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <StatusDropdown 
                                            status={order.status} 
                                            onUpdate={(newStatus) => updateStatus(order.id, newStatus)} 
                                        />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                       <div className="flex justify-end gap-2">
                                            <button onClick={() => setSelectedOrder(order)} className="text-slate-400 hover:text-white p-2 rounded-md hover:bg-slate-700 transition-colors"><Eye size={18} /></button>
                                       </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                     {orders.length === 0 && (
                        <div className="text-center py-24 text-slate-500 flex flex-col items-center gap-4">
                            <ShoppingCart className="w-12 h-12 opacity-20" />
                            <p className="text-lg font-medium">No live orders yet.</p>
                        </div>
                    )}
                </div>
            </div>
            {selectedOrder && (
                <OrderDetailsModal 
                    order={selectedOrder} 
                    onClose={() => setSelectedOrder(null)} 
                    onStatusUpdate={(newStatus) => updateStatus(selectedOrder.id, newStatus)}
                />
            )}
        </div>
    );
};

export default OrdersPage;
