
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { Order, OrderStatus, Restaurant } from '../../types';
import { CheckCircle2, Package, Utensils, Bike, Check, ArrowLeft, Loader2, PartyPopper } from 'lucide-react';
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

        // Subscribe to real-time status updates
        const channel = supabase.channel(`order-track-${orderId}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'orders',
                filter: `id=eq.${orderId}`
            }, (payload) => {
                setOrder(payload.new as Order);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [orderId, fetchOrderDetails]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400">
                <Loader2 className="animate-spin mb-4" size={48} />
                <p>Retrieving your order status...</p>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-center p-4">
                <h1 className="text-2xl font-bold text-white mb-2">Order Not Found</h1>
                <p className="text-slate-400 mb-6">We couldn't find the details for this order ID.</p>
                <Link to="/" className="text-emerald-500 flex items-center gap-2 hover:underline">
                    <ArrowLeft size={18} /> Back to Home
                </Link>
            </div>
        );
    }

    const currentStepIndex = STEPS.findIndex(s => s.status === order.status);
    const isCancelled = order.status === 'cancelled';

    return (
        <div className="min-h-screen bg-slate-950 text-slate-300 pb-20">
            {/* Header */}
            <header className="bg-slate-900 border-b border-slate-800 p-6 sticky top-0 z-10">
                <div className="max-w-2xl mx-auto flex justify-between items-center">
                    <div>
                        <h1 className="text-xl font-bold text-white">{restaurant?.name || 'RestaurantOS'}</h1>
                        <p className="text-xs text-slate-500">Order #{order.id.substring(0, 8).toUpperCase()}</p>
                    </div>
                    {restaurant?.slug && (
                        <Link to={`/menu/${restaurant.slug}`} className="text-sm font-semibold text-emerald-400 hover:underline flex items-center gap-1">
                            <ArrowLeft size={14} /> Back to Menu
                        </Link>
                    )}
                </div>
            </header>

            <main className="max-w-2xl mx-auto p-6 mt-8">
                {/* Success Banner */}
                {!isCancelled && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-8 mb-12 text-center relative overflow-hidden">
                        <PartyPopper className="absolute -top-4 -right-4 text-emerald-500/10 w-24 h-24 rotate-12" />
                        <CheckCircle2 className="mx-auto text-emerald-500 mb-4" size={56} />
                        <h2 className="text-3xl font-bold text-white mb-2">Order Confirmed!</h2>
                        <p className="text-slate-400">Sit back and relax while we prepare your meal.</p>
                    </div>
                )}

                {isCancelled && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-8 mb-12 text-center">
                        <h2 className="text-2xl font-bold text-red-500 mb-2">Order Cancelled</h2>
                        <p className="text-slate-400">We're sorry, your order has been cancelled. Please contact the restaurant for more info.</p>
                    </div>
                )}

                {/* Tracking Stepper */}
                {!isCancelled && (
                    <div className="space-y-8 relative">
                        {/* Line connector */}
                        <div className="absolute left-[23px] top-4 bottom-4 w-0.5 bg-slate-800 z-0" />
                        
                        {STEPS.map((step, idx) => {
                            const isCompleted = idx <= currentStepIndex;
                            const isCurrent = idx === currentStepIndex;
                            const StepIcon = step.icon;
                            
                            return (
                                <div key={step.status} className="flex items-start gap-6 relative z-10">
                                    <div className={cn(
                                        "w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-500",
                                        isCompleted ? "bg-emerald-500 border-emerald-400 text-white shadow-glow-emerald" : "bg-slate-900 border-slate-700 text-slate-600"
                                    )}>
                                        <StepIcon size={24} className={isCurrent ? "animate-pulse" : ""} />
                                    </div>
                                    <div className="flex-1 pt-2">
                                        <h3 className={cn(
                                            "font-bold transition-colors",
                                            isCompleted ? "text-white" : "text-slate-500"
                                        )}>
                                            {step.label}
                                        </h3>
                                        {isCurrent && (
                                            <p className="text-sm text-emerald-400 font-medium mt-1">
                                                {step.status === 'out_for_delivery' ? "Our rider is on the way!" : "In Progress..."}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Order Summary */}
                <div className="mt-16 bg-slate-900/50 rounded-xl border border-slate-800 p-6">
                    <h3 className="text-lg font-bold text-white mb-4">Summary</h3>
                    <div className="space-y-4 text-sm">
                        <div className="flex justify-between">
                            <span className="text-slate-500">Payment</span>
                            <span className="text-white font-mono">{order.payment_method}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Deliver to</span>
                            <span className="text-white text-right max-w-[200px] truncate">{order.customer_name}</span>
                        </div>
                        <div className="pt-4 border-t border-slate-800 flex justify-between items-center">
                            <span className="text-slate-400 font-bold">Total Paid</span>
                            <span className="text-xl font-bold text-emerald-400">₹{order.total_amount}</span>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default OrderSuccessPage;
