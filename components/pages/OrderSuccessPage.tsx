
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { Order, OrderStatus, Restaurant } from '../../types';
import { CheckCircle2, Package, Utensils, Bike, Check, ArrowLeft, Loader2, PartyPopper, Wifi } from 'lucide-react';
import { cn } from '../../lib/utils';

const STEPS: { status: OrderStatus; label: string; icon: React.ElementType }[] = [
    { status: 'pending', label: 'Order Placed', icon: Package },
    { status: 'confirmed', label: 'Confirmed', icon: CheckCircle2 },
    { status: 'preparing', label: 'Preparing', icon: Utensils },
    { status: 'out_for_delivery', label: 'Out for Delivery', icon: Bike },
    { status: 'delivered', label: 'Delivered', icon: Check },
];

const OrderSuccessPage: React.FC = () => {
    const { orderId } = useParams<{ orderId: string }>();
    const [order, setOrder] = useState<Order | null>(null);
    const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
    const [loading, setLoading] = useState(true);
    const [isLive, setIsLive] = useState(false);

    const fetchOrderDetails = useCallback(async () => {
        if (!orderId) return;
        try {
            const { data: orderData, error: orderError } = await supabase
                .from('orders')
                .select('*')
                .eq('id', orderId)
                .single();

            if (orderError) throw orderError;
            setOrder(orderData);

            // Cleanup LocalStorage if order reached final state
            if (orderData.status === 'delivered' || orderData.status === 'cancelled') {
                localStorage.removeItem('last_order_id');
            }

            if (orderData?.restaurant_id) {
                const { data: restData } = await supabase
                    .from('restaurants')
                    .select('*')
                    .eq('id', orderData.restaurant_id)
                    .single();
                setRestaurant(restData);
            }
        } catch (err) {
            console.error('[OrderSuccess] Fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, [orderId]);

    useEffect(() => {
        fetchOrderDetails();

        // REALTIME AUDIT: Explicit Channel with ID filtering
        const channel = supabase.channel(`order_tracking_${orderId}`)
            .on('postgres_changes', 
                { 
                    event: 'UPDATE', 
                    schema: 'public', 
                    table: 'orders', 
                    filter: `id=eq.${orderId}` 
                }, 
                (payload) => {
                    const updatedOrder = payload.new as Order;
                    setOrder(updatedOrder);
                    
                    // Final state cleanup
                    if (updatedOrder.status === 'delivered' || updatedOrder.status === 'cancelled') {
                        localStorage.removeItem('last_order_id');
                    }
                }
            )
            .subscribe((status) => {
                setIsLive(status === 'SUBSCRIBED');
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [orderId, fetchOrderDetails]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 font-sans">
                <Loader2 className="animate-spin mb-4" size={48} />
                <p>Establishing secure connection...</p>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-center p-4 font-sans">
                <h1 className="text-2xl font-bold text-white mb-2">Order Gone?</h1>
                <p className="text-slate-400 mb-6">We couldn't locate this order in our system.</p>
                <Link to="/" className="text-emerald-500 flex items-center gap-2 hover:underline">
                    <ArrowLeft size={18} /> Back to Home
                </Link>
            </div>
        );
    }

    const currentStepIndex = STEPS.findIndex(s => s.status === order.status);
    const isCancelled = order.status === 'cancelled';

    return (
        <div className="min-h-screen bg-slate-950 text-slate-300 pb-20 font-sans">
            {/* Header */}
            <header className="bg-slate-900 border-b border-slate-800 p-6 sticky top-0 z-10">
                <div className="max-w-2xl mx-auto flex justify-between items-center">
                    <div>
                        <h1 className="text-xl font-bold text-white">{restaurant?.name || 'RestaurantOS'}</h1>
                        <p className="text-xs text-slate-500">#{order.id.substring(0, 8).toUpperCase()}</p>
                    </div>
                    {isLive && (
                         <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/20">
                            <Wifi size={10} className="animate-pulse" /> Live Tracking
                        </div>
                    )}
                </div>
            </header>

            <main className="max-w-2xl mx-auto p-6 mt-8">
                {/* Success/Status Banner */}
                {!isCancelled && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-8 mb-12 text-center relative overflow-hidden">
                        <PartyPopper className="absolute -top-4 -right-4 text-emerald-500/10 w-24 h-24 rotate-12" />
                        <CheckCircle2 className="mx-auto text-emerald-500 mb-4" size={56} />
                        <h2 className="text-3xl font-bold text-white mb-2">
                            {order.status === 'delivered' ? 'Enjoy your meal!' : 'Your order is being handled'}
                        </h2>
                        <p className="text-slate-400 max-w-xs mx-auto">
                            {order.status === 'pending' && "Waiting for restaurant confirmation."}
                            {order.status === 'confirmed' && "The kitchen has your order!"}
                            {order.status === 'preparing' && "Freshly cooking your food."}
                            {order.status === 'out_for_delivery' && "Rider is heading your way."}
                            {order.status === 'delivered' && "Order completed successfully."}
                        </p>
                    </div>
                )}

                {isCancelled && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-8 mb-12 text-center">
                        <h2 className="text-2xl font-bold text-red-500 mb-2">Order Cancelled</h2>
                        <p className="text-slate-400">The restaurant could not process your order at this time.</p>
                    </div>
                )}

                {/* Progress Tracking Stepper */}
                {!isCancelled && (
                    <div className="space-y-8 relative">
                        <div className="absolute left-[23px] top-4 bottom-4 w-0.5 bg-slate-800 z-0" />
                        {STEPS.map((step, idx) => {
                            const isCompleted = idx <= currentStepIndex;
                            const isCurrent = idx === currentStepIndex;
                            const StepIcon = step.icon;
                            
                            return (
                                <div key={step.status} className="flex items-start gap-6 relative z-10 transition-all duration-700">
                                    <div className={cn(
                                        "w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-500",
                                        isCompleted ? "bg-emerald-500 border-emerald-400 text-white shadow-glow-emerald" : "bg-slate-900 border-slate-700 text-slate-600"
                                    )}>
                                        <StepIcon size={24} className={isCurrent ? "animate-pulse" : ""} />
                                    </div>
                                    <div className="flex-1 pt-2">
                                        <h3 className={cn("font-bold", isCompleted ? "text-white" : "text-slate-500")}>{step.label}</h3>
                                        {isCurrent && <p className="text-xs text-emerald-400 mt-1 uppercase font-bold tracking-widest">Active now</p>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Summary Section */}
                <div className="mt-16 bg-slate-900/50 rounded-xl border border-slate-800 p-6">
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Order Summary</h3>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-400">Customer</span>
                            <span className="text-white font-medium">{order.customer_name}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-400">Method</span>
                            <span className="bg-slate-800 px-2 py-0.5 rounded text-[10px] font-bold text-slate-300 border border-slate-700">
                                {order.payment_method}
                            </span>
                        </div>
                        <div className="pt-4 border-t border-slate-800 flex justify-between items-end">
                            <span className="text-slate-500 text-xs font-bold uppercase">Total Paid</span>
                            <span className="text-2xl font-bold text-emerald-400">₹{Number(order.total_amount).toFixed(2)}</span>
                        </div>
                    </div>
                </div>
                
                <div className="mt-8 text-center">
                    <Link to={`/menu/${restaurant?.slug}`} className="text-sm text-slate-500 hover:text-emerald-400 transition-colors flex items-center justify-center gap-2">
                         <ArrowLeft size={16} /> Order more items
                    </Link>
                </div>
            </main>
        </div>
    );
};

export default OrderSuccessPage;
