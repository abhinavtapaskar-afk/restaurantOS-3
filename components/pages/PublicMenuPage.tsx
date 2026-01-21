import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { Restaurant, MenuItem } from '../../types';
import { UtensilsCrossed, Image as ImageIcon } from 'lucide-react';

const PublicMenuPage: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [placingOrder, setPlacingOrder] = useState(false);

    const fetchData = useCallback(async () => {
        if (!slug) {
            setError("Restaurant not specified.");
            setLoading(false);
            return;
        }

        setLoading(true);
        const { data: restaurantData, error: restaurantError } = await supabase
            .from('restaurants')
            .select('*')
            .eq('slug', slug)
            .single();

        if (restaurantError || !restaurantData) {
            setError("Restaurant not found.");
            setRestaurant(null);
            setMenuItems([]);
        } else {
            setRestaurant(restaurantData);
            const { data: menuData, error: menuError } = await supabase
                .from('menu_items')
                .select('*')
                .eq('restaurant_id', restaurantData.id)
                .eq('is_available', true)
                .order('category');
            
            if (menuError) {
                setError("Could not load menu.");
                setMenuItems([]);
            } else {
                setMenuItems(menuData);
            }
        }
        setLoading(false);
    }, [slug]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    const handlePlaceOrder = async () => {
        if (!restaurant || menuItems.length === 0) return;
        setPlacingOrder(true);
        
        // Simulate a simple order with 1 to 3 random items
        const orderItemsCount = Math.floor(Math.random() * 3) + 1;
        let totalAmount = 0;
        for (let i = 0; i < orderItemsCount; i++) {
            const randomItem = menuItems[Math.floor(Math.random() * menuItems.length)];
            totalAmount += Number(randomItem.price);
        }

        const newOrder = {
            restaurant_id: restaurant.id,
            customer_name: `Customer #${Math.floor(Math.random() * 1000)}`,
            total_amount: totalAmount.toFixed(2),
            status: 'pending'
        };

        const { error } = await supabase.from('orders').insert(newOrder);
        if (error) {
            alert('Could not place order. Please try again.');
            console.error(error);
        } else {
            alert('Order placed successfully! The restaurant has been notified.');
        }
        setPlacingOrder(false);
    };

    if (loading) return <div className="text-center p-10">Loading menu...</div>;
    if (error) return <div className="text-center p-10 text-red-400">{error}</div>;

    const groupedMenu = menuItems.reduce((acc, item) => {
        const category = item.category || 'Other';
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(item);
        return acc;
    }, {} as Record<string, MenuItem[]>);

    return (
        <div className="min-h-screen bg-slate-900 text-slate-300 p-4 sm:p-6 md:p-8">
            <div className="max-w-4xl mx-auto">
                <header className="text-center mb-10 border-b-2 border-slate-800 pb-8">
                    <div className="inline-block bg-slate-800 p-4 rounded-full border-2 border-slate-700 mb-4">
                        <UtensilsCrossed className="text-emerald-500" size={40} />
                    </div>
                    <h1 className="text-4xl font-bold text-white mt-2">{restaurant?.name}</h1>
                    <p className="text-slate-400">{restaurant?.city}</p>
                </header>
                
                <main>
                    {Object.entries(groupedMenu).map(([category, items]) => (
                        <div key={category} className="mb-10">
                            <h2 className="text-2xl font-semibold text-emerald-400 mb-6">{category}</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {items.map(item => (
                                    <div key={item.id} className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 flex gap-4 transition-colors hover:border-slate-600">
                                        {item.image_url ? (
                                             <img src={item.image_url} alt={item.name} className="w-28 h-28 rounded-md object-cover flex-shrink-0" />
                                        ) : (
                                            <div className="w-28 h-28 rounded-md bg-slate-800 flex items-center justify-center text-slate-500 flex-shrink-0"><ImageIcon size={32} /></div>
                                        )}
                                        <div className="flex flex-col flex-grow">
                                            <div className="flex items-start gap-2">
                                                 <div className={`mt-1.5 w-3 h-3 border-2 ${item.is_veg ? 'border-green-500' : 'border-red-500'} flex items-center justify-center flex-shrink-0`}>
                                                    <div className={`w-1.5 h-1.5 rounded-full ${item.is_veg ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                                 </div>
                                                <h3 className="font-bold text-lg text-white">{item.name}</h3>
                                            </div>
                                            <p className="text-emerald-400 font-semibold mt-auto text-lg">₹{item.price}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </main>

                <footer className="text-center mt-12">
                    <button 
                        onClick={handlePlaceOrder}
                        disabled={placingOrder || menuItems.length === 0}
                        className="bg-emerald-600 text-white font-bold py-3 px-10 rounded-lg hover:bg-emerald-500 transition-colors disabled:bg-slate-700 disabled:cursor-not-allowed shadow-lg hover:shadow-glow-emerald"
                    >
                        {placingOrder ? 'Placing Order...' : 'Simulate Placing an Order'}
                    </button>
                     {menuItems.length === 0 && <p className="text-slate-500 mt-4">This restaurant has no items available to order.</p>}
                </footer>
            </div>
        </div>
    );
};

export default PublicMenuPage;