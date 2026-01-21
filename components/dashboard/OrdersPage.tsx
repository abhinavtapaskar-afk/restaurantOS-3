
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Order, OrderStatus, Restaurant } from '../../types';
import { cn } from '../../lib/utils';
import Modal from '../ui/Modal';
// Added ShoppingCart to the imports from lucide-react to fix "Cannot find name 'ShoppingCart'"
import { Eye, MapPin, Phone, Navigation, ShoppingCart } from 'lucide-react';

const getStatusClass = (status: OrderStatus) => {
    switch (status) {
        case 'pending': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
        case 'preparing': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
        case 'delivered': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
        case 'cancelled': return 'bg-red-500/10 text-red-400 border-red-500/20';
        default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
}

const OrderDetailsModal: React.FC<{ order: Order, onClose: () => void }> = ({ order, onClose }) => {
    const mapsUrl = order.customer_lat && order.customer_lng 
        ? `https://www.google.com/maps/search/?api=1&query=${order.customer_lat},${order.customer_lng}`
        : null;

    return (
        <Modal isOpen={!!order} onClose={onClose} title={`Order Details: ${order.id.substring(0, 8)}`}>
            <div className="space-y-6">
                <div>
                    <h4 className="font-semibold text-emerald-400 mb-2">Customer Details</h4>
                    <div className="space-y-2 text-sm">
                        <p className="flex items-center gap-2"><span className="text-slate-500 w-16">Name:</span> <span className="text-white">{order.customer_name}</span></p>
                        <p className="flex items-center gap-2">
                            <span className="text-slate-500 w-16">Phone:</span> 
                            <a href={`tel:${order.customer_phone}`} className="text-emerald-400 hover:underline flex items-center gap-1 font-bold">
                                <Phone size={14} /> {order.customer_phone}
                            </a>
                        </p>
                        <p className="flex items-start gap-2">
                            <span className="text-slate-500 w-16 mt-0.5">Address:</span> 
                            <span className="text-white flex-1">{order.customer_address}</span>
                        </p>
                    </div>
                </div>

                {mapsUrl && (
                    <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-slate-400 font-bold uppercase mb-1">Live Delivery Map</p>
                                <p className="text-xs text-slate-500">Precise customer coordinates captured</p>
                            </div>
                            <a 
                                href={mapsUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2 px-4 rounded-md transition-colors shadow-lg"
                            >
                                <Navigation size={14} />
                                Navigate to Customer
                            </a>
                        </div>
                    </div>
                )}

                <div>
                    <h4 className="font-semibold text-emerald-400 mb-2">Order Items</h4>
                    <ul className="divide-y divide-slate-800">
                    {(order.order_details || []).map((item, index) => (
                        <li key={index} className="py-2 flex justify-between items-center text-sm">
                            <span className="text-slate-300 font-medium">{item.quantity} x {item.name}</span>
                            <span className="text-white">₹{(item.price * item.quantity).toFixed(2)}</span>
                        </li>
                    ))}
                    </ul>
                    <div className="flex justify-between font-bold text-lg mt-4 pt-4 border-t border-slate-700 text-emerald-400">
                        <span>Grand Total</span>
                        <span>₹{order.total_amount}</span>
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
                .order('created_at', { ascending: false });

            if (error) throw error;
            if (data) setOrders(data);
        } catch (err) {
            console.error('[OrdersPage] Error fetching orders:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!user) return;
        const getRestaurantAndInitialOrders = async () => {
            try {
                const { data: restaurantData, error } = await supabase
                    .from('restaurants')
                    .select('id')
                    .eq('owner_id', user.id)
                    .maybeSingle();
                
                if (error) throw error;
                if (restaurantData) {
                    setRestaurant(restaurantData as Restaurant);
                    fetchOrders(restaurantData.id);
                } else {
                    setLoading(false);
                }
            } catch (err) {
                console.error('[OrdersPage] Error fetching restaurant:', err);
                setLoading(false);
            }
        };
        getRestaurantAndInitialOrders();
    }, [user, fetchOrders]);

    useEffect(() => {
        if (!restaurant) return;

        const channel = supabase.channel(`orders-${restaurant.id}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'orders',
                filter: `restaurant_id=eq.${restaurant.id}`
            },
            () => {
                fetchOrders(restaurant.id);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        }
    }, [restaurant, fetchOrders]);

    const updateStatus = async (id: string, status: OrderStatus) => {
        try {
            const { error } = await supabase.from('orders').update({ status }).eq('id', id);
            if (error) throw error;
            // State will update via real-time channel
        } catch (err) {
            console.error('[OrdersPage] Error updating status:', err);
            alert("Failed to update status. Check console for details.");
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-400">Loading live orders...</div>

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-white">Live Orders</h1>
                <div className="flex items-center gap-2 text-xs font-bold uppercase bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full border border-emerald-500/20">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    Live Dashboard
                </div>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-700">
                        <thead className="bg-slate-800/80">
                            <tr>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Order</th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Customer</th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Amount</th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Location</th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {orders.map((order) => (
                                <tr key={order.id} className="hover:bg-slate-800/40 transition-colors group">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-mono text-slate-400">#{order.id.substring(0, 8).toUpperCase()}</div>
                                        <div className="text-[10px] text-slate-500">{new Date(order.created_at).toLocaleTimeString()}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-bold text-white">{order.customer_name || 'Guest'}</div>
                                        <a href={`tel:${order.customer_phone}`} className="text-xs text-emerald-400 hover:underline">{order.customer_phone}</a>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-emerald-400">₹{order.total_amount}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {order.customer_lat ? (
                                            <span className="text-emerald-500 flex items-center gap-1 text-xs font-bold">
                                                <MapPin size={14} /> Smart Tracked
                                            </span>
                                        ) : (
                                            <span className="text-slate-600 flex items-center gap-1 text-xs">
                                                <MapPin size={14} /> Manual Address
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={cn("px-3 py-1 inline-flex text-[10px] uppercase font-bold rounded-full border", getStatusClass(order.status))}>
                                            {order.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                       <div className="flex justify-end gap-2">
                                            <button onClick={() => setSelectedOrder(order)} className="text-slate-400 hover:text-white p-2 rounded-md hover:bg-slate-700 transition-colors" title="View Details">
                                                <Eye size={18} />
                                            </button>
                                            {order.status === 'pending' && (
                                                <button onClick={() => updateStatus(order.id, 'preparing')} className="text-white bg-blue-600 hover:bg-blue-500 px-4 py-1 rounded-md text-xs font-bold transition-all shadow-lg">Start Prep</button>
                                            )}
                                            {order.status === 'preparing' && (
                                                 <button onClick={() => updateStatus(order.id, 'delivered')} className="text-white bg-emerald-600 hover:bg-emerald-500 px-4 py-1 rounded-md text-xs font-bold transition-all shadow-lg">Deliver</button>
                                            )}
                                       </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                     {orders.length === 0 && (
                        <div className="text-center py-24 text-slate-500 flex flex-col items-center gap-4">
                            <ShoppingCart className="w-12 h-12 opacity-20" />
                            <p className="text-lg">No active orders right now.</p>
                        </div>
                    )}
                </div>
            </div>
            {selectedOrder && <OrderDetailsModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />}
        </div>
    );
};

export default OrdersPage;
