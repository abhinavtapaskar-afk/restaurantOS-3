import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../../services/supabase';
// Fix: Removed unused 'Ingredient' import which was causing an error as it's not defined in types.ts.
import { Restaurant, MenuItem, CartItem, PaymentMethod } from '../../types';
// Fix: Added Loader2 to imports
import { Plus, Minus, ShoppingCart, X, MapPin, Phone, Navigation, CreditCard, Banknote, Bike, Instagram, MessageCircle, Utensils, Zap, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import Modal from '../ui/Modal';
import { fonts } from './SettingsPage';

interface CartContextType { cart: CartItem[]; addToCart: (item: MenuItem) => void; removeFromCart: (itemId: string) => void; updateQuantity: (itemId: string, quantity: number) => void; clearCart: () => void; total: number; itemCount: number; }
const CartContext = createContext<CartContextType | undefined>(undefined);
export const useCart = () => { const context = useContext(CartContext); if (!context) throw new Error('useCart must be used within a CartProvider'); return context; };
export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [cart, setCart] = useState<CartItem[]>([]);
    const addToCart = (item: MenuItem) => { setCart(prev => { const existing = prev.find(i => i.id === item.id); return existing ? prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i) : [...prev, { ...item, quantity: 1 }]; }); };
    const removeFromCart = (itemId: string) => { setCart(prev => prev.filter(i => i.id !== itemId)); };
    const updateQuantity = (itemId: string, quantity: number) => { if (quantity <= 0) { removeFromCart(itemId); } else { setCart(prev => prev.map(i => i.id === itemId ? { ...i, quantity } : i)) } };
    const clearCart = () => setCart([]);
    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    return (<CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQuantity, clearCart, total, itemCount }}>{children}</CartContext.Provider>);
};

