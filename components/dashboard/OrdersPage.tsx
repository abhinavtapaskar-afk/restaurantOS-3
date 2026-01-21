import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Order, OrderStatus, Restaurant, CartItem } from '../../types';
import { cn } from '../../lib/utils';
import Modal from '../ui/Modal';
import { Eye } from 'lucide-react';

const getStatusClass = (status: OrderStatus) => {
    switch (status) {
        case 'pending': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
        case 'preparing': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
        case 'delivered': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
        case 'cancelled': return 'bg-red-500/10 text-red-400 border-red-500/20';
        default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
}

const OrderDetailsModal: React.FC<{ order: Order, onClose: () => void }> = ({ order, onClose }) => (
    <Modal isOpen={!!order} onClose={onClose} title={`Order Details: ${order.id.substring(0, 8)}`}>
        <div className="space-y-4">
            <div>
                <h4 className="font-semibold text-slate-300">Customer Info</h4>
                <p><strong>Name:</strong> {order.customer_name}</p>
                <p><strong>Phone:</strong> {order.customer_phone}</p>
                <p><strong>Address:</strong> {order.customer_address}</p>
            </div>
            <div>
                <h4 className="font-semibold text-slate-300">Order Items</h4>
                <ul className="divide-y divide-slate-800 mt-2">
                {(order.order_details || []).map((item, index) => (
                    <li key={index} className="py-2 flex justify-between">
                        <span>{item.quantity} x {item.name}</span>
                        <span>₹{(item.price * item.quantity).toFixed(2)}</span>
                    </li>
                ))}
                </ul>
                <div className="flex justify-between font-bold text-lg mt-2 pt-2 border-t border-slate-800 text-emerald-400">
                    <span>Total</span>
                    <span>₹{order.total_amount}</span>
                </div>
            </div>
        </div>
    </Modal>
);

const OrdersPage: React.FC = () => {
    const { user } = useAuth();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

    const fetchOrders = useCallback(async (restaurantId: string) => {
        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .eq('restaurant_id', restaurantId)
            .order('created_at', { ascending: false });

        if (data) setOrders(data);
        if (error) console.error("Error fetching orders:", error);
        setLoading(false);
    }, []);

    useEffect(() => {
        if (!user) return;
        const getRestaurantAndInitialOrders = async () => {
            const { data: restaurantData } = await supabase
                .from('restaurants')
                .select('id')
                .eq('owner_id', user.id)
                .single();
            
            if (restaurantData) {
                setRestaurant(restaurantData as Restaurant);
                fetchOrders(restaurantData.id);
            } else {
                setLoading(false);
            }
        };
        getRestaurantAndInitialOrders();
    }, [user, fetchOrders]);

    useEffect(() => {
        if (!restaurant) return;

        const channel = supabase.channel('orders-channel')
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
        await supabase.from('orders').update({ status }).eq('id', id);
    };

    if (loading) return <div>Loading orders...</div>

    return (
        <div>
            <h1 className="text-3xl font-bold mb-6 text-white">Live Orders</h1>
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-700">
                        <thead className="bg-slate-800">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Order ID</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Time</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Customer</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Amount</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {orders.map((order) => (
                                <tr key={order.id} className="hover:bg-slate-800/40 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-slate-400">{order.id.substring(0, 8)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{new Date(order.created_at).toLocaleTimeString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{order.customer_name || 'N/A'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-emerald-400">₹{order.total_amount}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={cn("px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border", getStatusClass(order.status))}>
                                            {order.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                       <div className="flex gap-2">
                                            <button onClick={() => setSelectedOrder(order)} className="text-slate-400 hover:text-white p-1.5 rounded-md hover:bg-slate-700 transition-colors" title="View Details">
                                                <Eye size={16} />
                                            </button>
                                            {order.status === 'pending' && (
                                                <button onClick={() => updateStatus(order.id, 'preparing')} className="text-blue-400 hover:text-blue-300 bg-blue-500/10 px-3 py-1 rounded-md transition-colors hover:bg-blue-500/20">Prepare</button>
                                            )}
                                            {order.status === 'preparing' && (
                                                 <button onClick={() => updateStatus(order.id, 'delivered')} className="text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 px-3 py-1 rounded-md transition-colors hover:bg-emerald-500/20">Deliver</button>
                                            )}
                                       </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                     {orders.length === 0 && (
                        <div className="text-center py-16 text-slate-400">No active orders right now.</div>
                    )}
                </div>
            </div>
            {selectedOrder && <OrderDetailsModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />}
        </div>
    );
};

export default OrdersPage;