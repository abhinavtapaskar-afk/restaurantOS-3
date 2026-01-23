
import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { Restaurant, MenuItem, CartItem, PaymentMethod } from '../../types';
import { Plus, Minus, ShoppingCart, X, MapPin, Clock, Phone, Navigation, CreditCard, Banknote, Bike } from 'lucide-react';
import { cn } from '../../lib/utils';
import Modal from '../ui/Modal';

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

const CartSidebar: React.FC<{ isOpen: boolean, onClose: () => void, themeColor: string, restaurant: Restaurant | null }> = ({ isOpen, onClose, themeColor, restaurant }) => {
    const { cart, updateQuantity, total, itemCount } = useCart();
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    return (<>
        <div className={cn("fixed top-0 right-0 h-full w-full max-w-sm bg-slate-900 shadow-2xl transform transition-transform duration-300 ease-in-out z-50", isOpen ? 'translate-x-0' : 'translate-x-full')}>
            <div className="flex flex-col h-full">
                <div className="flex justify-between items-center p-4 border-b border-slate-800">
                    <h2 className="text-xl font-bold text-white">Your Order</h2>
                    <button onClick={onClose} className="p-1 hover:text-white"><X size={24} /></button>
                </div>
                {itemCount > 0 ? (<>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {cart.map(item => (
                        <div key={item.id} className="flex items-center gap-4">
                            <img src={item.image_url} alt={item.name} className="w-16 h-16 rounded-md object-cover" />
                            <div className="flex-1">
                                <p className="font-semibold text-white">{item.name}</p>
                                <p className={`text-${themeColor}-400`}>₹{item.price.toFixed(2)}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="p-1 bg-slate-800 rounded-full"><Minus size={14} /></button>
                                <span>{item.quantity}</span>
                                <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="p-1 bg-slate-800 rounded-full"><Plus size={14} /></button>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="p-4 border-t border-slate-800 space-y-4">
                    <div className="flex justify-between font-bold text-lg"><span>Total</span><span>₹{total.toFixed(2)}</span></div>
                    <button onClick={() => setIsCheckoutOpen(true)} className={`w-full bg-${themeColor}-600 text-white font-bold py-3 rounded-lg hover:bg-${themeColor}-500 transition-colors`}>Proceed to Checkout</button>
                </div></>) : (<div className="flex-1 flex flex-col items-center justify-center text-slate-500"><ShoppingCart size={48} /><p className="mt-4">Your cart is empty</p></div>)}
            </div>
        </div>
        {isCheckoutOpen && <CheckoutModal onClose={() => setIsCheckoutOpen(false)} themeColor={themeColor} restaurant={restaurant} />}
    </>);
};

const CheckoutModal: React.FC<{ onClose: () => void, themeColor: string, restaurant: Restaurant | null }> = ({ onClose, themeColor, restaurant }) => {
    const { cart, total, clearCart } = useCart();
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [location, setLocation] = useState<{ lat: number, lng: number } | null>(null);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('COD');
    const [isLocating, setIsLocating] = useState(false);
    const [isPlacingOrder, setIsPlacingOrder] = useState(false);
    const isReadyToOrder = location !== null;

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
                setName(session.user.user_metadata.full_name || '');
            }
        });
    }, []);

    const detectLocation = () => {
        setIsLocating(true);
        if (!navigator.geolocation) {
            alert("Geolocation is not supported by your browser");
            setIsLocating(false);
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
                setIsLocating(false);
            },
            (error) => {
                console.error('[Checkout] Geolocation error:', error);
                alert("Could not detect location. Please check your permissions.");
                setIsLocating(false);
            },
            { enableHighAccuracy: true }
        );
    };

    const handleUPIPayment = () => {
        if (!restaurant?.upi_id) {
            alert("UPI payment is not configured for this restaurant yet.");
            return;
        }
        const upiUrl = `upi://pay?pa=${restaurant.upi_id}&pn=${encodeURIComponent(restaurant.name)}&am=${total}&cu=INR`;
        window.location.href = upiUrl;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isReadyToOrder) {
            alert("Please detect your location for faster delivery!");
            return;
        }

        setIsPlacingOrder(true);
        try {
            if (!restaurant) throw new Error("Restaurant data missing.");

            const newOrder = {
                restaurant_id: restaurant.id,
                customer_name: name,
                customer_phone: phone,
                customer_address: address,
                latitude: location?.lat,
                longitude: location?.lng,
                subtotal: total,
                total_amount: total,
                order_details: cart, 
                items: cart, 
                status: 'pending' as const,
                payment_method: paymentMethod,
                order_type: 'DELIVERY'
            };

            const { data, error } = await supabase.from('orders').insert(newOrder).select('id').single();
            if (error) throw error;

            if (paymentMethod === 'UPI') {
                handleUPIPayment();
            }
            
            // UX FIX: Save to LocalStorage for persistence
            if (data?.id) {
                localStorage.setItem('last_order_id', data.id);
                clearCart();
                onClose();
                window.location.hash = `#/order-success/${data.id}`;
            }
        } catch (err: any) {
            console.error('[Checkout] Submit Error:', err);
            alert(`Could not place order: ${err.message}`);
        } finally {
            setIsPlacingOrder(false);
        }
    };

    return (
        <Modal isOpen={true} onClose={onClose} title="Complete Your Order">
            <form onSubmit={handleSubmit} className="space-y-4">
                <input type="text" placeholder="Full Name" value={name} onChange={e => setName(e.target.value)} required className="w-full bg-slate-800 p-2 rounded-md border border-slate-700"/>
                <input type="tel" placeholder="Phone Number" value={phone} onChange={e => setPhone(e.target.value)} required className="w-full bg-slate-800 p-2 rounded-md border border-slate-700"/>
                
                <div className="space-y-2">
                    <div className="flex gap-2">
                        <textarea placeholder="House No, Floor, Landmark (Optional)" value={address} onChange={e => setAddress(e.target.value)} className="flex-1 bg-slate-800 p-2 rounded-md border border-slate-700" rows={2}/>
                        <button type="button" onClick={detectLocation} disabled={isLocating} className={cn("px-4 rounded-md border border-slate-700 transition-colors flex items-center justify-center", location ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-slate-800 text-slate-400")}>
                            {isLocating ? <div className="animate-spin h-5 w-5 border-2 border-emerald-500 border-t-transparent rounded-full" /> : <Navigation size={20} />}
                        </button>
                    </div>
                    {location ? (
                         <p className="text-xs text-emerald-400 text-right">✓ Accurate location captured!</p>
                    ) : (
                         <p className="text-xs text-amber-400 text-right">Detect location for faster delivery.</p>
                    )}
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Payment Method</label>
                    <div className="grid grid-cols-2 gap-3">
                        <button 
                            type="button" 
                            onClick={() => setPaymentMethod('COD')}
                            className={cn("flex flex-col items-center gap-2 p-3 rounded-lg border transition-all", paymentMethod === 'COD' ? `border-${themeColor}-500 bg-${themeColor}-500/10 text-white` : "border-slate-700 bg-slate-800 text-slate-400")}
                        >
                            <Banknote size={24} />
                            <span className="text-xs font-bold">Cash</span>
                        </button>
                        <button 
                            type="button" 
                            disabled={!restaurant?.upi_id}
                            onClick={() => setPaymentMethod('UPI')}
                            className={cn("flex flex-col items-center gap-2 p-3 rounded-lg border transition-all", paymentMethod === 'UPI' ? `border-${themeColor}-500 bg-${themeColor}-500/10 text-white` : "border-slate-700 bg-slate-800 text-slate-400", !restaurant?.upi_id && "opacity-50 cursor-not-allowed")}
                        >
                            <CreditCard size={24} />
                            <span className="text-xs font-bold">UPI / Online</span>
                        </button>
                    </div>
                </div>

                <button type="submit" disabled={isPlacingOrder || !isReadyToOrder} className={`w-full bg-${themeColor}-600 text-white font-bold py-3 rounded-lg hover:bg-${themeColor}-500 disabled:bg-slate-700 disabled:cursor-not-allowed flex items-center justify-center gap-2`}>
                    {isPlacingOrder ? 'Placing Order...' : (paymentMethod === 'UPI' ? `Pay & Order (₹${total.toFixed(2)})` : `Place Order (₹${total.toFixed(2)})`)}
                </button>
            </form>
        </Modal>
    );
};

const PublicMenuPageContent: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [activeOrderId, setActiveOrderId] = useState<string | null>(localStorage.getItem('last_order_id'));
    const { addToCart, itemCount } = useCart();

    const fetchData = useCallback(async () => {
        if (!slug) { setError("Restaurant not specified."); setLoading(false); return; }
        setLoading(true);
        try {
            const { data: restaurantData, error: restaurantError } = await supabase.from('restaurants').select('*').eq('slug', slug).maybeSingle();
            if (restaurantError) throw restaurantError;
            if (!restaurantData) throw new Error("Restaurant not found.");
            setRestaurant(restaurantData);
            const { data: menuData } = await supabase.from('menu_items').select('*').eq('restaurant_id', restaurantData.id).eq('is_available', true).order('category');
            if(menuData) setMenuItems(menuData);
        } catch (err: any) {
            console.error('[PublicMenu] Error fetching data:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [slug]);

    useEffect(() => { fetchData() }, [fetchData]);
    
    // Check for active order regularly
    useEffect(() => {
        const checkOrder = () => {
            const id = localStorage.getItem('last_order_id');
            if (id !== activeOrderId) setActiveOrderId(id);
        };
        const interval = setInterval(checkOrder, 2000);
        return () => clearInterval(interval);
    }, [activeOrderId]);

    if (loading) return <div className="text-center p-10 text-slate-400">Loading...</div>;
    if (error) return <div className="text-center p-10 text-red-400">{error}</div>;
    if (!restaurant) return null;

    const themeColor = restaurant.theme_color || 'emerald';
    const groupedMenu = menuItems.reduce((acc, item) => { const cat = item.category || 'Other'; if (!acc[cat]) acc[cat] = []; acc[cat].push(item); return acc; }, {} as Record<string, MenuItem[]>);

    return (
        <div className={cn("min-h-screen bg-slate-950 text-slate-300 pb-24 font-sans")}>
            {/* AUDIT UX: Track Active Order Banner */}
            {activeOrderId && (
                <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] animate-bounce">
                    <Link to={`/order-success/${activeOrderId}`} className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-full shadow-2xl font-bold hover:bg-emerald-500 transition-all border border-emerald-400/50">
                        <Bike size={20} className="animate-pulse" />
                        🚚 Track Active Order (#{activeOrderId.substring(0,6).toUpperCase()})
                    </Link>
                </div>
            )}

            <header className="h-96 bg-cover bg-center relative" style={{ backgroundImage: `url(${restaurant.hero_image_url || '/placeholder-hero.jpg'})` }}>
                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-center p-4">
                    {restaurant.hero_title && (
                        <h1 className="text-5xl md:text-7xl font-bold text-white">{restaurant.hero_title}</h1>
                    )}
                    {restaurant.hero_subtitle && (
                        <p className="text-lg text-slate-300 mt-2">{restaurant.hero_subtitle}</p>
                    )}
                </div>
            </header>
            
            <main className="max-w-5xl mx-auto p-4 sm:p-6 md:p-8 space-y-16">
                {restaurant.about_us && (
                    <section className="bg-slate-900 p-8 rounded-lg -mt-32 relative z-10 border border-slate-800 shadow-xl">
                        <h2 className={`text-3xl font-bold text-${themeColor}-400 mb-4`}>About Us</h2>
                        <p className="text-slate-400 whitespace-pre-wrap">{restaurant.about_us}</p>
                    </section>
                )}

                <section>
                    <h2 className={`text-3xl font-bold text-${themeColor}-400 text-center mb-8`}>Our Menu</h2>
                     {Object.entries(groupedMenu).map(([category, items]) => (
                        <div key={category} className="mb-10">
                            <h3 className="text-2xl font-semibold text-white mb-6">{category}</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {items.map(item => (
                                    <div key={item.id} className="bg-slate-900 p-4 rounded-lg border border-slate-800 flex gap-4">
                                        {item.image_url && <img src={item.image_url} alt={item.name} className="w-28 h-28 rounded-md object-cover flex-shrink-0" />}
                                        <div className="flex flex-col flex-grow">
                                            <h4 className="font-bold text-lg text-white">{item.name}</h4>
                                            <p className={`text-${themeColor}-400 font-semibold mt-auto text-lg`}>₹{item.price}</p>
                                            <button onClick={() => addToCart(item)} className={`self-end -mb-2 -mr-2 bg-${themeColor}-600 text-white rounded-full p-2 hover:bg-${themeColor}-500 transition-colors`}><Plus size={20} /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </section>
            </main>

            <button onClick={() => setIsCartOpen(true)} className={`fixed bottom-6 right-6 bg-${themeColor}-600 text-white rounded-full p-4 shadow-lg hover:bg-${themeColor}-500 transition-transform hover:scale-110 z-50`}>
                <ShoppingCart size={28} />
                {itemCount > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center">{itemCount}</span>}
            </button>
            <CartSidebar isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} themeColor={themeColor} restaurant={restaurant} />
        </div>
    );
};

const PublicMenuPage: React.FC = () => ( <CartProvider><PublicMenuPageContent /></CartProvider> );
export default PublicMenuPage;