const CartSidebar: React.FC<{ isOpen: boolean, onClose: () => void, primaryColor: string, secondaryColor: string, restaurant: Restaurant | null, tableNumber: number | null }> = ({ isOpen, onClose, primaryColor, secondaryColor, restaurant, tableNumber }) => {
    const { cart, updateQuantity, total, itemCount } = useCart();
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    return (<>
        <div className={cn("fixed top-0 right-0 h-full w-full max-w-sm bg-slate-900 shadow-2xl transform transition-transform duration-300 ease-in-out z-50", isOpen ? 'translate-x-0' : 'translate-x-full')}>
            <div className="flex flex-col h-full">
                <div className="flex justify-between items-center p-4 border-b border-slate-800">
                    <h2 className="text-xl font-bold text-white uppercase tracking-tighter">My Cart</h2>
                    <button onClick={onClose} className="p-1 hover:text-white"><X size={24} /></button>
                </div>
                {itemCount > 0 ? (<>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {cart.map(item => (
                        <div key={item.id} className="flex items-center gap-4 bg-slate-800/50 p-3 rounded-2xl border border-white/5">
                            <img src={item.image_url} alt={item.name} className="w-16 h-16 rounded-xl object-cover" />
                            <div className="flex-1">
                                <p className="font-bold text-white text-sm">{item.name}</p>
                                <p style={{ color: primaryColor }} className="text-xs font-black">₹{item.price.toFixed(2)}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="w-8 h-8 bg-slate-950 rounded-full text-white flex items-center justify-center border border-white/5"><Minus size={12} /></button>
                                <span className="text-white font-black text-xs">{item.quantity}</span>
                                <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="w-8 h-8 bg-slate-950 rounded-full text-white flex items-center justify-center border border-white/5"><Plus size={12} /></button>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="p-6 border-t border-slate-800 space-y-4 bg-slate-950/50">
                    <div className="flex justify-between font-black text-xl text-white"><span>Total</span><span>₹{total.toFixed(2)}</span></div>
                    <button 
                        onClick={() => setIsCheckoutOpen(true)} 
                        style={{ background: `linear-gradient(45deg, ${primaryColor}, ${secondaryColor})` }}
                        className="w-full text-white font-black uppercase tracking-widest py-4 rounded-xl shadow-lg transform active:scale-95 transition-all"
                    >
                        Place Order
                    </button>
                </div></>) : (<div className="flex-1 flex flex-col items-center justify-center text-slate-700"><ShoppingCart size={64} className="opacity-10" /><p className="mt-4 font-black uppercase tracking-widest text-xs">Awaiting your selection...</p></div>)}
            </div>
        </div>
        {isCheckoutOpen && <CheckoutModal onClose={() => setIsCheckoutOpen(false)} primaryColor={primaryColor} secondaryColor={secondaryColor} restaurant={restaurant} tableNumber={tableNumber} />}
    </>);
};

const CheckoutModal: React.FC<{ onClose: () => void, primaryColor: string, secondaryColor: string, restaurant: Restaurant | null, tableNumber: number | null }> = ({ onClose, primaryColor, secondaryColor, restaurant, tableNumber }) => {
    const { cart, total, clearCart } = useCart();
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState(tableNumber ? `Table ${tableNumber}` : '');
    const [location, setLocation] = useState<{ lat: number, lng: number } | null>(tableNumber ? { lat: 0, lng: 0 } : null);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('COD');
    const [isLocating, setIsLocating] = useState(false);
    const [isPlacingOrder, setIsPlacingOrder] = useState(false);
    const isReadyToOrder = location !== null || tableNumber !== null;

    const detectLocation = () => {
        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
            (position) => { setLocation({ lat: position.coords.latitude, lng: position.coords.longitude }); setIsLocating(false); },
            () => { alert("Check location permissions."); setIsLocating(false); }
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsPlacingOrder(true);
        try {
            const { data, error } = await supabase.from('orders').insert({
                restaurant_id: restaurant?.id,
                customer_name: name,
                customer_phone: phone,
                customer_address: address,
                latitude: location?.lat || null,
                longitude: location?.lng || null,
                total_amount: total,
                order_details: cart, 
                status: 'pending',
                payment_method: paymentMethod,
                order_type: tableNumber ? 'DINE_IN' : 'DELIVERY',
                table_number: tableNumber
            }).select('id').single();
            if (error) throw error;
            if (data) {
                localStorage.setItem('last_order_id', data.id);
                clearCart();
                onClose();
                window.location.hash = `#/order-success/${data.id}`;
            }
        } catch (err: any) { alert(err.message); } finally { setIsPlacingOrder(false); }
    };

    return (
        <Modal isOpen={true} onClose={onClose} title="Logistics Config">
            <form onSubmit={handleSubmit} className="space-y-4">
                <input type="text" placeholder="Your Name" value={name} onChange={e => setName(e.target.value)} required className="w-full bg-slate-800 p-3 rounded-xl border border-white/5 text-white outline-none"/>
                <input type="tel" placeholder="Phone Number" value={phone} onChange={e => setPhone(e.target.value)} required className="w-full bg-slate-800 p-3 rounded-xl border border-white/5 text-white outline-none"/>
                {!tableNumber && (
                    <div className="flex gap-2">
                        <textarea placeholder="Address" value={address} onChange={e => setAddress(e.target.value)} required className="flex-1 bg-slate-800 p-3 rounded-xl border border-white/5 text-white outline-none resize-none" rows={2}/>
                        <button type="button" onClick={detectLocation} className="px-4 bg-slate-800 rounded-xl border border-white/5 text-indigo-400">
                            {isLocating ? <Loader2 className="animate-spin" size={20} /> : <Navigation size={20} />}
                        </button>
                    </div>
                )}
                <div className="grid grid-cols-2 gap-3 pt-4">
                    <button type="button" onClick={() => setPaymentMethod('COD')} className={cn("p-4 rounded-xl border transition-all flex flex-col items-center gap-2", paymentMethod === 'COD' ? "bg-emerald-500/10 border-emerald-500 text-white" : "bg-slate-800 border-white/5 text-slate-500")}>
                        <Banknote size={24} /> <span className="text-[10px] font-black uppercase">Cash</span>
                    </button>
                    <button type="button" onClick={() => setPaymentMethod('UPI')} className={cn("p-4 rounded-xl border transition-all flex flex-col items-center gap-2", paymentMethod === 'UPI' ? "bg-indigo-500/10 border-indigo-500 text-white" : "bg-slate-800 border-white/5 text-slate-500")}>
                        <CreditCard size={24} /> <span className="text-[10px] font-black uppercase">Digital</span>
                    </button>
                </div>
                <button type="submit" disabled={isPlacingOrder || !isReadyToOrder} style={{ background: `linear-gradient(45deg, ${primaryColor}, ${secondaryColor})` }} className="w-full text-white font-black uppercase py-4 rounded-xl shadow-lg disabled:opacity-50 mt-4">
                    {isPlacingOrder ? 'Processing...' : `Submit Order (₹${total})`}
                </button>
            </form>
        </Modal>
    );
};

const PublicMenuPageContent: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const [searchParams] = useSearchParams();
    const tableNumber = searchParams.get('table') ? parseInt(searchParams.get('table')!) : null;
    
    const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [activeOrderId, setActiveOrderId] = useState<string | null>(localStorage.getItem('last_order_id'));
    const { addToCart, itemCount } = useCart();

    const fetchData = useCallback(async () => {
        if (!slug) return;
        setLoading(true);
        try {
            const { data: restaurantData } = await supabase.from('restaurants').select('*').eq('slug', slug).maybeSingle();
            if (restaurantData) {
                setRestaurant(restaurantData);
                const { data: menuData } = await supabase
                    .from('menu_items')
                    // Fix: Changed query from `recipe_items(*, ingredient:ingredients(*))` to `menu_item_ingredients(*, inventory_item:inventory(*))` to align with the data model used in the rest of the app.
                    .select('*, menu_item_ingredients(*, inventory_item:inventory(*))')
                    .eq('restaurant_id', restaurantData.id)
                    .eq('is_available', true);
                if(menuData) setMenuItems(menuData);
            }
        } catch (err) { console.error(err); } finally { setLoading(false); }
    }, [slug]);

    useEffect(() => { fetchData() }, [fetchData]);
    
    if (loading) return <div className="text-center p-20 text-slate-500 font-black uppercase tracking-widest animate-pulse">Establishing Hub...</div>;
    if (!restaurant) return null;

    const primaryColor = restaurant.theme_color || '#10b981';
    const secondaryColor = restaurant.secondary_theme_color || '#059669';
    const fontConfig = fonts.find(f => f.name === restaurant.font) || fonts[0];

    const groupedMenu = menuItems.reduce((acc, item) => { 
        const cat = item.category || 'Kitchen Specials'; 
        if (!acc[cat]) acc[cat] = []; 
        acc[cat].push(item); 
        return acc; 
    }, {} as Record<string, MenuItem[]>);

    // Check if item is out of stock based on ingredients
    // Fix: Updated logic to use `menu_item_ingredients` and `inventory_item` to correctly check stock levels, resolving the property access error on the MenuItem type.
    const isOutOfStock = (item: MenuItem) => {
        if (!item.menu_item_ingredients || item.menu_item_ingredients.length === 0) return false;
        return item.menu_item_ingredients.some(ri => !ri.inventory_item || ri.inventory_item.current_stock < ri.quantity);
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-300 pb-32" style={{ fontFamily: fontConfig.family }}>
             {activeOrderId && (
                <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[60]">
                    <Link to={`/order-success/${activeOrderId}`} className="flex items-center gap-3 bg-white text-slate-950 px-6 py-3 rounded-full shadow-2xl font-black uppercase text-xs animate-bounce border-2 border-indigo-500">
                        Track My Live Order
                    </Link>
                </div>
            )}

            <header className="h-[45vh] bg-cover bg-center relative" style={{ backgroundImage: `url(${restaurant.hero_image_url || 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?q=80&w=2070&auto=format&fit=crop'})` }}>
                <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex flex-col items-center justify-center text-center p-6">
                    {tableNumber && <div className="absolute top-6 left-6 bg-indigo-600 text-white px-4 py-2 rounded-full font-black uppercase text-[10px] tracking-widest">Table {tableNumber} Secure</div>}
                    <h1 className="text-5xl md:text-8xl font-black text-white tracking-tighter uppercase drop-shadow-2xl">{restaurant.name}</h1>
                    <p className="text-white/60 text-sm md:text-lg mt-2 uppercase tracking-[0.4em] font-black">{restaurant.city}</p>
                </div>
            </header>
            
            <main className="max-w-6xl mx-auto p-4 md:p-12">
                <section className="bg-slate-900/50 backdrop-blur-3xl p-10 rounded-3xl -mt-24 relative z-10 border border-white/5">
                    <p className="text-xl md:text-2xl text-white font-medium leading-relaxed italic text-center">"{restaurant.about_us || 'Crafting memories in Nanded.'}"</p>
                </section>

                <div className="mt-20 space-y-24">
                    {Object.entries(groupedMenu).map(([category, items]) => (
                        <div key={category}>
                            <h3 className="text-2xl font-black text-white mb-10 border-l-4 border-indigo-500 pl-4 uppercase tracking-tighter">{category}</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {items.map(item => {
                                    const outStock = isOutOfStock(item);
                                    return (
                                        <div key={item.id} className={cn("bg-slate-900/40 rounded-3xl border border-white/5 p-4 flex flex-col group transition-all", outStock && "opacity-60")}>
                                            <div className="relative aspect-square rounded-2xl overflow-hidden mb-4 bg-slate-800">
                                                {item.image_url && <img src={item.image_url} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />}
                                                {outStock && (
                                                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-4">
                                                        <AlertCircle className="text-red-500 mb-2" size={32} />
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-white">Sold Out</span>
                                                    </div>
                                                )}
                                                <div className={cn("absolute top-3 left-3 px-3 py-1 rounded-full text-[8px] font-black uppercase", item.is_veg ? "bg-emerald-500 text-white" : "bg-red-500 text-white")}>
                                                    {item.is_veg ? 'Veg' : 'Meat'}
                                                </div>
                                            </div>
                                            <div className="flex flex-col flex-grow">
                                                <h4 className="font-black text-lg text-white mb-1">{item.name}</h4>
                                                <div className="flex justify-between items-center mt-auto">
                                                    <p className="text-2xl font-black" style={{ color: primaryColor }}>₹{item.price}</p>
                                                    {!outStock && restaurant.is_accepting_orders && (
                                                        <button 
                                                            onClick={() => addToCart(item)} 
                                                            style={{ background: `linear-gradient(45deg, ${primaryColor}, ${secondaryColor})` }}
                                                            className="w-10 h-10 rounded-full flex items-center justify-center text-white shadow-lg shadow-black/20 hover:scale-110 active:scale-95 transition-all"
                                                        >
                                                            <Plus size={20} strokeWidth={3} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </main>

            <button onClick={() => setIsCartOpen(true)} style={{ background: `linear-gradient(45deg, ${primaryColor}, ${secondaryColor})` }} className="fixed bottom-10 right-10 h-20 w-20 rounded-full flex items-center justify-center text-white shadow-2xl hover:scale-110 transition-all z-40">
                <ShoppingCart size={32} />
                {itemCount > 0 && <span className="absolute -top-1 -right-1 bg-white text-slate-950 text-xs font-black rounded-full h-8 w-8 flex items-center justify-center border-2 border-slate-950">{itemCount}</span>}
            </button>

            <CartSidebar isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} primaryColor={primaryColor} secondaryColor={secondaryColor} restaurant={restaurant} tableNumber={tableNumber} />
        </div>
    );
};

const PublicMenuPage: React.FC = () => { return (<CartProvider><PublicMenuPageContent /></CartProvider>); };
export default PublicMenuPage;